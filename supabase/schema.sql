-- AviaTest: profiles for Supabase Auth
-- Run this once in the Supabase SQL Editor.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  username_normalized text not null,
  created_at timestamptz not null default now(),
  constraint profiles_username_normalized_unique unique (username_normalized),
  constraint profiles_username_length check (
    char_length(username) >= 3 and char_length(username) <= 24
  )
);

create index if not exists profiles_username_normalized_idx
  on public.profiles (username_normalized);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

-- No insert/update/delete from clients: profiles are created by the trigger only.

create or replace function public.is_username_available(candidate text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1
    from public.profiles
    where username_normalized = lower(trim(candidate))
  );
$$;

revoke all on function public.is_username_available(text) from public;
grant execute on function public.is_username_available(text) to anon, authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  raw_username text;
  display_username text;
  normalized text;
begin
  raw_username := coalesce(new.raw_user_meta_data->>'username', '');
  display_username := trim(raw_username);
  normalized := lower(display_username);

  if display_username = '' or char_length(display_username) < 3 then
    raise exception 'username_required';
  end if;

  insert into public.profiles (id, username, username_normalized)
  values (new.id, display_username, normalized);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

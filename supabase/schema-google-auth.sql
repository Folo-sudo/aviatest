-- AviaTest: Google OAuth support
-- Run once in the Supabase SQL Editor (after schema.sql / schema-account.sql).
-- Allows auth.users created via OAuth (no username in metadata) then claim_username.

alter table public.profiles
  add column if not exists username_pending boolean not null default false;

-- Existing email/password profiles are already claimed
update public.profiles
set username_pending = false
where username_pending is distinct from false
  and username not like 'tmp_%';

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
  pending boolean := false;
begin
  raw_username := coalesce(new.raw_user_meta_data->>'username', '');
  display_username := trim(raw_username);

  if display_username = '' or char_length(display_username) < 3 then
    -- OAuth / providers without username: temporary unique placeholder
    display_username := 'tmp_' || substr(replace(new.id::text, '-', ''), 1, 12);
    pending := true;
  end if;

  if char_length(display_username) > 24 then
    display_username := left(display_username, 24);
  end if;

  normalized := lower(display_username);

  insert into public.profiles (id, username, username_normalized, username_pending)
  values (new.id, display_username, normalized, pending);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- First-time OAuth users pick their definitive pseudo
create or replace function public.claim_username(candidate text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  display_username text;
  normalized text;
  pending boolean;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;

  select p.username_pending into pending
  from public.profiles p
  where p.id = uid
  for update;

  if pending is null then
    raise exception 'profile_missing';
  end if;

  if pending is not true then
    raise exception 'username_already_set';
  end if;

  display_username := trim(candidate);
  if display_username = '' or char_length(display_username) < 3 then
    raise exception 'username_required';
  end if;
  if char_length(display_username) > 24 then
    raise exception 'username_too_long';
  end if;
  if display_username !~ '^[a-zA-Z0-9_\-]+$' then
    raise exception 'username_invalid';
  end if;
  if lower(display_username) like 'tmp_%' then
    raise exception 'username_invalid';
  end if;

  normalized := lower(display_username);

  if exists (
    select 1
    from public.profiles p
    where p.username_normalized = normalized
      and p.id <> uid
  ) then
    raise exception 'username_taken';
  end if;

  update public.profiles
  set
    username = display_username,
    username_normalized = normalized,
    username_pending = false
  where id = uid;

  return true;
end;
$$;

revoke all on function public.claim_username(text) from public;
grant execute on function public.claim_username(text) to authenticated;

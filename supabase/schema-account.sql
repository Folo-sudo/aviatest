-- Account / public progression — run after schema.sql

alter table public.profiles
  add column if not exists progression_public boolean not null default false;

-- Allow users to update their own privacy flag
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Authenticated users can read public profiles (pseudo + privacy) and always their own
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_select_own_or_public" on public.profiles;
create policy "profiles_select_own_or_public"
  on public.profiles for select to authenticated
  using (auth.uid() = id or progression_public = true);

-- ============================================================================
-- Performance entries synced for public progression
-- ============================================================================

create table if not exists public.performance_entries (
  user_id uuid not null references auth.users (id) on delete cascade,
  exercise_id text not null,
  entries jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, exercise_id)
);

create index if not exists performance_entries_user_id_idx
  on public.performance_entries (user_id);

alter table public.performance_entries enable row level security;

drop policy if exists "perf_select_own_or_public" on public.performance_entries;
create policy "perf_select_own_or_public"
  on public.performance_entries for select to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.profiles p
      where p.id = performance_entries.user_id
        and p.progression_public = true
    )
  );

drop policy if exists "perf_upsert_own" on public.performance_entries;
create policy "perf_upsert_own"
  on public.performance_entries for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "perf_update_own" on public.performance_entries;
create policy "perf_update_own"
  on public.performance_entries for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "perf_delete_own" on public.performance_entries;
create policy "perf_delete_own"
  on public.performance_entries for delete to authenticated
  using (auth.uid() = user_id);

-- Lookup profile by pseudo (works even if private: returns public flag)
create or replace function public.get_profile_by_pseudo(p_pseudo text)
returns table (
  id uuid,
  username text,
  progression_public boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.username, p.progression_public
  from public.profiles p
  where p.username_normalized = lower(trim(p_pseudo))
  limit 1;
$$;

revoke all on function public.get_profile_by_pseudo(text) from public;
grant execute on function public.get_profile_by_pseudo(text) to authenticated;

-- Search public pseudos (prefix)
create or replace function public.search_public_pseudos(p_query text)
returns table (username text)
language sql
stable
security definer
set search_path = public
as $$
  select p.username
  from public.profiles p
  where p.progression_public = true
    and (
      trim(p_query) = ''
      or p.username_normalized like lower(trim(p_query)) || '%'
    )
  order by p.username
  limit 20;
$$;

revoke all on function public.search_public_pseudos(text) from public;
grant execute on function public.search_public_pseudos(text) to authenticated;

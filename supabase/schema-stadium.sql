-- Stadium, bugs, missives — run in Supabase SQL Editor after schema.sql

-- ============================================================================
-- Competitions
-- ============================================================================

create table if not exists public.competitions (
  id uuid primary key default gen_random_uuid(),
  exercise_id text not null,
  settings jsonb not null default '{}'::jsonb,
  settings_hash text not null,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint competitions_exercise_settings_unique unique (exercise_id, settings_hash)
);

create index if not exists competitions_exercise_id_idx on public.competitions (exercise_id);
create index if not exists competitions_created_at_idx on public.competitions (created_at desc);

alter table public.competitions enable row level security;

drop policy if exists "competitions_select_authenticated" on public.competitions;
create policy "competitions_select_authenticated"
  on public.competitions for select to authenticated
  using (true);

drop policy if exists "competitions_select_anon" on public.competitions;
create policy "competitions_select_anon"
  on public.competitions for select to anon
  using (true);

drop policy if exists "competitions_insert_own" on public.competitions;
create policy "competitions_insert_own"
  on public.competitions for insert to authenticated
  with check (auth.uid() = created_by);

-- ============================================================================
-- Competition scores (best per user per competition)
-- ============================================================================

create table if not exists public.competition_scores (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  pseudo text not null,
  correct int not null default 0,
  total int not null default 0,
  score_pct numeric(5,1) not null default 0,
  avg_time_ms int,
  updated_at timestamptz not null default now(),
  constraint competition_scores_unique unique (competition_id, user_id)
);

create index if not exists competition_scores_competition_id_idx
  on public.competition_scores (competition_id);

alter table public.competition_scores enable row level security;

drop policy if exists "competition_scores_select_authenticated" on public.competition_scores;
create policy "competition_scores_select_authenticated"
  on public.competition_scores for select to authenticated
  using (true);

drop policy if exists "competition_scores_select_anon" on public.competition_scores;
create policy "competition_scores_select_anon"
  on public.competition_scores for select to anon
  using (true);

drop policy if exists "competition_scores_insert_own" on public.competition_scores;
create policy "competition_scores_insert_own"
  on public.competition_scores for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "competition_scores_update_own" on public.competition_scores;
create policy "competition_scores_update_own"
  on public.competition_scores for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================================
-- Bug reports
-- ============================================================================

create table if not exists public.bug_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  email text not null,
  body text not null,
  created_at timestamptz not null default now(),
  constraint bug_reports_body_length check (char_length(trim(body)) >= 10)
);

create index if not exists bug_reports_user_id_idx on public.bug_reports (user_id);

alter table public.bug_reports enable row level security;

drop policy if exists "bug_reports_insert_own" on public.bug_reports;
create policy "bug_reports_insert_own"
  on public.bug_reports for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "bug_reports_select_own_or_admin" on public.bug_reports;
create policy "bug_reports_select_own_or_admin"
  on public.bug_reports for select to authenticated
  using (
    auth.uid() = user_id
    or (auth.jwt() ->> 'email') = 'paulduflos0@gmail.com'
  );

-- ============================================================================
-- Missives
-- ============================================================================

create table if not exists public.missives (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  email text not null,
  body text not null,
  created_at timestamptz not null default now(),
  constraint missives_body_length check (char_length(trim(body)) >= 10)
);

create index if not exists missives_user_id_idx on public.missives (user_id);

alter table public.missives enable row level security;

drop policy if exists "missives_insert_own" on public.missives;
create policy "missives_insert_own"
  on public.missives for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "missives_select_own_or_admin" on public.missives;
create policy "missives_select_own_or_admin"
  on public.missives for select to authenticated
  using (
    auth.uid() = user_id
    or (auth.jwt() ->> 'email') = 'paulduflos0@gmail.com'
  );

-- ============================================================================
-- RPCs with limits
-- ============================================================================

create or replace function public.submit_bug_report(p_body text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  mail text := auth.jwt() ->> 'email';
  cnt int;
  new_id uuid;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;
  if char_length(trim(p_body)) < 10 then
    raise exception 'body_too_short';
  end if;
  select count(*) into cnt from public.bug_reports where user_id = uid;
  if cnt >= 10 then
    raise exception 'bug_limit_reached';
  end if;
  insert into public.bug_reports (user_id, email, body)
  values (uid, coalesce(mail, ''), trim(p_body))
  returning id into new_id;
  return new_id;
end;
$$;

create or replace function public.submit_missive(p_body text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  mail text := auth.jwt() ->> 'email';
  cnt int;
  new_id uuid;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;
  if char_length(trim(p_body)) < 10 then
    raise exception 'body_too_short';
  end if;
  select count(*) into cnt from public.missives where user_id = uid;
  if cnt >= 2 then
    raise exception 'missive_limit_reached';
  end if;
  insert into public.missives (user_id, email, body)
  values (uid, coalesce(mail, ''), trim(p_body))
  returning id into new_id;
  return new_id;
end;
$$;

revoke all on function public.submit_bug_report(text) from public;
grant execute on function public.submit_bug_report(text) to authenticated;

revoke all on function public.submit_missive(text) from public;
grant execute on function public.submit_missive(text) to authenticated;

create or replace function public.bug_report_count()
returns int
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int from public.bug_reports where user_id = auth.uid();
$$;

create or replace function public.missive_count()
returns int
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int from public.missives where user_id = auth.uid();
$$;

revoke all on function public.bug_report_count() from public;
grant execute on function public.bug_report_count() to authenticated;
revoke all on function public.missive_count() from public;
grant execute on function public.missive_count() to authenticated;

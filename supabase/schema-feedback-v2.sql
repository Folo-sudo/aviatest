-- Feedback v2: exercise on bugs, status, admin replies
-- Run in Supabase SQL Editor after schema-stadium.sql

-- ============================================================================
-- Columns
-- ============================================================================

alter table public.bug_reports
  add column if not exists exercise_id text not null default 'autre';

alter table public.bug_reports
  add column if not exists status text not null default 'envoye';

alter table public.bug_reports
  add column if not exists admin_reply text;

alter table public.bug_reports
  add column if not exists admin_reply_at timestamptz;

alter table public.missives
  add column if not exists admin_reply text;

alter table public.missives
  add column if not exists admin_reply_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'bug_reports_status_check'
  ) then
    alter table public.bug_reports
      add constraint bug_reports_status_check
      check (status in ('envoye', 'en_cours', 'corrige'));
  end if;
end $$;

-- ============================================================================
-- Admin update policies
-- ============================================================================

drop policy if exists "bug_reports_update_admin" on public.bug_reports;
create policy "bug_reports_update_admin"
  on public.bug_reports for update to authenticated
  using ((auth.jwt() ->> 'email') = 'paulduflos0@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'paulduflos0@gmail.com');

drop policy if exists "missives_update_admin" on public.missives;
create policy "missives_update_admin"
  on public.missives for update to authenticated
  using ((auth.jwt() ->> 'email') = 'paulduflos0@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'paulduflos0@gmail.com');

-- ============================================================================
-- Submit bug with exercise
-- ============================================================================

drop function if exists public.submit_bug_report(text);

create or replace function public.submit_bug_report(p_body text, p_exercise_id text default 'autre')
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
  ex text := coalesce(nullif(trim(p_exercise_id), ''), 'autre');
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
  insert into public.bug_reports (user_id, email, body, exercise_id, status)
  values (uid, coalesce(mail, ''), trim(p_body), ex, 'envoye')
  returning id into new_id;
  return new_id;
end;
$$;

revoke all on function public.submit_bug_report(text, text) from public;
grant execute on function public.submit_bug_report(text, text) to authenticated;

-- ============================================================================
-- Admin helpers (security definer + email gate)
-- ============================================================================

create or replace function public.admin_set_bug_status(p_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if (auth.jwt() ->> 'email') is distinct from 'paulduflos0@gmail.com' then
    raise exception 'not_admin';
  end if;
  if p_status not in ('envoye', 'en_cours', 'corrige') then
    raise exception 'invalid_status';
  end if;
  update public.bug_reports set status = p_status where id = p_id;
end;
$$;

create or replace function public.admin_reply_bug(p_id uuid, p_reply text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if (auth.jwt() ->> 'email') is distinct from 'paulduflos0@gmail.com' then
    raise exception 'not_admin';
  end if;
  if char_length(trim(p_reply)) < 1 then
    raise exception 'body_too_short';
  end if;
  update public.bug_reports
  set admin_reply = trim(p_reply), admin_reply_at = now()
  where id = p_id;
end;
$$;

create or replace function public.admin_reply_missive(p_id uuid, p_reply text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if (auth.jwt() ->> 'email') is distinct from 'paulduflos0@gmail.com' then
    raise exception 'not_admin';
  end if;
  if char_length(trim(p_reply)) < 1 then
    raise exception 'body_too_short';
  end if;
  update public.missives
  set admin_reply = trim(p_reply), admin_reply_at = now()
  where id = p_id;
end;
$$;

revoke all on function public.admin_set_bug_status(uuid, text) from public;
grant execute on function public.admin_set_bug_status(uuid, text) to authenticated;
revoke all on function public.admin_reply_bug(uuid, text) from public;
grant execute on function public.admin_reply_bug(uuid, text) to authenticated;
revoke all on function public.admin_reply_missive(uuid, text) from public;
grant execute on function public.admin_reply_missive(uuid, text) to authenticated;

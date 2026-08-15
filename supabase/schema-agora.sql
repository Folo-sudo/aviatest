-- Agora: publish missives + up to 3 agreement votes
-- Run after schema-feedback-v2.sql

alter table public.missives
  add column if not exists in_agora boolean not null default false;

alter table public.missives
  add column if not exists agora_published_at timestamptz;

create table if not exists public.agora_votes (
  missive_id uuid not null references public.missives (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (missive_id, user_id)
);

create index if not exists agora_votes_user_id_idx on public.agora_votes (user_id);
create index if not exists agora_votes_missive_id_idx on public.agora_votes (missive_id);

alter table public.agora_votes enable row level security;

-- Read votes if missive is in agora, or own vote, or admin
drop policy if exists "agora_votes_select" on public.agora_votes;
create policy "agora_votes_select"
  on public.agora_votes for select to authenticated
  using (
    auth.uid() = user_id
    or (auth.jwt() ->> 'email') = 'paulduflos0@gmail.com'
    or exists (
      select 1 from public.missives m
      where m.id = agora_votes.missive_id and m.in_agora = true
    )
  );

-- Allow reading missives that are in the agora (in addition to own/admin)
drop policy if exists "missives_select_own_or_admin" on public.missives;
drop policy if exists "missives_select_own_or_admin_or_agora" on public.missives;
create policy "missives_select_own_or_admin_or_agora"
  on public.missives for select to authenticated
  using (
    auth.uid() = user_id
    or (auth.jwt() ->> 'email') = 'paulduflos0@gmail.com'
    or in_agora = true
  );

-- ============================================================================
-- Publish own missive to Agora
-- ============================================================================

create or replace function public.publish_missive_to_agora(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  owner uuid;
  already boolean;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;
  select user_id, in_agora into owner, already from public.missives where id = p_id;
  if owner is null then
    raise exception 'not_found';
  end if;
  if owner is distinct from uid then
    raise exception 'not_owner';
  end if;
  if already then
    raise exception 'already_in_agora';
  end if;
  update public.missives
  set in_agora = true, agora_published_at = now()
  where id = p_id;
end;
$$;

create or replace function public.unpublish_missive_from_agora(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  owner uuid;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;
  select user_id into owner from public.missives where id = p_id and in_agora = true;
  if owner is null then
    raise exception 'not_found';
  end if;
  if owner is distinct from uid
     and (auth.jwt() ->> 'email') is distinct from 'paulduflos0@gmail.com' then
    raise exception 'not_owner';
  end if;
  delete from public.agora_votes where missive_id = p_id;
  update public.missives
  set in_agora = false
  where id = p_id;
end;
$$;

-- ============================================================================
-- Vote (max 3 active votes per user)
-- ============================================================================

create or replace function public.vote_agora_missive(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  open_flag boolean;
  cnt int;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;
  select in_agora into open_flag from public.missives where id = p_id;
  if open_flag is distinct from true then
    raise exception 'not_in_agora';
  end if;
  if exists (select 1 from public.agora_votes where missive_id = p_id and user_id = uid) then
    raise exception 'already_voted';
  end if;
  select count(*) into cnt from public.agora_votes where user_id = uid;
  if cnt >= 3 then
    raise exception 'vote_limit_reached';
  end if;
  insert into public.agora_votes (missive_id, user_id) values (p_id, uid);
end;
$$;

create or replace function public.unvote_agora_missive(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;
  delete from public.agora_votes where missive_id = p_id and user_id = uid;
end;
$$;

-- Admin marks missive as answered in Agora: leave agora + free votes
create or replace function public.admin_close_agora_missive(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if (auth.jwt() ->> 'email') is distinct from 'paulduflos0@gmail.com' then
    raise exception 'not_admin';
  end if;
  if not exists (select 1 from public.missives where id = p_id and in_agora = true) then
    raise exception 'not_in_agora';
  end if;
  delete from public.agora_votes where missive_id = p_id;
  update public.missives
  set in_agora = false
  where id = p_id;
end;
$$;

create or replace function public.my_agora_vote_count()
returns int
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int from public.agora_votes where user_id = auth.uid();
$$;

create or replace function public.list_agora()
returns table (
  id uuid,
  body text,
  author_username text,
  vote_count bigint,
  created_at timestamptz,
  agora_published_at timestamptz,
  my_vote boolean,
  is_mine boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    m.id,
    m.body,
    coalesce(p.username, 'Anonyme') as author_username,
    (select count(*) from public.agora_votes v where v.missive_id = m.id) as vote_count,
    m.created_at,
    m.agora_published_at,
    exists (
      select 1 from public.agora_votes v
      where v.missive_id = m.id and v.user_id = auth.uid()
    ) as my_vote,
    m.user_id = auth.uid() as is_mine
  from public.missives m
  left join public.profiles p on p.id = m.user_id
  where m.in_agora = true
  order by vote_count desc, m.agora_published_at desc nulls last;
$$;

revoke all on function public.publish_missive_to_agora(uuid) from public;
grant execute on function public.publish_missive_to_agora(uuid) to authenticated;
revoke all on function public.unpublish_missive_from_agora(uuid) from public;
grant execute on function public.unpublish_missive_from_agora(uuid) to authenticated;
revoke all on function public.vote_agora_missive(uuid) from public;
grant execute on function public.vote_agora_missive(uuid) to authenticated;
revoke all on function public.unvote_agora_missive(uuid) from public;
grant execute on function public.unvote_agora_missive(uuid) to authenticated;
revoke all on function public.admin_close_agora_missive(uuid) from public;
grant execute on function public.admin_close_agora_missive(uuid) to authenticated;
revoke all on function public.my_agora_vote_count() from public;
grant execute on function public.my_agora_vote_count() to authenticated;
revoke all on function public.list_agora() from public;
grant execute on function public.list_agora() to anon, authenticated;

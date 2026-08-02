-- NOTAM communautaires + textes editables (admin)
-- Run after schema-agora.sql

-- ============================================================================
-- Tables NOTAM
-- ============================================================================

create table if not exists public.notams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(trim(body)) >= 10),
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

create index if not exists notams_created_at_idx on public.notams (created_at desc);
create index if not exists notams_user_id_idx on public.notams (user_id);

create table if not exists public.notam_replies (
  id uuid primary key default gen_random_uuid(),
  notam_id uuid not null references public.notams (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(trim(body)) >= 2),
  created_at timestamptz not null default now()
);

create index if not exists notam_replies_notam_id_idx on public.notam_replies (notam_id);

create table if not exists public.notam_votes (
  user_id uuid not null references auth.users (id) on delete cascade,
  target_type text not null check (target_type in ('notam', 'reply')),
  target_id uuid not null,
  value smallint not null check (value in (1, -1)),
  created_at timestamptz not null default now(),
  primary key (user_id, target_type, target_id)
);

create index if not exists notam_votes_target_idx on public.notam_votes (target_type, target_id);

alter table public.notams enable row level security;
alter table public.notam_replies enable row level security;
alter table public.notam_votes enable row level security;

drop policy if exists "notams_select_authenticated" on public.notams;
create policy "notams_select_authenticated"
  on public.notams for select to authenticated
  using (true);

drop policy if exists "notam_replies_select_authenticated" on public.notam_replies;
create policy "notam_replies_select_authenticated"
  on public.notam_replies for select to authenticated
  using (true);

drop policy if exists "notam_votes_select_authenticated" on public.notam_votes;
create policy "notam_votes_select_authenticated"
  on public.notam_votes for select to authenticated
  using (true);

-- ============================================================================
-- NOTAM RPCs
-- ============================================================================

create or replace function public.submit_notam(p_body text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  new_id uuid;
  cleaned text := trim(p_body);
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;
  if char_length(cleaned) < 10 then
    raise exception 'body_too_short';
  end if;
  insert into public.notams (user_id, body)
  values (uid, cleaned)
  returning id into new_id;
  return new_id;
end;
$$;

create or replace function public.reply_notam(p_notam_id uuid, p_body text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  new_id uuid;
  cleaned text := trim(p_body);
  closed timestamptz;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;
  if char_length(cleaned) < 2 then
    raise exception 'body_too_short';
  end if;
  select closed_at into closed from public.notams where id = p_notam_id;
  if not found then
    raise exception 'not_found';
  end if;
  if closed is not null then
    raise exception 'notam_closed';
  end if;
  insert into public.notam_replies (notam_id, user_id, body)
  values (p_notam_id, uid, cleaned)
  returning id into new_id;
  return new_id;
end;
$$;

create or replace function public.vote_notam_target(
  p_target_type text,
  p_target_id uuid,
  p_value smallint
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  existing smallint;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;
  if p_target_type is distinct from 'notam' and p_target_type is distinct from 'reply' then
    raise exception 'bad_target_type';
  end if;
  if p_value is distinct from 1 and p_value is distinct from -1 then
    raise exception 'bad_value';
  end if;

  if p_target_type = 'notam' then
    if not exists (select 1 from public.notams where id = p_target_id and closed_at is null) then
      -- allow vote on open only; closed still readable but no new votes
      if not exists (select 1 from public.notams where id = p_target_id) then
        raise exception 'not_found';
      end if;
      -- closed: still allow vote change for sorting history — actually plan says closed no replies; votes OK on closed
    end if;
  else
    if not exists (select 1 from public.notam_replies where id = p_target_id) then
      raise exception 'not_found';
    end if;
  end if;

  select value into existing
  from public.notam_votes
  where user_id = uid and target_type = p_target_type and target_id = p_target_id;

  if existing is not null and existing = p_value then
    delete from public.notam_votes
    where user_id = uid and target_type = p_target_type and target_id = p_target_id;
  else
    insert into public.notam_votes (user_id, target_type, target_id, value)
    values (uid, p_target_type, p_target_id, p_value)
    on conflict (user_id, target_type, target_id)
    do update set value = excluded.value, created_at = now();
  end if;
end;
$$;

create or replace function public.admin_close_notam(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if (auth.jwt() ->> 'email') is distinct from 'paulduflos0@gmail.com' then
    raise exception 'not_admin';
  end if;
  if not exists (select 1 from public.notams where id = p_id) then
    raise exception 'not_found';
  end if;
  update public.notams set closed_at = now() where id = p_id and closed_at is null;
end;
$$;

create or replace function public.list_notams()
returns table (
  id uuid,
  body text,
  author_username text,
  score bigint,
  my_vote int,
  is_mine boolean,
  created_at timestamptz,
  closed_at timestamptz,
  replies jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select
    n.id,
    n.body,
    coalesce(p.username, 'Anonyme') as author_username,
    coalesce((
      select sum(v.value)::bigint from public.notam_votes v
      where v.target_type = 'notam' and v.target_id = n.id
    ), 0) as score,
    coalesce((
      select v.value::int from public.notam_votes v
      where v.target_type = 'notam' and v.target_id = n.id and v.user_id = auth.uid()
    ), 0) as my_vote,
    n.user_id = auth.uid() as is_mine,
    n.created_at,
    n.closed_at,
    coalesce((
      select jsonb_agg(to_jsonb(r) order by r.score desc, r.created_at asc)
      from (
        select
          nr.id,
          nr.body,
          coalesce(pr.username, 'Anonyme') as author_username,
          coalesce((
            select sum(vv.value)::bigint from public.notam_votes vv
            where vv.target_type = 'reply' and vv.target_id = nr.id
          ), 0) as score,
          coalesce((
            select vv.value::int from public.notam_votes vv
            where vv.target_type = 'reply' and vv.target_id = nr.id and vv.user_id = auth.uid()
          ), 0) as my_vote,
          nr.user_id = auth.uid() as is_mine,
          nr.created_at
        from public.notam_replies nr
        left join public.profiles pr on pr.id = nr.user_id
        where nr.notam_id = n.id
      ) r
    ), '[]'::jsonb) as replies
  from public.notams n
  left join public.profiles p on p.id = n.user_id
  where n.closed_at is null
     or (auth.jwt() ->> 'email') = 'paulduflos0@gmail.com'
     or n.user_id = auth.uid()
  order by
    case when n.closed_at is null then 0 else 1 end,
    score desc,
    n.created_at desc;
$$;

create or replace function public.list_my_notams()
returns table (
  id uuid,
  body text,
  score bigint,
  created_at timestamptz,
  closed_at timestamptz,
  reply_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    n.id,
    n.body,
    coalesce((
      select sum(v.value)::bigint from public.notam_votes v
      where v.target_type = 'notam' and v.target_id = n.id
    ), 0) as score,
    n.created_at,
    n.closed_at,
    (select count(*) from public.notam_replies nr where nr.notam_id = n.id) as reply_count
  from public.notams n
  where n.user_id = auth.uid()
  order by n.created_at desc;
$$;

revoke all on function public.submit_notam(text) from public;
grant execute on function public.submit_notam(text) to authenticated;
revoke all on function public.reply_notam(uuid, text) from public;
grant execute on function public.reply_notam(uuid, text) to authenticated;
revoke all on function public.vote_notam_target(text, uuid, smallint) from public;
grant execute on function public.vote_notam_target(text, uuid, smallint) to authenticated;
revoke all on function public.admin_close_notam(uuid) from public;
grant execute on function public.admin_close_notam(uuid) to authenticated;
revoke all on function public.list_notams() from public;
grant execute on function public.list_notams() to authenticated;
revoke all on function public.list_my_notams() from public;
grant execute on function public.list_my_notams() to authenticated;

-- ============================================================================
-- Site texts (mini-CMS)
-- ============================================================================

create table if not exists public.site_texts (
  key text primary key,
  value text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

alter table public.site_texts enable row level security;

drop policy if exists "site_texts_select_authenticated" on public.site_texts;
create policy "site_texts_select_authenticated"
  on public.site_texts for select to authenticated
  using (true);

create or replace function public.list_site_texts()
returns table (key text, value text, updated_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select s.key, s.value, s.updated_at from public.site_texts s order by s.key;
$$;

create or replace function public.upsert_site_text(p_key text, p_value text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if (auth.jwt() ->> 'email') is distinct from 'paulduflos0@gmail.com' then
    raise exception 'not_admin';
  end if;
  if p_key is null or length(trim(p_key)) = 0 then
    raise exception 'bad_key';
  end if;
  insert into public.site_texts (key, value, updated_at, updated_by)
  values (trim(p_key), coalesce(p_value, ''), now(), auth.uid())
  on conflict (key) do update
    set value = excluded.value,
        updated_at = now(),
        updated_by = auth.uid();
end;
$$;

revoke all on function public.list_site_texts() from public;
grant execute on function public.list_site_texts() to authenticated;
revoke all on function public.upsert_site_text(text, text) from public;
grant execute on function public.upsert_site_text(text, text) to authenticated;

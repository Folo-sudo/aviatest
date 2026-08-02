-- Friends, progression visibility, presence, duels
-- Run after schema-account.sql and schema-stadium.sql

-- ============================================================================
-- Profiles: visibility + duel wins
-- ============================================================================

alter table public.profiles
  add column if not exists progression_visibility text;

alter table public.profiles
  add column if not exists duel_wins int not null default 0;

update public.profiles
set progression_visibility = case
  when coalesce(progression_public, false) then 'public'
  else 'private'
end
where progression_visibility is null;

alter table public.profiles
  alter column progression_visibility set default 'private';

update public.profiles
set progression_visibility = 'private'
where progression_visibility is null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_progression_visibility_check'
  ) then
    alter table public.profiles
      add constraint profiles_progression_visibility_check
      check (progression_visibility in ('public', 'friends', 'private'));
  end if;
end $$;

alter table public.profiles
  alter column progression_visibility set not null;

-- Keep legacy boolean in sync for any leftover readers
create or replace function public.sync_progression_public_from_visibility()
returns trigger
language plpgsql
as $$
begin
  new.progression_public := (new.progression_visibility = 'public');
  return new;
end;
$$;

drop trigger if exists trg_sync_progression_public on public.profiles;
create trigger trg_sync_progression_public
  before insert or update of progression_visibility on public.profiles
  for each row execute function public.sync_progression_public_from_visibility();

update public.profiles
set progression_public = (progression_visibility = 'public');

-- ============================================================================
-- Friendships
-- ============================================================================

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users (id) on delete cascade,
  addressee_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  user_low uuid generated always as (least(requester_id, addressee_id)) stored,
  user_high uuid generated always as (greatest(requester_id, addressee_id)) stored,
  constraint friendships_no_self check (requester_id <> addressee_id),
  constraint friendships_pair_unique unique (user_low, user_high)
);

create index if not exists friendships_requester_idx on public.friendships (requester_id);
create index if not exists friendships_addressee_idx on public.friendships (addressee_id);
create index if not exists friendships_status_idx on public.friendships (status);

alter table public.friendships enable row level security;

drop policy if exists "friendships_select_participants" on public.friendships;
create policy "friendships_select_participants"
  on public.friendships for select to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- ============================================================================
-- Presence (in exercise)
-- ============================================================================

create table if not exists public.user_presence (
  user_id uuid primary key references auth.users (id) on delete cascade,
  in_exercise boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.user_presence enable row level security;

drop policy if exists "presence_select_authenticated" on public.user_presence;
create policy "presence_select_authenticated"
  on public.user_presence for select to authenticated
  using (true);

drop policy if exists "presence_upsert_own" on public.user_presence;
create policy "presence_upsert_own"
  on public.user_presence for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "presence_update_own" on public.user_presence;
create policy "presence_update_own"
  on public.user_presence for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================================
-- Duels
-- ============================================================================

create table if not exists public.duels (
  id uuid primary key default gen_random_uuid(),
  challenger_id uuid not null references auth.users (id) on delete cascade,
  opponent_id uuid not null references auth.users (id) on delete cascade,
  exercise_id text not null,
  settings jsonb not null default '{}'::jsonb,
  settings_hash text not null,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'active', 'completed', 'cancelled')),
  challenger_score jsonb,
  opponent_score jsonb,
  winner_id uuid references auth.users (id) on delete set null,
  launch_at timestamptz,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint duels_no_self check (challenger_id <> opponent_id)
);

create index if not exists duels_challenger_idx on public.duels (challenger_id, created_at desc);
create index if not exists duels_opponent_idx on public.duels (opponent_id, created_at desc);
create index if not exists duels_status_idx on public.duels (status);

alter table public.duels enable row level security;

drop policy if exists "duels_select_participants" on public.duels;
create policy "duels_select_participants"
  on public.duels for select to authenticated
  using (auth.uid() = challenger_id or auth.uid() = opponent_id);

-- ============================================================================
-- Helpers
-- ============================================================================

create or replace function public.are_friends(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and f.user_low = least(p_a, p_b)
      and f.user_high = greatest(p_a, p_b)
  );
$$;

create or replace function public.can_view_progression(p_owner uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    auth.uid() = p_owner
    or exists (
      select 1 from public.profiles p
      where p.id = p_owner
        and (
          p.progression_visibility = 'public'
          or (
            p.progression_visibility = 'friends'
            and public.are_friends(auth.uid(), p_owner)
          )
        )
    );
$$;

-- Update profile / performance RLS
drop policy if exists "profiles_select_own_or_public" on public.profiles;
create policy "profiles_select_own_or_visible"
  on public.profiles for select to authenticated
  using (
    auth.uid() = id
    or progression_visibility = 'public'
    or (
      progression_visibility = 'friends'
      and public.are_friends(auth.uid(), id)
    )
  );

drop policy if exists "perf_select_own_or_public" on public.performance_entries;
create policy "perf_select_own_or_visible"
  on public.performance_entries for select to authenticated
  using (public.can_view_progression(user_id));

-- ============================================================================
-- Friend RPCs
-- ============================================================================

create or replace function public.send_friend_request(p_pseudo text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  target uuid;
  existing_id uuid;
  existing_status text;
  new_id uuid;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;
  select id into target
  from public.profiles
  where username_normalized = lower(trim(p_pseudo))
  limit 1;
  if target is null then
    raise exception 'not_found';
  end if;
  if target = uid then
    raise exception 'cannot_friend_self';
  end if;

  select id, status into existing_id, existing_status
  from public.friendships
  where user_low = least(uid, target) and user_high = greatest(uid, target);

  if existing_id is not null then
    if existing_status = 'accepted' then
      raise exception 'already_friends';
    end if;
    if existing_status = 'pending' then
      raise exception 'already_pending';
    end if;
    -- declined: reopen as new request from current user
    update public.friendships
    set requester_id = uid,
        addressee_id = target,
        status = 'pending',
        created_at = now(),
        responded_at = null
    where id = existing_id;
    return existing_id;
  end if;

  insert into public.friendships (requester_id, addressee_id, status)
  values (uid, target, 'pending')
  returning id into new_id;
  return new_id;
end;
$$;

create or replace function public.respond_friend_request(p_id uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  row_addressee uuid;
  row_status text;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;
  select addressee_id, status into row_addressee, row_status
  from public.friendships where id = p_id;
  if row_addressee is null then
    raise exception 'not_found';
  end if;
  if row_addressee is distinct from uid then
    raise exception 'not_addressee';
  end if;
  if row_status is distinct from 'pending' then
    raise exception 'not_pending';
  end if;
  update public.friendships
  set status = case when p_accept then 'accepted' else 'declined' end,
      responded_at = now()
  where id = p_id;
end;
$$;

create or replace function public.remove_friend(p_user_id uuid)
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
  delete from public.friendships
  where user_low = least(uid, p_user_id)
    and user_high = greatest(uid, p_user_id)
    and status = 'accepted';
end;
$$;

create or replace function public.list_friends()
returns table (
  user_id uuid,
  username text,
  in_exercise boolean,
  friendship_id uuid,
  since timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end as user_id,
    p.username,
    coalesce(up.in_exercise, false) as in_exercise,
    f.id as friendship_id,
    coalesce(f.responded_at, f.created_at) as since
  from public.friendships f
  join public.profiles p
    on p.id = case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end
  left join public.user_presence up on up.user_id = p.id
  where f.status = 'accepted'
    and (f.requester_id = auth.uid() or f.addressee_id = auth.uid())
  order by p.username;
$$;

create or replace function public.list_friend_requests()
returns table (
  id uuid,
  direction text,
  other_user_id uuid,
  other_username text,
  status text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    f.id,
    case when f.requester_id = auth.uid() then 'outgoing' else 'incoming' end as direction,
    case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end as other_user_id,
    p.username as other_username,
    f.status,
    f.created_at
  from public.friendships f
  join public.profiles p
    on p.id = case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end
  where f.status = 'pending'
    and (f.requester_id = auth.uid() or f.addressee_id = auth.uid())
  order by f.created_at desc;
$$;

-- ============================================================================
-- Presence RPC
-- ============================================================================

create or replace function public.set_in_exercise(p_busy boolean)
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
  insert into public.user_presence (user_id, in_exercise, updated_at)
  values (uid, coalesce(p_busy, false), now())
  on conflict (user_id) do update
  set in_exercise = excluded.in_exercise,
      updated_at = now();
end;
$$;

-- ============================================================================
-- Profile visibility + search RPCs
-- ============================================================================

create or replace function public.set_progression_visibility(p_visibility text)
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
  if p_visibility is distinct from 'public'
     and p_visibility is distinct from 'friends'
     and p_visibility is distinct from 'private' then
    raise exception 'bad_visibility';
  end if;
  update public.profiles
  set progression_visibility = p_visibility
  where id = uid;
end;
$$;

-- Recreate profile lookup with expanded return type
drop function if exists public.get_profile_by_pseudo(text);
create or replace function public.get_profile_by_pseudo(p_pseudo text)
returns table (
  id uuid,
  username text,
  progression_public boolean,
  progression_visibility text,
  duel_wins int,
  can_view boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.username,
    (p.progression_visibility = 'public') as progression_public,
    p.progression_visibility,
    p.duel_wins,
    public.can_view_progression(p.id) as can_view
  from public.profiles p
  where p.username_normalized = lower(trim(p_pseudo))
  limit 1;
$$;

drop function if exists public.search_visible_pseudos(text);
create or replace function public.search_visible_pseudos(p_query text)
returns table (username text)
language sql
stable
security definer
set search_path = public
as $$
  select p.username
  from public.profiles p
  where p.id <> auth.uid()
    and (
      p.progression_visibility = 'public'
      or (
        p.progression_visibility = 'friends'
        and public.are_friends(auth.uid(), p.id)
      )
    )
    and (
      trim(p_query) = ''
      or p.username_normalized like lower(trim(p_query)) || '%'
    )
  order by p.username
  limit 20;
$$;

-- Keep old search working (now visible = public + friends)
drop function if exists public.search_public_pseudos(text);
create or replace function public.search_public_pseudos(p_query text)
returns table (username text)
language sql
stable
security definer
set search_path = public
as $$
  select username from public.search_visible_pseudos(p_query);
$$;

-- ============================================================================
-- Duel RPCs
-- ============================================================================

create or replace function public.challenge_duel(
  p_opponent_id uuid,
  p_exercise_id text,
  p_settings jsonb,
  p_settings_hash text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  new_id uuid;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;
  if p_opponent_id is null or p_opponent_id = uid then
    raise exception 'bad_opponent';
  end if;
  if not public.are_friends(uid, p_opponent_id) then
    raise exception 'not_friends';
  end if;
  if char_length(trim(coalesce(p_exercise_id, ''))) < 1 then
    raise exception 'bad_exercise';
  end if;
  if char_length(trim(coalesce(p_settings_hash, ''))) < 1 then
    raise exception 'bad_hash';
  end if;

  insert into public.duels (
    challenger_id, opponent_id, exercise_id, settings, settings_hash, status
  ) values (
    uid, p_opponent_id, trim(p_exercise_id), coalesce(p_settings, '{}'::jsonb),
    trim(p_settings_hash), 'pending'
  )
  returning id into new_id;
  return new_id;
end;
$$;

create or replace function public.respond_duel(p_id uuid, p_accept boolean)
returns public.duels
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  row public.duels;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;
  select * into row from public.duels where id = p_id;
  if row.id is null then
    raise exception 'not_found';
  end if;
  if row.opponent_id is distinct from uid then
    raise exception 'not_opponent';
  end if;
  if row.status is distinct from 'pending' then
    raise exception 'not_pending';
  end if;

  if not p_accept then
    update public.duels
    set status = 'declined'
    where id = p_id
    returning * into row;
    return row;
  end if;

  update public.duels
  set status = 'active',
      launch_at = now() + interval '8 seconds'
  where id = p_id
  returning * into row;
  return row;
end;
$$;

create or replace function public.submit_duel_score(
  p_id uuid,
  p_correct int,
  p_total int,
  p_avg_time_ms int default 0
)
returns public.duels
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  row public.duels;
  score jsonb;
  c_pct numeric;
  o_pct numeric;
  winner uuid;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;
  select * into row from public.duels where id = p_id for update;
  if row.id is null then
    raise exception 'not_found';
  end if;
  if uid is distinct from row.challenger_id and uid is distinct from row.opponent_id then
    raise exception 'not_participant';
  end if;
  if row.status is distinct from 'active' and row.status is distinct from 'completed' then
    raise exception 'not_active';
  end if;
  if row.status = 'completed' then
    return row;
  end if;

  score := jsonb_build_object(
    'correct', coalesce(p_correct, 0),
    'total', coalesce(p_total, 0),
    'score_pct', case
      when coalesce(p_total, 0) > 0
        then round((coalesce(p_correct, 0)::numeric / p_total::numeric) * 1000) / 10
      else 0
    end,
    'avg_time_ms', coalesce(p_avg_time_ms, 0)
  );

  if uid = row.challenger_id then
    if row.challenger_score is not null then
      return row;
    end if;
    update public.duels set challenger_score = score where id = p_id
    returning * into row;
  else
    if row.opponent_score is not null then
      return row;
    end if;
    update public.duels set opponent_score = score where id = p_id
    returning * into row;
  end if;

  if row.challenger_score is null or row.opponent_score is null then
    return row;
  end if;

  c_pct := coalesce((row.challenger_score->>'score_pct')::numeric, 0);
  o_pct := coalesce((row.opponent_score->>'score_pct')::numeric, 0);
  if c_pct > o_pct then
    winner := row.challenger_id;
  elsif o_pct > c_pct then
    winner := row.opponent_id;
  else
    winner := null;
  end if;

  update public.duels
  set winner_id = winner,
      status = 'completed',
      completed_at = now()
  where id = p_id
  returning * into row;

  if winner is not null then
    update public.profiles
    set duel_wins = duel_wins + 1
    where id = winner;
  end if;

  return row;
end;
$$;

create or replace function public.list_my_duels()
returns table (
  id uuid,
  challenger_id uuid,
  opponent_id uuid,
  challenger_username text,
  opponent_username text,
  exercise_id text,
  settings jsonb,
  settings_hash text,
  status text,
  challenger_score jsonb,
  opponent_score jsonb,
  winner_id uuid,
  launch_at timestamptz,
  created_at timestamptz,
  completed_at timestamptz,
  opponent_in_exercise boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    d.id,
    d.challenger_id,
    d.opponent_id,
    pc.username as challenger_username,
    po.username as opponent_username,
    d.exercise_id,
    d.settings,
    d.settings_hash,
    d.status,
    d.challenger_score,
    d.opponent_score,
    d.winner_id,
    d.launch_at,
    d.created_at,
    d.completed_at,
    case
      when d.challenger_id = auth.uid() then coalesce(upo.in_exercise, false)
      else coalesce(upc.in_exercise, false)
    end as opponent_in_exercise
  from public.duels d
  join public.profiles pc on pc.id = d.challenger_id
  join public.profiles po on po.id = d.opponent_id
  left join public.user_presence upc on upc.user_id = d.challenger_id
  left join public.user_presence upo on upo.user_id = d.opponent_id
  where d.challenger_id = auth.uid() or d.opponent_id = auth.uid()
  order by d.created_at desc
  limit 100;
$$;

create or replace function public.list_pending_duel_invites()
returns table (
  id uuid,
  challenger_id uuid,
  challenger_username text,
  exercise_id text,
  settings jsonb,
  settings_hash text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    d.id,
    d.challenger_id,
    p.username as challenger_username,
    d.exercise_id,
    d.settings,
    d.settings_hash,
    d.created_at
  from public.duels d
  join public.profiles p on p.id = d.challenger_id
  where d.opponent_id = auth.uid()
    and d.status = 'pending'
  order by d.created_at desc;
$$;

create or replace function public.get_duel(p_id uuid)
returns public.duels
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  row public.duels;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;
  select * into row from public.duels where id = p_id;
  if row.id is null then
    raise exception 'not_found';
  end if;
  if uid is distinct from row.challenger_id and uid is distinct from row.opponent_id then
    raise exception 'not_participant';
  end if;
  return row;
end;
$$;

create or replace function public.rematch_duel(p_duel_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  old public.duels;
  other uuid;
  new_id uuid;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;
  select * into old from public.duels where id = p_duel_id;
  if old.id is null then
    raise exception 'not_found';
  end if;
  if uid is distinct from old.challenger_id and uid is distinct from old.opponent_id then
    raise exception 'not_participant';
  end if;
  if old.status is distinct from 'completed' then
    raise exception 'not_completed';
  end if;
  other := case when uid = old.challenger_id then old.opponent_id else old.challenger_id end;
  if not public.are_friends(uid, other) then
    raise exception 'not_friends';
  end if;
  return public.challenge_duel(other, old.exercise_id, old.settings, old.settings_hash);
end;
$$;

create or replace function public.cancel_duel(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  row public.duels;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;
  select * into row from public.duels where id = p_id;
  if row.id is null then
    raise exception 'not_found';
  end if;
  if uid is distinct from row.challenger_id then
    raise exception 'not_challenger';
  end if;
  if row.status is distinct from 'pending' then
    raise exception 'not_pending';
  end if;
  update public.duels set status = 'cancelled' where id = p_id;
end;
$$;

-- ============================================================================
-- Grants
-- ============================================================================

revoke all on function public.are_friends(uuid, uuid) from public;
grant execute on function public.are_friends(uuid, uuid) to authenticated;
revoke all on function public.can_view_progression(uuid) from public;
grant execute on function public.can_view_progression(uuid) to authenticated;

revoke all on function public.send_friend_request(text) from public;
grant execute on function public.send_friend_request(text) to authenticated;
revoke all on function public.respond_friend_request(uuid, boolean) from public;
grant execute on function public.respond_friend_request(uuid, boolean) to authenticated;
revoke all on function public.remove_friend(uuid) from public;
grant execute on function public.remove_friend(uuid) to authenticated;
revoke all on function public.list_friends() from public;
grant execute on function public.list_friends() to authenticated;
revoke all on function public.list_friend_requests() from public;
grant execute on function public.list_friend_requests() to authenticated;

revoke all on function public.set_in_exercise(boolean) from public;
grant execute on function public.set_in_exercise(boolean) to authenticated;

revoke all on function public.set_progression_visibility(text) from public;
grant execute on function public.set_progression_visibility(text) to authenticated;
revoke all on function public.get_profile_by_pseudo(text) from public;
grant execute on function public.get_profile_by_pseudo(text) to authenticated;
revoke all on function public.search_visible_pseudos(text) from public;
grant execute on function public.search_visible_pseudos(text) to authenticated;
revoke all on function public.search_public_pseudos(text) from public;
grant execute on function public.search_public_pseudos(text) to authenticated;

revoke all on function public.challenge_duel(uuid, text, jsonb, text) from public;
grant execute on function public.challenge_duel(uuid, text, jsonb, text) to authenticated;
revoke all on function public.respond_duel(uuid, boolean) from public;
grant execute on function public.respond_duel(uuid, boolean) to authenticated;
revoke all on function public.submit_duel_score(uuid, int, int, int) from public;
grant execute on function public.submit_duel_score(uuid, int, int, int) to authenticated;
revoke all on function public.list_my_duels() from public;
grant execute on function public.list_my_duels() to authenticated;
revoke all on function public.list_pending_duel_invites() from public;
grant execute on function public.list_pending_duel_invites() to authenticated;
revoke all on function public.get_duel(uuid) from public;
grant execute on function public.get_duel(uuid) to authenticated;
revoke all on function public.rematch_duel(uuid) from public;
grant execute on function public.rematch_duel(uuid) to authenticated;
revoke all on function public.cancel_duel(uuid) from public;
grant execute on function public.cancel_duel(uuid) to authenticated;

-- Realtime
do $$
begin
  begin
    alter publication supabase_realtime add table public.duels;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.user_presence;
  exception when duplicate_object then null;
  end;
end $$;

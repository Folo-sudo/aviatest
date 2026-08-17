-- Compteurs d'usage anonymes (pas de cookie, pas d'identite).
-- Run once in the Supabase SQL Editor.

create table if not exists public.exercise_usage_daily (
  day date not null,
  exercise_id text not null,
  variant text not null,
  opens integer not null default 0,
  starts integer not null default 0,
  completes integer not null default 0,
  constraint exercise_usage_daily_pkey primary key (day, exercise_id, variant),
  constraint exercise_usage_daily_variant_check check (variant in ('desktop', 'mobile')),
  constraint exercise_usage_daily_id_check check (
    char_length(exercise_id) between 2 and 64
    and exercise_id ~ '^[a-z0-9-]+$'
  )
);

alter table public.exercise_usage_daily enable row level security;

-- Pas d'acces direct table : uniquement via RPC.

create or replace function public.record_exercise_usage(
  p_exercise_id text,
  p_event text,
  p_variant text default 'desktop'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id text;
  v_variant text;
  v_day date;
begin
  v_id := lower(trim(p_exercise_id));
  v_variant := lower(trim(coalesce(p_variant, 'desktop')));
  if v_id is null
     or char_length(v_id) < 2
     or char_length(v_id) > 64
     or v_id !~ '^[a-z0-9-]+$' then
    raise exception 'bad_exercise_id';
  end if;
  if p_event not in ('open', 'start', 'complete') then
    raise exception 'bad_event';
  end if;
  if v_variant not in ('desktop', 'mobile') then
    raise exception 'bad_variant';
  end if;

  v_day := (timezone('Europe/Paris', now()))::date;

  insert into public.exercise_usage_daily as u
    (day, exercise_id, variant, opens, starts, completes)
  values (
    v_day,
    v_id,
    v_variant,
    case when p_event = 'open' then 1 else 0 end,
    case when p_event = 'start' then 1 else 0 end,
    case when p_event = 'complete' then 1 else 0 end
  )
  on conflict (day, exercise_id, variant) do update
    set opens = u.opens + excluded.opens,
        starts = u.starts + excluded.starts,
        completes = u.completes + excluded.completes;
end;
$$;

create or replace function public.list_exercise_usage()
returns table (
  exercise_id text,
  opens bigint,
  starts bigint,
  completes bigint,
  opens_7d bigint,
  starts_7d bigint,
  completes_7d bigint,
  opens_mobile bigint,
  starts_mobile bigint,
  completes_mobile bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if (auth.jwt() ->> 'email') is distinct from 'paulduflos0@gmail.com' then
    raise exception 'not_admin';
  end if;

  return query
  select
    d.exercise_id,
    sum(d.opens)::bigint,
    sum(d.starts)::bigint,
    sum(d.completes)::bigint,
    sum(d.opens) filter (
      where d.day >= (timezone('Europe/Paris', now()))::date - 6
    )::bigint,
    sum(d.starts) filter (
      where d.day >= (timezone('Europe/Paris', now()))::date - 6
    )::bigint,
    sum(d.completes) filter (
      where d.day >= (timezone('Europe/Paris', now()))::date - 6
    )::bigint,
    sum(d.opens) filter (where d.variant = 'mobile')::bigint,
    sum(d.starts) filter (where d.variant = 'mobile')::bigint,
    sum(d.completes) filter (where d.variant = 'mobile')::bigint
  from public.exercise_usage_daily d
  group by d.exercise_id;
end;
$$;

revoke all on function public.record_exercise_usage(text, text, text) from public;
grant execute on function public.record_exercise_usage(text, text, text) to anon, authenticated;

revoke all on function public.list_exercise_usage() from public;
grant execute on function public.list_exercise_usage() to authenticated;

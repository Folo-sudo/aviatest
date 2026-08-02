-- Admin hard deletes: Stadium competitions, missives, NOTAMs
-- Run after schema-stadium.sql, schema-agora.sql, schema-notam-and-texts.sql

-- ============================================================================
-- Delete Stadium competition (+ scores via cascade)
-- ============================================================================

create or replace function public.admin_delete_competition(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if (auth.jwt() ->> 'email') is distinct from 'paulduflos0@gmail.com' then
    raise exception 'not_admin';
  end if;
  if not exists (select 1 from public.competitions where id = p_id) then
    raise exception 'not_found';
  end if;
  delete from public.competitions where id = p_id;
end;
$$;

-- ============================================================================
-- Delete missive (+ agora_votes via cascade)
-- ============================================================================

create or replace function public.admin_delete_missive(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if (auth.jwt() ->> 'email') is distinct from 'paulduflos0@gmail.com' then
    raise exception 'not_admin';
  end if;
  if not exists (select 1 from public.missives where id = p_id) then
    raise exception 'not_found';
  end if;
  delete from public.agora_votes where missive_id = p_id;
  delete from public.missives where id = p_id;
end;
$$;

-- ============================================================================
-- Delete NOTAM (+ replies cascade; votes cleaned manually — no FK)
-- ============================================================================

create or replace function public.admin_delete_notam(p_id uuid)
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

  delete from public.notam_votes
  where target_type = 'notam' and target_id = p_id;

  delete from public.notam_votes
  where target_type = 'reply'
    and target_id in (
      select id from public.notam_replies where notam_id = p_id
    );

  delete from public.notams where id = p_id;
end;
$$;

revoke all on function public.admin_delete_competition(uuid) from public;
grant execute on function public.admin_delete_competition(uuid) to authenticated;

revoke all on function public.admin_delete_missive(uuid) from public;
grant execute on function public.admin_delete_missive(uuid) to authenticated;

revoke all on function public.admin_delete_notam(uuid) from public;
grant execute on function public.admin_delete_notam(uuid) to authenticated;

-- Guest / anon read-only: Stadium classements + Agora missives/NOTAM
-- Run in Supabase SQL Editor AFTER schema-stadium / schema-agora /
-- schema-notam-and-texts / schema-security-hardening.
--
-- Guests (no session) can VIEW competitions, scores, agora missives and
-- open NOTAMs. They cannot insert/update/vote/reply (no anon write policies,
-- vote/reply RPCs stay authenticated-only).

begin;

-- Stadium: public leaderboards
drop policy if exists "competitions_select_anon" on public.competitions;
create policy "competitions_select_anon"
  on public.competitions for select to anon
  using (true);

drop policy if exists "competition_scores_select_anon" on public.competition_scores;
create policy "competition_scores_select_anon"
  on public.competition_scores for select to anon
  using (true);

-- Agora + NOTAM list RPCs (SECURITY DEFINER; my_vote/is_mine are false when auth.uid() is null)
grant execute on function public.list_agora() to anon;
grant execute on function public.list_notams() to anon;

commit;

import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { getPseudo } from '@/lib/core/PerformanceTracker';

/** Exercises that appear as fixed Stadium competitions — not user-creatable. */
export const SPECIAL_STADIUM_EXERCISE_IDS = ['sparing', 'sparing-bleu'] as const;

export function isSpecialStadiumExercise(exerciseId: string): boolean {
  return (SPECIAL_STADIUM_EXERCISE_IDS as readonly string[]).includes(exerciseId);
}

export type Competition = {
  id: string;
  exercise_id: string;
  settings: Record<string, unknown>;
  settings_hash: string;
  created_by: string;
  created_at: string;
};

export type CompetitionScore = {
  id: string;
  competition_id: string;
  user_id: string;
  pseudo: string;
  correct: number;
  total: number;
  score_pct: number;
  avg_time_ms: number | null;
  updated_at: string;
};

/** Stable JSON for hashing: sorted object keys recursively. */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) {
      out[key] = sortKeys(obj[key]);
    }
    return out;
  }
  return value;
}

export async function hashSettings(
  settings: Record<string, unknown>,
): Promise<string> {
  const data = new TextEncoder().encode(canonicalJson(settings));
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function listCompetitions(): Promise<Competition[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('competitions')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as Competition[];
}

export async function getCompetition(id: string): Promise<Competition | null> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('competitions')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as Competition | null;
}

export async function getSpecialCompetition(
  exerciseId: string,
): Promise<Competition | null> {
  if (!isSpecialStadiumExercise(exerciseId)) return null;
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('competitions')
    .select('*')
    .eq('exercise_id', exerciseId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as Competition | null;
}

/**
 * Ensure fixed special competitions exist (Sparing, …).
 * Silent system seed — not a user "create" action.
 */
export async function ensureSpecialCompetitions(): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  for (const exerciseId of SPECIAL_STADIUM_EXERCISE_IDS) {
    const existing = await getSpecialCompetition(exerciseId);
    if (existing) continue;
    try {
      await createCompetition(exerciseId, {}, { allowSpecial: true });
    } catch (err) {
      if (err instanceof Error && err.message === 'competition_exists') continue;
      throw err;
    }
  }
}

export async function adminDeleteCompetition(id: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.rpc('admin_delete_competition', { p_id: id });
  if (error) {
    if (/not_admin/i.test(error.message)) throw new Error('not_admin');
    if (/not_found/i.test(error.message)) throw new Error('not_found');
    throw error;
  }
}

export async function createCompetition(
  exerciseId: string,
  settings: Record<string, unknown>,
  options?: { allowSpecial?: boolean },
): Promise<Competition> {
  if (isSpecialStadiumExercise(exerciseId) && !options?.allowSpecial) {
    throw new Error('special_competition');
  }

  const supabase = getSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('not_authenticated');

  const settings_hash = await hashSettings(settings);
  const { data, error } = await supabase
    .from('competitions')
    .insert({
      exercise_id: exerciseId,
      settings,
      settings_hash,
      created_by: user.id,
    })
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505' || /unique|duplicate/i.test(error.message)) {
      throw new Error('competition_exists');
    }
    throw error;
  }
  return data as Competition;
}

export async function listScoresForCompetition(
  competitionId: string,
): Promise<CompetitionScore[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('competition_scores')
    .select('*')
    .eq('competition_id', competitionId)
    .order('score_pct', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data || []) as CompetitionScore[];
}

export async function listTopScoresGrouped(
  competitionIds: string[],
): Promise<Record<string, CompetitionScore[]>> {
  if (competitionIds.length === 0) return {};
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('competition_scores')
    .select('*')
    .in('competition_id', competitionIds)
    .order('score_pct', { ascending: false });
  if (error) throw error;
  const grouped: Record<string, CompetitionScore[]> = {};
  for (const row of (data || []) as CompetitionScore[]) {
    const list = grouped[row.competition_id] || [];
    if (list.length < 50) {
      list.push(row);
      grouped[row.competition_id] = list;
    }
  }
  return grouped;
}

/**
 * Upsert best score for the current user on a competition.
 * Specials (Sparing…): ranked by correct count.
 * Other competitions: ranked by score_pct.
 */
export async function upsertCompetitionBestScore(
  competitionId: string,
  correct: number,
  total: number,
  avgTimeMs: number = 0,
): Promise<'updated' | 'unchanged' | 'skipped'> {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 'skipped';

  const pseudo = getPseudo() || 'Anonyme';
  const score_pct = total > 0 ? Math.round((correct / total) * 1000) / 10 : 0;

  const { data: competition } = await supabase
    .from('competitions')
    .select('exercise_id')
    .eq('id', competitionId)
    .maybeSingle();
  const byCount = competition
    ? isSpecialStadiumExercise(String((competition as { exercise_id: string }).exercise_id))
    : false;

  const { data: existing } = await supabase
    .from('competition_scores')
    .select('*')
    .eq('competition_id', competitionId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing) {
    if (byCount) {
      if (Number(existing.correct) >= correct) return 'unchanged';
    } else if (Number(existing.score_pct) >= score_pct) {
      return 'unchanged';
    }
  }

  const payload = {
    competition_id: competitionId,
    user_id: user.id,
    pseudo,
    correct,
    total,
    score_pct,
    avg_time_ms: Math.round(avgTimeMs),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('competition_scores')
    .upsert(payload, { onConflict: 'competition_id,user_id' });

  if (error) throw error;
  return 'updated';
}

/** Rank scores: specials by correct count, others by score_pct. */
export function sortCompetitionScores(
  scores: CompetitionScore[],
  byCount: boolean,
): CompetitionScore[] {
  return [...scores].sort((a, b) => {
    if (byCount) {
      if (b.correct !== a.correct) return b.correct - a.correct;
      return Number(b.score_pct) - Number(a.score_pct);
    }
    return Number(b.score_pct) - Number(a.score_pct);
  });
}

/** Specials first (Sparing rouge, Sparing Bleu…), then newest. */
export function sortCompetitionsForDisplay(list: Competition[]): Competition[] {
  const specialOrder = SPECIAL_STADIUM_EXERCISE_IDS as readonly string[];
  return [...list].sort((a, b) => {
    const aIdx = specialOrder.indexOf(a.exercise_id);
    const bIdx = specialOrder.indexOf(b.exercise_id);
    const aSpecial = aIdx >= 0;
    const bSpecial = bIdx >= 0;
    if (aSpecial && bSpecial) return aIdx - bIdx;
    if (aSpecial !== bSpecial) return aSpecial ? -1 : 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

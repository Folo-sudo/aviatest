import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { getPseudo } from '@/lib/core/PerformanceTracker';

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

export async function createCompetition(
  exerciseId: string,
  settings: Record<string, unknown>,
): Promise<Competition> {
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
    if (list.length < 10) {
      list.push(row);
      grouped[row.competition_id] = list;
    }
  }
  return grouped;
}

/**
 * Upsert best score for the current user on a competition.
 * Only updates when the new score_pct is strictly better.
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

  const { data: existing } = await supabase
    .from('competition_scores')
    .select('*')
    .eq('competition_id', competitionId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing && Number(existing.score_pct) >= score_pct) {
    return 'unchanged';
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

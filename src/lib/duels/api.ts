import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type DuelScore = {
  correct: number;
  total: number;
  score_pct: number;
  avg_time_ms: number;
};

export type DuelStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'active'
  | 'completed'
  | 'cancelled';

export type Duel = {
  id: string;
  challenger_id: string;
  opponent_id: string;
  challenger_username?: string;
  opponent_username?: string;
  exercise_id: string;
  settings: Record<string, unknown>;
  settings_hash: string;
  status: DuelStatus;
  challenger_score: DuelScore | null;
  opponent_score: DuelScore | null;
  winner_id: string | null;
  launch_at: string | null;
  created_at: string;
  completed_at: string | null;
  opponent_in_exercise?: boolean;
};

export type PendingDuelInvite = {
  id: string;
  challenger_id: string;
  challenger_username: string;
  exercise_id: string;
  settings: Record<string, unknown>;
  settings_hash: string;
  created_at: string;
};

function mapScore(raw: unknown): DuelScore | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  return {
    correct: Number(o.correct) || 0,
    total: Number(o.total) || 0,
    score_pct: Number(o.score_pct) || 0,
    avg_time_ms: Number(o.avg_time_ms) || 0,
  };
}

function mapDuel(row: Record<string, unknown>): Duel {
  return {
    id: String(row.id),
    challenger_id: String(row.challenger_id),
    opponent_id: String(row.opponent_id),
    challenger_username: row.challenger_username
      ? String(row.challenger_username)
      : undefined,
    opponent_username: row.opponent_username
      ? String(row.opponent_username)
      : undefined,
    exercise_id: String(row.exercise_id || ''),
    settings:
      row.settings && typeof row.settings === 'object'
        ? (row.settings as Record<string, unknown>)
        : {},
    settings_hash: String(row.settings_hash || ''),
    status: String(row.status || 'pending') as DuelStatus,
    challenger_score: mapScore(row.challenger_score),
    opponent_score: mapScore(row.opponent_score),
    winner_id: row.winner_id ? String(row.winner_id) : null,
    launch_at: row.launch_at ? String(row.launch_at) : null,
    created_at: String(row.created_at || ''),
    completed_at: row.completed_at ? String(row.completed_at) : null,
    opponent_in_exercise:
      row.opponent_in_exercise !== undefined
        ? Boolean(row.opponent_in_exercise)
        : undefined,
  };
}

export async function listMyDuels(): Promise<Duel[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc('list_my_duels');
  if (error) throw error;
  return ((data || []) as Record<string, unknown>[]).map(mapDuel);
}

export async function listPendingDuelInvites(): Promise<PendingDuelInvite[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc('list_pending_duel_invites');
  if (error) throw error;
  return ((data || []) as Record<string, unknown>[]).map((row) => ({
    id: String(row.id),
    challenger_id: String(row.challenger_id),
    challenger_username: String(row.challenger_username || ''),
    exercise_id: String(row.exercise_id || ''),
    settings:
      row.settings && typeof row.settings === 'object'
        ? (row.settings as Record<string, unknown>)
        : {},
    settings_hash: String(row.settings_hash || ''),
    created_at: String(row.created_at || ''),
  }));
}

export async function getDuel(id: string): Promise<Duel> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc('get_duel', { p_id: id });
  if (error) throw error;
  return mapDuel((data || {}) as Record<string, unknown>);
}

export async function challengeDuel(
  opponentId: string,
  exerciseId: string,
  settings: Record<string, unknown>,
  settingsHash: string,
): Promise<string> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc('challenge_duel', {
    p_opponent_id: opponentId,
    p_exercise_id: exerciseId,
    p_settings: settings,
    p_settings_hash: settingsHash,
  });
  if (error) {
    const m = error.message || '';
    if (/not_friends/i.test(m)) throw new Error('not_friends');
    if (/bad_opponent/i.test(m)) throw new Error('bad_opponent');
    throw error;
  }
  return String(data);
}

export async function respondDuel(
  id: string,
  accept: boolean,
): Promise<Duel> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc('respond_duel', {
    p_id: id,
    p_accept: accept,
  });
  if (error) {
    const m = error.message || '';
    if (/not_pending/i.test(m)) throw new Error('not_pending');
    if (/not_opponent/i.test(m)) throw new Error('not_opponent');
    throw error;
  }
  return mapDuel((data || {}) as Record<string, unknown>);
}

export async function submitDuelScore(
  id: string,
  correct: number,
  total: number,
  avgTimeMs: number = 0,
): Promise<Duel> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc('submit_duel_score', {
    p_id: id,
    p_correct: correct,
    p_total: total,
    p_avg_time_ms: Math.round(avgTimeMs),
  });
  if (error) throw error;
  return mapDuel((data || {}) as Record<string, unknown>);
}

export async function rematchDuel(duelId: string): Promise<string> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc('rematch_duel', {
    p_duel_id: duelId,
  });
  if (error) {
    const m = error.message || '';
    if (/not_friends/i.test(m)) throw new Error('not_friends');
    if (/not_completed/i.test(m)) throw new Error('not_completed');
    throw error;
  }
  return String(data);
}

export async function cancelDuel(id: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.rpc('cancel_duel', { p_id: id });
  if (error) throw error;
}

export function subscribeMyDuels(
  userId: string,
  onChange: () => void,
): RealtimeChannel {
  const supabase = getSupabaseBrowserClient();
  return supabase
    .channel(`duels-${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'duels',
        filter: `challenger_id=eq.${userId}`,
      },
      () => onChange(),
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'duels',
        filter: `opponent_id=eq.${userId}`,
      },
      () => onChange(),
    )
    .subscribe();
}

export const DUEL_SESSION_KEY = 'aviatest-duel-id';

export function setActiveDuelId(id: string | null): void {
  if (typeof window === 'undefined') return;
  if (id) sessionStorage.setItem(DUEL_SESSION_KEY, id);
  else sessionStorage.removeItem(DUEL_SESSION_KEY);
}

export function getActiveDuelId(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(DUEL_SESSION_KEY);
}

export function openDuelTab(exerciseSlug: string, duelId: string): void {
  if (typeof window === 'undefined') return;
  window.open(`/exercices/${exerciseSlug}?duelId=${duelId}`, '_blank');
}

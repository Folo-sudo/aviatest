import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { setPseudo, getPseudo } from '@/lib/core/PerformanceTracker';
import type { PerformanceEntry } from '@/lib/core/PerformanceTracker';

export type ProgressionVisibility = 'public' | 'friends' | 'private';

export type UserProfile = {
  id: string;
  username: string;
  username_pending: boolean;
  progression_public: boolean;
  progression_visibility: ProgressionVisibility;
  duel_wins: number;
  email: string | null;
};

const KEY_PREFIX = 'aviatest-perf:';

function normalizeVisibility(raw: unknown): ProgressionVisibility {
  if (raw === 'public' || raw === 'friends' || raw === 'private') return raw;
  return 'private';
}

/** Move local performance keys from one pseudo to another. */
export function migrateLocalPseudoKeys(from: string, to: string): void {
  if (typeof window === 'undefined' || !from || !to || from === to) return;
  const fromPrefix = `${KEY_PREFIX}${from}:`;
  const toPrefix = `${KEY_PREFIX}${to}:`;
  try {
    const moves: { fromKey: string; toKey: string; value: string }[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(fromPrefix)) {
        const exerciseId = key.slice(fromPrefix.length);
        const value = localStorage.getItem(key);
        if (value != null) {
          moves.push({ fromKey: key, toKey: `${toPrefix}${exerciseId}`, value });
        }
      }
    }
    for (const m of moves) {
      if (!localStorage.getItem(m.toKey)) {
        localStorage.setItem(m.toKey, m.value);
      }
      localStorage.removeItem(m.fromKey);
    }
  } catch {
    /* ignore */
  }
}

export async function fetchMyProfile(): Promise<UserProfile | null> {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, username_pending, progression_public, progression_visibility, duel_wins')
    .eq('id', user.id)
    .maybeSingle();

  if (error || !data) return null;

  const visibility = normalizeVisibility(data.progression_visibility);
  return {
    id: data.id as string,
    username: data.username as string,
    username_pending: Boolean(data.username_pending),
    progression_public: visibility === 'public' || Boolean(data.progression_public),
    progression_visibility: visibility,
    duel_wins: Number(data.duel_wins) || 0,
    email: user.email ?? null,
  };
}

/** Bind local pseudo to the unique profile username (1 email = 1 pseudo). */
export async function syncPseudoFromProfile(): Promise<string | null> {
  const profile = await fetchMyProfile();
  if (!profile || profile.username_pending) return null;
  const old = getPseudo();
  if (old && old !== profile.username) {
    migrateLocalPseudoKeys(old, profile.username);
  }
  setPseudo(profile.username);
  return profile.username;
}

/** First Google / OAuth login: set definitive username when username_pending. */
export async function claimUsername(candidate: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.rpc('claim_username', {
    candidate: candidate.trim(),
  });
  if (error) throw error;
  await syncPseudoFromProfile();
}

export async function setProgressionVisibility(
  visibility: ProgressionVisibility,
): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.rpc('set_progression_visibility', {
    p_visibility: visibility,
  });
  if (error) throw error;
}

/** @deprecated use setProgressionVisibility */
export async function setProgressionPublic(value: boolean): Promise<void> {
  await setProgressionVisibility(value ? 'public' : 'private');
}

export async function upsertPerformanceCloud(
  exerciseId: string,
  entries: PerformanceEntry[],
): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from('performance_entries').upsert(
    {
      user_id: user.id,
      exercise_id: exerciseId,
      entries,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,exercise_id' },
  );
}

export async function syncAllLocalProgressToCloud(): Promise<void> {
  if (typeof window === 'undefined') return;
  const pseudo = getPseudo();
  if (!pseudo) return;
  const prefix = `${KEY_PREFIX}${pseudo}:`;
  const supabase = getSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const rows: {
    user_id: string;
    exercise_id: string;
    entries: PerformanceEntry[];
    updated_at: string;
  }[] = [];

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(prefix)) continue;
      const exerciseId = key.slice(prefix.length);
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      try {
        const entries = JSON.parse(raw) as PerformanceEntry[];
        rows.push({
          user_id: user.id,
          exercise_id: exerciseId,
          entries,
          updated_at: new Date().toISOString(),
        });
      } catch {
        /* skip bad key */
      }
    }
  } catch {
    return;
  }

  if (rows.length === 0) return;
  await supabase.from('performance_entries').upsert(rows, {
    onConflict: 'user_id,exercise_id',
  });
}

export type PseudoLookup = {
  id: string;
  username: string;
  progression_public: boolean;
  progression_visibility: ProgressionVisibility;
  duel_wins: number;
  can_view: boolean;
};

export async function lookupPseudo(
  pseudo: string,
): Promise<PseudoLookup | null> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc('get_profile_by_pseudo', {
    p_pseudo: pseudo.trim(),
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  const visibility = normalizeVisibility(row.progression_visibility);
  return {
    id: row.id as string,
    username: row.username as string,
    progression_public: visibility === 'public',
    progression_visibility: visibility,
    duel_wins: Number(row.duel_wins) || 0,
    can_view: Boolean(row.can_view),
  };
}

export async function searchPublicPseudos(query: string): Promise<string[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc('search_visible_pseudos', {
    p_query: query.trim(),
  });
  if (error) {
    const fallback = await supabase.rpc('search_public_pseudos', {
      p_query: query.trim(),
    });
    if (fallback.error) throw error;
    return ((fallback.data || []) as { username: string }[]).map((r) => r.username);
  }
  return ((data || []) as { username: string }[]).map((r) => r.username);
}

export async function fetchCloudEntriesForUser(
  userId: string,
): Promise<Record<string, PerformanceEntry[]>> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('performance_entries')
    .select('exercise_id, entries')
    .eq('user_id', userId);
  if (error) throw error;
  const out: Record<string, PerformanceEntry[]> = {};
  for (const row of data || []) {
    out[row.exercise_id as string] = (row.entries || []) as PerformanceEntry[];
  }
  return out;
}

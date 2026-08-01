import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { setPseudo, getPseudo } from '@/lib/core/PerformanceTracker';
import type { PerformanceEntry } from '@/lib/core/PerformanceTracker';

export type UserProfile = {
  id: string;
  username: string;
  progression_public: boolean;
  email: string | null;
};

const KEY_PREFIX = 'aviatest-perf:';

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
    .select('id, username, progression_public')
    .eq('id', user.id)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id as string,
    username: data.username as string,
    progression_public: Boolean(data.progression_public),
    email: user.email ?? null,
  };
}

/** Bind local pseudo to the unique profile username (1 email = 1 pseudo). */
export async function syncPseudoFromProfile(): Promise<string | null> {
  const profile = await fetchMyProfile();
  if (!profile) return null;
  const old = getPseudo();
  if (old && old !== profile.username) {
    migrateLocalPseudoKeys(old, profile.username);
  }
  setPseudo(profile.username);
  return profile.username;
}

export async function setProgressionPublic(value: boolean): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('not_authenticated');

  const { error } = await supabase
    .from('profiles')
    .update({ progression_public: value })
    .eq('id', user.id);

  if (error) throw error;
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
  return {
    id: row.id as string,
    username: row.username as string,
    progression_public: Boolean(row.progression_public),
  };
}

export async function searchPublicPseudos(query: string): Promise<string[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc('search_public_pseudos', {
    p_query: query.trim(),
  });
  if (error) throw error;
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

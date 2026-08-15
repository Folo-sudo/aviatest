/**
 * PerformanceTracker - Persists exercise results in localStorage,
 * namespaced by user pseudo.
 */

export interface PerformanceEntry {
  date: string;       // ISO string
  score: number;       // percentage 0-100
  correct: number;
  total: number;
  avgTimeMs: number;   // average time per question in ms (0 if not applicable)
}

export interface ExerciseStats {
  exerciseId: string;
  entries: PerformanceEntry[];
  totalAttempts: number;
  bestScore: number;
  worstScore: number;
  avgScore: number;
  lastScore: number;
  last7DaysAvg: number | null;
  last3DaysAvg: number | null;
  todayAvg: number | null;
  avgTimeSec: number | null;      // average time per question across all sessions (seconds)
  lastAvgTimeSec: number | null;  // average time per question of last session (seconds)
}

// Key format: aviatest-perf:{pseudo}:{exerciseId}
const KEY_PREFIX = 'aviatest-perf:';
const PSEUDO_KEY = 'aviatest-pseudo';
const PSEUDOS_LIST_KEY = 'aviatest-pseudos';
const MAX_ENTRIES = 200;

// ============================================================================
// Pseudo management
// ============================================================================

/**
 * Get the current pseudo. Returns null if none set.
 */
export function getPseudo(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(PSEUDO_KEY) || null;
}

/**
 * Set the current pseudo and register it in the known list.
 */
export function setPseudo(name: string): void {
  if (typeof window === 'undefined') return;
  const trimmed = name.trim();
  if (!trimmed) return;
  localStorage.setItem(PSEUDO_KEY, trimmed);
  // Add to known pseudos list
  const list = listPseudos();
  if (!list.includes(trimmed)) {
    list.push(trimmed);
    localStorage.setItem(PSEUDOS_LIST_KEY, JSON.stringify(list));
  }
}

/**
 * List all known pseudos.
 */
export function listPseudos(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PSEUDOS_LIST_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

/**
 * Clear the current pseudo (logout).
 */
export function clearPseudo(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(PSEUDO_KEY);
}

// ============================================================================
// Stanine
// ============================================================================

/**
 * Convert a percentage score (0-100) to a stanine-like 1-9 scale
 */
export function scoreToStanine(percent: number): number {
  if (percent >= 96) return 9;
  if (percent >= 89) return 8;
  if (percent >= 77) return 7;
  if (percent >= 60) return 6;
  if (percent >= 40) return 5;
  if (percent >= 23) return 4;
  if (percent >= 11) return 3;
  if (percent >= 4) return 2;
  return 1;
}

// ============================================================================
// Internal helpers
// ============================================================================

function storageKey(pseudo: string, exerciseId: string): string {
  return `${KEY_PREFIX}${pseudo}:${exerciseId}`;
}

function currentPrefix(): string | null {
  const pseudo = getPseudo();
  if (!pseudo) return null;
  return `${KEY_PREFIX}${pseudo}:`;
}

// ============================================================================
// Performance data CRUD
// ============================================================================

/**
 * Save a performance result for an exercise (uses current pseudo).
 * Score is always computed as (correct / total) * 100 to ensure
 * unanswered questions count against the score.
 */
export function savePerformanceResult(
  exerciseId: string,
  correct: number,
  total: number,
  avgTimeMs: number = 0,
): void {
  if (typeof window === 'undefined') return;
  // Guests: no local progression, no cloud, no Stadium scores
  try {
    if (sessionStorage.getItem('aviatest-guest') === '1') return;
  } catch { /* ignore */ }
  const pseudo = getPseudo();
  if (!pseudo) return;
  try {
    const key = storageKey(pseudo, exerciseId);
    const existing = loadEntries(exerciseId);
    const entry: PerformanceEntry = {
      date: new Date().toISOString(),
      score: total > 0 ? Math.round((correct / total) * 1000) / 10 : 0,
      correct,
      total,
      avgTimeMs: Math.round(avgTimeMs),
    };
    existing.push(entry);
    if (existing.length > MAX_ENTRIES) {
      existing.splice(0, existing.length - MAX_ENTRIES);
    }
    localStorage.setItem(key, JSON.stringify(existing));
  } catch { /* quota exceeded or unavailable */ }

  // Cloud sync for public progression (fire-and-forget)
  try {
    const entries = loadEntries(exerciseId);
    void import('@/lib/account/profile')
      .then(({ upsertPerformanceCloud }) =>
        upsertPerformanceCloud(exerciseId, entries),
      )
      .catch(() => { /* ignore */ });
  } catch { /* ignore */ }

  // Stadium: best score per competition (fire-and-forget)
  try {
    const competitionId = sessionStorage.getItem('aviatest-stadium-competition-id');
    if (competitionId) {
      void import('@/lib/stadium/competitions')
        .then(({ upsertCompetitionBestScore }) =>
          upsertCompetitionBestScore(competitionId, correct, total, avgTimeMs),
        )
        .catch(() => { /* ignore network / auth errors */ });
    }
  } catch { /* ignore */ }

  // Duel score (fire-and-forget)
  try {
    const duelId = sessionStorage.getItem('aviatest-duel-id');
    if (duelId) {
      void import('@/lib/duels/api')
        .then(({ submitDuelScore }) =>
          submitDuelScore(duelId, correct, total, avgTimeMs),
        )
        .catch(() => { /* ignore */ });
    }
  } catch { /* ignore */ }
}

/**
 * Load all entries for an exercise (uses current pseudo).
 */
export function loadEntries(exerciseId: string): PerformanceEntry[] {
  if (typeof window === 'undefined') return [];
  const pseudo = getPseudo();
  if (!pseudo) return [];
  try {
    const raw = localStorage.getItem(storageKey(pseudo, exerciseId));
    if (!raw) return [];
    return JSON.parse(raw) as PerformanceEntry[];
  } catch {
    return [];
  }
}

/**
 * Get full stats for an exercise from an entries array (local or cloud).
 */
export function getExerciseStatsFromEntries(
  exerciseId: string,
  entries: PerformanceEntry[],
): ExerciseStats | null {
  if (entries.length === 0) return null;

  const scores = entries.map((e) => e.score);
  const now = new Date();

  const avg = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length;

  const filterByDays = (days: number) => {
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - days);
    return entries.filter((e) => new Date(e.date) >= cutoff).map((e) => e.score);
  };

  const todayScores = entries
    .filter((e) => {
      const d = new Date(e.date);
      return d.toDateString() === now.toDateString();
    })
    .map((e) => e.score);

  const last7 = filterByDays(7);
  const last3 = filterByDays(3);

  const timedEntries = entries.filter((e) => e.avgTimeMs > 0);
  const avgTimeSec =
    timedEntries.length > 0
      ? Math.round(avg(timedEntries.map((e) => e.avgTimeMs)) / 100) / 10
      : null;
  const lastEntry = entries[entries.length - 1];
  const lastAvgTimeSec =
    lastEntry.avgTimeMs > 0 ? Math.round(lastEntry.avgTimeMs / 100) / 10 : null;

  return {
    exerciseId,
    entries,
    totalAttempts: entries.length,
    bestScore: Math.max(...scores),
    worstScore: Math.min(...scores),
    avgScore: Math.round(avg(scores) * 10) / 10,
    lastScore: scores[scores.length - 1],
    last7DaysAvg: last7.length > 0 ? Math.round(avg(last7) * 10) / 10 : null,
    last3DaysAvg: last3.length > 0 ? Math.round(avg(last3) * 10) / 10 : null,
    todayAvg: todayScores.length > 0 ? Math.round(avg(todayScores) * 10) / 10 : null,
    avgTimeSec,
    lastAvgTimeSec,
  };
}

/**
 * Get full stats for an exercise (uses current pseudo).
 */
export function getExerciseStats(exerciseId: string): ExerciseStats | null {
  return getExerciseStatsFromEntries(exerciseId, loadEntries(exerciseId));
}

/**
 * Build stats list from a map of exerciseId → entries (cloud view).
 */
export function getAllExerciseStatsFromMap(
  map: Record<string, PerformanceEntry[]>,
): ExerciseStats[] {
  const results: ExerciseStats[] = [];
  for (const [exerciseId, entries] of Object.entries(map)) {
    const stats = getExerciseStatsFromEntries(exerciseId, entries);
    if (stats) results.push(stats);
  }
  return results;
}

/**
 * Get stats for all exercises that have data (uses current pseudo).
 */
export function getAllExerciseStats(): ExerciseStats[] {
  if (typeof window === 'undefined') return [];
  const prefix = currentPrefix();
  if (!prefix) return [];
  const results: ExerciseStats[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        const exerciseId = key.slice(prefix.length);
        const stats = getExerciseStats(exerciseId);
        if (stats) results.push(stats);
      }
    }
  } catch { /* ignore */ }
  return results;
}

/**
 * Migrate existing entries: recalculate score = (correct / total) * 100
 * for all stored entries. Runs once per pseudo.
 */
export function migratePerformanceData(): void {
  if (typeof window === 'undefined') return;
  const pseudo = getPseudo();
  if (!pseudo) return;
  const migrationKey = `aviatest-migrated:${pseudo}`;
  if (localStorage.getItem(migrationKey)) return; // already migrated

  const prefix = `${KEY_PREFIX}${pseudo}:`;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const entries: PerformanceEntry[] = JSON.parse(raw);
        let changed = false;
        for (const entry of entries) {
          if (entry.total > 0) {
            const expected = Math.round((entry.correct / entry.total) * 1000) / 10;
            if (entry.score !== expected) {
              entry.score = expected;
              changed = true;
            }
          }
        }
        if (changed) {
          localStorage.setItem(key, JSON.stringify(entries));
        }
      }
    }
    localStorage.setItem(migrationKey, '1');
  } catch { /* ignore */ }
}

/**
 * Clear all performance data for the current pseudo.
 */
export function clearAllPerformanceData(): void {
  if (typeof window === 'undefined') return;
  const prefix = currentPrefix();
  if (!prefix) return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  } catch { /* ignore */ }
}

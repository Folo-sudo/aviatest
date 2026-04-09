/**
 * PerformanceTracker - Persists exercise results in localStorage
 * and provides stats/history for the progression dashboard.
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
}

const STORAGE_PREFIX = 'aviatest-perf-';
const MAX_ENTRIES = 200;

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

/**
 * Save a performance result for an exercise
 */
export function savePerformanceResult(
  exerciseId: string,
  score: number,
  correct: number,
  total: number,
  avgTimeMs: number = 0,
): void {
  if (typeof window === 'undefined') return;
  try {
    const key = STORAGE_PREFIX + exerciseId;
    const existing = loadEntries(exerciseId);
    const entry: PerformanceEntry = {
      date: new Date().toISOString(),
      score: Math.round(score * 10) / 10,
      correct,
      total,
      avgTimeMs: Math.round(avgTimeMs),
    };
    existing.push(entry);
    // Keep only the last MAX_ENTRIES
    if (existing.length > MAX_ENTRIES) {
      existing.splice(0, existing.length - MAX_ENTRIES);
    }
    localStorage.setItem(key, JSON.stringify(existing));
  } catch { /* quota exceeded or unavailable */ }
}

/**
 * Load all entries for an exercise
 */
export function loadEntries(exerciseId: string): PerformanceEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + exerciseId);
    if (!raw) return [];
    return JSON.parse(raw) as PerformanceEntry[];
  } catch {
    return [];
  }
}

/**
 * Get full stats for an exercise
 */
export function getExerciseStats(exerciseId: string): ExerciseStats | null {
  const entries = loadEntries(exerciseId);
  if (entries.length === 0) return null;

  const scores = entries.map(e => e.score);
  const now = new Date();

  const avg = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length;

  const filterByDays = (days: number) => {
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - days);
    return entries.filter(e => new Date(e.date) >= cutoff).map(e => e.score);
  };

  const todayScores = entries.filter(e => {
    const d = new Date(e.date);
    return d.toDateString() === now.toDateString();
  }).map(e => e.score);

  const last7 = filterByDays(7);
  const last3 = filterByDays(3);

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
  };
}

/**
 * Get stats for all exercises that have data
 */
export function getAllExerciseStats(): ExerciseStats[] {
  if (typeof window === 'undefined') return [];
  const results: ExerciseStats[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        const exerciseId = key.slice(STORAGE_PREFIX.length);
        const stats = getExerciseStats(exerciseId);
        if (stats) results.push(stats);
      }
    }
  } catch { /* ignore */ }
  return results;
}

/**
 * Clear all performance data for an exercise
 */
export function clearPerformanceData(exerciseId: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_PREFIX + exerciseId);
  } catch { /* ignore */ }
}

/**
 * Clear ALL performance data
 */
export function clearAllPerformanceData(): void {
  if (typeof window === 'undefined') return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  } catch { /* ignore */ }
}

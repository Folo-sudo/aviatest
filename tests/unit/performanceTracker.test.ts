import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getExerciseStats,
  loadEntries,
  savePerformanceResult,
  setPseudo,
} from '@/lib/core/PerformanceTracker';

vi.mock('@/lib/usage/track', () => ({ trackExerciseUsage: vi.fn() }));
vi.mock('@/lib/account/profile', () => ({ upsertPerformanceCloud: vi.fn() }));
vi.mock('@/lib/stadium/competitions', () => ({ upsertCompetitionBestScore: vi.fn() }));
vi.mock('@/lib/duels/api', () => ({ submitDuelScore: vi.fn() }));

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key) {
      return map.has(key) ? map.get(key)! : null;
    },
    key(index) {
      return [...map.keys()][index] ?? null;
    },
    removeItem(key) {
      map.delete(key);
    },
    setItem(key, value) {
      map.set(key, String(value));
    },
  };
}

describe('savePerformanceResult', () => {
  beforeEach(() => {
    const local = memoryStorage();
    vi.stubGlobal('localStorage', local);
    vi.stubGlobal('window', {
      localStorage: local,
      location: { pathname: '/exercices/empilements' },
    });
    setPseudo('vitest');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('persists correct/total, not a bare percentage', () => {
    savePerformanceResult('empilements', 18, 20, 1500);
    const entries = loadEntries('empilements');
    expect(entries).toHaveLength(1);
    expect(entries[0].correct).toBe(18);
    expect(entries[0].total).toBe(20);
    expect(entries[0].score).toBe(90);
    expect(entries[0].avgTimeMs).toBe(1500);
  });

  it('does not write progression for guests', () => {
    localStorage.setItem('aviatest-guest', '1');
    savePerformanceResult('empilements', 18, 20);
    expect(loadEntries('empilements')).toEqual([]);
  });

  it('aggregates stats from stored entries', () => {
    savePerformanceResult('empilements', 18, 20);
    savePerformanceResult('empilements', 10, 20);
    const stats = getExerciseStats('empilements');
    expect(stats?.totalAttempts).toBe(2);
    expect(stats?.bestScore).toBe(90);
    expect(stats?.worstScore).toBe(50);
    expect(stats?.lastScore).toBe(50);
  });
});

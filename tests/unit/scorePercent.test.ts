import { describe, expect, it } from 'vitest';
import { scorePercent } from '@/lib/core/PerformanceTracker';

describe('scorePercent', () => {
  it('stores 18/20 as 90, not 18', () => {
    expect(scorePercent(18, 20)).toBe(90);
  });

  it('keeps one decimal (7/9 → 77.8)', () => {
    expect(scorePercent(7, 9)).toBe(77.8);
  });

  it('is 0 when nothing was asked', () => {
    expect(scorePercent(0, 0)).toBe(0);
  });

  it('documents the explicit percent-scale (total === 100)', () => {
    expect(scorePercent(73, 100)).toBe(73);
  });
});

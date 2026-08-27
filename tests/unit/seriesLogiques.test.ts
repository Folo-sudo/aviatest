import { describe, expect, it } from 'vitest';
import {
  computeSeriesSessionScore,
  formatSeries,
  generateSeriesQuestions,
} from '@/lib/exercises/seriesLogiques';

describe('generateSeriesQuestions', () => {
  it('returns unique 4-choice items with one correct answer', () => {
    const questions = generateSeriesQuestions(20);
    expect(questions.length).toBeGreaterThanOrEqual(15);

    for (const q of questions) {
      expect(q.choices).toHaveLength(4);
      expect(new Set(q.choices).size).toBe(4);
      expect(q.correctIndex).toBeGreaterThanOrEqual(0);
      expect(q.correctIndex).toBeLessThan(4);
      expect(q.choices[q.correctIndex]).toBeTruthy();
      expect(formatSeries(q)).toContain('??');
    }
  });
});

describe('computeSeriesSessionScore', () => {
  it('applies +1 / −1/3 and stores a percent on 100', () => {
    const score = computeSeriesSessionScore(
      [
        { outcome: 'correct' },
        { outcome: 'correct' },
        { outcome: 'incorrect' },
        { outcome: 'skipped' },
      ],
      4,
    );
    expect(score.correct).toBe(2);
    expect(score.incorrect).toBe(1);
    expect(score.skipped).toBe(1);
    expect(score.raw).toBeCloseTo(2 - 1 / 3, 10);
    expect(score.percent).toBe(41.7);
  });
});

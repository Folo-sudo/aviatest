import { describe, expect, it } from 'vitest';
import {
  classScaleIdForMemoryBack,
  getClassThresholds,
  scoreToClass,
} from '@/lib/core/classes';
import { EXERCISES } from '@/lib/data/exercises';

describe('scoreToClass', () => {
  it('maps 72% Empilements to class 4 (Pilotest bars)', () => {
    expect(scoreToClass(72, 'empilements')).toBe(4);
  });

  it('uses default decades when the exercise is unknown', () => {
    expect(scoreToClass(72)).toBe(7);
    expect(scoreToClass(72, 'not-a-test')).toBe(7);
    expect(scoreToClass(90)).toBe(9);
  });

  it('does not award class 9 when 8 and 9 share a threshold', () => {
    // memory-back: 97 appears twice (classes 7 and 8), 98 is class 9
    expect(scoreToClass(97, 'memory-back')).toBe(7);
    expect(scoreToClass(98, 'memory-back')).toBe(9);
  });

  it('treats non-finite scores as 0%', () => {
    expect(scoreToClass(Number.NaN, 'empilements')).toBe(1);
  });

  it('keeps every registered exercise on a monotonic 9-bar scale', () => {
    for (const exercise of EXERCISES) {
      const t = getClassThresholds(exercise.id);
      expect(t, exercise.id).toHaveLength(9);
      for (let i = 1; i < 9; i++) {
        expect(t[i], `${exercise.id}[${i}]`).toBeGreaterThanOrEqual(t[i - 1]);
      }
    }
  });
});

describe('classScaleIdForMemoryBack', () => {
  it('picks m2 / m3 / m4 / m5 from n', () => {
    expect(classScaleIdForMemoryBack(2)).toBe('memory-back');
    expect(classScaleIdForMemoryBack(3)).toBe('m3-back');
    expect(classScaleIdForMemoryBack(4)).toBe('m4-back');
    expect(classScaleIdForMemoryBack(5)).toBe('m5-back');
  });
});

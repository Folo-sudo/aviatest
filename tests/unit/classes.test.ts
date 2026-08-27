import { describe, expect, it } from 'vitest';
import {
  classHint,
  classScaleIdForMemoryBack,
  CONTEST_CLASS,
  getClassThresholds,
  scoreToClass,
} from '@/lib/core/classes';
import { EXERCISES } from '@/lib/data/exercises';

const EXTRA_SCALE_IDS = ['m2-back', 'm3-back', 'm4-back', 'm5-back'];

function allScaleIds(): string[] {
  return [...new Set([...EXERCISES.map((ex) => ex.id), ...EXTRA_SCALE_IDS])];
}

describe('scoreToClass', () => {
  it('maps 72% Empilements to class 4 (Pilotest bars)', () => {
    expect(scoreToClass(72, 'empilements')).toBe(4);
    expect(scoreToClass(91, 'empilements')).toBe(7);
  });

  it('uses default decades when the exercise is unknown', () => {
    expect(scoreToClass(72)).toBe(7);
    expect(scoreToClass(72, 'not-a-test')).toBe(7);
    expect(scoreToClass(90)).toBe(9);
  });

  it('keeps Pilotest M-back class 7 and opens 8/9', () => {
    expect(scoreToClass(96, 'memory-back')).toBe(6);
    expect(scoreToClass(97, 'memory-back')).toBe(7);
    expect(scoreToClass(98, 'memory-back')).toBe(8);
    expect(scoreToClass(99, 'memory-back')).toBe(9);
  });

  it('does not award class 9 on the formerly too-easy tops', () => {
    expect(scoreToClass(65, 'lecture-textes')).toBe(7);
    expect(scoreToClass(82, 'lecture-textes')).toBe(9);
    expect(scoreToClass(77, 'psychomoteur-enac')).toBe(7);
    expect(scoreToClass(88, 'psychomoteur-enac')).toBe(9);
    expect(scoreToClass(77, 'attention-2')).toBe(8);
    expect(scoreToClass(67.5, 'quadrilogie-angles')).toBe(7);
    expect(scoreToClass(88, 'quadrilogie-angles')).toBe(9);
  });

  it('aligns calcul-mental-2 on calcul-mental-1', () => {
    expect(getClassThresholds('calcul-mental-2')[6]).toBe(
      getClassThresholds('calcul-mental')[6],
    );
  });

  it('treats non-finite scores as 0%', () => {
    expect(scoreToClass(Number.NaN, 'empilements')).toBe(1);
  });

  it('keeps every registered exercise on a strictly increasing 9-bar scale', () => {
    for (const id of allScaleIds()) {
      const t = getClassThresholds(id);
      expect(t, id).toHaveLength(9);
      for (let i = 1; i < 9; i++) {
        expect(t[i], `${id}[${i}]`).toBeGreaterThan(t[i - 1]);
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

describe('classHint', () => {
  it('labels class 7 as contest-ready', () => {
    expect(classHint(7)).toBe('Niveau concours');
    expect(classHint(6)).toBe('Presque au niveau concours');
    expect(classHint(4)).toBe('A consolider');
    expect(CONTEST_CLASS).toBe(7);
  });
});

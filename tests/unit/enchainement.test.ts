import { describe, expect, it } from 'vitest';
import { advanceSession, isFinished, withExamMode } from '@/lib/enchainement/session';

describe('withExamMode', () => {
  it('forces examMode and inverted feedback flags', () => {
    expect(withExamMode('empilements', { examMode: false, numQuestions: 10 }, true)).toEqual({
      examMode: true,
      numQuestions: 10,
    });
    expect(withExamMode('clock-angle', { showFeedback: true }, true).showFeedback).toBe(false);
    expect(withExamMode('mental-rotation', { showCorrections: true }, true).showCorrections).toBe(
      false,
    );
  });

  it('leaves settings untouched when forceExam is off', () => {
    const s = { examMode: false, numQuestions: 8 };
    expect(withExamMode('empilements', s, false)).toEqual(s);
  });
});

describe('advanceSession', () => {
  it('marks the parcours finished after the last step', () => {
    const session = {
      steps: [
        { slug: 'a', id: 'a', title: 'A', settings: {}, previousRaw: null },
        { slug: 'b', id: 'b', title: 'B', settings: {}, previousRaw: null },
      ],
      index: 1,
      forceExam: true,
    };
    const next = advanceSession(session);
    expect(next.index).toBe(2);
    expect(isFinished(next)).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import {
  CLASSIC_ANGLAIS_BANK,
  allAnglaisItems,
  pickAnglaisQuestions,
} from '@/lib/exercises/anglaisPsy0Bank';
import { explainAnglaisItem } from '@/lib/exercises/anglaisPsy0Explain';

describe('anglais PSY0 bank', () => {
  it('keeps the original items', () => {
    expect(CLASSIC_ANGLAIS_BANK.length).toBeGreaterThanOrEqual(65);
  });

  it('is much larger than the original bank', () => {
    expect(allAnglaisItems().length).toBeGreaterThanOrEqual(400);
  });

  it('covers several question types', () => {
    const items = allAnglaisItems();
    const kinds = new Map<string, number>();
    for (const item of items) {
      kinds.set(item.kind, (kinds.get(item.kind) ?? 0) + 1);
    }
    for (const kind of [
      'classic',
      'tense',
      'structure',
      'false-friend',
      'collocation',
      'error',
      'paraphrase',
      'connector',
      'inference',
      'register',
      'reading',
    ]) {
      expect(kinds.get(kind) ?? 0, kind).toBeGreaterThanOrEqual(10);
    }
  });

  it('has unique stems and valid MCQs', () => {
    const items = allAnglaisItems();
    const stems = new Set<string>();
    for (const item of items) {
      expect(item.choices, item.stem).toHaveLength(4);
      expect(new Set(item.choices).size, item.stem).toBe(4);
      expect(item.correct, item.stem).toBeGreaterThanOrEqual(0);
      expect(item.correct, item.stem).toBeLessThan(4);
      expect(item.choices[item.correct], item.stem).toBeTruthy();
      expect(stems.has(item.stem), item.stem).toBe(false);
      stems.add(item.stem);
    }
  });

  it('picks the requested count with a reading block on a full session', () => {
    const session = pickAnglaisQuestions(30);
    expect(session).toHaveLength(30);
    expect(session.some((q) => q.kind === 'reading' && q.passage)).toBe(true);
    expect(session.some((q) => q.kind === 'classic')).toBe(true);
    expect(session.some((q) => q.kind === 'error' || q.kind === 'paraphrase')).toBe(true);
    expect(
      session.some(
        (q) =>
          q.kind === 'inference' ||
          q.kind === 'connector' ||
          q.kind === 'register',
      ),
    ).toBe(true);
  });

  it('keeps reading questions from the same text contiguous', () => {
    const session = pickAnglaisQuestions(30);
    const readingIdx = session
      .map((q, i) => (q.kind === 'reading' ? i : -1))
      .filter((i) => i >= 0);
    expect(readingIdx.length).toBeGreaterThan(1);
    for (let i = 1; i < readingIdx.length; i++) {
      expect(readingIdx[i] - readingIdx[i - 1]).toBeLessThanOrEqual(1);
    }
    const texts = new Set(session.filter((q) => q.passage).map((q) => q.passage));
    expect(texts.size).toBe(1);
  });

  it('explains every item with a real grammar or meaning note', () => {
    const items = allAnglaisItems();
    for (const item of items) {
      const text = explainAnglaisItem(item);
      expect(text.length, item.stem).toBeGreaterThan(60);
    }
  });
});

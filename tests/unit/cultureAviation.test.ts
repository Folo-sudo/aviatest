import { describe, expect, it } from 'vitest';
import {
  allCultureItems,
  nextCultureQuestion,
  pickCultureQuestions,
} from '@/lib/exercises/cultureAviationBank';

describe('fiche culture aviation', () => {
  it('has a very large bank with explanations', () => {
    const items = allCultureItems();
    expect(items.length).toBeGreaterThanOrEqual(900);
    const kinds = new Set(items.map((i) => i.kind));
    expect(kinds.has('air-france')).toBe(true);
    expect(kinds.has('flotte')).toBe(true);
    expect(kinds.has('pionniers')).toBe(true);
    expect(kinds.has('aeroports')).toBe(true);
  });

  it('has unique stems, 4 distinct choices, and a dated explanation', () => {
    const items = allCultureItems();
    const stems = new Set<string>();
    for (const item of items) {
      expect(item.choices, item.stem).toHaveLength(4);
      expect(new Set(item.choices).size, item.stem).toBe(4);
      expect(item.correct, item.stem).toBe(0);
      expect(item.explain.length, item.stem).toBeGreaterThan(40);
      expect(stems.has(item.stem), item.stem).toBe(false);
      stems.add(item.stem);
    }
  });

  it('covers core Air France facts', () => {
    const text = allCultureItems()
      .filter((i) => i.kind === 'air-france' || i.kind === 'flotte')
      .map((i) => i.stem + i.choices[0])
      .join(' ');
    expect(text).toMatch(/AIRFRANS|AFR|SkyTeam|Flying Blue|A220|Trent XWB|GE90/);
  });

  it('picks a shuffled session', () => {
    const session = pickCultureQuestions(40);
    expect(session).toHaveLength(40);
    expect(session.some((q) => q.correct !== 0)).toBe(true);
  });

  it('weights the free mix toward Air France rather than airports', () => {
    const used = new Set<string>();
    const kinds: string[] = [];
    for (let i = 0; i < 80; i++) {
      const q = nextCultureQuestion(used, 'all');
      used.add(q.stem);
      kinds.push(q.kind);
    }
    const company = kinds.filter((k) => k === 'air-france' || k === 'flotte').length;
    expect(company).toBeGreaterThan(20);
  });
});

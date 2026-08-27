import { describe, expect, it } from 'vitest';
import { Scorer } from '@/lib/core/Scorer';

describe('Scorer', () => {
  it('tracks accuracy, streak, and resets', () => {
    const s = new Scorer();
    s.recordAnswer(true);
    s.recordAnswer(true);
    s.recordAnswer(false);
    s.recordAnswer(true);
    expect(s.getCorrect()).toBe(3);
    expect(s.getWrong()).toBe(1);
    expect(s.getTotal()).toBe(4);
    expect(s.getScore()).toBe(75);
    expect(s.getStreak()).toBe(1);
    expect(s.getMaxStreak()).toBe(2);
    s.reset();
    expect(s.getTotal()).toBe(0);
    expect(s.getScore()).toBe(0);
  });
});

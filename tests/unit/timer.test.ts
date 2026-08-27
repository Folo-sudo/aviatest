import { describe, expect, it } from 'vitest';
import { Timer } from '@/lib/core/Timer';

describe('Timer', () => {
  it('counts down and fires onComplete once', () => {
    let fired = 0;
    const t = new Timer(1000, () => {
      fired += 1;
    });
    t.start();
    t.update(400);
    expect(t.getTime()).toBe(600);
    expect(t.isFinished()).toBe(false);
    t.update(700);
    expect(t.getTime()).toBe(0);
    expect(t.isFinished()).toBe(true);
    expect(fired).toBe(1);
    t.update(100);
    expect(fired).toBe(1);
  });

  it('formats remaining time as mm:ss', () => {
    const t = new Timer(125);
    expect(t.formatTime()).toBe('02:05');
  });
});

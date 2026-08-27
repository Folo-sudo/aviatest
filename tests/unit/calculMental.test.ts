import { describe, expect, it } from 'vitest';
import { generateCalculMentalQuestion } from '@/lib/exercises/calculMental';

/** Independent eval of the displayed chain (add/sub, trailing a x b). */
function evalExpression(expression: string): number {
  const tokens = expression.match(/[+-]?\s*\d+(?:\s*x\s*\d+)?/g);
  if (!tokens?.length) throw new Error(`unparsed: ${expression}`);
  let sum = 0;
  for (const raw of tokens) {
    const compact = raw.replace(/\s+/g, '');
    const mul = compact.match(/^([+-]?)(\d+)x(\d+)$/);
    if (mul) {
      const sign = mul[1] === '-' ? -1 : 1;
      sum += sign * Number(mul[2]) * Number(mul[3]);
      continue;
    }
    const n = compact.match(/^([+-]?)(\d+)$/);
    if (!n) throw new Error(`token: ${raw}`);
    const sign = n[1] === '-' ? -1 : 1;
    sum += sign * Number(n[2]);
  }
  return sum;
}

describe('generateCalculMentalQuestion', () => {
  it('matches an independent evaluation of the expression', () => {
    for (let i = 0; i < 40; i++) {
      const q = generateCalculMentalQuestion({
        chainLength: 6,
        maxNumber: 99,
        includeMultiply: i % 2 === 0,
      });
      expect(evalExpression(q.expression)).toBe(q.answer);
    }
  });
});

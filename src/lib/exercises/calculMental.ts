export interface CalculMentalGenSettings {
  chainLength: number;
  maxNumber: number;
  includeMultiply: boolean;
}

export interface CalculMentalQuestion {
  expression: string;
  answer: number;
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateCalculMentalQuestion(
  settings: CalculMentalGenSettings,
): CalculMentalQuestion {
  const terms: { sign: '+' | '-'; value: number }[] = [];
  const firstSign = Math.random() < 0.5 ? '+' : '-';
  terms.push({ sign: firstSign, value: randInt(10, settings.maxNumber) });

  for (let i = 1; i < settings.chainLength; i++) {
    const sign = Math.random() < 0.5 ? '+' : '-';
    terms.push({ sign, value: randInt(10, settings.maxNumber) });
  }

  let answer = 0;
  const parts: string[] = [];
  for (const t of terms) {
    if (t.sign === '+') {
      answer += t.value;
      parts.push(parts.length === 0 ? `${t.value}` : `+ ${t.value}`);
    } else {
      answer -= t.value;
      parts.push(parts.length === 0 ? `- ${t.value}` : `- ${t.value}`);
    }
  }

  if (settings.includeMultiply) {
    const a = randInt(11, 99);
    const b = randInt(11, 99);
    const mulSign = Math.random() < 0.5 ? '+' : '-';
    const mulResult = a * b;
    if (mulSign === '+') {
      answer += mulResult;
      parts.push(`+ ${a} x ${b}`);
    } else {
      answer -= mulResult;
      parts.push(`- ${a} x ${b}`);
    }
  }

  return { expression: parts.join(' '), answer };
}

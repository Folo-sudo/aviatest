/**
 * Generateurs de series logiques.
 * Couvre les familles Pilotest (recurrence, rang alphabet, verbal, proprietes)
 * plus des lois absentes de Pilotest (AZERTY, QFU, Collatz, rang x2, etc.).
 */

export type SeriesKind = 'complete' | 'intruder';

export interface SeriesQuestion {
  seriesItems: string[];
  prompt: string;
  extraLines?: string[];
  choices: string[];
  correctIndex: number;
  logic: string;
  family: string;
  kind: SeriesKind;
}

type Gen = () => SeriesQuestion | null;

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function letter(i: number): string {
  return String.fromCharCode(65 + ((i % 26) + 26) % 26);
}

function rank(ch: string): number {
  return ch.toUpperCase().charCodeAt(0) - 64;
}

function buildChoices(
  correct: string,
  makeWrong: () => string[],
): { choices: string[]; correctIndex: number } | null {
  const pool = new Set<string>([correct]);
  let attempts = 0;
  while (pool.size < 4 && attempts < 50) {
    attempts++;
    for (const w of makeWrong()) {
      if (w !== correct && w !== '' && w !== '??') pool.add(w);
      if (pool.size >= 4) break;
    }
  }
  if (pool.size < 4) return null;
  const choices = shuffle([...pool].slice(0, 4));
  return { choices, correctIndex: choices.indexOf(correct) };
}

function q(
  family: string,
  logic: string,
  items: string[],
  correct: string,
  wrongs: () => string[],
  extra?: Partial<SeriesQuestion>,
): SeriesQuestion | null {
  const built = buildChoices(correct, wrongs);
  if (!built) return null;
  return {
    seriesItems: items,
    prompt: extra?.prompt ?? 'Quelle est la valeur de ??',
    extraLines: extra?.extraLines,
    choices: built.choices,
    correctIndex: built.correctIndex,
    logic,
    family,
    kind: extra?.kind ?? 'complete',
  };
}

function okNum(n: number): boolean {
  return Number.isFinite(n) && Math.abs(n) <= 99999 && Number.isInteger(n);
}

const VOWELS = new Set(['A', 'E', 'I', 'O', 'U', 'Y']);

const WORDS = [
  'TABLE', 'PORTE', 'LIVRE', 'CHIEN', 'ROUTE', 'AVION', 'NUAGE', 'NEIGE',
  'FLEUR', 'ARBRE', 'SOLEIL', 'TERRE', 'TRAIN', 'RADIO', 'CARTE', 'PHARE',
  'PILOTE', 'HANGAR', 'PISTE', 'RADAR', 'CABINE', 'MOTEUR', 'AILES', 'VENT',
];

const ANTONYMS: [string, string][] = [
  ['CALME', 'AGITE'],
  ['OUVERT', 'FERME'],
  ['LONG', 'COURT'],
  ['CLAIR', 'OBSCUR'],
  ['CHAUD', 'FROID'],
  ['HAUT', 'BAS'],
  ['GRAND', 'PETIT'],
  ['VRAI', 'FAUX'],
  ['VIDE', 'PLEIN'],
  ['TARD', 'TOT'],
  ['LOURD', 'LEGER'],
  ['FORT', 'FAIBLE'],
];

const FR_NUM: { n: number; w: string }[] = [
  { n: 1, w: 'UN' },
  { n: 2, w: 'DEUX' },
  { n: 3, w: 'TROIS' },
  { n: 4, w: 'QUATRE' },
  { n: 5, w: 'CINQ' },
  { n: 6, w: 'SIX' },
  { n: 7, w: 'SEPT' },
  { n: 8, w: 'HUIT' },
  { n: 9, w: 'NEUF' },
  { n: 10, w: 'DIX' },
  { n: 11, w: 'ONZE' },
  { n: 12, w: 'DOUZE' },
];

const AZERTY = 'AZERTYUIOP';

const MONTHS = [
  'janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre',
];

const PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47];

function vowelCount(w: string): number {
  return [...w.toUpperCase()].filter((c) => VOWELS.has(c)).length;
}

function consCount(w: string): number {
  return [...w.toUpperCase()].filter((c) => /[A-Z]/.test(c) && !VOWELS.has(c)).length;
}

function withBlank(values: string[], blankAt: number): string[] {
  return values.map((v, i) => (i === blankAt ? '??' : v));
}

// ---------------------------------------------------------------------------
// Numerique (Pilotest-like)
// ---------------------------------------------------------------------------

function genArith(): SeriesQuestion | null {
  const step = randInt(2, 9) * (Math.random() < 0.2 ? -1 : 1);
  const start = randInt(1, 30);
  const len = 5;
  const vals = Array.from({ length: len }, (_, i) => start + step * i);
  if (vals.some((n) => !okNum(n))) return null;
  const blank = randInt(2, len - 1);
  const answer = String(vals[blank]);
  return q(
    'arith',
    step > 0
      ? `Suite arithmetique : on ajoute ${step} a chaque terme.`
      : `Suite arithmetique : on soustrait ${Math.abs(step)} a chaque terme.`,
    withBlank(vals.map(String), blank),
    answer,
    () => [String(vals[blank] + 1), String(vals[blank] - 1), String(vals[blank] + step), String(vals[blank] - step)],
  );
}

function genGrowingGap(): SeriesQuestion | null {
  const d0 = randInt(1, 4);
  const acc = randInt(1, 3);
  let v = randInt(1, 12);
  const vals = [v];
  let d = d0;
  for (let i = 0; i < 4; i++) {
    v += d;
    d += acc;
    vals.push(v);
  }
  if (vals.some((n) => !okNum(n))) return null;
  const blank = 4;
  return q(
    'growing-gap',
    `Les ecarts augmentent de ${acc} a chaque fois (depart +${d0}).`,
    withBlank(vals.map(String), blank),
    String(vals[blank]),
    () => [
      String(vals[blank] + d0),
      String(vals[blank] - acc),
      String(vals[3] + d0),
      String(vals[blank] + acc),
    ],
  );
}

function genGeometric(): SeriesQuestion | null {
  const f = pick([2, 3]);
  const start = randInt(1, f === 2 ? 6 : 3);
  const vals = [start];
  for (let i = 0; i < 4; i++) vals.push(vals[i] * f);
  if (vals.some((n) => !okNum(n))) return null;
  const blank = randInt(2, 3);
  return q(
    'geometric',
    `Chaque terme est multiplie par ${f}.`,
    withBlank(vals.map(String), blank),
    String(vals[blank]),
    () => [String(vals[blank] * f), String(vals[blank] + f), String(vals[blank] / f), String(vals[blank] + vals[blank - 1])].map((s) => String(Math.round(Number(s)))),
  );
}

function genMulPlus(): SeriesQuestion | null {
  const a = pick([2, 3]);
  const b = randInt(1, 5);
  let v = randInt(1, 6);
  const vals = [v];
  for (let i = 0; i < 4; i++) {
    v = a * v + b;
    vals.push(v);
  }
  if (vals.some((n) => !okNum(n))) return null;
  const blank = 3;
  return q(
    'mul-plus',
    `Recurrence : u(n+1) = ${a}*u(n) + ${b}.`,
    withBlank(vals.map(String), blank),
    String(vals[blank]),
    () => [String(a * vals[blank - 1]), String(vals[blank] + b), String(vals[blank] * a), String(vals[blank] - b)],
  );
}

function genAltAdd(): SeriesQuestion | null {
  const a = randInt(2, 7);
  const b = randInt(1, 5);
  if (a === b) return null;
  let v = randInt(1, 15);
  const vals = [v];
  for (let i = 0; i < 5; i++) {
    v += i % 2 === 0 ? a : b;
    vals.push(v);
  }
  const blank = 4;
  return q(
    'alt-add',
    `Alternance des ecarts : +${a} puis +${b}.`,
    withBlank(vals.map(String), blank),
    String(vals[blank]),
    () => [String(vals[blank] + a), String(vals[blank] + b), String(vals[3] + a), String(vals[3] + b)],
  );
}

function genAltMulAdd(): SeriesQuestion | null {
  const mul = 2;
  const add = randInt(1, 4);
  let v = randInt(2, 6);
  const vals = [v];
  for (let i = 0; i < 5; i++) {
    v = i % 2 === 0 ? v * mul : v + add;
    vals.push(v);
  }
  if (vals.some((n) => !okNum(n))) return null;
  const blank = 3;
  return q(
    'alt-mul-add',
    `Alternance : ×${mul} puis +${add}.`,
    withBlank(vals.map(String), blank),
    String(vals[blank]),
    () => [String(vals[2] * mul), String(vals[2] + add), String(vals[blank] + add), String(vals[blank] * mul)],
  );
}

function genFib(): SeriesQuestion | null {
  const a = randInt(1, 5);
  const b = randInt(2, 7);
  const vals = [a, b];
  for (let i = 0; i < 4; i++) vals.push(vals[i] + vals[i + 1]);
  const blank = 4;
  return q(
    'fibonacci',
    'Chaque terme est la somme des deux precedents.',
    withBlank(vals.map(String), blank),
    String(vals[blank]),
    () => [String(vals[blank] + vals[3]), String(vals[3] + vals[2]), String(vals[blank] - 1), String(vals[blank] + 2)],
  );
}

function genSquares(): SeriesQuestion | null {
  const start = randInt(2, 6);
  const vals = Array.from({ length: 5 }, (_, i) => (start + i) ** 2);
  const blank = randInt(2, 4);
  return q(
    'squares',
    `Carres consecutifs : ${start}², ${start + 1}², ${start + 2}²...`,
    withBlank(vals.map(String), blank),
    String(vals[blank]),
    () => [String((start + blank) ** 2 + 1), String((start + blank + 1) ** 2), String(vals[blank] + 2 * (start + blank)), String(vals[blank] - 1)],
  );
}

function genCubes(): SeriesQuestion | null {
  const start = randInt(2, 4);
  const vals = Array.from({ length: 4 }, (_, i) => (start + i) ** 3);
  const blank = 2;
  return q(
    'cubes',
    `Cubes consecutifs : ${start}³, ${start + 1}³...`,
    withBlank(vals.map(String), blank),
    String(vals[blank]),
    () => [String((start + blank) ** 2), String((start + blank + 1) ** 3), String(vals[blank] + 1), String(vals[blank] * 2)],
  );
}

function genTriangle(): SeriesQuestion | null {
  const start = randInt(3, 7);
  const vals = Array.from({ length: 5 }, (_, i) => {
    const n = start + i;
    return (n * (n + 1)) / 2;
  });
  const blank = 4;
  return q(
    'triangle',
    `Nombres triangulaires n(n+1)/2 a partir de n=${start}.`,
    withBlank(vals.map(String), blank),
    String(vals[blank]),
    () => [String(vals[blank] + start), String(vals[3] * 2), String(vals[blank] - 1), String(vals[blank] + 4)],
  );
}

function genPrimes(): SeriesQuestion | null {
  const start = randInt(0, 6);
  const vals = PRIMES.slice(start, start + 5);
  const blank = 4;
  return q(
    'primes',
    'Nombres premiers consecutifs.',
    withBlank(vals.map(String), blank),
    String(vals[blank]),
    () => [String(vals[blank] + 1), String(vals[blank] + 2), String(vals[3] + 2), String(vals[blank] - 1)],
  );
}

function genFact(): SeriesQuestion | null {
  const start = randInt(3, 5);
  const fact = (n: number) => {
    let r = 1;
    for (let i = 2; i <= n; i++) r *= i;
    return r;
  };
  const vals = Array.from({ length: 4 }, (_, i) => fact(start + i));
  const blank = 2;
  return q(
    'factorial',
    `Factorielles : ${start}!, ${start + 1}!, ${start + 2}!...`,
    withBlank(vals.map(String), blank),
    String(vals[blank]),
    () => [String(fact(start + blank) * (start + blank + 1)), String(vals[blank] + start), String(vals[1]), String(vals[blank] / 2)].map(String),
  );
}

function genRunningSum(): SeriesQuestion | null {
  const vals = [randInt(1, 5)];
  for (let i = 0; i < 4; i++) {
    vals.push(vals.reduce((s, n) => s + n, 0));
  }
  if (vals.some((n) => !okNum(n))) return null;
  const blank = 3;
  return q(
    'running-sum',
    'Chaque terme est la somme de tous les termes precedents.',
    withBlank(vals.map(String), blank),
    String(vals[blank]),
    () => [String(vals[blank] + vals[2]), String(vals[2] * 2), String(vals[blank] - 1), String(vals[blank] + 1)],
  );
}

function lookAndSay(s: string): string {
  let out = '';
  let i = 0;
  while (i < s.length) {
    let j = i;
    while (j < s.length && s[j] === s[i]) j++;
    out += String(j - i) + s[i];
    i = j;
  }
  return out;
}

function genLookAndSay(): SeriesQuestion | null {
  let s = String(randInt(1, 3));
  const vals = [s];
  for (let i = 0; i < 3; i++) {
    s = lookAndSay(s);
    if (s.length > 8) return null;
    vals.push(s);
  }
  const blank = 3;
  return q(
    'look-and-say',
    'Lecture du precedent : on enumere les chiffres (ex. 1122 → 2122).',
    withBlank(vals, blank),
    vals[blank],
    () => [lookAndSay(vals[blank]), vals[2] + '1', vals[1], String(Number(vals[2]) + 1)],
  );
}

function genTwinGeom(): SeriesQuestion | null {
  const f = pick([2, 3, 4]);
  const a0 = randInt(2, 6);
  const b0 = randInt(2, 6);
  if (a0 === b0) return null;
  const A = [a0, a0 * f, a0 * f * f, a0 * f * f * f];
  const B = [b0, b0 * f, b0 * f * f, b0 * f * f * f];
  if ([...A, ...B].some((n) => !okNum(n))) return null;
  return q(
    'twin-geom',
    `Meme logique sur les deux lignes : ×${f}.`,
    withBlank(A.map(String), 2),
    String(A[2]),
    () => [String(A[1] * (f + 1)), String(B[2]), String(A[2] + f), String(A[1] + A[0])],
    { extraLines: [B.map(String).join(' , ')], prompt: 'Meme loi sur les deux series. Quelle est ??' },
  );
}

function genReverseDigits(): SeriesQuestion | null {
  const start = randInt(12, 89);
  const next = (n: number) => Number(String(n).split('').reverse().join('')) + 1;
  const vals = [start];
  for (let i = 0; i < 3; i++) vals.push(next(vals[i]));
  if (vals.some((n) => !okNum(n) || n < 10)) return null;
  const blank = 3;
  return q(
    'reverse-plus',
    'On inverse les chiffres puis on ajoute 1.',
    withBlank(vals.map(String), blank),
    String(vals[blank]),
    () => [String(next(vals[blank])), String(vals[2] + 1), String(Number(String(vals[2]).split('').reverse().join(''))), String(vals[blank] - 1)],
  );
}

function genDigitSum(): SeriesQuestion | null {
  let v = randInt(16, 48);
  const vals = [v];
  for (let i = 0; i < 4; i++) {
    const s = String(v).split('').reduce((a, d) => a + Number(d), 0);
    v += s;
    vals.push(v);
  }
  const blank = 4;
  return q(
    'digit-sum',
    'On ajoute a chaque terme la somme de ses chiffres.',
    withBlank(vals.map(String), blank),
    String(vals[blank]),
    () => [String(vals[blank] + 1), String(vals[3] + 9), String(vals[blank] - 2), String(vals[3] * 2)],
  );
}

function genInterleave(): SeriesQuestion | null {
  const a = randInt(1, 8);
  const da = randInt(2, 4);
  const b = randInt(10, 20);
  const db = randInt(2, 5);
  const A = Array.from({ length: 4 }, (_, i) => a + da * i);
  const B = Array.from({ length: 4 }, (_, i) => b + db * i);
  const mixed: string[] = [];
  for (let i = 0; i < 4; i++) {
    mixed.push(String(A[i]));
    mixed.push(String(B[i]));
  }
  const blank = 6;
  return q(
    'interleave',
    `Deux suites entrelacees : +${da} (impairs) et +${db} (pairs).`,
    withBlank(mixed, blank),
    mixed[blank],
    () => [String(A[3] + da), String(B[3]), String(Number(mixed[blank]) + 1), String(A[2] + B[2])],
  );
}

function genOddEvenLetter(): SeriesQuestion | null {
  const nums = Array.from({ length: 5 }, () => randInt(10, 80));
  const tag = (n: number) => (n % 2 === 0 ? 'P' : 'I');
  const items = nums.map((n) => `${n}${tag(n)}`);
  const next = randInt(10, 80);
  const answer = `${next}${tag(next)}`;
  items.push('??');
  return q(
    'odd-even-letter',
    'P si le nombre est pair, I s\'il est impair.',
    items,
    answer,
    () => [
      `${next}${tag(next) === 'P' ? 'I' : 'P'}`,
      `${next + 1}${tag(next)}`,
      `${next + 2}${tag(next)}`,
      `${next}${tag(next)}${tag(next)}`,
    ],
  );
}

function genSameDigitCount(): SeriesQuestion | null {
  const mk = () => {
    const d = randInt(0, 9);
    const o = (d + randInt(1, 9)) % 10;
    const pos = randInt(0, 2);
    const arr = [d, d, d];
    arr[pos] = o;
    return arr.join('');
  };
  const items = [mk(), mk(), mk(), mk(), '??'];
  const answer = mk();
  return q(
    'same-digits',
    'Chaque nombre a exactement 2 chiffres identiques.',
    items,
    answer,
    () => ['111', '123', '0000', String(randInt(100, 999))],
  );
}

function genMultipleIntruder(): SeriesQuestion | null {
  const k = pick([3, 4, 5, 7]);
  const goods = Array.from({ length: 5 }, () => k * randInt(3, 18));
  let odd = k * randInt(3, 18) + randInt(1, k - 1);
  while (odd % k === 0) odd += 1;
  const items = shuffle([...goods, odd]).map(String);
  return q(
    'multiple-intruder',
    `Tous les nombres sont des multiples de ${k}, sauf l'intrus.`,
    items,
    String(odd),
    () => shuffle(goods).slice(0, 3).map(String),
    { kind: 'intruder', prompt: 'Quel est l\'intrus ?' },
  );
}

// ---------------------------------------------------------------------------
// Lettres / rang (Pilotest-like)
// ---------------------------------------------------------------------------

function genLetterStep(): SeriesQuestion | null {
  const step = randInt(1, 4) * (Math.random() < 0.25 ? -1 : 1);
  const start = randInt(0, 25);
  const vals = Array.from({ length: 5 }, (_, i) => letter(start + step * i));
  const blank = 4;
  return q(
    'letter-step',
    step > 0
      ? `Chaque lettre avance de ${step} cran${step > 1 ? 's' : ''} dans l'alphabet.`
      : `Chaque lettre recule de ${Math.abs(step)} cran${Math.abs(step) > 1 ? 's' : ''}.`,
    withBlank(vals, blank),
    vals[blank],
    () => [letter(start + step * blank + 1), letter(start + step * (blank - 1)), letter(start + (step + 1) * blank), letter(start + step * blank - 1)],
  );
}

function genLetterGrowing(): SeriesQuestion | null {
  const start = randInt(0, 10);
  const vals = [];
  let i = start;
  let gap = 1;
  for (let k = 0; k < 5; k++) {
    vals.push(letter(i));
    i += gap;
    gap += 1;
  }
  const blank = 4;
  return q(
    'letter-growing',
    'Les ecarts alphabetiques augmentent de 1 a chaque fois (+1, +2, +3...).',
    withBlank(vals, blank),
    vals[blank],
    () => [letter(i), letter(i - 2), letter(start + 8), letter(start + 4)],
  );
}

function genLetterMirror(): SeriesQuestion | null {
  const start = randInt(0, 10);
  const vals = Array.from({ length: 5 }, (_, i) => letter(start + i));
  const mirrors = vals.map((c) => letter(25 - (rank(c) - 1)));
  const blank = 3;
  return q(
    'letter-mirror',
    'Lettre miroir dans l\'alphabet (A↔Z, B↔Y...).',
    withBlank(vals.map((c, i) => `${c}${mirrors[i]}`), blank),
    `${vals[blank]}${mirrors[blank]}`,
    () => [
      `${vals[blank]}${letter(rank(vals[blank]))}`,
      `${mirrors[blank]}${vals[blank]}`,
      `${vals[blank]}${letter(25 - rank(vals[blank]))}`,
      `${vals[blank]}${vals[blank]}`,
    ],
  );
}

function genBasicRank(): SeriesQuestion | null {
  const idx = shuffle([...Array(26).keys()]).slice(0, 5);
  const items = idx.map((i) => `${letter(i)}${i + 1}`);
  const blank = 3;
  const answer = items[blank];
  items[blank] = '??';
  return q(
    'basic-rank',
    'Le nombre est le rang de la lettre dans l\'alphabet (A=1 ... Z=26).',
    items,
    answer,
    () => idx.map((i) => `${letter(i)}${i}`).concat(idx.map((i) => `${letter(i)}${i + 2}`)),
  );
}

function genRankMul(): SeriesQuestion | null {
  const coeff = pick([2, 3]);
  const letters = shuffle([...Array(12).keys()].map((i) => i + 1)).slice(0, 5);
  const items = letters.map((r) => `${letter(r - 1)}${r * coeff}`);
  const blank = 3;
  const answer = items[blank];
  items[blank] = '??';
  return q(
    'rank-mul',
    `Le nombre = rang de la lettre × ${coeff} (A=1).`,
    items,
    answer,
    () => letters.map((r) => `${letter(r - 1)}${r}`).concat(letters.map((r) => `${letter(r - 1)}${r * coeff + 1}`)),
  );
}

function genRankSumPair(): SeriesQuestion | null {
  const a = randInt(1, 12);
  const b = randInt(1, 12);
  const c = a + b;
  if (c > 26) return null;
  const triples = [];
  for (let k = 0; k < 4; k++) {
    const x = randInt(1, 12);
    const y = randInt(1, 12);
    const z = x + y;
    if (z > 26) return null;
    triples.push([letter(x - 1), letter(y - 1), letter(z - 1)] as const);
  }
  const blankTriple = triples[2];
  const answer = blankTriple[2];
  const items = triples.map((t, i) => (i === 2 ? `${t[0]} ${t[1]} ??` : `${t[0]} ${t[1]} ${t[2]}`));
  return q(
    'rank-sum',
    'Le rang de la 3e lettre = somme des rangs des deux premieres.',
    items,
    answer,
    () => [letter(c), letter(a), letter(b), letter(c - 2)],
  );
}

function genCaesarWord(): SeriesQuestion | null {
  const word = pick(['AIR', 'VOL', 'CIE', 'CAP', 'NORD', 'SUD']);
  const shift = pick([1, 2]);
  const sh = (w: string, s: number) =>
    [...w].map((c) => letter(rank(c) - 1 + s)).join('');
  const vals = [word, sh(word, shift), sh(word, 2 * shift), sh(word, 3 * shift)];
  const blank = 3;
  return q(
    'caesar',
    `Chaque mot avance toutes ses lettres de ${shift} cran${shift > 1 ? 's' : ''}.`,
    withBlank(vals, blank),
    vals[blank],
    () => [sh(word, 4 * shift), sh(vals[2], 1), word, sh(word, -shift)],
  );
}

function genBlockRotate(): SeriesQuestion | null {
  const s = pick(['ABCD', 'RSTU', 'KLMN', 'WXYZ', 'EFGH']);
  const rot = (t: string) => t.slice(1) + t[0];
  const vals = [s, rot(s), rot(rot(s)), rot(rot(rot(s)))];
  const blank = 2;
  return q(
    'block-rotate',
    'Le bloc de lettres tourne d\'un cran vers la gauche a chaque fois.',
    withBlank(vals, blank),
    vals[blank],
    () => [s.split('').reverse().join(''), rot(vals[blank]), s, vals[1]],
  );
}

function genVowelSkip(): SeriesQuestion | null {
  const cons = [...Array(26).keys()].map(letter).filter((c) => !VOWELS.has(c));
  const start = randInt(0, cons.length - 6);
  const vals = cons.slice(start, start + 5);
  const blank = 4;
  return q(
    'consonants-only',
    'Uniquement les consonnes, dans l\'ordre alphabetique.',
    withBlank(vals, blank),
    vals[blank],
    () => [letter(rank(vals[blank])), vals[3], 'A', 'E'],
  );
}

// ---------------------------------------------------------------------------
// Verbal (Pilotest-like)
// ---------------------------------------------------------------------------

function genWordLength(): SeriesQuestion | null {
  const ws = shuffle(WORDS).slice(0, 5);
  const items = ws.map((w) => `${w}${w.length}`);
  const blank = 3;
  const answer = String(ws[blank].length);
  items[blank] = `${ws[blank]}??`;
  return q(
    'word-length',
    'Le chiffre est le nombre de lettres du mot.',
    items,
    answer,
    () => [String(ws[blank].length + 1), String(ws[blank].length - 1), String(vowelCount(ws[blank])), '5'],
  );
}

function genVowelCount(): SeriesQuestion | null {
  const ws = shuffle(WORDS).slice(0, 5);
  const items = ws.map((w) => `${w}${vowelCount(w)}`);
  const blank = 2;
  const answer = String(vowelCount(ws[blank]));
  items[blank] = `${ws[blank]}??`;
  return q(
    'vowel-count',
    'Le chiffre est le nombre de voyelles du mot (Y compte).',
    items,
    answer,
    () => [String(consCount(ws[blank])), String(ws[blank].length), String(vowelCount(ws[blank]) + 1), '2'],
  );
}

function genConsCount(): SeriesQuestion | null {
  const ws = shuffle(WORDS).slice(0, 5);
  const items = ws.map((w) => `${w}${consCount(w)}`);
  const blank = 2;
  const answer = String(consCount(ws[blank]));
  items[blank] = `${ws[blank]}??`;
  return q(
    'cons-count',
    'Le chiffre est le nombre de consonnes du mot.',
    items,
    answer,
    () => [String(vowelCount(ws[blank])), String(ws[blank].length), String(consCount(ws[blank]) + 1), '3'],
  );
}

function genAntonyms(): SeriesQuestion | null {
  const pairs = shuffle(ANTONYMS).slice(0, 4);
  const blank = 2;
  const answer = pairs[blank][1];
  const items = pairs.map((p, i) => (i === blank ? `${p[0]} / ??` : `${p[0]} / ${p[1]}`));
  const other = shuffle(ANTONYMS.filter((p) => p[1] !== answer)).slice(0, 3).map((p) => p[1]);
  return q(
    'antonyms',
    'Chaque paire est un couple de contraires.',
    items,
    answer,
    () => other,
  );
}

function shuffleWord(w: string): string {
  if (w.length < 4) return w;
  let s = w;
  for (let k = 0; k < 8; k++) {
    s = shuffle([...w]).join('');
    if (s !== w) return s;
  }
  return w.slice(1) + w[0];
}

function genAnagrams(): SeriesQuestion | null {
  const w = pick(WORDS.filter((x) => x.length >= 5));
  const vals = [w, shuffleWord(w), shuffleWord(w), shuffleWord(w)];
  if (new Set(vals).size < 3) return null;
  const blank = 3;
  return q(
    'anagrams',
    'Tous les mots sont des anagrammes (memes lettres).',
    withBlank(vals, blank),
    vals[blank],
    () => [w.slice(0, -1) + 'X', pick(WORDS.filter((x) => x !== w)), w + 'S', vals[1].slice(0, 3)],
  );
}

function genFirsting(): SeriesQuestion | null {
  const seq = shuffle(FR_NUM).slice(0, 5);
  const items = seq.map((x) => `${x.n}${x.w[0]}`);
  const blank = 3;
  const answer = seq[blank].w[0];
  items[blank] = `${seq[blank].n}??`;
  return q(
    'firsting',
    'Lettre qui commence le nombre ecrit en toutes lettres (1→U, 2→D...).',
    items,
    answer,
    () => ['U', 'D', 'T', seq[blank].w.slice(-1)],
  );
}

function genLasting(): SeriesQuestion | null {
  const seq = shuffle(FR_NUM).slice(0, 5);
  const items = seq.map((x) => `${x.n}${x.w.slice(-1)}`);
  const blank = 3;
  const answer = seq[blank].w.slice(-1);
  items[blank] = `${seq[blank].n}??`;
  return q(
    'lasting',
    'Lettre qui termine le nombre ecrit en toutes lettres (1→N, 2→X...).',
    items,
    answer,
    () => ['N', 'X', 'S', seq[blank].w[0]],
  );
}

function genFirstLetterRank(): SeriesQuestion | null {
  const ws = shuffle(WORDS).slice(0, 5);
  const items = ws.map((w) => `${w}${rank(w[0])}`);
  const blank = 3;
  const answer = String(rank(ws[blank][0]));
  items[blank] = `${ws[blank]}??`;
  return q(
    'first-letter-rank',
    'Le nombre est le rang de la premiere lettre du mot.',
    items,
    answer,
    () => [String(rank(ws[blank].slice(-1))), String(ws[blank].length), String(rank(ws[blank][0]) + 1), '1'],
  );
}

function genRankSumWord(): SeriesQuestion | null {
  const ws = shuffle(WORDS.filter((w) => w.length <= 5)).slice(0, 4);
  const sum = (w: string) => [...w].reduce((s, c) => s + rank(c), 0);
  const items = ws.map((w) => `${w}${sum(w)}`);
  const blank = 2;
  const answer = String(sum(ws[blank]));
  items[blank] = `${ws[blank]}??`;
  return q(
    'word-rank-sum',
    'Le nombre est la somme des rangs des lettres du mot (A=1).',
    items,
    answer,
    () => [String(sum(ws[blank]) + 1), String(ws[blank].length), String(rank(ws[blank][0])), String(sum(ws[blank]) - 2)],
  );
}

// ---------------------------------------------------------------------------
// Originales (pas chez Pilotest)
// ---------------------------------------------------------------------------

function doubleRank(ch: string): { next: string; from: number; raw: number; wrapped: boolean; to: number } {
  const from = rank(ch);
  const raw = from * 2;
  let to = raw % 26;
  if (to === 0) to = 26;
  return { next: letter(to - 1), from, raw, wrapped: raw > 26, to };
}

function genAzertyRight(): SeriesQuestion | null {
  const start = randInt(0, AZERTY.length - 6);
  const vals = [...AZERTY.slice(start, start + 5)];
  const blank = 4;
  const row = [...AZERTY].join(' ');
  const shown = vals.join(' , ');
  return q(
    'azerty-right',
    [
      `Ce n'est PAS l'alphabet A B C D.`,
      `C'est la rangee du haut d'un clavier AZERTY, de gauche a droite :`,
      row,
      `Dans cette rangee, on avance d'une touche a chaque fois.`,
      `Ici : ${shown.replace('??', vals[blank])}.`,
      `Donc ?? (apres ${vals[blank - 1]}) = ${vals[blank]}.`,
    ].join('\n'),
    withBlank(vals, blank),
    vals[blank],
    () => [letter(rank(vals[blank])), AZERTY[(start + 5) % AZERTY.length], vals[3], 'Q'],
  );
}

function collatz(n: number): number {
  return n % 2 === 0 ? n / 2 : 3 * n + 1;
}

function genCollatz(): SeriesQuestion | null {
  let v = pick([6, 10, 12, 7, 9, 15, 18]);
  const vals = [v];
  for (let i = 0; i < 4; i++) {
    v = collatz(v);
    if (!okNum(v) || v < 1) return null;
    vals.push(v);
  }
  const blank = 3;
  const steps = vals.slice(0, blank).map((n, i) => {
    const nxt = vals[i + 1];
    return n % 2 === 0
      ? `${n} est pair → ${n} ÷ 2 = ${nxt}`
      : `${n} est impair → ${n} × 3 + 1 = ${nxt}`;
  });
  const prev = vals[blank - 1];
  const why =
    prev % 2 === 0
      ? `${prev} est pair, on divise par 2 : ${prev} ÷ 2 = ${vals[blank]}`
      : `${prev} est impair, on fait ×3+1 : ${prev} × 3 + 1 = ${vals[blank]}`;
  return q(
    'collatz',
    [
      `Regle, a CHAQUE etape :`,
      `• si le nombre est pair → on le DIVISE par 2`,
      `• si le nombre est impair → on le MULTIPLIE par 3, puis on AJOUTE 1`,
      `Application :`,
      ...steps.map((s) => `• ${s}`),
      why + `. Donc ?? = ${vals[blank]}.`,
    ].join('\n'),
    withBlank(vals.map(String), blank),
    String(vals[blank]),
    () => [String(collatz(vals[blank])), String(vals[2] * 2), String(vals[2] + 1), String(Math.round(vals[2] / 2))],
  );
}

function genConcat(): SeriesQuestion | null {
  const start = randInt(1, 4);
  const vals: string[] = [];
  let s = '';
  for (let i = 0; i < 4; i++) {
    s += String(start + i);
    vals.push(s);
  }
  const blank = 3;
  const glued = Array.from({ length: 4 }, (_, i) => String(start + i)).join(' puis ');
  return q(
    'concat-int',
    [
      `On ne calcule pas : on COLLE les entiers a la suite, comme du texte.`,
      `On part de ${start}, puis on ajoute ${start + 1}, puis ${start + 2}, puis ${start + 3} a la fin du nombre precedent.`,
      `${vals[0]}  →  ${vals[1]}  (on a colle ${start + 1} derriere ${vals[0]})`,
      `${vals[1]}  →  ${vals[2]}  (on a colle ${start + 2} derriere ${vals[1]})`,
      `${vals[2]}  →  ${vals[3]}  (on colle ${start + 3} derriere ${vals[2]})`,
      `Ce n'est PAS ${vals[2]} + 1. On concatene : ${glued}. Donc ?? = ${vals[blank]}.`,
    ].join('\n'),
    withBlank(vals, blank),
    vals[blank],
    () => [vals[2] + String(start), String(Number(vals[2]) + 1), vals[1], vals[2] + vals[2].slice(-1)],
  );
}

function genRunwayOpposite(): SeriesQuestion | null {
  const mk = (n: number) => String(((n - 1 + 36) % 36) + 1).padStart(2, '0');
  const opp = (n: number) => ((n + 17) % 36) + 1;
  const bases = shuffle([1, 3, 5, 8, 12, 14, 18, 21, 27, 30, 33]).slice(0, 4);
  const items = bases.map((n) => `${mk(n)}/${mk(opp(n))}`);
  const blank = 2;
  const left = bases[blank];
  const right = opp(left);
  items[blank] = `${mk(left)}/??`;
  const sum = left + 18;
  const wrap = sum > 36;
  const why = wrap
    ? `${mk(left)} + 18 = ${sum}. ${sum} depasse 36, on retire 36 : ${sum} - 36 = ${right} → ${mk(right)}.`
    : `${mk(left)} + 18 = ${right} → ${mk(right)}.`;
  const examples = items
    .map((it, i) => (i === blank ? `${mk(left)}/${mk(right)}` : it))
    .join('  ·  ');
  return q(
    'runway-opp',
    [
      `Une piste d'aerodrome a deux sens, decales de 180° : le numero oppose = numero + 18.`,
      `Les numeros vont de 01 a 36. Si on depasse 36, on retire 36 (ex. 27+18=45, 45-36=09).`,
      `On ecrit toujours 2 chiffres : 9 → 09.`,
      `Paires de la question : ${examples}.`,
      why + ` Donc ?? = ${mk(right)}.`,
    ].join('\n'),
    items,
    mk(right),
    () => [mk(right + 1), mk(left), mk((left + 8) % 36 || 36), '36'],
    { prompt: 'Piste et QFU oppose (ecart 18, modulo 36).' },
  );
}

function genKeepCons(): SeriesQuestion | null {
  const ws = shuffle(WORDS.filter((w) => consCount(w) >= 3)).slice(0, 4);
  const keep = (w: string) => [...w].filter((c) => !VOWELS.has(c)).join('');
  const drop = (w: string) => [...w].filter((c) => VOWELS.has(c)).join('') || '(aucune)';
  const items = ws.map((w) => `${w}→${keep(w)}`);
  const blank = 2;
  const w = ws[blank];
  const answer = keep(w);
  items[blank] = `${w}→??`;
  const others = ws
    .filter((_, i) => i !== blank)
    .map((x) => `${x} → on enleve ${drop(x)} → ${keep(x)}`);
  return q(
    'keep-cons',
    [
      `Dans chaque mot, on SUPPRIME les voyelles A E I O U Y, et on garde les consonnes dans l'ordre.`,
      ...others.map((s) => `• ${s}`),
      `Pour ${w} : voyelles enlevees = ${drop(w)}, il reste ${answer}.`,
      `Donc ?? = ${answer}.`,
    ].join('\n'),
    items,
    answer,
    () => [w, drop(w), keep(ws[0]), w.slice(0, 3)],
  );
}

function genReverseConcat(): SeriesQuestion | null {
  const start = randInt(12, 86);
  const s = String(start);
  const rev = s.split('').reverse().join('');
  const answer = s + rev;
  return q(
    'mirror-concat',
    [
      `On prend le nombre, on ecrit ses chiffres a l'envers, puis on COLLE les deux (ce n'est pas une addition).`,
      `Nombre : ${s}`,
      `Miroir (chiffres inverses) : ${rev}`,
      `On colle ${s} puis ${rev} → ${answer}.`,
      `Ce n'est PAS ${rev} tout seul, ni ${start + start}. Donc ?? = ${answer}.`,
    ].join('\n'),
    [s, '??'],
    answer,
    () => [rev, String(start * 11), String(start + start), s + s],
  );
}

function digitalRoot(n: number): number {
  return n === 0 ? 0 : 1 + ((n - 1) % 9);
}

function genDigitalRoot(): SeriesQuestion | null {
  const nums = Array.from({ length: 5 }, () => randInt(10, 99));
  const items = nums.map((n) => `${n}${digitalRoot(n)}`);
  const blank = 3;
  const n = nums[blank];
  const d0 = Math.floor(n / 10);
  const d1 = n % 10;
  const s1 = d0 + d1;
  const answer = digitalRoot(n);
  items[blank] = `${n}??`;
  const second =
    s1 >= 10
      ? `${d0} + ${d1} = ${s1}, puis ${Math.floor(s1 / 10)} + ${s1 % 10} = ${answer}`
      : `${d0} + ${d1} = ${s1}`;
  return q(
    'digital-root',
    [
      `On additionne les chiffres du nombre. S'il reste 2 chiffres, on recommence, jusqu'a un seul chiffre.`,
      `Raccourci : c'est le reste de la division par 9, sauf que 9, 18, 27... donnent 9 (pas 0).`,
      `Pour ${n} : ${second}.`,
      `Verification sur un autre item : ${nums[0]} → ${digitalRoot(nums[0])}. Donc ?? = ${answer}.`,
    ].join('\n'),
    items,
    String(answer),
    () => ['1', '9', '8', String((n % 9) + 1)],
  );
}

function genMonthDays(): SeriesQuestion | null {
  const days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const start = randInt(0, 7);
  const vals = days.slice(start, start + 5);
  const names = MONTHS.slice(start, start + 5);
  const blank = 3;
  const pairs = names.map((m, i) => `${m} = ${vals[i]} jours`).join(', ');
  return q(
    'month-days',
    [
      `Ce sont les nombres de jours des mois de l'annee, a la suite, annee NON bissextile (fevrier = 28, jamais 29).`,
      `Calendrier : jan 31, fev 28, mar 31, avr 30, mai 31, juin 30, juil 31, aout 31, sep 30, oct 31, nov 30, dec 31.`,
      `Ici on est tombe sur : ${pairs}.`,
      `?? correspond a ${names[blank]}, donc ${vals[blank]} jours.`,
    ].join('\n'),
    withBlank(vals.map(String), blank),
    String(vals[blank]),
    () => ['28', '30', '31', '29'],
  );
}

function genLetterDouble(): SeriesQuestion | null {
  const start = randInt(0, 6);
  const vals = [letter(start)];
  for (let i = 0; i < 4; i++) vals.push(doubleRank(vals[i]).next);
  const blank = 4;
  const steps = vals.slice(0, blank).map((ch, i) => {
    const d = doubleRank(ch);
    const wrap = d.wrapped
      ? `${d.from} × 2 = ${d.raw}, ${d.raw} > 26 donc ${d.raw} − 26 = ${d.to} → ${d.next}`
      : `${d.from} × 2 = ${d.to} → ${d.next}`;
    return `${ch} est la ${d.from}e lettre. ${wrap}`;
  });
  const last = doubleRank(vals[blank - 1]);
  return q(
    'letter-double',
    [
      `A=1, B=2, C=3 ... Z=26.`,
      `Pour passer a la lettre suivante de la serie : on prend le RANG, on le MULTIPLIE par 2, on retrouve la lettre de ce nouveau rang.`,
      `Si le resultat depasse 26, on retire 26 (modulo 26). Ex. 16×2=32, 32-26=6 → F.`,
      `Etapes :`,
      ...steps.map((s) => `• ${s}`),
      `Donc ?? = ${vals[blank]} (rang ${last.to}).`,
    ].join('\n'),
    withBlank(vals, blank),
    vals[blank],
    () => [
      letter(rank(vals[blank - 1])),
      letter(rank(vals[blank - 1]) + 1),
      letter((last.to % 26)),
      vals[3],
    ],
  );
}

function genMersenne(): SeriesQuestion | null {
  const vals = [1, 3, 7, 15, 31];
  const blank = 4;
  return q(
    'mersenne',
    [
      `Chaque terme = (terme precedent × 2) + 1. Equivalent : 2^n − 1.`,
      `1 × 2 + 1 = 3`,
      `3 × 2 + 1 = 7`,
      `7 × 2 + 1 = 15`,
      `15 × 2 + 1 = 31`,
      `Ce n'est PAS la puissance de 2 toute seule (16, 32). Donc ?? = 31.`,
    ].join('\n'),
    withBlank(vals.map(String), blank),
    '31',
    () => ['32', '30', '47', '16'],
  );
}

const ORIGINAL_GENERATORS: Gen[] = [
  genAzertyRight,
  genCollatz,
  genConcat,
  genRunwayOpposite,
  genKeepCons,
  genReverseConcat,
  genDigitalRoot,
  genMonthDays,
  genLetterDouble,
  genMersenne,
];

const GENERATORS: Gen[] = [
  genArith,
  genGrowingGap,
  genGeometric,
  genMulPlus,
  genAltAdd,
  genAltMulAdd,
  genFib,
  genSquares,
  genCubes,
  genTriangle,
  genPrimes,
  genFact,
  genRunningSum,
  genLookAndSay,
  genTwinGeom,
  genReverseDigits,
  genDigitSum,
  genInterleave,
  genOddEvenLetter,
  genSameDigitCount,
  genMultipleIntruder,
  genLetterStep,
  genLetterGrowing,
  genLetterMirror,
  genBasicRank,
  genRankMul,
  genRankSumPair,
  genCaesarWord,
  genBlockRotate,
  genVowelSkip,
  genWordLength,
  genVowelCount,
  genConsCount,
  genAntonyms,
  genAnagrams,
  genFirsting,
  genLasting,
  genFirstLetterRank,
  genRankSumWord,
  ...ORIGINAL_GENERATORS,
];

function tryGen(g: Gen): SeriesQuestion | null {
  for (let i = 0; i < 10; i++) {
    try {
      const x = g();
      if (x && x.choices.length === 4 && x.correctIndex >= 0) return x;
    } catch {
      /* retry */
    }
  }
  return null;
}

export function generateSeriesQuestions(count: number): SeriesQuestion[] {
  const qs: SeriesQuestion[] = [];
  const usedFam = new Set<string>();
  const usedKey = new Set<string>();
  const gens = shuffle(GENERATORS);
  const target = count;

  const push = (x: SeriesQuestion | null) => {
    if (!x) return false;
    const key = `${x.family}:${x.seriesItems.join('|')}:${x.choices[x.correctIndex]}`;
    if (usedKey.has(key)) return false;
    usedKey.add(key);
    qs.push(x);
    usedFam.add(x.family);
    return true;
  };

  for (const g of gens) {
    if (qs.length >= target) break;
    const x = tryGen(g);
    if (x && !usedFam.has(x.family)) push(x);
  }

  let guard = 0;
  while (qs.length < target && guard < target * 30) {
    guard++;
    push(tryGen(pick(GENERATORS)));
  }
  return qs.slice(0, target);
}

export function formatSeries(q: SeriesQuestion): string {
  const hasBlank = q.seriesItems.includes('??');
  const line = q.seriesItems.join('  ·  ');
  return hasBlank ? line : `${line}  ·  ??`;
}

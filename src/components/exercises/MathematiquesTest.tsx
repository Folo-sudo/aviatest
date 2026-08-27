'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { savePerformanceResult, loadEntries } from '@/lib/core/PerformanceTracker';
import { MiniPerformanceChart } from '@/components/PerformanceChart';
import { ClassScoreBlock } from '@/components/ClassScoreBlock';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Play, RotateCcw, Home, Settings, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';

// ============================================================================
// Types
// ============================================================================

type GameState = 'menu' | 'settings' | 'playing' | 'results';
type AnswerOutcome = 'correct' | 'incorrect' | 'skipped';

interface GameSettings {
  totalQuestions: number;
  examMode: boolean;
  timeLimitEnabled: boolean;
  timeLimitMin: number;
}

interface QuestionData {
  statement: string;
  choices: string[];
  correctIndex: number;
  solutionSteps: string;
  category: string;
}

interface QuestionResult {
  question: QuestionData;
  selectedIndex: number | null;
  outcome: AnswerOutcome;
  timeUsedMs: number;
}

// ============================================================================
// Constants
// ============================================================================

const SETTINGS_KEY = 'aviatest-mathematiques-settings';

const DEFAULT_SETTINGS: GameSettings = {
  totalQuestions: 30,
  examMode: false,
  timeLimitEnabled: true,
  timeLimitMin: 35,
};

const PRENOMS = [
  'Thomas',
  'Julien',
  'Paul',
  'Marc',
  'Nicolas',
  'Antoine',
  'Laurent',
  'Sophie',
  'Claire',
  'Julie',
  'Marie',
  'Camille',
];

// ============================================================================
// Generic helpers
// ============================================================================

function loadSettings(): GameSettings {
  if (typeof window === 'undefined') return { ...DEFAULT_SETTINGS };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<GameSettings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(s: GameSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickDistinct<T>(arr: readonly T[], n: number): T[] {
  return shuffle([...arr]).slice(0, n);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function roundTo(n: number, decimals = 2): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

function formatNum(n: number, decimals = 0): string {
  const factor = 10 ** decimals;
  const rounded = Math.round(n * factor) / factor;
  return rounded.toLocaleString('fr-FR');
}

function buildNumericChoices(
  correct: number,
  distractors: number[],
  unit: string,
  decimals = 0,
): { choices: string[]; correctIndex: number } {
  const fmt = (n: number) => `${formatNum(n, decimals)}${unit}`;
  const map = new Map<string, number>();
  map.set(fmt(correct), correct);
  for (const d of distractors) {
    if (map.size >= 5) break;
    if (!Number.isFinite(d)) continue;
    const key = fmt(d);
    if (!map.has(key)) map.set(key, d);
  }
  let guard = 0;
  while (map.size < 5 && guard < 60) {
    guard++;
    const magnitude = Math.max(1, Math.abs(correct) * 0.08);
    const jitter = correct + randInt(1, 6) * (Math.random() < 0.5 ? -1 : 1) * magnitude;
    if (jitter <= 0) continue;
    const key = fmt(jitter);
    if (!map.has(key)) map.set(key, jitter);
  }
  const entries = shuffle([...map.entries()]);
  const choices = entries.map((e) => e[0]);
  const correctIndex = choices.indexOf(fmt(correct));
  return { choices, correctIndex };
}

function buildStringChoices(correct: string, distractors: string[]): { choices: string[]; correctIndex: number } {
  const set = new Set<string>([correct]);
  for (const d of distractors) {
    if (set.size >= 5) break;
    set.add(d);
  }
  const entries = shuffle([...set]);
  const correctIndex = entries.indexOf(correct);
  return { choices: entries, correctIndex };
}

function fmtHM(totalMinutes: number): { str: string; dayOffset: number } {
  const dayOffset = Math.floor(totalMinutes / 1440);
  const norm = ((totalMinutes % 1440) + 1440) % 1440;
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  const str = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  return { str, dayOffset };
}

// ============================================================================
// Skeleton 1 — Debits de travail (3 personnes)
// ============================================================================

function genWorkRates3(): QuestionData {
  const [n1, n2, n3] = pickDistinct(PRENOMS, 3);
  const k = randInt(1, 6);
  const t = 6 * k; // n1 seul
  const p = 3 * k; // n2 seul
  const j = 2 * k; // n3 seul
  const A = k; // les trois ensemble
  const C = 2 * k; // n1 + n2 ensemble
  const D = 1.5 * k; // n1 + n3 ensemble (reponse)

  const statement = `${n1}, ${n2} et ${n3} sont charges de la maintenance complete d'un avion. A eux trois, ils la terminent en ${formatNum(A, 1)} h. ${n2} seul mettrait ${p} h. ${n1} et ${n2} ensemble mettent ${C} h. Combien de temps faudrait-il a ${n1} et ${n3} pour la terminer ensemble ?`;

  const distractors = [p, C, A, (t + j) / 2, Math.abs(t - j), t, j, A + C - p].filter(
    (d) => d !== D && d > 0,
  );
  const { choices, correctIndex } = buildNumericChoices(D, distractors, ' h', 1);

  const solutionSteps = [
    `1) ${n2} seul effectue le travail en ${p} h (debit = 1/${p}).`,
    `2) ${n1} et ${n2} ensemble mettent ${C} h, donc ${n1} seul mettrait 1/${C} - 1/${p} = 1/${t} : soit ${t} h.`,
    `3) A eux trois ils mettent ${formatNum(A, 1)} h, donc ${n3} seul mettrait 1/${A} - 1/${C} = 1/${j} : soit ${j} h.`,
    `4) ${n1} et ${n3} ensemble : 1/${t} + 1/${j} = 1/${formatNum(D, 1)} → temps = ${formatNum(D, 1)} h.`,
  ].join('\n');

  return { statement, choices, correctIndex, solutionSteps, category: 'Debits de travail' };
}

// ============================================================================
// Skeleton 2 — Systeme lineaire (voitures / motos)
// ============================================================================

function genLinearSystem2(): QuestionData {
  const pairsPool = [
    { a1: 1, b1: 3, a2: 2, b2: 1 },
    { a1: 1, b1: 2, a2: 3, b2: 4 },
    { a1: 1, b1: 4, a2: 2, b2: 3 },
    { a1: 1, b1: 1, a2: 2, b2: 5 },
    { a1: 1, b1: 5, a2: 3, b2: 2 },
  ];
  const { a1, b1, a2, b2 } = pick(pairsPool);
  const Pc = pick([8000, 9000, 10000, 12000, 15000, 18000, 20000]);
  const Pm = pick([2000, 2500, 3000, 3500, 4000, 5000, 6000]);
  const T1 = a1 * Pc + b1 * Pm;
  const T2 = a2 * Pc + b2 * Pm;
  const askCar = Math.random() < 0.5;
  const answer = askCar ? Pc : Pm;

  const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`;
  const statement = `Chez un concessionnaire, ${plural(a1, 'voiture')} et ${plural(b1, 'moto')} coutent au total ${formatNum(T1)} €. ${plural(a2, 'voiture')} et ${plural(b2, 'moto')} coutent au total ${formatNum(T2)} €. Quel est le prix d'une ${askCar ? 'voiture' : 'moto'} ?`;

  const distractors = [askCar ? Pm : Pc, Math.round(T1 / a1), Math.round(T2 / (a2 || 1)), answer + 1000, answer - 1000, Math.round((T1 - T2) / (a1 - a2 || 1))].filter(
    (d) => d !== answer && d > 0,
  );
  const { choices, correctIndex } = buildNumericChoices(answer, distractors, ' €');

  const solutionSteps = [
    `Notons x le prix d'une voiture et y celui d'une moto.`,
    `${a1}x + ${b1}y = ${formatNum(T1)}  →  x = ${formatNum(T1)} - ${b1}y`,
    `En remplacant dans la 2eme equation : ${a2}(${formatNum(T1)} - ${b1}y) + ${b2}y = ${formatNum(T2)}`,
    `y = ${formatNum(Pm)} €, donc x = ${formatNum(T1)} - ${b1} x ${formatNum(Pm)} = ${formatNum(Pc)} €.`,
    `Reponse : ${askCar ? 'voiture' : 'moto'} = ${formatNum(answer)} €.`,
  ].join('\n');

  return { statement, choices, correctIndex, solutionSteps, category: 'Systeme lineaire' };
}

// ============================================================================
// Skeleton 3 — Regle de trois (devises)
// ============================================================================

function genCurrencyRuleOfThree(): QuestionData {
  const currency = pick(['rial', 'dinar', 'yen']);
  const N = pick([10, 50, 100, 1000]);
  const E = pick([5, 7.5, 10, 12.5, 15, 20, 25]);
  const m = randInt(2, 8);
  const M = N * m;
  const unitRate = E / N;
  const answer = roundTo(E * m, 2);

  const statement = `${N} ${currency}s valent ${formatNum(E, 2)} €. Combien valent ${formatNum(M)} ${currency}s ?`;

  const distractors = [
    roundTo(E * N, 2),
    roundTo(M / E, 2),
    roundTo(E + M, 2),
    roundTo(answer / 2, 2),
    roundTo(answer * 2, 2),
    roundTo(N * M, 2),
  ].filter((d) => d !== answer && d > 0);
  const { choices, correctIndex } = buildNumericChoices(answer, distractors, ' €', 2);

  const solutionSteps = [
    `1 ${currency} vaut ${formatNum(E, 2)} / ${N} = ${formatNum(unitRate, 4)} €.`,
    `${formatNum(M)} = ${m} x ${N}, donc la reponse est simplement ${m} x ${formatNum(E, 2)} = ${formatNum(answer, 2)} €.`,
  ].join('\n');

  return { statement, choices, correctIndex, solutionSteps, category: 'Conversion de devises' };
}

// ============================================================================
// Skeleton 4 — Remises successives (aller)
// ============================================================================

function genDoubleDiscountForward(): QuestionData {
  const P = pick([400, 500, 600, 800, 1000, 1200, 1500, 2000]);
  const [r1, r2] = pickDistinct([10, 20, 25, 50], 2);
  const step1 = roundTo((P * (100 - r1)) / 100, 2);
  const step2 = roundTo((step1 * (100 - r2)) / 100, 2);

  const statement = `Un article coute ${formatNum(P)} €. Il subit d'abord une remise de ${r1} %, puis une seconde remise de ${r2} % appliquee sur le nouveau prix. Quel est le prix final ?`;

  const wrongAdditive = roundTo((P * (100 - r1 - r2)) / 100, 2);
  const distractors = [wrongAdditive, step1, roundTo((step1 + step2) / 2, 2), roundTo(step2 * 1.1, 2), roundTo(step2 - 5, 2)].filter(
    (d) => d !== step2 && d > 0,
  );
  const { choices, correctIndex } = buildNumericChoices(step2, distractors, ' €', 2);

  const solutionSteps = [
    `Apres la 1ere remise : ${formatNum(P)} x (1 - ${r1}/100) = ${formatNum(P)} x ${formatNum((100 - r1) / 100, 2)} = ${formatNum(step1, 2)} €.`,
    `Apres la 2eme remise : ${formatNum(step1, 2)} x (1 - ${r2}/100) = ${formatNum(step1, 2)} x ${formatNum((100 - r2) / 100, 2)} = ${formatNum(step2, 2)} €.`,
    `Attention : on n'additionne pas les pourcentages (${r1} + ${r2} = ${r1 + r2} % donnerait a tort ${formatNum(wrongAdditive, 2)} €).`,
  ].join('\n');

  return { statement, choices, correctIndex, solutionSteps, category: 'Remises successives' };
}

// ============================================================================
// Skeleton 5 — Remises successives (retrouver le prix initial)
// ============================================================================

function genDoubleDiscountReverse(): QuestionData {
  const Porig = pick([400, 500, 600, 800, 1000, 1200, 1500, 2000]);
  const [r1, r2] = pickDistinct([10, 20, 25, 50], 2);
  const step1 = roundTo((Porig * (100 - r1)) / 100, 2);
  const F = roundTo((step1 * (100 - r2)) / 100, 2);

  const statement = `Apres une remise de ${r1} % puis une seconde remise de ${r2} % (appliquee sur le nouveau prix), un article coute ${formatNum(F, 2)} €. Quel etait son prix initial ?`;

  const wrongAdditive = roundTo((F * 100) / (100 - r1 - r2), 2);
  const wrongInverse = roundTo(F * (1 + r1 / 100) * (1 + r2 / 100), 2);
  const wrongOneStep = roundTo((F * 100) / (100 - r1), 2);
  const distractors = [wrongAdditive, wrongInverse, wrongOneStep, Porig + 100, Porig - 100].filter(
    (d) => d !== Porig && d > 0,
  );
  const { choices, correctIndex } = buildNumericChoices(Porig, distractors, ' €', 2);

  const solutionSteps = [
    `Prix initial x (1 - ${r1}/100) x (1 - ${r2}/100) = ${formatNum(F, 2)} €.`,
    `Prix initial = ${formatNum(F, 2)} / (${formatNum((100 - r1) / 100, 2)} x ${formatNum((100 - r2) / 100, 2)}) = ${formatNum(F, 2)} / ${formatNum(((100 - r1) * (100 - r2)) / 10000, 4)}.`,
    `Prix initial = ${formatNum(Porig, 2)} €.`,
  ].join('\n');

  return { statement, choices, correctIndex, solutionSteps, category: 'Remises successives (inverse)' };
}

// ============================================================================
// Skeleton 6 — Proportionnalite (ouvriers / m2 / heures)
// ============================================================================

function genWorkersProportion(): QuestionData {
  const r = pick([2, 3, 4, 5, 6]);
  const N = randInt(2, 8);
  const H = randInt(2, 8);
  const S = N * H * r;
  const N2 = randInt(2, 10);
  const H2 = randInt(2, 8);
  const S2 = N2 * H2 * r;

  const statement = `${N} ouvriers peignent une surface de ${formatNum(S)} m² en ${H} heures. Combien de temps faudrait-il a ${N2} ouvriers pour peindre ${formatNum(S2)} m² (au meme rythme) ?`;

  const distractors = [
    Math.round((S2 / S) * H),
    Math.round((S / S2) * H),
    Math.round((H * N) / N2),
    H2 + 2,
    Math.max(1, H2 - 2),
  ].filter((d) => d !== H2 && d > 0);
  const { choices, correctIndex } = buildNumericChoices(H2, distractors, ' h');

  const solutionSteps = [
    `Rendement d'un ouvrier = ${formatNum(S)} / (${N} x ${H}) = ${r} m²/h.`,
    `Pour ${N2} ouvriers, rendement total = ${N2} x ${r} = ${N2 * r} m²/h.`,
    `Temps = ${formatNum(S2)} / ${N2 * r} = ${H2} h.`,
  ].join('\n');

  return { statement, choices, correctIndex, solutionSteps, category: 'Proportionnalite (ouvriers)' };
}

// ============================================================================
// Skeleton 7 — Remise en € → pourcentage
// ============================================================================

function genRemiseToPercent(): QuestionData {
  const k = randInt(1, 6);
  const P = 40 * k;
  const pct = pick([5, 10, 15, 20, 25, 30, 40, 50]);
  const R = (P * pct) / 100;

  const statement = `Un article coute ${formatNum(P)} €. Il beneficie d'une remise de ${formatNum(R)} €. Quel est le pourcentage de remise applique ?`;

  const distractors = [100 - pct, pct + 10, pct - 10, R, Math.round((P / R) * 10)].filter(
    (d) => d !== pct && d > 0,
  );
  const { choices, correctIndex } = buildNumericChoices(pct, distractors, ' %');

  const solutionSteps = [
    `Pourcentage = (remise / prix) x 100 = (${formatNum(R)} / ${formatNum(P)}) x 100 = ${pct} %.`,
  ].join('\n');

  return { statement, choices, correctIndex, solutionSteps, category: 'Pourcentage de remise' };
}

// ============================================================================
// Skeleton 8 — Prix final + % → prix initial
// ============================================================================

function genFinalPriceToOriginal(): QuestionData {
  const k = randInt(2, 10);
  const Porig = 20 * k;
  const pct = pick([5, 10, 15, 20, 25, 30, 40, 50]);
  const isIncrease = Math.random() < 0.5;
  const factor = isIncrease ? 100 + pct : 100 - pct;
  const F = (Porig * factor) / 100;

  const statement = `Apres une ${isIncrease ? 'hausse' : 'remise'} de ${pct} %, un article coute ${formatNum(F)} €. Quel etait son prix avant cette ${isIncrease ? 'hausse' : 'remise'} ?`;

  const wrongSameOp = isIncrease ? F * (1 + pct / 100) : F * (1 - pct / 100);
  const wrongDelta = isIncrease ? F - (F * pct) / 100 : F + (F * pct) / 100;
  const distractors = [roundTo(wrongSameOp), roundTo(wrongDelta), Porig + 20, Porig - 20].filter(
    (d) => d !== Porig && d > 0,
  );
  const { choices, correctIndex } = buildNumericChoices(Porig, distractors, ' €');

  const solutionSteps = [
    `Prix apres = prix avant x ${formatNum(factor / 100, 2)}.`,
    `Prix avant = ${formatNum(F)} / ${formatNum(factor / 100, 2)} = ${formatNum(Porig)} €.`,
  ].join('\n');

  return { statement, choices, correctIndex, solutionSteps, category: 'Prix initial' };
}

// ============================================================================
// Skeleton 9 — Interets composes
// ============================================================================

function genCompoundInterest(): QuestionData {
  const C = pick([1000, 2000, 3000, 5000, 8000, 10000, 15000, 20000]);
  const r = pick([10, 20]);
  const n = pick([2, 3]);
  const values: number[] = [C];
  for (let i = 0; i < n; i++) {
    values.push(roundTo((values[values.length - 1] * (100 + r)) / 100, 2));
  }
  const final = values[values.length - 1];

  const statement = `Un capital de ${formatNum(C)} € est place a un taux d'interet compose de ${r} % par an. Quelle est sa valeur au bout de ${n} ans ?`;

  const simpleInterest = roundTo(C * (1 + (r * n) / 100), 2);
  const distractors = [simpleInterest, roundTo(final - C, 2), roundTo(C * (1 + r / 100) * n, 2), values[1]].filter(
    (d) => d !== final && d > 0,
  );
  const { choices, correctIndex } = buildNumericChoices(final, distractors, ' €', 2);

  const stepsLines = values.slice(1).map((v, i) => `Annee ${i + 1} : ${formatNum(values[i])} x ${formatNum((100 + r) / 100, 2)} = ${formatNum(v, 2)} €.`);
  const solutionSteps = [
    ...stepsLines,
    `(Attention, ce n'est pas un interet simple : ${formatNum(simpleInterest, 2)} € serait faux.)`,
  ].join('\n');

  return { statement, choices, correctIndex, solutionSteps, category: 'Interets composes' };
}

// ============================================================================
// Skeleton 10 — Hausses / baisses successives (3 etapes)
// ============================================================================

function genSuccessivePercentChanges(): QuestionData {
  const P = pick([1000, 1200, 1500, 2000, 2500, 3000]);
  const changes = pickDistinct([10, 20, 25], 3).map((r) => ({ r, up: Math.random() < 0.5 }));
  let current = P;
  const steps: string[] = [];
  for (const { r, up } of changes) {
    const next = roundTo((current * (up ? 100 + r : 100 - r)) / 100, 2);
    steps.push(
      `${formatNum(current)} € ${up ? '+ ' + r + ' %' : '- ' + r + ' %'} → ${formatNum(current)} x ${formatNum((up ? 100 + r : 100 - r) / 100, 2)} = ${formatNum(next, 2)} €.`,
    );
    current = next;
  }
  const final = current;

  const description = changes.map((c) => `${c.up ? 'augmente' : 'diminue'} de ${c.r} %`).join(', puis ');
  const statement = `Le prix d'un billet d'avion est de ${formatNum(P)} €. Il ${description}. Quel est le prix final (arrondi au centime) ?`;

  const netPct = changes.reduce((acc, c) => acc + (c.up ? c.r : -c.r), 0);
  const wrongNet = roundTo((P * (100 + netPct)) / 100, 2);
  const distractors = [wrongNet, P, roundTo(final + 10, 2), roundTo(final - 10, 2)].filter(
    (d) => d !== final && d > 0,
  );
  const { choices, correctIndex } = buildNumericChoices(final, distractors, ' €', 2);

  const solutionSteps = [...steps, `Prix final = ${formatNum(final, 2)} €.`].join('\n');

  return { statement, choices, correctIndex, solutionSteps, category: 'Hausses successives' };
}

// ============================================================================
// Skeleton 11 — Consommation aller/retour avec vent
// ============================================================================

function genConsumptionAllerRetour(): QuestionData {
  const pool = [
    { tasOut: 160, tasReturn: 240, pct: 20 },
    { tasOut: 120, tasReturn: 180, pct: 20 },
    { tasOut: 200, tasReturn: 300, pct: 20 },
    { tasOut: 80, tasReturn: 120, pct: 20 },
    { tasOut: 150, tasReturn: 250, pct: 25 },
    { tasOut: 90, tasReturn: 150, pct: 25 },
    { tasOut: 120, tasReturn: 200, pct: 25 },
  ];
  const { tasOut, tasReturn } = pick(pool);
  const gcdFn = (a: number, b: number): number => (b === 0 ? a : gcdFn(b, a % b));
  const lcm = (tasOut * tasReturn) / gcdFn(tasOut, tasReturn);
  const k = lcm > 700 ? 1 : pick([1, 2]);
  const D = lcm * k;
  const tOut = D / tasOut;
  const tRet = D / tasReturn;
  const C = pick([40, 50, 60, 80, 100]);
  const totalTime = tOut + tRet;
  const totalFuel = C * totalTime;

  const statement = `Un avion effectue un vol aller-retour sur la meme route. A l'aller, un vent de face reduit sa vitesse sol a ${tasOut} km/h. Au retour, le vent devient favorable et sa vitesse sol passe a ${tasReturn} km/h. La distance parcourue est de ${formatNum(D)} km dans chaque sens. Sachant que l'avion consomme ${C} L/h, quelle est la consommation totale pour l'aller-retour ?`;

  const distractors = [
    C * tOut * 2,
    C * tRet * 2,
    Math.round(totalFuel / 2),
    C * Math.round((2 * D) / ((tasOut + tasReturn) / 2)),
  ].filter((d) => d !== totalFuel && d > 0);
  const { choices, correctIndex } = buildNumericChoices(totalFuel, distractors, ' L');

  const solutionSteps = [
    `Temps aller = ${formatNum(D)} / ${tasOut} = ${tOut} h.`,
    `Temps retour = ${formatNum(D)} / ${tasReturn} = ${tRet} h.`,
    `Temps total = ${tOut} + ${tRet} = ${totalTime} h.`,
    `Consommation totale = ${C} x ${totalTime} = ${formatNum(totalFuel)} L.`,
  ].join('\n');

  return { statement, choices, correctIndex, solutionSteps, category: 'Consommation aller-retour' };
}

// ============================================================================
// Skeleton 12 — Surface d'un champ (longueur/largeur augmentent)
// ============================================================================

function genFieldSurfaceIncrease(): QuestionData {
  const L = pick([40, 60, 80, 100, 120]);
  const l = pick([20, 30, 40, 50, 60]);
  const [r1, r2] = pickDistinct([10, 20, 25, 50], 2);
  const L2 = (L * (100 + r1)) / 100;
  const l2 = (l * (100 + r2)) / 100;
  const S1 = L * l;
  const S2 = L2 * l2;

  const statement = `Un champ rectangulaire mesure ${L} m de long sur ${l} m de large. Sa longueur augmente de ${r1} % et sa largeur augmente de ${r2} %. Quelle est la nouvelle surface du champ ?`;

  const wrongAdditive = roundTo((S1 * (100 + r1 + r2)) / 100, 2);
  const distractors = [wrongAdditive, L2 * l, L * l2, S1, roundTo(S2 / 2, 2)].filter(
    (d) => d !== S2 && d > 0,
  );
  const { choices, correctIndex } = buildNumericChoices(S2, distractors, ' m²');

  const solutionSteps = [
    `Nouvelle longueur = ${L} x ${formatNum((100 + r1) / 100, 2)} = ${formatNum(L2)} m.`,
    `Nouvelle largeur = ${l} x ${formatNum((100 + r2) / 100, 2)} = ${formatNum(l2)} m.`,
    `Nouvelle surface = ${formatNum(L2)} x ${formatNum(l2)} = ${formatNum(S2)} m².`,
    `(Ancienne surface : ${formatNum(S1)} m² — on ne peut pas simplement additionner les pourcentages.)`,
  ].join('\n');

  return { statement, choices, correctIndex, solutionSteps, category: "Surface d'un champ" };
}

// ============================================================================
// Skeleton 13 — Deux trains qui se croisent
// ============================================================================

function genTrainsMeet(): QuestionData {
  if (Math.random() < 0.5) {
    const V1 = pick([60, 70, 80, 90, 100, 120]);
    const V2 = pick([60, 70, 80, 90, 100, 120]);
    const t = randInt(1, 6);
    const D = (V1 + V2) * t;

    const statement = `Deux trains partent au meme instant de deux gares distantes de ${formatNum(D)} km, l'un vers l'autre. Le premier roule a ${V1} km/h, le second a ${V2} km/h. Au bout de combien de temps se croisent-ils ?`;

    const distractors = [Math.round(D / V1), Math.round(D / V2), t / 2, t * 2].filter((d) => d !== t && d > 0);
    const { choices, correctIndex } = buildNumericChoices(t, distractors, ' h', 1);

    const solutionSteps = [
      `Vitesse de rapprochement = ${V1} + ${V2} = ${V1 + V2} km/h.`,
      `Temps = distance / vitesse de rapprochement = ${formatNum(D)} / ${V1 + V2} = ${t} h.`,
    ].join('\n');

    return { statement, choices, correctIndex, solutionSteps, category: 'Trains qui se croisent' };
  }

  const tuples = [
    { V1: 60, h: 2, V2: 90 },
    { V1: 60, h: 2, V2: 100 },
    { V1: 60, h: 2, V2: 120 },
    { V1: 80, h: 1, V2: 120 },
    { V1: 80, h: 3, V2: 120 },
    { V1: 90, h: 2, V2: 120 },
  ];
  const { V1, h, V2 } = pick(tuples);
  const headstart = V1 * h;
  const diff = V2 - V1;
  const tCatch = headstart / diff;

  const statement = `Un train part d'une gare a ${V1} km/h. ${h} heure(s) plus tard, un second train part de la meme gare, dans la meme direction, a ${V2} km/h. Combien de temps apres son propre depart le second train rattrape-t-il le premier ?`;

  const distractors = [h, tCatch + 1, Math.max(1, tCatch - 1), Math.round(headstart / V2)].filter(
    (d) => d !== tCatch && d > 0,
  );
  const { choices, correctIndex } = buildNumericChoices(tCatch, distractors, ' h');

  const solutionSteps = [
    `Avance du premier train au moment du 2e depart = ${V1} x ${h} = ${headstart} km.`,
    `Vitesse de rapprochement = ${V2} - ${V1} = ${diff} km/h.`,
    `Temps de rattrapage = ${headstart} / ${diff} = ${tCatch} h.`,
  ].join('\n');

  return { statement, choices, correctIndex, solutionSteps, category: 'Trains qui se croisent' };
}

// ============================================================================
// Skeleton 14 — Repartition de salaires (equipage)
// ============================================================================

function genSalariesRatio(): QuestionData {
  const ratios = [
    [5, 3, 2],
    [4, 3, 2],
    [6, 4, 3],
    [5, 4, 2],
    [3, 2, 1],
  ];
  const [a, b, c] = pick(ratios);
  const totalParts = a + b + c;
  const v = pick([100, 150, 200, 250, 300, 400, 500]);
  const S = v * totalParts;
  const roles: [string, number][] = [
    ['commandant', a],
    ['copilote', b],
    ['steward', c],
  ];
  const [roleName, rolePart] = pick(roles);
  const answer = v * rolePart;

  const statement = `La masse salariale mensuelle d'un equipage (commandant, copilote, steward) est de ${formatNum(S)} €, repartie selon le ratio ${a}:${b}:${c}. Quel est le salaire du ${roleName} ?`;

  const distractors = roles.map(([, part]) => v * part).concat([Math.round(S / 3), v]);
  const filtered = distractors.filter((d) => d !== answer && d > 0);
  const { choices, correctIndex } = buildNumericChoices(answer, filtered, ' €');

  const solutionSteps = [
    `Nombre total de parts = ${a} + ${b} + ${c} = ${totalParts}.`,
    `Valeur d'une part = ${formatNum(S)} / ${totalParts} = ${formatNum(v)} €.`,
    `Salaire du ${roleName} = ${rolePart} x ${formatNum(v)} = ${formatNum(answer)} €.`,
  ].join('\n');

  return { statement, choices, correctIndex, solutionSteps, category: 'Repartition de salaires' };
}

// ============================================================================
// Skeleton 15 — Champ carre dont le cote augmente
// ============================================================================

function genSquareFieldEnlarge(): QuestionData {
  const C = pick([20, 40, 60, 80, 100]);
  const r = pick([10, 20, 50]);
  const newSide = (C * (100 + r)) / 100;
  const oldArea = C * C;
  const newArea = newSide * newSide;

  const statement = `Un champ carre a un cote de ${C} m. Ce cote est agrandi de ${r} %. Quelle est la nouvelle aire du champ ?`;

  const wrongLinear = roundTo(oldArea * (1 + (2 * r) / 100), 2);
  const distractors = [wrongLinear, roundTo(oldArea * (1 + r / 100), 2), newSide * C, Math.round(newArea / 2)].filter(
    (d) => d !== newArea && d > 0,
  );
  const { choices, correctIndex } = buildNumericChoices(newArea, distractors, ' m²');

  const solutionSteps = [
    `Nouveau cote = ${C} x ${formatNum((100 + r) / 100, 2)} = ${formatNum(newSide)} m.`,
    `Nouvelle aire = ${formatNum(newSide)}² = ${formatNum(newArea)} m² (ancienne aire : ${formatNum(oldArea)} m²).`,
    `Piege classique : l'aire augmente plus vite que le cote (pas juste +${2 * r} %) car elle depend du carre du cote.`,
  ].join('\n');

  return { statement, choices, correctIndex, solutionSteps, category: 'Champ carre' };
}

// ============================================================================
// Skeleton 16 — Fuseaux horaires / heures locales de vol
// ============================================================================

function genTimezoneFlight(): QuestionData {
  const depH = randInt(0, 23);
  const depM = pick([0, 15, 30, 45]);
  const H = randInt(1, 10);
  const M = pick([0, 15, 30, 45]);
  const tz = pick([-9, -8, -6, -5, -3, -1, 1, 2, 3, 5, 6, 8, 9]);

  const depTotal = depH * 60 + depM;
  const durMin = H * 60 + M;
  const parisArrivalTotal = depTotal + durMin;
  const localArrivalTotal = parisArrivalTotal + tz * 60;

  const depStr = fmtHM(depTotal).str;
  const parisArrival = fmtHM(parisArrivalTotal);
  const localArrival = fmtHM(localArrivalTotal);

  const durStr = `${H}h${M === 0 ? '00' : M}`;
  const tzStr = `${tz >= 0 ? '+' : ''}${tz} h`;
  const correctStr = `${localArrival.str}${localArrival.dayOffset >= 1 ? ' (J+1)' : localArrival.dayOffset <= -1 ? ' (J-1)' : ''}`;

  const statement = `Un avion decolle a ${depStr} (heure de Paris). Le vol dure ${durStr}. La destination a un decalage horaire de ${tzStr} par rapport a Paris. Quelle est l'heure locale d'arrivee ?`;

  const fmtWithDay = (totalMin: number) => {
    const r = fmtHM(totalMin);
    return `${r.str}${r.dayOffset >= 1 ? ' (J+1)' : r.dayOffset <= -1 ? ' (J-1)' : ''}`;
  };
  const rawCandidates = [
    parisArrivalTotal,
    parisArrivalTotal - tz * 60,
    localArrivalTotal + 60,
    localArrivalTotal - 30,
    localArrivalTotal + 30,
    localArrivalTotal - 60,
    localArrivalTotal + 15,
    localArrivalTotal - 15,
  ];
  const distractorStrs = rawCandidates.map(fmtWithDay).filter((s) => s !== correctStr);

  const { choices, correctIndex } = buildStringChoices(correctStr, distractorStrs);

  const solutionSteps = [
    `Heure de depart (Paris) : ${depStr}. Duree de vol : ${durStr}.`,
    `Heure d'arrivee en heure de Paris = ${depStr} + ${durStr} = ${parisArrival.str}${parisArrival.dayOffset >= 1 ? ' (jour suivant)' : ''}.`,
    `Decalage horaire de la destination : ${tzStr} → heure locale = ${parisArrival.str} ${tz >= 0 ? '+' : '-'} ${Math.abs(tz)} h = ${correctStr}.`,
  ].join('\n');

  return { statement, choices, correctIndex, solutionSteps, category: 'Fuseaux horaires' };
}

// ============================================================================
// Skeleton 17 — Probleme d'ages
// ============================================================================

function genAgeProblem(): QuestionData {
  const [nA, nB] = pickDistinct(PRENOMS, 2);
  const k = pick([2, 3, 4]);
  const m = pick([3, 5, 8, 10]);
  const b = pick([4, 5, 6, 7, 8]);
  const a = k * b;
  const S = a + b + 2 * m;

  const statement = `${nA} a actuellement ${k} fois l'age de ${nB}. Dans ${m} ans, la somme de leurs ages sera de ${S} ans. Quel est l'age actuel de ${nA} ?`;

  const distractors = [b, a + m, a - m, Math.round(S / 2), k * (b + 1)].filter((d) => d !== a && d > 0);
  const { choices, correctIndex } = buildNumericChoices(a, distractors, ' ans');

  const solutionSteps = [
    `Notons b l'age actuel de ${nB} ; ${nA} a alors ${k} x b ans.`,
    `Dans ${m} ans : (${k}b + ${m}) + (b + ${m}) = ${S}, donc ${k + 1}b + ${2 * m} = ${S}.`,
    `${k + 1}b = ${S - 2 * m}, donc b = ${b} ans.`,
    `Age actuel de ${nA} = ${k} x ${b} = ${a} ans.`,
  ].join('\n');

  return { statement, choices, correctIndex, solutionSteps, category: "Probleme d'ages" };
}

// ============================================================================
// Skeleton 18 — Pieces de 10 € et 2 €
// ============================================================================

function genCoins(): QuestionData {
  const x = randInt(3, 30); // billets de 10€
  const y = randInt(3, 30); // pieces de 2€
  const T = x + y;
  const S = 10 * x + 2 * y;

  const statement = `Une caisse contient ${T} billets et pieces, uniquement des billets de 10 € et des pieces de 2 €, pour une valeur totale de ${formatNum(S)} €. Combien y a-t-il de billets de 10 € ?`;

  const distractors = [y, Math.round(T / 2), Math.round(S / 12), Math.round(S / 10), Math.abs(x - y)].filter(
    (d) => d !== x && d > 0,
  );
  const { choices, correctIndex } = buildNumericChoices(x, distractors, '');

  const solutionSteps = [
    `Si toutes les ${T} pieces/billets etaient des pieces de 2 € : ${T} x 2 = ${T * 2} €.`,
    `Difference avec le total reel : ${formatNum(S)} - ${T * 2} = ${S - T * 2} €.`,
    `Chaque billet de 10 € apporte 8 € de plus qu'une piece de 2 € : ${S - T * 2} / 8 = ${x} billets de 10 €.`,
  ].join('\n');

  return { statement, choices, correctIndex, solutionSteps, category: 'Pieces de monnaie' };
}

// ============================================================================
// Skeleton 19 — Barreaux d'une echelle
// ============================================================================

function genLadderRungs(): QuestionData {
  const N = pick([5, 7, 9, 11, 13]);
  const spacing = pick([10, 15, 20, 25, 30]);
  const H = spacing * (N - 1);

  const statement = `Une echelle de ${H} cm de haut comporte ${N} barreaux regulierement espaces (le premier tout en bas, le dernier tout en haut). Quel est l'espacement entre deux barreaux consecutifs ?`;

  const trap = Math.round(H / N);
  const distractors = [trap, spacing + 5, Math.max(1, spacing - 5), spacing * 2].filter(
    (d) => d !== spacing && d > 0,
  );
  const { choices, correctIndex } = buildNumericChoices(spacing, distractors, ' cm');

  const solutionSteps = [
    `Nombre d'intervalles entre ${N} barreaux = ${N} - 1 = ${N - 1} (piege classique : ce n'est pas ${N}).`,
    `Espacement = ${H} / ${N - 1} = ${spacing} cm.`,
  ].join('\n');

  return { statement, choices, correctIndex, solutionSteps, category: "Barreaux d'echelle" };
}

// ============================================================================
// Skeleton 20 — Plante qui double chaque mois
// ============================================================================

function genPlantDoubling(): QuestionData {
  const H0 = pick([2, 3, 4, 5, 6]);
  const n = randInt(2, 6);
  let cur = H0;
  const steps: string[] = [];
  for (let i = 1; i <= n; i++) {
    cur *= 2;
    steps.push(`Mois ${i} : ${cur / 2} x 2 = ${cur} cm.`);
  }
  const answer = cur;

  const statement = `Une plante mesure ${H0} cm. Sa hauteur double chaque mois. Quelle sera sa hauteur au bout de ${n} mois ?`;

  const distractors = [H0 * n * 2, H0 * 2 ** (n - 1), H0 * 2 ** (n + 1), H0 + n * H0].filter(
    (d) => d !== answer && d > 0,
  );
  const { choices, correctIndex } = buildNumericChoices(answer, distractors, ' cm');

  const solutionSteps = [...steps, `Hauteur finale = ${answer} cm.`].join('\n');

  return { statement, choices, correctIndex, solutionSteps, category: 'Croissance exponentielle' };
}

// ============================================================================
// Skeleton 21 — Vent de face (fraction de la vitesse)
// ============================================================================

function genHeadwindFraction(): QuestionData {
  const fractions = [
    { num: 1, den: 4, subNum: 3, subDen: 4, label: 'un quart' },
    { num: 1, den: 3, subNum: 2, subDen: 3, label: 'un tiers' },
    { num: 1, den: 5, subNum: 4, subDen: 5, label: 'un cinquieme' },
    { num: 1, den: 2, subNum: 1, subDen: 2, label: 'la moitie' },
  ];
  const f = pick(fractions);
  const tPool: Record<string, number[]> = {
    '3/4': [3, 6, 9, 12],
    '2/3': [2, 4, 6, 8, 10],
    '4/5': [4, 8, 12, 16],
    '1/2': [1, 2, 3, 4, 5, 6],
  };
  const key = `${f.subNum}/${f.subDen}`;
  const t = pick(tPool[key]);
  const answer = (t * f.subDen) / f.subNum;
  const V = pick([160, 180, 200, 220, 250]);

  const statement = `Un avion effectue normalement un trajet en ${formatNum(t, 1)} h sans vent (vitesse propre ${V} km/h). Un vent de face reduit sa vitesse sol de ${f.label} (${Math.round((f.num / f.den) * 100)} %). Combien de temps dure le trajet avec ce vent de face ?`;

  const distractors = [roundTo(t * (f.subNum / f.subDen), 2), t * 2, roundTo(t / 2, 2), roundTo(t + f.num / f.den, 2)].filter(
    (d) => d !== answer && d > 0,
  );
  const { choices, correctIndex } = buildNumericChoices(answer, distractors, ' h', 2);

  const solutionSteps = [
    `La vitesse sol est reduite a ${f.subNum}/${f.subDen} de la vitesse initiale.`,
    `A distance egale, le temps est multiplie par l'inverse : ${formatNum(t, 1)} x ${f.subDen}/${f.subNum} = ${formatNum(answer, 2)} h.`,
  ].join('\n');

  return { statement, choices, correctIndex, solutionSteps, category: 'Vent de face (fraction)' };
}

// ============================================================================
// Skeleton 22 — Correction altimetrique de temperature
// ============================================================================

function genAltimeterCorrection(): QuestionData {
  const A = pick([3000, 4000, 5000, 6000, 8000, 10000]);
  const dT = pick([5, 10, 15, 20]);
  const colder = Math.random() < 0.5;
  const slabs = A / 1000;
  const correction = 4 * slabs * dT;

  const statement = `Un altimetre indique une altitude de ${formatNum(A)} ft. La temperature reelle est ${colder ? 'inferieure' : 'superieure'} de ${dT} °C a la temperature standard (ISA). Sachant que l'erreur d'altitude est d'environ 4 pieds par tranche de 1000 pieds et par degre d'ecart, quelle est l'erreur d'altitude approximative ?`;

  const distractors = [correction / 2, correction * 2, slabs * dT, 4 * dT, correction + 100].filter(
    (d) => d !== correction && d > 0,
  );
  const { choices, correctIndex } = buildNumericChoices(correction, distractors, ' ft');

  const solutionSteps = [
    `Nombre de tranches de 1000 ft = ${formatNum(A)} / 1000 = ${slabs}.`,
    `Erreur = 4 x ${slabs} x ${dT} = ${formatNum(correction)} ft.`,
  ].join('\n');

  return { statement, choices, correctIndex, solutionSteps, category: 'Correction altimetrique' };
}

// ============================================================================
// Generator registry
// ============================================================================

const GENERATORS = [
  genWorkRates3,
  genLinearSystem2,
  genCurrencyRuleOfThree,
  genDoubleDiscountForward,
  genDoubleDiscountReverse,
  genWorkersProportion,
  genRemiseToPercent,
  genFinalPriceToOriginal,
  genCompoundInterest,
  genSuccessivePercentChanges,
  genConsumptionAllerRetour,
  genFieldSurfaceIncrease,
  genTrainsMeet,
  genSalariesRatio,
  genSquareFieldEnlarge,
  genTimezoneFlight,
  genAgeProblem,
  genCoins,
  genLadderRungs,
  genPlantDoubling,
  genHeadwindFraction,
  genAltimeterCorrection,
];

function generateQuestion(): QuestionData {
  return pick(GENERATORS)();
}

function generateQuestions(count: number): QuestionData[] {
  const used = new Set<string>();
  const qs: QuestionData[] = [];
  let guard = 0;
  while (qs.length < count && guard < count * 25) {
    guard++;
    const q = generateQuestion();
    if (used.has(q.statement)) continue;
    used.add(q.statement);
    qs.push(q);
  }
  while (qs.length < count) qs.push(generateQuestion());
  return qs;
}

function computeSessionScore(results: QuestionResult[]) {
  let correct = 0;
  let incorrect = 0;
  let skipped = 0;
  for (const r of results) {
    if (r.outcome === 'correct') correct += 1;
    else if (r.outcome === 'incorrect') incorrect += 1;
    else skipped += 1;
  }
  return { correct, incorrect, skipped };
}

function formatClock(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ============================================================================
// Component
// ============================================================================

export default function MathematiquesTest() {
  const router = useRouter();
  const [gameState, setGameState] = useState<GameState>('menu');
  const [settings, setSettings] = useState<GameSettings>({ ...DEFAULT_SETTINGS });
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    setSettings(loadSettings());
    setSettingsLoaded(true);
  }, []);

  useEffect(() => {
    if (settingsLoaded) saveSettings(settings);
  }, [settings, settingsLoaded]);

  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [locked, setLocked] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [showCorrection, setShowCorrection] = useState(false);
  const [lastOutcome, setLastOutcome] = useState<AnswerOutcome | null>(null);

  const [sessionTimeLeft, setSessionTimeLeft] = useState(0);
  const [sessionTotalMs, setSessionTotalMs] = useState(0);
  const sessionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionStartRef = useRef(0);
  const questionStartRef = useRef(0);
  const perfSavedRef = useRef(false);
  const lockedRef = useRef(false);
  const currentIdxRef = useRef(0);
  const questionsRef = useRef<QuestionData[]>([]);
  const finishedRef = useRef(false);

  currentIdxRef.current = currentIdx;
  questionsRef.current = questions;
  lockedRef.current = locked;

  const clearSessionTimer = useCallback(() => {
    if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => clearSessionTimer(), [clearSessionTimer]);

  const finishSession = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    clearSessionTimer();
    setLocked(false);
    lockedRef.current = false;
    setSelectedIdx(null);
    setShowCorrection(false);
    setLastOutcome(null);
    setGameState('results');
  }, [clearSessionTimer]);

  const goToNextQuestion = useCallback(() => {
    const idx = currentIdxRef.current;
    const qs = questionsRef.current;

    if (idx + 1 >= qs.length) {
      finishSession();
      return;
    }

    const nextIdx = idx + 1;
    currentIdxRef.current = nextIdx;
    setCurrentIdx(nextIdx);
    setLocked(false);
    lockedRef.current = false;
    setSelectedIdx(null);
    setShowCorrection(false);
    setLastOutcome(null);
    questionStartRef.current = Date.now();
  }, [finishSession]);

  const recordAnswer = useCallback(
    (index: number | null, outcome: AnswerOutcome) => {
      if (lockedRef.current) return;
      lockedRef.current = true;
      setLocked(true);

      const timeUsed = Date.now() - questionStartRef.current;
      const q = questionsRef.current[currentIdxRef.current];
      const result: QuestionResult = { question: q, selectedIndex: index, outcome, timeUsedMs: timeUsed };
      setResults((prev) => [...prev, result]);
      setLastOutcome(outcome);
      setSelectedIdx(index);

      if (settingsRef.current.examMode) {
        goToNextQuestion();
      } else {
        setShowCorrection(true);
      }
    },
    [goToNextQuestion],
  );

  const handleChoice = useCallback(
    (index: number) => {
      const q = questionsRef.current[currentIdxRef.current];
      const outcome: AnswerOutcome = index === q.correctIndex ? 'correct' : 'incorrect';
      recordAnswer(index, outcome);
    },
    [recordAnswer],
  );

  const handleSkip = useCallback(() => {
    recordAnswer(null, 'skipped');
  }, [recordAnswer]);

  const startGame = useCallback(() => {
    perfSavedRef.current = false;
    finishedRef.current = false;
    const qs = generateQuestions(settingsRef.current.totalQuestions);
    setQuestions(qs);
    questionsRef.current = qs;
    setCurrentIdx(0);
    currentIdxRef.current = 0;
    setResults([]);
    setLocked(false);
    lockedRef.current = false;
    setSelectedIdx(null);
    setShowCorrection(false);
    setLastOutcome(null);
    setGameState('playing');
    questionStartRef.current = Date.now();

    clearSessionTimer();
    if (settingsRef.current.timeLimitEnabled) {
      const durationMs = settingsRef.current.timeLimitMin * 60 * 1000;
      sessionStartRef.current = Date.now();
      setSessionTotalMs(durationMs);
      setSessionTimeLeft(durationMs);
      sessionTimerRef.current = setInterval(() => {
        const elapsed = Date.now() - sessionStartRef.current;
        const left = Math.max(0, durationMs - elapsed);
        setSessionTimeLeft(left);
      }, 250);
    } else {
      setSessionTotalMs(0);
      setSessionTimeLeft(0);
    }
  }, [clearSessionTimer]);

  useEffect(() => {
    if (gameState !== 'playing') return;
    if (sessionTotalMs > 0 && sessionTimeLeft <= 0) {
      finishSession();
    }
  }, [sessionTimeLeft, sessionTotalMs, gameState, finishSession]);

  // =========================================================================
  // MENU
  // =========================================================================
  if (gameState === 'menu') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#fbfaf9] p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">Mathematiques</CardTitle>
            <CardDescription className="mt-2 text-base">
              Problemes de mathematiques appliquees au style des concours pilotes : debits de travail,
              pourcentages, systemes lineaires, vitesse/temps, etc.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2 rounded-lg bg-[#f7f5f3] p-4 text-sm text-[#605a57]">
              <p>
                <strong>{settings.totalQuestions} problemes</strong> a resoudre au papier, sans calculatrice.
              </p>
              <p>
                Choisissez la bonne reponse parmi <strong>5 propositions</strong>.
              </p>
              {settings.timeLimitEnabled ? (
                <p>
                  Temps total : <strong>{settings.timeLimitMin} minutes</strong> pour l&apos;ensemble du test.
                </p>
              ) : (
                <p>Aucune limite de temps.</p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-[#f7f5f3] p-3">
                <p className="text-xl font-bold text-[#37322f]">{settings.totalQuestions}</p>
                <p className="text-xs text-[#605a57]">Questions</p>
              </div>
              <div className="rounded-lg bg-[#f7f5f3] p-3">
                <p className="text-xl font-bold text-[#37322f]">5</p>
                <p className="text-xs text-[#605a57]">Choix</p>
              </div>
              <div className="rounded-lg bg-[#f7f5f3] p-3">
                <p className="text-xl font-bold text-[#37322f]">
                  {settings.timeLimitEnabled ? `${settings.timeLimitMin} min` : '∞'}
                </p>
                <p className="text-xs text-[#605a57]">Temps total</p>
              </div>
            </div>

            {settings.examMode && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-center text-sm text-amber-700">
                Mode examen — pas de correction entre les questions
              </div>
            )}

            <div className="flex flex-col gap-3">
              <Button size="lg" className="w-full" onClick={startGame}>
                <Play className="mr-2 h-5 w-5" /> Commencer
              </Button>
              <Button variant="outline" size="lg" className="w-full" onClick={() => setGameState('settings')}>
                <Settings className="mr-2 h-5 w-5" /> Parametres
              </Button>
              <Button variant="ghost" size="lg" className="w-full" onClick={() => router.push('/')}>
                <ArrowLeft className="mr-2 h-5 w-5" /> Retour
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // =========================================================================
  // SETTINGS
  // =========================================================================
  if (gameState === 'settings') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#fbfaf9] p-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Parametres</CardTitle>
            <CardDescription>Ajustez le test a votre niveau</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-5">
              <div>
                <Label>Nombre de questions : {settings.totalQuestions}</Label>
                <Slider
                  value={[settings.totalQuestions]}
                  onValueChange={([v]) => setSettings((s) => ({ ...s, totalQuestions: v }))}
                  min={10}
                  max={40}
                  step={1}
                  className="mt-2"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Limiter le temps total</Label>
                  <p className="mt-0.5 text-xs text-[#605a57]">Comme en conditions d&apos;examen</p>
                </div>
                <Switch
                  checked={settings.timeLimitEnabled}
                  onCheckedChange={(v) => setSettings((s) => ({ ...s, timeLimitEnabled: v }))}
                />
              </div>
              {settings.timeLimitEnabled && (
                <div>
                  <Label>Temps total : {settings.timeLimitMin} min</Label>
                  <Slider
                    value={[settings.timeLimitMin]}
                    onValueChange={([v]) => setSettings((s) => ({ ...s, timeLimitMin: v }))}
                    min={10}
                    max={60}
                    step={5}
                    className="mt-2"
                  />
                </div>
              )}
              <div className="flex items-center justify-between">
                <div>
                  <Label>Mode examen</Label>
                  <p className="mt-0.5 text-xs text-[#605a57]">Pas de correction entre les questions</p>
                </div>
                <Switch
                  checked={settings.examMode}
                  onCheckedChange={(v) => setSettings((s) => ({ ...s, examMode: v }))}
                />
              </div>
            </div>
            <Button size="lg" className="w-full" onClick={() => setGameState('menu')}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Retour
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // =========================================================================
  // RESULTS
  // =========================================================================
  if (gameState === 'results') {
    const { correct, incorrect, skipped } = computeSessionScore(results);
    const total = questions.length || settings.totalQuestions;
    const percent = total > 0 ? Math.round((correct / total) * 1000) / 10 : 0;
    const avgTime =
      results.length > 0
        ? Math.round((results.reduce((s, r) => s + r.timeUsedMs, 0) / results.length / 1000) * 10) / 10
        : 0;

    if (!perfSavedRef.current) {
      perfSavedRef.current = true;
      const avgMs = results.length > 0 ? results.reduce((s, r) => s + r.timeUsedMs, 0) / results.length : 0;
      savePerformanceResult('mathematiques', correct, total, avgMs);
    }

    const perfEntries = loadEntries('mathematiques');

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#fbfaf9] p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">Résultats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <ClassScoreBlock
              exerciseId={'mathematiques'}
              percent={percent}
              detail={`${correct} / ${total} bonnes reponses`}
            />

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-green-50 p-3 text-center">
                <p className="text-2xl font-bold text-green-600">{correct}</p>
                <p className="text-xs text-green-700">Correct</p>
              </div>
              <div className="rounded-lg bg-red-50 p-3 text-center">
                <p className="text-2xl font-bold text-red-600">{incorrect}</p>
                <p className="text-xs text-red-700">Incorrect</p>
              </div>
              <div className="rounded-lg bg-[#f7f5f3] p-3 text-center">
                <p className="text-2xl font-bold text-[#605a57]">{skipped}</p>
                <p className="text-xs text-[#605a57]">Passe</p>
              </div>
            </div>

            <div className="rounded-lg bg-amber-50 p-3 text-center">
              <p className="text-2xl font-bold text-amber-600">{avgTime}s</p>
              <p className="text-sm text-amber-700">Temps moyen par question</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-[#37322f]">Detail par question :</p>
              <div className="max-h-72 space-y-1.5 overflow-y-auto">
                {results.map((r, i) => {
                  const correctAnswer = r.question.choices[r.question.correctIndex];
                  const selected = r.selectedIndex !== null ? r.question.choices[r.selectedIndex] : null;
                  return (
                    <div key={i} className="rounded bg-[#f7f5f3] px-3 py-2 text-sm">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="text-[#605a57]">
                          Q{i + 1} · {r.question.category}
                        </span>
                        <span
                          className={
                            r.outcome === 'correct'
                              ? 'font-semibold text-green-600'
                              : r.outcome === 'incorrect'
                                ? 'font-semibold text-red-600'
                                : 'font-semibold text-[#605a57]'
                          }
                        >
                          {r.outcome === 'correct' ? '\u2713' : r.outcome === 'incorrect' ? '\u2717' : '\u2014'}{' '}
                          {selected ?? 'Passe'}
                          {r.outcome === 'incorrect' && (
                            <span className="ml-2 text-green-600">({correctAnswer})</span>
                          )}
                        </span>
                      </div>
                      <p className="text-xs text-[#605a57]">{r.question.statement}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {perfEntries.length >= 2 && (
              <div className="border-t pt-4">
                <p className="mb-2 text-center text-sm font-medium text-[#605a57]">Progression</p>
                <div className="flex justify-center">
                  <MiniPerformanceChart entries={perfEntries} exerciseId="mathematiques" />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <Button size="lg" className="w-full" onClick={startGame}>
                <RotateCcw className="mr-2 h-5 w-5" /> Rejouer
              </Button>
              <Button variant="ghost" size="lg" className="w-full" onClick={() => router.push('/')}>
                <Home className="mr-2 h-5 w-5" /> Accueil
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // =========================================================================
  // PLAYING
  // =========================================================================
  const currentQ = questions[currentIdx];
  const timerPercent = sessionTotalMs > 0 ? (sessionTimeLeft / sessionTotalMs) * 100 : 100;
  const timerColor = timerPercent > 50 ? 'text-blue-600' : timerPercent > 20 ? 'text-amber-600' : 'text-red-600';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#fbfaf9] p-4">
      <div className="w-full max-w-2xl">
        <div className="mb-4 flex items-center justify-between">
          <Badge variant="outline" className="px-3 py-1 text-base">
            {currentIdx + 1} / {questions.length}
          </Badge>
          <Badge variant="secondary" className="px-3 py-1 text-sm">
            {currentQ?.category}
          </Badge>
          {sessionTotalMs > 0 && (
            <span className={`flex items-center gap-1 text-sm font-semibold ${timerColor}`}>
              <Clock className="h-4 w-4" /> {formatClock(sessionTimeLeft)}
            </span>
          )}
        </div>

        {sessionTotalMs > 0 && (
          <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className={`h-full transition-all duration-200 ${
                timerPercent > 50 ? 'bg-blue-500' : timerPercent > 20 ? 'bg-amber-500' : 'bg-red-500'
              }`}
              style={{ width: `${timerPercent}%` }}
            />
          </div>
        )}

        <Card>
          <CardContent className="space-y-6 py-8">
            <p className="text-left text-base font-medium leading-relaxed text-slate-800 sm:text-lg">
              {currentQ?.statement}
            </p>

            <div className="flex flex-col gap-3">
              {currentQ?.choices.map((choice, i) => {
                const isSelected = selectedIdx === i;
                const isCorrectChoice = showCorrection && i === currentQ.correctIndex;
                let variantClass =
                  'border-slate-200 bg-white text-slate-800 hover:border-slate-400 hover:bg-[#f7f5f3]';
                if (isCorrectChoice) {
                  variantClass = 'border-green-500 bg-green-50 text-green-700';
                } else if (isSelected && lastOutcome === 'incorrect') {
                  variantClass = 'border-red-500 bg-red-50 text-red-700';
                }
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={locked}
                    onClick={() => handleChoice(i)}
                    className={`rounded-xl border-2 px-5 py-3 text-left text-base font-semibold shadow-sm transition-all disabled:opacity-70 ${variantClass}`}
                  >
                    {choice}
                  </button>
                );
              })}
            </div>

            {!locked && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleSkip}
                  className="text-sm text-slate-400 underline-offset-2 hover:text-[#605a57] hover:underline"
                >
                  Passer cette question
                </button>
              </div>
            )}

            {showCorrection && currentQ && (
              <div className="rounded-xl border border-slate-200 bg-[#f7f5f3] p-4">
                <p
                  className={`mb-2 text-center text-base font-semibold ${
                    lastOutcome === 'correct'
                      ? 'text-green-600'
                      : lastOutcome === 'incorrect'
                        ? 'text-red-600'
                        : 'text-[#605a57]'
                  }`}
                >
                  {lastOutcome === 'correct'
                    ? '\u2713 Correct !'
                    : lastOutcome === 'incorrect'
                      ? `\u2717 Incorrect — reponse : ${currentQ.choices[currentQ.correctIndex]}`
                      : `Reponse : ${currentQ.choices[currentQ.correctIndex]}`}
                </p>
                <div className="space-y-1 text-left text-sm text-[#605a57]">
                  {currentQ.solutionSteps.split('\n').map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
                <Button size="lg" className="mt-4 w-full" onClick={goToNextQuestion}>
                  {currentIdx + 1 >= questions.length ? 'Voir les resultats' : 'Suivant'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

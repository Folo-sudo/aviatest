'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { savePerformanceResult, loadEntries } from '@/lib/core/PerformanceTracker';
import { MiniPerformanceChart } from '@/components/PerformanceChart';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Play, RotateCcw, Home, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';

// ============================================================================
// Types
// ============================================================================

type GameState = 'menu' | 'settings' | 'playing' | 'results';
type AnswerOutcome = 'correct' | 'incorrect' | 'skipped';

interface GameSettings {
  totalQuestions: number;
  timePerQuestionSec: number;
  examMode: boolean;
}

interface QuestionData {
  statement: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
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
  totalQuestions: 20,
  timePerQuestionSec: 45,
  examMode: false,
};

// ============================================================================
// Helpers
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

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
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
  while (map.size < 5 && guard < 30) {
    guard++;
    const magnitude = Math.max(1, Math.abs(correct) * 0.08);
    const jitter = correct + randInt(1, 6) * (Math.random() < 0.5 ? -1 : 1) * magnitude;
    const key = fmt(jitter);
    if (!map.has(key)) map.set(key, jitter);
  }
  const entries = shuffle([...map.entries()]);
  const choices = entries.map((e) => e[0]);
  const correctIndex = choices.indexOf(fmt(correct));
  return { choices, correctIndex };
}

// ============================================================================
// Question generators
// ============================================================================

const RULE_OF_THREE_ITEMS = [
  'kg de pommes',
  "litres d'essence",
  'kg de farine',
  'billets de train',
  'kg de peinture',
  'metres de tissu',
];

function genRuleOfThree(): QuestionData {
  const item = pick(RULE_OF_THREE_ITEMS);
  const unitPrice = randInt(2, 15);
  const x = randInt(2, 8);
  const y = unitPrice * x;
  let z = randInt(2, 20);
  while (z === x) z = randInt(2, 20);
  const answer = unitPrice * z;
  const statement = `${x} ${item} coutent ${y} €. Combien coutent ${z} ${item} ?`;
  const distractors = [
    y * z,
    y + z,
    Math.round(y / z),
    unitPrice * z + x,
    answer + x,
    answer - x,
    x * z,
  ].filter((d) => d !== answer && d > 0);
  const { choices, correctIndex } = buildNumericChoices(answer, distractors, ' €');
  return {
    statement,
    choices,
    correctIndex,
    explanation: `Prix unitaire = ${y} / ${x} = ${unitPrice} €. Pour ${z} unites : ${unitPrice} x ${z} = ${answer} €.`,
    category: 'Regle de trois',
  };
}

function genPercentageOf(): QuestionData {
  const pct = pick([5, 10, 15, 20, 25, 40, 50, 75]);
  const divisor = 100 / gcd(pct, 100);
  const k = randInt(2, 20);
  const base = divisor * k;
  const answer = (base * pct) / 100;
  const statement = `Combien vaut ${pct} % de ${base} ?`;
  const distractors = [
    (base * pct) / 10,
    base / pct,
    answer + pct,
    answer - pct,
    base - answer,
    answer * 2,
  ].filter((d) => d !== answer && d > 0);
  const { choices, correctIndex } = buildNumericChoices(answer, distractors, '');
  return {
    statement,
    choices,
    correctIndex,
    explanation: `${pct} % de ${base} = (${pct} / 100) x ${base} = ${answer}.`,
    category: 'Pourcentages',
  };
}

function genPercentageChange(): QuestionData {
  const pct = pick([10, 20, 25, 30, 50, 15, 5]);
  const divisor = 100 / gcd(pct, 100);
  const k = randInt(2, 15);
  const price = divisor * k;
  const isDiscount = Math.random() < 0.65;
  const delta = (price * pct) / 100;
  const answer = isDiscount ? price - delta : price + delta;
  const statement = `Un article coute ${price} €. Il ${isDiscount ? 'est solde de' : 'augmente de'} ${pct} %. Quel est le nouveau prix ?`;
  const distractors = [
    isDiscount ? price + delta : price - delta,
    delta,
    (price * pct) / 10,
    answer + pct,
    answer - pct,
  ].filter((d) => d !== answer && d > 0);
  const { choices, correctIndex } = buildNumericChoices(answer, distractors, ' €');
  return {
    statement,
    choices,
    correctIndex,
    explanation: `${isDiscount ? 'Remise' : 'Hausse'} = ${price} x ${pct} / 100 = ${delta} €. Nouveau prix = ${price} ${isDiscount ? '-' : '+'} ${delta} = ${answer} €.`,
    category: 'Pourcentages',
  };
}

function genGroundspeed(): QuestionData {
  const tas = Math.round(randInt(120, 300) / 10) * 10;
  const wind = Math.round(randInt(10, 60) / 5) * 5;
  const tailwind = Math.random() < 0.6;
  const gs = tailwind ? tas + wind : tas - wind;
  const statement = `Un avion vole a une vitesse propre de ${tas} km/h. Il subit un vent ${tailwind ? 'arriere' : 'de face'} de ${wind} km/h. Quelle est sa vitesse sol ?`;
  const distractors = [tas, tas + (tailwind ? -wind : wind), tas + wind, tas - wind, gs + wind, gs - wind].filter(
    (d) => d !== gs && d > 0,
  );
  const { choices, correctIndex } = buildNumericChoices(gs, distractors, ' km/h');
  return {
    statement,
    choices,
    correctIndex,
    explanation: `Vitesse sol = vitesse propre ${tailwind ? '+' : '-'} vent = ${tas} ${tailwind ? '+' : '-'} ${wind} = ${gs} km/h.`,
    category: 'Vitesse / distance / temps',
  };
}

function genTimeForDistance(): QuestionData {
  const gs = pick([120, 150, 180, 200, 240, 300, 360, 400, 450, 480, 600]);
  const hoursFraction = pick([0.25, 0.5, 0.75, 1, 1.5, 2]);
  const distance = Math.round(gs * hoursFraction);
  const timeMin = Math.round(hoursFraction * 60);
  const statement = `Un avion vole a une vitesse sol de ${gs} km/h. Combien de temps lui faut-il pour parcourir ${distance} km ?`;
  const distractors = [
    timeMin / 2,
    timeMin * 2,
    timeMin + 15,
    timeMin - 15,
    Math.round((distance / gs) * 100),
  ].filter((d) => d !== timeMin && d > 0);
  const { choices, correctIndex } = buildNumericChoices(timeMin, distractors, ' min');
  return {
    statement,
    choices,
    correctIndex,
    explanation: `Temps = distance / vitesse = ${distance} / ${gs} h = ${hoursFraction} h = ${timeMin} min.`,
    category: 'Vitesse / distance / temps',
  };
}

function genAviationCombined(): QuestionData {
  const tas = pick([160, 180, 200, 220, 240, 260, 280, 300]);
  const wind = pick([10, 20, 30, 40]);
  const tailwind = Math.random() < 0.5;
  const gs = tailwind ? tas + wind : tas - wind;
  const hoursFraction = pick([0.5, 1, 1.5, 2, 2.5]);
  const distance = Math.round(gs * hoursFraction);
  const timeMin = Math.round(hoursFraction * 60);
  const statement = `Un avion vole a une vitesse propre de ${tas} km/h avec un vent ${tailwind ? 'arriere' : 'de face'} de ${wind} km/h. Combien de temps lui faut-il pour parcourir ${distance} km ?`;
  const distractors = [
    timeMin + 15,
    timeMin - 15,
    Math.round((distance / tas) * 60),
    timeMin * 2,
    Math.round(timeMin / 2),
  ].filter((d) => d !== timeMin && d > 0);
  const { choices, correctIndex } = buildNumericChoices(timeMin, distractors, ' min');
  return {
    statement,
    choices,
    correctIndex,
    explanation: `Vitesse sol = ${tas} ${tailwind ? '+' : '-'} ${wind} = ${gs} km/h. Temps = ${distance} / ${gs} h = ${hoursFraction} h = ${timeMin} min.`,
    category: 'Vitesse / distance / temps',
  };
}

function genSimpleEquation(): QuestionData {
  const a = randInt(2, 9);
  const x = randInt(-10, 20);
  let b = randInt(-15, 15);
  while (b === 0) b = randInt(-15, 15);
  const c = a * x + b;
  const bStr = b >= 0 ? `+ ${b}` : `- ${Math.abs(b)}`;
  const statement = `${a}x ${bStr} = ${c}. Quelle est la valeur de x ?`;
  const distractors = [x + 1, x - 1, x + a, x - a, -x].filter((d) => d !== x);
  const { choices, correctIndex } = buildNumericChoices(x, distractors, '');
  return {
    statement,
    choices,
    correctIndex,
    explanation: `${a}x = ${c} ${b >= 0 ? '-' : '+'} ${Math.abs(b)} = ${c - b}, donc x = ${c - b} / ${a} = ${x}.`,
    category: 'Equations simples',
  };
}

const GENERATORS = [
  genRuleOfThree,
  genPercentageOf,
  genPercentageChange,
  genGroundspeed,
  genTimeForDistance,
  genAviationCombined,
  genSimpleEquation,
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

  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionStartRef = useRef(0);
  const perfSavedRef = useRef(false);
  const lockedRef = useRef(false);
  const currentIdxRef = useRef(0);
  const questionsRef = useRef<QuestionData[]>([]);

  currentIdxRef.current = currentIdx;
  questionsRef.current = questions;
  lockedRef.current = locked;

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(
    (durationMs: number) => {
      clearTimer();
      questionStartRef.current = Date.now();
      setTotalTime(durationMs);
      setTimeLeft(durationMs);
      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - questionStartRef.current;
        const left = Math.max(0, durationMs - elapsed);
        setTimeLeft(left);
      }, 50);
    },
    [clearTimer],
  );

  useEffect(() => () => clearTimer(), [clearTimer]);

  const goToNextQuestion = useCallback(() => {
    const idx = currentIdxRef.current;
    const qs = questionsRef.current;

    if (idx + 1 >= qs.length) {
      clearTimer();
      setLocked(false);
      lockedRef.current = false;
      setSelectedIdx(null);
      setShowCorrection(false);
      setLastOutcome(null);
      setGameState('results');
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
    startTimer(settingsRef.current.timePerQuestionSec * 1000);
  }, [clearTimer, startTimer]);

  const recordAnswer = useCallback(
    (index: number | null, outcome: AnswerOutcome) => {
      if (lockedRef.current) return;
      lockedRef.current = true;
      setLocked(true);
      clearTimer();

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
    [clearTimer, goToNextQuestion],
  );

  const handleChoice = useCallback(
    (index: number) => {
      const q = questionsRef.current[currentIdxRef.current];
      const outcome: AnswerOutcome = index === q.correctIndex ? 'correct' : 'incorrect';
      recordAnswer(index, outcome);
    },
    [recordAnswer],
  );

  const startGame = useCallback(() => {
    perfSavedRef.current = false;
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
    startTimer(settingsRef.current.timePerQuestionSec * 1000);
  }, [startTimer]);

  useEffect(() => {
    if (gameState !== 'playing' || locked) return;
    if (totalTime > 0 && timeLeft <= 0) {
      recordAnswer(null, 'skipped');
    }
  }, [timeLeft, totalTime, gameState, locked, recordAnswer]);

  // =========================================================================
  // MENU
  // =========================================================================
  if (gameState === 'menu') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">Mathematiques</CardTitle>
            <CardDescription className="mt-2 text-base">
              Resolvez des problemes de mathematiques appliquees a l&apos;aeronautique
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
              <p>
                <strong>{settings.totalQuestions} problemes</strong> : regle de trois, pourcentages, vitesse /
                distance / temps, equations simples.
              </p>
              <p>
                Choisissez la bonne reponse parmi <strong>4 a 5 propositions</strong>.
              </p>
              <p>
                <strong>{settings.timePerQuestionSec}s</strong> par question.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xl font-bold text-slate-700">{settings.totalQuestions}</p>
                <p className="text-xs text-slate-500">Questions</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xl font-bold text-slate-700">4-5</p>
                <p className="text-xs text-slate-500">Choix</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xl font-bold text-slate-700">{settings.timePerQuestionSec}s</p>
                <p className="text-xs text-slate-500">Par question</p>
              </div>
            </div>

            {settings.examMode && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-center text-sm text-amber-700">
                Mode examen — resultats a la fin
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
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
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
                  min={5}
                  max={40}
                  step={1}
                  className="mt-2"
                />
              </div>
              <div>
                <Label>Temps par question : {settings.timePerQuestionSec}s</Label>
                <Slider
                  value={[settings.timePerQuestionSec]}
                  onValueChange={([v]) => setSettings((s) => ({ ...s, timePerQuestionSec: v }))}
                  min={15}
                  max={120}
                  step={5}
                  className="mt-2"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Mode examen</Label>
                  <p className="mt-0.5 text-xs text-slate-500">Pas de correction entre les questions</p>
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
    const grade = percent >= 75 ? 'Excellent' : percent >= 50 ? 'Bien' : percent >= 25 ? 'Passable' : 'A revoir';

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">Resultats</CardTitle>
            <Badge
              variant={percent >= 75 ? 'default' : percent >= 50 ? 'secondary' : 'destructive'}
              className="mt-2 px-4 py-1 text-lg"
            >
              {grade}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-5xl font-bold text-slate-700">{percent}%</p>
              <p className="mt-1 text-slate-500">
                {correct} / {total} bonnes reponses
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-green-50 p-3 text-center">
                <p className="text-2xl font-bold text-green-600">{correct}</p>
                <p className="text-xs text-green-700">Correct</p>
              </div>
              <div className="rounded-lg bg-red-50 p-3 text-center">
                <p className="text-2xl font-bold text-red-600">{incorrect}</p>
                <p className="text-xs text-red-700">Incorrect</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 text-center">
                <p className="text-2xl font-bold text-slate-600">{skipped}</p>
                <p className="text-xs text-slate-500">Passe</p>
              </div>
            </div>

            <div className="rounded-lg bg-amber-50 p-3 text-center">
              <p className="text-2xl font-bold text-amber-600">{avgTime}s</p>
              <p className="text-sm text-amber-700">Temps moyen</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-700">Detail par question :</p>
              <div className="max-h-64 space-y-1.5 overflow-y-auto">
                {results.map((r, i) => {
                  const correctAnswer = r.question.choices[r.question.correctIndex];
                  const selected = r.selectedIndex !== null ? r.question.choices[r.selectedIndex] : null;
                  return (
                    <div key={i} className="rounded bg-slate-50 px-3 py-2 text-sm">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="text-slate-500">
                          Q{i + 1} · {r.question.category}
                        </span>
                        <span
                          className={
                            r.outcome === 'correct'
                              ? 'font-semibold text-green-600'
                              : r.outcome === 'incorrect'
                                ? 'font-semibold text-red-600'
                                : 'font-semibold text-slate-500'
                          }
                        >
                          {r.outcome === 'correct' ? '\u2713' : r.outcome === 'incorrect' ? '\u2717' : '\u2014'}{' '}
                          {selected ?? 'Passe'}
                          {r.outcome === 'incorrect' && (
                            <span className="ml-2 text-green-600">({correctAnswer})</span>
                          )}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">{r.question.statement}</p>
                      <p className="mt-0.5 text-xs text-slate-400">{r.question.explanation}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {perfEntries.length >= 2 && (
              <div className="border-t pt-4">
                <p className="mb-2 text-center text-sm font-medium text-slate-500">Progression</p>
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
  const timerPercent = totalTime > 0 ? (timeLeft / totalTime) * 100 : 100;
  const timerColor = timerPercent > 50 ? 'bg-blue-500' : timerPercent > 20 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="relative w-full max-w-3xl">
        {settings.timePerQuestionSec > 0 && (
          <div className="absolute right-0 top-0 bottom-0 flex w-3 flex-col overflow-hidden rounded-full bg-slate-200">
            <div
              className={`w-full transition-all duration-100 ${timerColor}`}
              style={{ height: `${100 - timerPercent}%` }}
            />
            <div className="flex-1" />
          </div>
        )}

        <div className="mb-4 flex items-center justify-between pr-6">
          <Badge variant="outline" className="px-3 py-1 text-base">
            {currentIdx + 1} / {settings.totalQuestions}
          </Badge>
          <Badge variant="secondary" className="px-3 py-1 text-sm">
            {currentQ?.category}
          </Badge>
        </div>

        <Card className="mr-6">
          <CardContent className="space-y-8 py-10">
            <p className="text-center text-xl font-semibold leading-relaxed text-slate-800 sm:text-2xl md:text-3xl">
              {currentQ?.statement}
            </p>

            <div className="mx-auto flex max-w-xl flex-col gap-3">
              {currentQ?.choices.map((choice, i) => {
                const isSelected = selectedIdx === i;
                const isCorrectChoice = showCorrection && i === currentQ.correctIndex;
                let variantClass =
                  'border-slate-200 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50';
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
                    className={`rounded-xl border-2 px-5 py-4 text-lg font-semibold shadow-sm transition-all disabled:opacity-70 ${variantClass}`}
                  >
                    {choice}
                  </button>
                );
              })}
            </div>

            {showCorrection && currentQ && (
              <div className="mx-auto max-w-xl rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p
                  className={`mb-1 text-center text-base font-semibold ${
                    lastOutcome === 'correct'
                      ? 'text-green-600'
                      : lastOutcome === 'incorrect'
                        ? 'text-red-600'
                        : 'text-slate-600'
                  }`}
                >
                  {lastOutcome === 'correct'
                    ? 'Correct !'
                    : lastOutcome === 'incorrect'
                      ? `Incorrect — reponse : ${currentQ.choices[currentQ.correctIndex]}`
                      : `Reponse : ${currentQ.choices[currentQ.correctIndex]}`}
                </p>
                <p className="text-center text-sm text-slate-600">{currentQ.explanation}</p>
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

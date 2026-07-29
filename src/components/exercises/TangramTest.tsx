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
  timeLimitSec: number; // total time for the whole session, 0 = unlimited
  examMode: boolean;
}

type Cell = [number, number];

interface BrickPiece {
  letter: string;
  cells: Cell[];
}

interface QuestionData {
  template: BrickPiece[];
  recipeCounts: Record<string, number>;
  choices: string[];
  correctIndex: number;
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

const SETTINGS_KEY = 'aviatest-tangram-settings';

const DEFAULT_SETTINGS: GameSettings = {
  totalQuestions: 24,
  timeLimitSec: 720, // 12 minutes
  examMode: false,
};

const NAVY = '#1a2b4a';
const PIECE_COLORS = ['#60a5fa', '#f97316', '#34d399', '#f472b6'];

// Catalog of reference bricks shown to the player (8-10 shapes).
// Only I, O, T and L actually appear in the generated 4x4 tilings below;
// the rest are decorative/distractor bricks so the catalog reads richer.
const BRICK_CATALOG: BrickPiece[] = [
  { letter: 'I', cells: [[0, 0], [1, 0], [2, 0], [3, 0]] },
  { letter: 'O', cells: [[0, 0], [0, 1], [1, 0], [1, 1]] },
  { letter: 'T', cells: [[0, 0], [0, 1], [0, 2], [1, 1]] },
  { letter: 'S', cells: [[0, 1], [0, 2], [1, 0], [1, 1]] },
  { letter: 'Z', cells: [[0, 0], [0, 1], [1, 1], [1, 2]] },
  { letter: 'L', cells: [[0, 0], [1, 0], [2, 0], [2, 1]] },
  { letter: 'J', cells: [[0, 1], [1, 1], [2, 1], [2, 0]] },
  { letter: 'P', cells: [[0, 0], [0, 1], [1, 0]] },
  { letter: 'X', cells: [[0, 1], [1, 0], [1, 1], [1, 2], [2, 1]] },
];

const ALL_LETTERS = ['I', 'O', 'T', 'S', 'Z', 'L', 'J'];

// Valid, hand-verified tilings of a 4x4 grid (16 cells) into exactly 4
// tetromino-shaped bricks (no overlap, full coverage).
const TEMPLATES: BrickPiece[][] = [
  // 4 x O
  [
    { letter: 'O', cells: [[0, 0], [0, 1], [1, 0], [1, 1]] },
    { letter: 'O', cells: [[0, 2], [0, 3], [1, 2], [1, 3]] },
    { letter: 'O', cells: [[2, 0], [2, 1], [3, 0], [3, 1]] },
    { letter: 'O', cells: [[2, 2], [2, 3], [3, 2], [3, 3]] },
  ],
  // 4 x I horizontal
  [
    { letter: 'I', cells: [[0, 0], [0, 1], [0, 2], [0, 3]] },
    { letter: 'I', cells: [[1, 0], [1, 1], [1, 2], [1, 3]] },
    { letter: 'I', cells: [[2, 0], [2, 1], [2, 2], [2, 3]] },
    { letter: 'I', cells: [[3, 0], [3, 1], [3, 2], [3, 3]] },
  ],
  // 4 x I vertical
  [
    { letter: 'I', cells: [[0, 0], [1, 0], [2, 0], [3, 0]] },
    { letter: 'I', cells: [[0, 1], [1, 1], [2, 1], [3, 1]] },
    { letter: 'I', cells: [[0, 2], [1, 2], [2, 2], [3, 2]] },
    { letter: 'I', cells: [[0, 3], [1, 3], [2, 3], [3, 3]] },
  ],
  // 2 x O (top) + 2 x I (bottom rows)
  [
    { letter: 'O', cells: [[0, 0], [0, 1], [1, 0], [1, 1]] },
    { letter: 'O', cells: [[0, 2], [0, 3], [1, 2], [1, 3]] },
    { letter: 'I', cells: [[2, 0], [2, 1], [2, 2], [2, 3]] },
    { letter: 'I', cells: [[3, 0], [3, 1], [3, 2], [3, 3]] },
  ],
  // I (top row) + 2 x O (middle) + I (bottom row)
  [
    { letter: 'I', cells: [[0, 0], [0, 1], [0, 2], [0, 3]] },
    { letter: 'O', cells: [[1, 0], [1, 1], [2, 0], [2, 1]] },
    { letter: 'O', cells: [[1, 2], [1, 3], [2, 2], [2, 3]] },
    { letter: 'I', cells: [[3, 0], [3, 1], [3, 2], [3, 3]] },
  ],
  // 4 x L pinwheel
  [
    { letter: 'L', cells: [[0, 0], [0, 1], [0, 2], [1, 0]] },
    { letter: 'L', cells: [[0, 3], [1, 1], [1, 2], [1, 3]] },
    { letter: 'L', cells: [[2, 3], [3, 1], [3, 2], [3, 3]] },
    { letter: 'L', cells: [[2, 0], [2, 1], [2, 2], [3, 0]] },
  ],
  // 4 x T pinwheel
  [
    { letter: 'T', cells: [[0, 0], [0, 1], [0, 2], [1, 1]] },
    { letter: 'T', cells: [[1, 0], [2, 0], [3, 0], [2, 1]] },
    { letter: 'T', cells: [[3, 1], [3, 2], [3, 3], [2, 2]] },
    { letter: 'T', cells: [[0, 3], [1, 2], [1, 3], [2, 3]] },
  ],
  // Mixed: 1 x O, 1 x I, 2 x L
  [
    { letter: 'O', cells: [[0, 0], [0, 1], [1, 0], [1, 1]] },
    { letter: 'I', cells: [[0, 3], [1, 3], [2, 3], [3, 3]] },
    { letter: 'L', cells: [[0, 2], [1, 2], [2, 2], [2, 1]] },
    { letter: 'L', cells: [[2, 0], [3, 0], [3, 1], [3, 2]] },
  ],
];

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

function computeCounts(template: BrickPiece[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const p of template) counts[p.letter] = (counts[p.letter] || 0) + 1;
  return counts;
}

function formatRecipe(counts: Record<string, number>): string {
  return Object.entries(counts)
    .filter(([, c]) => c > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([l, c]) => `${c}${l}`)
    .join(', ');
}

function randomRecipeVariant(correct: Record<string, number>): Record<string, number> {
  const letters = Object.keys(correct);
  const variant: Record<string, number> = { ...correct };
  const mode = pick(['swapLetter', 'changeCount', 'addLetter'] as const);

  if (mode === 'swapLetter' && letters.length > 0) {
    const from = pick(letters);
    let to = pick(ALL_LETTERS);
    let guard = 0;
    while (to === from && guard < 10) {
      to = pick(ALL_LETTERS);
      guard++;
    }
    variant[to] = variant[from];
    if (to !== from) delete variant[from];
  } else if (mode === 'changeCount' && letters.length > 0) {
    const key = pick(letters);
    const delta = pick([-1, 1]);
    variant[key] = Math.max(1, variant[key] + delta);
  } else {
    const unused = ALL_LETTERS.filter((l) => !letters.includes(l));
    const extra = unused.length > 0 ? pick(unused) : pick(ALL_LETTERS);
    variant[extra] = 1;
    if (letters.length > 0) {
      const key = pick(letters);
      if (variant[key] > 1) variant[key] -= 1;
      else delete variant[key];
    }
  }
  return variant;
}

function generateQuestion(): QuestionData {
  const template = pick(TEMPLATES);
  const counts = computeCounts(template);
  const correctStr = formatRecipe(counts);

  const seen = new Set<string>([correctStr]);
  const distractors: string[] = [];
  let guard = 0;
  while (distractors.length < 4 && guard < 60) {
    guard++;
    const variant = randomRecipeVariant(counts);
    const str = formatRecipe(variant);
    if (str && !seen.has(str)) {
      seen.add(str);
      distractors.push(str);
    }
  }
  let fallbackGuard = 0;
  while (distractors.length < 4 && fallbackGuard < 40) {
    fallbackGuard++;
    const letter = pick(ALL_LETTERS);
    const str = `${randInt(1, 4)}${letter}`;
    if (!seen.has(str)) {
      seen.add(str);
      distractors.push(str);
    }
  }

  const choices = shuffle([correctStr, ...distractors]);
  const correctIndex = choices.indexOf(correctStr);
  return { template, recipeCounts: counts, choices, correctIndex };
}

function generateQuestions(count: number): QuestionData[] {
  return Array.from({ length: count }, () => generateQuestion());
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
// Rendering
// ============================================================================

function BrickIcon({ cells, cellSize = 16 }: { cells: Cell[]; cellSize?: number }) {
  const maxR = Math.max(...cells.map((c) => c[0]));
  const maxC = Math.max(...cells.map((c) => c[1]));
  return (
    <svg width={(maxC + 1) * cellSize} height={(maxR + 1) * cellSize}>
      {cells.map(([r, c], i) => (
        <rect
          key={i}
          x={c * cellSize}
          y={r * cellSize}
          width={cellSize}
          height={cellSize}
          fill={NAVY}
          stroke="#ffffff"
          strokeWidth={1.5}
        />
      ))}
    </svg>
  );
}

function CompositeGrid({ template, cellSize = 56 }: { template: BrickPiece[]; cellSize?: number }) {
  const size = 4;
  const pieceOf = (r: number, c: number) => template.findIndex((p) => p.cells.some(([pr, pc]) => pr === r && pc === c));
  return (
    <svg width={size * cellSize} height={size * cellSize} className="mx-auto block">
      {Array.from({ length: size }).map((_, r) =>
        Array.from({ length: size }).map((_, c) => {
          const idx = pieceOf(r, c);
          return (
            <rect
              key={`${r}-${c}`}
              x={c * cellSize}
              y={r * cellSize}
              width={cellSize}
              height={cellSize}
              fill={idx >= 0 ? PIECE_COLORS[idx % PIECE_COLORS.length] : '#eee'}
              stroke={NAVY}
              strokeWidth={2}
            />
          );
        }),
      )}
    </svg>
  );
}

// ============================================================================
// Component
// ============================================================================

export default function TangramTest() {
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
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
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

  const pauseTimer = useCallback(() => clearTimer(), [clearTimer]);

  const resumeTimer = useCallback(() => {
    if (timeLeft <= 0) return;
    clearTimer();
    const remaining = timeLeft;
    questionStartRef.current = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - questionStartRef.current;
      const left = Math.max(0, remaining - elapsed);
      setTimeLeft(left);
    }, 50);
  }, [clearTimer, timeLeft]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  const finishGame = useCallback(() => {
    clearTimer();
    setGameState('results');
  }, [clearTimer]);

  const goToNextQuestion = useCallback(() => {
    const idx = currentIdxRef.current;
    const qs = questionsRef.current;

    if (idx + 1 >= qs.length) {
      finishGame();
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
    if (settingsRef.current.timeLimitSec > 0) resumeTimer();
  }, [finishGame, resumeTimer]);

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
        if (currentIdxRef.current + 1 >= questionsRef.current.length) {
          finishGame();
        } else {
          goToNextQuestion();
        }
      } else {
        setShowCorrection(true);
        if (settingsRef.current.timeLimitSec > 0) pauseTimer();
      }
    },
    [finishGame, goToNextQuestion, pauseTimer],
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
    if (settingsRef.current.timeLimitSec > 0) {
      startTimer(settingsRef.current.timeLimitSec * 1000);
    } else {
      setTotalTime(0);
      setTimeLeft(0);
    }
  }, [startTimer]);

  // Global timer expiry -> results
  useEffect(() => {
    if (timeLeft <= 0 && totalTime > 0 && gameState === 'playing') {
      finishGame();
    }
  }, [timeLeft, totalTime, gameState, finishGame]);

  // =========================================================================
  // MENU
  // =========================================================================
  if (gameState === 'menu') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">Tangram</CardTitle>
            <CardDescription className="mt-2 text-base">
              Reconnaissez les briques utilisees pour composer chaque figure
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
              <p>
                Un catalogue de <strong>{BRICK_CATALOG.length} briques</strong> etiquetees par une lettre.
              </p>
              <p>
                Une figure 4x4 est composee de <strong>4 briques</strong>. Retrouvez la bonne composition parmi{' '}
                <strong>5 propositions</strong>.
              </p>
              {settings.timeLimitSec > 0 && (
                <p>
                  Temps total :{' '}
                  <strong>
                    {Math.floor(settings.timeLimitSec / 60)}min
                    {settings.timeLimitSec % 60 > 0 ? ` ${settings.timeLimitSec % 60}s` : ''}
                  </strong>
                  .
                </p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xl font-bold text-slate-700">{settings.totalQuestions}</p>
                <p className="text-xs text-slate-500">Questions</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xl font-bold text-slate-700">5</p>
                <p className="text-xs text-slate-500">Choix</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xl font-bold text-slate-700">
                  {settings.timeLimitSec > 0 ? `${Math.floor(settings.timeLimitSec / 60)}m` : '\u221E'}
                </p>
                <p className="text-xs text-slate-500">Temps total</p>
              </div>
            </div>

            <div className="rounded-lg bg-slate-50 p-4">
              <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                Catalogue de briques
              </p>
              <div className="flex flex-wrap items-end justify-center gap-4">
                {BRICK_CATALOG.map((b) => (
                  <div key={b.letter} className="flex flex-col items-center gap-1">
                    <BrickIcon cells={b.cells} cellSize={10} />
                    <span className="text-xs font-semibold text-slate-600">{b.letter}</span>
                  </div>
                ))}
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
                <Label>
                  Temps total :{' '}
                  {settings.timeLimitSec > 0
                    ? `${Math.floor(settings.timeLimitSec / 60)}min${settings.timeLimitSec % 60 > 0 ? ` ${settings.timeLimitSec % 60}s` : ''}`
                    : 'Illimite'}
                </Label>
                <Slider
                  value={[settings.timeLimitSec]}
                  onValueChange={([v]) => setSettings((s) => ({ ...s, timeLimitSec: v }))}
                  min={0}
                  max={1800}
                  step={30}
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
      savePerformanceResult('tangram', correct, total, avgMs);
    }

    const perfEntries = loadEntries('tangram');
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
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Q{i + 1}</span>
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
                          {r.outcome === 'incorrect' && <span className="ml-2 text-green-600">({correctAnswer})</span>}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {perfEntries.length >= 2 && (
              <div className="border-t pt-4">
                <p className="mb-2 text-center text-sm font-medium text-slate-500">Progression</p>
                <div className="flex justify-center">
                  <MiniPerformanceChart entries={perfEntries} exerciseId="tangram" />
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
    <div className="flex min-h-screen flex-col items-center py-6" style={{ backgroundColor: '#d4d4d4' }}>
      <div className="relative w-full max-w-3xl px-4">
        {settings.timeLimitSec > 0 && (
          <div className="absolute right-0 top-0 bottom-0 flex w-3 flex-col overflow-hidden rounded-full bg-black/10">
            <div
              className={`w-full transition-all duration-100 ${timerColor}`}
              style={{ height: `${100 - timerPercent}%` }}
            />
            <div className="flex-1" />
          </div>
        )}

        <div className="mb-4 flex items-center justify-between pr-6">
          <Badge variant="outline" className="border-transparent bg-white px-3 py-1 text-base" style={{ color: NAVY }}>
            {currentIdx + 1} / {settings.totalQuestions}
          </Badge>
        </div>

        {/* Catalog reminder */}
        <div className="mb-4 mr-6 rounded-xl bg-white p-3 shadow-sm">
          <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">Catalogue</p>
          <div className="flex flex-wrap items-end justify-center gap-4">
            {BRICK_CATALOG.map((b) => (
              <div key={b.letter} className="flex flex-col items-center gap-1">
                <BrickIcon cells={b.cells} cellSize={9} />
                <span className="text-[11px] font-semibold text-slate-600">{b.letter}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Composite figure */}
        <div className="mb-6 mr-6 rounded-xl bg-white p-6 shadow-sm">
          <p className="mb-4 text-center text-sm font-medium text-slate-500">
            Quelle est la composition exacte de cette figure ?
          </p>
          {currentQ && <CompositeGrid template={currentQ.template} />}
        </div>

        {/* Choices */}
        <div className="mx-auto mb-4 mr-6 flex max-w-xl flex-col gap-3">
          {currentQ?.choices.map((choice, i) => {
            const isSelected = selectedIdx === i;
            const isCorrectChoice = showCorrection && i === currentQ.correctIndex;
            let variantClass = 'border-slate-200 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50';
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
                className={`rounded-xl border-2 px-5 py-3 text-lg font-semibold tracking-wide shadow-sm transition-all disabled:opacity-70 ${variantClass}`}
              >
                {choice}
              </button>
            );
          })}
        </div>

        {showCorrection && currentQ && (
          <div className="mx-auto mb-4 mr-6 max-w-xl rounded-xl border border-slate-200 bg-white p-4">
            <p
              className={`text-center text-base font-semibold ${
                lastOutcome === 'correct' ? 'text-green-600' : lastOutcome === 'incorrect' ? 'text-red-600' : 'text-slate-600'
              }`}
            >
              {lastOutcome === 'correct'
                ? 'Correct !'
                : lastOutcome === 'incorrect'
                  ? `Incorrect — reponse : ${currentQ.choices[currentQ.correctIndex]}`
                  : `Reponse : ${currentQ.choices[currentQ.correctIndex]}`}
            </p>
            <Button size="lg" className="mt-4 w-full" onClick={goToNextQuestion}>
              {currentIdx + 1 >= questions.length ? 'Voir les resultats' : 'Suivant'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

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
import { ArrowLeft, Play, RotateCcw, Home, Settings, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { usePhoneLayout } from '@/components/phone/PhoneLayout';

// ============================================================================
// Types
// ============================================================================

type GameState = 'menu' | 'settings' | 'playing' | 'results';
type AnswerOutcome = 'correct' | 'incorrect' | 'skipped';
type BrickLetter = 'U' | 'S' | 'R' | 'Q' | 'P' | 'O' | 'W' | 'T' | 'V' | 'X';

interface GameSettings {
  totalQuestions: number;
  timeLimitSec: number;
  examMode: boolean;
}

interface QuestionData {
  grid: BrickLetter[][];
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
const GRID_SIZE = 4;
const CELL_COUNT = GRID_SIZE * GRID_SIZE;
const FIGURE_BG = '#d4d4d4';
const BRICK_FILL = '#000000';

const DEFAULT_SETTINGS: GameSettings = {
  totalQuestions: 24,
  timeLimitSec: 720,
  examMode: false,
};

const CATALOG_ORDER: BrickLetter[] = ['U', 'S', 'R', 'Q', 'P', 'O', 'W', 'T', 'V', 'X'];

// Hand-crafted 4x4 patterns (each cell = one catalog brick).
const PATTERN_TEMPLATES: BrickLetter[][][] = [
  [
    ['P', 'P', 'X', 'X'],
    ['P', 'U', 'X', 'V'],
    ['O', 'S', 'W', 'V'],
    ['O', 'T', 'Q', 'R'],
  ],
  [
    ['V', 'V', 'V', 'P'],
    ['R', 'U', 'P', 'P'],
    ['R', 'S', 'P', 'X'],
    ['T', 'O', 'W', 'X'],
  ],
  [
    ['Q', 'P', 'P', 'P'],
    ['Q', 'U', 'S', 'S'],
    ['O', 'T', 'V', 'V'],
    ['W', 'W', 'R', 'X'],
  ],
  [
    ['T', 'V', 'V', 'V'],
    ['R', 'U', 'P', 'P'],
    ['R', 'S', 'O', 'O'],
    ['Q', 'W', 'X', 'X'],
  ],
  [
    ['P', 'P', 'P', 'X'],
    ['S', 'U', 'X', 'X'],
    ['S', 'W', 'V', 'R'],
    ['O', 'T', 'Q', 'R'],
  ],
  [
    ['V', 'V', 'R', 'R'],
    ['P', 'U', 'T', 'Q'],
    ['P', 'S', 'T', 'O'],
    ['X', 'W', 'W', 'O'],
  ],
  [
    ['Q', 'P', 'P', 'V'],
    ['O', 'U', 'V', 'V'],
    ['O', 'S', 'T', 'R'],
    ['W', 'X', 'X', 'R'],
  ],
  [
    ['T', 'V', 'V', 'P'],
    ['R', 'U', 'P', 'P'],
    ['R', 'S', 'O', 'W'],
    ['Q', 'X', 'X', 'W'],
  ],
  [
    ['P', 'P', 'O', 'O'],
    ['X', 'U', 'S', 'S'],
    ['X', 'W', 'V', 'R'],
    ['Q', 'T', 'V', 'R'],
  ],
  [
    ['V', 'V', 'V', 'P'],
    ['R', 'U', 'P', 'Q'],
    ['R', 'S', 'T', 'O'],
    ['W', 'X', 'X', 'O'],
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

function computeCounts(grid: BrickLetter[][]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of grid) {
    for (const letter of row) {
      counts[letter] = (counts[letter] || 0) + 1;
    }
  }
  return counts;
}

function formatRecipe(counts: Record<string, number>): string {
  return Object.entries(counts)
    .filter(([, c]) => c > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([letter, count]) => (count > 1 ? `${count}${letter}` : letter))
    .join(' - ');
}

function recipeTotal(counts: Record<string, number>): number {
  return Object.values(counts).reduce((sum, c) => sum + c, 0);
}

function cloneCounts(counts: Record<string, number>): Record<string, number> {
  return { ...counts };
}

function randomGrid(): BrickLetter[][] {
  const template = pick(PATTERN_TEMPLATES);
  return template.map((row) => [...row]);
}

function randomRecipeVariant(correct: Record<string, number>): Record<string, number> {
  const variant = cloneCounts(correct);
  const present = Object.keys(variant).filter((l) => variant[l] > 0);
  const mode = pick(['swap', 'shift', 'replace'] as const);

  if (mode === 'swap' && present.length >= 2) {
    const [a, b] = shuffle(present).slice(0, 2);
    const move = Math.min(variant[a], pick([1, 1, 2]));
    if (variant[a] > move) {
      variant[a] -= move;
      variant[b] = (variant[b] || 0) + move;
      if (variant[a] === 0) delete variant[a];
    }
  } else if (mode === 'shift') {
    const from = pick(present);
    const to = pick(CATALOG_ORDER.filter((l) => l !== from));
    variant[from] -= 1;
    if (variant[from] === 0) delete variant[from];
    variant[to] = (variant[to] || 0) + 1;
  } else {
    const from = pick(present);
    let to = pick(CATALOG_ORDER);
    let guard = 0;
    while (to === from && guard < 8) {
      to = pick(CATALOG_ORDER);
      guard++;
    }
    variant[from] -= 1;
    if (variant[from] === 0) delete variant[from];
    variant[to] = (variant[to] || 0) + 1;
  }

  if (recipeTotal(variant) !== CELL_COUNT) return { ...correct };
  return variant;
}

function generateQuestion(): QuestionData {
  for (let attempt = 0; attempt < 40; attempt++) {
    const grid = randomGrid();
    const counts = computeCounts(grid);
    const correctStr = formatRecipe(counts);

    const seen = new Set<string>([correctStr]);
    const distractors: string[] = [];
    let guard = 0;
    while (distractors.length < 4 && guard < 80) {
      guard++;
      const variant = randomRecipeVariant(counts);
      const str = formatRecipe(variant);
      if (str && str !== correctStr && recipeTotal(variant) === CELL_COUNT && !seen.has(str)) {
        seen.add(str);
        distractors.push(str);
      }
    }

    let fallback = 0;
    while (distractors.length < 4 && fallback < 40) {
      fallback++;
      const letter = pick(CATALOG_ORDER);
      const fake = { ...counts, [letter]: (counts[letter] || 0) + 1 };
      const donor = pick(Object.keys(counts));
      if (fake[donor] > 1) {
        fake[donor] -= 1;
        const str = formatRecipe(fake);
        if (str && !seen.has(str) && recipeTotal(fake) === CELL_COUNT) {
          seen.add(str);
          distractors.push(str);
        }
      }
    }

    if (distractors.length < 4) continue;

    const choices = shuffle([correctStr, ...distractors]);
    return { grid, recipeCounts: counts, choices, correctIndex: choices.indexOf(correctStr) };
  }

  const grid = randomGrid();
  const counts = computeCounts(grid);
  const correctStr = formatRecipe(counts);
  return { grid, recipeCounts: counts, choices: [correctStr], correctIndex: 0 };
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

function BrickShape({ letter, size = 36 }: { letter: BrickLetter; size?: number }) {
  const common = { fill: BRICK_FILL };
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden>
      {letter === 'U' && <rect x="0" y="0" width="100" height="100" {...common} />}
      {letter === 'S' && <rect x="8" y="40" width="84" height="20" {...common} />}
      {letter === 'R' && <rect x="40" y="8" width="20" height="84" {...common} />}
      {letter === 'T' && <rect x="42" y="4" width="16" height="92" {...common} />}
      {letter === 'V' && <rect x="4" y="42" width="92" height="16" {...common} />}
      {letter === 'Q' && <polygon points="0,0 100,0 0,100" {...common} />}
      {letter === 'P' && <polygon points="0,0 100,0 100,100" {...common} />}
      {letter === 'O' && <polygon points="0,100 0,0 100,100" {...common} />}
      {letter === 'X' && <polygon points="100,100 100,0 0,100" {...common} />}
      {letter === 'W' && (
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M18 18 H82 V82 H18 Z M32 32 V68 H68 V32 Z"
          fill={BRICK_FILL}
        />
      )}
    </svg>
  );
}

function CatalogLegend({ cellSize = 34 }: { cellSize?: number }) {
  return (
    <div className="flex flex-wrap items-end justify-center gap-3 sm:gap-4">
      {CATALOG_ORDER.map((letter) => (
        <div key={letter} className="flex flex-col items-center gap-0.5">
          <BrickShape letter={letter} size={cellSize} />
          <span className="text-xs font-bold text-[#37322f]">{letter}</span>
        </div>
      ))}
    </div>
  );
}

function CompositeFigure({ grid, cellSize = 52 }: { grid: BrickLetter[][]; cellSize?: number }) {
  const size = GRID_SIZE * cellSize;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="block"
      style={{ backgroundColor: FIGURE_BG }}
      aria-label="Figure tangram 4x4"
    >
      {grid.map((row, r) =>
        row.map((letter, c) => (
          <g key={`${r}-${c}`} transform={`translate(${c * cellSize} ${r * cellSize})`}>
            <svg width={cellSize} height={cellSize} viewBox="0 0 100 100">
              {letter === 'U' && <rect x="0" y="0" width="100" height="100" fill={BRICK_FILL} />}
              {letter === 'S' && <rect x="8" y="40" width="84" height="20" fill={BRICK_FILL} />}
              {letter === 'R' && <rect x="40" y="8" width="20" height="84" fill={BRICK_FILL} />}
              {letter === 'T' && <rect x="42" y="4" width="16" height="92" fill={BRICK_FILL} />}
              {letter === 'V' && <rect x="4" y="42" width="92" height="16" fill={BRICK_FILL} />}
              {letter === 'Q' && <polygon points="0,0 100,0 0,100" fill={BRICK_FILL} />}
              {letter === 'P' && <polygon points="0,0 100,0 100,100" fill={BRICK_FILL} />}
              {letter === 'O' && <polygon points="0,100 0,0 100,100" fill={BRICK_FILL} />}
              {letter === 'X' && <polygon points="100,100 100,0 0,100" fill={BRICK_FILL} />}
              {letter === 'W' && (
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M18 18 H82 V82 H18 Z M32 32 V68 H68 V32 Z"
                  fill={BRICK_FILL}
                />
              )}
            </svg>
          </g>
        )),
      )}
    </svg>
  );
}

// ============================================================================
// Component
// ============================================================================

export default function TangramTest() {
  const router = useRouter();
  const phone = usePhoneLayout();
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
        setTimeLeft(Math.max(0, durationMs - elapsed));
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
      setTimeLeft(Math.max(0, remaining - elapsed));
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
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#fbfaf9] p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">Tangram</CardTitle>
            <CardDescription className="mt-2 text-base">
              Decomposez une figure 4x4 en briques de base (style Pilotest Psy1)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2 rounded-lg bg-[#f7f5f3] p-4 text-sm text-[#605a57]">
              <p>
                Un catalogue de <strong>10 briques</strong> (U, S, R, Q, P, O, W, T, V, X).
              </p>
              <p>
                Chaque case de la figure 4x4 contient une brique. Retrouvez la bonne combinaison parmi{' '}
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
                  {settings.timeLimitSec > 0 ? `${Math.floor(settings.timeLimitSec / 60)}m` : '\u221E'}
                </p>
                <p className="text-xs text-[#605a57]">Temps total</p>
              </div>
            </div>

            <div className="rounded-lg bg-[#f7f5f3] p-4">
              <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-[#605a57]">
                Catalogue de briques
              </p>
              <CatalogLegend cellSize={28} />
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
      savePerformanceResult('tangram', correct, total, avgMs);
    }

    const perfEntries = loadEntries('tangram');

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#fbfaf9] p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">Résultats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <ClassScoreBlock
              exerciseId={'tangram'}
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
              <p className="text-sm text-amber-700">Temps moyen</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-[#37322f]">Detail par question :</p>
              <div className="max-h-64 space-y-1.5 overflow-y-auto">
                {results.map((r, i) => {
                  const correctAnswer = r.question.choices[r.question.correctIndex];
                  const selected = r.selectedIndex !== null ? r.question.choices[r.selectedIndex] : null;
                  return (
                    <div key={i} className="rounded bg-[#f7f5f3] px-3 py-2 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[#605a57]">Q{i + 1}</span>
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
                    </div>
                  );
                })}
              </div>
            </div>

            {perfEntries.length >= 2 && (
              <div className="border-t pt-4">
                <p className="mb-2 text-center text-sm font-medium text-[#605a57]">Progression</p>
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
  const timerColor = timerPercent > 50 ? 'bg-green-500' : timerPercent > 20 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: FIGURE_BG }}>
      {/* Top catalog */}
      <div className="border-b border-slate-400 bg-white/90 px-3 py-2">
        <CatalogLegend cellSize={30} />
      </div>

      {/* Main: figure left, MCQ right */}
      <div className="flex flex-1 flex-col gap-4 p-4 lg:flex-row lg:items-start lg:justify-center">
        <div className="flex flex-1 items-center justify-center">
          {currentQ && <CompositeFigure grid={currentQ.grid} cellSize={phone ? 64 : 56} />}
        </div>

        <div className="mx-auto w-full max-w-sm shrink-0 space-y-2 lg:max-w-md">
          {currentQ?.choices.map((choice, i) => {
            const isSelected = selectedIdx === i;
            const isCorrectChoice = showCorrection && i === currentQ.correctIndex;
            let rowClass = 'border-slate-300 bg-white text-slate-800';
            if (isCorrectChoice) rowClass = 'border-green-600 bg-green-50 text-green-800';
            else if (isSelected && lastOutcome === 'incorrect') rowClass = 'border-red-600 bg-red-50 text-red-800';
            else if (isSelected && !showCorrection) rowClass = 'border-slate-600 bg-slate-100';

            return (
              <button
                key={i}
                type="button"
                disabled={locked}
                onClick={() => handleChoice(i)}
                className={`w-full rounded-xl border-2 px-3 py-3 text-left text-sm font-medium leading-snug sm:text-base ${rowClass}`}
              >
                <span className="mr-2 font-bold">{i + 1})</span>
                {choice}
              </button>
            );
          })}
        </div>
      </div>

      {/* Correction banner */}
      {showCorrection && currentQ && (
        <div className="px-4 pb-2">
          <p
            className={`text-center text-base font-semibold ${
              lastOutcome === 'correct' ? 'text-green-700' : 'text-red-700'
            }`}
          >
            {lastOutcome === 'correct'
              ? 'Correct !'
              : `Incorrect — reponse : ${currentQ.choices[currentQ.correctIndex]}`}
          </p>
        </div>
      )}

      {/* Pilotest-style footer */}
      <div className="mt-auto border-t border-slate-400 bg-[#d4d4d4] px-4 py-3">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="border-slate-500 bg-white px-3 py-1 text-sm">
              {currentIdx + 1} / {settings.totalQuestions}
            </Badge>
            {settings.timeLimitSec > 0 && (
              <div className="flex items-center gap-2">
                <div className="h-8 w-2 overflow-hidden rounded-full bg-slate-400">
                  <div className={`w-full ${timerColor}`} style={{ height: `${timerPercent}%` }} />
                </div>
                <span className="font-mono text-sm text-[#37322f] tabular-nums">
                  {Math.ceil(timeLeft / 1000)}s
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {[1, 2, 3, 4, 5].map((n) => {
              const idx = n - 1;
              const isSelected = selectedIdx === idx;
              let btnClass =
                'h-12 w-12 rounded-lg border-2 border-slate-500 bg-white text-lg font-bold text-slate-800 shadow-sm hover:bg-slate-100 disabled:opacity-60';
              if (showCorrection && idx === currentQ?.correctIndex) {
                btnClass =
                  'h-12 w-12 rounded-lg border-2 border-green-600 bg-green-500 text-lg font-bold text-white shadow-sm';
              } else if (showCorrection && isSelected && lastOutcome === 'incorrect') {
                btnClass =
                  'h-12 w-12 rounded-lg border-2 border-red-600 bg-red-500 text-lg font-bold text-white shadow-sm';
              } else if (isSelected && !showCorrection) {
                btnClass =
                  'h-12 w-12 rounded-lg border-2 border-slate-700 bg-slate-200 text-lg font-bold text-slate-900 shadow-sm';
              }
              return (
                <button
                  key={n}
                  type="button"
                  disabled={locked}
                  onClick={() => handleChoice(idx)}
                  className={btnClass}
                >
                  {n}
                </button>
              );
            })}

            {showCorrection && (
              <button
                type="button"
                onClick={goToNextQuestion}
                className="ml-2 flex items-center gap-2 rounded-lg bg-sky-500 px-6 py-3 text-base font-semibold text-white shadow-md hover:bg-sky-600"
              >
                {currentIdx + 1 >= questions.length ? 'Resultats' : 'Suivant'}
                <ChevronRight className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

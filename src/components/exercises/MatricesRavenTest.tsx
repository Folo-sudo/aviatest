'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { savePerformanceResult, loadEntries } from '@/lib/core/PerformanceTracker';
import { MiniPerformanceChart } from '@/components/PerformanceChart';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Play, RotateCcw, Home, Settings, CheckCircle2, XCircle } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

type GameState = 'menu' | 'settings' | 'playing' | 'results';
type ShapeKind = 'circle' | 'square' | 'triangle' | 'line';

interface CellFigure {
  count: number;
  shape: ShapeKind;
  rotation: number;
  fill: number;
  hasAccent: boolean;
}

interface RavenQuestion {
  matrix: (CellFigure | null)[];
  choices: CellFigure[];
  correctIdx: number;
}

interface GameSettings {
  numQuestions: number;
  timePerQuestion: number;
  examMode: boolean;
}

interface QuestionResult {
  selected: number | null;
  correct: boolean;
  timeMs: number;
}

// ============================================================================
// Constants
// ============================================================================

const EXERCISE_ID = 'matrices-raven';
const SETTINGS_KEY = 'aviatest-matrices-raven-settings';
const SLATE_BG = 'bg-gradient-to-br from-slate-50 to-slate-100';
const CELL = 72;

const DEFAULT_SETTINGS: GameSettings = {
  numQuestions: 12,
  timePerQuestion: 45,
  examMode: false,
};

const SHAPES: ShapeKind[] = ['circle', 'square', 'triangle'];

// ============================================================================
// Helpers
// ============================================================================

function loadSettings(): GameSettings {
  if (typeof window === 'undefined') return { ...DEFAULT_SETTINGS };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettingsLocal(s: GameSettings): void {
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

function makeCell(
  row: number,
  col: number,
  base: { count: number; shape: ShapeKind; rotation: number; fill: number },
): CellFigure {
  return {
    count: Math.min(4, base.count + col),
    shape: base.shape,
    rotation: (base.rotation + row * 90) % 360,
    fill: Math.min(1, base.fill + 0.12 * (row + col)),
    hasAccent: (row + col) % 2 === 0,
  };
}

function generateQuestion(): RavenQuestion {
  const base = {
    count: randInt(1, 2),
    shape: pick(SHAPES),
    rotation: pick([0, 90, 180]),
    fill: 0.35 + Math.random() * 0.2,
  };

  const matrix: (CellFigure | null)[] = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (r === 2 && c === 2) {
        matrix.push(null);
      } else {
        matrix.push(makeCell(r, c, base));
      }
    }
  }

  const correct = makeCell(2, 2, base);
  const decoys: CellFigure[] = [];
  let guard = 0;
  while (decoys.length < 6 && guard < 40) {
    guard++;
    const variant: CellFigure = {
      count: correct.count + pick([-1, 0, 1]),
      shape: pick(SHAPES),
      rotation: pick([0, 90, 180, 270]),
      fill: correct.fill + pick([-0.2, 0, 0.2]),
      hasAccent: !correct.hasAccent,
    };
    variant.count = Math.max(1, Math.min(4, variant.count));
    variant.fill = Math.max(0.2, Math.min(1, variant.fill));
    const key = JSON.stringify(variant);
    const correctKey = JSON.stringify(correct);
    if (key === correctKey) continue;
    if (decoys.some((d) => JSON.stringify(d) === key)) continue;
    decoys.push(variant);
  }

  const correctIdx = randInt(0, decoys.length);
  const choices = [...decoys];
  choices.splice(correctIdx, 0, correct);

  return { matrix, choices, correctIdx };
}


// ============================================================================
// SVG figure
// ============================================================================

function FigureSvg({ fig, size = CELL }: { fig: CellFigure; size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const stroke = '#1a1a1a';
  const fillColor = `rgba(30, 64, 120, ${fig.fill})`;

  const drawShape = (x: number, y: number, s: number) => {
    const g = (
      <g transform={`translate(${x},${y}) rotate(${fig.rotation} ${s / 2} ${s / 2})`}>
        {fig.shape === 'circle' && (
          <circle cx={s / 2} cy={s / 2} r={s * 0.35} fill={fillColor} stroke={stroke} strokeWidth={1.5} />
        )}
        {fig.shape === 'square' && (
          <rect
            x={s * 0.15}
            y={s * 0.15}
            width={s * 0.7}
            height={s * 0.7}
            fill={fillColor}
            stroke={stroke}
            strokeWidth={1.5}
          />
        )}
        {fig.shape === 'triangle' && (
          <polygon
            points={`${s / 2},${s * 0.12} ${s * 0.88},${s * 0.88} ${s * 0.12},${s * 0.88}`}
            fill={fillColor}
            stroke={stroke}
            strokeWidth={1.5}
          />
        )}
        {fig.shape === 'line' && (
          <line x1={s * 0.1} y1={s / 2} x2={s * 0.9} y2={s / 2} stroke={stroke} strokeWidth={3} />
        )}
      </g>
    );
    return g;
  };

  const offsets: [number, number][] = [];
  const n = fig.count;
  if (n === 1) offsets.push([0, 0]);
  else if (n === 2) offsets.push([-0.22, 0], [0.22, 0]);
  else if (n === 3) offsets.push([-0.22, -0.15], [0.22, -0.15], [0, 0.2]);
  else offsets.push([-0.22, -0.15], [0.22, -0.15], [-0.22, 0.2], [0.22, 0.2]);

  const sub = size * 0.38;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
      {offsets.map(([ox, oy], i) => {
        const x = cx + ox * size - sub / 2;
        const y = cy + oy * size - sub / 2;
        return <g key={i}>{drawShape(x, y, sub)}</g>;
      })}
      {fig.hasAccent && (
        <line
          x1={size * 0.15}
          y1={size * 0.85}
          x2={size * 0.85}
          y2={size * 0.15}
          stroke={stroke}
          strokeWidth={2}
          strokeDasharray="4 3"
        />
      )}
    </svg>
  );
}

function MatrixCell({
  fig,
  empty,
  highlight,
}: {
  fig: CellFigure | null;
  empty?: boolean;
  highlight?: 'correct' | 'wrong' | null;
}) {
  const border =
    highlight === 'correct'
      ? 'border-green-500 ring-2 ring-green-300'
      : highlight === 'wrong'
        ? 'border-red-500 ring-2 ring-red-300'
        : 'border-slate-300';

  return (
    <div
      className={`flex items-center justify-center rounded-lg border-2 bg-white ${border} ${empty ? 'border-dashed bg-slate-50' : ''}`}
      style={{ width: CELL + 8, height: CELL + 8 }}
    >
      {fig ? <FigureSvg fig={fig} /> : <span className="text-2xl text-slate-400">?</span>}
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

export default function MatricesRavenTest() {
  const router = useRouter();
  const [gameState, setGameState] = useState<GameState>('menu');
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [questions, setQuestions] = useState<RavenQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [flash, setFlash] = useState<'correct' | 'wrong' | null>(null);
  const [locked, setLocked] = useState(false);

  const perfSavedRef = useRef(false);
  const questionStartRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  useEffect(() => {
    saveSettingsLocal(settings);
  }, [settings]);

  const startGame = useCallback(() => {
    perfSavedRef.current = false;
    const qs = Array.from({ length: settings.numQuestions }, () => generateQuestion());
    setQuestions(qs);
    setCurrentIdx(0);
    setResults([]);
    setSelected(null);
    setFlash(null);
    setLocked(false);
    questionStartRef.current = Date.now();
    setTimeLeft(settings.timePerQuestion);
    setGameState('playing');
  }, [settings]);

  useEffect(() => {
    if (gameState !== 'playing') return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          if (!locked) handleSubmit(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState, currentIdx, locked]);

  const advance = useCallback(
    (result: QuestionResult) => {
      const nextResults = [...results, result];
      setResults(nextResults);
      if (currentIdx + 1 >= questions.length) {
        setGameState('results');
        return;
      }
      setCurrentIdx((i) => i + 1);
      setSelected(null);
      setFlash(null);
      setLocked(false);
      questionStartRef.current = Date.now();
      setTimeLeft(settings.timePerQuestion);
    },
    [currentIdx, questions.length, results, settings.timePerQuestion],
  );

  const handleSubmit = useCallback(
    (timeout = false) => {
      if (locked) return;
      const q = questions[currentIdx];
      if (!q) return;
      setLocked(true);
      const timeMs = Date.now() - questionStartRef.current;
      const sel = timeout ? null : selected;
      const correct = sel !== null && sel === q.correctIdx;
      if (!settings.examMode) {
        setFlash(correct ? 'correct' : 'wrong');
        setTimeout(() => advance({ selected: sel, correct, timeMs }), 1200);
      } else {
        advance({ selected: sel, correct, timeMs });
      }
    },
    [locked, questions, currentIdx, selected, settings.examMode, advance],
  );

  const currentQ = questions[currentIdx];
  const timerPct =
    settings.timePerQuestion > 0 ? (timeLeft / settings.timePerQuestion) * 100 : 0;

  // ---- MENU ----
  if (gameState === 'menu') {
    return (
      <div className={`flex min-h-screen flex-col items-center justify-center ${SLATE_BG} p-4`}>
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Matrices de Raven</CardTitle>
            <CardDescription>Logique visuelle — completez la matrice 3×3</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
              <p>Identifiez la regle (progression, rotation, symboles) et choisissez la figure manquante.</p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xl font-bold text-slate-700">{settings.numQuestions}</p>
                <p className="text-xs text-slate-500">Questions</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xl font-bold text-slate-700">{settings.timePerQuestion}s</p>
                <p className="text-xs text-slate-500">Par question</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xl font-bold text-slate-700">{settings.examMode ? 'Oui' : 'Non'}</p>
                <p className="text-xs text-slate-500">Mode examen</p>
              </div>
            </div>
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

  // ---- SETTINGS ----
  if (gameState === 'settings') {
    return (
      <div className={`flex min-h-screen flex-col items-center justify-center ${SLATE_BG} p-4`}>
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Parametres</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label>Nombre de questions : {settings.numQuestions}</Label>
              <Slider
                value={[settings.numQuestions]}
                onValueChange={([v]) => setSettings((s) => ({ ...s, numQuestions: v }))}
                min={6}
                max={24}
                step={1}
                className="mt-2"
              />
            </div>
            <div>
              <Label>Temps par question : {settings.timePerQuestion}s</Label>
              <Slider
                value={[settings.timePerQuestion]}
                onValueChange={([v]) => setSettings((s) => ({ ...s, timePerQuestion: v }))}
                min={20}
                max={90}
                step={5}
                className="mt-2"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div>
                <Label>Mode examen</Label>
                <p className="text-xs text-slate-500">Pas de correction affichee</p>
              </div>
              <Switch
                checked={settings.examMode}
                onCheckedChange={(v) => setSettings((s) => ({ ...s, examMode: v }))}
              />
            </div>
            <Button size="lg" className="w-full" onClick={() => setGameState('menu')}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Retour
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---- RESULTS ----
  if (gameState === 'results') {
    const correct = results.filter((r) => r.correct).length;
    const total = results.length;
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
    if (!perfSavedRef.current) {
      perfSavedRef.current = true;
      const avgMs =
        results.length > 0 ? results.reduce((s, r) => s + r.timeMs, 0) / results.length : 0;
      savePerformanceResult(EXERCISE_ID, correct, total, avgMs);
    }
    const perfEntries = loadEntries(EXERCISE_ID);

    return (
      <div className={`flex min-h-screen flex-col items-center justify-center ${SLATE_BG} p-4`}>
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">Resultats</CardTitle>
            <Badge variant={pct >= 75 ? 'default' : pct >= 50 ? 'secondary' : 'destructive'} className="mt-2">
              {pct}%
            </Badge>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-5xl font-bold text-slate-700">{correct}/{total}</p>
              <p className="text-slate-500">reponses correctes</p>
            </div>
            {perfEntries.length >= 2 && (
              <div className="border-t pt-4">
                <MiniPerformanceChart entries={perfEntries} exerciseId={EXERCISE_ID} />
              </div>
            )}
            <div className="flex flex-col gap-3">
              <Button size="lg" className="w-full" onClick={startGame}>
                <RotateCcw className="mr-2 h-5 w-5" /> Rejouer
              </Button>
              <Button variant="outline" className="w-full" onClick={() => setGameState('menu')}>Menu</Button>
              <Button variant="ghost" className="w-full" onClick={() => router.push('/')}>
                <Home className="mr-2 h-5 w-5" /> Accueil
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---- PLAYING ----
  if (!currentQ) return null;

  return (
    <div className={`flex min-h-screen flex-col ${SLATE_BG}`}>
      <div className="border-b border-slate-200 bg-white/70 px-4 py-3 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between text-sm font-medium text-slate-700">
          <span>Question {currentIdx + 1}/{questions.length}</span>
          <span>{timeLeft}s</span>
          <span>Score : {results.filter((r) => r.correct).length}/{results.length}</span>
        </div>
        <div className="mx-auto mt-2 h-2 max-w-4xl overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full transition-all"
            style={{
              width: `${timerPct}%`,
              backgroundColor: timerPct < 20 ? '#dc2626' : '#0068C6',
            }}
          />
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-4 md:p-6">
        {flash && (
          <div
            className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-3 font-semibold ${
              flash === 'correct'
                ? 'border-green-200 bg-green-50 text-green-700'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {flash === 'correct' ? (
              <><CheckCircle2 className="h-5 w-5" /> Correct</>
            ) : (
              <><XCircle className="h-5 w-5" /> Incorrect</>
            )}
          </div>
        )}

        <div className="flex flex-col items-center gap-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-600">Matrice</p>
          <div className="grid grid-cols-3 gap-2">
            {currentQ.matrix.map((cell, i) => (
              <MatrixCell
                key={i}
                fig={cell}
                empty={cell === null}
                highlight={
                  locked && i === 8 && flash
                    ? flash
                    : locked && i === 8
                      ? 'correct'
                      : null
                }
              />
            ))}
          </div>

          <p className="text-sm font-semibold uppercase tracking-wide text-slate-600">Choix</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {currentQ.choices.map((choice, i) => {
              const isSelected = selected === i;
              const showCorrect = locked && i === currentQ.correctIdx;
              const showWrong = locked && isSelected && i !== currentQ.correctIdx;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={locked}
                  onClick={() => setSelected(i)}
                  className={`flex flex-col items-center rounded-xl border-2 bg-white p-2 transition-all ${
                    showCorrect
                      ? 'border-green-500 ring-2 ring-green-300'
                      : showWrong
                        ? 'border-red-500 ring-2 ring-red-300'
                        : isSelected
                          ? 'border-blue-500 ring-2 ring-blue-200'
                          : 'border-slate-200 hover:border-slate-400'
                  }`}
                >
                  <FigureSvg fig={choice} />
                  <span className="mt-1 text-xs text-slate-500">{i + 1}</span>
                </button>
              );
            })}
          </div>

          <Button
            size="lg"
            disabled={selected === null || locked}
            onClick={() => handleSubmit(false)}
            className="mt-2"
          >
            Valider
          </Button>
        </div>
      </div>
    </div>
  );
}

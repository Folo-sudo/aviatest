'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { savePerformanceResult, loadEntries } from '@/lib/core/PerformanceTracker';
import { MiniPerformanceChart } from '@/components/PerformanceChart';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Play, Settings, RotateCcw, Home, Eye, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';

// ============================================================================
// Types
// ============================================================================

type GameState = 'menu' | 'settings' | 'playing' | 'results' | 'review';
type Operator = '+' | '−' | '×' | '÷';

interface CalcCell {
  a: number;
  b: number;
  operator: Operator;
  displayedResult: number;
  correctResult: number;
  isFalse: boolean;
  expression: string;
}

interface CalcGrid {
  cells: CalcCell[];
}

interface GridResult {
  gridIndex: number;
  validated: boolean;
  selected: number[];
  falseIndices: number[];
  score: number; // 0–1
}

interface GameSettings {
  numGrids: number;
  timePerGridSec: number;
}

// ============================================================================
// Constants & settings persistence
// ============================================================================

const DEFAULT_SETTINGS: GameSettings = { numGrids: 10, timePerGridSec: 45 };
const SETTINGS_KEY = 'aviatest-grilles-calculs-settings';
const EXERCISE_ID = 'grilles-calculs';
const GRID_SIZE = 9;

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
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch { /* ignore */ }
}

// ============================================================================
// Generation helpers
// ============================================================================

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickOperator(): Operator {
  const ops: Operator[] = ['+', '−', '×', '÷'];
  return ops[randInt(0, ops.length - 1)];
}

function computeResult(a: number, b: number, op: Operator): number {
  switch (op) {
    case '+': return a + b;
    case '−': return a - b;
    case '×': return a * b;
    case '÷': return a / b;
  }
}

function formatExpression(a: number, b: number, op: Operator): string {
  return `${a} ${op} ${b}`;
}

function generateOperands(op: Operator): { a: number; b: number } {
  switch (op) {
    case '+':
      return { a: randInt(2, 99), b: randInt(2, 99) };
    case '−': {
      const a = randInt(10, 99);
      const b = randInt(2, a - 1);
      return { a, b };
    }
    case '×':
      return { a: randInt(2, 12), b: randInt(2, 12) };
    case '÷': {
      const b = randInt(2, 12);
      const quotient = randInt(2, 12);
      return { a: b * quotient, b };
    }
  }
}

function generateWrongResult(correct: number, op: Operator): number {
  const deltas = [-3, -2, -1, 1, 2, 3, 5, 7, 10, -5, -7, -10];
  let wrong: number;
  let attempts = 0;
  do {
    const delta = deltas[randInt(0, deltas.length - 1)];
    wrong = correct + delta;
    if (op === '÷' || op === '×') {
      wrong = correct + randInt(1, 5) * (Math.random() < 0.5 ? 1 : -1);
    }
    attempts++;
  } while (wrong === correct && attempts < 30);
  if (wrong === correct) wrong = correct + 1;
  return wrong;
}

function generateCell(isFalse: boolean): CalcCell {
  const operator = pickOperator();
  const { a, b } = generateOperands(operator);
  const correctResult = computeResult(a, b, operator);
  const displayedResult = isFalse ? generateWrongResult(correctResult, operator) : correctResult;
  return {
    a,
    b,
    operator,
    displayedResult,
    correctResult,
    isFalse,
    expression: formatExpression(a, b, operator),
  };
}

function generateGrid(): CalcGrid {
  const numFalse = randInt(0, 4);
  const falseIndices = new Set<number>();
  while (falseIndices.size < numFalse) {
    falseIndices.add(randInt(0, GRID_SIZE - 1));
  }

  const cells = Array.from({ length: GRID_SIZE }, (_, i) => generateCell(falseIndices.has(i)));
  return { cells };
}

function generateAllGrids(count: number): CalcGrid[] {
  return Array.from({ length: count }, () => generateGrid());
}

// ============================================================================
// Scoring
// ============================================================================

function scoreGrid(grid: CalcGrid, selected: Set<number>, validated: boolean): number {
  if (!validated) return 0;

  const falseIndices = grid.cells
    .map((c, i) => (c.isFalse ? i : -1))
    .filter((i) => i >= 0);
  const numFalse = falseIndices.length;

  if (numFalse === 0) {
    return selected.size === 0 ? 1 : 0;
  }

  const correctHits = falseIndices.filter((i) => selected.has(i)).length;
  const falseAlarms = [...selected].filter((i) => !grid.cells[i].isFalse).length;

  const raw = (correctHits / numFalse) - (falseAlarms / (GRID_SIZE - numFalse));
  return Math.max(0, Math.min(1, raw));
}

function scoreToClass(percent: number): number {
  if (percent >= 96) return 9;
  if (percent >= 92) return 8;
  if (percent >= 85) return 7;
  if (percent >= 75) return 6;
  if (percent >= 60) return 5;
  if (percent >= 44) return 4;
  if (percent >= 24) return 3;
  if (percent >= 7) return 2;
  return 1;
}

function formatMMSS(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
}

// ============================================================================
// Main component
// ============================================================================

export default function GrillesCalculsTest() {
  const router = useRouter();
  const perfSavedRef = useRef(false);

  const [gameState, setGameState] = useState<GameState>('menu');
  const [settingsState, setSettingsState] = useState<GameSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    setSettingsState(loadSettings());
  }, []);

  const setSettings = useCallback((s: GameSettings | ((p: GameSettings) => GameSettings)) => {
    setSettingsState((prev) => {
      const next = typeof s === 'function' ? s(prev) : s;
      saveSettingsLocal(next);
      return next;
    });
  }, []);

  const [grids, setGrids] = useState<CalcGrid[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<Record<number, Set<number>>>({});
  const [gridResults, setGridResults] = useState<GridResult[]>([]);
  const [remainingSec, setRemainingSec] = useState(DEFAULT_SETTINGS.timePerGridSec);
  const [reviewIdx, setReviewIdx] = useState(0);
  const timerExpiredRef = useRef(false);

  const totalGrids = grids.length;
  const timePerGrid = settingsState.timePerGridSec;

  const recordGridResult = useCallback(
    (gridIdx: number, validated: boolean) => {
      const grid = grids[gridIdx];
      if (!grid) return;
      const userSet = selected[gridIdx] || new Set<number>();
      const score = scoreGrid(grid, userSet, validated);
      const falseIndices = grid.cells.map((c, i) => (c.isFalse ? i : -1)).filter((i) => i >= 0);

      setGridResults((prev) => {
        const next = [...prev];
        next[gridIdx] = {
          gridIndex: gridIdx,
          validated,
          selected: [...userSet],
          falseIndices,
          score,
        };
        return next;
      });
    },
    [grids, selected],
  );

  const advanceOrFinish = useCallback(
    (gridIdx: number, validated: boolean) => {
      recordGridResult(gridIdx, validated);
      if (gridIdx < totalGrids - 1) {
        setCurrentIdx(gridIdx + 1);
        setRemainingSec(timePerGrid);
      } else {
        setGameState('results');
      }
    },
    [recordGridResult, totalGrids, timePerGrid],
  );

  const startPlaying = useCallback(() => {
    perfSavedRef.current = false;
    timerExpiredRef.current = false;
    const gs = generateAllGrids(settingsState.numGrids);
    setGrids(gs);
    setSelected({});
    setGridResults([]);
    setCurrentIdx(0);
    setRemainingSec(settingsState.timePerGridSec);
    setGameState('playing');
  }, [settingsState]);

  const toggleCell = useCallback((gridIdx: number, cellIdx: number) => {
    setSelected((prev) => {
      const next = { ...prev };
      const s = new Set(prev[gridIdx] || []);
      if (s.has(cellIdx)) s.delete(cellIdx);
      else s.add(cellIdx);
      next[gridIdx] = s;
      return next;
    });
  }, []);

  const validateAndNext = useCallback(() => {
    if (timerExpiredRef.current) return;
    timerExpiredRef.current = true;
    advanceOrFinish(currentIdx, true);
  }, [advanceOrFinish, currentIdx]);

  // Reset per-grid timer when grid changes
  useEffect(() => {
    if (gameState !== 'playing') return;
    timerExpiredRef.current = false;
    setRemainingSec(timePerGrid);
  }, [gameState, currentIdx, timePerGrid]);

  // Per-grid timer — expires without validate => score 0
  useEffect(() => {
    if (gameState !== 'playing') return;
    const iv = setInterval(() => {
      setRemainingSec((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(iv);
  }, [gameState, currentIdx]);

  useEffect(() => {
    if (gameState !== 'playing' || remainingSec > 0 || timerExpiredRef.current) return;
    timerExpiredRef.current = true;
    advanceOrFinish(currentIdx, false);
  }, [gameState, remainingSec, currentIdx, advanceOrFinish]);

  const computeScore = useCallback(() => {
    if (gridResults.length === 0 && grids.length > 0) {
      // Fallback if results not yet recorded
      let sum = 0;
      grids.forEach((g, i) => {
        const userSet = selected[i] || new Set();
        sum += scoreGrid(g, userSet, false);
      });
      return { percent: 0, gridScores: grids.map(() => 0), sum };
    }
    const scores = gridResults.map((r) => r?.score ?? 0);
    const sum = scores.reduce((a, b) => a + b, 0);
    const percent = grids.length > 0 ? (sum / grids.length) * 100 : 0;
    return { percent, gridScores: scores, sum };
  }, [gridResults, grids, selected]);

  useEffect(() => {
    if (gameState !== 'results' || perfSavedRef.current) return;
    perfSavedRef.current = true;
    const { percent } = computeScore();
    savePerformanceResult(EXERCISE_ID, Math.round(percent), 100);
  }, [gameState, computeScore]);

  if (gameState === 'menu') {
    return (
      <MenuScreen
        settings={settingsState}
        onPlay={startPlaying}
        onSettings={() => setGameState('settings')}
        onBack={() => router.push('/')}
      />
    );
  }

  if (gameState === 'settings') {
    return (
      <SettingsScreen
        settings={settingsState}
        onChange={setSettings}
        onBack={() => setGameState('menu')}
      />
    );
  }

  if (gameState === 'results') {
    return (
      <ResultsScreen
        computeScore={computeScore}
        gridResults={gridResults}
        totalGrids={totalGrids}
        onReplay={startPlaying}
        onMenu={() => setGameState('menu')}
        onHome={() => router.push('/')}
        onReview={() => {
          setReviewIdx(0);
          setGameState('review');
        }}
      />
    );
  }

  if (gameState === 'review') {
    return (
      <ReviewScreen
        grids={grids}
        gridResults={gridResults}
        reviewIdx={reviewIdx}
        onPrev={() => setReviewIdx((i) => Math.max(0, i - 1))}
        onNext={() => setReviewIdx((i) => Math.min(grids.length - 1, i + 1))}
        onBack={() => setGameState('results')}
      />
    );
  }

  const grid = grids[currentIdx];
  if (!grid) return null;
  const userSelected = selected[currentIdx] || new Set<number>();

  return (
    <PlayingScreen
      grid={grid}
      gridIdx={currentIdx}
      totalGrids={totalGrids}
      remainingSec={remainingSec}
      totalDurationSec={timePerGrid}
      userSelected={userSelected}
      gridResults={gridResults}
      onToggle={(cellIdx) => toggleCell(currentIdx, cellIdx)}
      onValidate={validateAndNext}
    />
  );
}

// ============================================================================
// Menu + Settings
// ============================================================================

function MenuScreen({
  settings,
  onPlay,
  onSettings,
  onBack,
}: {
  settings: GameSettings;
  onPlay: () => void;
  onSettings: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">Grilles de calculs</CardTitle>
          <CardDescription className="text-lg">
            Cliquez sur les calculs faux, puis validez avant la fin du temps
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-2xl font-bold text-slate-700">{settings.numGrids}</p>
              <p className="text-sm text-slate-500">Grilles</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-2xl font-bold text-slate-700">{settings.timePerGridSec}s</p>
              <p className="text-sm text-slate-500">Par grille</p>
            </div>
          </div>
          <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-600 space-y-1">
            <p>Grille 3&times;3 de calculs simples (+, &minus;, &times;, &divide;).</p>
            <p>0 a 4 calculs faux par grille. Validez obligatoirement avant expiration.</p>
          </div>
          <div className="flex flex-col gap-3">
            <Button size="lg" className="w-full" onClick={onPlay}>
              <Play className="mr-2 h-5 w-5" /> Jouer
            </Button>
            <Button variant="outline" size="lg" className="w-full" onClick={onSettings}>
              <Settings className="mr-2 h-5 w-5" /> Parametres
            </Button>
            <Button variant="ghost" size="lg" className="w-full" onClick={onBack}>
              <ArrowLeft className="mr-2 h-5 w-5" /> Retour
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SettingsScreen({
  settings,
  onChange,
  onBack,
}: {
  settings: GameSettings;
  onChange: (s: GameSettings) => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Parametres</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label>Nombre de grilles : {settings.numGrids}</Label>
              <Slider
                value={[settings.numGrids]}
                onValueChange={([v]) => onChange({ ...settings, numGrids: v })}
                min={5}
                max={20}
                step={1}
                className="mt-2"
              />
            </div>
            <div>
              <Label>Temps par grille : {settings.timePerGridSec}s</Label>
              <Slider
                value={[settings.timePerGridSec]}
                onValueChange={([v]) => onChange({ ...settings, timePerGridSec: v })}
                min={20}
                max={90}
                step={5}
                className="mt-2"
              />
            </div>
          </div>
          <Button variant="outline" className="w-full" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Retour
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Playing screen
// ============================================================================

function PlayingScreen({
  grid,
  gridIdx,
  totalGrids,
  remainingSec,
  totalDurationSec,
  userSelected,
  gridResults,
  onToggle,
  onValidate,
}: {
  grid: CalcGrid;
  gridIdx: number;
  totalGrids: number;
  remainingSec: number;
  totalDurationSec: number;
  userSelected: Set<number>;
  gridResults: GridResult[];
  onToggle: (cellIdx: number) => void;
  onValidate: () => void;
}) {
  const progress = Math.max(0, Math.min(1, remainingSec / totalDurationSec));
  const timerColor = progress > 0.5 ? 'bg-green-500' : progress > 0.2 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="flex min-h-screen bg-[#e8e8e8]">
      {/* Vertical timer bar */}
      <div className="w-6 m-4 bg-gray-800 rounded-lg relative overflow-hidden flex-shrink-0 self-stretch">
        <div
          className={`absolute bottom-0 left-0 right-0 ${timerColor} transition-all duration-1000`}
          style={{ height: `${progress * 100}%` }}
        />
      </div>

      <div className="flex-1 flex flex-col p-4 min-h-screen">
        <p className="text-sm text-slate-600 mb-4">
          Cliquez sur les calculs <strong>faux</strong>
        </p>

        {/* 3×3 grid */}
        <div className="flex-1 flex items-center justify-center">
          <div className="grid grid-cols-3 gap-3 sm:gap-4 max-w-2xl w-full">
            {grid.cells.map((cell, i) => (
              <CalcCellButton
                key={i}
                cell={cell}
                selected={userSelected.has(i)}
                onToggle={() => onToggle(i)}
              />
            ))}
          </div>
        </div>

        {/* Pilotest-style footer */}
        <div className="border-t border-slate-400 pt-3 mt-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-sm font-medium text-slate-700 whitespace-nowrap">
                {gridIdx + 1} / {totalGrids}
              </span>
              <span className="text-sm text-slate-600 font-mono tabular-nums">
                {formatMMSS(remainingSec)}
              </span>
              <div className="flex gap-1 items-center">
                {Array.from({ length: totalGrids }, (_, i) => {
                  const done = gridResults[i] != null;
                  const current = i === gridIdx;
                  return (
                    <div
                      key={i}
                      className={`h-2 rounded-sm transition-colors ${
                        current
                          ? 'w-4 bg-amber-500'
                          : done
                            ? 'w-2 bg-slate-500'
                            : 'w-2 bg-slate-300'
                      }`}
                    />
                  );
                })}
              </div>
            </div>
            <button
              type="button"
              onClick={onValidate}
              className="bg-sky-500 hover:bg-sky-600 text-white text-base sm:text-lg font-semibold px-8 py-3 rounded-lg flex items-center gap-2 shadow-md shrink-0"
            >
              <Check className="h-5 w-5" />
              Valider
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CalcCellButton({
  cell,
  selected,
  onToggle,
  reviewMode,
  showCorrection,
}: {
  cell: CalcCell;
  selected: boolean;
  onToggle?: () => void;
  reviewMode?: boolean;
  showCorrection?: boolean;
}) {
  let borderClass = 'border-slate-300 bg-white';
  if (reviewMode) {
    if (cell.isFalse && selected) borderClass = 'border-green-500 bg-green-50';
    else if (cell.isFalse && !selected) borderClass = 'border-red-400 bg-red-50';
    else if (!cell.isFalse && selected) borderClass = 'border-red-500 bg-red-50';
    else borderClass = 'border-slate-300 bg-white';
  } else if (selected) {
    borderClass = 'border-amber-500 bg-amber-100 ring-2 ring-amber-400';
  }

  if (showCorrection && cell.isFalse) {
    borderClass = 'border-amber-500 bg-amber-50';
  }

  return (
    <button
      type="button"
      onClick={!reviewMode ? onToggle : undefined}
      className={`border-2 rounded-lg p-4 sm:p-6 text-center transition-all ${borderClass} ${
        reviewMode ? '' : 'cursor-pointer hover:border-amber-400 active:scale-[0.98]'
      }`}
    >
      <span className="text-lg sm:text-xl font-semibold text-slate-800 font-mono">
        {cell.expression} = {cell.displayedResult}
      </span>
    </button>
  );
}

// ============================================================================
// Results
// ============================================================================

const STANINE_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#facc15', '#a3e635',
  '#22c55e', '#14b8a6', '#0ea5e9', '#6366f1',
];

function Histogram({ stanine }: { stanine: number }) {
  return (
    <div className="flex items-end justify-center gap-1 h-24">
      {STANINE_COLORS.map((color, i) => {
        const cls = i + 1;
        const height = 20 + cls * 8;
        return (
          <div
            key={cls}
            className="w-8 rounded-t transition-opacity"
            style={{
              height: `${height}px`,
              backgroundColor: color,
              opacity: cls === stanine ? 1 : 0.25,
            }}
          />
        );
      })}
    </div>
  );
}

function ResultsScreen({
  computeScore,
  gridResults,
  totalGrids,
  onReplay,
  onMenu,
  onHome,
  onReview,
}: {
  computeScore: () => { percent: number; gridScores: number[]; sum: number };
  gridResults: GridResult[];
  totalGrids: number;
  onReplay: () => void;
  onMenu: () => void;
  onHome: () => void;
  onReview: () => void;
}) {
  const { percent, gridScores } = computeScore();
  const cls = scoreToClass(percent);
  const perfEntries = loadEntries(EXERCISE_ID);
  const validatedCount = gridResults.filter((r) => r?.validated).length;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-3xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">Grilles de calculs</CardTitle>
          <Badge
            variant={percent >= 75 ? 'default' : percent >= 50 ? 'secondary' : 'destructive'}
            className="text-lg px-4 py-1 mx-auto"
          >
            Classe {cls}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <p className="text-sm font-medium text-slate-500 uppercase">Score</p>
            <p className="text-5xl font-bold text-slate-700 mt-1">{percent.toFixed(1)} %</p>
            <p className="text-slate-500 mt-1">
              {validatedCount} / {totalGrids} grilles validees
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-slate-500 uppercase mb-2">Performance</p>
            <Histogram stanine={cls} />
          </div>

          {gridScores.length > 0 && (
            <div className="space-y-2">
              <p className="font-semibold text-slate-700 text-sm">Detail par grille :</p>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {gridScores.map((s, i) => {
                  const r = gridResults[i];
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between bg-slate-50 rounded px-3 py-1.5 text-sm"
                    >
                      <span className="text-slate-600">Grille {i + 1}</span>
                      <span>
                        {!r?.validated ? (
                          <span className="text-red-600">Non validee (0 %)</span>
                        ) : (
                          <span
                            className={
                              s >= 0.99 ? 'text-green-600 font-semibold' : 'text-slate-700'
                            }
                          >
                            {(s * 100).toFixed(0)} %
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {perfEntries.length >= 2 && (
            <div className="border-t pt-4">
              <p className="text-sm font-medium text-slate-500 mb-2 text-center">Progression</p>
              <div className="flex justify-center">
                <MiniPerformanceChart entries={perfEntries} exerciseId={EXERCISE_ID} />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <Button size="lg" className="w-full" onClick={onReview}>
              <Eye className="mr-2 h-5 w-5" /> Revoir les reponses
            </Button>
            <Button variant="outline" size="lg" className="w-full" onClick={onReplay}>
              <RotateCcw className="mr-2 h-5 w-5" /> Refaire
            </Button>
            <Button variant="outline" size="lg" className="w-full" onClick={onMenu}>
              <ArrowLeft className="mr-2 h-5 w-5" /> Menu
            </Button>
            <Button variant="ghost" size="lg" className="w-full" onClick={onHome}>
              <Home className="mr-2 h-5 w-5" /> Accueil
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Review
// ============================================================================

function ReviewScreen({
  grids,
  gridResults,
  reviewIdx,
  onPrev,
  onNext,
  onBack,
}: {
  grids: CalcGrid[];
  gridResults: GridResult[];
  reviewIdx: number;
  onPrev: () => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const grid = grids[reviewIdx];
  const result = gridResults[reviewIdx];
  if (!grid) return null;

  const selectedSet = new Set(result?.selected ?? []);

  return (
    <div className="flex min-h-screen bg-[#e8e8e8] flex-col p-4">
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Resultats
        </Button>
        <Badge variant="outline">
          Grille {reviewIdx + 1} / {grids.length}
        </Badge>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <div className="grid grid-cols-3 gap-3 sm:gap-4 max-w-2xl w-full">
          {grid.cells.map((cell, i) => (
            <CalcCellButton
              key={i}
              cell={cell}
              selected={selectedSet.has(i)}
              reviewMode
            />
          ))}
        </div>
      </div>

      <div className="text-center text-sm text-slate-600 mb-4">
        {result?.validated ? (
          <span>
            Score : <strong>{((result.score * 100)).toFixed(0)} %</strong>
            {' — '}
            {result.falseIndices.length} calcul(s) faux
          </span>
        ) : (
          <span className="text-red-600">Grille non validee — score 0</span>
        )}
      </div>

      <div className="flex justify-center gap-4">
        <Button variant="outline" onClick={onPrev} disabled={reviewIdx === 0}>
          Precedent
        </Button>
        <Button
          variant="outline"
          onClick={onNext}
          disabled={reviewIdx >= grids.length - 1}
        >
          Suivant
        </Button>
      </div>
    </div>
  );
}

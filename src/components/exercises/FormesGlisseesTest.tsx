'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { savePerformanceResult, loadEntries } from '@/lib/core/PerformanceTracker';
import { MiniPerformanceChart } from '@/components/PerformanceChart';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Play, RotateCcw, Home, Settings, Trash2 } from 'lucide-react';

// ============================================================================
// Types & constants
// ============================================================================

type GameState = 'menu' | 'settings' | 'playing' | 'results';
type CellColor = 'navy' | 'grey';
type AnswerOutcome = 'correct' | 'incorrect' | 'skipped';

interface ShapeCell {
  dx: number;
  dy: number;
  color: CellColor;
}

interface ShapePiece {
  id: string;
  cells: ShapeCell[];
  width: number;
  height: number;
}

interface Placement {
  pieceId: string;
  offsetX: number;
  offsetY: number;
}

interface Puzzle {
  gridSize: number;
  target: CellColor[][];
  pieces: ShapePiece[];
  solution: Placement[];
}

interface GameSettings {
  numQuestions: number;
  timePerQuestionSec: number;
  numShapes: number;
  examMode: boolean;
  /** Palette aléatoire (deux teintes) fixée pour toute la durée du test. */
  changingColors: boolean;
}

interface QuestionResult {
  outcome: AnswerOutcome;
  timeUsedMs: number;
}

type ColorPalette = { navy: string; grey: string };

const EXERCISE_ID = 'formes-glissees';
const SETTINGS_KEY = 'aviatest-formes-glissees-settings';

const DEFAULT_SETTINGS: GameSettings = {
  numQuestions: 10,
  timePerQuestionSec: 60,
  numShapes: 3,
  examMode: false,
  changingColors: false,
};

const BG = '#d4d4d4';
const NAVY = '#1a2b4a';
const GREY = '#a8a8a8';
const DEFAULT_PALETTE: ColorPalette = { navy: NAVY, grey: GREY };
const CELL_BORDER = '#888';
const GHOST_ALPHA = 0.45;
const CELL_PX = 36;

/** Teintes bien contrastées pour le mode couleurs changeantes. */
const COLOR_POOL = [
  '#1a2b4a',
  '#a8a8a8',
  '#0f766e',
  '#f59e0b',
  '#7c2d12',
  '#2563eb',
  '#831843',
  '#16a34a',
  '#4c1d95',
  '#c2410c',
  '#0e7490',
  '#ca8a04',
  '#be123c',
  '#365314',
  '#1d4ed8',
  '#9a3412',
];

// ============================================================================
// Settings persistence
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
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

// ============================================================================
// Superposition (Pilotest XOR-like rules)
// ============================================================================

function colorToBit(c: CellColor): number {
  return c === 'navy' ? 1 : 0;
}

function bitToColor(b: number): CellColor {
  return b === 1 ? 'navy' : 'grey';
}

function combineColors(a: CellColor, b: CellColor): CellColor {
  const xor = colorToBit(a) ^ colorToBit(b);
  return bitToColor(1 - xor);
}

// ============================================================================
// Puzzle generation
// ============================================================================

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRandomPalette(): ColorPalette {
  const [a, b] = shuffle(COLOR_POOL);
  return { navy: a, grey: b };
}

function cellFill(color: CellColor, palette: ColorPalette = DEFAULT_PALETTE): string {
  return color === 'navy' ? palette.navy : palette.grey;
}

function generatePolyomino(minCells: number, maxCells: number): { dx: number; dy: number }[] {
  const count = randInt(minCells, maxCells);
  const cells = [{ dx: 0, dy: 0 }];
  const occupied = new Set(['0,0']);
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  while (cells.length < count) {
    const base = cells[randInt(0, cells.length - 1)];
    const [ddx, ddy] = dirs[randInt(0, dirs.length - 1)];
    const next = { dx: base.dx + ddx, dy: base.dy + ddy };
    const key = `${next.dx},${next.dy}`;
    if (!occupied.has(key)) {
      occupied.add(key);
      cells.push(next);
    }
  }

  const minDx = Math.min(...cells.map((c) => c.dx));
  const minDy = Math.min(...cells.map((c) => c.dy));
  return cells.map((c) => ({ dx: c.dx - minDx, dy: c.dy - minDy }));
}

function shapeFromCoords(
  id: string,
  coords: { dx: number; dy: number }[],
  colorFn?: (dx: number, dy: number) => CellColor,
): ShapePiece {
  const cells: ShapeCell[] = coords.map(({ dx, dy }) => ({
    dx,
    dy,
    color: colorFn ? colorFn(dx, dy) : Math.random() < 0.5 ? 'navy' : 'grey',
  }));
  const width = Math.max(...cells.map((c) => c.dx)) + 1;
  const height = Math.max(...cells.map((c) => c.dy)) + 1;
  return { id, cells, width, height };
}

function computeGrid(
  size: number,
  placements: { piece: ShapePiece; offsetX: number; offsetY: number }[],
): CellColor[][] {
  const grid: CellColor[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => 'grey' as CellColor),
  );

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const contributors: CellColor[] = [];
      for (const { piece, offsetX, offsetY } of placements) {
        for (const cell of piece.cells) {
          if (cell.dx + offsetX === x && cell.dy + offsetY === y) {
            contributors.push(cell.color);
          }
        }
      }
      if (contributors.length === 0) {
        grid[y][x] = 'grey';
      } else if (contributors.length === 1) {
        grid[y][x] = contributors[0];
      } else {
        grid[y][x] = contributors.reduce((acc, c) => combineColors(acc, c));
      }
    }
  }
  return grid;
}

function fitsInGrid(piece: ShapePiece, offsetX: number, offsetY: number, size: number): boolean {
  for (const cell of piece.cells) {
    const x = cell.dx + offsetX;
    const y = cell.dy + offsetY;
    if (x < 0 || y < 0 || x >= size || y >= size) return false;
  }
  return true;
}

function generatePuzzle(numShapes: number): Puzzle {
  const gridSize = randInt(5, 7);
  const numSolutionPieces = numShapes;
  const solutionPlacements: { piece: ShapePiece; offsetX: number; offsetY: number }[] = [];

  for (let i = 0; i < numSolutionPieces; i++) {
    const coords = generatePolyomino(2, 5);
    const piece = shapeFromCoords(`sol-${i}`, coords);
    let placed = false;
    for (let attempt = 0; attempt < 40 && !placed; attempt++) {
      const ox = randInt(0, gridSize - piece.width);
      const oy = randInt(0, gridSize - piece.height);
      if (fitsInGrid(piece, ox, oy, gridSize)) {
        solutionPlacements.push({ piece, offsetX: ox, offsetY: oy });
        placed = true;
      }
    }
    if (!placed) {
      solutionPlacements.push({ piece, offsetX: 0, offsetY: 0 });
    }
  }

  const target = computeGrid(
    gridSize,
    solutionPlacements.map((p) => ({ piece: p.piece, offsetX: p.offsetX, offsetY: p.offsetY })),
  );

  const hasNavy = target.some((row) => row.some((c) => c === 'navy'));
  if (!hasNavy) {
    return generatePuzzle(numShapes);
  }

  const pieces: ShapePiece[] = solutionPlacements.map((p) => p.piece);

  if (Math.random() < 0.55) {
    const decoyCoords = generatePolyomino(2, 4);
    const decoy = shapeFromCoords(`decoy-${Date.now()}`, decoyCoords);
    const isDuplicate = pieces.some(
      (p) =>
        p.cells.length === decoy.cells.length &&
        p.cells.every(
          (c, idx) =>
            c.dx === decoy.cells[idx]?.dx &&
            c.dy === decoy.cells[idx]?.dy &&
            c.color === decoy.cells[idx]?.color,
        ),
    );
    if (!isDuplicate) pieces.push(decoy);
  }

  return {
    gridSize,
    target,
    pieces: shuffle(pieces),
    solution: solutionPlacements.map((p) => ({
      pieceId: p.piece.id,
      offsetX: p.offsetX,
      offsetY: p.offsetY,
    })),
  };
}

function generateQuestions(count: number, numShapes: number): Puzzle[] {
  return Array.from({ length: count }, () => generatePuzzle(numShapes));
}

function gridsMatch(a: CellColor[][], b: CellColor[][]): boolean {
  if (a.length !== b.length) return false;
  for (let y = 0; y < a.length; y++) {
    if (a[y].length !== b[y].length) return false;
    for (let x = 0; x < a[y].length; x++) {
      if (a[y][x] !== b[y][x]) return false;
    }
  }
  return true;
}

function computePlayerGrid(size: number, pieces: ShapePiece[], placements: Placement[]): CellColor[][] {
  const resolved = placements
    .map((pl) => {
      const piece = pieces.find((p) => p.id === pl.pieceId);
      if (!piece) return null;
      return { piece, offsetX: pl.offsetX, offsetY: pl.offsetY };
    })
    .filter(Boolean) as { piece: ShapePiece; offsetX: number; offsetY: number }[];
  return computeGrid(size, resolved);
}

// ============================================================================
// Sub-components
// ============================================================================

function PatternGrid({
  grid,
  cellSize = CELL_PX,
  label,
  ghost,
  interactive,
  onCellClick,
  onCellHover,
  onCellLeave,
  palette = DEFAULT_PALETTE,
}: {
  grid: CellColor[][];
  cellSize?: number;
  label?: string;
  ghost?: { piece: ShapePiece; offsetX: number; offsetY: number } | null;
  interactive?: boolean;
  onCellClick?: (x: number, y: number) => void;
  onCellHover?: (x: number, y: number) => void;
  onCellLeave?: () => void;
  palette?: ColorPalette;
}) {
  const size = grid.length;
  const w = size * cellSize;
  const h = size * cellSize;

  const ghostSet = new Set<string>();
  if (ghost) {
    for (const c of ghost.piece.cells) {
      ghostSet.add(`${c.dx + ghost.offsetX},${c.dy + ghost.offsetY}`);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      {label && (
        <p className="text-center text-base font-semibold" style={{ color: palette.navy }}>
          {label}
        </p>
      )}
      <div
        className="inline-block rounded border-2 bg-white shadow-sm"
        style={{ borderColor: palette.navy, padding: 4 }}
      >
        <svg width={w + 2} height={h + 2} style={{ display: 'block' }}>
          {grid.map((row, y) =>
            row.map((color, x) => {
              const key = `${x},${y}`;
              const isGhost = ghostSet.has(key);
              const ghostCell = ghost?.piece.cells.find(
                (c) => c.dx + (ghost?.offsetX ?? 0) === x && c.dy + (ghost?.offsetY ?? 0) === y,
              );
              const fill =
                isGhost && ghostCell
                  ? cellFill(ghostCell.color, palette)
                  : cellFill(color, palette);
              const opacity = isGhost ? GHOST_ALPHA : 1;

              return (
                <rect
                  key={key}
                  x={x * cellSize + 1}
                  y={y * cellSize + 1}
                  width={cellSize - 1}
                  height={cellSize - 1}
                  fill={fill}
                  fillOpacity={opacity}
                  stroke={CELL_BORDER}
                  strokeWidth={0.5}
                  style={interactive ? { cursor: 'pointer' } : undefined}
                  onClick={interactive && onCellClick ? () => onCellClick(x, y) : undefined}
                  onMouseEnter={interactive && onCellHover ? () => onCellHover(x, y) : undefined}
                  onMouseLeave={interactive && onCellLeave ? onCellLeave : undefined}
                />
              );
            }),
          )}
          {ghost &&
            ghost.piece.cells.map((c, i) => {
              const gx = c.dx + ghost.offsetX;
              const gy = c.dy + ghost.offsetY;
              if (gx < 0 || gy < 0 || gx >= size || gy >= size) return null;
              return (
                <rect
                  key={`ghost-outline-${i}`}
                  x={gx * cellSize + 1}
                  y={gy * cellSize + 1}
                  width={cellSize - 1}
                  height={cellSize - 1}
                  fill="none"
                  stroke={palette.navy}
                  strokeWidth={2}
                  strokeDasharray="4 2"
                  pointerEvents="none"
                />
              );
            })}
        </svg>
      </div>
    </div>
  );
}

function PiecePreview({
  piece,
  selected,
  placed,
  onSelect,
  cellSize = 22,
  palette = DEFAULT_PALETTE,
}: {
  piece: ShapePiece;
  selected: boolean;
  placed: boolean;
  onSelect: () => void;
  cellSize?: number;
  palette?: ColorPalette;
}) {
  const w = piece.width * cellSize;
  const h = piece.height * cellSize;

  return (
    <button
      type="button"
      onClick={onSelect}
      className="rounded-lg border-2 bg-white p-2 transition-transform hover:scale-[1.03] active:scale-[0.98]"
      style={{
        borderColor: selected ? palette.navy : placed ? '#94a3b8' : '#ccc',
        boxShadow: selected ? `0 0 0 2px ${palette.navy}33` : undefined,
        opacity: placed && !selected ? 0.65 : 1,
      }}
      title={placed ? 'Piece placee — cliquez pour deplacer' : 'Selectionner cette piece'}
    >
      <svg width={w} height={h}>
        {piece.cells.map((c, i) => (
          <rect
            key={i}
            x={c.dx * cellSize}
            y={c.dy * cellSize}
            width={cellSize - 1}
            height={cellSize - 1}
            fill={cellFill(c.color, palette)}
            stroke={CELL_BORDER}
            strokeWidth={0.5}
          />
        ))}
      </svg>
    </button>
  );
}

function ColorSwatch({
  color,
  size = 'md',
  palette = DEFAULT_PALETTE,
}: {
  color: CellColor;
  size?: 'md' | 'lg';
  palette?: ColorPalette;
}) {
  const dim = size === 'lg' ? 'h-8 w-8' : 'h-7 w-7';
  return (
    <span
      className={`inline-block ${dim} rounded-md border shadow-sm`}
      style={{ backgroundColor: cellFill(color, palette), borderColor: CELL_BORDER }}
    />
  );
}

function SuperpositionLegend({ palette = DEFAULT_PALETTE }: { palette?: ColorPalette }) {
  const rules: [CellColor, CellColor, CellColor][] = [
    ['navy', 'navy', 'navy'],
    ['navy', 'grey', 'grey'],
    ['grey', 'grey', 'navy'],
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="mb-3 text-center text-base font-semibold text-slate-800">Superposition</p>
      <div className="flex flex-col gap-2.5">
        {rules.map(([a, b, r], i) => (
          <div
            key={i}
            className="flex items-center justify-center gap-3 rounded-full border border-slate-100 bg-slate-50 px-5 py-2.5"
          >
            <ColorSwatch color={a} size="lg" palette={palette} />
            <span className="text-base font-medium text-slate-500">+</span>
            <ColorSwatch color={b} size="lg" palette={palette} />
            <span className="text-base font-medium text-slate-500">=</span>
            <ColorSwatch color={r} size="lg" palette={palette} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Main component
// ============================================================================

export default function FormesGlisseesTest() {
  const router = useRouter();
  const perfSavedRef = useRef(false);
  const questionStartRef = useRef(0);
  const advancingRef = useRef(false);
  const lockedRef = useRef(false);
  const questionsRef = useRef<Puzzle[]>([]);
  const currentIdxRef = useRef(0);
  const settingsRef = useRef(loadSettings());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [gameState, setGameState] = useState<GameState>('menu');
  const [settings, setSettingsState] = useState<GameSettings>(loadSettings);
  const [questions, setQuestions] = useState<Puzzle[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  const [ghostPos, setGhostPos] = useState<{ x: number; y: number } | null>(null);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_SETTINGS.timePerQuestionSec);
  const [totalTime, setTotalTime] = useState(DEFAULT_SETTINGS.timePerQuestionSec);
  const [locked, setLocked] = useState(false);
  const [successFlash, setSuccessFlash] = useState(false);
  const [wrongFlash, setWrongFlash] = useState(false);
  const [palette, setPalette] = useState<ColorPalette>(DEFAULT_PALETTE);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const setSettings = useCallback((s: GameSettings | ((prev: GameSettings) => GameSettings)) => {
    setSettingsState((prev) => {
      const next = typeof s === 'function' ? s(prev) : s;
      saveSettingsLocal(next);
      return next;
    });
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(
    (ms: number) => {
      clearTimer();
      const sec = ms / 1000;
      setTotalTime(sec);
      setTimeLeft(sec);
      questionStartRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 0.1) {
            clearTimer();
            return 0;
          }
          return Math.max(0, prev - 0.1);
        });
      }, 100);
    },
    [clearTimer],
  );

  useEffect(() => () => clearTimer(), [clearTimer]);

  const resetQuestionState = useCallback(() => {
    setPlacements([]);
    setSelectedPieceId(null);
    setGhostPos(null);
    setSuccessFlash(false);
    setWrongFlash(false);
    advancingRef.current = false;
    lockedRef.current = false;
    setLocked(false);
  }, []);

  const finishOrNext = useCallback(
    (outcome: AnswerOutcome) => {
      if (advancingRef.current) return;
      advancingRef.current = true;
      lockedRef.current = true;
      setLocked(true);
      clearTimer();

      const timeUsed = Date.now() - questionStartRef.current;
      const idx = currentIdxRef.current;

      setResults((prev) => [...prev, { outcome, timeUsedMs: timeUsed }]);

      const nextIdx = idx + 1;
      if (nextIdx >= questionsRef.current.length) {
        setGameState('results');
        return;
      }

      const examMode = settingsRef.current.examMode;
      if (!examMode && outcome === 'correct') {
        setSuccessFlash(true);
      } else if (!examMode && outcome !== 'correct') {
        setWrongFlash(true);
      }

      const delay = examMode
        ? 80
        : outcome === 'correct'
          ? 800
          : 650;

      setTimeout(() => {
        currentIdxRef.current = nextIdx;
        setCurrentIdx(nextIdx);
        resetQuestionState();
        startTimer(settingsRef.current.timePerQuestionSec * 1000);
      }, delay);
    },
    [clearTimer, resetQuestionState, startTimer],
  );

  const checkMatch = useCallback(
    (newPlacements: Placement[]) => {
      const puzzle = questionsRef.current[currentIdxRef.current];
      if (!puzzle) return;
      const playerGrid = computePlayerGrid(puzzle.gridSize, puzzle.pieces, newPlacements);
      if (gridsMatch(playerGrid, puzzle.target)) {
        if (!settingsRef.current.examMode) {
          setSuccessFlash(true);
        }
        finishOrNext('correct');
      }
    },
    [finishOrNext],
  );

  const handlePlacePiece = useCallback(
    (gridX: number, gridY: number) => {
      if (lockedRef.current || !selectedPieceId) return;
      const puzzle = questionsRef.current[currentIdxRef.current];
      if (!puzzle) return;
      const piece = puzzle.pieces.find((p) => p.id === selectedPieceId);
      if (!piece) return;

      const offsetX = gridX;
      const offsetY = gridY;
      if (!fitsInGrid(piece, offsetX, offsetY, puzzle.gridSize)) return;

      setPlacements((prev) => {
        const filtered = prev.filter((p) => p.pieceId !== selectedPieceId);
        const next = [...filtered, { pieceId: selectedPieceId, offsetX, offsetY }];
        setTimeout(() => checkMatch(next), 0);
        return next;
      });
      setGhostPos(null);
    },
    [selectedPieceId, checkMatch],
  );

  const handleGhostHover = useCallback(
    (gridX: number, gridY: number) => {
      if (!selectedPieceId || lockedRef.current) return;
      setGhostPos({ x: gridX, y: gridY });
    },
    [selectedPieceId],
  );

  const handleRemovePlacement = useCallback(() => {
    if (!selectedPieceId || lockedRef.current) return;
    setPlacements((prev) => prev.filter((p) => p.pieceId !== selectedPieceId));
  }, [selectedPieceId]);

  const handleClearGrid = useCallback(() => {
    if (lockedRef.current) return;
    setPlacements([]);
    setGhostPos(null);
  }, []);

  const handleSkip = useCallback(() => {
    if (lockedRef.current) return;
    finishOrNext('skipped');
  }, [finishOrNext]);

  const startGame = useCallback(() => {
    perfSavedRef.current = false;
    setPalette(
      settingsRef.current.changingColors ? pickRandomPalette() : DEFAULT_PALETTE,
    );
    const qs = generateQuestions(
      settingsRef.current.numQuestions,
      settingsRef.current.numShapes,
    );
    setQuestions(qs);
    questionsRef.current = qs;
    setCurrentIdx(0);
    currentIdxRef.current = 0;
    setResults([]);
    resetQuestionState();
    setGameState('playing');
    startTimer(settingsRef.current.timePerQuestionSec * 1000);
  }, [resetQuestionState, startTimer]);

  useEffect(() => {
    if (gameState !== 'playing' || locked) return;
    if (totalTime > 0 && timeLeft <= 0) {
      finishOrNext('skipped');
    }
  }, [timeLeft, totalTime, gameState, locked, finishOrNext]);

  const currentPuzzle = questions[currentIdx];
  const playerGrid =
    currentPuzzle
      ? computePlayerGrid(currentPuzzle.gridSize, currentPuzzle.pieces, placements)
      : [];

  const selectedPiece = selectedPieceId
    ? currentPuzzle?.pieces.find((p) => p.id === selectedPieceId) ?? null
    : null;

  const ghost =
    selectedPiece && ghostPos
      ? { piece: selectedPiece, offsetX: ghostPos.x, offsetY: ghostPos.y }
      : null;

  const placedIds = new Set(placements.map((p) => p.pieceId));
  const timerPercent = totalTime > 0 ? (timeLeft / totalTime) * 100 : 100;

  // =========================================================================
  // MENU
  // =========================================================================
  if (gameState === 'menu') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">Formes glissees II</CardTitle>
            <CardDescription className="mt-2 text-base">
              Superposez les formes pour reproduire le motif cible
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <SuperpositionLegend />
            <div className="space-y-2 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
              <p>
                <strong>{settings.numQuestions} questions</strong>,{' '}
                <strong>{settings.timePerQuestionSec}s</strong> chacune.
              </p>
              <p>Selectionnez une forme en bas, puis cliquez sur la grille pour la placer.</p>
              <p>L&apos;ordre de placement n&apos;a pas d&apos;importance. Toutes les formes ne sont pas forcement necessaires.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xl font-bold text-slate-700">{settings.numQuestions}</p>
                <p className="text-xs text-slate-500">Questions</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xl font-bold text-slate-700">{settings.timePerQuestionSec}s</p>
                <p className="text-xs text-slate-500">Par question</p>
              </div>
            </div>
            {settings.examMode && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-center text-sm text-amber-700">
                Mode examen — pas de correction entre les questions
              </div>
            )}
            {settings.changingColors && (
              <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-center text-sm text-indigo-700">
                Couleurs changeantes — palette aleatoire pour tout le test
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
            <CardDescription>Ajustez la duree et le nombre de questions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label>Nombre de questions : {settings.numQuestions}</Label>
              <Slider
                value={[settings.numQuestions]}
                onValueChange={([v]) => setSettings((s) => ({ ...s, numQuestions: v }))}
                min={5}
                max={20}
                step={1}
                className="mt-2"
              />
            </div>
            <div>
              <Label>Temps par question : {settings.timePerQuestionSec}s</Label>
              <Slider
                value={[settings.timePerQuestionSec]}
                onValueChange={([v]) => setSettings((s) => ({ ...s, timePerQuestionSec: v }))}
                min={20}
                max={90}
                step={5}
                className="mt-2"
              />
            </div>
            <div>
              <Label>Nombre de formes : {settings.numShapes}</Label>
              <Slider
                value={[settings.numShapes]}
                onValueChange={([v]) => setSettings((s) => ({ ...s, numShapes: v }))}
                min={2}
                max={4}
                step={1}
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
            <div className="flex items-center justify-between">
              <div>
                <Label>Couleurs changeantes</Label>
                <p className="mt-0.5 text-xs text-slate-500">
                  Deux teintes aleatoires, fixes pour toute la duree du test
                </p>
              </div>
              <Switch
                checked={settings.changingColors}
                onCheckedChange={(v) => setSettings((s) => ({ ...s, changingColors: v }))}
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

  // =========================================================================
  // RESULTS
  // =========================================================================
  if (gameState === 'results') {
    const correct = results.filter((r) => r.outcome === 'correct').length;
    const incorrect = results.filter((r) => r.outcome === 'incorrect').length;
    const skipped = results.filter((r) => r.outcome === 'skipped').length;
    const total = questions.length || settings.numQuestions;
    const percent = total > 0 ? Math.round((correct / total) * 1000) / 10 : 0;
    const avgTime =
      results.length > 0
        ? Math.round((results.reduce((s, r) => s + r.timeUsedMs, 0) / results.length / 1000) * 10) / 10
        : 0;

    if (!perfSavedRef.current) {
      perfSavedRef.current = true;
      const avgMs =
        results.length > 0 ? results.reduce((s, r) => s + r.timeUsedMs, 0) / results.length : 0;
      savePerformanceResult(EXERCISE_ID, correct, total, avgMs);
    }

    const perfEntries = loadEntries(EXERCISE_ID);
    const grade =
      percent >= 80 ? 'Excellent' : percent >= 60 ? 'Bien' : percent >= 40 ? 'Passable' : 'A revoir';

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">Resultats</CardTitle>
            <Badge
              variant={percent >= 80 ? 'default' : percent >= 60 ? 'secondary' : 'destructive'}
              className="mt-2 px-4 py-1 text-lg"
            >
              {grade}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-5xl font-bold text-slate-700">{percent}%</p>
              <p className="mt-1 text-slate-500">
                {correct} / {total} reussies
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
            {perfEntries.length >= 2 && (
              <div className="border-t pt-4">
                <p className="mb-2 text-center text-sm font-medium text-slate-500">Progression</p>
                <div className="flex justify-center">
                  <MiniPerformanceChart entries={perfEntries} exerciseId={EXERCISE_ID} />
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
  if (!currentPuzzle) return null;

  const emptyGrid = Array.from({ length: currentPuzzle.gridSize }, () =>
    Array.from({ length: currentPuzzle.gridSize }, () => 'grey' as CellColor),
  );

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ backgroundColor: BG, color: palette.navy }}
    >
      <div className="relative mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-4">
        {/* Timer bar */}
        <div className="mb-3 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#bbb]">
            <div
              className="h-full transition-all duration-100"
              style={{
                width: `${timerPercent}%`,
                backgroundColor: timerPercent > 20 ? '#0068C6' : '#dc2626',
              }}
            />
          </div>
          <span className="min-w-[3rem] text-right text-sm font-semibold tabular-nums">
            {Math.ceil(timeLeft)}s
          </span>
        </div>

        <SuperpositionLegend palette={palette} />

        {/* Grids row */}
        <div
          className={`mt-4 flex flex-wrap items-start justify-center gap-6 transition-opacity ${
            successFlash ? 'opacity-60' : ''
          }`}
        >
          <div className="flex flex-col items-center gap-2">
            <PatternGrid
              grid={playerGrid.length ? playerGrid : emptyGrid}
              label="Votre grille"
              ghost={ghost}
              interactive={!locked && !!selectedPieceId}
              onCellClick={handlePlacePiece}
              onCellHover={handleGhostHover}
              onCellLeave={() => setGhostPos(null)}
              palette={palette}
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={locked || !selectedPieceId || !placedIds.has(selectedPieceId)}
                onClick={handleRemovePlacement}
              >
                <Trash2 className="mr-1 h-3.5 w-3.5" /> Retirer
              </Button>
              <Button variant="outline" size="sm" disabled={locked || placements.length === 0} onClick={handleClearGrid}>
                Effacer
              </Button>
            </div>
          </div>
          <PatternGrid
            grid={currentPuzzle.target}
            label="Figures a reproduire"
            palette={palette}
          />
        </div>

        {successFlash && (
          <p className="mt-3 text-center text-xl font-bold text-green-700">Correct !</p>
        )}
        {wrongFlash && (
          <p className="mt-3 text-center text-xl font-bold text-red-700">Passe — solution non affichee</p>
        )}

        {/* Pieces tray */}
        <div className="mt-6 rounded-lg border bg-white/70 p-4" style={{ borderColor: '#bbb' }}>
          <p className="mb-3 text-center text-sm font-semibold">Formes disponibles</p>
          <div className="flex flex-wrap justify-center gap-3">
            {currentPuzzle.pieces.map((piece) => (
              <PiecePreview
                key={piece.id}
                piece={piece}
                selected={selectedPieceId === piece.id}
                placed={placedIds.has(piece.id)}
                palette={palette}
                onSelect={() => {
                  if (locked) return;
                  setSelectedPieceId((prev) => (prev === piece.id ? null : piece.id));
                  setGhostPos(null);
                }}
              />
            ))}
          </div>
          {selectedPieceId && (
            <p className="mt-2 text-center text-sm text-slate-600">
              Cliquez sur votre grille pour placer le coin haut-gauche de la forme
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="mt-auto flex flex-col items-center gap-3 pt-4">
          <button
            type="button"
            disabled={locked}
            onClick={handleSkip}
            className="text-sm italic transition-opacity hover:opacity-80 disabled:opacity-50"
          >
            Passer cette question...
          </button>
          <p className="text-base font-medium">
            {currentIdx + 1} / {questions.length}
          </p>
        </div>
      </div>
    </div>
  );
}

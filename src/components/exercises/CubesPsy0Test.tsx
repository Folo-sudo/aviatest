'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, ChevronRight, Home, Play, RotateCcw, Settings, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { savePerformanceResult, loadEntries } from '@/lib/core/PerformanceTracker';
import { MiniPerformanceChart } from '@/components/PerformanceChart';
import {
  type FaceRotation,
  type LayoutId,
  type NetFace,
  NET_LAYOUT_IDS,
  cubeToNetBySlot,
  cubesEqualModuloRotation,
  foldNet,
  getLayout,
} from '@/lib/cubes/netFold';

// ============================================================================
// Types
// ============================================================================

type GameState = 'menu' | 'settings' | 'playing' | 'results';
type PatternId = 'cross' | 'square' | 'octagon' | 'stripes-h' | 'stripes-v' | 'circles';
type AnswerOutcome = 'correct' | 'incorrect' | 'skipped';

interface GameSettings {
  totalQuestions: number;
  timePerQuestionSec: number;
  examMode: boolean;
}

interface FacePiece {
  id: string;
  pattern: PatternId;
  rotation: FaceRotation;
}

interface QuestionData {
  layoutRef: LayoutId;
  layoutPlay: LayoutId;
  referenceFaces: FacePiece[];
  playFixedFaces: (FacePiece | null)[];
  missingSlots: number[];
  trayPieces: FacePiece[];
  solutionFaces: FacePiece[];
}

interface QuestionResult {
  question: QuestionData;
  outcome: AnswerOutcome;
  timeUsedMs: number;
}

// ============================================================================
// Constants
// ============================================================================

const SETTINGS_KEY = 'aviatest-cubes-psy0-settings';
const EXERCISE_ID = 'cubes-psy0';

const DEFAULT_SETTINGS: GameSettings = {
  totalQuestions: 10,
  timePerQuestionSec: 60,
  examMode: false,
};

const SLATE_BG = 'bg-gradient-to-br from-slate-50 to-slate-100';
const FACE_BG = '#ffffff';
const FACE_BORDER = '#333333';
const FACE_SIZE = 84;

const PATTERN_IDS: PatternId[] = ['cross', 'square', 'octagon', 'stripes-h', 'stripes-v', 'circles'];

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

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomRotation(): FaceRotation {
  const options: FaceRotation[] = [0, 90, 180, 270];
  return pick(options);
}

function nextRotation(r: FaceRotation): FaceRotation {
  return ((r + 90) % 360) as FaceRotation;
}

function toNetFace(piece: FacePiece): NetFace {
  return { pattern: piece.pattern, rotation: piece.rotation };
}

function pieceFromNet(id: string, face: NetFace): FacePiece {
  return { id, pattern: face.pattern as PatternId, rotation: face.rotation };
}

function generateLogicalCube(): Record<'F' | 'B' | 'L' | 'R' | 'U' | 'D', NetFace> {
  const patterns = shuffle([...PATTERN_IDS]);
  return {
    F: { pattern: patterns[0], rotation: randomRotation() },
    B: { pattern: patterns[1], rotation: randomRotation() },
    L: { pattern: patterns[2], rotation: randomRotation() },
    R: { pattern: patterns[3], rotation: randomRotation() },
    U: { pattern: patterns[4], rotation: randomRotation() },
    D: { pattern: patterns[5], rotation: randomRotation() },
  };
}

function pickTwoLayouts(): [LayoutId, LayoutId] {
  const shuffled = shuffle([...NET_LAYOUT_IDS]);
  return [shuffled[0], shuffled[1]];
}

function generateQuestion(): QuestionData {
  const [layoutRef, layoutPlay] = pickTwoLayouts();
  const logicalCube = generateLogicalCube();

  const refNet = cubeToNetBySlot(logicalCube, layoutRef);
  const playNet = cubeToNetBySlot(logicalCube, layoutPlay);

  const referenceFaces: FacePiece[] = refNet.map((face, i) =>
    pieceFromNet(`ref-${i}`, face),
  );

  const solutionFaces: FacePiece[] = playNet.map((face, i) =>
    pieceFromNet(`sol-${i}`, face),
  );

  const numMissing = randInt(2, 3);
  const missingSlots = shuffle([0, 1, 2, 3, 4, 5]).slice(0, numMissing);

  const playFixedFaces: (FacePiece | null)[] = playNet.map((face, slot) => {
    if (missingSlots.includes(slot)) return null;
    return pieceFromNet(`fixed-${slot}`, face);
  });

  const neededPieces: FacePiece[] = missingSlots.map((slot) => ({
    id: `need-${slot}-${Math.random().toString(36).slice(2, 7)}`,
    pattern: playNet[slot].pattern as PatternId,
    rotation: playNet[slot].rotation,
  }));

  const decoyCount = randInt(1, 2);
  const decoys: FacePiece[] = [];
  let guard = 0;
  while (decoys.length < decoyCount && guard < 20) {
    guard++;
    const pattern = pick(PATTERN_IDS);
    const rotation = randomRotation();
    const duplicate = [...neededPieces, ...decoys].some(
      (p) => p.pattern === pattern && p.rotation === rotation,
    );
    if (duplicate) continue;
    decoys.push({
      id: `decoy-${decoys.length}-${Math.random().toString(36).slice(2, 7)}`,
      pattern,
      rotation,
    });
  }

  return {
    layoutRef,
    layoutPlay,
    referenceFaces,
    playFixedFaces,
    missingSlots,
    trayPieces: shuffle([...neededPieces, ...decoys]),
    solutionFaces,
  };
}

function generateQuestions(count: number): QuestionData[] {
  return Array.from({ length: count }, () => generateQuestion());
}

function buildPlayNetFaces(
  question: QuestionData,
  placements: (FacePiece | null)[],
): (NetFace | null)[] {
  const faces: (NetFace | null)[] = Array(6).fill(null);
  for (let slot = 0; slot < 6; slot++) {
    if (question.missingSlots.includes(slot)) {
      const placed = placements[slot];
      faces[slot] = placed ? toNetFace(placed) : null;
    } else {
      const fixed = question.playFixedFaces[slot];
      faces[slot] = fixed ? toNetFace(fixed) : null;
    }
  }
  return faces;
}

function isQuestionCorrect(question: QuestionData, placements: (FacePiece | null)[]): boolean {
  const refCube = foldNet(
    question.referenceFaces.map(toNetFace),
    question.layoutRef,
  );
  const playCube = foldNet(buildPlayNetFaces(question, placements), question.layoutPlay);
  if (!refCube || !playCube) return false;
  return cubesEqualModuloRotation(refCube, playCube);
}

// ============================================================================
// Face pattern SVG
// ============================================================================

function FacePatternSvg({
  pattern,
  rotation,
  size = FACE_SIZE,
}: {
  pattern: PatternId;
  rotation: FaceRotation;
  size?: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const rot = rotation ? `rotate(${rotation} ${cx} ${cy})` : undefined;
  const stroke = '#1a1a1a';
  const sw = 2;

  const content = (() => {
    switch (pattern) {
      case 'cross':
        return (
          <>
            <line x1={cx} y1={size * 0.2} x2={cx} y2={size * 0.8} stroke={stroke} strokeWidth={sw} />
            <line x1={size * 0.2} y1={cy} x2={size * 0.8} y2={cy} stroke={stroke} strokeWidth={sw} />
          </>
        );
      case 'square':
        return (
          <rect
            x={size * 0.28}
            y={size * 0.28}
            width={size * 0.44}
            height={size * 0.44}
            fill="none"
            stroke={stroke}
            strokeWidth={sw}
          />
        );
      case 'octagon': {
        const r = size * 0.28;
        const pts = Array.from({ length: 8 }, (_, i) => {
          const a = (Math.PI / 4) * i - Math.PI / 8;
          return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
        }).join(' ');
        return <polygon points={pts} fill="none" stroke={stroke} strokeWidth={sw} />;
      }
      case 'stripes-h':
        return (
          <>
            {[0.32, 0.5, 0.68].map((y) => (
              <line
                key={y}
                x1={size * 0.22}
                y1={size * y}
                x2={size * 0.78}
                y2={size * y}
                stroke={stroke}
                strokeWidth={sw}
              />
            ))}
          </>
        );
      case 'stripes-v':
        return (
          <>
            {[0.32, 0.5, 0.68].map((x) => (
              <line
                key={x}
                x1={size * x}
                y1={size * 0.22}
                x2={size * x}
                y2={size * 0.78}
                stroke={stroke}
                strokeWidth={sw}
              />
            ))}
          </>
        );
      case 'circles':
        return (
          <>
            <circle cx={cx - size * 0.16} cy={cy - size * 0.14} r={size * 0.1} fill="none" stroke={stroke} strokeWidth={sw} />
            <circle cx={cx + size * 0.16} cy={cy - size * 0.14} r={size * 0.1} fill="none" stroke={stroke} strokeWidth={sw} />
            <circle cx={cx} cy={cy + size * 0.16} r={size * 0.1} fill="none" stroke={stroke} strokeWidth={sw} />
          </>
        );
      default:
        return null;
    }
  })();

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
      <g transform={rot}>{content}</g>
    </svg>
  );
}

function FaceCell({
  face,
  size = FACE_SIZE,
  empty = false,
  highlight = false,
  selected = false,
  flash = null,
  solution = false,
  onClick,
  onDoubleClick,
  onDragOver,
  onDrop,
  draggable = false,
  onDragStart,
  className = '',
}: {
  face: FacePiece | null;
  size?: number;
  empty?: boolean;
  highlight?: boolean;
  selected?: boolean;
  flash?: 'correct' | 'incorrect' | null;
  solution?: boolean;
  onClick?: () => void;
  onDoubleClick?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  className?: string;
}) {
  const borderColor =
    solution
      ? '#16a34a'
      : flash === 'correct'
        ? '#16a34a'
        : flash === 'incorrect'
          ? '#dc2626'
          : selected
            ? '#0068C6'
            : highlight
              ? '#f59e0b'
              : FACE_BORDER;
  const bg = empty ? '#e8e8e8' : FACE_BG;

  return (
    <button
      type="button"
      draggable={draggable && !!face}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      className={`flex items-center justify-center border-2 transition-shadow ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: bg,
        borderColor,
        borderStyle: empty ? 'dashed' : 'solid',
        boxShadow:
          solution
            ? '0 0 0 3px rgba(22,163,74,0.45)'
            : flash === 'correct'
              ? '0 0 0 3px rgba(22,163,74,0.45)'
              : flash === 'incorrect'
                ? '0 0 0 3px rgba(220,38,38,0.45)'
                : selected
                  ? '0 0 0 3px rgba(0,104,198,0.35)'
                  : undefined,
        cursor: onClick || draggable ? 'pointer' : 'default',
      }}
    >
      {face ? <FacePatternSvg pattern={face.pattern} rotation={face.rotation} size={size - 10} /> : null}
    </button>
  );
}

function CubeNet({
  layoutId,
  faces,
  missingSlots = [],
  placements,
  mode,
  selectedPieceId,
  selectedSlot,
  onSlotClick,
  onSlotDoubleClick,
  onSlotDrop,
  solutionSlots = [],
  size = FACE_SIZE,
}: {
  layoutId: LayoutId;
  faces: (FacePiece | null)[];
  missingSlots?: number[];
  placements?: (FacePiece | null)[];
  mode: 'reference' | 'play';
  selectedPieceId?: string | null;
  selectedSlot?: number | null;
  onSlotClick?: (slot: number) => void;
  onSlotDoubleClick?: (slot: number) => void;
  onSlotDrop?: (slot: number, pieceId: string) => void;
  solutionSlots?: number[];
  size?: number;
}) {
  const layout = getLayout(layoutId);
  const gap = 4;
  const gridW = layout.cols * size + (layout.cols - 1) * gap;
  const gridH = layout.rows * size + (layout.rows - 1) * gap;

  return (
    <div className="relative" style={{ width: gridW, height: gridH }}>
      {layout.slots.map(({ slot, row, col }) => {
        const isMissing = missingSlots.includes(slot);
        let face: FacePiece | null = faces[slot];

        if (mode === 'play') {
          if (isMissing) {
            face = placements?.[slot] ?? null;
          }
        }

        const x = col * (size + gap);
        const y = row * (size + gap);
        const interactive = mode === 'play' && isMissing;
        const isSelected = selectedSlot === slot;

        return (
          <div key={slot} className="absolute" style={{ left: x, top: y }}>
            <FaceCell
              face={face}
              size={size}
              empty={mode === 'play' && isMissing && !face}
              selected={isSelected}
              highlight={!!selectedPieceId && interactive && !face}
              solution={solutionSlots.includes(slot)}
              draggable={false}
              onClick={interactive ? () => onSlotClick?.(slot) : undefined}
              onDoubleClick={interactive && face ? () => onSlotDoubleClick?.(slot) : undefined}
              onDragOver={
                interactive
                  ? (e) => {
                      e.preventDefault();
                    }
                  : undefined
              }
              onDrop={
                interactive
                  ? (e) => {
                      e.preventDefault();
                      const pieceId = e.dataTransfer.getData('text/piece-id');
                      if (pieceId) onSlotDrop?.(slot, pieceId);
                    }
                  : undefined
              }
            />
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

export default function CubesPsy0Test() {
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
  const [flashOutcome, setFlashOutcome] = useState<AnswerOutcome | null>(null);
  const [showCorrection, setShowCorrection] = useState(false);

  const [placements, setPlacements] = useState<(FacePiece | null)[]>(Array(6).fill(null));
  const [trayPieces, setTrayPieces] = useState<FacePiece[]>([]);
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);

  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionStartRef = useRef(0);
  const perfSavedRef = useRef(false);
  const lockedRef = useRef(false);
  const currentIdxRef = useRef(0);
  const questionsRef = useRef<QuestionData[]>([]);
  const placementsRef = useRef<(FacePiece | null)[]>(Array(6).fill(null));

  currentIdxRef.current = currentIdx;
  questionsRef.current = questions;
  lockedRef.current = locked;
  placementsRef.current = placements;

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

  useEffect(() => () => clearTimer(), [clearTimer]);

  const resetQuestionState = useCallback((q: QuestionData) => {
    setPlacements(Array(6).fill(null));
    placementsRef.current = Array(6).fill(null);
    setTrayPieces(q.trayPieces.map((p) => ({ ...p })));
    setSelectedPieceId(null);
    setSelectedSlot(null);
    setFlashOutcome(null);
    setShowCorrection(false);
  }, []);

  const goToNextQuestion = useCallback(() => {
    const idx = currentIdxRef.current;
    const qs = questionsRef.current;

    if (idx + 1 >= qs.length) {
      clearTimer();
      setLocked(false);
      lockedRef.current = false;
      setFlashOutcome(null);
      setGameState('results');
      return;
    }

    const nextIdx = idx + 1;
    currentIdxRef.current = nextIdx;
    setCurrentIdx(nextIdx);
    resetQuestionState(qs[nextIdx]);
    setLocked(false);
    lockedRef.current = false;
    setFlashOutcome(null);
    setShowCorrection(false);
    startTimer(settingsRef.current.timePerQuestionSec * 1000);
  }, [clearTimer, resetQuestionState, startTimer]);

  const finishOrNext = useCallback(
    (result: QuestionResult) => {
      setResults((prev) => [...prev, result]);

      if (settingsRef.current.examMode) {
        goToNextQuestion();
      } else {
        setFlashOutcome(result.outcome);
        setShowCorrection(true);
      }
    },
    [goToNextQuestion],
  );

  const recordOutcome = useCallback(
    (outcome: AnswerOutcome) => {
      if (lockedRef.current) return;
      lockedRef.current = true;
      setLocked(true);
      clearTimer();

      const timeUsed = Date.now() - questionStartRef.current;
      const q = questionsRef.current[currentIdxRef.current];
      finishOrNext({ question: q, outcome, timeUsedMs: timeUsed });
    },
    [clearTimer, finishOrNext],
  );

  const handleValidate = useCallback(() => {
    if (lockedRef.current) return;
    const q = questionsRef.current[currentIdxRef.current];
    const correct = isQuestionCorrect(q, placementsRef.current);
    recordOutcome(correct ? 'correct' : 'incorrect');
  }, [recordOutcome]);

  const rotatePiece = useCallback((piece: FacePiece): FacePiece => {
    return { ...piece, rotation: nextRotation(piece.rotation) };
  }, []);

  const placePiece = useCallback((slot: number, pieceId: string) => {
    const q = questionsRef.current[currentIdxRef.current];
    if (!q.missingSlots.includes(slot)) return;

    setTrayPieces((tray) => {
      const piece = tray.find((p) => p.id === pieceId);
      if (!piece) return tray;

      const existing = placementsRef.current[slot];
      const nextPlacements = [...placementsRef.current];
      nextPlacements[slot] = { ...piece };
      placementsRef.current = nextPlacements;
      setPlacements(nextPlacements);

      let next = tray.filter((p) => p.id !== pieceId);
      if (existing) next = [...next, existing];
      return next;
    });

    setSelectedPieceId(null);
    setSelectedSlot(null);
  }, []);

  const handleSlotClick = useCallback(
    (slot: number) => {
      const q = questionsRef.current[currentIdxRef.current];
      if (!q.missingSlots.includes(slot)) return;

      const placed = placementsRef.current[slot];

      if (placed) {
        setPlacements((prev) => {
          const next = [...prev];
          next[slot] = rotatePiece(placed);
          placementsRef.current = next;
          return next;
        });
        setSelectedSlot(slot);
        return;
      }

      if (selectedPieceId) {
        placePiece(slot, selectedPieceId);
        return;
      }

      setSelectedSlot(slot);
    },
    [placePiece, rotatePiece, selectedPieceId],
  );

  const handleSlotDoubleClick = useCallback((slot: number) => {
    const q = questionsRef.current[currentIdxRef.current];
    if (!q.missingSlots.includes(slot)) return;

    const placed = placementsRef.current[slot];
    if (!placed) return;

    setPlacements((prev) => {
      const next = [...prev];
      next[slot] = null;
      placementsRef.current = next;
      return next;
    });
    setTrayPieces((tray) => [...tray, placed]);
    setSelectedSlot(null);
  }, []);

  const handleTrayClick = useCallback(
    (piece: FacePiece) => {
      setTrayPieces((tray) =>
        tray.map((p) => (p.id === piece.id ? rotatePiece(p) : p)),
      );
    },
    [rotatePiece],
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
    setFlashOutcome(null);
    setShowCorrection(false);
    resetQuestionState(qs[0]);
    setGameState('playing');
    startTimer(settingsRef.current.timePerQuestionSec * 1000);
  }, [resetQuestionState, startTimer]);

  useEffect(() => {
    if (gameState !== 'playing' || locked) return;
    if (totalTime > 0 && timeLeft <= 0) {
      recordOutcome('skipped');
    }
  }, [timeLeft, totalTime, gameState, locked, recordOutcome]);

  const currentQuestion = questions[currentIdx];
  const timerPct = totalTime > 0 ? (timeLeft / totalTime) * 100 : 0;
  const allFilled =
    currentQuestion?.missingSlots.every((s) => placements[s] !== null) ?? false;

  // =========================================================================
  // MENU
  // =========================================================================
  if (gameState === 'menu') {
    return (
      <div className={`flex min-h-screen flex-col items-center justify-center ${SLATE_BG} p-4`}>
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">Cubes 2D/3D</CardTitle>
            <CardDescription className="mt-2 text-base">
              Reconstituez le developpe de cube a partir du modele
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
              <p>
                A gauche : le <strong>modele complet</strong>. A droite : le{' '}
                <strong>meme cube</strong> deplie autrement, avec des faces manquantes.
              </p>
              <p>
                Placez les pieces du bas (clic ou glisser-deposer).{' '}
                <strong>Cliquez une face</strong> pour la pivoter d&apos;un quart de tour.
              </p>
              <p>
                <strong>{settings.totalQuestions} questions</strong>,{' '}
                <strong>{settings.timePerQuestionSec}s</strong> chacune.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xl font-bold text-slate-700">{settings.totalQuestions}</p>
                <p className="text-xs text-slate-500">Questions</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xl font-bold text-slate-700">{settings.timePerQuestionSec}s</p>
                <p className="text-xs text-slate-500">Par question</p>
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

  // =========================================================================
  // SETTINGS
  // =========================================================================
  if (gameState === 'settings') {
    return (
      <div className={`flex min-h-screen flex-col items-center justify-center ${SLATE_BG} p-4`}>
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
                  min={30}
                  max={90}
                  step={5}
                  className="mt-2"
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div>
                  <Label htmlFor="exam-mode">Mode examen</Label>
                  <p className="text-xs text-slate-500">Pas de retour visuel, passage immediat</p>
                </div>
                <Switch
                  id="exam-mode"
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
    const correct = results.filter((r) => r.outcome === 'correct').length;
    const total = results.length;
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
    const grade =
      pct >= 75 ? 'Excellent' : pct >= 50 ? 'Bien' : pct >= 25 ? 'Passable' : 'A revoir';

    if (!perfSavedRef.current) {
      perfSavedRef.current = true;
      savePerformanceResult(EXERCISE_ID, correct, total);
    }

    const perfEntries = loadEntries(EXERCISE_ID);

    return (
      <div className={`flex min-h-screen flex-col items-center justify-center ${SLATE_BG} p-4`}>
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">Resultats</CardTitle>
            <Badge
              variant={pct >= 75 ? 'default' : pct >= 50 ? 'secondary' : 'destructive'}
              className="mt-2 px-4 py-1 text-lg"
            >
              {grade}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-5xl font-bold text-slate-700">{pct}%</p>
              <p className="mt-1 text-slate-500">
                {correct}/{total} reponses correctes
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-green-50 p-3 text-center">
                <p className="text-2xl font-bold text-green-600">{correct}</p>
                <p className="text-xs text-green-700">Correct</p>
              </div>
              <div className="rounded-lg bg-red-50 p-3 text-center">
                <p className="text-2xl font-bold text-red-600">
                  {results.filter((r) => r.outcome === 'incorrect').length}
                </p>
                <p className="text-xs text-red-700">Incorrect</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 text-center">
                <p className="text-2xl font-bold text-slate-600">
                  {results.filter((r) => r.outcome === 'skipped').length}
                </p>
                <p className="text-xs text-slate-500">Passe</p>
              </div>
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
              <Button variant="outline" size="lg" className="w-full" onClick={() => setGameState('menu')}>
                <ArrowLeft className="mr-2 h-5 w-5" /> Menu
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
  if (!currentQuestion) return null;

  const playFaces: (FacePiece | null)[] = currentQuestion.playFixedFaces.map((f) =>
    f ? { ...f } : null,
  );
  const solutionFaces: (FacePiece | null)[] = currentQuestion.solutionFaces.map((f) => ({ ...f }));
  const showSolution =
    showCorrection && flashOutcome !== 'correct' && flashOutcome !== null;

  return (
    <div className={`flex min-h-screen flex-col ${SLATE_BG}`}>
      <div className="border-b border-slate-200 bg-white/70 px-4 py-3 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between text-sm font-medium text-slate-700">
          <span>
            Question {currentIdx + 1}/{questions.length}
          </span>
          <span>{Math.ceil(timeLeft / 1000)}s</span>
          <span>
            Score : {results.filter((r) => r.outcome === 'correct').length}/{results.length}
          </span>
        </div>
        <div className="mx-auto mt-2 h-2 max-w-5xl overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full transition-all duration-100"
            style={{
              width: `${timerPct}%`,
              backgroundColor: timerPct < 20 ? '#dc2626' : '#0068C6',
            }}
          />
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-4 md:p-6">
        {showCorrection && flashOutcome && (
          <div
            className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-lg font-semibold ${
              flashOutcome === 'correct'
                ? 'border-green-200 bg-green-50 text-green-700'
                : flashOutcome === 'skipped'
                  ? 'border-slate-200 bg-slate-50 text-slate-700'
                  : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {flashOutcome === 'correct' ? (
              <>
                <CheckCircle2 className="h-6 w-6" /> Correct
              </>
            ) : flashOutcome === 'skipped' ? (
              <>Temps ecoule</>
            ) : (
              <>
                <XCircle className="h-6 w-6" /> Incorrect
              </>
            )}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <div className="flex flex-col items-center rounded-xl border border-slate-200 bg-white/80 p-5 shadow-sm">
            <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-600">Modele</p>
            <CubeNet
              layoutId={currentQuestion.layoutRef}
              faces={currentQuestion.referenceFaces}
              mode="reference"
            />
          </div>

          <div className="flex flex-col items-center rounded-xl border border-slate-200 bg-white/80 p-5 shadow-sm">
            <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-600">
              {showSolution ? 'Solution possible' : 'A completer'}
            </p>
            <CubeNet
              layoutId={currentQuestion.layoutPlay}
              faces={showSolution ? solutionFaces : playFaces}
              missingSlots={showSolution ? [] : currentQuestion.missingSlots}
              placements={showSolution ? undefined : placements}
              mode="play"
              selectedPieceId={showCorrection ? null : selectedPieceId}
              selectedSlot={showCorrection ? null : selectedSlot}
              onSlotClick={showCorrection ? undefined : handleSlotClick}
              onSlotDoubleClick={showCorrection ? undefined : handleSlotDoubleClick}
              onSlotDrop={showCorrection ? undefined : placePiece}
              solutionSlots={showSolution ? currentQuestion.missingSlots : []}
            />
          </div>
        </div>

        {!showCorrection && (
          <div className="rounded-xl border border-slate-200 bg-white/80 p-5 shadow-sm">
            <p className="mb-4 text-center text-sm font-semibold uppercase tracking-wide text-slate-600">
              Pieces disponibles
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {trayPieces.map((piece) => (
                <FaceCell
                  key={piece.id}
                  face={piece}
                  selected={selectedPieceId === piece.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/piece-id', piece.id);
                    setSelectedPieceId(piece.id);
                  }}
                  onClick={() => handleTrayClick(piece)}
                />
              ))}
            </div>
            <p className="mt-4 text-center text-xs text-slate-500">
              Glisser-deposer pour placer · clic pour pivoter d&apos;un quart de tour · double-clic sur une
              face placee pour la retirer
            </p>
          </div>
        )}

        <div className="flex justify-center gap-3">
          {showCorrection ? (
            <Button size="lg" onClick={goToNextQuestion}>
              {currentIdx + 1 >= questions.length ? 'Voir les resultats' : 'Suivant'}
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => recordOutcome('skipped')} disabled={locked}>
                Passer
              </Button>
              <Button onClick={handleValidate} disabled={locked || !allFilled}>
                Valider
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

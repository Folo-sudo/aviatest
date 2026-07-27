'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { savePerformanceResult, loadEntries } from '@/lib/core/PerformanceTracker';
import { MiniPerformanceChart } from '@/components/PerformanceChart';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Play,
  RotateCcw,
  Home,
  ArrowUp,
  ArrowDown,
  ArrowLeft as ArrowLeftIcon,
  ArrowRight,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

// ============================================================================
// Types
// ============================================================================

type GameState = 'menu' | 'playing' | 'results';
type Direction = 'up' | 'down' | 'left' | 'right';

interface Equation {
  id: number;
  left: string;
  right: string;
  isCorrect: boolean;
}

interface LiveStats {
  trackingMsCorrect: number;
  trackingMsTotal: number;
  shapeHits: number;
  shapeMisses: number;
  shapeFalseAlarms: number;
  calcHits: number;
  calcMisses: number;
  calcFalseAlarms: number;
}

interface FinalScore {
  trackingPct: number;
  shapePct: number;
  calcPct: number;
  overallPct: number;
  correct: number;
  total: number;
}

// ============================================================================
// Constants
// ============================================================================

const DURATION_MS = 5 * 60 * 1000;
const MOVE_SPEED = 0.085; // % of arena per ms (~8.5%/s)
const DIR_HOLD_MS_MIN = 1800;
const DIR_HOLD_MS_MAX = 4200;
const SHAPE_INTERVAL_MS = 2200;
const SHAPE_MATCH_PROB = 0.35;
const CALC_SCROLL_PX_PER_SEC = 55;
const CALC_SLOT_WIDTH = 150;
const BG = '#d4d4d4';
const BLUE = '#0068C6';
const ORANGE = '#f59e0b';

const SYMBOL_IDS = [
  'crown',
  'infinity',
  'propeller',
  'hexagon',
  'arrows',
  'queen',
  'flower',
  'pause',
  'tape',
  'paper',
] as const;
type SymbolId = (typeof SYMBOL_IDS)[number];

const DIRECTIONS: Direction[] = ['up', 'down', 'left', 'right'];

const KEY_TO_DIR: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
};

// ============================================================================
// Helpers
// ============================================================================

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function otherDir(current: Direction): Direction {
  const opts = DIRECTIONS.filter((d) => d !== current);
  return pick(opts);
}

function evalSide(tokens: { op?: string; a: number; b?: number }): number {
  const { op, a, b } = tokens;
  if (!op) return a;
  if (op === '²') return a * a;
  if (b === undefined) return a;
  switch (op) {
    case '+':
      return a + b;
    case '-':
      return a - b;
    case '×':
      return a * b;
    case '/':
      return b === 0 ? a : a / b;
    default:
      return a;
  }
}

function formatSide(tokens: { op?: string; a: number; b?: number }): string {
  const { op, a, b } = tokens;
  if (!op) return String(a);
  if (op === '²') return `${a}²`;
  return `${a}${op}${b}`;
}

function makeSide(preferSimple = false): { op?: string; a: number; b?: number; value: number } {
  const roll = Math.random();
  if (preferSimple || roll < 0.25) {
    const a = randInt(-20, 40);
    return { a, value: a };
  }
  if (roll < 0.4) {
    const a = randInt(2, 12);
    return { op: '²', a, value: a * a };
  }
  if (roll < 0.65) {
    const a = randInt(1, 20);
    const b = randInt(1, 20);
    const op = pick(['+', '-'] as const);
    return { op, a, b, value: evalSide({ op, a, b }) };
  }
  if (roll < 0.85) {
    const a = randInt(2, 17);
    const b = randInt(2, 14);
    return { op: '×', a, b, value: a * b };
  }
  // division with integer result
  const b = randInt(2, 12);
  const q = randInt(2, 15);
  const a = b * q;
  return { op: '/', a, b, value: q };
}

let eqId = 1;
function makeEquation(forceCorrect?: boolean): Equation {
  const left = makeSide();
  const wantCorrect = forceCorrect ?? Math.random() < 0.55;
  let right = makeSide(true);
  if (wantCorrect) {
    // Build a right side that equals left.value
    const target = Math.round(left.value);
    if (Math.random() < 0.4) {
      right = { a: target, value: target };
    } else if (Math.random() < 0.5) {
      const b = randInt(1, 15);
      const a = target + b;
      right = { op: '-', a, b, value: target };
    } else {
      const b = randInt(1, 12);
      const a = target - b;
      right = { op: '+', a, b, value: target };
    }
  } else {
    // Ensure mismatch
    let guard = 0;
    while (Math.round(right.value) === Math.round(left.value) && guard < 8) {
      right = makeSide();
      guard += 1;
    }
    if (Math.round(right.value) === Math.round(left.value)) {
      right = { a: Math.round(left.value) + pick([1, -1, 2, -3]), value: 0 };
      right.value = right.a;
    }
  }
  const leftStr = formatSide(left);
  const rightStr = formatSide(right);
  const isCorrect = Math.round(left.value) === Math.round(right.value);
  return { id: eqId++, left: leftStr, right: rightStr, isCorrect };
}

function SymbolGlyph({ id, size = 40 }: { id: SymbolId; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 100 100',
    fill: BLUE,
  } as const;

  switch (id) {
    case 'crown':
      return (
        <svg {...common}>
          <path d="M12 72 L20 35 L35 55 L50 28 L65 55 L80 35 L88 72 Z" />
          <rect x="18" y="72" width="64" height="12" rx="2" />
        </svg>
      );
    case 'infinity':
      return (
        <svg {...common} fill="none" stroke={BLUE} strokeWidth="8">
          <path d="M30 50 C30 30, 50 30, 50 50 C50 70, 70 70, 70 50 C70 30, 50 30, 50 50 C50 70, 30 70, 30 50" />
        </svg>
      );
    case 'propeller':
      return (
        <svg {...common}>
          <circle cx="50" cy="50" r="10" />
          <ellipse cx="50" cy="22" rx="12" ry="22" />
          <ellipse cx="74" cy="64" rx="12" ry="22" transform="rotate(120 74 64)" />
          <ellipse cx="26" cy="64" rx="12" ry="22" transform="rotate(-120 26 64)" />
        </svg>
      );
    case 'hexagon':
      return (
        <svg {...common} fill="none" stroke={BLUE} strokeWidth="7">
          <polygon points="50,12 82,31 82,69 50,88 18,69 18,31" />
          <circle cx="50" cy="31" r="5" fill={BLUE} stroke="none" />
          <circle cx="72" cy="44" r="5" fill={BLUE} stroke="none" />
          <circle cx="72" cy="66" r="5" fill={BLUE} stroke="none" />
          <circle cx="50" cy="79" r="5" fill={BLUE} stroke="none" />
          <circle cx="28" cy="66" r="5" fill={BLUE} stroke="none" />
          <circle cx="28" cy="44" r="5" fill={BLUE} stroke="none" />
        </svg>
      );
    case 'arrows':
      return (
        <svg {...common} fill="none" stroke={BLUE} strokeWidth="7" strokeLinecap="round">
          <path d="M70 35 L30 35 L42 23" />
          <path d="M70 50 L30 50 L42 38" />
          <path d="M70 65 L30 65 L42 53" />
        </svg>
      );
    case 'queen':
      return (
        <svg {...common}>
          <circle cx="20" cy="28" r="6" />
          <circle cx="50" cy="18" r="6" />
          <circle cx="80" cy="28" r="6" />
          <path d="M20 28 L30 70 L70 70 L80 28 L50 45 Z" />
          <rect x="28" y="70" width="44" height="12" rx="2" />
        </svg>
      );
    case 'flower':
      return (
        <svg {...common}>
          <circle cx="50" cy="28" r="12" />
          <circle cx="72" cy="50" r="12" />
          <circle cx="50" cy="72" r="12" />
          <circle cx="28" cy="50" r="12" />
          <circle cx="50" cy="50" r="10" fill="#fff" stroke={BLUE} strokeWidth="4" />
        </svg>
      );
    case 'pause':
      return (
        <svg {...common}>
          <rect x="28" y="20" width="16" height="60" rx="3" />
          <rect x="56" y="20" width="16" height="60" rx="3" />
        </svg>
      );
    case 'tape':
      return (
        <svg {...common} fill="none" stroke={BLUE} strokeWidth="7">
          <rect x="15" y="30" width="70" height="40" rx="6" />
          <circle cx="35" cy="50" r="10" />
          <circle cx="65" cy="50" r="10" />
        </svg>
      );
    case 'paper':
    default:
      return (
        <svg {...common} fill="none" stroke={BLUE} strokeWidth="6">
          <path d="M30 18 H62 L78 34 V82 H30 Z" />
          <path d="M62 18 V34 H78" />
          <path d="M40 48 H68 M40 60 H68 M40 72 H58" />
        </svg>
      );
  }
}

function DirectionBadge({
  direction,
  ok,
}: {
  direction: Direction | null;
  ok: boolean | null;
}) {
  if (!direction) return <div className="h-8 w-10" />;
  if (ok === false) {
    return (
      <div className="flex h-8 w-10 items-center justify-center text-xl font-bold text-red-600">
        ✕
      </div>
    );
  }
  const color = ok ? '#22c55e' : BLUE;
  const Icon =
    direction === 'up'
      ? ArrowUp
      : direction === 'down'
        ? ArrowDown
        : direction === 'left'
          ? ArrowLeftIcon
          : ArrowRight;
  return (
    <div
      className="flex h-8 w-10 items-center justify-center rounded"
      style={{ backgroundColor: ok ? 'transparent' : BLUE }}
    >
      <Icon className="h-5 w-5" style={{ color: ok ? color : 'white' }} strokeWidth={3} />
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

export default function PsychomoteurPsy0Test() {
  const router = useRouter();
  const [gameState, setGameState] = useState<GameState>('menu');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [pos, setPos] = useState({ x: 50, y: 50 });
  const [moveDir, setMoveDir] = useState<Direction>('right');
  const [heldDir, setHeldDir] = useState<Direction | null>(null);
  const [circleSymbol, setCircleSymbol] = useState<SymbolId>('crown');
  const [boxSymbol, setBoxSymbol] = useState<SymbolId>('infinity');
  const [equations, setEquations] = useState<Equation[]>(() =>
    Array.from({ length: 24 }, () => makeEquation())
  );
  const [scrollX, setScrollX] = useState(0);
  const [activeIdx, setActiveIdx] = useState(0);
  const [spaceFlash, setSpaceFlash] = useState<'ok' | 'bad' | null>(null);
  const [fFlash, setFFlash] = useState<'ok' | 'bad' | null>(null);
  const [finalScore, setFinalScore] = useState<FinalScore | null>(null);

  const statsRef = useRef<LiveStats>({
    trackingMsCorrect: 0,
    trackingMsTotal: 0,
    shapeHits: 0,
    shapeMisses: 0,
    shapeFalseAlarms: 0,
    calcHits: 0,
    calcMisses: 0,
    calcFalseAlarms: 0,
  });
  const shapeAnsweredRef = useRef(false);
  const calcAnsweredRef = useRef(false);
  const pendingShapeMatchRef = useRef(false);
  const rafRef = useRef(0);
  const startRef = useRef(0);
  const lastTsRef = useRef(0);
  const dirUntilRef = useRef(0);
  const nextShapeAtRef = useRef(0);
  const heldDirRef = useRef<Direction | null>(null);
  const moveDirRef = useRef<Direction>('right');
  const posRef = useRef({ x: 50, y: 50 });
  const equationsRef = useRef(equations);
  const scrollXRef = useRef(0);
  const activeIdxRef = useRef(0);
  const circleSymRef = useRef<SymbolId>('crown');
  const boxSymRef = useRef<SymbolId>('infinity');
  const playingRef = useRef(false);
  const perfSavedRef = useRef(false);

  useEffect(() => {
    equationsRef.current = equations;
  }, [equations]);

  const finishGame = useCallback(() => {
    playingRef.current = false;
    cancelAnimationFrame(rafRef.current);
    const s = statsRef.current;
    const trackingPct =
      s.trackingMsTotal > 0
        ? Math.round((s.trackingMsCorrect / s.trackingMsTotal) * 1000) / 10
        : 0;
    const shapeTotal = s.shapeHits + s.shapeMisses + s.shapeFalseAlarms;
    const shapePct =
      shapeTotal > 0
        ? Math.round((s.shapeHits / shapeTotal) * 1000) / 10
        : 100;
    const calcTotal = s.calcHits + s.calcMisses + s.calcFalseAlarms;
    const calcPct =
      calcTotal > 0 ? Math.round((s.calcHits / calcTotal) * 1000) / 10 : 100;
    const overallPct =
      Math.round(((trackingPct + shapePct + calcPct) / 3) * 10) / 10;
    const correct = s.shapeHits + s.calcHits + Math.round(trackingPct);
    const total = shapeTotal + calcTotal + 100;
    setFinalScore({
      trackingPct,
      shapePct,
      calcPct,
      overallPct,
      correct,
      total,
    });
    setGameState('results');
  }, []);

  const spawnShapes = useCallback(() => {
    // Missed previous match window?
    if (pendingShapeMatchRef.current && !shapeAnsweredRef.current) {
      statsRef.current.shapeMisses += 1;
    }
    shapeAnsweredRef.current = false;
    const match = Math.random() < SHAPE_MATCH_PROB;
    const a = pick(SYMBOL_IDS);
    let b = pick(SYMBOL_IDS);
    if (match) b = a;
    else {
      let guard = 0;
      while (b === a && guard < 8) {
        b = pick(SYMBOL_IDS);
        guard += 1;
      }
    }
    circleSymRef.current = a;
    boxSymRef.current = b;
    pendingShapeMatchRef.current = match;
    setCircleSymbol(a);
    setBoxSymbol(b);
  }, []);

  const tick = useCallback(
    (ts: number) => {
      if (!playingRef.current) return;
      if (!lastTsRef.current) lastTsRef.current = ts;
      const dt = Math.min(40, ts - lastTsRef.current);
      lastTsRef.current = ts;

      const elapsed = ts - startRef.current;
      setElapsedMs(elapsed);
      if (elapsed >= DURATION_MS) {
        finishGame();
        return;
      }

      // --- Tracking ---
      if (ts >= dirUntilRef.current) {
        const next = otherDir(moveDirRef.current);
        moveDirRef.current = next;
        setMoveDir(next);
        dirUntilRef.current = ts + randInt(DIR_HOLD_MS_MIN, DIR_HOLD_MS_MAX);
      }

      const speed = MOVE_SPEED * dt;
      let { x, y } = posRef.current;
      const dir = moveDirRef.current;
      if (dir === 'up') y -= speed;
      if (dir === 'down') y += speed;
      if (dir === 'left') x -= speed;
      if (dir === 'right') x += speed;

      // Bounce at edges by flipping direction
      if (x < 8) {
        x = 8;
        moveDirRef.current = 'right';
        setMoveDir('right');
        dirUntilRef.current = ts + randInt(DIR_HOLD_MS_MIN, DIR_HOLD_MS_MAX);
      } else if (x > 92) {
        x = 92;
        moveDirRef.current = 'left';
        setMoveDir('left');
        dirUntilRef.current = ts + randInt(DIR_HOLD_MS_MIN, DIR_HOLD_MS_MAX);
      }
      if (y < 8) {
        y = 8;
        moveDirRef.current = 'down';
        setMoveDir('down');
        dirUntilRef.current = ts + randInt(DIR_HOLD_MS_MIN, DIR_HOLD_MS_MAX);
      } else if (y > 92) {
        y = 92;
        moveDirRef.current = 'up';
        setMoveDir('up');
        dirUntilRef.current = ts + randInt(DIR_HOLD_MS_MIN, DIR_HOLD_MS_MAX);
      }
      posRef.current = { x, y };
      setPos({ x, y });

      statsRef.current.trackingMsTotal += dt;
      if (heldDirRef.current === moveDirRef.current) {
        statsRef.current.trackingMsCorrect += dt;
      }

      // --- Shapes ---
      if (ts >= nextShapeAtRef.current) {
        spawnShapes();
        nextShapeAtRef.current = ts + SHAPE_INTERVAL_MS;
      }

      // --- Calculations scroll ---
      scrollXRef.current += (CALC_SCROLL_PX_PER_SEC * dt) / 1000;
      const idx = Math.floor(scrollXRef.current / CALC_SLOT_WIDTH);
      if (idx !== activeIdxRef.current) {
        // Leaving previous active equation unanswered if it was false
        const prev = equationsRef.current[activeIdxRef.current];
        if (prev && !prev.isCorrect && !calcAnsweredRef.current) {
          statsRef.current.calcMisses += 1;
        }
        calcAnsweredRef.current = false;
        activeIdxRef.current = idx;
        setActiveIdx(idx);
        // Append more equations if needed
        if (idx + 10 >= equationsRef.current.length) {
          const extra = Array.from({ length: 20 }, () => makeEquation());
          equationsRef.current = [...equationsRef.current, ...extra];
          setEquations(equationsRef.current);
        }
      }
      setScrollX(scrollXRef.current);

      rafRef.current = requestAnimationFrame(tick);
    },
    [finishGame, spawnShapes]
  );

  const startGame = useCallback(() => {
    statsRef.current = {
      trackingMsCorrect: 0,
      trackingMsTotal: 0,
      shapeHits: 0,
      shapeMisses: 0,
      shapeFalseAlarms: 0,
      calcHits: 0,
      calcMisses: 0,
      calcFalseAlarms: 0,
    };
    perfSavedRef.current = false;
    shapeAnsweredRef.current = false;
    calcAnsweredRef.current = false;
    pendingShapeMatchRef.current = false;
    posRef.current = { x: 50, y: 50 };
    moveDirRef.current = pick(DIRECTIONS);
    heldDirRef.current = null;
    scrollXRef.current = 0;
    activeIdxRef.current = 0;
    equationsRef.current = Array.from({ length: 30 }, () => makeEquation());
    setEquations(equationsRef.current);
    setPos({ x: 50, y: 50 });
    setMoveDir(moveDirRef.current);
    setHeldDir(null);
    setScrollX(0);
    setActiveIdx(0);
    setElapsedMs(0);
    setSpaceFlash(null);
    setFFlash(null);
    setFinalScore(null);
    spawnShapes();
    setGameState('playing');
    playingRef.current = true;
    const now = performance.now();
    startRef.current = now;
    lastTsRef.current = 0;
    dirUntilRef.current = now + randInt(DIR_HOLD_MS_MIN, DIR_HOLD_MS_MAX);
    nextShapeAtRef.current = now + SHAPE_INTERVAL_MS;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
  }, [spawnShapes, tick]);

  useEffect(() => {
    return () => {
      playingRef.current = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const handleSpace = useCallback(() => {
    if (!playingRef.current || shapeAnsweredRef.current) return;
    shapeAnsweredRef.current = true;
    const match = circleSymRef.current === boxSymRef.current;
    if (match) {
      statsRef.current.shapeHits += 1;
      setSpaceFlash('ok');
    } else {
      statsRef.current.shapeFalseAlarms += 1;
      setSpaceFlash('bad');
    }
    window.setTimeout(() => setSpaceFlash(null), 350);
  }, []);

  const handleF = useCallback(() => {
    if (!playingRef.current || calcAnsweredRef.current) return;
    calcAnsweredRef.current = true;
    const eq = equationsRef.current[activeIdxRef.current];
    if (!eq) return;
    if (!eq.isCorrect) {
      statsRef.current.calcHits += 1;
      setFFlash('ok');
    } else {
      statsRef.current.calcFalseAlarms += 1;
      setFFlash('bad');
    }
    window.setTimeout(() => setFFlash(null), 350);
  }, []);

  useEffect(() => {
    if (gameState !== 'playing') return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleSpace();
        return;
      }
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        handleF();
        return;
      }
      const dir = KEY_TO_DIR[e.key];
      if (dir) {
        e.preventDefault();
        heldDirRef.current = dir;
        setHeldDir(dir);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const dir = KEY_TO_DIR[e.key];
      if (dir && heldDirRef.current === dir) {
        heldDirRef.current = null;
        setHeldDir(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [gameState, handleSpace, handleF]);

  // Persist results once
  useEffect(() => {
    if (gameState !== 'results' || !finalScore || perfSavedRef.current) return;
    perfSavedRef.current = true;
    savePerformanceResult(
      'psychomoteur-psy0',
      Math.round(finalScore.overallPct),
      100
    );
  }, [gameState, finalScore]);

  const trackingOk =
    heldDir !== null && heldDir === moveDir ? true : heldDir !== null ? false : null;
  const progress = Math.min(1, elapsedMs / DURATION_MS);
  const remainingSec = Math.max(0, Math.ceil((DURATION_MS - elapsedMs) / 1000));
  const mm = String(Math.floor(remainingSec / 60)).padStart(1, '0');
  const ss = String(remainingSec % 60).padStart(2, '0');

  // ---- MENU ----
  if (gameState === 'menu') {
    return (
      <main className="min-h-screen bg-[#fbfaf9]">
        <div className="container mx-auto max-w-3xl px-4 py-10">
          <button
            onClick={() => router.push('/')}
            className="mb-6 inline-flex items-center gap-2 text-sm text-[#605a57] hover:text-[#37322f]"
          >
            <ArrowLeft className="h-4 w-4" />
            Accueil
          </button>
          <h1 className="mb-2 text-3xl font-bold text-[#37322f]">
            Psychomoteur Psy0 AF Cadet
          </h1>
          <p className="mb-6 text-[#605a57]">
            Test multi-taches de 5 minutes : suivi du cercle, comparaison de
            formes, detection de calculs faux — en parallele.
          </p>

          <div className="mb-8 space-y-4 rounded-xl border border-[#e0dedb] bg-white p-6">
            <h2 className="font-semibold text-[#37322f]">Regles</h2>
            <ul className="list-disc space-y-2 pl-5 text-sm text-[#605a57]">
              <li>
                <strong>Fleches</strong> : maintenez la fleche du clavier dans le
                sens de deplacement du cercle (chevron vert = correct).
              </li>
              <li>
                <strong>Espace</strong> : appuyez quand la forme dans le cercle
                est identique a celle de l&apos;encart pointille.
              </li>
              <li>
                <strong>Touche F</strong> : appuyez quand le calcul encadre orange
                est faux.
              </li>
            </ul>
            <div className="flex flex-wrap gap-2 pt-2">
              <Badge variant="secondary">Attention</Badge>
              <Badge variant="secondary">Psychomoteur</Badge>
              <Badge variant="secondary">5 min</Badge>
            </div>
          </div>

          <Button
            size="lg"
            className="w-full gap-2"
            onClick={startGame}
            style={{ backgroundColor: '#37322f' }}
          >
            <Play className="h-4 w-4" />
            Commencer
          </Button>
        </div>
      </main>
    );
  }

  // ---- RESULTS ----
  if (gameState === 'results' && finalScore) {
    const perfEntries = loadEntries('psychomoteur-psy0');
    return (
      <main className="min-h-screen bg-[#fbfaf9]">
        <div className="container mx-auto max-w-2xl px-4 py-10">
          <h1 className="mb-2 text-3xl font-bold text-[#37322f]">Resultats</h1>
          <p className="mb-8 text-[#605a57]">Psychomoteur Psy0 AF Cadet</p>

          <div className="mb-6 rounded-xl border border-[#e0dedb] bg-white p-6 text-center">
            <div className="text-5xl font-bold text-[#37322f]">
              {finalScore.overallPct}%
            </div>
            <p className="mt-2 text-sm text-[#605a57]">Score global</p>
          </div>

          <div className="mb-8 grid grid-cols-3 gap-3">
            {[
              ['Suivi', finalScore.trackingPct],
              ['Formes', finalScore.shapePct],
              ['Calculs', finalScore.calcPct],
            ].map(([label, pct]) => (
              <div
                key={label as string}
                className="rounded-xl border border-[#e0dedb] bg-white p-4 text-center"
              >
                <div className="text-2xl font-semibold text-[#37322f]">{pct}%</div>
                <div className="text-xs text-[#605a57]">{label}</div>
              </div>
            ))}
          </div>

          {perfEntries.length > 0 && (
            <div className="mb-8 rounded-xl border border-[#e0dedb] bg-white p-4">
              <MiniPerformanceChart
                entries={perfEntries}
                exerciseId="psychomoteur-psy0"
              />
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button className="flex-1 gap-2" onClick={startGame}>
              <RotateCcw className="h-4 w-4" />
              Rejouer
            </Button>
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={() => router.push('/')}
            >
              <Home className="h-4 w-4" />
              Accueil
            </Button>
          </div>
        </div>
      </main>
    );
  }

  // ---- PLAYING ----
  const offset = -(scrollX % CALC_SLOT_WIDTH);
  const firstVisible = Math.max(0, Math.floor(scrollX / CALC_SLOT_WIDTH) - 1);
  const visibleEqs = equations.slice(firstVisible, firstVisible + 8);

  return (
    <main
      className="fixed inset-0 flex flex-col select-none"
      style={{ backgroundColor: BG }}
    >
      {/* Tracking arena */}
      <div className="relative flex-[50] min-h-0">
        <div
          className="absolute"
          style={{
            left: `${pos.x}%`,
            top: `${pos.y}%`,
            transform: 'translate(-50%, -50%)',
            width: 'min(22vmin, 120px)',
            height: 'min(22vmin, 120px)',
          }}
        >
          <div className="flex h-full w-full flex-col items-center">
            <DirectionBadge direction={moveDir} ok={trackingOk} />
            <div
              className="flex flex-1 items-center justify-center rounded-full"
              style={{ border: `2px solid ${BLUE}`, width: '80%', aspectRatio: '1' }}
            >
              <SymbolGlyph id={circleSymbol} size={48} />
            </div>
          </div>
        </div>
        <div className="absolute right-3 top-3 rounded bg-black/10 px-2 py-1 text-xs font-medium text-[#37322f]">
          {mm}:{ss}
        </div>
      </div>

      {/* Symbols + equations */}
      <div className="flex flex-[20] min-h-0 items-center gap-2 px-2">
        <div
          className="flex h-[10vmin] w-[10vmin] shrink-0 items-center justify-center rounded-lg"
          style={{ border: `1.5px dashed ${BLUE}` }}
        >
          <SymbolGlyph id={boxSymbol} size={36} />
        </div>
        <div className="relative h-full flex-1 overflow-hidden">
          <div
            className="absolute inset-y-0 flex items-center"
            style={{
              left: offset - CALC_SLOT_WIDTH,
              gap: 0,
            }}
          >
            {visibleEqs.map((eq, i) => {
              const globalIdx = firstVisible + i;
              const isActive = globalIdx === activeIdx;
              return (
                <div
                  key={eq.id}
                  className="flex shrink-0 items-center justify-center px-2 font-bold"
                  style={{
                    width: CALC_SLOT_WIDTH,
                    height: '10vmin',
                    fontSize: '2.2vmin',
                    border: isActive ? `1.5px solid ${ORANGE}` : '1.5px solid transparent',
                    borderRadius: isActive ? 12 : 0,
                    backgroundColor: isActive ? 'rgba(245,158,11,0.12)' : 'transparent',
                    color: '#1f1f1f',
                  }}
                >
                  {eq.left} = {eq.right}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Keys */}
      <div className="flex flex-[18] min-h-0 items-center gap-4 px-4">
        <button
          type="button"
          onClick={handleSpace}
          className="rounded-xl px-6 py-2 text-lg font-semibold text-white shadow"
          style={{
            backgroundColor:
              spaceFlash === 'ok'
                ? '#16a34a'
                : spaceFlash === 'bad'
                  ? '#dc2626'
                  : BLUE,
          }}
        >
          ESPACE
        </button>
        <button
          type="button"
          onClick={handleF}
          className="rounded-xl px-5 py-2 text-lg font-semibold text-white shadow"
          style={{
            backgroundColor:
              fFlash === 'ok'
                ? '#16a34a'
                : fFlash === 'bad'
                  ? '#dc2626'
                  : ORANGE,
          }}
        >
          F
        </button>
        <div className="ml-auto hidden text-xs text-[#444] sm:block">
          Maintenez ↑ ↓ ← → · Espace = formes · F = calcul faux
        </div>
      </div>

      {/* Chrono bar */}
      <div className="flex flex-[8] items-center px-[10%]">
        <div className="h-3 w-full overflow-hidden rounded-sm bg-[#8a8a8a]">
          <div
            className="h-full"
            style={{
              width: `${progress * 100}%`,
              backgroundColor: '#D60000',
            }}
          />
        </div>
      </div>
    </main>
  );
}

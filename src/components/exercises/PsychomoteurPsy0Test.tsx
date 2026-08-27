'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { savePerformanceResult, loadEntries } from '@/lib/core/PerformanceTracker';
import { MiniPerformanceChart } from '@/components/PerformanceChart';
import { ClassScoreBlock } from '@/components/ClassScoreBlock';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft,
  Play,
  RotateCcw,
  Home,
  Settings,
  ArrowUp,
  ArrowDown,
  ArrowLeft as ArrowLeftIcon,
  ArrowRight,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { PhoneDpad, type PhoneDir } from '@/components/phone/PhoneDpad';
import { usePhoneLayout } from '@/components/phone/PhoneLayout';

// ============================================================================
// Types
// ============================================================================

type GameState = 'menu' | 'settings' | 'playing' | 'results';
type Direction = 'up' | 'down' | 'left' | 'right';

interface GameSettings {
  durationMin: number;
  moveSpeed: number; // % of arena per second
  shapeIntervalSec: number;
  calcStepIntervalSec: number; // seconds between each calc slide
  shapeMatchProb: number; // 0-100
}

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
}

// ============================================================================
// Constants
// ============================================================================

const SETTINGS_KEY = 'aviatest-psychomoteur-psy0-settings';

const DEFAULT_SETTINGS: GameSettings = {
  durationMin: 5,
  moveSpeed: 12, // ~Pilotest pace (% / s)
  shapeIntervalSec: 4,
  calcStepIntervalSec: 2.5, // one equation step, like Pilotest
  shapeMatchProb: 35,
};

const DIR_HOLD_MS_MIN = 2800;
const DIR_HOLD_MS_MAX = 6500;
const CALC_SLOT_WIDTH = 160;
const CALC_SLIDE_MS = 1000; // Pilotest numerical_slider transition ~1s
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

function loadSettings(): GameSettings {
  if (typeof window === 'undefined') return { ...DEFAULT_SETTINGS };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<GameSettings> & {
      calcScrollSpeed?: number;
    };
    // Drop legacy continuous-scroll setting if present
    const rest = { ...parsed };
    delete rest.calcScrollSpeed;
    const migrated: GameSettings = { ...DEFAULT_SETTINGS, ...rest };
    if (parsed.calcStepIntervalSec == null) {
      migrated.calcStepIntervalSec = DEFAULT_SETTINGS.calcStepIntervalSec;
    }
    return migrated;
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

function otherDir(current: Direction): Direction {
  return pick(DIRECTIONS.filter((d) => d !== current));
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
  const b = randInt(2, 12);
  const q = randInt(2, 15);
  return { op: '/', a: b * q, b, value: q };
}

let eqId = 1;
function makeEquation(forceCorrect?: boolean): Equation {
  const left = makeSide();
  const wantCorrect = forceCorrect ?? Math.random() < 0.55;
  let right = makeSide(true);
  if (wantCorrect) {
    const target = Math.round(left.value);
    if (Math.random() < 0.4) {
      right = { a: target, value: target };
    } else if (Math.random() < 0.5) {
      const b = randInt(1, 15);
      right = { op: '-', a: target + b, b, value: target };
    } else {
      const b = randInt(1, 12);
      right = { op: '+', a: target - b, b, value: target };
    }
  } else {
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
  return {
    id: eqId++,
    left: formatSide(left),
    right: formatSide(right),
    isCorrect: Math.round(left.value) === Math.round(right.value),
  };
}

function SymbolGlyph({ id, size = 40 }: { id: SymbolId; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 100 100', fill: BLUE } as const;
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
          {[31, 44, 66, 79, 66, 44].map((cy, i) => (
            <circle
              key={i}
              cx={[50, 72, 72, 50, 28, 28][i]}
              cy={cy}
              r="5"
              fill={BLUE}
              stroke="none"
            />
          ))}
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
      <Icon
        className="h-5 w-5"
        style={{ color: ok ? '#22c55e' : 'white' }}
        strokeWidth={3}
      />
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

export default function PsychomoteurPsy0Test() {
  const router = useRouter();
  const phone = usePhoneLayout();
  const [gameState, setGameState] = useState<GameState>('menu');
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [pos, setPos] = useState({ x: 50, y: 50 });
  const [moveDir, setMoveDir] = useState<Direction>('right');
  const [heldDir, setHeldDir] = useState<Direction | null>(null);
  const [circleSymbol, setCircleSymbol] = useState<SymbolId>('crown');
  const [boxSymbol, setBoxSymbol] = useState<SymbolId>('infinity');
  const [equations, setEquations] = useState<Equation[]>(() =>
    Array.from({ length: 24 }, () => makeEquation())
  );
  const [activeIdx, setActiveIdx] = useState(0);
  const [spaceFlash, setSpaceFlash] = useState<'ok' | 'bad' | null>(null);
  const [fFlash, setFFlash] = useState<'ok' | 'bad' | null>(null);
  const [finalScore, setFinalScore] = useState<FinalScore | null>(null);

  const settingsRef = useRef(settings);
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
  const activeIdxRef = useRef(0);
  const nextCalcAtRef = useRef(0);
  const circleSymRef = useRef<SymbolId>('crown');
  const boxSymRef = useRef<SymbolId>('infinity');
  const playingRef = useRef(false);
  const perfSavedRef = useRef(false);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  useEffect(() => {
    settingsRef.current = settings;
    saveSettings(settings);
  }, [settings]);

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
      shapeTotal > 0 ? Math.round((s.shapeHits / shapeTotal) * 1000) / 10 : 100;
    const calcTotal = s.calcHits + s.calcMisses + s.calcFalseAlarms;
    const calcPct =
      calcTotal > 0 ? Math.round((s.calcHits / calcTotal) * 1000) / 10 : 100;
    const overallPct = Math.round(((trackingPct + shapePct + calcPct) / 3) * 10) / 10;
    setFinalScore({ trackingPct, shapePct, calcPct, overallPct });
    setGameState('results');
  }, []);

  const spawnShapes = useCallback(() => {
    if (pendingShapeMatchRef.current && !shapeAnsweredRef.current) {
      statsRef.current.shapeMisses += 1;
    }
    shapeAnsweredRef.current = false;
    setSpaceFlash(null);
    const match = Math.random() * 100 < settingsRef.current.shapeMatchProb;
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
      const cfg = settingsRef.current;
      const durationMs = cfg.durationMin * 60 * 1000;

      const elapsed = ts - startRef.current;
      setElapsedMs(elapsed);
      if (elapsed >= durationMs) {
        finishGame();
        return;
      }

      if (ts >= dirUntilRef.current) {
        const next = otherDir(moveDirRef.current);
        moveDirRef.current = next;
        setMoveDir(next);
        dirUntilRef.current = ts + randInt(DIR_HOLD_MS_MIN, DIR_HOLD_MS_MAX);
      }

      // moveSpeed is %/s → convert to %/ms
      const speed = (cfg.moveSpeed / 1000) * dt;
      let { x, y } = posRef.current;
      const dir = moveDirRef.current;
      if (dir === 'up') y -= speed;
      if (dir === 'down') y += speed;
      if (dir === 'left') x -= speed;
      if (dir === 'right') x += speed;

      if (x < 10) {
        x = 10;
        moveDirRef.current = 'right';
        setMoveDir('right');
        dirUntilRef.current = ts + randInt(DIR_HOLD_MS_MIN, DIR_HOLD_MS_MAX);
      } else if (x > 90) {
        x = 90;
        moveDirRef.current = 'left';
        setMoveDir('left');
        dirUntilRef.current = ts + randInt(DIR_HOLD_MS_MIN, DIR_HOLD_MS_MAX);
      }
      if (y < 12) {
        y = 12;
        moveDirRef.current = 'down';
        setMoveDir('down');
        dirUntilRef.current = ts + randInt(DIR_HOLD_MS_MIN, DIR_HOLD_MS_MAX);
      } else if (y > 88) {
        y = 88;
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

      if (ts >= nextShapeAtRef.current) {
        spawnShapes();
        nextShapeAtRef.current = ts + cfg.shapeIntervalSec * 1000;
      }

      if (ts >= nextCalcAtRef.current) {
        const prev = equationsRef.current[activeIdxRef.current];
        if (prev && !prev.isCorrect && !calcAnsweredRef.current) {
          statsRef.current.calcMisses += 1;
        }
        calcAnsweredRef.current = false;
        setFFlash(null);
        const idx = activeIdxRef.current + 1;
        activeIdxRef.current = idx;
        setActiveIdx(idx);
        nextCalcAtRef.current = ts + cfg.calcStepIntervalSec * 1000;
        if (idx + 10 >= equationsRef.current.length) {
          const extra = Array.from({ length: 20 }, () => makeEquation());
          equationsRef.current = [...equationsRef.current, ...extra];
          setEquations(equationsRef.current);
        }
      }

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
    activeIdxRef.current = 0;
    equationsRef.current = Array.from({ length: 30 }, () => makeEquation());
    setEquations(equationsRef.current);
    setPos({ x: 50, y: 50 });
    setMoveDir(moveDirRef.current);
    setHeldDir(null);
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
    nextShapeAtRef.current = now + settingsRef.current.shapeIntervalSec * 1000;
    nextCalcAtRef.current = now + settingsRef.current.calcStepIntervalSec * 1000;
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
    // Keep flash until next symbol change (cleared in spawnShapes)
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
    // Keep flash until next calc step (cleared when activeIdx advances)
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
  const durationMs = settings.durationMin * 60 * 1000;
  const progress = Math.min(1, elapsedMs / durationMs);
  const remainingSec = Math.max(0, Math.ceil((durationMs - elapsedMs) / 1000));
  const mm = String(Math.floor(remainingSec / 60));
  const ss = String(remainingSec % 60).padStart(2, '0');

  // ---- MENU ----
  if (gameState === 'menu') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#fbfaf9] p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Psychomoteur Psy0 AF Cadet</CardTitle>
            <CardDescription>
              Multi-taches : suivi du cercle, formes et calculs faux
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2 rounded-lg bg-[#f7f5f3] p-4 text-sm text-[#605a57]">
              <p>
                <strong>Fleches</strong> : maintenez la fleche dans le sens du
                cercle (vert = correct).
              </p>
              <p>
                <strong>Espace</strong> : formes identiques (cercle = encart
                pointille).
              </p>
              <p>
                <strong>F</strong> : le calcul encadre orange est faux.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-[#f7f5f3] p-3">
                <p className="text-xl font-bold text-[#37322f]">
                  {settings.durationMin}m
                </p>
                <p className="text-xs text-[#605a57]">Duree</p>
              </div>
              <div className="rounded-lg bg-[#f7f5f3] p-3">
                <p className="text-xl font-bold text-[#37322f]">
                  {settings.moveSpeed}
                </p>
                <p className="text-xs text-[#605a57]">Vitesse cercle</p>
              </div>
              <div className="rounded-lg bg-[#f7f5f3] p-3">
                <p className="text-xl font-bold text-[#37322f]">
                  {settings.shapeIntervalSec}s
                </p>
                <p className="text-xs text-[#605a57]">Formes</p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Button size="lg" className="w-full" onClick={startGame}>
                <Play className="mr-2 h-5 w-5" /> Jouer
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="w-full"
                onClick={() => setGameState('settings')}
              >
                <Settings className="mr-2 h-5 w-5" /> Paramètres
              </Button>
              <Button
                variant="ghost"
                size="lg"
                className="w-full"
                onClick={() => router.push('/')}
              >
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
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#fbfaf9] p-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Paramètres</CardTitle>
            <CardDescription>Ajustez le rythme a votre niveau</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-5">
              <div>
                <Label>Duree : {settings.durationMin} min</Label>
                <Slider
                  value={[settings.durationMin]}
                  onValueChange={([v]) =>
                    setSettings((s) => ({ ...s, durationMin: v }))
                  }
                  min={1}
                  max={10}
                  step={1}
                  className="mt-2"
                />
              </div>
              <div>
                <Label>
                  Vitesse du cercle : {settings.moveSpeed} %/s
                </Label>
                <p className="mt-0.5 text-xs text-[#605a57]">
                  Defaut 12 (proche Pilotest). Plus bas = plus lent.
                </p>
                <Slider
                  value={[settings.moveSpeed]}
                  onValueChange={([v]) =>
                    setSettings((s) => ({ ...s, moveSpeed: v }))
                  }
                  min={5}
                  max={30}
                  step={1}
                  className="mt-2"
                />
              </div>
              <div>
                <Label>
                  Intervalle des formes : {settings.shapeIntervalSec}s
                </Label>
                <Slider
                  value={[settings.shapeIntervalSec]}
                  onValueChange={([v]) =>
                    setSettings((s) => ({ ...s, shapeIntervalSec: v }))
                  }
                  min={2}
                  max={8}
                  step={0.5}
                  className="mt-2"
                />
              </div>
              <div>
                <Label>
                  Intervalle des calculs : {settings.calcStepIntervalSec}s
                </Label>
                <Slider
                  value={[settings.calcStepIntervalSec]}
                  onValueChange={([v]) =>
                    setSettings((s) => ({ ...s, calcStepIntervalSec: v }))
                  }
                  min={1.5}
                  max={5}
                  step={0.25}
                  className="mt-2"
                />
              </div>
              <div>
                <Label>
                  Probabilite de formes identiques : {settings.shapeMatchProb}%
                </Label>
                <Slider
                  value={[settings.shapeMatchProb]}
                  onValueChange={([v]) =>
                    setSettings((s) => ({ ...s, shapeMatchProb: v }))
                  }
                  min={15}
                  max={60}
                  step={5}
                  className="mt-2"
                />
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setSettings({ ...DEFAULT_SETTINGS })}
              >
                Reinitialiser les defauts
              </Button>
              <Button
                size="lg"
                className="w-full"
                onClick={() => setGameState('menu')}
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Retour
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---- RESULTS ----
  if (gameState === 'results' && finalScore) {
    const perfEntries = loadEntries('psychomoteur-psy0');
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#fbfaf9] p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">Résultats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <ClassScoreBlock
              exerciseId={'psychomoteur-psy0'}
              percent={finalScore.overallPct}
            />
            <div className="grid grid-cols-3 gap-3">
              {[
                ['Suivi', finalScore.trackingPct],
                ['Formes', finalScore.shapePct],
                ['Calculs', finalScore.calcPct],
              ].map(([label, pct]) => (
                <div
                  key={label as string}
                  className="rounded-lg bg-[#f7f5f3] p-4 text-center"
                >
                  <p className="text-2xl font-bold text-[#37322f]">{pct}%</p>
                  <p className="text-xs text-[#605a57]">{label}</p>
                </div>
              ))}
            </div>

            {perfEntries.length >= 2 && (
              <div className="border-t pt-4">
                <p className="mb-2 text-center text-sm font-medium text-[#605a57]">
                  Progression
                </p>
                <div className="flex justify-center">
                  <MiniPerformanceChart
                    entries={perfEntries}
                    exerciseId="psychomoteur-psy0"
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <Button size="lg" className="w-full" onClick={startGame}>
                <RotateCcw className="mr-2 h-5 w-5" /> Rejouer
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="w-full"
                onClick={() => setGameState('menu')}
              >
                <ArrowLeft className="mr-2 h-5 w-5" /> Menu
              </Button>
              <Button
                variant="ghost"
                size="lg"
                className="w-full"
                onClick={() => router.push('/')}
              >
                <Home className="mr-2 h-5 w-5" /> Accueil
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---- PLAYING ----
  return (
    <main
      className="fixed inset-0 flex select-none flex-col"
      style={{ backgroundColor: BG }}
    >
      <div className="relative min-h-0 flex-[50]">
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
              style={{
                border: `2px solid ${BLUE}`,
                width: '80%',
                aspectRatio: '1',
              }}
            >
              <SymbolGlyph id={circleSymbol} size={48} />
            </div>
          </div>
        </div>
        <div className="absolute right-3 top-3 rounded bg-black/10 px-2 py-1 text-xs font-medium text-[#37322f]">
          {mm}:{ss}
        </div>
      </div>

      {phone && (
        <div className="flex justify-center py-2">
          <PhoneDpad
            held={heldDir}
            onHold={(dir: PhoneDir | null) => {
              heldDirRef.current = dir;
              setHeldDir(dir);
            }}
          />
        </div>
      )}

      <div className="flex min-h-0 flex-[20] items-center gap-2 px-2">
        <div
          className="flex h-[10vmin] w-[10vmin] shrink-0 items-center justify-center rounded-lg"
          style={{ border: `1.5px dashed ${BLUE}` }}
        >
          <SymbolGlyph id={boxSymbol} size={36} />
        </div>
        <div className="relative h-full flex-1 overflow-hidden">
          {/* Fixed highlight frame (Pilotest-style): active equation sits here */}
          <div
            className="pointer-events-none absolute inset-y-0 z-10"
            style={{
              left: 0,
              width: CALC_SLOT_WIDTH,
              border: `1.5px solid ${ORANGE}`,
              borderRadius: 12,
              backgroundColor: 'rgba(245,158,11,0.12)',
              height: '10vmin',
              top: '50%',
              transform: 'translateY(-50%)',
            }}
          />
          <div
            className="absolute inset-y-0 flex items-center"
            style={{
              transform: `translateX(${-activeIdx * CALC_SLOT_WIDTH}px)`,
              transition: `transform ${CALC_SLIDE_MS}ms ease`,
              left: 0,
            }}
          >
            {equations.map((eq) => {
              return (
                <div
                  key={eq.id}
                  className="flex shrink-0 items-center justify-center px-2 font-bold"
                  style={{
                    width: CALC_SLOT_WIDTH,
                    height: '10vmin',
                    fontSize: '2.2vmin',
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

      <div className={`flex min-h-0 items-center gap-3 px-4 ${phone ? 'flex-[22]' : 'flex-[18]'}`}>
        <button
          type="button"
          onClick={handleSpace}
          className={`rounded-xl text-lg font-semibold text-white shadow ${phone ? 'h-14 flex-1' : 'px-6 py-2'}`}
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
          className={`rounded-xl text-lg font-semibold text-white shadow ${phone ? 'h-14 flex-1' : 'px-5 py-2'}`}
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

      <div className="flex flex-[8] items-center px-[10%]">
        <div className="h-3 w-full overflow-hidden rounded-sm bg-[#8a8a8a]">
          <div
            className="h-full"
            style={{ width: `${progress * 100}%`, backgroundColor: '#D60000' }}
          />
        </div>
      </div>
    </main>
  );
}

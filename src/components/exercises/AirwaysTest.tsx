'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { savePerformanceResult, loadEntries } from '@/lib/core/PerformanceTracker';
import { MiniPerformanceChart } from '@/components/PerformanceChart';
import { ClassScoreBlock } from '@/components/ClassScoreBlock';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Play, RotateCcw, Home, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Switch } from '@/components/ui/switch';
import { usePhoneLayout } from '@/components/phone/PhoneLayout';

// ============================================================================
// Types & constants (Pilotest airways visual + rules)
// ============================================================================

type GameState = 'menu' | 'settings' | 'playing' | 'results';
/** Fin de planche en attente du bouton Suivant (entrainement uniquement). */
type BoardEnd = 'accident' | 'success';

interface GameSettings {
  numSeries: number;
  stepMs: number; // plane advance interval
  examMode: boolean;
  /** Deux teintes aleatoires (gauche / droite) pour tout le test. */
  changingColors: boolean;
}

interface Plane {
  id: number;
  line: number;
  col: number;
  color: 'blue' | 'purple'; // blue → left, purple → right
}

interface SeriesStats {
  increment: number;
  accidents: number;
  survived: boolean;
}

type ColorPalette = { left: string; right: string };
type ActionId = 'b_basic' | 'p_basic' | 'b_panic' | 'p_panic';

const EXERCISE_ID = 'airways';
const SETTINGS_KEY = 'aviatest-airways-settings';
const BG = '#d4d4d4';
const PURPLE = '#683B95';
const BLUE = '#6FC4E6';
const DEFAULT_PALETTE: ColorPalette = { left: BLUE, right: PURPLE };
const COLOR_POOL = [
  '#6FC4E6',
  '#683B95',
  '#0f766e',
  '#f59e0b',
  '#2563eb',
  '#be123c',
  '#16a34a',
  '#c2410c',
  '#4c1d95',
  '#0e7490',
  '#ca8a04',
  '#9a3412',
  '#1d4ed8',
  '#831843',
];
const GREY_ZONE = 'rgba(169,169,169,0.5)';
const ACCIDENT = 'orange';
const SERIES_STEPS = 48;
/** White ✕ on colored line buttons — same idea as Pilotest background_cross */
const CROSS_BG =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cline x1='28' y1='28' x2='72' y2='72' stroke='white' stroke-width='10' stroke-linecap='round'/%3E%3Cline x1='72' y1='28' x2='28' y2='72' stroke='white' stroke-width='10' stroke-linecap='round'/%3E%3C/svg%3E\")";

const LINES = 12;
const COLS = 27;
const GREY_WIDTH = 6;
const MAX_BLUE_GREY = 2;
const MAX_TOTAL_GREY = 4;

const DEFAULT_SETTINGS: GameSettings = {
  numSeries: 10,
  stepMs: 700,
  examMode: false,
  changingColors: false,
};

/** Inclusive grey band [lo, hi] — Pilotest grey_range style */
type GreyRange = [number, number];
/**
 * Pilotest can "split" an area's grey zone: first 3 lines vs last 3 lines
 * of the area may be offset by 1–2 columns (zone scindée).
 */
type GreyPair = { first: GreyRange; second: GreyRange };

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

function lineColor(line: number): 'blue' | 'purple' {
  return line % 2 === 0 ? 'blue' : 'purple';
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
  return { left: a, right: b };
}

function svgFill(hex: string): string {
  return hex.replace('#', '%23');
}

function planeSvg(color: 'blue' | 'purple', pal: ColorPalette): string {
  const fill = svgFill(color === 'blue' ? pal.left : pal.right);
  const path =
    color === 'blue' ? "M90,10 L10,50 L90,90 Z" : "M10,10 L90,50 L10,90 Z";
  return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cpath d='${path}' fill='${fill}'/%3E%3C/svg%3E")`;
}

function clampGreyLo(lo: number): number {
  const maxLo = COLS - GREY_WIDTH - 2;
  return Math.max(2, Math.min(lo, Math.max(2, maxLo)));
}

function rangeFromLo(lo: number): GreyRange {
  const c = clampGreyLo(lo);
  return [c, c + GREY_WIDTH - 1];
}

function randomGreyRange(): GreyRange {
  const maxLo = COLS - GREY_WIDTH - 2;
  const lo = 2 + Math.floor(Math.random() * Math.max(1, maxLo - 1));
  return rangeFromLo(lo);
}

/** ~50% solid rectangle; otherwise second half offset by ±1 or ±2 cols. */
function randomGreyPair(): GreyPair {
  const first = randomGreyRange();
  if (Math.random() < 0.45) {
    return { first, second: first };
  }
  const delta = (Math.random() < 0.5 ? -1 : 1) * (1 + Math.floor(Math.random() * 2));
  return { first, second: rangeFromLo(first[0] + delta) };
}

function inGrey(col: number, range: GreyRange): boolean {
  return col >= range[0] && col <= range[1];
}

function areaOf(line: number): 0 | 1 {
  return line < 6 ? 0 : 1;
}

/** Grey band for a given line (Pilotest: area split into two groups of 3). */
function greyRangeForLine(line: number, top: GreyPair, bot: GreyPair): GreyRange {
  const pair = areaOf(line) === 0 ? top : bot;
  return line % 6 < 3 ? pair.first : pair.second;
}

/** Criteria tab aligns on the second half (matches Pilotest left/right %). */
function criteriaRange(pair: GreyPair): GreyRange {
  return pair.second;
}

/**
 * Pilotest: chaque couleur circule sur 6 lignes, mais seules 3 sont
 * deroutables via petite croix — bleus en haut a droite, violets en bas a gauche.
 * Petite croix = action `_basic` ; grosse croix = `_panic` (les 6 lignes).
 */
const BLUE_DIVERT_LINES = [0, 2, 4] as const;
const PURPLE_DIVERT_LINES = [7, 9, 11] as const;

function isDivertableLine(line: number): boolean {
  return line % 2 === 0
    ? (BLUE_DIVERT_LINES as readonly number[]).includes(line)
    : (PURPLE_DIVERT_LINES as readonly number[]).includes(line);
}

interface SpawnEvent {
  step: number;
  line: number;
}

function strategyClosedLines(
  smallMask: number,
  panicBlue: boolean,
  panicPurple: boolean,
): boolean[] {
  const closed = Array(LINES).fill(false);
  if (panicBlue) {
    for (let i = 0; i < LINES; i++) {
      if (lineColor(i) === 'blue') closed[i] = true;
    }
  } else {
    BLUE_DIVERT_LINES.forEach((line, i) => {
      if (smallMask & (1 << i)) closed[line] = true;
    });
  }
  if (panicPurple) {
    for (let i = 0; i < LINES; i++) {
      if (lineColor(i) === 'purple') closed[i] = true;
    }
  } else {
    PURPLE_DIVERT_LINES.forEach((line, i) => {
      if (smallMask & (1 << (i + 3))) closed[line] = true;
    });
  }
  return closed;
}

function pressFromStrategy(
  smallMask: number,
  panicBlue: boolean,
  panicPurple: boolean,
): ActionId[] {
  const press: ActionId[] = [];
  if (panicBlue) press.push('b_panic');
  else {
    for (let i = 0; i < 3; i++) if (smallMask & (1 << i)) press.push('b_basic');
  }
  if (panicPurple) press.push('p_panic');
  else {
    for (let i = 0; i < 3; i++) if (smallMask & (1 << (i + 3))) press.push('p_basic');
  }
  return press;
}

function boardSurvivesWithClosed(
  spawns: SpawnEvent[],
  nSteps: number,
  closed: boolean[],
  top: GreyPair,
  bot: GreyPair,
): boolean {
  let planes: Plane[] = [];
  for (let step = 1; step <= nSteps; step++) {
    planes = planes
      .map((p) =>
        p.color === 'blue' ? { ...p, col: p.col - 1 } : { ...p, col: p.col + 1 },
      )
      .filter((p) => p.col >= 0 && p.col < COLS && !closed[p.line]);
    for (const s of spawns) {
      if (s.step !== step || closed[s.line]) continue;
      const color = lineColor(s.line);
      const col = color === 'blue' ? COLS - 1 : 0;
      if (!planes.some((p) => p.line === s.line && p.col === col)) {
        planes.push({ id: step * 100 + s.line, line: s.line, col, color });
      }
    }
    for (const area of [0, 1] as const) {
      let blue = 0;
      let total = 0;
      for (const p of planes) {
        if (areaOf(p.line) !== area) continue;
        if (!inGrey(p.col, greyRangeForLine(p.line, top, bot))) continue;
        total += 1;
        if (p.color === 'blue') blue += 1;
      }
      if (blue > MAX_BLUE_GREY || total > MAX_TOTAL_GREY) return false;
    }
  }
  return true;
}

function extraActions(player: ActionId[], optimal: ActionId[]): number {
  const bag = [...player];
  for (const a of optimal) {
    const i = bag.indexOf(a);
    if (i >= 0) bag.splice(i, 1);
  }
  return bag.length;
}

/** Pilotest: 1 pt si actions = strat optimale, -0.5 par action en trop, 0 si accident. */
function seriesIncrement(
  player: ActionId[],
  optimal: ActionId[],
  survived: boolean,
): number {
  if (!survived) return 0;
  return Math.max(1 - extraActions(player, optimal) / 2, 0);
}

function optimalPressForBoard(
  spawns: SpawnEvent[],
  nSteps: number,
  top: GreyPair,
  bot: GreyPair,
): ActionId[] {
  let best: ActionId[] | null = null;
  const consider = (
    mask: number,
    panicBlue: boolean,
    panicPurple: boolean,
  ) => {
    const press = pressFromStrategy(mask, panicBlue, panicPurple);
    if (best && press.length >= best.length) return;
    const closed = strategyClosedLines(mask, panicBlue, panicPurple);
    if (boardSurvivesWithClosed(spawns, nSteps, closed, top, bot)) best = press;
  };
  for (let mask = 0; mask < 64; mask++) consider(mask, false, false);
  for (let m = 0; m < 8; m++) consider(m << 3, true, false);
  for (let m = 0; m < 8; m++) consider(m, false, true);
  consider(0, true, true);
  return best ?? [];
}

// ============================================================================
// Component
// ============================================================================

export default function AirwaysTest() {
  const router = useRouter();
  const phone = usePhoneLayout();
  const [gameState, setGameState] = useState<GameState>('menu');
  const [settings, setSettings] = useState<GameSettings>(loadSettings);
  const [planes, setPlanes] = useState<Plane[]>([]);
  const [seriesIndex, setSeriesIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [accident, setAccident] = useState(false);
  const [boardEnd, setBoardEnd] = useState<BoardEnd | null>(null);
  const [endIncrement, setEndIncrement] = useState(0);
  const [palette, setPalette] = useState<ColorPalette>(DEFAULT_PALETTE);
  const [seriesStats, setSeriesStats] = useState<SeriesStats[]>([]);
  const [greyTop, setGreyTop] = useState<GreyPair>(() => {
    const r: GreyRange = [10, 15];
    return { first: r, second: r };
  });
  const [greyBot, setGreyBot] = useState<GreyPair>(() => {
    const r: GreyRange = [10, 15];
    return { first: r, second: r };
  });
  /** Lines closed for the current series (Pilotest: small/big btn one-shot clear). */
  const [closedLines, setClosedLines] = useState<boolean[]>(() =>
    Array(LINES).fill(false),
  );
  const planesRef = useRef<Plane[]>([]);
  const scoreRef = useRef(0);
  const accidentRef = useRef(false);
  const boardEndRef = useRef<BoardEnd | null>(null);
  const pendingEntryRef = useRef<SeriesStats | null>(null);
  const seriesIndexRef = useRef(0);
  const settingsRef = useRef(settings);
  const planeIdRef = useRef(1);
  const playingRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepsRef = useRef(0);
  const seriesStatsRef = useRef<SeriesStats[]>([]);
  const greyTopRef = useRef<GreyPair>(greyTop);
  const greyBotRef = useRef<GreyPair>(greyBot);
  const closedLinesRef = useRef<boolean[]>(Array(LINES).fill(false));
  const spawnLogRef = useRef<SpawnEvent[]>([]);
  const playerActionsRef = useRef<ActionId[]>([]);
  const paletteRef = useRef<ColorPalette>(DEFAULT_PALETTE);
  const perfSavedRef = useRef(false);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    planesRef.current = planes;
  }, [planes]);

  const stopLoop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    playingRef.current = false;
  }, []);

  const countGrey = useCallback((list: Plane[], area: 0 | 1) => {
    const top = greyTopRef.current;
    const bot = greyBotRef.current;
    let blue = 0;
    let total = 0;
    for (const p of list) {
      if (areaOf(p.line) !== area) continue;
      const range = greyRangeForLine(p.line, top, bot);
      if (!inGrey(p.col, range)) continue;
      total += 1;
      if (p.color === 'blue') blue += 1;
    }
    return { blue, total };
  }, []);

  const finishAll = useCallback(
    (stats: SeriesStats[]) => {
      stopLoop();
      setSeriesStats(stats);
      setGameState('results');
      if (!perfSavedRef.current) {
        perfSavedRef.current = true;
        const totalScore = stats.reduce((a, s) => a + s.increment, 0);
        savePerformanceResult(
          EXERCISE_ID,
          Math.round(totalScore * 2),
          stats.length * 2,
        );
      }
    },
    [stopLoop]
  );

  const startNextSeries = useCallback(
    (nextIndex: number, prevStats: SeriesStats[]) => {
      if (nextIndex >= settingsRef.current.numSeries) {
        finishAll(prevStats);
        return;
      }
      seriesIndexRef.current = nextIndex;
      setSeriesIndex(nextIndex);
      setAccident(false);
      accidentRef.current = false;
      boardEndRef.current = null;
      pendingEntryRef.current = null;
      setBoardEnd(null);
      planesRef.current = [];
      setPlanes([]);
      const opened = Array(LINES).fill(false);
      closedLinesRef.current = opened;
      setClosedLines(opened);
      playerActionsRef.current = [];
      stepsRef.current = 0;
      spawnLogRef.current = [];
      // Move grey zones each series; sometimes one area is "scindée" (Pilotest)
      const top = randomGreyPair();
      const bot = randomGreyPair();
      greyTopRef.current = top;
      greyBotRef.current = bot;
      setGreyTop(top);
      setGreyBot(bot);
      setGameState('playing');
      playingRef.current = true;
    },
    [finishAll]
  );

  /** Termine la planche : correction + Suivant en entrainement, auto en examen. */
  const endBoard = useCallback(
    (kind: BoardEnd) => {
      if (boardEndRef.current) return;
      boardEndRef.current = kind;
      if (kind === 'accident') {
        accidentRef.current = true;
        setAccident(true);
      }
      stopLoop();
      playingRef.current = false;

      const survived = kind === 'success';
      const optimal = optimalPressForBoard(
        spawnLogRef.current,
        stepsRef.current,
        greyTopRef.current,
        greyBotRef.current,
      );
      const increment = seriesIncrement(
        playerActionsRef.current,
        optimal,
        survived,
      );
      const entry: SeriesStats = {
        increment,
        accidents: survived ? 0 : 1,
        survived,
      };
      pendingEntryRef.current = entry;

      if (settingsRef.current.examMode) {
        const next = [...seriesStatsRef.current, entry];
        seriesStatsRef.current = next;
        setSeriesStats(next);
        scoreRef.current += increment;
        setScore(scoreRef.current);
        boardEndRef.current = null;
        pendingEntryRef.current = null;
        accidentRef.current = false;
        setAccident(false);
        setBoardEnd(null);
        setTimeout(
          () => startNextSeries(seriesIndexRef.current + 1, next),
          500,
        );
      } else {
        setEndIncrement(increment);
        setBoardEnd(kind);
      }
    },
    [startNextSeries, stopLoop],
  );

  const tick = useCallback(() => {
    if (!playingRef.current || boardEndRef.current) return;
    let list = planesRef.current.map((p) => ({ ...p }));

    list = list
      .map((p) => {
        if (p.color === 'blue') return { ...p, col: p.col - 1 };
        return { ...p, col: p.col + 1 };
      })
      .filter((p) => p.col >= 0 && p.col < COLS);

    const step = stepsRef.current + 1;
    const trySpawn = (prob: number) => {
      if (Math.random() >= prob) return;
      const openLines = Array.from({ length: LINES }, (_, i) => i).filter(
        (l) => !closedLinesRef.current[l],
      );
      if (openLines.length === 0) return;
      const line = openLines[Math.floor(Math.random() * openLines.length)];
      const color = lineColor(line);
      const col = color === 'blue' ? COLS - 1 : 0;
      if (!list.some((p) => p.line === line && p.col === col)) {
        list.push({
          id: planeIdRef.current++,
          line,
          col,
          color,
        });
        spawnLogRef.current.push({ step, line });
      }
    };
    trySpawn(0.55);
    trySpawn(0.25);

    planesRef.current = list;
    setPlanes(list);
    stepsRef.current = step;

    for (const area of [0, 1] as const) {
      const { blue, total } = countGrey(list, area);
      if (blue > MAX_BLUE_GREY || total > MAX_TOTAL_GREY) {
        endBoard('accident');
        return;
      }
    }

    if (stepsRef.current >= SERIES_STEPS) {
      endBoard('success');
    }
  }, [countGrey, endBoard]);

  // Relancer la boucle a chaque nouvelle planche (seriesIndex).
  // Sans ca, apres stopLoop en fin de serie le gameState reste "playing"
  // et l'intervalle n'est jamais recree → plus aucun avion.
  useEffect(() => {
    if (gameState !== 'playing' || boardEnd) return;
    playingRef.current = true;
    const id = setInterval(tick, settingsRef.current.stepMs);
    intervalRef.current = id;
    return () => {
      clearInterval(id);
      if (intervalRef.current === id) intervalRef.current = null;
    };
  }, [gameState, boardEnd, seriesIndex, tick]);

  const maybeEndIfNoActionsLeft = useCallback(
    (closed: boolean[]) => {
      if (closed.every(Boolean)) {
        endBoard('success');
      }
    },
    [endBoard],
  );

  const closeLine = useCallback(
    (line: number) => {
      // Pilotest petite croix : 1 ligne = 1 deroutement
      if (boardEndRef.current || !playingRef.current) return;
      if (!isDivertableLine(line) || closedLinesRef.current[line]) return;

      const nextClosed = closedLinesRef.current.slice();
      nextClosed[line] = true;
      closedLinesRef.current = nextClosed;
      setClosedLines(nextClosed);
      playerActionsRef.current.push(
        lineColor(line) === 'blue' ? 'b_basic' : 'p_basic',
      );
      const next = planesRef.current.filter((p) => p.line !== line);
      planesRef.current = next;
      setPlanes(next);
      maybeEndIfNoActionsLeft(nextClosed);
    },
    [maybeEndIfNoActionsLeft],
  );

  const closeAllColor = useCallback(
    (color: 'blue' | 'purple') => {
      // Pilotest grosse croix : les 6 lignes de la couleur = 6 deroutements
      if (boardEndRef.current || !playingRef.current) return;

      const nextClosed = closedLinesRef.current.slice();
      let newly = 0;
      for (let line = 0; line < LINES; line++) {
        if (lineColor(line) === color && !nextClosed[line]) {
          nextClosed[line] = true;
          newly += 1;
        }
      }
      if (newly === 0) return;

      closedLinesRef.current = nextClosed;
      setClosedLines(nextClosed);
      playerActionsRef.current.push(
        color === 'blue' ? 'b_panic' : 'p_panic',
      );
      const next = planesRef.current.filter((p) => p.color !== color);
      planesRef.current = next;
      setPlanes(next);
      maybeEndIfNoActionsLeft(nextClosed);
    },
    [maybeEndIfNoActionsLeft],
  );

  const startGame = useCallback(() => {
    saveSettings(settings);
    perfSavedRef.current = false;
    scoreRef.current = 0;
    setScore(0);
    const pal = settings.changingColors
      ? pickRandomPalette()
      : DEFAULT_PALETTE;
    paletteRef.current = pal;
    setPalette(pal);
    seriesStatsRef.current = [];
    setSeriesStats([]);
    planeIdRef.current = 1;
    startNextSeries(0, []);
    playingRef.current = true;
    setGameState('playing');
  }, [settings, startNextSeries]);

  const onSuivant = useCallback(() => {
    const entry = pendingEntryRef.current;
    if (!entry) return;
    const next = [...seriesStatsRef.current, entry];
    seriesStatsRef.current = next;
    setSeriesStats(next);
    scoreRef.current += entry.increment;
    setScore(scoreRef.current);
    pendingEntryRef.current = null;
    boardEndRef.current = null;
    accidentRef.current = false;
    setAccident(false);
    setBoardEnd(null);
    startNextSeries(seriesIndexRef.current + 1, next);
  }, [startNextSeries]);

  const criteria = useMemo(() => {
    const top = countGrey(planes, 0);
    const bot = countGrey(planes, 1);
    return { top, bot };
  }, [planes, countGrey]);

  // ---- MENU ----
  if (gameState === 'menu') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fbfaf9] p-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Airways</CardTitle>
            <CardDescription>
              Deroutez le moins d&apos;avions possible (petites croix = une
              ligne, grosse croix = les 6 lignes d&apos;une couleur). Score
              Pilotest : 1 pt par planche reussie, -0,5 par action en trop, 0
              si accident. Fluidite : max 2 avions &quot;gauche&quot; / 4
              avions dans chaque zone grise. {settings.numSeries} series.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {settings.examMode && (
              <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Mode examen : pas de correction entre les planches.
              </p>
            )}
            {settings.changingColors && (
              <p className="rounded-md bg-sky-50 px-3 py-2 text-sm text-sky-800">
                Couleurs changeantes — palette aleatoire pour tout le test
              </p>
            )}
            <Button size="lg" className="w-full" onClick={startGame}>
              <Play className="mr-2 h-5 w-5" /> Commencer
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onClick={() => setGameState('settings')}
            >
              <Settings className="mr-2 h-5 w-5" /> Parametres
            </Button>
            <Button
              variant="ghost"
              size="lg"
              className="w-full"
              onClick={() => router.push('/')}
            >
              <ArrowLeft className="mr-2 h-5 w-5" /> Retour
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (gameState === 'settings') {
    return (
      <div className="flex min-h-screen items-center justify-center p-4" style={{ backgroundColor: BG }}>
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Parametres — Airways</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label>Series : {settings.numSeries}</Label>
              <Slider
                value={[settings.numSeries]}
                onValueChange={([v]) =>
                  setSettings((s) => ({ ...s, numSeries: v }))
                }
                min={3}
                max={10}
                step={1}
                className="mt-2"
              />
            </div>
            <div>
              <Label>Vitesse (ms / case) : {settings.stepMs}</Label>
              <Slider
                value={[settings.stepMs]}
                onValueChange={([v]) =>
                  setSettings((s) => ({ ...s, stepMs: v }))
                }
                min={400}
                max={1200}
                step={50}
                className="mt-2"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Mode examen</Label>
                <p className="mt-0.5 text-xs text-[#605a57]">
                  Pas de correction entre les planches
                </p>
              </div>
              <Switch
                checked={settings.examMode}
                onCheckedChange={(v) =>
                  setSettings((s) => ({ ...s, examMode: v }))
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Couleurs changeantes</Label>
                <p className="mt-0.5 text-xs text-[#605a57]">
                  Deux teintes aleatoires pour tout le test
                </p>
              </div>
              <Switch
                checked={settings.changingColors}
                onCheckedChange={(v) =>
                  setSettings((s) => ({ ...s, changingColors: v }))
                }
              />
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setSettings({ ...DEFAULT_SETTINGS });
                saveSettings(DEFAULT_SETTINGS);
              }}
            >
              Reinitialiser les defauts
            </Button>
            <Button
              className="w-full"
              onClick={() => {
                saveSettings(settings);
                setGameState('menu');
              }}
            >
              Retour
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (gameState === 'results') {
    const survived = seriesStats.filter((s) => s.survived).length;
    const totalScore = seriesStats.reduce((a, s) => a + s.increment, 0);
    const percent =
      seriesStats.length > 0 ? Math.round((totalScore / seriesStats.length) * 100) : 0;
    const perfEntries = loadEntries(EXERCISE_ID);
    return (
      <div className="flex min-h-screen items-center justify-center p-4" style={{ backgroundColor: BG }}>
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Résultats — Airways</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ClassScoreBlock
              exerciseId={EXERCISE_ID}
              percent={percent}
              detail={`${totalScore} / ${seriesStats.length} pts · ${survived} séries sans accident`}
            />
            <MiniPerformanceChart exerciseId={EXERCISE_ID} entries={perfEntries} />
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
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---- PLAYING ----
  const cellW = `${100 / COLS}%`;
  /** Pilotest small btn width ≈ (2 * 100) / COLS % of the grid */
  const lineBtnW = `${(200) / COLS}%`;
  const allPurpleClosed = Array.from({ length: LINES }, (_, i) => i).every(
    (l) => lineColor(l) !== 'purple' || closedLines[l],
  );
  const allBlueClosed = Array.from({ length: LINES }, (_, i) => i).every(
    (l) => lineColor(l) !== 'blue' || closedLines[l],
  );
  const topCrit = criteriaRange(greyTop);
  const botCrit = criteriaRange(greyBot);
  /** Criteria % relative to the center grid only (Pilotest left/right style). */
  const topCriteriaStyle: React.CSSProperties = {
    left: `${(100 * topCrit[0]) / COLS}%`,
    width: `${(100 * GREY_WIDTH) / COLS}%`,
  };
  const botCriteriaStyle: React.CSSProperties = {
    left: `${(100 * botCrit[0]) / COLS}%`,
    width: `${(100 * GREY_WIDTH) / COLS}%`,
  };

  const triangle = (color: 'blue' | 'purple', flip?: boolean) => (
    <span
      className="inline-block text-[1.1em] leading-none"
      style={{
        color: color === 'blue' ? palette.left : palette.right,
        transform: flip ? 'scaleX(-1)' : undefined,
      }}
      aria-hidden
    >
      ▶
    </span>
  );

  return (
    <main
      className="fixed inset-0 flex select-none flex-col"
      style={{ backgroundColor: BG }}
    >
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-2 py-2">
        <div
          className="flex w-[min(96vw,1100px)] items-stretch"
          style={{ height: '78vmin' }}
        >
          <button
            type="button"
            disabled={!!boardEnd || allPurpleClosed}
            onClick={() => closeAllColor('purple')}
            className={`flex shrink-0 items-center justify-center self-stretch rounded-l-2xl shadow disabled:cursor-not-allowed disabled:opacity-65 ${phone ? 'w-14 min-w-14' : 'w-[6%]'}`}
            style={{
              backgroundColor: palette.right,
              marginTop: '11vmin',
              marginBottom: '11vmin',
            }}
            title="Fermer toutes les lignes violettes"
          >
            <span className="text-2xl text-white">✕</span>
          </button>

          {/* Center column: criteria tabs + grid (criteria % align on grid only) */}
          <div className="mx-[1%] flex min-w-0 flex-1 flex-col">
            <div className="relative w-full" style={{ height: '11vmin' }}>
              <div
                className="absolute bottom-0 flex overflow-hidden border-2 border-b-0 border-gray-500 bg-[#f5f5f5] shadow"
                style={{
                  ...topCriteriaStyle,
                  height: '10vmin',
                  borderRadius: '2.2vmin 2.2vmin 0 0',
                  fontSize: '2.1vmin',
                }}
              >
                <div
                  className="flex flex-1 items-center justify-center gap-1 border-r-2 border-gray-500 font-semibold"
                  style={{ color: palette.left }}
                >
                  {criteria.top.blue}/{MAX_BLUE_GREY} {triangle('blue', true)}
                </div>
                <div
                  className="flex flex-1 items-center justify-center gap-0.5 font-semibold"
                  style={{ color: palette.right }}
                >
                  {criteria.top.total}/{MAX_TOTAL_GREY}
                  {triangle('blue', true)}
                  {triangle('purple')}
                </div>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col justify-around rounded-md bg-white p-1 shadow">
              {[0, 1].map((area) => (
                <div
                  key={area}
                  className="flex flex-[1] flex-col justify-around py-0.5"
                >
                  {Array.from({ length: 6 }, (_, i) => {
                    const line = area * 6 + i;
                    const color = lineColor(line);
                    const range = greyRangeForLine(line, greyTop, greyBot);
                    const isClosed = closedLines[line];
                    const showSmallBtn = isDivertableLine(line);
                    return (
                      <div
                        key={line}
                        className="relative flex flex-1 border border-solid border-gray-400"
                        style={{ minHeight: 0 }}
                      >
                        {showSmallBtn && color === 'purple' && (
                          <button
                            type="button"
                            disabled={!!boardEnd || isClosed}
                            onClick={() => closeLine(line)}
                            className="absolute bottom-0 left-0 top-0 z-20 flex items-center justify-center border-2 border-transparent text-white disabled:cursor-not-allowed disabled:opacity-65"
                            style={{
                              width: lineBtnW,
                              backgroundColor: palette.right,
                              backgroundImage: CROSS_BG,
                              backgroundSize: 'contain',
                              backgroundRepeat: 'no-repeat',
                              backgroundPosition: 'center',
                            }}
                            title={
                              isClosed ? 'Ligne fermee' : 'Fermer cette ligne'
                            }
                          />
                        )}
                        {showSmallBtn && color === 'blue' && (
                          <button
                            type="button"
                            disabled={!!boardEnd || isClosed}
                            onClick={() => closeLine(line)}
                            className="absolute bottom-0 right-0 top-0 z-20 flex items-center justify-center border-2 border-transparent text-white disabled:cursor-not-allowed disabled:opacity-65"
                            style={{
                              width: lineBtnW,
                              backgroundColor: palette.left,
                              backgroundImage: CROSS_BG,
                              backgroundSize: 'contain',
                              backgroundRepeat: 'no-repeat',
                              backgroundPosition: 'center',
                            }}
                            title={
                              isClosed ? 'Ligne fermee' : 'Fermer cette ligne'
                            }
                          />
                        )}
                        {Array.from({ length: COLS }, (_, col) => {
                          const grey = inGrey(col, range);
                          const plane =
                            !isClosed &&
                            planes.find(
                              (p) => p.line === line && p.col === col,
                            );
                          const bg =
                            accident && grey
                              ? ACCIDENT
                              : grey
                                ? GREY_ZONE
                                : 'transparent';
                          return (
                            <div
                              key={col}
                              className="relative h-full"
                              style={{
                                width: cellW,
                                backgroundColor: bg,
                                borderLeft:
                                  col === 0
                                    ? undefined
                                    : '1px dashed #9ca3af',
                              }}
                            >
                              {plane && (
                                <div
                                  className="absolute inset-[8%]"
                                  style={{
                                    backgroundImage: planeSvg(
                                      plane.color,
                                      palette,
                                    ),
                                    backgroundSize: 'contain',
                                    backgroundRepeat: 'no-repeat',
                                    backgroundPosition: 'center',
                                  }}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="relative w-full" style={{ height: '11vmin' }}>
              <div
                className="absolute top-0 flex overflow-hidden border-2 border-t-0 border-gray-500 bg-[#f5f5f5] shadow"
                style={{
                  ...botCriteriaStyle,
                  height: '10vmin',
                  borderRadius: '0 0 2.2vmin 2.2vmin',
                  fontSize: '2.1vmin',
                }}
              >
                <div
                  className="flex flex-1 items-center justify-center gap-1 border-r-2 border-gray-500 font-semibold"
                  style={{ color: palette.left }}
                >
                  {criteria.bot.blue}/{MAX_BLUE_GREY} {triangle('blue', true)}
                </div>
                <div
                  className="flex flex-1 items-center justify-center gap-0.5 font-semibold"
                  style={{ color: palette.right }}
                >
                  {criteria.bot.total}/{MAX_TOTAL_GREY}
                  {triangle('blue', true)}
                  {triangle('purple')}
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={!!boardEnd || allBlueClosed}
            onClick={() => closeAllColor('blue')}
            className={`flex shrink-0 items-center justify-center self-stretch rounded-r-2xl shadow disabled:cursor-not-allowed disabled:opacity-65 ${phone ? 'w-14 min-w-14' : 'w-[6%]'}`}
            style={{
              backgroundColor: palette.left,
              marginTop: '11vmin',
              marginBottom: '11vmin',
            }}
            title="Fermer toutes les lignes bleues"
          >
            <span className="text-2xl text-white">✕</span>
          </button>
        </div>

        {/* Score + fin de planche (correction + Suivant hors examen) */}
        <div className="mt-2 w-[min(96vw,1100px)]">
          {boardEnd === 'accident' ? (
            <div
              className="flex items-center justify-between gap-4 rounded-lg px-5 py-3 text-lg font-semibold shadow"
              style={{ backgroundColor: ACCIDENT }}
            >
              <span className="flex-1 text-center text-[#37322f]">
                ⚠ Accident ! 0 pt sur cette planche
              </span>
              <Button
                size="lg"
                className="shrink-0 bg-[#2563eb] text-white hover:bg-[#1d4ed8]"
                onClick={onSuivant}
              >
                Suivant
              </Button>
            </div>
          ) : boardEnd === 'success' ? (
            <div className="flex items-center justify-between gap-4 rounded-lg bg-emerald-100 px-5 py-3 text-lg font-semibold text-emerald-900 shadow">
              <span className="flex-1 text-center">
                {endIncrement === 1
                  ? 'Strategie parfaite, Ben Smith lui meme n\'aurait pas fait mieux ! · 1 pt'
                  : `Ca passe mais vous auriez pu supprimer moins de fleches ! · ${endIncrement} pt`}
              </span>
              <Button
                size="lg"
                className="shrink-0 bg-[#2563eb] text-white hover:bg-[#1d4ed8]"
                onClick={onSuivant}
              >
                Suivant
              </Button>
            </div>
          ) : (
            <div className="text-base text-[#37322f]">
              {score} / {seriesIndex} → {settings.numSeries}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

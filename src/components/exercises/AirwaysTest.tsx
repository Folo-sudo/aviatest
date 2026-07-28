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

// ============================================================================
// Types & constants (Pilotest airways visual + rules)
// ============================================================================

type GameState = 'menu' | 'settings' | 'playing' | 'results';

interface GameSettings {
  numSeries: number;
  stepMs: number; // plane advance interval
}

interface Plane {
  id: number;
  line: number;
  col: number;
  color: 'blue' | 'purple'; // blue → left, purple → right
}

interface SeriesStats {
  diverted: number;
  accidents: number;
  survived: boolean;
}

const EXERCISE_ID = 'airways';
const SETTINGS_KEY = 'aviatest-airways-settings';
const BG = '#d4d4d4';
const PURPLE = 'rgb(104, 59, 149)';
const BLUE = 'rgb(111, 196, 230)';
const GREY_ZONE = 'rgba(169,169,169,0.5)';
const ACCIDENT = 'orange';
const SERIES_STEPS = 48;

const LINES = 12;
const COLS = 27;
const GREY_START = 10;
const GREY_END = 16; // exclusive
const MAX_BLUE_GREY = 2;
const MAX_TOTAL_GREY = 4;

const DEFAULT_SETTINGS: GameSettings = {
  numSeries: 10,
  stepMs: 700,
};

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
  // Alternate: even = blue (←), odd = purple (→) — matches Pilotest b_line / p_line mix
  return line % 2 === 0 ? 'blue' : 'purple';
}

function inGrey(col: number): boolean {
  return col >= GREY_START && col < GREY_END;
}

function areaOf(line: number): 0 | 1 {
  return line < 6 ? 0 : 1;
}

// ============================================================================
// Component
// ============================================================================

export default function AirwaysTest() {
  const router = useRouter();
  const [gameState, setGameState] = useState<GameState>('menu');
  const [settings, setSettings] = useState<GameSettings>(loadSettings);
  const [planes, setPlanes] = useState<Plane[]>([]);
  const [seriesIndex, setSeriesIndex] = useState(0);
  const [diverted, setDiverted] = useState(0);
  const [accident, setAccident] = useState(false);
  const [seriesStats, setSeriesStats] = useState<SeriesStats[]>([]);
  const planesRef = useRef<Plane[]>([]);
  const divertedRef = useRef(0);
  const accidentRef = useRef(false);
  const seriesIndexRef = useRef(0);
  const settingsRef = useRef(settings);
  const planeIdRef = useRef(1);
  const playingRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const seriesDivertedStartRef = useRef(0);
  const stepsRef = useRef(0);
  const seriesStatsRef = useRef<SeriesStats[]>([]);
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
    let blue = 0;
    let total = 0;
    for (const p of list) {
      if (areaOf(p.line) !== area) continue;
      if (!inGrey(p.col)) continue;
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
        // Score: series without accident, penalize heavy diverting lightly
        const survived = stats.filter((s) => s.survived).length;
        savePerformanceResult(EXERCISE_ID, survived, stats.length);
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
      planesRef.current = [];
      setPlanes([]);
      seriesDivertedStartRef.current = divertedRef.current;
      stepsRef.current = 0;
      setGameState('playing');
      playingRef.current = true;
    },
    [finishAll]
  );

  const triggerAccident = useCallback(() => {
    if (accidentRef.current) return;
    accidentRef.current = true;
    setAccident(true);
    stopLoop();
  }, [stopLoop]);

  const tick = useCallback(() => {
    if (!playingRef.current || accidentRef.current) return;
    let list = planesRef.current.map((p) => ({ ...p }));

    list = list
      .map((p) => {
        if (p.color === 'blue') return { ...p, col: p.col - 1 };
        return { ...p, col: p.col + 1 };
      })
      .filter((p) => p.col >= 0 && p.col < COLS);

    if (Math.random() < 0.55) {
      const line = Math.floor(Math.random() * LINES);
      const color = lineColor(line);
      const col = color === 'blue' ? COLS - 1 : 0;
      if (!list.some((p) => p.line === line && p.col === col)) {
        list.push({
          id: planeIdRef.current++,
          line,
          col,
          color,
        });
      }
    }
    if (Math.random() < 0.25) {
      const line = Math.floor(Math.random() * LINES);
      const color = lineColor(line);
      const col = color === 'blue' ? COLS - 1 : 0;
      if (!list.some((p) => p.line === line && p.col === col)) {
        list.push({
          id: planeIdRef.current++,
          line,
          col,
          color,
        });
      }
    }

    planesRef.current = list;
    setPlanes(list);
    stepsRef.current += 1;

    for (const area of [0, 1] as const) {
      const { blue, total } = countGrey(list, area);
      if (blue > MAX_BLUE_GREY || total > MAX_TOTAL_GREY) {
        triggerAccident();
        return;
      }
    }

    if (stepsRef.current >= SERIES_STEPS) {
      stopLoop();
      const divertedThis =
        divertedRef.current - seriesDivertedStartRef.current;
      const entry: SeriesStats = {
        diverted: divertedThis,
        accidents: 0,
        survived: true,
      };
      const next = [...seriesStatsRef.current, entry];
      seriesStatsRef.current = next;
      setSeriesStats(next);
      setTimeout(() => startNextSeries(seriesIndexRef.current + 1, next), 600);
    }
  }, [countGrey, startNextSeries, stopLoop, triggerAccident]);

  useEffect(() => {
    if (gameState !== 'playing' || accident) return;
    intervalRef.current = setInterval(tick, settingsRef.current.stepMs);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [gameState, accident, tick]);

  const divertLine = useCallback((line: number) => {
    if (accidentRef.current || !playingRef.current) return;
    const color = lineColor(line);
    const before = planesRef.current.length;
    const next = planesRef.current.filter(
      (p) => !(p.line === line && p.color === color)
    );
    const removed = before - next.length;
    if (removed > 0) {
      divertedRef.current += removed;
      setDiverted(divertedRef.current);
      planesRef.current = next;
      setPlanes(next);
    }
  }, []);

  const divertAll = useCallback((color: 'blue' | 'purple') => {
    if (accidentRef.current || !playingRef.current) return;
    const before = planesRef.current.length;
    const next = planesRef.current.filter((p) => p.color !== color);
    const removed = before - next.length;
    if (removed > 0) {
      divertedRef.current += removed;
      setDiverted(divertedRef.current);
      planesRef.current = next;
      setPlanes(next);
    }
  }, []);

  const startGame = useCallback(() => {
    saveSettings(settings);
    perfSavedRef.current = false;
    divertedRef.current = 0;
    setDiverted(0);
    seriesStatsRef.current = [];
    setSeriesStats([]);
    planeIdRef.current = 1;
    startNextSeries(0, []);
    playingRef.current = true;
    setGameState('playing');
  }, [settings, startNextSeries]);

  const onSuivantAfterAccident = useCallback(() => {
    const divertedThis =
      divertedRef.current - seriesDivertedStartRef.current;
    const entry: SeriesStats = {
      diverted: divertedThis,
      accidents: 1,
      survived: false,
    };
    const next = [...seriesStatsRef.current, entry];
    seriesStatsRef.current = next;
    setSeriesStats(next);
    accidentRef.current = false;
    setAccident(false);
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
      <div className="flex min-h-screen items-center justify-center p-4" style={{ backgroundColor: BG }}>
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Airways</CardTitle>
            <CardDescription>
              Deroutez le moins d&apos;avions possible tout en respectant la
              fluidite (max 2 bleus / 4 avions dans chaque zone grise).{' '}
              {settings.numSeries} series.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
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
    const totalDiverted = seriesStats.reduce((a, s) => a + s.diverted, 0);
    const perfEntries = loadEntries(EXERCISE_ID);
    return (
      <div className="flex min-h-screen items-center justify-center p-4" style={{ backgroundColor: BG }}>
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Resultats — Airways</CardTitle>
            <CardDescription>
              {survived} / {seriesStats.length} series sans accident ·{' '}
              {totalDiverted} deroutements
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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

  return (
    <main
      className="fixed inset-0 flex select-none flex-col"
      style={{ backgroundColor: BG }}
    >
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-2 py-2">
        {/* Top criteria (area 0) */}
        <div
          className="mb-1 flex w-[min(96vw,1100px)] justify-center gap-0"
          style={{ height: '4.5vmin' }}
        >
          <div
            className="flex flex-1 items-center justify-center rounded-t-xl border-2 border-b-0 border-gray-500 bg-white text-sm font-semibold shadow"
            style={{ color: BLUE }}
          >
            {criteria.top.blue}/{MAX_BLUE_GREY}{' '}
            <span className="ml-1 inline-block" style={{ transform: 'scaleX(-1)' }}>
              ▶
            </span>
          </div>
          <div
            className="flex flex-1 items-center justify-center rounded-t-xl border-2 border-b-0 border-l-0 border-gray-500 bg-white text-sm font-semibold shadow"
            style={{ color: PURPLE }}
          >
            {criteria.top.total}/{MAX_TOTAL_GREY} ▶
          </div>
        </div>

        <div className="flex w-[min(96vw,1100px)] items-stretch" style={{ height: '70vmin' }}>
          {/* Big purple divert (all purple) */}
          <button
            type="button"
            disabled={accident}
            onClick={() => divertAll('purple')}
            className="flex w-[6%] shrink-0 items-center justify-center rounded-l-2xl shadow disabled:cursor-not-allowed disabled:opacity-65"
            style={{ backgroundColor: PURPLE }}
            title="Derouter tous les violets"
          >
            <span className="text-2xl text-white">✕</span>
          </button>

          {/* Grid */}
          <div className="mx-[1%] flex min-w-0 flex-1 flex-col justify-around rounded-md bg-white p-1 shadow">
            {[0, 1].map((area) => (
              <div key={area} className="flex flex-[1] flex-col justify-around py-0.5">
                {Array.from({ length: 6 }, (_, i) => {
                  const line = area * 6 + i;
                  const color = lineColor(line);
                  return (
                    <div
                      key={line}
                      className="relative flex flex-1 border border-gray-400"
                      style={{ minHeight: 0 }}
                    >
                      {/* small divert btn */}
                      {color === 'purple' ? (
                        <button
                          type="button"
                          disabled={accident}
                          onClick={() => divertLine(line)}
                          className="absolute bottom-0 left-0 top-0 z-10 w-[3.2%] disabled:opacity-65"
                          style={{ backgroundColor: PURPLE }}
                        />
                      ) : (
                        <button
                          type="button"
                          disabled={accident}
                          onClick={() => divertLine(line)}
                          className="absolute bottom-0 right-0 top-0 z-10 w-[3.2%] disabled:opacity-65"
                          style={{ backgroundColor: BLUE }}
                        />
                      )}
                      {Array.from({ length: COLS }, (_, col) => {
                        const grey = inGrey(col);
                        const plane = planes.find(
                          (p) => p.line === line && p.col === col
                        );
                        const bg = accident && grey ? ACCIDENT : grey ? GREY_ZONE : 'transparent';
                        return (
                          <div
                            key={col}
                            className="relative h-full"
                            style={{
                              width: cellW,
                              backgroundColor: bg,
                            }}
                          >
                            {plane && (
                              <div
                                className="absolute inset-[8%]"
                                style={{
                                  backgroundImage:
                                    plane.color === 'blue'
                                      ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cpath d='M90,10 L10,50 L90,90 Z' fill='%236FC4E6'/%3E%3C/svg%3E")`
                                      : `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cpath d='M10,10 L90,50 L10,90 Z' fill='%23683B95'/%3E%3C/svg%3E")`,
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

          {/* Big blue divert */}
          <button
            type="button"
            disabled={accident}
            onClick={() => divertAll('blue')}
            className="flex w-[6%] shrink-0 items-center justify-center rounded-r-2xl shadow disabled:cursor-not-allowed disabled:opacity-65"
            style={{ backgroundColor: BLUE }}
            title="Derouter tous les bleus"
          >
            <span className="text-2xl text-white">✕</span>
          </button>
        </div>

        {/* Bottom criteria (area 1) */}
        <div
          className="mt-1 flex w-[min(96vw,1100px)] justify-center gap-0"
          style={{ height: '4.5vmin' }}
        >
          <div
            className="flex flex-1 items-center justify-center rounded-b-xl border-2 border-t-0 border-gray-500 bg-white text-sm font-semibold shadow"
            style={{ color: BLUE }}
          >
            {criteria.bot.blue}/{MAX_BLUE_GREY}{' '}
            <span className="ml-1 inline-block" style={{ transform: 'scaleX(-1)' }}>
              ▶
            </span>
          </div>
          <div
            className="flex flex-1 items-center justify-center rounded-b-xl border-2 border-t-0 border-l-0 border-gray-500 bg-white text-sm font-semibold shadow"
            style={{ color: PURPLE }}
          >
            {criteria.bot.total}/{MAX_TOTAL_GREY} ▶
          </div>
        </div>

        <div className="mt-2 flex w-[min(96vw,1100px)] items-center justify-between text-sm text-[#37322f]">
          <span>
            {seriesIndex} / {diverted} → {settings.numSeries}
          </span>
          {accident && (
            <div className="flex items-center gap-3 rounded-md px-4 py-2 font-semibold shadow" style={{ backgroundColor: ACCIDENT }}>
              ⚠ Accident !
              <Button size="sm" onClick={onSuivantAfterAccident}>
                Suivant
              </Button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Scorer } from '@/lib/core/Scorer';
import { savePerformanceResult, loadEntries } from '@/lib/core/PerformanceTracker';
import { MiniPerformanceChart } from '@/components/PerformanceChart';
import { ClassScoreBlock } from '@/components/ClassScoreBlock';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Play, RotateCcw, Home, Settings, Check, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

// ============================================================================
// Types
// ============================================================================

type GameState = 'menu' | 'settings' | 'playing' | 'results';
type Phase = 'memorize' | 'probe' | 'feedback';
type Quadrant = 'HG' | 'HD' | 'BG' | 'BD';
type ItemType = 'letter' | 'digit';

interface GameSettings {
  numQuestions: number;
  memorizeMs: number;
  examMode: boolean;
}

interface ProbeData {
  quadrant: Quadrant;
  shownItem: string;
  correctAnswer: boolean;
}

interface SeriesData {
  items: Record<Quadrant, string>;
  itemType: ItemType;
  probes: ProbeData[];
}

interface ProbeResult {
  seriesIdx: number;
  probeIdx: number;
  probe: ProbeData;
  userAnswer: boolean | null;
  isCorrect: boolean;
  timeUsedMs: number;
}

// ============================================================================
// Constants
// ============================================================================

const SETTINGS_KEY = 'aviatest-attention-1-settings';

const DEFAULT_SETTINGS: GameSettings = {
  numQuestions: 10,
  memorizeMs: 5000,
  examMode: false,
};

const QUADRANTS: Quadrant[] = ['HG', 'HD', 'BG', 'BD'];
const QUADRANT_LABELS: Record<Quadrant, string> = {
  HG: 'Haut gauche',
  HD: 'Haut droite',
  BG: 'Bas gauche',
  BD: 'Bas droite',
};

const ALL_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'M', 'N', 'P', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y'];
const ALL_DIGITS = ['2', '3', '4', '5', '6', '7', '8', '9'];

const FEEDBACK_FLASH_MS = 900;

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

function flipCase(ch: string): string {
  const upper = ch.toUpperCase();
  const lower = ch.toLowerCase();
  if (upper === lower) return ch;
  return ch === upper ? lower : upper;
}

function sampleDistinct(pool: string[], count: number): string[] {
  return shuffle(pool).slice(0, count);
}

function generateSeries(): SeriesData {
  const itemType: ItemType = Math.random() < 0.5 ? 'letter' : 'digit';
  const pool = itemType === 'letter' ? ALL_LETTERS : ALL_DIGITS;
  const chosenBases = sampleDistinct(pool, 4);

  const items = {} as Record<Quadrant, string>;
  QUADRANTS.forEach((q, idx) => {
    let ch = chosenBases[idx];
    if (itemType === 'letter' && Math.random() < 0.5) ch = ch.toLowerCase();
    items[q] = ch;
  });

  const values = Object.values(items);

  const probes: ProbeData[] = [];
  const usedKeys = new Set<string>();
  let guard = 0;

  while (probes.length < 4 && guard < 80) {
    guard++;
    const truth = Math.random() < 0.5;
    const quadrant = pick(QUADRANTS);
    let shownItem: string;

    if (truth) {
      shownItem = items[quadrant];
    } else {
      const trapTypes: Array<'wrongQuadrant' | 'caseFlip' | 'foreign'> =
        itemType === 'letter' ? ['wrongQuadrant', 'caseFlip', 'foreign'] : ['wrongQuadrant', 'foreign'];
      const trapType = pick(trapTypes);

      if (trapType === 'caseFlip') {
        shownItem = flipCase(items[quadrant]);
        if (shownItem === items[quadrant]) continue;
      } else if (trapType === 'wrongQuadrant') {
        const others = QUADRANTS.filter((q) => q !== quadrant);
        const srcQ = pick(others);
        shownItem = items[srcQ];
        if (shownItem === items[quadrant]) continue;
      } else {
        const foreignPool = pool.filter((c) => !values.includes(c) && !values.includes(flipCase(c)));
        if (foreignPool.length === 0) continue;
        let ch = pick(foreignPool);
        if (itemType === 'letter' && Math.random() < 0.5) ch = ch.toLowerCase();
        shownItem = ch;
        if (shownItem === items[quadrant]) continue;
      }
    }

    const key = `${quadrant}:${shownItem}`;
    if (usedKeys.has(key)) continue;
    usedKeys.add(key);

    probes.push({ quadrant, shownItem, correctAnswer: shownItem === items[quadrant] });
  }

  while (probes.length < 4) {
    const quadrant = QUADRANTS[probes.length % 4];
    probes.push({ quadrant, shownItem: items[quadrant], correctAnswer: true });
  }

  return { items, itemType, probes };
}

function generateAllSeries(count: number): SeriesData[] {
  return Array.from({ length: count }, () => generateSeries());
}

// ============================================================================
// Component
// ============================================================================

export default function Attention1Test() {
  const router = useRouter();
  const [gameState, setGameState] = useState<GameState>('menu');
  const [settings, setSettings] = useState<GameSettings>({ ...DEFAULT_SETTINGS });
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const [scorer] = useState(() => new Scorer());

  useEffect(() => {
    setSettings(loadSettings());
    setSettingsLoaded(true);
  }, []);

  useEffect(() => {
    if (settingsLoaded) saveSettings(settings);
  }, [settings, settingsLoaded]);

  const [allSeries, setAllSeries] = useState<SeriesData[]>([]);
  const [seriesIdx, setSeriesIdx] = useState(0);
  const [probeIdx, setProbeIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('memorize');
  const [results, setResults] = useState<ProbeResult[]>([]);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [memorizePercent, setMemorizePercent] = useState(100);

  const seriesRef = useRef<SeriesData[]>([]);
  const seriesIdxRef = useRef(0);
  const probeIdxRef = useRef(0);
  const perfSavedRef = useRef(false);
  const probeStartRef = useRef(0);
  const memorizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const memorizeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lockedRef = useRef(false);

  seriesRef.current = allSeries;
  seriesIdxRef.current = seriesIdx;
  probeIdxRef.current = probeIdx;

  const clearAllTimers = useCallback(() => {
    if (memorizeTimeoutRef.current) {
      clearTimeout(memorizeTimeoutRef.current);
      memorizeTimeoutRef.current = null;
    }
    if (memorizeIntervalRef.current) {
      clearInterval(memorizeIntervalRef.current);
      memorizeIntervalRef.current = null;
    }
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => () => clearAllTimers(), [clearAllTimers]);

  const beginMemorizePhase = useCallback(() => {
    clearAllTimers();
    setPhase('memorize');
    setMemorizePercent(100);
    lockedRef.current = false;
    const duration = settingsRef.current.memorizeMs;
    const start = Date.now();
    memorizeIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      setMemorizePercent(Math.max(0, 100 - (elapsed / duration) * 100));
    }, 50);
    memorizeTimeoutRef.current = setTimeout(() => {
      if (memorizeIntervalRef.current) {
        clearInterval(memorizeIntervalRef.current);
        memorizeIntervalRef.current = null;
      }
      setPhase('probe');
      probeStartRef.current = Date.now();
    }, duration);
  }, [clearAllTimers]);

  const goToNext = useCallback(() => {
    const sIdx = seriesIdxRef.current;
    const pIdx = probeIdxRef.current;
    const series = seriesRef.current;

    if (pIdx + 1 < 4) {
      const nextP = pIdx + 1;
      probeIdxRef.current = nextP;
      setProbeIdx(nextP);
      setPhase('probe');
      setLastCorrect(null);
      probeStartRef.current = Date.now();
      return;
    }

    if (sIdx + 1 >= series.length) {
      clearAllTimers();
      setGameState('results');
      return;
    }

    const nextS = sIdx + 1;
    seriesIdxRef.current = nextS;
    setSeriesIdx(nextS);
    probeIdxRef.current = 0;
    setProbeIdx(0);
    setLastCorrect(null);
    beginMemorizePhase();
  }, [beginMemorizePhase, clearAllTimers]);

  const answerProbe = useCallback(
    (userAnswer: boolean) => {
      if (lockedRef.current) return;
      lockedRef.current = true;

      const timeUsed = Date.now() - probeStartRef.current;
      const series = seriesRef.current[seriesIdxRef.current];
      const probe = series.probes[probeIdxRef.current];
      const isCorrect = userAnswer === probe.correctAnswer;

      scorer.recordAnswer(isCorrect);
      setResults((prev) => [
        ...prev,
        {
          seriesIdx: seriesIdxRef.current,
          probeIdx: probeIdxRef.current,
          probe,
          userAnswer,
          isCorrect,
          timeUsedMs: timeUsed,
        },
      ]);

      if (settingsRef.current.examMode) {
        lockedRef.current = false;
        goToNext();
      } else {
        setLastCorrect(isCorrect);
        setPhase('feedback');
        feedbackTimeoutRef.current = setTimeout(() => {
          lockedRef.current = false;
          goToNext();
        }, FEEDBACK_FLASH_MS);
      }
    },
    [goToNext, scorer],
  );

  const startGame = useCallback(() => {
    scorer.reset();
    perfSavedRef.current = false;
    const series = generateAllSeries(settingsRef.current.numQuestions);
    setAllSeries(series);
    seriesRef.current = series;
    setSeriesIdx(0);
    seriesIdxRef.current = 0;
    setProbeIdx(0);
    probeIdxRef.current = 0;
    setResults([]);
    setLastCorrect(null);
    setGameState('playing');
    beginMemorizePhase();
  }, [beginMemorizePhase, scorer]);

  // =========================================================================
  // MENU
  // =========================================================================
  if (gameState === 'menu') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#fbfaf9] p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">Attention 1</CardTitle>
            <CardDescription className="mt-2 text-base">
              Memorisez la position de 4 elements puis repondez a des questions Oui/Non
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2 rounded-lg bg-[#f7f5f3] p-4 text-sm text-[#605a57]">
              <p>
                <strong>{settings.numQuestions} series</strong> a memoriser.
              </p>
              <p>
                Chaque serie affiche <strong>4 lettres ou chiffres</strong>, un dans chaque quadrant, pendant{' '}
                <strong>{(settings.memorizeMs / 1000).toFixed(1)}s</strong>.
              </p>
              <p>
                Attention, les lettres sont <strong>sensibles a la casse</strong> (« A » &ne; « a »).
              </p>
              <p>Ensuite, 4 questions vous demandent si un element etait bien present a un emplacement donne.</p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-[#f7f5f3] p-3">
                <p className="text-xl font-bold text-[#37322f]">{settings.numQuestions}</p>
                <p className="text-xs text-[#605a57]">Series</p>
              </div>
              <div className="rounded-lg bg-[#f7f5f3] p-3">
                <p className="text-xl font-bold text-[#37322f]">4</p>
                <p className="text-xs text-[#605a57]">Questions/serie</p>
              </div>
              <div className="rounded-lg bg-[#f7f5f3] p-3">
                <p className="text-xl font-bold text-[#37322f]">{(settings.memorizeMs / 1000).toFixed(1)}s</p>
                <p className="text-xs text-[#605a57]">Memorisation</p>
              </div>
            </div>

            {settings.examMode && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-center text-sm text-amber-700">
                Mode examen — pas de correction entre les questions
              </div>
            )}

            <div className="flex flex-col gap-3">
              <Button size="lg" className="w-full" onClick={startGame}>
                <Play className="mr-2 h-5 w-5" /> Jouer
              </Button>
              <Button variant="outline" size="lg" className="w-full" onClick={() => setGameState('settings')}>
                <Settings className="mr-2 h-5 w-5" /> Paramètres
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
            <CardTitle>Paramètres</CardTitle>
            <CardDescription>Ajustez le test a votre niveau</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-5">
              <div>
                <Label>Nombre de series : {settings.numQuestions}</Label>
                <Slider
                  value={[settings.numQuestions]}
                  onValueChange={([v]) => setSettings((s) => ({ ...s, numQuestions: v }))}
                  min={3}
                  max={25}
                  step={1}
                  className="mt-2"
                />
              </div>
              <div>
                <Label>Temps de memorisation : {(settings.memorizeMs / 1000).toFixed(1)}s</Label>
                <Slider
                  value={[settings.memorizeMs]}
                  onValueChange={([v]) => setSettings((s) => ({ ...s, memorizeMs: v }))}
                  min={3000}
                  max={8000}
                  step={500}
                  className="mt-2"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Mode examen</Label>
                  <p className="mt-0.5 text-xs text-[#605a57]">Pas de correction entre les questions. Les résultats s’affichent à la fin.</p>
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
    const scoreData = scorer.toJSON();
    const totalCorrect = results.filter((r) => r.isCorrect).length;
    const avgTime =
      results.length > 0
        ? Math.round((results.reduce((s, r) => s + r.timeUsedMs, 0) / results.length / 1000) * 10) / 10
        : 0;

    if (!perfSavedRef.current) {
      perfSavedRef.current = true;
      const avgMs = results.length > 0 ? results.reduce((s, r) => s + r.timeUsedMs, 0) / results.length : 0;
      savePerformanceResult('attention-1', scoreData.correct, allSeries.length * 4, avgMs);
    }

    const perfEntries = loadEntries('attention-1');

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#fbfaf9] p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">Résultats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <ClassScoreBlock
              exerciseId={'attention-1'}
              percent={scoreData.score}
              detail={`${totalCorrect}/${results.length} correctes`}
            />

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-blue-50 p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {totalCorrect}/{results.length}
                </p>
                <p className="text-sm text-blue-700">Correct</p>
              </div>
              <div className="rounded-lg bg-amber-50 p-4 text-center">
                <p className="text-2xl font-bold text-amber-600">{avgTime}s</p>
                <p className="text-sm text-amber-700">Temps moyen</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-[#37322f]">Detail par question :</p>
              <div className="max-h-64 space-y-1.5 overflow-y-auto">
                {results.map((r, i) => (
                  <div key={i} className="rounded bg-[#f7f5f3] px-3 py-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-[#605a57]">
                        S{r.seriesIdx + 1}.{r.probeIdx + 1}
                      </span>
                      <span className={r.isCorrect ? 'font-semibold text-green-600' : 'font-semibold text-red-600'}>
                        {r.isCorrect ? '\u2713' : '\u2717'} {r.userAnswer ? 'Oui' : 'Non'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      « {r.probe.shownItem} » en {QUADRANT_LABELS[r.probe.quadrant]} — reponse attendue :{' '}
                      {r.probe.correctAnswer ? 'Oui' : 'Non'}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {perfEntries.length >= 2 && (
              <div className="border-t pt-4">
                <p className="mb-2 text-center text-sm font-medium text-[#605a57]">Progression</p>
                <div className="flex justify-center">
                  <MiniPerformanceChart entries={perfEntries} exerciseId="attention-1" />
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
  const currentSeries = allSeries[seriesIdx];
  const currentProbe = currentSeries?.probes[probeIdx];

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#fbfaf9] p-4">
      <div className="w-full max-w-lg">
        <div className="mb-4 flex items-center justify-between">
          <Badge variant="outline" className="bg-white px-3 py-1 text-base">
            Serie {seriesIdx + 1} / {allSeries.length}
          </Badge>
          {phase !== 'memorize' && (
            <Badge variant="secondary" className="text-xs">
              Question {probeIdx + 1} / 4
            </Badge>
          )}
        </div>

        <Card className="py-8">
          <CardContent className="space-y-6">
            {phase === 'memorize' && currentSeries && (
              <>
                <p className="text-center text-sm text-[#605a57]">Memorisez la position de chaque element</p>
                <QuadrantGrid items={currentSeries.items} />
                <div className="mx-auto h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full bg-blue-500 transition-all duration-100"
                    style={{ width: `${memorizePercent}%` }}
                  />
                </div>
              </>
            )}

            {(phase === 'probe' || phase === 'feedback') && currentProbe && (
              <>
                <p className="text-center text-sm text-[#605a57]">
                  Cet element etait-il present a cet emplacement ?
                </p>
                <QuadrantGrid highlight={currentProbe.quadrant} highlightItem={currentProbe.shownItem} />

                {phase === 'feedback' ? (
                  <div className="flex flex-col items-center gap-2">
                    {lastCorrect ? (
                      <div className="flex items-center gap-2 rounded-full bg-green-100 px-6 py-3 text-green-700">
                        <Check className="h-6 w-6" />
                        <span className="text-lg font-bold">Correct !</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 rounded-full bg-red-100 px-6 py-3 text-red-700">
                        <X className="h-6 w-6" />
                        <span className="text-lg font-bold">
                          Incorrect — reponse : {currentProbe.correctAnswer ? 'Oui' : 'Non'}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex justify-center gap-4">
                    <Button size="lg" className="w-32 bg-green-600 hover:bg-green-700" onClick={() => answerProbe(true)}>
                      Oui
                    </Button>
                    <Button size="lg" variant="destructive" className="w-32" onClick={() => answerProbe(false)}>
                      Non
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============================================================================
// Quadrant grid display
// ============================================================================

function QuadrantGrid({
  items,
  highlight,
  highlightItem,
}: {
  items?: Record<Quadrant, string>;
  highlight?: Quadrant;
  highlightItem?: string;
}) {
  return (
    <div className="mx-auto grid h-64 w-64 grid-cols-2 grid-rows-2 gap-1 rounded-xl bg-slate-300 p-1">
      {QUADRANTS.map((q) => {
        const isHighlighted = highlight === q;
        const content = items ? items[q] : isHighlighted ? highlightItem : '';
        return (
          <div
            key={q}
            className={`flex items-center justify-center rounded-lg text-4xl font-bold transition-colors ${
              isHighlighted ? 'bg-amber-100 text-amber-800 ring-2 ring-amber-500' : 'bg-white text-slate-800'
            }`}
          >
            {content}
          </div>
        );
      })}
    </div>
  );
}

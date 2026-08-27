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
import { ArrowLeft, Play, RotateCcw, Home, ChevronRight, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { usePhoneLayout } from '@/components/phone/PhoneLayout';

// ============================================================================
// Types
// ============================================================================

type GameState = 'menu' | 'settings' | 'playing' | 'results';
type Rotation = 0 | 90 | 180 | 270;
type SymbolFamily = 'formes' | 'appareils' | 'mixte';
type BoardFamily = Exclude<SymbolFamily, 'mixte'>;
type DeviceId = 'tv' | 'radio' | 'camera' | 'camcorder' | 'monitor' | 'telephone';

interface Orientation {
  rot: Rotation;
  mirror: boolean;
}

interface GameSettings {
  numBoards: number;
  totalTimeSec: number;
  examMode: boolean;
  symbolFamily: SymbolFamily;
}

interface BoardData {
  family: BoardFamily;
  reference: Orientation | DeviceId;
  cells: Array<Orientation | DeviceId>;
  rows: number;
  cols: number;
  answer: number;
}

interface BoardResult {
  board: BoardData;
  userAnswer: number | null;
  isCorrect: boolean;
  timeUsedMs: number;
}

// ============================================================================
// Constants
// ============================================================================

const SETTINGS_KEY = 'aviatest-attention-2-settings';

const DEFAULT_SETTINGS: GameSettings = {
  numBoards: 10,
  totalTimeSec: 180,
  examMode: false,
  symbolFamily: 'appareils',
};

const ROTATIONS: Rotation[] = [0, 90, 180, 270];
const ROWS = 8;
const COLS = 9;

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

function randomOrientation(): Orientation {
  return { rot: ROTATIONS[randInt(0, 3)], mirror: Math.random() < 0.5 };
}

function sameOrientation(a: Orientation, b: Orientation): boolean {
  return a.rot === b.rot && a.mirror === b.mirror;
}

function orientationTransform(o: Orientation): string {
  return `scaleX(${o.mirror ? -1 : 1}) rotate(${o.rot}deg)`;
}

function generateFormBoard(): BoardData {
  const total = ROWS * COLS;
  const reference = randomOrientation();
  let cells: Orientation[] = [];
  let answer = 0;
  let attempts = 0;

  do {
    cells = [];
    answer = 0;
    const matchProbability = 0.16 + Math.random() * 0.08;
    for (let i = 0; i < total; i++) {
      if (Math.random() < matchProbability) {
        cells.push({ ...reference });
        answer++;
      } else {
        let o = randomOrientation();
        while (sameOrientation(o, reference)) o = randomOrientation();
        cells.push(o);
      }
    }
    attempts++;
  } while ((answer < 6 || answer > 20) && attempts < 15);

  return { family: 'formes', reference, cells, rows: ROWS, cols: COLS, answer };
}

const DEVICE_IDS: DeviceId[] = ['tv', 'radio', 'camera', 'camcorder', 'monitor', 'telephone'];

function generateDeviceBoard(): BoardData {
  const total = ROWS * COLS;
  const reference = DEVICE_IDS[randInt(0, DEVICE_IDS.length - 1)];
  let cells: DeviceId[] = [];
  let answer = 0;
  let attempts = 0;

  do {
    cells = [];
    answer = 0;
    const matchProbability = 0.16 + Math.random() * 0.08;
    for (let i = 0; i < total; i++) {
      if (Math.random() < matchProbability) {
        cells.push(reference);
        answer++;
      } else {
        const distractors = DEVICE_IDS.filter((device) => device !== reference);
        cells.push(distractors[randInt(0, distractors.length - 1)]);
      }
    }
    attempts++;
  } while ((answer < 6 || answer > 20) && attempts < 15);

  return { family: 'appareils', reference, cells, rows: ROWS, cols: COLS, answer };
}

function generateBoards(count: number, symbolFamily: SymbolFamily): BoardData[] {
  return Array.from({ length: count }, (_, index) => {
    const family: BoardFamily = symbolFamily === 'mixte' ? (index % 2 === 0 ? 'appareils' : 'formes') : symbolFamily;
    return family === 'appareils' ? generateDeviceBoard() : generateFormBoard();
  });
}

// ============================================================================
// Icon
// ============================================================================

function FlagIcon({ orientation, size = 22, color = '#1a2b4a' }: { orientation: Orientation; size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ transform: orientationTransform(orientation) }}>
      <path
        d="M6 20 L6 4 L18 4 L18 9 L10 9 L10 13 L15 13"
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DeviceIcon({ device, size = 22, color = '#1f2937' }: { device: DeviceId; size?: number; color?: string }) {
  const common = {
    fill: 'none',
    stroke: color,
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" shapeRendering="geometricPrecision">
      {device === 'tv' && (
        <>
          <path {...common} d="M9 8 13 4M23 8 19 4M6 9h20v15H6zM12 28h8M16 24v4" />
          <text x="16" y="19" fill={color} fontSize="5.3" fontFamily="Arial, sans-serif" textAnchor="middle">OFF</text>
        </>
      )}
      {device === 'radio' && (
        <>
          <path {...common} d="M7 10h18v15H7zM10 7l5-3M10 15h7M10 18h5" />
          <circle {...common} cx="20.5" cy="17.5" r="3.3" />
          <path {...common} d="M9 25v2M23 25v2" />
        </>
      )}
      {device === 'camera' && (
        <>
          <path {...common} d="M5 11h6l2-3h6l2 3h6v14H5zM12 11h8" />
          <circle {...common} cx="16" cy="18" r="4.4" />
          <path {...common} d="M22 14h2" />
        </>
      )}
      {device === 'camcorder' && (
        <>
          <path {...common} d="M5 12h14v12H5zM19 15l7-4v14l-7-4zM8 9h7M9 24v3M16 24v3" />
          <circle {...common} cx="12" cy="18" r="2.3" />
        </>
      )}
      {device === 'monitor' && (
        <>
          <path {...common} d="M5 7h22v15H5zM13 26h6M16 22v4" />
          <path {...common} d="M8 10h16" opacity="0.35" />
        </>
      )}
      {device === 'telephone' && (
        <>
          <path {...common} d="M9 6h14v20H9zM12 9h8M14 23h4" />
          <path {...common} d="M12 13h2M16 13h2M20 13h1M12 17h2M16 17h2M20 17h1" />
        </>
      )}
    </svg>
  );
}

function BoardSymbol({
  family,
  value,
  size,
  color,
}: {
  family: BoardFamily;
  value: Orientation | DeviceId;
  size: number;
  color?: string;
}) {
  return family === 'formes' ? (
    <FlagIcon orientation={value as Orientation} size={size} color={color} />
  ) : (
    <DeviceIcon device={value as DeviceId} size={size} color={color} />
  );
}

function symbolFamilyLabel(family: SymbolFamily): string {
  if (family === 'formes') return 'Formes pivotees';
  if (family === 'mixte') return 'Mixte';
  return 'Appareils';
}

// ============================================================================
// Component
// ============================================================================

export default function Attention2Test() {
  const router = useRouter();
  const phone = usePhoneLayout();
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

  const [boards, setBoards] = useState<BoardData[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [results, setResults] = useState<BoardResult[]>([]);
  const [showCorrection, setShowCorrection] = useState(false);

  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const timerStartRef = useRef(0);
  const boardStartRef = useRef(0);
  const perfSavedRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(
    (durationMs: number) => {
      clearTimer();
      timerStartRef.current = Date.now();
      setTotalTime(durationMs);
      setTimeLeft(durationMs);
      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - timerStartRef.current;
        const left = Math.max(0, durationMs - elapsed);
        setTimeLeft(left);
      }, 50);
    },
    [clearTimer],
  );

  const pauseTimer = useCallback(() => clearTimer(), [clearTimer]);

  const resumeTimer = useCallback(() => {
    if (timeLeft <= 0) return;
    clearTimer();
    const remaining = timeLeft;
    timerStartRef.current = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - timerStartRef.current;
      const left = Math.max(0, remaining - elapsed);
      setTimeLeft(left);
    }, 50);
  }, [clearTimer, timeLeft]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  const startGame = useCallback(() => {
    scorer.reset();
    perfSavedRef.current = false;
    const bs = generateBoards(settingsRef.current.numBoards, settingsRef.current.symbolFamily);
    setBoards(bs);
    setCurrentIdx(0);
    setResults([]);
    setUserInput('');
    setShowCorrection(false);
    setGameState('playing');
    boardStartRef.current = Date.now();
    if (settingsRef.current.totalTimeSec > 0) {
      startTimer(settingsRef.current.totalTimeSec * 1000);
    }
  }, [scorer, startTimer]);

  const submitAnswer = useCallback(() => {
    const timeUsed = Date.now() - boardStartRef.current;
    const typed = userInput.trim();
    const userVal = typed !== '' ? parseInt(typed, 10) : null;
    const board = boards[currentIdx];
    const isCorrect = userVal !== null && !isNaN(userVal) && userVal === board.answer;

    scorer.recordAnswer(isCorrect);

    const result: BoardResult = {
      board,
      userAnswer: userVal !== null && !isNaN(userVal) ? userVal : null,
      isCorrect,
      timeUsedMs: timeUsed,
    };
    setResults((prev) => [...prev, result]);
    boardStartRef.current = Date.now();

    if (settingsRef.current.examMode || currentIdx + 1 >= boards.length) {
      if (currentIdx + 1 >= boards.length) {
        clearTimer();
        setGameState('results');
      } else {
        setCurrentIdx(currentIdx + 1);
        setUserInput('');
        setShowCorrection(false);
      }
    } else {
      setShowCorrection(true);
      pauseTimer();
    }
  }, [userInput, boards, currentIdx, scorer, clearTimer, pauseTimer]);

  const nextBoard = useCallback(() => {
    if (currentIdx + 1 >= boards.length) {
      clearTimer();
      setGameState('results');
      return;
    }
    setCurrentIdx(currentIdx + 1);
    setUserInput('');
    setShowCorrection(false);
    boardStartRef.current = Date.now();
    resumeTimer();
  }, [currentIdx, boards.length, clearTimer, resumeTimer]);

  // Global timer expiry -> results
  useEffect(() => {
    if (timeLeft <= 0 && totalTime > 0 && gameState === 'playing') {
      clearTimer();
      setGameState('results');
    }
  }, [timeLeft, totalTime, gameState, clearTimer]);

  // Focus input
  useEffect(() => {
    if (gameState === 'playing' && !showCorrection && inputRef.current) {
      inputRef.current.focus();
    }
  }, [gameState, currentIdx, showCorrection]);

  // =========================================================================
  // MENU
  // =========================================================================
  if (gameState === 'menu') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#fbfaf9] p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">Attention 2</CardTitle>
            <CardDescription className="mt-2 text-base">
              Comptez les symboles identiques a la reference dans chaque tableau
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2 rounded-lg bg-[#f7f5f3] p-4 text-sm text-[#605a57]">
              <p>
                <strong>{settings.numBoards} tableaux</strong> a analyser.
              </p>
              <p>Un symbole de reference est affiche en haut de chaque tableau.</p>
              <p>
                {settings.symbolFamily === 'formes'
                  ? <>Comptez les symboles qui ont <strong>exactement la meme orientation</strong> (rotation et sens) que la reference.</>
                  : settings.symbolFamily === 'mixte'
                    ? <>Les tableaux alternent entre formes pivotees et appareils. Comptez les symboles <strong>strictement identiques</strong> a la reference.</>
                    : <>Comptez les appareils <strong>strictement identiques</strong> a la reference. Les distracteurs sont des appareils proches mais differents.</>}
              </p>
              {settings.totalTimeSec > 0 && (
                <p>
                  Temps total :{' '}
                  <strong>
                    {Math.floor(settings.totalTimeSec / 60)}min
                    {settings.totalTimeSec % 60 > 0 ? ` ${settings.totalTimeSec % 60}s` : ''}
                  </strong>
                  .
                </p>
              )}
            </div>

            <div className="flex items-center justify-center gap-6 rounded-lg bg-slate-100 p-4">
              {settings.symbolFamily === 'formes' ? (
                <>
                  <div className="text-center"><FlagIcon orientation={{ rot: 0, mirror: false }} size={32} /><p className="mt-1 text-xs text-[#605a57]">Reference</p></div>
                  <div className="text-center"><FlagIcon orientation={{ rot: 90, mirror: false }} size={32} color="#94a3b8" /><p className="mt-1 text-xs text-slate-400">Distracteur</p></div>
                  <div className="text-center"><FlagIcon orientation={{ rot: 0, mirror: true }} size={32} color="#94a3b8" /><p className="mt-1 text-xs text-slate-400">Distracteur</p></div>
                </>
              ) : (
                <>
                  <div className="text-center"><DeviceIcon device="tv" size={34} /><p className="mt-1 text-xs text-[#605a57]">Reference</p></div>
                  <div className="text-center"><DeviceIcon device="monitor" size={34} color="#94a3b8" /><p className="mt-1 text-xs text-slate-400">Distracteur</p></div>
                  <div className="text-center"><DeviceIcon device="radio" size={34} color="#94a3b8" /><p className="mt-1 text-xs text-slate-400">Distracteur</p></div>
                </>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-[#f7f5f3] p-3">
                <p className="text-xl font-bold text-[#37322f]">{settings.numBoards}</p>
                <p className="text-xs text-[#605a57]">Tableaux</p>
              </div>
              <div className="rounded-lg bg-[#f7f5f3] p-3">
                <p className="text-xl font-bold text-[#37322f]">{ROWS * COLS}</p>
                <p className="text-xs text-[#605a57]">Symboles/tableau</p>
              </div>
              <div className="rounded-lg bg-[#f7f5f3] p-3">
                <p className="text-xl font-bold text-[#37322f]">
                  {settings.totalTimeSec > 0 ? `${Math.floor(settings.totalTimeSec / 60)}m` : '\u221E'}
                </p>
                <p className="text-xs text-[#605a57]">Temps total</p>
              </div>
            </div>

            {settings.examMode && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-center text-sm text-amber-700">
                Mode examen — resultats uniquement a la fin
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
                <Label>Nombre de tableaux : {settings.numBoards}</Label>
                <Slider
                  value={[settings.numBoards]}
                  onValueChange={([v]) => setSettings((s) => ({ ...s, numBoards: v }))}
                  min={3}
                  max={20}
                  step={1}
                  className="mt-2"
                />
              </div>
              <div>
                <Label>
                  Temps total :{' '}
                  {settings.totalTimeSec > 0
                    ? `${Math.floor(settings.totalTimeSec / 60)}min${settings.totalTimeSec % 60 > 0 ? ` ${settings.totalTimeSec % 60}s` : ''}`
                    : 'Illimite'}
                </Label>
                <Slider
                  value={[settings.totalTimeSec]}
                  onValueChange={([v]) => setSettings((s) => ({ ...s, totalTimeSec: v }))}
                  min={0}
                  max={600}
                  step={15}
                  className="mt-2"
                />
              </div>
              <div>
                <Label>Famille de symboles</Label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {(['appareils', 'formes', 'mixte'] as SymbolFamily[]).map((family) => (
                    <Button
                      key={family}
                      type="button"
                      variant={settings.symbolFamily === family ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSettings((s) => ({ ...s, symbolFamily: family }))}
                    >
                      {symbolFamilyLabel(family)}
                    </Button>
                  ))}
                </div>
                <p className="mt-1.5 text-xs text-[#605a57]">Mixte alterne les deux familles a chaque tableau.</p>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Mode examen</Label>
                  <p className="mt-0.5 text-xs text-[#605a57]">Pas de correction entre les tableaux</p>
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
      savePerformanceResult('attention-2', scoreData.correct, boards.length, avgMs);
    }

    const perfEntries = loadEntries('attention-2');

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#fbfaf9] p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">Résultats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <ClassScoreBlock
              exerciseId={'attention-2'}
              percent={scoreData.score}
              detail={`${totalCorrect}/${results.length} tableaux`}
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
              <p className="text-sm font-semibold text-[#37322f]">Detail par tableau :</p>
              <div className="max-h-64 space-y-1.5 overflow-y-auto">
                {results.map((r, i) => (
                  <div key={i} className="rounded bg-[#f7f5f3] px-3 py-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-[#605a57]">Tableau {i + 1}</span>
                      <span className={r.isCorrect ? 'font-semibold text-green-600' : 'font-semibold text-red-600'}>
                        {r.isCorrect ? '\u2713' : '\u2717'} {r.userAnswer !== null ? r.userAnswer : 'Pas de reponse'}
                        {!r.isCorrect && <span className="ml-2 text-green-600">({r.board.answer})</span>}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {perfEntries.length >= 2 && (
              <div className="border-t pt-4">
                <p className="mb-2 text-center text-sm font-medium text-[#605a57]">Progression</p>
                <div className="flex justify-center">
                  <MiniPerformanceChart entries={perfEntries} exerciseId="attention-2" />
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
  const board = boards[currentIdx];
  const timerPercent = totalTime > 0 ? (timeLeft / totalTime) * 100 : 100;
  const timerColor = timerPercent > 50 ? 'bg-blue-500' : timerPercent > 20 ? 'bg-amber-500' : 'bg-red-500';
  const lastResult = results[results.length - 1];

  return (
    <div className="flex flex-col items-center min-h-screen bg-[#fbfaf9] p-4 pt-6">
      <div className="w-full max-w-3xl relative">
        {settings.totalTimeSec > 0 && (
          <div className="absolute right-0 top-0 bottom-0 w-3 flex flex-col rounded-full overflow-hidden bg-slate-200">
            <div
              className={`w-full transition-all duration-100 ${timerColor}`}
              style={{ height: `${100 - timerPercent}%` }}
            />
            <div className="flex-1" />
          </div>
        )}

        <div className="flex items-center justify-between mb-4 pr-6">
          <Badge variant="outline" className="text-base px-3 py-1">
            {currentIdx + 1} &rarr; {boards.length}
          </Badge>
        </div>

        {showCorrection && lastResult ? (
          <Card className="py-6 mr-6">
            <CardContent className="space-y-5">
              <div className="flex items-center justify-center gap-3 rounded-lg bg-slate-100 p-3">
                <span className="text-sm text-[#605a57]">Reference :</span>
                <BoardSymbol family={board.family} value={board.reference} size={28} />
              </div>
              <div
                className="mx-auto grid gap-1.5 rounded-lg bg-[#e8e8e8] p-3"
                style={{ gridTemplateColumns: `repeat(${board.cols}, 1fr)`, maxWidth: 460 }}
              >
                {board.cells.map((c, i) => {
                  const isMatch =
                    board.family === 'formes'
                      ? sameOrientation(c as Orientation, board.reference as Orientation)
                      : c === board.reference;
                  return (
                    <div
                      key={i}
                      className={`flex items-center justify-center rounded ${isMatch ? 'bg-green-200 ring-1 ring-green-500' : ''}`}
                    >
                      <BoardSymbol family={board.family} value={c} size={phone ? 26 : 18} />
                    </div>
                  );
                })}
              </div>
              <div className="text-center space-y-1">
                {lastResult.isCorrect ? (
                  <p className="text-3xl font-bold text-green-600">{'\u2713'} Correct ! ({board.answer})</p>
                ) : (
                  <>
                    <p className="text-3xl font-bold text-red-600">
                      {'\u2717'} {lastResult.userAnswer ?? 'Pas de reponse'}
                    </p>
                    <p className="text-xl text-green-600">Reponse : {board.answer}</p>
                  </>
                )}
              </div>
              <div className="text-center">
                <Button size="lg" onClick={nextBoard}>
                  {currentIdx + 1 >= boards.length ? 'Voir les resultats' : 'Suivant'}
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="py-4 mr-6">
              <CardContent>
                <div className="flex items-center justify-center gap-3">
                  <span className="text-sm text-[#605a57]">Symbole de reference :</span>
                  <div className="rounded-lg bg-slate-100 p-2">
                    {board && <BoardSymbol family={board.family} value={board.reference} size={30} />}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="py-4 mr-6 mt-3">
              <CardContent>
                <div
                  className="mx-auto grid gap-1.5 rounded-lg bg-[#e8e8e8] p-3"
                  style={{ gridTemplateColumns: `repeat(${board?.cols ?? COLS}, 1fr)`, maxWidth: 460 }}
                >
                  {board?.cells.map((c, i) => (
                    <div key={i} className="flex items-center justify-center">
                      <BoardSymbol family={board.family} value={c} size={phone ? 26 : 18} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="py-6 mr-6 mt-3">
              <CardContent>
                <div className="text-center">
                  <p className="text-sm text-[#605a57] mb-3">Combien de symboles correspondent a la reference ?</p>
                  <div className="flex items-center justify-center gap-3 max-w-md mx-auto">
                    <input
                      ref={inputRef}
                      type="number"
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && userInput.trim() !== '') submitAnswer();
                      }}
                      placeholder="?"
                      className="flex-1 text-center text-2xl font-bold border-2 border-slate-300 rounded-lg py-3 focus:border-amber-500 focus:outline-none"
                    />
                    <Button onClick={() => submitAnswer()} disabled={userInput.trim() === ''} size="lg">
                      Suivant
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

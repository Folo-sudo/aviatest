'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Scorer } from '@/lib/core/Scorer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Play, RotateCcw, Home, ChevronRight, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';

// ============================================================================
// Types
// ============================================================================

type GameState = 'menu' | 'settings' | 'playing' | 'results';

interface GameSettings {
  totalQuestions: number;
  totalSymbols: number;
  timeLimitSec: number;
  examMode: boolean;
  stroopEnabled: boolean;
}

type SymbolType = 'X' | '/' | '+';

// Stroop color definitions
const COLOR_NAMES = ['ROUGE', 'BLEU', 'VERT', 'ORANGE', 'JAUNE', 'VIOLET', 'NOIR'] as const;
type ColorName = typeof COLOR_NAMES[number];

const COLOR_CSS: Record<ColorName, string> = {
  ROUGE: '#DC2626',
  BLEU: '#2563EB',
  VERT: '#16A34A',
  ORANGE: '#EA580C',
  JAUNE: '#CA8A04',
  VIOLET: '#7C3AED',
  NOIR: '#18181B',
};

interface StroopWord {
  text: ColorName;        // the word written
  displayColor: ColorName; // the color it's displayed in
  isMatch: boolean;        // does text === displayColor?
}

interface StroopGrid {
  words: StroopWord[];
  cols: number;
  rows: number;
}

interface QuestionData {
  symbols: SymbolType[];
  answer: number;
}

interface StroopResult {
  correctSelections: number;
  totalTargets: number;
  wrongSelections: number;
}

interface QuestionResult {
  question: QuestionData;
  userAnswer: number | null;
  isCorrect: boolean;
  timeUsedMs: number;
  stroopResults: StroopResult[];
}

// ============================================================================
// Helpers
// ============================================================================

const DEFAULT_SETTINGS: GameSettings = {
  totalQuestions: 12,
  totalSymbols: 80,
  timeLimitSec: 600,
  examMode: false,
  stroopEnabled: true,
};

const SETTINGS_KEY = 'aviatest-attention-3-settings';

function loadSettings(): GameSettings {
  if (typeof window === 'undefined') return { ...DEFAULT_SETTINGS };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(s: GameSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch { /* ignore */ }
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateQuestion(settings: GameSettings): QuestionData {
  const total = settings.totalSymbols;
  const symbols: SymbolType[] = [];
  let pos = 0;

  while (pos < total) {
    const runLen = randInt(2, 8);
    const actualRun = Math.min(runLen, total - pos);
    for (let i = 0; i < actualRun; i++) {
      symbols.push('X');
      pos++;
    }
    if (pos >= total) break;

    const r = Math.random();
    if (r < 0.55) {
      symbols.push('/');
    } else if (r < 0.75) {
      symbols.push('+');
    } else {
      symbols.push('/');
      pos++;
      if (pos < total && Math.random() < 0.3) {
        symbols.push('/');
        pos++;
      }
    }
    pos++;
  }

  while (symbols.length > total) symbols.pop();

  if (!symbols.includes('/') && symbols.length > 5) {
    symbols[randInt(3, Math.min(10, symbols.length - 2))] = '/';
  }
  if (!symbols.includes('+') && symbols.length > 10) {
    const slashIdx = symbols.indexOf('/');
    if (slashIdx >= 0 && slashIdx + 4 < symbols.length) {
      symbols[slashIdx + randInt(2, 4)] = '+';
    }
  }

  let mode = 1;
  let count = 0;
  for (const sym of symbols) {
    if (sym === '/') mode = -1;
    else if (sym === '+') mode = 1;
    else count += mode;
  }

  return { symbols, answer: count };
}

function generateStroopGrid(targetMode: 'bonne' | 'mauvaise', maxTargets: number = 5): StroopGrid {
  const rows = 5;
  const cols = 5;
  const total = rows * cols;
  const words: StroopWord[] = [];

  // Place 1–maxTargets correct answers at random positions
  const numTargets = randInt(1, maxTargets);
  const targetIndices = new Set<number>();
  while (targetIndices.size < numTargets) {
    targetIndices.add(Math.floor(Math.random() * total));
  }

  for (let i = 0; i < total; i++) {
    const isTarget = targetIndices.has(i);
    const text = pickRandom(COLOR_NAMES);
    let displayColor: ColorName;

    if (targetMode === 'bonne') {
      // Target = word matches its display color
      if (isTarget) {
        displayColor = text;
      } else {
        do { displayColor = pickRandom(COLOR_NAMES); } while (displayColor === text);
      }
    } else {
      // Target = word does NOT match its display color
      if (isTarget) {
        do { displayColor = pickRandom(COLOR_NAMES); } while (displayColor === text);
      } else {
        displayColor = text;
      }
    }

    words.push({ text, displayColor, isMatch: text === displayColor });
  }

  return { words, cols, rows };
}

// ============================================================================
// Component
// ============================================================================

export default function Attention3Test() {
  const router = useRouter();
  const [gameState, setGameState] = useState<GameState>('menu');
  const [settings, setSettings] = useState<GameSettings>({ ...DEFAULT_SETTINGS });
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const [scorer] = useState(() => new Scorer());

  useEffect(() => {
    const saved = loadSettings();
    setSettings(saved);
    setSettingsLoaded(true);
  }, []);

  useEffect(() => {
    if (settingsLoaded) saveSettings(settings);
  }, [settings, settingsLoaded]);

  // Core game state
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userInput, setUserInput] = useState('');
  const userInputRef = useRef('');
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [showCorrection, setShowCorrection] = useState(false);

  // Global timer
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const questionStartRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Stroop state
  const [stroopMode, setStroopMode] = useState<'bonne' | 'mauvaise'>('mauvaise');
  const [stroopGrid, setStroopGrid] = useState<StroopGrid | null>(null);
  const [stroopSelected, setStroopSelected] = useState<Set<number>>(new Set());
  const [currentStroopResults, setCurrentStroopResults] = useState<StroopResult[]>([]);
  const stroopTimeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const questionStartMsRef = useRef(0); // per-question start (not global timer)

  // Refs for auto-validate (avoids stale closures in timeouts)
  const stroopGridRef = useRef<StroopGrid | null>(null);
  const stroopSelectedRef = useRef<Set<number>>(new Set());
  const stroopModeRef = useRef(stroopMode);
  stroopGridRef.current = stroopGrid;
  stroopSelectedRef.current = stroopSelected;
  stroopModeRef.current = stroopMode;
  const [stroopTimeLeft, setStroopTimeLeft] = useState(0);
  const stroopAppearRef = useRef(0);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const clearStroopTimeouts = useCallback(() => {
    stroopTimeoutsRef.current.forEach(t => clearTimeout(t));
    stroopTimeoutsRef.current = [];
  }, []);

  // Auto-validate stroop (ref-based, stable for use in timeouts)
  const autoValidateStroop = useCallback(() => {
    const grid = stroopGridRef.current;
    if (!grid) return;

    const targetMatch = stroopModeRef.current === 'bonne';
    const targetIdxSet = new Set<number>();
    grid.words.forEach((w, i) => { if (w.isMatch === targetMatch) targetIdxSet.add(i); });

    const selected = stroopSelectedRef.current;
    let correctSelections = 0;
    let wrongSelections = 0;
    selected.forEach(idx => {
      if (targetIdxSet.has(idx)) correctSelections++;
      else wrongSelections++;
    });

    setCurrentStroopResults(prev => [...prev, {
      correctSelections,
      totalTargets: targetIdxSet.size,
      wrongSelections,
    }]);

    setStroopGrid(null);
    stroopGridRef.current = null;
    setStroopSelected(new Set());
    stroopSelectedRef.current = new Set();
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const startTimer = useCallback((durationMs: number) => {
    clearTimer();
    questionStartRef.current = Date.now();
    setTotalTime(durationMs);
    setTimeLeft(durationMs);
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - questionStartRef.current;
      const left = Math.max(0, durationMs - elapsed);
      setTimeLeft(left);
    }, 50);
  }, [clearTimer]);

  useEffect(() => () => { clearTimer(); clearStroopTimeouts(); }, [clearTimer, clearStroopTimeouts]);

  // Schedule stroop grids for current question (auto-dismiss after 15s)
  const scheduleStroop = useCallback(() => {
    clearStroopTimeouts();
    setStroopGrid(null);
    setStroopSelected(new Set());

    if (!settingsRef.current.stroopEnabled) return;

    questionStartMsRef.current = Date.now();

    const t1 = setTimeout(() => {
      const grid = generateStroopGrid(stroopModeRef.current, 5);
      setStroopGrid(grid);
      stroopGridRef.current = grid;
      setStroopSelected(new Set());
      stroopSelectedRef.current = new Set();
    }, 10000); // 10s

    const t1auto = setTimeout(() => {
      autoValidateStroop();
    }, 25000); // 10s + 15s auto-dismiss

    const t2 = setTimeout(() => {
      const grid = generateStroopGrid(stroopModeRef.current, 5);
      setStroopGrid(grid);
      stroopGridRef.current = grid;
      setStroopSelected(new Set());
      stroopSelectedRef.current = new Set();
    }, 40000); // 40s

    const t2auto = setTimeout(() => {
      autoValidateStroop();
    }, 55000); // 40s + 15s auto-dismiss

    stroopTimeoutsRef.current = [t1, t1auto, t2, t2auto];
  }, [clearStroopTimeouts, autoValidateStroop]);

  // Stroop countdown timer
  useEffect(() => {
    if (!stroopGrid) {
      setStroopTimeLeft(0);
      return;
    }
    stroopAppearRef.current = Date.now();
    setStroopTimeLeft(15);
    const interval = setInterval(() => {
      const elapsed = (Date.now() - stroopAppearRef.current) / 1000;
      setStroopTimeLeft(Math.max(0, Math.ceil(15 - elapsed)));
    }, 500);
    return () => clearInterval(interval);
  }, [stroopGrid]);

  // Start game
  const startGame = useCallback(() => {
    scorer.reset();
    const qs: QuestionData[] = [];
    for (let i = 0; i < settingsRef.current.totalQuestions; i++) {
      qs.push(generateQuestion(settingsRef.current));
    }
    setQuestions(qs);
    setCurrentIdx(0);
    setResults([]);
    setUserInput('');
    userInputRef.current = '';
    setShowCorrection(false);
    setCurrentStroopResults([]);
    setStroopGrid(null);
    setStroopSelected(new Set());

    // Random stroop mode
    setStroopMode(Math.random() < 0.5 ? 'bonne' : 'mauvaise');

    setGameState('playing');
    questionStartRef.current = Date.now();
    questionStartMsRef.current = Date.now();

    if (settingsRef.current.timeLimitSec > 0) {
      startTimer(settingsRef.current.timeLimitSec * 1000);
    }
  }, [scorer, startTimer]);

  // Schedule stroop when question changes
  useEffect(() => {
    if (gameState === 'playing' && !showCorrection) {
      scheduleStroop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, currentIdx, showCorrection]);

  // Submit cross-count answer
  const submitAnswer = useCallback(() => {
    const timeUsed = Date.now() - questionStartMsRef.current;
    const typed = userInput.trim();
    const userVal = typed !== '' ? parseInt(typed, 10) : null;
    const currentQ = questions[currentIdx];
    const isCorrect = userVal !== null && !isNaN(userVal) && userVal === currentQ.answer;

    scorer.recordAnswer(isCorrect);

    const result: QuestionResult = {
      question: currentQ,
      userAnswer: userVal !== null && !isNaN(userVal) ? userVal : null,
      isCorrect,
      timeUsedMs: timeUsed,
      stroopResults: [...currentStroopResults],
    };

    setResults(prev => [...prev, result]);
    setCurrentStroopResults([]);
    clearStroopTimeouts();
    setStroopGrid(null);
    setStroopSelected(new Set());

    if (settingsRef.current.examMode || currentIdx + 1 >= questions.length) {
      if (currentIdx + 1 >= questions.length) {
        clearTimer();
        setGameState('results');
      } else {
        setCurrentIdx(currentIdx + 1);
        setUserInput('');
        userInputRef.current = '';
        setShowCorrection(false);
        questionStartMsRef.current = Date.now();
      }
    } else {
      clearTimer();
      setShowCorrection(true);
    }
  }, [clearTimer, clearStroopTimeouts, userInput, questions, currentIdx, scorer, currentStroopResults]);

  // Next question after correction
  const nextQuestion = useCallback(() => {
    if (currentIdx + 1 >= questions.length) {
      clearTimer();
      setGameState('results');
      return;
    }
    setCurrentIdx(currentIdx + 1);
    setUserInput('');
    userInputRef.current = '';
    setShowCorrection(false);
    questionStartMsRef.current = Date.now();
    if (settingsRef.current.timeLimitSec > 0) {
      startTimer(settingsRef.current.timeLimitSec * 1000);
    }
  }, [currentIdx, questions.length, clearTimer, startTimer]);

  // Global timer expiry
  useEffect(() => {
    if (timeLeft <= 0 && totalTime > 0 && gameState === 'playing') {
      clearTimer();
      clearStroopTimeouts();
      setGameState('results');
    }
  }, [timeLeft, totalTime, gameState, clearTimer, clearStroopTimeouts]);

  // Focus input
  useEffect(() => {
    if (gameState === 'playing' && !showCorrection && !stroopGrid && inputRef.current) {
      inputRef.current.focus();
    }
  }, [gameState, currentIdx, showCorrection, stroopGrid]);

  // =========================================================================
  // Render helpers
  // =========================================================================

  function renderSymbols(symbols: SymbolType[], showColors = false) {
    if (!showColors) {
      return (
        <p className="text-lg sm:text-xl md:text-2xl font-bold text-slate-800 font-mono tracking-widest leading-relaxed break-all select-none">
          {symbols.join(' ')}
        </p>
      );
    }
    let mode = 1;
    const spans: React.ReactNode[] = [];
    symbols.forEach((sym, i) => {
      if (sym === '/') {
        mode = -1;
        spans.push(<span key={i} className="text-red-500 font-black">{sym}</span>);
      } else if (sym === '+') {
        mode = 1;
        spans.push(<span key={i} className="text-green-500 font-black">{sym}</span>);
      } else {
        spans.push(<span key={i} className={mode === 1 ? 'text-green-700' : 'text-red-600'}>{sym}</span>);
      }
      if (i < symbols.length - 1) spans.push(<span key={`sp-${i}`}> </span>);
    });
    return (
      <p className="text-lg sm:text-xl md:text-2xl font-bold font-mono tracking-widest leading-relaxed break-all select-none">
        {spans}
      </p>
    );
  }

  function renderStroopGrid() {
    if (!stroopGrid) return null;

    const targetLabel = stroopMode === 'bonne' ? 'la bonne couleur' : 'la mauvaise couleur';

    return (
      <div className="mt-4 p-4 bg-slate-200 rounded-lg">
        <p className="text-center text-sm text-slate-600 mb-3">
          Selectionnez les mots ecrits de <strong>{targetLabel}</strong>
        </p>
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${stroopGrid.cols}, 1fr)` }}
        >
          {stroopGrid.words.map((w, i) => {
            const isSelected = stroopSelected.has(i);
            return (
              <button
                key={i}
                onClick={() => {
                  setStroopSelected(prev => {
                    const next = new Set(prev);
                    if (next.has(i)) next.delete(i);
                    else next.add(i);
                    return next;
                  });
                }}
                className={`py-2 px-1 rounded text-sm sm:text-base font-bold transition-all select-none
                  ${isSelected
                    ? 'bg-white ring-2 ring-blue-500 shadow-md scale-105'
                    : 'bg-transparent hover:bg-slate-300'
                  }`}
                style={{ color: COLOR_CSS[w.displayColor] }}
              >
                {w.text}
              </button>
            );
          })}
        </div>
        <div className="mt-3 space-y-1">
          <p className="text-center text-xs text-slate-400">{stroopTimeLeft}s</p>
          <div className="w-full h-1.5 bg-slate-300 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${(stroopTimeLeft / 15) * 100}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDER
  // =========================================================================

  // ---- MENU ----
  if (gameState === 'menu') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">Attention 3</CardTitle>
            <CardDescription className="text-base mt-2">
              Comptez les croix en tenant compte des changements de signe
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-600 space-y-2">
              <p><strong>{settings.totalQuestions} sequences</strong> a compter.</p>
              <p>Les <strong>X</strong> comptent <strong>+1</strong> par defaut.</p>
              <p>Apres un <strong>/</strong>, les X comptent <strong>-1</strong>.</p>
              <p>Apres un <strong>+</strong>, les X comptent de nouveau <strong>+1</strong>.</p>
              <p>Entrez le total (peut etre negatif).</p>
              {settings.stroopEnabled && (
                <p className="text-amber-700 font-medium mt-1">
                  &#x26A0; Double tache : un tableau de couleurs (Stroop) apparaitra a 10s et 40s pendant chaque sequence.
                </p>
              )}
              {settings.timeLimitSec > 0 && (
                <p>Temps total : <strong>{Math.floor(settings.timeLimitSec / 60)}min{settings.timeLimitSec % 60 > 0 ? ` ${settings.timeLimitSec % 60}s` : ''}</strong>.</p>
              )}
            </div>

            <div className="bg-slate-100 rounded-lg p-3 text-xs text-slate-500 font-mono text-center space-y-1">
              <p>Exemple : X X X / X X + X X</p>
              <p>= 3 - 2 + 2 = <strong>3</strong></p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xl font-bold text-slate-700">{settings.totalQuestions}</p>
                <p className="text-xs text-slate-500">Sequences</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xl font-bold text-slate-700">~{settings.totalSymbols}</p>
                <p className="text-xs text-slate-500">Symboles</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xl font-bold text-slate-700">
                  {settings.timeLimitSec > 0 ? `${Math.floor(settings.timeLimitSec / 60)}m` : '\u221E'}
                </p>
                <p className="text-xs text-slate-500">Temps total</p>
              </div>
            </div>

            {settings.examMode && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm text-amber-700 text-center">
                {'\u26A1'} Mode examen — resultats uniquement a la fin
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

  // ---- SETTINGS ----
  if (gameState === 'settings') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Parametres</CardTitle>
            <CardDescription>Ajustez le test a votre niveau</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-5">
              <div>
                <Label>Nombre de sequences : {settings.totalQuestions}</Label>
                <Slider
                  value={[settings.totalQuestions]}
                  onValueChange={([v]) => setSettings(s => ({ ...s, totalQuestions: v }))}
                  min={1} max={20} step={1} className="mt-2"
                />
              </div>
              <div>
                <Label>Symboles par sequence : ~{settings.totalSymbols}</Label>
                <Slider
                  value={[settings.totalSymbols]}
                  onValueChange={([v]) => setSettings(s => ({ ...s, totalSymbols: v }))}
                  min={20} max={100} step={5} className="mt-2"
                />
              </div>
              <div>
                <Label>Temps total : {settings.timeLimitSec > 0 ? `${Math.floor(settings.timeLimitSec / 60)}min${settings.timeLimitSec % 60 > 0 ? ` ${settings.timeLimitSec % 60}s` : ''}` : 'Illimite'}</Label>
                <Slider
                  value={[settings.timeLimitSec]}
                  onValueChange={([v]) => setSettings(s => ({ ...s, timeLimitSec: v }))}
                  min={0} max={1800} step={30} className="mt-2"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Double tache Stroop</Label>
                  <p className="text-xs text-slate-500 mt-0.5">Tableau de couleurs a 10s et 40s de chaque sequence</p>
                </div>
                <Switch
                  checked={settings.stroopEnabled}
                  onCheckedChange={v => setSettings(s => ({ ...s, stroopEnabled: v }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Mode examen</Label>
                  <p className="text-xs text-slate-500 mt-0.5">Pas de correction entre les sequences</p>
                </div>
                <Switch
                  checked={settings.examMode}
                  onCheckedChange={v => setSettings(s => ({ ...s, examMode: v }))}
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

  // ---- RESULTS ----
  if (gameState === 'results') {
    const scoreData = scorer.toJSON();
    const totalCorrect = results.filter(r => r.isCorrect).length;
    const avgTime = results.length > 0
      ? Math.round(results.reduce((s, r) => s + r.timeUsedMs, 0) / results.length / 1000 * 10) / 10
      : 0;

    // Stroop aggregate
    const allStroop = results.flatMap(r => r.stroopResults);
    const stroopTotal = allStroop.reduce((s, r) => s + r.totalTargets, 0);
    const stroopCorrect = allStroop.reduce((s, r) => s + r.correctSelections, 0);
    const stroopWrong = allStroop.reduce((s, r) => s + r.wrongSelections, 0);

    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">Resultats</CardTitle>
            <Badge
              variant={scoreData.accuracy >= 75 ? 'default' : scoreData.accuracy >= 50 ? 'secondary' : 'destructive'}
              className="text-lg px-4 py-1 mt-2"
            >
              {scoreData.grade}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-5xl font-bold text-slate-700">{scoreData.score}%</p>
              <p className="text-slate-500 mt-1">Croix — bonnes reponses</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-blue-600">{totalCorrect}/{results.length}</p>
                <p className="text-sm text-blue-700">Croix correct</p>
              </div>
              <div className="p-4 bg-amber-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-amber-600">{avgTime}s</p>
                <p className="text-sm text-amber-700">Temps moyen</p>
              </div>
            </div>

            {allStroop.length > 0 && (
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-purple-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-purple-600">
                    {stroopCorrect}/{stroopTotal}
                  </p>
                  <p className="text-sm text-purple-700">Stroop correct</p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-red-600">{stroopWrong}</p>
                  <p className="text-sm text-red-700">Stroop erreurs</p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <p className="font-semibold text-slate-700 text-sm">Detail par sequence :</p>
              <div className="max-h-64 overflow-y-auto space-y-1.5">
                {results.map((r, i) => (
                  <div key={i} className="bg-slate-50 rounded px-3 py-2 text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-500">S{i + 1}</span>
                      <span className={r.isCorrect ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                        {r.isCorrect ? '\u2713' : '\u2717'}
                        {' '}
                        {r.userAnswer !== null ? r.userAnswer : '?'}
                        {!r.isCorrect && <span className="text-green-600 ml-2">({r.question.answer})</span>}
                      </span>
                    </div>
                    {r.stroopResults.length > 0 && (
                      <p className="text-xs text-purple-500">
                        Stroop : {r.stroopResults.map((sr, j) =>
                          `${sr.correctSelections}/${sr.totalTargets}`
                        ).join(', ')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

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

  // ---- PLAYING ----
  const currentQ = questions[currentIdx];
  const timerPercent = totalTime > 0 ? (timeLeft / totalTime) * 100 : 100;
  const timerColor = timerPercent > 50 ? 'bg-blue-500' : timerPercent > 20 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="flex flex-col items-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 pt-6">
      <div className="w-full max-w-4xl relative">
        {/* Vertical timer bar */}
        {settings.timeLimitSec > 0 && (
          <div className="absolute right-0 top-0 bottom-0 w-3 flex flex-col rounded-full overflow-hidden bg-slate-200">
            <div
              className={`w-full transition-all duration-100 ${timerColor}`}
              style={{ height: `${100 - timerPercent}%` }}
            />
            <div className="flex-1" />
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-4 pr-6">
          <Badge variant="outline" className="text-base px-3 py-1">
            {currentIdx} &rarr; {settings.totalQuestions}
          </Badge>
          {settings.stroopEnabled && (
            <Badge variant="secondary" className="text-xs">
              Stroop : {stroopMode === 'bonne' ? 'bonne couleur' : 'mauvaise couleur'}
            </Badge>
          )}
        </div>

        {showCorrection ? (
          <Card className="py-8 mr-6">
            <CardContent className="space-y-6">
              <div className="px-2">
                {renderSymbols(currentQ.symbols, true)}
              </div>
              <div className="text-center space-y-2">
                {results[results.length - 1]?.isCorrect ? (
                  <p className="text-3xl font-bold text-green-600">{'\u2713'} Correct ! ({currentQ.answer})</p>
                ) : (
                  <>
                    <p className="text-3xl font-bold text-red-600">
                      {'\u2717'} {results[results.length - 1]?.userAnswer ?? 'Pas de reponse'}
                    </p>
                    <p className="text-xl text-green-600">Reponse : {currentQ.answer}</p>
                  </>
                )}
              </div>
              {/* Stroop grids correction */}
              {results[results.length - 1]?.stroopResults.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-600 text-center">Tableaux de couleurs :</p>
                  <div className="flex justify-center gap-3">
                    {results[results.length - 1].stroopResults.map((sr, i) => {
                      const isCorrect = sr.correctSelections === sr.totalTargets && sr.wrongSelections === 0;
                      return (
                        <div key={i} className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                          isCorrect
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                          Tableau {i + 1} : {isCorrect ? '\u2713 Correct' : `\u2717 ${sr.correctSelections}/${sr.totalTargets}${sr.wrongSelections > 0 ? ` (+${sr.wrongSelections} erreur${sr.wrongSelections > 1 ? 's' : ''})` : ''}`}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="text-center">
                <Button size="lg" onClick={nextQuestion}>
                  {currentIdx + 1 >= questions.length ? 'Voir les resultats' : 'Suivant'}
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
          {/* Crosses — always visible at the top */}
          <Card className="py-6 mr-6">
            <CardContent>
              <div className="px-2">
                {currentQ && renderSymbols(currentQ.symbols)}
              </div>
            </CardContent>
          </Card>

          {/* Stroop grid — appears below crosses, fixed min-height to avoid layout shifts */}
          <div className={`mr-6 mt-3 transition-all duration-300 ${stroopGrid ? 'min-h-[320px]' : 'min-h-0'}`}>
            {stroopGrid && (
              <Card className="py-4">
                <CardContent>
                  {renderStroopGrid()}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Input — always at the bottom */}
          <Card className="py-6 mr-6 mt-3">
            <CardContent>
              <div className="text-center">
                <p className="text-sm text-slate-500 mb-3">Entrez le resultat ci-dessous :</p>
                <div className="flex items-center justify-center gap-3 max-w-md mx-auto">
                  <input
                    ref={inputRef}
                    type="number"
                    value={userInput}
                    onChange={e => {
                      userInputRef.current = e.target.value;
                      setUserInput(e.target.value);
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && userInput.trim() !== '') submitAnswer();
                    }}
                    placeholder="?"
                    className="flex-1 text-center text-2xl font-bold border-2 border-slate-300 rounded-lg py-3 focus:border-amber-500 focus:outline-none"
                  />
                  <Button
                    onClick={() => submitAnswer()}
                    disabled={userInput.trim() === ''}
                    size="lg"
                  >
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

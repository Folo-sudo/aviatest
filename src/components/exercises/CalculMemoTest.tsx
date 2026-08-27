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

// ============================================================================
// Types
// ============================================================================

type GameState = 'menu' | 'settings' | 'playing' | 'results';

interface GameSettings {
  totalSalves: number;
  minLetters: number;
  maxLetters: number;
  calcTimeMs: number;
  letterTimeMs: number;
  examMode: boolean; // no feedback between salves
}

/** What is currently shown during a salve */
type SalvePhase =
  | { kind: 'countdown'; value: number }
  | { kind: 'calc'; expr: string; answer: number }
  | { kind: 'letter'; letter: string }
  | { kind: 'recall' };

interface CalcRecord {
  expr: string;
  correctAnswer: number;
  userAnswer: number | null;
  isCorrect: boolean;
}

interface SalveResult {
  letters: string[];
  userAnswers: (string | null)[];
  correctCount: number;
  calcCorrect: number;
  calcTotal: number;
  calcs: CalcRecord[];
}

// ============================================================================
// Helpers
// ============================================================================

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const DEFAULT_SETTINGS: GameSettings = {
  totalSalves: 10,
  minLetters: 4,
  maxLetters: 9,
  calcTimeMs: 10_000,
  letterTimeMs: 10_000,
  examMode: false,
};

const SETTINGS_KEY = 'aviatest-calcul-memo-settings';

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
  } catch { /* quota exceeded — ignore */ }
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateCalc(): { expr: string; answer: number } {
  // Range 2-10 (no 1), with reduced probability of duplicate digits
  const pickDigit = () => randInt(2, 10);

  let a: number, b: number, c: number, d: number;
  const MAX_RETRIES = 20;
  let retries = 0;

  do {
    a = pickDigit();
    b = pickDigit();
    c = pickDigit();
    d = pickDigit();
    retries++;
    // Check for duplicates — allow ~20% of the time, reject otherwise
    const digits = [a, b, c, d];
    const hasDup = new Set(digits).size < digits.length;
    if (!hasDup || Math.random() < 0.2 || retries >= MAX_RETRIES) break;
  } while (true);

  const op = Math.random() < 0.5 ? '+' : '-';
  const answer = op === '+' ? a * b + c * d : a * b - c * d;
  const expr = `${a} x ${b} ${op} ${c} x ${d}`;
  return { expr, answer };
}

function generateLetter(exclude: string[]): string {
  const available = ALPHABET.split('').filter((l) => !exclude.includes(l));
  return available[randInt(0, available.length - 1)];
}

/** Build 5 choices for a column: the correct letter + 4 random distractors */
function buildChoices(correct: string): string[] {
  const others = ALPHABET.split('').filter((l) => l !== correct);
  const distractors: string[] = [];
  while (distractors.length < 4) {
    const pick = others[randInt(0, others.length - 1)];
    if (!distractors.includes(pick)) distractors.push(pick);
  }
  const all = [correct, ...distractors];
  // Shuffle
  for (let i = all.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all;
}

// ============================================================================
// Component
// ============================================================================

export default function CalculMemoTest() {
  const router = useRouter();
  const [gameState, setGameState] = useState<GameState>('menu');
  const [settings, setSettings] = useState<GameSettings>({ ...DEFAULT_SETTINGS });
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // Load settings from localStorage after mount (avoid SSR hydration mismatch)
  useEffect(() => {
    const saved = loadSettings();
    setSettings(saved);
    setSettingsLoaded(true);
  }, []);

  // Persist settings to localStorage on change (skip initial load)
  useEffect(() => {
    if (settingsLoaded) {
      saveSettings(settings);
    }
  }, [settings, settingsLoaded]);
  const [scorer] = useState(() => new Scorer());

  // Salve tracking
  const [salveIndex, setSalveIndex] = useState(0); // 0-9
  const [phase, setPhase] = useState<SalvePhase>({ kind: 'countdown', value: 3 });

  // Current salve data
  const salveLettersRef = useRef<string[]>([]);
  const salveCalcCorrectRef = useRef(0);
  const salveCalcTotalRef = useRef(0);
  const salveItemIndexRef = useRef(0);
  const salveTotalLettersRef = useRef(0);

  // Calc answer input
  const [calcInput, setCalcInput] = useState('');
  const calcInputValueRef = useRef(''); // mirror of calcInput for timer expiry
  const currentCalcAnswerRef = useRef(0);
  const currentCalcExprRef = useRef('');
  const salveCalcRecordsRef = useRef<CalcRecord[]>([]);

  // Timer
  const [timeLeft, setTimeLeft] = useState(0);
  const [currentPhaseDuration, setCurrentPhaseDuration] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const perfSavedRef = useRef(false);
  const phaseStartRef = useRef(0);

  // Recall grid
  const [recallGrid, setRecallGrid] = useState<string[][]>([]);
  const [recallSelections, setRecallSelections] = useState<(string | null)[]>([]);
  const [recallSubmitted, setRecallSubmitted] = useState(false);
  const [recallResults, setRecallResults] = useState<boolean[]>([]);

  // Global results
  const [salveResults, setSalveResults] = useState<SalveResult[]>([]);

  // ---- Timer logic ----
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback((durationMs: number) => {
    clearTimer();
    phaseStartRef.current = Date.now();
    setCurrentPhaseDuration(durationMs);
    setTimeLeft(durationMs);
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - phaseStartRef.current;
      const left = Math.max(0, durationMs - elapsed);
      setTimeLeft(left);
    }, 50);
  }, [clearTimer]);

  // ---- Salve sequencing ----
  const advanceInSalve = useCallback(() => {
    clearTimer();
    const itemIdx = salveItemIndexRef.current;
    const totalLetters = salveTotalLettersRef.current;
    // Pattern: calc, letter, calc, letter, ... calc, letter
    // Total items = totalLetters * 2 (calc+letter pairs)
    const totalItems = totalLetters * 2;

    if (itemIdx >= totalItems) {
      // All items shown -> recall phase
      const letters = salveLettersRef.current;
      const grid = letters.map((l) => buildChoices(l));
      setRecallGrid(grid);
      setRecallSelections(new Array(letters.length).fill(null));
      setRecallSubmitted(false);
      setRecallResults([]);
      setPhase({ kind: 'recall' });
      return;
    }

    salveItemIndexRef.current = itemIdx + 1;

    if (itemIdx % 2 === 0) {
      // Calc
      const calc = generateCalc();
      currentCalcAnswerRef.current = calc.answer;
      currentCalcExprRef.current = calc.expr;
      setCalcInput('');
      calcInputValueRef.current = '';
      setPhase({ kind: 'calc', expr: calc.expr, answer: calc.answer });
      startTimer(settingsRef.current.calcTimeMs);
    } else {
      // Letter
      const letter = generateLetter(salveLettersRef.current);
      salveLettersRef.current = [...salveLettersRef.current, letter];
      setPhase({ kind: 'letter', letter });
      startTimer(settingsRef.current.letterTimeMs);
    }
  }, [clearTimer, startTimer]);

  // Auto-advance when timer runs out
  useEffect(() => {
    if (timeLeft <= 0 && (phase.kind === 'calc' || phase.kind === 'letter')) {
      if (phase.kind === 'calc') {
        // If the user typed an answer but didn't press OK, auto-validate it
        const typed = calcInputValueRef.current.trim();
        const userVal = typed !== '' ? parseInt(typed, 10) : null;
        const isCorrect = userVal !== null && !isNaN(userVal) && userVal === currentCalcAnswerRef.current;
        salveCalcTotalRef.current += 1;
        if (isCorrect) {
          salveCalcCorrectRef.current += 1;
        }
        salveCalcRecordsRef.current = [...salveCalcRecordsRef.current, {
          expr: currentCalcExprRef.current,
          correctAnswer: currentCalcAnswerRef.current,
          userAnswer: userVal !== null && !isNaN(userVal) ? userVal : null,
          isCorrect,
        }];
      }
      advanceInSalve();
    }
  }, [timeLeft, phase.kind, advanceInSalve]);

  const startSalve = useCallback((index: number) => {
    salveLettersRef.current = [];
    salveCalcCorrectRef.current = 0;
    salveCalcTotalRef.current = 0;
    salveCalcRecordsRef.current = [];
    salveItemIndexRef.current = 0;
    salveTotalLettersRef.current = randInt(settingsRef.current.minLetters, settingsRef.current.maxLetters);
    setSalveIndex(index);

    // 3-2-1 countdown
    setPhase({ kind: 'countdown', value: 3 });
    let count = 3;
    const countdownInterval = setInterval(() => {
      count--;
      if (count <= 0) {
        clearInterval(countdownInterval);
        advanceInSalve();
      } else {
        setPhase({ kind: 'countdown', value: count });
      }
    }, 800);
  }, [advanceInSalve]);

  const startGame = useCallback(() => {
    scorer.reset();
    perfSavedRef.current = false;
    setSalveResults([]);
    setGameState('playing');
    startSalve(0);
  }, [scorer, startSalve]);

  // ---- Calc submission ----
  const submitCalc = useCallback(() => {
    if (phase.kind !== 'calc') return;
    const userVal = parseInt(calcInput, 10);
    const isCorrect = userVal === currentCalcAnswerRef.current;
    salveCalcTotalRef.current += 1;
    if (isCorrect) {
      salveCalcCorrectRef.current += 1;
    }
    salveCalcRecordsRef.current = [...salveCalcRecordsRef.current, {
      expr: currentCalcExprRef.current,
      correctAnswer: currentCalcAnswerRef.current,
      userAnswer: userVal,
      isCorrect,
    }];
    clearTimer();
    advanceInSalve();
  }, [phase.kind, calcInput, clearTimer, advanceInSalve]);

  // ---- Recall submission ----
  const submitRecall = useCallback(() => {
    const letters = salveLettersRef.current;
    const results = letters.map((l, i) => recallSelections[i] === l);
    setRecallResults(results);
    setRecallSubmitted(true);

    const correctCount = results.filter(Boolean).length;

    // Record in scorer: each letter is one "question"
    results.forEach((r) => scorer.recordAnswer(r));

    const result: SalveResult = {
      letters,
      userAnswers: recallSelections,
      correctCount,
      calcCorrect: salveCalcCorrectRef.current,
      calcTotal: salveCalcTotalRef.current,
      calcs: salveCalcRecordsRef.current,
    };

    setSalveResults((prev) => [...prev, result]);

    // In exam mode, skip feedback and go straight to next salve
    if (settingsRef.current.examMode) {
      const nextIdx = salveIndex + 1;
      if (nextIdx >= settingsRef.current.totalSalves) {
        setGameState('results');
      } else {
        startSalve(nextIdx);
      }
    }
  }, [recallSelections, scorer, salveIndex, startSalve]);

  const nextSalveOrEnd = useCallback(() => {
    const nextIdx = salveIndex + 1;
    if (nextIdx >= settingsRef.current.totalSalves) {
      setGameState('results');
    } else {
      startSalve(nextIdx);
    }
  }, [salveIndex, startSalve]);

  // ---- Keyboard handling for calc input ----
  const calcInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (phase.kind === 'calc' && calcInputRef.current) {
      calcInputRef.current.focus();
    }
  }, [phase]);

  // ---- Cleanup timer on unmount ----
  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  // ===========================================================================
  // RENDER
  // ===========================================================================

  // ---- MENU ----
  if (gameState === 'menu') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#fbfaf9] p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">Calcul & Memorisation</CardTitle>
            <CardDescription className="text-base mt-2">
              Test de double tache : calcul mental + memorisation de lettres
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="bg-[#f7f5f3] rounded-lg p-4 text-sm text-[#605a57] space-y-2">
              <p><strong>10 salves</strong> successives.</p>
              <p>Chaque salve alterne :</p>
              <ul className="list-disc list-inside ml-2 space-y-1">
                <li>Un <strong>calcul mental</strong> (a&times;b + c&times;d ou a&times;b - c&times;d)</li>
                <li>Une <strong>lettre</strong> a memoriser</li>
              </ul>
              <p>Entre <strong>4 et 9 lettres</strong> par salve.</p>
              <p><strong>10 secondes</strong> par element.</p>
              <p>A la fin de chaque salve, restituez les lettres dans l&apos;ordre.</p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-[#f7f5f3] rounded-lg">
                <p className="text-xl font-bold text-[#37322f]">{settings.totalSalves}</p>
                <p className="text-xs text-[#605a57]">Salves</p>
              </div>
              <div className="p-3 bg-[#f7f5f3] rounded-lg">
                <p className="text-xl font-bold text-[#37322f]">
                  {settings.minLetters === settings.maxLetters
                    ? settings.minLetters
                    : `${settings.minLetters}-${settings.maxLetters}`}
                </p>
                <p className="text-xs text-[#605a57]">Lettres/salve</p>
              </div>
              <div className="p-3 bg-[#f7f5f3] rounded-lg">
                <p className="text-xl font-bold text-[#37322f]">
                  {settings.calcTimeMs / 1000}s / {settings.letterTimeMs / 1000}s
                </p>
                <p className="text-xs text-[#605a57]">Calcul / Lettre</p>
              </div>
            </div>

            {settings.examMode && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm text-amber-700 text-center">
                ⚡ Mode examen — resultats uniquement a la fin
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
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#fbfaf9] p-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Parametres</CardTitle>
            <CardDescription>Ajustez le test a votre niveau</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-5">
              {/* Total salves */}
              <div>
                <Label>Nombre de salves : {settings.totalSalves}</Label>
                <Slider
                  value={[settings.totalSalves]}
                  onValueChange={([v]) => setSettings((s) => ({ ...s, totalSalves: v }))}
                  min={1}
                  max={20}
                  step={1}
                  className="mt-2"
                />
              </div>

              {/* Min letters */}
              <div>
                <Label>Lettres minimum par salve : {settings.minLetters}</Label>
                <Slider
                  value={[settings.minLetters]}
                  onValueChange={([v]) =>
                    setSettings((s) => ({
                      ...s,
                      minLetters: v,
                      maxLetters: Math.max(v, s.maxLetters),
                    }))
                  }
                  min={2}
                  max={12}
                  step={1}
                  className="mt-2"
                />
              </div>

              {/* Max letters */}
              <div>
                <Label>Lettres maximum par salve : {settings.maxLetters}</Label>
                <Slider
                  value={[settings.maxLetters]}
                  onValueChange={([v]) =>
                    setSettings((s) => ({
                      ...s,
                      maxLetters: v,
                      minLetters: Math.min(v, s.minLetters),
                    }))
                  }
                  min={2}
                  max={12}
                  step={1}
                  className="mt-2"
                />
              </div>

              {/* Calc time */}
              <div>
                <Label>Temps par calcul : {settings.calcTimeMs / 1000}s</Label>
                <Slider
                  value={[settings.calcTimeMs / 1000]}
                  onValueChange={([v]) => setSettings((s) => ({ ...s, calcTimeMs: v * 1000 }))}
                  min={3}
                  max={30}
                  step={1}
                  className="mt-2"
                />
              </div>

              {/* Letter time */}
              <div>
                <Label>Temps par lettre : {settings.letterTimeMs / 1000}s</Label>
                <Slider
                  value={[settings.letterTimeMs / 1000]}
                  onValueChange={([v]) => setSettings((s) => ({ ...s, letterTimeMs: v * 1000 }))}
                  min={1}
                  max={20}
                  step={1}
                  className="mt-2"
                />
              </div>

              {/* Exam mode */}
              <div className="flex items-center justify-between">
                <div>
                  <Label>Mode examen</Label>
                  <p className="text-xs text-[#605a57] mt-0.5">Pas de score entre les salves</p>
                </div>
                <Switch
                  checked={settings.examMode}
                  onCheckedChange={(v) => setSettings((s) => ({ ...s, examMode: v }))}
                />
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Button size="lg" className="w-full" onClick={() => setGameState('menu')}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Retour
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---- RESULTS ----
  if (gameState === 'results') {
    const scoreData = scorer.toJSON();
    const totalLetters = salveResults.reduce((s, r) => s + r.letters.length, 0);
    const totalLettersCorrect = salveResults.reduce((s, r) => s + r.correctCount, 0);
    const totalCalcs = salveResults.reduce((s, r) => s + r.calcTotal, 0);
    const totalCalcsCorrect = salveResults.reduce((s, r) => s + r.calcCorrect, 0);
    if (!perfSavedRef.current) {
      perfSavedRef.current = true;
      savePerformanceResult('calcul-memo', scoreData.correct, settings.totalSalves);
    }
    const perfEntries = loadEntries('calcul-memo');

    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#fbfaf9] p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">Résultats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <ClassScoreBlock
              exerciseId={'calcul-memo'}
              percent={scoreData.score}
              detail={`${totalLettersCorrect}/${totalLetters} lettres`}
            />

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-blue-600">{totalLettersCorrect}/{totalLetters}</p>
                <p className="text-sm text-blue-700">Lettres correctes</p>
              </div>
              <div className="p-4 bg-amber-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-amber-600">{totalCalcsCorrect}/{totalCalcs}</p>
                <p className="text-sm text-amber-700">Calculs corrects</p>
              </div>
            </div>

            {/* Per-salve breakdown */}
            <div className="space-y-2">
              <p className="font-semibold text-[#37322f] text-sm">Detail par salve :</p>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {salveResults.map((r, i) => (
                  <div key={i} className="flex items-center justify-between bg-[#f7f5f3] rounded px-3 py-1.5 text-sm">
                    <span className="text-[#605a57]">Salve {i + 1}</span>
                    <span>
                      <span className={r.correctCount === r.letters.length ? 'text-green-600 font-semibold' : 'text-red-600'}>
                        {r.correctCount}/{r.letters.length} lettres
                      </span>
                      <span className="text-slate-400 mx-2">|</span>
                      <span className={r.calcCorrect === r.calcTotal ? 'text-green-600' : 'text-[#605a57]'}>
                        {r.calcCorrect}/{r.calcTotal} calculs
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {perfEntries.length >= 2 && (
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-[#605a57] mb-2 text-center">Progression</p>
                <div className="flex justify-center">
                  <MiniPerformanceChart entries={perfEntries} exerciseId="calcul-memo" />
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

  // ---- PLAYING ----
  const timerPercent = currentPhaseDuration > 0 ? (timeLeft / currentPhaseDuration) * 100 : 0;
  const timerColor = timerPercent > 50 ? 'bg-amber-500' : timerPercent > 20 ? 'bg-orange-500' : 'bg-red-500';

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#fbfaf9] p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <Badge variant="outline" className="text-base px-3 py-1">
            Salve {salveIndex + 1} / {settings.totalSalves}
          </Badge>
          {phase.kind !== 'countdown' && phase.kind !== 'recall' && (
            <div className="text-sm text-[#605a57]">
              Lettres memorisees : {salveLettersRef.current.length} / {salveTotalLettersRef.current}
            </div>
          )}
        </div>

        {/* Timer bar */}
        {(phase.kind === 'calc' || phase.kind === 'letter') && (
          <div className="w-full h-2 bg-slate-200 rounded-full mb-6 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-100 ${timerColor}`}
              style={{ width: `${timerPercent}%` }}
            />
          </div>
        )}

        {/* COUNTDOWN */}
        {phase.kind === 'countdown' && (
          <Card className="text-center py-16">
            <CardContent>
              <p className="text-[#605a57] mb-4 text-lg">Salve {salveIndex + 1} — Preparez-vous</p>
              <p className="text-8xl font-bold text-amber-500 animate-pulse">{phase.value}</p>
              <p className="text-sm text-slate-400 mt-4">{salveTotalLettersRef.current} lettres a memoriser</p>
            </CardContent>
          </Card>
        )}

        {/* CALC */}
        {phase.kind === 'calc' && (
          <Card className="text-center py-10">
            <CardContent className="space-y-6">
              <p className="text-sm text-slate-400 uppercase tracking-wider">Calcul mental</p>
              <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-800 font-mono tracking-wide break-words leading-relaxed">
                {phase.expr}
              </p>
              <div className="flex items-center justify-center gap-3 max-w-xs mx-auto">
                <input
                  ref={calcInputRef}
                  type="number"
                  value={calcInput}
                  onChange={(e) => { calcInputValueRef.current = e.target.value; setCalcInput(e.target.value); }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && calcInput !== '') submitCalc();
                  }}
                  placeholder="?"
                  className="w-32 text-center text-2xl font-bold border-2 border-slate-300 rounded-lg py-2 focus:border-amber-500 focus:outline-none"
                />
                <Button
                  onClick={submitCalc}
                  disabled={calcInput === ''}
                  size="lg"
                >
                  OK
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* LETTER */}
        {phase.kind === 'letter' && (
          <Card className="text-center py-10">
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-400 uppercase tracking-wider">Memorisez cette lettre</p>
              <div className="inline-flex items-center justify-center w-32 h-32 bg-amber-500 rounded-2xl shadow-lg mx-auto">
                <span className="text-7xl font-bold text-white">{phase.letter}</span>
              </div>
              <p className="text-[#605a57]">
                Lettre {salveLettersRef.current.length} / {salveTotalLettersRef.current}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => advanceInSalve()}
                className="mt-2"
              >
                Suivant <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* RECALL */}
        {phase.kind === 'recall' && (
          <Card>
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-xl">Restituez les lettres dans l&apos;ordre</CardTitle>
              <CardDescription>Selectionnez la lettre correcte pour chaque position</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Grid: columns = letters, rows = 5 choices */}
              <div className="overflow-x-auto">
                <div className="flex gap-2 justify-center min-w-fit">
                  {recallGrid.map((choices, colIdx) => (
                    <div key={colIdx} className="flex flex-col items-center gap-1.5">
                      <span className="text-xs text-slate-400 font-semibold mb-1">#{colIdx + 1}</span>
                      {choices.map((letter) => {
                        const isSelected = recallSelections[colIdx] === letter;
                        const showFeedback = recallSubmitted && !settings.examMode;
                        const isCorrect = showFeedback && letter === salveLettersRef.current[colIdx];
                        const isWrong = showFeedback && isSelected && letter !== salveLettersRef.current[colIdx];

                        let btnClass = 'w-11 h-11 text-lg font-bold rounded-lg border-2 transition-all ';
                        if (showFeedback) {
                          if (isCorrect) btnClass += 'bg-green-100 border-green-500 text-green-700';
                          else if (isWrong) btnClass += 'bg-red-100 border-red-500 text-red-700';
                          else btnClass += 'bg-[#f7f5f3] border-slate-200 text-slate-400';
                        } else if (isSelected) {
                          btnClass += 'bg-amber-100 border-amber-500 text-amber-700';
                        } else {
                          btnClass += 'bg-white border-slate-200 text-[#37322f] hover:border-amber-400 hover:bg-amber-50';
                        }

                        return (
                          <button
                            key={letter}
                            className={btnClass}
                            disabled={recallSubmitted}
                            onClick={() => {
                              setRecallSelections((prev) => {
                                const next = [...prev];
                                next[colIdx] = letter;
                                return next;
                              });
                            }}
                          >
                            {letter}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit / Next */}
              {!recallSubmitted ? (
                <Button
                  className="w-full"
                  size="lg"
                  disabled={recallSelections.includes(null)}
                  onClick={submitRecall}
                >
                  Valider
                </Button>
              ) : !settings.examMode ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-lg font-semibold">
                      {recallResults.filter(Boolean).length} / {recallResults.length} lettres correctes
                    </p>
                  </div>

                  {/* Calc results - shown after letter validation */}
                  <div className="bg-[#f7f5f3] rounded-lg p-3 space-y-1.5">
                    <p className="text-sm font-semibold text-[#605a57] mb-2">
                      Resultats calculs : {salveCalcCorrectRef.current}/{salveCalcTotalRef.current}
                    </p>
                    {salveCalcRecordsRef.current.map((calc, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="font-mono text-[#37322f]">{calc.expr}</span>
                        <span className="flex items-center gap-2">
                          {calc.userAnswer !== null ? (
                            <>
                              <span className={calc.isCorrect ? 'text-green-600 font-semibold' : 'text-red-600 line-through'}>
                                {calc.userAnswer}
                              </span>
                              {!calc.isCorrect && (
                                <span className="text-green-600 font-semibold">{calc.correctAnswer}</span>
                              )}
                            </>
                          ) : (
                            <span className="text-orange-500 italic">temps ecoule ({calc.correctAnswer})</span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>

                  <Button className="w-full" size="lg" onClick={nextSalveOrEnd}>
                    {salveIndex + 1 >= settings.totalSalves ? 'Voir les resultats' : `Salve ${salveIndex + 2} →`}
                  </Button>
                </div>
              ) : null /* exam mode: submitRecall already advances */}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Scorer } from '@/lib/core/Scorer';
import { savePerformanceResult, loadEntries } from '@/lib/core/PerformanceTracker';
import { MiniPerformanceChart } from '@/components/PerformanceChart';
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
  numQuestions: number;
  timePerQuestionSec: number;
  examMode: boolean;
}

interface IntervalOption {
  min: number;
  max: number; // exclusive
}

interface QuestionData {
  expression: string;
  answer: number;
  intervals: IntervalOption[];
  correctIndices: number[]; // indices in `intervals` that contain the answer
}

interface QuestionResult {
  question: QuestionData;
  selected: Set<number>; // -1 means "Pas de reponses"
  isCorrect: boolean;
  timeUsedMs: number;
  timedOut: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const SETTINGS_KEY = 'aviatest-calcul-mental-4-settings';

const DEFAULT_SETTINGS: GameSettings = {
  numQuestions: 15,
  timePerQuestionSec: 45,
  examMode: false,
};

const BG = '#d4d4d4';
const NAVY = '#1a2b4a';
const TIMER_BLUE = '#0068C6';
const TIMER_RED = '#dc2626';

const NONE_IDX = -1;

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

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateChain(): { expression: string; answer: number } {
  const chainLength = randInt(6, 8);
  const parts: string[] = [];
  let answer = 0;
  for (let i = 0; i < chainLength; i++) {
    const sign = i === 0 ? (Math.random() < 0.5 ? '+' : '-') : Math.random() < 0.5 ? '+' : '-';
    const value = randInt(10, 90);
    if (sign === '+') {
      answer += value;
      parts.push(parts.length === 0 ? `${value}` : `+ ${value}`);
    } else {
      answer -= value;
      parts.push(parts.length === 0 ? `- ${value}` : `- ${value}`);
    }
  }
  return { expression: parts.join(' '), answer };
}

function generateAnswerInRange(): { expression: string; answer: number } {
  let best = generateChain();
  let attempts = 0;
  while ((best.answer < -80 || best.answer > 130) && attempts < 30) {
    best = generateChain();
    attempts++;
  }
  return best;
}

function makeContainingInterval(answer: number): IntervalOption {
  const width = randInt(20, 60);
  const offset = randInt(0, width - 1);
  const min = answer - offset;
  return { min, max: min + width };
}

function makeExcludingInterval(answer: number): IntervalOption {
  const width = randInt(20, 60);
  const gap = randInt(5, 50);
  const side = Math.random() < 0.5 ? -1 : 1;
  if (side < 0) {
    const max = answer - gap;
    return { min: max - width, max };
  }
  const min = answer + gap;
  return { min, max: min + width };
}

function generateQuestion(): QuestionData {
  const { expression, answer } = generateAnswerInRange();

  const noneCorrect = Math.random() < 0.15;
  const containingCount = noneCorrect ? 0 : randInt(1, 3);

  const list: IntervalOption[] = [];
  for (let i = 0; i < containingCount; i++) list.push(makeContainingInterval(answer));
  for (let i = 0; i < 7 - containingCount; i++) list.push(makeExcludingInterval(answer));

  const intervals = shuffle(list);
  const correctIndices = intervals
    .map((iv, idx) => (iv.min <= answer && answer < iv.max ? idx : -1))
    .filter((idx) => idx >= 0);

  return { expression, answer, intervals, correctIndices };
}

function generateQuestions(count: number): QuestionData[] {
  return Array.from({ length: count }, () => generateQuestion());
}

function formatInterval(iv: IntervalOption): string {
  return `[${iv.min}, ${iv.max}[`;
}

function setsEqual(selected: Set<number>, correct: number[]): boolean {
  if (correct.length === 0) {
    return selected.size === 1 && selected.has(NONE_IDX);
  }
  if (selected.has(NONE_IDX)) return false;
  if (selected.size !== correct.length) return false;
  return correct.every((idx) => selected.has(idx));
}

// ============================================================================
// Component
// ============================================================================

export default function CalculMental4Test() {
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

  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [locked, setLocked] = useState(false);
  const [showCorrection, setShowCorrection] = useState(false);

  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionStartRef = useRef(0);
  const perfSavedRef = useRef(false);

  const currentIdxRef = useRef(0);
  const questionsRef = useRef<QuestionData[]>([]);
  const selectedRef = useRef<Set<number>>(new Set());
  const lockedRef = useRef(false);

  currentIdxRef.current = currentIdx;
  questionsRef.current = questions;
  selectedRef.current = selected;
  lockedRef.current = locked;

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
        const left = Math.max(0, durationMs - elapsed);
        setTimeLeft(left);
      }, 50);
    },
    [clearTimer],
  );

  useEffect(() => () => clearTimer(), [clearTimer]);

  const toggleInterval = useCallback((idx: number) => {
    if (lockedRef.current) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (idx === NONE_IDX) {
        return next.has(NONE_IDX) ? new Set() : new Set([NONE_IDX]);
      }
      next.delete(NONE_IDX);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }, []);

  const goToNextQuestion = useCallback(() => {
    const idx = currentIdxRef.current;
    const qs = questionsRef.current;

    if (idx + 1 >= qs.length) {
      clearTimer();
      setLocked(false);
      lockedRef.current = false;
      setShowCorrection(false);
      setGameState('results');
      return;
    }

    const nextIdx = idx + 1;
    currentIdxRef.current = nextIdx;
    setCurrentIdx(nextIdx);
    setSelected(new Set());
    selectedRef.current = new Set();
    setLocked(false);
    lockedRef.current = false;
    setShowCorrection(false);
    startTimer(settingsRef.current.timePerQuestionSec * 1000);
  }, [clearTimer, startTimer]);

  const submitAnswer = useCallback(
    (timedOut: boolean) => {
      if (lockedRef.current) return;
      lockedRef.current = true;
      setLocked(true);
      clearTimer();

      const timeUsed = Date.now() - questionStartRef.current;
      const q = questionsRef.current[currentIdxRef.current];
      const chosen = new Set(selectedRef.current);
      const isCorrect = setsEqual(chosen, q.correctIndices);

      scorer.recordAnswer(isCorrect);

      const result: QuestionResult = {
        question: q,
        selected: chosen,
        isCorrect,
        timeUsedMs: timeUsed,
        timedOut,
      };
      setResults((prev) => [...prev, result]);

      if (settingsRef.current.examMode) {
        goToNextQuestion();
      } else {
        setShowCorrection(true);
      }
    },
    [clearTimer, goToNextQuestion, scorer],
  );

  const startGame = useCallback(() => {
    scorer.reset();
    perfSavedRef.current = false;
    const qs = generateQuestions(settingsRef.current.numQuestions);
    setQuestions(qs);
    questionsRef.current = qs;
    setCurrentIdx(0);
    currentIdxRef.current = 0;
    setResults([]);
    setSelected(new Set());
    selectedRef.current = new Set();
    setLocked(false);
    lockedRef.current = false;
    setShowCorrection(false);
    setGameState('playing');
    startTimer(settingsRef.current.timePerQuestionSec * 1000);
  }, [scorer, startTimer]);

  // Timer expiry -> auto-submit with current selection
  useEffect(() => {
    if (gameState !== 'playing' || locked) return;
    if (totalTime > 0 && timeLeft <= 0) {
      submitAnswer(true);
    }
  }, [timeLeft, totalTime, gameState, locked, submitAnswer]);

  // =========================================================================
  // MENU
  // =========================================================================
  if (gameState === 'menu') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">Calcul Mental 4</CardTitle>
            <CardDescription className="mt-2 text-base">
              Calculez le resultat et cochez les intervalles qui le contiennent
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
              <p>
                <strong>{settings.numQuestions} operations</strong> a resoudre.
              </p>
              <p>Chaque operation est une chaine de <strong>6 a 8 termes</strong> (additions/soustractions).</p>
              <p>7 intervalles sont proposes : cochez <strong>tous ceux qui contiennent</strong> le resultat.</p>
              <p>Si aucun intervalle ne convient, cochez <strong>« Pas de reponses »</strong>.</p>
              <p>
                <strong>{settings.timePerQuestionSec}s</strong> par question.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xl font-bold text-slate-700">{settings.numQuestions}</p>
                <p className="text-xs text-slate-500">Questions</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xl font-bold text-slate-700">7</p>
                <p className="text-xs text-slate-500">Intervalles</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xl font-bold text-slate-700">{settings.timePerQuestionSec}s</p>
                <p className="text-xs text-slate-500">Par question</p>
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
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Parametres</CardTitle>
            <CardDescription>Ajustez le test a votre niveau</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-5">
              <div>
                <Label>Nombre de questions : {settings.numQuestions}</Label>
                <Slider
                  value={[settings.numQuestions]}
                  onValueChange={([v]) => setSettings((s) => ({ ...s, numQuestions: v }))}
                  min={5}
                  max={30}
                  step={1}
                  className="mt-2"
                />
              </div>
              <div>
                <Label>Temps par question : {settings.timePerQuestionSec}s</Label>
                <Slider
                  value={[settings.timePerQuestionSec]}
                  onValueChange={([v]) => setSettings((s) => ({ ...s, timePerQuestionSec: v }))}
                  min={15}
                  max={90}
                  step={5}
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
      savePerformanceResult('calcul-mental-4', scoreData.correct, questions.length, avgMs);
    }

    const perfEntries = loadEntries('calcul-mental-4');

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">Resultats</CardTitle>
            <Badge
              variant={scoreData.accuracy >= 75 ? 'default' : scoreData.accuracy >= 50 ? 'secondary' : 'destructive'}
              className="mt-2 px-4 py-1 text-lg"
            >
              {scoreData.grade}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-5xl font-bold text-slate-700">{scoreData.score}%</p>
              <p className="mt-1 text-slate-500">Bonnes reponses</p>
            </div>

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
              <p className="text-sm font-semibold text-slate-700">Detail par question :</p>
              <div className="max-h-64 space-y-1.5 overflow-y-auto">
                {results.map((r, i) => (
                  <div key={i} className="rounded bg-slate-50 px-3 py-2 text-sm">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-slate-500">Q{i + 1}</span>
                      <span className={r.isCorrect ? 'font-semibold text-green-600' : 'font-semibold text-red-600'}>
                        {r.isCorrect ? '\u2713' : '\u2717'}
                        {r.timedOut ? ' (temps ecoule)' : ''}
                      </span>
                    </div>
                    <p className="font-mono text-xs text-slate-400">
                      {r.question.expression} = {r.question.answer}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Reponse correcte :{' '}
                      {r.question.correctIndices.length === 0
                        ? 'Pas de reponses'
                        : r.question.correctIndices.map((idx) => formatInterval(r.question.intervals[idx])).join(', ')}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {perfEntries.length >= 2 && (
              <div className="border-t pt-4">
                <p className="mb-2 text-center text-sm font-medium text-slate-500">Progression</p>
                <div className="flex justify-center">
                  <MiniPerformanceChart entries={perfEntries} exerciseId="calcul-mental-4" />
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
  const currentQ = questions[currentIdx];
  const timerPercent = totalTime > 0 ? (timeLeft / totalTime) * 100 : 100;
  const timerFillColor = timerPercent > 20 ? TIMER_BLUE : TIMER_RED;
  const lastResult = results[results.length - 1];

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: BG, color: NAVY }}>
      <div className="relative mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-6">
        {/* Vertical chrono bar */}
        <div
          className="absolute bottom-6 right-2 top-6 flex w-3 flex-col overflow-hidden rounded-full"
          style={{ backgroundColor: '#bbb' }}
        >
          <div
            className="w-full transition-all duration-100"
            style={{ height: `${timerPercent}%`, backgroundColor: timerFillColor }}
          />
          <div className="flex-1" />
        </div>

        <div className="mb-4 flex items-center justify-between pr-8">
          <Badge variant="outline" className="bg-white px-3 py-1 text-base">
            {currentIdx + 1} &rarr; {settings.numQuestions}
          </Badge>
        </div>

        {showCorrection && lastResult ? (
          <Card className="mr-6 py-8">
            <CardContent className="space-y-6">
              <p className="text-center font-mono text-lg text-slate-500">{currentQ.expression}</p>
              <p className="text-center text-2xl font-bold text-slate-800">= {currentQ.answer}</p>

              <div className="text-center">
                {lastResult.isCorrect ? (
                  <p className="text-3xl font-bold text-green-600">{'\u2713'} Correct !</p>
                ) : (
                  <p className="text-3xl font-bold text-red-600">{'\u2717'} Incorrect</p>
                )}
              </div>

              <div className="mx-auto grid max-w-md grid-cols-2 gap-2">
                {currentQ.intervals.map((iv, idx) => {
                  const isCorrectOpt = currentQ.correctIndices.includes(idx);
                  const wasSelected = lastResult.selected.has(idx);
                  let style = 'bg-white border-2 border-slate-200 text-slate-600';
                  if (isCorrectOpt && wasSelected) style = 'bg-green-100 border-2 border-green-500 text-green-800';
                  else if (isCorrectOpt && !wasSelected) style = 'bg-green-50 border-2 border-green-400 text-green-700';
                  else if (!isCorrectOpt && wasSelected) style = 'bg-red-100 border-2 border-red-500 text-red-800';
                  return (
                    <div key={idx} className={`rounded-lg px-3 py-2 text-sm font-semibold ${style}`}>
                      {formatInterval(iv)}
                    </div>
                  );
                })}
                <div
                  className={`col-span-2 rounded-lg px-3 py-2 text-center text-sm font-semibold ${
                    currentQ.correctIndices.length === 0 && lastResult.selected.has(NONE_IDX)
                      ? 'border-2 border-green-500 bg-green-100 text-green-800'
                      : currentQ.correctIndices.length === 0
                        ? 'border-2 border-green-400 bg-green-50 text-green-700'
                        : lastResult.selected.has(NONE_IDX)
                          ? 'border-2 border-red-500 bg-red-100 text-red-800'
                          : 'border-2 border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  Pas de reponses
                </div>
              </div>

              <div className="text-center">
                <Button size="lg" onClick={goToNextQuestion}>
                  {currentIdx + 1 >= questions.length ? 'Voir les resultats' : 'Suivant'}
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="mr-6 py-8">
              <CardContent className="space-y-2">
                <p className="text-center text-sm text-slate-400">Calculez le resultat</p>
                <p className="break-words text-center font-mono text-xl font-bold leading-relaxed tracking-wide text-slate-800 sm:text-2xl">
                  {currentQ?.expression}
                </p>
              </CardContent>
            </Card>

            <Card className="mr-6 mt-4 flex-1 py-6">
              <CardContent>
                <p className="mb-3 text-center text-sm text-slate-500">
                  Cochez tous les intervalles qui contiennent le resultat :
                </p>
                <div className="mx-auto grid max-w-md grid-cols-2 gap-2">
                  {currentQ?.intervals.map((iv, idx) => {
                    const isSelected = selected.has(idx);
                    return (
                      <button
                        key={idx}
                        type="button"
                        disabled={locked}
                        onClick={() => toggleInterval(idx)}
                        className={`rounded-lg px-3 py-3 text-sm font-semibold shadow-sm transition-all disabled:opacity-60 ${
                          isSelected
                            ? 'scale-[1.02] border-2 border-blue-500 bg-blue-100 text-blue-800'
                            : 'border-2 border-transparent bg-white text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        {formatInterval(iv)}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    disabled={locked}
                    onClick={() => toggleInterval(NONE_IDX)}
                    className={`col-span-2 rounded-lg px-3 py-3 text-sm font-semibold shadow-sm transition-all disabled:opacity-60 ${
                      selected.has(NONE_IDX)
                        ? 'scale-[1.02] border-2 border-blue-500 bg-blue-100 text-blue-800'
                        : 'border-2 border-transparent bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    Pas de reponses
                  </button>
                </div>

                <div className="mt-5 text-center">
                  <Button size="lg" onClick={() => submitAnswer(false)} disabled={selected.size === 0 || locked}>
                    Valider
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

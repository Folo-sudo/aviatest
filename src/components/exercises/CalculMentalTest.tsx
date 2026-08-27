'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Scorer } from '@/lib/core/Scorer';
import { savePerformanceResult } from '@/lib/core/PerformanceTracker';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ExerciseMenu,
  ExerciseResults,
  ExerciseSettings,
  SettingSlider,
  SettingSwitch,
} from '@/components/exercises/shell';
import { ChevronRight, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';

// ============================================================================
// Types
// ============================================================================

type GameState = 'menu' | 'settings' | 'playing' | 'results';

interface GameSettings {
  totalQuestions: number;
  chainLength: number;       // number of terms in the +/- chain (e.g. 8)
  maxNumber: number;         // max value for chain terms (e.g. 99)
  includeMultiply: boolean;  // include ab*cd multiplications
  timeLimitSec: number;      // seconds for the whole exercise (0 = no limit)
  examMode: boolean;         // no corrections between questions
}

interface QuestionData {
  expression: string;
  answer: number;
}

interface QuestionResult {
  question: QuestionData;
  userAnswer: number | null;
  isCorrect: boolean;
  timeUsedMs: number;
}

// ============================================================================
// Helpers
// ============================================================================

const DEFAULT_SETTINGS: GameSettings = {
  totalQuestions: 10,
  chainLength: 8,
  maxNumber: 99,
  includeMultiply: true,
  timeLimitSec: 600,
  examMode: false,
};

const SETTINGS_KEY = 'aviatest-calcul-mental-settings';

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

function generateQuestion(settings: GameSettings): QuestionData {
  const chainLength = settings.chainLength;
  const maxNum = settings.maxNumber;

  const terms: { sign: '+' | '-'; value: number }[] = [];
  // First term: random sign
  const firstSign = Math.random() < 0.5 ? '+' : '-';
  const firstVal = randInt(10, maxNum);
  terms.push({ sign: firstSign as '+' | '-', value: firstVal });

  for (let i = 1; i < chainLength; i++) {
    const sign = Math.random() < 0.5 ? '+' : '-';
    const val = randInt(10, maxNum);
    terms.push({ sign: sign as '+' | '-', value: val });
  }

  let answer = 0;
  const parts: string[] = [];
  for (const t of terms) {
    if (t.sign === '+') {
      answer += t.value;
      parts.push(parts.length === 0 ? `${t.value}` : `+ ${t.value}`);
    } else {
      answer -= t.value;
      parts.push(parts.length === 0 ? `- ${t.value}` : `- ${t.value}`);
    }
  }

  // Append multiplication ab x cd at the end
  if (settings.includeMultiply) {
    const a = randInt(11, 99);
    const b = randInt(11, 99);
    const mulSign = Math.random() < 0.5 ? '+' : '-';
    const mulResult = a * b;
    if (mulSign === '+') {
      answer += mulResult;
      parts.push(`+ ${a} x ${b}`);
    } else {
      answer -= mulResult;
      parts.push(`- ${a} x ${b}`);
    }
  }

  return { expression: parts.join(' '), answer };
}

// ============================================================================
// Component
// ============================================================================

export default function CalculMentalTest() {
  const router = useRouter();
  const [gameState, setGameState] = useState<GameState>('menu');
  const [settings, setSettings] = useState<GameSettings>({ ...DEFAULT_SETTINGS });
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const [scorer] = useState(() => new Scorer());

  // Load settings from localStorage
  useEffect(() => {
    const saved = loadSettings();
    setSettings(saved);
    setSettingsLoaded(true);
  }, []);

  useEffect(() => {
    if (settingsLoaded) saveSettings(settings);
  }, [settings, settingsLoaded]);

  // Game state
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userInput, setUserInput] = useState('');
  const userInputRef = useRef('');
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [showCorrection, setShowCorrection] = useState(false);

  // Timer
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const timerStartRef = useRef(0);       // global timer start
  const questionStartRef = useRef(0);    // per-question timing

  const inputRef = useRef<HTMLInputElement>(null);
  const perfSavedRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback((durationMs: number) => {
    clearTimer();
    timerStartRef.current = Date.now();
    setTotalTime(durationMs);
    setTimeLeft(durationMs);
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - timerStartRef.current;
      const left = Math.max(0, durationMs - elapsed);
      setTimeLeft(left);
    }, 50);
  }, [clearTimer]);

  const pauseTimer = useCallback(() => {
    clearTimer();
  }, [clearTimer]);

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

  // Generate all questions at start
  const startGame = useCallback(() => {
    scorer.reset();
    perfSavedRef.current = false;
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
    setGameState('playing');
    questionStartRef.current = Date.now();
    if (settingsRef.current.timeLimitSec > 0) {
      startTimer(settingsRef.current.timeLimitSec * 1000);
    }
  }, [scorer, startTimer]);

  // Submit answer
  const submitAnswer = useCallback(() => {
    const timeUsed = Date.now() - questionStartRef.current;
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
    };

    setResults(prev => [...prev, result]);
    questionStartRef.current = Date.now();

    if (settingsRef.current.examMode || currentIdx + 1 >= questions.length) {
      if (currentIdx + 1 >= questions.length) {
        clearTimer();
        setGameState('results');
      } else {
        const nextIdx = currentIdx + 1;
        setCurrentIdx(nextIdx);
        setUserInput('');
        userInputRef.current = '';
        setShowCorrection(false);
      }
    } else {
      setShowCorrection(true);
      pauseTimer();
    }
  }, [clearTimer, userInput, questions, currentIdx, scorer, pauseTimer]);

  // Next question after correction
  const nextQuestion = useCallback(() => {
    if (currentIdx + 1 >= questions.length) {
      clearTimer();
      setGameState('results');
      return;
    }
    const nextIdx = currentIdx + 1;
    setCurrentIdx(nextIdx);
    setUserInput('');
    userInputRef.current = '';
    setShowCorrection(false);
    questionStartRef.current = Date.now();
    resumeTimer();
  }, [currentIdx, questions.length, clearTimer, resumeTimer]);

  // Global timer expiry → go to results
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
  // RENDER
  // =========================================================================

  // ---- MENU ----
  if (gameState === 'menu') {
    return (
      <ExerciseMenu
        title="Calcul Mental 1"
        subtitle="Résolvez des opérations de calcul mental le plus vite possible"
        stats={[
          { value: settings.totalQuestions, label: 'Questions' },
          { value: settings.chainLength, label: 'Termes' },
          {
            value: settings.timeLimitSec > 0 ? `${Math.floor(settings.timeLimitSec / 60)}m` : '\u221E',
            label: 'Temps total',
          },
        ]}
        examMode={settings.examMode}
        onPlay={startGame}
        onSettings={() => setGameState('settings')}
        onBack={() => router.push('/')}
      >
        <div className="space-y-2 rounded-lg bg-[#f7f5f3] p-4 text-sm text-[#605a57]">
          <p>
            <strong>{settings.totalQuestions} opérations</strong> à résoudre.
          </p>
          <p>
            Chaque opération est une chaîne de <strong>{settings.chainLength} termes</strong>{' '}
            (additions/soustractions de nombres à 2 chiffres).
          </p>
          {settings.includeMultiply && (
            <p>
              Certaines opérations incluent des <strong>multiplications ab &times; cd</strong>.
            </p>
          )}
          {settings.timeLimitSec > 0 && (
            <p>
              Temps total :{' '}
              <strong>
                {Math.floor(settings.timeLimitSec / 60)}min
                {settings.timeLimitSec % 60 > 0 ? ` ${settings.timeLimitSec % 60}s` : ''}
              </strong>
              .
            </p>
          )}
        </div>
      </ExerciseMenu>
    );
  }

  // ---- SETTINGS ----
  if (gameState === 'settings') {
    return (
      <ExerciseSettings
        description="Ajustez le test à votre niveau"
        examMode={{
          checked: settings.examMode,
          onCheckedChange: (v) => setSettings((s) => ({ ...s, examMode: v })),
        }}
        onBack={() => setGameState('menu')}
      >
        <SettingSlider
          label="Nombre de questions"
          value={settings.totalQuestions}
          min={1}
          max={30}
          step={1}
          onChange={(v) => setSettings((s) => ({ ...s, totalQuestions: v }))}
        />
        <SettingSlider
          label="Termes par chaîne"
          value={settings.chainLength}
          min={3}
          max={15}
          step={1}
          onChange={(v) => setSettings((s) => ({ ...s, chainLength: v }))}
        />
        <SettingSlider
          label="Nombre max"
          value={settings.maxNumber}
          min={20}
          max={999}
          step={1}
          onChange={(v) => setSettings((s) => ({ ...s, maxNumber: v }))}
        />
        <SettingSlider
          label="Temps total"
          value={settings.timeLimitSec}
          min={0}
          max={1800}
          step={30}
          format={(v) =>
            v > 0
              ? `${Math.floor(v / 60)}min${v % 60 > 0 ? ` ${v % 60}s` : ''}`
              : 'Illimité'
          }
          onChange={(v) => setSettings((s) => ({ ...s, timeLimitSec: v }))}
        />
        <SettingSwitch
          label="Multiplications ab × cd"
          hint="Inclure des multiplications 2 chiffres"
          checked={settings.includeMultiply}
          onCheckedChange={(v) => setSettings((s) => ({ ...s, includeMultiply: v }))}
        />
      </ExerciseSettings>
    );
  }

  // ---- RESULTS ----
  if (gameState === 'results') {
    const scoreData = scorer.toJSON();
    const totalCorrect = results.filter(r => r.isCorrect).length;
    const avgTime = results.length > 0
      ? Math.round(results.reduce((s, r) => s + r.timeUsedMs, 0) / results.length / 1000 * 10) / 10
      : 0;
    if (!perfSavedRef.current) {
      perfSavedRef.current = true;
      const avgMs = results.length > 0 ? results.reduce((s, r) => s + r.timeUsedMs, 0) / results.length : 0;
      savePerformanceResult('calcul-mental', scoreData.correct, questions.length, avgMs);
    }
    return (
      <ExerciseResults
        exerciseId="calcul-mental"
        percent={scoreData.score}
        detail={`${totalCorrect}/${results.length} correctes`}
        onReplay={startGame}
        onMenu={() => setGameState('menu')}
        onHome={() => router.push('/')}
      >
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
          <p className="text-sm font-semibold text-[#37322f]">Détail par question :</p>
          <div className="max-h-64 space-y-1.5 overflow-y-auto">
            {results.map((r, i) => (
              <div key={i} className="rounded bg-[#f7f5f3] px-3 py-2 text-sm">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[#605a57]">Q{i + 1}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[#605a57]">{(r.timeUsedMs / 1000).toFixed(1)}s</span>
                    <span
                      className={
                        r.isCorrect ? 'font-semibold text-green-600' : 'font-semibold text-red-600'
                      }
                    >
                      {r.isCorrect ? '✓' : '✗'} {r.userAnswer !== null ? r.userAnswer : 'Pas de réponse'}
                      {!r.isCorrect && <span className="ml-2 text-green-600">({r.question.answer})</span>}
                    </span>
                  </div>
                </div>
                <p className="font-mono text-xs text-[#605a57]">
                  {r.question.expression} = {r.question.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </ExerciseResults>
    );
  }

  // ---- PLAYING ----
  const currentQ = questions[currentIdx];
  const timerPercent = totalTime > 0 ? (timeLeft / totalTime) * 100 : 100;
  const timerColor = timerPercent > 50 ? 'bg-blue-500' : timerPercent > 20 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#fbfaf9] p-4">
      <div className="w-full max-w-4xl relative">
        {/* Vertical timer bar (like pilotest) */}
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
        <div className="flex items-center justify-between mb-6 pr-6">
          <Badge variant="outline" className="text-base px-3 py-1">
            {currentIdx} &rarr; {settings.totalQuestions}
          </Badge>
        </div>

        {showCorrection ? (
          /* Correction view */
          <Card className="text-center py-10 mr-6">
            <CardContent className="space-y-6">
              <p className="text-lg text-[#605a57] font-mono">{currentQ.expression}</p>
              <div className="space-y-2">
                {results[results.length - 1]?.isCorrect ? (
                  <p className="text-3xl font-bold text-green-600">✓ Correct !</p>
                ) : (
                  <>
                    <p className="text-3xl font-bold text-red-600">
                      ✗ {results[results.length - 1]?.userAnswer ?? 'Pas de reponse'}
                    </p>
                    <p className="text-xl text-green-600">Reponse : {currentQ.answer}</p>
                  </>
                )}
              </div>
              <Button size="lg" onClick={nextQuestion}>
                {currentIdx + 1 >= questions.length ? 'Voir les resultats' : 'Suivant'}
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </CardContent>
          </Card>
        ) : (
          /* Question view */
          <Card className="text-center py-10 mr-6">
            <CardContent className="space-y-6">
              <p className="text-base sm:text-xl md:text-2xl font-bold text-slate-800 font-mono tracking-wide break-words text-center leading-relaxed">
                {currentQ?.expression}
              </p>
              <p className="text-sm text-slate-400">Resoudre l&apos;operation ci-dessus</p>
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
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

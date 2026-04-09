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
import { ArrowLeft, Play, RotateCcw, Home, ChevronRight, Settings, Eye } from 'lucide-react';
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
    }
  }, [clearTimer, userInput, questions, currentIdx, scorer]);

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
  }, [currentIdx, questions.length, clearTimer]);

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
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">Calcul Mental 1</CardTitle>
            <CardDescription className="text-base mt-2">
              Resolvez des operations de calcul mental le plus vite possible
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-600 space-y-2">
              <p><strong>{settings.totalQuestions} operations</strong> a resoudre.</p>
              <p>Chaque operation est une chaine de <strong>{settings.chainLength} termes</strong> (additions/soustractions de nombres a 2 chiffres).</p>
              {settings.includeMultiply && (
                <p>Certaines operations incluent des <strong>multiplications ab &times; cd</strong>.</p>
              )}
              {settings.timeLimitSec > 0 && (
                <p>Temps total : <strong>{Math.floor(settings.timeLimitSec / 60)}min{settings.timeLimitSec % 60 > 0 ? ` ${settings.timeLimitSec % 60}s` : ''}</strong>.</p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xl font-bold text-slate-700">{settings.totalQuestions}</p>
                <p className="text-xs text-slate-500">Questions</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xl font-bold text-slate-700">{settings.chainLength}</p>
                <p className="text-xs text-slate-500">Termes</p>
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
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Parametres</CardTitle>
            <CardDescription>Ajustez le test a votre niveau</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-5">
              <div>
                <Label>Nombre de questions : {settings.totalQuestions}</Label>
                <Slider
                  value={[settings.totalQuestions]}
                  onValueChange={([v]) => setSettings(s => ({ ...s, totalQuestions: v }))}
                  min={1} max={30} step={1} className="mt-2"
                />
              </div>
              <div>
                <Label>Termes par chaine : {settings.chainLength}</Label>
                <Slider
                  value={[settings.chainLength]}
                  onValueChange={([v]) => setSettings(s => ({ ...s, chainLength: v }))}
                  min={3} max={15} step={1} className="mt-2"
                />
              </div>
              <div>
                <Label>Nombre max : {settings.maxNumber}</Label>
                <Slider
                  value={[settings.maxNumber]}
                  onValueChange={([v]) => setSettings(s => ({ ...s, maxNumber: v }))}
                  min={20} max={999} step={1} className="mt-2"
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
                  <Label>Multiplications ab &times; cd</Label>
                  <p className="text-xs text-slate-500 mt-0.5">Inclure des multiplications 2 chiffres</p>
                </div>
                <Switch
                  checked={settings.includeMultiply}
                  onCheckedChange={v => setSettings(s => ({ ...s, includeMultiply: v }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Mode examen</Label>
                  <p className="text-xs text-slate-500 mt-0.5">Pas de correction entre les questions</p>
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
    if (!perfSavedRef.current) {
      perfSavedRef.current = true;
      const avgMs = results.length > 0 ? results.reduce((s, r) => s + r.timeUsedMs, 0) / results.length : 0;
      savePerformanceResult('calcul-mental', scoreData.correct, questions.length, avgMs);
    }
    const perfEntries = loadEntries('calcul-mental');

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
              <p className="text-slate-500 mt-1">Bonnes reponses</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-blue-600">{totalCorrect}/{results.length}</p>
                <p className="text-sm text-blue-700">Correct</p>
              </div>
              <div className="p-4 bg-amber-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-amber-600">{avgTime}s</p>
                <p className="text-sm text-amber-700">Temps moyen</p>
              </div>
            </div>

            {/* Per-question breakdown */}
            <div className="space-y-2">
              <p className="font-semibold text-slate-700 text-sm">Detail par question :</p>
              <div className="max-h-64 overflow-y-auto space-y-1.5">
                {results.map((r, i) => (
                  <div key={i} className="bg-slate-50 rounded px-3 py-2 text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-500">Q{i + 1}</span>
                      <span className={r.isCorrect ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                        {r.isCorrect ? '✓' : '✗'}
                        {' '}
                        {r.userAnswer !== null ? r.userAnswer : 'Pas de reponse'}
                        {!r.isCorrect && <span className="text-green-600 ml-2">({r.question.answer})</span>}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-mono">{r.question.expression} = {r.question.answer}</p>
                  </div>
                ))}
              </div>
            </div>

            {perfEntries.length >= 2 && (
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-slate-500 mb-2 text-center">Progression</p>
                <div className="flex justify-center">
                  <MiniPerformanceChart entries={perfEntries} exerciseId="calcul-mental" />
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
  const currentQ = questions[currentIdx];
  const timerPercent = totalTime > 0 ? (timeLeft / totalTime) * 100 : 100;
  const timerColor = timerPercent > 50 ? 'bg-blue-500' : timerPercent > 20 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
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
              <p className="text-lg text-slate-500 font-mono">{currentQ.expression}</p>
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

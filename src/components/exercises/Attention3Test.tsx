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
  totalSymbols: number;    // total number of symbols per line (X, /, +)
  timeLimitSec: number;
  examMode: boolean;
}

type Symbol = 'X' | '/' | '+';

interface QuestionData {
  symbols: Symbol[];
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
  totalQuestions: 12,
  totalSymbols: 80,
  timeLimitSec: 60,
  examMode: false,
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

function generateQuestion(settings: GameSettings): QuestionData {
  const total = settings.totalSymbols;
  const symbols: Symbol[] = [];

  // Start with some X's in positive mode
  let pos = 0;

  while (pos < total) {
    // Decide: add a run of X's, then maybe a / or +
    const runLen = randInt(2, 8);
    const actualRun = Math.min(runLen, total - pos);
    for (let i = 0; i < actualRun; i++) {
      symbols.push('X');
      pos++;
    }
    if (pos >= total) break;

    // Insert a / or + (weighted: / more frequent than +)
    const r = Math.random();
    if (r < 0.55) {
      symbols.push('/');
    } else if (r < 0.75) {
      symbols.push('+');
    } else {
      // Sometimes double slash //
      symbols.push('/');
      pos++;
      if (pos < total) {
        // Small chance of another slash right after
        if (Math.random() < 0.3) {
          symbols.push('/');
          pos++;
        }
      }
    }
    pos++;
  }

  // Trim to exact length
  while (symbols.length > total) symbols.pop();

  // Ensure we have at least one / and one + for variety
  let hasSlash = symbols.includes('/');
  let hasPlus = symbols.includes('+');
  if (!hasSlash && symbols.length > 5) {
    symbols[randInt(3, Math.min(10, symbols.length - 2))] = '/';
  }
  if (!hasPlus && symbols.length > 10) {
    // Place a + after the first /
    const slashIdx = symbols.indexOf('/');
    if (slashIdx >= 0 && slashIdx + 4 < symbols.length) {
      symbols[slashIdx + randInt(2, 4)] = '+';
    }
  }

  // Calculate answer
  let mode = 1; // +1 = positive, -1 = negative
  let count = 0;
  for (const sym of symbols) {
    if (sym === '/') {
      mode = -1;
    } else if (sym === '+') {
      mode = 1;
    } else {
      // X
      count += mode;
    }
  }

  return { symbols, answer: count };
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

  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userInput, setUserInput] = useState('');
  const userInputRef = useRef('');
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [showCorrection, setShowCorrection] = useState(false);

  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const questionStartRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
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

  useEffect(() => () => clearTimer(), [clearTimer]);

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
    setGameState('playing');
    questionStartRef.current = Date.now();
    if (settingsRef.current.timeLimitSec > 0) {
      startTimer(settingsRef.current.timeLimitSec * 1000);
    }
  }, [scorer, startTimer]);

  const submitAnswer = useCallback((timedOut = false) => {
    clearTimer();
    const timeUsed = Date.now() - questionStartRef.current;
    const typed = timedOut ? userInputRef.current.trim() : userInput.trim();
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

    if (settingsRef.current.examMode || currentIdx + 1 >= questions.length) {
      if (currentIdx + 1 >= questions.length) {
        setGameState('results');
      } else {
        const nextIdx = currentIdx + 1;
        setCurrentIdx(nextIdx);
        setUserInput('');
        userInputRef.current = '';
        setShowCorrection(false);
        questionStartRef.current = Date.now();
        if (settingsRef.current.timeLimitSec > 0) {
          startTimer(settingsRef.current.timeLimitSec * 1000);
        }
      }
    } else {
      setShowCorrection(true);
    }
  }, [clearTimer, userInput, questions, currentIdx, scorer, startTimer]);

  const nextQuestion = useCallback(() => {
    if (currentIdx + 1 >= questions.length) {
      setGameState('results');
      return;
    }
    const nextIdx = currentIdx + 1;
    setCurrentIdx(nextIdx);
    setUserInput('');
    userInputRef.current = '';
    setShowCorrection(false);
    questionStartRef.current = Date.now();
    if (settingsRef.current.timeLimitSec > 0) {
      startTimer(settingsRef.current.timeLimitSec * 1000);
    }
  }, [currentIdx, questions.length, startTimer]);

  useEffect(() => {
    if (timeLeft <= 0 && totalTime > 0 && gameState === 'playing' && !showCorrection) {
      submitAnswer(true);
    }
  }, [timeLeft, totalTime, gameState, showCorrection, submitAnswer]);

  useEffect(() => {
    if (gameState === 'playing' && !showCorrection && inputRef.current) {
      inputRef.current.focus();
    }
  }, [gameState, currentIdx, showCorrection]);

  // =========================================================================
  // Render symbol sequence with colors
  // =========================================================================

  function renderSymbols(symbols: Symbol[], showColors = false) {
    if (!showColors) {
      return (
        <p className="text-lg sm:text-xl md:text-2xl font-bold text-slate-800 font-mono tracking-widest leading-relaxed break-all select-none">
          {symbols.join(' ')}
        </p>
      );
    }

    // With colors for correction view
    let mode = 1;
    const spans: React.ReactNode[] = [];
    symbols.forEach((sym, i) => {
      if (sym === '/') {
        mode = -1;
        spans.push(
          <span key={i} className="text-red-500 font-black">{sym}</span>
        );
      } else if (sym === '+') {
        mode = 1;
        spans.push(
          <span key={i} className="text-green-500 font-black">{sym}</span>
        );
      } else {
        spans.push(
          <span key={i} className={mode === 1 ? 'text-green-700' : 'text-red-600'}>{sym}</span>
        );
      }
      if (i < symbols.length - 1) spans.push(<span key={`sp-${i}`}> </span>);
    });

    return (
      <p className="text-lg sm:text-xl md:text-2xl font-bold font-mono tracking-widest leading-relaxed break-all select-none">
        {spans}
      </p>
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
              {settings.timeLimitSec > 0 && (
                <p><strong>{settings.timeLimitSec}s</strong> par sequence.</p>
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
                  {settings.timeLimitSec > 0 ? `${settings.timeLimitSec}s` : '\u221E'}
                </p>
                <p className="text-xs text-slate-500">Par sequence</p>
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
                <Label>Temps par sequence : {settings.timeLimitSec > 0 ? `${settings.timeLimitSec}s` : 'Illimite'}</Label>
                <Slider
                  value={[settings.timeLimitSec]}
                  onValueChange={([v]) => setSettings(s => ({ ...s, timeLimitSec: v }))}
                  min={0} max={120} step={5} className="mt-2"
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
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
        <div className="flex items-center justify-between mb-6 pr-6">
          <Badge variant="outline" className="text-base px-3 py-1">
            {currentIdx} &rarr; {settings.totalQuestions}
          </Badge>
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
              <div className="text-center">
                <Button size="lg" onClick={nextQuestion}>
                  {currentIdx + 1 >= questions.length ? 'Voir les resultats' : 'Suivant'}
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="py-8 mr-6">
            <CardContent className="space-y-6">
              {/* Symbol sequence */}
              <div className="px-2">
                {currentQ && renderSymbols(currentQ.symbols)}
              </div>

              {/* Input */}
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
                      if (e.key === 'Enter' && userInput.trim() !== '') submitAnswer(false);
                    }}
                    placeholder="?"
                    className="flex-1 text-center text-2xl font-bold border-2 border-slate-300 rounded-lg py-3 focus:border-amber-500 focus:outline-none"
                  />
                  <Button
                    onClick={() => submitAnswer(false)}
                    disabled={userInput.trim() === ''}
                    size="lg"
                  >
                    Suivant
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

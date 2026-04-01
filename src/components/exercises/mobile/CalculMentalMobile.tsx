'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Scorer } from '@/lib/core/Scorer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Play, RotateCcw, Home, ChevronRight, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';

// ============================================================================
// Types
// ============================================================================

type GameState = 'menu' | 'settings' | 'playing' | 'results';

interface GameSettings {
  totalQuestions: number;
  chainLength: number;
  maxNumber: number;
  includeMultiply: boolean;
  timeLimitSec: number;
  examMode: boolean;
}

interface QuestionData {
  expression: string;
  terms: string[];
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

const SETTINGS_KEY = 'aviatest-calcul-mental-mobile-settings';

function loadSettings(): GameSettings {
  if (typeof window === 'undefined') return { ...DEFAULT_SETTINGS };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch { return { ...DEFAULT_SETTINGS }; }
}

function saveSettings(s: GameSettings): void {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateQuestion(settings: GameSettings): QuestionData {
  const terms: { sign: '+' | '-'; value: number }[] = [];
  const firstSign = Math.random() < 0.5 ? '+' : '-';
  terms.push({ sign: firstSign as '+' | '-', value: randInt(10, settings.maxNumber) });

  for (let i = 1; i < settings.chainLength; i++) {
    terms.push({ sign: (Math.random() < 0.5 ? '+' : '-') as '+' | '-', value: randInt(10, settings.maxNumber) });
  }

  let answer = 0;
  const parts: string[] = [];
  const termStrings: string[] = [];

  for (const t of terms) {
    if (t.sign === '+') {
      answer += t.value;
      parts.push(parts.length === 0 ? `${t.value}` : `+ ${t.value}`);
      termStrings.push(parts.length === 1 ? `${t.value}` : `+ ${t.value}`);
    } else {
      answer -= t.value;
      parts.push(parts.length === 0 ? `- ${t.value}` : `- ${t.value}`);
      termStrings.push(`- ${t.value}`);
    }
  }

  if (settings.includeMultiply) {
    const a = randInt(11, 99), b = randInt(11, 99);
    const mulSign = Math.random() < 0.5 ? '+' : '-';
    if (mulSign === '+') {
      answer += a * b;
      parts.push(`+ ${a} x ${b}`);
      termStrings.push(`+ ${a} x ${b}`);
    } else {
      answer -= a * b;
      parts.push(`- ${a} x ${b}`);
      termStrings.push(`- ${a} x ${b}`);
    }
  }

  return { expression: parts.join(' '), terms: termStrings, answer };
}

// ============================================================================
// Component
// ============================================================================

export default function CalculMentalMobile() {
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
  const [userInput, setUserInput] = useState('');
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [showCorrection, setShowCorrection] = useState(false);

  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const questionStartRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const startTimer = useCallback((durationMs: number) => {
    clearTimer();
    questionStartRef.current = Date.now();
    setTotalTime(durationMs);
    setTimeLeft(durationMs);
    timerRef.current = setInterval(() => {
      const left = Math.max(0, durationMs - (Date.now() - questionStartRef.current));
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
    setShowCorrection(false);
    setGameState('playing');
    questionStartRef.current = Date.now();
    if (settingsRef.current.timeLimitSec > 0) {
      startTimer(settingsRef.current.timeLimitSec * 1000);
    }
  }, [scorer, startTimer]);

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
      if (currentIdx + 1 >= questions.length) { clearTimer(); setGameState('results'); }
      else { setCurrentIdx(currentIdx + 1); setUserInput(''); setShowCorrection(false); }
    } else {
      setShowCorrection(true);
    }
  }, [clearTimer, userInput, questions, currentIdx, scorer]);

  const nextQuestion = useCallback(() => {
    if (currentIdx + 1 >= questions.length) { clearTimer(); setGameState('results'); return; }
    setCurrentIdx(currentIdx + 1);
    setUserInput('');
    setShowCorrection(false);
    questionStartRef.current = Date.now();
  }, [currentIdx, questions.length, clearTimer]);

  useEffect(() => {
    if (timeLeft <= 0 && totalTime > 0 && gameState === 'playing') { clearTimer(); setGameState('results'); }
  }, [timeLeft, totalTime, gameState, clearTimer]);

  useEffect(() => {
    if (gameState === 'playing' && !showCorrection && inputRef.current) inputRef.current.focus();
  }, [gameState, currentIdx, showCorrection]);

  // ---- MENU ----
  if (gameState === 'menu') {
    return (
      <div className="min-h-screen p-4" style={{ backgroundColor: '#fbfaf9' }}>
        <div className="max-w-lg mx-auto pt-4">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold">Calcul Mental</CardTitle>
              <CardDescription className="text-sm mt-1">
                Resolvez des operations de calcul mental
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600 space-y-1">
                <p><strong>{settings.totalQuestions} operations</strong> a resoudre.</p>
                <p>Chaine de <strong>{settings.chainLength} termes</strong>.</p>
                {settings.includeMultiply && <p>Inclut des <strong>multiplications ab x cd</strong>.</p>}
                {settings.timeLimitSec > 0 && (
                  <p>Temps : <strong>{Math.floor(settings.timeLimitSec / 60)}min</strong>.</p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 bg-slate-50 rounded-lg">
                  <p className="text-lg font-bold text-slate-700">{settings.totalQuestions}</p>
                  <p className="text-xs text-slate-500">Questions</p>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg">
                  <p className="text-lg font-bold text-slate-700">{settings.chainLength}</p>
                  <p className="text-xs text-slate-500">Termes</p>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg">
                  <p className="text-lg font-bold text-slate-700">
                    {settings.timeLimitSec > 0 ? `${Math.floor(settings.timeLimitSec / 60)}m` : '\u221E'}
                  </p>
                  <p className="text-xs text-slate-500">Temps</p>
                </div>
              </div>

              {settings.examMode && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm text-amber-700 text-center">
                  Mode examen — resultats a la fin
                </div>
              )}

              <div className="flex flex-col gap-2">
                <Button size="lg" className="w-full h-12" onClick={startGame}>
                  <Play className="mr-2 h-5 w-5" /> Commencer
                </Button>
                <Button variant="outline" size="lg" className="w-full h-12" onClick={() => setGameState('settings')}>
                  <Settings className="mr-2 h-5 w-5" /> Parametres
                </Button>
                <Button variant="ghost" size="lg" className="w-full h-12" onClick={() => router.push('/telephone')}>
                  <ArrowLeft className="mr-2 h-5 w-5" /> Retour
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ---- SETTINGS ----
  if (gameState === 'settings') {
    return (
      <div className="min-h-screen p-4" style={{ backgroundColor: '#fbfaf9' }}>
        <div className="max-w-lg mx-auto pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Parametres</CardTitle>
              <CardDescription>Ajustez le test</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <Label>Nombre de questions : {settings.totalQuestions}</Label>
                <Slider value={[settings.totalQuestions]} onValueChange={([v]) => setSettings(s => ({ ...s, totalQuestions: v }))} min={1} max={30} step={1} className="mt-2" />
              </div>
              <div>
                <Label>Termes par chaine : {settings.chainLength}</Label>
                <Slider value={[settings.chainLength]} onValueChange={([v]) => setSettings(s => ({ ...s, chainLength: v }))} min={3} max={15} step={1} className="mt-2" />
              </div>
              <div>
                <Label>Nombre max : {settings.maxNumber}</Label>
                <Slider value={[settings.maxNumber]} onValueChange={([v]) => setSettings(s => ({ ...s, maxNumber: v }))} min={20} max={999} step={1} className="mt-2" />
              </div>
              <div>
                <Label>Temps total : {settings.timeLimitSec > 0 ? `${Math.floor(settings.timeLimitSec / 60)}min` : 'Illimite'}</Label>
                <Slider value={[settings.timeLimitSec]} onValueChange={([v]) => setSettings(s => ({ ...s, timeLimitSec: v }))} min={0} max={1800} step={30} className="mt-2" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Multiplications ab x cd</Label>
                  <p className="text-xs text-slate-500 mt-0.5">Inclure des multiplications</p>
                </div>
                <Switch checked={settings.includeMultiply} onCheckedChange={v => setSettings(s => ({ ...s, includeMultiply: v }))} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Mode examen</Label>
                  <p className="text-xs text-slate-500 mt-0.5">Pas de correction entre les questions</p>
                </div>
                <Switch checked={settings.examMode} onCheckedChange={v => setSettings(s => ({ ...s, examMode: v }))} />
              </div>
              <Button size="lg" className="w-full h-12" onClick={() => setGameState('menu')}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Retour
              </Button>
            </CardContent>
          </Card>
        </div>
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
      <div className="min-h-screen p-4" style={{ backgroundColor: '#fbfaf9' }}>
        <div className="max-w-lg mx-auto pt-4">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Resultats</CardTitle>
              <Badge
                variant={scoreData.accuracy >= 75 ? 'default' : scoreData.accuracy >= 50 ? 'secondary' : 'destructive'}
                className="text-base px-3 py-1 mt-2"
              >
                {scoreData.grade}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <p className="text-4xl font-bold text-slate-700">{scoreData.score}%</p>
                <p className="text-slate-500 mt-1">Bonnes reponses</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-blue-50 rounded-lg text-center">
                  <p className="text-xl font-bold text-blue-600">{totalCorrect}/{results.length}</p>
                  <p className="text-xs text-blue-700">Correct</p>
                </div>
                <div className="p-3 bg-amber-50 rounded-lg text-center">
                  <p className="text-xl font-bold text-amber-600">{avgTime}s</p>
                  <p className="text-xs text-amber-700">Temps moyen</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="font-semibold text-slate-700 text-sm">Detail :</p>
                <div className="max-h-56 overflow-y-auto space-y-1.5">
                  {results.map((r, i) => (
                    <div key={i} className="bg-slate-50 rounded px-3 py-2 text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-slate-500">Q{i + 1}</span>
                        <span className={r.isCorrect ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                          {r.isCorrect ? '\u2713' : '\u2717'} {r.userAnswer !== null ? r.userAnswer : '?'}
                          {!r.isCorrect && <span className="text-green-600 ml-2">({r.question.answer})</span>}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-mono break-words">{r.question.expression} = {r.question.answer}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Button size="lg" className="w-full h-12" onClick={startGame}>
                  <RotateCcw className="mr-2 h-5 w-5" /> Rejouer
                </Button>
                <Button variant="ghost" size="lg" className="w-full h-12" onClick={() => router.push('/telephone')}>
                  <Home className="mr-2 h-5 w-5" /> Accueil
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ---- PLAYING ----
  const currentQ = questions[currentIdx];
  const timerPercent = totalTime > 0 ? (timeLeft / totalTime) * 100 : 100;
  const timerColor = timerPercent > 50 ? 'bg-blue-500' : timerPercent > 20 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="min-h-screen p-3" style={{ backgroundColor: '#fbfaf9' }}>
      <div className="max-w-lg mx-auto">
        {/* Timer bar (horizontal for mobile) */}
        {settings.timeLimitSec > 0 && (
          <div className="w-full h-2 rounded-full overflow-hidden bg-slate-200 mb-3">
            <div className={`h-full transition-all duration-100 ${timerColor}`} style={{ width: `${timerPercent}%` }} />
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <Badge variant="outline" className="text-sm px-2 py-1">
            {currentIdx + 1} / {settings.totalQuestions}
          </Badge>
          {settings.timeLimitSec > 0 && (
            <span className="text-sm text-slate-500">
              {Math.floor(timeLeft / 60000)}:{String(Math.floor((timeLeft % 60000) / 1000)).padStart(2, '0')}
            </span>
          )}
        </div>

        {showCorrection ? (
          <Card className="text-center py-6">
            <CardContent className="space-y-4">
              <div className="flex flex-wrap justify-center gap-1 text-sm font-mono text-slate-500">
                {currentQ.terms.map((term, i) => (
                  <span key={i}>{term}</span>
                ))}
              </div>
              <div className="space-y-2">
                {results[results.length - 1]?.isCorrect ? (
                  <p className="text-2xl font-bold text-green-600">{'\u2713'} Correct !</p>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-red-600">
                      {'\u2717'} {results[results.length - 1]?.userAnswer ?? '?'}
                    </p>
                    <p className="text-lg text-green-600">Reponse : {currentQ.answer}</p>
                  </>
                )}
              </div>
              <Button size="lg" className="w-full h-12" onClick={nextQuestion}>
                {currentIdx + 1 >= questions.length ? 'Voir les resultats' : 'Suivant'}
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="py-4">
            <CardContent className="space-y-4">
              {/* Expression displayed as flowing terms that wrap */}
              <div className="flex flex-wrap justify-center gap-x-2 gap-y-1 text-lg font-bold text-slate-800 font-mono">
                {currentQ?.terms.map((term, i) => (
                  <span key={i} className="whitespace-nowrap">{term}</span>
                ))}
              </div>

              <p className="text-xs text-slate-400 text-center">Resoudre l&apos;operation ci-dessus</p>

              <div className="space-y-3">
                <Input
                  ref={inputRef}
                  type="number"
                  inputMode="numeric"
                  value={userInput}
                  onChange={e => setUserInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && userInput.trim() !== '') submitAnswer(); }}
                  placeholder="Votre reponse"
                  className="w-full text-center text-xl font-bold h-14 text-slate-800"
                />
                <Button
                  onClick={submitAnswer}
                  disabled={userInput.trim() === ''}
                  size="lg"
                  className="w-full h-12"
                >
                  Valider <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

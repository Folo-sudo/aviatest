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
  totalQuestions: number;
  chainLength: number;
  maxNumber: number;
  numChoices: number;
  timeLimitSec: number;
  examMode: boolean;
}

interface IntervalChoice {
  lower: number;
  upper: number;
  width: number;
  containsAnswer: boolean;
}

interface QuestionData {
  expression: string;
  answer: number;
  choices: IntervalChoice[];
  correctIndex: number; // index of smallest interval containing the answer
}

interface QuestionResult {
  question: QuestionData;
  selectedIndex: number | null;
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
  numChoices: 8,
  timeLimitSec: 600,
  examMode: false,
};

const SETTINGS_KEY = 'aviatest-calcul-mental-2-settings';

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

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateQuestion(settings: GameSettings): QuestionData {
  const chainLength = settings.chainLength;
  const maxNum = settings.maxNumber;

  // Generate chain of +/- operations
  const terms: { sign: '+' | '-'; value: number }[] = [];
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

  const expression = parts.join(' ');

  // Generate interval choices
  // All intervals have similar widths (within ~15 of each other)
  // Some contain the answer, some don't
  // The correct answer is the smallest interval that contains the answer
  const numChoices = settings.numChoices;
  const baseWidth = randInt(240, 280);
  const choices: IntervalChoice[] = [];

  // 1) Create the correct interval (smallest, contains answer)
  const correctWidth = baseWidth - randInt(3, 8);
  // Place the answer somewhere inside this interval (not at edges)
  const offsetInCorrect = randInt(Math.floor(correctWidth * 0.15), Math.floor(correctWidth * 0.85));
  const correctLower = answer - offsetInCorrect;
  const correctUpper = correctLower + correctWidth;
  choices.push({
    lower: correctLower,
    upper: correctUpper,
    width: correctWidth,
    containsAnswer: true,
  });

  // 2) Create 2-3 more intervals that contain the answer but are wider
  const numContaining = randInt(2, 3);
  for (let i = 0; i < numContaining; i++) {
    const w = baseWidth + randInt(1, 12);
    const off = randInt(Math.floor(w * 0.1), Math.floor(w * 0.9));
    const lo = answer - off;
    choices.push({
      lower: lo,
      upper: lo + w,
      width: w,
      containsAnswer: true,
    });
  }

  // 3) Fill the rest with intervals that do NOT contain the answer
  const remaining = numChoices - choices.length;
  for (let i = 0; i < remaining; i++) {
    const w = baseWidth + randInt(-5, 10);
    let lo: number;
    // Place entirely above or below the answer
    if (Math.random() < 0.5) {
      // Above
      lo = answer + randInt(20, 200);
    } else {
      // Below
      lo = answer - w - randInt(20, 200);
    }
    choices.push({
      lower: lo,
      upper: lo + w,
      width: w,
      containsAnswer: false,
    });
  }

  // Shuffle and find correct index
  const shuffled = shuffle(choices);
  let correctIndex = -1;
  let smallestWidth = Infinity;
  for (let i = 0; i < shuffled.length; i++) {
    if (shuffled[i].containsAnswer && shuffled[i].width < smallestWidth) {
      smallestWidth = shuffled[i].width;
      correctIndex = i;
    }
  }

  return {
    expression,
    answer,
    choices: shuffled,
    correctIndex,
  };
}

// ============================================================================
// Component
// ============================================================================

export default function CalculMental2Test() {
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
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [showCorrection, setShowCorrection] = useState(false);

  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const perfSavedRef = useRef(false);
  const questionStartRef = useRef(0);

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
    perfSavedRef.current = false;
    const qs: QuestionData[] = [];
    for (let i = 0; i < settingsRef.current.totalQuestions; i++) {
      qs.push(generateQuestion(settingsRef.current));
    }
    setQuestions(qs);
    setCurrentIdx(0);
    setResults([]);
    setSelectedIdx(null);
    setShowCorrection(false);
    setGameState('playing');
    questionStartRef.current = Date.now();
    if (settingsRef.current.timeLimitSec > 0) {
      startTimer(settingsRef.current.timeLimitSec * 1000);
    }
  }, [scorer, startTimer]);

  const submitAnswer = useCallback(() => {
    const timeUsed = Date.now() - questionStartRef.current;
    const currentQ = questions[currentIdx];
    const isCorrect = selectedIdx !== null && selectedIdx === currentQ.correctIndex;

    scorer.recordAnswer(isCorrect);

    const result: QuestionResult = {
      question: currentQ,
      selectedIndex: selectedIdx,
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
        setSelectedIdx(null);
        setShowCorrection(false);
      }
    } else {
      clearTimer();
      setShowCorrection(true);
    }
  }, [clearTimer, selectedIdx, questions, currentIdx, scorer]);

  const nextQuestion = useCallback(() => {
    if (currentIdx + 1 >= questions.length) {
      clearTimer();
      setGameState('results');
      return;
    }
    const nextIdx = currentIdx + 1;
    setCurrentIdx(nextIdx);
    setSelectedIdx(null);
    setShowCorrection(false);
    questionStartRef.current = Date.now();
    if (settingsRef.current.timeLimitSec > 0) {
      startTimer(settingsRef.current.timeLimitSec * 1000);
    }
  }, [currentIdx, questions.length, clearTimer, startTimer]);

  // Global timer expiry → go to results
  useEffect(() => {
    if (timeLeft <= 0 && totalTime > 0 && gameState === 'playing') {
      clearTimer();
      setGameState('results');
    }
  }, [timeLeft, totalTime, gameState, clearTimer]);

  // =========================================================================
  // RENDER
  // =========================================================================

  // ---- MENU ----
  if (gameState === 'menu') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">Calcul Mental 2</CardTitle>
            <CardDescription className="text-base mt-2">
              Estimez le resultat et trouvez le plus petit intervalle qui le contient
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-600 space-y-2">
              <p><strong>{settings.totalQuestions} operations</strong> a estimer.</p>
              <p>Chaque operation est une chaine de <strong>{settings.chainLength} termes</strong> (additions/soustractions).</p>
              <p>Selectionnez le <strong>plus petit intervalle</strong> contenant le resultat parmi {settings.numChoices} propositions.</p>
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
                <p className="text-xl font-bold text-slate-700">{settings.numChoices}</p>
                <p className="text-xs text-slate-500">Intervalles</p>
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
                <Label>Nombre d&apos;intervalles : {settings.numChoices}</Label>
                <Slider
                  value={[settings.numChoices]}
                  onValueChange={([v]) => setSettings(s => ({ ...s, numChoices: v }))}
                  min={4} max={10} step={1} className="mt-2"
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
      savePerformanceResult('calcul-mental-2', scoreData.score, scoreData.correct, scoreData.total, avgMs);
    }
    const perfEntries = loadEntries('calcul-mental-2');

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
              <p className="font-semibold text-slate-700 text-sm">Detail par question :</p>
              <div className="max-h-64 overflow-y-auto space-y-1.5">
                {results.map((r, i) => {
                  const correct = r.question.choices[r.question.correctIndex];
                  const selected = r.selectedIndex !== null ? r.question.choices[r.selectedIndex] : null;
                  return (
                    <div key={i} className="bg-slate-50 rounded px-3 py-2 text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-slate-500">Q{i + 1}</span>
                        <span className={r.isCorrect ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                          {r.isCorrect ? '\u2713' : '\u2717'}
                          {' '}
                          {selected ? `[${selected.lower}, ${selected.upper}]` : 'Pas de reponse'}
                          {!r.isCorrect && (
                            <span className="text-green-600 ml-2">
                              ([{correct.lower}, {correct.upper}])
                            </span>
                          )}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-mono">
                        {r.question.expression} = {r.question.answer}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {perfEntries.length >= 2 && (
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-slate-500 mb-2 text-center">Progression</p>
                <div className="flex justify-center">
                  <MiniPerformanceChart entries={perfEntries} exerciseId="calcul-mental-2" />
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
          <Card className="text-center py-10 mr-6">
            <CardContent className="space-y-6">
              <p className="text-lg text-slate-500 font-mono">{currentQ.expression}</p>
              <p className="text-sm text-slate-400">Resultat : {currentQ.answer}</p>
              <div className="space-y-2">
                {results[results.length - 1]?.isCorrect ? (
                  <div>
                    <p className="text-3xl font-bold text-green-600">{'\u2713'} Correct !</p>
                    <p className="text-lg text-slate-600 mt-2">
                      [{currentQ.choices[currentQ.correctIndex].lower}, {currentQ.choices[currentQ.correctIndex].upper}]
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-3xl font-bold text-red-600">
                      {'\u2717'}{' '}
                      {results[results.length - 1]?.selectedIndex !== null
                        ? `[${currentQ.choices[results[results.length - 1]!.selectedIndex!].lower}, ${currentQ.choices[results[results.length - 1]!.selectedIndex!].upper}]`
                        : 'Pas de reponse'}
                    </p>
                    <p className="text-xl text-green-600">
                      Reponse : [{currentQ.choices[currentQ.correctIndex].lower}, {currentQ.choices[currentQ.correctIndex].upper}]
                    </p>
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
          <div className="mr-6 space-y-4">
            {/* Question */}
            <Card className="text-center py-6">
              <CardContent>
                <p className="text-sm text-slate-500 mb-4">
                  Selectionnez le plus petit intervalle contenant le resultat de l&apos;operation ci-dessous :
                </p>
                <p className="text-base sm:text-xl md:text-2xl font-bold text-slate-800 font-mono tracking-wide break-words text-center leading-relaxed">
                  {currentQ?.expression}
                </p>
              </CardContent>
            </Card>

            {/* Interval choices */}
            <Card>
              <CardContent className="py-4">
                <div className="space-y-2">
                  {currentQ?.choices.map((choice, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedIdx(i)}
                      className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all text-base font-mono
                        ${selectedIdx === i
                          ? 'border-blue-500 bg-blue-50 text-blue-800'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                        }`}
                    >
                      <span className="text-slate-400 mr-3">{i + 1})</span>
                      [{choice.lower}, {choice.upper}]
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Submit button */}
            <div className="flex justify-end">
              <Button
                onClick={() => submitAnswer()}
                disabled={selectedIdx === null}
                size="lg"
              >
                Suivant
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

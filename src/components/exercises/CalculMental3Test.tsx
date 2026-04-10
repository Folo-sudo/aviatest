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
  timeLimitSec: number;
  examMode: boolean;
  maxCoeff: number;       // max coefficient for variables
  maxConst: number;       // max constant value
  includeMultiply: boolean; // include ab*cd multiplication term in eq 3
}

interface SystemEquation {
  // Eq 1: coeffA * A + constA = resultA  =>  A = (resultA - constA) / coeffA
  coeffA: number;
  constA: number;
  resultA: number;
  // Eq 2: coeffC * C + constC = resultC  =>  C = (resultC - constC) / coeffC
  coeffC: number;
  constC: number;
  resultC: number;
  // Eq 3: coeffB * B + constB = coeffC3 * C + coeffA3 * A + const3 [+ mulA * mulB]
  //   =>  B = (coeffC3*C + coeffA3*A + const3 + mulA*mulB - constB) / coeffB3
  coeffB3: number;
  constB3: number;
  coeffC3: number;
  coeffA3: number;
  const3: number;
  mulA: number | null;  // 2-digit multiplicand (null = no multiplication)
  mulB: number | null;  // 2-digit multiplicand
  // Solution
  valueA: number;
  valueC: number;
  valueB: number;
}

interface QuestionResult {
  system: SystemEquation;
  userAnswer: number | null;
  isCorrect: boolean;
  timeUsedMs: number;
}

// ============================================================================
// Helpers
// ============================================================================

const DEFAULT_SETTINGS: GameSettings = {
  totalQuestions: 12,
  timeLimitSec: 600,
  examMode: false,
  maxCoeff: 12,
  maxConst: 15,
  includeMultiply: false,
};

const SETTINGS_KEY = 'aviatest-calcul-mental-3-settings';

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

function randNonZero(min: number, max: number): number {
  let v = 0;
  while (v === 0) v = randInt(min, max);
  return v;
}

function generateSystem(settings: GameSettings): SystemEquation {
  const mc = settings.maxCoeff;
  const mk = settings.maxConst;

  // Generate integer solutions for A and C first, then build equations
  const valueA = randInt(-20, 20);
  const valueC = randInt(-20, 20);

  // Eq1: coeffA * A + constA = resultA
  const coeffA = randNonZero(2, mc);
  const constA = randInt(-mk, mk);
  const resultA = coeffA * valueA + constA;

  // Eq2: coeffC * C + constC = resultC
  const coeffC = randNonZero(2, mc);
  const constC = randInt(-mk, mk);
  const resultC = coeffC * valueC + constC;

  // Optional ab*cd multiplication (2-digit each) appended to eq 3 RHS
  let mulA: number | null = null;
  let mulB: number | null = null;
  let mulResult = 0;
  if (settings.includeMultiply) {
    mulA = randInt(11, 99);
    mulB = randInt(11, 99);
    mulResult = mulA * mulB;
  }

  // Eq3: coeffB3 * B + constB3 = coeffC3 * C + coeffA3 * A + const3 [+ mulA*mulB]
  const coeffB3 = randNonZero(1, Math.min(mc, 6));
  const coeffC3 = randNonZero(-mc, mc);
  const coeffA3 = randNonZero(-mc, mc);
  const const3 = randInt(-mk, mk);
  const constB3 = randInt(-mk, mk);

  // coeffB3 * B = coeffC3 * C + coeffA3 * A + const3 + mulResult - constB3
  const rhs = coeffC3 * valueC + coeffA3 * valueA + const3 + mulResult - constB3;

  // We need B to be an integer, so rhs must be divisible by coeffB3
  // If not, adjust const3
  const remainder = ((rhs % coeffB3) + coeffB3) % coeffB3;
  const adjustedConst3 = const3 - remainder;
  const adjustedRhs = coeffC3 * valueC + coeffA3 * valueA + adjustedConst3 + mulResult - constB3;
  const valueB = adjustedRhs / coeffB3;

  return {
    coeffA, constA, resultA,
    coeffC, constC, resultC,
    coeffB3, constB3, coeffC3, coeffA3, const3: adjustedConst3,
    mulA, mulB,
    valueA, valueC, valueB,
  };
}

/** Format a term like "+5A", "-3C", "+7", handling sign and coefficient display */
function formatTerm(coeff: number, variable?: string): string {
  if (variable) {
    if (coeff === 1) return `+ ${variable}`;
    if (coeff === -1) return `- ${variable}`;
    if (coeff > 0) return `+ ${coeff}${variable}`;
    return `- ${Math.abs(coeff)}${variable}`;
  }
  // constant
  if (coeff >= 0) return `+ ${coeff}`;
  return `- ${Math.abs(coeff)}`;
}

function formatEquation1(sys: SystemEquation): string {
  // coeffA * A + constA = resultA
  const parts: string[] = [];
  if (sys.coeffA === 1) parts.push('A');
  else if (sys.coeffA === -1) parts.push('-A');
  else parts.push(`${sys.coeffA}A`);

  if (sys.constA > 0) parts.push(`+ ${sys.constA}`);
  else if (sys.constA < 0) parts.push(`- ${Math.abs(sys.constA)}`);

  return `${parts.join(' ')} = ${sys.resultA}`;
}

function formatEquation2(sys: SystemEquation): string {
  const parts: string[] = [];
  if (sys.coeffC === 1) parts.push('C');
  else if (sys.coeffC === -1) parts.push('-C');
  else parts.push(`${sys.coeffC}C`);

  if (sys.constC > 0) parts.push(`+ ${sys.constC}`);
  else if (sys.constC < 0) parts.push(`- ${Math.abs(sys.constC)}`);

  return `${parts.join(' ')} = ${sys.resultC}`;
}

function formatEquation3(sys: SystemEquation): string {
  // LHS: coeffB3 * B + constB3
  const lhsParts: string[] = [];
  if (sys.coeffB3 === 1) lhsParts.push('B');
  else if (sys.coeffB3 === -1) lhsParts.push('-B');
  else lhsParts.push(`${sys.coeffB3}B`);

  if (sys.constB3 > 0) lhsParts.push(`+ ${sys.constB3}`);
  else if (sys.constB3 < 0) lhsParts.push(`- ${Math.abs(sys.constB3)}`);

  // RHS: coeffC3 * C + coeffA3 * A + const3 [+ mulA * mulB]
  const rhsParts: string[] = [];

  // First RHS term (no leading +)
  if (sys.coeffC3 === 1) rhsParts.push('C');
  else if (sys.coeffC3 === -1) rhsParts.push('-C');
  else rhsParts.push(`${sys.coeffC3}C`);

  // coeffA3 * A
  if (sys.coeffA3 === 1) rhsParts.push('+ A');
  else if (sys.coeffA3 === -1) rhsParts.push('- A');
  else if (sys.coeffA3 > 0) rhsParts.push(`+ ${sys.coeffA3}A`);
  else rhsParts.push(`- ${Math.abs(sys.coeffA3)}A`);

  // const3
  if (sys.const3 > 0) rhsParts.push(`+ ${sys.const3}`);
  else if (sys.const3 < 0) rhsParts.push(`- ${Math.abs(sys.const3)}`);

  // Optional multiplication term
  if (sys.mulA !== null && sys.mulB !== null) {
    rhsParts.push(`+ ${sys.mulA} x ${sys.mulB}`);
  }

  return `${lhsParts.join(' ')} = ${rhsParts.join(' ')}`;
}

// ============================================================================
// Component
// ============================================================================

export default function CalculMental3Test() {
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

  const [systems, setSystems] = useState<SystemEquation[]>([]);
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
  const perfSavedRef = useRef(false);

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
    const qs: SystemEquation[] = [];
    for (let i = 0; i < settingsRef.current.totalQuestions; i++) {
      qs.push(generateSystem(settingsRef.current));
    }
    setSystems(qs);
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

  const submitAnswer = useCallback(() => {
    const timeUsed = Date.now() - questionStartRef.current;
    const typed = userInput.trim();
    const userVal = typed !== '' ? parseInt(typed, 10) : null;
    const currentSys = systems[currentIdx];
    const isCorrect = userVal !== null && !isNaN(userVal) && userVal === currentSys.valueB;

    scorer.recordAnswer(isCorrect);

    const result: QuestionResult = {
      system: currentSys,
      userAnswer: userVal !== null && !isNaN(userVal) ? userVal : null,
      isCorrect,
      timeUsedMs: timeUsed,
    };

    setResults(prev => [...prev, result]);
    questionStartRef.current = Date.now();

    if (settingsRef.current.examMode || currentIdx + 1 >= systems.length) {
      if (currentIdx + 1 >= systems.length) {
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
      clearTimer();
      setShowCorrection(true);
    }
  }, [clearTimer, userInput, systems, currentIdx, scorer]);

  const nextQuestion = useCallback(() => {
    if (currentIdx + 1 >= systems.length) {
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
    if (settingsRef.current.timeLimitSec > 0) {
      startTimer(settingsRef.current.timeLimitSec * 1000);
    }
  }, [currentIdx, systems.length, clearTimer, startTimer]);

  useEffect(() => {
    if (timeLeft <= 0 && totalTime > 0 && gameState === 'playing') {
      clearTimer();
      setGameState('results');
    }
  }, [timeLeft, totalTime, gameState, clearTimer]);

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
            <CardTitle className="text-3xl font-bold">Calcul Mental 3</CardTitle>
            <CardDescription className="text-base mt-2">
              Resolvez des systemes d&apos;equations lineaires par substitution
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-600 space-y-2">
              <p><strong>{settings.totalQuestions} systemes</strong> a resoudre.</p>
              <p>Chaque systeme contient 3 equations a 3 inconnues (A, B, C).</p>
              <p>Resolvez A et C d&apos;abord, puis substituez pour trouver <strong>B</strong>.</p>
              {settings.includeMultiply && (
                <p>Certaines equations incluent des <strong>multiplications ab &times; cd</strong>.</p>
              )}
              {settings.timeLimitSec > 0 && (
                <p>Temps total : <strong>{Math.floor(settings.timeLimitSec / 60)}min{settings.timeLimitSec % 60 > 0 ? ` ${settings.timeLimitSec % 60}s` : ''}</strong>.</p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xl font-bold text-slate-700">{settings.totalQuestions}</p>
                <p className="text-xs text-slate-500">Systemes</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xl font-bold text-slate-700">3</p>
                <p className="text-xs text-slate-500">Equations</p>
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
                \u26A1 Mode examen — resultats uniquement a la fin
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
                <Label>Nombre de systemes : {settings.totalQuestions}</Label>
                <Slider
                  value={[settings.totalQuestions]}
                  onValueChange={([v]) => setSettings(s => ({ ...s, totalQuestions: v }))}
                  min={1} max={20} step={1} className="mt-2"
                />
              </div>
              <div>
                <Label>Coefficient max : {settings.maxCoeff}</Label>
                <Slider
                  value={[settings.maxCoeff]}
                  onValueChange={([v]) => setSettings(s => ({ ...s, maxCoeff: v }))}
                  min={3} max={20} step={1} className="mt-2"
                />
              </div>
              <div>
                <Label>Constante max : {settings.maxConst}</Label>
                <Slider
                  value={[settings.maxConst]}
                  onValueChange={([v]) => setSettings(s => ({ ...s, maxConst: v }))}
                  min={5} max={30} step={1} className="mt-2"
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
                  <p className="text-xs text-slate-500 mt-0.5">Ajouter un terme ab &times; cd dans l&apos;equation de B</p>
                </div>
                <Switch
                  checked={settings.includeMultiply}
                  onCheckedChange={v => setSettings(s => ({ ...s, includeMultiply: v }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Mode examen</Label>
                  <p className="text-xs text-slate-500 mt-0.5">Pas de correction entre les systemes</p>
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
      savePerformanceResult('calcul-mental-3', scoreData.correct, systems.length, avgMs);
    }
    const perfEntries = loadEntries('calcul-mental-3');

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
              <p className="font-semibold text-slate-700 text-sm">Detail par systeme :</p>
              <div className="max-h-72 overflow-y-auto space-y-2">
                {results.map((r, i) => (
                  <div key={i} className="bg-slate-50 rounded px-3 py-2 text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-500">S{i + 1}</span>
                      <span className={r.isCorrect ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                        {r.isCorrect ? '\u2713' : '\u2717'}
                        {' B = '}
                        {r.userAnswer !== null ? r.userAnswer : '?'}
                        {!r.isCorrect && <span className="text-green-600 ml-2">(B = {r.system.valueB})</span>}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">A = {r.system.valueA}, C = {r.system.valueC}</p>
                  </div>
                ))}
              </div>
            </div>

            {perfEntries.length >= 2 && (
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-slate-500 mb-2 text-center">Progression</p>
                <div className="flex justify-center">
                  <MiniPerformanceChart entries={perfEntries} exerciseId="calcul-mental-3" />
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
  const currentSys = systems[currentIdx];
  const timerPercent = totalTime > 0 ? (timeLeft / totalTime) * 100 : 100;
  const timerColor = timerPercent > 50 ? 'bg-blue-500' : timerPercent > 20 ? 'bg-amber-500' : 'bg-red-500';

  const eq1 = currentSys ? formatEquation1(currentSys) : '';
  const eq2 = currentSys ? formatEquation2(currentSys) : '';
  const eq3 = currentSys ? formatEquation3(currentSys) : '';

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
              <div className="text-left max-w-md mx-auto space-y-1 font-mono text-sm text-slate-600">
                <p>{eq1}</p>
                <p>{eq2}</p>
                <p>{eq3}</p>
              </div>
              <div className="text-sm text-slate-500">
                A = {currentSys.valueA}, C = {currentSys.valueC}
              </div>
              <div className="space-y-2">
                {results[results.length - 1]?.isCorrect ? (
                  <p className="text-3xl font-bold text-green-600">{'\u2713'} B = {currentSys.valueB}</p>
                ) : (
                  <>
                    <p className="text-3xl font-bold text-red-600">
                      {'\u2717'} {results[results.length - 1]?.userAnswer !== null
                        ? `B = ${results[results.length - 1]?.userAnswer}`
                        : 'Pas de reponse'}
                    </p>
                    <p className="text-xl text-green-600">Reponse : B = {currentSys.valueB}</p>
                  </>
                )}
              </div>
              <Button size="lg" onClick={nextQuestion}>
                {currentIdx + 1 >= systems.length ? 'Voir les resultats' : 'Suivant'}
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="text-center py-10 mr-6">
            <CardContent className="space-y-6">
              <p className="text-lg text-slate-500 mb-4">Resoudre le systeme d&apos;equations ci-dessous :</p>

              {/* System display with curly brace */}
              <div className="flex items-center justify-center gap-4">
                {/* Large curly brace */}
                <div className="text-6xl sm:text-7xl font-extralight text-slate-400 select-none leading-none" style={{ fontFamily: 'serif' }}>
                  {'{'}
                </div>
                {/* Equations */}
                <div className="text-left space-y-3 font-mono text-base sm:text-lg text-slate-800">
                  <p>{eq1}</p>
                  <p>{eq2}</p>
                  <p>{eq3}</p>
                  <p className="font-bold text-slate-900">B = ?</p>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 max-w-md mx-auto mt-6">
                <span className="text-lg font-bold text-slate-700">B =</span>
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

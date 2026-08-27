'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Scorer } from '@/lib/core/Scorer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ClassScoreBlock } from '@/components/ClassScoreBlock';
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
  timeLimitSec: number;
  examMode: boolean;
  maxCoeff: number;
  maxConst: number;
}

interface SystemEquation {
  coeffA: number; constA: number; resultA: number;
  coeffC: number; constC: number; resultC: number;
  coeffB3: number; constB3: number; coeffC3: number; coeffA3: number; const3: number;
  valueA: number; valueC: number; valueB: number;
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
};

const SETTINGS_KEY = 'aviatest-calcul-mental-3-mobile-settings';

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

function randNonZero(min: number, max: number): number {
  let v = 0;
  while (v === 0) v = randInt(min, max);
  return v;
}

function generateSystem(settings: GameSettings): SystemEquation {
  const mc = settings.maxCoeff;
  const mk = settings.maxConst;

  const valueA = randInt(-20, 20);
  const valueC = randInt(-20, 20);

  const coeffA = randNonZero(2, mc);
  const constA = randInt(-mk, mk);
  const resultA = coeffA * valueA + constA;

  const coeffC = randNonZero(2, mc);
  const constC = randInt(-mk, mk);
  const resultC = coeffC * valueC + constC;

  const coeffB3 = randNonZero(1, Math.min(mc, 6));
  const coeffC3 = randNonZero(-mc, mc);
  const coeffA3 = randNonZero(-mc, mc);
  const const3 = randInt(-mk, mk);
  const constB3 = randInt(-mk, mk);

  const rhs = coeffC3 * valueC + coeffA3 * valueA + const3 - constB3;
  const remainder = ((rhs % coeffB3) + coeffB3) % coeffB3;
  const adjustedConst3 = const3 - remainder;
  const adjustedRhs = coeffC3 * valueC + coeffA3 * valueA + adjustedConst3 - constB3;
  const valueB = adjustedRhs / coeffB3;

  return {
    coeffA, constA, resultA,
    coeffC, constC, resultC,
    coeffB3, constB3, coeffC3, coeffA3, const3: adjustedConst3,
    valueA, valueC, valueB,
  };
}

function formatEquation1(sys: SystemEquation): string {
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
  const lhsParts: string[] = [];
  if (sys.coeffB3 === 1) lhsParts.push('B');
  else if (sys.coeffB3 === -1) lhsParts.push('-B');
  else lhsParts.push(`${sys.coeffB3}B`);
  if (sys.constB3 > 0) lhsParts.push(`+ ${sys.constB3}`);
  else if (sys.constB3 < 0) lhsParts.push(`- ${Math.abs(sys.constB3)}`);

  const rhsParts: string[] = [];
  if (sys.coeffC3 === 1) rhsParts.push('C');
  else if (sys.coeffC3 === -1) rhsParts.push('-C');
  else rhsParts.push(`${sys.coeffC3}C`);

  if (sys.coeffA3 === 1) rhsParts.push('+ A');
  else if (sys.coeffA3 === -1) rhsParts.push('- A');
  else if (sys.coeffA3 > 0) rhsParts.push(`+ ${sys.coeffA3}A`);
  else rhsParts.push(`- ${Math.abs(sys.coeffA3)}A`);

  if (sys.const3 > 0) rhsParts.push(`+ ${sys.const3}`);
  else if (sys.const3 < 0) rhsParts.push(`- ${Math.abs(sys.const3)}`);

  return `${lhsParts.join(' ')} = ${rhsParts.join(' ')}`;
}

// ============================================================================
// Component
// ============================================================================

export default function CalculMental3Mobile() {
  const router = useRouter();
  const [gameState, setGameState] = useState<GameState>('menu');
  const [settings, setSettings] = useState<GameSettings>({ ...DEFAULT_SETTINGS });
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const [scorer] = useState(() => new Scorer());

  useEffect(() => { setSettings(loadSettings()); setSettingsLoaded(true); }, []);
  useEffect(() => { if (settingsLoaded) saveSettings(settings); }, [settings, settingsLoaded]);

  const [systems, setSystems] = useState<SystemEquation[]>([]);
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
      setTimeLeft(Math.max(0, durationMs - (Date.now() - questionStartRef.current)));
    }, 50);
  }, [clearTimer]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  const startGame = useCallback(() => {
    scorer.reset();
    const qs: SystemEquation[] = [];
    for (let i = 0; i < settingsRef.current.totalQuestions; i++) qs.push(generateSystem(settingsRef.current));
    setSystems(qs);
    setCurrentIdx(0);
    setResults([]);
    setUserInput('');
    setShowCorrection(false);
    setGameState('playing');
    questionStartRef.current = Date.now();
    if (settingsRef.current.timeLimitSec > 0) startTimer(settingsRef.current.timeLimitSec * 1000);
  }, [scorer, startTimer]);

  const submitAnswer = useCallback(() => {
    const timeUsed = Date.now() - questionStartRef.current;
    const typed = userInput.trim();
    const userVal = typed !== '' ? parseInt(typed, 10) : null;
    const currentSys = systems[currentIdx];
    const isCorrect = userVal !== null && !isNaN(userVal) && userVal === currentSys.valueB;

    scorer.recordAnswer(isCorrect);
    setResults(prev => [...prev, { system: currentSys, userAnswer: userVal !== null && !isNaN(userVal) ? userVal : null, isCorrect, timeUsedMs: timeUsed }]);
    questionStartRef.current = Date.now();

    if (settingsRef.current.examMode || currentIdx + 1 >= systems.length) {
      if (currentIdx + 1 >= systems.length) { clearTimer(); setGameState('results'); }
      else { setCurrentIdx(currentIdx + 1); setUserInput(''); setShowCorrection(false); }
    } else {
      clearTimer();
      setShowCorrection(true);
    }
  }, [clearTimer, userInput, systems, currentIdx, scorer]);

  const nextQuestion = useCallback(() => {
    if (currentIdx + 1 >= systems.length) { clearTimer(); setGameState('results'); return; }
    setCurrentIdx(currentIdx + 1);
    setUserInput('');
    setShowCorrection(false);
    questionStartRef.current = Date.now();
    if (settingsRef.current.timeLimitSec > 0) {
      startTimer(settingsRef.current.timeLimitSec * 1000);
    }
  }, [currentIdx, systems.length, clearTimer, startTimer]);

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
              <CardTitle className="text-2xl font-bold">Calcul Mental 3</CardTitle>
              <CardDescription className="text-sm mt-1">
                Systemes d&apos;equations lineaires
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-[#f7f5f3] rounded-lg p-3 text-sm text-[#605a57] space-y-1">
                <p><strong>{settings.totalQuestions} systemes</strong> a resoudre.</p>
                <p>3 equations, 3 inconnues (A, B, C).</p>
                <p>Trouvez <strong>B</strong> par substitution.</p>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 bg-[#f7f5f3] rounded-lg">
                  <p className="text-lg font-bold text-[#37322f]">{settings.totalQuestions}</p>
                  <p className="text-xs text-[#605a57]">Systemes</p>
                </div>
                <div className="p-2 bg-[#f7f5f3] rounded-lg">
                  <p className="text-lg font-bold text-[#37322f]">3</p>
                  <p className="text-xs text-[#605a57]">Equations</p>
                </div>
                <div className="p-2 bg-[#f7f5f3] rounded-lg">
                  <p className="text-lg font-bold text-[#37322f]">
                    {settings.timeLimitSec > 0 ? `${Math.floor(settings.timeLimitSec / 60)}m` : '\u221E'}
                  </p>
                  <p className="text-xs text-[#605a57]">Temps</p>
                </div>
              </div>

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
                <Label>Systemes : {settings.totalQuestions}</Label>
                <Slider value={[settings.totalQuestions]} onValueChange={([v]) => setSettings(s => ({ ...s, totalQuestions: v }))} min={1} max={20} step={1} className="mt-2" />
              </div>
              <div>
                <Label>Coefficient max : {settings.maxCoeff}</Label>
                <Slider value={[settings.maxCoeff]} onValueChange={([v]) => setSettings(s => ({ ...s, maxCoeff: v }))} min={3} max={20} step={1} className="mt-2" />
              </div>
              <div>
                <Label>Constante max : {settings.maxConst}</Label>
                <Slider value={[settings.maxConst]} onValueChange={([v]) => setSettings(s => ({ ...s, maxConst: v }))} min={5} max={30} step={1} className="mt-2" />
              </div>
              <div>
                <Label>Temps : {settings.timeLimitSec > 0 ? `${Math.floor(settings.timeLimitSec / 60)}min` : 'Illimite'}</Label>
                <Slider value={[settings.timeLimitSec]} onValueChange={([v]) => setSettings(s => ({ ...s, timeLimitSec: v }))} min={0} max={1800} step={30} className="mt-2" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Mode examen</Label>
                  <p className="text-xs text-[#605a57] mt-0.5">Pas de correction entre les systemes</p>
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
              <CardTitle className="text-2xl">Résultats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ClassScoreBlock
                exerciseId={'calcul-mental-3'}
                percent={scoreData.score}
                detail={`${totalCorrect}/${results.length} correctes`}
              />
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
                <p className="font-semibold text-[#37322f] text-sm">Detail :</p>
                <div className="max-h-56 overflow-y-auto space-y-1.5">
                  {results.map((r, i) => (
                    <div key={i} className="bg-[#f7f5f3] rounded px-3 py-2 text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[#605a57]">S{i + 1}</span>
                        <span className={r.isCorrect ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                          {r.isCorrect ? '\u2713' : '\u2717'} B = {r.userAnswer !== null ? r.userAnswer : '?'}
                          {!r.isCorrect && <span className="text-green-600 ml-1">(B = {r.system.valueB})</span>}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">A = {r.system.valueA}, C = {r.system.valueC}</p>
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
  const currentSys = systems[currentIdx];
  const timerPercent = totalTime > 0 ? (timeLeft / totalTime) * 100 : 100;
  const timerColor = timerPercent > 50 ? 'bg-blue-500' : timerPercent > 20 ? 'bg-amber-500' : 'bg-red-500';

  const eq1 = currentSys ? formatEquation1(currentSys) : '';
  const eq2 = currentSys ? formatEquation2(currentSys) : '';
  const eq3 = currentSys ? formatEquation3(currentSys) : '';

  return (
    <div className="min-h-screen p-3" style={{ backgroundColor: '#fbfaf9' }}>
      <div className="max-w-lg mx-auto">
        {settings.timeLimitSec > 0 && (
          <div className="w-full h-2 rounded-full overflow-hidden bg-slate-200 mb-3">
            <div className={`h-full transition-all duration-100 ${timerColor}`} style={{ width: `${timerPercent}%` }} />
          </div>
        )}

        <div className="flex items-center justify-between mb-3">
          <Badge variant="outline" className="text-sm px-2 py-1">
            {currentIdx + 1} / {settings.totalQuestions}
          </Badge>
          {settings.timeLimitSec > 0 && (
            <span className="text-sm text-[#605a57]">
              {Math.floor(timeLeft / 60000)}:{String(Math.floor((timeLeft % 60000) / 1000)).padStart(2, '0')}
            </span>
          )}
        </div>

        {showCorrection ? (
          <Card className="text-center py-6">
            <CardContent className="space-y-4">
              <div className="text-left mx-auto space-y-1 font-mono text-sm text-[#605a57] max-w-xs">
                <p className="text-center">{eq1}</p>
                <p className="text-center">{eq2}</p>
                <p className="text-center break-words">{eq3}</p>
              </div>
              <div className="text-sm text-[#605a57]">
                A = {currentSys.valueA}, C = {currentSys.valueC}
              </div>
              {results[results.length - 1]?.isCorrect ? (
                <p className="text-2xl font-bold text-green-600">{'\u2713'} B = {currentSys.valueB}</p>
              ) : (
                <>
                  <p className="text-2xl font-bold text-red-600">
                    {'\u2717'} {results[results.length - 1]?.userAnswer !== null
                      ? `B = ${results[results.length - 1]?.userAnswer}`
                      : 'Pas de reponse'}
                  </p>
                  <p className="text-lg text-green-600">Reponse : B = {currentSys.valueB}</p>
                </>
              )}
              <Button size="lg" className="w-full h-12" onClick={nextQuestion}>
                {currentIdx + 1 >= systems.length ? 'Voir les resultats' : 'Suivant'}
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="py-4">
            <CardContent className="space-y-4">
              <p className="text-sm text-[#605a57] text-center">Resoudre pour B :</p>

              {/* System with curly brace */}
              <div className="flex items-center justify-center gap-3">
                <div className="text-5xl font-extralight text-slate-400 select-none leading-none" style={{ fontFamily: 'serif' }}>
                  {'{'}
                </div>
                <div className="text-left space-y-2 font-mono text-sm text-slate-800">
                  <p>{eq1}</p>
                  <p>{eq2}</p>
                  <p className="break-words">{eq3}</p>
                  <p className="font-bold text-slate-900">B = ?</p>
                </div>
              </div>

              <div className="space-y-3 mt-4">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-[#37322f] shrink-0">B =</span>
                  <Input
                    ref={inputRef}
                    type="number"
                    inputMode="numeric"
                    value={userInput}
                    onChange={e => setUserInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && userInput.trim() !== '') submitAnswer(); }}
                    placeholder="?"
                    className="flex-1 text-center text-xl font-bold h-14"
                  />
                </div>
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

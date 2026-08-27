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
  terms: string[];
  answer: number;
  choices: IntervalChoice[];
  correctIndex: number;
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

const SETTINGS_KEY = 'aviatest-calcul-mental-2-mobile-settings';

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

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
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

  const expression = parts.join(' ');

  // Generate interval choices
  const numChoices = settings.numChoices;
  const baseWidth = randInt(240, 280);
  const choices: IntervalChoice[] = [];

  // Correct interval (smallest containing answer)
  const correctWidth = baseWidth - randInt(3, 8);
  const offsetInCorrect = randInt(Math.floor(correctWidth * 0.15), Math.floor(correctWidth * 0.85));
  const correctLower = answer - offsetInCorrect;
  choices.push({ lower: correctLower, upper: correctLower + correctWidth, width: correctWidth, containsAnswer: true });

  // 2-3 wider intervals containing answer
  const numContaining = randInt(2, 3);
  for (let i = 0; i < numContaining; i++) {
    const w = baseWidth + randInt(1, 12);
    const off = randInt(Math.floor(w * 0.1), Math.floor(w * 0.9));
    choices.push({ lower: answer - off, upper: answer - off + w, width: w, containsAnswer: true });
  }

  // Fill rest with non-containing intervals
  const remaining = numChoices - choices.length;
  for (let i = 0; i < remaining; i++) {
    const w = baseWidth + randInt(-5, 10);
    const lo = Math.random() < 0.5 ? answer + randInt(20, 200) : answer - w - randInt(20, 200);
    choices.push({ lower: lo, upper: lo + w, width: w, containsAnswer: false });
  }

  const shuffled = shuffle(choices);
  let correctIndex = -1;
  let smallestWidth = Infinity;
  for (let i = 0; i < shuffled.length; i++) {
    if (shuffled[i].containsAnswer && shuffled[i].width < smallestWidth) {
      smallestWidth = shuffled[i].width;
      correctIndex = i;
    }
  }

  return { expression, terms: termStrings, answer, choices: shuffled, correctIndex };
}

// ============================================================================
// Component
// ============================================================================

export default function CalculMental2Mobile() {
  const router = useRouter();
  const [gameState, setGameState] = useState<GameState>('menu');
  const [settings, setSettings] = useState<GameSettings>({ ...DEFAULT_SETTINGS });
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const [scorer] = useState(() => new Scorer());

  useEffect(() => { setSettings(loadSettings()); setSettingsLoaded(true); }, []);
  useEffect(() => { if (settingsLoaded) saveSettings(settings); }, [settings, settingsLoaded]);

  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [showCorrection, setShowCorrection] = useState(false);

  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const questionStartRef = useRef(0);

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
    const qs: QuestionData[] = [];
    for (let i = 0; i < settingsRef.current.totalQuestions; i++) qs.push(generateQuestion(settingsRef.current));
    setQuestions(qs);
    setCurrentIdx(0);
    setResults([]);
    setSelectedIdx(null);
    setShowCorrection(false);
    setGameState('playing');
    questionStartRef.current = Date.now();
    if (settingsRef.current.timeLimitSec > 0) startTimer(settingsRef.current.timeLimitSec * 1000);
  }, [scorer, startTimer]);

  const submitAnswer = useCallback(() => {
    const timeUsed = Date.now() - questionStartRef.current;
    const currentQ = questions[currentIdx];
    const isCorrect = selectedIdx !== null && selectedIdx === currentQ.correctIndex;
    scorer.recordAnswer(isCorrect);
    setResults(prev => [...prev, { question: currentQ, selectedIndex: selectedIdx, isCorrect, timeUsedMs: timeUsed }]);
    questionStartRef.current = Date.now();

    if (settingsRef.current.examMode || currentIdx + 1 >= questions.length) {
      if (currentIdx + 1 >= questions.length) { clearTimer(); setGameState('results'); }
      else { setCurrentIdx(currentIdx + 1); setSelectedIdx(null); setShowCorrection(false); }
    } else {
      clearTimer();
      setShowCorrection(true);
    }
  }, [clearTimer, selectedIdx, questions, currentIdx, scorer]);

  const nextQuestion = useCallback(() => {
    if (currentIdx + 1 >= questions.length) { clearTimer(); setGameState('results'); return; }
    setCurrentIdx(currentIdx + 1);
    setSelectedIdx(null);
    setShowCorrection(false);
    questionStartRef.current = Date.now();
    if (settingsRef.current.timeLimitSec > 0) {
      startTimer(settingsRef.current.timeLimitSec * 1000);
    }
  }, [currentIdx, questions.length, clearTimer, startTimer]);

  useEffect(() => {
    if (timeLeft <= 0 && totalTime > 0 && gameState === 'playing') { clearTimer(); setGameState('results'); }
  }, [timeLeft, totalTime, gameState, clearTimer]);

  // ---- MENU ----
  if (gameState === 'menu') {
    return (
      <div className="min-h-screen p-4" style={{ backgroundColor: '#fbfaf9' }}>
        <div className="max-w-lg mx-auto pt-4">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold">Calcul Mental 2</CardTitle>
              <CardDescription className="text-sm mt-1">
                Estimez le resultat et trouvez le plus petit intervalle
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-[#f7f5f3] rounded-lg p-3 text-sm text-[#605a57] space-y-1">
                <p><strong>{settings.totalQuestions} operations</strong> a estimer.</p>
                <p>Chaine de <strong>{settings.chainLength} termes</strong>.</p>
                <p>Selectionnez le <strong>plus petit intervalle</strong> contenant le resultat.</p>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 bg-[#f7f5f3] rounded-lg">
                  <p className="text-lg font-bold text-[#37322f]">{settings.totalQuestions}</p>
                  <p className="text-xs text-[#605a57]">Questions</p>
                </div>
                <div className="p-2 bg-[#f7f5f3] rounded-lg">
                  <p className="text-lg font-bold text-[#37322f]">{settings.numChoices}</p>
                  <p className="text-xs text-[#605a57]">Intervalles</p>
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
                <Label>Questions : {settings.totalQuestions}</Label>
                <Slider value={[settings.totalQuestions]} onValueChange={([v]) => setSettings(s => ({ ...s, totalQuestions: v }))} min={1} max={30} step={1} className="mt-2" />
              </div>
              <div>
                <Label>Termes : {settings.chainLength}</Label>
                <Slider value={[settings.chainLength]} onValueChange={([v]) => setSettings(s => ({ ...s, chainLength: v }))} min={3} max={15} step={1} className="mt-2" />
              </div>
              <div>
                <Label>Nombre max : {settings.maxNumber}</Label>
                <Slider value={[settings.maxNumber]} onValueChange={([v]) => setSettings(s => ({ ...s, maxNumber: v }))} min={20} max={999} step={1} className="mt-2" />
              </div>
              <div>
                <Label>Intervalles : {settings.numChoices}</Label>
                <Slider value={[settings.numChoices]} onValueChange={([v]) => setSettings(s => ({ ...s, numChoices: v }))} min={4} max={10} step={1} className="mt-2" />
              </div>
              <div>
                <Label>Temps : {settings.timeLimitSec > 0 ? `${Math.floor(settings.timeLimitSec / 60)}min` : 'Illimite'}</Label>
                <Slider value={[settings.timeLimitSec]} onValueChange={([v]) => setSettings(s => ({ ...s, timeLimitSec: v }))} min={0} max={1800} step={30} className="mt-2" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Mode examen</Label>
                  <p className="text-xs text-[#605a57] mt-0.5">Pas de correction entre les questions</p>
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
                exerciseId={'calcul-mental-2'}
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
                  {results.map((r, i) => {
                    const correct = r.question.choices[r.question.correctIndex];
                    const selected = r.selectedIndex !== null ? r.question.choices[r.selectedIndex] : null;
                    return (
                      <div key={i} className="bg-[#f7f5f3] rounded px-3 py-2 text-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[#605a57]">Q{i + 1}</span>
                          <span className={r.isCorrect ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                            {r.isCorrect ? '\u2713' : '\u2717'}{' '}
                            {selected ? `[${selected.lower}, ${selected.upper}]` : '?'}
                            {!r.isCorrect && <span className="text-green-600 ml-1">([{correct.lower}, {correct.upper}])</span>}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 font-mono break-words">{r.question.expression} = {r.question.answer}</p>
                      </div>
                    );
                  })}
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
        {/* Timer */}
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
          <div className="space-y-3">
            <Card className="py-4">
              <CardContent className="space-y-3 text-center">
                <div className="flex flex-wrap justify-center gap-1 text-sm font-mono text-[#605a57]">
                  {currentQ.terms.map((term, i) => (
                    <span key={i}>{term}</span>
                  ))}
                </div>
                <p className="text-sm text-slate-400">Resultat : {currentQ.answer}</p>
                {results[results.length - 1]?.isCorrect ? (
                  <p className="text-2xl font-bold text-green-600">{'\u2713'} Correct !</p>
                ) : (
                  <p className="text-2xl font-bold text-red-600">
                    {'\u2717'}{' '}
                    {results[results.length - 1]?.selectedIndex !== null
                      ? 'Mauvaise reponse'
                      : '?'}
                  </p>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-2">
              {currentQ.choices.map((choice, i) => {
                const last = results[results.length - 1];
                const isCorrect = i === currentQ.correctIndex;
                const isSelected = last?.selectedIndex === i;
                let cls =
                  'text-left px-3 py-3 rounded-lg border-2 text-sm font-mono min-h-[48px] cursor-default ';
                if (isCorrect) {
                  cls += 'border-green-500 bg-green-50 text-green-800';
                } else if (isSelected) {
                  cls += 'border-red-500 bg-red-50 text-red-800';
                } else {
                  cls += 'border-slate-200 bg-white text-[#605a57]';
                }
                return (
                  <div key={i} className={cls}>
                    <span className="text-slate-400 mr-1">{i + 1})</span>
                    [{choice.lower}, {choice.upper}]
                  </div>
                );
              })}
            </div>

            <Button size="lg" className="w-full h-12" onClick={nextQuestion}>
              {currentIdx + 1 >= questions.length ? 'Voir les resultats' : 'Suivant'}
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Expression */}
            <Card className="py-4">
              <CardContent>
                <p className="text-xs text-[#605a57] mb-3 text-center">
                  Plus petit intervalle contenant le resultat :
                </p>
                <div className="flex flex-wrap justify-center gap-x-2 gap-y-1 text-base font-bold text-slate-800 font-mono">
                  {currentQ?.terms.map((term, i) => (
                    <span key={i} className="whitespace-nowrap">{term}</span>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Interval choices - 2 columns on mobile */}
            <div className="grid grid-cols-2 gap-2">
              {currentQ?.choices.map((choice, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedIdx(i)}
                  className={`text-left px-3 py-3 rounded-lg border-2 transition-all text-sm font-mono min-h-[48px]
                    ${selectedIdx === i
                      ? 'border-blue-500 bg-blue-50 text-blue-800'
                      : 'border-slate-200 bg-white text-[#37322f] active:bg-[#f7f5f3]'
                    }`}
                >
                  <span className="text-slate-400 mr-1">{i + 1})</span>
                  [{choice.lower}, {choice.upper}]
                </button>
              ))}
            </div>

            <Button
              onClick={submitAnswer}
              disabled={selectedIdx === null}
              size="lg"
              className="w-full h-12"
            >
              Valider <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

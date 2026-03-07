'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Scorer } from '@/lib/core/Scorer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Play, RotateCcw, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';

// ============================================================================
// Types
// ============================================================================

type GameState = 'menu' | 'playing' | 'results';

/** What is currently shown during a salve */
type SalvePhase =
  | { kind: 'countdown'; value: number }
  | { kind: 'calc'; expr: string; answer: number }
  | { kind: 'letter'; letter: string }
  | { kind: 'recall' };

interface SalveResult {
  letters: string[];
  userAnswers: (string | null)[];
  correctCount: number;
  calcCorrect: number;
  calcTotal: number;
}

// ============================================================================
// Helpers
// ============================================================================

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DISPLAY_TIME_MS = 10_000; // 10 seconds per item

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateCalc(): { expr: string; answer: number } {
  const a = randInt(1, 10);
  const b = randInt(1, 10);
  const c = randInt(1, 10);
  const d = randInt(1, 10);
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
  const [calcFeedback, setCalcFeedback] = useState<'correct' | 'wrong' | null>(null);
  const currentCalcAnswerRef = useRef(0);

  // Timer
  const [timeLeft, setTimeLeft] = useState(DISPLAY_TIME_MS);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
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

  const startTimer = useCallback(() => {
    clearTimer();
    phaseStartRef.current = Date.now();
    setTimeLeft(DISPLAY_TIME_MS);
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - phaseStartRef.current;
      const left = Math.max(0, DISPLAY_TIME_MS - elapsed);
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
      setCalcInput('');
      setCalcFeedback(null);
      setPhase({ kind: 'calc', expr: calc.expr, answer: calc.answer });
      startTimer();
    } else {
      // Letter
      const letter = generateLetter(salveLettersRef.current);
      salveLettersRef.current = [...salveLettersRef.current, letter];
      setPhase({ kind: 'letter', letter });
      startTimer();
    }
  }, [clearTimer, startTimer]);

  // Auto-advance when timer runs out
  useEffect(() => {
    if (timeLeft <= 0 && (phase.kind === 'calc' || phase.kind === 'letter')) {
      if (phase.kind === 'calc') {
        salveCalcTotalRef.current += 1;
        // No answer given = wrong
      }
      advanceInSalve();
    }
  }, [timeLeft, phase.kind, advanceInSalve]);

  const startSalve = useCallback((index: number) => {
    salveLettersRef.current = [];
    salveCalcCorrectRef.current = 0;
    salveCalcTotalRef.current = 0;
    salveItemIndexRef.current = 0;
    salveTotalLettersRef.current = randInt(4, 9);
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
    setSalveResults([]);
    setGameState('playing');
    startSalve(0);
  }, [scorer, startSalve]);

  // ---- Calc submission ----
  const submitCalc = useCallback(() => {
    if (phase.kind !== 'calc') return;
    const userVal = parseInt(calcInput, 10);
    salveCalcTotalRef.current += 1;
    if (userVal === currentCalcAnswerRef.current) {
      salveCalcCorrectRef.current += 1;
      setCalcFeedback('correct');
    } else {
      setCalcFeedback('wrong');
    }
    clearTimer();
    // Brief pause then advance
    setTimeout(() => advanceInSalve(), 800);
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
    };

    setSalveResults((prev) => [...prev, result]);
  }, [recallSelections, scorer]);

  const nextSalveOrEnd = useCallback(() => {
    const nextIdx = salveIndex + 1;
    if (nextIdx >= 10) {
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
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">Calcul & Memorisation</CardTitle>
            <CardDescription className="text-base mt-2">
              Test de double tache : calcul mental + memorisation de lettres
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-600 space-y-2">
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
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xl font-bold text-slate-700">10</p>
                <p className="text-xs text-slate-500">Salves</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xl font-bold text-slate-700">4-9</p>
                <p className="text-xs text-slate-500">Lettres/salve</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xl font-bold text-slate-700">10s</p>
                <p className="text-xs text-slate-500">Par element</p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Button size="lg" className="w-full" onClick={startGame}>
                <Play className="mr-2 h-5 w-5" /> Commencer
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

  // ---- RESULTS ----
  if (gameState === 'results') {
    const scoreData = scorer.toJSON();
    const totalLetters = salveResults.reduce((s, r) => s + r.letters.length, 0);
    const totalLettersCorrect = salveResults.reduce((s, r) => s + r.correctCount, 0);
    const totalCalcs = salveResults.reduce((s, r) => s + r.calcTotal, 0);
    const totalCalcsCorrect = salveResults.reduce((s, r) => s + r.calcCorrect, 0);

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
              <p className="text-slate-500 mt-1">Lettres restituees correctement</p>
            </div>

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
              <p className="font-semibold text-slate-700 text-sm">Detail par salve :</p>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {salveResults.map((r, i) => (
                  <div key={i} className="flex items-center justify-between bg-slate-50 rounded px-3 py-1.5 text-sm">
                    <span className="text-slate-600">Salve {i + 1}</span>
                    <span>
                      <span className={r.correctCount === r.letters.length ? 'text-green-600 font-semibold' : 'text-red-600'}>
                        {r.correctCount}/{r.letters.length} lettres
                      </span>
                      <span className="text-slate-400 mx-2">|</span>
                      <span className={r.calcCorrect === r.calcTotal ? 'text-green-600' : 'text-slate-500'}>
                        {r.calcCorrect}/{r.calcTotal} calculs
                      </span>
                    </span>
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
  const timerPercent = (timeLeft / DISPLAY_TIME_MS) * 100;
  const timerColor = timerPercent > 50 ? 'bg-amber-500' : timerPercent > 20 ? 'bg-orange-500' : 'bg-red-500';

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <Badge variant="outline" className="text-base px-3 py-1">
            Salve {salveIndex + 1} / 10
          </Badge>
          {phase.kind !== 'countdown' && phase.kind !== 'recall' && (
            <div className="text-sm text-slate-500">
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
              <p className="text-slate-500 mb-4 text-lg">Salve {salveIndex + 1} — Preparez-vous</p>
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
              <p className="text-4xl md:text-5xl font-bold text-slate-800 font-mono tracking-wide">
                {phase.expr}
              </p>
              <div className="flex items-center justify-center gap-3 max-w-xs mx-auto">
                <input
                  ref={calcInputRef}
                  type="number"
                  value={calcInput}
                  onChange={(e) => setCalcInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && calcInput !== '') submitCalc();
                  }}
                  disabled={calcFeedback !== null}
                  placeholder="?"
                  className="w-32 text-center text-2xl font-bold border-2 border-slate-300 rounded-lg py-2 focus:border-amber-500 focus:outline-none disabled:opacity-50"
                />
                <Button
                  onClick={submitCalc}
                  disabled={calcInput === '' || calcFeedback !== null}
                  size="lg"
                >
                  OK
                </Button>
              </div>
              {calcFeedback && (
                <p className={`text-lg font-semibold ${calcFeedback === 'correct' ? 'text-green-600' : 'text-red-600'}`}>
                  {calcFeedback === 'correct' ? 'Correct !' : `Faux ! Reponse : ${currentCalcAnswerRef.current}`}
                </p>
              )}
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
              <p className="text-slate-500">
                Lettre {salveLettersRef.current.length} / {salveTotalLettersRef.current}
              </p>
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
                        const isCorrect = recallSubmitted && letter === salveLettersRef.current[colIdx];
                        const isWrong = recallSubmitted && isSelected && !isCorrect;

                        let btnClass = 'w-11 h-11 text-lg font-bold rounded-lg border-2 transition-all ';
                        if (recallSubmitted) {
                          if (isCorrect) btnClass += 'bg-green-100 border-green-500 text-green-700';
                          else if (isWrong) btnClass += 'bg-red-100 border-red-500 text-red-700';
                          else btnClass += 'bg-slate-50 border-slate-200 text-slate-400';
                        } else if (isSelected) {
                          btnClass += 'bg-amber-100 border-amber-500 text-amber-700';
                        } else {
                          btnClass += 'bg-white border-slate-200 text-slate-700 hover:border-amber-400 hover:bg-amber-50';
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
              ) : (
                <div className="space-y-3">
                  <div className="text-center">
                    <p className="text-lg font-semibold">
                      {recallResults.filter(Boolean).length} / {recallResults.length} lettres correctes
                    </p>
                    <p className="text-sm text-slate-500">
                      Calculs : {salveCalcCorrectRef.current} / {salveCalcTotalRef.current}
                    </p>
                  </div>
                  <Button className="w-full" size="lg" onClick={nextSalveOrEnd}>
                    {salveIndex + 1 >= 10 ? 'Voir les resultats' : `Salve ${salveIndex + 2} →`}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

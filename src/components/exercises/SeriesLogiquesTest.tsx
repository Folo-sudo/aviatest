'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { savePerformanceResult, loadEntries } from '@/lib/core/PerformanceTracker';
import { MiniPerformanceChart } from '@/components/PerformanceChart';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Play, RotateCcw, Home, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  formatSeries,
  generateSeriesQuestions,
  type SeriesQuestion,
} from '@/lib/exercises/seriesLogiques';

// ============================================================================
// Types
// ============================================================================

type GameState = 'menu' | 'settings' | 'playing' | 'results';
type AnswerOutcome = 'correct' | 'incorrect' | 'skipped';

interface GameSettings {
  totalQuestions: number;
  timePerQuestionSec: number;
  examMode: boolean;
}

type QuestionData = SeriesQuestion;

interface QuestionResult {
  question: QuestionData;
  selectedIndex: number | null;
  outcome: AnswerOutcome;
  timeUsedMs: number;
}

interface SessionScore {
  raw: number;
  percent: number;
  correct: number;
  incorrect: number;
  skipped: number;
}

// ============================================================================
// Constants
// ============================================================================

const SETTINGS_KEY = 'aviatest-series-logiques-settings';

const DEFAULT_SETTINGS: GameSettings = {
  totalQuestions: 15,
  timePerQuestionSec: 30,
  examMode: false,
};

const BG = '#d4d4d4';
const NAVY = '#1a2b4a';
const TIMER_BLUE = '#0068C6';
const TIMER_RED = '#dc2626';

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

function computeSessionScore(results: QuestionResult[], totalQuestions: number): SessionScore {
  let correct = 0;
  let incorrect = 0;
  let skipped = 0;
  for (const r of results) {
    if (r.outcome === 'correct') correct += 1;
    else if (r.outcome === 'incorrect') incorrect += 1;
    else skipped += 1;
  }
  const raw = correct - incorrect / 3;
  const percent = totalQuestions > 0 ? Math.round((raw / totalQuestions) * 1000) / 10 : 0;
  return { raw, percent, correct, incorrect, skipped };
}

export default function SeriesLogiquesTest() {
  const router = useRouter();
  const [gameState, setGameState] = useState<GameState>('menu');
  const [settings, setSettings] = useState<GameSettings>({ ...DEFAULT_SETTINGS });
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    setSettings(loadSettings());
    setSettingsLoaded(true);
  }, []);

  useEffect(() => {
    if (settingsLoaded) saveSettings(settings);
  }, [settings, settingsLoaded]);

  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [locked, setLocked] = useState(false);
  const [flashIdx, setFlashIdx] = useState<number | null>(null);
  const [flashCorrect, setFlashCorrect] = useState<boolean | null>(null);
  const [showCorrection, setShowCorrection] = useState(false);
  const [lastOutcome, setLastOutcome] = useState<AnswerOutcome | null>(null);

  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionStartRef = useRef(0);
  const perfSavedRef = useRef(false);
  const lockedRef = useRef(false);
  const currentIdxRef = useRef(0);
  const questionsRef = useRef<QuestionData[]>([]);

  currentIdxRef.current = currentIdx;
  questionsRef.current = questions;
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

  const goToNextQuestion = useCallback(() => {
    const idx = currentIdxRef.current;
    const qs = questionsRef.current;

    if (idx + 1 >= qs.length) {
      clearTimer();
      setLocked(false);
      lockedRef.current = false;
      setFlashIdx(null);
      setFlashCorrect(null);
      setShowCorrection(false);
      setLastOutcome(null);
      setGameState('results');
      return;
    }

    const nextIdx = idx + 1;
    currentIdxRef.current = nextIdx;
    setCurrentIdx(nextIdx);
    setLocked(false);
    lockedRef.current = false;
    setFlashIdx(null);
    setFlashCorrect(null);
    setShowCorrection(false);
    setLastOutcome(null);
    startTimer(settingsRef.current.timePerQuestionSec * 1000);
  }, [clearTimer, startTimer]);

  const recordAnswer = useCallback(
    (selectedIndex: number | null, outcome: AnswerOutcome) => {
      if (lockedRef.current) return;
      lockedRef.current = true;
      setLocked(true);
      clearTimer();

      const timeUsed = Date.now() - questionStartRef.current;
      const q = questionsRef.current[currentIdxRef.current];
      const result: QuestionResult = {
        question: q,
        selectedIndex,
        outcome,
        timeUsedMs: timeUsed,
      };
      setResults((prev) => [...prev, result]);
      setLastOutcome(outcome);

      if (settingsRef.current.examMode) {
        goToNextQuestion();
      } else {
        if (selectedIndex !== null) {
          setFlashIdx(selectedIndex);
          setFlashCorrect(outcome === 'correct');
        }
        setShowCorrection(true);
      }
    },
    [clearTimer, goToNextQuestion],
  );

  const handleChoice = useCallback(
    (index: number) => {
      const q = questionsRef.current[currentIdxRef.current];
      const outcome: AnswerOutcome = index === q.correctIndex ? 'correct' : 'incorrect';
      recordAnswer(index, outcome);
    },
    [recordAnswer],
  );

  const handleSkip = useCallback(() => {
    recordAnswer(null, 'skipped');
  }, [recordAnswer]);

  const startGame = useCallback(() => {
    perfSavedRef.current = false;
    const qs = generateSeriesQuestions(settingsRef.current.totalQuestions);
    setQuestions(qs);
    questionsRef.current = qs;
    setCurrentIdx(0);
    currentIdxRef.current = 0;
    setResults([]);
    setLocked(false);
    lockedRef.current = false;
    setFlashIdx(null);
    setFlashCorrect(null);
    setShowCorrection(false);
    setLastOutcome(null);
    setGameState('playing');
    startTimer(settingsRef.current.timePerQuestionSec * 1000);
  }, [startTimer]);

  // Timer expiry → skip (0 penalty)
  useEffect(() => {
    if (gameState !== 'playing' || locked) return;
    if (totalTime > 0 && timeLeft <= 0) {
      recordAnswer(null, 'skipped');
    }
  }, [timeLeft, totalTime, gameState, locked, recordAnswer]);

  // =========================================================================
  // MENU
  // =========================================================================
  if (gameState === 'menu') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">Series logiques</CardTitle>
            <CardDescription className="mt-2 text-base">
              Completer la serie ou trouver l&apos;intrus — plus de 50 logiques
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
              <p>
                <strong>{settings.totalQuestions} questions</strong>, chacune avec une loi differente
                (nombres, lettres, mots, rangs, et lois inedites).
              </p>
              <p>4 propositions. Certaines series ont le trou au milieu ; d&apos;autres demandent l&apos;intrus.</p>
              <p>
                <strong>{settings.timePerQuestionSec}s</strong> par question.
              </p>
              <p>Score : +1 correct, -1/3 incorrect, &laquo; Je ne sais pas &raquo; = 0.</p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xl font-bold text-slate-700">{settings.totalQuestions}</p>
                <p className="text-xs text-slate-500">Questions</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xl font-bold text-slate-700">4</p>
                <p className="text-xs text-slate-500">Choix</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xl font-bold text-slate-700">{settings.timePerQuestionSec}s</p>
                <p className="text-xs text-slate-500">Par question</p>
              </div>
            </div>

            {settings.examMode && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-center text-sm text-amber-700">
                Mode examen — resultats a la fin
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
                <Label>Nombre de questions : {settings.totalQuestions}</Label>
                <Slider
                  value={[settings.totalQuestions]}
                  onValueChange={([v]) => setSettings((s) => ({ ...s, totalQuestions: v }))}
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
                  min={10}
                  max={60}
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
    const score = computeSessionScore(results, questions.length || settings.totalQuestions);
    const avgTime =
      results.length > 0
        ? Math.round((results.reduce((s, r) => s + r.timeUsedMs, 0) / results.length / 1000) * 10) / 10
        : 0;

    if (!perfSavedRef.current) {
      perfSavedRef.current = true;
      const avgMs =
        results.length > 0 ? results.reduce((s, r) => s + r.timeUsedMs, 0) / results.length : 0;
      savePerformanceResult('series-logiques', Math.round(score.percent), 100, avgMs);
    }

    const perfEntries = loadEntries('series-logiques');
    const grade =
      score.percent >= 75 ? 'Excellent' : score.percent >= 50 ? 'Bien' : score.percent >= 25 ? 'Passable' : 'A revoir';

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">Resultats</CardTitle>
            <Badge
              variant={score.percent >= 75 ? 'default' : score.percent >= 50 ? 'secondary' : 'destructive'}
              className="mt-2 px-4 py-1 text-lg"
            >
              {grade}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-5xl font-bold text-slate-700">{score.percent}%</p>
              <p className="mt-1 text-slate-500">
                Score brut : {score.raw.toFixed(1)} / {questions.length || settings.totalQuestions}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-green-50 p-3 text-center">
                <p className="text-2xl font-bold text-green-600">{score.correct}</p>
                <p className="text-xs text-green-700">Correct</p>
              </div>
              <div className="rounded-lg bg-red-50 p-3 text-center">
                <p className="text-2xl font-bold text-red-600">{score.incorrect}</p>
                <p className="text-xs text-red-700">Incorrect</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 text-center">
                <p className="text-2xl font-bold text-slate-600">{score.skipped}</p>
                <p className="text-xs text-slate-500">Passe</p>
              </div>
            </div>

            <div className="rounded-lg bg-amber-50 p-3 text-center">
              <p className="text-2xl font-bold text-amber-600">{avgTime}s</p>
              <p className="text-sm text-amber-700">Temps moyen</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-700">Detail par question :</p>
              <div className="max-h-64 space-y-1.5 overflow-y-auto">
                {results.map((r, i) => {
                  const correct = r.question.choices[r.question.correctIndex];
                  const selected =
                    r.selectedIndex !== null ? r.question.choices[r.selectedIndex] : null;
                  return (
                    <div key={i} className="rounded bg-slate-50 px-3 py-2 text-sm">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-slate-500">Q{i + 1}</span>
                        <span
                          className={
                            r.outcome === 'correct'
                              ? 'font-semibold text-green-600'
                              : r.outcome === 'incorrect'
                                ? 'font-semibold text-red-600'
                                : 'font-semibold text-slate-500'
                          }
                        >
                          {r.outcome === 'correct' ? '\u2713' : r.outcome === 'incorrect' ? '\u2717' : '\u2014'}{' '}
                          {selected ?? 'Passe'}
                          {r.outcome === 'incorrect' && (
                            <span className="ml-2 text-green-600">({correct})</span>
                          )}
                        </span>
                      </div>
                      <p className="font-mono text-xs text-slate-400">{formatSeries(r.question)}</p>
                      <p className="mt-0.5 whitespace-pre-wrap text-xs text-slate-500">{r.question.logic}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {perfEntries.length >= 2 && (
              <div className="border-t pt-4">
                <p className="mb-2 text-center text-sm font-medium text-slate-500">Progression</p>
                <div className="flex justify-center">
                  <MiniPerformanceChart entries={perfEntries} exerciseId="series-logiques" />
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
  const displayIdx = currentIdx;

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ backgroundColor: BG, color: NAVY }}
    >
      <div className="relative mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-6">
        {/* Vertical chrono bar */}
        <div
          className="absolute bottom-24 right-2 top-6 flex w-3 flex-col overflow-hidden rounded-full"
          style={{ backgroundColor: '#bbb' }}
        >
          <div
            className="w-full transition-all duration-100"
            style={{
              height: `${timerPercent}%`,
              backgroundColor: timerFillColor,
            }}
          />
          <div className="flex-1" />
        </div>

        {/* Question */}
        <div className="flex flex-1 flex-col items-center justify-center pr-8">
          {currentQ?.prompt && (
            <p className="mb-3 text-center text-sm font-medium sm:text-base" style={{ color: NAVY, opacity: 0.7 }}>
              {currentQ.prompt}
            </p>
          )}
          <p
            className="text-center text-xl font-semibold leading-relaxed tracking-wide sm:text-3xl md:text-4xl"
            style={{ color: NAVY }}
          >
            {currentQ ? formatSeries(currentQ) : ''}
          </p>
          {currentQ?.extraLines?.map((line) => (
            <p
              key={line}
              className="mt-3 text-center text-lg font-semibold tracking-wide sm:text-2xl"
              style={{ color: NAVY, opacity: 0.8 }}
            >
              {line}
            </p>
          ))}
          <div
            className="mt-8 w-full max-w-md border-t"
            style={{ borderColor: NAVY, opacity: 0.35 }}
          />
        </div>

        {/* Answers 2x2 */}
        <div className="mx-auto mb-4 grid w-full max-w-lg grid-cols-2 gap-3 pr-8">
          {currentQ?.choices.map((choice, i) => {
            const isFlash = flashIdx === i;
            const isCorrectChoice = showCorrection && i === currentQ.correctIndex;
            const flashStyle =
              isCorrectChoice
                ? { backgroundColor: '#dcfce7', color: '#166534', border: '2px solid #22c55e' }
                : isFlash && flashCorrect === false
                  ? { backgroundColor: '#fee2e2', color: '#991b1b', border: '2px solid #ef4444' }
                  : isFlash && flashCorrect === true
                    ? { backgroundColor: '#dcfce7', color: '#166534', border: '2px solid #22c55e' }
                    : { backgroundColor: '#ffffff', color: NAVY, border: '2px solid transparent' };
            return (
              <button
                key={i}
                type="button"
                disabled={locked}
                onClick={() => handleChoice(i)}
                className="rounded-full px-4 py-4 text-base font-semibold shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 sm:text-lg break-all"
                style={{
                  ...flashStyle,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                }}
              >
                {choice}
              </button>
            );
          })}
        </div>

        {showCorrection && currentQ && (
          <div className="mx-auto mb-4 w-full max-w-lg rounded-xl border border-slate-200 bg-white p-4 shadow-sm pr-8">
            <p
              className={`mb-1 text-center text-base font-semibold ${
                lastOutcome === 'correct'
                  ? 'text-green-600'
                  : lastOutcome === 'incorrect'
                    ? 'text-red-600'
                    : 'text-slate-600'
              }`}
            >
              {lastOutcome === 'correct'
                ? 'Correct'
                : lastOutcome === 'incorrect'
                  ? `Incorrect — reponse : ${currentQ.choices[currentQ.correctIndex]}`
                  : `Reponse : ${currentQ.choices[currentQ.correctIndex]}`}
            </p>
            <p className="whitespace-pre-wrap text-left text-sm leading-relaxed text-slate-700 sm:text-base">
              {currentQ.logic}
            </p>
            <Button size="lg" className="mt-4 w-full" onClick={goToNextQuestion}>
              Suivant
            </Button>
          </div>
        )}

        {/* Skip */}
        {!showCorrection && (
          <button
            type="button"
            disabled={locked}
            onClick={handleSkip}
            className="mb-6 pr-8 text-center text-base italic transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ color: NAVY }}
          >
            Je ne sais pas...
          </button>
        )}

        {/* Progress footer */}
        <div
          className="border-t py-3 pr-8 text-center text-base font-medium"
          style={{ borderColor: 'rgba(26,43,74,0.2)', color: NAVY }}
        >
          {displayIdx + 1} &rarr; {questions.length}
        </div>
      </div>
    </div>
  );
}

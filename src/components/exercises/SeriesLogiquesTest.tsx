'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { savePerformanceResult } from '@/lib/core/PerformanceTracker';
import { Button } from '@/components/ui/button';
import {
  CorrectionBanner,
  ExerciseMenu,
  ExerciseResults,
  ExerciseSettings,
  SettingSlider,
} from '@/components/exercises/shell';
import { useRouter } from 'next/navigation';
import {
  computeSeriesSessionScore,
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
const TIMER_BLUE = '#37322f';
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
      <ExerciseMenu
        title="Séries logiques"
        subtitle="Compléter la série ou trouver l'intrus — plus de 50 logiques"
        stats={[
          { value: settings.totalQuestions, label: 'Questions' },
          { value: 4, label: 'Choix' },
          { value: `${settings.timePerQuestionSec}s`, label: 'Par question' },
        ]}
        examMode={settings.examMode}
        onPlay={startGame}
        onSettings={() => setGameState('settings')}
        onBack={() => router.push('/')}
      >
        <div className="space-y-2 rounded-lg bg-[#f7f5f3] p-4 text-sm text-[#605a57]">
          <p>
            <strong>{settings.totalQuestions} questions</strong>, chacune avec une loi différente
            (nombres, lettres, mots, rangs, et lois inédites).
          </p>
          <p>4 propositions. Certaines séries ont le trou au milieu ; d&apos;autres demandent l&apos;intrus.</p>
          <p>
            <strong>{settings.timePerQuestionSec}s</strong> par question.
          </p>
          <p>Score : +1 correct, -1/3 incorrect, « Je ne sais pas » = 0.</p>
        </div>
      </ExerciseMenu>
    );
  }

  // =========================================================================
  // SETTINGS
  // =========================================================================
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
          min={5}
          max={30}
          step={1}
          onChange={(v) => setSettings((s) => ({ ...s, totalQuestions: v }))}
        />
        <SettingSlider
          label="Temps par question"
          value={settings.timePerQuestionSec}
          min={10}
          max={60}
          step={5}
          format={(v) => `${v}s`}
          onChange={(v) => setSettings((s) => ({ ...s, timePerQuestionSec: v }))}
        />
      </ExerciseSettings>
    );
  }

  // =========================================================================
  // RESULTS
  // =========================================================================
  if (gameState === 'results') {
    const score = computeSeriesSessionScore(results, questions.length || settings.totalQuestions);
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

    return (
      <ExerciseResults
        exerciseId="series-logiques"
        percent={score.percent}
        detail={`Score brut : ${score.raw.toFixed(1)} / ${questions.length || settings.totalQuestions}`}
        onReplay={startGame}
        onMenu={() => setGameState('menu')}
        onHome={() => router.push('/')}
      >
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-green-50 p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{score.correct}</p>
            <p className="text-xs text-green-700">Correct</p>
          </div>
          <div className="rounded-lg bg-red-50 p-3 text-center">
            <p className="text-2xl font-bold text-red-600">{score.incorrect}</p>
            <p className="text-xs text-red-700">Incorrect</p>
          </div>
          <div className="rounded-lg bg-[#f7f5f3] p-3 text-center">
            <p className="text-2xl font-bold text-[#605a57]">{score.skipped}</p>
            <p className="text-xs text-[#605a57]">Passé</p>
          </div>
        </div>
        <div className="rounded-lg bg-amber-50 p-3 text-center">
          <p className="text-2xl font-bold text-amber-600">{avgTime}s</p>
          <p className="text-sm text-amber-700">Temps moyen</p>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-semibold text-[#37322f]">Détail par question :</p>
          <div className="max-h-64 space-y-1.5 overflow-y-auto">
            {results.map((r, i) => {
              const correct = r.question.choices[r.question.correctIndex];
              const selected =
                r.selectedIndex !== null ? r.question.choices[r.selectedIndex] : null;
              return (
                <div key={i} className="rounded bg-[#f7f5f3] px-3 py-2 text-sm">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[#605a57]">Q{i + 1}</span>
                    <span
                      className={
                        r.outcome === 'correct'
                          ? 'font-semibold text-green-600'
                          : r.outcome === 'incorrect'
                            ? 'font-semibold text-red-600'
                            : 'font-semibold text-[#605a57]'
                      }
                    >
                      {r.outcome === 'correct' ? '\u2713' : r.outcome === 'incorrect' ? '\u2717' : '\u2014'}{' '}
                      {selected ?? 'Passé'}
                      {r.outcome === 'incorrect' && (
                        <span className="ml-2 text-green-600">({correct})</span>
                      )}
                    </span>
                  </div>
                  <p className="font-mono text-xs text-[#605a57]">{formatSeries(r.question)}</p>
                  <p className="mt-0.5 whitespace-pre-wrap text-xs text-[#605a57]">{r.question.logic}</p>
                </div>
              );
            })}
          </div>
        </div>
      </ExerciseResults>
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
          <CorrectionBanner
            outcome={
              lastOutcome === 'correct'
                ? 'correct'
                : lastOutcome === 'incorrect'
                  ? 'incorrect'
                  : lastOutcome === 'skipped'
                    ? 'skipped'
                    : 'timeout'
            }
            expected={currentQ.choices[currentQ.correctIndex]}
          >
            <p className="mt-2 whitespace-pre-wrap text-left text-sm leading-relaxed text-[#37322f] sm:text-base">
              {currentQ.logic}
            </p>
            <Button size="lg" className="mt-4 w-full" onClick={goToNextQuestion}>
              Suivant
            </Button>
          </CorrectionBanner>
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

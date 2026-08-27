'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Scorer } from '@/lib/core/Scorer';
import { savePerformanceResult, loadEntries } from '@/lib/core/PerformanceTracker';
import { MiniPerformanceChart } from '@/components/PerformanceChart';
import { ClassScoreBlock } from '@/components/ClassScoreBlock';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Play, RotateCcw, Home, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  pickAnglaisQuestions,
  ANGLAIS_KIND_LABELS,
  type AnglaisItem,
  type AnglaisKind,
} from '@/lib/exercises/anglaisPsy0Bank';
import { explainAnglaisItem } from '@/lib/exercises/anglaisPsy0Explain';

// ============================================================================
// Types
// ============================================================================

type GameState = 'menu' | 'settings' | 'playing' | 'results';

interface GameSettings {
  totalQuestions: number;
  timeLimitSec: number;
  examMode: boolean;
}

type McqItem = AnglaisItem;

interface QuestionResult {
  question: McqItem;
  selectedIndex: number | null;
  isCorrect: boolean;
  timeUsedMs: number;
}

// ============================================================================
// Constants
// ============================================================================

const SETTINGS_KEY = 'aviatest-anglais-psy0-settings';
const EXERCISE_ID = 'anglais-psy0';

const DEFAULT_SETTINGS: GameSettings = {
  totalQuestions: 30,
  timeLimitSec: 450,
  examMode: false,
};

const BG = '#d4d4d4';
const NAVY = '#0f2347';

// ============================================================================
// Helpers
// ============================================================================

function formatTime(ms: number): string {
  const sec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function loadSettings(): GameSettings {
  if (typeof window === 'undefined') return { ...DEFAULT_SETTINGS };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(s: GameSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* ignore quota */
  }
}

function ExplainBody({ text }: { text: string }) {
  return (
    <div className="space-y-2 text-sm leading-relaxed sm:text-base">
      {text.split('\n\n').map((para, i) => (
        <p key={i}>
          {para.split('\n').map((line, j) => (
            <span key={j}>
              {j > 0 ? <br /> : null}
              {line.split(/(\*\*[^*]+\*\*)/g).map((chunk, k) =>
                chunk.startsWith('**') && chunk.endsWith('**') ? (
                  <strong key={k}>{chunk.slice(2, -2)}</strong>
                ) : (
                  <span key={k}>{chunk}</span>
                ),
              )}
            </span>
          ))}
        </p>
      ))}
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

export default function AnglaisPsy0Test() {
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

  const [questions, setQuestions] = useState<McqItem[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [flashIdx, setFlashIdx] = useState<number | null>(null);
  const [flashCorrect, setFlashCorrect] = useState<boolean | null>(null);
  const [showExplain, setShowExplain] = useState(false);
  const advancingRef = useRef(false);

  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const timerStartRef = useRef(0);
  const originalTotalRef = useRef(0);
  const pausedLeftRef = useRef(0);
  const questionStartRef = useRef(0);
  const perfSavedRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(
    (durationMs: number) => {
      clearTimer();
      timerStartRef.current = Date.now();
      setTotalTime(durationMs);
      setTimeLeft(durationMs);
      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - timerStartRef.current;
        setTimeLeft(Math.max(0, durationMs - elapsed));
      }, 50);
    },
    [clearTimer],
  );

  useEffect(() => () => clearTimer(), [clearTimer]);

  const finishGame = useCallback(() => {
    clearTimer();
    setGameState('results');
  }, [clearTimer]);

  const startGame = useCallback(() => {
    scorer.reset();
    perfSavedRef.current = false;
    advancingRef.current = false;
    const qs = pickAnglaisQuestions(settingsRef.current.totalQuestions);
    setQuestions(qs);
    setCurrentIdx(0);
    setResults([]);
    setFlashIdx(null);
    setFlashCorrect(null);
    setShowExplain(false);
    setGameState('playing');
    questionStartRef.current = Date.now();
    originalTotalRef.current = settingsRef.current.timeLimitSec * 1000;
    pausedLeftRef.current = originalTotalRef.current;
    if (settingsRef.current.timeLimitSec > 0) {
      startTimer(settingsRef.current.timeLimitSec * 1000);
    }
  }, [scorer, startTimer]);

  const pauseTimer = useCallback(() => {
    if (settingsRef.current.timeLimitSec <= 0) return;
    const remaining = Math.max(0, totalTime - (Date.now() - timerStartRef.current));
    pausedLeftRef.current = remaining;
    setTimeLeft(remaining);
    clearTimer();
  }, [clearTimer, totalTime]);

  const resumeTimer = useCallback(() => {
    if (settingsRef.current.timeLimitSec <= 0) return;
    const left = pausedLeftRef.current;
    if (left <= 0) {
      finishGame();
      return;
    }
    startTimer(left);
  }, [finishGame, startTimer]);

  const goNext = useCallback(() => {
    setFlashIdx(null);
    setFlashCorrect(null);
    setShowExplain(false);
    if (currentIdx + 1 >= questions.length) {
      finishGame();
      return;
    }
    setCurrentIdx((i) => i + 1);
    questionStartRef.current = Date.now();
    advancingRef.current = false;
    resumeTimer();
  }, [currentIdx, finishGame, questions.length, resumeTimer]);

  const answerQuestion = useCallback(
    (choiceIdx: number) => {
      if (advancingRef.current || gameState !== 'playing' || showExplain) return;
      const currentQ = questions[currentIdx];
      if (!currentQ) return;

      advancingRef.current = true;
      const timeUsed = Date.now() - questionStartRef.current;
      const isCorrect = choiceIdx === currentQ.correct;
      scorer.recordAnswer(isCorrect);

      const result: QuestionResult = {
        question: currentQ,
        selectedIndex: choiceIdx,
        isCorrect,
        timeUsedMs: timeUsed,
      };
      setResults((prev) => [...prev, result]);

      if (settingsRef.current.examMode) {
        if (currentIdx + 1 >= questions.length) {
          finishGame();
        } else {
          setCurrentIdx((i) => i + 1);
          questionStartRef.current = Date.now();
          advancingRef.current = false;
        }
      } else {
        pauseTimer();
        setFlashIdx(choiceIdx);
        setFlashCorrect(isCorrect);
        setShowExplain(true);
      }
    },
    [
      currentIdx,
      finishGame,
      gameState,
      pauseTimer,
      questions,
      scorer,
      showExplain,
    ],
  );

  useEffect(() => {
    if (timeLeft <= 0 && totalTime > 0 && gameState === 'playing' && !showExplain) {
      finishGame();
    }
  }, [timeLeft, totalTime, gameState, finishGame, showExplain]);

  useEffect(() => {
    if (gameState !== 'playing') return;
    const onKey = (e: KeyboardEvent) => {
      if (showExplain) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          goNext();
        }
        return;
      }
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= 4) {
        e.preventDefault();
        answerQuestion(n - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [gameState, answerQuestion, goNext, showExplain]);

  // ---- MENU ----
  if (gameState === 'menu') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#fbfaf9] p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Anglais Psy0 — Cadets Air France</CardTitle>
            <CardDescription>
              Grammaire, faux amis, textes, inférences et registre — comme le jour J, pas seulement des
              phrases à trous
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2 rounded-lg bg-[#f7f5f3] p-4 text-sm text-[#605a57]">
              <p>
                <strong>{settings.totalQuestions} questions</strong> a choix multiples (4
                reponses).
              </p>
              <p>
                Grammaire fine, faux amis, erreurs à repérer, sens d&apos;une phrase, inférence,
                registre, et un texte à lire.
              </p>
              <p>
                Hors mode examen, chaque réponse ouvre une <strong>correction avec la règle</strong>{' '}
                (temps en pause). Cliquez Suivant — ou Entrée.
              </p>
              {settings.timeLimitSec > 0 && (
                <p>
                  Temps total :{' '}
                  <strong>
                    {Math.floor(settings.timeLimitSec / 60)}min
                    {settings.timeLimitSec % 60 > 0 ? ` ${settings.timeLimitSec % 60}s` : ''}
                  </strong>{' '}
                  (~{Math.round(settings.timeLimitSec / settings.totalQuestions)}s / question).
                </p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-[#f7f5f3] p-3">
                <p className="text-xl font-bold text-[#37322f]">{settings.totalQuestions}</p>
                <p className="text-xs text-[#605a57]">Questions</p>
              </div>
              <div className="rounded-lg bg-[#f7f5f3] p-3">
                <p className="text-xl font-bold text-[#37322f]">4</p>
                <p className="text-xs text-[#605a57]">Choix</p>
              </div>
              <div className="rounded-lg bg-[#f7f5f3] p-3">
                <p className="text-xl font-bold text-[#37322f]">
                  {settings.timeLimitSec > 0
                    ? `${Math.floor(settings.timeLimitSec / 60)}m${settings.timeLimitSec % 60 ? String(settings.timeLimitSec % 60).padStart(2, '0') : ''}`
                    : '\u221E'}
                </p>
                <p className="text-xs text-[#605a57]">Temps</p>
              </div>
            </div>

            {settings.examMode && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-center text-sm text-amber-700">
                Mode examen — pas de correction entre les questions
              </div>
            )}

            <div className="flex flex-col gap-3">
              <Button size="lg" className="w-full" onClick={startGame}>
                <Play className="mr-2 h-5 w-5" /> Jouer
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="w-full"
                onClick={() => setGameState('settings')}
              >
                <Settings className="mr-2 h-5 w-5" /> Paramètres
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
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#fbfaf9] p-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Paramètres</CardTitle>
            <CardDescription>Ajustez le test a votre niveau</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-5">
              <div>
                <Label>Nombre de questions : {settings.totalQuestions}</Label>
                <Slider
                  value={[settings.totalQuestions]}
                  onValueChange={([v]) => setSettings((s) => ({ ...s, totalQuestions: v }))}
                  min={10}
                  max={50}
                  step={1}
                  className="mt-2"
                />
              </div>
              <div>
                <Label>
                  Temps total :{' '}
                  {settings.timeLimitSec > 0
                    ? `${Math.floor(settings.timeLimitSec / 60)}min${settings.timeLimitSec % 60 > 0 ? ` ${settings.timeLimitSec % 60}s` : ''}`
                    : 'Illimite'}
                </Label>
                <Slider
                  value={[settings.timeLimitSec]}
                  onValueChange={([v]) => setSettings((s) => ({ ...s, timeLimitSec: v }))}
                  min={0}
                  max={900}
                  step={30}
                  className="mt-2"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Mode examen</Label>
                  <p className="mt-0.5 text-xs text-[#605a57]">
                    Pas de correction entre les questions. Les résultats s’affichent à la fin.
                  </p>
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

  // ---- RESULTS ----
  if (gameState === 'results') {
    const scoreData = scorer.toJSON();
    const totalQ = questions.length;
    const answered = results.length;
    const correctCount = results.filter((r) => r.isCorrect).length;
    const unanswered = totalQ - answered;
    const pct = totalQ > 0 ? Math.round((correctCount / totalQ) * 100) : 0;
    const avgTime =
      results.length > 0
        ? Math.round(
            (results.reduce((s, r) => s + r.timeUsedMs, 0) / results.length / 1000) * 10,
          ) / 10
        : 0;

    if (!perfSavedRef.current) {
      perfSavedRef.current = true;
      const avgMs =
        results.length > 0
          ? results.reduce((s, r) => s + r.timeUsedMs, 0) / results.length
          : 0;
      savePerformanceResult(EXERCISE_ID, correctCount, totalQ, avgMs);
    }
    const perfEntries = loadEntries(EXERCISE_ID);

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#fbfaf9] p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">Résultats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <ClassScoreBlock
              exerciseId={EXERCISE_ID}
              percent={pct}
              detail={`${correctCount}/${totalQ} correctes`}
            />

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-blue-50 p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {correctCount}/{totalQ}
                </p>
                <p className="text-sm text-blue-700">Correct</p>
              </div>
              <div className="rounded-lg bg-amber-50 p-4 text-center">
                <p className="text-2xl font-bold text-amber-600">{avgTime}s</p>
                <p className="text-sm text-amber-700">Temps moyen</p>
              </div>
            </div>

            {unanswered > 0 && (
              <p className="text-center text-sm text-[#605a57]">
                {unanswered} question{unanswered > 1 ? 's' : ''} sans reponse (temps ecoule)
              </p>
            )}

            {(() => {
              const byKind = new Map<AnglaisKind, { ok: number; n: number }>();
              questions.forEach((item, i) => {
                const rec = byKind.get(item.kind) ?? { ok: 0, n: 0 };
                rec.n += 1;
                if (results[i]?.isCorrect) rec.ok += 1;
                byKind.set(item.kind, rec);
              });
              const rows = [...byKind.entries()];
              if (rows.length < 2) return null;
              return (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-[#37322f]">Par type de question :</p>
                  <div className="space-y-1.5">
                    {rows.map(([kind, rec]) => (
                      <div key={kind} className="flex items-center justify-between text-sm">
                        <span className="text-[#605a57]">{ANGLAIS_KIND_LABELS[kind]}</span>
                        <span className="font-medium tabular-nums text-[#37322f]">
                          {rec.ok}/{rec.n}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            <div className="space-y-2">
              <p className="text-sm font-semibold text-[#37322f]">Detail par question :</p>
              <div className="max-h-[32rem] space-y-1.5 overflow-y-auto">
                {questions.map((q, i) => {
                  const r = results[i];
                  const sel = r?.selectedIndex ?? null;
                  return (
                    <div key={i} className="rounded bg-[#f7f5f3] px-3 py-2 text-sm">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-[#605a57]">Q{i + 1}</span>
                        <span
                          className={
                            r
                              ? r.isCorrect
                                ? 'font-semibold text-green-600'
                                : 'font-semibold text-red-600'
                              : 'text-slate-400'
                          }
                        >
                          {r ? (r.isCorrect ? '\u2713' : '\u2717') : '—'}{' '}
                          {sel !== null ? q.choices[sel] : 'Pas de reponse'}
                          {r && !r.isCorrect && (
                            <span className="ml-2 text-green-600">
                              ({q.choices[q.correct]})
                            </span>
                          )}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">{q.stem}</p>
                      <div className="mt-2 border-t border-black/5 pt-2 text-[#605a57]">
                        <ExplainBody text={explainAnglaisItem(q)} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {perfEntries.length >= 2 && (
              <div className="border-t pt-4">
                <p className="mb-2 text-center text-sm font-medium text-[#605a57]">Progression</p>
                <div className="flex justify-center">
                  <MiniPerformanceChart entries={perfEntries} exerciseId={EXERCISE_ID} />
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
  const timerPercent =
    originalTotalRef.current > 0 ? (timeLeft / originalTotalRef.current) * 100 : 100;
  const timerUrgent = timerPercent <= 20;
  const readingSiblings = currentQ?.passage
    ? questions.filter((item) => item.passage === currentQ.passage)
    : [];
  const readingPos = currentQ
    ? readingSiblings.findIndex((item) => item.stem === currentQ.stem) + 1
    : 0;

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: BG, color: NAVY }}>
      {/* Top bar: progress + shared countdown */}
      <div className="flex items-center justify-between px-4 py-3 sm:px-6">
        <Badge
          variant="outline"
          className="border-slate-400 bg-white/80 px-3 py-1 text-base font-semibold"
          style={{ color: NAVY }}
        >
          {currentIdx + 1} &rarr; {questions.length}
        </Badge>
        {settings.timeLimitSec > 0 && (
          <div
            className={`rounded-lg px-4 py-1.5 font-mono text-xl font-bold tabular-nums ${
              timerUrgent ? 'bg-red-100 text-red-700' : 'bg-white/90'
            }`}
            style={timerUrgent ? undefined : { color: NAVY }}
          >
            {formatTime(timeLeft)}
          </div>
        )}
      </div>

      {/* Timer progress strip */}
      {settings.timeLimitSec > 0 && (
        <div className="mx-4 h-1.5 overflow-hidden rounded-full bg-white/50 sm:mx-6">
          <div
            className={`h-full transition-all duration-100 ${
              timerUrgent ? 'bg-red-500' : 'bg-blue-600'
            }`}
            style={{ width: `${timerPercent}%` }}
          />
        </div>
      )}

      <div className="flex flex-1 flex-col items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-2xl space-y-6">
          {currentQ?.passage ? (
            <div className="space-y-2">
              <p className="text-center text-xs font-semibold tracking-wide opacity-50">
                Texte — question {readingPos}/{readingSiblings.length} (vous pouvez relire)
              </p>
              <div
                className="max-h-52 overflow-y-auto rounded-xl bg-white/90 p-4 text-left text-sm leading-relaxed shadow-sm sm:max-h-64 sm:text-base"
                style={{ color: NAVY }}
              >
                {currentQ.passage}
              </div>
            </div>
          ) : null}

          {/* Stem */}
          <p
            className="text-center text-lg font-semibold leading-relaxed sm:text-xl md:text-2xl"
            style={{ color: NAVY }}
          >
            {currentQ?.stem}
          </p>

          {/* Choices */}
          <div className="space-y-3">
            {currentQ?.choices.map((choice, i) => {
              const showFeedback = flashIdx !== null;
              const isRight = showFeedback && i === currentQ.correct;
              const isPickedWrong = showFeedback && i === flashIdx && flashCorrect === false;
              const flashClass = isRight
                ? 'border-green-600 bg-green-100'
                : isPickedWrong
                  ? 'border-red-600 bg-red-100'
                  : 'border-transparent bg-white hover:bg-[#f7f5f3] active:scale-[0.99]';
              return (
                <button
                  key={i}
                  type="button"
                  disabled={flashIdx !== null || showExplain}
                  onClick={() => answerQuestion(i)}
                  className={`w-full rounded-xl border-2 px-5 py-4 text-left text-base font-medium shadow-sm transition-all sm:text-lg ${flashClass}`}
                  style={{ color: NAVY }}
                >
                  <span className="mr-3 font-semibold opacity-50">{i + 1}.</span>
                  {choice}
                </button>
              );
            })}
          </div>

          {showExplain && currentQ ? (
            <div
              className={`rounded-xl border-2 p-4 shadow-sm ${
                flashCorrect ? 'border-green-600 bg-green-50' : 'border-red-600 bg-red-50'
              }`}
            >
              <p
                className={`mb-2 text-base font-bold ${
                  flashCorrect ? 'text-green-800' : 'text-red-800'
                }`}
              >
                {flashCorrect ? 'Correct' : 'Incorrect'} — {ANGLAIS_KIND_LABELS[currentQ.kind]}
              </p>
              {!flashCorrect && flashIdx !== null && (
                <p className="mb-2 text-sm">
                  Vous avez répondu : <strong>{currentQ.choices[flashIdx]}</strong>
                  <br />
                  Bonne réponse : <strong>{currentQ.choices[currentQ.correct]}</strong>
                </p>
              )}
              {flashCorrect && (
                <p className="mb-2 text-sm">
                  Bonne réponse : <strong>{currentQ.choices[currentQ.correct]}</strong>
                </p>
              )}
              <ExplainBody text={explainAnglaisItem(currentQ)} />
              <Button size="lg" className="mt-4 w-full" onClick={goNext}>
                {currentIdx + 1 >= questions.length ? 'Voir les résultats' : 'Question suivante'}
              </Button>
              <p className="mt-2 text-center text-xs opacity-60">Entrée pour continuer</p>
            </div>
          ) : (
            <p className="text-center text-xs opacity-50" style={{ color: NAVY }}>
              Touches 1–4 pour repondre rapidement
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

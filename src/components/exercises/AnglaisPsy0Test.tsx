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
import { ArrowLeft, Play, RotateCcw, Home, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';

// ============================================================================
// Types
// ============================================================================

type GameState = 'menu' | 'settings' | 'playing' | 'results';

interface GameSettings {
  totalQuestions: number;
  timeLimitSec: number;
  examMode: boolean;
}

interface McqItem {
  stem: string;
  choices: [string, string, string, string];
  correct: number;
}

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
  examMode: true,
};

const BG = '#d4d4d4';
const NAVY = '#0f2347';

/** Built-in bank (65 items) — grammar, vocab, false friends for AF cadet preselection */
const QUESTION_BANK: McqItem[] = [
  { stem: 'She is ___ engineer at Airbus.', choices: ['a', 'an', 'the', '—'], correct: 1 },
  { stem: 'I have lived in Paris ___ 2019.', choices: ['for', 'since', 'during', 'from'], correct: 1 },
  { stem: 'The meeting starts ___ 9 o\'clock.', choices: ['in', 'on', 'at', 'by'], correct: 2 },
  { stem: 'He ___ to London last week.', choices: ['goes', 'has gone', 'went', 'is going'], correct: 2 },
  { stem: 'We ___ dinner when the phone rang.', choices: ['had', 'were having', 'have had', 'are having'], correct: 1 },
  { stem: 'This is ___ interesting book.', choices: ['a', 'an', 'the', 'some'], correct: 1 },
  { stem: 'She speaks English ___ fluently.', choices: ['very', 'much', 'many', 'lot'], correct: 0 },
  { stem: 'I look forward ___ hearing from you.', choices: ['to', 'for', 'at', 'on'], correct: 0 },
  { stem: 'Neither Tom nor his brothers ___ ready.', choices: ['is', 'are', 'was', 'has been'], correct: 1 },
  { stem: 'If I ___ you, I would accept the offer.', choices: ['am', 'was', 'were', 'have been'], correct: 2 },
  { stem: 'The plane took ___ at 6 a.m.', choices: ['off', 'out', 'away', 'up'], correct: 0 },
  { stem: 'He is responsible ___ safety procedures.', choices: ['of', 'for', 'to', 'with'], correct: 1 },
  { stem: 'How ___ does this flight cost?', choices: ['many', 'much', 'long', 'often'], correct: 1 },
  { stem: 'She has ___ finished her training.', choices: ['yet', 'already', 'still', 'ever'], correct: 1 },
  { stem: 'The captain asked us to fasten our seat ___.', choices: ['belts', 'ropes', 'strings', 'bands'], correct: 0 },
  { stem: 'Choose the correct sentence:', choices: ['He don\'t like coffee.', 'He doesn\'t likes coffee.', 'He doesn\'t like coffee.', 'He not like coffee.'], correct: 2 },
  { stem: 'There isn\'t ___ milk left.', choices: ['some', 'any', 'no', 'many'], correct: 1 },
  { stem: 'The weather was bad, ___ we landed safely.', choices: ['so', 'but', 'because', 'although'], correct: 1 },
  { stem: 'I\'d rather ___ early than miss the briefing.', choices: ['to arrive', 'arrive', 'arriving', 'arrived'], correct: 1 },
  { stem: 'This runway is ___ than the previous one.', choices: ['long', 'longer', 'more long', 'longest'], correct: 1 },
  { stem: 'She works ___ a flight attendant.', choices: ['as', 'like', 'for', 'by'], correct: 0 },
  { stem: 'We need to submit the report ___ Friday.', choices: ['until', 'by', 'since', 'during'], correct: 1 },
  { stem: 'He is used ___ night shifts.', choices: ['to work', 'to working', 'work', 'working'], correct: 1 },
  { stem: 'The luggage ___ checked already.', choices: ['is', 'has been', 'was being', 'had'], correct: 1 },
  { stem: 'Could you tell me where ___?', choices: ['is the gate', 'the gate is', 'is gate', 'gate is'], correct: 1 },
  { stem: 'A "library" in English is a place for books, not a ___ .', choices: ['bookshop', 'reading room only', 'computer lab', 'archive only'], correct: 0 },
  { stem: '"Actually" in English often means:', choices: ['currently', 'in fact', 'soon', 'possibly'], correct: 1 },
  { stem: '"Eventually" means:', choices: ['possibly', 'in the end', 'immediately', 'rarely'], correct: 1 },
  { stem: 'The opposite of "departure" is:', choices: ['arrival', 'delay', 'landing', 'take-off'], correct: 0 },
  { stem: 'A "pilot" flies an aircraft; a "plot" is:', choices: ['a story plan', 'a type of engine', 'a runway mark', 'a weather chart'], correct: 0 },
  { stem: 'Fill in: "The flight attendant asked passengers to ___ their trays."', choices: ['rise', 'raise', 'arise', 'lift up'], correct: 1 },
  { stem: 'Which word is a false friend for French "librairie"?', choices: ['library', 'bookstore', 'librarian', 'ledger'], correct: 0 },
  { stem: 'He ___ his passport at home yesterday.', choices: ['forgets', 'forgot', 'has forgotten', 'was forgetting'], correct: 1 },
  { stem: 'The turbulence made some passengers feel ___.', choices: ['sick', 'illness', 'disease', 'injured'], correct: 0 },
  { stem: 'We must comply ___ international regulations.', choices: ['with', 'to', 'by', 'on'], correct: 0 },
  { stem: 'She is the ___ student in the class.', choices: ['more good', 'best', 'better', 'most good'], correct: 1 },
  { stem: 'I haven\'t seen him ___ ages.', choices: ['since', 'for', 'during', 'from'], correct: 1 },
  { stem: 'The crew performed the check ___ take-off.', choices: ['before', 'ago', 'since', 'during ago'], correct: 0 },
  { stem: 'Choose the correct preposition: "interested ___ aviation"', choices: ['on', 'in', 'at', 'for'], correct: 1 },
  { stem: 'Neither the captain ___ the co-pilot was late.', choices: ['or', 'nor', 'and', 'but'], correct: 1 },
  { stem: 'They ___ the new schedule yet.', choices: ['didn\'t receive', 'haven\'t received', 'don\'t receive', 'aren\'t receiving'], correct: 1 },
  { stem: 'This is the man ___ helped us at the counter.', choices: ['which', 'who', 'whom', 'whose'], correct: 1 },
  { stem: 'The announcement was hard to hear because of the ___.', choices: ['noise', 'noisy', 'noisily', 'noised'], correct: 0 },
  { stem: 'If the weather improves, we ___ on time.', choices: ['will depart', 'would depart', 'departed', 'had departed'], correct: 0 },
  { stem: 'She avoided ___ the confidential document.', choices: ['to lose', 'losing', 'lose', 'lost'], correct: 1 },
  { stem: 'The aircraft is ___ the clouds now.', choices: ['above', 'over', 'on', 'up'], correct: 0 },
  { stem: 'How long ___ you been training?', choices: ['do', 'did', 'have', 'are'], correct: 2 },
  { stem: 'He insisted ___ paying the bill.', choices: ['in', 'on', 'to', 'for'], correct: 1 },
  { stem: 'The runway was wet, so the landing was ___.', choices: ['smoothly', 'smooth', 'smoothing', 'smoothed'], correct: 1 },
  { stem: 'I\'m looking ___ my boarding pass.', choices: ['for', 'after', 'up', 'into'], correct: 0 },
  { stem: 'Choose the synonym of "rapid":', choices: ['slow', 'quick', 'late', 'heavy'], correct: 1 },
  { stem: 'The briefing will take place ___ the morning.', choices: ['on', 'in', 'at', 'by'], correct: 1 },
  { stem: 'She suggested ___ earlier.', choices: ['to leave', 'leaving', 'leave', 'left'], correct: 1 },
  { stem: 'There are ___ seats available.', choices: ['few', 'a little', 'much', 'little'], correct: 0 },
  { stem: 'He speaks French well; ___, his English is excellent.', choices: ['however', 'moreover', 'although', 'unless'], correct: 1 },
  { stem: 'The gate number has been ___.', choices: ['changed', 'change', 'changing', 'to change'], correct: 0 },
  { stem: 'We ran ___ fuel during the simulation.', choices: ['out of', 'away from', 'off', 'down'], correct: 0 },
  { stem: 'Which is correct?', choices: ['informations', 'an information', 'some information', 'many informations'], correct: 2 },
  { stem: 'The co-pilot is ___ than the captain.', choices: ['young', 'younger', 'more young', 'youngest'], correct: 1 },
  { stem: 'Passengers must remain seated ___ the seatbelt sign is off.', choices: ['until', 'during', 'while', 'unless'], correct: 0 },
  { stem: 'I\'d like ___ cup of tea, please.', choices: ['other', 'another', 'more', 'else'], correct: 1 },
  { stem: 'The flight was cancelled ___ bad weather.', choices: ['because', 'because of', 'due', 'thanks to'], correct: 1 },
  { stem: 'He denied ___ the procedure.', choices: ['to ignore', 'ignoring', 'ignore', 'ignored'], correct: 1 },
  { stem: 'A "brace" position is used ___ an emergency landing.', choices: ['in', 'for', 'during', 'at'], correct: 2 },
  { stem: '"Sensible" in English usually means:', choices: ['sensitive', 'reasonable', 'emotional', 'delicate'], correct: 1 },
  { stem: 'The altitude ___ steadily during the climb.', choices: ['rose', 'raised', 'risen', 'arose'], correct: 0 },
  { stem: 'She is capable ___ handling pressure.', choices: ['of', 'for', 'to', 'with'], correct: 0 },
  { stem: 'We\'d better ___ now or we\'ll be late.', choices: ['to go', 'go', 'going', 'went'], correct: 1 },
];

// ============================================================================
// Helpers
// ============================================================================

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
    /* ignore */
  }
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function pickQuestions(count: number): McqItem[] {
  return shuffle(QUESTION_BANK).slice(0, Math.min(count, QUESTION_BANK.length));
}

function formatTime(ms: number): string {
  const sec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
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
  const advancingRef = useRef(false);

  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const timerStartRef = useRef(0);
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
    const qs = pickQuestions(settingsRef.current.totalQuestions);
    setQuestions(qs);
    setCurrentIdx(0);
    setResults([]);
    setFlashIdx(null);
    setFlashCorrect(null);
    setGameState('playing');
    questionStartRef.current = Date.now();
    if (settingsRef.current.timeLimitSec > 0) {
      startTimer(settingsRef.current.timeLimitSec * 1000);
    }
  }, [scorer, startTimer]);

  const answerQuestion = useCallback(
    (choiceIdx: number) => {
      if (advancingRef.current || gameState !== 'playing') return;
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

      const goNext = () => {
        if (currentIdx + 1 >= questions.length) {
          finishGame();
        } else {
          setCurrentIdx((i) => i + 1);
          setFlashIdx(null);
          setFlashCorrect(null);
          questionStartRef.current = Date.now();
          advancingRef.current = false;
        }
      };

      if (settingsRef.current.examMode) {
        goNext();
      } else {
        setFlashIdx(choiceIdx);
        setFlashCorrect(isCorrect);
        setTimeout(goNext, isCorrect ? 280 : 650);
      }
    },
    [currentIdx, finishGame, gameState, questions, scorer],
  );

  useEffect(() => {
    if (timeLeft <= 0 && totalTime > 0 && gameState === 'playing') {
      finishGame();
    }
  }, [timeLeft, totalTime, gameState, finishGame]);

  useEffect(() => {
    if (gameState !== 'playing') return;
    const onKey = (e: KeyboardEvent) => {
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= 4) {
        e.preventDefault();
        answerQuestion(n - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [gameState, answerQuestion]);

  // ---- MENU ----
  if (gameState === 'menu') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Anglais Psy0 — Cadets Air France</CardTitle>
            <CardDescription>
              QCM de grammaire et vocabulaire — rythme type preselection
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
              <p>
                <strong>{settings.totalQuestions} questions</strong> a choix multiples (4
                reponses).
              </p>
              <p>Grammaire, vocabulaire, prepositions, temps verbaux, faux amis.</p>
              <p>Cliquez une reponse pour passer immediatement a la suivante.</p>
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
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xl font-bold text-slate-700">{settings.totalQuestions}</p>
                <p className="text-xs text-slate-500">Questions</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xl font-bold text-slate-700">4</p>
                <p className="text-xs text-slate-500">Choix</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xl font-bold text-slate-700">
                  {settings.timeLimitSec > 0
                    ? `${Math.floor(settings.timeLimitSec / 60)}m${settings.timeLimitSec % 60 ? String(settings.timeLimitSec % 60).padStart(2, '0') : ''}`
                    : '\u221E'}
                </p>
                <p className="text-xs text-slate-500">Temps</p>
              </div>
            </div>

            {settings.examMode && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-center text-sm text-amber-700">
                {'\u26A1'} Mode examen — pas de correction entre les questions
              </div>
            )}

            <div className="flex flex-col gap-3">
              <Button size="lg" className="w-full" onClick={startGame}>
                <Play className="mr-2 h-5 w-5" /> Commencer
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="w-full"
                onClick={() => setGameState('settings')}
              >
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
                  min={10}
                  max={30}
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
                  <p className="mt-0.5 text-xs text-slate-500">
                    Pas de correction entre les questions
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
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">Resultats</CardTitle>
            <Badge
              variant={pct >= 75 ? 'default' : pct >= 50 ? 'secondary' : 'destructive'}
              className="mt-2 px-4 py-1 text-lg"
            >
              {scoreData.grade}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-5xl font-bold text-slate-700">{pct}%</p>
              <p className="mt-1 text-slate-500">Bonnes reponses</p>
            </div>

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
              <p className="text-center text-sm text-slate-500">
                {unanswered} question{unanswered > 1 ? 's' : ''} sans reponse (temps ecoule)
              </p>
            )}

            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-700">Detail par question :</p>
              <div className="max-h-64 space-y-1.5 overflow-y-auto">
                {questions.map((q, i) => {
                  const r = results[i];
                  const sel = r?.selectedIndex ?? null;
                  return (
                    <div key={i} className="rounded bg-slate-50 px-3 py-2 text-sm">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-slate-500">Q{i + 1}</span>
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
                    </div>
                  );
                })}
              </div>
            </div>

            {perfEntries.length >= 2 && (
              <div className="border-t pt-4">
                <p className="mb-2 text-center text-sm font-medium text-slate-500">Progression</p>
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
  const timerPercent = totalTime > 0 ? (timeLeft / totalTime) * 100 : 100;
  const timerUrgent = timerPercent <= 20;

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
              const isFlash = flashIdx === i;
              const flashClass =
                isFlash && flashCorrect === true
                  ? 'border-green-500 bg-green-50'
                  : isFlash && flashCorrect === false
                    ? 'border-red-500 bg-red-50'
                    : 'border-transparent bg-white hover:bg-slate-50 active:scale-[0.99]';
              return (
                <button
                  key={i}
                  type="button"
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

          <p className="text-center text-xs opacity-50" style={{ color: NAVY }}>
            Touches 1–4 pour repondre rapidement
          </p>
        </div>
      </div>
    </div>
  );
}

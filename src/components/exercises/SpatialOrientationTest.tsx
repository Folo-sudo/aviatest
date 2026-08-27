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
import { ArrowLeft, Play, RotateCcw, Home, ChevronRight, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';

// ============================================================================
// Types
// ============================================================================

type GameState = 'menu' | 'settings' | 'playing' | 'results';
type Phase = 'prompt' | 'animating' | 'answering';
type Turn = 'left' | 'right';

interface GameSettings {
  numQuestions: number;
  timePerQuestionSec: number;
  examMode: boolean;
}

interface Point {
  x: number;
  y: number;
}

interface Segment {
  from: Point;
  to: Point;
  turn: Turn | null;
}

interface QuestionData {
  segments: Segment[];
  promptLetter: 'D' | 'G';
  leftCount: number;
  rightCount: number;
  correctAnswer: number;
}

interface QuestionResult {
  question: QuestionData;
  userAnswer: number | null;
  isCorrect: boolean;
  timeUsedMs: number;
  timedOut: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const SETTINGS_KEY = 'aviatest-spatial-orientation-settings';

const DEFAULT_SETTINGS: GameSettings = {
  numQuestions: 30,
  timePerQuestionSec: 15,
  examMode: false,
};

const BG = '#d4d4d4';
const NAVY = '#1a2b4a';
const TIMER_BLUE = '#37322f';
const TIMER_RED = '#dc2626';

const CANVAS_SIZE = 260;

const PROMPT_MS = 1100;
const SEGMENT_REVEAL_MS = 550;

// Turn deflection magnitude range (degrees). Kept away from 0 (straight,
// ambiguous) and 180 (U-turn, ambiguous chirality).
const MIN_TURN_DEG = 25;
const MAX_TURN_DEG = 155;

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

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/**
 * Heading is a free-form angle in degrees (not limited to the 4 cardinal
 * points). 0 = up (north). Positive headings rotate counter-clockwise on
 * screen (visually "to the left" when walking forward), negative headings
 * rotate clockwise ("to the right") — this matches the left/right turn
 * convention used below.
 */
function headingVector(headingDeg: number): [number, number] {
  const rad = (headingDeg * Math.PI) / 180;
  return [-Math.sin(rad), -Math.cos(rad)];
}

/**
 * Signed turn delta convention: delta in (0, 180] => left, delta in
 * (-180, 0) => right. Magnitude is randomized so turns aren't always 90°.
 */
function randomTurnDelta(): number {
  const magnitude = randFloat(MIN_TURN_DEG, MAX_TURN_DEG);
  const sign = Math.random() < 0.5 ? 1 : -1;
  return sign * magnitude;
}

function turnLabelFromDelta(delta: number): Turn {
  return delta > 0 ? 'left' : 'right';
}

function normalizePoints(points: Point[]): Point[] {
  const padding = 30;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);
  const scale = Math.min((CANVAS_SIZE - 2 * padding) / width, (CANVAS_SIZE - 2 * padding) / height, 1.6);
  const offsetX = (CANVAS_SIZE - width * scale) / 2 - minX * scale;
  const offsetY = (CANVAS_SIZE - height * scale) / 2 - minY * scale;
  return points.map((p) => ({ x: p.x * scale + offsetX, y: p.y * scale + offsetY }));
}

function generateQuestion(): QuestionData {
  const numSegments = randInt(5, 9);
  const unit = 22;
  let heading = randFloat(0, 360);
  let x = 0;
  let y = 0;
  const rawPoints: Point[] = [{ x, y }];
  const rawSegments: Segment[] = [];
  let leftCount = 0;
  let rightCount = 0;

  for (let i = 0; i < numSegments; i++) {
    let turn: Turn | null = null;
    if (i > 0) {
      const delta = randomTurnDelta();
      turn = turnLabelFromDelta(delta);
      if (turn === 'right') rightCount++;
      else leftCount++;
      heading += delta;
    }
    const length = randInt(2, 5) * unit;
    const [vx, vy] = headingVector(heading);
    const nx = x + vx * length;
    const ny = y + vy * length;
    rawSegments.push({ from: { x, y }, to: { x: nx, y: ny }, turn });
    rawPoints.push({ x: nx, y: ny });
    x = nx;
    y = ny;
  }

  const normPoints = normalizePoints(rawPoints);
  const segments: Segment[] = rawSegments.map((s, i) => ({
    from: normPoints[i],
    to: normPoints[i + 1],
    turn: s.turn,
  }));

  const promptLetter: 'D' | 'G' = Math.random() < 0.5 ? 'D' : 'G';
  const correctAnswer = promptLetter === 'D' ? rightCount : leftCount;

  return { segments, promptLetter, leftCount, rightCount, correctAnswer };
}

function generateQuestions(count: number): QuestionData[] {
  return Array.from({ length: count }, () => generateQuestion());
}

// ============================================================================
// SVG visuals
// ============================================================================

function PathCanvas({ segments, revealedCount }: { segments: Segment[]; revealedCount: number }) {
  return (
    <svg width={CANVAS_SIZE} height={CANVAS_SIZE} viewBox={`0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}`} className="mx-auto h-auto w-full max-w-[320px]">
      <rect x={0} y={0} width={CANVAS_SIZE} height={CANVAS_SIZE} rx={12} fill="#f4f4f5" />
      {segments.map((s, i) => {
        const isCurrent = i === revealedCount - 1;
        const isTrail = i === revealedCount - 2;
        if (!isCurrent && !isTrail) return null;
        return (
          <line
            key={i}
            x1={s.from.x}
            y1={s.from.y}
            x2={s.to.x}
            y2={s.to.y}
            stroke={isCurrent ? NAVY : '#94a3b8'}
            strokeWidth={isCurrent ? 5 : 3}
            strokeLinecap="round"
            opacity={isCurrent ? 1 : 0.5}
          />
        );
      })}
      {revealedCount > 0 && revealedCount <= segments.length && (
        <circle cx={segments[revealedCount - 1].to.x} cy={segments[revealedCount - 1].to.y} r={5} fill={TIMER_RED} />
      )}
    </svg>
  );
}

function PathFullView({ segments }: { segments: Segment[] }) {
  return (
    <svg width={CANVAS_SIZE} height={CANVAS_SIZE} viewBox={`0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}`} className="mx-auto h-auto w-full max-w-[320px]">
      <rect x={0} y={0} width={CANVAS_SIZE} height={CANVAS_SIZE} rx={12} fill="#f4f4f5" />
      {segments.map((s, i) => (
        <line key={i} x1={s.from.x} y1={s.from.y} x2={s.to.x} y2={s.to.y} stroke={NAVY} strokeWidth={3} strokeLinecap="round" />
      ))}
      {segments.map(
        (s, i) =>
          s.turn && (
            <circle key={`v-${i}`} cx={s.from.x} cy={s.from.y} r={7} fill={s.turn === 'right' ? TIMER_BLUE : '#f59e0b'} />
          ),
      )}
      <circle cx={segments[0].from.x} cy={segments[0].from.y} r={5} fill="#16a34a" />
      <circle cx={segments[segments.length - 1].to.x} cy={segments[segments.length - 1].to.y} r={5} fill={TIMER_RED} />
    </svg>
  );
}

// ============================================================================
// Component
// ============================================================================

export default function SpatialOrientationTest() {
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
  const [phase, setPhase] = useState<Phase>('prompt');
  const [revealedCount, setRevealedCount] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [showCorrection, setShowCorrection] = useState(false);

  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionStartRef = useRef(0);
  const perfSavedRef = useRef(false);

  const currentIdxRef = useRef(0);
  const questionsRef = useRef<QuestionData[]>([]);
  const lockedRef = useRef(false);
  const sequenceRef = useRef(0);
  const scheduledRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const userInputRef = useRef('');

  currentIdxRef.current = currentIdx;
  questionsRef.current = questions;
  userInputRef.current = userInput;

  const clearScheduled = useCallback(() => {
    scheduledRef.current.forEach((id) => clearTimeout(id));
    scheduledRef.current = [];
  }, []);

  const schedule = useCallback((fn: () => void, delay: number) => {
    const id = setTimeout(fn, delay);
    scheduledRef.current.push(id);
    return id;
  }, []);

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

  useEffect(
    () => () => {
      clearTimer();
      clearScheduled();
    },
    [clearTimer, clearScheduled],
  );

  const revealNext = useCallback(
    (seq: number, count: number) => {
      const q = questionsRef.current[currentIdxRef.current];
      if (!q) return;
      setRevealedCount(count + 1);
      if (count + 1 >= q.segments.length) {
        schedule(() => {
          if (sequenceRef.current !== seq) return;
          setPhase('answering');
        }, 350);
        return;
      }
      schedule(() => {
        if (sequenceRef.current !== seq) return;
        revealNext(seq, count + 1);
      }, SEGMENT_REVEAL_MS);
    },
    [schedule],
  );

  const startQuestion = useCallback(
    (idx: number) => {
      clearScheduled();
      sequenceRef.current += 1;
      const seq = sequenceRef.current;
      currentIdxRef.current = idx;
      setPhase('prompt');
      setRevealedCount(0);
      setUserInput('');
      userInputRef.current = '';
      lockedRef.current = false;
      startTimer(settingsRef.current.timePerQuestionSec * 1000);

      schedule(() => {
        if (sequenceRef.current !== seq) return;
        setPhase('animating');
        revealNext(seq, 0);
      }, PROMPT_MS);
    },
    [clearScheduled, schedule, startTimer, revealNext],
  );

  const goToNext = useCallback(() => {
    const idx = currentIdxRef.current;
    const qs = questionsRef.current;
    if (idx + 1 >= qs.length) {
      clearTimer();
      clearScheduled();
      setShowCorrection(false);
      setGameState('results');
      return;
    }
    const nextIdx = idx + 1;
    setCurrentIdx(nextIdx);
    setShowCorrection(false);
    startQuestion(nextIdx);
  }, [clearTimer, clearScheduled, startQuestion]);

  const submitAnswer = useCallback(
    (timedOut: boolean) => {
      if (lockedRef.current) return;
      lockedRef.current = true;
      clearTimer();
      clearScheduled();

      const timeUsed = Date.now() - questionStartRef.current;
      const q = questionsRef.current[currentIdxRef.current];
      const typed = userInputRef.current.trim();
      const val = typed !== '' ? parseInt(typed, 10) : null;
      const isCorrect = val !== null && !isNaN(val) && val === q.correctAnswer;

      scorer.recordAnswer(isCorrect);
      setResults((prev) => [
        ...prev,
        { question: q, userAnswer: val !== null && !isNaN(val) ? val : null, isCorrect, timeUsedMs: timeUsed, timedOut },
      ]);

      if (settingsRef.current.examMode) {
        goToNext();
      } else {
        setPhase('answering');
        setRevealedCount(q.segments.length);
        setShowCorrection(true);
      }
    },
    [clearTimer, clearScheduled, goToNext, scorer],
  );

  // Timer expiry -> auto-submit
  useEffect(() => {
    if (gameState !== 'playing' || lockedRef.current) return;
    if (totalTime > 0 && timeLeft <= 0) {
      submitAnswer(true);
    }
  }, [timeLeft, totalTime, gameState, submitAnswer]);

  const startGame = useCallback(() => {
    scorer.reset();
    perfSavedRef.current = false;
    const qs = generateQuestions(settingsRef.current.numQuestions);
    setQuestions(qs);
    questionsRef.current = qs;
    setCurrentIdx(0);
    setResults([]);
    setShowCorrection(false);
    setGameState('playing');
    startQuestion(0);
  }, [scorer, startQuestion]);

  // =========================================================================
  // MENU
  // =========================================================================
  if (gameState === 'menu') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#fbfaf9] p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">Orientation spatiale</CardTitle>
            <CardDescription className="mt-2 text-base">
              Comptez les virages dans la direction indiquee en debut de question
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2 rounded-lg bg-[#f7f5f3] p-4 text-sm text-[#605a57]">
              <p>
                <strong>{settings.numQuestions} questions</strong> a resoudre.
              </p>
              <p>
                Une lettre rouge <strong>D</strong> (droite) ou <strong>G</strong> (gauche) s&apos;affiche brievement :
                retenez-la !
              </p>
              <p>
                Un trajet se dessine ensuite <strong>segment par segment</strong> — le trace complet n&apos;est jamais
                visible en entier.
              </p>
              <p>
                A la fin, indiquez le <strong>nombre de virages</strong> effectues dans la direction annoncee.
              </p>
              <p>
                <strong>{settings.timePerQuestionSec}s</strong> par question.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-[#f7f5f3] p-3">
                <p className="text-xl font-bold text-[#37322f]">{settings.numQuestions}</p>
                <p className="text-xs text-[#605a57]">Questions</p>
              </div>
              <div className="rounded-lg bg-[#f7f5f3] p-3">
                <p className="text-xl font-bold text-red-600">D / G</p>
                <p className="text-xs text-[#605a57]">Direction</p>
              </div>
              <div className="rounded-lg bg-[#f7f5f3] p-3">
                <p className="text-xl font-bold text-[#37322f]">{settings.timePerQuestionSec}s</p>
                <p className="text-xs text-[#605a57]">Par question</p>
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
              <Button variant="outline" size="lg" className="w-full" onClick={() => setGameState('settings')}>
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

  // =========================================================================
  // SETTINGS
  // =========================================================================
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
                <Label>Nombre de questions : {settings.numQuestions}</Label>
                <Slider
                  value={[settings.numQuestions]}
                  onValueChange={([v]) => setSettings((s) => ({ ...s, numQuestions: v }))}
                  min={5}
                  max={40}
                  step={1}
                  className="mt-2"
                />
              </div>
              <div>
                <Label>Temps par question : {settings.timePerQuestionSec}s</Label>
                <Slider
                  value={[settings.timePerQuestionSec]}
                  onValueChange={([v]) => setSettings((s) => ({ ...s, timePerQuestionSec: v }))}
                  min={8}
                  max={30}
                  step={1}
                  className="mt-2"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Mode examen</Label>
                  <p className="mt-0.5 text-xs text-[#605a57]">Pas de correction entre les questions. Les résultats s’affichent à la fin.</p>
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
    const scoreData = scorer.toJSON();
    const totalCorrect = results.filter((r) => r.isCorrect).length;
    const avgTime =
      results.length > 0
        ? Math.round((results.reduce((s, r) => s + r.timeUsedMs, 0) / results.length / 1000) * 10) / 10
        : 0;

    if (!perfSavedRef.current) {
      perfSavedRef.current = true;
      const avgMs = results.length > 0 ? results.reduce((s, r) => s + r.timeUsedMs, 0) / results.length : 0;
      savePerformanceResult('spatial-orientation', scoreData.correct, questions.length, avgMs);
    }

    const perfEntries = loadEntries('spatial-orientation');

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#fbfaf9] p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">Résultats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <ClassScoreBlock
              exerciseId={'spatial-orientation'}
              percent={scoreData.score}
              detail={`${totalCorrect}/${results.length} correctes`}
            />

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-blue-50 p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {totalCorrect}/{results.length}
                </p>
                <p className="text-sm text-blue-700">Correct</p>
              </div>
              <div className="rounded-lg bg-amber-50 p-4 text-center">
                <p className="text-2xl font-bold text-amber-600">{avgTime}s</p>
                <p className="text-sm text-amber-700">Temps moyen</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-[#37322f]">Detail par question :</p>
              <div className="max-h-64 space-y-1.5 overflow-y-auto">
                {results.map((r, i) => (
                  <div key={i} className="rounded bg-[#f7f5f3] px-3 py-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-[#605a57]">
                        Q{i + 1} ({r.question.promptLetter})
                      </span>
                      <span className={r.isCorrect ? 'font-semibold text-green-600' : 'font-semibold text-red-600'}>
                        {r.isCorrect ? '\u2713' : '\u2717'} {r.userAnswer !== null ? r.userAnswer : 'Pas de reponse'}
                        {!r.isCorrect && <span className="ml-2 text-green-600">({r.question.correctAnswer})</span>}
                        {r.timedOut && <span className="ml-2 text-slate-400">(temps ecoule)</span>}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {perfEntries.length >= 2 && (
              <div className="border-t pt-4">
                <p className="mb-2 text-center text-sm font-medium text-[#605a57]">Progression</p>
                <div className="flex justify-center">
                  <MiniPerformanceChart entries={perfEntries} exerciseId="spatial-orientation" />
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
  const lastResult = results[results.length - 1];

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: BG, color: NAVY }}>
      <div className="relative mx-auto flex w-full max-w-xl flex-1 flex-col px-4 py-6">
        <div
          className="absolute bottom-6 right-2 top-6 flex w-3 flex-col overflow-hidden rounded-full"
          style={{ backgroundColor: '#bbb' }}
        >
          <div
            className="w-full transition-all duration-100"
            style={{ height: `${timerPercent}%`, backgroundColor: timerFillColor }}
          />
          <div className="flex-1" />
        </div>

        <div className="mb-4 flex items-center justify-between pr-8">
          <Badge variant="outline" className="bg-white px-3 py-1 text-base">
            {currentIdx + 1} &rarr; {settings.numQuestions}
          </Badge>
          {phase !== 'prompt' && !showCorrection && (
            <Badge variant="secondary" className="text-xs">
              Comptez les virages
            </Badge>
          )}
        </div>

        <Card className="mr-6 py-8">
          <CardContent className="flex flex-col items-center space-y-6">
            {phase === 'prompt' && currentQ && (
              <div className="flex h-64 w-full items-center justify-center">
                <p className="text-9xl font-black text-red-600">{currentQ.promptLetter}</p>
              </div>
            )}

            {phase === 'animating' && currentQ && <PathCanvas segments={currentQ.segments} revealedCount={revealedCount} />}

            {phase === 'answering' && currentQ && !showCorrection && (
              <>
                <div className="flex h-64 w-full items-center justify-center rounded-xl bg-slate-100">
                  <p className="text-sm text-slate-400">Combien de virages a {currentQ.promptLetter === 'D' ? 'droite' : 'gauche'} ?</p>
                </div>
                <div className="mx-auto flex w-full max-w-xs items-center justify-center gap-3">
                  <input
                    type="number"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && userInput.trim() !== '') submitAnswer(false);
                    }}
                    autoFocus
                    placeholder="?"
                    className="flex-1 rounded-lg border-2 border-slate-300 py-3 text-center text-2xl font-bold focus:border-amber-500 focus:outline-none"
                  />
                  <Button size="lg" onClick={() => submitAnswer(false)} disabled={userInput.trim() === ''}>
                    Valider
                  </Button>
                </div>
              </>
            )}

            {showCorrection && currentQ && lastResult && (
              <>
                <PathFullView segments={currentQ.segments} />
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: TIMER_BLUE }} />
                    Virage a droite ({currentQ.rightCount})
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-3 w-3 rounded-full bg-amber-500" />
                    Virage a gauche ({currentQ.leftCount})
                  </span>
                </div>
                <div className="text-center">
                  {lastResult.isCorrect ? (
                    <p className="text-3xl font-bold text-green-600">{'\u2713'} Correct !</p>
                  ) : (
                    <>
                      <p className="text-3xl font-bold text-red-600">
                        {'\u2717'} {lastResult.userAnswer ?? 'Pas de reponse'}
                      </p>
                      <p className="text-xl text-green-600">
                        Reponse ({currentQ.promptLetter === 'D' ? 'droite' : 'gauche'}) : {currentQ.correctAnswer}
                      </p>
                    </>
                  )}
                </div>
                <Button size="lg" onClick={goToNext}>
                  {currentIdx + 1 >= questions.length ? 'Voir les resultats' : 'Suivant'}
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

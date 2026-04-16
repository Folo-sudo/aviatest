'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { savePerformanceResult, loadEntries } from '@/lib/core/PerformanceTracker';
import { MiniPerformanceChart } from '@/components/PerformanceChart';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Play, Settings, RotateCcw, Home, Eye, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';

// ============================================================================
// Types
// ============================================================================

type GameState = 'menu' | 'settings' | 'playing' | 'results' | 'review';

interface WatchData {
  clockUpAngle: 0 | 90 | 180 | 270;
  isReversed: boolean;
  displayedAngle: number;   // value shown inside the watch (can be negative)
  isCorrect: boolean;       // whether checking this watch is the right answer
}

interface Question {
  // Reference angle visual (two segments from vertex, like Quadrilogie Level 1)
  refODx: number; refODy: number;  // O endpoint relative to vertex
  refADx: number; refADy: number;  // A endpoint relative to vertex
  refAngle: number;                // geometric angle value (multiple of 5, 10-355)
  watches: WatchData[];            // 8 watches
}

interface GameSettings {
  numQuestions: number;      // default 30
  totalDurationSec: number;  // default 360 (6 min)
}

// ============================================================================
// Settings persistence
// ============================================================================

const DEFAULT_SETTINGS: GameSettings = { numQuestions: 30, totalDurationSec: 360 };
const SETTINGS_KEY = 'aviatest-angles-montres-settings';
const EXERCISE_ID = 'angles-montres';

function loadSettings(): GameSettings {
  if (typeof window === 'undefined') return { ...DEFAULT_SETTINGS };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch { return { ...DEFAULT_SETTINGS }; }
}

function saveSettingsLocal(s: GameSettings): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

// ============================================================================
// Angle math (reused from Quadrilogie)
// ============================================================================

function randomClockConfig(): { clockUpAngle: 0 | 90 | 180 | 270; isReversed: boolean } {
  const positions: Array<0 | 90 | 180 | 270> = [0, 90, 180, 270];
  return { clockUpAngle: positions[Math.floor(Math.random() * 4)], isReversed: Math.random() < 0.5 };
}

/** Pick a random angle that is a multiple of 5 in [10, 355]. */
function pickAngle5(): number {
  // Multiples of 5 from 10 to 355: (355-10)/5 + 1 = 70 values
  return 10 + Math.floor(Math.random() * 70) * 5;
}

/** Compute angle from O-direction to A-direction in a given clock system.
 *  Returns value in [0, 360). */
function angleInClock(
  oDx: number, oDy: number, aDx: number, aDy: number,
  clockUpAngle: number, isReversed: boolean
): number {
  const oMath = Math.atan2(-oDy, oDx) * 180 / Math.PI;
  const aMath = Math.atan2(-aDy, aDx) * 180 / Math.PI;
  const toClk = (m: number) => {
    let a = isReversed ? (m - clockUpAngle) % 360 : (clockUpAngle - m) % 360;
    if (a < 0) a += 360;
    return a;
  };
  let diff = (toClk(aMath) - toClk(oMath)) % 360;
  if (diff < 0) diff += 360;
  return diff;
}

// ============================================================================
// Question generation
// ============================================================================

function generateQuestion(): Question {
  const refAngle = pickAngle5();

  // Generate reference visual: two segments from (0,0)
  const oClockAngle = Math.floor(Math.random() * 72) * 5;  // 0-355 step 5
  const aClockAngle = (oClockAngle + refAngle) % 360;
  // Use a "neutral" clock (12 at top, standard) for the visual layout
  const oMath = (90 - oClockAngle) % 360;
  const aMath = (90 - aClockAngle) % 360;
  const len1 = 55 + Math.random() * 20;
  const len2 = 55 + Math.random() * 20;
  const refODx = len1 * Math.cos(oMath * Math.PI / 180);
  const refODy = -len1 * Math.sin(oMath * Math.PI / 180);
  const refADx = len2 * Math.cos(aMath * Math.PI / 180);
  const refADy = -len2 * Math.sin(aMath * Math.PI / 180);

  // Decide how many correct watches (weighted: 1-4 common, 5+ rare)
  const weights = [0, 15, 25, 25, 20, 10, 3, 1, 1]; // index = num correct
  const totalW = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * totalW;
  let numCorrect = 1;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) { numCorrect = Math.max(1, i); break; }
  }

  // Generate 8 watches
  const watches: WatchData[] = [];
  const correctIndices = new Set<number>();
  while (correctIndices.size < numCorrect) {
    correctIndices.add(Math.floor(Math.random() * 8));
  }

  for (let i = 0; i < 8; i++) {
    const { clockUpAngle, isReversed } = randomClockConfig();
    const theta = angleInClock(refODx, refODy, refADx, refADy, clockUpAngle, isReversed);
    const isCorrect = correctIndices.has(i);

    let displayedAngle: number;
    if (isCorrect) {
      // Show either theta or theta-360 (negative form)
      const roundedTheta = Math.round(theta / 5) * 5;
      const t = roundedTheta === 0 || roundedTheta === 360 ? refAngle : roundedTheta;
      displayedAngle = Math.random() < 0.5 ? t : t - 360;
      if (displayedAngle === 0) displayedAngle = 360;
    } else {
      // Generate a plausible wrong value
      displayedAngle = generateWrongAngle(theta);
    }

    watches.push({ clockUpAngle, isReversed, displayedAngle, isCorrect });
  }

  return { refODx, refODy, refADx, refADy, refAngle, watches };
}

function generateWrongAngle(theta: number): number {
  const strategies = [
    () => { // Swap O and A direction (360 - theta)
      const v = Math.round((360 - theta) / 5) * 5;
      return v === 0 ? 360 : v;
    },
    () => { // Random offset ±15 to ±45
      const offset = (Math.floor(Math.random() * 7) + 3) * 5 * (Math.random() < 0.5 ? 1 : -1);
      let v = Math.round(theta / 5) * 5 + offset;
      if (v <= 0) v += 360;
      if (v > 360) v -= 360;
      return v;
    },
    () => pickAngle5(), // Completely random
    () => { // Negative form of a wrong value
      const v = pickAngle5();
      return v - 360;
    },
  ];

  const rounded = Math.round(theta / 5) * 5;
  const negForm = rounded === 0 ? -360 : rounded - 360;

  let result: number;
  let attempts = 0;
  do {
    const fn = strategies[Math.floor(Math.random() * strategies.length)];
    result = fn();
    attempts++;
  } while (attempts < 20 && (result === rounded || result === negForm ||
    result === 0 || result === 5 || result === -5));

  // 50% chance to show as negative
  if (result > 0 && Math.random() < 0.4) result = result - 360;

  return result;
}

function generateAllQuestions(numQuestions: number): Question[] {
  return Array.from({ length: numQuestions }, () => generateQuestion());
}

// ============================================================================
// Class thresholds (from EPLtest histogram: 7%, 24%, 44%, 60%, 75%, 85%, 92%, 96%)
// ============================================================================

function scoreToClass(percent: number): number {
  if (percent >= 96) return 9;
  if (percent >= 92) return 8;
  if (percent >= 85) return 7;
  if (percent >= 75) return 6;
  if (percent >= 60) return 5;
  if (percent >= 44) return 4;
  if (percent >= 24) return 3;
  if (percent >= 7) return 2;
  return 1;
}

// ============================================================================
// Main component
// ============================================================================

export function AnglesMontresTest() {
  const router = useRouter();
  const perfSavedRef = useRef(false);

  const [gameState, setGameState] = useState<GameState>('menu');
  const [settingsState, setSettingsState] = useState<GameSettings>(DEFAULT_SETTINGS);

  useEffect(() => { setSettingsState(loadSettings()); }, []);
  const setSettings = useCallback((s: GameSettings | ((p: GameSettings) => GameSettings)) => {
    setSettingsState(prev => {
      const next = typeof s === 'function' ? s(prev) : s;
      saveSettingsLocal(next);
      return next;
    });
  }, []);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [checked, setChecked] = useState<Record<number, Set<number>>>({});
  const [remainingSec, setRemainingSec] = useState(360);
  const [reviewIdx, setReviewIdx] = useState(0);

  const totalQuestions = questions.length;

  const startPlaying = useCallback(() => {
    perfSavedRef.current = false;
    const qs = generateAllQuestions(settingsState.numQuestions);
    setQuestions(qs);
    setChecked({});
    setCurrentIdx(0);
    setRemainingSec(settingsState.totalDurationSec);
    setGameState('playing');
  }, [settingsState]);

  const toggleWatch = useCallback((qIdx: number, wIdx: number) => {
    setChecked(prev => {
      const next = { ...prev };
      const s = new Set(prev[qIdx] || []);
      if (s.has(wIdx)) s.delete(wIdx); else s.add(wIdx);
      next[qIdx] = s;
      return next;
    });
  }, []);

  const validateAndNext = useCallback(() => {
    if (currentIdx < totalQuestions - 1) {
      setCurrentIdx(i => i + 1);
    } else {
      setGameState('results');
    }
  }, [currentIdx, totalQuestions]);

  // Timer
  useEffect(() => {
    if (gameState !== 'playing') return;
    const iv = setInterval(() => {
      setRemainingSec(prev => {
        if (prev <= 1) { setGameState('results'); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [gameState]);

  // Compute score
  const computeScore = useCallback(() => {
    let correct = 0;
    questions.forEach((q, i) => {
      const userSet = checked[i] || new Set();
      const correctSet = new Set(q.watches.map((w, j) => w.isCorrect ? j : -1).filter(j => j >= 0));
      if (userSet.size === correctSet.size && [...correctSet].every(j => userSet.has(j))) correct++;
    });
    return { correct, total: questions.length };
  }, [questions, checked]);

  useEffect(() => {
    if (gameState !== 'results' || perfSavedRef.current) return;
    perfSavedRef.current = true;
    const { correct, total } = computeScore();
    savePerformanceResult(EXERCISE_ID, correct, total);
  }, [gameState, computeScore]);

  // Routing
  if (gameState === 'menu') {
    return <MenuScreen settings={settingsState} onPlay={startPlaying} onSettings={() => setGameState('settings')} onBack={() => router.push('/')} />;
  }
  if (gameState === 'settings') {
    return <SettingsScreen settings={settingsState} onChange={setSettings} onBack={() => setGameState('menu')} />;
  }
  if (gameState === 'results') {
    return <ResultsScreen computeScore={computeScore}
      onReplay={startPlaying} onMenu={() => setGameState('menu')} onHome={() => router.push('/')}
      onReview={() => { setReviewIdx(0); setGameState('review'); }} />;
  }
  if (gameState === 'review') {
    return <ReviewScreen questions={questions} checked={checked} reviewIdx={reviewIdx}
      onPrev={() => setReviewIdx(i => Math.max(0, i - 1))}
      onNext={() => setReviewIdx(i => Math.min(questions.length - 1, i + 1))}
      onBack={() => setGameState('results')} />;
  }

  // Playing
  const q = questions[currentIdx];
  if (!q) return null;
  const userChecked = checked[currentIdx] || new Set<number>();

  return (
    <PlayingScreen question={q} questionIdx={currentIdx} totalQuestions={totalQuestions}
      remainingSec={remainingSec} totalDurationSec={settingsState.totalDurationSec}
      userChecked={userChecked}
      onToggle={(wIdx) => toggleWatch(currentIdx, wIdx)}
      onValidate={validateAndNext} />
  );
}

// ============================================================================
// Menu + Settings screens
// ============================================================================

function MenuScreen({ settings, onPlay, onSettings, onBack }: {
  settings: GameSettings; onPlay: () => void; onSettings: () => void; onBack: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">Angles &ndash; Montres</CardTitle>
          <CardDescription className="text-lg">Cochez les montres affichant le bon angle</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-2xl font-bold text-slate-700">{settings.numQuestions}</p>
              <p className="text-sm text-slate-500">Questions</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-2xl font-bold text-slate-700">{Math.floor(settings.totalDurationSec / 60)}:{(settings.totalDurationSec % 60).toString().padStart(2, '0')}</p>
              <p className="text-sm text-slate-500">Temps total</p>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <Button size="lg" className="w-full" onClick={onPlay}><Play className="mr-2 h-5 w-5" /> Jouer</Button>
            <Button variant="outline" size="lg" className="w-full" onClick={onSettings}><Settings className="mr-2 h-5 w-5" /> Parametres</Button>
            <Button variant="ghost" size="lg" className="w-full" onClick={onBack}><ArrowLeft className="mr-2 h-5 w-5" /> Retour</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SettingsScreen({ settings, onChange, onBack }: {
  settings: GameSettings; onChange: (s: GameSettings) => void; onBack: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader><CardTitle>Parametres</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label>Nombre de questions: {settings.numQuestions}</Label>
              <Slider value={[settings.numQuestions]} onValueChange={([v]) => onChange({ ...settings, numQuestions: v })} min={10} max={50} step={5} className="mt-2" />
            </div>
            <div>
              <Label>Duree totale: {Math.floor(settings.totalDurationSec / 60)}:{(settings.totalDurationSec % 60).toString().padStart(2, '0')}</Label>
              <Slider value={[settings.totalDurationSec]} onValueChange={([v]) => onChange({ ...settings, totalDurationSec: v })} min={120} max={1200} step={30} className="mt-2" />
            </div>
          </div>
          <Button variant="outline" className="w-full" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" /> Retour</Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Playing screen
// ============================================================================

function formatMMSS(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
}

function PlayingScreen({ question, questionIdx, totalQuestions, remainingSec, totalDurationSec, userChecked, onToggle, onValidate }: {
  question: Question; questionIdx: number; totalQuestions: number;
  remainingSec: number; totalDurationSec: number;
  userChecked: Set<number>;
  onToggle: (wIdx: number) => void;
  onValidate: () => void;
}) {
  // Timer bar progress
  const progress = Math.max(0, Math.min(1, remainingSec / totalDurationSec));
  const timerColor = progress > 0.5 ? 'bg-green-500' : progress > 0.2 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="flex min-h-screen bg-white">
      {/* Vertical timer bar */}
      <div className="w-6 m-4 bg-gray-800 rounded-lg relative overflow-hidden flex-shrink-0">
        <div className={`absolute bottom-0 left-0 right-0 ${timerColor} transition-all duration-1000`} style={{ height: `${progress * 100}%` }} />
      </div>

      <div className="flex-1 flex flex-col p-4">
        {/* Top: reference angle (left) */}
        <div className="flex items-start gap-8 mb-6">
          <ReferenceAngle oDx={question.refODx} oDy={question.refODy} aDx={question.refADx} aDy={question.refADy} />
        </div>

        {/* Watches grid: row1=2, row2=3, row3=3 */}
        <div className="flex-1 flex flex-col items-center gap-4">
          <div className="flex gap-6 justify-center">
            {question.watches.slice(0, 2).map((w, i) => (
              <WatchCard key={i} watch={w} checked={userChecked.has(i)} onToggle={() => onToggle(i)} />
            ))}
          </div>
          <div className="flex gap-6 justify-center">
            {question.watches.slice(2, 5).map((w, i) => (
              <WatchCard key={i + 2} watch={w} checked={userChecked.has(i + 2)} onToggle={() => onToggle(i + 2)} />
            ))}
          </div>
          <div className="flex gap-6 justify-center">
            {question.watches.slice(5, 8).map((w, i) => (
              <WatchCard key={i + 5} watch={w} checked={userChecked.has(i + 5)} onToggle={() => onToggle(i + 5)} />
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex items-center justify-between border-t border-red-500 pt-2 mt-4">
          <div className="flex items-center gap-3 text-sm text-slate-700">
            <span>{questionIdx + 1} / {totalQuestions}</span>
            <span>{formatMMSS(remainingSec)}</span>
          </div>
          <button type="button" onClick={onValidate}
            className="bg-sky-500 hover:bg-sky-600 text-white text-sm px-4 py-2 rounded flex items-center gap-1">
            <Check className="h-4 w-4" /> Valider
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Reference angle (SVG, top-left)
// ============================================================================

function ReferenceAngle({ oDx, oDy, aDx, aDy }: { oDx: number; oDy: number; aDx: number; aDy: number }) {
  const cx = 80, cy = 80;
  return (
    <svg width={160} height={160} className="flex-shrink-0">
      {/* Two segments from vertex */}
      <line x1={cx + oDx} y1={cy + oDy} x2={cx} y2={cy} stroke="black" strokeWidth={1.8} />
      <line x1={cx} y1={cy} x2={cx + aDx} y2={cy + aDy} stroke="black" strokeWidth={1.8} />
      {/* Labels O and A */}
      <text x={cx + oDx * 1.15} y={cy + oDy * 1.15} textAnchor="middle" dominantBaseline="middle" fontSize={13} fontWeight="bold">O</text>
      <text x={cx + aDx * 1.15} y={cy + aDy * 1.15} textAnchor="middle" dominantBaseline="middle" fontSize={13} fontWeight="bold">A</text>
    </svg>
  );
}

// ============================================================================
// Watch card (clock + angle + checkbox)
// ============================================================================

function WatchCard({ watch, checked, onToggle, reviewMode, isUserCorrect }: {
  watch: WatchData; checked: boolean; onToggle?: () => void;
  reviewMode?: boolean; isUserCorrect?: boolean;
}) {
  const r = 42;
  const cx = 50, cy = 50;

  // Clock number positions
  const sign = watch.isReversed ? +1 : -1;
  const labels: Array<{ text: string; offsetClock: number }> = [
    { text: '12', offsetClock: 0 }, { text: '3', offsetClock: 90 },
    { text: '6', offsetClock: 180 }, { text: '9', offsetClock: 270 },
  ];

  const borderColor = reviewMode
    ? (isUserCorrect === true ? 'border-green-500' : isUserCorrect === false ? 'border-red-500' : 'border-slate-300')
    : (checked ? 'border-sky-500' : 'border-slate-300');
  const bgColor = reviewMode
    ? (isUserCorrect === true ? 'bg-green-50' : isUserCorrect === false ? 'bg-red-50' : 'bg-white')
    : 'bg-white';

  return (
    <div className={`flex items-center gap-1 ${reviewMode ? '' : 'cursor-pointer'}`}
      onClick={!reviewMode ? onToggle : undefined}>
      {/* Checkbox */}
      <div className={`w-5 h-5 border-2 rounded flex items-center justify-center flex-shrink-0 ${
        checked ? 'bg-sky-500 border-sky-500' : 'border-slate-400'
      } ${reviewMode && watch.isCorrect && !checked ? 'border-green-500 bg-green-100' : ''}`}>
        {checked && <Check className="h-3 w-3 text-white" />}
      </div>

      {/* Clock */}
      <div className={`border-2 rounded-lg p-1 ${borderColor} ${bgColor}`}>
        <svg width={100} height={100}>
          {/* Circle */}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="black" strokeWidth={1.2} />
          {/* Numbers */}
          {labels.map(({ text, offsetClock }) => {
            const mathAngle = watch.clockUpAngle + sign * offsetClock;
            const rad = (mathAngle * Math.PI) / 180;
            const dist = r + 11;
            const x = cx + dist * Math.cos(rad);
            const y = cy - dist * Math.sin(rad);
            return <text key={text} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize={11} fontWeight="bold">{text}</text>;
          })}
          {/* Angle value in center */}
          <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize={13} fontWeight="500">
            {watch.displayedAngle > 0 ? `${watch.displayedAngle} °` : `\u2013 ${Math.abs(watch.displayedAngle)} °`}
          </text>
        </svg>
      </div>
    </div>
  );
}

// ============================================================================
// Results screen
// ============================================================================

const STANINE_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#facc15', '#a3e635',
  '#22c55e', '#14b8a6', '#0ea5e9', '#6366f1',
];

function ResultsScreen({ computeScore, onReplay, onMenu, onHome, onReview }: {
  computeScore: () => { correct: number; total: number };
  onReplay: () => void; onMenu: () => void; onHome: () => void; onReview: () => void;
}) {
  const { correct, total } = computeScore();
  const percent = total > 0 ? (correct / total) * 100 : 0;
  const cls = scoreToClass(percent);
  const perfEntries = loadEntries(EXERCISE_ID);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-3xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">Angles &ndash; Montres</CardTitle>
          <Badge variant={percent >= 75 ? 'default' : percent >= 50 ? 'secondary' : 'destructive'} className="text-lg px-4 py-1 mx-auto">
            Classe {cls}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <p className="text-sm font-medium text-slate-500 uppercase">Score</p>
            <p className="text-5xl font-bold text-slate-700 mt-1">{correct} / {total}</p>
            <p className="text-slate-500 mt-1">({percent.toFixed(1)} %)</p>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 uppercase mb-2">Performance</p>
            <Histogram stanine={cls} />
          </div>
          {perfEntries.length >= 2 && (
            <div className="border-t pt-4">
              <p className="text-sm font-medium text-slate-500 mb-2 text-center">Progression</p>
              <div className="flex justify-center"><MiniPerformanceChart entries={perfEntries} exerciseId={EXERCISE_ID} /></div>
            </div>
          )}
          <div className="flex flex-col gap-3">
            <Button size="lg" className="w-full" onClick={onReview}><Eye className="mr-2 h-5 w-5" /> Revoir les reponses</Button>
            <Button variant="outline" size="lg" className="w-full" onClick={onReplay}><RotateCcw className="mr-2 h-5 w-5" /> Refaire</Button>
            <Button variant="outline" size="lg" className="w-full" onClick={onMenu}><ArrowLeft className="mr-2 h-5 w-5" /> Menu</Button>
            <Button variant="ghost" size="lg" className="w-full" onClick={onHome}><Home className="mr-2 h-5 w-5" /> Accueil</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Histogram({ stanine }: { stanine: number }) {
  const heights = [25, 45, 65, 85, 100, 85, 65, 45, 25];
  return (
    <div className="w-full">
      <div className="flex h-32 rounded-md overflow-hidden border border-slate-200">
        {STANINE_COLORS.map((color, i) => {
          const cls = i + 1;
          const isUser = cls === stanine;
          return (
            <div key={cls} className="flex-1 flex flex-col justify-end relative"
              style={{ backgroundColor: color, opacity: isUser ? 1 : 0.55 }}>
              <div className="w-full bg-black/15" style={{ height: `${heights[i]}%` }} />
              {isUser && <div className="absolute inset-0 border-2 border-slate-900 pointer-events-none" />}
              <div className="absolute top-1 left-0 right-0 text-center text-[10px] font-bold text-slate-900/70">{cls}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Review screen
// ============================================================================

function ReviewScreen({ questions, checked, reviewIdx, onPrev, onNext, onBack }: {
  questions: Question[]; checked: Record<number, Set<number>>;
  reviewIdx: number; onPrev: () => void; onNext: () => void; onBack: () => void;
}) {
  const q = questions[reviewIdx];
  const userSet = checked[reviewIdx] || new Set<number>();

  // Compute if user's full answer was correct
  const correctSet = new Set(q.watches.map((w, j) => w.isCorrect ? j : -1).filter(j => j >= 0));
  const isQuestionCorrect = userSet.size === correctSet.size && [...correctSet].every(j => userSet.has(j));

  return (
    <div className="flex min-h-screen bg-white">
      <div className="flex-1 flex flex-col p-4">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-4">
          <button type="button" onClick={onBack} className="bg-slate-200 hover:bg-slate-300 text-slate-800 text-sm px-3 py-1.5 rounded flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> Resultats
          </button>
          <span className="text-sm text-slate-500">Question {reviewIdx + 1} / {questions.length}</span>
          <span className={`text-sm font-bold ${isQuestionCorrect ? 'text-green-600' : 'text-red-600'}`}>
            {isQuestionCorrect ? 'Juste' : 'Erreur'}
          </span>
        </div>

        {/* Reference angle */}
        <div className="flex items-start gap-8 mb-6">
          <ReferenceAngle oDx={q.refODx} oDy={q.refODy} aDx={q.refADx} aDy={q.refADy} />
          <div className="text-sm text-slate-500 mt-2">Angle de reference : {q.refAngle}°</div>
        </div>

        {/* Watches grid with correction */}
        <div className="flex-1 flex flex-col items-center gap-4">
          {[q.watches.slice(0, 2), q.watches.slice(2, 5), q.watches.slice(5, 8)].map((row, rowIdx) => (
            <div key={rowIdx} className="flex gap-6 justify-center">
              {row.map((w, colIdx) => {
                const absIdx = rowIdx === 0 ? colIdx : rowIdx === 1 ? colIdx + 2 : colIdx + 5;
                const wasChecked = userSet.has(absIdx);
                // green = correctly checked OR correctly not checked (but we only highlight active ones)
                // red = wrongly checked OR missed (should have checked but didn't)
                let isUserCorrect: boolean | undefined;
                if (w.isCorrect && wasChecked) isUserCorrect = true;      // correct check
                else if (!w.isCorrect && wasChecked) isUserCorrect = false; // wrong check
                else if (w.isCorrect && !wasChecked) isUserCorrect = false; // missed
                // else: correctly unchecked -> undefined (neutral)

                return <WatchCard key={absIdx} watch={w} checked={wasChecked}
                  reviewMode isUserCorrect={isUserCorrect} />;
              })}
            </div>
          ))}
        </div>

        {/* Bottom nav */}
        <div className="flex items-center justify-end gap-2 border-t border-red-500 pt-2 mt-4">
          <button type="button" onClick={onPrev} disabled={reviewIdx === 0}
            className="bg-sky-500 hover:bg-sky-600 disabled:bg-slate-300 text-white text-sm px-3 py-1.5 rounded flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> Precedent
          </button>
          <button type="button" onClick={onNext} disabled={reviewIdx === questions.length - 1}
            className="bg-sky-500 hover:bg-sky-600 disabled:bg-slate-300 text-white text-sm px-3 py-1.5 rounded flex items-center gap-1">
            Suivant <Check className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default AnglesMontresTest;

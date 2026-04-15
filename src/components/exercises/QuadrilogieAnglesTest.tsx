'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { savePerformanceResult, loadEntries, scoreToStanine } from '@/lib/core/PerformanceTracker';
import { MiniPerformanceChart } from '@/components/PerformanceChart';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Play, Settings, RotateCcw, Home, Check, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';

// ============================================================================
// Types
// ============================================================================

type GameState = 'menu' | 'settings' | 'playing' | 'results' | 'review';
type Level = 1 | 2 | 3 | 4;

interface Level1Data {
  level: 1;
  oDx: number; oDy: number;  // O endpoint relative to vertex (screen coords, y down)
  aDx: number; aDy: number;  // A endpoint relative to vertex
  backgroundUrl: string;     // URL of the background image (Picsum)
}

interface Level2Data {
  level: 2;
  pointDx: number; pointDy: number;  // isolated point relative to arrow base
  tipDx: number; tipDy: number;      // arrow tip relative to base
}

interface Level3Data {
  level: 3;
  oDx: number; oDy: number;  // O point relative to cross
  aDx: number; aDy: number;  // A point relative to cross
}

interface Level4Data {
  level: 4;
  rotation: number;  // current rotation of the bear in screen-clockwise degrees from upright
}

type LevelData = Level1Data | Level2Data | Level3Data | Level4Data;

interface Question {
  level: Level;
  clockUpAngle: 0 | 90 | 180 | 270; // math angle (deg) where '12' is placed (90 = top)
  isReversed: boolean;                // true = positive direction is anti-clockwise on screen
  data: LevelData;
  correctAngle: number;               // multiple of 10, [0, 360]
}

interface GameSettings {
  totalDurationSec: number;     // default 480 (8 min)
  questionsPerLevel: number;    // default 10
}

// ============================================================================
// Settings persistence (localStorage)
// ============================================================================

const DEFAULT_SETTINGS: GameSettings = {
  totalDurationSec: 480,
  questionsPerLevel: 10,
};

const SETTINGS_KEY = 'aviatest-quadrilogie-angles-settings';

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
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch { /* ignore */ }
}

// ============================================================================
// Angle math helpers
// ============================================================================

/** Pick a random clock orientation: 12 at one of {top, right, bottom, left}, optionally reversed. */
function randomClockConfig(): { clockUpAngle: 0 | 90 | 180 | 270; isReversed: boolean } {
  const positions: Array<0 | 90 | 180 | 270> = [0, 90, 180, 270];
  return {
    clockUpAngle: positions[Math.floor(Math.random() * 4)],
    isReversed: Math.random() < 0.5,
  };
}

/** Convert a clock-angle (positive direction) to a math angle direction in screen coords. */
function clockAngleToMathDir(clockAngle: number, clockUpAngle: number, isReversed: boolean): number {
  if (!isReversed) {
    return (clockUpAngle - clockAngle) % 360;
  } else {
    return (clockAngle + clockUpAngle) % 360;
  }
}

// ============================================================================
// Background images for Level 1 (Picsum Photos, stable public CDN)
// 50 curated Picsum IDs verified to return 200 OK. Using 800x600 crop.
// ============================================================================

const LEVEL1_BACKGROUND_IDS = [
  0, 2, 4, 10, 13, 15, 16, 17, 18, 19,
  30, 33, 36, 40, 43, 48, 60, 63, 70, 76,
  80, 100, 110, 122, 133, 145, 156, 164, 177, 180,
  201, 225, 244, 250, 270, 290, 311, 326, 354, 380,
  400, 427, 437, 447, 454, 480, 493, 510, 528, 548,
] as const;

function pickRandomBackgroundUrl(): string {
  const id = LEVEL1_BACKGROUND_IDS[Math.floor(Math.random() * LEVEL1_BACKGROUND_IDS.length)];
  return `https://picsum.photos/id/${id}/800/600`;
}

// ============================================================================
// Question generators
// ============================================================================

function pickAngle10(min = 10, max = 350): number {
  // Multiple of 10 in [min, max]
  const n = Math.floor((max - min) / 10) + 1;
  return min + Math.floor(Math.random() * n) * 10;
}

function generateLevel1(clockUpAngle: 0 | 90 | 180 | 270, isReversed: boolean): { data: Level1Data; correctAngle: number } {
  const targetAngle = pickAngle10(10, 350);
  const oClockAngle = Math.floor(Math.random() * 36) * 10;
  const aClockAngle = (oClockAngle + targetAngle) % 360;

  const oMath = clockAngleToMathDir(oClockAngle, clockUpAngle, isReversed);
  const aMath = clockAngleToMathDir(aClockAngle, clockUpAngle, isReversed);

  const len1 = 110 + Math.random() * 50;
  const len2 = 110 + Math.random() * 50;

  const oDx = len1 * Math.cos((oMath * Math.PI) / 180);
  const oDy = -len1 * Math.sin((oMath * Math.PI) / 180);
  const aDx = len2 * Math.cos((aMath * Math.PI) / 180);
  const aDy = -len2 * Math.sin((aMath * Math.PI) / 180);

  return {
    data: { level: 1, oDx, oDy, aDx, aDy, backgroundUrl: pickRandomBackgroundUrl() },
    correctAngle: targetAngle,
  };
}

function generateLevel2(clockUpAngle: 0 | 90 | 180 | 270, isReversed: boolean): { data: Level2Data; correctAngle: number } {
  const targetAngle = pickAngle10(10, 350);
  // Origin direction: from base to point (vector base -> point), but our origin segment is "point -> base"
  // We define origin direction as vector from base to point reversed = point -> base direction = -(point - base)
  // Easier: pick origin clock angle = direction from base to the *start*. Origin segment = [point -> base], so its direction (as a vector pointing toward the joint base) is from point to base. The "outgoing" direction from the vertex (base) along this segment is toward the point.
  // For the angle calculation, both branches must point AWAY from the vertex.
  // Branch 1 (origin): from base toward point  -> vector = point - base = (pointDx, pointDy)
  // Branch 2 (arrival): from base toward tip   -> vector = tip - base   = (tipDx, tipDy)
  const oClockAngle = Math.floor(Math.random() * 36) * 10;
  const aClockAngle = (oClockAngle + targetAngle) % 360;

  const oMath = clockAngleToMathDir(oClockAngle, clockUpAngle, isReversed);
  const aMath = clockAngleToMathDir(aClockAngle, clockUpAngle, isReversed);

  const lenPoint = 110 + Math.random() * 40;
  const lenArrow = 90 + Math.random() * 40;

  const pointDx = lenPoint * Math.cos((oMath * Math.PI) / 180);
  const pointDy = -lenPoint * Math.sin((oMath * Math.PI) / 180);
  const tipDx = lenArrow * Math.cos((aMath * Math.PI) / 180);
  const tipDy = -lenArrow * Math.sin((aMath * Math.PI) / 180);

  return {
    data: { level: 2, pointDx, pointDy, tipDx, tipDy },
    correctAngle: targetAngle,
  };
}

function generateLevel3(clockUpAngle: 0 | 90 | 180 | 270, isReversed: boolean): { data: Level3Data; correctAngle: number } {
  const targetAngle = pickAngle10(10, 350);
  const oClockAngle = Math.floor(Math.random() * 36) * 10;
  const aClockAngle = (oClockAngle + targetAngle) % 360;

  const oMath = clockAngleToMathDir(oClockAngle, clockUpAngle, isReversed);
  const aMath = clockAngleToMathDir(aClockAngle, clockUpAngle, isReversed);

  const lenO = 100 + Math.random() * 50;
  const lenA = 100 + Math.random() * 50;

  const oDx = lenO * Math.cos((oMath * Math.PI) / 180);
  const oDy = -lenO * Math.sin((oMath * Math.PI) / 180);
  const aDx = lenA * Math.cos((aMath * Math.PI) / 180);
  const aDy = -lenA * Math.sin((aMath * Math.PI) / 180);

  return {
    data: { level: 3, oDx, oDy, aDx, aDy },
    correctAngle: targetAngle,
  };
}

function generateLevel4(clockUpAngle: 0 | 90 | 180 | 270, isReversed: boolean): { data: Level4Data; correctAngle: number } {
  // The bear is rotated by `rotation` clockwise on screen.
  // To upright it (H back to '12' position), rotation to apply = clock-angle from currentHDir to clockUpAngle.
  // Bear upright has H pointing up = math angle 90.
  // After clockwise screen rotation by R, H points at math angle (90 - R).
  // We want target rotation in clock positive direction = pickAngle10.
  const targetAngle = pickAngle10(10, 350);
  // currentHDir (math) such that going from currentHDir to clockUpAngle in clock-positive = targetAngle
  // mathAngleToClockAngle(currentHDir, clockUp, rev) gives the clock position of currentHDir.
  // Going from currentHDir to clockUpAngle in clock-positive = (0 - currentHClockAngle) mod 360 = -currentHClockAngle mod 360
  // = (360 - currentHClockAngle) mod 360 = targetAngle
  // => currentHClockAngle = (360 - targetAngle) mod 360
  const currentHClockAngle = (360 - targetAngle) % 360;
  const currentHMath = clockAngleToMathDir(currentHClockAngle, clockUpAngle, isReversed);
  // Bear's clockwise screen rotation R such that H math angle = 90 - R => R = 90 - currentHMath
  let rotation = (90 - currentHMath) % 360;
  if (rotation < 0) rotation += 360;
  // Snap to multiple of 10
  rotation = Math.round(rotation / 10) * 10;
  if (rotation === 360) rotation = 0;

  return {
    data: { level: 4, rotation },
    correctAngle: targetAngle,
  };
}

function generateAllQuestions(questionsPerLevel: number): Question[] {
  const questions: Question[] = [];
  for (let level = 1 as Level; level <= 4; level++) {
    for (let i = 0; i < questionsPerLevel; i++) {
      const { clockUpAngle, isReversed } = randomClockConfig();
      let gen;
      switch (level) {
        case 1: gen = generateLevel1(clockUpAngle, isReversed); break;
        case 2: gen = generateLevel2(clockUpAngle, isReversed); break;
        case 3: gen = generateLevel3(clockUpAngle, isReversed); break;
        case 4: gen = generateLevel4(clockUpAngle, isReversed); break;
        default: gen = generateLevel1(clockUpAngle, isReversed);
      }
      questions.push({
        level: level as Level,
        clockUpAngle,
        isReversed,
        data: gen.data,
        correctAngle: gen.correctAngle,
      });
    }
  }
  return questions;
}

// ============================================================================
// Main component (state + UI orchestration)
// ============================================================================

const EXERCISE_ID = 'quadrilogie-angles';

export function QuadrilogieAnglesTest() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const perfSavedRef = useRef(false);

  const [gameState, setGameState] = useState<GameState>('menu');
  const [settings, setSettingsState] = useState<GameSettings>(DEFAULT_SETTINGS);

  // Load settings from localStorage on mount
  useEffect(() => {
    setSettingsState(loadSettings());
  }, []);

  // Persist settings whenever they change
  const setSettings = useCallback((s: GameSettings | ((prev: GameSettings) => GameSettings)) => {
    setSettingsState(prev => {
      const next = typeof s === 'function' ? s(prev) : s;
      saveSettings(next);
      return next;
    });
  }, []);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [remainingSec, setRemainingSec] = useState(settings.totalDurationSec);
  const [reviewIdx, setReviewIdx] = useState(0);

  const totalQuestions = questions.length;

  // Refs for the game loop / timer (avoid stale closures)
  const remainingRef = useRef(remainingSec);
  remainingRef.current = remainingSec;
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  // Width / height of the canvas (will be made responsive via CSS)
  const width = 1280;
  const height = 720;

  // ----- Game flow -----

  const startPlaying = useCallback(() => {
    perfSavedRef.current = false;
    const qs = generateAllQuestions(settings.questionsPerLevel);
    setQuestions(qs);
    setAnswers({});
    setCurrentIdx(0);
    setInputValue('');
    setRemainingSec(settings.totalDurationSec);
    remainingRef.current = settings.totalDurationSec;
    setGameState('playing');
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [settings]);

  // Save current input into answers when navigating away
  const commitAnswer = useCallback((idx: number, val: string) => {
    setAnswers(prev => {
      const next = { ...prev };
      const trimmed = val.trim();
      if (trimmed === '') {
        delete next[idx];
      } else {
        next[idx] = trimmed;
      }
      return next;
    });
  }, []);

  const goToQuestion = useCallback((newIdx: number) => {
    if (newIdx < 0 || newIdx >= totalQuestions) return;
    commitAnswer(currentIdx, inputValue);
    setCurrentIdx(newIdx);
    setInputValue(answers[newIdx] ?? '');
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [currentIdx, inputValue, answers, totalQuestions, commitAnswer]);

  const goNext = useCallback(() => {
    if (currentIdx === totalQuestions - 1) {
      // Last question -> finalize
      commitAnswer(currentIdx, inputValue);
      setGameState('results');
    } else {
      goToQuestion(currentIdx + 1);
    }
  }, [currentIdx, totalQuestions, inputValue, commitAnswer, goToQuestion]);

  const goPrev = useCallback(() => {
    if (currentIdx > 0) goToQuestion(currentIdx - 1);
  }, [currentIdx, goToQuestion]);

  // Timer countdown (1s tick)
  useEffect(() => {
    if (gameState !== 'playing') return;
    const interval = setInterval(() => {
      setRemainingSec(prev => {
        const next = prev - 1;
        if (next <= 0) {
          // Time's up - commit current answer, show results
          setAnswers(a => {
            const trimmed = inputValue.trim();
            if (trimmed === '') return a;
            return { ...a, [currentIdx]: trimmed };
          });
          setGameState('results');
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [gameState, currentIdx, inputValue]);

  // Re-focus input when changing question
  useEffect(() => {
    if (gameState === 'playing') {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [currentIdx, gameState]);

  // ----- Score computation -----

  const computeScore = useCallback(() => {
    let correct = 0;
    questions.forEach((q, i) => {
      const ans = answers[i];
      if (ans === undefined) return;
      const v = parseInt(ans, 10);
      if (isNaN(v)) return;
      const normalized = ((v % 360) + 360) % 360;
      const expected = q.correctAngle;
      // Accept 0 and 360 as equivalent
      if (normalized === expected || (expected === 0 && normalized === 0) ||
          (expected === 360 && normalized === 0) || (expected === 0 && normalized === 360)) {
        correct++;
      }
    });
    return { correct, total: questions.length };
  }, [questions, answers]);

  // Save performance on results screen
  useEffect(() => {
    if (gameState !== 'results' || perfSavedRef.current) return;
    perfSavedRef.current = true;
    const { correct, total } = computeScore();
    savePerformanceResult(EXERCISE_ID, correct, total);
  }, [gameState, computeScore]);

  // Render: see other files for the heavy canvas drawing (delegated to renderer module idea later)
  // For now, the menu/results screens are React, the play screen uses Canvas inside JSX.

  if (gameState === 'menu') {
    return <MenuScreen settings={settings} onPlay={startPlaying} onSettings={() => setGameState('settings')} onBack={() => router.push('/')} />;
  }

  if (gameState === 'settings') {
    return <SettingsScreen settings={settings} onChange={setSettings} onBack={() => setGameState('menu')} />;
  }

  if (gameState === 'results') {
    return <ResultsScreen
      questions={questions}
      answers={answers}
      onReplay={startPlaying}
      onMenu={() => setGameState('menu')}
      onHome={() => router.push('/')}
      onReview={() => {
        setReviewIdx(0);
        setGameState('review');
      }}
    />;
  }

  if (gameState === 'review') {
    return <ReviewScreen
      questions={questions}
      answers={answers}
      reviewIdx={reviewIdx}
      onPrev={() => setReviewIdx(i => Math.max(0, i - 1))}
      onNext={() => setReviewIdx(i => Math.min(questions.length - 1, i + 1))}
      onBack={() => setGameState('results')}
    />;
  }

  // Playing
  const q = questions[currentIdx];
  if (!q) return null;

  return (
    <PlayingScreen
      canvasRef={canvasRef}
      inputRef={inputRef}
      width={width}
      height={height}
      question={q}
      questionIdx={currentIdx}
      totalQuestions={totalQuestions}
      remainingSec={remainingSec}
      totalDurationSec={settings.totalDurationSec}
      inputValue={inputValue}
      onInputChange={setInputValue}
      onPrev={goPrev}
      onNext={goNext}
    />
  );
}

export default QuadrilogieAnglesTest;

// ============================================================================
// Sub-components are implemented in the same file below for cohesion.
// Order: MenuScreen, SettingsScreen, PlayingScreen (with canvas), ResultsScreen.
// ============================================================================

// --- Placeholder sub-components: implemented in subsequent edits ---

function MenuScreen({ settings, onPlay, onSettings, onBack }: {
  settings: GameSettings;
  onPlay: () => void;
  onSettings: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">Quadrilogie des Angles</CardTitle>
          <CardDescription className="text-lg">
            Determinez l&apos;angle, multiple de 10°, sur 4 niveaux differents
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-2xl font-bold text-slate-700">{settings.questionsPerLevel * 4}</p>
              <p className="text-sm text-slate-500">Questions</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-2xl font-bold text-slate-700">
                {Math.floor(settings.totalDurationSec / 60)}:{(settings.totalDurationSec % 60).toString().padStart(2, '0')}
              </p>
              <p className="text-sm text-slate-500">Temps total</p>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <Button size="lg" className="w-full" onClick={onPlay}>
              <Play className="mr-2 h-5 w-5" /> Jouer
            </Button>
            <Button variant="outline" size="lg" className="w-full" onClick={onSettings}>
              <Settings className="mr-2 h-5 w-5" /> Parametres
            </Button>
            <Button variant="ghost" size="lg" className="w-full" onClick={onBack}>
              <ArrowLeft className="mr-2 h-5 w-5" /> Retour
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SettingsScreen({ settings, onChange, onBack }: {
  settings: GameSettings;
  onChange: (s: GameSettings) => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader><CardTitle>Parametres</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label>Questions par niveau: {settings.questionsPerLevel} (total: {settings.questionsPerLevel * 4})</Label>
              <Slider
                value={[settings.questionsPerLevel]}
                onValueChange={([v]) => onChange({ ...settings, questionsPerLevel: v })}
                min={5} max={20} step={1}
                className="mt-2"
              />
            </div>
            <div>
              <Label>Duree totale: {Math.floor(settings.totalDurationSec / 60)}:{(settings.totalDurationSec % 60).toString().padStart(2, '0')}</Label>
              <Slider
                value={[settings.totalDurationSec]}
                onValueChange={([v]) => onChange({ ...settings, totalDurationSec: v })}
                min={120} max={1800} step={30}
                className="mt-2"
              />
            </div>
          </div>
          <Button variant="outline" className="w-full" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Retour
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Drawing helpers (canvas)
// ============================================================================

function drawClock(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, radius: number,
  clockUpAngle: number, isReversed: boolean
) {
  // Circle outline
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  // Compute math angles for 12, 3, 6, 9 in screen
  // 12 is at clockUpAngle (math). Going positive direction (clockwise on screen for !isReversed)
  // means decreasing math angle for !isReversed.
  const sign = isReversed ? +1 : -1;
  const labels: Array<{ text: string; offsetClock: number }> = [
    { text: '12', offsetClock: 0 },
    { text: '3', offsetClock: 90 },
    { text: '6', offsetClock: 180 },
    { text: '9', offsetClock: 270 },
  ];

  ctx.font = 'bold 18px Inter, Arial';
  ctx.fillStyle = '#000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const labelDist = radius + 14;

  for (const { text, offsetClock } of labels) {
    const mathAngle = clockUpAngle + sign * offsetClock;
    const rad = (mathAngle * Math.PI) / 180;
    const x = cx + labelDist * Math.cos(rad);
    const y = cy - labelDist * Math.sin(rad);
    ctx.fillText(text, x, y);
  }
}

// Module-level image cache so we don't reload the same image across renders.
const imageCache = new Map<string, HTMLImageElement>();

function getCachedImage(url: string, onLoad: () => void): HTMLImageElement {
  let img = imageCache.get(url);
  if (img) return img;
  img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = onLoad;
  img.onerror = onLoad; // trigger re-render even if it fails (so we skip drawing bg)
  img.src = url;
  imageCache.set(url, img);
  return img;
}

function drawLevel1(ctx: CanvasRenderingContext2D, cx: number, cy: number, data: Level1Data, onImageLoad?: () => void) {
  // Background image (centered on cx, cy, 400x300 display size — similar to EPLtest)
  const bgW = 400;
  const bgH = 300;
  const bgX = cx - bgW / 2;
  const bgY = cy - bgH / 2;

  const img = getCachedImage(data.backgroundUrl, onImageLoad ?? (() => {}));
  if (img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, bgX, bgY, bgW, bgH);
  } else {
    // Placeholder rectangle while loading
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(bgX, bgY, bgW, bgH);
  }

  // Two segments from (cx, cy) to O and to A (drawn ON TOP of the image)
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(cx + data.oDx, cy + data.oDy);
  ctx.lineTo(cx, cy);
  ctx.lineTo(cx + data.aDx, cy + data.aDy);
  ctx.stroke();

  // Labels O (origin) and A (arrival), offset slightly outward.
  // Draw with a white halo so they remain readable over any image.
  drawLabelOutlined(ctx, 'O', cx + data.oDx, cy + data.oDy, data.oDx, data.oDy);
  drawLabelOutlined(ctx, 'A', cx + data.aDx, cy + data.aDy, data.aDx, data.aDy);
}

function drawLabelOutlined(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, dirX: number, dirY: number) {
  const len = Math.hypot(dirX, dirY) || 1;
  const ox = (dirX / len) * 14;
  const oy = (dirY / len) * 14;
  ctx.font = 'bold 14px Inter, Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // White halo
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#ffffff';
  ctx.strokeText(text, x + ox, y + oy);
  ctx.fillStyle = '#000';
  ctx.fillText(text, x + ox, y + oy);
}

function drawLevel2(ctx: CanvasRenderingContext2D, cx: number, cy: number, data: Level2Data) {
  // Vertex of the angle = arrow base = (cx, cy)
  // Isolated point at (cx + pointDx, cy + pointDy)
  // Tip at (cx + tipDx, cy + tipDy)
  ctx.fillStyle = '#000';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1.8;

  // Draw isolated point
  const px = cx + data.pointDx;
  const py = cy + data.pointDy;
  ctx.beginPath();
  ctx.arc(px, py, 3, 0, Math.PI * 2);
  ctx.fill();

  // Draw arrow (line + arrowhead) from base (cx, cy) to tip
  const tipX = cx + data.tipDx;
  const tipY = cy + data.tipDy;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();

  // Arrowhead
  const dx = tipX - cx;
  const dy = tipY - cy;
  const len = Math.hypot(dx, dy);
  const ux = dx / len;
  const uy = dy / len;
  const headLen = 14;
  const headSpread = 0.45;
  const back1x = tipX - headLen * (ux * Math.cos(headSpread) - uy * Math.sin(headSpread));
  const back1y = tipY - headLen * (uy * Math.cos(headSpread) + ux * Math.sin(headSpread));
  const back2x = tipX - headLen * (ux * Math.cos(headSpread) + uy * Math.sin(headSpread));
  const back2y = tipY - headLen * (uy * Math.cos(headSpread) - ux * Math.sin(headSpread));
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(back1x, back1y);
  ctx.lineTo(back2x, back2y);
  ctx.closePath();
  ctx.fill();
}

function drawLevel3(ctx: CanvasRenderingContext2D, cx: number, cy: number, data: Level3Data) {
  // Red cross at center
  ctx.strokeStyle = '#e03b2f';
  ctx.lineWidth = 2;
  const cs = 7;
  ctx.beginPath();
  ctx.moveTo(cx - cs, cy - cs);
  ctx.lineTo(cx + cs, cy + cs);
  ctx.moveTo(cx - cs, cy + cs);
  ctx.lineTo(cx + cs, cy - cs);
  ctx.stroke();

  // Blue points O and A
  ctx.fillStyle = '#1f7ad1';
  const oX = cx + data.oDx;
  const oY = cy + data.oDy;
  const aX = cx + data.aDx;
  const aY = cy + data.aDy;
  ctx.beginPath();
  ctx.arc(oX, oY, 3, 0, Math.PI * 2);
  ctx.arc(aX, aY, 3, 0, Math.PI * 2);
  ctx.fill();

  // Blue labels (slightly offset away from cross)
  ctx.fillStyle = '#1f7ad1';
  ctx.font = 'bold 14px Inter, Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const oLabelOffsetX = -10 * Math.sign(data.oDx) || -10;
  const oLabelOffsetY = 8;
  const aLabelOffsetX = -10 * Math.sign(data.aDx) || 10;
  const aLabelOffsetY = 8;
  ctx.fillText('O', oX + oLabelOffsetX, oY + oLabelOffsetY);
  ctx.fillText('A', aX + aLabelOffsetX, aY + aLabelOffsetY);
}

function drawLevel4(ctx: CanvasRenderingContext2D, cx: number, cy: number, data: Level4Data) {
  // The bear is rotated by `rotation` (clockwise on screen) from upright.
  ctx.save();
  ctx.translate(cx, cy);
  // Canvas rotate uses radians, positive = clockwise (since y is down).
  ctx.rotate((data.rotation * Math.PI) / 180);
  drawBearShape(ctx, 110);
  ctx.restore();

  // Labels H (head/top) and B (bottom), positioned around the bear in its current orientation.
  // In bear's local frame, H is up (math angle 90), B is down (math angle -90).
  // After clockwise screen rotation by R, H direction in screen-math = 90 - R.
  const labelDist = 145;
  const hMath = (90 - data.rotation) * Math.PI / 180;
  const bMath = (-90 - data.rotation) * Math.PI / 180;
  const hX = cx + labelDist * Math.cos(hMath);
  const hY = cy - labelDist * Math.sin(hMath);
  const bX = cx + labelDist * Math.cos(bMath);
  const bY = cy - labelDist * Math.sin(bMath);

  // Draw labels rotated with the bear (so they appear "stuck" to it)
  drawRotatedText(ctx, 'H', hX, hY, data.rotation);
  drawRotatedText(ctx, 'B', bX, bY, data.rotation);
}

function drawRotatedText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, rotationDeg: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((rotationDeg * Math.PI) / 180);
  ctx.font = 'bold 16px Inter, Arial';
  ctx.fillStyle = '#000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

function drawBearShape(ctx: CanvasRenderingContext2D, size: number) {
  // Stylized bear silhouette, drawn upright facing right.
  // Centered around (0, 0). Drawn entirely in black.
  ctx.fillStyle = '#000';

  // Body (large rounded shape)
  ctx.beginPath();
  ctx.ellipse(-size * 0.05, size * 0.18, size * 0.42, size * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();

  // Head (rounded, front of body)
  ctx.beginPath();
  ctx.arc(size * 0.32, -size * 0.18, size * 0.22, 0, Math.PI * 2);
  ctx.fill();

  // Snout
  ctx.beginPath();
  ctx.ellipse(size * 0.5, -size * 0.05, size * 0.1, size * 0.07, 0, 0, Math.PI * 2);
  ctx.fill();

  // Ears (two small circles)
  ctx.beginPath();
  ctx.arc(size * 0.18, -size * 0.36, size * 0.07, 0, Math.PI * 2);
  ctx.arc(size * 0.42, -size * 0.36, size * 0.07, 0, Math.PI * 2);
  ctx.fill();

  // Legs (4 stocky rounded rectangles)
  drawRoundedRect(ctx, -size * 0.38, size * 0.32, size * 0.18, size * 0.28, size * 0.06);
  drawRoundedRect(ctx, -size * 0.12, size * 0.36, size * 0.18, size * 0.28, size * 0.06);
  drawRoundedRect(ctx,  size * 0.12, size * 0.36, size * 0.18, size * 0.28, size * 0.06);
  drawRoundedRect(ctx,  size * 0.32, size * 0.32, size * 0.16, size * 0.26, size * 0.06);
}

function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
}

function drawTimerBar(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  remainingSec: number, totalSec: number
) {
  const progress = Math.max(0, Math.min(1, remainingSec / totalSec));
  ctx.fillStyle = '#1f2937';
  ctx.beginPath();
  roundedRectPath(ctx, x, y, w, h, 8);
  ctx.fill();

  const fillH = h * progress;
  const color = progress > 0.5 ? '#22c55e' : progress > 0.2 ? '#f59e0b' : '#ef4444';
  ctx.fillStyle = color;
  ctx.beginPath();
  roundedRectPath(ctx, x + 3, y + h - fillH + 3, w - 6, Math.max(0, fillH - 6), 5);
  ctx.fill();
}

function roundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  if (h <= 0 || w <= 0) return;
  const rr = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
}

function formatMMSS(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

// ============================================================================
// Shared canvas renderer (used by Playing and Review screens)
// ============================================================================

function renderQuestionToCanvas(
  ctx: CanvasRenderingContext2D,
  width: number, height: number,
  question: Question,
  opts: {
    remainingSec?: number;        // if provided, draw left timer bar
    totalDurationSec?: number;
    drawBottomBar?: boolean;      // default true
    showCorrection?: boolean;     // review mode
    userAnswer?: number | null;   // user's parsed answer (deg) for correction arc
    onImageLoad?: () => void;     // callback to re-render once image is ready
  } = {}
) {
  const { remainingSec, totalDurationSec, drawBottomBar = true, showCorrection = false, userAnswer = null, onImageLoad } = opts;

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Vertical timer bar (left) - only if we have timer info
  if (remainingSec !== undefined && totalDurationSec !== undefined) {
    drawTimerBar(ctx, 30, 40, 18, height - 80, remainingSec, totalDurationSec);
  }

  // Clock (top center)
  const clockCX = width / 2;
  const clockCY = 90;
  drawClock(ctx, clockCX, clockCY, 36, question.clockUpAngle, question.isReversed);

  // Visual zone (centered slightly above middle)
  const zoneCX = width / 2;
  const zoneCY = 360;

  if (question.data.level === 1) {
    drawLevel1(ctx, zoneCX, zoneCY, question.data, onImageLoad);
  } else if (question.data.level === 2) {
    drawLevel2(ctx, zoneCX, zoneCY, question.data);
  } else if (question.data.level === 3) {
    drawLevel3(ctx, zoneCX, zoneCY, question.data);
  } else if (question.data.level === 4) {
    drawLevel4(ctx, zoneCX, zoneCY, question.data);
  }

  // Correction overlays (review mode)
  if (showCorrection) {
    drawCorrectionArc(ctx, zoneCX, zoneCY, question, 'correct');
    if (userAnswer !== null && userAnswer !== question.correctAngle) {
      drawCorrectionArc(ctx, zoneCX, zoneCY, question, 'user', userAnswer);
    }
  }

  // Bottom bar background
  if (drawBottomBar) {
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, height - 36, width, 36);
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height - 36);
    ctx.lineTo(width, height - 36);
    ctx.stroke();
  }
}

/** Draw the arc representing the measured angle, from O-direction to A-direction,
 *  in the clock's positive direction. Color = green (correct) or red (user answer). */
function drawCorrectionArc(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  question: Question,
  kind: 'correct' | 'user',
  userAngle?: number
) {
  // Determine the vertex of the angle and the starting branch direction (O).
  // We don't need the A direction because the arc sweeps from O by `angleDeg`
  // in the clock-positive direction.
  const vertexX = cx, vertexY = cy;
  let oMathDir = 0;
  const d = question.data;

  if (d.level === 1) {
    oMathDir = vectorMathAngle(d.oDx, d.oDy);
  } else if (d.level === 2) {
    // Vertex = arrow base = (cx, cy). O direction = from base to isolated point.
    oMathDir = vectorMathAngle(d.pointDx, d.pointDy);
  } else if (d.level === 3) {
    oMathDir = vectorMathAngle(d.oDx, d.oDy);
  } else if (d.level === 4) {
    // Vertex = bear center. O direction = current H direction (math angle = 90 - rotation).
    oMathDir = (90 - d.rotation) % 360;
  }

  // Pick the angle to draw: either the correct or the user-supplied one.
  const angleDeg = kind === 'correct' ? question.correctAngle : (userAngle ?? 0);
  if (angleDeg <= 0 || angleDeg >= 360) return; // nothing to draw

  // Arc radius
  const radius = kind === 'correct' ? 55 : 70;

  // The arc goes from oMathDir sweeping in the clock-positive direction for `angleDeg` degrees.
  // Clock-positive: if !isReversed = clockwise on screen = decreasing math angle.
  const sign = question.isReversed ? +1 : -1;
  const startMath = oMathDir;
  const endMath = oMathDir + sign * angleDeg;

  // Convert to canvas arc angles (canvas uses y-down, so math->canvas: angle_canvas = -angle_math)
  const startCanvas = -startMath * Math.PI / 180;
  const endCanvas = -endMath * Math.PI / 180;

  ctx.strokeStyle = kind === 'correct' ? '#16a34a' : '#dc2626';
  ctx.lineWidth = 2;
  ctx.setLineDash(kind === 'correct' ? [] : [5, 4]);
  ctx.beginPath();
  // For canvas arc: anticlockwise param = true when sign is +1 (isReversed=true, math increases = canvas decreases = anticlockwise in canvas)
  const anticlockwise = sign === +1;
  ctx.arc(vertexX, vertexY, radius, startCanvas, endCanvas, anticlockwise);
  ctx.stroke();
  ctx.setLineDash([]);

  // Arrowhead at end of arc
  const tipMath = endMath * Math.PI / 180;
  const tipX = vertexX + radius * Math.cos(tipMath);
  const tipY = vertexY - radius * Math.sin(tipMath);
  // Tangent direction of the arc at the tip (perpendicular to radius, in the sweep direction)
  const tangentMath = tipMath + sign * Math.PI / 2;
  const tangentDx = Math.cos(tangentMath);
  const tangentDy = -Math.sin(tangentMath);
  const headLen = 8;
  const headSpread = 0.5;
  ctx.fillStyle = kind === 'correct' ? '#16a34a' : '#dc2626';
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(
    tipX - headLen * (tangentDx * Math.cos(headSpread) - tangentDy * Math.sin(headSpread)),
    tipY - headLen * (tangentDy * Math.cos(headSpread) + tangentDx * Math.sin(headSpread))
  );
  ctx.lineTo(
    tipX - headLen * (tangentDx * Math.cos(headSpread) + tangentDy * Math.sin(headSpread)),
    tipY - headLen * (tangentDy * Math.cos(headSpread) - tangentDx * Math.sin(headSpread))
  );
  ctx.closePath();
  ctx.fill();
}

function vectorMathAngle(dx: number, dy: number): number {
  return (Math.atan2(-dy, dx) * 180) / Math.PI;
}

// ============================================================================
// Playing screen (canvas + input + nav buttons)
// ============================================================================

function PlayingScreen(props: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  inputRef: React.RefObject<HTMLInputElement | null>;
  width: number; height: number;
  question: Question; questionIdx: number; totalQuestions: number;
  remainingSec: number; totalDurationSec: number;
  inputValue: string;
  onInputChange: (v: string) => void;
  onPrev: () => void; onNext: () => void;
}) {
  const { canvasRef, inputRef, width, height, question, questionIdx, totalQuestions,
    remainingSec, totalDurationSec, inputValue, onInputChange, onPrev, onNext } = props;

  const [imgTick, setImgTick] = useState(0);

  // Render canvas whenever question or timer changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    renderQuestionToCanvas(ctx, width, height, question, {
      remainingSec,
      totalDurationSec,
      onImageLoad: () => setImgTick(t => t + 1),
    });
  }, [canvasRef, width, height, question, remainingSec, totalDurationSec, imgTick]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white p-4">
      <div className="relative w-full max-w-[1280px]" style={{ aspectRatio: `${width} / ${height}` }}>
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="w-full h-full block"
        />

        {/* Input field over the canvas, positioned under the visual zone */}
        <div
          className="absolute"
          style={{
            left: '50%',
            top: `${(500 / height) * 100}%`,
            transform: 'translateX(-50%)',
          }}
        >
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={inputValue}
            onChange={(e) => {
              const v = e.target.value.replace(/[^0-9]/g, '');
              onInputChange(v);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onNext();
            }}
            className="border border-sky-500 rounded-sm px-2 py-0.5 text-base text-center w-20 focus:outline-none focus:ring-1 focus:ring-sky-500"
            aria-label="Reponse en degres"
          />
        </div>

        {/* Bottom-left: question number + chrono */}
        <div
          className="absolute flex items-center gap-3 text-sm text-slate-700 px-3"
          style={{
            left: 0,
            bottom: 0,
            height: `${(36 / height) * 100}%`,
          }}
        >
          <Eye className="h-4 w-4" />
          <span>{questionIdx + 1} / {totalQuestions}</span>
          <span className="ml-3 text-slate-600">{formatMMSS(remainingSec)}</span>
        </div>

        {/* Bottom-right: Prev / Next buttons */}
        <div
          className="absolute flex items-center gap-2"
          style={{
            right: 8,
            bottom: 4,
          }}
        >
          {questionIdx > 0 && (
            <button
              type="button"
              onClick={onPrev}
              className="bg-sky-500 hover:bg-sky-600 text-white text-sm px-3 py-1.5 rounded-sm flex items-center gap-1"
            >
              <ArrowLeft className="h-4 w-4" /> Precedent
            </button>
          )}
          <button
            type="button"
            onClick={onNext}
            className="bg-sky-500 hover:bg-sky-600 text-white text-sm px-3 py-1.5 rounded-sm flex items-center gap-1"
          >
            Suivant <Check className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Results screen — score + 9-class rainbow histogram
// ============================================================================

const STANINE_COLORS = [
  '#ef4444', // 1 - red
  '#f97316', // 2 - orange
  '#f59e0b', // 3 - amber
  '#facc15', // 4 - yellow
  '#a3e635', // 5 - lime
  '#22c55e', // 6 - green
  '#14b8a6', // 7 - teal
  '#0ea5e9', // 8 - sky blue
  '#6366f1', // 9 - indigo
];

function classLabel(stanine: number): string {
  if (stanine <= 0) return '1-';
  if (stanine >= 9) return '9+';
  return `${stanine}`;
}

function ResultsScreen(props: {
  questions: Question[];
  answers: Record<number, string>;
  onReplay: () => void;
  onMenu: () => void;
  onHome: () => void;
  onReview: () => void;
}) {
  const { questions, answers, onReplay, onMenu, onHome, onReview } = props;

  const total = questions.length;
  let correct = 0;
  questions.forEach((q, i) => {
    const ans = answers[i];
    if (ans === undefined) return;
    const v = parseInt(ans, 10);
    if (isNaN(v)) return;
    const normalized = ((v % 360) + 360) % 360;
    const expected = q.correctAngle;
    if (normalized === expected) correct++;
  });

  const percent = total > 0 ? (correct / total) * 100 : 0;
  const stanine = scoreToStanine(percent);
  const userClass = classLabel(stanine);
  const perfEntries = loadEntries(EXERCISE_ID);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-3xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">Quadrilogie des Angles</CardTitle>
          <Badge variant={percent >= 75 ? 'default' : percent >= 50 ? 'secondary' : 'destructive'} className="text-lg px-4 py-1 mx-auto">
            Classe {userClass}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Score */}
          <div className="text-center">
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Score</p>
            <p className="text-5xl font-bold text-slate-700 mt-1">
              {correct} / {total}
            </p>
            <p className="text-slate-500 mt-1">({percent.toFixed(1)} %)</p>
          </div>

          {/* Histogram - 9 colored class bands */}
          <div>
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-2">Performance</p>
            <Histogram stanine={stanine} />
            <p className="text-xs text-slate-500 text-center mt-2">Votre classe : <strong>{userClass}</strong></p>
          </div>

          {/* Progression chart */}
          {perfEntries.length >= 2 && (
            <div className="border-t pt-4">
              <p className="text-sm font-medium text-slate-500 mb-2 text-center">Progression</p>
              <div className="flex justify-center">
                <MiniPerformanceChart entries={perfEntries} exerciseId={EXERCISE_ID} />
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex flex-col gap-3">
            <Button size="lg" className="w-full" onClick={onReview}>
              <Eye className="mr-2 h-5 w-5" /> Revoir les reponses
            </Button>
            <Button variant="outline" size="lg" className="w-full" onClick={onReplay}>
              <RotateCcw className="mr-2 h-5 w-5" /> Refaire
            </Button>
            <Button variant="outline" size="lg" className="w-full" onClick={onMenu}>
              <ArrowLeft className="mr-2 h-5 w-5" /> Menu
            </Button>
            <Button variant="ghost" size="lg" className="w-full" onClick={onHome}>
              <Home className="mr-2 h-5 w-5" /> Accueil
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Histogram({ stanine }: { stanine: number }) {
  // 9 bands, each colored. The user's band is highlighted with a darker border + arrow above.
  return (
    <div className="w-full">
      <div className="flex h-32 rounded-md overflow-hidden border border-slate-200">
        {STANINE_COLORS.map((color, i) => {
          const cls = i + 1;
          const isUser = cls === stanine;
          // Bell-shaped relative bar heights (centered around class 5)
          const heights = [25, 45, 65, 85, 100, 85, 65, 45, 25];
          const heightPct = heights[i];
          return (
            <div
              key={cls}
              className="flex-1 flex flex-col justify-end relative"
              style={{ backgroundColor: color, opacity: isUser ? 1 : 0.55 }}
            >
              <div
                className="w-full bg-black/15"
                style={{ height: `${heightPct}%` }}
              />
              {isUser && (
                <div className="absolute inset-0 border-2 border-slate-900 pointer-events-none" />
              )}
              <div className="absolute top-1 left-0 right-0 text-center text-[10px] font-bold text-slate-900/70">
                {cls}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex text-[10px] text-slate-500 mt-1">
        {STANINE_COLORS.map((_, i) => (
          <div key={i} className="flex-1 text-center">
            {i === 0 && '0%'}
            {i === 4 && '50%'}
            {i === 8 && '100%'}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Review screen — walk through each question with correction arcs
// ============================================================================

function ReviewScreen(props: {
  questions: Question[];
  answers: Record<number, string>;
  reviewIdx: number;
  onPrev: () => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const { questions, answers, reviewIdx, onPrev, onNext, onBack } = props;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const width = 1280;
  const height = 720;

  const q = questions[reviewIdx];
  const rawAnswer = answers[reviewIdx];
  const userAnswerParsed = rawAnswer !== undefined ? parseInt(rawAnswer, 10) : NaN;
  const userAnswerNormalized = !isNaN(userAnswerParsed)
    ? ((userAnswerParsed % 360) + 360) % 360
    : null;
  const isCorrect = userAnswerNormalized !== null && userAnswerNormalized === q.correctAngle;
  const isAnswered = userAnswerNormalized !== null;

  const [imgTick, setImgTick] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    renderQuestionToCanvas(ctx, width, height, q, {
      showCorrection: true,
      userAnswer: userAnswerNormalized,
      onImageLoad: () => setImgTick(t => t + 1),
    });
  }, [q, userAnswerNormalized, width, height, imgTick]);

  const levelName = `Niveau ${q.level}`;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white p-4">
      <div className="relative w-full max-w-[1280px]" style={{ aspectRatio: `${width} / ${height}` }}>
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="w-full h-full block"
        />

        {/* Top-left: back to results */}
        <div className="absolute top-2 left-2">
          <button
            type="button"
            onClick={onBack}
            className="bg-slate-200 hover:bg-slate-300 text-slate-800 text-sm px-3 py-1.5 rounded-sm flex items-center gap-1"
          >
            <ArrowLeft className="h-4 w-4" /> Resultats
          </button>
        </div>

        {/* Top-center: question title and level */}
        <div
          className="absolute text-xs text-slate-500 font-medium"
          style={{ top: 14, left: '50%', transform: 'translateX(-50%)' }}
        >
          Question {reviewIdx + 1} / {questions.length} — {levelName}
        </div>

        {/* Feedback pill (under the visual zone) */}
        <div
          className="absolute"
          style={{
            left: '50%',
            top: `${(500 / height) * 100}%`,
            transform: 'translateX(-50%)',
          }}
        >
          <div
            className={
              'border rounded px-3 py-1 text-sm font-medium flex items-center gap-2 ' +
              (isCorrect
                ? 'border-green-500 bg-green-50 text-green-700'
                : isAnswered
                  ? 'border-red-500 bg-red-50 text-red-700'
                  : 'border-slate-400 bg-slate-50 text-slate-600')
            }
          >
            {isCorrect ? (
              <>
                <Check className="h-4 w-4" />
                <span>Correct : {q.correctAngle}°</span>
              </>
            ) : isAnswered ? (
              <>
                <span>Votre reponse : <strong>{userAnswerNormalized}°</strong></span>
                <span className="text-slate-400">|</span>
                <span>Bonne reponse : <strong className="text-green-700">{q.correctAngle}°</strong></span>
              </>
            ) : (
              <>
                <span>Pas de reponse</span>
                <span className="text-slate-400">|</span>
                <span>Bonne reponse : <strong className="text-green-700">{q.correctAngle}°</strong></span>
              </>
            )}
          </div>
        </div>

        {/* Legend (small caption at bottom, above bottom bar) */}
        <div
          className="absolute text-[11px] text-slate-600 flex items-center gap-4"
          style={{ left: '50%', bottom: 44, transform: 'translateX(-50%)' }}
        >
          <span className="flex items-center gap-1">
            <span className="inline-block w-4 h-[2px] bg-green-600" />
            Arc vert = angle correct
          </span>
          {isAnswered && !isCorrect && (
            <span className="flex items-center gap-1">
              <span className="inline-block w-4 h-[2px] border-t-2 border-dashed border-red-600" />
              Arc rouge = votre reponse
            </span>
          )}
        </div>

        {/* Bottom-left: question number */}
        <div
          className="absolute flex items-center gap-3 text-sm text-slate-700 px-3"
          style={{ left: 0, bottom: 0, height: `${(36 / height) * 100}%` }}
        >
          <Eye className="h-4 w-4" />
          <span>{reviewIdx + 1} / {questions.length}</span>
        </div>

        {/* Bottom-right: Prev / Next / Retour */}
        <div
          className="absolute flex items-center gap-2"
          style={{ right: 8, bottom: 4 }}
        >
          <button
            type="button"
            onClick={onPrev}
            disabled={reviewIdx === 0}
            className="bg-sky-500 hover:bg-sky-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm px-3 py-1.5 rounded-sm flex items-center gap-1"
          >
            <ArrowLeft className="h-4 w-4" /> Precedent
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={reviewIdx === questions.length - 1}
            className="bg-sky-500 hover:bg-sky-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm px-3 py-1.5 rounded-sm flex items-center gap-1"
          >
            Suivant <Check className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

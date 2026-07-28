'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { savePerformanceResult, loadEntries, scoreToStanine } from '@/lib/core/PerformanceTracker';
import { MiniPerformanceChart } from '@/components/PerformanceChart';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Play, Settings, RotateCcw, Home } from 'lucide-react';

// ============================================================================
// Types & constants
// ============================================================================

type GameState = 'menu' | 'settings' | 'playing' | 'results';
type Axis = 'x' | 'y' | 'z';

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

interface ColoredCube {
  pos: Vec3;
  color: string;
}

interface Structure {
  cubes: ColoredCube[];
}

interface Question {
  structures: [Structure, Structure, Structure];
  answer: 1 | 2 | 3;
}

interface GameSettings {
  numQuestions: number;
  timePerQuestionSec: number;
}

interface AnswerRecord {
  selected: number | null;
  correct: boolean;
  timeMs: number;
}

const EXERCISE_ID = 'empilements';
const SETTINGS_KEY = 'aviatest-empilements-settings';

const DEFAULT_SETTINGS: GameSettings = {
  numQuestions: 20,
  timePerQuestionSec: 10,
};

const CUBE_COLORS = [
  '#e74c3c',
  '#3498db',
  '#2ecc71',
  '#f39c12',
  '#9b59b6',
  '#1abc9c',
  '#e67e22',
];

const NEIGHBORS: Vec3[] = [
  { x: 1, y: 0, z: 0 },
  { x: -1, y: 0, z: 0 },
  { x: 0, y: 1, z: 0 },
  { x: 0, y: -1, z: 0 },
  { x: 0, y: 0, z: 1 },
  { x: 0, y: 0, z: -1 },
];

// ============================================================================
// Settings persistence
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

function saveSettingsLocal(s: GameSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

// ============================================================================
// Polycube generation & transforms
// ============================================================================

function posKey(p: Vec3): string {
  return `${p.x},${p.y},${p.z}`;
}

function rotatePos(p: Vec3, axis: Axis, steps: number): Vec3 {
  let { x, y, z } = p;
  const n = ((steps % 4) + 4) % 4;
  for (let i = 0; i < n; i++) {
    if (axis === 'x') {
      const ny = -z;
      z = y;
      y = ny;
    } else if (axis === 'y') {
      const nx = z;
      z = -x;
      x = nx;
    } else {
      const nx = -y;
      y = x;
      x = nx;
    }
  }
  return { x, y, z };
}

function mirrorPos(p: Vec3, axis: Axis): Vec3 {
  if (axis === 'x') return { x: -p.x, y: p.y, z: p.z };
  if (axis === 'y') return { x: p.x, y: -p.y, z: p.z };
  return { x: p.x, y: p.y, z: -p.z };
}

function normalizeStructure(cubes: ColoredCube[]): Structure {
  if (cubes.length === 0) return { cubes: [] };
  const minX = Math.min(...cubes.map((c) => c.pos.x));
  const minY = Math.min(...cubes.map((c) => c.pos.y));
  const minZ = Math.min(...cubes.map((c) => c.pos.z));
  return {
    cubes: cubes.map((c) => ({
      color: c.color,
      pos: {
        x: c.pos.x - minX,
        y: c.pos.y - minY,
        z: c.pos.z - minZ,
      },
    })),
  };
}

function transformStructure(
  base: ColoredCube[],
  mirror: boolean,
  mirrorAxis: Axis,
  rotAxis: Axis,
  rotSteps: number,
): Structure {
  let cubes = base.map((c) => ({ ...c, pos: { ...c.pos } }));
  if (mirror) {
    cubes = cubes.map((c) => ({
      ...c,
      pos: mirrorPos(c.pos, mirrorAxis),
    }));
  }
  cubes = cubes.map((c) => ({
    ...c,
    pos: rotatePos(c.pos, rotAxis, rotSteps),
  }));
  return normalizeStructure(cubes);
}

function generatePolycube(count: number): ColoredCube[] {
  const positions: Vec3[] = [{ x: 0, y: 0, z: 0 }];
  const occupied = new Set(['0,0,0']);

  while (positions.length < count) {
    const base = positions[Math.floor(Math.random() * positions.length)];
    const dir = NEIGHBORS[Math.floor(Math.random() * NEIGHBORS.length)];
    const next = {
      x: base.x + dir.x,
      y: base.y + dir.y,
      z: base.z + dir.z,
    };
    const key = posKey(next);
    if (!occupied.has(key)) {
      occupied.add(key);
      positions.push(next);
    }
  }

  return positions.map((pos, i) => ({
    pos,
    color: CUBE_COLORS[i % CUBE_COLORS.length],
  }));
}

function randomRotation(): { axis: Axis; steps: number } {
  const axes: Axis[] = ['x', 'y', 'z'];
  return {
    axis: axes[Math.floor(Math.random() * axes.length)],
    steps: 1 + Math.floor(Math.random() * 3),
  };
}

function generateQuestion(): Question {
  const cubeCount = 4 + Math.floor(Math.random() * 4);
  const base = generatePolycube(cubeCount);
  const mirrorIndex = Math.floor(Math.random() * 3) as 0 | 1 | 2;
  const mirrorAxis: Axis = Math.random() < 0.5 ? 'x' : 'z';

  const rotations = [randomRotation(), randomRotation(), randomRotation()];

  const structures = [0, 1, 2].map((i) => {
    const rot = rotations[i];
    return transformStructure(
      base,
      i === mirrorIndex,
      mirrorAxis,
      rot.axis,
      rot.steps,
    );
  }) as [Structure, Structure, Structure];

  return {
    structures,
    answer: (mirrorIndex + 1) as 1 | 2 | 3,
  };
}

function generateAllQuestions(count: number): Question[] {
  return Array.from({ length: count }, () => generateQuestion());
}

// ============================================================================
// Color helpers & isometric rendering
// ============================================================================

function shadeColor(hex: string, factor: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const mix = (c: number) =>
    Math.max(0, Math.min(255, Math.round(c * factor)));
  const toHex = (c: number) => c.toString(16).padStart(2, '0');
  return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`;
}

function toIso(x: number, y: number, z: number, w: number, h: number) {
  return {
    x: (x - z) * w,
    y: (x + z) * h * 0.5 - y * h * 1.15,
  };
}

function structureBounds(structure: Structure, cubeW: number, cubeH: number) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const cube of structure.cubes) {
    const { x, y, z } = cube.pos;
    const corners = [
      toIso(x, y, z, cubeW, cubeH),
      toIso(x + 1, y, z, cubeW, cubeH),
      toIso(x, y + 1, z, cubeW, cubeH),
      toIso(x, y, z + 1, cubeW, cubeH),
      toIso(x + 1, y + 1, z + 1, cubeW, cubeH),
    ];
    for (const p of corners) {
      minX = Math.min(minX, p.x - cubeW);
      maxX = Math.max(maxX, p.x + cubeW);
      minY = Math.min(minY, p.y - cubeH);
      maxY = Math.max(maxY, p.y + cubeH * 2);
    }
  }

  if (!Number.isFinite(minX)) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  }
  return { minX, maxX, minY, maxY };
}

function IsoStructure({
  structure,
  size = 140,
}: {
  structure: Structure;
  size?: number;
}) {
  const cubeW = 16;
  const cubeH = 10;
  const bounds = structureBounds(structure, cubeW, cubeH);
  const contentW = bounds.maxX - bounds.minX;
  const contentH = bounds.maxY - bounds.minY;
  const pad = 12;
  const viewW = size;
  const viewH = size;
  const scale = Math.min(
    (viewW - pad * 2) / Math.max(contentW, 1),
    (viewH - pad * 2) / Math.max(contentH, 1),
  );
  const offsetX = viewW / 2 - ((bounds.minX + bounds.maxX) / 2) * scale;
  const offsetY = viewH / 2 - ((bounds.minY + bounds.maxY) / 2) * scale;

  const sorted = [...structure.cubes].sort((a, b) => {
    const da = a.pos.x + a.pos.z - a.pos.y;
    const db = b.pos.x + b.pos.z - b.pos.y;
    return da - db;
  });

  return (
    <svg
      width={viewW}
      height={viewH}
      viewBox={`0 0 ${viewW} ${viewH}`}
      className="mx-auto"
      aria-hidden
    >
      {sorted.map((cube, idx) => {
        const { x, y, z } = cube.pos;
        const center = toIso(x + 0.5, y, z + 0.5, cubeW, cubeH);
        const cx = center.x * scale + offsetX;
        const cy = center.y * scale + offsetY;
        const w = cubeW * scale;
        const h = cubeH * scale;
        const top = shadeColor(cube.color, 1.18);
        const left = shadeColor(cube.color, 0.72);
        const right = shadeColor(cube.color, 0.9);
        const stroke = shadeColor(cube.color, 0.55);

        return (
          <g key={`${idx}-${x}-${y}-${z}`}>
            <polygon
              points={`${cx},${cy - h} ${cx + w},${cy - h / 2} ${cx},${cy} ${cx - w},${cy - h / 2}`}
              fill={top}
              stroke={stroke}
              strokeWidth={0.8}
            />
            <polygon
              points={`${cx - w},${cy - h / 2} ${cx},${cy} ${cx},${cy + h} ${cx - w},${cy + h - h / 2}`}
              fill={left}
              stroke={stroke}
              strokeWidth={0.8}
            />
            <polygon
              points={`${cx},${cy} ${cx + w},${cy - h / 2} ${cx + w},${cy + h - h / 2} ${cx},${cy + h}`}
              fill={right}
              stroke={stroke}
              strokeWidth={0.8}
            />
          </g>
        );
      })}
    </svg>
  );
}

// ============================================================================
// Main component
// ============================================================================

export default function EmpilementsTest() {
  const router = useRouter();
  const perfSavedRef = useRef(false);
  const questionStartRef = useRef(0);
  const advancingRef = useRef(false);

  const [gameState, setGameState] = useState<GameState>('menu');
  const [settings, setSettingsState] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_SETTINGS.timePerQuestionSec);
  const [feedback, setFeedback] = useState<{
    selected: number;
    correct: boolean;
  } | null>(null);

  useEffect(() => {
    setSettingsState(loadSettings());
  }, []);

  const setSettings = useCallback(
    (s: GameSettings | ((prev: GameSettings) => GameSettings)) => {
      setSettingsState((prev) => {
        const next = typeof s === 'function' ? s(prev) : s;
        saveSettingsLocal(next);
        return next;
      });
    },
    [],
  );

  const computeScore = useCallback(() => {
    const correct = answers.filter((a) => a.correct).length;
    return { correct, total: questions.length };
  }, [answers, questions.length]);

  const advanceQuestion = useCallback(
    (record: AnswerRecord) => {
      if (advancingRef.current) return;
      advancingRef.current = true;

      setAnswers((prev) => [...prev, record]);
      setFeedback(
        record.selected !== null
          ? { selected: record.selected, correct: record.correct }
          : null,
      );

      window.setTimeout(() => {
        setFeedback(null);
        advancingRef.current = false;

        if (currentIdx >= questions.length - 1) {
          setGameState('results');
        } else {
          setCurrentIdx((i) => i + 1);
          setTimeLeft(settings.timePerQuestionSec);
          questionStartRef.current = performance.now();
        }
      }, 550);
    },
    [currentIdx, questions.length, settings.timePerQuestionSec],
  );

  const startPlaying = useCallback(() => {
    perfSavedRef.current = false;
    advancingRef.current = false;
    const qs = generateAllQuestions(settings.numQuestions);
    setQuestions(qs);
    setAnswers([]);
    setCurrentIdx(0);
    setFeedback(null);
    setTimeLeft(settings.timePerQuestionSec);
    questionStartRef.current = performance.now();
    setGameState('playing');
  }, [settings]);

  const handleAnswer = useCallback(
    (choice: 1 | 2 | 3) => {
      if (feedback || advancingRef.current || gameState !== 'playing') return;
      const q = questions[currentIdx];
      if (!q) return;

      const timeMs = Math.round(performance.now() - questionStartRef.current);
      const correct = choice === q.answer;
      advanceQuestion({ selected: choice, correct, timeMs });
    },
    [feedback, gameState, questions, currentIdx, advanceQuestion],
  );

  // Per-question countdown
  useEffect(() => {
    if (gameState !== 'playing' || feedback) return;

    setTimeLeft(settings.timePerQuestionSec);
    questionStartRef.current = performance.now();

    const tick = window.setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    const timeout = window.setTimeout(() => {
      if (advancingRef.current) return;
      const timeMs = Math.round(performance.now() - questionStartRef.current);
      advanceQuestion({ selected: null, correct: false, timeMs });
    }, settings.timePerQuestionSec * 1000);

    return () => {
      window.clearInterval(tick);
      window.clearTimeout(timeout);
    };
  }, [
    gameState,
    currentIdx,
    feedback,
    settings.timePerQuestionSec,
    advanceQuestion,
  ]);

  useEffect(() => {
    if (gameState !== 'results' || perfSavedRef.current) return;
    perfSavedRef.current = true;
    const { correct, total } = computeScore();
    const avgTimeMs =
      answers.length > 0
        ? Math.round(
            answers.reduce((sum, a) => sum + a.timeMs, 0) / answers.length,
          )
        : 0;
    savePerformanceResult(EXERCISE_ID, correct, total, avgTimeMs);
  }, [gameState, computeScore, answers]);

  if (gameState === 'menu') {
    return (
      <MenuScreen
        settings={settings}
        onPlay={startPlaying}
        onSettings={() => setGameState('settings')}
        onBack={() => router.push('/')}
      />
    );
  }

  if (gameState === 'settings') {
    return (
      <SettingsScreen
        settings={settings}
        onChange={setSettings}
        onBack={() => setGameState('menu')}
      />
    );
  }

  if (gameState === 'results') {
    const { correct, total } = computeScore();
    const percent = total > 0 ? Math.round((correct / total) * 100) : 0;
    const stanine = scoreToStanine(percent);
    const perfEntries = loadEntries(EXERCISE_ID);

    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">Resultats</CardTitle>
            <Badge
              variant={
                percent >= 75 ? 'default' : percent >= 50 ? 'secondary' : 'destructive'
              }
              className="text-lg px-4 py-1"
            >
              Classe {stanine}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-6xl font-bold text-slate-700">{percent}%</p>
              <p className="text-slate-500">
                {correct} / {total} correctes
              </p>
            </div>
            {perfEntries.length >= 2 && (
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-slate-500 mb-2 text-center">
                  Progression
                </p>
                <div className="flex justify-center">
                  <MiniPerformanceChart entries={perfEntries} exerciseId={EXERCISE_ID} />
                </div>
              </div>
            )}
            <div className="flex flex-col gap-3">
              <Button size="lg" className="w-full" onClick={startPlaying}>
                <RotateCcw className="mr-2 h-5 w-5" /> Rejouer
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="w-full"
                onClick={() => setGameState('menu')}
              >
                <ArrowLeft className="mr-2 h-5 w-5" /> Menu
              </Button>
              <Button
                variant="ghost"
                size="lg"
                className="w-full"
                onClick={() => router.push('/')}
              >
                <Home className="mr-2 h-5 w-5" /> Accueil
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const q = questions[currentIdx];
  if (!q) return null;

  const progress = (currentIdx + 1) / questions.length;
  const timerRatio = timeLeft / settings.timePerQuestionSec;

  return (
    <div className="min-h-screen bg-[#e8e8e8] flex flex-col">
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between gap-4">
        <p className="text-sm font-medium text-slate-600">
          Question {currentIdx + 1} / {questions.length}
        </p>
        <p className="text-sm text-slate-500">
          Score : {answers.filter((a) => a.correct).length}
        </p>
        <p
          className={`text-sm font-semibold tabular-nums ${
            timeLeft <= 3 ? 'text-red-600' : 'text-slate-700'
          }`}
        >
          {timeLeft}s
        </p>
      </div>

      <div className="px-4 pt-2">
        <div className="h-2 bg-slate-300 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 linear ${
              timerRatio > 0.5
                ? 'bg-emerald-500'
                : timerRatio > 0.25
                  ? 'bg-amber-500'
                  : 'bg-red-500'
            }`}
            style={{ width: `${timerRatio * 100}%` }}
          />
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-6">
        <p className="text-center text-slate-700 font-medium max-w-xl">
          Parmi ces trois empilements, lequel est different des deux autres ?
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-4xl">
          {([1, 2, 3] as const).map((num) => {
            const structure = q.structures[num - 1];
            const isSelected = feedback?.selected === num;
            const showCorrect = feedback && num === q.answer;
            const showWrong = feedback && isSelected && !feedback.correct;

            let ringClass = 'ring-slate-300 hover:ring-slate-400';
            if (showCorrect) ringClass = 'ring-emerald-500 bg-emerald-50';
            else if (showWrong) ringClass = 'ring-red-500 bg-red-50';
            else if (isSelected) ringClass = 'ring-blue-400';

            return (
              <button
                key={num}
                type="button"
                disabled={!!feedback || advancingRef.current}
                onClick={() => handleAnswer(num)}
                className={`flex flex-col items-center rounded-xl bg-white shadow-sm ring-2 transition-all p-3 ${ringClass} disabled:cursor-default`}
              >
                <span className="text-lg font-bold text-slate-700 mb-2">{num}</span>
                <IsoStructure structure={structure} size={160} />
              </button>
            );
          })}
        </div>

        <div className="w-full max-w-4xl h-1.5 bg-slate-300 rounded-full overflow-hidden">
          <div
            className="h-full bg-slate-500 transition-all"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Menu & Settings
// ============================================================================

function MenuScreen({
  settings,
  onPlay,
  onSettings,
  onBack,
}: {
  settings: GameSettings;
  onPlay: () => void;
  onSettings: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">Empilements</CardTitle>
          <CardDescription className="text-lg">
            Reperez l&apos;empilement different (symetrie)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-2xl font-bold text-slate-700">{settings.numQuestions}</p>
              <p className="text-sm text-slate-500">Questions</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-2xl font-bold text-slate-700">
                {settings.timePerQuestionSec}s
              </p>
              <p className="text-sm text-slate-500">Par question</p>
            </div>
          </div>
          <p className="text-sm text-slate-500 text-center">
            Deux structures sont identiques a une rotation pres. La troisieme a subi une
            symetrie : cliquez sur celle qui differe.
          </p>
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

function SettingsScreen({
  settings,
  onChange,
  onBack,
}: {
  settings: GameSettings;
  onChange: (s: GameSettings | ((p: GameSettings) => GameSettings)) => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Parametres</CardTitle>
          <CardDescription>Empilements</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label>Nombre de questions : {settings.numQuestions}</Label>
              <Slider
                value={[settings.numQuestions]}
                onValueChange={([v]) =>
                  onChange((s) => ({ ...s, numQuestions: v }))
                }
                min={5}
                max={40}
                step={5}
                className="mt-2"
              />
            </div>
            <div>
              <Label>Temps par question : {settings.timePerQuestionSec}s</Label>
              <Slider
                value={[settings.timePerQuestionSec]}
                onValueChange={([v]) =>
                  onChange((s) => ({ ...s, timePerQuestionSec: v }))
                }
                min={5}
                max={30}
                step={1}
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

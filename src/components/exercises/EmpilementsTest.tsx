'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { savePerformanceResult } from '@/lib/core/PerformanceTracker';
import {
  CorrectionBanner,
  ExerciseMenu,
  ExerciseResults,
  ExerciseSettings,
  PlayHeader,
  SettingSlider,
} from '@/components/exercises/shell';
import { CATALOG_COLORS } from '@/lib/3d/shapeCatalog';
import { usePhoneLayout } from '@/components/phone/PhoneLayout';

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
  examMode: boolean;
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
  examMode: false,
};

const FEEDBACK_MS_TRAINING = 1800;
const FEEDBACK_MS_EXAM = 400;

const CUBE_COLORS = CATALOG_COLORS;

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

function structureKey(structure: Structure): string {
  return structure.cubes
    .map((c) => `${c.color}:${c.pos.x},${c.pos.y},${c.pos.z}`)
    .sort()
    .join('|');
}

/** Smallest key among the 24 cube rotations — used to reject achiral piles. */
function rotationCanonicalKey(cubes: ColoredCube[]): string {
  const seen = new Set<string>();
  const queue: ColoredCube[][] = [cubes.map((c) => ({ color: c.color, pos: { ...c.pos } }))];

  while (queue.length > 0) {
    const cur = queue.pop()!;
    const norm = normalizeStructure(cur).cubes;
    const k = structureKey({ cubes: norm });
    if (seen.has(k)) continue;
    seen.add(k);
    for (const axis of ['x', 'y', 'z'] as Axis[]) {
      queue.push(
        norm.map((c) => ({
          color: c.color,
          pos: rotatePos(c.pos, axis, 1),
        })),
      );
    }
  }

  return [...seen].sort()[0];
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
  let last: Question | null = null;

  for (let attempt = 0; attempt < 80; attempt++) {
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

    last = { structures, answer: (mirrorIndex + 1) as 1 | 2 | 3 };

    const keys = structures.map(structureKey);
    if (new Set(keys).size !== 3) continue;

    const mirrored = base.map((c) => ({
      color: c.color,
      pos: mirrorPos(c.pos, mirrorAxis),
    }));
    if (rotationCanonicalKey(base) === rotationCanonicalKey(mirrored)) continue;

    return last;
  }

  return last!;
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
  size = 220,
}: {
  structure: Structure;
  size?: number;
}) {
  const cubeW = 24;
  const cubeH = 15;
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
      className="mx-auto h-auto w-full max-w-[320px]"
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
  const phone = usePhoneLayout();
  const perfSavedRef = useRef(false);
  const questionStartRef = useRef(0);
  const advancingRef = useRef(false);
  const settingsRef = useRef<GameSettings>(DEFAULT_SETTINGS);

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
    const loaded = loadSettings();
    setSettingsState(loaded);
    settingsRef.current = loaded;
  }, []);

  const setSettings = useCallback(
    (s: GameSettings | ((prev: GameSettings) => GameSettings)) => {
      setSettingsState((prev) => {
        const next = typeof s === 'function' ? s(prev) : s;
        settingsRef.current = next;
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

      const examMode = settingsRef.current.examMode;
      if (!examMode) {
        setFeedback(
          record.selected !== null
            ? { selected: record.selected, correct: record.correct }
            : { selected: -1, correct: false },
        );
      }

      const delay = examMode ? FEEDBACK_MS_EXAM : FEEDBACK_MS_TRAINING;

      window.setTimeout(() => {
        setFeedback(null);
        advancingRef.current = false;

        if (currentIdx >= questions.length - 1) {
          setGameState('results');
        } else {
          setCurrentIdx((i) => i + 1);
          setTimeLeft(settingsRef.current.timePerQuestionSec);
          questionStartRef.current = performance.now();
        }
      }, delay);
    },
    [currentIdx, questions.length],
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
    return (
      <ExerciseResults
        exerciseId={EXERCISE_ID}
        percent={percent}
        detail={`${correct} / ${total} correctes`}
        onReplay={startPlaying}
        onMenu={() => setGameState('menu')}
        onHome={() => router.push('/')}
      />
    );
  }

  const q = questions[currentIdx];
  if (!q) return null;

  const progress = (currentIdx + 1) / questions.length;
  const timerRatio = timeLeft / settings.timePerQuestionSec;

  return (
    <div className="min-h-screen bg-[#fbfaf9] flex flex-col">
      <PlayHeader
        questionLabel={`Question ${currentIdx + 1} / ${questions.length}`}
        score={`Score : ${answers.filter((a) => a.correct).length}`}
        timeLeft={`${timeLeft}s`}
        timerRatio={timerRatio}
      />

      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-6">
        <p className="text-center text-[#37322f] font-medium text-lg max-w-xl">
          Parmi ces trois empilements, lequel est différent des deux autres ?
        </p>
        {feedback && !settings.examMode && (
          <CorrectionBanner
            outcome={
              feedback.selected == null ? 'timeout' : feedback.correct ? 'correct' : 'incorrect'
            }
            expected={q.answer}
          />
        )}

        <div className="grid grid-cols-3 gap-2 sm:gap-4 w-full max-w-4xl">
          {([1, 2, 3] as const).map((num) => {
            const structure = q.structures[num - 1];
            const isSelected = feedback?.selected === num;
            const showCorrect = feedback && !settings.examMode && num === q.answer;
            const showWrong = feedback && !settings.examMode && isSelected && !feedback.correct;

            let ringClass = 'ring-[#e0dedb] hover:ring-[#cfcac4]';
            if (showCorrect) ringClass = 'ring-emerald-500 bg-emerald-50';
            else if (showWrong) ringClass = 'ring-red-500 bg-red-50';
            else if (isSelected) ringClass = 'ring-blue-400';

            return (
              <button
                key={num}
                type="button"
                disabled={!!feedback || advancingRef.current}
                onClick={() => handleAnswer(num)}
                className={`flex min-h-16 flex-col items-center rounded-xl bg-white shadow-sm ring-2 transition-all p-2 sm:p-3 ${ringClass} disabled:cursor-default`}
              >
                <span className="mb-1 font-bold text-[#37322f] text-lg sm:mb-2">{num}</span>
                <IsoStructure structure={structure} size={phone ? 108 : 200} />
              </button>
            );
          })}
        </div>

        <div className="w-full max-w-4xl h-1.5 bg-slate-300 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#37322f] transition-all"
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
    <ExerciseMenu
      title="Empilements"
      subtitle="Repérez l'empilement différent (symétrie)"
      stats={[
        { value: settings.numQuestions, label: 'Questions' },
        { value: `${settings.timePerQuestionSec}s`, label: 'Par question' },
      ]}
      examMode={settings.examMode}
      onPlay={onPlay}
      onSettings={onSettings}
      onBack={onBack}
    >
      <p className="text-center text-sm text-[#605a57]">
        Deux structures sont identiques à une rotation près. La troisième a subi une
        symétrie : cliquez sur celle qui diffère.
      </p>
    </ExerciseMenu>
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
    <ExerciseSettings
      description="Empilements"
      examMode={{
        checked: settings.examMode,
        onCheckedChange: (v) => onChange((s) => ({ ...s, examMode: v })),
      }}
      onBack={onBack}
    >
      <SettingSlider
        label="Nombre de questions"
        value={settings.numQuestions}
        min={5}
        max={40}
        step={5}
        onChange={(v) => onChange((s) => ({ ...s, numQuestions: v }))}
      />
      <SettingSlider
        label="Temps par question"
        value={settings.timePerQuestionSec}
        min={5}
        max={30}
        step={1}
        format={(v) => `${v}s`}
        onChange={(v) => onChange((s) => ({ ...s, timePerQuestionSec: v }))}
      />
    </ExerciseSettings>
  );
}

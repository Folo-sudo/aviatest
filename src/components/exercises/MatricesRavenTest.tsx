'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { savePerformanceResult, loadEntries } from '@/lib/core/PerformanceTracker';
import { MiniPerformanceChart } from '@/components/PerformanceChart';
import { ClassScoreBlock } from '@/components/ClassScoreBlock';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Play, RotateCcw, Home, Settings, CheckCircle2, XCircle, ChevronRight } from 'lucide-react';
import { usePhoneLayout } from '@/components/phone/PhoneLayout';

// ============================================================================
// Types
// ============================================================================

type GameState = 'menu' | 'settings' | 'playing' | 'correction' | 'results';
type ShapeKind = 'circle' | 'square' | 'triangle' | 'diamond' | 'pentagon' | 'star';
type FillStyle = 'empty' | 'half' | 'full' | 'dots' | 'lines';

interface CellFigure {
  shapes: ShapeElement[];
  overlay?: OverlayMark;
}

interface ShapeElement {
  shape: ShapeKind;
  fill: FillStyle;
  rotation: number;
  size: 'small' | 'medium' | 'large';
}

interface OverlayMark {
  type: 'diagonal' | 'cross' | 'dot';
}

interface RuleInfo {
  facet: string;
  label: string;
  explanation: string;
}

interface RavenQuestion {
  matrix: (CellFigure | null)[];
  choices: CellFigure[];
  correctIdx: number;
  rules: RuleInfo[];
  difficulty: number;
}

interface GameSettings {
  numQuestions: number;
  timePerQuestion: number;
  examMode: boolean;
}

interface QuestionResult {
  selected: number | null;
  correct: boolean;
  timeMs: number;
}

// ============================================================================
// Constants
// ============================================================================

const EXERCISE_ID = 'matrices-raven';
const SETTINGS_KEY = 'aviatest-matrices-raven-settings';
const SLATE_BG = 'bg-[#fbfaf9]';
const CELL = 72;

const DEFAULT_SETTINGS: GameSettings = {
  numQuestions: 12,
  timePerQuestion: 60,
  examMode: false,
};

const SHAPES: ShapeKind[] = ['circle', 'square', 'triangle', 'diamond', 'pentagon', 'star'];
const FILLS: FillStyle[] = ['empty', 'half', 'full', 'dots', 'lines'];
const ROTATIONS = [0, 45, 90, 135, 180, 225, 270, 315];
const SIZES: ('small' | 'medium' | 'large')[] = ['small', 'medium', 'large'];

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

function saveSettingsLocal(s: GameSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

function figureKey(fig: CellFigure): string {
  return JSON.stringify(fig);
}

function cloneFigure(fig: CellFigure): CellFigure {
  return JSON.parse(JSON.stringify(fig));
}

// ============================================================================
// Puzzle Generators by Facet
// ============================================================================

type GeneratorResult = { matrix: (CellFigure | null)[]; answer: CellFigure; rules: RuleInfo[] };

// --- PROGRESSION QUANTITATIVE ---
function generateProgression(): GeneratorResult {
  const baseShape = pick(SHAPES.slice(0, 4));
  const baseFill = pick(FILLS.slice(0, 3));
  const baseRot = pick([0, 90]);
  const startCount = randInt(1, 2);
  const step = pick([1, 1, 2]);
  const byRow = Math.random() < 0.5;

  const matrix: (CellFigure | null)[] = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (r === 2 && c === 2) {
        matrix.push(null);
        continue;
      }
      const idx = byRow ? c : r;
      const count = startCount + idx * step;
      const shapes: ShapeElement[] = [];
      for (let i = 0; i < Math.min(count, 5); i++) {
        shapes.push({ shape: baseShape, fill: baseFill, rotation: baseRot, size: 'medium' });
      }
      matrix.push({ shapes });
    }
  }

  const answerCount = startCount + 2 * step;
  const answerShapes: ShapeElement[] = [];
  for (let i = 0; i < Math.min(answerCount, 5); i++) {
    answerShapes.push({ shape: baseShape, fill: baseFill, rotation: baseRot, size: 'medium' });
  }

  const dir = byRow ? 'colonne' : 'ligne';
  const explanation = `Progression : le nombre d'elements augmente de ${step} par ${dir} (${startCount} -> ${startCount + step} -> ${answerCount})`;

  return {
    matrix,
    answer: { shapes: answerShapes },
    rules: [{ facet: 'progression', label: 'Progression quantitative', explanation }],
  };
}

// --- ROTATION ---
function generateRotation(): GeneratorResult {
  const baseShape = pick(['triangle', 'square', 'diamond', 'pentagon'] as ShapeKind[]);
  const baseFill = pick(FILLS.slice(0, 3));
  const startRot = pick([0, 45, 90]);
  const rotStep = pick([45, 90, 90]);
  const byRow = Math.random() < 0.5;

  const matrix: (CellFigure | null)[] = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (r === 2 && c === 2) {
        matrix.push(null);
        continue;
      }
      const idx = byRow ? c : r;
      const rot = mod(startRot + idx * rotStep, 360);
      matrix.push({ shapes: [{ shape: baseShape, fill: baseFill, rotation: rot, size: 'large' }] });
    }
  }

  const answerRot = mod(startRot + 2 * rotStep, 360);
  const dir = byRow ? 'colonne' : 'ligne';
  const explanation = `Rotation : la figure tourne de ${rotStep} degres par ${dir}`;

  return {
    matrix,
    answer: { shapes: [{ shape: baseShape, fill: baseFill, rotation: answerRot, size: 'large' }] },
    rules: [{ facet: 'rotation', label: 'Rotation', explanation }],
  };
}

// --- SUPERPOSITION / ADDITION ---
function generateSuperposition(): GeneratorResult {
  const shape1 = pick(SHAPES.slice(0, 4));
  const shape2 = pick(SHAPES.slice(0, 4).filter((s) => s !== shape1));
  const fill = pick(FILLS.slice(0, 3));

  const matrix: (CellFigure | null)[] = [];
  const rowConfigs: [boolean, boolean][] = [];

  for (let r = 0; r < 3; r++) {
    const has1 = r === 0 || (r === 1 && Math.random() < 0.5) || r === 2;
    const has2 = r === 1 || (r === 0 && Math.random() < 0.5);
    rowConfigs.push([has1, has2]);
  }

  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (r === 2 && c === 2) {
        matrix.push(null);
        continue;
      }
      const shapes: ShapeElement[] = [];
      if (c === 0) {
        shapes.push({ shape: shape1, fill, rotation: 0, size: 'medium' });
      } else if (c === 1) {
        shapes.push({ shape: shape2, fill, rotation: 0, size: 'medium' });
      } else {
        shapes.push({ shape: shape1, fill, rotation: 0, size: 'medium' });
        shapes.push({ shape: shape2, fill, rotation: 0, size: 'small' });
      }
      matrix.push({ shapes });
    }
  }

  const explanation = `Superposition : la 3e case contient l'union des elements des 2 premieres cases`;

  return {
    matrix,
    answer: {
      shapes: [
        { shape: shape1, fill, rotation: 0, size: 'medium' },
        { shape: shape2, fill, rotation: 0, size: 'small' },
      ],
    },
    rules: [{ facet: 'superposition', label: 'Superposition / Addition', explanation }],
  };
}

// --- SOUSTRACTION ---
function generateSoustraction(): GeneratorResult {
  const shape1 = pick(SHAPES.slice(0, 4));
  const shape2 = pick(SHAPES.slice(0, 4).filter((s) => s !== shape1));
  const fill = pick(FILLS.slice(0, 3));

  const matrix: (CellFigure | null)[] = [];

  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (r === 2 && c === 2) {
        matrix.push(null);
        continue;
      }
      const shapes: ShapeElement[] = [];
      if (c === 0) {
        shapes.push({ shape: shape1, fill, rotation: 0, size: 'medium' });
        shapes.push({ shape: shape2, fill, rotation: 0, size: 'small' });
      } else if (c === 1) {
        shapes.push({ shape: shape2, fill, rotation: 0, size: 'medium' });
      } else {
        shapes.push({ shape: shape1, fill, rotation: 0, size: 'medium' });
      }
      matrix.push({ shapes });
    }
  }

  const explanation = `Soustraction : la 3e case = 1ere case moins la 2e case (on retire ${shape2})`;

  return {
    matrix,
    answer: { shapes: [{ shape: shape1, fill, rotation: 0, size: 'medium' }] },
    rules: [{ facet: 'soustraction', label: 'Soustraction', explanation }],
  };
}

// --- XOR / DIFFERENCE SYMETRIQUE ---
function generateXOR(): GeneratorResult {
  const shapes3 = shuffle(SHAPES.slice(0, 4)).slice(0, 3) as ShapeKind[];
  const fill = pick(FILLS.slice(0, 3));

  // Column 0 shows {rowShapes[0], rowShapes[1]}, column 1 shows
  // {rowShapes[1], rowShapes[2]}. Their symmetric difference (XOR) cancels
  // the shared middle shape, leaving {rowShapes[0], rowShapes[2]}.
  const xorCell = (rowShapes: ShapeKind[]): ShapeElement[] => [
    { shape: rowShapes[0], fill, rotation: 0, size: 'medium' },
    { shape: rowShapes[2], fill, rotation: 0, size: 'medium' },
  ];

  const matrix: (CellFigure | null)[] = [];
  const rowShapesByRow: ShapeKind[][] = [];

  for (let r = 0; r < 3; r++) {
    const rowShapes = shuffle(shapes3) as ShapeKind[];
    rowShapesByRow.push(rowShapes);
    for (let c = 0; c < 3; c++) {
      if (r === 2 && c === 2) {
        matrix.push(null);
        continue;
      }
      if (c === 0) {
        matrix.push({
          shapes: [
            { shape: rowShapes[0], fill, rotation: 0, size: 'medium' },
            { shape: rowShapes[1], fill, rotation: 0, size: 'small' },
          ],
        });
      } else if (c === 1) {
        matrix.push({
          shapes: [
            { shape: rowShapes[1], fill, rotation: 0, size: 'medium' },
            { shape: rowShapes[2], fill, rotation: 0, size: 'small' },
          ],
        });
      } else {
        matrix.push({ shapes: xorCell(rowShapes) });
      }
    }
  }

  const lastRow = rowShapesByRow[2];
  const explanation = `XOR : la 3e case contient les elements presents dans une seule des 2 premieres cases (difference symetrique) — ${lastRow[0]} et ${lastRow[2]} restent, ${lastRow[1]} (commun aux deux) disparait.`;

  return {
    matrix,
    answer: { shapes: xorCell(lastRow) },
    rules: [{ facet: 'xor', label: 'XOR / Difference symetrique', explanation }],
  };
}

// --- DISTRIBUTION (Latin Square) ---
function generateDistribution(): GeneratorResult {
  const threeShapes = shuffle(SHAPES.slice(0, 4)).slice(0, 3) as ShapeKind[];
  const threeFills = shuffle(FILLS.slice(0, 3)) as FillStyle[];
  const fill = pick(threeFills);

  const latinRow = [
    [0, 1, 2],
    [1, 2, 0],
    [2, 0, 1],
  ];
  const permutation = shuffle([0, 1, 2]);
  const permutedLatin = latinRow.map((row) => permutation.map((p) => row[p]));

  const matrix: (CellFigure | null)[] = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (r === 2 && c === 2) {
        matrix.push(null);
        continue;
      }
      const shapeIdx = permutedLatin[r][c];
      matrix.push({
        shapes: [{ shape: threeShapes[shapeIdx], fill, rotation: 0, size: 'large' }],
      });
    }
  }

  const answerShapeIdx = permutedLatin[2][2];
  const explanation = `Distribution : chaque forme (${threeShapes.join(', ')}) apparait exactement une fois par ligne et par colonne (carre latin)`;

  return {
    matrix,
    answer: { shapes: [{ shape: threeShapes[answerShapeIdx], fill, rotation: 0, size: 'large' }] },
    rules: [{ facet: 'distribution', label: 'Distribution des trois valeurs', explanation }],
  };
}

// --- VARIATION D'ATTRIBUT MULTIPLE ---
function generateMultiAttribute(): GeneratorResult {
  const shapes2 = shuffle(SHAPES.slice(0, 4)).slice(0, 2) as ShapeKind[];
  const fills2 = shuffle(FILLS.slice(0, 3)).slice(0, 2) as FillStyle[];
  const sizes2: ('small' | 'large')[] = ['small', 'large'];

  const matrix: (CellFigure | null)[] = [];
  const configs: [number, number, number][] = [];

  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const shapeIdx = (r + c) % 2;
      const fillIdx = r % 2;
      const sizeIdx = c % 2;
      configs.push([shapeIdx, fillIdx, sizeIdx]);
    }
  }

  for (let i = 0; i < 9; i++) {
    if (i === 8) {
      matrix.push(null);
      continue;
    }
    const [si, fi, szi] = configs[i];
    matrix.push({
      shapes: [
        {
          shape: shapes2[si],
          fill: fills2[fi],
          rotation: 0,
          size: sizes2[szi] === 'small' ? 'small' : 'large',
        },
      ],
    });
  }

  const [asi, afi, aszi] = configs[8];
  const explanation = `Variation multiple : la forme alterne (${shapes2[0]}/${shapes2[1]}), le remplissage alterne par ligne, la taille alterne par colonne`;

  return {
    matrix,
    answer: {
      shapes: [
        {
          shape: shapes2[asi],
          fill: fills2[afi],
          rotation: 0,
          size: sizes2[aszi] === 'small' ? 'small' : 'large',
        },
      ],
    },
    rules: [{ facet: 'multi-attribut', label: 'Variation d\'attribut multiple', explanation }],
  };
}

// --- SYMETRIE / REFLEXION ---
function generateSymmetry(): GeneratorResult {
  const baseShape = pick(SHAPES.slice(0, 4));
  const fill = pick(FILLS.slice(0, 3));

  const rowPositions = [
    ['left', 'center', 'right'],
    ['right', 'center', 'left'],
    ['left', 'center', 'right'],
  ];

  const matrix: (CellFigure | null)[] = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (r === 2 && c === 2) {
        matrix.push(null);
        continue;
      }
      const pos = rowPositions[r][c];
      const rot = pos === 'left' ? 270 : pos === 'right' ? 90 : 0;
      matrix.push({
        shapes: [{ shape: baseShape, fill, rotation: rot, size: 'large' }],
      });
    }
  }

  const answerRot = 90;
  const explanation = `Symetrie : les elements sont en miroir horizontal par rapport au centre de chaque ligne`;

  return {
    matrix,
    answer: { shapes: [{ shape: baseShape, fill, rotation: answerRot, size: 'large' }] },
    rules: [{ facet: 'symetrie', label: 'Symetrie / Reflexion', explanation }],
  };
}

// --- PROGRESSION COMPOSEE (2 rules) ---
function generateCompound(): GeneratorResult {
  const baseShape = pick(['triangle', 'square', 'diamond'] as ShapeKind[]);
  const baseFill = pick(FILLS.slice(0, 3));
  const startCount = 1;
  const countStep = 1;
  const startRot = 0;
  const rotStep = pick([45, 90]);

  const matrix: (CellFigure | null)[] = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (r === 2 && c === 2) {
        matrix.push(null);
        continue;
      }
      const count = startCount + c * countStep;
      const rot = mod(startRot + r * rotStep, 360);
      const shapes: ShapeElement[] = [];
      for (let i = 0; i < count; i++) {
        shapes.push({ shape: baseShape, fill: baseFill, rotation: rot, size: 'medium' });
      }
      matrix.push({ shapes });
    }
  }

  const answerCount = startCount + 2 * countStep;
  const answerRot = mod(startRot + 2 * rotStep, 360);
  const answerShapes: ShapeElement[] = [];
  for (let i = 0; i < answerCount; i++) {
    answerShapes.push({ shape: baseShape, fill: baseFill, rotation: answerRot, size: 'medium' });
  }

  return {
    matrix,
    answer: { shapes: answerShapes },
    rules: [
      { facet: 'progression', label: 'Progression quantitative', explanation: 'Le nombre augmente de 1 par colonne' },
      { facet: 'rotation', label: 'Rotation', explanation: `La figure tourne de ${rotStep} degres par ligne` },
    ],
  };
}

// ============================================================================
// Distractor Generation
// ============================================================================

function generateDistractors(answer: CellFigure, rules: RuleInfo[], count: number): CellFigure[] {
  const distractors: CellFigure[] = [];
  const seen = new Set<string>([figureKey(answer)]);

  const mutations: Array<(fig: CellFigure) => CellFigure | null> = [
    // Wrong count (off by one)
    (fig) => {
      const clone = cloneFigure(fig);
      if (clone.shapes.length > 1) {
        clone.shapes.pop();
      } else if (clone.shapes.length > 0) {
        clone.shapes.push({ ...clone.shapes[0] });
      }
      return clone;
    },
    // Wrong count (off by one, other direction)
    (fig) => {
      const clone = cloneFigure(fig);
      if (clone.shapes.length > 0 && clone.shapes.length < 5) {
        clone.shapes.push({ ...clone.shapes[0] });
      }
      return clone;
    },
    // Wrong rotation
    (fig) => {
      const clone = cloneFigure(fig);
      if (clone.shapes.length > 0) {
        clone.shapes[0].rotation = mod(clone.shapes[0].rotation + 45, 360);
      }
      return clone;
    },
    // Wrong rotation (opposite direction)
    (fig) => {
      const clone = cloneFigure(fig);
      if (clone.shapes.length > 0) {
        clone.shapes[0].rotation = mod(clone.shapes[0].rotation - 45, 360);
      }
      return clone;
    },
    // Wrong rotation (double)
    (fig) => {
      const clone = cloneFigure(fig);
      if (clone.shapes.length > 0) {
        clone.shapes[0].rotation = mod(clone.shapes[0].rotation + 90, 360);
      }
      return clone;
    },
    // Wrong shape
    (fig) => {
      const clone = cloneFigure(fig);
      if (clone.shapes.length > 0) {
        const otherShapes = SHAPES.filter((s) => s !== clone.shapes[0].shape);
        clone.shapes[0].shape = pick(otherShapes);
      }
      return clone;
    },
    // Wrong fill
    (fig) => {
      const clone = cloneFigure(fig);
      if (clone.shapes.length > 0) {
        const otherFills = FILLS.filter((f) => f !== clone.shapes[0].fill);
        clone.shapes[0].fill = pick(otherFills);
      }
      return clone;
    },
    // Wrong size
    (fig) => {
      const clone = cloneFigure(fig);
      if (clone.shapes.length > 0) {
        const otherSizes = SIZES.filter((s) => s !== clone.shapes[0].size);
        clone.shapes[0].size = pick(otherSizes);
      }
      return clone;
    },
    // Missing element (for superposition)
    (fig) => {
      const clone = cloneFigure(fig);
      if (clone.shapes.length > 1) {
        clone.shapes = [clone.shapes[0]];
      }
      return clone;
    },
    // Extra element
    (fig) => {
      const clone = cloneFigure(fig);
      if (clone.shapes.length > 0 && clone.shapes.length < 3) {
        const newShape = { ...clone.shapes[0] };
        newShape.shape = pick(SHAPES.filter((s) => s !== newShape.shape));
        newShape.size = 'small';
        clone.shapes.push(newShape);
      }
      return clone;
    },
  ];

  let attempts = 0;
  while (distractors.length < count && attempts < 100) {
    attempts++;
    const mutation = pick(mutations);
    const distractor = mutation(answer);
    if (!distractor) continue;

    const key = figureKey(distractor);
    if (!seen.has(key)) {
      seen.add(key);
      distractors.push(distractor);
    }
  }

  // Fallback: random variations if we don't have enough
  while (distractors.length < count) {
    const clone = cloneFigure(answer);
    if (clone.shapes.length > 0) {
      clone.shapes[0].shape = pick(SHAPES);
      clone.shapes[0].fill = pick(FILLS);
      clone.shapes[0].rotation = pick(ROTATIONS);
    }
    const key = figureKey(clone);
    if (!seen.has(key)) {
      seen.add(key);
      distractors.push(clone);
    }
  }

  return distractors.slice(0, count);
}

// ============================================================================
// Question Generator
// ============================================================================

const GENERATORS = [
  { fn: generateProgression, difficulty: 1 },
  { fn: generateRotation, difficulty: 1 },
  { fn: generateDistribution, difficulty: 2 },
  { fn: generateSuperposition, difficulty: 2 },
  { fn: generateSoustraction, difficulty: 2 },
  { fn: generateXOR, difficulty: 3 },
  { fn: generateSymmetry, difficulty: 3 },
  { fn: generateMultiAttribute, difficulty: 3 },
  { fn: generateCompound, difficulty: 4 },
];

function generateQuestion(targetDifficulty: number): RavenQuestion {
  // Filter generators by difficulty
  const eligible = GENERATORS.filter((g) => g.difficulty <= targetDifficulty);
  const weights = eligible.map((g) => (g.difficulty === targetDifficulty ? 3 : 1));
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  let chosen = eligible[0];
  let r = Math.random() * totalWeight;
  for (let i = 0; i < eligible.length; i++) {
    r -= weights[i];
    if (r <= 0) {
      chosen = eligible[i];
      break;
    }
  }

  const { matrix, answer, rules } = chosen.fn();

  // Generate principled distractors
  const distractors = generateDistractors(answer, rules, 5);

  // Insert correct answer at random position
  const correctIdx = randInt(0, distractors.length);
  const choices = [...distractors];
  choices.splice(correctIdx, 0, answer);

  return { matrix, choices, correctIdx, rules, difficulty: chosen.difficulty };
}

function generateQuestions(count: number): RavenQuestion[] {
  const questions: RavenQuestion[] = [];
  for (let i = 0; i < count; i++) {
    // Difficulty ramps up: first third easy, second third medium, last third hard
    const progress = i / count;
    let targetDifficulty: number;
    if (progress < 0.33) {
      targetDifficulty = pick([1, 1, 2]);
    } else if (progress < 0.66) {
      targetDifficulty = pick([2, 2, 3]);
    } else {
      targetDifficulty = pick([3, 3, 4]);
    }
    questions.push(generateQuestion(targetDifficulty));
  }
  return questions;
}

// ============================================================================
// SVG Figure Rendering
// ============================================================================

function renderShape(
  el: ShapeElement,
  x: number,
  y: number,
  baseSize: number,
): React.ReactNode {
  const sizeMultiplier = el.size === 'small' ? 0.5 : el.size === 'large' ? 0.9 : 0.7;
  const s = baseSize * sizeMultiplier;
  const cx = x + baseSize / 2;
  const cy = y + baseSize / 2;

  const stroke = '#1a1a1a';
  const strokeWidth = 1.5;

  let fillColor: string;

  switch (el.fill) {
    case 'empty':
      fillColor = 'white';
      break;
    case 'half':
      fillColor = 'rgba(30, 64, 120, 0.4)';
      break;
    case 'full':
      fillColor = 'rgba(30, 64, 120, 0.85)';
      break;
    case 'dots':
      fillColor = 'url(#dots-pattern)';
      break;
    case 'lines':
      fillColor = 'url(#lines-pattern)';
      break;
    default:
      fillColor = 'white';
  }

  const transform = `rotate(${el.rotation} ${cx} ${cy})`;

  switch (el.shape) {
    case 'circle':
      return (
        <circle
          key={`${x}-${y}`}
          cx={cx}
          cy={cy}
          r={s * 0.4}
          fill={fillColor}
          stroke={stroke}
          strokeWidth={strokeWidth}
          transform={transform}
        />
      );
    case 'square':
      return (
        <rect
          key={`${x}-${y}`}
          x={cx - s * 0.35}
          y={cy - s * 0.35}
          width={s * 0.7}
          height={s * 0.7}
          fill={fillColor}
          stroke={stroke}
          strokeWidth={strokeWidth}
          transform={transform}
        />
      );
    case 'triangle':
      const triPoints = [
        [cx, cy - s * 0.4],
        [cx + s * 0.35, cy + s * 0.3],
        [cx - s * 0.35, cy + s * 0.3],
      ]
        .map((p) => p.join(','))
        .join(' ');
      return (
        <polygon
          key={`${x}-${y}`}
          points={triPoints}
          fill={fillColor}
          stroke={stroke}
          strokeWidth={strokeWidth}
          transform={transform}
        />
      );
    case 'diamond':
      const diaPoints = [
        [cx, cy - s * 0.4],
        [cx + s * 0.3, cy],
        [cx, cy + s * 0.4],
        [cx - s * 0.3, cy],
      ]
        .map((p) => p.join(','))
        .join(' ');
      return (
        <polygon
          key={`${x}-${y}`}
          points={diaPoints}
          fill={fillColor}
          stroke={stroke}
          strokeWidth={strokeWidth}
          transform={transform}
        />
      );
    case 'pentagon':
      const pentPoints: [number, number][] = [];
      for (let i = 0; i < 5; i++) {
        const angle = (Math.PI / 2) + (i * 2 * Math.PI) / 5;
        pentPoints.push([cx + s * 0.35 * Math.cos(angle), cy - s * 0.35 * Math.sin(angle)]);
      }
      return (
        <polygon
          key={`${x}-${y}`}
          points={pentPoints.map((p) => p.join(',')).join(' ')}
          fill={fillColor}
          stroke={stroke}
          strokeWidth={strokeWidth}
          transform={transform}
        />
      );
    case 'star':
      const starPoints: [number, number][] = [];
      for (let i = 0; i < 10; i++) {
        const angle = (Math.PI / 2) + (i * Math.PI) / 5;
        const r = i % 2 === 0 ? s * 0.35 : s * 0.15;
        starPoints.push([cx + r * Math.cos(angle), cy - r * Math.sin(angle)]);
      }
      return (
        <polygon
          key={`${x}-${y}`}
          points={starPoints.map((p) => p.join(',')).join(' ')}
          fill={fillColor}
          stroke={stroke}
          strokeWidth={strokeWidth}
          transform={transform}
        />
      );
    default:
      return null;
  }
}

function FigureSvg({ fig, size = CELL }: { fig: CellFigure; size?: number }) {
  if (!fig.shapes || fig.shapes.length === 0) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
        <rect x={0} y={0} width={size} height={size} fill="white" />
      </svg>
    );
  }

  const n = fig.shapes.length;
  const offsets: [number, number][] = [];

  if (n === 1) {
    offsets.push([0, 0]);
  } else if (n === 2) {
    offsets.push([-0.2, 0], [0.2, 0]);
  } else if (n === 3) {
    offsets.push([-0.2, -0.15], [0.2, -0.15], [0, 0.2]);
  } else if (n === 4) {
    offsets.push([-0.2, -0.15], [0.2, -0.15], [-0.2, 0.2], [0.2, 0.2]);
  } else {
    offsets.push([0, -0.25], [-0.25, 0], [0.25, 0], [-0.15, 0.25], [0.15, 0.25]);
  }

  const subSize = size * (n === 1 ? 0.8 : 0.45);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
      <defs>
        <pattern id="dots-pattern" patternUnits="userSpaceOnUse" width="6" height="6">
          <rect width="6" height="6" fill="white" />
          <circle cx="3" cy="3" r="1.2" fill="#1e4078" />
        </pattern>
        <pattern id="lines-pattern" patternUnits="userSpaceOnUse" width="6" height="6">
          <rect width="6" height="6" fill="white" />
          <line x1="0" y1="3" x2="6" y2="3" stroke="#1e4078" strokeWidth="1.5" />
        </pattern>
      </defs>
      {fig.shapes.map((el, i) => {
        const [ox, oy] = offsets[i] || [0, 0];
        const x = size / 2 + ox * size - subSize / 2;
        const y = size / 2 + oy * size - subSize / 2;
        return (
          <g key={i}>
            {renderShape(el, x, y, subSize)}
          </g>
        );
      })}
    </svg>
  );
}

function MatrixCell({
  fig,
  empty,
  highlight,
}: {
  fig: CellFigure | null;
  empty?: boolean;
  highlight?: 'correct' | 'wrong' | null;
}) {
  const phone = usePhoneLayout();
  const dim = phone ? 96 : CELL + 8;
  const border =
    highlight === 'correct'
      ? 'border-green-500 ring-2 ring-green-300'
      : highlight === 'wrong'
        ? 'border-red-500 ring-2 ring-red-300'
        : 'border-slate-300';

  return (
    <div
      className={`flex items-center justify-center rounded-lg border-2 bg-white ${border} ${empty ? 'border-dashed bg-[#f7f5f3]' : ''}`}
      style={{ width: dim, height: dim }}
    >
      {fig ? <FigureSvg fig={fig} size={phone ? 88 : CELL} /> : <span className="text-2xl text-slate-400">?</span>}
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

export default function MatricesRavenTest() {
  const router = useRouter();
  const [gameState, setGameState] = useState<GameState>('menu');
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [questions, setQuestions] = useState<RavenQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [locked, setLocked] = useState(false);

  const perfSavedRef = useRef(false);
  const questionStartRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  useEffect(() => {
    saveSettingsLocal(settings);
  }, [settings]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startGame = useCallback(() => {
    perfSavedRef.current = false;
    const qs = generateQuestions(settings.numQuestions);
    setQuestions(qs);
    setCurrentIdx(0);
    setResults([]);
    setSelected(null);
    setLocked(false);
    questionStartRef.current = Date.now();
    setTimeLeft(settings.timePerQuestion);
    setGameState('playing');
  }, [settings]);

  useEffect(() => {
    if (gameState !== 'playing') {
      clearTimer();
      return;
    }
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          handleTimeout();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return clearTimer;
  }, [gameState, currentIdx, clearTimer]);

  const handleTimeout = useCallback(() => {
    if (locked) return;
    setLocked(true);
    const q = questions[currentIdx];
    if (!q) return;
    const timeMs = Date.now() - questionStartRef.current;

    if (settings.examMode) {
      const nextResults = [...results, { selected: null, correct: false, timeMs }];
      setResults(nextResults);
      if (currentIdx + 1 >= questions.length) {
        setGameState('results');
      } else {
        setCurrentIdx((i) => i + 1);
        setSelected(null);
        setLocked(false);
        questionStartRef.current = Date.now();
        setTimeLeft(settings.timePerQuestion);
      }
    } else {
      setResults((r) => [...r, { selected: null, correct: false, timeMs }]);
      setGameState('correction');
    }
  }, [locked, questions, currentIdx, results, settings]);

  const handleSubmit = useCallback(() => {
    if (locked || selected === null) return;
    setLocked(true);
    clearTimer();

    const q = questions[currentIdx];
    if (!q) return;

    const timeMs = Date.now() - questionStartRef.current;
    const correct = selected === q.correctIdx;

    if (settings.examMode) {
      const nextResults = [...results, { selected, correct, timeMs }];
      setResults(nextResults);
      if (currentIdx + 1 >= questions.length) {
        setGameState('results');
      } else {
        setCurrentIdx((i) => i + 1);
        setSelected(null);
        setLocked(false);
        questionStartRef.current = Date.now();
        setTimeLeft(settings.timePerQuestion);
      }
    } else {
      setResults((r) => [...r, { selected, correct, timeMs }]);
      setGameState('correction');
    }
  }, [locked, selected, questions, currentIdx, results, settings, clearTimer]);

  const handleNext = useCallback(() => {
    if (currentIdx + 1 >= questions.length) {
      setGameState('results');
    } else {
      setCurrentIdx((i) => i + 1);
      setSelected(null);
      setLocked(false);
      questionStartRef.current = Date.now();
      setTimeLeft(settings.timePerQuestion);
      setGameState('playing');
    }
  }, [currentIdx, questions.length, settings.timePerQuestion]);

  const currentQ = questions[currentIdx];
  const timerPct =
    settings.timePerQuestion > 0 ? (timeLeft / settings.timePerQuestion) * 100 : 0;

  // Current result for correction screen
  const currentResult = results[currentIdx];

  // ---- MENU ----
  if (gameState === 'menu') {
    return (
      <div className={`flex min-h-screen flex-col items-center justify-center ${SLATE_BG} p-4`}>
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Matrices de Raven</CardTitle>
            <CardDescription>Logique visuelle — completez la matrice 3×3</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2 rounded-lg bg-[#f7f5f3] p-4 text-sm text-[#605a57]">
              <p>Identifiez la regle logique (progression, rotation, distribution, XOR...) et choisissez la figure manquante.</p>
              <p className="text-xs text-[#605a57]">Difficulte progressive : les dernieres questions combinent plusieurs regles.</p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-[#f7f5f3] p-3">
                <p className="text-xl font-bold text-[#37322f]">{settings.numQuestions}</p>
                <p className="text-xs text-[#605a57]">Questions</p>
              </div>
              <div className="rounded-lg bg-[#f7f5f3] p-3">
                <p className="text-xl font-bold text-[#37322f]">{settings.timePerQuestion}s</p>
                <p className="text-xs text-[#605a57]">Par question</p>
              </div>
              <div className="rounded-lg bg-[#f7f5f3] p-3">
                <p className="text-xl font-bold text-[#37322f]">{settings.examMode ? 'Oui' : 'Non'}</p>
                <p className="text-xs text-[#605a57]">Mode examen</p>
              </div>
            </div>
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

  // ---- SETTINGS ----
  if (gameState === 'settings') {
    return (
      <div className={`flex min-h-screen flex-col items-center justify-center ${SLATE_BG} p-4`}>
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Paramètres</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label>Nombre de questions : {settings.numQuestions}</Label>
              <Slider
                value={[settings.numQuestions]}
                onValueChange={([v]) => setSettings((s) => ({ ...s, numQuestions: v }))}
                min={6}
                max={30}
                step={1}
                className="mt-2"
              />
            </div>
            <div>
              <Label>Temps par question : {settings.timePerQuestion}s</Label>
              <Slider
                value={[settings.timePerQuestion]}
                onValueChange={([v]) => setSettings((s) => ({ ...s, timePerQuestion: v }))}
                min={30}
                max={120}
                step={5}
                className="mt-2"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-[#f7f5f3] p-4">
              <div>
                <Label>Mode examen</Label>
                <p className="text-xs text-[#605a57]">Pas de correction entre les questions. Les résultats s’affichent à la fin.</p>
              </div>
              <Switch
                checked={settings.examMode}
                onCheckedChange={(v) => setSettings((s) => ({ ...s, examMode: v }))}
              />
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
    const correct = results.filter((r) => r.correct).length;
    const total = results.length;
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
    if (!perfSavedRef.current) {
      perfSavedRef.current = true;
      const avgMs =
        results.length > 0 ? results.reduce((s, r) => s + r.timeMs, 0) / results.length : 0;
      savePerformanceResult(EXERCISE_ID, correct, total, avgMs);
    }
    const perfEntries = loadEntries(EXERCISE_ID);

    return (
      <div className={`flex min-h-screen flex-col items-center justify-center ${SLATE_BG} p-4`}>
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">Résultats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <ClassScoreBlock
              exerciseId={EXERCISE_ID}
              percent={pct}
              detail={`${correct}/${total} reponses correctes`}
            />
            {perfEntries.length >= 2 && (
              <div className="border-t pt-4">
                <MiniPerformanceChart entries={perfEntries} exerciseId={EXERCISE_ID} />
              </div>
            )}
            <div className="flex flex-col gap-3">
              <Button size="lg" className="w-full" onClick={startGame}>
                <RotateCcw className="mr-2 h-5 w-5" /> Rejouer
              </Button>
              <Button variant="outline" className="w-full" onClick={() => setGameState('menu')}>Menu</Button>
              <Button variant="ghost" className="w-full" onClick={() => router.push('/')}>
                <Home className="mr-2 h-5 w-5" /> Accueil
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---- CORRECTION (non-exam mode) ----
  if (gameState === 'correction' && currentQ && currentResult) {
    const isCorrect = currentResult.correct;

    return (
      <div className={`flex min-h-screen flex-col ${SLATE_BG}`}>
        <div className="border-b border-slate-200 bg-white/70 px-4 py-3 backdrop-blur-sm">
          <div className="mx-auto flex max-w-4xl items-center justify-between text-sm font-medium text-[#37322f]">
            <span>Question {currentIdx + 1}/{questions.length}</span>
            <span>Score : {results.filter((r) => r.correct).length}/{results.length}</span>
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 p-4 md:p-6">
          {/* Result banner */}
          <div
            className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-3 font-semibold ${
              isCorrect
                ? 'border-green-200 bg-green-50 text-green-700'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {isCorrect ? (
              <><CheckCircle2 className="h-5 w-5" /> Correct !</>
            ) : (
              <><XCircle className="h-5 w-5" /> Incorrect</>
            )}
          </div>

          {/* Facet badges */}
          <div className="flex flex-wrap justify-center gap-2">
            {currentQ.rules.map((rule, i) => (
              <Badge key={i} variant="outline" className="border-blue-300 bg-blue-50 text-blue-700">
                Facette evaluee : {rule.label}
              </Badge>
            ))}
          </div>

          {/* Explanation */}
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="mb-2 text-sm font-semibold text-[#605a57]">Explication :</p>
            {currentQ.rules.map((rule, i) => (
              <p key={i} className="text-sm text-[#37322f]">{rule.explanation}</p>
            ))}
          </div>

          {/* Matrix with correct answer shown */}
          <div className="flex flex-col items-center gap-4">
            <p className="text-sm font-semibold uppercase tracking-wide text-[#605a57]">Matrice</p>
            <div className="grid grid-cols-3 gap-2">
              {currentQ.matrix.map((cell, i) => {
                if (i === 8) {
                  return (
                    <MatrixCell
                      key={i}
                      fig={currentQ.choices[currentQ.correctIdx]}
                      highlight="correct"
                    />
                  );
                }
                return <MatrixCell key={i} fig={cell} />;
              })}
            </div>

            <p className="text-sm font-semibold uppercase tracking-wide text-[#605a57]">Bonne reponse</p>
            <div className="flex items-center gap-2">
              <div className="rounded-xl border-2 border-green-500 bg-white p-2 ring-2 ring-green-300">
                <FigureSvg fig={currentQ.choices[currentQ.correctIdx]} />
              </div>
              <span className="text-sm font-medium text-[#605a57]">Choix {currentQ.correctIdx + 1}</span>
            </div>

            {!isCorrect && currentResult.selected !== null && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-[#605a57]">Votre reponse :</span>
                <div className="rounded-xl border-2 border-red-400 bg-white p-2">
                  <FigureSvg fig={currentQ.choices[currentResult.selected]} size={48} />
                </div>
                <span className="text-sm text-[#605a57]">Choix {currentResult.selected + 1}</span>
              </div>
            )}
          </div>

          {/* Next button */}
          <div className="mt-4 flex justify-center">
            <Button size="lg" onClick={handleNext}>
              {currentIdx + 1 >= questions.length ? 'Voir les resultats' : 'Suivant'}
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ---- PLAYING ----
  if (!currentQ) return null;

  return (
    <div className={`flex min-h-screen flex-col ${SLATE_BG}`}>
      <div className="border-b border-slate-200 bg-white/70 px-4 py-3 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between text-sm font-medium text-[#37322f]">
          <span>Question {currentIdx + 1}/{questions.length}</span>
          <span>{timeLeft}s</span>
          <span>Score : {results.filter((r) => r.correct).length}/{results.length}</span>
        </div>
        <div className="mx-auto mt-2 h-2 max-w-4xl overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full transition-all"
            style={{
              width: `${timerPct}%`,
              backgroundColor: timerPct < 20 ? '#dc2626' : '#37322f',
            }}
          />
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-4 md:p-6">
        <div className="flex flex-col items-center gap-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-[#605a57]">Matrice</p>
          <div className="grid grid-cols-3 gap-2">
            {currentQ.matrix.map((cell, i) => (
              <MatrixCell key={i} fig={cell} empty={cell === null} />
            ))}
          </div>

          <p className="text-sm font-semibold uppercase tracking-wide text-[#605a57]">Choix</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
            {currentQ.choices.map((choice, i) => {
              const isSelected = selected === i;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={locked}
                  onClick={() => setSelected(i)}
                  className={`flex flex-col items-center rounded-xl border-2 bg-white p-2 transition-all ${
                    isSelected
                      ? 'border-blue-500 ring-2 ring-blue-200'
                      : 'border-slate-200 hover:border-slate-400'
                  }`}
                >
                  <FigureSvg fig={choice} />
                  <span className="mt-1 text-xs text-[#605a57]">{i + 1}</span>
                </button>
              );
            })}
          </div>

          <Button
            size="lg"
            disabled={selected === null || locked}
            onClick={handleSubmit}
            className="mt-2"
          >
            Valider
          </Button>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { savePerformanceResult, loadEntries } from '@/lib/core/PerformanceTracker';
import { MiniPerformanceChart } from '@/components/PerformanceChart';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  ArrowLeft,
  Play,
  RotateCcw,
  Home,
  Settings,
  ChevronRight,
  Trash2,
} from 'lucide-react';

// ============================================================================
// Types & constants
// ============================================================================

type GameState = 'menu' | 'settings' | 'playing' | 'results';

interface PuzzleData {
  words: [string, string, string, string, string, string, string, string, string];
  solution: [string, string, string, string, string, string];
}

interface GameSettings {
  totalQuestions: number;
  timePerQuestionSec: number;
  examMode: boolean;
}

interface QuestionResult {
  puzzle: PuzzleData;
  edgeAssignments: (string | null)[];
  isCorrect: boolean;
  timeUsedMs: number;
}

const EXERCISE_ID = 'mots-en-etoile';
const SETTINGS_KEY = 'aviatest-mots-en-etoile-settings';
const CELL_HALF = 17;
const CELL_SIZE = CELL_HALF * 2;
const CHEVRON_SIZE = 40;
const NUM_EDGES = 6;
const WORD_LEN = 7;

const DEFAULT_SETTINGS: GameSettings = {
  totalQuestions: 10,
  timePerQuestionSec: 50,
  examMode: false,
};

/** Up triangle edges 0-2, down triangle edges 3-5 (hexagram / Star of David). */
const EDGE_VERTICES: [number, number][] = [
  [0, 2],
  [2, 4],
  [4, 0],
  [1, 3],
  [3, 5],
  [5, 1],
];

const PUZZLES: PuzzleData[] = [
  {
    solution: ['AVIONNE', 'ECARTER', 'RUISSEA', 'CHEMISE', 'ELEMENT', 'TECHNIC'],
    words: ['AVIONNE', 'ECARTER', 'RUISSEA', 'CHEMISE', 'ELEMENT', 'TECHNIC', 'BATEAUX', 'COURAGE', 'JARDINS'],
  },
  {
    solution: ['CHEMISE', 'ELEMENT', 'TECHNIC', 'ECHANGE', 'ECLAIRS', 'SCIENCE'],
    words: ['CHEMISE', 'ELEMENT', 'TECHNIC', 'ECHANGE', 'ECLAIRS', 'SCIENCE', 'BATEAUX', 'DEFENSE', 'JARDINS'],
  },
  {
    solution: ['AVIONNE', 'ELEMENT', 'TRAHIRA', 'ECHANGE', 'ECLAIRS', 'SCIENCE'],
    words: ['AVIONNE', 'ELEMENT', 'TRAHIRA', 'ECHANGE', 'ECLAIRS', 'SCIENCE', 'BATEAUX', 'COURAGE', 'JARDINS'],
  },
  {
    solution: ['AVIONNE', 'ENROBER', 'RUISSEA', 'ENFANTS', 'SECOURS', 'SERVICE'],
    words: ['AVIONNE', 'ENROBER', 'RUISSEA', 'ENFANTS', 'SECOURS', 'SERVICE', 'BATEAUX', 'COURAGE', 'JARDINS'],
  },
  {
    solution: ['AVIONNE', 'ENTRANT', 'TRAHIRA', 'ESSAYER', 'RAPPORT', 'TEMPETE'],
    words: ['AVIONNE', 'ENTRANT', 'TRAHIRA', 'ESSAYER', 'RAPPORT', 'TEMPETE', 'BATEAUX', 'COURAGE', 'JARDINS'],
  },
  {
    solution: ['AVIONNE', 'ETUDIER', 'RUISSEA', 'LETTRES', 'SIMPLES', 'SPECIAL'],
    words: ['AVIONNE', 'ETUDIER', 'RUISSEA', 'LETTRES', 'SIMPLES', 'SPECIAL', 'BATEAUX', 'COURAGE', 'JARDINS'],
  },
  {
    solution: ['CIRCUIT', 'TOILETT', 'TECHNIC', 'ECARTER', 'RECOURS', 'SILENCE'],
    words: ['CIRCUIT', 'TOILETT', 'TECHNIC', 'ECARTER', 'RECOURS', 'SILENCE', 'BATEAUX', 'COURAGE', 'JARDINS'],
  },
  {
    solution: ['ELEMENT', 'TALENTS', 'SOCIETE', 'ENTRANT', 'TORRENT', 'THEATRE'],
    words: ['ELEMENT', 'TALENTS', 'SOCIETE', 'ENTRANT', 'TORRENT', 'THEATRE', 'BATEAUX', 'COURAGE', 'JARDINS'],
  },
  {
    solution: ['ELEMENT', 'TRADUIT', 'TROPHEE', 'ENTRANT', 'TRAINER', 'REALISE'],
    words: ['ELEMENT', 'TRADUIT', 'TROPHEE', 'ENTRANT', 'TRAINER', 'REALISE', 'BATEAUX', 'COURAGE', 'JARDINS'],
  },
  {
    solution: ['ELEMENT', 'TRAVAIL', 'LEGENDE', 'ENTRANT', 'TRESORS', 'SOURIRE'],
    words: ['ELEMENT', 'TRAVAIL', 'LEGENDE', 'ENTRANT', 'TRESORS', 'SOURIRE', 'BATEAUX', 'COURAGE', 'JARDINS'],
  },
];

// ============================================================================
// Geometry helpers
// ============================================================================

const CX = 300;
const CY = 280;
const R = 168;
const VERTEX_ANGLES = [
  -Math.PI / 2,
  -Math.PI / 6,
  Math.PI / 6,
  Math.PI / 2,
  (5 * Math.PI) / 6,
  (-5 * Math.PI) / 6,
];

function vertexPos(vertexId: number): { x: number; y: number } {
  const a = VERTEX_ANGLES[vertexId];
  return { x: CX + R * Math.cos(a), y: CY + R * Math.sin(a) };
}

function edgeCellPos(edgeIndex: number, pos: number): { x: number; y: number } {
  const [startV, endV] = EDGE_VERTICES[edgeIndex];
  const s = vertexPos(startV);
  const e = vertexPos(endV);
  const t = pos / (WORD_LEN - 1);
  return { x: s.x + (e.x - s.x) * t, y: s.y + (e.y - s.y) * t };
}

function chevronPos(edgeIndex: number): { x: number; y: number; angle: number } {
  const [startV, endV] = EDGE_VERTICES[edgeIndex];
  const s = vertexPos(startV);
  const e = vertexPos(endV);

  const distS = Math.hypot(s.x - CX, s.y - CY);
  const distE = Math.hypot(e.x - CX, e.y - CY);
  const outerVertex = distS >= distE ? s : e;
  const innerVertex = distS < distE ? s : e;
  const outerIsEnd = distS < distE;

  const letterPos = outerIsEnd ? WORD_LEN - 1 : 0;
  const cellCenter = edgeCellPos(edgeIndex, letterPos);

  const angle =
    (Math.atan2(outerVertex.y - innerVertex.y, outerVertex.x - innerVertex.x) * 180) / Math.PI;

  const outwardDx = outerVertex.x - CX;
  const outwardDy = outerVertex.y - CY;
  const outwardLen = Math.hypot(outwardDx, outwardDy) || 1;
  const outwardOffset = 28;

  return {
    x: cellCenter.x + (outwardDx / outwardLen) * outwardOffset,
    y: cellCenter.y + (outwardDy / outwardLen) * outwardOffset,
    angle,
  };
}

// ============================================================================
// Puzzle logic
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

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function validateHexagram(assignments: string[]): boolean {
  if (assignments.length !== NUM_EDGES) return false;
  if (assignments.some((w) => w.length !== WORD_LEN)) return false;

  for (let v = 0; v < 6; v++) {
    const letters: string[] = [];
    for (let e = 0; e < NUM_EDGES; e++) {
      const [start, end] = EDGE_VERTICES[e];
      const w = assignments[e];
      if (start === v) letters.push(w[0]);
      if (end === v) letters.push(w[6]);
    }
    if (letters.length !== 2 || letters[0] !== letters[1]) return false;
  }
  return true;
}

function vertexLetter(vertexId: number, assignments: (string | null)[]): string | null {
  for (let e = 0; e < NUM_EDGES; e++) {
    const word = assignments[e];
    if (!word) continue;
    const [start, end] = EDGE_VERTICES[e];
    if (start === vertexId) return word[0];
    if (end === vertexId) return word[6];
  }
  return null;
}

function canPlaceWord(
  word: string,
  edgeIndex: number,
  assignments: (string | null)[],
): boolean {
  const [startV, endV] = EDGE_VERTICES[edgeIndex];
  const startLetter = vertexLetter(startV, assignments);
  const endLetter = vertexLetter(endV, assignments);
  if (startLetter && startLetter !== word[0]) return false;
  if (endLetter && endLetter !== word[6]) return false;
  return true;
}

function isValidSolution(
  assignments: (string | null)[],
  wordPool: string[],
): boolean {
  if (assignments.some((w) => w === null)) return false;
  const placed = assignments as string[];
  if (new Set(placed).size !== NUM_EDGES) return false;
  if (!placed.every((w) => wordPool.includes(w))) return false;
  return validateHexagram(placed);
}

function buildQuestionList(count: number): PuzzleData[] {
  const pool = shuffle(PUZZLES);
  const out: PuzzleData[] = [];
  for (let i = 0; i < count; i++) {
    const base = pool[i % pool.length];
    out.push({
      solution: [...base.solution] as PuzzleData['solution'],
      words: shuffle([...base.words]) as PuzzleData['words'],
    });
  }
  return out;
}

function getEdgeLetters(assignments: (string | null)[], edgeIndex: number): (string | null)[] {
  const word = assignments[edgeIndex];
  if (!word) return Array(WORD_LEN).fill(null);
  return word.split('');
}

if (typeof window !== 'undefined') {
  for (const p of PUZZLES) {
    if (!validateHexagram([...p.solution])) {
      console.warn('[mots-en-etoile] invalid solution', p.solution);
    }
    const solSet = new Set(p.solution);
    const decoys = p.words.filter((w) => !solSet.has(w));
    if (decoys.length !== 3) {
      console.warn('[mots-en-etoile] expected 3 decoys', p.words);
    }
  }
}

// ============================================================================
// Star grid (SVG)
// ============================================================================

function StarGrid({
  assignments,
  selectedWord,
  onPlace,
  onClear,
  disabled,
}: {
  assignments: (string | null)[];
  selectedWord: string | null;
  onPlace: (edgeIndex: number) => void;
  onClear: (edgeIndex: number) => void;
  disabled: boolean;
}) {
  const edges = useMemo(
    () =>
      Array.from({ length: NUM_EDGES }, (_, edgeIndex) => ({
        edgeIndex,
        letters: getEdgeLetters(assignments, edgeIndex),
        hasWord: assignments[edgeIndex] !== null,
        canPlace:
          !!selectedWord &&
          !assignments[edgeIndex] &&
          canPlaceWord(selectedWord, edgeIndex, assignments),
        chevron: chevronPos(edgeIndex),
      })),
    [assignments, selectedWord],
  );

  const starLines = useMemo(() => {
    const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];
    for (let e = 0; e < NUM_EDGES; e++) {
      const [a, b] = EDGE_VERTICES[e];
      const p1 = vertexPos(a);
      const p2 = vertexPos(b);
      lines.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y });
    }
    return lines;
  }, []);

  return (
    <svg viewBox="0 0 600 520" className="mx-auto h-full w-full max-h-[480px]">
      {starLines.map((line, i) => (
        <line
          key={i}
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          stroke="#94a3b8"
          strokeWidth={2}
        />
      ))}

      {edges.map(({ edgeIndex, letters, hasWord, canPlace, chevron }) => (
        <g key={edgeIndex}>
          {letters.map((letter, pos) => {
            const { x, y } = edgeCellPos(edgeIndex, pos);
            return (
              <g key={pos}>
                <rect
                  x={x - CELL_HALF}
                  y={y - CELL_HALF}
                  width={CELL_SIZE}
                  height={CELL_SIZE}
                  rx={4}
                  fill={letter ? '#ffffff' : '#f8fafc'}
                  stroke={pos === 0 || pos === WORD_LEN - 1 ? '#fbbf24' : '#cbd5e1'}
                  strokeWidth={letter ? 1.5 : 1}
                />
                <text
                  x={x}
                  y={y + 6}
                  textAnchor="middle"
                  className="fill-slate-800 text-[16px] font-bold"
                  style={{ fontFamily: 'ui-monospace, monospace' }}
                >
                  {letter ?? '·'}
                </text>
              </g>
            );
          })}

          <foreignObject
            x={chevron.x - CHEVRON_SIZE / 2}
            y={chevron.y - CHEVRON_SIZE / 2}
            width={CHEVRON_SIZE}
            height={CHEVRON_SIZE}
          >
            <button
              type="button"
              title="Placer le mot selectionne"
              disabled={disabled || !canPlace}
              onClick={() => onPlace(edgeIndex)}
              className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
                canPlace
                  ? 'cursor-pointer border-blue-500 bg-blue-100 text-blue-700 hover:bg-blue-200'
                  : 'cursor-default border-slate-200 bg-slate-50 text-slate-300'
              }`}
              style={{ transform: `rotate(${chevron.angle}deg)` }}
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </foreignObject>

          {hasWord && (
            <foreignObject
              x={edgeCellPos(edgeIndex, 3).x - 14}
              y={edgeCellPos(edgeIndex, 3).y - 38}
              width={28}
              height={28}
            >
              <button
                type="button"
                title="Effacer ce mot"
                disabled={disabled}
                onClick={() => onClear(edgeIndex)}
                className="flex h-7 w-7 items-center justify-center rounded border border-red-200 bg-red-50 text-red-500 hover:bg-red-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </foreignObject>
          )}
        </g>
      ))}
    </svg>
  );
}

// ============================================================================
// Component
// ============================================================================

export default function MotsEnEtoileTest() {
  const router = useRouter();
  const [gameState, setGameState] = useState<GameState>('menu');
  const [settings, setSettings] = useState<GameSettings>(loadSettings);
  const settingsRef = useRef(settings);
  const [questions, setQuestions] = useState<PuzzleData[]>([]);
  const questionsRef = useRef(questions);
  const [currentIdx, setCurrentIdx] = useState(0);
  const currentIdxRef = useRef(0);

  const [results, setResults] = useState<QuestionResult[]>([]);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [edgeAssignments, setEdgeAssignments] = useState<(string | null)[]>(
    Array(NUM_EDGES).fill(null),
  );
  const [showCorrection, setShowCorrection] = useState(false);
  const [lastOutcome, setLastOutcome] = useState<QuestionResult | null>(null);

  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const questionStartRef = useRef(0);
  const perfSavedRef = useRef(false);
  const [locked, setLocked] = useState(false);
  const lockedRef = useRef(false);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    questionsRef.current = questions;
  }, [questions]);

  useEffect(() => {
    currentIdxRef.current = currentIdx;
  }, [currentIdx]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const startTimer = useCallback(
    (durationMs: number, onTimeout: () => void) => {
      clearTimer();
      questionStartRef.current = Date.now();
      setTotalTime(durationMs);
      setTimeLeft(durationMs);
      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - questionStartRef.current;
        setTimeLeft(Math.max(0, durationMs - elapsed));
      }, 50);
      timeoutRef.current = setTimeout(onTimeout, durationMs);
    },
    [clearTimer],
  );

  useEffect(() => () => clearTimer(), [clearTimer]);

  const resetPlacement = useCallback(() => {
    setEdgeAssignments(Array(NUM_EDGES).fill(null));
    setSelectedWord(null);
  }, []);

  const submitAnswerRef = useRef<
    (forceIncorrect?: boolean, assignmentsOverride?: (string | null)[]) => void
  >(() => {});

  const onQuestionTimeout = useCallback(() => {
    submitAnswerRef.current(true);
  }, []);

  const finishOrNext = useCallback(
    (result: QuestionResult) => {
      const idx = currentIdxRef.current;
      const qs = questionsRef.current;
      setResults((prev) => [...prev, result]);
      setLastOutcome(result);

      if (settingsRef.current.examMode) {
        if (idx + 1 >= qs.length) {
          clearTimer();
          lockedRef.current = false;
          setLocked(false);
          setGameState('results');
        } else {
          const nextIdx = idx + 1;
          currentIdxRef.current = nextIdx;
          setCurrentIdx(nextIdx);
          resetPlacement();
          lockedRef.current = false;
          setLocked(false);
          startTimer(settingsRef.current.timePerQuestionSec * 1000, onQuestionTimeout);
        }
        return;
      }

      clearTimer();
      setShowCorrection(true);
    },
    [clearTimer, resetPlacement, startTimer, onQuestionTimeout],
  );

  const submitAnswer = useCallback(
    (forceIncorrect = false, assignmentsOverride?: (string | null)[]) => {
      if (lockedRef.current) return;
      lockedRef.current = true;
      setLocked(true);
      clearTimer();

      const puzzle = questionsRef.current[currentIdxRef.current];
      if (!puzzle) return;
      const assignments = assignmentsOverride ?? edgeAssignments;
      const timeUsed = Date.now() - questionStartRef.current;
      const isCorrect =
        !forceIncorrect && isValidSolution(assignments, [...puzzle.words]);

      finishOrNext({
        puzzle,
        edgeAssignments: [...assignments],
        isCorrect,
        timeUsedMs: timeUsed,
      });
    },
    [edgeAssignments, finishOrNext, clearTimer],
  );

  useEffect(() => {
    submitAnswerRef.current = submitAnswer;
  }, [submitAnswer]);

  const nextQuestion = useCallback(() => {
    const idx = currentIdxRef.current;
    const qs = questionsRef.current;
    setShowCorrection(false);
    setLastOutcome(null);
    lockedRef.current = false;
    setLocked(false);

    if (idx + 1 >= qs.length) {
      setGameState('results');
      return;
    }

    const nextIdx = idx + 1;
    currentIdxRef.current = nextIdx;
    setCurrentIdx(nextIdx);
    resetPlacement();
    startTimer(settingsRef.current.timePerQuestionSec * 1000, onQuestionTimeout);
  }, [resetPlacement, startTimer, onQuestionTimeout]);

  const startGame = useCallback(() => {
    perfSavedRef.current = false;
    const qs = buildQuestionList(settingsRef.current.totalQuestions);
    setQuestions(qs);
    questionsRef.current = qs;
    setCurrentIdx(0);
    currentIdxRef.current = 0;
    setResults([]);
    resetPlacement();
    setShowCorrection(false);
    setLastOutcome(null);
    lockedRef.current = false;
    setLocked(false);
    setGameState('playing');
    startTimer(settingsRef.current.timePerQuestionSec * 1000, onQuestionTimeout);
  }, [resetPlacement, startTimer, onQuestionTimeout]);

  useEffect(() => {
    if (gameState !== 'results' || perfSavedRef.current) return;
    perfSavedRef.current = true;
    const totalCorrect = results.filter((r) => r.isCorrect).length;
    savePerformanceResult(EXERCISE_ID, totalCorrect, results.length);
  }, [gameState, results]);

  const handleWordClick = (word: string) => {
    if (locked || showCorrection) return;
    if (edgeAssignments.includes(word)) return;
    setSelectedWord((prev) => (prev === word ? null : word));
  };

  const handlePlaceOnEdge = (edgeIndex: number) => {
    if (locked || showCorrection || !selectedWord) return;
    if (edgeAssignments[edgeIndex]) return;
    if (edgeAssignments.includes(selectedWord)) return;
    if (!canPlaceWord(selectedWord, edgeIndex, edgeAssignments)) return;

    const next = [...edgeAssignments];
    next[edgeIndex] = selectedWord;
    setEdgeAssignments(next);
    setSelectedWord(null);

    const puzzle = questionsRef.current[currentIdxRef.current];
    if (
      puzzle &&
      next.every((w) => w !== null) &&
      isValidSolution(next, [...puzzle.words])
    ) {
      submitAnswer(false, next);
    }
  };

  const handleClearEdge = (edgeIndex: number) => {
    if (locked || showCorrection) return;
    setEdgeAssignments((prev) => {
      const next = [...prev];
      next[edgeIndex] = null;
      return next;
    });
  };

  if (gameState === 'menu') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">Mots en etoile</CardTitle>
            <CardDescription className="mt-2 text-base">
              Placez 6 mots de 7 lettres sur les branches d&apos;une etoile
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
              <p>
                Parmi <strong>9 mots</strong>, selectionnez les <strong>6 bons</strong> et placez-les
                sur les aretes de l&apos;etoile.
              </p>
              <p>Les lettres aux sommets communs doivent correspondre.</p>
              <p>
                <strong>{settings.totalQuestions} questions</strong>,{' '}
                <strong>{settings.timePerQuestionSec}s</strong> chacune.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xl font-bold text-slate-700">{settings.totalQuestions}</p>
                <p className="text-xs text-slate-500">Questions</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xl font-bold text-slate-700">9</p>
                <p className="text-xs text-slate-500">Mots</p>
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
                  onValueChange={([v]) => {
                    const next = { ...settings, totalQuestions: v };
                    setSettings(next);
                    saveSettingsLocal(next);
                  }}
                  min={5}
                  max={20}
                  step={1}
                  className="mt-2"
                />
              </div>
              <div>
                <Label>Temps par question : {settings.timePerQuestionSec}s</Label>
                <Slider
                  value={[settings.timePerQuestionSec]}
                  onValueChange={([v]) => {
                    const next = { ...settings, timePerQuestionSec: v };
                    setSettings(next);
                    saveSettingsLocal(next);
                  }}
                  min={20}
                  max={90}
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
                  onCheckedChange={(v) => {
                    const next = { ...settings, examMode: v };
                    setSettings(next);
                    saveSettingsLocal(next);
                  }}
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

  if (gameState === 'results') {
    const totalCorrect = results.filter((r) => r.isCorrect).length;
    const total = results.length;
    const percent = total > 0 ? Math.round((totalCorrect / total) * 100) : 0;
    const avgTime =
      total > 0
        ? Math.round((results.reduce((s, r) => s + r.timeUsedMs, 0) / total / 1000) * 10) / 10
        : 0;

    const perfEntries = loadEntries(EXERCISE_ID);

    let grade = 'A ameliorer';
    if (percent >= 90) grade = 'Excellent';
    else if (percent >= 75) grade = 'Tres bien';
    else if (percent >= 60) grade = 'Bien';
    else if (percent >= 40) grade = 'Passable';

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">Resultats</CardTitle>
            <Badge
              variant={percent >= 75 ? 'default' : percent >= 50 ? 'secondary' : 'destructive'}
              className="mt-2 px-4 py-1 text-lg"
            >
              {grade}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-5xl font-bold text-slate-700">{percent}%</p>
              <p className="mt-1 text-slate-500">Bonnes reponses</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-blue-50 p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {totalCorrect}/{total}
                </p>
                <p className="text-sm text-blue-700">Correct</p>
              </div>
              <div className="rounded-lg bg-amber-50 p-4 text-center">
                <p className="text-2xl font-bold text-amber-600">{avgTime}s</p>
                <p className="text-sm text-amber-700">Temps moyen</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-700">Detail par question :</p>
              <div className="max-h-64 space-y-1.5 overflow-y-auto">
                {results.map((r, i) => (
                  <div key={i} className="rounded bg-slate-50 px-3 py-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Q{i + 1}</span>
                      <span
                        className={
                          r.isCorrect ? 'font-semibold text-green-600' : 'font-semibold text-red-600'
                        }
                      >
                        {r.isCorrect ? '\u2713' : '\u2717'}
                      </span>
                    </div>
                  </div>
                ))}
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

  const puzzle = questions[currentIdx];
  const timerPercent = totalTime > 0 ? (timeLeft / totalTime) * 100 : 100;
  const timerColor =
    timerPercent > 50 ? 'bg-blue-500' : timerPercent > 20 ? 'bg-amber-500' : 'bg-red-500';

  if (!puzzle) return null;

  return (
    <div className="flex min-h-screen flex-col bg-[#d4d4d4] p-4">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-4 flex items-center justify-between">
          <Badge variant="outline" className="px-3 py-1 text-base">
            {currentIdx + 1} / {questions.length}
          </Badge>
          <div className="flex items-center gap-3">
            <span className="font-mono text-lg font-semibold text-slate-700">
              {Math.ceil(timeLeft / 1000)}s
            </span>
            <div className="h-2 w-32 overflow-hidden rounded-full bg-slate-300">
              <div
                className={`h-full transition-all duration-100 ${timerColor}`}
                style={{ width: `${timerPercent}%` }}
              />
            </div>
          </div>
        </div>

        {showCorrection && lastOutcome ? (
          <Card className="py-8 text-center">
            <CardContent className="space-y-6">
              {lastOutcome.isCorrect ? (
                <p className="text-3xl font-bold text-green-600">{'\u2713'} Correct !</p>
              ) : (
                <>
                  <p className="text-3xl font-bold text-red-600">{'\u2717'} Incorrect</p>
                  <p className="text-sm text-slate-500">Une solution possible :</p>
                  <p className="font-mono text-sm text-green-700">
                    {lastOutcome.puzzle.solution.join(' · ')}
                  </p>
                </>
              )}
              <Button size="lg" onClick={nextQuestion}>
                {currentIdx + 1 >= questions.length ? 'Voir les resultats' : 'Suivant'}
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-4 lg:flex-row">
            <Card className="w-full shrink-0 lg:w-56">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Mots</CardTitle>
                <CardDescription className="text-xs">
                  Cliquez un mot puis le chevron bleu
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {puzzle.words.map((word) => {
                  const used = edgeAssignments.includes(word);
                  const selected = selectedWord === word;
                  return (
                    <button
                      key={word}
                      type="button"
                      disabled={used || locked}
                      onClick={() => handleWordClick(word)}
                      className={`w-full rounded-lg border-2 px-3 py-2 text-left font-mono text-sm transition-all
                        ${used ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 line-through' : ''}
                        ${!used && selected ? 'border-blue-500 bg-blue-50 text-blue-800' : ''}
                        ${!used && !selected ? 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50' : ''}
                      `}
                    >
                      {word}
                    </button>
                  );
                })}
              </CardContent>
            </Card>

            <div className="min-h-[480px] flex-1">
              <Card className="h-full">
                <CardContent className="flex h-[480px] items-center justify-center p-2">
                  <StarGrid
                    assignments={edgeAssignments}
                    selectedWord={selectedWord}
                    onPlace={handlePlaceOnEdge}
                    onClear={handleClearEdge}
                    disabled={locked}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

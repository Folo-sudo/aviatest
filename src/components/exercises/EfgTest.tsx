'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { savePerformanceResult, loadEntries } from '@/lib/core/PerformanceTracker';
import { MiniPerformanceChart } from '@/components/PerformanceChart';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Play, RotateCcw, Home, Settings, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';

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

type ItemKind = 'number' | 'word' | 'figure';

type ShapeType = 'circle' | 'square' | 'triangle' | 'diamond';

interface FigureSpec {
  shape: ShapeType;
  count: number;
  filled: boolean;
}

interface DisplayItem {
  id: string;
  kind: ItemKind;
  text?: string;
  figure?: FigureSpec;
}

interface CandidateItem extends DisplayItem {
  isMatch: boolean;
}

interface QuestionData {
  kind: ItemKind;
  loi: DisplayItem[];
  antiLoi: DisplayItem[];
  candidates: CandidateItem[];
  ruleDescription: string;
}

interface QuestionResult {
  question: QuestionData;
  selectedIds: string[];
  outcome: AnswerOutcome;
  timeUsedMs: number;
}

// ============================================================================
// Constants
// ============================================================================

const SETTINGS_KEY = 'aviatest-efg-settings';

const DEFAULT_SETTINGS: GameSettings = {
  totalQuestions: 15,
  timePerQuestionSec: 40,
  examMode: false,
};

const BG = '#d4d4d4';
const NAVY = '#1a2b4a';
const TIMER_BLUE = '#0068C6';
const TIMER_RED = '#dc2626';

const WORD_BANK = [
  'avion', 'bateau', 'maison', 'jardin', 'cheval', 'tigre', 'souris', 'table', 'chaise', 'fenetre',
  'porte', 'montagne', 'riviere', 'foret', 'soleil', 'nuage', 'orage', 'pomme', 'orange', 'citron',
  'fraise', 'ballon', 'voiture', 'camion', 'train', 'velo', 'moto', 'bureau', 'crayon', 'papier',
  'livre', 'cahier', 'montre', 'lampe', 'tapis', 'canape', 'cuisine', 'salon', 'pilote', 'moteur',
  'radar', 'piste', 'hangar', 'reacteur', 'helice', 'cockpit', 'altitude', 'vitesse', 'aeroport', 'tour',
];

const SHAPES: readonly ShapeType[] = ['circle', 'square', 'triangle', 'diamond'];

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

function vowelCount(w: string): number {
  return w.split('').filter((c) => 'aeiouy'.includes(c)).length;
}

// ============================================================================
// Question generators — numbers
// ============================================================================

function genNumberQuestion(): QuestionData {
  const ruleType = pick(['multiple', 'parity', 'digitsum', 'range'] as const);
  const allNums = Array.from({ length: 90 }, (_, i) => i + 10);
  let isMatch: (n: number) => boolean;
  let ruleDescription: string;

  if (ruleType === 'multiple') {
    const k = pick([3, 4, 5, 6, 7]);
    isMatch = (n) => n % k === 0;
    ruleDescription = `Les nombres multiples de ${k}.`;
  } else if (ruleType === 'parity') {
    const even = Math.random() < 0.5;
    isMatch = (n) => (even ? n % 2 === 0 : n % 2 !== 0);
    ruleDescription = `Les nombres ${even ? 'pairs' : 'impairs'}.`;
  } else if (ruleType === 'digitsum') {
    const wantEven = Math.random() < 0.5;
    const digitSum = (n: number) => String(n).split('').reduce((s, d) => s + Number(d), 0);
    isMatch = (n) => (wantEven ? digitSum(n) % 2 === 0 : digitSum(n) % 2 !== 0);
    ruleDescription = `Les nombres dont la somme des chiffres est ${wantEven ? 'paire' : 'impaire'}.`;
  } else {
    const low = pick([10, 20, 30, 40, 50]);
    const high = low + 29;
    isMatch = (n) => n >= low && n <= high;
    ruleDescription = `Les nombres compris entre ${low} et ${high}.`;
  }

  const matchPool = shuffle(allNums.filter(isMatch));
  const nonMatchPool = shuffle(allNums.filter((n) => !isMatch(n)));

  const loiVals = matchPool.slice(0, 3);
  const antiVals = nonMatchPool.slice(0, 3);
  const usedSet = new Set([...loiVals, ...antiVals]);
  const remainingMatch = matchPool.filter((v) => !usedSet.has(v));
  const remainingNonMatch = nonMatchPool.filter((v) => !usedSet.has(v));

  const matchCount = Math.min(randInt(2, 4), remainingMatch.length);
  const nonMatchCount = 6 - matchCount;
  const candMatch = remainingMatch.slice(0, matchCount);
  const candNonMatch = remainingNonMatch.slice(0, nonMatchCount);

  const candidates: CandidateItem[] = shuffle([
    ...candMatch.map((v) => ({ id: `m${v}`, kind: 'number' as const, text: String(v), isMatch: true })),
    ...candNonMatch.map((v) => ({ id: `n${v}`, kind: 'number' as const, text: String(v), isMatch: false })),
  ]);

  return {
    kind: 'number',
    loi: loiVals.map((v) => ({ id: `l${v}`, kind: 'number', text: String(v) })),
    antiLoi: antiVals.map((v) => ({ id: `a${v}`, kind: 'number', text: String(v) })),
    candidates,
    ruleDescription,
  };
}

// ============================================================================
// Question generators — words
// ============================================================================

function genWordQuestion(): QuestionData {
  const ruleType = pick(['length', 'startLetter', 'vowels'] as const);
  let predicate: (w: string) => boolean;
  let ruleDescription: string;

  if (ruleType === 'length') {
    const k = pick([5, 6, 7]);
    predicate = (w) => w.length === k;
    ruleDescription = `Les mots de ${k} lettres.`;
  } else if (ruleType === 'startLetter') {
    const letter = pick(['c', 'm', 'p']);
    predicate = (w) => w[0] === letter;
    ruleDescription = `Les mots qui commencent par la lettre "${letter.toUpperCase()}".`;
  } else {
    const k = pick([2, 3, 4]);
    predicate = (w) => vowelCount(w) === k;
    ruleDescription = `Les mots qui contiennent exactement ${k} voyelles.`;
  }

  const matchPool = shuffle(WORD_BANK.filter(predicate));
  const nonMatchPool = shuffle(WORD_BANK.filter((w) => !predicate(w)));

  const loiVals = matchPool.slice(0, 3);
  const antiVals = nonMatchPool.slice(0, 3);
  const usedSet = new Set([...loiVals, ...antiVals]);
  const remainingMatch = matchPool.filter((w) => !usedSet.has(w));
  const remainingNonMatch = nonMatchPool.filter((w) => !usedSet.has(w));

  const matchCount = Math.min(randInt(2, 4), remainingMatch.length);
  const nonMatchCount = 6 - matchCount;
  const candMatch = remainingMatch.slice(0, matchCount);
  const candNonMatch = remainingNonMatch.slice(0, nonMatchCount);

  const candidates: CandidateItem[] = shuffle([
    ...candMatch.map((w) => ({ id: `m-${w}`, kind: 'word' as const, text: w, isMatch: true })),
    ...candNonMatch.map((w) => ({ id: `n-${w}`, kind: 'word' as const, text: w, isMatch: false })),
  ]);

  return {
    kind: 'word',
    loi: loiVals.map((w) => ({ id: `l-${w}`, kind: 'word', text: w })),
    antiLoi: antiVals.map((w) => ({ id: `a-${w}`, kind: 'word', text: w })),
    candidates,
    ruleDescription,
  };
}

// ============================================================================
// Question generators — figures
// ============================================================================

function randFigure(overrides: Partial<FigureSpec> = {}): FigureSpec {
  return {
    shape: overrides.shape ?? pick(SHAPES),
    count: overrides.count ?? randInt(1, 4),
    filled: overrides.filled ?? Math.random() < 0.5,
  };
}

function figureKey(f: FigureSpec): string {
  return `${f.shape}-${f.count}-${f.filled}`;
}

const SHAPE_LABELS: Record<ShapeType, string> = {
  circle: 'ronds',
  square: 'carres',
  triangle: 'triangles',
  diamond: 'losanges',
};

function genFigureQuestion(): QuestionData {
  const ruleType = pick(['count', 'filled', 'shape'] as const);
  let makeMatch: () => FigureSpec;
  let makeNonMatch: () => FigureSpec;
  let ruleDescription: string;

  if (ruleType === 'count') {
    const k = randInt(2, 4);
    makeMatch = () => randFigure({ count: k });
    makeNonMatch = () => {
      let c = randInt(1, 4);
      while (c === k) c = randInt(1, 4);
      return randFigure({ count: c });
    };
    ruleDescription = `Les figures composees de ${k} formes.`;
  } else if (ruleType === 'filled') {
    const filled = Math.random() < 0.5;
    makeMatch = () => randFigure({ filled });
    makeNonMatch = () => randFigure({ filled: !filled });
    ruleDescription = `Les figures ${filled ? 'pleines (remplies)' : 'en contour (non remplies)'}.`;
  } else {
    const shape = pick(SHAPES);
    makeMatch = () => randFigure({ shape });
    makeNonMatch = () => {
      let s = pick(SHAPES);
      while (s === shape) s = pick(SHAPES);
      return randFigure({ shape: s });
    };
    ruleDescription = `Les figures composees de ${SHAPE_LABELS[shape]}.`;
  }

  const usedKeys = new Set<string>();
  function makeUnique(gen: () => FigureSpec): FigureSpec {
    let spec = gen();
    let guard = 0;
    while (usedKeys.has(figureKey(spec)) && guard < 30) {
      spec = gen();
      guard++;
    }
    usedKeys.add(figureKey(spec));
    return spec;
  }

  const loiSpecs = [makeUnique(makeMatch), makeUnique(makeMatch), makeUnique(makeMatch)];
  const antiSpecs = [makeUnique(makeNonMatch), makeUnique(makeNonMatch), makeUnique(makeNonMatch)];

  const matchCount = randInt(2, 4);
  const candSpecs: { spec: FigureSpec; isMatch: boolean }[] = [];
  for (let i = 0; i < matchCount; i++) candSpecs.push({ spec: makeUnique(makeMatch), isMatch: true });
  for (let i = 0; i < 6 - matchCount; i++) candSpecs.push({ spec: makeUnique(makeNonMatch), isMatch: false });

  const candidates: CandidateItem[] = shuffle(candSpecs).map((c, i) => ({
    id: `c${i}-${figureKey(c.spec)}`,
    kind: 'figure' as const,
    figure: c.spec,
    isMatch: c.isMatch,
  }));

  return {
    kind: 'figure',
    loi: loiSpecs.map((s, i) => ({ id: `l${i}`, kind: 'figure', figure: s })),
    antiLoi: antiSpecs.map((s, i) => ({ id: `a${i}`, kind: 'figure', figure: s })),
    candidates,
    ruleDescription,
  };
}

const GENERATORS = [genNumberQuestion, genWordQuestion, genFigureQuestion];

function generateQuestion(): QuestionData {
  return pick(GENERATORS)();
}

function generateQuestions(count: number): QuestionData[] {
  return Array.from({ length: count }, () => generateQuestion());
}

function computeSessionScore(results: QuestionResult[], totalQuestions: number) {
  let correct = 0;
  let incorrect = 0;
  let skipped = 0;
  for (const r of results) {
    if (r.outcome === 'correct') correct += 1;
    else if (r.outcome === 'incorrect') incorrect += 1;
    else skipped += 1;
  }
  const raw = correct - incorrect / 3;
  const percent = totalQuestions > 0 ? Math.round((raw / totalQuestions) * 1000) / 10 : 0;
  return { raw, percent, correct, incorrect, skipped };
}

// ============================================================================
// Rendering helpers
// ============================================================================

function renderShapeSvg(shape: ShapeType, filled: boolean, size: number): React.ReactNode {
  const stroke = NAVY;
  const fill = filled ? NAVY : 'none';
  switch (shape) {
    case 'circle':
      return <circle cx={size / 2} cy={size / 2} r={size / 2 - 2} fill={fill} stroke={stroke} strokeWidth={2} />;
    case 'square':
      return <rect x={2} y={2} width={size - 4} height={size - 4} fill={fill} stroke={stroke} strokeWidth={2} />;
    case 'triangle':
      return (
        <polygon points={`${size / 2},2 ${size - 2},${size - 2} 2,${size - 2}`} fill={fill} stroke={stroke} strokeWidth={2} />
      );
    case 'diamond':
      return (
        <polygon
          points={`${size / 2},2 ${size - 2},${size / 2} ${size / 2},${size - 2} 2,${size / 2}`}
          fill={fill}
          stroke={stroke}
          strokeWidth={2}
        />
      );
  }
}

function FigureView({ spec, size = 22 }: { spec: FigureSpec; size?: number }) {
  const gap = 6;
  const width = spec.count * size + (spec.count - 1) * gap;
  return (
    <svg width={width} height={size} viewBox={`0 0 ${width} ${size}`}>
      {Array.from({ length: spec.count }).map((_, i) => (
        <g key={i} transform={`translate(${i * (size + gap)},0)`}>
          {renderShapeSvg(spec.shape, spec.filled, size)}
        </g>
      ))}
    </svg>
  );
}

function ItemView({ item, size = 22 }: { item: DisplayItem; size?: number }) {
  if (item.kind === 'figure' && item.figure) {
    return <FigureView spec={item.figure} size={size} />;
  }
  return <span className="text-lg font-semibold">{item.text}</span>;
}

// ============================================================================
// Component
// ============================================================================

export default function EfgTest() {
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [locked, setLocked] = useState(false);
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
  const selectedIdsRef = useRef<Set<string>>(new Set());

  currentIdxRef.current = currentIdx;
  questionsRef.current = questions;
  lockedRef.current = locked;
  selectedIdsRef.current = selectedIds;

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
      setSelectedIds(new Set());
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
    setSelectedIds(new Set());
    setShowCorrection(false);
    setLastOutcome(null);
    startTimer(settingsRef.current.timePerQuestionSec * 1000);
  }, [clearTimer, startTimer]);

  const recordAnswer = useCallback(
    (ids: string[], outcome: AnswerOutcome) => {
      if (lockedRef.current) return;
      lockedRef.current = true;
      setLocked(true);
      clearTimer();

      const timeUsed = Date.now() - questionStartRef.current;
      const q = questionsRef.current[currentIdxRef.current];
      const result: QuestionResult = { question: q, selectedIds: ids, outcome, timeUsedMs: timeUsed };
      setResults((prev) => [...prev, result]);
      setLastOutcome(outcome);

      if (settingsRef.current.examMode) {
        goToNextQuestion();
      } else {
        setShowCorrection(true);
      }
    },
    [clearTimer, goToNextQuestion],
  );

  const toggleCandidate = useCallback((id: string) => {
    if (lockedRef.current) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleValidate = useCallback(() => {
    const q = questionsRef.current[currentIdxRef.current];
    const selected = [...selectedIdsRef.current];
    const correctSet = new Set(q.candidates.filter((c) => c.isMatch).map((c) => c.id));
    const isCorrect = selected.length === correctSet.size && selected.every((id) => correctSet.has(id));
    recordAnswer(selected, isCorrect ? 'correct' : 'incorrect');
  }, [recordAnswer]);

  const startGame = useCallback(() => {
    perfSavedRef.current = false;
    const qs = generateQuestions(settingsRef.current.totalQuestions);
    setQuestions(qs);
    questionsRef.current = qs;
    setCurrentIdx(0);
    currentIdxRef.current = 0;
    setResults([]);
    setLocked(false);
    lockedRef.current = false;
    setSelectedIds(new Set());
    setShowCorrection(false);
    setLastOutcome(null);
    setGameState('playing');
    startTimer(settingsRef.current.timePerQuestionSec * 1000);
  }, [startTimer]);

  useEffect(() => {
    if (gameState !== 'playing' || locked) return;
    if (totalTime > 0 && timeLeft <= 0) {
      recordAnswer([...selectedIdsRef.current], 'skipped');
    }
  }, [timeLeft, totalTime, gameState, locked, recordAnswer]);

  // =========================================================================
  // MENU
  // =========================================================================
  if (gameState === 'menu') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">EFG — Loi et anti-loi</CardTitle>
            <CardDescription className="mt-2 text-base">
              Identifiez la loi commune aux exemples, puis retrouvez-la parmi les candidats
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
              <p>
                3 exemples suivent une <strong>loi</strong>, 3 autres illustrent l&apos;<strong>anti-loi</strong>.
              </p>
              <p>
                Parmi <strong>6 candidats</strong>, selectionnez tous ceux qui suivent la loi (et uniquement ceux-la).
              </p>
              <p>
                <strong>{settings.timePerQuestionSec}s</strong> par question.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xl font-bold text-slate-700">{settings.totalQuestions}</p>
                <p className="text-xs text-slate-500">Questions</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xl font-bold text-slate-700">6</p>
                <p className="text-xs text-slate-500">Candidats</p>
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

  // =========================================================================
  // SETTINGS
  // =========================================================================
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
                  min={5}
                  max={30}
                  step={1}
                  className="mt-2"
                />
              </div>
              <div>
                <Label>Temps par question : {settings.timePerQuestionSec}s</Label>
                <Slider
                  value={[settings.timePerQuestionSec]}
                  onValueChange={([v]) => setSettings((s) => ({ ...s, timePerQuestionSec: v }))}
                  min={15}
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
    const score = computeSessionScore(results, questions.length || settings.totalQuestions);
    const avgTime =
      results.length > 0
        ? Math.round((results.reduce((s, r) => s + r.timeUsedMs, 0) / results.length / 1000) * 10) / 10
        : 0;

    if (!perfSavedRef.current) {
      perfSavedRef.current = true;
      const avgMs = results.length > 0 ? results.reduce((s, r) => s + r.timeUsedMs, 0) / results.length : 0;
      savePerformanceResult('efg', Math.round(score.percent), 100, avgMs);
    }

    const perfEntries = loadEntries('efg');
    const grade =
      score.percent >= 75 ? 'Excellent' : score.percent >= 50 ? 'Bien' : score.percent >= 25 ? 'Passable' : 'A revoir';

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">Resultats</CardTitle>
            <Badge
              variant={score.percent >= 75 ? 'default' : score.percent >= 50 ? 'secondary' : 'destructive'}
              className="mt-2 px-4 py-1 text-lg"
            >
              {grade}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-5xl font-bold text-slate-700">{score.percent}%</p>
              <p className="mt-1 text-slate-500">
                Score brut : {score.raw.toFixed(1)} / {questions.length || settings.totalQuestions}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-green-50 p-3 text-center">
                <p className="text-2xl font-bold text-green-600">{score.correct}</p>
                <p className="text-xs text-green-700">Correct</p>
              </div>
              <div className="rounded-lg bg-red-50 p-3 text-center">
                <p className="text-2xl font-bold text-red-600">{score.incorrect}</p>
                <p className="text-xs text-red-700">Incorrect</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 text-center">
                <p className="text-2xl font-bold text-slate-600">{score.skipped}</p>
                <p className="text-xs text-slate-500">Passe</p>
              </div>
            </div>

            <div className="rounded-lg bg-amber-50 p-3 text-center">
              <p className="text-2xl font-bold text-amber-600">{avgTime}s</p>
              <p className="text-sm text-amber-700">Temps moyen</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-700">Detail par question :</p>
              <div className="max-h-64 space-y-1.5 overflow-y-auto">
                {results.map((r, i) => (
                  <div key={i} className="rounded bg-slate-50 px-3 py-2 text-sm">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-slate-500">Q{i + 1}</span>
                      <span
                        className={
                          r.outcome === 'correct'
                            ? 'font-semibold text-green-600'
                            : r.outcome === 'incorrect'
                              ? 'font-semibold text-red-600'
                              : 'font-semibold text-slate-500'
                        }
                      >
                        {r.outcome === 'correct' ? '\u2713' : r.outcome === 'incorrect' ? '\u2717' : '\u2014'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">{r.question.ruleDescription}</p>
                  </div>
                ))}
              </div>
            </div>

            {perfEntries.length >= 2 && (
              <div className="border-t pt-4">
                <p className="mb-2 text-center text-sm font-medium text-slate-500">Progression</p>
                <div className="flex justify-center">
                  <MiniPerformanceChart entries={perfEntries} exerciseId="efg" />
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
  const correctIds = currentQ ? new Set(currentQ.candidates.filter((c) => c.isMatch).map((c) => c.id)) : new Set<string>();

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: BG, color: NAVY }}>
      <div className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-6">
        <div
          className="absolute bottom-24 right-2 top-6 flex w-3 flex-col overflow-hidden rounded-full"
          style={{ backgroundColor: '#bbb' }}
        >
          <div
            className="w-full transition-all duration-100"
            style={{ height: `${timerPercent}%`, backgroundColor: timerFillColor }}
          />
          <div className="flex-1" />
        </div>

        <div className="mb-4 flex items-center justify-between pr-8">
          <Badge variant="outline" className="border-transparent bg-white px-3 py-1 text-base" style={{ color: NAVY }}>
            {currentIdx + 1} / {settings.totalQuestions}
          </Badge>
        </div>

        {/* Loi / Anti-loi */}
        <div className="mb-6 grid grid-cols-2 gap-3 pr-8">
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="mb-3 text-center text-sm font-semibold uppercase tracking-wide text-green-700">Loi</p>
            <div className="flex flex-col items-center gap-3">
              {currentQ?.loi.map((item) => (
                <div key={item.id} className="flex min-h-[32px] items-center justify-center">
                  <ItemView item={item} />
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="mb-3 text-center text-sm font-semibold uppercase tracking-wide text-red-700">Anti-loi</p>
            <div className="flex flex-col items-center gap-3">
              {currentQ?.antiLoi.map((item) => (
                <div key={item.id} className="flex min-h-[32px] items-center justify-center">
                  <ItemView item={item} />
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="mb-3 pr-8 text-center text-sm font-medium" style={{ color: NAVY, opacity: 0.7 }}>
          Selectionnez les candidats qui suivent la loi
        </p>

        {/* Candidates */}
        <div className="mx-auto mb-4 grid w-full max-w-lg grid-cols-3 gap-3 pr-8">
          {currentQ?.candidates.map((item) => {
            const isSelected = selectedIds.has(item.id);
            const isCorrectAnswer = showCorrection && correctIds.has(item.id);
            const isWrongSelection = showCorrection && isSelected && !correctIds.has(item.id);
            let style: React.CSSProperties = {
              backgroundColor: '#ffffff',
              color: NAVY,
              border: '2px solid transparent',
            };
            if (isCorrectAnswer) {
              style = { backgroundColor: '#dcfce7', color: '#166534', border: '2px solid #22c55e' };
            } else if (isWrongSelection) {
              style = { backgroundColor: '#fee2e2', color: '#991b1b', border: '2px solid #ef4444' };
            } else if (isSelected) {
              style = { backgroundColor: '#dbeafe', color: '#1d4ed8', border: '2px solid #3b82f6' };
            }
            return (
              <button
                key={item.id}
                type="button"
                disabled={locked}
                onClick={() => toggleCandidate(item.id)}
                className="relative flex min-h-[64px] items-center justify-center rounded-xl px-3 py-4 shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-90"
                style={{ ...style, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}
              >
                {isSelected && !showCorrection && (
                  <Check className="absolute right-1.5 top-1.5 h-4 w-4" style={{ color: '#1d4ed8' }} />
                )}
                <ItemView item={item} />
              </button>
            );
          })}
        </div>

        {showCorrection && currentQ && (
          <div className="mx-auto mb-4 w-full max-w-lg rounded-xl border border-slate-200 bg-white p-4 shadow-sm pr-8">
            <p
              className={`mb-1 text-center text-base font-semibold ${
                lastOutcome === 'correct'
                  ? 'text-green-600'
                  : lastOutcome === 'incorrect'
                    ? 'text-red-600'
                    : 'text-slate-600'
              }`}
            >
              {lastOutcome === 'correct' ? 'Correct !' : lastOutcome === 'incorrect' ? 'Incorrect' : 'Temps ecoule'}
            </p>
            <p className="text-center text-base text-slate-700">
              <span className="font-medium text-slate-500">Loi : </span>
              {currentQ.ruleDescription}
            </p>
            <Button size="lg" className="mt-4 w-full" onClick={goToNextQuestion}>
              {currentIdx + 1 >= questions.length ? 'Voir les resultats' : 'Suivant'}
            </Button>
          </div>
        )}

        {!showCorrection && (
          <div className="mx-auto mb-6 w-full max-w-lg pr-8">
            <Button size="lg" className="w-full" onClick={handleValidate} disabled={locked}>
              Valider
            </Button>
          </div>
        )}

        <div className="border-t py-3 pr-8 text-center text-base font-medium" style={{ borderColor: 'rgba(26,43,74,0.2)', color: NAVY }}>
          {currentIdx + 1} &rarr; {settings.totalQuestions}
        </div>
      </div>
    </div>
  );
}

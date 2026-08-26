'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, ChevronRight, Home, Play, RotateCcw, Settings, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { savePerformanceResult, loadEntries } from '@/lib/core/PerformanceTracker';
import { MiniPerformanceChart } from '@/components/PerformanceChart';
import {
  type CubeFaceId,
  type LayoutId,
  type NetFace,
  cubeToNetBySlot,
  cubesEqualModuloRotation,
  foldNet,
  getLayout,
} from '@/lib/cubes/netFold';

// ============================================================================
// Types
// ============================================================================

type GameState = 'menu' | 'settings' | 'playing' | 'results';
type SymbolId = 'star' | 'moon' | 'cross' | 'dot' | 'wave' | 'plus';

interface GameSettings {
  totalQuestions: number;
  timePerQuestionSec: number;
  examMode: boolean;
}

interface QuestionData {
  layoutId: LayoutId;
  logicalCube: Record<CubeFaceId, NetFace>;
  views: { label: string; face: CubeFaceId }[];
  correctAssignments: Record<number, SymbolId>;
}

interface QuestionResult {
  correct: boolean;
  timeMs: number;
}

// ============================================================================
// Constants
// ============================================================================

const EXERCISE_ID = 'cubes-psy1';
const SETTINGS_KEY = 'aviatest-cubes-psy1-settings';
const SLATE_BG = 'bg-gradient-to-br from-slate-50 to-slate-100';
const FACE_SIZE = 72;

const DEFAULT_SETTINGS: GameSettings = {
  totalQuestions: 8,
  timePerQuestionSec: 90,
  examMode: false,
};

const SYMBOL_IDS: SymbolId[] = ['star', 'moon', 'cross', 'dot', 'wave', 'plus'];

const PATTERN_TO_SYMBOL: Record<string, SymbolId> = {
  cross: 'cross',
  square: 'dot',
  octagon: 'star',
  'stripes-h': 'wave',
  'stripes-v': 'plus',
  circles: 'moon',
};

const SYMBOL_TO_PATTERN: Record<SymbolId, string> = {
  star: 'octagon',
  moon: 'circles',
  cross: 'cross',
  dot: 'square',
  wave: 'stripes-h',
  plus: 'stripes-v',
};

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

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateLogicalCube(): Record<CubeFaceId, NetFace> {
  const patterns = shuffle(['cross', 'square', 'octagon', 'stripes-h', 'stripes-v', 'circles']);
  const rots = [0, 90, 180, 270] as const;
  const faces: CubeFaceId[] = ['F', 'B', 'L', 'R', 'U', 'D'];
  const cube = {} as Record<CubeFaceId, NetFace>;
  faces.forEach((f, i) => {
    cube[f] = { pattern: patterns[i], rotation: pick(rots) };
  });
  return cube;
}

const FACE_VIEWS: { face: CubeFaceId; label: string }[] = [
  { face: 'F', label: 'Face' },
  { face: 'R', label: 'Droite' },
  { face: 'B', label: 'Arriere' },
  { face: 'L', label: 'Gauche' },
  { face: 'U', label: 'Dessus' },
  { face: 'D', label: 'Dessous' },
];

function generateQuestion(): QuestionData {
  const layoutId: LayoutId = pick(['A', 'B']);
  const logicalCube = generateLogicalCube();
  const net = cubeToNetBySlot(logicalCube, layoutId);

  const correctAssignments: Record<number, SymbolId> = {};
  net.forEach((face, slot) => {
    correctAssignments[slot + 1] = PATTERN_TO_SYMBOL[face.pattern] ?? 'dot';
  });

  const views = FACE_VIEWS.map(({ face, label }) => ({ label, face }));

  return { layoutId, logicalCube, views, correctAssignments };
}

function isAssignmentCorrect(
  question: QuestionData,
  assignments: Record<number, SymbolId | null>,
): boolean {
  const refCube = question.logicalCube;
  const layout = getLayout(question.layoutId);
  const netFaces: (NetFace | null)[] = Array(6).fill(null);

  for (const slotDef of layout.slots) {
    const num = slotDef.slot + 1;
    const sym = assignments[num];
    if (!sym) return false;
    const face = refCube[slotDef.cubeFace];
    const expectedSym = PATTERN_TO_SYMBOL[face.pattern];
    if (sym !== expectedSym) return false;
    netFaces[slotDef.slot] = {
      pattern: SYMBOL_TO_PATTERN[sym],
      rotation: face.rotation,
    };
  }

  const folded = foldNet(netFaces, question.layoutId);
  if (!folded) return false;
  return cubesEqualModuloRotation(refCube, folded);
}

// ============================================================================
// Symbol SVG
// ============================================================================

function SymbolSvg({ id, size = FACE_SIZE }: { id: SymbolId; size?: number }) {
  const stroke = '#1a1a1a';
  const sw = 2;
  const cx = size / 2;
  const cy = size / 2;

  switch (id) {
    case 'star': {
      const r = size * 0.32;
      const pts = Array.from({ length: 5 }, (_, i) => {
        const a = (Math.PI * 2 * i) / 5 - Math.PI / 2;
        const r2 = i % 2 === 0 ? r : r * 0.45;
        return `${cx + r2 * Math.cos(a)},${cy + r2 * Math.sin(a)}`;
      }).join(' ');
      return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <polygon points={pts} fill="none" stroke={stroke} strokeWidth={sw} />
        </svg>
      );
    }
    case 'moon':
      return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <path
            d={`M ${cx + size * 0.2} ${cy} A ${size * 0.28} ${size * 0.28} 0 1 1 ${cx + size * 0.2} ${cy - 0.01}`}
            fill="none"
            stroke={stroke}
            strokeWidth={sw}
          />
        </svg>
      );
    case 'cross':
      return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <line x1={cx} y1={size * 0.2} x2={cx} y2={size * 0.8} stroke={stroke} strokeWidth={sw} />
          <line x1={size * 0.2} y1={cy} x2={size * 0.8} y2={cy} stroke={stroke} strokeWidth={sw} />
        </svg>
      );
    case 'dot':
      return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <rect x={size * 0.28} y={size * 0.28} width={size * 0.44} height={size * 0.44} fill="none" stroke={stroke} strokeWidth={sw} />
        </svg>
      );
    case 'wave':
      return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {[0.32, 0.5, 0.68].map((y) => (
            <line key={y} x1={size * 0.22} y1={size * y} x2={size * 0.78} y2={size * y} stroke={stroke} strokeWidth={sw} />
          ))}
        </svg>
      );
    case 'plus':
      return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {[0.32, 0.5, 0.68].map((x) => (
            <line key={x} x1={size * x} y1={size * 0.22} x2={size * x} y2={size * 0.78} stroke={stroke} strokeWidth={sw} />
          ))}
        </svg>
      );
    default:
      return null;
  }
}

function CubeNetNumbered({
  layoutId,
  assignments,
  onSlotClick,
  selectedSlot,
  review,
}: {
  layoutId: LayoutId;
  assignments: Record<number, SymbolId | null>;
  onSlotClick?: (num: number) => void;
  selectedSlot: number | null;
  review?: boolean;
}) {
  const layout = getLayout(layoutId);
  const cell = FACE_SIZE + 8;

  return (
    <div
      className="relative"
      style={{
        width: layout.cols * cell,
        height: layout.rows * cell,
      }}
    >
      {layout.slots.map((slotDef) => {
        const num = slotDef.slot + 1;
        const sym = assignments[num];
        const isSel = selectedSlot === num;
        return (
          <button
            key={slotDef.slot}
            type="button"
            disabled={review || !onSlotClick}
            onClick={() => onSlotClick?.(num)}
            className={`absolute flex flex-col items-center justify-center border-2 bg-white transition-all ${
              review
                ? 'border-green-500 bg-green-50'
                : isSel
                  ? 'border-blue-500 ring-2 ring-blue-200'
                  : 'border-slate-400'
            }`}
            style={{
              left: slotDef.col * cell,
              top: slotDef.row * cell,
              width: cell,
              height: cell,
            }}
          >
            <span className="absolute left-1 top-0 text-xs font-bold text-slate-500">{num}</span>
            {sym ? <SymbolSvg id={sym} size={FACE_SIZE - 8} /> : <span className="text-slate-300">?</span>}
          </button>
        );
      })}
    </div>
  );
}

function ViewCard({ label, symbol }: { label: string; symbol: SymbolId }) {
  return (
    <div className="flex flex-col items-center rounded-lg border-2 border-slate-300 bg-white p-4">
      <p className="mb-2 text-xs font-semibold uppercase text-slate-500">{label}</p>
      <SymbolSvg id={symbol} size={80} />
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

export default function CubesPsy1Test() {
  const router = useRouter();
  const [gameState, setGameState] = useState<GameState>('menu');
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [assignments, setAssignments] = useState<Record<number, SymbolId | null>>({});
  const [selectedSymbol, setSelectedSymbol] = useState<SymbolId | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [flash, setFlash] = useState<'correct' | 'wrong' | null>(null);
  const [showCorrection, setShowCorrection] = useState(false);
  const [locked, setLocked] = useState(false);

  const perfSavedRef = useRef(false);
  const questionStartRef = useRef(0);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  useEffect(() => {
    saveSettingsLocal(settings);
  }, [settings]);

  const resetAssignments = useCallback(() => {
    const a: Record<number, SymbolId | null> = {};
    for (let i = 1; i <= 6; i++) a[i] = null;
    setAssignments(a);
    setSelectedSymbol(null);
    setSelectedSlot(null);
  }, []);

  const startGame = useCallback(() => {
    perfSavedRef.current = false;
    const qs = Array.from({ length: settings.totalQuestions }, () => generateQuestion());
    setQuestions(qs);
    setCurrentIdx(0);
    setResults([]);
    resetAssignments();
    setFlash(null);
    setShowCorrection(false);
    setLocked(false);
    questionStartRef.current = Date.now();
    setTimeLeft(settings.timePerQuestionSec);
    setGameState('playing');
  }, [settings, resetAssignments]);

  const handleSlotClick = useCallback(
    (num: number) => {
      if (locked) return;
      if (selectedSymbol) {
        setAssignments((a) => ({ ...a, [num]: selectedSymbol }));
        setSelectedSymbol(null);
        setSelectedSlot(null);
      } else {
        setSelectedSlot(num);
      }
    },
    [locked, selectedSymbol],
  );

  const goToNextQuestion = useCallback(() => {
    if (currentIdx + 1 >= questions.length) {
      setGameState('results');
      return;
    }
    setCurrentIdx((i) => i + 1);
    resetAssignments();
    setFlash(null);
    setShowCorrection(false);
    setLocked(false);
    questionStartRef.current = Date.now();
    setTimeLeft(settings.timePerQuestionSec);
  }, [currentIdx, questions.length, resetAssignments, settings.timePerQuestionSec]);

  const handleSubmit = useCallback(
    (timeout = false) => {
      if (locked) return;
      const q = questions[currentIdx];
      if (!q) return;
      setLocked(true);
      const timeMs = Date.now() - questionStartRef.current;
      const correct = !timeout && isAssignmentCorrect(q, assignments);
      setResults((prev) => [...prev, { correct, timeMs }]);
      if (settings.examMode) {
        goToNextQuestion();
      } else {
        setFlash(correct ? 'correct' : 'wrong');
        setShowCorrection(true);
      }
    },
    [locked, questions, currentIdx, assignments, settings.examMode, goToNextQuestion],
  );

  useEffect(() => {
    if (gameState !== 'playing' || locked) return;
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          handleSubmit(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [gameState, locked, handleSubmit]);

  const currentQ = questions[currentIdx];
  const allAssigned = Object.values(assignments).every((v) => v !== null);
  const timerPct = settings.timePerQuestionSec > 0 ? (timeLeft / settings.timePerQuestionSec) * 100 : 0;

  if (gameState === 'menu') {
    return (
      <div className={`flex min-h-screen flex-col items-center justify-center ${SLATE_BG} p-4`}>
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Cubes PSY1</CardTitle>
            <CardDescription>Associez les symboles au developpement du cube</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xl font-bold">{settings.totalQuestions}</p>
                <p className="text-xs text-slate-500">Questions</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xl font-bold">{settings.timePerQuestionSec}s</p>
                <p className="text-xs text-slate-500">Temps</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xl font-bold">{settings.examMode ? 'Oui' : 'Non'}</p>
                <p className="text-xs text-slate-500">Examen</p>
              </div>
            </div>
            <Button size="lg" className="w-full" onClick={startGame}>
              <Play className="mr-2 h-5 w-5" /> Commencer
            </Button>
            <Button variant="outline" className="w-full" onClick={() => setGameState('settings')}>
              <Settings className="mr-2 h-5 w-5" /> Parametres
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => router.push('/')}>
              <ArrowLeft className="mr-2 h-5 w-5" /> Retour
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (gameState === 'settings') {
    return (
      <div className={`flex min-h-screen flex-col items-center justify-center ${SLATE_BG} p-4`}>
        <Card className="w-full max-w-lg">
          <CardHeader><CardTitle>Parametres</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label>Questions : {settings.totalQuestions}</Label>
              <Slider value={[settings.totalQuestions]} onValueChange={([v]) => setSettings((s) => ({ ...s, totalQuestions: v }))} min={4} max={15} step={1} className="mt-2" />
            </div>
            <div>
              <Label>Temps : {settings.timePerQuestionSec}s</Label>
              <Slider value={[settings.timePerQuestionSec]} onValueChange={([v]) => setSettings((s) => ({ ...s, timePerQuestionSec: v }))} min={45} max={120} step={5} className="mt-2" />
            </div>
            <div className="flex items-center justify-between rounded-lg border bg-slate-50 p-4">
              <Label>Mode examen</Label>
              <Switch checked={settings.examMode} onCheckedChange={(v) => setSettings((s) => ({ ...s, examMode: v }))} />
            </div>
            <Button className="w-full" onClick={() => setGameState('menu')}>Retour</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (gameState === 'results') {
    const correct = results.filter((r) => r.correct).length;
    const total = results.length;
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
    if (!perfSavedRef.current) {
      perfSavedRef.current = true;
      const avgMs = results.length > 0 ? results.reduce((s, r) => s + r.timeMs, 0) / results.length : 0;
      savePerformanceResult(EXERCISE_ID, correct, total, avgMs);
    }
    const perfEntries = loadEntries(EXERCISE_ID);
    return (
      <div className={`flex min-h-screen flex-col items-center justify-center ${SLATE_BG} p-4`}>
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle>Resultats</CardTitle>
            <Badge>{pct}%</Badge>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-center text-5xl font-bold">{correct}/{total}</p>
            {perfEntries.length >= 2 && <MiniPerformanceChart entries={perfEntries} exerciseId={EXERCISE_ID} />}
            <Button className="w-full" onClick={startGame}><RotateCcw className="mr-2 h-5 w-5" /> Rejouer</Button>
            <Button variant="outline" className="w-full" onClick={() => setGameState('menu')}>Menu</Button>
            <Button variant="ghost" className="w-full" onClick={() => router.push('/')}><Home className="mr-2 h-5 w-5" /> Accueil</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentQ) return null;

  const showSolution = showCorrection && flash === 'wrong';
  const netAssignments = showSolution
    ? currentQ.correctAssignments
    : assignments;

  return (
    <div className={`flex min-h-screen flex-col ${SLATE_BG}`}>
      <div className="border-b bg-white/70 px-4 py-3">
        <div className="mx-auto flex max-w-5xl justify-between text-sm font-medium">
          <span>Question {currentIdx + 1}/{questions.length}</span>
          <span>{timeLeft}s</span>
          <span>Score : {results.filter((r) => r.correct).length}/{results.length}</span>
        </div>
        <div className="mx-auto mt-2 h-2 max-w-5xl rounded-full bg-slate-200">
          <div className="h-full rounded-full" style={{ width: `${timerPct}%`, backgroundColor: timerPct < 20 ? '#dc2626' : '#0068C6' }} />
        </div>
      </div>

      <div className="mx-auto w-full max-w-5xl flex-1 space-y-6 p-4 md:p-6">
        {flash && (
          <div className={`flex items-center gap-2 rounded-lg border px-4 py-3 font-semibold ${flash === 'correct' ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
            {flash === 'correct' ? <CheckCircle2 className="h-6 w-6" /> : <XCircle className="h-6 w-6" />}
            {flash === 'correct' ? 'Correct' : 'Incorrect — solution sur le developpement'}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border bg-white/80 p-5">
            <p className="mb-4 text-sm font-semibold uppercase text-slate-600">Vues du cube</p>
            <div className="flex flex-wrap justify-center gap-4">
              {currentQ.views.map((v) => {
                const face = currentQ.logicalCube[v.face];
                const sym = PATTERN_TO_SYMBOL[face.pattern] ?? 'dot';
                return <ViewCard key={v.face} label={v.label} symbol={sym} />;
              })}
            </div>
          </div>

          <div className="rounded-xl border bg-white/80 p-5">
            <p className="mb-4 text-sm font-semibold uppercase text-slate-600">
              {showSolution ? 'Solution' : 'Developpement numerote'}
            </p>
            <div className="flex justify-center">
              <CubeNetNumbered
                layoutId={currentQ.layoutId}
                assignments={netAssignments}
                onSlotClick={showCorrection ? undefined : handleSlotClick}
                selectedSlot={showCorrection ? null : selectedSlot}
                review={showSolution}
              />
            </div>
          </div>
        </div>

        {!showCorrection && (
          <div className="rounded-xl border bg-white/80 p-5">
            <p className="mb-3 text-sm font-semibold uppercase text-slate-600">Symboles — cliquez puis placez sur un numero</p>
            <div className="flex flex-wrap justify-center gap-3">
              {SYMBOL_IDS.map((sym) => (
                <button
                  key={sym}
                  type="button"
                  disabled={locked}
                  onClick={() => setSelectedSymbol(sym)}
                  className={`rounded-lg border-2 bg-white p-2 transition-all ${
                    selectedSymbol === sym ? 'border-blue-500 ring-2 ring-blue-200' : 'border-slate-200 hover:border-slate-400'
                  }`}
                >
                  <SymbolSvg id={sym} />
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-center gap-4">
          {showCorrection ? (
            <Button size="lg" onClick={goToNextQuestion}>
              {currentIdx + 1 >= questions.length ? 'Voir les resultats' : 'Suivant'}
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          ) : (
            <>
              <Button variant="outline" disabled={locked} onClick={resetAssignments}>Effacer</Button>
              <Button size="lg" disabled={!allAssigned || locked} onClick={() => handleSubmit(false)}>Valider</Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

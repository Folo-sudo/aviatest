'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as THREE from 'three';
import { savePerformanceResult, loadEntries } from '@/lib/core/PerformanceTracker';
import { MiniPerformanceChart } from '@/components/PerformanceChart';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Play, RotateCcw, Home, Settings, CheckCircle2, XCircle } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

type GameState = 'menu' | 'settings' | 'playing' | 'results';
type Axis = 'X' | 'Y' | 'Z';

interface RotationStep {
  axis: Axis;
  angle: number;
}

interface Question {
  steps: RotationStep[];
  finalRx: number;
  finalRy: number;
  finalRz: number;
  choices: { rx: number; ry: number; rz: number }[];
  correctIdx: number;
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

const EXERCISE_ID = 'voitures-basic';
const SETTINGS_KEY = 'aviatest-voitures-basic-settings';
const SLATE_BG = 'bg-gradient-to-br from-slate-50 to-slate-100';

const DEFAULT_SETTINGS: GameSettings = {
  numQuestions: 15,
  timePerQuestion: 45,
  examMode: false,
};

const ANGLES = [-90, 90, 180];

// ============================================================================
// Three.js car
// ============================================================================

function createCarScene(): { scene: THREE.Scene; carGroup: THREE.Group } {
  const scene = new THREE.Scene();
  const ambient = new THREE.AmbientLight(0xffffff, 1.2);
  scene.add(ambient);
  const d1 = new THREE.DirectionalLight(0xffffff, 0.8);
  d1.position.set(5, 5, 5);
  scene.add(d1);
  const d2 = new THREE.DirectionalLight(0xffffff, 0.5);
  d2.position.set(-5, -5, -5);
  scene.add(d2);

  const carGroup = new THREE.Group();
  scene.add(carGroup);

  const bodyMat = new THREE.MeshPhongMaterial({ color: 0xc83232 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2, 0.6, 1), bodyMat);
  body.position.y = 0.3;
  carGroup.add(body);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1, 0.5, 0.9), bodyMat);
  cabin.position.set(0.2, 0.85, 0);
  carGroup.add(cabin);

  const wheelGeom = new THREE.CylinderGeometry(0.2, 0.2, 0.1, 16);
  const wheelMat = new THREE.MeshPhongMaterial({ color: 0x333333 });
  [[-0.6, 0.1, 0.55], [0.6, 0.1, 0.55], [-0.6, 0.1, -0.55], [0.6, 0.1, -0.55]].forEach(
    ([x, y, z]) => {
      const w = new THREE.Mesh(wheelGeom, wheelMat);
      w.rotation.x = Math.PI / 2;
      w.position.set(x, y, z);
      carGroup.add(w);
    },
  );

  return { scene, carGroup };
}

function CarView({
  rx,
  ry,
  rz,
  width = 180,
  height = 150,
}: {
  rx: number;
  ry: number;
  rz: number;
  width?: number;
  height?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<{ scene: THREE.Scene; carGroup: THREE.Group } | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  useEffect(() => {
    if (!sceneRef.current) sceneRef.current = createCarScene();
    const { scene, carGroup } = sceneRef.current;
    carGroup.rotation.x = THREE.MathUtils.degToRad(rx);
    carGroup.rotation.y = THREE.MathUtils.degToRad(ry);
    carGroup.rotation.z = THREE.MathUtils.degToRad(rz);

    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!rendererRef.current) {
      rendererRef.current = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    }
    const renderer = rendererRef.current;
    renderer.setSize(width, height, false);

    const camera = new THREE.OrthographicCamera(-2, 2, 2, -2, 0.1, 1000);
    camera.position.set(3, 3, 3);
    camera.lookAt(0, 0, 0);

    renderer.setClearColor(0xffffff, 0);
    renderer.render(scene, camera);
  }, [rx, ry, rz, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="rounded-lg border border-slate-300 bg-white"
    />
  );
}

function RotationBadge({ axis, angle }: { axis: Axis; angle: number }) {
  return (
    <div className="flex flex-col items-center rounded-lg border-2 border-slate-300 bg-white px-4 py-3">
      <span className="text-2xl font-bold text-slate-800">{Math.abs(angle)}°</span>
      <span className="text-xs text-slate-500">Axe {axis}</span>
      <span className="text-xs text-slate-400">{angle > 0 ? '↻' : '↺'}</span>
    </div>
  );
}

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

function norm360(v: number): number {
  return ((v % 360) + 360) % 360;
}

function generateQuestion(): Question {
  const axes: Axis[] = ['X', 'Y', 'Z'];
  const steps: RotationStep[] = Array.from({ length: 3 }, () => ({
    axis: pick(axes),
    angle: pick(ANGLES),
  }));

  let rx = 0, ry = 0, rz = 0;
  steps.forEach(({ axis, angle }) => {
    if (axis === 'X') rx += angle;
    else if (axis === 'Y') ry += angle;
    else rz += angle;
  });
  rx = norm360(rx);
  ry = norm360(ry);
  rz = norm360(rz);

  const correctIdx = randInt(0, 3);
  const decoys: { rx: number; ry: number; rz: number }[] = [];
  let guard = 0;
  while (decoys.length < 3 && guard < 30) {
    guard++;
    const d = {
      rx: norm360(rx + pick(ANGLES)),
      ry: norm360(ry + pick(ANGLES)),
      rz: norm360(rz + pick(ANGLES)),
    };
    const key = `${d.rx},${d.ry},${d.rz}`;
    if (key === `${rx},${ry},${rz}`) continue;
    if (decoys.some((x) => `${x.rx},${x.ry},${x.rz}` === key)) continue;
    decoys.push(d);
  }

  const choices = [...decoys];
  choices.splice(correctIdx, 0, { rx, ry, rz });

  return { steps, finalRx: rx, finalRy: ry, finalRz: rz, choices, correctIdx };
}

// ============================================================================
// Component
// ============================================================================

export default function VoituresBasicTest() {
  const router = useRouter();
  const [gameState, setGameState] = useState<GameState>('menu');
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [flash, setFlash] = useState<'correct' | 'wrong' | null>(null);
  const [locked, setLocked] = useState(false);

  const perfSavedRef = useRef(false);
  const questionStartRef = useRef(0);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  useEffect(() => {
    saveSettingsLocal(settings);
  }, [settings]);

  const startGame = useCallback(() => {
    perfSavedRef.current = false;
    setQuestions(Array.from({ length: settings.numQuestions }, () => generateQuestion()));
    setCurrentIdx(0);
    setResults([]);
    setSelected(null);
    setFlash(null);
    setLocked(false);
    questionStartRef.current = Date.now();
    setTimeLeft(settings.timePerQuestion);
    setGameState('playing');
  }, [settings]);

  const advance = useCallback(
    (result: QuestionResult) => {
      const next = [...results, result];
      setResults(next);
      if (currentIdx + 1 >= questions.length) {
        setGameState('results');
        return;
      }
      setCurrentIdx((i) => i + 1);
      setSelected(null);
      setFlash(null);
      setLocked(false);
      questionStartRef.current = Date.now();
      setTimeLeft(settings.timePerQuestion);
    },
    [currentIdx, questions.length, results, settings.timePerQuestion],
  );

  const handleSubmit = useCallback(
    (timeout = false) => {
      if (locked) return;
      const q = questions[currentIdx];
      if (!q) return;
      setLocked(true);
      const timeMs = Date.now() - questionStartRef.current;
      const sel = timeout ? null : selected;
      const correct = sel !== null && sel === q.correctIdx;
      if (!settings.examMode) {
        setFlash(correct ? 'correct' : 'wrong');
        setTimeout(() => advance({ selected: sel, correct, timeMs }), 1200);
      } else {
        advance({ selected: sel, correct, timeMs });
      }
    },
    [locked, questions, currentIdx, selected, settings.examMode, advance],
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
  }, [gameState, currentIdx, locked, handleSubmit]);

  const currentQ = questions[currentIdx];
  const timerPct = settings.timePerQuestion > 0 ? (timeLeft / settings.timePerQuestion) * 100 : 0;

  if (gameState === 'menu') {
    return (
      <div className={`flex min-h-screen flex-col items-center justify-center ${SLATE_BG} p-4`}>
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Voitures — rotations simultanees</CardTitle>
            <CardDescription>Visualisez les rotations et choisissez l'orientation finale</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xl font-bold">{settings.numQuestions}</p>
                <p className="text-xs text-slate-500">Questions</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xl font-bold">{settings.timePerQuestion}s</p>
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
              <Label>Questions : {settings.numQuestions}</Label>
              <Slider value={[settings.numQuestions]} onValueChange={([v]) => setSettings((s) => ({ ...s, numQuestions: v }))} min={5} max={40} step={5} className="mt-2" />
            </div>
            <div>
              <Label>Temps : {settings.timePerQuestion}s</Label>
              <Slider value={[settings.timePerQuestion]} onValueChange={([v]) => setSettings((s) => ({ ...s, timePerQuestion: v }))} min={20} max={90} step={5} className="mt-2" />
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

  return (
    <div className={`flex min-h-screen flex-col ${SLATE_BG}`}>
      <div className="border-b bg-white/70 px-4 py-3">
        <div className="mx-auto flex max-w-4xl justify-between text-sm font-medium">
          <span>Question {currentIdx + 1}/{questions.length}</span>
          <span>{timeLeft}s</span>
          <span>Score : {results.filter((r) => r.correct).length}/{results.length}</span>
        </div>
        <div className="mx-auto mt-2 h-2 max-w-4xl rounded-full bg-slate-200">
          <div className="h-full rounded-full transition-all" style={{ width: `${timerPct}%`, backgroundColor: timerPct < 20 ? '#dc2626' : '#0068C6' }} />
        </div>
      </div>

      <div className="mx-auto w-full max-w-4xl flex-1 space-y-6 p-6">
        {flash && (
          <div className={`flex items-center gap-2 rounded-lg border px-4 py-3 font-semibold ${flash === 'correct' ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
            {flash === 'correct' ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
            {flash === 'correct' ? 'Correct' : 'Incorrect'}
          </div>
        )}

        <p className="text-center text-sm font-semibold uppercase text-slate-600">Appliquez mentalement ces rotations simultanees</p>

        <div className="flex flex-wrap items-center justify-center gap-6">
          <CarView rx={0} ry={0} rz={0} width={200} height={170} />
          {currentQ.steps.map((s, i) => (
            <RotationBadge key={i} axis={s.axis} angle={s.angle} />
          ))}
        </div>

        <p className="text-center font-medium text-slate-700">Quelle est l'orientation finale ?</p>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {currentQ.choices.map((c, i) => {
            const isSel = selected === i;
            const showOk = locked && i === currentQ.correctIdx;
            const showBad = locked && isSel && i !== currentQ.correctIdx;
            return (
              <button
                key={i}
                type="button"
                disabled={locked}
                onClick={() => setSelected(i)}
                className={`flex flex-col items-center rounded-xl border-2 bg-white p-2 ${
                  showOk ? 'border-green-500 ring-2 ring-green-300' : showBad ? 'border-red-500 ring-2 ring-red-300' : isSel ? 'border-blue-500' : 'border-slate-200'
                }`}
              >
                <CarView rx={c.rx} ry={c.ry} rz={c.rz} />
                <span className="mt-1 text-sm font-medium">{i + 1}</span>
              </button>
            );
          })}
        </div>

        <div className="flex justify-center">
          <Button size="lg" disabled={selected === null || locked} onClick={() => handleSubmit(false)}>Valider</Button>
        </div>
      </div>
    </div>
  );
}

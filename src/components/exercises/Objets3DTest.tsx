'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as THREE from 'three';
import { savePerformanceResult, loadEntries, scoreToStanine } from '@/lib/core/PerformanceTracker';
import { MiniPerformanceChart } from '@/components/PerformanceChart';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Play, Settings, RotateCcw, Home } from 'lucide-react';
import { createShapeMesh } from '@/lib/3d/shapeCatalog';

// ============================================================================
// Types & constants
// ============================================================================

type GameState = 'menu' | 'settings' | 'playing' | 'results';

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

interface Question {
  scene: THREE.Scene;
  correctViewpoint: number; // 1-8
}

const EXERCISE_ID = 'objets-3d';
const SETTINGS_KEY = 'aviatest-objets-3d-settings';
const VIEWPOINT_COUNT = 8;
const CAMERA_RADIUS = 9;
const CAMERA_HEIGHT = 2.6;
const LOOK_AT = new THREE.Vector3(0, 1.2, 0);

const DEFAULT_SETTINGS: GameSettings = {
  numQuestions: 20,
  timePerQuestionSec: 10,
  examMode: false,
};

const FEEDBACK_MS_TRAINING = 1800;
const FEEDBACK_MS_EXAM = 400;

const DESERT_LANDMARK_IDS = [
  'tower',
  'cactus',
  'rock',
  'barrel',
  'cone_marker',
  'pyramid',
  'crate',
  'antenna',
  'L_polycube',
  'T_polycube',
] as const;

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
// Three.js helpers
// ============================================================================

function getCameraPosition(index: number): THREE.Vector3 {
  const angle = (index / VIEWPOINT_COUNT) * Math.PI * 2 - Math.PI / 2;
  return new THREE.Vector3(
    Math.cos(angle) * CAMERA_RADIUS,
    CAMERA_HEIGHT,
    Math.sin(angle) * CAMERA_RADIUS,
  );
}

function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function createDesertScene(): THREE.Scene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xc8d8e8);
  scene.fog = new THREE.Fog(0xc8d8e8, 18, 35);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.MeshPhongMaterial({ color: 0xc9a96e }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const ambient = new THREE.AmbientLight(0xffffff, 0.55);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xfff4e0, 0.85);
  sun.position.set(8, 14, 6);
  scene.add(sun);

  const fill = new THREE.DirectionalLight(0xc8d8ff, 0.25);
  fill.position.set(-6, 4, -8);
  scene.add(fill);

  const placeLandmark = (id: (typeof DESERT_LANDMARK_IDS)[number]) => {
    const mesh = createShapeMesh(THREE, id);
    mesh.position.set(randRange(-4, 4), 0, randRange(-4, 4));
    mesh.rotation.y = randRange(0, Math.PI * 2);
    if (id === 'rock') {
      mesh.scale.multiplyScalar(randRange(0.85, 1.35));
    } else if (id === 'crate' || id === 'barrel') {
      mesh.scale.multiplyScalar(randRange(0.9, 1.15));
    }
    scene.add(mesh);
  };

  placeLandmark('tower');
  placeLandmark('cone_marker');
  placeLandmark('barrel');

  const rockCount = 2 + Math.floor(Math.random() * 2);
  for (let i = 0; i < rockCount; i++) placeLandmark('rock');

  const cactusCount = 1 + Math.floor(Math.random() * 2);
  for (let i = 0; i < cactusCount; i++) placeLandmark('cactus');

  const extras = ['pyramid', 'crate', 'antenna', 'L_polycube', 'T_polycube'] as const;
  const extraCount = 1 + Math.floor(Math.random() * 2);
  for (let i = 0; i < extraCount; i++) {
    placeLandmark(extras[Math.floor(Math.random() * extras.length)]);
  }

  return scene;
}

function disposeScene(scene: THREE.Scene): void {
  scene.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry.dispose();
      const mat = obj.material;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat.dispose();
    }
  });
}

function generateQuestion(): Question {
  return {
    scene: createDesertScene(),
    correctViewpoint: 1 + Math.floor(Math.random() * VIEWPOINT_COUNT),
  };
}

function generateAllQuestions(count: number): Question[] {
  return Array.from({ length: count }, () => generateQuestion());
}

// ============================================================================
// Scene renderer component
// ============================================================================

function SceneView({
  scene,
  viewpoint,
  width,
  height,
}: {
  scene: THREE.Scene;
  viewpoint: number;
  width: number;
  height: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!rendererRef.current) {
      rendererRef.current = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: false,
      });
    }
    const renderer = rendererRef.current;
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const camera = new THREE.PerspectiveCamera(52, width / height, 0.1, 60);
    const pos = getCameraPosition(viewpoint - 1);
    camera.position.copy(pos);
    camera.lookAt(LOOK_AT);

    renderer.render(scene, camera);
  }, [scene, viewpoint, width, height]);

  useEffect(() => {
    return () => {
      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current = null;
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="rounded-lg border border-slate-300 bg-slate-200 w-full"
      style={{ maxWidth: width, aspectRatio: `${width}/${height}` }}
    />
  );
}

// ============================================================================
// Top-down map (vue de haut) inside the numbered circle
// ============================================================================

const TOPDOWN_HALF_EXTENT = 6.2;

function TopDownMap({
  scene,
  size,
}: {
  scene: THREE.Scene;
  size: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!rendererRef.current) {
      rendererRef.current = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: false,
      });
    }
    const renderer = rendererRef.current;
    renderer.setSize(size, size, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const cam = new THREE.OrthographicCamera(
      -TOPDOWN_HALF_EXTENT,
      TOPDOWN_HALF_EXTENT,
      TOPDOWN_HALF_EXTENT,
      -TOPDOWN_HALF_EXTENT,
      0.1,
      80,
    );
    // Align with viewpoint ring: #1 at top ⇒ world -Z points "up" on screen
    cam.position.set(0, 28, 0);
    cam.up.set(0, 0, -1);
    cam.lookAt(0, 0, 0);

    const prevFog = scene.fog;
    const prevBg = scene.background;
    scene.fog = null;
    scene.background = new THREE.Color(0xc9a96e);
    renderer.render(scene, cam);
    scene.fog = prevFog;
    scene.background = prevBg;
  }, [scene, size]);

  useEffect(() => {
    return () => {
      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current = null;
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="rounded-full border border-slate-400 block"
      style={{ width: size, height: size }}
      aria-label="Plan des formes vu de haut"
    />
  );
}

// ============================================================================
// Viewpoint selector
// ============================================================================

function ViewpointSelector({
  scene,
  selected,
  correct,
  showFeedback,
  disabled,
  onSelect,
}: {
  scene: THREE.Scene;
  selected: number | null;
  correct: number | null;
  showFeedback: boolean;
  disabled: boolean;
  onSelect: (n: number) => void;
}) {
  const btnSize = 44;
  const halfBtn = btnSize / 2;
  const size = 320;
  const center = size / 2;
  const radius = 138;
  const mapSize = 212;

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <div
        className="absolute rounded-full border-2 border-dashed border-slate-400"
        style={{
          left: center - radius,
          top: center - radius,
          width: radius * 2,
          height: radius * 2,
        }}
      />
      <div
        className="absolute overflow-hidden rounded-full shadow-sm"
        style={{
          left: center - mapSize / 2,
          top: center - mapSize / 2,
          width: mapSize,
          height: mapSize,
        }}
      >
        <TopDownMap scene={scene} size={mapSize} />
      </div>
      {Array.from({ length: VIEWPOINT_COUNT }, (_, i) => {
        const num = i + 1;
        const angle = (i / VIEWPOINT_COUNT) * Math.PI * 2 - Math.PI / 2;
        const x = center + Math.cos(angle) * radius - halfBtn;
        const y = center + Math.sin(angle) * radius - halfBtn;

        let ringClass = 'bg-white border-slate-400 hover:border-slate-600 hover:bg-slate-50';
        if (showFeedback && correct === num) {
          ringClass = 'bg-emerald-100 border-emerald-600 text-emerald-800';
        } else if (showFeedback && selected === num && selected !== correct) {
          ringClass = 'bg-red-100 border-red-600 text-red-800';
        } else if (selected === num) {
          ringClass = 'bg-blue-100 border-blue-500 text-blue-800';
        }

        return (
          <button
            key={num}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(num)}
            className={`absolute z-10 rounded-full border-2 font-bold text-base transition-all shadow-sm ${ringClass} disabled:cursor-default`}
            style={{ left: x, top: y, width: btnSize, height: btnSize, minWidth: btnSize, minHeight: btnSize }}
          >
            {num}
          </button>
        );
      })}
    </div>
  );
}

// ============================================================================
// Main component
// ============================================================================

export default function Objets3DTest() {
  const router = useRouter();
  const [gameState, setGameState] = useState<GameState>('menu');
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_SETTINGS.timePerQuestionSec);
  const [feedback, setFeedback] = useState<{ selected: number; correct: boolean } | null>(null);

  const perfSavedRef = useRef(false);
  const advancingRef = useRef(false);
  const questionStartRef = useRef(0);
  const scenesRef = useRef<THREE.Scene[]>([]);
  const settingsRef = useRef<GameSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    const loaded = loadSettings();
    setSettings(loaded);
    settingsRef.current = loaded;
  }, []);

  useEffect(() => {
    settingsRef.current = settings;
    saveSettingsLocal(settings);
  }, [settings]);

  const computeScore = useCallback(() => {
    const correct = answers.filter((a) => a.correct).length;
    return { correct, total: questions.length };
  }, [answers, questions.length]);

  const cleanupScenes = useCallback(() => {
    scenesRef.current.forEach((s) => disposeScene(s));
    scenesRef.current = [];
  }, []);

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
    cleanupScenes();
    perfSavedRef.current = false;
    advancingRef.current = false;
    const qs = generateAllQuestions(settings.numQuestions);
    scenesRef.current = qs.map((q) => q.scene);
    setQuestions(qs);
    setAnswers([]);
    setCurrentIdx(0);
    setFeedback(null);
    setTimeLeft(settings.timePerQuestionSec);
    questionStartRef.current = performance.now();
    setGameState('playing');
  }, [settings, cleanupScenes]);

  const handleAnswer = useCallback(
    (choice: number) => {
      if (feedback || advancingRef.current || gameState !== 'playing') return;
      const q = questions[currentIdx];
      if (!q) return;

      const timeMs = Math.round(performance.now() - questionStartRef.current);
      const correct = choice === q.correctViewpoint;
      advanceQuestion({ selected: choice, correct, timeMs });
    },
    [feedback, gameState, questions, currentIdx, advanceQuestion],
  );

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
  }, [gameState, currentIdx, feedback, settings.timePerQuestionSec, advanceQuestion]);

  useEffect(() => {
    if (gameState !== 'results' || perfSavedRef.current) return;
    perfSavedRef.current = true;
    const { correct, total } = computeScore();
    const avgTimeMs =
      answers.length > 0
        ? Math.round(answers.reduce((sum, a) => sum + a.timeMs, 0) / answers.length)
        : 0;
    savePerformanceResult(EXERCISE_ID, correct, total, avgTimeMs);
  }, [gameState, computeScore, answers]);

  useEffect(() => {
    return () => cleanupScenes();
  }, [cleanupScenes]);

  if (gameState === 'menu') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">Objets 3D</CardTitle>
            <CardDescription className="text-lg">
              Identifiez le point de vue correspondant a la scene
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
              Observez la scene desertique et indiquez quel numero de point de vue (1 a 8)
              correspond a la photo affichee.
            </p>
            {settings.examMode && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-center text-sm text-amber-700">
                Mode examen — pas de correction entre les questions
              </div>
            )}
            <div className="flex flex-col gap-3">
              <Button size="lg" className="w-full" onClick={startPlaying}>
                <Play className="mr-2 h-5 w-5" /> Jouer
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
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Parametres</CardTitle>
            <CardDescription>Objets 3D</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label>Nombre de questions : {settings.numQuestions}</Label>
                <Slider
                  value={[settings.numQuestions]}
                  onValueChange={([v]) => setSettings((s) => ({ ...s, numQuestions: v }))}
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
                  onValueChange={([v]) => setSettings((s) => ({ ...s, timePerQuestionSec: v }))}
                  min={5}
                  max={30}
                  step={1}
                  className="mt-2"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Mode examen</Label>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Pas de correction prolongee entre les questions
                  </p>
                </div>
                <Switch
                  checked={settings.examMode}
                  onCheckedChange={(v) => setSettings((s) => ({ ...s, examMode: v }))}
                />
              </div>
            </div>
            <Button variant="outline" className="w-full" onClick={() => setGameState('menu')}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Retour
            </Button>
          </CardContent>
        </Card>
      </div>
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
              variant={percent >= 75 ? 'default' : percent >= 50 ? 'secondary' : 'destructive'}
              className="text-lg px-4 py-1"
            >
              Classe {stanine}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-6xl font-bold text-slate-700">{percent}%</p>
              <p className="text-slate-500">{correct} / {total} correctes</p>
            </div>
            {perfEntries.length >= 2 && (
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-slate-500 mb-2 text-center">Progression</p>
                <div className="flex justify-center">
                  <MiniPerformanceChart entries={perfEntries} exerciseId={EXERCISE_ID} />
                </div>
              </div>
            )}
            <div className="flex flex-col gap-3">
              <Button size="lg" className="w-full" onClick={startPlaying}>
                <RotateCcw className="mr-2 h-5 w-5" /> Rejouer
              </Button>
              <Button variant="outline" size="lg" className="w-full" onClick={() => setGameState('menu')}>
                <ArrowLeft className="mr-2 h-5 w-5" /> Menu
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

  const q = questions[currentIdx];
  if (!q) return null;

  const progress = (currentIdx + 1) / questions.length;
  const timerRatio = timeLeft / settings.timePerQuestionSec;
  const sceneWidth = 480;
  const sceneHeight = 360;

  return (
    <div className="min-h-screen bg-[#e8e8e8] flex flex-col">
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between gap-4">
        <p className="text-base font-medium text-slate-600">
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
              timerRatio > 0.5 ? 'bg-emerald-500' : timerRatio > 0.25 ? 'bg-amber-500' : 'bg-red-500'
            }`}
            style={{ width: `${timerRatio * 100}%` }}
          />
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row items-center justify-center p-4 gap-6 max-w-5xl mx-auto w-full">
        <div className="flex flex-col items-center gap-3">
          <p className="text-base text-slate-600 text-center font-medium">
            Plan vu de haut — cliquez le numero du point de vue
          </p>
          <ViewpointSelector
            scene={q.scene}
            selected={feedback?.selected ?? null}
            correct={feedback && !settings.examMode ? q.correctViewpoint : null}
            showFeedback={!!feedback && !settings.examMode}
            disabled={!!feedback || advancingRef.current}
            onSelect={handleAnswer}
          />
        </div>

        <div className="flex flex-col items-center gap-3 w-full lg:w-auto">
          <p className="text-center text-slate-800 font-semibold text-lg">
            Quel point de vue correspond a cette scene ?
          </p>
          <SceneView
            scene={q.scene}
            viewpoint={q.correctViewpoint}
            width={sceneWidth}
            height={sceneHeight}
          />
        </div>
      </div>

      <div className="px-4 pb-4 max-w-5xl mx-auto w-full">
        <div className="h-1.5 bg-slate-300 rounded-full overflow-hidden">
          <div
            className="h-full bg-slate-500 transition-all"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

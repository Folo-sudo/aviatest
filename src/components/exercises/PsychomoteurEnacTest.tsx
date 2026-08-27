'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { savePerformanceResult, loadEntries } from '@/lib/core/PerformanceTracker';
import { MiniPerformanceChart } from '@/components/PerformanceChart';
import { ClassScoreBlock } from '@/components/ClassScoreBlock';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Play, RotateCcw, Home, Settings } from 'lucide-react';
import { PhoneDpad, PhoneHoldButton, phoneDirToArrowKey, type PhoneDir } from '@/components/phone/PhoneDpad';
import { usePhoneLayout } from '@/components/phone/PhoneLayout';

// ============================================================================
// Types
// ============================================================================

type GameState = 'menu' | 'settings' | 'playing' | 'results';
type PhaseId = 1 | 2 | 3 | 4;

interface GameSettings {
  phaseDurationMin: number;
  crossSpeed: number;
  letterIntervalSec: number;
  calcIntervalSec: number;
  targetLetterProb: number;
}

interface LiveStats {
  crossMsOk: number;
  crossMsTotal: number;
  gaugeMsOk: number;
  gaugeMsTotal: number;
  letterHits: number;
  letterMisses: number;
  letterFalse: number;
  calcHits: number;
  calcMisses: number;
}

interface FinalScore {
  crossPct: number;
  gaugePct: number;
  letterPct: number;
  calcPct: number;
  overallPct: number;
}

interface CalcTask {
  a: number;
  b: number;
  op: '+' | '×';
  answer: number;
}

// ============================================================================
// Constants
// ============================================================================

const EXERCISE_ID = 'psychomoteur-enac';
const SETTINGS_KEY = 'aviatest-psychomoteur-enac-settings';
const SLATE_BG = 'bg-[#fbfaf9]';
const BG = '#d4d4d4';
const BLUE = '#0068C6';

const DEFAULT_SETTINGS: GameSettings = {
  phaseDurationMin: 2.5,
  crossSpeed: 10,
  letterIntervalSec: 2.5,
  calcIntervalSec: 4,
  targetLetterProb: 30,
};

const TARGET_LETTERS = ['A', 'E', 'K', 'M', 'R', 'T'];
const ALL_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'P', 'R', 'S', 'T', 'V', 'W', 'X', 'Z'];

const GAUGE_KEYS: { minus: string; plus: string }[] = [
  { minus: 'q', plus: 'a' },
  { minus: 'w', plus: 's' },
  { minus: 'e', plus: 'd' },
  { minus: 'r', plus: 'f' },
];

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

function makeCalc(): CalcTask {
  const op = Math.random() < 0.5 ? '+' : '×';
  if (op === '+') {
    const a = randInt(2, 25);
    const b = randInt(2, 25);
    return { a, b, op, answer: a + b };
  }
  const a = randInt(2, 12);
  const b = randInt(2, 9);
  return { a, b, op, answer: a * b };
}

function phaseTasks(phase: PhaseId): { cross: boolean; gauges: boolean; letters: boolean; calcs: boolean } {
  return {
    cross: true,
    gauges: phase >= 2,
    letters: phase >= 3,
    calcs: phase >= 4,
  };
}

// ============================================================================
// Component
// ============================================================================

export default function PsychomoteurEnacTest() {
  const router = useRouter();
  const phone = usePhoneLayout();
  const [heldArrow, setHeldArrow] = useState<PhoneDir | null>(null);
  const [gameState, setGameState] = useState<GameState>('menu');
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [phase, setPhase] = useState<PhaseId>(1);
  const [phaseElapsed, setPhaseElapsed] = useState(0);
  const [finalScore, setFinalScore] = useState<FinalScore | null>(null);

  // Cross
  const [crossPos, setCrossPos] = useState({ x: 50, y: 50 });
  const [targetPos, setTargetPos] = useState({ x: 70, y: 30 });
  const [crossOk, setCrossOk] = useState(false);

  // Gauges
  const [gaugeVals, setGaugeVals] = useState([50, 50, 50, 50]);
  const [gaugeDrift, setGaugeDrift] = useState([0.3, -0.4, 0.25, -0.35]);

  // Letters
  const [currentLetter, setCurrentLetter] = useState('M');
  const [letterTarget, setLetterTarget] = useState(false);
  const [letterFlash, setLetterFlash] = useState<'ok' | 'bad' | null>(null);

  // Calc
  const [calc, setCalc] = useState<CalcTask>(makeCalc());
  const [calcInput, setCalcInput] = useState('');
  const [calcChoices, setCalcChoices] = useState<number[]>([]);
  const [calcFlash, setCalcFlash] = useState<'ok' | 'bad' | null>(null);

  const settingsRef = useRef(settings);
  const statsRef = useRef<LiveStats>({
    crossMsOk: 0,
    crossMsTotal: 0,
    gaugeMsOk: 0,
    gaugeMsTotal: 0,
    letterHits: 0,
    letterMisses: 0,
    letterFalse: 0,
    calcHits: 0,
    calcMisses: 0,
  });
  const phaseRef = useRef<PhaseId>(1);
  const playingRef = useRef(false);
  const rafRef = useRef(0);
  const lastTsRef = useRef(0);
  const phaseStartRef = useRef(0);
  const heldKeysRef = useRef<Set<string>>(new Set());
  const letterAnsweredRef = useRef(false);
  const letterTargetRef = useRef(false);
  const nextLetterAtRef = useRef(0);
  const nextCalcAtRef = useRef(0);
  const crossPosRef = useRef({ x: 50, y: 50 });
  const targetPosRef = useRef({ x: 70, y: 30 });
  const gaugeValsRef = useRef([50, 50, 50, 50]);
  const gaugeDriftRef = useRef([0.3, -0.4, 0.25, -0.35]);
  const perfSavedRef = useRef(false);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  useEffect(() => {
    settingsRef.current = settings;
    saveSettingsLocal(settings);
  }, [settings]);

  const resetStats = () => {
    statsRef.current = {
      crossMsOk: 0,
      crossMsTotal: 0,
      gaugeMsOk: 0,
      gaugeMsTotal: 0,
      letterHits: 0,
      letterMisses: 0,
      letterFalse: 0,
      calcHits: 0,
      calcMisses: 0,
    };
  };

  const spawnLetter = useCallback(() => {
    const isTarget = Math.random() * 100 < settingsRef.current.targetLetterProb;
    letterAnsweredRef.current = false;
    letterTargetRef.current = isTarget;
    setLetterTarget(isTarget);
    if (isTarget) {
      setCurrentLetter(pick(TARGET_LETTERS));
    } else {
      const pool = ALL_LETTERS.filter((l) => !TARGET_LETTERS.includes(l));
      setCurrentLetter(pick(pool.length > 0 ? pool : ALL_LETTERS));
    }
    setLetterFlash(null);
  }, []);

  const spawnCalc = useCallback(() => {
    const c = makeCalc();
    setCalc(c);
    setCalcInput('');
    setCalcFlash(null);
    const wrong = [c.answer + pick([-2, -1, 1, 2, 3]), c.answer + pick([-3, 2, 4]), c.answer + pick([-4, 5])];
    const choices = [c.answer, ...wrong.slice(0, 3)];
    setCalcChoices([...new Set(choices)].sort(() => Math.random() - 0.5).slice(0, 4));
  }, []);

  const finishAll = useCallback(() => {
    playingRef.current = false;
    cancelAnimationFrame(rafRef.current);
    const s = statsRef.current;
    const crossPct =
      s.crossMsTotal > 0 ? Math.round((s.crossMsOk / s.crossMsTotal) * 1000) / 10 : 100;
    const gaugePct =
      s.gaugeMsTotal > 0 ? Math.round((s.gaugeMsOk / s.gaugeMsTotal) * 1000) / 10 : 100;
    const letterTotal = s.letterHits + s.letterMisses + s.letterFalse;
    const letterPct =
      letterTotal > 0 ? Math.round((s.letterHits / letterTotal) * 1000) / 10 : 100;
    const calcTotal = s.calcHits + s.calcMisses;
    const calcPct = calcTotal > 0 ? Math.round((s.calcHits / calcTotal) * 1000) / 10 : 100;
    const parts = [crossPct, gaugePct, letterPct, calcPct].filter((_, i) => i === 0 || phaseRef.current >= i + 1);
    const overallPct = Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);
    setFinalScore({ crossPct, gaugePct, letterPct, calcPct, overallPct });
    setGameState('results');
  }, []);

  const startPhase = useCallback(
    (p: PhaseId) => {
      phaseRef.current = p;
      setPhase(p);
      phaseStartRef.current = performance.now();
      setPhaseElapsed(0);
      crossPosRef.current = { x: 50, y: 50 };
      targetPosRef.current = { x: randInt(15, 85), y: randInt(15, 85) };
      setCrossPos({ ...crossPosRef.current });
      setTargetPos({ ...targetPosRef.current });
      gaugeValsRef.current = [50, 50, 50, 50];
      gaugeDriftRef.current = [
        (Math.random() - 0.5) * 0.8,
        (Math.random() - 0.5) * 0.8,
        (Math.random() - 0.5) * 0.8,
        (Math.random() - 0.5) * 0.8,
      ];
      setGaugeVals([...gaugeValsRef.current]);
      setGaugeDrift([...gaugeDriftRef.current]);
      spawnLetter();
      spawnCalc();
      nextLetterAtRef.current = performance.now() + settingsRef.current.letterIntervalSec * 1000;
      nextCalcAtRef.current = performance.now() + settingsRef.current.calcIntervalSec * 1000;
    },
    [spawnLetter, spawnCalc],
  );

  const startGame = useCallback(() => {
    perfSavedRef.current = false;
    resetStats();
    playingRef.current = true;
    lastTsRef.current = performance.now();
    startPhase(1);
    setGameState('playing');
  }, [startPhase]);

  const gameLoop = useCallback(
    (ts: number) => {
      if (!playingRef.current) return;
      const dt = (ts - lastTsRef.current) / 1000;
      lastTsRef.current = ts;
      const tasks = phaseTasks(phaseRef.current);
      const phaseDur = settingsRef.current.phaseDurationMin * 60;
      const elapsed = (ts - phaseStartRef.current) / 1000;
      setPhaseElapsed(elapsed);

      if (elapsed >= phaseDur) {
        if (phaseRef.current < 4) {
          startPhase((phaseRef.current + 1) as PhaseId);
        } else {
          finishAll();
          return;
        }
      }

      // Cross + target
      if (tasks.cross) {
        const speed = settingsRef.current.crossSpeed;
        const dx = targetPosRef.current.x - crossPosRef.current.x;
        const dy = targetPosRef.current.y - crossPosRef.current.y;
        const dist = Math.hypot(dx, dy) || 1;
        targetPosRef.current.x += (dx / dist) * speed * dt * 0.5;
        targetPosRef.current.y += (dy / dist) * speed * dt * 0.5;
        targetPosRef.current.x = Math.max(10, Math.min(90, targetPosRef.current.x));
        targetPosRef.current.y = Math.max(10, Math.min(90, targetPosRef.current.y));

        const keys = heldKeysRef.current;
        let mx = 0, my = 0;
        if (keys.has('ArrowLeft')) mx -= 1;
        if (keys.has('ArrowRight')) mx += 1;
        if (keys.has('ArrowUp')) my -= 1;
        if (keys.has('ArrowDown')) my += 1;
        if (mx !== 0 || my !== 0) {
          const len = Math.hypot(mx, my);
          crossPosRef.current.x += (mx / len) * speed * dt;
          crossPosRef.current.y += (my / len) * speed * dt;
          crossPosRef.current.x = Math.max(5, Math.min(95, crossPosRef.current.x));
          crossPosRef.current.y = Math.max(5, Math.min(95, crossPosRef.current.y));
        }

        const near =
          Math.hypot(
            crossPosRef.current.x - targetPosRef.current.x,
            crossPosRef.current.y - targetPosRef.current.y,
          ) < 8;
        setCrossOk(near);
        statsRef.current.crossMsTotal += dt * 1000;
        if (near) statsRef.current.crossMsOk += dt * 1000;

        setCrossPos({ ...crossPosRef.current });
        setTargetPos({ ...targetPosRef.current });
      }

      // Gauges
      if (tasks.gauges) {
        const keys = heldKeysRef.current;
        for (let i = 0; i < 4; i++) {
          gaugeValsRef.current[i] += gaugeDriftRef.current[i] * dt * 12;
          const gk = GAUGE_KEYS[i];
          if (keys.has(gk.minus)) gaugeValsRef.current[i] -= speedAdjust(dt);
          if (keys.has(gk.plus)) gaugeValsRef.current[i] += speedAdjust(dt);
          gaugeValsRef.current[i] = Math.max(5, Math.min(95, gaugeValsRef.current[i]));
          const centered = Math.abs(gaugeValsRef.current[i] - 50) < 6;
          statsRef.current.gaugeMsTotal += dt * 1000;
          if (centered) statsRef.current.gaugeMsOk += dt * 1000;
        }
        setGaugeVals([...gaugeValsRef.current]);
      }

      // Letter timer
      if (tasks.letters && ts >= nextLetterAtRef.current) {
        if (!letterAnsweredRef.current && letterTargetRef.current) {
          statsRef.current.letterMisses += 1;
        }
        spawnLetter();
        nextLetterAtRef.current = ts + settingsRef.current.letterIntervalSec * 1000;
      }

      // Calc timer
      if (tasks.calcs && ts >= nextCalcAtRef.current) {
        statsRef.current.calcMisses += 1;
        spawnCalc();
        nextCalcAtRef.current = ts + settingsRef.current.calcIntervalSec * 1000;
      }

      rafRef.current = requestAnimationFrame(gameLoop);
    },
    [finishAll, spawnLetter, spawnCalc, startPhase],
  );

  function speedAdjust(dt: number): number {
    return dt * 18;
  }

  const pressLetterSpace = useCallback(() => {
    const letterTasks = phaseTasks(phaseRef.current);
    if (!letterTasks.letters) return;
    if (letterAnsweredRef.current) return;
    letterAnsweredRef.current = true;
    if (letterTargetRef.current) {
      statsRef.current.letterHits += 1;
      setLetterFlash('ok');
    } else {
      statsRef.current.letterFalse += 1;
      setLetterFlash('bad');
    }
  }, []);

  useEffect(() => {
    if (gameState !== 'playing') return;
    lastTsRef.current = performance.now();
    rafRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [gameState, gameLoop]);

  useEffect(() => {
    if (gameState !== 'playing') return;

    const canon = (key: string) => (key.startsWith('Arrow') ? key : key.toLowerCase());
    const onKeyDown = (e: KeyboardEvent) => {
      heldKeysRef.current.add(canon(e.key));
      if (e.key === ' ') {
        e.preventDefault();
        pressLetterSpace();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      heldKeysRef.current.delete(canon(e.key));
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      heldKeysRef.current.clear();
    };
  }, [gameState, pressLetterSpace]);

  const submitCalc = useCallback(
    (val: number) => {
      const tasks = phaseTasks(phaseRef.current);
      if (!tasks.calcs) return;
      const ok = val === calc.answer;
      if (ok) {
        statsRef.current.calcHits += 1;
        setCalcFlash('ok');
      } else {
        statsRef.current.calcMisses += 1;
        setCalcFlash('bad');
      }
      nextCalcAtRef.current = performance.now() + settingsRef.current.calcIntervalSec * 1000;
      setTimeout(() => spawnCalc(), 600);
    },
    [calc.answer, spawnCalc],
  );

  const tasks = phaseTasks(phase);
  const phaseDurSec = settings.phaseDurationMin * 60;
  const phasePct = phaseDurSec > 0 ? (phaseElapsed / phaseDurSec) * 100 : 0;

  if (gameState === 'menu') {
    return (
      <div className={`flex min-h-screen flex-col items-center justify-center ${SLATE_BG} p-4`}>
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Psychomoteur ENAC</CardTitle>
            <CardDescription>Multi-taches type Pilotest — 4 phases progressives</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2 rounded-lg bg-[#f7f5f3] p-4 text-sm text-[#605a57]">
              <p><strong>Fleches</strong> : suivre le cercle avec la croix</p>
              <p><strong>Q/A W/S E/D R/F</strong> : centrer les jauges</p>
              <p><strong>Espace</strong> : lettres cibles (A,E,K,M,R,T)</p>
              <p><strong>Calcul</strong> : repondre ou choisir la bonne valeur</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="rounded-lg bg-[#f7f5f3] p-3">
                <p className="text-xl font-bold">{settings.phaseDurationMin} min</p>
                <p className="text-xs text-[#605a57]">Par phase</p>
              </div>
              <div className="rounded-lg bg-[#f7f5f3] p-3">
                <p className="text-xl font-bold">4</p>
                <p className="text-xs text-[#605a57]">Phases</p>
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
              <Label>Duree phase : {settings.phaseDurationMin} min</Label>
              <Slider value={[settings.phaseDurationMin]} onValueChange={([v]) => setSettings((s) => ({ ...s, phaseDurationMin: v }))} min={2} max={4} step={0.5} className="mt-2" />
            </div>
            <div>
              <Label>Vitesse croix : {settings.crossSpeed}</Label>
              <Slider value={[settings.crossSpeed]} onValueChange={([v]) => setSettings((s) => ({ ...s, crossSpeed: v }))} min={5} max={20} step={1} className="mt-2" />
            </div>
            <div>
              <Label>Intervalle lettres : {settings.letterIntervalSec}s</Label>
              <Slider value={[settings.letterIntervalSec]} onValueChange={([v]) => setSettings((s) => ({ ...s, letterIntervalSec: v }))} min={1.5} max={5} step={0.5} className="mt-2" />
            </div>
            <div>
              <Label>Intervalle calculs : {settings.calcIntervalSec}s</Label>
              <Slider value={[settings.calcIntervalSec]} onValueChange={([v]) => setSettings((s) => ({ ...s, calcIntervalSec: v }))} min={2} max={8} step={0.5} className="mt-2" />
            </div>
            <Button className="w-full" onClick={() => setGameState('menu')}>Retour</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (gameState === 'results' && finalScore) {
    if (!perfSavedRef.current) {
      perfSavedRef.current = true;
      savePerformanceResult(EXERCISE_ID, Math.round(finalScore.overallPct), 100);
    }
    const perfEntries = loadEntries(EXERCISE_ID);
    return (
      <div className={`flex min-h-screen flex-col items-center justify-center ${SLATE_BG} p-4`}>
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle>Résultats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <ClassScoreBlock
              exerciseId={EXERCISE_ID}
              percent={finalScore.overallPct}
            />
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="rounded-lg bg-[#f7f5f3] p-3">
                <p className="text-xl font-bold">{finalScore.crossPct}%</p>
                <p className="text-xs text-[#605a57]">Croix</p>
              </div>
              <div className="rounded-lg bg-[#f7f5f3] p-3">
                <p className="text-xl font-bold">{finalScore.gaugePct}%</p>
                <p className="text-xs text-[#605a57]">Jauges</p>
              </div>
              <div className="rounded-lg bg-[#f7f5f3] p-3">
                <p className="text-xl font-bold">{finalScore.letterPct}%</p>
                <p className="text-xs text-[#605a57]">Lettres</p>
              </div>
              <div className="rounded-lg bg-[#f7f5f3] p-3">
                <p className="text-xl font-bold">{finalScore.calcPct}%</p>
                <p className="text-xs text-[#605a57]">Calculs</p>
              </div>
            </div>
            {perfEntries.length >= 2 && <MiniPerformanceChart entries={perfEntries} exerciseId={EXERCISE_ID} />}
            <Button className="w-full" onClick={startGame}><RotateCcw className="mr-2 h-5 w-5" /> Rejouer</Button>
            <Button variant="outline" className="w-full" onClick={() => setGameState('menu')}>Menu</Button>
            <Button variant="ghost" className="w-full" onClick={() => router.push('/')}><Home className="mr-2 h-5 w-5" /> Accueil</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---- PLAYING ----
  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: BG }}>
      <div className="border-b border-slate-400 px-4 py-2" style={{ backgroundColor: '#c8c8c8' }}>
        <div className="mx-auto flex max-w-4xl items-center justify-between text-sm font-semibold text-slate-800">
          <span>Phase {phase}/4</span>
          <span>{Math.ceil(phaseDurSec - phaseElapsed)}s</span>
          <span className="text-xs">
            {tasks.cross && 'Croix '}
            {tasks.gauges && 'Jauges '}
            {tasks.letters && 'Lettres '}
            {tasks.calcs && 'Calculs'}
          </span>
        </div>
        <div className="mx-auto mt-1 h-2 max-w-4xl rounded-full bg-slate-300">
          <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${phasePct}%` }} />
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 p-4">
        {tasks.cross && (
          <div className="space-y-3">
          <div className={`relative rounded border-2 border-slate-500 ${phone ? 'h-56' : 'h-48'}`} style={{ backgroundColor: '#e8e8e8' }}>
            <div
              className="absolute h-4 w-4 rounded-full border-2 border-slate-700"
              style={{
                left: `${targetPos.x}%`,
                top: `${targetPos.y}%`,
                transform: 'translate(-50%, -50%)',
                backgroundColor: BLUE,
              }}
            />
            <div
              className="absolute text-2xl font-bold"
              style={{
                left: `${crossPos.x}%`,
                top: `${crossPos.y}%`,
                transform: 'translate(-50%, -50%)',
                color: crossOk ? '#22c55e' : '#dc2626',
              }}
            >
              +
            </div>
          </div>
          {phone && (
            <div className="flex justify-center pt-1">
              <PhoneDpad
                held={heldArrow}
                onHold={(dir) => {
                  heldKeysRef.current.delete('ArrowUp');
                  heldKeysRef.current.delete('ArrowDown');
                  heldKeysRef.current.delete('ArrowLeft');
                  heldKeysRef.current.delete('ArrowRight');
                  if (dir) heldKeysRef.current.add(phoneDirToArrowKey(dir));
                  setHeldArrow(dir);
                }}
              />
            </div>
          )}
          </div>
        )}

        {tasks.gauges && (
          <div className={`grid gap-2 ${phone ? 'grid-cols-2' : 'grid-cols-4'}`}>
            {gaugeVals.map((v, i) => (
              <div key={i} className="rounded border border-slate-500 bg-white p-2">
                <p className="mb-1 text-center text-xs font-medium text-[#605a57]">
                  {GAUGE_KEYS[i].minus.toUpperCase()}/{GAUGE_KEYS[i].plus.toUpperCase()}
                </p>
                <div className={`relative rounded bg-slate-200 ${phone ? 'h-20' : 'h-16'}`}>
                  <div
                    className="absolute bottom-0 left-1/2 w-3 -translate-x-1/2 rounded-t transition-all"
                    style={{
                      height: `${v}%`,
                      backgroundColor: Math.abs(v - 50) < 6 ? '#22c55e' : BLUE,
                    }}
                  />
                  <div className="absolute left-0 right-0 top-1/2 border-t border-dashed border-slate-500" />
                </div>
                {phone && (
                  <div className="mt-2 flex justify-center gap-2">
                    <PhoneHoldButton
                      label="−"
                      onHold={(down) => {
                        if (down) heldKeysRef.current.add(GAUGE_KEYS[i].minus);
                        else heldKeysRef.current.delete(GAUGE_KEYS[i].minus);
                      }}
                    />
                    <PhoneHoldButton
                      label="+"
                      onHold={(down) => {
                        if (down) heldKeysRef.current.add(GAUGE_KEYS[i].plus);
                        else heldKeysRef.current.delete(GAUGE_KEYS[i].plus);
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {tasks.letters && (
            <div
              className={`flex flex-col items-center justify-center rounded border-2 p-6 ${
                letterFlash === 'ok' ? 'border-green-500 bg-green-50' : letterFlash === 'bad' ? 'border-red-500 bg-red-50' : 'border-slate-500 bg-white'
              }`}
            >
              <p className="mb-2 text-xs text-[#605a57]">Espace si lettre cible</p>
              <span className="text-6xl font-bold" style={{ color: BLUE }}>{currentLetter}</span>
              {phone && (
                <button
                  type="button"
                  onClick={pressLetterSpace}
                  className="mt-4 h-14 w-full max-w-xs rounded-2xl bg-[#37322f] text-lg font-semibold text-white"
                >
                  Espace
                </button>
              )}
            </div>
          )}

          {tasks.calcs && (
            <div
              className={`rounded border-2 p-4 ${
                calcFlash === 'ok' ? 'border-green-500 bg-green-50' : calcFlash === 'bad' ? 'border-red-500 bg-red-50' : 'border-slate-500 bg-white'
              }`}
            >
              <p className="mb-2 text-center text-lg font-bold text-slate-800">
                {calc.a} {calc.op} {calc.b} =
              </p>
              <div className="mb-3 flex gap-2">
                <input
                  type="number"
                  value={calcInput}
                  onChange={(e) => setCalcInput(e.target.value)}
                  className="flex-1 rounded border border-slate-300 px-3 py-2 text-center"
                  placeholder="Reponse"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    const n = parseInt(calcInput, 10);
                    if (!Number.isNaN(n)) submitCalc(n);
                  }}
                >
                  OK
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {calcChoices.map((c) => (
                  <Button key={c} variant="outline" size="sm" onClick={() => submitCalc(c)}>
                    {c}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Scorer } from '@/lib/core/Scorer';
import { Timer } from '@/lib/core/Timer';
import { savePerformanceResult, loadEntries } from '@/lib/core/PerformanceTracker';
import { MiniPerformanceChart } from '@/components/PerformanceChart';
import { ClassScoreBlock } from '@/components/ClassScoreBlock';
import { TubeState, generatePuzzle } from '@/lib/utils/bfs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft,
  Play,
  Settings,
  RotateCcw,
  Home,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

type GameState = 'menu' | 'settings' | 'playing' | 'results';

const BALL_COLORS = [
  '#a855f7',
  '#3b82f6',
  '#eab308',
  '#22c55e',
  '#f97316',
  '#ef4444',
  '#06b6d4',
];

const SETTINGS_KEY = 'aviatest-billes-settings';
const ANSWER_MIN = 1;
const ANSWER_MAX = 8;

interface GameSettings {
  numBalls: number;
  timePerSeries: number;
  numSeries: number;
}

const DEFAULT_SETTINGS: GameSettings = {
  numBalls: 3,
  timePerSeries: 60,
  numSeries: 20,
};

function loadSettings(): GameSettings {
  if (typeof window === 'undefined') return { ...DEFAULT_SETTINGS };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<GameSettings>;
    return {
      numBalls: parsed.numBalls ?? DEFAULT_SETTINGS.numBalls,
      timePerSeries: parsed.timePerSeries ?? DEFAULT_SETTINGS.timePerSeries,
      numSeries: parsed.numSeries ?? DEFAULT_SETTINGS.numSeries,
    };
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

function moveRange(): { minMoves: number; maxMoves: number } {
  return { minMoves: 3, maxMoves: 7 };
}

export function BillesTest() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const perfSavedRef = useRef(false);
  const [gameState, setGameState] = useState<GameState>('menu');
  const [settings, setSettingsState] = useState<GameSettings>(loadSettings);

  const setSettings = useCallback((s: GameSettings | ((prev: GameSettings) => GameSettings)) => {
    setSettingsState((prev) => {
      const next = typeof s === 'function' ? s(prev) : s;
      saveSettingsLocal(next);
      return next;
    });
  }, []);

  const [scorer] = useState(() => new Scorer());
  const [startConfig, setStartConfig] = useState<TubeState | null>(null);
  const [goalConfig, setGoalConfig] = useState<TubeState | null>(null);
  const [solutionPath, setSolutionPath] = useState<TubeState[]>([]);
  const [correctAnswer, setCorrectAnswer] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showCorrection, setShowCorrection] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [currentSeries, setCurrentSeries] = useState(0);
  const [timer, setTimer] = useState<Timer | null>(null);
  const [timerProgress, setTimerProgress] = useState(1);

  const animationRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const width = 900;
  const height = 640;

  const loadPuzzle = useCallback(() => {
    const { minMoves, maxMoves } = moveRange();
    const puzzle = generatePuzzle(settings.numBalls, minMoves, maxMoves);
    setStartConfig(puzzle.start);
    setGoalConfig(puzzle.goal);
    setSolutionPath(puzzle.solution);
    setCorrectAnswer(Math.max(0, puzzle.solution.length - 1));
    setSelectedAnswer(null);
    setShowCorrection(false);
    setCurrentStep(0);
  }, [settings]);

  const startNewSeries = useCallback(() => {
    if (currentSeries >= settings.numSeries) {
      setGameState('results');
      return;
    }
    loadPuzzle();
    timer?.reset();
    timer?.start();
  }, [currentSeries, settings.numSeries, loadPuzzle, timer]);

  const startPlaying = useCallback(() => {
    scorer.reset();
    perfSavedRef.current = false;
    setCurrentSeries(0);
    setShowCorrection(false);

    const newTimer = new Timer(settings.timePerSeries, () => {
      setShowCorrection((prev) => {
        if (!prev) {
          scorer.recordAnswer(false);
          return true;
        }
        return prev;
      });
    });
    setTimer(newTimer);
    setGameState('playing');

    setTimeout(() => {
      const { minMoves, maxMoves } = moveRange();
      const puzzle = generatePuzzle(settings.numBalls, minMoves, maxMoves);
      setStartConfig(puzzle.start);
      setGoalConfig(puzzle.goal);
      setSolutionPath(puzzle.solution);
      setCorrectAnswer(Math.max(0, puzzle.solution.length - 1));
      setSelectedAnswer(null);
      setCurrentStep(0);
      newTimer.start();
    }, 0);
  }, [settings, scorer]);

  const handleAnswer = useCallback(
    (num: number) => {
      if (showCorrection) return;
      setSelectedAnswer(num);
      setShowCorrection(true);
      setCurrentStep(0);
      scorer.recordAnswer(num === correctAnswer);
    },
    [showCorrection, correctAnswer, scorer],
  );

  const handleNext = useCallback(() => {
    const next = currentSeries + 1;
    setCurrentSeries(next);
    if (next >= settings.numSeries) {
      setGameState('results');
    } else {
      startNewSeries();
    }
  }, [currentSeries, settings.numSeries, startNewSeries]);

  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gameLoop = (timestamp: number) => {
      const deltaTime = lastTimeRef.current
        ? (timestamp - lastTimeRef.current) / 1000
        : 0;
      lastTimeRef.current = timestamp;

      if (timer && !showCorrection) {
        timer.update(deltaTime);
        setTimerProgress(timer.getProgress());
      }

      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(20, 20, width - 40, height - 40, 16);
      ctx.fill();

      // Timer bar
      const timerBarWidth = 18;
      const timerBarHeight = height - 120;
      ctx.fillStyle = '#1f2937';
      ctx.beginPath();
      ctx.roundRect(35, 40, timerBarWidth, timerBarHeight, 10);
      ctx.fill();

      const fillHeight = timerBarHeight * timerProgress;
      const fillColor =
        timerProgress > 0.5 ? '#22c55e' : timerProgress > 0.2 ? '#f59e0b' : '#ef4444';
      ctx.fillStyle = fillColor;
      ctx.beginPath();
      ctx.roundRect(
        38,
        40 + timerBarHeight - fillHeight + 3,
        timerBarWidth - 6,
        Math.max(0, fillHeight - 6),
        7,
      );
      ctx.fill();

      const ballRadius = settings.numBalls >= 6 ? 18 : 22;

      const drawTubes = (
        config: TubeState,
        yBase: number,
        label: string,
        opts?: { dim?: boolean },
      ) => {
        const tubeSpacing = 140;
        const startX = width / 2 - tubeSpacing;
        const dim = opts?.dim ?? false;

        ctx.globalAlpha = dim ? 0.55 : 1;
        ctx.font = 'bold 15px Inter, Arial';
        ctx.fillStyle = '#64748b';
        ctx.textAlign = 'left';
        ctx.fillText(label, 70, yBase - 110);

        for (let i = 0; i < 3; i++) {
          const x = startX + i * tubeSpacing;
          const tube = config.tubes[i] ?? [];
          const capacity = config.capacities[i];
          const innerRadius = ballRadius + 8;
          const tubeHeight = capacity * (ballRadius * 2 + 4) + 16;
          const centerY = yBase;

          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.moveTo(x - innerRadius, centerY - tubeHeight);
          ctx.lineTo(x - innerRadius, centerY);
          ctx.arc(x, centerY, innerRadius, Math.PI, 0, true);
          ctx.lineTo(x + innerRadius, centerY - tubeHeight);
          ctx.stroke();

          const firstBallY = centerY - ballRadius - 2;
          for (let j = 0; j < tube.length; j++) {
            const ballId = tube[j];
            const ballY = firstBallY - j * (ballRadius * 2 + 4);
            ctx.fillStyle = BALL_COLORS[ballId % BALL_COLORS.length];
            ctx.beginPath();
            ctx.arc(x, ballY, ballRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#1f2937';
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.font = `bold ${ballRadius >= 20 ? 18 : 15}px Inter, Arial`;
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(ballId), x, ballY);
          }
        }
        ctx.globalAlpha = 1;
      };

      if (showCorrection) {
        const currentState = solutionPath[currentStep];
        if (currentState) {
          drawTubes(
            currentState,
            200,
            `Solution — etape ${currentStep} / ${Math.max(0, solutionPath.length - 1)}`,
          );
        }
        if (goalConfig) {
          drawTubes(goalConfig, 420, 'Arrivee (cible)', { dim: true });
        }
      } else {
        if (startConfig) drawTubes(startConfig, 200, 'Depart');
        if (goalConfig) drawTubes(goalConfig, 420, 'Arrivee');
      }

      // Question + answer buttons (hidden look during correction: still show feedback colors)
      ctx.font = '17px Inter, Arial';
      ctx.fillStyle = '#1e3a5f';
      ctx.textAlign = 'left';
      ctx.fillText(
        showCorrection
          ? `Réponse : ${correctAnswer} déplacement${correctAnswer > 1 ? 's' : ''}`
          : 'Combien de déplacements de billes sont nécessaires ?',
        70,
        500,
      );

      const buttonCount = ANSWER_MAX - ANSWER_MIN + 1;
      const buttonY = 530;
      const buttonWidth = 48;
      const buttonSpacing = 56;
      const startButtonX = (width - buttonCount * buttonSpacing) / 2 + 8;

      for (let i = 0; i < buttonCount; i++) {
        const num = ANSWER_MIN + i;
        const bx = startButtonX + i * buttonSpacing;

        let bgColor = '#f1f5f9';
        if (showCorrection) {
          if (num === correctAnswer) bgColor = '#86efac';
          else if (num === selectedAnswer && num !== correctAnswer) bgColor = '#fca5a5';
          else bgColor = '#e2e8f0';
        }

        ctx.fillStyle = bgColor;
        ctx.beginPath();
        ctx.roundRect(bx, buttonY, buttonWidth, 38, 8);
        ctx.fill();
        ctx.strokeStyle = '#374151';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.font = '17px Inter, Arial';
        ctx.fillStyle = '#1f2937';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(num), bx + buttonWidth / 2, buttonY + 19);
      }

      ctx.font = '16px Inter, Arial';
      ctx.fillStyle = '#1f2937';
      ctx.textAlign = 'left';
      ctx.fillText(
        `Score: ${scorer.getCorrect()} / ${scorer.getTotal()}`,
        70,
        height - 36,
      );

      ctx.textAlign = 'right';
      ctx.fillStyle = '#6b7280';
      ctx.fillText(
        `Serie ${currentSeries + 1}/${settings.numSeries}`,
        width - 70,
        height - 36,
      );

      animationRef.current = requestAnimationFrame(gameLoop);
    };

    animationRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationRef.current);
  }, [
    gameState,
    timer,
    startConfig,
    goalConfig,
    solutionPath,
    showCorrection,
    currentStep,
    selectedAnswer,
    correctAnswer,
    scorer,
    currentSeries,
    settings,
    timerProgress,
  ]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (showCorrection) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const buttonCount = ANSWER_MAX - ANSWER_MIN + 1;
    const buttonY = 530;
    const buttonWidth = 48;
    const buttonSpacing = 56;
    const startButtonX = (width - buttonCount * buttonSpacing) / 2 + 8;

    for (let i = 0; i < buttonCount; i++) {
      const bx = startButtonX + i * buttonSpacing;
      if (x >= bx && x <= bx + buttonWidth && y >= buttonY && y <= buttonY + 38) {
        handleAnswer(ANSWER_MIN + i);
        return;
      }
    }
  };

  if (gameState === 'menu') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#fbfaf9] p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">Jeu des Billes</CardTitle>
            <CardDescription className="text-lg">
              Calculez le nombre de mouvements
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="rounded-lg bg-[#f7f5f3] p-4">
                <p className="text-2xl font-bold text-[#37322f]">{settings.numSeries}</p>
                <p className="text-sm text-[#605a57]">Series</p>
              </div>
              <div className="rounded-lg bg-[#f7f5f3] p-4">
                <p className="text-2xl font-bold text-[#37322f]">{settings.numBalls}</p>
                <p className="text-sm text-[#605a57]">Billes</p>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <Button size="lg" className="w-full" onClick={startPlaying}>
                <Play className="mr-2 h-5 w-5" /> Jouer
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="w-full"
                onClick={() => setGameState('settings')}
              >
                <Settings className="mr-2 h-5 w-5" /> Parametres
              </Button>
              <Button
                variant="ghost"
                size="lg"
                className="w-full"
                onClick={() => router.push('/')}
              >
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
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#fbfaf9] p-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Parametres</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label>Nombre de billes: {settings.numBalls}</Label>
                <Slider
                  value={[settings.numBalls]}
                  onValueChange={([v]) => setSettings((s) => ({ ...s, numBalls: v }))}
                  min={2}
                  max={7}
                  step={1}
                  className="mt-2"
                />
              </div>
              <div>
                <Label>Temps par serie: {settings.timePerSeries}s</Label>
                <Slider
                  value={[settings.timePerSeries]}
                  onValueChange={([v]) =>
                    setSettings((s) => ({ ...s, timePerSeries: v }))
                  }
                  min={15}
                  max={180}
                  step={15}
                  className="mt-2"
                />
              </div>
              <div>
                <Label>Nombre de series: {settings.numSeries}</Label>
                <Slider
                  value={[settings.numSeries]}
                  onValueChange={([v]) => setSettings((s) => ({ ...s, numSeries: v }))}
                  min={5}
                  max={50}
                  step={5}
                  className="mt-2"
                />
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setGameState('menu')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Retour
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (gameState === 'results') {
    const scoreData = scorer.toJSON();
    if (!perfSavedRef.current) {
      perfSavedRef.current = true;
      savePerformanceResult('billes', scoreData.correct, settings.numSeries);
    }
    const perfEntries = loadEntries('billes');
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#fbfaf9] p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">Résultats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <ClassScoreBlock
              exerciseId={'billes'}
              percent={scoreData.score}
              detail={`${scoreData.correct} / ${scoreData.total} correctes`}
            />
            {perfEntries.length >= 2 && (
              <div className="border-t pt-4">
                <p className="mb-2 text-center text-sm font-medium text-[#605a57]">
                  Progression
                </p>
                <div className="flex justify-center">
                  <MiniPerformanceChart entries={perfEntries} exerciseId="billes" />
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

  const maxStep = Math.max(0, solutionPath.length - 1);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#fbfaf9] p-4">
      <div className="flex w-full max-w-[920px] flex-col items-center gap-3">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          onClick={handleCanvasClick}
          className="w-full max-w-[900px] rounded-xl shadow-xl"
          style={{ cursor: showCorrection ? 'default' : 'pointer' }}
        />

        {showCorrection && (
          <div
            className="flex w-full max-w-[900px] flex-wrap items-center justify-between gap-3 rounded-xl border bg-white px-4 py-3 shadow-sm"
            style={{ borderColor: '#e2e8f0' }}
          >
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
                disabled={currentStep <= 0}
                aria-label="Etape precedente"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-[7rem] text-center text-sm font-medium text-[#37322f]">
                Etape {currentStep} / {maxStep}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentStep((s) => Math.min(maxStep, s + 1))}
                disabled={currentStep >= maxStep}
                aria-label="Etape suivante"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-[#605a57]">
              Parcours optimal · {correctAnswer} coup
              {correctAnswer > 1 ? 's' : ''}
            </p>
            <Button size="lg" onClick={handleNext}>
              Suivant
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default BillesTest;

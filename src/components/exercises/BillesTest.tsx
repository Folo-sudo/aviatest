'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Scorer } from '@/lib/core/Scorer';
import { Timer } from '@/lib/core/Timer';
import { savePerformanceResult, loadEntries } from '@/lib/core/PerformanceTracker';
import { MiniPerformanceChart } from '@/components/PerformanceChart';
import { TubeState, generatePuzzle } from '@/lib/utils/bfs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Play, Settings, RotateCcw, Home, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

type GameState = 'menu' | 'settings' | 'playing' | 'results';

const BALL_COLORS = ['#a855f7', '#3b82f6', '#eab308', '#22c55e', '#f97316', '#ef4444', '#06b6d4'];

interface GameSettings {
  numBalls: number;
  timePerSeries: number;
  numSeries: number;
  minMoves: number;
  maxMoves: number;
}

export function BillesTest() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const perfSavedRef = useRef(false);
  const [gameState, setGameState] = useState<GameState>('menu');
  const [settings, setSettings] = useState<GameSettings>({
    numBalls: 3,
    timePerSeries: 60,
    numSeries: 20,
    minMoves: 2,
    maxMoves: 6
  });

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
  const height = 700;

  const startNewSeries = useCallback(() => {
    if (currentSeries >= settings.numSeries) {
      setGameState('results');
      return;
    }

    const puzzle = generatePuzzle(settings.numBalls, settings.minMoves, settings.maxMoves);
    setStartConfig(puzzle.start);
    setGoalConfig(puzzle.goal);
    setSolutionPath(puzzle.solution);
    setCorrectAnswer(puzzle.solution.length - 1);
    setSelectedAnswer(null);
    setShowCorrection(false);
    setCurrentStep(0);

    timer?.reset();
    timer?.start();
  }, [currentSeries, settings, timer]);

  const startPlaying = useCallback(() => {
    scorer.reset();
    perfSavedRef.current = false;
    setCurrentSeries(0);

    const newTimer = new Timer(settings.timePerSeries, () => {
      if (!showCorrection) {
        scorer.recordAnswer(false);
        setShowCorrection(true);
      }
    });
    setTimer(newTimer);
    setGameState('playing');

    // Start first series after state update
    setTimeout(() => {
      const puzzle = generatePuzzle(settings.numBalls, settings.minMoves, settings.maxMoves);
      setStartConfig(puzzle.start);
      setGoalConfig(puzzle.goal);
      setSolutionPath(puzzle.solution);
      setCorrectAnswer(puzzle.solution.length - 1);
      newTimer.start();
    }, 0);
  }, [settings, scorer, showCorrection]);

  const handleAnswer = useCallback((num: number) => {
    if (showCorrection) return;

    setSelectedAnswer(num);
    setShowCorrection(true);

    if (num === correctAnswer) {
      scorer.recordAnswer(true);
    } else {
      scorer.recordAnswer(false);
    }
  }, [showCorrection, correctAnswer, scorer]);

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
      const deltaTime = lastTimeRef.current ? (timestamp - lastTimeRef.current) / 1000 : 0;
      lastTimeRef.current = timestamp;

      if (timer && !showCorrection) {
        timer.update(deltaTime);
        setTimerProgress(timer.getProgress());
      }

      // Render
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(20, 20, width - 40, height - 40, 16);
      ctx.fill();

      // Timer bar
      const timerBarWidth = 20;
      const timerBarHeight = height - 100;
      ctx.fillStyle = '#1f2937';
      ctx.beginPath();
      ctx.roundRect(35, 50, timerBarWidth, timerBarHeight, 10);
      ctx.fill();

      const fillHeight = timerBarHeight * timerProgress;
      const fillColor = timerProgress > 0.5 ? '#22c55e' : timerProgress > 0.2 ? '#f59e0b' : '#ef4444';
      ctx.fillStyle = fillColor;
      ctx.beginPath();
      ctx.roundRect(38, 50 + timerBarHeight - fillHeight + 3, timerBarWidth - 6, fillHeight - 6, 7);
      ctx.fill();

      // Draw tubes function
      const drawTubes = (config: TubeState, yBase: number, label: string) => {
        const tubeSpacing = 150;
        const startX = width / 2 - tubeSpacing;
        const ballRadius = 22;

        ctx.font = '16px Inter, Arial';
        ctx.fillStyle = '#6b7280';
        ctx.textAlign = 'left';
        ctx.fillText(label, 70, yBase - 100);

        for (let i = 0; i < 3; i++) {
          const x = startX + i * tubeSpacing;
          const tube = config.tubes[i];
          const capacity = TubeState.CAPACITIES[i];
          const innerRadius = ballRadius + 8;
          const tubeHeight = capacity * (ballRadius * 2 + 5) + 20;
          const centerY = yBase;

          // Draw tube outline
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(x - innerRadius, centerY - tubeHeight);
          ctx.lineTo(x - innerRadius, centerY);
          ctx.arc(x, centerY, innerRadius, Math.PI, 0, true);
          ctx.lineTo(x + innerRadius, centerY - tubeHeight);
          ctx.stroke();

          // Draw balls
          const firstBallY = centerY - ballRadius - 3;
          for (let j = 0; j < tube.length; j++) {
            const ballId = tube[j];
            const ballY = firstBallY - j * (ballRadius * 2 + 5);
            ctx.fillStyle = BALL_COLORS[ballId % BALL_COLORS.length];
            ctx.beginPath();
            ctx.arc(x, ballY, ballRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#1f2937';
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.font = 'bold 20px Inter, Arial';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(ballId), x, ballY);
          }
        }
      };

      // Draw configurations
      if (showCorrection) {
        const currentState = solutionPath[currentStep];
        if (currentState) {
          drawTubes(currentState, 220, `Etape ${currentStep}/${solutionPath.length - 1}`);
        }
      } else if (startConfig) {
        drawTubes(startConfig, 220, 'Depart');
      }

      if (goalConfig) {
        drawTubes(goalConfig, 450, 'Arrivee');
      }

      // Question
      ctx.font = '18px Inter, Arial';
      ctx.fillStyle = '#1e3a5f';
      ctx.textAlign = 'left';
      ctx.fillText('Combien de deplacements de billes sont necessaires ?', 70, 520);

      // Answer buttons
      const buttonY = 560;
      const buttonWidth = 50;
      const buttonSpacing = 60;
      const startButtonX = (width - 8 * buttonSpacing) / 2;

      for (let i = 0; i < 8; i++) {
        const num = i + 2;
        const bx = startButtonX + i * buttonSpacing;

        let bgColor = '#f1f5f9';
        if (showCorrection) {
          if (num === correctAnswer) bgColor = '#86efac';
          else if (num === selectedAnswer && num !== correctAnswer) bgColor = '#fca5a5';
          else bgColor = '#d1d5db';
        }

        ctx.fillStyle = bgColor;
        ctx.beginPath();
        ctx.roundRect(bx, buttonY, buttonWidth, 40, 8);
        ctx.fill();
        ctx.strokeStyle = '#374151';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.font = '18px Inter, Arial';
        ctx.fillStyle = '#1f2937';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(num), bx + buttonWidth/2, buttonY + 20);
      }

      // Series info
      ctx.font = '18px Inter, Arial';
      ctx.fillStyle = '#1f2937';
      ctx.textAlign = 'left';
      ctx.fillText(`Score: ${scorer.getCorrect()} / ${scorer.getTotal()}`, 70, height - 40);

      ctx.textAlign = 'right';
      ctx.fillStyle = '#6b7280';
      ctx.fillText(`Serie ${currentSeries + 1}/${settings.numSeries}`, width - 70, height - 40);

      animationRef.current = requestAnimationFrame(gameLoop);
    };

    animationRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationRef.current);
  }, [gameState, timer, startConfig, goalConfig, solutionPath, showCorrection, currentStep, selectedAnswer, correctAnswer, scorer, currentSeries, settings, timerProgress]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check answer buttons
    const buttonY = 560;
    const buttonWidth = 50;
    const buttonSpacing = 60;
    const startButtonX = (width - 8 * buttonSpacing) / 2;

    if (!showCorrection) {
      for (let i = 0; i < 8; i++) {
        const bx = startButtonX + i * buttonSpacing;
        if (x >= bx && x <= bx + buttonWidth && y >= buttonY && y <= buttonY + 40) {
          handleAnswer(i + 2);
          return;
        }
      }
    }
  };

  if (gameState === 'menu') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">Jeu des Billes</CardTitle>
            <CardDescription className="text-lg">Calculez le nombre de mouvements</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-2xl font-bold text-slate-700">{settings.numSeries}</p>
                <p className="text-sm text-slate-500">Series</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-2xl font-bold text-slate-700">{settings.numBalls}</p>
                <p className="text-sm text-slate-500">Billes</p>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <Button size="lg" className="w-full" onClick={startPlaying}><Play className="mr-2 h-5 w-5" /> Jouer</Button>
              <Button variant="outline" size="lg" className="w-full" onClick={() => setGameState('settings')}><Settings className="mr-2 h-5 w-5" /> Parametres</Button>
              <Button variant="ghost" size="lg" className="w-full" onClick={() => router.push('/')}><ArrowLeft className="mr-2 h-5 w-5" /> Retour</Button>
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
          <CardHeader><CardTitle>Parametres</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label>Nombre de billes: {settings.numBalls}</Label>
                <Slider value={[settings.numBalls]} onValueChange={([v]) => setSettings(s => ({ ...s, numBalls: v }))} min={2} max={7} step={1} className="mt-2" />
              </div>
              <div>
                <Label>Temps par serie: {settings.timePerSeries}s</Label>
                <Slider value={[settings.timePerSeries]} onValueChange={([v]) => setSettings(s => ({ ...s, timePerSeries: v }))} min={15} max={180} step={15} className="mt-2" />
              </div>
              <div>
                <Label>Nombre de series: {settings.numSeries}</Label>
                <Slider value={[settings.numSeries]} onValueChange={([v]) => setSettings(s => ({ ...s, numSeries: v }))} min={5} max={50} step={5} className="mt-2" />
              </div>
            </div>
            <Button variant="outline" className="w-full" onClick={() => setGameState('menu')}><ArrowLeft className="mr-2 h-4 w-4" /> Retour</Button>
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
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">Resultats</CardTitle>
            <Badge variant={scoreData.accuracy >= 75 ? "default" : scoreData.accuracy >= 50 ? "secondary" : "destructive"} className="text-lg px-4 py-1">{scoreData.grade}</Badge>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-6xl font-bold text-slate-700">{scoreData.score}%</p>
              <p className="text-slate-500">{scoreData.correct} / {scoreData.total} correctes</p>
            </div>
            {perfEntries.length >= 2 && (
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-slate-500 mb-2 text-center">Progression</p>
                <div className="flex justify-center">
                  <MiniPerformanceChart entries={perfEntries} exerciseId="billes" />
                </div>
              </div>
            )}
            <div className="flex flex-col gap-3">
              <Button size="lg" className="w-full" onClick={startPlaying}><RotateCcw className="mr-2 h-5 w-5" /> Rejouer</Button>
              <Button variant="outline" size="lg" className="w-full" onClick={() => setGameState('menu')}><ArrowLeft className="mr-2 h-5 w-5" /> Menu</Button>
              <Button variant="ghost" size="lg" className="w-full" onClick={() => router.push('/')}><Home className="mr-2 h-5 w-5" /> Accueil</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="relative">
        <canvas ref={canvasRef} width={width} height={height} onClick={handleCanvasClick} className="rounded-xl shadow-xl cursor-pointer" />
        {showCorrection && (
          <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 flex gap-4">
            <Button size="sm" variant="outline" onClick={() => setCurrentStep(Math.max(0, currentStep - 1))} disabled={currentStep === 0}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button size="lg" onClick={handleNext}>Suivant</Button>
            <Button size="sm" variant="outline" onClick={() => setCurrentStep(Math.min(solutionPath.length - 1, currentStep + 1))} disabled={currentStep >= solutionPath.length - 1}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default BillesTest;

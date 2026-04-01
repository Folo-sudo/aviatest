'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Scorer } from '@/lib/core/Scorer';
import { Timer } from '@/lib/core/Timer';
import { CanvasButton, TimerBar } from '@/lib/core/CanvasUI';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Play, Settings, RotateCcw, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';

type GameState = 'menu' | 'settings' | 'playing' | 'results';

interface DisplayAngle {
  originAngle: number;
  angleValue: number;
}

interface ClockReference {
  x: number;
  y: number;
  radius: number;
  rotation: number;
  isReversed: boolean;
}

interface GameSettings {
  numQuestions: number;
  showFeedback: boolean;
  feedbackDuration: number;
  timePerQuestion: number;
}

export function ClockAngleTest() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [gameState, setGameState] = useState<GameState>('menu');
  const [settings, setSettings] = useState<GameSettings>({
    numQuestions: 20,
    showFeedback: true,
    feedbackDuration: 1.5,
    timePerQuestion: 30
  });

  // Game state
  const [scorer] = useState(() => new Scorer());
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [targetAngle, setTargetAngle] = useState(0);
  const [clockRef, setClockRef] = useState<ClockReference | null>(null);
  const [displayAngle, setDisplayAngle] = useState<DisplayAngle | null>(null);
  const [userInput, setUserInput] = useState('');
  const [answered, setAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [showingFeedback, setShowingFeedback] = useState(false);
  const [timer, setTimer] = useState<Timer | null>(null);
  const [timerProgress, setTimerProgress] = useState(1);

  const animationRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const feedbackTimerRef = useRef<number>(0);

  // Refs to avoid stale closures in the game loop
  const answeredRef = useRef(false);
  const showingFeedbackRef = useRef(false);
  const isCorrectRef = useRef(false);
  const targetAngleRef = useRef(0);
  const displayAngleRef = useRef<DisplayAngle | null>(null);
  const clockRefRef = useRef<ClockReference | null>(null);
  const timerProgressRef = useRef(1);

  // Keep refs in sync with state
  answeredRef.current = answered;
  showingFeedbackRef.current = showingFeedback;
  isCorrectRef.current = isCorrect;
  targetAngleRef.current = targetAngle;
  displayAngleRef.current = displayAngle;
  clockRefRef.current = clockRef;
  timerProgressRef.current = timerProgress;

  const width = 900;
  const height = 550;

  // Generate a new question
  const generateQuestion = useCallback(() => {
    setUserInput('');
    setAnswered(false);
    setIsCorrect(false);
    setShowingFeedback(false);
    feedbackTimerRef.current = 0;

    // New target angle (-280 to +280)
    const newTargetAngle = Math.floor(Math.random() * 561) - 280;
    setTargetAngle(newTargetAngle);

    // New clock configuration
    const newClockRef: ClockReference = {
      x: 700,
      y: 220,
      radius: 120,
      rotation: Math.random() * 360,
      isReversed: Math.random() < 0.5
    };
    setClockRef(newClockRef);

    // Calculate effective angle for display
    const effectiveAngle = newClockRef.isReversed ? -newTargetAngle : newTargetAngle;

    // Single angle to display
    setDisplayAngle({
      originAngle: Math.random() * 360,
      angleValue: effectiveAngle
    });

    // Focus input after render
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  // Start playing
  const startPlaying = useCallback(() => {
    scorer.reset();
    setCurrentQuestion(0);

    const newTimer = new Timer(settings.timePerQuestion, () => {
      if (!answered && !showingFeedback) {
        scorer.recordAnswer(false);
        if (settings.showFeedback) {
          setShowingFeedback(true);
          setAnswered(true);
          setIsCorrect(false);
          feedbackTimerRef.current = settings.feedbackDuration;
        } else {
          nextQuestion();
        }
      }
    });
    setTimer(newTimer);

    generateQuestion();
    setGameState('playing');
    newTimer.start();
  }, [settings, scorer, generateQuestion, answered, showingFeedback]);

  // Next question
  const nextQuestion = useCallback(() => {
    const nextQ = currentQuestion + 1;
    setCurrentQuestion(nextQ);

    if (nextQ >= settings.numQuestions) {
      setGameState('results');
      return;
    }

    generateQuestion();
    timer?.reset();
    timer?.start();
  }, [currentQuestion, settings.numQuestions, generateQuestion, timer]);

  // Handle submit answer
  const handleSubmit = useCallback(() => {
    if (answered || showingFeedback) return;
    const parsed = parseInt(userInput, 10);
    if (isNaN(parsed)) return;

    setAnswered(true);
    const correct = parsed === targetAngle;
    setIsCorrect(correct);
    scorer.recordAnswer(correct);

    if (settings.showFeedback) {
      setShowingFeedback(true);
      feedbackTimerRef.current = settings.feedbackDuration;
    } else {
      nextQuestion();
    }
  }, [userInput, answered, showingFeedback, targetAngle, scorer, settings, nextQuestion]);

  // Stable refs for game loop callbacks (avoid stale closures)
  const timerRef = useRef<Timer | null>(null);
  timerRef.current = timer;
  const nextQuestionRef = useRef(nextQuestion);
  nextQuestionRef.current = nextQuestion;

  // Game loop — runs continuously while playing, reads all state from refs
  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    lastTimeRef.current = 0;

    const gameLoop = (timestamp: number) => {
      const deltaTime = lastTimeRef.current ? (timestamp - lastTimeRef.current) / 1000 : 0;
      lastTimeRef.current = timestamp;

      // Update timer
      if (timerRef.current && !showingFeedbackRef.current && !answeredRef.current) {
        timerRef.current.update(deltaTime);
        const p = timerRef.current.getProgress();
        timerProgressRef.current = p;
        setTimerProgress(p);
      }

      // Update feedback timer
      if (showingFeedbackRef.current) {
        feedbackTimerRef.current -= deltaTime;
        if (feedbackTimerRef.current <= 0) {
          setShowingFeedback(false);
          showingFeedbackRef.current = false;
          nextQuestionRef.current();
        }
      }

      // Render
      renderGame(ctx);

      animationRef.current = requestAnimationFrame(gameLoop);
    };

    animationRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameState]); // Only restart loop when entering/leaving playing state

  // Render game — reads from refs to avoid stale closures in rAF
  const renderGame = (ctx: CanvasRenderingContext2D) => {
    const clock = clockRefRef.current;
    const angle = displayAngleRef.current;
    const isAnswered = answeredRef.current;
    const progress = timerProgressRef.current;

    if (!clock || !angle) return;

    // Background
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, 0, width, height);

    // Main area
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(20, 20, width - 40, height - 40, 16);
    ctx.fill();
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Timer bar
    const timerBarWidth = 20;
    const timerBarHeight = height - 100;
    const timerBarX = 35;
    const timerBarY = 50;

    ctx.fillStyle = '#1f2937';
    ctx.beginPath();
    ctx.roundRect(timerBarX, timerBarY, timerBarWidth, timerBarHeight, 10);
    ctx.fill();

    const fillHeight = timerBarHeight * progress;
    const fillColor = progress > 0.5 ? '#22c55e' : progress > 0.2 ? '#f59e0b' : '#ef4444';
    ctx.fillStyle = fillColor;
    ctx.beginPath();
    ctx.roundRect(timerBarX + 3, timerBarY + timerBarHeight - fillHeight + 3, timerBarWidth - 6, fillHeight - 6, 7);
    ctx.fill();

    // Draw the angle to identify (large, centered)
    const angleBoxSize = 280;
    // Center the box when clock is hidden, shift left when clock appears
    const angleBoxX = isAnswered ? 100 : (width - angleBoxSize) / 2;
    const angleBoxY = 80;

    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;
    ctx.fillRect(angleBoxX, angleBoxY, angleBoxSize, angleBoxSize);
    ctx.strokeRect(angleBoxX, angleBoxY, angleBoxSize, angleBoxSize);

    // Draw angle segments inside the box
    const cx = angleBoxX + angleBoxSize / 2;
    const cy = angleBoxY + angleBoxSize / 2;
    const segLength = angleBoxSize * 0.35;

    const oAngleRad = (angle.originAngle * Math.PI) / 180;
    const ox = cx + segLength * Math.cos(oAngleRad);
    const oy = cy - segLength * Math.sin(oAngleRad);

    const aAngleRad = ((angle.originAngle + angle.angleValue) * Math.PI) / 180;
    const ax = cx + segLength * Math.cos(aAngleRad);
    const ay = cy - segLength * Math.sin(aAngleRad);

    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(ox, oy);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(ax, ay);
    ctx.stroke();

    // Labels A and O
    ctx.font = 'bold 18px Inter, Arial';
    ctx.fillStyle = '#1f2937';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const labelOffset = 16;
    ctx.fillText('A', ox + labelOffset * Math.cos(oAngleRad), oy - labelOffset * Math.sin(oAngleRad));
    ctx.fillText('O', ax + labelOffset * Math.cos(aAngleRad), ay - labelOffset * Math.sin(aAngleRad));

    // Label under box
    ctx.font = '16px Inter, Arial';
    ctx.fillStyle = '#6b7280';
    ctx.textAlign = 'center';
    ctx.fillText('Quel est cet angle ?', angleBoxX + angleBoxSize / 2, angleBoxY + angleBoxSize + 25);

    // Draw clock reference ONLY after answering (correction phase)
    if (isAnswered) {
      drawClockReference(ctx, clock);
    }

    // Score and progress
    ctx.font = '20px Inter, Arial';
    ctx.fillStyle = '#1f2937';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${scorer.getCorrect()} / ${scorer.getTotal()}`, 80, height - 40);

    ctx.textAlign = 'right';
    ctx.fillText(`Question ${currentQuestion + 1} / ${settings.numQuestions}`, width - 80, height - 40);
  };

  // Draw clock reference
  const drawClockReference = (ctx: CanvasRenderingContext2D, clock: ClockReference) => {
    // Circle
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(clock.x, clock.y, clock.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Numbers
    const positions: Record<string, number> = {
      '12': 90,
      '3': 0,
      '6': 270,
      '9': 180
    };

    if (clock.isReversed) {
      [positions['3'], positions['9']] = [positions['9'], positions['3']];
    }

    ctx.font = 'bold 22px Inter, Arial';
    ctx.fillStyle = '#1f2937';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const [num, baseAngle] of Object.entries(positions)) {
      const angle = baseAngle + clock.rotation;
      const angleRad = (angle * Math.PI) / 180;
      const dist = clock.radius - 25;
      const nx = clock.x + dist * Math.cos(angleRad);
      const ny = clock.y - dist * Math.sin(angleRad);
      ctx.fillText(num, nx, ny);

      // Tick mark
      const markInner = clock.radius - 8;
      const markOuter = clock.radius - 2;
      ctx.beginPath();
      ctx.moveTo(clock.x + markInner * Math.cos(angleRad), clock.y - markInner * Math.sin(angleRad));
      ctx.lineTo(clock.x + markOuter * Math.cos(angleRad), clock.y - markOuter * Math.sin(angleRad));
      ctx.strokeStyle = '#1f2937';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  };

  // Render based on game state
  if (gameState === 'menu') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">Test des Angles d'Horloge</CardTitle>
            <CardDescription className="text-lg">
              Orientation spatiale avec referentiel horloge
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-2xl font-bold text-slate-700">{settings.numQuestions}</p>
                <p className="text-sm text-slate-500">Questions</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-2xl font-bold text-slate-700">{settings.timePerQuestion}s</p>
                <p className="text-sm text-slate-500">Par question</p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Button size="lg" className="w-full" onClick={startPlaying}>
                <Play className="mr-2 h-5 w-5" />
                Jouer
              </Button>
              <Button variant="outline" size="lg" className="w-full" onClick={() => setGameState('settings')}>
                <Settings className="mr-2 h-5 w-5" />
                Parametres
              </Button>
              <Button variant="ghost" size="lg" className="w-full" onClick={() => router.push('/')}>
                <ArrowLeft className="mr-2 h-5 w-5" />
                Retour
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
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label>Nombre de questions: {settings.numQuestions}</Label>
                <Slider
                  value={[settings.numQuestions]}
                  onValueChange={([v]) => setSettings(s => ({ ...s, numQuestions: v }))}
                  min={5}
                  max={50}
                  step={5}
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Temps par question: {settings.timePerQuestion}s</Label>
                <Slider
                  value={[settings.timePerQuestion]}
                  onValueChange={([v]) => setSettings(s => ({ ...s, timePerQuestion: v }))}
                  min={10}
                  max={60}
                  step={5}
                  className="mt-2"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Afficher la correction</Label>
                <Switch
                  checked={settings.showFeedback}
                  onCheckedChange={(v) => setSettings(s => ({ ...s, showFeedback: v }))}
                />
              </div>

              <div>
                <Label>Duree du feedback: {settings.feedbackDuration}s</Label>
                <Slider
                  value={[settings.feedbackDuration]}
                  onValueChange={([v]) => setSettings(s => ({ ...s, feedbackDuration: v }))}
                  min={0.5}
                  max={3}
                  step={0.5}
                  className="mt-2"
                />
              </div>
            </div>

            <Button variant="outline" className="w-full" onClick={() => setGameState('menu')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (gameState === 'results') {
    const scoreData = scorer.toJSON();
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">Resultats</CardTitle>
            <Badge variant={scoreData.accuracy >= 75 ? "default" : scoreData.accuracy >= 50 ? "secondary" : "destructive"} className="text-lg px-4 py-1">
              {scoreData.grade}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-6xl font-bold text-slate-700">{scoreData.score}%</p>
              <p className="text-slate-500">{scoreData.correct} / {scoreData.total} correctes</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-green-600">{scoreData.correct}</p>
                <p className="text-sm text-green-700">Correctes</p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-red-600">{scoreData.wrong}</p>
                <p className="text-sm text-red-700">Erreurs</p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Button size="lg" className="w-full" onClick={startPlaying}>
                <RotateCcw className="mr-2 h-5 w-5" />
                Rejouer
              </Button>
              <Button variant="outline" size="lg" className="w-full" onClick={() => setGameState('menu')}>
                <ArrowLeft className="mr-2 h-5 w-5" />
                Menu
              </Button>
              <Button variant="ghost" size="lg" className="w-full" onClick={() => router.push('/')}>
                <Home className="mr-2 h-5 w-5" />
                Accueil
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Playing state
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="flex flex-col items-center gap-4">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="rounded-xl shadow-xl"
        />
        <div className="flex items-center gap-3 w-full max-w-md">
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              type="number"
              placeholder="Entrez l'angle (ex: -45)"
              value={userInput}
              onChange={(e) => !answered && setUserInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              disabled={answered || showingFeedback}
              className={`text-center text-lg font-mono h-12 ${
                showingFeedback
                  ? isCorrect
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-red-500 bg-red-50 text-red-700'
                  : ''
              }`}
            />
            {showingFeedback && !isCorrect && (
              <p className="text-sm text-center mt-1 text-slate-500">
                Reponse correcte : <span className="font-bold text-green-600">{targetAngle >= 0 ? '+' : ''}{targetAngle}</span>
              </p>
            )}
            {showingFeedback && isCorrect && (
              <p className="text-sm text-center mt-1 text-green-600 font-bold">
                Correct !
              </p>
            )}
          </div>
          <Button
            size="lg"
            onClick={handleSubmit}
            disabled={userInput === '' || answered || showingFeedback}
            className="h-12"
          >
            Valider
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ClockAngleTest;

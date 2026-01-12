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
import { ArrowLeft, Play, Settings, RotateCcw, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';

type GameState = 'menu' | 'settings' | 'playing' | 'results';

interface AngleProposition {
  x: number;
  y: number;
  size: number;
  angleValue: number;
  originAngle: number;
  highlight: 'green' | 'red' | null;
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
  const [propositions, setPropositions] = useState<AngleProposition[]>([]);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [answered, setAnswered] = useState(false);
  const [showingFeedback, setShowingFeedback] = useState(false);
  const [timer, setTimer] = useState<Timer | null>(null);
  const [timerProgress, setTimerProgress] = useState(1);

  const animationRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const feedbackTimerRef = useRef<number>(0);

  const width = 900;
  const height = 650;

  // Generate a new question
  const generateQuestion = useCallback(() => {
    setSelectedIndex(-1);
    setAnswered(false);
    setShowingFeedback(false);
    feedbackTimerRef.current = 0;

    // New target angle (-280 to +280)
    const newTargetAngle = Math.floor(Math.random() * 561) - 280;
    setTargetAngle(newTargetAngle);

    // New clock configuration
    const newClockRef: ClockReference = {
      x: 700,
      y: 180,
      radius: 120,
      rotation: Math.random() * 360,
      isReversed: Math.random() < 0.5
    };
    setClockRef(newClockRef);

    // Calculate effective angle
    const effectiveAngle = newClockRef.isReversed ? -newTargetAngle : newTargetAngle;

    // Generate propositions
    const squareSize = 100;
    const startX = 60;
    const yPos = 350;
    const spacing = 140;
    const newCorrectIndex = Math.floor(Math.random() * 5);
    setCorrectIndex(newCorrectIndex);

    // Generate wrong angles
    const wrongAngles: number[] = [];
    while (wrongAngles.length < 4) {
      const wrong = Math.floor(Math.random() * 561) - 280;
      if (Math.abs(wrong - newTargetAngle) > 15 && !wrongAngles.includes(wrong)) {
        wrongAngles.push(wrong);
      }
    }

    const newPropositions: AngleProposition[] = [];
    let wrongIdx = 0;

    for (let i = 0; i < 5; i++) {
      const originAngle = Math.random() * 360;
      let angleValue: number;

      if (i === newCorrectIndex) {
        angleValue = effectiveAngle;
      } else {
        const wrongDisplay = newClockRef.isReversed ? -wrongAngles[wrongIdx] : wrongAngles[wrongIdx];
        angleValue = wrongDisplay;
        wrongIdx++;
      }

      newPropositions.push({
        x: startX + i * spacing,
        y: yPos,
        size: squareSize,
        angleValue,
        originAngle,
        highlight: null
      });
    }

    setPropositions(newPropositions);
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

  // Handle answer selection
  const handleSelection = useCallback((index: number) => {
    if (showingFeedback || answered) return;
    setSelectedIndex(index);
  }, [showingFeedback, answered]);

  // Handle next button click
  const handleNext = useCallback(() => {
    if (selectedIndex === -1) return;

    if (!answered) {
      setAnswered(true);
      const isCorrect = selectedIndex === correctIndex;
      scorer.recordAnswer(isCorrect);

      if (settings.showFeedback) {
        setShowingFeedback(true);
        feedbackTimerRef.current = settings.feedbackDuration;

        // Update proposition highlights
        setPropositions(prev => prev.map((prop, i) => ({
          ...prop,
          highlight: i === correctIndex ? 'green' : (i === selectedIndex && i !== correctIndex ? 'red' : null)
        })));
      } else {
        nextQuestion();
      }
    }
  }, [selectedIndex, answered, correctIndex, scorer, settings, nextQuestion]);

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gameLoop = (timestamp: number) => {
      const deltaTime = lastTimeRef.current ? (timestamp - lastTimeRef.current) / 1000 : 0;
      lastTimeRef.current = timestamp;

      // Update timer
      if (timer && !showingFeedback && !answered) {
        timer.update(deltaTime);
        setTimerProgress(timer.getProgress());
      }

      // Update feedback timer
      if (showingFeedback) {
        feedbackTimerRef.current -= deltaTime;
        if (feedbackTimerRef.current <= 0) {
          setShowingFeedback(false);
          nextQuestion();
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
  }, [gameState, timer, showingFeedback, answered, nextQuestion]);

  // Render game
  const renderGame = (ctx: CanvasRenderingContext2D) => {
    if (!clockRef) return;

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

    const fillHeight = timerBarHeight * timerProgress;
    const fillColor = timerProgress > 0.5 ? '#22c55e' : timerProgress > 0.2 ? '#f59e0b' : '#ef4444';
    ctx.fillStyle = fillColor;
    ctx.beginPath();
    ctx.roundRect(timerBarX + 3, timerBarY + timerBarHeight - fillHeight + 3, timerBarWidth - 6, fillHeight - 6, 7);
    ctx.fill();

    // Target angle display
    const angleText = `Angle = ${targetAngle >= 0 ? '+' : ''}${targetAngle}deg`;
    ctx.font = 'bold 28px Inter, Arial';
    ctx.fillStyle = '#1f2937';
    ctx.textAlign = 'left';
    ctx.fillText(angleText, 80, 200);

    // Draw clock reference
    drawClockReference(ctx, clockRef);

    // Draw propositions
    propositions.forEach((prop, i) => {
      drawProposition(ctx, prop, i, selectedIndex === i);
    });

    // Score and progress
    ctx.font = '20px Inter, Arial';
    ctx.fillStyle = '#1f2937';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${scorer.getCorrect()} / ${scorer.getTotal()}`, 80, height - 50);

    ctx.textAlign = 'right';
    ctx.fillText(`Question ${currentQuestion + 1} / ${settings.numQuestions}`, width - 80, height - 50);
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

  // Draw proposition
  const drawProposition = (ctx: CanvasRenderingContext2D, prop: AngleProposition, index: number, isSelected: boolean) => {
    // Background
    let bgColor = '#ffffff';
    if (prop.highlight === 'green') bgColor = '#dcfce7';
    else if (prop.highlight === 'red') bgColor = '#fee2e2';
    else if (isSelected) bgColor = '#dbeafe';

    ctx.fillStyle = bgColor;
    ctx.fillRect(prop.x, prop.y, prop.size, prop.size);

    // Border
    let borderColor = '#374151';
    if (prop.highlight === 'green') borderColor = '#22c55e';
    else if (prop.highlight === 'red') borderColor = '#ef4444';
    else if (isSelected) borderColor = '#3b82f6';

    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(prop.x, prop.y, prop.size, prop.size);

    // Draw angle segments
    const cx = prop.x + prop.size / 2;
    const cy = prop.y + prop.size / 2;
    const segLength = prop.size * 0.35;

    // O segment
    const oAngleRad = (prop.originAngle * Math.PI) / 180;
    const ox = cx + segLength * Math.cos(oAngleRad);
    const oy = cy - segLength * Math.sin(oAngleRad);

    // A segment
    const aAngleRad = ((prop.originAngle + prop.angleValue) * Math.PI) / 180;
    const ax = cx + segLength * Math.cos(aAngleRad);
    const ay = cy - segLength * Math.sin(aAngleRad);

    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(ox, oy);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(ax, ay);
    ctx.stroke();

    // Labels
    ctx.font = '14px Inter, Arial';
    ctx.fillStyle = '#1f2937';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const labelOffset = 12;
    ctx.fillText('A', ox + labelOffset * Math.cos(oAngleRad), oy - labelOffset * Math.sin(oAngleRad));
    ctx.fillText('O', ax + labelOffset * Math.cos(aAngleRad), ay - labelOffset * Math.sin(aAngleRad));

    // Button below
    const btnY = prop.y + prop.size + 8;
    const btnHeight = 32;

    let btnColor = '#f3f4f6';
    if (prop.highlight === 'green') btnColor = '#86efac';
    else if (prop.highlight === 'red') btnColor = '#fca5a5';
    else if (isSelected) btnColor = '#93c5fd';

    ctx.fillStyle = btnColor;
    ctx.beginPath();
    ctx.roundRect(prop.x, btnY, prop.size, btnHeight, 6);
    ctx.fill();
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = '14px Inter, Arial';
    ctx.fillStyle = '#1f2937';
    ctx.fillText(`${index + 1}${isSelected ? ' ✓' : ''}`, prop.x + prop.size / 2, btnY + btnHeight / 2);
  };

  // Handle canvas click
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || showingFeedback) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check proposition clicks
    propositions.forEach((prop, i) => {
      const btnY = prop.y + prop.size + 8;
      const btnHeight = 32;
      if (x >= prop.x && x <= prop.x + prop.size && y >= prop.y && y <= btnY + btnHeight) {
        handleSelection(i);
      }
    });
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
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          onClick={handleCanvasClick}
          className="rounded-xl shadow-xl cursor-pointer"
        />
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
          <Button
            size="lg"
            onClick={handleNext}
            disabled={selectedIndex === -1 || showingFeedback}
          >
            Suivant
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ClockAngleTest;

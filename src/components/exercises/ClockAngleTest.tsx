'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Scorer } from '@/lib/core/Scorer';
import { Timer } from '@/lib/core/Timer';
import { CanvasButton, TimerBar } from '@/lib/core/CanvasUI';
import { savePerformanceResult } from '@/lib/core/PerformanceTracker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ExerciseMenu,
  ExerciseResults,
  ExerciseSettings,
  SettingSlider,
} from '@/components/exercises/shell';
import { useRouter } from 'next/navigation';
import { usePhoneLayout } from '@/components/phone/PhoneLayout';
import { PhoneNumpad } from '@/components/phone/PhoneDpad';

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

const SETTINGS_KEY = 'aviatest-clock-angle-settings';
const DEFAULT_SETTINGS: GameSettings = {
  numQuestions: 20,
  showFeedback: true,
  feedbackDuration: 1.5,
  timePerQuestion: 30,
};

function loadClockSettings(): GameSettings {
  if (typeof window === 'undefined') return { ...DEFAULT_SETTINGS };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function ClockAngleTest() {
  const router = useRouter();
  const phone = usePhoneLayout();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const perfSavedRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [gameState, setGameState] = useState<GameState>('menu');
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const settingsReadyRef = useRef(false);

  useEffect(() => {
    setSettings(loadClockSettings());
    const t = window.setTimeout(() => {
      settingsReadyRef.current = true;
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!settingsReadyRef.current) return;
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      /* ignore */
    }
  }, [settings]);

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

    // New target angle (-280 to +280, multiples of 10 only)
    const newTargetAngle = (Math.floor(Math.random() * 57) - 28) * 10;
    setTargetAngle(newTargetAngle);

    // New clock configuration
    const newClockRef: ClockReference = {
      x: 700,
      y: 220,
      radius: 120,
      rotation: Math.floor(Math.random() * 36) * 10,
      isReversed: Math.random() < 0.5
    };
    setClockRef(newClockRef);

    // Calculate effective angle for display
    const effectiveAngle = newClockRef.isReversed ? -newTargetAngle : newTargetAngle;

    // Single angle to display
    setDisplayAngle({
      originAngle: Math.floor(Math.random() * 36) * 10,
      angleValue: effectiveAngle
    });

    // Focus input after render
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  // Start playing
  const startPlaying = useCallback(() => {
    scorer.reset();
    perfSavedRef.current = false;
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
    ctx.fillStyle = '#fbfaf9';
    ctx.fillRect(0, 0, width, height);

    // Main area
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(20, 20, width - 40, height - 40, 16);
    ctx.fill();
    ctx.strokeStyle = '#e0dedb';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Timer bar
    const timerBarWidth = 20;
    const timerBarHeight = height - 100;
    const timerBarX = 35;
    const timerBarY = 50;

    ctx.fillStyle = '#37322f';
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

    // Correction arc (when answered, show measurement direction from O to A)
    if (isAnswered && angle) {
      const arcR = 45;
      const startRad = angle.originAngle * Math.PI / 180;
      const endRad = (angle.originAngle + angle.angleValue) * Math.PI / 180;

      ctx.strokeStyle = isCorrectRef.current ? '#22c55e' : '#ef4444';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.arc(cx, cy, arcR, -startRad, -endRad, angle.angleValue > 0);
      ctx.stroke();
      ctx.setLineDash([]);

      // Arrowhead at A end
      const tipAngle = (angle.originAngle + angle.angleValue) * Math.PI / 180;
      const tipX = cx + arcR * Math.cos(tipAngle);
      const tipY = cy - arcR * Math.sin(tipAngle);
      const backDir = angle.angleValue > 0 ? tipAngle - Math.PI / 2 : tipAngle + Math.PI / 2;
      const aLen = 8;
      const aSpread = 0.4;

      ctx.fillStyle = isCorrectRef.current ? '#22c55e' : '#ef4444';
      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(
        tipX + aLen * Math.cos(backDir - aSpread),
        tipY - aLen * Math.sin(backDir - aSpread)
      );
      ctx.lineTo(
        tipX + aLen * Math.cos(backDir + aSpread),
        tipY - aLen * Math.sin(backDir + aSpread)
      );
      ctx.closePath();
      ctx.fill();
    }

    // Labels O and A (angle is measured from O to A)
    ctx.font = 'bold 18px Inter, Arial';
    ctx.fillStyle = '#1f2937';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const labelOffset = 16;
    ctx.fillText('O', ox + labelOffset * Math.cos(oAngleRad), oy - labelOffset * Math.sin(oAngleRad));
    ctx.fillText('A', ax + labelOffset * Math.cos(aAngleRad), ay - labelOffset * Math.sin(aAngleRad));

    // Cardan — positive direction indicator (always visible during question)
    if (clock) {
      const cardanX = angleBoxX + angleBoxSize - 38;
      const cardanY = angleBoxY + 38;
      const cardanR = 24;
      const isCW = clock.isReversed;

      // Background circle
      ctx.fillStyle = '#f8fafc';
      ctx.strokeStyle = '#374151';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cardanX, cardanY, cardanR, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Curved arc arrow showing positive direction
      const arrowR = cardanR * 0.65;
      const arcStartDeg = 60;
      const arcSweepDeg = 260;
      const endDeg = isCW ? arcStartDeg - arcSweepDeg : arcStartDeg + arcSweepDeg;
      const startRad2 = (arcStartDeg * Math.PI) / 180;
      const endRad2 = (endDeg * Math.PI) / 180;

      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cardanX, cardanY, arrowR, -startRad2, -endRad2, !isCW);
      ctx.stroke();

      // Arrowhead (filled triangle)
      const tipAngle2 = endDeg * Math.PI / 180;
      const tipX2 = cardanX + arrowR * Math.cos(tipAngle2);
      const tipY2 = cardanY - arrowR * Math.sin(tipAngle2);
      const backDir2 = isCW ? tipAngle2 + Math.PI / 2 : tipAngle2 - Math.PI / 2;
      const aLen2 = 7;
      const aSpread2 = 0.5;

      ctx.fillStyle = '#2563eb';
      ctx.beginPath();
      ctx.moveTo(tipX2, tipY2);
      ctx.lineTo(
        tipX2 + aLen2 * Math.cos(backDir2 - aSpread2),
        tipY2 - aLen2 * Math.sin(backDir2 - aSpread2)
      );
      ctx.lineTo(
        tipX2 + aLen2 * Math.cos(backDir2 + aSpread2),
        tipY2 - aLen2 * Math.sin(backDir2 + aSpread2)
      );
      ctx.closePath();
      ctx.fill();

      // "+" label in center
      ctx.font = 'bold 14px Inter, Arial';
      ctx.fillStyle = '#2563eb';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('+', cardanX, cardanY);
    }

    // Label under box
    ctx.font = '16px Inter, Arial';
    ctx.fillStyle = '#6b7280';
    ctx.textAlign = 'center';
    ctx.fillText('Angle de O vers A ?', angleBoxX + angleBoxSize / 2, angleBoxY + angleBoxSize + 25);

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

    // Positive direction arc arrow on clock
    const isCW = clock.isReversed;
    const posArcR = clock.radius + 14;
    const posStartDeg = 90 + clock.rotation + 30;
    const posSweepDeg = 120;
    const posEndDeg = isCW ? posStartDeg - posSweepDeg : posStartDeg + posSweepDeg;
    const posStartRad = (posStartDeg * Math.PI) / 180;
    const posEndRad = (posEndDeg * Math.PI) / 180;

    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(clock.x, clock.y, posArcR, -posStartRad, -posEndRad, !isCW);
    ctx.stroke();

    // Arrowhead
    const posTipAngle = (posEndDeg * Math.PI) / 180;
    const posTipX = clock.x + posArcR * Math.cos(posTipAngle);
    const posTipY = clock.y - posArcR * Math.sin(posTipAngle);
    const posBackDir = isCW ? posTipAngle + Math.PI / 2 : posTipAngle - Math.PI / 2;
    const posALen = 8;
    const posASpread = 0.4;

    ctx.fillStyle = '#2563eb';
    ctx.beginPath();
    ctx.moveTo(posTipX, posTipY);
    ctx.lineTo(
      posTipX + posALen * Math.cos(posBackDir - posASpread),
      posTipY - posALen * Math.sin(posBackDir - posASpread)
    );
    ctx.lineTo(
      posTipX + posALen * Math.cos(posBackDir + posASpread),
      posTipY - posALen * Math.sin(posBackDir + posASpread)
    );
    ctx.closePath();
    ctx.fill();

    // "+" label near the arc
    ctx.font = 'bold 16px Inter, Arial';
    ctx.fillStyle = '#2563eb';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const posLabelAngle = (((posStartDeg + posEndDeg) / 2) * Math.PI) / 180;
    const posLabelR = posArcR + 14;
    ctx.fillText('+',
      clock.x + posLabelR * Math.cos(posLabelAngle),
      clock.y - posLabelR * Math.sin(posLabelAngle)
    );
  };

  // Render based on game state
  if (gameState === 'menu') {
    return (
      <ExerciseMenu
        title="Test des Angles d'Horloge"
        subtitle="Orientation spatiale avec référentiel horloge"
        stats={[
          { value: settings.numQuestions, label: 'Questions' },
          { value: `${settings.timePerQuestion}s`, label: 'Par question' },
        ]}
        examMode={!settings.showFeedback}
        onPlay={startPlaying}
        onSettings={() => setGameState('settings')}
        onBack={() => router.push('/')}
      />
    );
  }

  if (gameState === 'settings') {
    return (
      <ExerciseSettings
        examMode={{
          checked: !settings.showFeedback,
          onCheckedChange: (v) => setSettings((s) => ({ ...s, showFeedback: !v })),
        }}
        onBack={() => setGameState('menu')}
      >
        <SettingSlider
          label="Nombre de questions"
          value={settings.numQuestions}
          min={5}
          max={50}
          step={5}
          onChange={(v) => setSettings((s) => ({ ...s, numQuestions: v }))}
        />
        <SettingSlider
          label="Temps par question"
          value={settings.timePerQuestion}
          min={10}
          max={60}
          step={5}
          format={(v) => `${v}s`}
          onChange={(v) => setSettings((s) => ({ ...s, timePerQuestion: v }))}
        />
        {settings.showFeedback ? (
          <SettingSlider
            label="Durée du feedback"
            value={settings.feedbackDuration}
            min={0.5}
            max={3}
            step={0.5}
            format={(v) => `${v}s`}
            onChange={(v) => setSettings((s) => ({ ...s, feedbackDuration: v }))}
          />
        ) : null}
      </ExerciseSettings>
    );
  }

  if (gameState === 'results') {
    const scoreData = scorer.toJSON();
    if (!perfSavedRef.current) {
      perfSavedRef.current = true;
      savePerformanceResult('clock-angle', scoreData.correct, settings.numQuestions);
    }
    return (
      <ExerciseResults
        exerciseId="clock-angle"
        percent={scoreData.score}
        detail={`${scoreData.correct} / ${scoreData.total} correctes`}
        onReplay={startPlaying}
        onMenu={() => setGameState('menu')}
        onHome={() => router.push('/')}
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-green-50 p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{scoreData.correct}</p>
            <p className="text-sm text-green-700">Correctes</p>
          </div>
          <div className="rounded-lg bg-red-50 p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{scoreData.wrong}</p>
            <p className="text-sm text-red-700">Erreurs</p>
          </div>
        </div>
      </ExerciseResults>
    );
  }

  // Playing state
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#fbfaf9] p-4">
      <div className="flex flex-col items-center gap-4">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="phone-scale rounded-xl shadow-xl"
        />
        {phone ? (
          <div className="w-full max-w-sm space-y-3">
            <p className="text-center font-mono text-2xl font-semibold text-[#37322f]">
              {userInput || '—'}
              {showingFeedback && !isCorrect && (
                <span className="ml-2 text-sm font-normal text-[#605a57]">
                  ({targetAngle >= 0 ? '+' : ''}{targetAngle})
                </span>
              )}
            </p>
            {showingFeedback && isCorrect && (
              <p className="text-center text-sm font-bold text-green-600">Correct !</p>
            )}
            {!answered && !showingFeedback && (
              <PhoneNumpad
                onDigit={(d) => setUserInput((v) => (v + d).slice(0, 5))}
                onMinus={() =>
                  setUserInput((v) => (v.startsWith('-') ? v.slice(1) : `-${v}`))
                }
                onBackspace={() => setUserInput((v) => v.slice(0, -1))}
                onSubmit={handleSubmit}
              />
            )}
          </div>
        ) : (
        <div className="flex items-center gap-3 w-full max-w-md">
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              type="number"
              step={10}
              placeholder="Entrez l'angle (ex: -40)"
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
              <p className="text-sm text-center mt-1 text-[#605a57]">
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
        )}
      </div>
    </div>
  );
}

export default ClockAngleTest;

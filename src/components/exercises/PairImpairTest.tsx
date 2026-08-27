'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Scorer } from '@/lib/core/Scorer';
import { Timer } from '@/lib/core/Timer';
import { savePerformanceResult } from '@/lib/core/PerformanceTracker';
import {
  ExerciseMenu,
  ExerciseResults,
  ExerciseSettings,
  SettingSlider,
} from '@/components/exercises/shell';
import { useRouter } from 'next/navigation';
import { canvasPoint } from '@/lib/phone/canvasPoint';
import { usePhoneLayout } from '@/components/phone/PhoneLayout';

type GameState = 'menu' | 'settings' | 'playing' | 'results';

interface NumberCircle {
  number: number;
  isEven: boolean;
  x: number;
  y: number;
  radius: number;
  highlighted: boolean;
  isStart: boolean;
}

interface GameSettings {
  numbersPerCategory: number;
  timePerSeries: number;
  numSeries: number;
  minValue: number;
  maxValue: number;
}

const SETTINGS_KEY = 'aviatest-pair-impair-settings';
const DEFAULT_SETTINGS: GameSettings = {
  numbersPerCategory: 5,
  timePerSeries: 60,
  numSeries: 10,
  minValue: 10,
  maxValue: 999,
};

function loadPairSettings(): GameSettings {
  if (typeof window === 'undefined') return { ...DEFAULT_SETTINGS };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function PairImpairTest() {
  const router = useRouter();
  const phone = usePhoneLayout();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const perfSavedRef = useRef(false);
  const settingsReadyRef = useRef(false);
  const [gameState, setGameState] = useState<GameState>('menu');
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    setSettings(loadPairSettings());
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

  const [scorer] = useState(() => new Scorer());
  const [circles, setCircles] = useState<NumberCircle[]>([]);
  const [sequence, setSequence] = useState<{ number: number; isEven: boolean }[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [errors, setErrors] = useState(0);
  const [seriesCompleted, setSeriesCompleted] = useState(0);
  const [timer, setTimer] = useState<Timer | null>(null);
  const [timerProgress, setTimerProgress] = useState(1);
  const [errorFlash, setErrorFlash] = useState(false);

  const animationRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const width = 900;
  const height = 650;

  const generateRandomPositions = (count: number) => {
    const positions: [number, number][] = [];
    const minX = 110, maxX = width - 70;
    const minY = 150, maxY = height - 150;
    const minDist = 65;

    for (let i = 0; i < count; i++) {
      let found = false;
      for (let attempt = 0; attempt < 1000; attempt++) {
        const x = Math.floor(Math.random() * (maxX - minX)) + minX;
        const y = Math.floor(Math.random() * (maxY - minY)) + minY;

        let valid = true;
        for (const [px, py] of positions) {
          if (Math.sqrt((x - px) ** 2 + (y - py) ** 2) < minDist * 2) {
            valid = false;
            break;
          }
        }

        if (valid) {
          positions.push([x, y]);
          found = true;
          break;
        }
      }

      if (!found) {
        positions.push([
          Math.floor(Math.random() * (maxX - minX)) + minX,
          Math.floor(Math.random() * (maxY - minY)) + minY
        ]);
      }
    }
    return positions;
  };

  const generateSeries = useCallback(() => {
    const evenNumbers: number[] = [];
    const oddNumbers: number[] = [];

    while (evenNumbers.length < settings.numbersPerCategory) {
      const num = Math.floor(Math.random() * (settings.maxValue - settings.minValue + 1)) + settings.minValue;
      if (num % 2 === 0 && !evenNumbers.includes(num)) evenNumbers.push(num);
    }

    while (oddNumbers.length < settings.numbersPerCategory) {
      const num = Math.floor(Math.random() * (settings.maxValue - settings.minValue + 1)) + settings.minValue;
      if (num % 2 === 1 && !oddNumbers.includes(num)) oddNumbers.push(num);
    }

    evenNumbers.sort((a, b) => a - b);
    oddNumbers.sort((a, b) => a - b);

    const newSequence: { number: number; isEven: boolean }[] = [];
    for (let i = 0; i < settings.numbersPerCategory; i++) {
      newSequence.push({ number: evenNumbers[i], isEven: true });
      if (i < oddNumbers.length) {
        newSequence.push({ number: oddNumbers[i], isEven: false });
      }
    }
    setSequence(newSequence);
    setCurrentIndex(0);

    const allNumbers = [
      ...evenNumbers.map(n => ({ n, isEven: true })),
      ...oddNumbers.map(n => ({ n, isEven: false }))
    ];

    for (let i = allNumbers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allNumbers[i], allNumbers[j]] = [allNumbers[j], allNumbers[i]];
    }

    const positions = generateRandomPositions(allNumbers.length);

    const newCircles: NumberCircle[] = allNumbers.map((item, index) => ({
      number: item.n,
      isEven: item.isEven,
      x: positions[index][0],
      y: positions[index][1],
      radius: 55,
      highlighted: false,
      isStart: item.n === newSequence[0].number
    }));

    setCircles(newCircles);
  }, [settings]);

  const completeSeries = useCallback(() => {
    const newCompleted = seriesCompleted + 1;
    setSeriesCompleted(newCompleted);
    scorer.recordAnswer(errors === 0);

    if (newCompleted >= settings.numSeries) {
      setGameState('results');
    } else {
      generateSeries();
      timer?.reset();
      timer?.start();
    }
  }, [seriesCompleted, errors, settings.numSeries, scorer, timer, generateSeries]);

  const startPlaying = useCallback(() => {
    scorer.reset();
    perfSavedRef.current = false;
    setSeriesCompleted(0);
    setErrors(0);

    const newTimer = new Timer(settings.timePerSeries, () => {
      scorer.recordAnswer(false);
      completeSeries();
    });
    setTimer(newTimer);

    generateSeries();
    setGameState('playing');
    newTimer.start();
  }, [settings, scorer, generateSeries, completeSeries]);

  const checkClick = useCallback((x: number, y: number) => {
    if (currentIndex >= sequence.length) return;

    const expected = sequence[currentIndex];
    const extra = phone ? 16 : 0;
    const clicked = circles.find(c => {
      const dx = x - c.x;
      const dy = y - c.y;
      const r = c.radius + extra;
      return dx * dx + dy * dy <= r * r;
    });

    if (clicked && clicked.number === expected.number) {
      setCircles(prev => prev.map(c =>
        c.number === clicked.number ? { ...c, highlighted: true } : c
      ));
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);

      if (nextIndex >= sequence.length) {
        completeSeries();
      }
    } else if (clicked) {
      setErrors(prev => prev + 1);
      setErrorFlash(true);
      setTimeout(() => setErrorFlash(false), 200);
    }
  }, [currentIndex, sequence, circles, completeSeries, phone]);

  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gameLoop = (timestamp: number) => {
      const deltaTime = lastTimeRef.current ? (timestamp - lastTimeRef.current) / 1000 : 0;
      lastTimeRef.current = timestamp;

      if (timer) {
        timer.update(deltaTime);
        setTimerProgress(timer.getProgress());
      }

      // Render
      ctx.fillStyle = errorFlash ? '#ef4444' : '#fbfaf9';
      ctx.fillRect(0, 0, width, height);

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
      ctx.fillStyle = '#37322f';
      ctx.beginPath();
      ctx.roundRect(35, 50, timerBarWidth, timerBarHeight, 10);
      ctx.fill();

      const fillHeight = timerBarHeight * timerProgress;
      const fillColor = timerProgress > 0.5 ? '#22c55e' : timerProgress > 0.2 ? '#f59e0b' : '#ef4444';
      ctx.fillStyle = fillColor;
      ctx.beginPath();
      ctx.roundRect(38, 50 + timerBarHeight - fillHeight + 3, timerBarWidth - 6, fillHeight - 6, 7);
      ctx.fill();

      // Header
      ctx.font = '20px Inter, Arial';
      ctx.fillStyle = '#37322f';
      ctx.textAlign = 'left';
      ctx.fillText(`Serie ${seriesCompleted + 1}/${settings.numSeries}`, 70, 40);

      ctx.textAlign = 'right';
      ctx.fillText(`Erreurs: ${errors}`, width - 30, 40);

      ctx.textAlign = 'center';
      ctx.fillStyle = timer?.getWarningColor() || '#1f2937';
      ctx.fillText(`Temps: ${timer?.formatTime() || '00:00'}`, width / 2, 40);

      // Instructions
      ctx.fillStyle = '#605a57';
      ctx.font = '16px Inter, Arial';
      ctx.fillText('PAIR → IMPAIR → PAIR → IMPAIR... (ordre croissant)', width / 2, 100);

      // Draw circles
      circles.forEach(circle => {
        ctx.fillStyle = circle.highlighted ? '#22c55e' : '#374151';
        ctx.beginPath();
        ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#1f2937';
        ctx.lineWidth = 2;
        ctx.stroke();

        if (circle.isStart) {
          ctx.font = '18px Inter, Arial';
          ctx.fillStyle = '#d1d5db';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('START', circle.x, circle.y - 18);
          ctx.font = '24px Inter, Arial';
          ctx.fillStyle = '#fef08a';
          ctx.fillText(String(circle.number), circle.x, circle.y + 10);
        } else {
          ctx.font = '24px Inter, Arial';
          ctx.fillStyle = '#fef08a';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(circle.number), circle.x, circle.y);
        }
      });

      // Progress
      ctx.font = '18px Inter, Arial';
      ctx.fillStyle = '#1f2937';
      ctx.textAlign = 'center';
      ctx.fillText(`${currentIndex} / ${sequence.length}`, width / 2, height - 40);

      animationRef.current = requestAnimationFrame(gameLoop);
    };

    animationRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationRef.current);
  }, [gameState, timer, circles, currentIndex, sequence, seriesCompleted, errors, settings, timerProgress, errorFlash]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { x, y } = canvasPoint(e, canvas, width, height);
    checkClick(x, y);
  };

  if (gameState === 'menu') {
    return (
      <ExerciseMenu
        title="Pair ou Impair"
        subtitle="Cliquez alternativement pairs/impairs en ordre croissant"
        stats={[
          { value: settings.numSeries, label: 'Séries' },
          { value: `${settings.timePerSeries}s`, label: 'Par série' },
        ]}
        onPlay={startPlaying}
        onSettings={() => setGameState('settings')}
        onBack={() => router.push('/')}
      />
    );
  }

  if (gameState === 'settings') {
    return (
      <ExerciseSettings onBack={() => setGameState('menu')}>
        <SettingSlider
          label="Nombres par catégorie"
          value={settings.numbersPerCategory}
          min={4}
          max={6}
          step={1}
          onChange={(v) => setSettings((s) => ({ ...s, numbersPerCategory: v }))}
        />
        <SettingSlider
          label="Temps par série"
          value={settings.timePerSeries}
          min={15}
          max={180}
          step={15}
          format={(v) => `${v}s`}
          onChange={(v) => setSettings((s) => ({ ...s, timePerSeries: v }))}
        />
        <SettingSlider
          label="Nombre de séries"
          value={settings.numSeries}
          min={1}
          max={30}
          step={1}
          onChange={(v) => setSettings((s) => ({ ...s, numSeries: v }))}
        />
      </ExerciseSettings>
    );
  }

  if (gameState === 'results') {
    const scoreData = scorer.toJSON();
    if (!perfSavedRef.current) {
      perfSavedRef.current = true;
      savePerformanceResult('pair-impair', scoreData.correct, settings.numSeries);
    }
    return (
      <ExerciseResults
        exerciseId="pair-impair"
        percent={scoreData.score}
        detail={`${seriesCompleted} séries complétées`}
        onReplay={startPlaying}
        onMenu={() => setGameState('menu')}
        onHome={() => router.push('/')}
      />
    );
  }

  return (
    <div className="flex w-full flex-col items-center justify-center min-h-screen bg-[#fbfaf9] p-2 sm:p-4">
      <canvas ref={canvasRef} width={width} height={height} onClick={handleCanvasClick} className="phone-scale rounded-xl shadow-xl cursor-pointer" />
    </div>
  );
}

export default PairImpairTest;

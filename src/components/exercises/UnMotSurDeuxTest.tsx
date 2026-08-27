'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ExerciseMenu,
  ExerciseResults,
  ExerciseSettings,
  SettingSlider,
} from '@/components/exercises/shell';
import { Timer } from '@/lib/core/Timer';
import { Scorer, ScoreData } from '@/lib/core/Scorer';
import { TimerBar } from '@/lib/core/CanvasUI';
import { savePerformanceResult } from '@/lib/core/PerformanceTracker';
import { WORD_THEMES } from '@/lib/data/word-themes';
import { canvasPoint } from '@/lib/phone/canvasPoint';
import { usePhoneLayout } from '@/components/phone/PhoneLayout';

type GameState = 'menu' | 'settings' | 'playing' | 'results';

interface WordCircle {
  word: string;
  themeIndex: number;
  x: number;
  y: number;
  radius: number;
  highlighted: boolean;
  isStart: boolean;
}

interface ExpectedWord {
  word: string;
  themeIndex: number;
}

export default function UnMotSurDeuxTest() {
  const router = useRouter();
  const phone = usePhoneLayout();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Game state
  const [gameState, setGameState] = useState<GameState>('menu');
  const [scoreData, setScoreData] = useState<ScoreData | null>(null);

  // Settings
  const [minWords, setMinWords] = useState(4);
  const [maxWords, setMaxWords] = useState(8);
  const [timePerSeries, setTimePerSeries] = useState(60);
  const [numSeries, setNumSeries] = useState(10);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('aviatest-un-mot-sur-deux-settings');
      if (!raw) return;
      const p = JSON.parse(raw) as Partial<{
        minWords: number;
        maxWords: number;
        timePerSeries: number;
        numSeries: number;
      }>;
      if (p.minWords) setMinWords(p.minWords);
      if (p.maxWords) setMaxWords(p.maxWords);
      if (p.timePerSeries) setTimePerSeries(p.timePerSeries);
      if (p.numSeries) setNumSeries(p.numSeries);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        'aviatest-un-mot-sur-deux-settings',
        JSON.stringify({ minWords, maxWords, timePerSeries, numSeries }),
      );
    } catch {
      /* ignore */
    }
  }, [minWords, maxWords, timePerSeries, numSeries]);

  // Game refs for playing state
  const timerRef = useRef<Timer | null>(null);
  const scorerRef = useRef<Scorer>(new Scorer());
  const perfSavedRef = useRef(false);
  const timerBarRef = useRef<TimerBar | null>(null);

  const circlesRef = useRef<WordCircle[]>([]);
  const expectedSequenceRef = useRef<ExpectedWord[]>([]);
  const currentIndexRef = useRef(0);
  const errorsRef = useRef(0);
  const seriesCompletedRef = useRef(0);
  const currentSeriesRef = useRef(1);
  const theme1NameRef = useRef('');
  const theme2NameRef = useRef('');
  const isErrorFlashRef = useRef(false);
  const errorFlashTimeRef = useRef(0);

  // Generate random positions without overlap
  const generateRandomPositions = useCallback((count: number, minX: number, maxX: number, minY: number, maxY: number, minDist: number): [number, number][] => {
    const positions: [number, number][] = [];
    const maxAttempts = 1000;

    for (let i = 0; i < count; i++) {
      let found = false;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const x = Math.floor(Math.random() * (maxX - minX + 1)) + minX;
        const y = Math.floor(Math.random() * (maxY - minY + 1)) + minY;

        let valid = true;
        for (const [px, py] of positions) {
          const dist = Math.sqrt((x - px) ** 2 + (y - py) ** 2);
          if (dist < minDist * 2) {
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
        const x = Math.floor(Math.random() * (maxX - minX + 1)) + minX;
        const y = Math.floor(Math.random() * (maxY - minY + 1)) + minY;
        positions.push([x, y]);
      }
    }

    return positions;
  }, []);

  // Sample random elements from array
  const sampleArray = useCallback(<T,>(arr: T[], n: number): T[] => {
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, n);
  }, []);

  // Generate a new series
  const generateSeries = useCallback((width: number, height: number) => {
    circlesRef.current = [];
    expectedSequenceRef.current = [];
    currentIndexRef.current = 0;
    isErrorFlashRef.current = false;

    // Choose 2 random themes
    const themeNames = Object.keys(WORD_THEMES);
    const shuffled = [...themeNames].sort(() => Math.random() - 0.5);
    theme1NameRef.current = shuffled[0];
    theme2NameRef.current = shuffled[1];

    // Random word count between min and max
    const numWords = Math.floor(Math.random() * (maxWords - minWords + 1)) + minWords;

    // Select words from themes
    const theme1Words = WORD_THEMES[theme1NameRef.current];
    const theme2Words = WORD_THEMES[theme2NameRef.current];

    const words1 = sampleArray(theme1Words, numWords);
    const words2 = sampleArray(theme2Words, numWords);

    // Sort alphabetically
    const words1Sorted = [...words1].sort();
    const words2Sorted = [...words2].sort();

    // Build expected sequence (alternating, starting with theme2)
    for (let i = 0; i < numWords; i++) {
      expectedSequenceRef.current.push({ word: words2Sorted[i], themeIndex: 1 });
      expectedSequenceRef.current.push({ word: words1Sorted[i], themeIndex: 0 });
    }

    // Create circles with random positions
    const allWords = [
      ...words1.map(w => ({ word: w, themeIndex: 0 })),
      ...words2.map(w => ({ word: w, themeIndex: 1 }))
    ];

    // Shuffle
    allWords.sort(() => Math.random() - 0.5);

    // Play area avoiding TimerBar
    const minX = 115;
    const minY = 80;
    const playAreaWidth = width - 70;
    const playAreaHeight = height - 100;

    const positions = generateRandomPositions(
      allWords.length,
      minX,
      playAreaWidth,
      minY,
      playAreaHeight - 50,
      60
    );

    allWords.forEach((item, index) => {
      const [x, y] = positions[index];
      const circle: WordCircle = {
        word: item.word,
        themeIndex: item.themeIndex,
        x,
        y,
        radius: 55,
        highlighted: false,
        isStart: item.word === words2Sorted[0]
      };
      circlesRef.current.push(circle);
    });
  }, [minWords, maxWords, generateRandomPositions, sampleArray]);

  // Complete current series
  const completeSeries = useCallback(() => {
    seriesCompletedRef.current++;
    scorerRef.current.recordAnswer(errorsRef.current === 0);

    const canvas = canvasRef.current;
    if (!canvas) return;

    if (seriesCompletedRef.current >= numSeries) {
      setScoreData(scorerRef.current.getResults());
      setGameState('results');
    } else {
      currentSeriesRef.current++;
      generateSeries(canvas.width, canvas.height);
      timerRef.current?.reset();
      timerRef.current?.start();
    }
  }, [numSeries, generateSeries]);

  // Check if click is on correct word
  const checkClick = useCallback((x: number, y: number) => {
    if (isErrorFlashRef.current || currentIndexRef.current >= expectedSequenceRef.current.length) {
      return;
    }

    const extra = phone ? 14 : 0;
    const clickedCircle = circlesRef.current.find(c => {
      const dx = x - c.x;
      const dy = y - c.y;
      const r = c.radius + extra;
      return dx * dx + dy * dy <= r * r && !c.highlighted;
    });

    if (clickedCircle) {
      const expected = expectedSequenceRef.current[currentIndexRef.current];

      if (clickedCircle.word === expected.word && clickedCircle.themeIndex === expected.themeIndex) {
        // Correct answer
        clickedCircle.highlighted = true;
        currentIndexRef.current++;

        if (currentIndexRef.current >= expectedSequenceRef.current.length) {
          completeSeries();
        }
      } else {
        // Wrong answer
        errorsRef.current++;
        isErrorFlashRef.current = true;
        errorFlashTimeRef.current = performance.now();
      }
    }
  }, [completeSeries, phone]);

  // Reset current series after error
  const resetCurrentSeries = useCallback(() => {
    circlesRef.current.forEach(c => c.highlighted = false);
    currentIndexRef.current = 0;
    isErrorFlashRef.current = false;
  }, []);

  // Draw word circle
  const drawCircle = useCallback((ctx: CanvasRenderingContext2D, circle: WordCircle) => {
    const color = circle.highlighted ? '#32CD32' : '#505050';

    // Circle
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.stroke();

    const textColor = '#FFFF00';

    if (circle.isStart) {
      ctx.font = '22px ui-sans-serif, system-ui, sans-serif';
      ctx.fillStyle = '#37322f';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('START', circle.x, circle.y - 18);

      ctx.font = '20px ui-sans-serif, system-ui, sans-serif';
      ctx.fillStyle = textColor;
      ctx.fillText(circle.word, circle.x, circle.y + 12);
    } else {
      ctx.font = '20px ui-sans-serif, system-ui, sans-serif';
      ctx.fillStyle = textColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(circle.word, circle.x, circle.y);
    }
  }, []);

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Initialize game
    scorerRef.current.reset();
    perfSavedRef.current = false;
    seriesCompletedRef.current = 0;
    currentSeriesRef.current = 1;
    errorsRef.current = 0;

    generateSeries(canvas.width, canvas.height);

    timerRef.current = new Timer(timePerSeries, () => {
      scorerRef.current.recordAnswer(false);
      completeSeries();
    });
    timerRef.current.start();

    timerBarRef.current = new TimerBar({
      x: 15,
      y: 50,
      width: 25,
      height: canvas.height - 100,
      orientation: 'vertical',
      direction: 'btt',
      showText: false,
      borderRadius: 12
    });

    lastTimeRef.current = performance.now();

    const gameLoop = (currentTime: number) => {
      const deltaTime = (currentTime - lastTimeRef.current) / 1000;
      lastTimeRef.current = currentTime;

      // Update
      timerRef.current?.update(deltaTime);
      if (timerRef.current && timerBarRef.current) {
        timerBarRef.current.update(timerRef.current);
      }

      // Check error flash timeout
      if (isErrorFlashRef.current) {
        if (currentTime - errorFlashTimeRef.current > 500) {
          resetCurrentSeries();
        }
      }

      // Render
      if (isErrorFlashRef.current) {
        ctx.fillStyle = '#DC3C3C';
      } else {
        ctx.fillStyle = '#fbfaf9';
      }
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw circles
      if (!isErrorFlashRef.current) {
        circlesRef.current.forEach(circle => drawCircle(ctx, circle));
      } else {
        circlesRef.current.forEach(circle => {
          if (!circle.highlighted) {
            drawCircle(ctx, circle);
          }
        });
      }

      // Draw timer bar
      timerBarRef.current?.draw(ctx);

      // Draw info
      ctx.font = '20px ui-sans-serif, system-ui, sans-serif';
      ctx.fillStyle = '#37322f';
      ctx.textAlign = 'left';
      ctx.fillText(
        `Série: ${currentSeriesRef.current}/${numSeries}  |  Complétées: ${seriesCompletedRef.current}  |  Erreurs: ${errorsRef.current}`,
        60,
        canvas.height - 30
      );

      // Theme names
      ctx.font = '18px ui-sans-serif, system-ui, sans-serif';
      ctx.fillStyle = '#605a57';
      ctx.fillText(`${theme1NameRef.current} vs ${theme2NameRef.current}`, 60, 25);

      // Time remaining
      if (timerRef.current) {
        ctx.textAlign = 'right';
        ctx.fillStyle = timerRef.current.getWarningColor();
        ctx.fillText(`${Math.ceil(timerRef.current.getTime())}s`, canvas.width - 20, 25);
      }

      animationRef.current = requestAnimationFrame(gameLoop);
    };

    animationRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      timerRef.current?.stop();
    };
  }, [gameState, timePerSeries, numSeries, generateSeries, completeSeries, resetCurrentSeries, drawCircle]);

  // Handle canvas click
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { x, y } = canvasPoint(e, canvas, canvas.width, canvas.height);
    checkClick(x, y);
  }, [checkClick]);

  // Menu screen
  if (gameState === 'menu') {
    return (
      <ExerciseMenu
        title="Un Mot Sur Deux"
        subtitle="Alternez entre deux thématiques en respectant l'ordre alphabétique"
        stats={[
          { value: numSeries, label: 'Séries' },
          { value: `${timePerSeries}s`, label: 'Par série' },
        ]}
        onPlay={() => setGameState('playing')}
        onSettings={() => setGameState('settings')}
        onBack={() => router.push('/')}
      />
    );
  }

  if (gameState === 'settings') {
    return (
      <ExerciseSettings onBack={() => setGameState('menu')}>
        <SettingSlider
          label="Mots min par thème"
          value={minWords}
          min={2}
          max={12}
          step={1}
          onChange={(v) => {
            setMinWords(v);
            if (maxWords < v) setMaxWords(v);
          }}
        />
        <SettingSlider
          label="Mots max par thème"
          value={maxWords}
          min={2}
          max={12}
          step={1}
          onChange={(v) => setMaxWords(Math.max(v, minWords))}
        />
        <SettingSlider
          label="Temps par série"
          value={timePerSeries}
          min={15}
          max={180}
          step={15}
          format={(v) => `${v}s`}
          onChange={setTimePerSeries}
        />
        <SettingSlider
          label="Nombre de séries"
          value={numSeries}
          min={1}
          max={30}
          step={1}
          onChange={setNumSeries}
        />
      </ExerciseSettings>
    );
  }

  if (gameState === 'results' && scoreData) {
    if (!perfSavedRef.current) {
      perfSavedRef.current = true;
      savePerformanceResult('un-mot-sur-deux', scoreData.correct, numSeries);
    }
    return (
      <ExerciseResults
        exerciseId="un-mot-sur-deux"
        percent={scoreData.percentage}
        detail={`${scoreData.correct}/${scoreData.total} séries réussies`}
        onReplay={() => setGameState('playing')}
        onMenu={() => setGameState('menu')}
        onHome={() => router.push('/')}
      >
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="rounded-lg bg-[#f7f5f3] p-4">
            <p className="text-2xl font-bold text-[#37322f]">
              {seriesCompletedRef.current}/{numSeries}
            </p>
            <p className="text-sm text-[#605a57]">Séries complétées</p>
          </div>
          <div className="rounded-lg bg-[#f7f5f3] p-4">
            <p className="text-2xl font-bold text-[#37322f]">{errorsRef.current}</p>
            <p className="text-sm text-[#605a57]">Erreurs totales</p>
          </div>
        </div>
      </ExerciseResults>
    );
  }

  // Playing screen
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#fbfaf9] p-2">
      <canvas
        ref={canvasRef}
        width={900}
        height={600}
        onClick={handleCanvasClick}
        className="phone-scale cursor-pointer rounded-xl border border-gray-400"
      />
    </div>
  );
}

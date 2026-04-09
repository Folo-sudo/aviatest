'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Timer } from '@/lib/core/Timer';
import { Scorer, ScoreData } from '@/lib/core/Scorer';
import { TimerBar } from '@/lib/core/CanvasUI';
import { savePerformanceResult, loadEntries } from '@/lib/core/PerformanceTracker';
import { MiniPerformanceChart } from '@/components/PerformanceChart';
import { WORD_THEMES } from '@/lib/data/word-themes';

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

    const clickedCircle = circlesRef.current.find(c => {
      const dx = x - c.x;
      const dy = y - c.y;
      return dx * dx + dy * dy <= c.radius * c.radius && !c.highlighted;
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
  }, [completeSeries]);

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
      ctx.font = '22px Arial';
      ctx.fillStyle = '#C8C8C8';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('START', circle.x, circle.y - 18);

      ctx.font = '20px Arial';
      ctx.fillStyle = textColor;
      ctx.fillText(circle.word, circle.x, circle.y + 12);
    } else {
      ctx.font = '20px Arial';
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
        ctx.fillStyle = '#C8C8C8';
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
      ctx.font = '20px Arial';
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'left';
      ctx.fillText(
        `Série: ${currentSeriesRef.current}/${numSeries}  |  Complétées: ${seriesCompletedRef.current}  |  Erreurs: ${errorsRef.current}`,
        60,
        canvas.height - 30
      );

      // Theme names
      ctx.font = '18px Arial';
      ctx.fillStyle = '#646464';
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

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    checkClick(x, y);
  }, [checkClick]);

  // Menu screen
  if (gameState === 'menu') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">Un Mot Sur Deux</CardTitle>
            <CardDescription className="text-lg">
              Test Psychotechnique - Pilote de Ligne
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center text-gray-600">
              <p>Alternez entre deux thématiques</p>
              <p>en respectant l&apos;ordre alphabétique</p>
            </div>

            <Separator />

            <div className="space-y-3">
              <Button
                className="w-full"
                size="lg"
                onClick={() => setGameState('playing')}
              >
                Jouer
              </Button>
              <Button
                className="w-full"
                variant="outline"
                onClick={() => setGameState('settings')}
              >
                Paramètres
              </Button>
              <Button
                className="w-full"
                variant="ghost"
                onClick={() => router.push('/')}
              >
                Retour
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Settings screen
  if (gameState === 'settings') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Paramètres</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Mots min par thème: {minWords}</Label>
              <Slider
                value={[minWords]}
                onValueChange={([v]) => {
                  setMinWords(v);
                  if (maxWords < v) setMaxWords(v);
                }}
                min={2}
                max={12}
                step={1}
              />
            </div>

            <div className="space-y-2">
              <Label>Mots max par thème: {maxWords}</Label>
              <Slider
                value={[maxWords]}
                onValueChange={([v]) => {
                  setMaxWords(Math.max(v, minWords));
                }}
                min={2}
                max={12}
                step={1}
              />
            </div>

            <div className="space-y-2">
              <Label>Temps par série: {timePerSeries}s</Label>
              <Slider
                value={[timePerSeries]}
                onValueChange={([v]) => setTimePerSeries(v)}
                min={15}
                max={180}
                step={15}
              />
            </div>

            <div className="space-y-2">
              <Label>Nombre de séries: {numSeries}</Label>
              <Slider
                value={[numSeries]}
                onValueChange={([v]) => setNumSeries(v)}
                min={1}
                max={30}
                step={1}
              />
            </div>

            <Button
              className="w-full"
              onClick={() => setGameState('menu')}
            >
              Retour
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Results screen
  if (gameState === 'results' && scoreData) {
    if (!perfSavedRef.current) {
      perfSavedRef.current = true;
      savePerformanceResult('un-mot-sur-deux', scoreData.percentage, scoreData.correct, scoreData.total);
    }
    const perfEntries = loadEntries('un-mot-sur-deux');
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Résultats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <div className="text-5xl font-bold text-primary mb-2">
                {scoreData.percentage}%
              </div>
              <Badge variant={scoreData.percentage >= 70 ? 'default' : 'destructive'}>
                {scoreData.correct}/{scoreData.total} séries réussies
              </Badge>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">{seriesCompletedRef.current}/{numSeries}</div>
                <div className="text-sm text-gray-500">Séries complétées</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{errorsRef.current}</div>
                <div className="text-sm text-gray-500">Erreurs totales</div>
              </div>
            </div>

            {perfEntries.length >= 2 && (
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-slate-500 mb-2 text-center">Progression</p>
                <div className="flex justify-center">
                  <MiniPerformanceChart entries={perfEntries} exerciseId="un-mot-sur-deux" />
                </div>
              </div>
            )}

            <div className="space-y-3">
              <Button
                className="w-full"
                onClick={() => setGameState('playing')}
              >
                Réessayer
              </Button>
              <Button
                className="w-full"
                variant="outline"
                onClick={() => setGameState('menu')}
              >
                Menu
              </Button>
              <Button
                className="w-full"
                variant="ghost"
                onClick={() => router.push('/')}
              >
                Accueil
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Playing screen
  return (
    <div className="min-h-screen bg-gray-200 flex items-center justify-center">
      <canvas
        ref={canvasRef}
        width={900}
        height={600}
        onClick={handleCanvasClick}
        className="border border-gray-400 cursor-pointer"
      />
    </div>
  );
}

'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Scorer } from '@/lib/core/Scorer';
import { savePerformanceResult, loadEntries } from '@/lib/core/PerformanceTracker';
import { MiniPerformanceChart } from '@/components/PerformanceChart';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Play, Settings, RotateCcw, Home } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

type InternalState = 'sliding' | 'memorize' | 'waiting' | 'feedback';
type GameState = 'menu' | 'settings' | 'playing' | 'results';

interface GameSettings {
  scrollSpeed: number;
  totalQuestions: number;
  matchProbability: number;
  showAnswer: boolean;
}

export function MBackTest() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const n = parseInt(searchParams.get('n') || '2');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const perfSavedRef = useRef(false);
  const [gameState, setGameState] = useState<GameState>('menu');
  const [settings, setSettings] = useState<GameSettings>({
    scrollSpeed: 2.5,
    totalQuestions: 40,
    matchProbability: 0.3,
    showAnswer: true
  });

  const [scorer] = useState(() => new Scorer());
  const [history, setHistory] = useState<number[]>([]);
  const [digitIndex, setDigitIndex] = useState(0);
  const [currentDigit, setCurrentDigit] = useState<number | null>(null);
  const [previousDigit, setPreviousDigit] = useState<number | null>(null);
  const [internalState, setInternalState] = useState<InternalState>('sliding');
  const [slideProgress, setSlideProgress] = useState(1);
  const [slideStartTime, setSlideStartTime] = useState(0);
  const [displayStartTime, setDisplayStartTime] = useState(0);
  const [questionCount, setQuestionCount] = useState(0);
  const [correctAnswer, setCorrectAnswer] = useState<boolean | null>(null);
  const [userAnswer, setUserAnswer] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [errors, setErrors] = useState(0);
  const [noResponse, setNoResponse] = useState(0);

  const animationRef = useRef<number>(0);
  const width = 700;
  const height = 550;

  const generateDigit = useCallback(() => {
    if (history.length >= n) {
      const nBack = history[history.length - n];
      if (Math.random() < settings.matchProbability) {
        return nBack;
      } else {
        const others = Array.from({ length: 10 }, (_, i) => i).filter(d => d !== nBack);
        return others[Math.floor(Math.random() * others.length)];
      }
    }
    return Math.floor(Math.random() * 10);
  }, [history, n, settings.matchProbability]);

  const nextDigit = useCallback(() => {
    setPreviousDigit(currentDigit);
    const newDigit = generateDigit();
    setCurrentDigit(newDigit);
    setHistory(prev => [...prev, newDigit]);
    setDigitIndex(prev => prev + 1);
    setSlideProgress(0);
    setSlideStartTime(performance.now());
    setInternalState('sliding');
  }, [currentDigit, generateDigit]);

  const isQuestionPhase = digitIndex > n;

  const checkAnswer = useCallback((answeredYes: boolean) => {
    const nBack = history[history.length - (n + 1)];
    const isMatch = currentDigit === nBack;
    const correct = answeredYes === isMatch;

    setCorrectAnswer(isMatch);
    setUserAnswer(answeredYes);

    if (correct) {
      setScore(prev => prev + 1);
      scorer.recordAnswer(true);
    } else {
      setErrors(prev => prev + 1);
      scorer.recordAnswer(false);
    }

    setQuestionCount(prev => prev + 1);
    setInternalState('feedback');
  }, [history, n, currentDigit, scorer]);

  const handleNoResponse = useCallback(() => {
    const nBack = history[history.length - (n + 1)];
    setCorrectAnswer(currentDigit === nBack);
    setUserAnswer(null);
    setErrors(prev => prev + 1);
    setNoResponse(prev => prev + 1);
    setQuestionCount(prev => prev + 1);
    scorer.recordAnswer(false);

    if (questionCount + 1 >= settings.totalQuestions) {
      setGameState('results');
    } else {
      nextDigit();
    }
  }, [history, n, currentDigit, questionCount, settings.totalQuestions, scorer, nextDigit]);

  const startGame = useCallback(() => {
    setHistory([]);
    setDigitIndex(0);
    setScore(0);
    setErrors(0);
    setNoResponse(0);
    setQuestionCount(0);
    setCurrentDigit(null);
    setPreviousDigit(null);
    setSlideProgress(1);
    setCorrectAnswer(null);
    setUserAnswer(null);
    scorer.reset();
    perfSavedRef.current = false;
    setGameState('playing');

    setTimeout(() => {
      const firstDigit = Math.floor(Math.random() * 10);
      setCurrentDigit(firstDigit);
      setHistory([firstDigit]);
      setDigitIndex(1);
      setSlideProgress(0);
      setSlideStartTime(performance.now());
      setInternalState('sliding');
    }, 100);
  }, [scorer]);

  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gameLoop = () => {
      const now = performance.now();

      // State transitions
      if (internalState === 'sliding') {
        const progress = Math.min(1, (now - slideStartTime) / 300);
        setSlideProgress(progress);
        if (progress >= 1) {
          setDisplayStartTime(now);
          setInternalState(digitIndex > n ? 'waiting' : 'memorize');
        }
      } else if (internalState === 'memorize') {
        if ((now - displayStartTime) / 1000 >= settings.scrollSpeed) {
          nextDigit();
        }
      } else if (internalState === 'waiting') {
        if ((now - displayStartTime) / 1000 >= settings.scrollSpeed) {
          handleNoResponse();
        }
      } else if (internalState === 'feedback') {
        if ((now - displayStartTime) / 1000 >= settings.scrollSpeed) {
          if (questionCount >= settings.totalQuestions) {
            setGameState('results');
          } else {
            nextDigit();
          }
        }
      }

      // Render
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(20, 20, width - 40, height - 40, 16);
      ctx.fill();

      // Timer bar
      const timerProgress = internalState !== 'sliding'
        ? Math.max(0, 1 - (now - displayStartTime) / 1000 / settings.scrollSpeed)
        : 1;

      ctx.fillStyle = '#1f2937';
      ctx.beginPath();
      ctx.roundRect(35, 50, 20, height - 100, 10);
      ctx.fill();

      const fillHeight = (height - 100) * timerProgress;
      const fillColor = timerProgress > 0.5 ? '#f59e0b' : timerProgress > 0.2 ? '#f59e0b' : '#ef4444';
      ctx.fillStyle = fillColor;
      ctx.beginPath();
      ctx.roundRect(38, 50 + (height - 100) - fillHeight + 3, 14, fillHeight - 6, 7);
      ctx.fill();

      // Draw digit box
      const drawDigitBox = (digit: number | null, xOffset: number = 0, alpha: number = 1) => {
        if (digit === null) return;
        const size = 130;
        const x = (width - size) / 2 + xOffset;
        const y = 80;

        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.roundRect(x, y, size, size, 20);
        ctx.fill();

        ctx.font = 'bold 90px Inter, Arial';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(digit), x + size/2, y + size/2);
        ctx.globalAlpha = 1;
      };

      // Sliding animation
      if (internalState === 'sliding') {
        const progress = 1 - Math.pow(1 - slideProgress, 2);
        if (previousDigit !== null) {
          drawDigitBox(previousDigit, -progress * 250, 1 - progress);
        }
        drawDigitBox(currentDigit, (1 - progress) * 250, 1);
      } else {
        drawDigitBox(currentDigit);
      }

      // Phase text
      ctx.font = '20px Inter, Arial';
      ctx.fillStyle = '#475569';
      ctx.textAlign = 'center';

      if ((internalState === 'sliding' || internalState === 'memorize') && !isQuestionPhase) {
        ctx.fillText(`Memorisez... (${digitIndex}/${n})`, width/2, 260);
      } else if (isQuestionPhase && internalState !== 'sliding') {
        ctx.fillText(`Ce chiffre correspond-il a celui d'il y a ${n} tours ?`, width/2, 260);

        // Buttons
        const drawButton = (text: string, x: number, bgColor: string = '#f1f5f9') => {
          ctx.fillStyle = bgColor;
          ctx.beginPath();
          ctx.roundRect(x - 60, 310, 120, 50, 8);
          ctx.fill();
          ctx.strokeStyle = '#374151';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.font = '24px Inter, Arial';
          ctx.fillStyle = '#1f2937';
          ctx.fillText(text, x, 340);
        };

        if (internalState === 'waiting') {
          drawButton('Oui', width/2 - 80);
          drawButton('Non', width/2 + 80);
        } else if (internalState === 'feedback' && settings.showAnswer) {
          const ouiColor = correctAnswer ? '#86efac' : (userAnswer === true ? '#fca5a5' : '#f1f5f9');
          const nonColor = !correctAnswer ? '#86efac' : (userAnswer === false ? '#fca5a5' : '#f1f5f9');
          drawButton('Oui', width/2 - 80, ouiColor);
          drawButton('Non', width/2 + 80, nonColor);
        }

        // Feedback message
        if (internalState === 'feedback') {
          let msg = '';
          let color = '#1f2937';
          if (userAnswer === null) {
            msg = 'Temps ecoule !';
            color = '#ef4444';
          } else if (userAnswer === correctAnswer) {
            msg = 'Correct !';
            color = '#22c55e';
          } else {
            msg = 'Incorrect';
            color = '#ef4444';
          }
          ctx.font = '24px Inter, Arial';
          ctx.fillStyle = color;
          ctx.fillText(msg, width/2, 400);
        }
      }

      // Score
      ctx.font = '16px Inter, Arial';
      ctx.fillStyle = '#475569';
      ctx.textAlign = 'left';
      ctx.fillText(`Correct: ${score}  |  Erreurs: ${errors}`, 70, height - 40);

      ctx.textAlign = 'right';
      if (isQuestionPhase) {
        ctx.fillText(`Question: ${questionCount} / ${settings.totalQuestions}`, width - 70, height - 40);
      } else {
        ctx.fillText('Phase de memorisation', width - 70, height - 40);
      }

      animationRef.current = requestAnimationFrame(gameLoop);
    };

    animationRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationRef.current);
  }, [gameState, internalState, slideProgress, slideStartTime, displayStartTime, currentDigit, previousDigit, digitIndex, n, settings, questionCount, correctAnswer, userAnswer, score, errors, isQuestionPhase, nextDigit, handleNoResponse]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (internalState !== 'waiting') return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (y >= 310 && y <= 360) {
      if (x >= width/2 - 140 && x <= width/2 - 20) checkAnswer(true);
      if (x >= width/2 + 20 && x <= width/2 + 140) checkAnswer(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState === 'playing' && internalState === 'waiting') {
        if (e.key.toLowerCase() === 'o' || e.key.toLowerCase() === 'y') checkAnswer(true);
        if (e.key.toLowerCase() === 'n') checkAnswer(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, internalState, checkAnswer]);

  if (gameState === 'menu') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-4xl font-bold">M{n} Back</CardTitle>
            <CardDescription className="text-lg">Test de memoire numerique</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-2xl font-bold text-slate-700">{settings.totalQuestions}</p>
                <p className="text-sm text-slate-500">Questions</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-2xl font-bold text-slate-700">{settings.scrollSpeed}s</p>
                <p className="text-sm text-slate-500">Par chiffre</p>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <Button size="lg" className="w-full" onClick={startGame}><Play className="mr-2 h-5 w-5" /> Jouer</Button>
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
                <Label>Temps par chiffre: {settings.scrollSpeed}s</Label>
                <Slider value={[settings.scrollSpeed]} onValueChange={([v]) => setSettings(s => ({ ...s, scrollSpeed: v }))} min={1} max={5} step={0.5} className="mt-2" />
              </div>
              <div>
                <Label>Nombre de questions: {settings.totalQuestions}</Label>
                <Slider value={[settings.totalQuestions]} onValueChange={([v]) => setSettings(s => ({ ...s, totalQuestions: v }))} min={10} max={100} step={10} className="mt-2" />
              </div>
              <div>
                <Label>Probabilite OUI: {Math.round(settings.matchProbability * 100)}%</Label>
                <Slider value={[settings.matchProbability]} onValueChange={([v]) => setSettings(s => ({ ...s, matchProbability: v }))} min={0.1} max={0.9} step={0.1} className="mt-2" />
              </div>
              <div className="flex items-center justify-between">
                <Label>Afficher la reponse</Label>
                <Switch checked={settings.showAnswer} onCheckedChange={v => setSettings(s => ({ ...s, showAnswer: v }))} />
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
    const mbackId = n === 3 ? 'm3-back' : 'm2-back';
    if (!perfSavedRef.current) {
      perfSavedRef.current = true;
      savePerformanceResult(mbackId, scoreData.correct, settings.totalQuestions);
    }
    const perfEntries = loadEntries(mbackId);
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
              <p className="text-slate-500">{score}/{settings.totalQuestions} correctes</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-red-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-red-600">{errors}</p>
                <p className="text-sm text-red-700">Erreurs</p>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-orange-600">{noResponse}</p>
                <p className="text-sm text-orange-700">Sans reponse</p>
              </div>
            </div>
            {perfEntries.length >= 2 && (
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-slate-500 mb-2 text-center">Progression</p>
                <div className="flex justify-center">
                  <MiniPerformanceChart entries={perfEntries} exerciseId={mbackId} />
                </div>
              </div>
            )}
            <div className="flex flex-col gap-3">
              <Button size="lg" className="w-full" onClick={startGame}><RotateCcw className="mr-2 h-5 w-5" /> Rejouer</Button>
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
      <canvas ref={canvasRef} width={width} height={height} onClick={handleCanvasClick} className="rounded-xl shadow-xl cursor-pointer" />
    </div>
  );
}

export default MBackTest;

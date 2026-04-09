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
import { ArrowLeft, Play, Settings, RotateCcw, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';

type GameState = 'menu' | 'settings' | 'rules' | 'playing' | 'results';

const ShapeType = { SQUARE: 'CARREE', TRIANGLE: 'TRIANGULAIRE' } as const;
const FillType = { FILLED: 'REMPLIE', EMPTY: 'VIDE' } as const;
const ColorType = { BLUE: 'BLEU', ORANGE: 'ORANGE' } as const;

type TShapeType = typeof ShapeType[keyof typeof ShapeType];
type TFillType = typeof FillType[keyof typeof FillType];
type TColorType = typeof ColorType[keyof typeof ColorType];

interface Shape {
  shapeType: TShapeType;
  fillType: TFillType;
  colorType: TColorType;
}

interface Rule {
  conditionValue: TFillType;
  subConditions: Record<string, 'n' | 'x'>;
  subConditionType: 'color' | 'shape';
}

interface GameSettings {
  numShapes: number;
  cycleDuration: number;
  displayDuration: number;
  shapeSize: number;
}

const SHAPE_COLORS = { BLEU: '#3b82f6', ORANGE: '#f97316' };

export function ShapesColorsTest() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const perfSavedRef = useRef(false);
  const [gameState, setGameState] = useState<GameState>('menu');
  const [settings, setSettings] = useState<GameSettings>({
    numShapes: 30,
    cycleDuration: 3.0,
    displayDuration: 0.5,
    shapeSize: 150
  });

  const [scorer] = useState(() => new Scorer());
  const [rules, setRules] = useState<Rule[]>([]);
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [shapeIndex, setShapeIndex] = useState(0);
  const [currentShape, setCurrentShape] = useState<Shape | null>(null);
  const [cycleStart, setCycleStart] = useState(0);
  const [displayStart, setDisplayStart] = useState(0);
  const [userAnswered, setUserAnswered] = useState(false);
  const [lastFeedback, setLastFeedback] = useState<boolean | null>(null);
  const [feedbackTime, setFeedbackTime] = useState(0);

  const animationRef = useRef<number>(0);
  const width = 900;
  const height = 650;

  const generateRules = useCallback(() => {
    const colors = [ColorType.BLUE, ColorType.ORANGE].sort(() => Math.random() - 0.5);
    const shapesArr = [ShapeType.SQUARE, ShapeType.TRIANGLE].sort(() => Math.random() - 0.5);

    return [
      { conditionValue: FillType.EMPTY, subConditions: { [colors[0]]: 'n' as const, [colors[1]]: 'x' as const }, subConditionType: 'color' as const },
      { conditionValue: FillType.FILLED, subConditions: { [shapesArr[0]]: 'n' as const, [shapesArr[1]]: 'x' as const }, subConditionType: 'shape' as const }
    ];
  }, []);

  const generateShapes = useCallback(() => {
    const newShapes: Shape[] = [];
    const shapeTypes = [ShapeType.SQUARE, ShapeType.TRIANGLE];
    const fillTypes = [FillType.FILLED, FillType.EMPTY];
    const colorTypes = [ColorType.BLUE, ColorType.ORANGE];

    for (let i = 0; i < settings.numShapes; i++) {
      newShapes.push({
        shapeType: shapeTypes[Math.floor(Math.random() * 2)],
        fillType: fillTypes[Math.floor(Math.random() * 2)],
        colorType: colorTypes[Math.floor(Math.random() * 2)]
      });
    }
    return newShapes;
  }, [settings.numShapes]);

  const getCorrectKey = useCallback((shape: Shape): 'n' | 'x' => {
    for (const rule of rules) {
      if (rule.conditionValue === shape.fillType) {
        if (rule.subConditionType === 'color') {
          return rule.subConditions[shape.colorType];
        } else {
          return rule.subConditions[shape.shapeType];
        }
      }
    }
    return 'n';
  }, [rules]);

  const startTest = useCallback(() => {
    const newRules = generateRules();
    const newShapes = generateShapes();
    setRules(newRules);
    setShapes(newShapes);
    setShapeIndex(0);
    scorer.reset();
    perfSavedRef.current = false;
    setLastFeedback(null);
    setGameState('rules');
  }, [generateRules, generateShapes, scorer]);

  const startPlaying = useCallback(() => {
    setCurrentShape(shapes[0]);
    const now = performance.now() / 1000;
    setDisplayStart(now);
    setCycleStart(now);
    setUserAnswered(false);
    setGameState('playing');
  }, [shapes]);

  const nextShape = useCallback(() => {
    const next = shapeIndex + 1;
    setShapeIndex(next);

    if (next >= shapes.length) {
      setGameState('results');
      return;
    }

    setCurrentShape(shapes[next]);
    const now = performance.now() / 1000;
    setDisplayStart(now);
    setCycleStart(now);
    setUserAnswered(false);
  }, [shapeIndex, shapes]);

  const handleAnswer = useCallback((key: 'n' | 'x') => {
    if (userAnswered || !currentShape) return;

    const correct = key === getCorrectKey(currentShape);
    scorer.recordAnswer(correct);
    setLastFeedback(correct);
    setFeedbackTime(performance.now() / 1000);
    setUserAnswered(true);
  }, [userAnswered, currentShape, getCorrectKey, scorer]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState === 'playing') {
        if (e.key.toLowerCase() === 'n') handleAnswer('n');
        if (e.key.toLowerCase() === 'x') handleAnswer('x');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, handleAnswer]);

  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gameLoop = () => {
      const now = performance.now() / 1000;

      if (now - cycleStart >= settings.cycleDuration) {
        if (!userAnswered) {
          scorer.recordAnswer(false);
          setLastFeedback(false);
          setFeedbackTime(now);
        }
        nextShape();
        return;
      }

      ctx.fillStyle = '#f3f4f6';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(20, 20, width - 40, height - 40, 16);
      ctx.fill();

      // Progress
      ctx.font = '24px Inter, Arial';
      ctx.fillStyle = '#6b7280';
      ctx.textAlign = 'left';
      ctx.fillText(`${shapeIndex + 1} / ${settings.numShapes}`, 50, 50);

      ctx.textAlign = 'right';
      ctx.fillText(`Score: ${scorer.getCorrect()}/${scorer.getTotal()}`, width - 50, 50);

      // Timer bar
      const elapsed = now - cycleStart;
      const remaining = Math.max(0, 1 - elapsed / settings.cycleDuration);
      const barWidth = (width - 100) * remaining;
      ctx.fillStyle = remaining > 0.5 ? '#22c55e' : remaining > 0.2 ? '#f59e0b' : '#ef4444';
      ctx.beginPath();
      ctx.roundRect(50, 70, barWidth, 10, 5);
      ctx.fill();

      // Shape visible?
      const shapeVisible = now - displayStart < settings.displayDuration;

      if (shapeVisible && currentShape) {
        const color = SHAPE_COLORS[currentShape.colorType];
        const filled = currentShape.fillType === FillType.FILLED;
        const cx = width / 2;
        const cy = height / 2 - 50;
        const size = settings.shapeSize;

        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 4;

        if (currentShape.shapeType === ShapeType.SQUARE) {
          if (filled) {
            ctx.fillRect(cx - size/2, cy - size/2, size, size);
          } else {
            ctx.strokeRect(cx - size/2, cy - size/2, size, size);
          }
        } else {
          const h = size * 0.866;
          ctx.beginPath();
          ctx.moveTo(cx, cy - h/2);
          ctx.lineTo(cx - size/2, cy + h/2);
          ctx.lineTo(cx + size/2, cy + h/2);
          ctx.closePath();
          filled ? ctx.fill() : ctx.stroke();
        }
      }

      // Key buttons
      const drawKeyButton = (key: string, x: number, y: number) => {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.roundRect(x - 40, y - 25, 80, 50, 8);
        ctx.fill();
        ctx.strokeStyle = '#374151';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.font = '32px Inter, Arial';
        ctx.fillStyle = '#1f2937';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(key.toUpperCase(), x, y);
      };

      drawKeyButton('n', width/2 - 80, height - 100);
      drawKeyButton('x', width/2 + 80, height - 100);

      // Feedback
      if (lastFeedback !== null && now - feedbackTime < 0.8) {
        ctx.font = '32px Inter, Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = lastFeedback ? '#22c55e' : '#ef4444';
        ctx.fillText(lastFeedback ? '✓ Correct' : '✗ Incorrect', width/2, height - 160);
      }

      // Waiting text
      if (!shapeVisible && !userAnswered) {
        ctx.font = '24px Inter, Arial';
        ctx.fillStyle = '#9ca3af';
        ctx.textAlign = 'center';
        ctx.fillText('Appuyez sur N ou X', width/2, height/2);
      }

      animationRef.current = requestAnimationFrame(gameLoop);
    };

    animationRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationRef.current);
  }, [gameState, currentShape, cycleStart, displayStart, settings, shapeIndex, scorer, userAnswered, lastFeedback, feedbackTime, nextShape]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const nRect = { x: width/2 - 80 - 40, y: height - 100 - 25, w: 80, h: 50 };
    const xRect = { x: width/2 + 80 - 40, y: height - 100 - 25, w: 80, h: 50 };

    if (x >= nRect.x && x <= nRect.x + nRect.w && y >= nRect.y && y <= nRect.y + nRect.h) {
      handleAnswer('n');
    } else if (x >= xRect.x && x <= xRect.x + xRect.w && y >= xRect.y && y <= xRect.y + xRect.h) {
      handleAnswer('x');
    }
  };

  if (gameState === 'menu') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">Formes et Couleurs</CardTitle>
            <CardDescription className="text-lg">Classifiez rapidement selon les regles</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-2xl font-bold text-slate-700">{settings.numShapes}</p>
                <p className="text-sm text-slate-500">Formes</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-2xl font-bold text-slate-700">{settings.cycleDuration}s</p>
                <p className="text-sm text-slate-500">Intervalle</p>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <Button size="lg" className="w-full" onClick={startTest}><Play className="mr-2 h-5 w-5" /> Commencer</Button>
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
                <Label>Nombre de formes: {settings.numShapes}</Label>
                <Slider value={[settings.numShapes]} onValueChange={([v]) => setSettings(s => ({ ...s, numShapes: v }))} min={5} max={100} step={5} className="mt-2" />
              </div>
              <div>
                <Label>Temps d'affichage: {settings.displayDuration}s</Label>
                <Slider value={[settings.displayDuration]} onValueChange={([v]) => setSettings(s => ({ ...s, displayDuration: v }))} min={0.2} max={2} step={0.1} className="mt-2" />
              </div>
              <div>
                <Label>Intervalle: {settings.cycleDuration}s</Label>
                <Slider value={[settings.cycleDuration]} onValueChange={([v]) => setSettings(s => ({ ...s, cycleDuration: v }))} min={1} max={10} step={0.5} className="mt-2" />
              </div>
            </div>
            <Button variant="outline" className="w-full" onClick={() => setGameState('menu')}><ArrowLeft className="mr-2 h-4 w-4" /> Retour</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (gameState === 'rules') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader><CardTitle className="text-2xl">Regles du Test</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            {rules.map((rule, i) => (
              <div key={i} className="p-4 bg-slate-50 rounded-lg">
                <p className="font-semibold mb-2">Regle {i + 1}: Si la forme est {rule.conditionValue}</p>
                <ul className="list-disc ml-6">
                  {Object.entries(rule.subConditions).map(([cond, key]) => (
                    <li key={cond}>Appuyez sur <strong>{key.toUpperCase()}</strong> si {rule.subConditionType === 'color' ? 'couleur' : 'forme'} = {cond}</li>
                  ))}
                </ul>
              </div>
            ))}
            <Button size="lg" className="w-full" onClick={startPlaying}>Commencer</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (gameState === 'results') {
    const scoreData = scorer.toJSON();
    if (!perfSavedRef.current) {
      perfSavedRef.current = true;
      savePerformanceResult('shapes-colors', scoreData.score, scoreData.correct, scoreData.total);
    }
    const perfEntries = loadEntries('shapes-colors');
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
                  <MiniPerformanceChart entries={perfEntries} exerciseId="shapes-colors" />
                </div>
              </div>
            )}
            <div className="flex flex-col gap-3">
              <Button size="lg" className="w-full" onClick={startTest}><RotateCcw className="mr-2 h-5 w-5" /> Rejouer</Button>
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

export default ShapesColorsTest;

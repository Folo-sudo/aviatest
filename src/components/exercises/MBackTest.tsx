'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Scorer } from '@/lib/core/Scorer';
import { savePerformanceResult, loadEntries } from '@/lib/core/PerformanceTracker';
import { MiniPerformanceChart } from '@/components/PerformanceChart';
import { ClassScoreBlock } from '@/components/ClassScoreBlock';
import { classScaleIdForMemoryBack } from '@/lib/core/classes';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Play, Settings, RotateCcw, Home } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { canvasPoint } from '@/lib/phone/canvasPoint';
import { usePhoneLayout } from '@/components/phone/PhoneLayout';

type InternalState = 'sliding' | 'memorize' | 'waiting' | 'feedback';
type GameState = 'menu' | 'settings' | 'playing' | 'results';
type NPreset = 2 | 3 | 4 | 5;
type NSelection = NPreset | 'custom';

interface GameSettings {
  scrollSpeed: number;
  totalQuestions: number;
  matchProbability: number;
  showAnswer: boolean;
}

const PERFORMANCE_ID = 'memory-back';
const MBACK_STORAGE_KEY = 'aviatest-mback-settings';
const CUSTOM_N_MIN = 6;
const CUSTOM_N_MAX = 100;

const N_PRESETS: { value: NPreset; label: string; color: string }[] = [
  { value: 2, label: '2 Back', color: '#22c55e' },
  { value: 3, label: '3 Back', color: '#a3a832' },
  { value: 4, label: '4 Back', color: '#f59e0b' },
  { value: 5, label: '5 Back', color: '#ef4444' },
];
const CUSTOM_N_COLOR = '#7f1d1d';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

interface MBackPersistedSettings {
  nSelection: NSelection;
  customN: number;
}

function loadPersistedNSelection(): MBackPersistedSettings | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(MBACK_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<MBackPersistedSettings>;
    const customN = typeof parsed.customN === 'number'
      ? clamp(parsed.customN, CUSTOM_N_MIN, CUSTOM_N_MAX)
      : CUSTOM_N_MIN;
    const nSelection: NSelection = parsed.nSelection === 'custom'
      || parsed.nSelection === 2
      || parsed.nSelection === 3
      || parsed.nSelection === 4
      || parsed.nSelection === 5
      ? parsed.nSelection
      : 2;
    return { nSelection, customN };
  } catch {
    return null;
  }
}

function savePersistedNSelection(settings: MBackPersistedSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(MBACK_STORAGE_KEY, JSON.stringify(settings));
  } catch { /* quota exceeded or unavailable */ }
}

export function MBackTest({ n: nProp }: { n?: number }) {
  const router = useRouter();
  const phone = usePhoneLayout();
  const searchParams = useSearchParams();

  const [nSelection, setNSelection] = useState<NSelection>(2);
  const [customN, setCustomN] = useState<number>(CUSTOM_N_MIN);
  const n = nSelection === 'custom' ? customN : nSelection;

  // Resolve initial n: explicit prop/query (legacy deep link) > persisted choice > default 2-back
  useEffect(() => {
    const explicitN = nProp ?? (searchParams.get('n') ? parseInt(searchParams.get('n')!, 10) : null);
    if (explicitN && !Number.isNaN(explicitN)) {
      if (explicitN >= 2 && explicitN <= 5) {
        setNSelection(explicitN as NPreset);
      } else {
        const clamped = clamp(explicitN, CUSTOM_N_MIN, CUSTOM_N_MAX);
        setNSelection('custom');
        setCustomN(clamped);
      }
      return;
    }
    const persisted = loadPersistedNSelection();
    if (persisted) {
      setNSelection(persisted.nSelection);
      setCustomN(persisted.customN);
    }
    // Only run once on mount: explicit deep-link params take priority over persisted settings.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectPreset = useCallback((value: NPreset) => {
    setNSelection(value);
    savePersistedNSelection({ nSelection: value, customN });
  }, [customN]);

  const selectCustom = useCallback((value: number) => {
    const clamped = clamp(value, CUSTOM_N_MIN, CUSTOM_N_MAX);
    setCustomN(clamped);
    setNSelection('custom');
    savePersistedNSelection({ nSelection: 'custom', customN: clamped });
  }, []);

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
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { x, y } = canvasPoint(e, canvas, width, height);

    if (y >= 290 && y <= 380) {
      if (x >= width/2 - 160 && x <= width/2 - 10) checkAnswer(true);
      if (x >= width/2 + 10 && x <= width/2 + 160) checkAnswer(false);
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
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#fbfaf9] p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-4xl font-bold">Memory Back</CardTitle>
            <CardDescription className="text-lg">Test de memoire de travail — niveau actuel : M{n} Back</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="mb-2 block text-[#605a57]">Choisissez le niveau</Label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {N_PRESETS.map((preset) => {
                  const isSelected = nSelection === preset.value;
                  return (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => selectPreset(preset.value)}
                      className="rounded-lg py-3 px-2 text-center font-semibold transition-all"
                      style={{
                        border: `2px solid ${preset.color}`,
                        backgroundColor: isSelected ? preset.color : 'white',
                        color: isSelected ? 'white' : preset.color,
                        boxShadow: isSelected ? `0 0 0 3px ${preset.color}33` : 'none',
                        transform: isSelected ? 'scale(1.03)' : 'scale(1)',
                      }}
                    >
                      {preset.label}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => selectCustom(customN)}
                  className="rounded-lg py-3 px-2 text-center font-semibold transition-all col-span-3 sm:col-span-1"
                  style={{
                    border: `2px solid ${CUSTOM_N_COLOR}`,
                    backgroundColor: nSelection === 'custom' ? CUSTOM_N_COLOR : 'white',
                    color: nSelection === 'custom' ? 'white' : CUSTOM_N_COLOR,
                    boxShadow: nSelection === 'custom' ? `0 0 0 3px ${CUSTOM_N_COLOR}33` : 'none',
                    transform: nSelection === 'custom' ? 'scale(1.03)' : 'scale(1)',
                  }}
                >
                  Custom
                </button>
              </div>
              {nSelection === 'custom' && (
                <div className="mt-4 p-4 rounded-lg bg-[#f7f5f3] space-y-2">
                  <Label>Niveau personnalise : M{customN} Back</Label>
                  <Slider
                    value={[customN]}
                    onValueChange={([v]) => selectCustom(v)}
                    min={CUSTOM_N_MIN}
                    max={CUSTOM_N_MAX}
                    step={1}
                  />
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>{CUSTOM_N_MIN}</span>
                    <span>{CUSTOM_N_MAX}</span>
                  </div>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-4 bg-[#f7f5f3] rounded-lg">
                <p className="text-2xl font-bold text-[#37322f]">{settings.totalQuestions}</p>
                <p className="text-sm text-[#605a57]">Questions</p>
              </div>
              <div className="p-4 bg-[#f7f5f3] rounded-lg">
                <p className="text-2xl font-bold text-[#37322f]">{settings.scrollSpeed}s</p>
                <p className="text-sm text-[#605a57]">Par chiffre</p>
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
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#fbfaf9] p-4">
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
    if (!perfSavedRef.current) {
      perfSavedRef.current = true;
      savePerformanceResult(PERFORMANCE_ID, scoreData.correct, settings.totalQuestions);
    }
    const perfEntries = loadEntries(PERFORMANCE_ID);
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#fbfaf9] p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">Résultats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <ClassScoreBlock
              exerciseId={classScaleIdForMemoryBack(n)}
              percent={scoreData.score}
              detail={`${score}/${settings.totalQuestions} correctes`}
            />
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
                <p className="text-sm font-medium text-[#605a57] mb-2 text-center">Progression</p>
                <div className="flex justify-center">
                  <MiniPerformanceChart entries={perfEntries} exerciseId={PERFORMANCE_ID} />
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#fbfaf9] p-2 sm:p-4">
      <canvas ref={canvasRef} width={width} height={height} onClick={handleCanvasClick} className="phone-scale rounded-xl shadow-xl cursor-pointer" />
      {phone && internalState === 'waiting' && (
        <div className="mt-4 flex w-full max-w-sm gap-3 px-2">
          <button
            type="button"
            onClick={() => checkAnswer(true)}
            className="h-14 flex-1 rounded-2xl bg-[#37322f] text-lg font-semibold text-white shadow-sm"
          >
            Oui
          </button>
          <button
            type="button"
            onClick={() => checkAnswer(false)}
            className="h-14 flex-1 rounded-2xl bg-white text-lg font-semibold text-[#37322f] shadow-sm ring-1 ring-[#e0dedb]"
          >
            Non
          </button>
        </div>
      )}
    </div>
  );
}

export default MBackTest;

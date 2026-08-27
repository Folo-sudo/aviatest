'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Play, Heart } from 'lucide-react';
import { savePerformanceResult, loadEntries } from '@/lib/core/PerformanceTracker';
import { MiniPerformanceChart } from '@/components/PerformanceChart';
import { ClassScoreBlock } from '@/components/ClassScoreBlock';
import { BoxingGlovesIcon } from '@/components/icons/BoxingGlovesIcon';
import { isStadiumHeld } from '@/lib/stadium/hold';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export type SparingVariant = 'rouge' | 'bleu';

const START_LIVES = 3;
/** Longer opener so the early fight breathes before the squeeze. */
const T0_SEC = 22;
const TMIN_SEC = 3.6;
const DECAY = 0.88;

type Phase = 'menu' | 'playing' | 'gameover';
type CalcMode = 'multiplication' | 'plusminus';

interface CalcQuestion {
  expression: string;
  answer: number;
}

const VARIANT_CONFIG = {
  rouge: {
    exerciseId: 'sparing',
    title: 'Sparing ×',
    subtitle: 'Calculs ab × cd. Trois vies. Pas de pause.',
    mode: 'multiplication' as CalcMode,
    calcLabel: 'ab × cd',
    accentBtn: 'bg-rose-700 hover:bg-rose-800',
    accentText: 'text-rose-700',
    accentFill: 'fill-rose-600 text-rose-600',
    accentBar: 'bg-rose-600',
    accentBadgeHot: 'bg-red-100 text-red-700',
    menuBg: 'from-rose-50 to-slate-100',
    cardBorder: 'border-rose-200',
    iconWrap: 'bg-rose-100 text-rose-700',
    tipBg: 'bg-rose-50 text-rose-950/80',
    ring: 'ring-rose-100',
    playBg: 'from-rose-50 to-slate-100',
    cardPlayBorder: 'border-rose-100',
  },
  bleu: {
    exerciseId: 'sparing-bleu',
    title: 'Sparing +-',
    subtitle: 'Additions / soustractions abc ± cde. Trois vies. Pas de pause.',
    mode: 'plusminus' as CalcMode,
    calcLabel: 'abc ± cde',
    accentBtn: 'bg-sky-700 hover:bg-sky-800',
    accentText: 'text-sky-700',
    accentFill: 'fill-sky-600 text-sky-600',
    accentBar: 'bg-sky-600',
    accentBadgeHot: 'bg-red-100 text-red-700',
    menuBg: 'from-sky-50 to-slate-100',
    cardBorder: 'border-sky-200',
    iconWrap: 'bg-sky-100 text-sky-700',
    tipBg: 'bg-sky-50 text-sky-950/80',
    ring: 'ring-sky-100',
    playBg: 'from-sky-50 to-slate-100',
    cardPlayBorder: 'border-sky-100',
  },
} as const;

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateQuestion(mode: CalcMode): CalcQuestion {
  if (mode === 'multiplication') {
    const a = randInt(11, 99);
    const b = randInt(11, 99);
    return { expression: `${a} × ${b}`, answer: a * b };
  }
  const a = randInt(100, 999);
  const b = randInt(100, 999);
  if (Math.random() < 0.5) {
    return { expression: `${a} + ${b}`, answer: a + b };
  }
  return { expression: `${a} − ${b}`, answer: a - b };
}

function nextLimitSec(current: number): number {
  return TMIN_SEC + (current - TMIN_SEC) * DECAY;
}

export default function SparingTest({
  variant = 'rouge',
}: {
  variant?: SparingVariant;
  n?: number;
}) {
  const cfg = VARIANT_CONFIG[variant];
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('menu');
  const [lives, setLives] = useState(START_LIVES);
  const [score, setScore] = useState(0);
  const [currentQ, setCurrentQ] = useState<CalcQuestion | null>(null);
  const [userInput, setUserInput] = useState('');
  const [limitSec, setLimitSec] = useState(T0_SEC);
  const [remainingMs, setRemainingMs] = useState(T0_SEC * 1000);
  const [flash, setFlash] = useState<'ok' | 'bad' | null>(null);
  const [bestScore, setBestScore] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const remainingRef = useRef(T0_SEC * 1000);
  const lastTickRef = useRef(0);
  const limitSecRef = useRef(T0_SEC);
  const livesRef = useRef(START_LIVES);
  const scoreRef = useRef(0);
  const currentQRef = useRef<CalcQuestion | null>(null);
  const resolvingRef = useRef(false);
  const savedRef = useRef(false);
  const timesRef = useRef<number[]>([]);

  useEffect(() => {
    livesRef.current = lives;
  }, [lives]);
  useEffect(() => {
    scoreRef.current = score;
  }, [score]);
  useEffect(() => {
    currentQRef.current = currentQ;
  }, [currentQ]);
  useEffect(() => {
    limitSecRef.current = limitSec;
  }, [limitSec]);

  const focusInput = useCallback(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const startQuestion = useCallback(
    (nextLimit: number) => {
      const q = generateQuestion(cfg.mode);
      setCurrentQ(q);
      currentQRef.current = q;
      setUserInput('');
      setLimitSec(nextLimit);
      limitSecRef.current = nextLimit;
      const ms = nextLimit * 1000;
      remainingRef.current = ms;
      // Not armed until Stadium hold lifts (see tick loop)
      lastTickRef.current = 0;
      setRemainingMs(ms);
      resolvingRef.current = false;
      focusInput();
    },
    [cfg.mode, focusInput],
  );

  const finishGame = useCallback(() => {
    if (savedRef.current) return;
    savedRef.current = true;
    const finalScore = scoreRef.current;
    const times = timesRef.current;
    const avgMs =
      times.length > 0 ? times.reduce((s, t) => s + t, 0) / times.length : 0;
    // correct = series length; total kept for local % chart only
    savePerformanceResult(
      cfg.exerciseId,
      finalScore,
      finalScore + START_LIVES,
      avgMs,
    );
    setBestScore((b) => Math.max(b, finalScore));
    setPhase('gameover');
  }, [cfg.exerciseId]);

  const loseLifeAndContinue = useCallback(
    (reason: 'wrong' | 'timeout') => {
      if (resolvingRef.current) return;
      resolvingRef.current = true;
      setFlash('bad');
      void reason;

      const nextLives = livesRef.current - 1;
      livesRef.current = nextLives;
      setLives(nextLives);

      const shrunk = nextLimitSec(limitSecRef.current);

      if (nextLives <= 0) {
        window.setTimeout(() => {
          setFlash(null);
          finishGame();
        }, 160);
        return;
      }

      startQuestion(shrunk);
      window.setTimeout(() => setFlash(null), 140);
    },
    [finishGame, startQuestion],
  );

  const onCorrect = useCallback(() => {
    if (resolvingRef.current || !currentQRef.current) return;
    resolvingRef.current = true;
    const allotted = limitSecRef.current * 1000;
    const used = Math.max(0, allotted - remainingRef.current);
    timesRef.current.push(used);

    const nextScore = scoreRef.current + 1;
    scoreRef.current = nextScore;
    setScore(nextScore);
    setFlash('ok');

    const shrunk = nextLimitSec(limitSecRef.current);
    startQuestion(shrunk);
    window.setTimeout(() => setFlash(null), 100);
  }, [startQuestion]);

  const submitAnswer = useCallback(() => {
    if (phase !== 'playing' || resolvingRef.current || !currentQRef.current) return;
    const parsed = parseInt(userInput, 10);
    if (Number.isNaN(parsed)) return;
    if (parsed === currentQRef.current.answer) {
      onCorrect();
    } else {
      loseLifeAndContinue('wrong');
    }
  }, [phase, userInput, onCorrect, loseLifeAndContinue]);

  // Pause-aware countdown: ignores wall-clock during Stadium "prepare-toi" hold
  useEffect(() => {
    if (phase !== 'playing') return;
    let raf = 0;
    const tick = () => {
      if (isStadiumHeld()) {
        lastTickRef.current = 0;
        setRemainingMs(remainingRef.current);
        raf = requestAnimationFrame(tick);
        return;
      }

      const now = Date.now();
      if (!lastTickRef.current) {
        // First frame after hold / question start — arm clock, no time lost
        lastTickRef.current = now;
      } else {
        const dt = now - lastTickRef.current;
        lastTickRef.current = now;
        remainingRef.current = Math.max(0, remainingRef.current - dt);
        setRemainingMs(remainingRef.current);
        if (remainingRef.current <= 0 && !resolvingRef.current) {
          loseLifeAndContinue('timeout');
          return;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, currentQ, loseLifeAndContinue]);

  const startGame = useCallback(() => {
    savedRef.current = false;
    timesRef.current = [];
    livesRef.current = START_LIVES;
    scoreRef.current = 0;
    setLives(START_LIVES);
    setScore(0);
    setFlash(null);
    setPhase('playing');
    startQuestion(T0_SEC);
  }, [startQuestion]);

  useEffect(() => {
    const entries = loadEntries(cfg.exerciseId);
    if (entries.length === 0) {
      setBestScore(0);
      return;
    }
    setBestScore(Math.max(...entries.map((e) => e.correct)));
  }, [cfg.exerciseId]);

  const timerPct =
    limitSec > 0 ? Math.min(1, Math.max(0, remainingMs / (limitSec * 1000))) : 0;
  const timerHot = remainingMs < 2500;

  if (phase === 'menu') {
    const perfEntries = loadEntries(cfg.exerciseId);
    return (
      <div
        className={`flex min-h-screen flex-col items-center justify-center bg-gradient-to-br p-4 ${cfg.menuBg}`}
      >
        <Card className={`w-full max-w-lg overflow-hidden ${cfg.cardBorder} p-0`}>
          <div className="flex min-h-[320px] items-stretch">
            <div
              className={`relative w-[140px] shrink-0 self-stretch sm:w-[168px] ${cfg.iconWrap}`}
            >
              <BoxingGlovesIcon
                accent={variant === 'bleu' ? 'blue' : 'red'}
                className="absolute inset-2 h-[calc(100%-1rem)] w-[calc(100%-1rem)] object-contain"
              />
            </div>
            <div className="min-w-0 flex-1">
              <CardHeader className="text-left">
                <CardTitle className="text-2xl font-bold sm:text-3xl">{cfg.title}</CardTitle>
                <CardDescription className="mt-2 text-base">{cfg.subtitle}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 pt-0">
                <div className={`space-y-2 rounded-lg p-4 text-sm ${cfg.tipBg}`}>
                  <p>
                    <strong>{T0_SEC} s</strong> au premier calcul ({cfg.calcLabel}), puis le temps
                    se resserre — vite au début, plus doucement près du plancher (~
                    {TMIN_SEC.toFixed(1)} s).
                  </p>
                  <p>Faux ou trop lent = une vie. Zéro vie = fin du combat.</p>
                  <p>
                    Enchaîne sans relâche. Le classement Stadium récompense la plus longue série.
                  </p>
                </div>

                {bestScore > 0 && (
                  <p className="text-center text-sm text-[#605a57]">
                    Meilleur score local :{' '}
                    <span className="font-semibold text-slate-800">{bestScore}</span>
                  </p>
                )}

                {perfEntries.length >= 2 && (
                  <div className="border-t pt-4">
                    <p className="mb-2 text-center text-sm font-medium text-[#605a57]">
                      Progression
                    </p>
                    <div className="flex justify-center">
                      <MiniPerformanceChart entries={perfEntries} exerciseId={cfg.exerciseId} />
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-3">
                  <Button size="lg" className={`w-full ${cfg.accentBtn}`} onClick={startGame}>
                    <Play className="mr-2 h-5 w-5" /> Jouer
                  </Button>
                  <Button
                    variant="ghost"
                    size="lg"
                    className="w-full"
                    onClick={() => router.push('/stadium')}
                  >
                    <ArrowLeft className="mr-2 h-5 w-5" /> Stadium
                  </Button>
                </div>
              </CardContent>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (phase === 'gameover') {
    return (
      <div
        className={`flex min-h-screen flex-col items-center justify-center bg-gradient-to-br p-4 ${cfg.menuBg}`}
      >
        <Card className={`w-full max-w-md ${cfg.cardBorder}`}>
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">Fin du sparing</CardTitle>
            <CardDescription className="mt-2 text-base">
              Tu as tenu <strong className={cfg.accentText}>{score}</strong> calcul
              {score > 1 ? 's' : ''}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ClassScoreBlock
              exerciseId={cfg.exerciseId}
              percent={Math.round((score / (score + START_LIVES)) * 100)}
              detail={`${score} calculs · ${START_LIVES} vies`}
            />
            <div className="flex flex-col gap-3">
              <Button size="lg" className={`w-full ${cfg.accentBtn}`} onClick={startGame}>
                <Play className="mr-2 h-5 w-5" /> Rejouer
              </Button>
              <Button variant="ghost" size="lg" className="w-full" onClick={() => setPhase('menu')}>
                Menu
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => router.push('/stadium')}
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Stadium
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentQ) return null;

  return (
    <div
      className={`flex min-h-screen flex-col items-center justify-center p-4 transition-colors ${
        flash === 'bad'
          ? 'bg-red-100'
          : flash === 'ok'
            ? 'bg-emerald-50'
            : `bg-gradient-to-br ${cfg.playBg}`
      }`}
    >
      <div className="w-full max-w-md">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5" aria-label={`${lives} vies`}>
            {Array.from({ length: START_LIVES }, (_, i) => (
              <Heart
                key={i}
                className={`h-5 w-5 ${i < lives ? cfg.accentFill : 'text-slate-300'}`}
              />
            ))}
          </div>
          <Badge variant="outline" className="px-3 py-1 font-mono text-base">
            {score}
          </Badge>
          <Badge
            variant="secondary"
            className={`font-mono ${timerHot ? cfg.accentBadgeHot : ''}`}
          >
            {(remainingMs / 1000).toFixed(1)}s
          </Badge>
        </div>

        <div className="mb-4 h-3 overflow-hidden rounded-full bg-slate-200/90">
          <div
            className={`h-full w-full origin-left rounded-full will-change-transform ${cfg.accentBar}`}
            style={{ transform: `scaleX(${timerPct})` }}
          />
        </div>

        <Card className={`mb-4 ${cfg.cardPlayBorder}`}>
          <CardContent className="py-10 text-center">
            <p className="font-mono text-4xl font-bold tracking-wide text-slate-800 sm:text-5xl">
              {currentQ.expression}
            </p>
            <p className="mt-3 text-sm text-slate-400">Résultat — Entrée pour valider</p>
          </CardContent>
        </Card>

        <div className="mb-3 flex items-center gap-3">
          <Input
            ref={inputRef}
            type="number"
            inputMode="numeric"
            placeholder="?"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && userInput.trim() !== '') submitAnswer();
            }}
            className="h-12 flex-1 text-center font-mono text-lg"
            autoFocus
          />
          <Button
            size="lg"
            className={`h-12 ${cfg.accentBtn}`}
            onClick={submitAnswer}
            disabled={userInput.trim() === '' || resolvingRef.current}
          >
            OK
          </Button>
        </div>

        <p className="text-center text-xs text-slate-400">
          Prochaine limite ≈ {nextLimitSec(limitSec).toFixed(1)} s
        </p>
      </div>
    </div>
  );
}

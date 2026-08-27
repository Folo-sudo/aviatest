'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { savePerformanceResult, loadEntries } from '@/lib/core/PerformanceTracker';
import { MiniPerformanceChart } from '@/components/PerformanceChart';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Play, ChevronRight, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';

// ============================================================================
// Types
// ============================================================================

type Phase = 'menu' | 'playing';

interface MulQuestion {
  a: number;
  b: number;
  answer: number;
}

interface MulResult {
  question: MulQuestion;
  userAnswer: number | null;
  isCorrect: boolean;
  revealed: boolean;
  timeMs: number;
}

// ============================================================================
// Helpers
// ============================================================================

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateQuestion(): MulQuestion {
  const a = randInt(11, 99);
  const b = randInt(11, 99);
  return { a, b, answer: a * b };
}

// ============================================================================
// Main Component
// ============================================================================

export default function FicheCalculMobile() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('menu');

  const [currentQ, setCurrentQ] = useState<MulQuestion | null>(null);
  const [userInput, setUserInput] = useState('');
  const [showCorrection, setShowCorrection] = useState(false);
  const [lastResult, setLastResult] = useState<MulResult | null>(null);
  const [results, setResults] = useState<MulResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const sessionSavedRef = useRef(false);
  const questionStartRef = useRef<number>(0);

  useEffect(() => {
    if (phase === 'playing' && !showCorrection) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [phase, currentQ, showCorrection]);

  const startSession = useCallback(() => {
    sessionSavedRef.current = false;
    setCurrentQ(generateQuestion());
    setUserInput('');
    setShowCorrection(false);
    setLastResult(null);
    setResults([]);
    questionStartRef.current = Date.now();
    setPhase('playing');
  }, []);

  const submitAnswer = useCallback(() => {
    if (!currentQ) return;
    const parsed = parseInt(userInput, 10);
    if (isNaN(parsed)) return;
    const isCorrect = parsed === currentQ.answer;
    const result: MulResult = {
      question: currentQ,
      userAnswer: parsed,
      isCorrect,
      revealed: false,
      timeMs: Date.now() - questionStartRef.current,
    };
    setLastResult(result);
    setResults(prev => [...prev, result]);
    setShowCorrection(true);
  }, [currentQ, userInput]);

  const revealAnswer = useCallback(() => {
    if (!currentQ) return;
    const result: MulResult = {
      question: currentQ,
      userAnswer: null,
      isCorrect: false,
      revealed: true,
      timeMs: Date.now() - questionStartRef.current,
    };
    setLastResult(result);
    setResults(prev => [...prev, result]);
    setShowCorrection(true);
  }, [currentQ]);

  const nextQuestion = useCallback(() => {
    setCurrentQ(generateQuestion());
    setUserInput('');
    setShowCorrection(false);
    setLastResult(null);
    questionStartRef.current = Date.now();
  }, []);

  const exitToMenu = useCallback(() => {
    const answered = results.filter(r => !r.revealed);
    if (!sessionSavedRef.current && answered.length >= 3) {
      sessionSavedRef.current = true;
      const correct = answered.filter(r => r.isCorrect).length;
      const avgMs = answered.reduce((s, r) => s + r.timeMs, 0) / answered.length;
      savePerformanceResult('fiche-calcul', correct, answered.length, avgMs);
    }
    setPhase('menu');
  }, [results]);

  const formatTime = (ms: number): string => {
    const s = ms / 1000;
    return s >= 10 ? `${s.toFixed(1)}s` : `${s.toFixed(2)}s`;
  };

  // =========================================================================
  // RENDER
  // =========================================================================

  if (phase === 'menu') {
    const perfEntries = loadEntries('fiche-calcul');
    return (
      <div className="min-h-screen p-4" style={{ backgroundColor: '#fbfaf9' }}>
        <div className="max-w-lg mx-auto pt-4">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold">Fiche Calcul</CardTitle>
              <CardDescription className="text-sm mt-1">
                Entrainement continu aux multiplications ab &times; cd
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-[#f7f5f3] rounded-lg p-3 text-sm text-[#605a57] space-y-1.5">
                <p>Multiplications de <strong>2 chiffres par 2 chiffres</strong> sans fin.</p>
                <p>Correction immediate apres chaque reponse.</p>
                <p><strong>&quot;Voir la reponse&quot;</strong> pour passer plus vite.</p>
              </div>

              {perfEntries.length >= 2 && (
                <div className="border-t pt-3">
                  <p className="text-sm font-medium text-[#605a57] mb-2 text-center">Progression</p>
                  <div className="flex justify-center">
                    <MiniPerformanceChart entries={perfEntries} exerciseId="fiche-calcul" />
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <Button size="lg" className="w-full h-12" onClick={startSession}>
                  <Play className="mr-2 h-5 w-5" /> Commencer
                </Button>
                <Button variant="ghost" size="lg" className="w-full h-12" onClick={() => router.push('/telephone')}>
                  <ArrowLeft className="mr-2 h-5 w-5" /> Retour
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ---- PLAYING ----
  if (!currentQ) return null;

  const correctCount = results.filter(r => r.isCorrect).length;
  const answeredCount = results.filter(r => !r.revealed).length;
  const revealedCount = results.filter(r => r.revealed).length;

  if (showCorrection && lastResult) {
    return (
      <div className="min-h-screen p-3" style={{ backgroundColor: '#fbfaf9' }}>
        <div className="max-w-lg mx-auto pt-2">
          <div className="flex items-center justify-between mb-3">
            <Badge variant="outline" className="text-sm px-2 py-1">
              {correctCount} / {answeredCount}
              {revealedCount > 0 && <span className="text-slate-400 ml-1">({revealedCount}r)</span>}
            </Badge>
            <Badge
              variant={
                lastResult.revealed ? 'secondary' :
                lastResult.isCorrect ? 'default' : 'destructive'
              }
              className="text-sm"
            >
              {lastResult.revealed
                ? 'Revele'
                : lastResult.isCorrect
                  ? '\u2713 Correct'
                  : '\u2717 Incorrect'}
            </Badge>
          </div>

          <Card className="mb-3">
            <CardContent className="py-6 text-center space-y-3">
              <p className="text-3xl font-bold text-slate-800 font-mono">
                {currentQ.a} &times; {currentQ.b}
              </p>
              <div className="space-y-1">
                {lastResult.revealed ? (
                  <p className="text-3xl font-bold text-blue-600">= {currentQ.answer}</p>
                ) : lastResult.isCorrect ? (
                  <p className="text-3xl font-bold text-green-600">= {currentQ.answer}</p>
                ) : (
                  <>
                    <p className="text-xl font-bold text-red-600 line-through">
                      = {lastResult.userAnswer}
                    </p>
                    <p className="text-3xl font-bold text-green-600">= {currentQ.answer}</p>
                  </>
                )}
              </div>
              <p className="text-sm text-[#605a57]">
                Temps : <span className="font-semibold text-[#37322f]">{formatTime(lastResult.timeMs)}</span>
              </p>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2">
            <Button size="lg" className="w-full h-14" onClick={nextQuestion}>
              Suivant
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
            <Button variant="ghost" size="sm" className="w-full h-10" onClick={exitToMenu}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Quitter
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-3" style={{ backgroundColor: '#fbfaf9' }}>
      <div className="max-w-lg mx-auto pt-2">
        <div className="flex items-center justify-between mb-3">
          <Badge variant="outline" className="text-sm px-2 py-1">
            {correctCount} / {answeredCount}
            {revealedCount > 0 && <span className="text-slate-400 ml-1">({revealedCount}r)</span>}
          </Badge>
        </div>

        <Card className="mb-3">
          <CardContent className="py-8 text-center">
            <p className="text-4xl font-bold text-slate-800 font-mono tracking-wide">
              {currentQ.a} &times; {currentQ.b}
            </p>
            <p className="text-xs text-slate-400 mt-2">Entrez le resultat</p>
          </CardContent>
        </Card>

        <div className="space-y-2 mb-2">
          <Input
            ref={inputRef}
            type="number"
            inputMode="numeric"
            placeholder="Votre reponse"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && userInput.trim() !== '' && submitAnswer()}
            className="w-full text-center text-2xl font-bold h-14 text-slate-800"
          />
          <Button
            size="lg"
            className="w-full h-14"
            onClick={submitAnswer}
            disabled={userInput.trim() === ''}
          >
            Valider <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          <Button variant="outline" size="lg" className="w-full h-12" onClick={revealAnswer}>
            <Eye className="mr-2 h-4 w-4" /> Voir la reponse
          </Button>
          <Button variant="ghost" size="sm" className="w-full h-10" onClick={exitToMenu}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Quitter
          </Button>
        </div>
      </div>
    </div>
  );
}

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
  a: number; // 2-digit
  b: number; // 2-digit
  answer: number;
}

interface MulResult {
  question: MulQuestion;
  userAnswer: number | null;
  isCorrect: boolean;
  revealed: boolean;  // true if user clicked "voir la reponse"
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

export default function FicheCalculTest() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('menu');

  const [currentQ, setCurrentQ] = useState<MulQuestion | null>(null);
  const [userInput, setUserInput] = useState('');
  const [showCorrection, setShowCorrection] = useState(false);
  const [lastResult, setLastResult] = useState<MulResult | null>(null);
  const [results, setResults] = useState<MulResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const sessionSavedRef = useRef(false);

  // Focus input when question changes
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
  }, []);

  // Save session stats when user exits (at least 3 non-revealed answers)
  const exitToMenu = useCallback(() => {
    const answered = results.filter(r => !r.revealed);
    if (!sessionSavedRef.current && answered.length >= 3) {
      sessionSavedRef.current = true;
      const correct = answered.filter(r => r.isCorrect).length;
      savePerformanceResult('fiche-calcul', correct, answered.length);
    }
    setPhase('menu');
  }, [results]);

  // =========================================================================
  // RENDER
  // =========================================================================

  if (phase === 'menu') {
    const perfEntries = loadEntries('fiche-calcul');
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">Fiche Calcul</CardTitle>
            <CardDescription className="text-base mt-2">
              Entrainement continu aux multiplications ab &times; cd
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-600 space-y-2">
              <p>Des multiplications de <strong>2 chiffres par 2 chiffres</strong> s&apos;enchainent sans fin.</p>
              <p>Correction immediate apres chaque reponse.</p>
              <p>Bouton <strong>&quot;Voir la reponse&quot;</strong> pour passer plus vite si besoin.</p>
            </div>

            {perfEntries.length >= 2 && (
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-slate-500 mb-2 text-center">Progression</p>
                <div className="flex justify-center">
                  <MiniPerformanceChart entries={perfEntries} exerciseId="fiche-calcul" />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <Button size="lg" className="w-full" onClick={startSession}>
                <Play className="mr-2 h-5 w-5" /> Commencer
              </Button>
              <Button variant="ghost" size="lg" className="w-full" onClick={() => router.push('/')}>
                <ArrowLeft className="mr-2 h-5 w-5" /> Retour
              </Button>
            </div>
          </CardContent>
        </Card>
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
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-between mb-4">
            <Badge variant="outline" className="text-base px-3 py-1">
              {correctCount} / {answeredCount}
              {revealedCount > 0 && <span className="text-slate-400 ml-1">({revealedCount} reveles)</span>}
            </Badge>
            <Badge
              variant={
                lastResult.revealed ? 'secondary' :
                lastResult.isCorrect ? 'default' : 'destructive'
              }
            >
              {lastResult.revealed
                ? 'Revele'
                : lastResult.isCorrect
                  ? '\u2713 Correct !'
                  : '\u2717 Incorrect'}
            </Badge>
          </div>

          <Card className="mb-4">
            <CardContent className="py-8 text-center space-y-4">
              <p className="text-3xl sm:text-4xl font-bold text-slate-800 font-mono">
                {currentQ.a} &times; {currentQ.b}
              </p>
              <div className="space-y-2">
                {lastResult.revealed ? (
                  <p className="text-4xl font-bold text-blue-600">= {currentQ.answer}</p>
                ) : lastResult.isCorrect ? (
                  <p className="text-4xl font-bold text-green-600">= {currentQ.answer}</p>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-red-600 line-through">
                      = {lastResult.userAnswer}
                    </p>
                    <p className="text-4xl font-bold text-green-600">= {currentQ.answer}</p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2">
            <Button size="lg" className="w-full" onClick={nextQuestion}>
              Suivant
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
            <Button variant="ghost" size="sm" className="w-full" onClick={exitToMenu}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Quitter
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <Badge variant="outline" className="text-base px-3 py-1">
            {correctCount} / {answeredCount}
            {revealedCount > 0 && <span className="text-slate-400 ml-1">({revealedCount} reveles)</span>}
          </Badge>
        </div>

        <Card className="mb-4">
          <CardContent className="py-10 text-center">
            <p className="text-4xl sm:text-5xl font-bold text-slate-800 font-mono tracking-wide">
              {currentQ.a} &times; {currentQ.b}
            </p>
            <p className="text-sm text-slate-400 mt-3">Entrez le resultat</p>
          </CardContent>
        </Card>

        <div className="flex items-center gap-3 mb-3">
          <Input
            ref={inputRef}
            type="number"
            placeholder="?"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && userInput.trim() !== '' && submitAnswer()}
            className="text-center text-lg font-mono h-12 flex-1"
          />
          <Button size="lg" className="h-12" onClick={submitAnswer} disabled={userInput.trim() === ''}>
            Valider
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          <Button variant="outline" size="sm" className="w-full" onClick={revealAnswer}>
            <Eye className="mr-2 h-4 w-4" /> Voir la reponse
          </Button>
          <Button variant="ghost" size="sm" className="w-full" onClick={exitToMenu}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Quitter
          </Button>
        </div>
      </div>
    </div>
  );
}

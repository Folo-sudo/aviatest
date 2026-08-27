'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Play } from 'lucide-react';
import { savePerformanceResult, loadEntries } from '@/lib/core/PerformanceTracker';
import { MiniPerformanceChart } from '@/components/PerformanceChart';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  allCultureItems,
  CULTURE_KIND_LABELS,
  nextCultureQuestion,
  type CultureItem,
  type CultureKind,
} from '@/lib/exercises/cultureAviationBank';

const EXERCISE_ID = 'fiche-culture-aviation';

type Phase = 'menu' | 'playing';
type Theme = 'all' | CultureKind;

interface Result {
  question: CultureItem;
  selected: number;
  isCorrect: boolean;
}

function ExplainBody({ text }: { text: string }) {
  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {text.split('\n\n').map((para, i) => (
        <p key={i}>
          {para.split('\n').map((line, j) => (
            <span key={j}>
              {j > 0 ? <br /> : null}
              {line.split(/(\*\*[^*]+\*\*)/g).map((chunk, k) =>
                chunk.startsWith('**') && chunk.endsWith('**') ? (
                  <strong key={k}>{chunk.slice(2, -2)}</strong>
                ) : (
                  <span key={k}>{chunk}</span>
                ),
              )}
            </span>
          ))}
        </p>
      ))}
    </div>
  );
}

const THEMES: { id: Theme; label: string }[] = [
  { id: 'all', label: 'Tout' },
  { id: 'air-france', label: 'Air France' },
  { id: 'flotte', label: 'Flotte' },
  { id: 'pionniers', label: 'Pionniers' },
  { id: 'histoire', label: 'Histoire' },
  { id: 'records', label: 'Records' },
  { id: 'aeroports', label: 'Aéroports' },
  { id: 'navigation', label: 'Lat/lon & codes' },
];

export default function FicheCultureAviationTest() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('menu');
  const [theme, setTheme] = useState<Theme>('all');
  const [current, setCurrent] = useState<CultureItem | null>(null);
  const [showCorrection, setShowCorrection] = useState(false);
  const [last, setLast] = useState<Result | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const usedRef = useRef(new Set<string>());
  const savedRef = useRef(false);
  const bankSize = allCultureItems().length;

  const draw = useCallback((t: Theme) => {
    const q = nextCultureQuestion(usedRef.current, t);
    usedRef.current.add(q.stem);
    setCurrent(q);
    setShowCorrection(false);
    setLast(null);
  }, []);

  const start = useCallback(
    (t: Theme) => {
      usedRef.current = new Set();
      savedRef.current = false;
      setTheme(t);
      setResults([]);
      setPhase('playing');
      const q = nextCultureQuestion(new Set(), t);
      usedRef.current.add(q.stem);
      setCurrent(q);
      setShowCorrection(false);
      setLast(null);
    },
    [],
  );

  const answer = useCallback(
    (idx: number) => {
      if (!current || showCorrection) return;
      const isCorrect = idx === current.correct;
      const row: Result = { question: current, selected: idx, isCorrect };
      setLast(row);
      setResults((prev) => [...prev, row]);
      setShowCorrection(true);
    },
    [current, showCorrection],
  );

  const next = useCallback(() => {
    draw(theme);
  }, [draw, theme]);

  const exitToMenu = useCallback(() => {
    if (!savedRef.current && results.length >= 3) {
      savedRef.current = true;
      const correct = results.filter((r) => r.isCorrect).length;
      savePerformanceResult(EXERCISE_ID, correct, results.length);
    }
    setPhase('menu');
  }, [results]);

  useEffect(() => {
    if (phase !== 'playing' || showCorrection) return;
    const onKey = (e: KeyboardEvent) => {
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= 4) {
        e.preventDefault();
        answer(n - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, showCorrection, answer]);

  useEffect(() => {
    if (phase !== 'playing' || !showCorrection) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, showCorrection, next]);

  if (phase === 'menu') {
    const perfEntries = loadEntries(EXERCISE_ID);
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#fbfaf9] p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Fiche culture aviation</CardTitle>
            <CardDescription className="mt-2 text-base">
              Air France, flotte, pionniers, aéroports — {bankSize} questions, correction à chaque
              fois
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2 rounded-lg bg-[#f7f5f3] p-4 text-sm text-[#605a57]">
              <p>
                Fiche sans chrono : vous avancez autant que vous voulez. Après chaque réponse, la{' '}
                <strong>règle / le fait daté</strong> s&apos;affiche.
              </p>
              <p>
                Les effectifs et le nombre d&apos;avions <strong>bougent</strong> : les questions le
                disent (chiffres publics 2025-2026). Un cadet AF doit tout de même connaître IATA,
                alliance, hub, types, moteurs, dates-clés.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {THEMES.map((t) => (
                <Button key={t.id} variant="outline" size="sm" onClick={() => start(t.id)}>
                  {t.label}
                </Button>
              ))}
            </div>
            {perfEntries.length >= 2 && (
              <div className="border-t pt-4">
                <p className="mb-2 text-center text-sm font-medium text-[#605a57]">Progression</p>
                <div className="flex justify-center">
                  <MiniPerformanceChart entries={perfEntries} exerciseId={EXERCISE_ID} />
                </div>
              </div>
            )}
            <Button size="lg" className="w-full" onClick={() => start('all')}>
              <Play className="mr-2 h-5 w-5" /> Mix complet
            </Button>
            <Button variant="ghost" size="lg" className="w-full" onClick={() => router.push('/')}>
              <ArrowLeft className="mr-2 h-5 w-5" /> Retour
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!current) return null;
  const ok = results.filter((r) => r.isCorrect).length;

  return (
    <div className="flex min-h-screen flex-col bg-[#fbfaf9]">
      <div className="flex items-center justify-between px-4 py-3">
        <Button variant="ghost" size="sm" onClick={exitToMenu}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Menu
        </Button>
        <Badge variant="outline" className="bg-white">
          {ok}/{results.length} · {CULTURE_KIND_LABELS[current.kind]}
        </Badge>
      </div>

      <div className="flex flex-1 flex-col items-center p-4">
        <div className="w-full max-w-2xl space-y-5">
          <div className="flex flex-wrap gap-1.5">
            {THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTheme(t.id);
                  usedRef.current = new Set();
                  draw(t.id);
                }}
                className={`rounded-full px-3 py-1 text-xs ${
                  theme === t.id ? 'bg-[#37322f] text-white' : 'bg-white text-[#605a57]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <p className="text-lg font-semibold leading-relaxed text-[#37322f] sm:text-xl">
            {current.stem}
          </p>

          <div className="space-y-2">
            {current.choices.map((choice, i) => {
              const show = showCorrection;
              const isRight = show && i === current.correct;
              const isWrong = show && last && i === last.selected && !last.isCorrect;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={showCorrection}
                  onClick={() => answer(i)}
                  className={`w-full rounded-xl border-2 px-4 py-3 text-left text-sm font-medium sm:text-base ${
                    isRight
                      ? 'border-green-600 bg-green-50'
                      : isWrong
                        ? 'border-red-600 bg-red-50'
                        : 'border-transparent bg-white hover:bg-[#f7f5f3]'
                  }`}
                >
                  <span className="mr-2 opacity-50">{i + 1}.</span>
                  {choice}
                </button>
              );
            })}
          </div>

          {showCorrection && last ? (
            <div
              className={`rounded-xl border-2 p-4 ${
                last.isCorrect ? 'border-green-600 bg-green-50' : 'border-red-600 bg-red-50'
              }`}
            >
              <p className={`mb-2 font-bold ${last.isCorrect ? 'text-green-800' : 'text-red-800'}`}>
                {last.isCorrect ? 'Correct' : 'Incorrect'}
              </p>
              {!last.isCorrect && (
                <p className="mb-2 text-sm">
                  Vous : <strong>{current.choices[last.selected]}</strong>
                  <br />
                  Bonne réponse : <strong>{current.choices[current.correct]}</strong>
                </p>
              )}
              <ExplainBody text={current.explain} />
              <Button size="lg" className="mt-4 w-full" onClick={next}>
                Question suivante
              </Button>
              <p className="mt-2 text-center text-xs text-[#605a57]">Entrée pour continuer</p>
            </div>
          ) : (
            <p className="text-center text-xs text-[#605a57]">Touches 1–4</p>
          )}
        </div>
      </div>
    </div>
  );
}

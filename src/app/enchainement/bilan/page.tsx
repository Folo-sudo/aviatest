'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Play, RotateCcw } from 'lucide-react';
import AuthGate from '@/components/AuthGate';
import { Button } from '@/components/ui/button';
import { ClassScoreBlock } from '@/components/ClassScoreBlock';
import {
  clearSession,
  fillMissingResults,
  playUrl,
  readSession,
  type EnchainementSession,
  writeSession,
} from '@/lib/enchainement/session';

export default function EnchainementBilanPage() {
  const [session, setSession] = useState<EnchainementSession | null>(null);

  useEffect(() => {
    const raw = readSession();
    if (!raw) return;
    const filled = fillMissingResults(raw);
    setSession(filled);
    writeSession(filled);
  }, []);

  const replay = () => {
    if (!session) return;
    const next = {
      ...session,
      index: 0,
      steps: session.steps.map(({ result: _r, ...step }) => step),
    };
    writeSession(next);
    window.location.href = playUrl(next);
  };

  const done = () => {
    clearSession();
  };

  return (
    <AuthGate>
      <main className="min-h-screen bg-[#fbfaf9]">
        <div className="container mx-auto max-w-2xl px-4 py-10">
          <Link
            href="/enchainement"
            onClick={done}
            className="mb-8 inline-flex items-center gap-2 text-sm text-[#605a57] hover:text-[#37322f]"
          >
            <ArrowLeft className="h-4 w-4" />
            Modifier le parcours
          </Link>

          <h1 className="text-4xl font-bold text-[#37322f]">Bilan de l&apos;enchaînement</h1>
          <p className="mt-3 text-[#605a57]">
            {session
              ? `${session.steps.length} test${session.steps.length > 1 ? 's' : ''} enchaînés sans pause.`
              : 'Aucun parcours en mémoire.'}
          </p>

          {session && (
            <ol className="mt-8 space-y-6">
              {session.steps.map((step, i) => (
                <li key={`${step.id}-${i}`} className="rounded-2xl border border-[#e0dedb] bg-white p-5">
                  <p className="text-sm font-medium text-[#605a57]">
                    {i + 1} / {session.steps.length}
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-[#37322f]">{step.title}</h2>
                  {step.result?.percent != null ? (
                    <div className="mt-4">
                      <ClassScoreBlock
                        exerciseId={step.id}
                        percent={step.result.percent}
                      />
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-[#605a57]">Score non enregistré (mode invité ou test interrompu).</p>
                  )}
                </li>
              ))}
            </ol>
          )}

          <div className="mt-8 flex flex-col gap-3">
            {session && (
              <Button size="lg" onClick={replay}>
                <RotateCcw className="mr-2 h-5 w-5" />
                Rejouer le parcours
              </Button>
            )}
            <Button size="lg" variant="outline" asChild>
              <Link href="/enchainement" onClick={done}>
                <Play className="mr-2 h-5 w-5" />
                Nouveau parcours
              </Link>
            </Button>
            <Button size="lg" variant="ghost" asChild>
              <Link href="/" onClick={done}>
                Accueil
              </Link>
            </Button>
          </div>
        </div>
      </main>
    </AuthGate>
  );
}

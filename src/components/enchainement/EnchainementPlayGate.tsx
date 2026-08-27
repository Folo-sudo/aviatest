'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  advanceSession,
  applyCurrentSettings,
  clearSession,
  ENCHAINEMENT_QUERY,
  isFinished,
  playUrl,
  readSession,
  recordStepResult,
  restoreAllSettings,
  writeSession,
} from '@/lib/enchainement/session';
import { clickPlayButton, isResultsScreen, scrapeResult } from '@/lib/enchainement/dom';

type Phase = 'idle' | 'intro' | 'playing' | 'error';

export default function EnchainementPlayGate({
  slug,
  children,
}: {
  slug: string;
  children: ReactNode;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const competitionId = searchParams.get('competitionId');
  const duelId = searchParams.get('duelId');
  const active =
    searchParams.get(ENCHAINEMENT_QUERY) === '1' && !competitionId && !duelId;
  const stepParam = Number(searchParams.get('step') ?? '0');

  const [phase, setPhase] = useState<Phase>(() => (active ? 'intro' : 'idle'));
  const [label, setLabel] = useState('');
  const [progress, setProgress] = useState('');
  const startedRef = useRef(false);
  const advancingRef = useRef(false);

  useEffect(() => {
    if (!active) {
      setPhase('idle');
      return;
    }
    const session = readSession();
    if (!session) {
      setPhase('error');
      return;
    }
    let current = session;
    if (Number.isFinite(stepParam) && stepParam !== current.index) {
      current = { ...current, index: stepParam };
      writeSession(current);
    }
    const step = current.steps[current.index];
    if (!step || step.slug !== slug) {
      setPhase('error');
      return;
    }
    applyCurrentSettings(current);
    setLabel(step.title);
    setProgress(`${current.index + 1} / ${current.steps.length}`);
    setPhase('intro');
    startedRef.current = false;
    advancingRef.current = false;
  }, [active, slug, stepParam]);

  useEffect(() => {
    if (phase !== 'intro') return;
    const delay = stepParam > 0 ? 120 : 700;
    const t = window.setTimeout(() => {
      const begin = Date.now();
      const tick = () => {
        if (startedRef.current) return;
        if (clickPlayButton()) {
          startedRef.current = true;
          setPhase('playing');
          return;
        }
        if (Date.now() - begin > 8000) {
          setPhase('playing');
          return;
        }
        window.setTimeout(tick, 80);
      };
      tick();
    }, delay);
    return () => window.clearTimeout(t);
  }, [phase, stepParam]);

  useEffect(() => {
    if (phase !== 'playing') return;

    const tick = () => {
      if (advancingRef.current || !startedRef.current) return;
      if (!isResultsScreen()) return;
      advancingRef.current = true;
      const session = readSession();
      if (!session) {
        router.push('/enchainement');
        return;
      }
      const next = recordStepResult(session, scrapeResult());
      const advanced = advanceSession(next);
      writeSession(advanced);
      if (isFinished(advanced)) {
        restoreAllSettings(advanced);
        router.push('/enchainement/bilan');
        return;
      }
      applyCurrentSettings(advanced);
      router.push(playUrl(advanced));
    };

    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [phase, router]);

  const abandon = () => {
    const session = readSession();
    if (session) restoreAllSettings(session);
    clearSession();
    router.push('/enchainement');
  };

  if (phase === 'idle') return <>{children}</>;

  if (phase === 'error') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#fbfaf9] px-4">
        <p className="text-center text-[#37322f]">Enchaînement introuvable ou désynchronisé.</p>
        <Link href="/enchainement" className="text-sm text-[#605a57] underline">
          Retour à l&apos;enchaînement
        </Link>
      </div>
    );
  }

  return (
    <>
      {children}
      {phase === 'intro' && (
        <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-[#fbfaf9]">
          <p className="text-xs uppercase tracking-[0.28em] text-[#605a57]">{progress}</p>
          <h1 className="mt-4 max-w-xl text-center text-4xl font-semibold text-[#37322f]">{label}</h1>
          <p className="mt-3 text-sm text-[#605a57]">Enchaînement sans pause</p>
          <button
            type="button"
            onClick={abandon}
            className="mt-10 text-xs text-[#605a57] underline-offset-2 hover:underline"
          >
            Abandonner
          </button>
        </div>
      )}
      {phase === 'playing' && (
        <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full border border-[#e0dedb] bg-white/95 px-4 py-2 shadow-[0_8px_24px_rgba(55,50,47,0.08)]">
          <p className="text-xs font-medium text-[#37322f]">
            {progress} · {label}
          </p>
          <button
            type="button"
            onClick={abandon}
            className="text-xs text-[#605a57] underline-offset-2 hover:underline"
          >
            Abandonner
          </button>
        </div>
      )}
    </>
  );
}

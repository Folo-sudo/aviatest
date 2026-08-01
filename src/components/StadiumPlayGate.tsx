'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getExerciseBySlug, EXERCISES } from '@/lib/data/exercises';
import { getCompetition } from '@/lib/stadium/competitions';
import {
  writeExerciseSettings,
  setActiveCompetitionId,
} from '@/lib/stadium/settingsKeys';

type Phase = 'idle' | 'loading' | 'countdown' | 'go' | 'error';

/**
 * Stadium play mode: lock competition settings, heroic 3s countdown,
 * then mount the test and auto-click Jouer/Commencer (skip settings menu).
 */
export default function StadiumPlayGate({
  slug,
  children,
}: {
  slug: string;
  children: ReactNode;
}) {
  const searchParams = useSearchParams();
  const competitionId = searchParams.get('competitionId');
  const stadiumCreate = searchParams.get('stadiumCreate') === '1';

  const [phase, setPhase] = useState<Phase>(() =>
    competitionId && !stadiumCreate ? 'loading' : 'idle',
  );
  const [count, setCount] = useState(3);
  const [error, setError] = useState<string | null>(null);

  const exercise =
    getExerciseBySlug(slug) ||
    EXERCISES.find((e) => e.slug === slug || e.id === slug) ||
    null;

  useEffect(() => {
    if (!competitionId || stadiumCreate) {
      setPhase('idle');
      return;
    }
    if (!exercise) {
      setError('Exercice introuvable.');
      setPhase('error');
      return;
    }

    let cancelled = false;
    setPhase('loading');
    (async () => {
      try {
        const competition = await getCompetition(competitionId);
        if (cancelled) return;
        if (!competition) {
          setError('Competition introuvable.');
          setPhase('error');
          return;
        }
        writeExerciseSettings(
          competition.exercise_id,
          competition.settings || {},
        );
        setActiveCompetitionId(competition.id);
        setCount(3);
        setPhase('countdown');
      } catch {
        if (!cancelled) {
          setError('Impossible de charger la competition.');
          setPhase('error');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [competitionId, stadiumCreate, exercise]);

  useEffect(() => {
    if (phase !== 'countdown') return;
    if (count <= 0) {
      setPhase('go');
      return;
    }
    const t = window.setTimeout(() => setCount((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [phase, count]);

  useEffect(() => {
    if (phase !== 'go') return;

    const labels = /^(jouer|commencer)$/i;
    const tryClick = () => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const play = buttons.find((b) =>
        labels.test((b.textContent || '').replace(/\s+/g, ' ').trim()),
      );
      if (play && !(play as HTMLButtonElement).disabled) {
        play.click();
        return true;
      }
      return false;
    };

    if (tryClick()) return;

    const started = Date.now();
    const id = window.setInterval(() => {
      if (tryClick() || Date.now() - started > 8000) {
        window.clearInterval(id);
      }
    }, 120);
    return () => window.clearInterval(id);
  }, [phase]);

  if (phase === 'idle') return <>{children}</>;

  if (phase === 'loading' || phase === 'countdown') {
    return (
      <div
        className="fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-hidden"
        style={{
          background:
            'radial-gradient(ellipse at 50% 30%, #4a4038 0%, #1a1614 55%, #0c0a09 100%)',
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(251,250,249,0.03) 2px, rgba(251,250,249,0.03) 4px)',
          }}
        />
        {phase === 'loading' ? (
          <p
            className="relative text-sm tracking-[0.3em] uppercase"
            style={{ color: 'rgba(251,250,249,0.55)' }}
          >
            Chargement...
          </p>
        ) : (
          <div className="relative flex flex-col items-center gap-10 px-6 text-center">
            <p
              className="text-xs sm:text-sm tracking-[0.45em] uppercase"
              style={{ color: 'rgba(251,250,249,0.45)' }}
            >
              Stadium
            </p>
            <h1
              className="text-4xl sm:text-6xl md:text-7xl font-bold leading-tight max-w-3xl animate-in fade-in zoom-in-95 duration-700"
              style={{
                fontFamily: 'var(--font-playfair), Georgia, serif',
                color: '#fbfaf9',
                textShadow:
                  '0 0 40px rgba(251,250,249,0.15), 0 4px 24px rgba(0,0,0,0.5)',
                letterSpacing: '0.02em',
              }}
            >
              Prepare toi
              <br />
              champion
            </h1>
            <div
              key={count}
              className="text-8xl sm:text-9xl font-bold tabular-nums animate-in fade-in zoom-in-50 duration-500"
              style={{
                fontFamily: 'var(--font-playfair), Georgia, serif',
                color: '#fbfaf9',
                textShadow: '0 0 60px rgba(251,250,249,0.25)',
              }}
            >
              {count > 0 ? count : '!'}
            </div>
          </div>
        )}
        <Link
          href="/stadium"
          className="absolute bottom-8 text-xs tracking-wide uppercase"
          style={{ color: 'rgba(251,250,249,0.4)' }}
          onClick={() => setActiveCompetitionId(null)}
        >
          Retour Stadium
        </Link>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#fbfaf9] px-4">
        <p className="text-[#37322f]">{error}</p>
        <Link href="/stadium" className="text-sm underline text-[#605a57]">
          Retour Stadium
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}

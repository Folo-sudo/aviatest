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

function isPlayButton(el: HTMLButtonElement): boolean {
  const text = (el.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
  return (
    text === 'jouer' ||
    text === 'commencer' ||
    text.endsWith(' jouer') ||
    text.endsWith(' commencer')
  );
}

function clickPlayButton(): boolean {
  const buttons = Array.from(document.querySelectorAll('button'));
  const play = buttons.find(
    (b) => isPlayButton(b as HTMLButtonElement) && !(b as HTMLButtonElement).disabled,
  );
  if (play) {
    play.click();
    return true;
  }
  return false;
}

/**
 * Stadium play: lock settings, heroic countdown, auto-start (no menu flash).
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
      const started = Date.now();
      const tick = () => {
        if (clickPlayButton() || Date.now() - started > 8000) {
          setPhase('go');
          return;
        }
        window.setTimeout(tick, 80);
      };
      tick();
      return;
    }
    const t = window.setTimeout(() => setCount((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [phase, count]);

  if (phase === 'idle') return <>{children}</>;

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

  const mountTest = phase === 'countdown' || phase === 'go';
  const showOverlay = phase === 'loading' || phase === 'countdown';

  return (
    <>
      {mountTest && (
        <div
          aria-hidden={showOverlay}
          style={
            showOverlay
              ? {
                  position: 'fixed',
                  inset: 0,
                  opacity: 0,
                  pointerEvents: 'none',
                  zIndex: 0,
                }
              : undefined
          }
        >
          {children}
        </div>
      )}

      {showOverlay && (
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
          {phase === 'loading' || count <= 0 ? (
            <p
              className="relative text-sm tracking-[0.3em] uppercase"
              style={{ color: 'rgba(251,250,249,0.55)' }}
            >
              {phase === 'loading' ? 'Chargement...' : 'C\'est parti...'}
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
                {count}
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
      )}
    </>
  );
}

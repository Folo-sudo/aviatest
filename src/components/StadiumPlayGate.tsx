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
import {
  ensureStadiumTimerPatch,
  nativeClearTimeout,
  nativeSetTimeout,
  setStadiumHold,
} from '@/lib/stadium/hold';
import { exitGuestToLogin, isGuestMode } from '@/lib/auth/guest';
import { Button } from '@/components/ui/button';

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
 * Stadium play: pre-mount test under countdown with timers held, then reveal.
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
  const [started, setStarted] = useState(false);

  const exercise =
    getExerciseBySlug(slug) ||
    EXERCISES.find((e) => e.slug === slug || e.id === slug) ||
    null;

  useEffect(() => {
    if (!competitionId || stadiumCreate) {
      setStadiumHold(false);
      setPhase('idle');
      return;
    }
    if (isGuestMode()) {
      setStadiumHold(false);
      setError('Mode invité : les competitions Stadium sont reservees aux comptes.');
      setPhase('error');
      return;
    }
    if (!exercise) {
      setError('Exercice introuvable.');
      setPhase('error');
      return;
    }

    let cancelled = false;
    ensureStadiumTimerPatch();
    setStadiumHold(true);
    setPhase('loading');
    setStarted(false);

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
      setStadiumHold(false);
      void import('@/lib/presence/exercisePresence').then(({ stopExercisePresence }) =>
        stopExercisePresence(),
      );
    };
  }, [competitionId, stadiumCreate, exercise]);

  // Pre-start the test as soon as it mounts (timers held / paused).
  useEffect(() => {
    if (phase !== 'countdown' || started) return;

    const begin = Date.now();
    let cancelled = false;

    const tick = () => {
      if (cancelled) return;
      if (clickPlayButton()) {
        setStarted(true);
        return;
      }
      if (Date.now() - begin > 10000) return;
      nativeSetTimeout(tick, 80);
    };
    tick();

    return () => {
      cancelled = true;
    };
  }, [phase, started]);

  // Heroic countdown (uses native timers, not affected by hold).
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (count > 0) {
      const t = nativeSetTimeout(() => setCount((c) => c - 1), 1000);
      return () => {
        nativeClearTimeout(t);
      };
    }

    // Count finished: wait until play has started (or timeout), then reveal.
    const begin = Date.now();
    let cancelled = false;
    const reveal = () => {
      if (cancelled) return;
      if (started || Date.now() - begin > 4000) {
        setStadiumHold(false);
        setPhase('go');
        void import('@/lib/presence/exercisePresence').then(({ startExercisePresence }) =>
          startExercisePresence(),
        );
        return;
      }
      nativeSetTimeout(reveal, 50);
    };
    reveal();
    return () => {
      cancelled = true;
    };
  }, [phase, count, started]);

  if (phase === 'idle') return <>{children}</>;

  if (phase === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#fbfaf9] px-4">
        <p className="text-[#37322f] text-center">{error}</p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/stadium" className="text-sm underline text-[#605a57]">
            Retour Stadium
          </Link>
          {isGuestMode() && (
            <Button type="button" size="sm" onClick={exitGuestToLogin}>
              Se connecter
            </Button>
          )}
        </div>
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
      )}
    </>
  );
}

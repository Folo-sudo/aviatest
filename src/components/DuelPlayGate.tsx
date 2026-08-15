'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getExerciseBySlug, EXERCISES } from '@/lib/data/exercises';
import { getDuel, setActiveDuelId } from '@/lib/duels/api';
import { writeExerciseSettings, setActiveCompetitionId } from '@/lib/stadium/settingsKeys';
import {
  ensureStadiumTimerPatch,
  nativeClearTimeout,
  nativeSetTimeout,
  setStadiumHold,
} from '@/lib/stadium/hold';
import {
  startExercisePresence,
  stopExercisePresence,
} from '@/lib/presence/exercisePresence';
import { isGuestMode } from '@/lib/auth/guest';

type Phase = 'idle' | 'loading' | 'waiting' | 'countdown' | 'go' | 'error';

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
 * Duel play: sync countdown to duel.launch_at, then start like Stadium.
 */
export default function DuelPlayGate({
  slug,
  children,
}: {
  slug: string;
  children: ReactNode;
}) {
  const searchParams = useSearchParams();
  const duelId = searchParams.get('duelId');
  const duelCreate = searchParams.get('duelCreate') === '1';

  const [phase, setPhase] = useState<Phase>(() =>
    duelId && !duelCreate ? 'loading' : 'idle',
  );
  const [count, setCount] = useState(3);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [waitLabel, setWaitLabel] = useState('Synchronisation...');

  const exercise =
    getExerciseBySlug(slug) ||
    EXERCISES.find((e) => e.slug === slug || e.id === slug) ||
    null;

  useEffect(() => {
    if (!duelId || duelCreate) {
      setStadiumHold(false);
      setPhase('idle');
      return;
    }
    if (isGuestMode()) {
      setStadiumHold(false);
      setError('Mode invité : les duels sont reserves aux comptes.');
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
    setActiveCompetitionId(null);

    (async () => {
      try {
        const duel = await getDuel(duelId);
        if (cancelled) return;
        if (duel.status !== 'active' && duel.status !== 'completed') {
          setError('Ce duel n est pas encore actif.');
          setPhase('error');
          return;
        }
        writeExerciseSettings(duel.exercise_id, duel.settings || {});
        setActiveDuelId(duel.id);

        const launchAt = duel.launch_at ? new Date(duel.launch_at).getTime() : Date.now();
        const waitMs = Math.max(0, launchAt - Date.now() - 3000);

        if (waitMs > 200) {
          setPhase('waiting');
          setWaitLabel('Duel synchronise — demarrage imminent...');
          await new Promise<void>((resolve) => {
            const t = nativeSetTimeout(() => resolve(), waitMs);
            if (cancelled) nativeClearTimeout(t);
          });
          if (cancelled) return;
        }

        // Align countdown so "go" hits near launch_at
        const remaining = Math.max(0, launchAt - Date.now());
        const startCount = remaining > 2500 ? 3 : remaining > 1500 ? 2 : 1;
        setCount(startCount);
        setPhase('countdown');
      } catch {
        if (!cancelled) {
          setError('Impossible de charger le duel.');
          setPhase('error');
        }
      }
    })();

    return () => {
      cancelled = true;
      setStadiumHold(false);
    };
  }, [duelId, duelCreate, exercise]);

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

  useEffect(() => {
    if (phase !== 'countdown') return;
    if (count > 0) {
      const t = nativeSetTimeout(() => setCount((c) => c - 1), 1000);
      return () => {
        nativeClearTimeout(t);
      };
    }
    const begin = Date.now();
    let cancelled = false;
    const reveal = () => {
      if (cancelled) return;
      if (started || Date.now() - begin > 4000) {
        setStadiumHold(false);
        setPhase('go');
        startExercisePresence();
        return;
      }
      nativeSetTimeout(reveal, 50);
    };
    reveal();
    return () => {
      cancelled = true;
    };
  }, [phase, count, started]);

  useEffect(() => {
    return () => {
      if (duelId) {
        stopExercisePresence();
      }
    };
  }, [duelId]);

  if (phase === 'idle') return <>{children}</>;

  if (phase === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#fbfaf9] px-4">
        <p className="text-[#37322f]">{error}</p>
        <Link href="/stadium?tab=duels" className="text-sm underline text-[#605a57]">
          Retour Duels
        </Link>
      </div>
    );
  }

  const mountTest = phase === 'countdown' || phase === 'go';
  const showOverlay =
    phase === 'loading' || phase === 'waiting' || phase === 'countdown';

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
          {phase === 'loading' || phase === 'waiting' ? (
            <p
              className="relative text-sm tracking-[0.3em] uppercase"
              style={{ color: 'rgba(251,250,249,0.55)' }}
            >
              {phase === 'waiting' ? waitLabel : 'Chargement duel...'}
            </p>
          ) : (
            <div className="relative flex flex-col items-center gap-10 px-6 text-center">
              <p
                className="text-xs sm:text-sm tracking-[0.45em] uppercase"
                style={{ color: 'rgba(251,250,249,0.45)' }}
              >
                Duel
              </p>
              <h1
                className="text-4xl sm:text-6xl font-bold leading-tight max-w-3xl"
                style={{
                  fontFamily: 'var(--font-playfair), Georgia, serif',
                  color: '#fbfaf9',
                }}
              >
                En garde
              </h1>
              <div
                key={count}
                className="text-8xl sm:text-9xl font-bold tabular-nums"
                style={{
                  fontFamily: 'var(--font-playfair), Georgia, serif',
                  color: '#fbfaf9',
                }}
              >
                {count > 0 ? count : '!'}
              </div>
            </div>
          )}
          <Link
            href="/stadium?tab=duels"
            className="absolute bottom-8 text-xs tracking-wide uppercase"
            style={{ color: 'rgba(251,250,249,0.4)' }}
            onClick={() => setActiveDuelId(null)}
          >
            Retour Duels
          </Link>
        </div>
      )}
    </>
  );
}

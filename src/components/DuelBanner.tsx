'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { getExerciseBySlug, EXERCISES } from '@/lib/data/exercises';
import { hashSettings } from '@/lib/stadium/competitions';
import {
  readExerciseSettings,
} from '@/lib/stadium/settingsKeys';
import { challengeDuel } from '@/lib/duels/api';

/**
 * Floating bar for Duel create mode (?duelCreate=1&opponentId=…).
 */
export default function DuelBanner({ slug }: { slug: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const duelCreate = searchParams.get('duelCreate') === '1';
  const opponentId = searchParams.get('opponentId');
  const duelId = searchParams.get('duelId');

  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const exercise =
    getExerciseBySlug(slug) ||
    EXERCISES.find((e) => e.slug === slug || e.id === slug) ||
    null;

  useEffect(() => {
    if (duelCreate && opponentId) {
      setMessage(
        'Mode duel : regle les Parametres du test, puis provoque ton ami.',
      );
    }
  }, [duelCreate, opponentId]);

  if (!duelCreate || !opponentId || duelId) return null;

  const challenge = async () => {
    if (!exercise) return;
    setBusy(true);
    setMessage(null);
    try {
      const settings = readExerciseSettings(exercise.id);
      const settingsHash = await hashSettings(settings);
      await challengeDuel(opponentId, exercise.id, settings, settingsHash);
      setMessage('Defi envoye ! En attente de l acceptation.');
      router.push('/stadium?tab=duels');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'not_friends') {
        setMessage('Tu dois etre ami avec cette personne.');
      } else if (msg === 'not_authenticated') {
        setMessage('Connecte-toi pour provoquer un duel.');
      } else {
        setMessage('Echec du defi. Verifie schema-friends-duels.sql.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-[min(560px,92vw)] -translate-x-1/2 rounded-xl border border-[#e0dedb] bg-white p-4 shadow-lg">
      <p className="text-sm text-[#37322f] mb-3">{message}</p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={busy || !exercise}
          onClick={() => void challenge()}
          style={{ backgroundColor: '#37322f', color: '#fbfaf9' }}
        >
          {busy ? 'Envoi...' : 'Provoquer en duel'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/stadium?tab=duels')}
        >
          Retour Duels
        </Button>
      </div>
    </div>
  );
}

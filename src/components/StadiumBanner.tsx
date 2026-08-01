'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { getExerciseBySlug, EXERCISES } from '@/lib/data/exercises';
import { createCompetition } from '@/lib/stadium/competitions';
import {
  readExerciseSettings,
  setActiveCompetitionId,
  EXERCISE_SETTINGS_KEYS,
} from '@/lib/stadium/settingsKeys';

/**
 * Floating bar for Stadium create mode only.
 * Play mode (competitionId) is handled by StadiumPlayGate (countdown + auto-start).
 */
export default function StadiumBanner({ slug }: { slug: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const stadiumCreate = searchParams.get('stadiumCreate') === '1';
  const competitionId = searchParams.get('competitionId');

  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const exercise =
    getExerciseBySlug(slug) ||
    EXERCISES.find((e) => e.slug === slug || e.id === slug) ||
    null;

  useEffect(() => {
    if (stadiumCreate) {
      setActiveCompetitionId(null);
      setMessage(
        'Mode creation Stadium : regle les Parametres du test (mode examen inclus), puis ouvre la competition.',
      );
    }
  }, [stadiumCreate]);

  if (!stadiumCreate || competitionId) return null;

  const openCompetition = async () => {
    if (!exercise) return;
    setBusy(true);
    setMessage(null);
    try {
      const settings = readExerciseSettings(exercise.id);
      if (!EXERCISE_SETTINGS_KEYS[exercise.id]) {
        // Exercises without settings still allowed with empty object
      }
      const created = await createCompetition(exercise.id, settings);
      setActiveCompetitionId(created.id);
      router.replace(
        `/exercices/${exercise.slug}?competitionId=${created.id}`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'competition_exists') {
        setMessage(
          'Une competition existe deja pour ce test avec les memes reglages.',
        );
      } else if (msg === 'not_authenticated') {
        setMessage('Connecte-toi pour ouvrir une competition.');
      } else {
        setMessage('Echec de creation. Verifie la config Supabase Stadium.');
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
          onClick={openCompetition}
          style={{ backgroundColor: '#37322f', color: '#fbfaf9' }}
        >
          {busy ? 'Ouverture...' : 'Ouvrir la competition'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setActiveCompetitionId(null);
            router.push('/stadium');
          }}
        >
          Retour Stadium
        </Button>
      </div>
    </div>
  );
}

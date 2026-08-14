'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { getExerciseBySlug, EXERCISES } from '@/lib/data/exercises';
import {
  createCompetition,
  getSpecialCompetition,
  isSpecialStadiumExercise,
} from '@/lib/stadium/competitions';
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

  const isSpecial = exercise ? isSpecialStadiumExercise(exercise.id) : false;

  useEffect(() => {
    if (!stadiumCreate || !exercise) return;
    setActiveCompetitionId(null);

    if (isSpecialStadiumExercise(exercise.id)) {
      setMessage(
        'Competition speciale : elle existe deja dans le Stadium. Tu ne peux pas en creer une.',
      );
      void (async () => {
        try {
          const existing = await getSpecialCompetition(exercise.id);
          if (existing) {
            setActiveCompetitionId(existing.id);
            router.replace(
              `/exercices/${exercise.slug}?competitionId=${existing.id}`,
            );
          }
        } catch {
          /* stay on banner */
        }
      })();
      return;
    }

    const hasSettings = Boolean(EXERCISE_SETTINGS_KEYS[exercise.id]);
    setMessage(
      hasSettings
        ? 'Mode creation Stadium : regle les Parametres du test (mode examen inclus), puis ouvre la competition.'
        : 'Mode creation Stadium : ce test n\'a pas de parametres. Ouvre la competition directement.',
    );
  }, [stadiumCreate, exercise, router]);

  if (!stadiumCreate || competitionId) return null;

  const openCompetition = async () => {
    if (!exercise || isSpecial) return;
    setBusy(true);
    setMessage(null);
    try {
      const settings = readExerciseSettings(exercise.id);
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
      } else if (msg === 'special_competition') {
        setMessage(
          'Competition speciale : impossible de la creer. Retourne au Stadium pour jouer.',
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
        {!isSpecial && (
          <Button
            type="button"
            disabled={busy || !exercise}
            onClick={openCompetition}
            style={{ backgroundColor: '#37322f', color: '#fbfaf9' }}
          >
            {busy ? 'Ouverture...' : 'Ouvrir la competition'}
          </Button>
        )}
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

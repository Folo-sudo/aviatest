'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { getExerciseBySlug, EXERCISES } from '@/lib/data/exercises';
import {
  createCompetition,
  getCompetition,
} from '@/lib/stadium/competitions';
import {
  readExerciseSettings,
  writeExerciseSettings,
  setActiveCompetitionId,
  EXERCISE_SETTINGS_KEYS,
} from '@/lib/stadium/settingsKeys';

/**
 * Floating bar on exercise pages for Stadium create / play modes.
 * - stadiumCreate=1: configure settings in the test, then open competition
 * - competitionId=...: lock settings from the competition and track scores
 */
export default function StadiumBanner({ slug }: { slug: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const stadiumCreate = searchParams.get('stadiumCreate') === '1';
  const competitionId = searchParams.get('competitionId');

  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  const exercise =
    getExerciseBySlug(slug) ||
    EXERCISES.find((e) => e.slug === slug || e.id === slug) ||
    null;

  useEffect(() => {
    if (!competitionId || !exercise) {
      setReady(true);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const competition = await getCompetition(competitionId);
        if (cancelled) return;
        if (!competition) {
          setMessage('Competition introuvable.');
          setReady(true);
          return;
        }
        writeExerciseSettings(
          competition.exercise_id,
          competition.settings || {},
        );
        setActiveCompetitionId(competition.id);
        setMessage(
          'Mode Stadium : reglages verrouilles. Ton meilleur score sera enregistre.',
        );
      } catch {
        if (!cancelled) setMessage('Impossible de charger la competition.');
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [competitionId, exercise]);

  useEffect(() => {
    if (stadiumCreate) {
      setActiveCompetitionId(null);
      setMessage(
        'Mode creation Stadium : regle les Parametres du test, puis ouvre la competition.',
      );
      setReady(true);
    }
  }, [stadiumCreate]);

  if (!stadiumCreate && !competitionId) return null;
  if (!ready && competitionId) {
    return (
      <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-[#e0dedb] bg-white px-4 py-3 text-sm text-[#605a57] shadow-lg">
        Chargement Stadium...
      </div>
    );
  }

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
      setMessage('Competition ouverte. Tu peux jouer maintenant.');
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
        {stadiumCreate && (
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

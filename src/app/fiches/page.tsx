'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import AuthGate from '@/components/AuthGate';
import { Button } from '@/components/ui/button';
import { FichesIcon } from '@/components/icons/FichesIcon';
import {
  EXERCISES,
  EXERCISE_TYPES,
  getDifficultyLabel,
  getExerciseUrl,
} from '@/lib/data/exercises';

import { useSiteTexts } from '@/lib/site-texts/useSiteTexts';

const styles = {
  background: '#fbfaf9',
  text: '#37322f',
  textMuted: '#605a57',
  border: '#e0dedb',
  cardBg: '#ffffff',
  shadow: '0 8px 24px rgba(55, 50, 47, 0.08)',
};

function FichesContent() {
  const { t } = useSiteTexts();
  const fiches = EXERCISES.filter(
    (exercise) =>
      exercise.ready &&
      (exercise.title.toLowerCase().includes('fiche') ||
        exercise.slug.toLowerCase().includes('fiche') ||
        exercise.id.toLowerCase().includes('fiche'))
  );

  return (
    <main className="min-h-screen" style={{ backgroundColor: styles.background }}>
      <header
        className="sticky top-0 z-40 border-b"
        style={{ backgroundColor: styles.background, borderColor: styles.border }}
      >
        <div className="container mx-auto flex items-center gap-3 px-4 py-4">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-1 h-4 w-4" /> Accueil
            </Button>
          </Link>
          <FichesIcon className="h-6 w-7" />
          <h1 className="text-lg font-bold" style={{ color: styles.text }}>
            Fiches
          </h1>
        </div>
      </header>

      <div className="container mx-auto max-w-2xl space-y-6 px-4 py-8">
        <p className="text-sm leading-relaxed" style={{ color: styles.textMuted }}>
          {t('fiches.intro')}
        </p>

        {fiches.length === 0 ? (
          <p className="text-sm" style={{ color: styles.textMuted }}>
            Aucune fiche disponible pour le moment.
          </p>
        ) : (
          <div className="space-y-3">
            {fiches.map((exercise) => {
              const type = EXERCISE_TYPES[exercise.primaryType];
              return (
                <Link
                  key={exercise.id}
                  href={getExerciseUrl(exercise)}
                  target="_blank"
                  className="block rounded-[22px] p-5 transition-transform hover:scale-[1.01]"
                  style={{
                    backgroundColor: styles.cardBg,
                    border: `1px solid ${styles.border}`,
                    boxShadow: styles.shadow,
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium" style={{ color: type.color }}>
                        {type.label}
                      </p>
                      <h2 className="mt-1 text-lg font-semibold" style={{ color: styles.text }}>
                        {exercise.title}
                      </h2>
                      <p
                        className="mt-2 text-sm leading-relaxed"
                        style={{ color: styles.textMuted }}
                      >
                        {exercise.description}
                      </p>
                      <p className="mt-3 text-xs" style={{ color: styles.textMuted }}>
                        {getDifficultyLabel(exercise.difficulty)} · ~{exercise.estimatedDuration}{' '}
                        min
                      </p>
                    </div>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0" style={{ color: styles.text }} />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

export default function FichesPage() {
  return (
    <AuthGate>
      <FichesContent />
    </AuthGate>
  );
}

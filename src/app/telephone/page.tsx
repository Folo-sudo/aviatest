'use client';

import Link from 'next/link';
import { ArrowLeft, ChevronRight, Smartphone } from 'lucide-react';
import { EXERCISES, EXERCISE_TYPES, type ExerciseType } from '@/lib/data/exercises';

const LANE_ORDER: ExerciseType[] = [
  'attention',
  'spatiale',
  'numerique',
  'verbal',
  'memorisation',
  'psychomoteur',
  'intellectuel',
  'anglais',
];

const ready = EXERCISES.filter((exercise) => exercise.ready);

export default function TelephonePage() {
  return (
    <main className="min-h-screen" style={{ backgroundColor: '#fbfaf9' }}>
      <header
        className="sticky top-0 z-50"
        style={{
          backgroundColor: 'rgba(251,250,249,0.92)',
          borderBottom: '1px solid #e0dedb',
          backdropFilter: 'blur(12px)',
          paddingTop: 'env(safe-area-inset-top)',
        }}
      >
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" style={{ color: '#37322f' }} />
            <span className="text-lg font-semibold tracking-tight" style={{ color: '#37322f' }}>
              AviaTest
            </span>
          </div>
          <Link
            href="/"
            className="flex min-h-11 items-center gap-1 text-sm"
            style={{ color: '#605a57' }}
          >
            <ArrowLeft className="h-4 w-4" />
            Accueil
          </Link>
        </div>
      </header>

      <div className="px-5 pb-16 pt-8" style={{ paddingBottom: 'max(4rem, env(safe-area-inset-bottom))' }}>
        <section className="mx-auto mb-10 max-w-lg">
          <p
            className="mb-2 text-xs font-medium uppercase tracking-[0.22em]"
            style={{ color: '#605a57' }}
          >
            Telephone
          </p>
          <h1
            className="font-[family-name:var(--font-playfair)] text-4xl leading-tight"
            style={{ color: '#37322f' }}
          >
            Tous les tests, penses pour le doigt.
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed" style={{ color: '#605a57' }}>
            Grands boutons, lecture claire, cadrans et grilles a la bonne taille.
            La meme exigence que sur ordinateur — sans le clavier.
          </p>
        </section>

        <div className="mx-auto max-w-lg space-y-10">
          {LANE_ORDER.map((type) => {
            const meta = EXERCISE_TYPES[type];
            const items = ready.filter((exercise) => exercise.primaryType === type);
            if (items.length === 0) return null;
            return (
              <section key={type}>
                <h2
                  className="mb-3 text-sm font-semibold uppercase tracking-wide"
                  style={{ color: '#37322f' }}
                >
                  {meta.label}
                </h2>
                <ul className="space-y-2">
                  {items.map((exercise) => (
                    <li key={`${type}-${exercise.slug}`}>
                      <Link
                        href={`/telephone/${exercise.slug}`}
                        className="flex min-h-14 items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 shadow-[0_8px_24px_rgba(55,50,47,0.06)]"
                        style={{ border: '1px solid #e0dedb' }}
                      >
                        <span className="text-[15px] font-medium" style={{ color: '#37322f' }}>
                          {exercise.title}
                        </span>
                        <ChevronRight className="h-4 w-4 shrink-0" style={{ color: '#605a57' }} />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}

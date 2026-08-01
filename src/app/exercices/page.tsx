import { Metadata } from 'next';
import Link from 'next/link';
import {
  EXERCISES,
  EXERCISE_TYPES,
  getDifficultyLabel,
} from '@/lib/data/exercises';
import StructuredData from '@/components/seo/StructuredData';
import { generateBreadcrumbStructuredData } from '@/lib/seo/structured-data';
import AuthGate from '@/components/AuthGate';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://psychotech-training.fr';

export const metadata: Metadata = {
  title: 'Exercices Psychotechniques - Entrainement Pilote',
  description:
    'Tous les exercices d\'entrainement aux tests psychotechniques pour les selections pilote. Attention, orientation spatiale, memoire, logique et plus.',
  keywords: [
    'exercices psychotechniques',
    'test pilote',
    'entrainement psychotechnique',
    'tests cognitifs aviation',
  ],
  alternates: {
    canonical: `${BASE_URL}/exercices`,
  },
  openGraph: {
    title: 'Exercices Psychotechniques - Entrainement Pilote',
    description:
      'Tous les exercices d\'entrainement aux tests psychotechniques pour les selections pilote.',
    url: `${BASE_URL}/exercices`,
  },
};

export default function ExercicesPage() {
  const readyExercises = EXERCISES.filter((e) => e.ready);

  const breadcrumbData = generateBreadcrumbStructuredData([
    { name: 'Accueil', url: BASE_URL },
    { name: 'Exercices', url: `${BASE_URL}/exercices` },
  ]);

  return (
    <AuthGate>
      <StructuredData data={breadcrumbData} />
      <main className="min-h-screen bg-[#fbfaf9]">
        <div className="container mx-auto px-4 py-12">
          {/* Breadcrumb */}
          <nav className="mb-8 text-sm text-[#605a57]">
            <Link href="/" className="hover:underline">
              Accueil
            </Link>
            <span className="mx-2">/</span>
            <span className="text-[#37322f]">Exercices</span>
          </nav>

          <h1 className="text-3xl font-bold text-[#37322f] mb-4">
            Exercices Psychotechniques
          </h1>
          <p className="text-[#605a57] mb-8 max-w-2xl">
            {readyExercises.length} exercices d&apos;entrainement couvrant
            l&apos;ensemble des competences evaluees lors des selections pilote
            de ligne.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {readyExercises.map((exercise) => {
              const primaryType = EXERCISE_TYPES[exercise.primaryType];

              const exerciseUrl = `/exercices/${exercise.slug}`;

              return (
                <Link key={exercise.id} href={exerciseUrl} target="_blank">
                  <article
                    className="h-full p-6 bg-white rounded-xl border border-[#e0dedb] hover:shadow-lg transition-shadow"
                    style={{ borderLeft: `4px solid ${primaryType.color}` }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span
                        className="text-xs font-medium px-2 py-1 rounded"
                        style={{
                          backgroundColor: primaryType.bgColor,
                          color: primaryType.color,
                        }}
                      >
                        {primaryType.label}
                      </span>
                      <span className="text-xs text-[#605a57]">
                        {getDifficultyLabel(exercise.difficulty)}
                      </span>
                    </div>
                    <h2 className="text-lg font-semibold text-[#37322f] mb-2">
                      {exercise.title}
                    </h2>
                    <p className="text-sm text-[#605a57] mb-3">
                      {exercise.description}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {exercise.types.slice(1).map((type) => (
                        <span
                          key={type}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-[#f5f4f3] text-[#605a57]"
                        >
                          {EXERCISE_TYPES[type].label}
                        </span>
                      ))}
                    </div>
                  </article>
                </Link>
              );
            })}
          </div>
        </div>
      </main>
    </AuthGate>
  );
}

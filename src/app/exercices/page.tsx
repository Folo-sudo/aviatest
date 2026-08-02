import { Metadata } from 'next';
import Link from 'next/link';
import {
  EXERCISES,
  EXERCISE_TYPES,
  getDifficultyLabel,
  getAllCompetitions,
  getExercisesByCompetition,
  type ExerciseType,
} from '@/lib/data/exercises';
import { isPhoneRequest } from '@/lib/device';
import {
  getExerciseMobileProfile,
  getPreferredExerciseHref,
  hasDedicatedMobileVariant,
} from '@/lib/exercises/mobile';
import StructuredData from '@/components/seo/StructuredData';
import { generateBreadcrumbStructuredData } from '@/lib/seo/structured-data';
import AuthGate from '@/components/AuthGate';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://psychotech-training.fr';

const VALID_TYPES = new Set<string>(Object.keys(EXERCISE_TYPES));

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

type Props = {
  searchParams: Promise<{ types?: string }>;
};

export default async function ExercicesPage({ searchParams }: Props) {
  const { types: typesParam } = await searchParams;
  const filterTypes = (typesParam ?? '')
    .split(',')
    .map((t) => t.trim())
    .filter((t): t is ExerciseType => VALID_TYPES.has(t));

  const readyExercises = EXERCISES.filter((e) => e.ready).filter((e) =>
    filterTypes.length === 0
      ? true
      : e.types.some((type) => filterTypes.includes(type))
  );
  const isPhone = await isPhoneRequest();
  const competitions = getAllCompetitions();
  const filterLabels = filterTypes.map((t) => EXERCISE_TYPES[t].label);

  const breadcrumbData = generateBreadcrumbStructuredData([
    { name: 'Accueil', url: BASE_URL },
    { name: 'Exercices', url: `${BASE_URL}/exercices` },
  ]);

  return (
    <AuthGate>
      <StructuredData data={breadcrumbData} />
      <main className="min-h-screen bg-[#fbfaf9]">
        <div className="container mx-auto px-4 py-12">
          <nav className="mb-8 text-sm text-[#605a57]">
            <Link href="/" className="hover:underline">
              Accueil
            </Link>
            <span className="mx-2">/</span>
            <span className="text-[#37322f]">Exercices</span>
          </nav>

          <section className="rounded-[30px] border border-[#e0dedb] bg-[linear-gradient(180deg,#fffaf3_0%,#ffffff_100%)] p-8 shadow-[0_12px_34px_rgba(55,50,47,0.08)]">
            <h1 className="max-w-3xl text-4xl font-bold leading-tight text-[#37322f] md:text-5xl">
              {filterTypes.length > 0
                ? `Categorie : ${filterLabels.join(' · ')}`
                : 'La bibliotheque complete des exercices, apres les bonnes portes d\'entree.'}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-[#605a57]">
              {filterTypes.length > 0
                ? `${readyExercises.length} exercice${readyExercises.length > 1 ? 's' : ''} dans cette categorie.`
                : 'Cette page sert quand tu sais deja ce que tu veux chercher. Pour une preparation plus guidee, passe d\'abord par les concours ou le Stadium.'}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              {filterTypes.length > 0 && (
                <Link
                  href="/exercices"
                  className="rounded-full border border-[#e0dedb] bg-white px-5 py-3 text-sm font-medium text-[#37322f]"
                >
                  Voir tous les tests
                </Link>
              )}
              <Link
                href="/concours"
                className="rounded-full border border-[#e0dedb] bg-white px-5 py-3 text-sm font-medium text-[#37322f]"
              >
                Entrer par concours
              </Link>
              <Link
                href="/stadium"
                className="rounded-full bg-[linear-gradient(135deg,#f59e0b_0%,#b45309_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(180,83,9,0.24)]"
              >
                Aller au Stadium
              </Link>
            </div>
          </section>

          {filterTypes.length === 0 && (
            <section className="mt-10 grid gap-4 md:grid-cols-3">
              {competitions.map((competition) => (
                <Link
                  key={competition.id}
                  href={`/concours/${competition.slug}`}
                  className="rounded-[24px] border border-[#e0dedb] bg-white p-5 shadow-[0_10px_30px_rgba(55,50,47,0.08)]"
                >
                  <p className="text-xs uppercase tracking-[0.24em] text-[#605a57]">{competition.organization}</p>
                  <h2 className="mt-3 text-2xl font-semibold text-[#37322f]">{competition.name}</h2>
                  <p className="mt-2 text-sm text-[#605a57]">
                    {getExercisesByCompetition(competition.id).length} exercices disponibles
                  </p>
                </Link>
              ))}
            </section>
          )}

          <div className="mb-8 mt-12 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-3xl font-semibold text-[#37322f]">
                {filterTypes.length > 0 ? 'Exercices de la categorie' : 'Tous les exercices'}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#605a57]">
                {readyExercises.length} exercice{readyExercises.length > 1 ? 's' : ''}
                {filterTypes.length === 0
                  ? ' couvrant l\'ensemble des competences evaluees lors des selections pilote de ligne.'
                  : '.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {readyExercises.map((exercise) => {
              const primaryType = EXERCISE_TYPES[exercise.primaryType];
              const mobileProfile = getExerciseMobileProfile(exercise.slug);
              const exerciseUrl = getPreferredExerciseHref(exercise.slug, isPhone);

              return (
                <Link key={exercise.id} href={exerciseUrl} target="_blank">
                  <article
                    className="h-full rounded-[24px] border border-[#e0dedb] bg-white p-6 transition-transform hover:scale-[1.012]"
                    style={{
                      borderLeft: `4px solid ${primaryType.color}`,
                      boxShadow: '0 8px 26px rgba(55,50,47,0.08)',
                    }}
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
                      <div className="flex items-center gap-2">
                        {isPhone && (
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded"
                            style={{
                              backgroundColor: hasDedicatedMobileVariant(exercise.slug)
                                ? '#dbeafe'
                                : mobileProfile.experience === 'responsive'
                                  ? '#ecfeff'
                                  : '#ffedd5',
                              color: hasDedicatedMobileVariant(exercise.slug)
                                ? '#1d4ed8'
                                : mobileProfile.experience === 'responsive'
                                  ? '#0f766e'
                                  : '#9a3412',
                            }}
                          >
                            {hasDedicatedMobileVariant(exercise.slug)
                              ? 'Mobile'
                              : mobileProfile.experience === 'responsive'
                                ? 'Compatible'
                                : 'A optimiser'}
                          </span>
                        )}
                        <span className="text-xs text-[#605a57]">
                          {getDifficultyLabel(exercise.difficulty)}
                        </span>
                      </div>
                    </div>
                    <h2 className="text-lg font-semibold text-[#37322f] mb-2">
                      {exercise.title}
                    </h2>
                    <p className="text-sm text-[#605a57] mb-3">
                      {isPhone ? mobileProfile.note : exercise.description}
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

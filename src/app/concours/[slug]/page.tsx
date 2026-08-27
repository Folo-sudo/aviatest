import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  getAllCompetitions,
  getCompetitionBySlug,
  getExercisesByCompetition,
  COMPETITION_TYPE_ORDER,
  getDifficultyLabel,
  groupExercisesByTypes,
  getExerciseUrl,
} from '@/lib/data/exercises';
import {
  generateCompetitionStructuredData,
  generateBreadcrumbStructuredData,
} from '@/lib/seo/structured-data';
import StructuredData from '@/components/seo/StructuredData';
import { ArrowLeft, ArrowRight, Clock, Trophy } from 'lucide-react';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://aviatest.fr';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllCompetitions().map((competition) => ({
    slug: competition.slug,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const competition = getCompetitionBySlug(slug);

  if (!competition) {
    return { title: 'Concours non trouve' };
  }

  return {
    title: competition.seoTitle,
    description: competition.seoDescription,
    keywords: competition.seoKeywords,
    alternates: {
      canonical: `${BASE_URL}/concours/${competition.slug}`,
    },
    openGraph: {
      title: competition.seoTitle,
      description: competition.seoDescription,
      type: 'website',
      url: `${BASE_URL}/concours/${competition.slug}`,
      siteName: 'AviaTest',
      locale: 'fr_FR',
    },
    twitter: {
      card: 'summary_large_image',
      title: competition.seoTitle,
      description: competition.seoDescription,
    },
  };
}

export default async function CompetitionPage({ params }: Props) {
  const { slug } = await params;
  const competition = getCompetitionBySlug(slug);

  if (!competition) {
    notFound();
  }

  const exercises = getExercisesByCompetition(competition.id);
  const typeOrder = COMPETITION_TYPE_ORDER[competition.id];
  const exercisesByType = groupExercisesByTypes(exercises, typeOrder);

  const structuredData = [
    generateCompetitionStructuredData(competition, exercises),
    generateBreadcrumbStructuredData([
      { name: 'Accueil', url: BASE_URL },
      { name: 'Concours', url: `${BASE_URL}/concours` },
      { name: competition.name, url: `${BASE_URL}/concours/${competition.slug}` },
    ]),
  ];

  const totalMinutes = exercises.reduce((acc, exercise) => acc + exercise.estimatedDuration, 0);
  const topBlock = exercisesByType[0];

  return (
    <>
      <StructuredData data={structuredData} />
      <main className="min-h-screen bg-[#fbfaf9]">
        <div className="container mx-auto px-4 py-12">
          <nav className="mb-8 flex items-center gap-2 text-sm text-[#605a57]">
            <Link href="/" className="hover:underline">Accueil</Link>
            <span>/</span>
            <Link href="/concours" className="hover:underline">Concours</Link>
            <span>/</span>
            <span className="text-[#37322f]">{competition.name}</span>
          </nav>

          <Link
            href="/concours"
            className="mb-6 inline-flex items-center gap-2 text-sm text-[#605a57] hover:text-[#37322f]"
          >
            <ArrowLeft className="h-4 w-4" />
            Tous les concours
          </Link>

          <section className="rounded-[30px] border border-[#e0dedb] bg-[linear-gradient(180deg,#fffaf3_0%,#ffffff_100%)] p-8 shadow-[0_12px_34px_rgba(55,50,47,0.08)]">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
              <div className="max-w-3xl">
                <p className="text-xs uppercase tracking-[0.26em] text-[#605a57]">
                  {competition.organization}
                </p>
                <h1 className="mt-3 text-4xl font-bold leading-tight text-[#37322f] md:text-5xl">
                  {competition.fullName}
                </h1>
                <p className="mt-5 text-lg leading-relaxed text-[#605a57]">
                  {competition.description}
                </p>
                {topBlock && (
                  <p className="mt-5 text-sm font-medium text-[#37322f]">
                    Bloc prioritaire a l&apos;ouverture : {topBlock.config.label.toLowerCase()}.
                  </p>
                )}
              </div>
              <div className="grid w-full gap-3 sm:grid-cols-2 xl:w-[360px] xl:grid-cols-1">
                <Link
                  href="/enchainement"
                  className="rounded-[24px] border border-[#e0dedb] bg-[#37322f] px-5 py-5 text-[#fbfaf9] shadow-[0_12px_28px_rgba(55,50,47,0.16)]"
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Enchaînement</h2>
                  </div>
                  <p className="mt-2 text-sm text-white/80">
                    Plusieurs tests, chacun ses réglages, sans pause entre les deux.
                  </p>
                </Link>
                <Link
                  href="/stadium"
                  className="rounded-[24px] bg-[linear-gradient(135deg,#f59e0b_0%,#b45309_100%)] px-5 py-5 text-white shadow-[0_16px_36px_rgba(180,83,9,0.24)]"
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Stadium</h2>
                    <Trophy className="h-5 w-5" />
                  </div>
                  <p className="mt-2 text-sm text-white/85">
                    Passe de la lecture de batterie a l&apos;entrainement plus intense.
                  </p>
                </Link>
                <div className="rounded-[24px] border border-[#e0dedb] bg-white px-5 py-5">
                  <p className="text-sm font-medium text-[#37322f]">Vue d&apos;ensemble</p>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-center">
                    <div className="rounded-2xl bg-[#f8f5f2] px-3 py-3">
                      <p className="text-2xl font-semibold text-[#37322f]">{exercises.length}</p>
                      <p className="mt-1 text-xs text-[#605a57]">tests</p>
                    </div>
                    <div className="rounded-2xl bg-[#f8f5f2] px-3 py-3">
                      <p className="text-2xl font-semibold text-[#37322f]">{totalMinutes}</p>
                      <p className="mt-1 text-xs text-[#605a57]">min cumulées</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-10">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-[#37322f]">Par blocs prioritaires</h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#605a57]">
                Cette page n&apos;empile plus simplement les tests. Elle fait ressortir les blocs cognitifs les plus utiles pour ce concours.
              </p>
            </div>

            <div className="grid gap-6 xl:grid-cols-3">
              {exercisesByType.map(({ type, config, exercises: typeExercises }) => (
                <article
                  key={type}
                  className="rounded-[26px] border border-[#e0dedb] bg-white p-5 shadow-[0_10px_30px_rgba(55,50,47,0.08)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div
                        className="inline-flex rounded-full px-3 py-1 text-xs font-medium"
                        style={{ backgroundColor: config.bgColor, color: config.color }}
                      >
                        {typeExercises.length} exercice{typeExercises.length > 1 ? 's' : ''}
                      </div>
                      <h3 className="mt-3 text-xl font-semibold text-[#37322f]">{config.label}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-[#605a57]">
                        {config.description}
                      </p>
                    </div>
                  </div>
                  <div className="mt-5 space-y-2">
                    {typeExercises.slice(0, 5).map((exercise) => (
                      <Link
                        key={`${type}-${exercise.id}`}
                        href={getExerciseUrl(exercise)}
                        target="_blank"
                        className="flex items-center justify-between rounded-2xl px-3 py-3"
                        style={{ backgroundColor: config.bgColor }}
                      >
                        <div>
                          <p className="text-sm font-medium text-[#37322f]">{exercise.title}</p>
                          <p className="mt-1 text-xs text-[#605a57]">{getDifficultyLabel(exercise.difficulty)}</p>
                        </div>
                        <ArrowRight className="h-4 w-4 shrink-0" style={{ color: config.color }} />
                      </Link>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="mt-12">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-[#37322f]">Bibliotheque detaillee du concours</h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#605a57]">
                Quand tu veux tout voir, tu retrouves l&apos;ensemble des exercices, mais sans perdre la logique de priorite.
              </p>
            </div>

            <div className="space-y-10">
              {exercisesByType.map(({ type, config, exercises: typeExercises }) => (
                <section key={`detail-${type}`}>
                  <div className="mb-5 flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: config.color }} />
                    <h3 className="text-xl font-semibold text-[#37322f]">{config.label}</h3>
                    <span className="text-sm text-[#605a57]">
                      {typeExercises.length} exercice{typeExercises.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {typeExercises.map((exercise) => (
                      <Link key={exercise.id} href={getExerciseUrl(exercise)} target="_blank" className="block h-full">
                        <article
                          className="h-full rounded-[24px] border border-[#e0dedb] bg-white p-5 transition-transform hover:scale-[1.012]"
                          style={{ boxShadow: '0 8px 26px rgba(55,50,47,0.08)' }}
                        >
                          <div className="mb-3 flex items-center justify-between">
                            <span
                              className="rounded-full px-3 py-1 text-xs font-medium"
                              style={{ backgroundColor: config.bgColor, color: config.color }}
                            >
                              {getDifficultyLabel(exercise.difficulty)}
                            </span>
                            <span className="inline-flex items-center gap-1 text-xs text-[#605a57]">
                              <Clock className="h-3 w-3" />
                              {exercise.estimatedDuration} min
                            </span>
                          </div>
                          <h4 className="text-lg font-semibold text-[#37322f]">{exercise.title}</h4>
                          <p className="mt-3 text-sm leading-relaxed text-[#605a57]">
                            {exercise.description}
                          </p>
                        </article>
                      </Link>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}

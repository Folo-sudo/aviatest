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
import { ArrowLeft, Clock } from 'lucide-react';

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

  return (
    <>
      <StructuredData data={structuredData} />
      <main className="min-h-screen bg-[#fbfaf9]">
        <div className="container mx-auto px-4 py-12">
          {/* Breadcrumb */}
          <nav className="mb-8 text-sm text-[#605a57]">
            <Link href="/" className="hover:underline">
              Accueil
            </Link>
            <span className="mx-2">/</span>
            <Link href="/concours" className="hover:underline">
              Concours
            </Link>
            <span className="mx-2">/</span>
            <span className="text-[#37322f]">{competition.name}</span>
          </nav>

          {/* Back link */}
          <Link
            href="/concours"
            className="inline-flex items-center gap-2 text-sm text-[#605a57] hover:text-[#37322f] mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Tous les concours
          </Link>

          {/* Header */}
          <header className="mb-12">
            <span className="text-sm font-medium text-[#605a57] mb-2 block">
              {competition.organization}
            </span>
            <h1 className="text-4xl font-bold text-[#37322f] mb-4">
              {competition.fullName}
            </h1>
            <p className="text-lg text-[#605a57] max-w-3xl">
              {competition.description}
            </p>
          </header>

          {/* Stats */}
          <div className="bg-white rounded-xl border border-[#e0dedb] p-6 mb-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <span className="block text-3xl font-bold text-[#37322f]">
                  {exercises.length}
                </span>
                <span className="text-sm text-[#605a57]">Exercices</span>
              </div>
              <div className="text-center">
                <span className="block text-3xl font-bold text-[#37322f]">
                  {exercisesByType.length}
                </span>
                <span className="text-sm text-[#605a57]">Categories</span>
              </div>
              <div className="text-center">
                <span className="block text-3xl font-bold text-[#37322f]">
                  {exercises.reduce((acc, e) => acc + e.estimatedDuration, 0)}
                </span>
                <span className="text-sm text-[#605a57]">Minutes total</span>
              </div>
              <div className="text-center">
                <span className="block text-3xl font-bold text-[#10B981]">
                  Gratuit
                </span>
                <span className="text-sm text-[#605a57]">Acces illimite</span>
              </div>
            </div>
          </div>

          {/* Aptitude cards (Pilotest-style) */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-14">
            {exercisesByType.map(({ type, config, exercises: typeExercises }) => (
              <div
                key={type}
                className="rounded-xl overflow-hidden bg-white border border-[#e0dedb]"
              >
                <div
                  className="flex items-center justify-between px-5 py-4 border-b border-[#e0dedb]"
                  style={{ backgroundColor: config.bgColor }}
                >
                  <h2 className="text-lg font-semibold" style={{ color: config.color }}>
                    {config.label}
                  </h2>
                  <span
                    className="text-xs font-medium px-2 py-1 rounded-full bg-white"
                    style={{ color: config.color }}
                  >
                    {typeExercises.length}
                  </span>
                </div>
                <ul className="p-4 space-y-1">
                  {typeExercises.map((exercise) => (
                    <li key={`${type}-${exercise.id}`}>
                      <Link
                        href={getExerciseUrl(exercise)}
                        target="_blank"
                        className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm text-[#37322f] hover:opacity-90"
                        style={{ backgroundColor: 'transparent' }}
                      >
                        <span className="font-medium">{exercise.title}</span>
                        <span className="text-xs text-[#605a57] shrink-0">
                          {getDifficultyLabel(exercise.difficulty)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Detailed exercise cards */}
          {exercisesByType.map(({ type, config, exercises: typeExercises }) => (
            <section key={`detail-${type}`} className="mb-10">
              <div className="flex items-center gap-3 mb-6">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: config.color }}
                />
                <h2 className="text-xl font-bold text-[#37322f]">
                  {config.label}
                </h2>
                <span className="text-sm text-[#605a57]">
                  ({typeExercises.length} exercice
                  {typeExercises.length > 1 ? 's' : ''})
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {typeExercises.map((exercise) => {
                  const exerciseUrl = getExerciseUrl(exercise);

                  return (
                    <Link key={exercise.id} href={exerciseUrl} target="_blank">
                      <article
                        className="h-full bg-white rounded-xl border border-[#e0dedb] hover:shadow-lg transition-all hover:scale-[1.02] p-6"
                        style={{ borderLeft: `4px solid ${config.color}` }}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span
                            className="text-xs font-medium px-2 py-1 rounded"
                            style={{
                              backgroundColor: config.bgColor,
                              color: config.color,
                            }}
                          >
                            {getDifficultyLabel(exercise.difficulty)}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-[#605a57]">
                            <Clock className="h-3 w-3" />
                            {exercise.estimatedDuration} min
                          </span>
                        </div>
                        <h3 className="text-lg font-semibold text-[#37322f] mb-2">
                          {exercise.title}
                        </h3>
                        <p className="text-sm text-[#605a57]">
                          {exercise.description}
                        </p>
                      </article>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </main>
    </>
  );
}

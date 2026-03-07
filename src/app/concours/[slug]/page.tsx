import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  getAllCompetitions,
  getCompetitionBySlug,
  getExercisesByCompetition,
  EXERCISE_TYPES,
  getDifficultyLabel,
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

  const structuredData = [
    generateCompetitionStructuredData(competition, exercises),
    generateBreadcrumbStructuredData([
      { name: 'Accueil', url: BASE_URL },
      { name: 'Concours', url: `${BASE_URL}/concours` },
      { name: competition.name, url: `${BASE_URL}/concours/${competition.slug}` },
    ]),
  ];

  // Group exercises by primary type
  const exercisesByType = exercises.reduce(
    (acc, exercise) => {
      const type = exercise.primaryType;
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(exercise);
      return acc;
    },
    {} as Record<string, typeof exercises>
  );

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
                  {Object.keys(exercisesByType).length}
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

          {/* Exercises by type */}
          {Object.entries(exercisesByType).map(([type, typeExercises]) => {
            const typeConfig = EXERCISE_TYPES[type as keyof typeof EXERCISE_TYPES];

            return (
              <section key={type} className="mb-10">
                <div className="flex items-center gap-3 mb-6">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: typeConfig.color }}
                  />
                  <h2 className="text-xl font-bold text-[#37322f]">
                    {typeConfig.label}
                  </h2>
                  <span className="text-sm text-[#605a57]">
                    ({typeExercises.length} exercice
                    {typeExercises.length > 1 ? 's' : ''})
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {typeExercises.map((exercise) => {
                    // Build exercise URL
                    let exerciseUrl = `/exercices/${exercise.slug}`;
                    if (exercise.id === 'm2-back') {
                      exerciseUrl = '/exercices/m-back?n=2';
                    } else if (exercise.id === 'm3-back') {
                      exerciseUrl = '/exercices/m-back?n=3';
                    }

                    return (
                      <Link key={exercise.id} href={exerciseUrl} target="_blank">
                        <article
                          className="h-full bg-white rounded-xl border border-[#e0dedb] hover:shadow-lg transition-all hover:scale-[1.02] p-6"
                          style={{ borderLeft: `4px solid ${typeConfig.color}` }}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <span
                              className="text-xs font-medium px-2 py-1 rounded"
                              style={{
                                backgroundColor: typeConfig.bgColor,
                                color: typeConfig.color,
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
            );
          })}
        </div>
      </main>
    </>
  );
}

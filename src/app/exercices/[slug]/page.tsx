import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { EXERCISES, getExerciseBySlug } from '@/lib/data/exercises';
import { generateExerciseStructuredData, generateBreadcrumbStructuredData } from '@/lib/seo/structured-data';
import StructuredData from '@/components/seo/StructuredData';
import ExerciseClient from './ExerciseClient';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://aviatest.fr';

interface Props {
  params: Promise<{ slug: string }>;
}

// Generate static params for all exercises (except m-back which uses query params)
export async function generateStaticParams() {
  return EXERCISES
    .filter((e) => e.ready && !e.id.includes('m2-back') && !e.id.includes('m3-back'))
    .map((exercise) => ({
      slug: exercise.slug,
    }));
}

// Dynamic metadata generation
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const exercise = getExerciseBySlug(slug);

  if (!exercise) {
    return { title: 'Exercice non trouve' };
  }

  return {
    title: exercise.seoTitle,
    description: exercise.seoDescription,
    keywords: exercise.seoKeywords,
    alternates: {
      canonical: `${BASE_URL}/exercices/${exercise.slug}`,
    },
    openGraph: {
      title: exercise.seoTitle,
      description: exercise.seoDescription,
      type: 'website',
      url: `${BASE_URL}/exercices/${exercise.slug}`,
      siteName: 'AviaTest',
      locale: 'fr_FR',
    },
    twitter: {
      card: 'summary_large_image',
      title: exercise.seoTitle,
      description: exercise.seoDescription,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function ExercisePage({ params }: Props) {
  const { slug } = await params;

  // Handle m-back special case - it's served at /exercices/m-back with query params
  // The slug 'm-back' is valid but doesn't have an exercise config
  const validSlugs = ['m-back', ...EXERCISES.map(e => e.slug)];

  if (!validSlugs.includes(slug)) {
    notFound();
  }

  const exercise = getExerciseBySlug(slug);

  // For m-back, we don't have a direct slug match, so we skip structured data
  const structuredData = exercise ? [
    generateExerciseStructuredData(exercise),
    generateBreadcrumbStructuredData([
      { name: 'Accueil', url: BASE_URL },
      { name: 'Exercices', url: `${BASE_URL}/exercices` },
      { name: exercise.title, url: `${BASE_URL}/exercices/${exercise.slug}` },
    ]),
  ] : [];

  return (
    <>
      {structuredData.length > 0 && <StructuredData data={structuredData} />}
      <ExerciseClient slug={slug} />
    </>
  );
}

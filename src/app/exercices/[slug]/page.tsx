import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getExerciseBySlug } from '@/lib/data/exercises';
import { isPhoneRequest } from '@/lib/device';
import {
  getAllExerciseSlugs,
  getCanonicalExerciseSlug,
  getExerciseConfigForSlug,
  isKnownExerciseSlug,
} from '@/lib/exercises/mobile';
import { generateExerciseStructuredData, generateBreadcrumbStructuredData } from '@/lib/seo/structured-data';
import StructuredData from '@/components/seo/StructuredData';
import ExerciseClient from './ExerciseClient';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://aviatest.fr';

interface Props {
  params: Promise<{ slug: string }>;
}

// Generate static params for all exercises
export async function generateStaticParams() {
  return getAllExerciseSlugs().map((slug) => ({ slug }));
}

// Dynamic metadata generation
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const exercise = getExerciseConfigForSlug(slug);

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
  if (!isKnownExerciseSlug(slug)) {
    notFound();
  }

  const exercise = getExerciseBySlug(getCanonicalExerciseSlug(slug));
  const isPhone = await isPhoneRequest();

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
      <ExerciseClient slug={slug} isPhone={isPhone} />
    </>
  );
}

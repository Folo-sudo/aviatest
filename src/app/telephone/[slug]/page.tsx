import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getExerciseConfigForSlug, getAllExerciseSlugs, isKnownExerciseSlug } from '@/lib/exercises/mobile';
import MobileExerciseClient from './MobileExerciseClient';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllExerciseSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const exercise = getExerciseConfigForSlug(slug);
  const title = exercise?.title ?? 'Exercice Mobile';

  return {
    title: `${title} | AviaTest`,
    description: `Version mobile optimisee de l'exercice ${title} pour la preparation aux tests psychotechniques pilote.`,
    robots: { index: false, follow: false },
  };
}

export default async function MobileExercisePage({ params }: Props) {
  const { slug } = await params;

  if (!isKnownExerciseSlug(slug)) {
    notFound();
  }

  return <MobileExerciseClient slug={slug} />;
}

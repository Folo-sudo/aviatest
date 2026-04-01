import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import MobileExerciseClient from './MobileExerciseClient';

const VALID_SLUGS = ['calcul-mental', 'calcul-mental-2', 'calcul-mental-3', 'fiche-angles'];

const EXERCISE_TITLES: Record<string, string> = {
  'calcul-mental': 'Calcul Mental - Mobile',
  'calcul-mental-2': 'Calcul Mental 2 - Mobile',
  'calcul-mental-3': 'Calcul Mental 3 - Mobile',
  'fiche-angles': 'Fiche Angles - Mobile',
};

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return VALID_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const title = EXERCISE_TITLES[slug] || 'Exercice Mobile';

  return {
    title: `${title} | AviaTest`,
    description: `Version mobile optimisee de l'exercice ${title} pour la preparation aux tests psychotechniques pilote.`,
    robots: { index: false, follow: false },
  };
}

export default async function MobileExercisePage({ params }: Props) {
  const { slug } = await params;

  if (!VALID_SLUGS.includes(slug)) {
    notFound();
  }

  return <MobileExerciseClient slug={slug} />;
}

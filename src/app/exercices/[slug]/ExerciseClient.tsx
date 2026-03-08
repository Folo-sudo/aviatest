'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import dynamic from 'next/dynamic';

// Dynamic imports for all exercise components
const ClockAngleTest = dynamic(
  () => import('@/components/exercises/ClockAngleTest'),
  { ssr: false }
);
const PairImpairTest = dynamic(
  () => import('@/components/exercises/PairImpairTest'),
  { ssr: false }
);
const UnMotSurDeuxTest = dynamic(
  () => import('@/components/exercises/UnMotSurDeuxTest'),
  { ssr: false }
);
const ShapesColorsTest = dynamic(
  () => import('@/components/exercises/ShapesColorsTest'),
  { ssr: false }
);
const BillesTest = dynamic(() => import('@/components/exercises/BillesTest'), {
  ssr: false,
});
const MBackTest = dynamic(() => import('@/components/exercises/MBackTest'), {
  ssr: false,
});
const MentalRotationTest = dynamic(
  () => import('@/components/exercises/MentalRotationTest'),
  { ssr: false }
);
const CalculMemoTest = dynamic(
  () => import('@/components/exercises/CalculMemoTest'),
  { ssr: false }
);
const CalculMentalTest = dynamic(
  () => import('@/components/exercises/CalculMentalTest'),
  { ssr: false }
);

// Map slug to component
const exerciseComponents: Record<string, React.ComponentType<{ n?: number }>> = {
  'angles-horloge': ClockAngleTest,
  'pair-impair': PairImpairTest,
  'un-mot-sur-deux': UnMotSurDeuxTest,
  'formes-couleurs': ShapesColorsTest,
  'jeu-des-billes': BillesTest,
  'm-back': MBackTest,
  'rotation-mentale-3d': MentalRotationTest,
  'calcul-memorisation': CalculMemoTest,
  'calcul-mental': CalculMentalTest,
};

function ExerciseLoader({ slug }: { slug: string }) {
  const searchParams = useSearchParams();
  const n = searchParams.get('n');

  const Component = exerciseComponents[slug];

  if (!Component) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fbfaf9]">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[#37322f] mb-2">
            Exercice non trouve
          </h1>
          <p className="text-[#605a57]">
            L&apos;exercice demande n&apos;existe pas.
          </p>
        </div>
      </div>
    );
  }

  // Special case for m-back with n parameter
  if (slug === 'm-back' && n) {
    return <Component n={parseInt(n, 10)} />;
  }

  return <Component />;
}

export default function ExerciseClient({ slug }: { slug: string }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#fbfaf9]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#37322f] mx-auto mb-4" />
            <p className="text-[#605a57]">Chargement de l&apos;exercice...</p>
          </div>
        </div>
      }
    >
      <ExerciseLoader slug={slug} />
    </Suspense>
  );
}

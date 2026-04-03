'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';

const CalculMentalMobile = dynamic(
  () => import('@/components/exercises/mobile/CalculMentalMobile'),
  { ssr: false }
);
const CalculMental2Mobile = dynamic(
  () => import('@/components/exercises/mobile/CalculMental2Mobile'),
  { ssr: false }
);
const CalculMental3Mobile = dynamic(
  () => import('@/components/exercises/mobile/CalculMental3Mobile'),
  { ssr: false }
);
const FicheAngleMobile = dynamic(
  () => import('@/components/exercises/mobile/FicheAngleMobile'),
  { ssr: false }
);
const GlossaireAngleMobile = dynamic(
  () => import('@/components/exercises/mobile/GlossaireAngleMobile'),
  { ssr: false }
);

const mobileComponents: Record<string, React.ComponentType> = {
  'calcul-mental': CalculMentalMobile,
  'calcul-mental-2': CalculMental2Mobile,
  'calcul-mental-3': CalculMental3Mobile,
  'fiche-angles': FicheAngleMobile,
  'glossaire-angles': GlossaireAngleMobile,
};

function MobileExerciseLoader({ slug }: { slug: string }) {
  const Component = mobileComponents[slug];

  if (!Component) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#fbfaf9' }}>
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2" style={{ color: '#37322f' }}>
            Exercice non trouve
          </h1>
          <p style={{ color: '#605a57' }}>
            L&apos;exercice demande n&apos;existe pas en version mobile.
          </p>
        </div>
      </div>
    );
  }

  return <Component />;
}

export default function MobileExerciseClient({ slug }: { slug: string }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#fbfaf9' }}>
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-700 mx-auto mb-4" />
            <p style={{ color: '#605a57' }}>Chargement...</p>
          </div>
        </div>
      }
    >
      <MobileExerciseLoader slug={slug} />
    </Suspense>
  );
}

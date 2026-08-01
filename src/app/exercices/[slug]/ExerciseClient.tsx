'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import AuthGate from '@/components/AuthGate';
import StadiumBanner from '@/components/StadiumBanner';

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
const Attention3Test = dynamic(
  () => import('@/components/exercises/Attention3Test'),
  { ssr: false }
);
const FicheAngleTest = dynamic(
  () => import('@/components/exercises/FicheAngleTest'),
  { ssr: false }
);
const CalculMental2Test = dynamic(
  () => import('@/components/exercises/CalculMental2Test'),
  { ssr: false }
);
const CalculMental3Test = dynamic(
  () => import('@/components/exercises/CalculMental3Test'),
  { ssr: false }
);
const FicheCalculTest = dynamic(
  () => import('@/components/exercises/FicheCalculTest'),
  { ssr: false }
);
const GlossaireAngleTest = dynamic(
  () => import('@/components/exercises/GlossaireAngleTest'),
  { ssr: false }
);
const CompteurTest = dynamic(
  () => import('@/components/exercises/CompteurTest'),
  { ssr: false }
);
const QuadrilogieAnglesTest = dynamic(
  () => import('@/components/exercises/QuadrilogieAnglesTest'),
  { ssr: false }
);
const AnglesMontresTest = dynamic(
  () => import('@/components/exercises/AnglesMontresTest'),
  { ssr: false }
);
const PsychomoteurPsy0Test = dynamic(
  () => import('@/components/exercises/PsychomoteurPsy0Test'),
  { ssr: false }
);
const AirwaysTest = dynamic(
  () => import('@/components/exercises/AirwaysTest'),
  { ssr: false }
);
const EmpilementsTest = dynamic(
  () => import('@/components/exercises/EmpilementsTest'),
  { ssr: false }
);
const Objets3DTest = dynamic(
  () => import('@/components/exercises/Objets3DTest'),
  { ssr: false }
);
const FormesGlisseesTest = dynamic(
  () => import('@/components/exercises/FormesGlisseesTest'),
  { ssr: false }
);
const CubesPsy0Test = dynamic(
  () => import('@/components/exercises/CubesPsy0Test'),
  { ssr: false }
);
const GrillesCalculsTest = dynamic(
  () => import('@/components/exercises/GrillesCalculsTest'),
  { ssr: false }
);
const BoitesMotsTest = dynamic(
  () => import('@/components/exercises/BoitesMotsTest'),
  { ssr: false }
);
const MotsEnEtoileTest = dynamic(
  () => import('@/components/exercises/MotsEnEtoileTest'),
  { ssr: false }
);
const SeriesLogiquesTest = dynamic(
  () => import('@/components/exercises/SeriesLogiquesTest'),
  { ssr: false }
);
const AnglaisPsy0Test = dynamic(
  () => import('@/components/exercises/AnglaisPsy0Test'),
  { ssr: false }
);
const CalculMental4Test = dynamic(
  () => import('@/components/exercises/CalculMental4Test'),
  { ssr: false }
);
const Attention1Test = dynamic(
  () => import('@/components/exercises/Attention1Test'),
  { ssr: false }
);
const Attention2Test = dynamic(
  () => import('@/components/exercises/Attention2Test'),
  { ssr: false }
);
const MathematiquesTest = dynamic(
  () => import('@/components/exercises/MathematiquesTest'),
  { ssr: false }
);
const EfgTest = dynamic(() => import('@/components/exercises/EfgTest'), {
  ssr: false,
});
const TangramTest = dynamic(() => import('@/components/exercises/TangramTest'), {
  ssr: false,
});
const SpatialOrientationTest = dynamic(
  () => import('@/components/exercises/SpatialOrientationTest'),
  { ssr: false }
);
const CubesPsy1Test = dynamic(
  () => import('@/components/exercises/CubesPsy1Test'),
  { ssr: false }
);
const VoituresBasicTest = dynamic(
  () => import('@/components/exercises/VoituresBasicTest'),
  { ssr: false }
);
const VoituresSeqTest = dynamic(
  () => import('@/components/exercises/VoituresSeqTest'),
  { ssr: false }
);
const MatricesRavenTest = dynamic(
  () => import('@/components/exercises/MatricesRavenTest'),
  { ssr: false }
);
const LectureTextesTest = dynamic(
  () => import('@/components/exercises/LectureTextesTest'),
  { ssr: false }
);
const PsychomoteurEnacTest = dynamic(
  () => import('@/components/exercises/PsychomoteurEnacTest'),
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
  'memory-back': MBackTest,
  'rotation-mentale-3d': MentalRotationTest,
  'calcul-memorisation': CalculMemoTest,
  'calcul-mental': CalculMentalTest,
  'calcul-mental-2': CalculMental2Test,
  'attention-3': Attention3Test,
  'fiche-angles': FicheAngleTest,
  'fiche-calcul': FicheCalculTest,
  'calcul-mental-3': CalculMental3Test,
  'glossaire-angles': GlossaireAngleTest,
  'compteurs': CompteurTest,
  'quadrilogie-angles': QuadrilogieAnglesTest,
  'angles-montres': AnglesMontresTest,
  'psychomoteur-psy0': PsychomoteurPsy0Test,
  airways: AirwaysTest,
  empilements: EmpilementsTest,
  'objets-3d': Objets3DTest,
  'formes-glissees': FormesGlisseesTest,
  'cubes-psy0': CubesPsy0Test,
  'grilles-calculs': GrillesCalculsTest,
  'boites-mots': BoitesMotsTest,
  'mots-en-etoile': MotsEnEtoileTest,
  'series-logiques': SeriesLogiquesTest,
  'anglais-psy0': AnglaisPsy0Test,
  'calcul-mental-4': CalculMental4Test,
  'attention-1': Attention1Test,
  'attention-2': Attention2Test,
  mathematiques: MathematiquesTest,
  efg: EfgTest,
  tangram: TangramTest,
  'spatial-orientation': SpatialOrientationTest,
  'cubes-psy1': CubesPsy1Test,
  'voitures-basic': VoituresBasicTest,
  'voitures-sequentiel': VoituresSeqTest,
  'matrices-raven': MatricesRavenTest,
  'lecture-textes': LectureTextesTest,
  'psychomoteur-enac': PsychomoteurEnacTest,
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

  // Special case for m-back / memory-back with n query param (legacy deep links)
  if ((slug === 'm-back' || slug === 'memory-back') && n) {
    return <Component n={parseInt(n, 10)} />;
  }

  return <Component />;
}

export default function ExerciseClient({ slug }: { slug: string }) {
  return (
    <AuthGate>
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
        <StadiumBanner slug={slug} />
        <ExerciseLoader slug={slug} />
      </Suspense>
    </AuthGate>
  );
}

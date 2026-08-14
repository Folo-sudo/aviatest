'use client';

import type { ComponentType } from 'react';
import dynamic from 'next/dynamic';
import {
  getCanonicalExerciseSlug,
  getExerciseMobileProfile,
  hasDedicatedMobileVariant,
  type MobileExperience,
} from '@/lib/exercises/mobile';

type ExerciseComponent = ComponentType<{ n?: number }>;
export type ExerciseVariant = 'auto' | 'desktop' | 'mobile';

export const desktopComponents: Record<string, ExerciseComponent> = {
  'angles-horloge': dynamic(() => import('@/components/exercises/ClockAngleTest'), { ssr: false }),
  'pair-impair': dynamic(() => import('@/components/exercises/PairImpairTest'), { ssr: false }),
  'un-mot-sur-deux': dynamic(() => import('@/components/exercises/UnMotSurDeuxTest'), { ssr: false }),
  'formes-couleurs': dynamic(() => import('@/components/exercises/ShapesColorsTest'), { ssr: false }),
  'jeu-des-billes': dynamic(() => import('@/components/exercises/BillesTest'), { ssr: false }),
  'm-back': dynamic(() => import('@/components/exercises/MBackTest'), { ssr: false }),
  'memory-back': dynamic(() => import('@/components/exercises/MBackTest'), { ssr: false }),
  'rotation-mentale-3d': dynamic(() => import('@/components/exercises/MentalRotationTest'), { ssr: false }),
  'calcul-memorisation': dynamic(() => import('@/components/exercises/CalculMemoTest'), { ssr: false }),
  'calcul-mental': dynamic(() => import('@/components/exercises/CalculMentalTest'), { ssr: false }),
  'attention-3': dynamic(() => import('@/components/exercises/Attention3Test'), { ssr: false }),
  'fiche-angles': dynamic(() => import('@/components/exercises/FicheAngleTest'), { ssr: false }),
  'calcul-mental-2': dynamic(() => import('@/components/exercises/CalculMental2Test'), { ssr: false }),
  'calcul-mental-3': dynamic(() => import('@/components/exercises/CalculMental3Test'), { ssr: false }),
  'fiche-calcul': dynamic(() => import('@/components/exercises/FicheCalculTest'), { ssr: false }),
  sparing: dynamic(() => import('@/components/exercises/SparingTest'), { ssr: false }),
  'sparing-bleu': dynamic(() => import('@/components/exercises/SparingBleuTest'), { ssr: false }),
  'glossaire-angles': dynamic(() => import('@/components/exercises/GlossaireAngleTest'), { ssr: false }),
  compteurs: dynamic(() => import('@/components/exercises/CompteurTest'), { ssr: false }),
  'quadrilogie-angles': dynamic(() => import('@/components/exercises/QuadrilogieAnglesTest'), { ssr: false }),
  'angles-montres': dynamic(() => import('@/components/exercises/AnglesMontresTest'), { ssr: false }),
  'psychomoteur-psy0': dynamic(() => import('@/components/exercises/PsychomoteurPsy0Test'), { ssr: false }),
  airways: dynamic(() => import('@/components/exercises/AirwaysTest'), { ssr: false }),
  empilements: dynamic(() => import('@/components/exercises/EmpilementsTest'), { ssr: false }),
  'objets-3d': dynamic(() => import('@/components/exercises/Objets3DTest'), { ssr: false }),
  'formes-glissees': dynamic(() => import('@/components/exercises/FormesGlisseesTest'), { ssr: false }),
  'cubes-psy0': dynamic(() => import('@/components/exercises/CubesPsy0Test'), { ssr: false }),
  'grilles-calculs': dynamic(() => import('@/components/exercises/GrillesCalculsTest'), { ssr: false }),
  'boites-mots': dynamic(() => import('@/components/exercises/BoitesMotsTest'), { ssr: false }),
  'mots-en-etoile': dynamic(() => import('@/components/exercises/MotsEnEtoileTest'), { ssr: false }),
  'series-logiques': dynamic(() => import('@/components/exercises/SeriesLogiquesTest'), { ssr: false }),
  'anglais-psy0': dynamic(() => import('@/components/exercises/AnglaisPsy0Test'), { ssr: false }),
  'calcul-mental-4': dynamic(() => import('@/components/exercises/CalculMental4Test'), { ssr: false }),
  'attention-1': dynamic(() => import('@/components/exercises/Attention1Test'), { ssr: false }),
  'attention-2': dynamic(() => import('@/components/exercises/Attention2Test'), { ssr: false }),
  mathematiques: dynamic(() => import('@/components/exercises/MathematiquesTest'), { ssr: false }),
  efg: dynamic(() => import('@/components/exercises/EfgTest'), { ssr: false }),
  tangram: dynamic(() => import('@/components/exercises/TangramTest'), { ssr: false }),
  'spatial-orientation': dynamic(() => import('@/components/exercises/SpatialOrientationTest'), { ssr: false }),
  'cubes-psy1': dynamic(() => import('@/components/exercises/CubesPsy1Test'), { ssr: false }),
  'voitures-basic': dynamic(() => import('@/components/exercises/VoituresBasicTest'), { ssr: false }),
  'voitures-sequentiel': dynamic(() => import('@/components/exercises/VoituresSeqTest'), { ssr: false }),
  'matrices-raven': dynamic(() => import('@/components/exercises/MatricesRavenTest'), { ssr: false }),
  'lecture-textes': dynamic(() => import('@/components/exercises/LectureTextesTest'), { ssr: false }),
  'psychomoteur-enac': dynamic(() => import('@/components/exercises/PsychomoteurEnacTest'), { ssr: false }),
};

export const mobileComponents: Record<string, ExerciseComponent> = {
  'calcul-mental': dynamic(() => import('@/components/exercises/mobile/CalculMentalMobile'), { ssr: false }),
  'calcul-mental-2': dynamic(() => import('@/components/exercises/mobile/CalculMental2Mobile'), { ssr: false }),
  'calcul-mental-3': dynamic(() => import('@/components/exercises/mobile/CalculMental3Mobile'), { ssr: false }),
  'fiche-angles': dynamic(() => import('@/components/exercises/mobile/FicheAngleMobile'), { ssr: false }),
  'fiche-calcul': dynamic(() => import('@/components/exercises/mobile/FicheCalculMobile'), { ssr: false }),
  'glossaire-angles': dynamic(() => import('@/components/exercises/mobile/GlossaireAngleMobile'), { ssr: false }),
};

export function getPreferredVariant(
  slug: string,
  variant: ExerciseVariant,
  isPhone: boolean
): ExerciseVariant {
  const canonicalSlug = getCanonicalExerciseSlug(slug);

  if (variant !== 'auto') {
    return variant;
  }

  return isPhone && hasDedicatedMobileVariant(canonicalSlug) ? 'mobile' : 'desktop';
}

export function getComponentLookupKey(slug: string): string {
  return getCanonicalExerciseSlug(slug);
}

export function getExercisePhoneExperience(slug: string): MobileExperience {
  return getExerciseMobileProfile(slug).experience;
}

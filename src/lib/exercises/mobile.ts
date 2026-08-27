import {
  EXERCISES,
  getExerciseBySlug,
  type ExerciseConfig,
} from '@/lib/data/exercises';

export type MobileExperience = 'dedicated' | 'responsive' | 'needs-work';

export interface ExerciseMobileProfile {
  slug: string;
  experience: MobileExperience;
  note: string;
}

/** Slugs with a separate mobile component (the rest share the desktop test + PhoneLayout). */
const DEDICATED_MOBILE_SLUGS = new Set(
  EXERCISES.filter((exercise) => exercise.ready).map((exercise) => exercise.slug),
);

const MOBILE_PROFILES: Record<string, ExerciseMobileProfile> = {
  'angles-horloge': {
    slug: 'angles-horloge',
    experience: 'dedicated',
    note: 'QCM visuel simple, exploitable sur telephone avec cibles tactiles confortables.',
  },
  'pair-impair': {
    slug: 'pair-impair',
    experience: 'dedicated',
    note: 'Grille dense et alternance rapide, une version mobile dediee avec grosses cellules serait preferable.',
  },
  'un-mot-sur-deux': {
    slug: 'un-mot-sur-deux',
    experience: 'dedicated',
    note: 'Selection alphabetique sur beaucoup de mots, necessite une densite et un espacement retravailles.',
  },
  'formes-couleurs': {
    slug: 'formes-couleurs',
    experience: 'dedicated',
    note: 'Interaction binaire et lisibilite correcte, adaptation responsive suffisante a court terme.',
  },
  'jeu-des-billes': {
    slug: 'jeu-des-billes',
    experience: 'dedicated',
    note: 'Puzzle de planification tres visuel, trop compact sans composition mobile dediee.',
  },
  'memory-back': {
    slug: 'memory-back',
    experience: 'dedicated',
    note: 'Flux sequentiel simple, utilisable sur telephone si le bouton de reponse reste bien accessible.',
  },
  'rotation-mentale-3d': {
    slug: 'rotation-mentale-3d',
    experience: 'dedicated',
    note: 'Lecture 3D fine, un ecran telephone reduit trop la precision visuelle.',
  },
  'calcul-memorisation': {
    slug: 'calcul-memorisation',
    experience: 'dedicated',
    note: 'Double tache tres chargee, demande une orchestration mobile specifique.',
  },
  'calcul-mental': {
    slug: 'calcul-mental',
    experience: 'dedicated',
    note: 'Version mobile dediee existante, adaptee au calcul ligne par ligne.',
  },
  'attention-3': {
    slug: 'attention-3',
    experience: 'dedicated',
    note: 'Sequence lineaire lisible sur telephone si la typo et le contraste restent larges.',
  },
  'calcul-mental-2': {
    slug: 'calcul-mental-2',
    experience: 'dedicated',
    note: 'Version mobile dediee existante avec choix d intervalles adaptes au tactile.',
  },
  'calcul-mental-3': {
    slug: 'calcul-mental-3',
    experience: 'dedicated',
    note: 'Version mobile dediee existante pour la saisie et la lecture des equations.',
  },
  'fiche-calcul': {
    slug: 'fiche-calcul',
    experience: 'dedicated',
    note: 'Version mobile dediee existante, convenable pour un entrainement continu.',
  },
  'fiche-angles': {
    slug: 'fiche-angles',
    experience: 'dedicated',
    note: 'Version mobile dediee existante avec cercle et controles adaptes.',
  },
  'glossaire-angles': {
    slug: 'glossaire-angles',
    experience: 'dedicated',
    note: 'Version mobile dediee existante pour la consultation et la manipulation tactile.',
  },
  'compteurs': {
    slug: 'compteurs',
    experience: 'dedicated',
    note: 'Lecture simultanee de 8 compteurs trop petite sur telephone sans mise en page alternative.',
  },
  'quadrilogie-angles': {
    slug: 'quadrilogie-angles',
    experience: 'dedicated',
    note: 'Precision angulaire et densite graphique demandent une vraie variante mobile.',
  },
  'psychomoteur-psy0': {
    slug: 'psychomoteur-psy0',
    experience: 'dedicated',
    note: 'Depend du clavier et du multitache temps reel, peu ergonomique sur telephone.',
  },
  'angles-montres': {
    slug: 'angles-montres',
    experience: 'dedicated',
    note: '8 montres simultanees et precision angulaire rendent le telephone limite.',
  },
  airways: {
    slug: 'airways',
    experience: 'dedicated',
    note: 'Tableau strategique multi-zones, interaction trop fine pour telephone sans redesign.',
  },
  empilements: {
    slug: 'empilements',
    experience: 'dedicated',
    note: 'Comparaison spatiale fine entre structures, experience smartphone insuffisante.',
  },
  'objets-3d': {
    slug: 'objets-3d',
    experience: 'dedicated',
    note: 'Choix de points de vue trop detaille pour petit ecran.',
  },
  'formes-glissees': {
    slug: 'formes-glissees',
    experience: 'dedicated',
    note: 'Glisser deposer sur grille centrale, demande une interface tactile specifique.',
  },
  'cubes-psy0': {
    slug: 'cubes-psy0',
    experience: 'dedicated',
    note: 'Manipulation de patrons et rotations de faces, trop charge sans variante mobile.',
  },
  'grilles-calculs': {
    slug: 'grilles-calculs',
    experience: 'dedicated',
    note: 'Peut fonctionner sur telephone avec cases tactiles larges et scroll horizontal evite.',
  },
  'boites-mots': {
    slug: 'boites-mots',
    experience: 'dedicated',
    note: 'Classement lexical faisable sur telephone si les zones de depot restent larges.',
  },
  'mots-en-etoile': {
    slug: 'mots-en-etoile',
    experience: 'dedicated',
    note: 'Assemblage spatial de mots complexe, peu confortable sur petit ecran.',
  },
  'series-logiques': {
    slug: 'series-logiques',
    experience: 'dedicated',
    note: 'QCM textuel bien adapte au telephone si la lecture est aerée.',
  },
  'anglais-psy0': {
    slug: 'anglais-psy0',
    experience: 'dedicated',
    note: 'QCM classique, compatible telephone avec boutons de reponse larges.',
  },
  'calcul-mental-4': {
    slug: 'calcul-mental-4',
    experience: 'dedicated',
    note: 'Selection d intervalles multiple, praticable sur telephone avec grosses cibles.',
  },
  'attention-1': {
    slug: 'attention-1',
    experience: 'dedicated',
    note: 'Memoire puis reponse oui non, utilisable si les cadrans gardent une taille lisible.',
  },
  'attention-2': {
    slug: 'attention-2',
    experience: 'dedicated',
    note: 'Comptage sur tableaux denses, trop serre pour telephone sans simplification visuelle.',
  },
  mathematiques: {
    slug: 'mathematiques',
    experience: 'dedicated',
    note: 'Problemes et QCM, majoritairement textuels donc gerables sur telephone.',
  },
  efg: {
    slug: 'efg',
    experience: 'dedicated',
    note: 'Selection logique possible sur telephone, selon la densite des propositions.',
  },
  tangram: {
    slug: 'tangram',
    experience: 'dedicated',
    note: 'Manipulation spatiale fine, meilleur avec une interface tactile repensee.',
  },
  'spatial-orientation': {
    slug: 'spatial-orientation',
    experience: 'dedicated',
    note: 'Orientation spatiale detaillee, precision visuelle limitee sur telephone.',
  },
  'cubes-psy1': {
    slug: 'cubes-psy1',
    experience: 'dedicated',
    note: 'Exercice cube avancé, ecran trop petit pour une lecture fiable.',
  },
  'voitures-basic': {
    slug: 'voitures-basic',
    experience: 'dedicated',
    note: 'Logique sequentielle lisible si les options restent clairement separees.',
  },
  'voitures-sequentiel': {
    slug: 'voitures-sequentiel',
    experience: 'dedicated',
    note: 'Peut fonctionner sur telephone si la progression reste une etape a la fois.',
  },
  'matrices-raven': {
    slug: 'matrices-raven',
    experience: 'dedicated',
    note: 'Comparaison de matrices et petits details graphiques, experience telephone fragile.',
  },
  'lecture-textes': {
    slug: 'lecture-textes',
    experience: 'dedicated',
    note: 'Lecture longue mais compatible telephone avec bonne hierarchie typographique.',
  },
  'psychomoteur-enac': {
    slug: 'psychomoteur-enac',
    experience: 'dedicated',
    note: 'Psychomoteur temps reel probablement dependant du clavier et d une grande surface.',
  },
};

export function getCanonicalExerciseSlug(slug: string): string {
  if (slug === 'm-back') {
    return 'memory-back';
  }

  return slug;
}

export function getAllExerciseSlugs(): string[] {
  return ['m-back', ...EXERCISES.filter((exercise) => exercise.ready).map((exercise) => exercise.slug)];
}

export function isKnownExerciseSlug(slug: string): boolean {
  return getAllExerciseSlugs().includes(slug);
}

export function getExerciseConfigForSlug(slug: string): ExerciseConfig | undefined {
  return getExerciseBySlug(getCanonicalExerciseSlug(slug));
}

export function hasDedicatedMobileVariant(slug: string): boolean {
  return DEDICATED_MOBILE_SLUGS.has(getCanonicalExerciseSlug(slug));
}

export function getExerciseMobileProfile(slug: string): ExerciseMobileProfile {
  const canonicalSlug = getCanonicalExerciseSlug(slug);
  return MOBILE_PROFILES[canonicalSlug] ?? {
    slug: canonicalSlug,
    experience: 'dedicated',
    note: 'Interface telephone : cibles tactiles, lecture claire, mise en page dediee.',
  };
}

export function getPreferredExerciseHref(slug: string, isPhone: boolean): string {
  return isPhone
    ? `/telephone/${getCanonicalExerciseSlug(slug)}`
    : `/exercices/${slug}`;
}

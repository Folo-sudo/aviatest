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

const DEDICATED_MOBILE_SLUGS = new Set([
  'calcul-mental',
  'calcul-mental-2',
  'calcul-mental-3',
  'fiche-angles',
  'fiche-calcul',
  'glossaire-angles',
]);

const MOBILE_PROFILES: Record<string, ExerciseMobileProfile> = {
  'angles-horloge': {
    slug: 'angles-horloge',
    experience: 'responsive',
    note: 'QCM visuel simple, exploitable sur telephone avec cibles tactiles confortables.',
  },
  'pair-impair': {
    slug: 'pair-impair',
    experience: 'needs-work',
    note: 'Grille dense et alternance rapide, une version mobile dediee avec grosses cellules serait preferable.',
  },
  'un-mot-sur-deux': {
    slug: 'un-mot-sur-deux',
    experience: 'needs-work',
    note: 'Selection alphabetique sur beaucoup de mots, necessite une densite et un espacement retravailles.',
  },
  'formes-couleurs': {
    slug: 'formes-couleurs',
    experience: 'responsive',
    note: 'Interaction binaire et lisibilite correcte, adaptation responsive suffisante a court terme.',
  },
  'jeu-des-billes': {
    slug: 'jeu-des-billes',
    experience: 'needs-work',
    note: 'Puzzle de planification tres visuel, trop compact sans composition mobile dediee.',
  },
  'memory-back': {
    slug: 'memory-back',
    experience: 'responsive',
    note: 'Flux sequentiel simple, utilisable sur telephone si le bouton de reponse reste bien accessible.',
  },
  'rotation-mentale-3d': {
    slug: 'rotation-mentale-3d',
    experience: 'needs-work',
    note: 'Lecture 3D fine, un ecran telephone reduit trop la precision visuelle.',
  },
  'calcul-memorisation': {
    slug: 'calcul-memorisation',
    experience: 'needs-work',
    note: 'Double tache tres chargee, demande une orchestration mobile specifique.',
  },
  'calcul-mental': {
    slug: 'calcul-mental',
    experience: 'dedicated',
    note: 'Version mobile dediee existante, adaptee au calcul ligne par ligne.',
  },
  'attention-3': {
    slug: 'attention-3',
    experience: 'responsive',
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
    experience: 'needs-work',
    note: 'Lecture simultanee de 8 compteurs trop petite sur telephone sans mise en page alternative.',
  },
  'quadrilogie-angles': {
    slug: 'quadrilogie-angles',
    experience: 'needs-work',
    note: 'Precision angulaire et densite graphique demandent une vraie variante mobile.',
  },
  'psychomoteur-psy0': {
    slug: 'psychomoteur-psy0',
    experience: 'needs-work',
    note: 'Depend du clavier et du multitache temps reel, peu ergonomique sur telephone.',
  },
  'angles-montres': {
    slug: 'angles-montres',
    experience: 'needs-work',
    note: '8 montres simultanees et precision angulaire rendent le telephone limite.',
  },
  airways: {
    slug: 'airways',
    experience: 'needs-work',
    note: 'Tableau strategique multi-zones, interaction trop fine pour telephone sans redesign.',
  },
  empilements: {
    slug: 'empilements',
    experience: 'needs-work',
    note: 'Comparaison spatiale fine entre structures, experience smartphone insuffisante.',
  },
  'objets-3d': {
    slug: 'objets-3d',
    experience: 'needs-work',
    note: 'Choix de points de vue trop detaille pour petit ecran.',
  },
  'formes-glissees': {
    slug: 'formes-glissees',
    experience: 'needs-work',
    note: 'Glisser deposer sur grille centrale, demande une interface tactile specifique.',
  },
  'cubes-psy0': {
    slug: 'cubes-psy0',
    experience: 'needs-work',
    note: 'Manipulation de patrons et rotations de faces, trop charge sans variante mobile.',
  },
  'grilles-calculs': {
    slug: 'grilles-calculs',
    experience: 'responsive',
    note: 'Peut fonctionner sur telephone avec cases tactiles larges et scroll horizontal evite.',
  },
  'boites-mots': {
    slug: 'boites-mots',
    experience: 'responsive',
    note: 'Classement lexical faisable sur telephone si les zones de depot restent larges.',
  },
  'mots-en-etoile': {
    slug: 'mots-en-etoile',
    experience: 'needs-work',
    note: 'Assemblage spatial de mots complexe, peu confortable sur petit ecran.',
  },
  'series-logiques': {
    slug: 'series-logiques',
    experience: 'responsive',
    note: 'QCM textuel bien adapte au telephone si la lecture est aerée.',
  },
  'anglais-psy0': {
    slug: 'anglais-psy0',
    experience: 'responsive',
    note: 'QCM classique, compatible telephone avec boutons de reponse larges.',
  },
  'calcul-mental-4': {
    slug: 'calcul-mental-4',
    experience: 'responsive',
    note: 'Selection d intervalles multiple, praticable sur telephone avec grosses cibles.',
  },
  'attention-1': {
    slug: 'attention-1',
    experience: 'responsive',
    note: 'Memoire puis reponse oui non, utilisable si les cadrans gardent une taille lisible.',
  },
  'attention-2': {
    slug: 'attention-2',
    experience: 'needs-work',
    note: 'Comptage sur tableaux denses, trop serre pour telephone sans simplification visuelle.',
  },
  mathematiques: {
    slug: 'mathematiques',
    experience: 'responsive',
    note: 'Problemes et QCM, majoritairement textuels donc gerables sur telephone.',
  },
  efg: {
    slug: 'efg',
    experience: 'responsive',
    note: 'Selection logique possible sur telephone, selon la densite des propositions.',
  },
  tangram: {
    slug: 'tangram',
    experience: 'needs-work',
    note: 'Manipulation spatiale fine, meilleur avec une interface tactile repensee.',
  },
  'spatial-orientation': {
    slug: 'spatial-orientation',
    experience: 'needs-work',
    note: 'Orientation spatiale detaillee, precision visuelle limitee sur telephone.',
  },
  'cubes-psy1': {
    slug: 'cubes-psy1',
    experience: 'needs-work',
    note: 'Exercice cube avancé, ecran trop petit pour une lecture fiable.',
  },
  'voitures-basic': {
    slug: 'voitures-basic',
    experience: 'responsive',
    note: 'Logique sequentielle lisible si les options restent clairement separees.',
  },
  'voitures-sequentiel': {
    slug: 'voitures-sequentiel',
    experience: 'responsive',
    note: 'Peut fonctionner sur telephone si la progression reste une etape a la fois.',
  },
  'matrices-raven': {
    slug: 'matrices-raven',
    experience: 'needs-work',
    note: 'Comparaison de matrices et petits details graphiques, experience telephone fragile.',
  },
  'lecture-textes': {
    slug: 'lecture-textes',
    experience: 'responsive',
    note: 'Lecture longue mais compatible telephone avec bonne hierarchie typographique.',
  },
  'psychomoteur-enac': {
    slug: 'psychomoteur-enac',
    experience: 'needs-work',
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
    experience: 'responsive',
    note: 'Version telephone a confirmer apres revue ergonomique detaillee.',
  };
}

export function getPreferredExerciseHref(slug: string, isPhone: boolean): string {
  return isPhone && hasDedicatedMobileVariant(slug)
    ? `/telephone/${getCanonicalExerciseSlug(slug)}`
    : `/exercices/${slug}`;
}

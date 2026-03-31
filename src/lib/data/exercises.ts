// ============================================================================
// Types d'exercices (multi-select)
// ============================================================================
export type ExerciseType =
  | 'attention'
  | 'psychomoteur'
  | 'spatiale'
  | 'numerique'
  | 'verbal'
  | 'memorisation'
  | 'anglais'
  | 'intellectuel';

export interface ExerciseTypeConfig {
  id: ExerciseType;
  label: string;
  color: string;
  bgColor: string;
  description: string;
}

export const EXERCISE_TYPES: Record<ExerciseType, ExerciseTypeConfig> = {
  attention: {
    id: 'attention',
    label: 'Attention',
    color: '#0EA5E9',
    bgColor: '#E0F2FE',
    description: 'Capacite a maintenir la concentration et a traiter plusieurs informations',
  },
  psychomoteur: {
    id: 'psychomoteur',
    label: 'Psychomoteur',
    color: '#10B981',
    bgColor: '#D1FAE5',
    description: 'Coordination oeil-main et rapidite de reaction',
  },
  spatiale: {
    id: 'spatiale',
    label: 'Spatiale',
    color: '#F59E0B',
    bgColor: '#FEF3C7',
    description: "Orientation et representation mentale dans l'espace",
  },
  numerique: {
    id: 'numerique',
    label: 'Numerique',
    color: '#8B5CF6',
    bgColor: '#EDE9FE',
    description: 'Aptitudes mathematiques et calcul mental',
  },
  verbal: {
    id: 'verbal',
    label: 'Verbal',
    color: '#EC4899',
    bgColor: '#FCE7F3',
    description: 'Comprehension et manipulation du langage',
  },
  memorisation: {
    id: 'memorisation',
    label: 'Memorisation',
    color: '#F43F5E',
    bgColor: '#FFE4E6',
    description: 'Capacite de memorisation et de rappel',
  },
  anglais: {
    id: 'anglais',
    label: 'Anglais',
    color: '#06B6D4',
    bgColor: '#CFFAFE',
    description: 'Comprehension et expression en anglais',
  },
  intellectuel: {
    id: 'intellectuel',
    label: 'Intellectuel',
    color: '#6366F1',
    bgColor: '#E0E7FF',
    description: 'Raisonnement logique et abstrait',
  },
};

// ============================================================================
// Concours
// ============================================================================
export type CompetitionId = 'psy0' | 'psy1' | 'enac-epl';

export interface Competition {
  id: CompetitionId;
  slug: string;
  name: string;
  fullName: string;
  description: string;
  organization: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string[];
}

export const COMPETITIONS: Record<CompetitionId, Competition> = {
  psy0: {
    id: 'psy0',
    slug: 'psy0-cadets-air-france',
    name: 'PSY0',
    fullName: 'PSY0 Cadets Air France',
    description:
      'Premiere phase de selection psychotechnique du programme Cadets Air France. Tests d\'attention, de memoire et d\'orientation spatiale.',
    organization: 'Air France',
    seoTitle: 'Tests PSY0 Cadets Air France - Entrainement Gratuit | AviaTest',
    seoDescription:
      'Preparez le PSY0 Cadets Air France avec nos exercices d\'entrainement gratuits. Tests psychotechniques realistes : attention, orientation spatiale, memoire de travail.',
    seoKeywords: [
      'psy0 cadets air france',
      'test psy0',
      'preparation psy0',
      'cadets air france selection',
      'test psychotechnique psy0',
    ],
  },
  psy1: {
    id: 'psy1',
    slug: 'psy1-cadets-air-france',
    name: 'PSY1',
    fullName: 'PSY1 Cadets Air France',
    description:
      'Seconde phase de selection psychotechnique du programme Cadets Air France. Tests avances incluant psychomotricite et raisonnement logique.',
    organization: 'Air France',
    seoTitle: 'Tests PSY1 Cadets Air France - Entrainement Gratuit | AviaTest',
    seoDescription:
      'Preparez le PSY1 Cadets Air France avec nos exercices avances. Tests psychomoteurs, rotation mentale 3D et raisonnement logique pour la selection pilote.',
    seoKeywords: [
      'psy1 cadets air france',
      'test psy1',
      'preparation psy1',
      'selection pilote air france',
      'test psychotechnique psy1',
    ],
  },
  'enac-epl': {
    id: 'enac-epl',
    slug: 'psy1-enac-epl',
    name: 'ENAC EPL',
    fullName: 'PSY1 ENAC EPL',
    description:
      'Tests psychotechniques du concours ENAC Eleve Pilote de Ligne. Batterie complete incluant orientation spatiale, memoire et raisonnement.',
    organization: 'ENAC',
    seoTitle: 'Tests Psychotechniques ENAC EPL - Preparation Gratuite | AviaTest',
    seoDescription:
      'Entrainement aux tests psychotechniques du concours ENAC EPL. Exercices realistes pour la selection pilote de ligne : spatial, memoire, logique.',
    seoKeywords: [
      'enac epl',
      'concours enac',
      'test psychotechnique enac',
      'preparation epl',
      'pilote de ligne enac',
    ],
  },
};

// ============================================================================
// Configuration des exercices
// ============================================================================
export type DifficultyLevel = 'facile' | 'moyen' | 'difficile';

export interface ExerciseConfig {
  id: string;
  slug: string;
  title: string;
  description: string;
  longDescription: string;
  types: ExerciseType[];
  primaryType: ExerciseType;
  competitions: CompetitionId[];
  difficulty: DifficultyLevel;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string[];
  iconName: string;
  estimatedDuration: number; // minutes
  ready: boolean;
}

export const EXERCISES: ExerciseConfig[] = [
  {
    id: 'clock-angle',
    slug: 'angles-horloge',
    title: "Angles d'Horloge",
    description: 'Identifiez les angles par rapport a un referentiel horloge randomise',
    longDescription:
      "Ce test evalue votre capacite d'orientation spatiale en utilisant un referentiel horloge. Vous devez identifier l'angle correct parmi plusieurs propositions, en tenant compte de la rotation et de l'inversion potentielle du cadran.",
    types: ['spatiale', 'attention'],
    primaryType: 'spatiale',
    competitions: ['psy0', 'psy1', 'enac-epl'],
    difficulty: 'moyen',
    seoTitle: "Test Angles d'Horloge - Orientation Spatiale Pilote | AviaTest",
    seoDescription:
      "Entrainement au test d'angles d'horloge pour les selections pilote. Exercice d'orientation spatiale utilise dans les PSY0, PSY1 et ENAC EPL.",
    seoKeywords: [
      'test angle horloge',
      'orientation spatiale pilote',
      'test psychotechnique spatial',
      'angles horloge psy0',
    ],
    iconName: 'Clock',
    estimatedDuration: 10,
    ready: true,
  },
  {
    id: 'pair-impair',
    slug: 'pair-impair',
    title: 'Pair ou Impair',
    description: 'Cliquez alternativement sur les nombres pairs et impairs en ordre croissant',
    longDescription:
      "Ce test mesure votre capacite d'attention divisee et de flexibilite cognitive. Vous devez alterner entre deux regles (pair/impair) tout en maintenant un ordre croissant.",
    types: ['attention', 'psychomoteur'],
    primaryType: 'attention',
    competitions: ['psy0', 'psy1'],
    difficulty: 'moyen',
    seoTitle: 'Test Pair Impair - Attention Divisee Pilote | AviaTest',
    seoDescription:
      "Test d'attention divisee pair/impair pour selection pilote. Exercice d'entrainement PSY0 et PSY1 Cadets Air France.",
    seoKeywords: [
      'test pair impair',
      'attention divisee',
      'test psychotechnique attention',
      'pair impair psy0',
    ],
    iconName: 'Binary',
    estimatedDuration: 8,
    ready: true,
  },
  {
    id: 'un-mot-sur-deux',
    slug: 'un-mot-sur-deux',
    title: 'Un Mot Sur Deux',
    description: "Alternez entre deux thematiques en respectant l'ordre alphabetique",
    longDescription:
      "Ce test evalue votre attention divisee et vos capacites verbales. Vous devez selectionner alternativement des mots de deux thematiques differentes tout en respectant l'ordre alphabetique.",
    types: ['attention', 'verbal'],
    primaryType: 'attention',
    competitions: ['psy0', 'psy1', 'enac-epl'],
    difficulty: 'difficile',
    seoTitle: 'Test Un Mot Sur Deux - Attention Verbale Pilote | AviaTest',
    seoDescription:
      "Test d'attention verbale un mot sur deux pour selections pilote. Entrainement PSY0, PSY1 et ENAC EPL.",
    seoKeywords: [
      'test un mot sur deux',
      'attention verbale',
      'test psychotechnique verbal',
      'un mot sur deux psy1',
    ],
    iconName: 'BookOpen',
    estimatedDuration: 10,
    ready: true,
  },
  {
    id: 'shapes-colors',
    slug: 'formes-couleurs',
    title: 'Formes et Couleurs',
    description: 'Classifiez rapidement les formes selon des regles predefinies',
    longDescription:
      'Ce test mesure votre vitesse de traitement et votre capacite a appliquer des regles de classification. Vous devez rapidement categoriser des formes geometriques selon leur couleur et leur type.',
    types: ['psychomoteur', 'attention'],
    primaryType: 'psychomoteur',
    competitions: ['psy0', 'psy1'],
    difficulty: 'moyen',
    seoTitle: 'Test Formes et Couleurs - Rapidite Cognitive Pilote | AviaTest',
    seoDescription:
      'Test de rapidite cognitive formes et couleurs pour selections pilote. Entrainement PSY0 et PSY1.',
    seoKeywords: [
      'test formes couleurs',
      'rapidite cognitive',
      'test psychomoteur pilote',
      'formes couleurs psy0',
    ],
    iconName: 'Shapes',
    estimatedDuration: 8,
    ready: true,
  },
  {
    id: 'billes',
    slug: 'jeu-des-billes',
    title: 'Jeu des Billes',
    description: 'Calculez le nombre de mouvements pour resoudre le puzzle',
    longDescription:
      'Ce test evalue votre raisonnement logique et votre capacite de planification. Vous devez determiner le nombre minimum de mouvements necessaires pour resoudre un puzzle de billes.',
    types: ['intellectuel', 'numerique'],
    primaryType: 'intellectuel',
    competitions: ['psy1', 'enac-epl'],
    difficulty: 'difficile',
    seoTitle: 'Test Jeu des Billes - Logique Pilote | AviaTest',
    seoDescription:
      'Test de logique jeu des billes pour selections pilote. Entrainement PSY1 et ENAC EPL.',
    seoKeywords: [
      'test billes',
      'test logique pilote',
      'raisonnement spatial',
      'jeu billes psy1',
    ],
    iconName: 'Circle',
    estimatedDuration: 12,
    ready: true,
  },
  {
    id: 'm2-back',
    slug: 'm2-back',
    title: 'M2 Back',
    description: "Identifiez si le chiffre correspond a celui d'il y a 2 tours",
    longDescription:
      'Ce test mesure votre memoire de travail. Vous devez comparer chaque chiffre presente avec celui qui apparaissait 2 positions avant.',
    types: ['memorisation', 'attention'],
    primaryType: 'memorisation',
    competitions: ['psy0', 'psy1', 'enac-epl'],
    difficulty: 'moyen',
    seoTitle: 'Test M2 Back - Memoire de Travail Pilote | AviaTest',
    seoDescription:
      'Test de memoire de travail M2-Back pour selections pilote. Entrainement PSY0, PSY1 et ENAC EPL.',
    seoKeywords: [
      'test m2 back',
      'memoire de travail',
      'n-back test pilote',
      'm2 back psy0',
    ],
    iconName: 'Brain',
    estimatedDuration: 8,
    ready: true,
  },
  {
    id: 'm3-back',
    slug: 'm3-back',
    title: 'M3 Back',
    description: "Identifiez si le chiffre correspond a celui d'il y a 3 tours",
    longDescription:
      'Version avancee du test de memoire de travail. Vous devez comparer chaque chiffre avec celui qui apparaissait 3 positions avant, augmentant la charge cognitive.',
    types: ['memorisation', 'attention'],
    primaryType: 'memorisation',
    competitions: ['psy1', 'enac-epl'],
    difficulty: 'difficile',
    seoTitle: 'Test M3 Back - Memoire de Travail Avancee Pilote | AviaTest',
    seoDescription:
      'Test de memoire de travail avance M3-Back pour selections pilote. Entrainement PSY1 et ENAC EPL.',
    seoKeywords: [
      'test m3 back',
      'memoire de travail avancee',
      'n-back difficile',
      'm3 back psy1',
    ],
    iconName: 'Brain',
    estimatedDuration: 10,
    ready: true,
  },
  {
    id: 'mental-rotation',
    slug: 'rotation-mentale-3d',
    title: 'Rotation Mentale 3D',
    description: "Appliquez mentalement des rotations 3D et trouvez l'orientation finale",
    longDescription:
      "Ce test evalue votre capacite de visualisation spatiale tridimensionnelle. Vous devez mentalement faire pivoter des objets 3D et identifier leur orientation finale.",
    types: ['spatiale', 'intellectuel'],
    primaryType: 'spatiale',
    competitions: ['psy1', 'enac-epl'],
    difficulty: 'difficile',
    seoTitle: 'Test Rotation Mentale 3D - Visualisation Spatiale Pilote | AviaTest',
    seoDescription:
      'Test de rotation mentale 3D pour selections pilote. Entrainement avance PSY1 et ENAC EPL.',
    seoKeywords: [
      'test rotation mentale',
      'visualisation 3d pilote',
      'test spatial avance',
      'rotation mentale psy1',
    ],
    iconName: 'RotateCcw',
    estimatedDuration: 12,
    ready: true,
  },
  {
    id: 'calcul-memo',
    slug: 'calcul-memorisation',
    title: 'Calcul & Memorisation',
    description: 'Double tache : calcul mental et memorisation de lettres en salves successives',
    longDescription:
      'Ce test evalue votre capacite de double tache. Chaque salve alterne calculs mentaux (a*b+c*d ou a*b-c*d) et lettres a memoriser. A la fin de chaque salve, vous devez restituer les lettres dans le bon ordre. 10 salves, 4 a 9 lettres par salve, 10 secondes par element.',
    types: ['memorisation', 'numerique', 'attention'],
    primaryType: 'memorisation',
    competitions: ['psy1', 'enac-epl'],
    difficulty: 'difficile',
    seoTitle: 'Test Calcul & Memorisation - Double Tache Pilote | AviaTest',
    seoDescription:
      'Test de double tache calcul mental et memorisation pour selections pilote. Entrainement PSY1 et ENAC EPL.',
    seoKeywords: [
      'test double tache pilote',
      'calcul mental memorisation',
      'test psychotechnique double tache',
      'multitache psy1',
      'dual task pilote',
    ],
    iconName: 'BrainCircuit',
    estimatedDuration: 15,
    ready: true,
  },
  {
    id: 'calcul-mental',
    slug: 'calcul-mental',
    title: 'Calcul Mental 1',
    description: 'Resolvez des chaines d\'operations et des multiplications a 2 chiffres',
    longDescription:
      'Ce test evalue votre rapidite et precision en calcul mental. Chaque question presente une chaine d\'additions et soustractions de nombres a 2 chiffres (ex: -79 + 76 - 38 - 60 + 97 + 90 - 12 - 37), avec en bonus des multiplications ab x cd. 10 questions, temps limite par question.',
    types: ['numerique', 'attention'],
    primaryType: 'numerique',
    competitions: ['psy0', 'psy1', 'enac-epl'],
    difficulty: 'moyen',
    seoTitle: 'Test Calcul Mental - Aptitude Numerique Pilote | AviaTest',
    seoDescription:
      'Entrainement au calcul mental pour selections pilote. Chaines d\'operations et multiplications pour PSY0, PSY1 et ENAC EPL.',
    seoKeywords: [
      'test calcul mental',
      'calcul mental pilote',
      'test numerique psy0',
      'aptitude numerique pilote',
      'calcul mental psy1',
    ],
    iconName: 'Calculator',
    estimatedDuration: 10,
    ready: true,
  },
  {
    id: 'calcul-mental-2',
    slug: 'calcul-mental-2',
    title: 'Calcul Mental 2',
    description: 'Estimez le resultat d\'une chaine d\'operations et trouvez le bon intervalle',
    longDescription:
      'Ce test evalue votre capacite d\'estimation et de calcul mental rapide. Chaque question presente une chaine d\'additions et soustractions de nombres a 2 chiffres. Vous devez selectionner le plus petit intervalle contenant le resultat parmi 8 propositions. 10 questions, temps limite par question.',
    types: ['numerique', 'attention'],
    primaryType: 'numerique',
    competitions: ['psy0', 'psy1', 'enac-epl'],
    difficulty: 'moyen',
    seoTitle: 'Test Calcul Mental 2 - Estimation Numerique Pilote | AviaTest',
    seoDescription:
      'Entrainement a l\'estimation en calcul mental pour selections pilote. Trouvez le plus petit intervalle contenant le resultat. PSY0, PSY1 et ENAC EPL.',
    seoKeywords: [
      'test calcul mental estimation',
      'intervalle calcul mental',
      'estimation numerique pilote',
      'calcul mental psy0',
      'test numerique enac',
    ],
    iconName: 'Brackets',
    estimatedDuration: 10,
    ready: true,
  },
  {
    id: 'calcul-mental-3',
    slug: 'calcul-mental-3',
    title: 'Calcul Mental 3',
    description: 'Resolvez des systemes d\'equations lineaires a 3 inconnues par substitution',
    longDescription:
      'Ce test evalue votre rapidite en calcul mental et raisonnement algebrique. Chaque question presente un systeme de 3 equations a 3 inconnues (A, B, C). Resolvez les deux premieres equations pour trouver A et C, puis substituez dans la troisieme pour trouver B. 12 systemes, temps limite par systeme.',
    types: ['numerique', 'intellectuel'],
    primaryType: 'numerique',
    competitions: ['psy1', 'enac-epl'],
    difficulty: 'difficile',
    seoTitle: 'Test Calcul Mental 3 - Systemes d\'Equations Pilote | AviaTest',
    seoDescription:
      'Entrainement au calcul mental avance pour selections pilote. Systemes d\'equations lineaires par substitution pour PSY1 et ENAC EPL.',
    seoKeywords: [
      'test calcul mental',
      'systeme equations pilote',
      'calcul mental avance',
      'substitution equations psy1',
      'test numerique enac',
    ],
    iconName: 'Variable',
    estimatedDuration: 15,
    ready: true,
  },
];

// ============================================================================
// Fonctions utilitaires
// ============================================================================
export function getExerciseBySlug(slug: string): ExerciseConfig | undefined {
  return EXERCISES.find((e) => e.slug === slug);
}

export function getExerciseById(id: string): ExerciseConfig | undefined {
  return EXERCISES.find((e) => e.id === id);
}

export function getExercisesByCompetition(competitionId: CompetitionId): ExerciseConfig[] {
  return EXERCISES.filter((e) => e.competitions.includes(competitionId) && e.ready);
}

export function getExercisesByType(type: ExerciseType): ExerciseConfig[] {
  return EXERCISES.filter((e) => e.types.includes(type) && e.ready);
}

export function getCompetitionBySlug(slug: string): Competition | undefined {
  return Object.values(COMPETITIONS).find((c) => c.slug === slug);
}

export function getAllCompetitions(): Competition[] {
  return Object.values(COMPETITIONS);
}

export function getAllReadyExercises(): ExerciseConfig[] {
  return EXERCISES.filter((e) => e.ready);
}

export function getDifficultyLabel(difficulty: DifficultyLevel): string {
  const labels: Record<DifficultyLevel, string> = {
    facile: 'Facile',
    moyen: 'Moyen',
    difficile: 'Difficile',
  };
  return labels[difficulty];
}

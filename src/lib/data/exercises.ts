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

// Ordre d'affichage type Pilotest (page Psy0 / vue globale)
export const EXERCISE_TYPE_ORDER: ExerciseType[] = [
  'attention',
  'spatiale',
  'numerique',
  'verbal',
  'psychomoteur',
  'intellectuel',
  'anglais',
  'memorisation',
];

export const EXERCISE_TYPES: Record<ExerciseType, ExerciseTypeConfig> = {
  attention: {
    id: 'attention',
    label: 'Attention',
    color: '#0EA5E9',
    bgColor: '#E0F2FE',
    description: 'Capacite a maintenir la concentration et a traiter plusieurs informations',
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
    label: 'Verbale',
    color: '#EC4899',
    bgColor: '#FCE7F3',
    description: 'Comprehension et manipulation du langage',
  },
  psychomoteur: {
    id: 'psychomoteur',
    label: 'Psychomoteur',
    color: '#10B981',
    bgColor: '#D1FAE5',
    description: 'Coordination oeil-main et rapidite de reaction',
  },
  intellectuel: {
    id: 'intellectuel',
    label: 'Intellectuelle',
    color: '#6366F1',
    bgColor: '#E0E7FF',
    description: 'Raisonnement logique et abstrait',
  },
  anglais: {
    id: 'anglais',
    label: 'Anglais',
    color: '#06B6D4',
    bgColor: '#CFFAFE',
    description: 'Comprehension et expression en anglais',
  },
  memorisation: {
    id: 'memorisation',
    label: 'Memorisation',
    color: '#F43F5E',
    bgColor: '#FFE4E6',
    description: 'Capacite de memorisation et de rappel',
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

// Ordre des categories par concours (calque Pilotest)
export const COMPETITION_TYPE_ORDER: Record<CompetitionId, ExerciseType[]> = {
  psy0: [
    'attention',
    'spatiale',
    'numerique',
    'verbal',
    'psychomoteur',
    'intellectuel',
    'anglais',
    'memorisation',
  ],
  psy1: [
    'numerique',
    'spatiale',
    'intellectuel',
    'attention',
    'memorisation',
    'psychomoteur',
    'verbal',
  ],
  'enac-epl': [
    'numerique',
    'attention',
    'spatiale',
    'psychomoteur',
    'intellectuel',
    'verbal',
    'memorisation',
  ],
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
    types: ['spatiale', 'numerique', 'attention'],
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
    types: ['attention', 'spatiale', 'numerique'],
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
    types: ['attention', 'spatiale', 'verbal'],
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
    types: ['attention', 'psychomoteur'],
    primaryType: 'attention',
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
    types: ['spatiale', 'intellectuel'],
    primaryType: 'intellectuel',
    competitions: ['psy0', 'psy1', 'enac-epl'],
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
    id: 'memory-back',
    slug: 'memory-back',
    title: 'Memory Back',
    description:
      "Identifiez si le chiffre correspond a celui presente n tours plus tot (n reglable de 2 a 100)",
    longDescription:
      "Ce test mesure votre memoire de travail (n-back). Vous devez comparer chaque chiffre presente avec celui qui apparaissait n positions avant. Choisissez un niveau preregle (M2, M3, M4, M5) ou un n personnalise de 6 a 100 pour un entrainement sur mesure.",
    types: ['memorisation', 'attention'],
    primaryType: 'memorisation',
    competitions: ['psy0', 'psy1', 'enac-epl'],
    difficulty: 'moyen',
    seoTitle: 'Test Memory Back (N-Back) - Memoire de Travail Pilote | AviaTest',
    seoDescription:
      'Test de memoire de travail N-Back pour selections pilote. M2, M3, M4, M5 Back et niveau personnalise. Entrainement PSY0, PSY1 et ENAC EPL.',
    seoKeywords: [
      'test memory back',
      'n-back test pilote',
      'memoire de travail',
      'm2 back',
      'm3 back',
      'm4 back',
      'm5 back',
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
    types: ['numerique', 'memorisation', 'attention'],
    primaryType: 'numerique',
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
    id: 'attention-3',
    slug: 'attention-3',
    title: 'Attention 3',
    description: 'Comptez les croix en tenant compte des changements de signe (/ et +)',
    longDescription:
      'Ce test evalue votre attention soutenue et votre capacite de suivi. Une sequence de X, / et + est affichee. Les X comptent +1 par defaut. Apres un /, les X comptent -1. Apres un +, les X comptent de nouveau +1. Vous devez calculer le total. 12 sequences, temps limite par sequence.',
    types: ['attention', 'numerique'],
    primaryType: 'attention',
    competitions: ['psy1', 'enac-epl'],
    difficulty: 'moyen',
    seoTitle: 'Test Attention 3 - Comptage de Croix Pilote | AviaTest',
    seoDescription:
      'Entrainement au test de comptage de croix avec changements de signe pour selections pilote. Attention soutenue PSY0, PSY1 et ENAC EPL.',
    seoKeywords: [
      'test attention croix',
      'comptage croix pilote',
      'test attention soutenue',
      'croix signe psy0',
      'attention pilote enac',
    ],
    iconName: 'X',
    estimatedDuration: 12,
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
  {
    id: 'fiche-calcul',
    slug: 'fiche-calcul',
    title: 'Fiche Calcul',
    description: 'Entrainement continu aux multiplications ab x cd',
    longDescription:
      'Fiche d\'entrainement aux multiplications de deux nombres a 2 chiffres. Enchainement continu de multiplications ab x cd avec correction immediate. Un bouton permet de reveler la reponse pour passer plus vite. Pas de limite de temps ni de nombre de questions.',
    types: ['numerique'],
    primaryType: 'numerique',
    competitions: ['psy0', 'psy1', 'enac-epl'],
    difficulty: 'moyen',
    seoTitle: 'Fiche Calcul - Multiplications 2 Chiffres Pilote | AviaTest',
    seoDescription:
      'Entrainement libre aux multiplications ab x cd pour selections pilote. Correction immediate, sans limite de temps.',
    seoKeywords: [
      'fiche calcul',
      'multiplication deux chiffres',
      'calcul mental pilote',
      'entrainement multiplication',
      'calcul rapide pilote',
    ],
    iconName: 'Calculator',
    estimatedDuration: 0,
    ready: true,
  },
  {
    id: 'fiche-angles',
    slug: 'fiche-angles',
    title: 'Fiche Angles',
    description: 'Estimez 30 angles sur le cercle trigonometrique avec correction interactive',
    longDescription:
      'Fiche d\'entrainement aux angles. 30 directions sont presentees de A vers O. Estimez l\'angle en convention trigonometrique (0 degres = droite, sens anti-horaire) a l\'aide d\'un cercle interactif. Chaque reponse est suivie d\'une correction visuelle sur le cercle trigo avec votre reponse et la bonne reponse.',
    types: ['spatiale', 'numerique'],
    primaryType: 'spatiale',
    competitions: ['psy0', 'psy1', 'enac-epl'],
    difficulty: 'facile',
    seoTitle: 'Fiche Angles - Cercle Trigonometrique Pilote | AviaTest',
    seoDescription:
      'Entrainement interactif aux angles sur le cercle trigonometrique pour selections pilote. 30 angles avec correction visuelle.',
    seoKeywords: [
      'fiche angles pilote',
      'cercle trigonometrique',
      'estimation angles',
      'angles psy0 psy1',
      'orientation spatiale pilote',
    ],
    iconName: 'Compass',
    estimatedDuration: 15,
    ready: true,
  },
  {
    id: 'glossaire-angles',
    slug: 'glossaire-angles',
    title: 'Glossaire Angles',
    description: 'Visualisez n\'importe quel angle sur le cercle trigonometrique',
    longDescription:
      'Outil de reference interactif. Entrez un angle entre 0 et 360 degres et visualisez-le instantanement sur le cercle trigonometrique avec les projections cos/sin. Boutons d\'acces rapide aux angles remarquables (30, 45, 60, 90...). Ideal pour memoriser la position des angles avant les epreuves.',
    types: ['spatiale'],
    primaryType: 'spatiale',
    competitions: ['psy0', 'psy1', 'enac-epl'],
    difficulty: 'facile',
    seoTitle: 'Glossaire Angles - Cercle Trigonometrique Interactif | AviaTest',
    seoDescription:
      'Visualiseur d\'angles interactif sur le cercle trigonometrique. Entrez un angle et voyez sa position, cos et sin. Outil de revision pour selections pilote.',
    seoKeywords: [
      'glossaire angles',
      'cercle trigonometrique interactif',
      'visualiser angle',
      'cos sin angle',
      'revision angles pilote',
    ],
    iconName: 'Search',
    estimatedDuration: 0,
    ready: true,
  },
  {
    id: 'compteurs',
    slug: 'compteurs',
    title: 'Test des Compteurs',
    description: 'Lisez les valeurs de 8 compteurs cockpit et identifiez la bonne ligne de lecture',
    longDescription:
      'Test d\'observation spatiale et numerique. 8 compteurs cockpit (fuel, temperatures, pressions, horloge, vitesse, compte-tours) sont affiches simultanement. Un tableau de 6 lignes propose des lectures differentes. Identifiez la ligne correspondant aux valeurs reelles. 20 planches en 10 minutes.',
    types: ['attention', 'numerique'],
    primaryType: 'attention',
    competitions: ['psy0', 'psy1', 'enac-epl'],
    difficulty: 'moyen',
    seoTitle: 'Test des Compteurs Cockpit - Lecture Instruments Pilote | AviaTest',
    seoDescription:
      'Entrainement au test des compteurs cockpit pour selections pilote. Lecture d\'instruments : fuel, temperatures, pressions, horloge. PSY0, PSY1 et ENAC EPL.',
    seoKeywords: [
      'test compteurs cockpit',
      'lecture instruments pilote',
      'test psychotechnique compteurs',
      'compteurs psy0 psy1',
      'instruments cockpit enac',
    ],
    iconName: 'Gauge',
    estimatedDuration: 10,
    ready: true,
  },
  {
    id: 'quadrilogie-angles',
    slug: 'quadrilogie-angles',
    title: 'Quadrilogie des Angles',
    description: 'Determinez l\'angle multiple de 10° sur 4 niveaux de difficulte progressive',
    longDescription:
      'Test d\'orientation spatiale en 4 niveaux. Niveau 1: angle entre deux segments. Niveau 2: angle entre un point et une fleche. Niveau 3: angle entre deux points autour d\'une croix. Niveau 4: rotation a appliquer pour redresser un objet. L\'orientation de l\'horloge change a chaque question, definissant l\'origine 0° et le sens positif. 40 questions en 8 minutes.',
    types: ['spatiale', 'numerique', 'attention'],
    primaryType: 'spatiale',
    competitions: ['psy0', 'psy1', 'enac-epl'],
    difficulty: 'difficile',
    seoTitle: 'Quadrilogie des Angles - Test Orientation Spatiale Pilote | AviaTest',
    seoDescription:
      'Test psychotechnique angles 4 niveaux pour selection pilote. Mesure d\'angles avec horloge variable. Entrainement PSY0, PSY1 et ENAC EPL.',
    seoKeywords: [
      'quadrilogie angles',
      'test angles 4 niveaux',
      'orientation spatiale pilote',
      'test psychotechnique angles',
      'angles psy0 psy1 enac',
    ],
    iconName: 'Clock',
    estimatedDuration: 8,
    ready: true,
  },
  {
    id: 'psychomoteur-psy0',
    slug: 'psychomoteur-psy0',
    title: 'Psychomoteur Psy0 AF Cadet',
    description:
      'Suivez le cercle, comparez les formes et detectez les calculs faux en parallele',
    longDescription:
      'Test multi-taches de 5 minutes inspire des psy0 Cadets Air France. Trois taches simultanees : maintenir la fleche du clavier dans le sens de deplacement du cercle, appuyer sur Espace quand la forme du cercle correspond a l\'encart pointille, et appuyer sur F quand le calcul encadre est faux.',
    types: ['attention', 'psychomoteur'],
    primaryType: 'psychomoteur',
    competitions: ['psy0'],
    difficulty: 'difficile',
    seoTitle: 'Test Psychomoteur Psy0 AF Cadet - Multi-Taches Pilote | AviaTest',
    seoDescription:
      'Entrainement au test psychomoteur multi-taches des psy0 Cadets Air France. Suivi, formes et calculs en parallele pendant 5 minutes.',
    seoKeywords: [
      'psychomoteur psy0',
      'test psychomoteur air france',
      'multi taches pilote',
      'psy0 cadets air france',
      'test attention psychomoteur',
    ],
    iconName: 'Gamepad2',
    estimatedDuration: 5,
    ready: true,
  },
  {
    id: 'angles-montres',
    slug: 'angles-montres',
    title: 'Angles - Montres',
    description: 'Cochez les montres qui affichent le bon angle en tenant compte du sens de rotation',
    longDescription:
      'Un angle de reference est represente en haut a gauche. 8 montres affichent chacune un angle (positif ou negatif) dans une orientation variable. Cochez toutes les montres dont l\'angle correspond. 30 planches en 6 minutes.',
    types: ['spatiale', 'numerique', 'attention'],
    primaryType: 'spatiale',
    competitions: ['psy0', 'psy1', 'enac-epl'],
    difficulty: 'difficile',
    seoTitle: 'Test Angles Montres - Orientation Spatiale Pilote | AviaTest',
    seoDescription:
      'Entrainement au test Angles Montres pour selections pilote. Cochez les montres affichant le bon angle. PSY0, PSY1 et ENAC EPL.',
    seoKeywords: [
      'test angles montres',
      'orientation spatiale pilote',
      'test psychotechnique montres',
      'angles montres psy0 psy1',
    ],
    iconName: 'Clock',
    estimatedDuration: 6,
    ready: true,
  },
  {
    id: 'airways',
    slug: 'airways',
    title: 'Airways',
    description:
      'Deroutez le moins d\'avions possible tout en respectant les criteres de fluidite',
    longDescription:
      'Des avions bleus et violets circulent sur des airways. Deroutez-les via les boutons de couleur pour eviter plus de 2 bleus ou 4 avions dans chaque zone grise. 10 series.',
    types: ['intellectuel', 'attention'],
    primaryType: 'intellectuel',
    competitions: ['psy0'],
    difficulty: 'difficile',
    seoTitle: 'Test Airways - Strategie Trafic Aerien | AviaTest',
    seoDescription:
      'Entrainement Airways psy0 Cadets Air France. Attention soutenue et choix strategiques sur le trafic aerien.',
    seoKeywords: ['airways', 'test airways pilote', 'psy0 air france', 'trafic aerien test'],
    iconName: 'Plane',
    estimatedDuration: 12,
    ready: true,
  },
  {
    id: 'empilements',
    slug: 'empilements',
    title: 'Empilements',
    description:
      'Trouvez laquelle des 3 structures de cubes a subi une symetrie',
    longDescription:
      'Trois empilements de cubes : deux identiques a une rotation pres, le troisieme a subi une symetrie. 20 questions de 10 secondes.',
    types: ['spatiale'],
    primaryType: 'spatiale',
    competitions: ['psy0'],
    difficulty: 'difficile',
    seoTitle: 'Test Empilements de Cubes - Spatiale Psy0 | AviaTest',
    seoDescription:
      'Visualisation spatiale : detectez la structure miroir parmi trois empilements. Entrainement psy0 Cadets Air France.',
    seoKeywords: ['empilements', 'cubes spatiale', 'psy0 air france', 'symetrie cubes'],
    iconName: 'Boxes',
    estimatedDuration: 4,
    ready: true,
  },
  {
    id: 'objets-3d',
    slug: 'objets-3d',
    title: 'Objets 3D',
    description:
      'Identifiez le point de vue correspondant a une scene 3D dans le desert',
    longDescription:
      'Une scene d\'objets dans le desert est montree. Choisissez parmi 8 points de vue autour du cercle lequel correspond. 20 questions de 10 secondes.',
    types: ['spatiale'],
    primaryType: 'spatiale',
    competitions: ['psy0'],
    difficulty: 'difficile',
    seoTitle: 'Test Objets 3D - Points de Vue Spatiaux | AviaTest',
    seoDescription:
      'Entrainement visualisation 3D psy0 Cadets Air France. Retrouvez le point de vue d\'une scene.',
    seoKeywords: ['objets 3d', 'point de vue', 'spatiale pilote', 'psy0'],
    iconName: 'Box',
    estimatedDuration: 4,
    ready: true,
  },
  {
    id: 'formes-glissees',
    slug: 'formes-glissees',
    title: 'Formes glissees - II',
    description:
      'Superposez des formes navy/gris pour reproduire la figure cible',
    longDescription:
      'Glissez des formes sur une grille centrale. Regles : navy+navy=navy, navy+gris=gris, gris+gris=navy. 10 grilles, 60 secondes chacune.',
    types: ['intellectuel', 'spatiale'],
    primaryType: 'spatiale',
    competitions: ['psy0'],
    difficulty: 'difficile',
    seoTitle: 'Test Formes Glissees II - Superposition Spatiale | AviaTest',
    seoDescription:
      'Entrainement formes glissees psy0 Cadets Air France. Superposition de damiers navy et gris.',
    seoKeywords: ['formes glissees', 'superposition', 'psy0 air france'],
    iconName: 'LayoutGrid',
    estimatedDuration: 12,
    ready: true,
  },
  {
    id: 'cubes-psy0',
    slug: 'cubes-psy0',
    title: 'Cubes 2D/3D - Psy0 AF',
    description:
      'Reconstituez un patron de cube en placant et retournant des faces',
    longDescription:
      'Un patron complet est donne a gauche. Completez le patron de droite en glissant les faces manquantes (retournables). 10 questions, 60 secondes.',
    types: ['spatiale'],
    primaryType: 'spatiale',
    competitions: ['psy0'],
    difficulty: 'difficile',
    seoTitle: 'Test Cubes 2D/3D Psy0 Air France | AviaTest',
    seoDescription:
      'Passez du 2D au 3D : reconstituez des patrons de cubes. Entrainement psy0 Cadets Air France.',
    seoKeywords: ['cubes 2d 3d', 'patron cube', 'psy0 air france'],
    iconName: 'Cuboid',
    estimatedDuration: 12,
    ready: true,
  },
  {
    id: 'grilles-calculs',
    slug: 'grilles-calculs',
    title: 'Grilles de calculs',
    description:
      'Reperez les calculs faux dans une grille de 9 operations',
    longDescription:
      'Chaque grille contient 0 a 4 calculs faux. Cliquez-les puis validez. 10 grilles de 45 secondes. Sans validation, la grille ne compte pas.',
    types: ['numerique'],
    primaryType: 'numerique',
    competitions: ['psy0'],
    difficulty: 'moyen',
    seoTitle: 'Test Grilles de Calculs Faux | AviaTest',
    seoDescription:
      'Reperez rapidement les calculs incorrects. Entrainement numerique psy0 Cadets Air France.',
    seoKeywords: ['grilles de calculs', 'calculs faux', 'psy0 numerique'],
    iconName: 'Calculator',
    estimatedDuration: 8,
    ready: true,
  },
  {
    id: 'boites-mots',
    slug: 'boites-mots',
    title: 'Boites a mots',
    description:
      'Classez des mots qui apparaissent dans des boites par champ lexical',
    longDescription:
      'Des mots apparaissent au centre. Assignez-les a des boites par themes lexicaux. 5 series, minimisez les erreurs.',
    types: ['verbal'],
    primaryType: 'verbal',
    competitions: ['psy0'],
    difficulty: 'moyen',
    seoTitle: 'Test Boites a Mots - Lexique Verbal | AviaTest',
    seoDescription:
      'Classement lexical rapide. Entrainement verbale psy0 Cadets Air France.',
    seoKeywords: ['boites a mots', 'champ lexical', 'psy0 verbal'],
    iconName: 'Library',
    estimatedDuration: 10,
    ready: true,
  },
  {
    id: 'mots-en-etoile',
    slug: 'mots-en-etoile',
    title: 'Mots en etoile',
    description:
      'Placez 6 mots de 7 lettres sur une etoile sans conflit de lettres',
    longDescription:
      'Parmi 9 mots, choisissez-en 6 et positionnez-les sur les aretes d\'une etoile. Les cases partagees doivent coincider. 10 questions, 50 secondes.',
    types: ['verbal'],
    primaryType: 'verbal',
    competitions: ['psy0'],
    difficulty: 'difficile',
    seoTitle: 'Test Mots en Etoile - Verbal Spatiale | AviaTest',
    seoDescription:
      'Strategie verbale et spatiale : interlocking de mots sur une etoile. Psy0 Cadets Air France.',
    seoKeywords: ['mots en etoile', 'psy0 verbal', 'etoile mots'],
    iconName: 'Star',
    estimatedDuration: 10,
    ready: true,
  },
  {
    id: 'series-logiques',
    slug: 'series-logiques',
    title: 'Series logiques',
    description:
      'Completez des series lettres/chiffres en trouvant la logique',
    longDescription:
      'Series de 4 ou 5 items a completer parmi 4 choix. +1 point si correct, -1/3 si incorrect. 15 questions de 30 secondes.',
    types: ['intellectuel'],
    primaryType: 'intellectuel',
    competitions: ['psy0'],
    difficulty: 'difficile',
    seoTitle: 'Test Series Logiques Psy0 AF | AviaTest',
    seoDescription:
      'Logique deductive sur series lettres et chiffres. Entrainement psy0 Cadets Air France.',
    seoKeywords: ['series logiques', 'psy0', 'logique pilote'],
    iconName: 'Brain',
    estimatedDuration: 8,
    ready: true,
  },
  {
    id: 'anglais-psy0',
    slug: 'anglais-psy0',
    title: 'Anglais preselection Cadets AF',
    description:
      'QCM d\'anglais rapide (grammaire et vocabulaire) pour la preselection',
    longDescription:
      '30 questions a choix multiples en 7 min 30. Automatismes grammaire et vocabulaire anglais, style preselection Cadets Air France.',
    types: ['anglais'],
    primaryType: 'anglais',
    competitions: ['psy0'],
    difficulty: 'difficile',
    seoTitle: 'Test Anglais Psy0 Cadets Air France | AviaTest',
    seoDescription:
      'Entrainement epreuve d\'anglais preselection pilotes Cadets Air France. 30 QCM chronometres.',
    seoKeywords: ['anglais cadets air france', 'anglais psy0', 'qcm anglais pilote'],
    iconName: 'Languages',
    estimatedDuration: 8,
    ready: true,
  },
  // ---- Psy1 Cadets AF manquants (copie Pilotest) ----
  {
    id: 'calcul-mental-4',
    slug: 'calcul-mental-4',
    title: 'Calcul Mental 4',
    description: 'Calculez une suite +/- puis cochez les intervalles qui contiennent le resultat',
    longDescription:
      'Operation d\'additions et soustractions, puis selection de tous les intervalles contenant le resultat (ou aucune reponse). Style Calcul mental 4 Pilotest Psy1.',
    types: ['numerique'],
    primaryType: 'numerique',
    competitions: ['psy1', 'enac-epl'],
    difficulty: 'moyen',
    seoTitle: 'Test Calcul Mental 4 - Intervalles | AviaTest',
    seoDescription: 'Entrainement Calcul mental 4 (intervalles) pour Psy1 Cadets AF.',
    seoKeywords: ['calcul mental 4', 'intervalles', 'psy1 numerique'],
    iconName: 'Calculator',
    estimatedDuration: 12,
    ready: true,
  },
  {
    id: 'attention-1',
    slug: 'attention-1',
    title: 'Attention 1',
    description: 'Memorisez 4 items dans les cadrans puis restituez leur position',
    longDescription:
      'Phase de memorisation (4 items dans les cadrans haut/bas gauche/droite) puis probes Oui/Non. Attention selective type Pilotest Attention 1.',
    types: ['attention', 'memorisation'],
    primaryType: 'attention',
    competitions: ['psy1', 'enac-epl'],
    difficulty: 'moyen',
    seoTitle: 'Test Attention 1 - Cadrans | AviaTest',
    seoDescription: 'Entrainement Attention 1 pour selections Psy1 Cadets AF.',
    seoKeywords: ['attention 1', 'cadrans', 'psy1 attention'],
    iconName: 'LayoutGrid',
    estimatedDuration: 10,
    ready: true,
  },
  {
    id: 'attention-2',
    slug: 'attention-2',
    title: 'Attention 2',
    description: 'Comptez rapidement les occurrences d\'un symbole de reference',
    longDescription:
      'Tableaux denses de symboles voisins : comptez uniquement le symbole de reference. Chronometre global, style Pilotest Attention 2.',
    types: ['attention'],
    primaryType: 'attention',
    competitions: ['psy1', 'enac-epl'],
    difficulty: 'moyen',
    seoTitle: 'Test Attention 2 - Comptage de symboles | AviaTest',
    seoDescription: 'Entrainement Attention 2 pour selections Psy1 Cadets AF.',
    seoKeywords: ['attention 2', 'comptage symboles', 'psy1'],
    iconName: 'Shapes',
    estimatedDuration: 5,
    ready: true,
  },
  {
    id: 'mathematiques',
    slug: 'mathematiques',
    title: 'Mathematiques',
    description: 'Problemes de regle de trois, pourcentages, vitesse et distance',
    longDescription:
      'QCM de mathematiques appliquees (regle de trois, pourcentages, triangles des vitesses). Present aux Psy1 AF et EPL ENAC.',
    types: ['numerique', 'intellectuel'],
    primaryType: 'numerique',
    competitions: ['psy1', 'enac-epl'],
    difficulty: 'moyen',
    seoTitle: 'Test Mathematiques Pilote | AviaTest',
    seoDescription: 'Entrainement mathematiques Psy1 Cadets AF et ENAC EPL.',
    seoKeywords: ['mathematiques pilote', 'regle de trois', 'psy1'],
    iconName: 'Calculator',
    estimatedDuration: 20,
    ready: true,
  },
  {
    id: 'efg',
    slug: 'efg',
    title: 'EFG',
    description: 'Identifiez la loi logique et selectionnez les items qui la respectent',
    longDescription:
      'Efficience generale : loi vs anti-loi sur nombres, mots ou figures. Selectionnez les candidats qui suivent la loi. Facteur G.',
    types: ['intellectuel'],
    primaryType: 'intellectuel',
    competitions: ['psy1', 'enac-epl'],
    difficulty: 'difficile',
    seoTitle: 'Test EFG - Efficience Generale | AviaTest',
    seoDescription: 'Entrainement EFG (facteur G) pour Psy1 Cadets AF.',
    seoKeywords: ['efg', 'facteur g', 'efficience generale'],
    iconName: 'Brain',
    estimatedDuration: 15,
    ready: true,
  },
  {
    id: 'tangram',
    slug: 'tangram',
    title: 'Tangram',
    description: 'Decomposez une figure 4x4 en briques de base et trouvez la bonne combinaison',
    longDescription:
      'Representation graphique : identifiez quelles briques composent la figure et choisissez la combinaison correcte.',
    types: ['spatiale', 'intellectuel'],
    primaryType: 'spatiale',
    competitions: ['psy1', 'enac-epl'],
    difficulty: 'moyen',
    seoTitle: 'Test Tangram - Representation Graphique | AviaTest',
    seoDescription: 'Entrainement Tangram Psy1 Cadets AF et ENAC EPL.',
    seoKeywords: ['tangram', 'representation graphique', 'psy1'],
    iconName: 'Shapes',
    estimatedDuration: 12,
    ready: true,
  },
  {
    id: 'spatial-orientation',
    slug: 'spatial-orientation',
    title: 'Orientation spatiale (VLR)',
    description: 'Comptez les virages a gauche ou a droite d\'une ligne brisee segment par segment',
    longDescription:
      'Test DLR/AF Cadets Psy1 : lettre D/G puis ligne brisee jamais visible en entier. Comptez les virages demandes.',
    types: ['spatiale'],
    primaryType: 'spatiale',
    competitions: ['psy1'],
    difficulty: 'difficile',
    seoTitle: 'Test Orientation Spatiale VLR | AviaTest',
    seoDescription: 'Entrainement orientation spatiale ligne brisee Psy1 Cadets AF.',
    seoKeywords: ['orientation spatiale', 'vlr', 'dlr psy1'],
    iconName: 'Route',
    estimatedDuration: 12,
    ready: true,
  },
  {
    id: 'cubes-psy1',
    slug: 'cubes-psy1',
    title: 'Patrons de cubes - Psy1',
    description: 'Placez les 6 faces sur le patron pour reconstituer le cube vu en 3D',
    longDescription:
      '2 a 3 vues 3D d\'un cube + patron 2D : assignez chaque symbole a une face du patron. Present depuis 2022 aux Psy1 Cadets.',
    types: ['spatiale'],
    primaryType: 'spatiale',
    competitions: ['psy1', 'enac-epl'],
    difficulty: 'difficile',
    seoTitle: 'Patrons de Cubes Psy1 Cadets AF | AviaTest',
    seoDescription: 'Entrainement patrons de cubes Psy1 Cadets Air France.',
    seoKeywords: ['cubes psy1', 'patrons de cubes', 'cadets af'],
    iconName: 'Cuboid',
    estimatedDuration: 15,
    ready: true,
  },
  {
    id: 'voitures-basic',
    slug: 'voitures-basic',
    title: 'Voitures (basique)',
    description: 'Appliquez des rotations 3D simultanees a une voiture et trouvez la position finale',
    longDescription:
      'Voiture initiale + rotations affichees ensemble (multiples de 45/90°). Choisissez l\'orientation finale parmi 4.',
    types: ['spatiale', 'numerique'],
    primaryType: 'spatiale',
    competitions: ['psy1', 'enac-epl'],
    difficulty: 'moyen',
    seoTitle: 'Test Voitures Basique - Rotations 3D | AviaTest',
    seoDescription: 'Entrainement Voitures basique Psy1 Cadets AF.',
    seoKeywords: ['voitures basique', 'rotation 3d', 'psy1'],
    iconName: 'Car',
    estimatedDuration: 12,
    ready: true,
  },
  {
    id: 'voitures-sequentiel',
    slug: 'voitures-sequentiel',
    title: 'Voitures (sequentiel)',
    description: 'Memorisez des rotations 3D successives puis trouvez la position finale',
    longDescription:
      'Rotations montrees une a une (~15s) puis disparues. Appliquez-les dans l\'ordre et choisissez parmi 5 reponses.',
    types: ['spatiale', 'numerique', 'memorisation'],
    primaryType: 'spatiale',
    competitions: ['psy1', 'enac-epl'],
    difficulty: 'difficile',
    seoTitle: 'Test Voitures Sequentiel - Rotations 3D | AviaTest',
    seoDescription: 'Entrainement Voitures sequentiel Psy1 Cadets AF.',
    seoKeywords: ['voitures sequentiel', 'rotation 3d', 'psy1'],
    iconName: 'Car',
    estimatedDuration: 15,
    ready: true,
  },
  {
    id: 'matrices-raven',
    slug: 'matrices-raven',
    title: 'Matrices de Raven',
    description: 'Completez des matrices abstraites en deduisant la logique',
    longDescription:
      'APM / Matrices de Raven : trouvez la figure qui complete la serie 3x3. Facteur G, logique visuelle.',
    types: ['intellectuel'],
    primaryType: 'intellectuel',
    competitions: ['psy1', 'enac-epl'],
    difficulty: 'difficile',
    seoTitle: 'Matrices de Raven APM | AviaTest',
    seoDescription: 'Entrainement Matrices de Raven pour Psy1 Cadets AF.',
    seoKeywords: ['matrices de raven', 'apm', 'facteur g'],
    iconName: 'LayoutGrid',
    estimatedDuration: 20,
    ready: true,
  },
  {
    id: 'lecture-textes',
    slug: 'lecture-textes',
    title: 'Lecture de textes',
    description: 'Lisez un texte puis repondez a des QCM precis',
    longDescription:
      'Textes techniques ou de culture generale suivis de 3 questions a 5 choix. Present aux Psy1 AF et EPL ENAC.',
    types: ['verbal', 'intellectuel'],
    primaryType: 'verbal',
    competitions: ['psy1', 'enac-epl'],
    difficulty: 'moyen',
    seoTitle: 'Test Lecture de Textes | AviaTest',
    seoDescription: 'Entrainement lecture de textes Psy1 Cadets AF.',
    seoKeywords: ['lecture de textes', 'comprehension', 'psy1 verbal'],
    iconName: 'BookOpen',
    estimatedDuration: 25,
    ready: true,
  },
  {
    id: 'psychomoteur-enac',
    slug: 'psychomoteur-enac',
    title: 'Psychomoteur ENAC',
    description: 'Multi-taches : suivi de croix, jauges, lettres et calculs',
    longDescription:
      'Test multi-taches ENAC-EPL / Psy1 : centrer la croix, maintenir les jauges, annuler des lettres, resoudre des calculs. Phases progressives.',
    types: ['psychomoteur', 'attention', 'numerique'],
    primaryType: 'psychomoteur',
    competitions: ['psy1', 'enac-epl'],
    difficulty: 'difficile',
    seoTitle: 'Test Psychomoteur ENAC | AviaTest',
    seoDescription: 'Entrainement Psychomoteur ENAC-EPL et Psy1 Cadets AF.',
    seoKeywords: ['psychomoteur enac', 'multitache', 'psy1'],
    iconName: 'Gamepad2',
    estimatedDuration: 20,
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

export function getExerciseUrl(exercise: ExerciseConfig): string {
  return `/exercices/${exercise.slug}`;
}

/** Groupe les exercices par aptitude (un exo peut apparaitre dans plusieurs categories, comme sur Pilotest). */
export function groupExercisesByTypes(
  exercises: ExerciseConfig[],
  typeOrder: ExerciseType[] = EXERCISE_TYPE_ORDER
): { type: ExerciseType; config: ExerciseTypeConfig; exercises: ExerciseConfig[] }[] {
  return typeOrder
    .map((type) => ({
      type,
      config: EXERCISE_TYPES[type],
      exercises: exercises.filter((e) => e.types.includes(type)),
    }))
    .filter((group) => group.exercises.length > 0);
}

export function getDifficultyLabel(difficulty: DifficultyLevel): string {
  const labels: Record<DifficultyLevel, string> = {
    facile: 'Facile',
    moyen: 'Moyen',
    difficile: 'Difficile',
  };
  return labels[difficulty];
}

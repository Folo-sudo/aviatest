/** Fallbacks locaux — utilises si aucune valeur en base (site_texts). */
export const SITE_TEXT_DEFAULTS: Record<string, string> = {
  // Accueil — cartes
  'home.stadium.title': 'Stadium',
  'home.stadium.body': 'Meme test, meme tempo, face a d autres candidats.',
  'home.agora.title': 'Agora',
  'home.agora.body': 'Idees et questions de la communaute.',
  'home.aeropostale.title': 'Aeropostale',
  'home.aeropostale.body': 'Bugs, idees, questions.',

  // Accueil — sections
  'home.concours.cadets_label': 'Cadets Air France',
  'home.lanes.title': 'Par competence',
  'home.lanes.body': '',
  'home.footer.blurb': 'Entrainement aux tests psychotechniques pilote.',

  // Intros pages
  'agora.intro': 'Vote pour les idees utiles (3 accords max).',
  'agora.notam.intro': 'Questions de la communaute.',
  'aeropostale.notam.intro': 'Pose une question : elle apparait dans l Agora.',
  'fiches.intro': 'Pratique libre, sans chrono.',
};

export const SITE_TEXT_GROUPS: Array<{ id: string; label: string; keys: string[] }> = [
  {
    id: 'home-cards',
    label: 'Accueil — cartes',
    keys: [
      'home.stadium.title',
      'home.stadium.body',
      'home.agora.title',
      'home.agora.body',
      'home.aeropostale.title',
      'home.aeropostale.body',
    ],
  },
  {
    id: 'home-sections',
    label: 'Accueil — sections',
    keys: [
      'home.concours.cadets_label',
      'home.lanes.title',
      'home.lanes.body',
      'home.footer.blurb',
    ],
  },
  {
    id: 'pages',
    label: 'Agora / Aeropostale / Fiches',
    keys: ['agora.intro', 'agora.notam.intro', 'aeropostale.notam.intro', 'fiches.intro'],
  },
];

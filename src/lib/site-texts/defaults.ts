/** Fallbacks locaux — utilises si aucune valeur en base (site_texts). */
export const SITE_TEXT_DEFAULTS: Record<string, string> = {
  // Accueil — cartes
  'home.stadium.badge': 'Competition',
  'home.stadium.title': 'Stadium',
  'home.stadium.body':
    'Affronte d autres candidats en temps reel : meme epreuve, meme chrono, classement a la cle. Ideal pour mesurer ta progression.',
  'home.agora.title': 'Agora',
  'home.agora.body':
    'Les demandes publiees par la communaute. Donne ton accord aux idees les plus utiles : celles qui ont le plus de votes sont traitees en priorite.',
  'home.aeropostale.title': 'Aeropostale',
  'home.aeropostale.body':
    'Signale un bug, envoie une missive ou une idee. Tu peux ensuite publier une missive dans l Agora pour recueillir des accords.',

  // Accueil — comment ca marche
  'home.how.title': 'Comment fonctionne AviaTest ?',
  'home.how.step1.title': 'Choisis ton concours',
  'home.how.step1.body':
    'PSY0 / PSY1 Cadets Air France, ou ENAC EPL. Chaque parcours regroupe les tests utiles a ta selection.',
  'home.how.step2.title': 'Entraine-toi',
  'home.how.step2.body':
    'Lance un exercice, regle le mode examen si tu veux, et suis ta progression dans ton profil.',
  'home.how.step3.title': 'Passe en competition',
  'home.how.step3.body':
    'Rejoins le Stadium pour te comparer aux autres, ou utilise l Agora / l Aeropostale pour faire remonter une idee.',

  // Accueil — sections
  'home.concours.eyebrow': 'Concours',
  'home.concours.title': 'Par ou commencer ?',
  'home.concours.body':
    'Selectionne le concours que tu prepares. Tu retrouveras ensuite tous les exercices rattaches, ranges pour t y entrainer sans te perdre.',
  'home.concours.cadets_label': 'Cadets Air France',
  'home.concours.cadets_hint': 'Deux etapes du meme parcours de selection — PSY0 puis PSY1.',
  'home.concours.other_label': 'Autre concours',
  'home.lanes.eyebrow': 'Families de tests',
  'home.lanes.title': 'Entraine une competence precise',
  'home.lanes.body':
    'Tu preferes cibler un point faible ? Choisis une famille (attention, spatial, calcul...) puis lance les exercices proposes.',
  'home.battery.eyebrow': 'Batterie d exercices',
  'home.battery.title': 'Apercu d un concours',
  'home.battery.body':
    'Change d onglet pour voir les tests rattaches a chaque selection. Clique sur un exercice pour l ouvrir dans un nouvel onglet.',
  'home.library.eyebrow': 'Bibliotheque',
  'home.library.title': 'Tous les exercices',
  'home.library.body':
    'Liste complete si tu veux chercher un test precis. Sinon, passe plutot par un concours ou une famille ci-dessus.',
  'home.footer.blurb':
    'Entrainement gratuit aux tests psychotechniques pour les selections pilote : Cadets Air France (PSY0 / PSY1) et ENAC EPL.',

  // Intros pages
  'agora.intro':
    'Les missives publiees ici recueillent des accords (max 3 par personne). Plus une missive a d accords, plus elle est urgente pour l admin. Publie les tiennes depuis l onglet Missives de l Aeropostale. Les NOTAM sont des questions a la communaute : reponds et vote avec des pouces.',
  'agora.notam.intro':
    'Pose une question via l onglet NOTAM de l Aeropostale. Ici, tout le monde peut repondre et voter (pouce haut = +1, pouce bas = -1).',
  'aeropostale.notam.intro':
    'Pose une question a la communaute. Elle apparait dans l Agora : les autres peuvent repondre et voter. Les meilleurs scores montent en haut.',
  'fiches.intro':
    'Les fiches d entrainement : pratique libre, sans limite de temps, pour ancrer les reflexes (calcul, angles…).',
};

export const SITE_TEXT_GROUPS: Array<{ id: string; label: string; keys: string[] }> = [
  {
    id: 'home-cards',
    label: 'Accueil — cartes',
    keys: [
      'home.stadium.badge',
      'home.stadium.title',
      'home.stadium.body',
      'home.agora.title',
      'home.agora.body',
      'home.aeropostale.title',
      'home.aeropostale.body',
    ],
  },
  {
    id: 'home-how',
    label: 'Accueil — comment ca marche',
    keys: [
      'home.how.title',
      'home.how.step1.title',
      'home.how.step1.body',
      'home.how.step2.title',
      'home.how.step2.body',
      'home.how.step3.title',
      'home.how.step3.body',
    ],
  },
  {
    id: 'home-sections',
    label: 'Accueil — sections',
    keys: [
      'home.concours.eyebrow',
      'home.concours.title',
      'home.concours.body',
      'home.concours.cadets_label',
      'home.concours.cadets_hint',
      'home.concours.other_label',
      'home.lanes.eyebrow',
      'home.lanes.title',
      'home.lanes.body',
      'home.battery.eyebrow',
      'home.battery.title',
      'home.battery.body',
      'home.library.eyebrow',
      'home.library.title',
      'home.library.body',
      'home.footer.blurb',
    ],
  },
  {
    id: 'pages',
    label: 'Agora / Aeropostale / Fiches',
    keys: ['agora.intro', 'agora.notam.intro', 'aeropostale.notam.intro', 'fiches.intro'],
  },
];

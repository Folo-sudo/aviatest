/**
 * Classes stanine 1–9, calibrees sur les echelles publiques Pilotest
 * (barres `class_calibration` des pages /fr/tests/*, aout 2026).
 *
 * Classe 7 = niveau concours (cible). Classe 9 = excellent.
 * On reste sur Pilotest ; seuls les barres cassees sont retouchees :
 *  - 7/8/9 colles (meme seuil) : on ouvre 8 et 9, la classe 7 ne bouge pas
 *  - classe 9 trop facile (lecture, attention-2, psy ENAC, quadrilogie)
 *  - classe 9 a 100 % (un-mot, airways)
 *  - calcul-mental-2 aligne sur calcul-mental-1 (echelle 10 % trop facile)
 *
 * Chaque tableau a 9 seuils : score % minimum pour la classe 1 … 9.
 * Si deux classes partagent le meme seuil, on attribue la plus basse
 * certaine (regle Pilotest FAQ : pas de classe 9 si 8 et 9 sont egaux).
 */

export const CLASS_COLORS = [
  '#e30613',
  '#e84e0f',
  '#f18700',
  '#fbba00',
  '#ffed00',
  '#d3d800',
  '#02b74b',
  '#009ed4',
  '#003366',
] as const;

/** Classe a viser sur chaque exercice (niveau concours). */
export const CONTEST_CLASS = 7;

/** Fallback : echelle reguliere (pas les percentiles de population de la FAQ). */
const DEFAULT_THRESHOLDS: number[] = [0, 20, 30, 40, 50, 60, 70, 80, 90];

/**
 * Seuils Pilotest (min %). Source : pages test, calibration affichee.
 * Tests sans equivalent Pilotest : plus proche voisin, ou EPL (angles).
 */
const THRESHOLDS: Record<string, number[]> = {
  // ---- PSY0 Cadets AF ----
  'pair-impair': [0, 14, 31, 34, 60, 71, 85, 90, 95], // 8 ouvert (Pilotest 86)
  'un-mot-sur-deux': [0, 2, 6, 13, 23, 44, 69, 91, 97], // 9: 100→97
  'memory-back': [0, 85, 88, 89, 95, 96, 97, 98, 99], // 8/9 ouverts (etaient 97/97/98)
  'm2-back': [0, 85, 88, 89, 95, 96, 97, 98, 99],
  'm3-back': [0, 56, 66, 68, 83, 88, 92, 94, 96], // 8 ouvert (etait 92)
  'm4-back': [0, 61, 70, 71, 85, 90, 93, 95, 97], // 8 ouvert (etait 93)
  'm5-back': [0, 75, 81, 82, 91, 94, 95, 97, 99], // 8/9 ouverts (etaient 95/95/95)
  'psychomoteur-psy0': [0, 57, 69, 79, 85, 90, 93, 95, 97], // 9: 96→97
  'shapes-colors': [0, 58, 69, 79, 88, 92, 95, 96, 98], // 9 ouvert (etait 96)
  airways: [0, 25, 35, 50, 65, 80, 90, 95, 98], // 9: 100→98
  empilements: [0, 60, 67, 69, 81, 86, 91, 92, 95],
  'objets-3d': [0, 53, 62, 64, 78, 84, 90, 91, 95],
  billes: [0, 48, 58, 59, 74, 81, 89, 90, 95],
  'formes-glissees': [0, 28, 43, 45, 68, 78, 88, 89, 95],
  'cubes-psy0': [0, 31, 45, 48, 70, 80, 88, 89, 95],
  'grilles-calculs': [0, 39, 51, 53, 71, 79, 88, 89, 95],
  'boites-mots': [0, 47, 56, 65, 73, 82, 89, 94, 96],
  'mots-en-etoile': [0, 43, 56, 58, 78, 85, 91, 93, 96], // 8 ouvert (etait 91)
  'series-logiques': [0, 6, 24, 27, 54, 67, 83, 85, 95],
  'anglais-psy0': [0, 43, 47, 53, 60, 70, 77, 83, 90], // 9: 87→90
  'fiche-culture-aviation': [0, 35, 45, 55, 65, 75, 85, 90, 95],

  // ---- PSY1 Cadets AF ----
  mathematiques: [0, 20, 27, 33, 43, 60, 77, 87, 93],
  'voitures-sequentiel': [0, 40, 53, 65, 75, 85, 93, 95, 98],
  'voitures-basic': [0, 40, 51, 52, 69, 77, 87, 88, 95],
  compteurs: [0, 22, 28, 37, 48, 63, 76, 87, 93],
  'calcul-mental': [0, 5, 19, 22, 45, 57, 79, 87, 95], // 8 ouvert (etait 81)
  'calcul-mental-4': [0, 22, 37, 40, 63, 73, 86, 90, 95], // 8 ouvert (etait 87)
  'calcul-mental-2': [0, 5, 19, 22, 45, 57, 79, 87, 95], // aligne CM1 (Pilotest 10%)
  'attention-3': [0, 27, 36, 47, 58, 73, 86, 92, 97], // 8: 97→92 (7 inchange)
  'calcul-mental-3': [0, 17, 25, 33, 42, 58, 75, 83, 92],
  'cubes-psy1': [0, 12, 27, 29, 52, 64, 82, 84, 95],
  'spatial-orientation': [0, 52, 62, 64, 79, 85, 91, 92, 95],
  tangram: [0, 34, 47, 49, 69, 78, 88, 89, 95],
  efg: [0, 25, 33, 47, 61, 78, 86, 92, 94],
  'matrices-raven': [0, 46, 58, 65, 71, 75, 81, 85, 91], // 9: 88→91
  'lecture-textes': [0, 20, 25, 30, 35, 45, 62, 72, 82], // 7/9 releves (Pilotest 50/65)
  'attention-1': [0, 18, 28, 39, 53, 68, 80, 88, 90],
  'attention-2': [0, 25, 29, 36, 40, 50, 62, 74, 85], // 9: 77→85 (7 inchange)
  'psychomoteur-enac': [0, 1, 5, 29, 53, 65, 71, 80, 88], // 9: 77→88 (7 inchange)

  // ---- ENAC / voisins ----
  'calcul-memo': [0, 63, 71, 79, 86, 91, 95, 97, 99],
  // Angles d'horloge : pas d'equivalent Pilotest (le camionneur est un autre test).
  'clock-angle': [0, 30, 40, 50, 60, 70, 80, 85, 95],
  'fiche-calcul': [0, 5, 19, 22, 45, 57, 79, 87, 95], // 8 ouvert, comme CM1
  'fiche-angles': [0, 27, 41, 44, 66, 76, 87, 88, 95],
  'glossaire-angles': [0, 27, 41, 44, 66, 76, 87, 88, 95],
  'mental-rotation': [0, 53, 62, 64, 78, 84, 90, 91, 95],
  'angles-montres': [0, 7, 24, 44, 60, 75, 85, 92, 96],
  'quadrilogie-angles': [0, 10, 25, 42.5, 52.5, 60, 67.5, 78, 88], // 9: 77.5→88 (7 inchange)

  // Stadium — pas d'echelle Pilotest
  sparing: [0, 20, 30, 40, 50, 60, 75, 85, 93],
  'sparing-bleu': [0, 20, 30, 40, 50, 60, 75, 85, 93],
};

export function getClassThresholds(exerciseId: string): number[] {
  return THRESHOLDS[exerciseId] ?? DEFAULT_THRESHOLDS;
}

export function scoreToClass(percent: number, exerciseId?: string): number {
  const t = exerciseId ? getClassThresholds(exerciseId) : DEFAULT_THRESHOLDS;
  const p = Number.isFinite(percent) ? percent : 0;
  let cls = 1;
  for (let i = 0; i < 9; i++) {
    if (p + 1e-9 >= t[i]) cls = i + 1;
    else break;
  }
  while (cls > 1 && t[cls - 1] === t[cls - 2]) {
    cls -= 1;
  }
  return cls as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
}

/** Alias historique. Preferer scoreToClass(percent, exerciseId). */
export function scoreToStanine(percent: number, exerciseId?: string): number {
  return scoreToClass(percent, exerciseId);
}

export function classScaleIdForMemoryBack(n: number): string {
  if (n <= 2) return 'memory-back';
  if (n === 3) return 'm3-back';
  if (n === 4) return 'm4-back';
  return 'm5-back';
}

export function classHint(cls: number): string {
  if (cls >= 9) return 'Excellent';
  if (cls >= 8) return 'Solide';
  if (cls >= CONTEST_CLASS) return 'Niveau concours';
  if (cls >= 6) return 'Presque au niveau concours';
  if (cls >= 4) return 'A consolider';
  return 'A retravailler';
}

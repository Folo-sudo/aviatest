/** Map exercise id → localStorage settings key used by the test component. */
export const EXERCISE_SETTINGS_KEYS: Record<string, string> = {
  'attention-2': 'aviatest-attention-2-settings',
  'attention-1': 'aviatest-attention-1-settings',
  'attention-3': 'aviatest-attention-3-settings',
  'memory-back': 'aviatest-mback-settings',
  'calcul-mental': 'aviatest-calcul-mental-settings',
  'calcul-mental-2': 'aviatest-calcul-mental-2-settings',
  'calcul-mental-3': 'aviatest-calcul-mental-3-settings',
  'calcul-mental-4': 'aviatest-calcul-mental-4-settings',
  'calcul-memo': 'aviatest-calcul-memo-settings',
  'mathematiques': 'aviatest-mathematiques-settings',
  'tangram': 'aviatest-tangram-settings',
  'matrices-raven': 'aviatest-matrices-raven-settings',
  'spatial-orientation': 'aviatest-spatial-orientation-settings',
  'mots-en-etoile': 'aviatest-mots-en-etoile-settings',
  'series-logiques': 'aviatest-series-logiques-settings',
  'lecture-textes': 'aviatest-lecture-textes-settings',
  'cubes-psy0': 'aviatest-cubes-psy0-settings',
  'cubes-psy1': 'aviatest-cubes-psy1-settings',
  'grilles-calculs': 'aviatest-grilles-calculs-settings',
  'anglais-psy0': 'aviatest-anglais-psy0-settings',
  'voitures-sequentiel': 'aviatest-voitures-seq-settings',
  'voitures-basic': 'aviatest-voitures-basic-settings',
  'angles-montres': 'aviatest-angles-montres-settings',
  'psychomoteur-psy0': 'aviatest-psychomoteur-psy0-settings',
  'psychomoteur-enac': 'aviatest-psychomoteur-enac-settings',
  airways: 'aviatest-airways-settings',
  empilements: 'aviatest-empilements-settings',
  'objets-3d': 'aviatest-objets-3d-settings',
  'boites-mots': 'aviatest-boites-mots-settings',
  'formes-glissees': 'aviatest-formes-glissees-settings',
  'quadrilogie-angles': 'aviatest-quadrilogie-angles-settings',
  efg: 'aviatest-efg-settings',
  'clock-angle': 'aviatest-clock-angle-settings',
  'pair-impair': 'aviatest-pair-impair-settings',
  'un-mot-sur-deux': 'aviatest-un-mot-sur-deux-settings',
  'shapes-colors': 'aviatest-shapes-colors-settings',
  billes: 'aviatest-billes-settings',
  'mental-rotation': 'aviatest-mental-rotation-settings',
  compteurs: 'aviatest-compteurs-settings',
};

export const STADIUM_COMPETITION_KEY = 'aviatest-stadium-competition-id';
export const ADMIN_EMAIL = 'paulduflos0@gmail.com';

export function readExerciseSettings(exerciseId: string): Record<string, unknown> {
  if (typeof window === 'undefined') return {};
  const key = EXERCISE_SETTINGS_KEYS[exerciseId];
  if (!key) return {};
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    /* ignore */
  }
  return {};
}

export function writeExerciseSettings(
  exerciseId: string,
  settings: Record<string, unknown>,
): void {
  if (typeof window === 'undefined') return;
  const key = EXERCISE_SETTINGS_KEYS[exerciseId];
  if (!key) return;
  try {
    localStorage.setItem(key, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
}

export function setActiveCompetitionId(id: string | null): void {
  if (typeof window === 'undefined') return;
  if (id) sessionStorage.setItem(STADIUM_COMPETITION_KEY, id);
  else sessionStorage.removeItem(STADIUM_COMPETITION_KEY);
}

export function getActiveCompetitionId(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(STADIUM_COMPETITION_KEY);
}

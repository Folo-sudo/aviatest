/**
 * Cube net folding and 3D rotation comparison for PSY0 cube exercises.
 */

export type FaceRotation = 0 | 90 | 180 | 270;
export type CubeFaceId = 'F' | 'B' | 'L' | 'R' | 'U' | 'D';
export type LayoutId = 'A' | 'B';

export interface NetFace {
  pattern: string;
  rotation: FaceRotation;
}

export type FoldedCube = Record<CubeFaceId, NetFace>;

export interface NetSlotDef {
  slot: number;
  row: number;
  col: number;
  cubeFace: CubeFaceId;
  /** Degrees CW added when folding this flat slot onto the cube face. */
  slotRotation: FaceRotation;
}

export interface NetLayout {
  id: LayoutId;
  cols: number;
  rows: number;
  slots: NetSlotDef[];
}

export const CUBE_FACE_IDS: CubeFaceId[] = ['F', 'B', 'L', 'R', 'U', 'D'];

/** Latin cross — Up above Front, Back to the right of Right. */
export const LAYOUT_A: NetLayout = {
  id: 'A',
  cols: 4,
  rows: 3,
  slots: [
    { slot: 0, row: 0, col: 1, cubeFace: 'U', slotRotation: 0 },
    { slot: 1, row: 1, col: 0, cubeFace: 'L', slotRotation: 0 },
    { slot: 2, row: 1, col: 1, cubeFace: 'F', slotRotation: 0 },
    { slot: 3, row: 1, col: 2, cubeFace: 'R', slotRotation: 0 },
    { slot: 4, row: 1, col: 3, cubeFace: 'B', slotRotation: 0 },
    { slot: 5, row: 2, col: 1, cubeFace: 'D', slotRotation: 0 },
  ],
};

/**
 * Latin cross variant — Back below Down (different slot indices for B/D vs layout A).
 * Same cube faces, different unfolding.
 */
export const LAYOUT_B: NetLayout = {
  id: 'B',
  cols: 4,
  rows: 4,
  slots: [
    { slot: 0, row: 0, col: 1, cubeFace: 'U', slotRotation: 0 },
    { slot: 1, row: 1, col: 0, cubeFace: 'L', slotRotation: 0 },
    { slot: 2, row: 1, col: 1, cubeFace: 'F', slotRotation: 0 },
    { slot: 3, row: 1, col: 2, cubeFace: 'R', slotRotation: 0 },
    { slot: 4, row: 2, col: 1, cubeFace: 'D', slotRotation: 0 },
    { slot: 5, row: 3, col: 1, cubeFace: 'B', slotRotation: 180 },
  ],
};

export const NET_LAYOUTS: Record<LayoutId, NetLayout> = {
  A: LAYOUT_A,
  B: LAYOUT_B,
};

export function normalizeRotation(deg: number): FaceRotation {
  const n = ((deg % 360) + 360) % 360;
  if (n === 90 || n === 180 || n === 270) return n;
  return 0;
}

export function getLayout(layoutId: LayoutId): NetLayout {
  return NET_LAYOUTS[layoutId];
}

export function cubeFaceAtSlot(layoutId: LayoutId, slot: number): CubeFaceId | null {
  const slotDef = NET_LAYOUTS[layoutId].slots.find((s) => s.slot === slot);
  return slotDef?.cubeFace ?? null;
}

/** Map logical cube face → net slot for a layout. */
export function faceToSlot(layoutId: LayoutId, face: CubeFaceId): number {
  const layout = NET_LAYOUTS[layoutId];
  const slotDef = layout.slots.find((s) => s.cubeFace === face);
  if (!slotDef) throw new Error(`Face ${face} missing in layout ${layoutId}`);
  return slotDef.slot;
}

/** Display a cube face on a flat net slot (inverse of folding). */
export function cubeFaceToNetFace(cube: FoldedCube, layoutId: LayoutId, face: CubeFaceId): NetFace {
  const layout = NET_LAYOUTS[layoutId];
  const slotDef = layout.slots.find((s) => s.cubeFace === face)!;
  const cf = cube[face];
  return {
    pattern: cf.pattern,
    rotation: normalizeRotation(cf.rotation - slotDef.slotRotation),
  };
}

/** Build per-slot net faces from a logical cube. */
export function cubeToNetBySlot(cube: FoldedCube, layoutId: LayoutId): NetFace[] {
  const layout = NET_LAYOUTS[layoutId];
  const bySlot: NetFace[] = Array(layout.slots.length).fill(null);
  for (const slotDef of layout.slots) {
    bySlot[slotDef.slot] = cubeFaceToNetFace(cube, layoutId, slotDef.cubeFace);
  }
  return bySlot;
}

/**
 * Fold a 6-slot net into a cube model.
 * `facesBySlot` is indexed by slot number (0–5).
 */
export function foldNet(
  facesBySlot: (NetFace | null | undefined)[],
  layoutId: LayoutId,
): FoldedCube | null {
  const layout = NET_LAYOUTS[layoutId];
  const cube = {} as FoldedCube;

  for (const slotDef of layout.slots) {
    const face = facesBySlot[slotDef.slot];
    if (!face) return null;
    cube[slotDef.cubeFace] = {
      pattern: face.pattern,
      rotation: normalizeRotation(face.rotation + slotDef.slotRotation),
    };
  }

  return cube;
}

function cubesIdentical(a: FoldedCube, b: FoldedCube): boolean {
  return CUBE_FACE_IDS.every(
    (id) => a[id].pattern === b[id].pattern && a[id].rotation === b[id].rotation,
  );
}

interface CubeTransform {
  /** Destination face receives content from `sourceFor[dest]`. */
  sourceFor: Record<CubeFaceId, CubeFaceId>;
  twist: Record<CubeFaceId, number>;
}

function applyTransform(cube: FoldedCube, t: CubeTransform): FoldedCube {
  const out = {} as FoldedCube;
  for (const dest of CUBE_FACE_IDS) {
    const src = t.sourceFor[dest];
    out[dest] = {
      pattern: cube[src].pattern,
      rotation: normalizeRotation(cube[src].rotation + t.twist[dest]),
    };
  }
  return out;
}

function compose(a: CubeTransform, b: CubeTransform): CubeTransform {
  const sourceFor = {} as Record<CubeFaceId, CubeFaceId>;
  const twist = {} as Record<CubeFaceId, number>;

  for (const dest of CUBE_FACE_IDS) {
    const mid = b.sourceFor[dest];
    const src = a.sourceFor[mid];
    sourceFor[dest] = src;
    twist[dest] = normalizeRotation(b.twist[dest] + a.twist[mid]);
  }

  return { sourceFor, twist };
}

function transformKey(t: CubeTransform): string {
  return CUBE_FACE_IDS.map((f) => `${f}:${t.sourceFor[f]}@${t.twist[f]}`).join('|');
}

/** 90° CW around +Y (viewed from above). */
const ROTATE_Y_CW: CubeTransform = {
  sourceFor: { F: 'L', L: 'B', B: 'R', R: 'F', U: 'U', D: 'D' },
  twist: { F: 0, L: 0, B: 0, R: 0, U: -90, D: 90 },
};

/** 90° CW around +X (viewed from the right). */
const ROTATE_X_CW: CubeTransform = {
  sourceFor: { F: 'U', U: 'B', B: 'D', D: 'F', L: 'L', R: 'R' },
  twist: { F: 90, U: 0, B: -90, D: 0, L: -90, R: 90 },
};

const IDENTITY_TRANSFORM: CubeTransform = {
  sourceFor: { F: 'F', B: 'B', L: 'L', R: 'R', U: 'U', D: 'D' },
  twist: { F: 0, B: 0, L: 0, R: 0, U: 0, D: 0 },
};

function buildAllCubeTransforms(): CubeTransform[] {
  const seen = new Set<string>();
  const transforms: CubeTransform[] = [];
  const queue: CubeTransform[] = [IDENTITY_TRANSFORM];

  while (queue.length > 0) {
    const cur = queue.shift()!;
    const key = transformKey(cur);
    if (seen.has(key)) continue;
    seen.add(key);
    transforms.push(cur);
    queue.push(compose(cur, ROTATE_Y_CW), compose(cur, ROTATE_X_CW));
  }

  return transforms;
}

const ALL_CUBE_TRANSFORMS = buildAllCubeTransforms();

/** True if `a` can be rotated in 3D to match `b` (patterns + in-face rotations). */
export function cubesEqualModuloRotation(a: FoldedCube, b: FoldedCube): boolean {
  for (const t of ALL_CUBE_TRANSFORMS) {
    if (cubesIdentical(applyTransform(a, t), b)) return true;
  }
  return false;
}

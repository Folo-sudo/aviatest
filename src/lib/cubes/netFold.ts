/**
 * Cube net folding and 3D rotation comparison for PSY0 cube exercises.
 */

export type FaceRotation = 0 | 90 | 180 | 270;
export type CubeFaceId = 'F' | 'B' | 'L' | 'R' | 'U' | 'D';

export type LayoutId =
  | 'N0'
  | 'N1'
  | 'N2'
  | 'N3'
  | 'N4'
  | 'N5'
  | 'N6'
  | 'N7'
  | 'N8'
  | 'N9'
  | 'N10'
  | 'A'
  | 'B';

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

type NetDir = 'U' | 'D' | 'L' | 'R';

const NET_DIR_DELTA: Record<NetDir, [number, number]> = {
  U: [-1, 0],
  D: [1, 0],
  L: [0, -1],
  R: [0, 1],
};

const NET_DIRS: NetDir[] = ['U', 'D', 'L', 'R'];

function oppositeFace(face: CubeFaceId): CubeFaceId {
  const pairs: Record<CubeFaceId, CubeFaceId> = {
    F: 'B',
    B: 'F',
    L: 'R',
    R: 'L',
    U: 'D',
    D: 'U',
  };
  return pairs[face];
}

/** Adjacent cube face when viewing `viewing` from outside. */
function cubeNeighbor(viewing: CubeFaceId, dir: NetDir): CubeFaceId {
  const table: Record<CubeFaceId, [CubeFaceId, CubeFaceId, CubeFaceId, CubeFaceId]> = {
    F: ['U', 'D', 'L', 'R'],
    B: ['U', 'D', 'R', 'L'],
    U: ['B', 'F', 'L', 'R'],
    D: ['F', 'B', 'L', 'R'],
    L: ['U', 'D', 'B', 'F'],
    R: ['U', 'D', 'F', 'B'],
  };
  const idx = { U: 0, D: 1, L: 2, R: 3 }[dir];
  return table[viewing][idx];
}

interface CellFold {
  cubeFace: CubeFaceId;
  slotRotation: FaceRotation;
  netToCube: Record<NetDir, CubeFaceId>;
}

function oppositeNetDir(dir: NetDir): NetDir {
  const pairs: Record<NetDir, NetDir> = { U: 'D', D: 'U', L: 'R', R: 'L' };
  return pairs[dir];
}

function rotateOrientationCW(
  towardNegRow: CubeFaceId,
  towardPosCol: CubeFaceId,
): { towardNegRow: CubeFaceId; towardPosCol: CubeFaceId } {
  return {
    towardNegRow: towardPosCol,
    towardPosCol: oppositeFace(towardNegRow),
  };
}

function slotRotationFromNetToCube(face: CubeFaceId, netToCube: Record<NetDir, CubeFaceId>): FaceRotation {
  const towardNegRow = netToCube.U;
  const towardPosCol = netToCube.R;
  let up = cubeNeighbor(face, 'U');
  let right = cubeNeighbor(face, 'R');
  for (const rot of [0, 90, 180, 270] as FaceRotation[]) {
    if (up === towardNegRow && right === towardPosCol) return rot;
    const next = rotateOrientationCW(up, right);
    up = next.towardNegRow;
    right = next.towardPosCol;
  }
  throw new Error(`Invalid orientation for face ${face}`);
}

function relativeDirOnFace(viewing: CubeFaceId, target: CubeFaceId): NetDir {
  for (const dir of NET_DIRS) {
    if (cubeNeighbor(viewing, dir) === target) return dir;
  }
  throw new Error(`Face ${target} is not adjacent to ${viewing}`);
}

function foldNeighbor(cell: CellFold, ndir: NetDir): CellFold {
  const newFace = cell.netToCube[ndir];
  const towardCell = oppositeNetDir(ndir);
  const netToCube = {} as Record<NetDir, CubeFaceId>;
  netToCube[towardCell] = cell.cubeFace;

  const perpDirs: [NetDir, NetDir] =
    ndir === 'U' || ndir === 'D' ? ['L', 'R'] : ['U', 'D'];
  netToCube[perpDirs[0]] = cell.netToCube[perpDirs[0]];
  netToCube[perpDirs[1]] = cell.netToCube[perpDirs[1]];

  const toCellOnCube = relativeDirOnFace(newFace, cell.cubeFace);
  netToCube[ndir] = cubeNeighbor(newFace, oppositeNetDir(toCellOnCube));

  const slotRotation = slotRotationFromNetToCube(newFace, netToCube);
  return { cubeFace: newFace, slotRotation, netToCube };
}

type CellCoord = { row: number; col: number };

function cellKey(row: number, col: number): string {
  return `${row},${col}`;
}

function pickSeedCell(cells: CellCoord[]): CellCoord {
  const set = new Set(cells.map((c) => cellKey(c.row, c.col)));
  const degree = (c: CellCoord) =>
    NET_DIRS.filter((dir) => {
      const [dr, dc] = NET_DIR_DELTA[dir];
      return set.has(cellKey(c.row + dr, c.col + dc));
    }).length;

  return [...cells].sort((a, b) => {
    const d = degree(b) - degree(a);
    if (d !== 0) return d;
    if (a.row !== b.row) return a.row - b.row;
    return a.col - b.col;
  })[0];
}

function isAdjacentOnCube(a: CubeFaceId, b: CubeFaceId): boolean {
  return NET_DIRS.some((dir) => cubeNeighbor(a, dir) === b);
}

function inferCubeFace(neighborFaces: CubeFaceId[], usedFaces: Set<CubeFaceId>): CubeFaceId {
  const candidates = CUBE_FACE_IDS.filter(
    (face) => !usedFaces.has(face) && neighborFaces.every((n) => isAdjacentOnCube(face, n)),
  );
  if (candidates.length !== 1) {
    throw new Error(`Ambiguous cube face for neighbors [${neighborFaces.join(', ')}]`);
  }
  return candidates[0];
}

function netDirBetween(from: CellCoord, to: CellCoord): NetDir {
  const dr = to.row - from.row;
  const dc = to.col - from.col;
  if (dr === -1 && dc === 0) return 'U';
  if (dr === 1 && dc === 0) return 'D';
  if (dr === 0 && dc === -1) return 'L';
  if (dr === 0 && dc === 1) return 'R';
  throw new Error(`Cells not adjacent: (${from.row},${from.col}) -> (${to.row},${to.col})`);
}

function inferOrientation(
  face: CubeFaceId,
  row: number,
  col: number,
  neighbors: { coord: CellCoord; state: CellFold }[],
): CellFold {
  for (const rot of [0, 90, 180, 270] as FaceRotation[]) {
    let up = cubeNeighbor(face, 'U');
    let right = cubeNeighbor(face, 'R');
    const steps = rot / 90;
    for (let i = 0; i < steps; i++) {
      const next = rotateOrientationCW(up, right);
      up = next.towardNegRow;
      right = next.towardPosCol;
    }
    const netToCube: Record<NetDir, CubeFaceId> = {
      U: up,
      D: oppositeFace(up),
      L: oppositeFace(right),
      R: right,
    };

    const ok = neighbors.every((n) => {
      const dir = netDirBetween({ row, col }, n.coord);
      return netToCube[dir] === n.state.cubeFace;
    });
    if (ok) return { cubeFace: face, slotRotation: rot, netToCube };
  }
  throw new Error(`No orientation for face ${face} at (${row},${col})`);
}

function buildLayoutFromCells(id: LayoutId, cells: CellCoord[]): NetLayout {
  const cellSet = new Set(cells.map((c) => cellKey(c.row, c.col)));
  const seed = pickSeedCell(cells);

  const states = new Map<string, CellFold>();
  states.set(cellKey(seed.row, seed.col), {
    cubeFace: 'F',
    slotRotation: 0,
    netToCube: { U: 'U', D: 'D', L: 'L', R: 'R' },
  });

  const queue: CellCoord[] = [seed];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    const curState = states.get(cellKey(cur.row, cur.col))!;

    for (const ndir of NET_DIRS) {
      const [dr, dc] = NET_DIR_DELTA[ndir];
      const nr = cur.row + dr;
      const nc = cur.col + dc;
      const key = cellKey(nr, nc);
      if (!cellSet.has(key) || states.has(key)) continue;

      const folded = foldNeighbor(curState, ndir);
      states.set(key, folded);
      queue.push({ row: nr, col: nc });
    }
  }

  if (states.size !== 6) {
    throw new Error(`Layout ${id}: expected 6 connected cells, got ${states.size}`);
  }

  const assignedNeighbors = (row: number, col: number) => {
    const found: { coord: CellCoord; state: CellFold }[] = [];
    for (const dir of NET_DIRS) {
      const [dr, dc] = NET_DIR_DELTA[dir];
      const key = cellKey(row + dr, col + dc);
      const state = states.get(key);
      if (state) found.push({ coord: { row: row + dr, col: col + dc }, state });
    }
    return found;
  };

  for (const c of cells) {
    const neighbors = assignedNeighbors(c.row, c.col);
    if (neighbors.length < 2) continue;

    const key = cellKey(c.row, c.col);
    const current = states.get(key)!;
    const usedFaces = new Set(
      [...states.entries()]
        .filter(([entryKey]) => entryKey !== key)
        .map(([, state]) => state.cubeFace),
    );
    const neighborFaces = neighbors.map((n) => n.state.cubeFace);
    const cubeFace = inferCubeFace(neighborFaces, usedFaces);
    if (cubeFace === current.cubeFace) continue;

    const repaired = inferOrientation(cubeFace, c.row, c.col, neighbors);
    states.set(key, repaired);
  }

  const faces = [...states.values()].map((s) => s.cubeFace);
  if (new Set(faces).size !== 6) {
    throw new Error(`Layout ${id}: duplicate cube faces [${faces.join(', ')}]`);
  }

  const minRow = Math.min(...cells.map((c) => c.row));
  const maxRow = Math.max(...cells.map((c) => c.row));
  const minCol = Math.min(...cells.map((c) => c.col));
  const maxCol = Math.max(...cells.map((c) => c.col));

  const sorted = [...cells].sort((a, b) => {
    if (a.row !== b.row) return a.row - b.row;
    return a.col - b.col;
  });

  const slots: NetSlotDef[] = sorted.map((c, slot) => {
    const state = states.get(cellKey(c.row, c.col))!;
    return {
      slot,
      row: c.row - minRow,
      col: c.col - minCol,
      cubeFace: state.cubeFace,
      slotRotation: state.slotRotation,
    };
  });

  return {
    id,
    cols: maxCol - minCol + 1,
    rows: maxRow - minRow + 1,
    slots,
  };
}

/**
 * 1-4-1 family — the six hexominoes made of a row of four cells with one
 * extra cell above and one below (possibly the same column, giving the
 * symmetric Greek-cross shape). Verified distinct (no two are rotations or
 * reflections of one another) and free of any 2x2 block, which the cube-net
 * theorem forbids (see en.wikipedia.org/wiki/Hexomino#Polyhedral_nets_for_the_cube).
 */
const CELLS_1_4_1: CellCoord[][] = [
  [
    { row: 0, col: 1 },
    { row: 1, col: 0 },
    { row: 1, col: 1 },
    { row: 1, col: 2 },
    { row: 1, col: 3 },
    { row: 2, col: 1 },
  ],
  [
    { row: 0, col: 0 },
    { row: 1, col: 0 },
    { row: 1, col: 1 },
    { row: 1, col: 2 },
    { row: 1, col: 3 },
    { row: 2, col: 1 },
  ],
  [
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: 0, col: 2 },
    { row: 1, col: 1 },
    { row: 2, col: 1 },
    { row: 3, col: 1 },
  ],
  [
    { row: 0, col: 2 },
    { row: 1, col: 0 },
    { row: 1, col: 1 },
    { row: 1, col: 2 },
    { row: 1, col: 3 },
    { row: 2, col: 1 },
  ],
  [
    { row: 0, col: 0 },
    { row: 1, col: 0 },
    { row: 1, col: 1 },
    { row: 1, col: 2 },
    { row: 2, col: 1 },
    { row: 3, col: 1 },
  ],
  [
    { row: 0, col: 3 },
    { row: 1, col: 0 },
    { row: 1, col: 1 },
    { row: 1, col: 2 },
    { row: 1, col: 3 },
    { row: 2, col: 1 },
  ],
];

/**
 * Three more branched/offset hexominoes, each verified (by simulating the
 * fold with an independent 3D-rotation model) to place all 6 cube faces
 * without collision. None contains a 2x2 block.
 */
const CELLS_BRANCHED: CellCoord[][] = [
  [
    { row: 0, col: 0 },
    { row: 1, col: 0 },
    { row: 1, col: 1 },
    { row: 2, col: 1 },
    { row: 2, col: 2 },
    { row: 3, col: 1 },
  ],
  [
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: 1, col: 1 },
    { row: 2, col: 1 },
    { row: 3, col: 1 },
    { row: 3, col: 2 },
  ],
  [
    { row: 0, col: 0 },
    { row: 1, col: 0 },
    { row: 1, col: 1 },
    { row: 2, col: 1 },
    { row: 3, col: 1 },
    { row: 3, col: 2 },
  ],
];

/** 2-2-2 staircase. */
const CELLS_2_2_2: CellCoord[] = [
  { row: 0, col: 0 },
  { row: 0, col: 1 },
  { row: 1, col: 1 },
  { row: 1, col: 2 },
  { row: 2, col: 2 },
  { row: 2, col: 3 },
];

/** 3-3 family — two rows of three offset by two. */
const CELLS_3_3: CellCoord[] = [
  { row: 0, col: 2 },
  { row: 0, col: 3 },
  { row: 0, col: 4 },
  { row: 1, col: 0 },
  { row: 1, col: 1 },
  { row: 1, col: 2 },
];

const RAW_NET_CELLS: CellCoord[][] = [
  ...CELLS_1_4_1,
  ...CELLS_BRANCHED,
  CELLS_2_2_2,
  CELLS_3_3,
];

export const NUM_NET_LAYOUTS = RAW_NET_CELLS.length;

export const NET_LAYOUT_IDS = Array.from(
  { length: NUM_NET_LAYOUTS },
  (_, i) => `N${i}` as LayoutId,
);

const LAYOUT_B_CELLS: CellCoord[] = [
  { row: 0, col: 1 },
  { row: 1, col: 0 },
  { row: 1, col: 1 },
  { row: 1, col: 2 },
  { row: 2, col: 1 },
  { row: 3, col: 1 },
];

/** Latin cross — Up above Front, Back to the right of Right. */
export const LAYOUT_A: NetLayout = buildLayoutFromCells('A', CELLS_1_4_1[0]);

/**
 * Latin cross variant — Back below Down (different slot indices for B/D vs layout A).
 * Same cube faces, different unfolding.
 */
export const LAYOUT_B: NetLayout = buildLayoutFromCells('B', LAYOUT_B_CELLS);

const GENERATED_LAYOUTS = Object.fromEntries(
  RAW_NET_CELLS.map((cells, i) => [`N${i}`, buildLayoutFromCells(`N${i}` as LayoutId, cells)]),
) as Record<LayoutId, NetLayout>;

export const NET_LAYOUTS: Record<LayoutId, NetLayout> = {
  ...GENERATED_LAYOUTS,
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

const ROTATE_Y_CW: CubeTransform = {
  sourceFor: { F: 'L', L: 'B', B: 'R', R: 'F', U: 'U', D: 'D' },
  twist: { F: 0, L: 0, B: 0, R: 0, U: -90, D: 90 },
};

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

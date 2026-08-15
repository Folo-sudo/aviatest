/**
 * BFS Utilities - For solving the balls puzzle
 */

/** Capacites des 3 tubes selon le nombre de billes (assez de trous pour des chemins 3–7). */
export function capacitiesFor(numBalls: number): [number, number, number] {
  const n = Math.max(2, Math.min(7, Math.floor(numBalls)));
  // [3,2,3] avec 7 billes → diametre ~3 seulement (1 trou) : trop facile / trop court.
  if (n <= 4) return [3, 2, 3];
  if (n === 5) return [4, 2, 4];
  return [4, 3, 4]; // 6–7 billes : plusieurs trous, diametre large
}

/**
 * Represents the state of 3 tubes (ball stacks)
 */
export class TubeState {
  /** @deprecated use instance `.capacities` — kept for older callers */
  static CAPACITIES = [3, 2, 3];
  capacities: [number, number, number];
  tubes: number[][];

  constructor(
    tubes: number[][],
    capacities: [number, number, number] = [3, 2, 3],
  ) {
    this.capacities = [...capacities] as [number, number, number];
    this.tubes = tubes.map((t) => [...t]);
  }

  clone(): TubeState {
    return new TubeState(this.tubes, this.capacities);
  }

  equals(other: TubeState | null): boolean {
    if (!other) return false;
    for (let i = 0; i < 3; i++) {
      if (this.tubes[i].length !== other.tubes[i].length) return false;
      for (let j = 0; j < this.tubes[i].length; j++) {
        if (this.tubes[i][j] !== other.tubes[i][j]) return false;
      }
    }
    return true;
  }

  toKey(): string {
    return JSON.stringify(this.tubes);
  }

  isValidMove(fromTube: number, toTube: number): boolean {
    if (fromTube === toTube) return false;
    if (this.tubes[fromTube].length === 0) return false;
    if (this.tubes[toTube].length >= this.capacities[toTube]) return false;
    return true;
  }

  getPossibleMoves(): [number, number][] {
    const moves: [number, number][] = [];
    for (let fromT = 0; fromT < 3; fromT++) {
      for (let toT = 0; toT < 3; toT++) {
        if (this.isValidMove(fromT, toT)) {
          moves.push([fromT, toT]);
        }
      }
    }
    return moves;
  }

  applyMove(fromTube: number, toTube: number): TubeState {
    const newState = this.clone();
    const ball = newState.tubes[fromTube].pop()!;
    newState.tubes[toTube].push(ball);
    return newState;
  }
}

/**
 * Finds the shortest path between start and goal using BFS
 */
export function solveBFS(start: TubeState, goal: TubeState): TubeState[] | null {
  if (start.equals(goal)) {
    return [start];
  }

  const queue: [TubeState, TubeState[]][] = [[start, [start]]];
  const visited = new Set([start.toKey()]);

  while (queue.length > 0) {
    const [current, path] = queue.shift()!;

    for (const [fromT, toT] of current.getPossibleMoves()) {
      const nextState = current.applyMove(fromT, toT);
      const key = nextState.toKey();

      if (nextState.equals(goal)) {
        return [...path, nextState];
      }

      if (!visited.has(key)) {
        visited.add(key);
        queue.push([nextState, [...path, nextState]]);
      }
    }
  }

  return null;
}

/**
 * Generates a random valid configuration
 */
export function generateRandomConfig(numBalls: number): TubeState {
  const n = Math.max(1, Math.min(7, Math.floor(numBalls)));
  const capacities = capacitiesFor(n);
  const balls = Array.from({ length: n }, (_, i) => i);
  for (let i = balls.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [balls[i], balls[j]] = [balls[j], balls[i]];
  }

  const tubes: number[][] = [[], [], []];

  for (const ball of balls) {
    const available = [0, 1, 2].filter((i) => tubes[i].length < capacities[i]);
    const tubeIdx = available[Math.floor(Math.random() * available.length)];
    tubes[tubeIdx].push(ball);
  }

  return new TubeState(tubes, capacities);
}

export interface PuzzleResult {
  start: TubeState;
  goal: TubeState;
  solution: TubeState[];
}

type BfsNode = {
  state: TubeState;
  parent: BfsNode | null;
  depth: number;
};

/**
 * BFS from `start` : pick a random state first reached at exactly `targetDist`.
 * Guarantees the shortest path length equals `targetDist` (no walk+shorten).
 */
function findPathAtExactDistance(
  start: TubeState,
  targetDist: number,
): TubeState[] | null {
  if (targetDist <= 0) return [start];

  const root: BfsNode = { state: start, parent: null, depth: 0 };
  const queue: BfsNode[] = [root];
  const visited = new Set<string>([start.toKey()]);
  const atTarget: BfsNode[] = [];

  while (queue.length > 0) {
    const node = queue.shift()!;
    if (node.depth >= targetDist) continue;

    for (const [fromT, toT] of node.state.getPossibleMoves()) {
      const nextState = node.state.applyMove(fromT, toT);
      const key = nextState.toKey();
      if (visited.has(key)) continue;
      visited.add(key);

      const child: BfsNode = {
        state: nextState,
        parent: node,
        depth: node.depth + 1,
      };

      if (child.depth === targetDist) {
        atTarget.push(child);
      } else {
        queue.push(child);
      }
    }
  }

  if (atTarget.length === 0) return null;

  let pick = atTarget[Math.floor(Math.random() * atTarget.length)];
  const path: TubeState[] = [];
  let cur: BfsNode | null = pick;
  while (cur) {
    path.push(cur.state);
    cur = cur.parent;
  }
  path.reverse();
  return path;
}

/**
 * Generates a puzzle whose SHORTEST solution length is chosen uniformly
 * in [minMoves, maxMoves], via exact-distance BFS (no computational shortcut).
 */
export function generatePuzzle(
  numBalls: number,
  minMoves = 3,
  maxMoves = 7,
  maxAttempts = 100,
): PuzzleResult {
  const lo = Math.max(1, Math.min(minMoves, maxMoves));
  const hi = Math.max(lo, maxMoves);
  const span = hi - lo + 1;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const target = lo + ((attempt + Math.floor(Math.random() * span)) % span);
    const start = generateRandomConfig(numBalls);
    const solution = findPathAtExactDistance(start, target);
    if (solution && solution.length - 1 === target) {
      return {
        start,
        goal: solution[solution.length - 1],
        solution,
      };
    }
  }

  for (let target = hi; target >= lo; target--) {
    for (let i = 0; i < 50; i++) {
      const start = generateRandomConfig(numBalls);
      const solution = findPathAtExactDistance(start, target);
      if (solution && solution.length - 1 === target) {
        return {
          start,
          goal: solution[solution.length - 1],
          solution,
        };
      }
    }
  }

  for (let i = 0; i < 40; i++) {
    const start = generateRandomConfig(numBalls);
    for (let target = hi; target >= lo; target--) {
      const solution = findPathAtExactDistance(start, target);
      if (solution && solution.length - 1 >= lo) {
        return {
          start,
          goal: solution[solution.length - 1],
          solution,
        };
      }
    }
  }

  const start = generateRandomConfig(numBalls);
  const solution = findPathAtExactDistance(start, lo) ?? [start];
  return {
    start,
    goal: solution[solution.length - 1],
    solution,
  };
}

/**
 * BFS Utilities - For solving the balls puzzle
 */

/**
 * Represents the state of 3 tubes (ball stacks)
 */
export class TubeState {
  static CAPACITIES = [3, 2, 3];
  tubes: number[][];

  constructor(tubes: number[][]) {
    this.tubes = tubes.map(t => [...t]);
  }

  clone(): TubeState {
    return new TubeState(this.tubes);
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
    if (this.tubes[toTube].length >= TubeState.CAPACITIES[toTube]) return false;
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
  const balls = Array.from({ length: numBalls }, (_, i) => i);
  // Shuffle
  for (let i = balls.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [balls[i], balls[j]] = [balls[j], balls[i]];
  }

  const tubes: number[][] = [[], [], []];
  const capacities = TubeState.CAPACITIES;

  for (const ball of balls) {
    const available = [0, 1, 2].filter(i => tubes[i].length < capacities[i]);
    const tubeIdx = available[Math.floor(Math.random() * available.length)];
    tubes[tubeIdx].push(ball);
  }

  return new TubeState(tubes);
}

export interface PuzzleResult {
  start: TubeState;
  goal: TubeState;
  solution: TubeState[];
}

/**
 * Generates a puzzle with a solution between minMoves and maxMoves
 */
export function generatePuzzle(
  numBalls: number,
  minMoves = 2,
  maxMoves = 8,
  maxAttempts = 100
): PuzzleResult {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const start = generateRandomConfig(numBalls);
    const goal = generateRandomConfig(numBalls);

    if (start.equals(goal)) continue;

    const solution = solveBFS(start, goal);

    if (solution && minMoves <= solution.length - 1 && solution.length - 1 <= maxMoves) {
      return { start, goal, solution };
    }
  }

  // Fallback: generate from start with random moves
  const start = generateRandomConfig(numBalls);
  let current = start;
  const path = [start];

  const targetMoves = Math.floor(Math.random() * (maxMoves - minMoves + 1)) + minMoves;
  for (let i = 0; i < targetMoves; i++) {
    const moves = current.getPossibleMoves();
    if (moves.length === 0) break;

    const move = moves[Math.floor(Math.random() * moves.length)];
    current = current.applyMove(...move);
    path.push(current);
  }

  return { start, goal: current, solution: path };
}

export interface PassageState {
  id: string;
  phase: number;
  threshold: number;
  entropy: number;
}

export interface Transition {
  from: string;
  to: string;
  probability: number;
  weight: number;
}

export interface PassageResult {
  path: string[];
  totalProbability: number;
  totalEntropy: number;
  convergence: number;
}

export class RiteOfPassage {
  private _states: Map<string, PassageState> = new Map();
  private _transitions: Transition[] = [];
  private _currentStateId: string = '';
  private _history: PassageResult[] = [];
  private _state: Record<string, unknown> = {};
  private _transitionMatrix: Map<string, Map<string, number>> = new Map();
  private _stationaryDistribution: Map<string, number> = new Map();

  constructor() {}

  get stateCount(): number {
    return this._states.size;
  }

  get currentStateId(): string {
    return this._currentStateId;
  }

  addState(id: string, phase: number, threshold: number): void {
    const entropy = -threshold * Math.log2(threshold || 1) - (1 - threshold) * Math.log2(1 - threshold || 1);
    this._states.set(id, { id, phase, threshold, entropy });
    this._transitionMatrix.set(id, new Map());
    if (this._currentStateId === '') {
      this._currentStateId = id;
    }
  }

  addTransition(from: string, to: string, weight: number): void {
    this._transitions.push({ from, to, probability: 0, weight });
    const fromMap = this._transitionMatrix.get(from);
    if (fromMap) {
      fromMap.set(to, weight);
    }
  }

  computeProbabilities(): void {
    const outWeights = new Map<string, number>();
    for (const t of this._transitions) {
      outWeights.set(t.from, (outWeights.get(t.from) ?? 0) + t.weight);
    }
    for (const t of this._transitions) {
      t.probability = t.weight / (outWeights.get(t.from) || 1);
    }
  }

  traverse(targetId: string): PassageResult | null {
    const path: string[] = [this._currentStateId];
    let totalProbability = 1;
    let totalEntropy = 0;
    let steps = 0;
    const maxSteps = this._states.size * 2;
    while (this._currentStateId !== targetId && steps < maxSteps) {
      const transitions = this._transitions.filter((t) => t.from === this._currentStateId);
      if (transitions.length === 0) break;
      const chosen = transitions[Math.floor(Math.random() * transitions.length)];
      totalProbability *= chosen.probability;
      const state = this._states.get(chosen.to);
      if (state) totalEntropy += state.entropy;
      this._currentStateId = chosen.to;
      path.push(chosen.to);
      steps++;
    }
    const convergence = this._currentStateId === targetId ? 1 : 0;
    const result: PassageResult = { path, totalProbability, totalEntropy, convergence };
    this._history.push(result);
    if (this._history.length > 50) this._history.shift();
    return result;
  }

  computeStationaryDistribution(iterations: number = 100): Map<string, number> {
    const ids = Array.from(this._states.keys());
    const n = ids.length;
    let dist = new Map<string, number>(ids.map((id) => [id, 1 / n]));
    for (let iter = 0; iter < iterations; iter++) {
      const newDist = new Map<string, number>(ids.map((id) => [id, 0]));
      for (const id of ids) {
        const fromMap = this._transitionMatrix.get(id) ?? new Map();
        const totalWeight = Array.from(fromMap.values()).reduce((s, v) => s + v, 0);
        for (const [to, weight] of fromMap) {
          const prob = totalWeight > 0 ? weight / totalWeight : 0;
          newDist.set(to, (newDist.get(to) ?? 0) + (dist.get(id) ?? 0) * prob);
        }
      }
      dist = newDist;
    }
    this._stationaryDistribution = dist;
    return dist;
  }

  isAbsorbing(id: string): boolean {
    const out = this._transitions.filter((t) => t.from === id);
    return out.length === 0;
  }

  meanFirstPassage(start: string, target: string): number {
    const pathResult = this._bfsPath(start, target);
    return pathResult.length;
  }

  private _bfsPath(start: string, target: string): string[] {
    const visited = new Set<string>();
    const parent = new Map<string, string | null>();
    const queue: string[] = [start];
    parent.set(start, null);
    while (queue.length > 0) {
      const curr = queue.shift()!;
      if (curr === target) break;
      for (const t of this._transitions) {
        if (t.from === curr && !visited.has(t.to)) {
          visited.add(t.to);
          parent.set(t.to, curr);
          queue.push(t.to);
        }
      }
    }
    const path: string[] = [];
    let curr: string | null = target;
    while (curr) {
      path.unshift(curr);
      curr = parent.get(curr) ?? null;
    }
    return path;
  }

  passageEntropy(): number {
    const total = Array.from(this._states.values()).reduce((s, st) => s + st.entropy, 0);
    if (total === 0) return 0;
    return -Array.from(this._states.values()).reduce((s, st) => {
      const p = st.entropy / total;
      return p > 0 ? s + p * Math.log2(p) : s;
    }, 0);
  }

  report(): Record<string, unknown> {
    return {
      states: this._states.size,
      transitions: this._transitions.length,
      currentState: this._currentStateId,
      history: this._history.length,
      entropy: this.passageEntropy(),
      stationary: Object.fromEntries(this._stationaryDistribution),
      state: this._state,
    };
  }
}

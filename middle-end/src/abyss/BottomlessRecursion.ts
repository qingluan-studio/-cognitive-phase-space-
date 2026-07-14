export interface BottomlessRecursionData {
  depth: number;
  iterations: number;
  terminated: boolean;
  reason: string;
}

export class BottomlessRecursion {
  private _depth: number;
  private _iterations: number;
  private _maxIterations: number;
  private _memo: Map<number, number>;
  private _graphEdges: Map<number, number[]>;
  private _kolmogorovComplexity: number;
  private _attractorPoints: Set<number>;

  constructor(maxIterations: number = 100000) {
    this._depth = 0;
    this._iterations = 0;
    this._maxIterations = maxIterations;
    this._memo = new Map<number, number>();
    this._graphEdges = new Map<number, number[]>();
    this._kolmogorovComplexity = 0;
    this._attractorPoints = new Set<number>();
  }

  get depth(): number {
    return this._depth;
  }

  get iterations(): number {
    return this._iterations;
  }

  get kolmogorovComplexity(): number {
    return this._kolmogorovComplexity;
  }

  get attractorCount(): number {
    return this._attractorPoints.size;
  }

  public descend(seed: number): BottomlessRecursionData {
    let current = seed;
    let terminated = false;
    let reason = 'max-iterations-reached';
    this._iterations = 0;
    this._depth = 0;
    this._graphEdges.clear();
    this._attractorPoints.clear();
    while (this._iterations < this._maxIterations) {
      this._iterations += 1;
      this._depth += 1;
      if (this._memo.has(current)) {
        terminated = true;
        reason = `cycle-detected@${current}`;
        this._attractorPoints.add(current);
        break;
      }
      this._memo.set(current, this._depth);
      const next = this._step(current);
      if (!this._graphEdges.has(current)) {
        this._graphEdges.set(current, []);
      }
      this._graphEdges.get(current)!.push(next);
      if (!Number.isFinite(next)) {
        terminated = true;
        reason = 'divergence';
        break;
      }
      current = next;
      if (this._iterations % 1000 === 0) {
        this._detectAttractors();
      }
    }
    this._kolmogorovComplexity = this._estimateComplexity();
    return { depth: this._depth, iterations: this._iterations, terminated, reason };
  }

  public reset(): void {
    this._depth = 0;
    this._iterations = 0;
    this._memo.clear();
    this._graphEdges.clear();
    this._kolmogorovComplexity = 0;
    this._attractorPoints.clear();
  }

  public footprint(): number[] {
    return Array.from(this._memo.keys());
  }

  public summarize(): Record<string, unknown> {
    return {
      maxDepth: this._depth,
      totalIterations: this._iterations,
      uniqueStates: this._memo.size,
      capacity: this._maxIterations,
      kolmogorovComplexity: this._kolmogorovComplexity,
      attractors: this._attractorPoints.size,
      edgeCount: Array.from(this._graphEdges.values()).reduce((s, v) => s + v.length, 0),
    };
  }

  public trampoline(initial: number, steps: number): number {
    let value = initial;
    for (let i = 0; i < steps; i += 1) {
      value = this._step(value);
    }
    return value;
  }

  public findCycles(): number[][] {
    const cycles: number[][] = [];
    const visited = new Set<number>();
    for (const start of this._graphEdges.keys()) {
      if (visited.has(start)) continue;
      const path: number[] = [];
      const localVisited = new Set<number>();
      let current: number | undefined = start;
      while (current !== undefined && !localVisited.has(current)) {
        localVisited.add(current);
        path.push(current);
        visited.add(current);
        const neighbors = this._graphEdges.get(current);
        current = neighbors && neighbors.length > 0 ? neighbors[0] : undefined;
      }
      if (current !== undefined) {
        const cycleStart = path.indexOf(current);
        if (cycleStart >= 0) {
          cycles.push(path.slice(cycleStart));
        }
      }
    }
    return cycles;
  }

  public computeGraphEntropy(): number {
    const degrees: number[] = [];
    for (const edges of this._graphEdges.values()) {
      degrees.push(edges.length);
    }
    if (degrees.length === 0) return 0;
    const total = degrees.reduce((a, b) => a + b, 0);
    let entropy = 0;
    for (const d of degrees) {
      const p = d / total;
      if (p > 0) entropy -= p * Math.log2(p);
    }
    return entropy;
  }

  private _step(n: number): number {
    if (n <= 1) return 1;
    return (n * 31 + 7) % 9973;
  }

  private _detectAttractors(): void {
    const values = Array.from(this._memo.keys());
    const bins = new Map<number, number>();
    for (const v of values) {
      const bin = Math.floor(v / 100);
      bins.set(bin, (bins.get(bin) ?? 0) + 1);
    }
    const avg = values.length / bins.size;
    for (const [bin, count] of bins) {
      if (count > avg * 2) {
        this._attractorPoints.add(bin * 100);
      }
    }
  }

  private _estimateComplexity(): number {
    const states = this._memo.size;
    const edges = Array.from(this._graphEdges.values()).reduce((s, v) => s + v.length, 0);
    return states > 0 ? Math.log2(states) + edges / states : 0;
  }
}

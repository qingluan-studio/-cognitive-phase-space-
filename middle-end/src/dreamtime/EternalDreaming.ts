export interface DreamFragment {
  id: string;
  content: string;
  associations: string[];
  distortionLevel: number;
}

export interface DreamCycle {
  id: string;
  fragments: string[];
  depth: number;
  startedAt: number;
  endedAt: number | null;
}

export class EternalDreaming {
  private _fragments: Map<string, DreamFragment> = new Map();
  private _cycles: DreamCycle[] = [];
  private _currentCycle: DreamCycle | null = null;
  private _dreamDepth = 0.4;
  private _maxCycles = 100;
  private _associationGraph: Map<string, Set<string>> = new Map();
  private _entropyLog: number[] = [];

  ingest(fragment: DreamFragment): void {
    fragment.distortionLevel = this._dreamDepth * Math.random();
    this._fragments.set(fragment.id, fragment);
    this._associationGraph.set(fragment.id, new Set(fragment.associations));
  }

  beginCycle(): DreamCycle {
    if (this._currentCycle) this.endCycle();
    this._currentCycle = {
      id: `dream-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      fragments: [],
      depth: this._dreamDepth,
      startedAt: Date.now(),
      endedAt: null,
    };
    return this._currentCycle;
  }

  processFragment(fragmentId: string): DreamFragment | null {
    const fragment = this._fragments.get(fragmentId);
    if (!fragment || !this._currentCycle) return null;
    fragment.distortionLevel = Math.min(1, fragment.distortionLevel + this._dreamDepth * 0.1);
    this._currentCycle.fragments.push(fragmentId);
    this._entropyLog.push(this._computeFragmentEntropy(fragment));
    if (this._entropyLog.length > 100) this._entropyLog.shift();
    return fragment;
  }

  endCycle(): DreamCycle | null {
    if (!this._currentCycle) return null;
    this._currentCycle.endedAt = Date.now();
    this._cycles.push(this._currentCycle);
    if (this._cycles.length > this._maxCycles) this._cycles.shift();
    const finished = this._currentCycle;
    this._currentCycle = null;
    return finished;
  }

  setDepth(value: number): void {
    this._dreamDepth = Math.max(0, Math.min(1, value));
  }

  associate(fragmentId: string, association: string): DreamFragment | null {
    const fragment = this._fragments.get(fragmentId);
    if (!fragment) return null;
    fragment.associations.push(association);
    this._associationGraph.get(fragmentId)?.add(association);
    return fragment;
  }

  getCycles(): DreamCycle[] {
    return [...this._cycles];
  }

  getFragment(id: string): DreamFragment | null {
    return this._fragments.get(id) ?? null;
  }

  get fragmentCount(): number {
    return this._fragments.size;
  }

  computeDreamEntropy(): number {
    if (this._entropyLog.length === 0) return 0;
    const mean = this._entropyLog.reduce((a, b) => a + b, 0) / this._entropyLog.length;
    const variance = this._entropyLog.reduce((s, v) => s + (v - mean) ** 2, 0) / this._entropyLog.length;
    return 0.5 * Math.log2(2 * Math.PI * Math.E * Math.max(variance, 1e-10));
  }

  computeAssociationClustering(): Map<string, string[]> {
    const clusters = new Map<string, string[]>();
    const visited = new Set<string>();
    for (const [id] of this._associationGraph) {
      if (visited.has(id)) continue;
      const cluster: string[] = [];
      const queue = [id];
      while (queue.length > 0) {
        const curr = queue.shift()!;
        if (visited.has(curr)) continue;
        visited.add(curr);
        cluster.push(curr);
        const neighbors = this._associationGraph.get(curr);
        if (neighbors) {
          for (const n of neighbors) {
            if (!visited.has(n)) queue.push(n);
          }
        }
      }
      clusters.set(id, cluster);
    }
    return clusters;
  }

  simulateStrangeAttractor(iterations: number): Array<{ x: number; y: number }> {
    const points: Array<{ x: number; y: number }> = [];
    let x = 0.1;
    let y = 0.1;
    const a = 1.4;
    const b = 0.3;
    for (let i = 0; i < iterations; i++) {
      const nx = 1 - a * x * x + y;
      const ny = b * x;
      x = nx;
      y = ny;
      points.push({ x, y });
    }
    return points;
  }

  private _computeFragmentEntropy(fragment: DreamFragment): number {
    const freq = new Map<string, number>();
    for (const ch of fragment.content) {
      freq.set(ch, (freq.get(ch) ?? 0) + 1);
    }
    let entropy = 0;
    const len = fragment.content.length;
    for (const count of freq.values()) {
      const p = count / len;
      entropy -= p * Math.log2(p);
    }
    return entropy * fragment.distortionLevel;
  }
}

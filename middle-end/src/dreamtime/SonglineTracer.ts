export interface SonglineNode {
  id: string;
  name: string;
  verse: string;
  memory: string;
  next: string | null;
}

export interface TraceResult {
  visited: string[];
  versesSung: string[];
  totalDistance: number;
  completed: boolean;
}

export class SonglineTracer {
  private _nodes: Map<string, SonglineNode> = new Map();
  private _results: TraceResult[] = [];
  private _startId: string | null = null;
  private _maxSteps = 1000;
  private _transitionMatrix: Map<string, Map<string, number>> = new Map();
  private _stationaryDistribution: Map<string, number> = new Map();

  addNode(node: SonglineNode): void {
    this._nodes.set(node.id, node);
    if (this._startId === null) this._startId = node.id;
    if (!this._transitionMatrix.has(node.id)) {
      this._transitionMatrix.set(node.id, new Map());
    }
  }

  setStart(id: string): boolean {
    if (!this._nodes.has(id)) return false;
    this._startId = id;
    return true;
  }

  trace(): TraceResult | null {
    if (!this._startId) return null;
    const visited: string[] = [];
    const versesSung: string[] = [];
    let current: SonglineNode | null = this._nodes.get(this._startId) ?? null;
    let totalDistance = 0;
    let steps = 0;
    while (current && steps < this._maxSteps) {
      if (visited.includes(current.id)) break;
      visited.push(current.id);
      versesSung.push(current.verse);
      totalDistance += current.verse.length;
      if (current.next) {
        this._updateTransition(current.id, current.next);
        current = this._nodes.get(current.next) ?? null;
      } else {
        current = null;
      }
      steps++;
    }
    const result: TraceResult = {
      visited,
      versesSung,
      totalDistance,
      completed: current === null,
    };
    this._results.push(result);
    if (this._results.length > 50) this._results.shift();
    this._computeStationaryDistribution();
    return result;
  }

  findNodeByVerse(verseFragment: string): SonglineNode | null {
    for (const node of this._nodes.values()) {
      if (node.verse.includes(verseFragment)) return node;
    }
    return null;
  }

  connect(fromId: string, toId: string): boolean {
    const from = this._nodes.get(fromId);
    if (!from || !this._nodes.has(toId)) return false;
    from.next = toId;
    this._updateTransition(fromId, toId);
    return true;
  }

  getNode(id: string): SonglineNode | null {
    return this._nodes.get(id) ?? null;
  }

  getResults(): TraceResult[] {
    return [...this._results];
  }

  get nodeCount(): number {
    return this._nodes.size;
  }

  computeMarkovEntropy(): number {
    let entropy = 0;
    for (const [from, trans] of this._transitionMatrix) {
      const total = Array.from(trans.values()).reduce((a, b) => a + b, 0);
      if (total === 0) continue;
      for (const count of trans.values()) {
        const p = count / total;
        if (p > 0) entropy -= p * Math.log2(p);
      }
    }
    return entropy;
  }

  computeStationaryDistribution(): Map<string, number> {
    return new Map(this._stationaryDistribution);
  }

  simulateRandomWalk(steps: number): string[] {
    const path: string[] = [];
    let current = this._startId ?? Array.from(this._nodes.keys())[0];
    if (!current) return path;
    for (let i = 0; i < steps; i++) {
      path.push(current);
      const trans = this._transitionMatrix.get(current);
      if (!trans || trans.size === 0) break;
      const total = Array.from(trans.values()).reduce((a, b) => a + b, 0);
      const r = Math.random() * total;
      let cum = 0;
      let next = current;
      for (const [to, count] of trans) {
        cum += count;
        if (r <= cum) {
          next = to;
          break;
        }
      }
      current = next;
    }
    return path;
  }

  private _updateTransition(from: string, to: string): void {
    const map = this._transitionMatrix.get(from);
    if (map) {
      map.set(to, (map.get(to) ?? 0) + 1);
    }
  }

  private _computeStationaryDistribution(): void {
    const n = this._nodes.size;
    if (n === 0) return;
    const ids = Array.from(this._nodes.keys());
    const dist = new Map<string, number>();
    for (const id of ids) dist.set(id, 1 / n);
    for (let iter = 0; iter < 100; iter++) {
      const newDist = new Map<string, number>();
      for (const id of ids) newDist.set(id, 0);
      for (const [from, trans] of this._transitionMatrix) {
        const total = Array.from(trans.values()).reduce((a, b) => a + b, 0);
        if (total === 0) continue;
        for (const [to, count] of trans) {
          newDist.set(to, (newDist.get(to) ?? 0) + (dist.get(from) ?? 0) * (count / total));
        }
      }
      dist.clear();
      for (const [id, v] of newDist) dist.set(id, v);
    }
    this._stationaryDistribution = dist;
  }
}

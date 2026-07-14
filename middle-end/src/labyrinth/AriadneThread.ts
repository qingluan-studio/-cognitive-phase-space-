export interface ThreadSegment {
  id: string;
  fromNode: string;
  toNode: string;
  tautness: number;
}

export interface AriadneThreadData {
  currentPosition: string;
  pathLength: number;
  backtrackAvailable: boolean;
}

export class AriadneThread {
  private _segments: ThreadSegment[];
  private _position: string;
  private _backtrackIndex: number;
  private _threadEntropy: number[];
  private _knotFrequency: Map<string, number>;
  private _minimumSpanningTreeWeight: number;

  constructor(startNode: string) {
    this._segments = [];
    this._position = startNode;
    this._backtrackIndex = -1;
    this._threadEntropy = [];
    this._knotFrequency = new Map();
    this._minimumSpanningTreeWeight = 0;
  }

  get currentPosition(): string {
    return this._position;
  }

  get pathLength(): number {
    return this._segments.length;
  }

  get backtrackAvailable(): boolean {
    return this._backtrackIndex >= 0;
  }

  get minimumSpanningTreeWeight(): number {
    return this._minimumSpanningTreeWeight;
  }

  public record(fromNode: string, toNode: string): ThreadSegment {
    const segment: ThreadSegment = {
      id: `seg-${this._segments.length}`,
      fromNode,
      toNode,
      tautness: 1.0,
    };
    this._segments.push(segment);
    this._position = toNode;
    this._backtrackIndex = this._segments.length - 1;
    this._knotFrequency.set(toNode, (this._knotFrequency.get(toNode) ?? 0) + 1);
    this._updateEntropy();
    this._updateMSTWeight();
    return segment;
  }

  public backtrack(): string | null {
    if (this._backtrackIndex < 0) return null;
    const segment = this._segments[this._backtrackIndex];
    this._position = segment.fromNode;
    this._backtrackIndex -= 1;
    return segment.fromNode;
  }

  public unwind(): void {
    this._segments = [];
    this._backtrackIndex = -1;
    this._threadEntropy = [];
    this._knotFrequency.clear();
    this._minimumSpanningTreeWeight = 0;
  }

  public snap(): void {
    const lost = this._segments.pop();
    if (lost) {
      this._position = lost.fromNode;
      this._backtrackIndex = this._segments.length - 1;
      this._updateMSTWeight();
    }
  }

  public trail(): ThreadSegment[] {
    return [...this._segments];
  }

  public report(): AriadneThreadData {
    return {
      currentPosition: this._position,
      pathLength: this.pathLength,
      backtrackAvailable: this.backtrackAvailable,
    };
  }

  public computePathEntropy(): number {
    if (this._threadEntropy.length === 0) return 0;
    const mean = this._threadEntropy.reduce((a, b) => a + b, 0) / this._threadEntropy.length;
    const variance = this._threadEntropy.reduce((s, v) => s + (v - mean) ** 2, 0) / this._threadEntropy.length;
    return 0.5 * Math.log2(2 * Math.PI * Math.E * Math.max(variance, 1e-10));
  }

  public findLoops(): string[][] {
    const loops: string[][] = [];
    const visited = new Set<string>();
    const stack: string[] = [];
    const adjacency = new Map<string, string[]>();
    for (const seg of this._segments) {
      if (!adjacency.has(seg.fromNode)) adjacency.set(seg.fromNode, []);
      adjacency.get(seg.fromNode)!.push(seg.toNode);
    }
    const dfs = (node: string) => {
      if (visited.has(node)) {
        const idx = stack.indexOf(node);
        if (idx >= 0) loops.push(stack.slice(idx));
        return;
      }
      visited.add(node);
      stack.push(node);
      for (const neighbor of adjacency.get(node) ?? []) {
        dfs(neighbor);
      }
      stack.pop();
      visited.delete(node);
    };
    dfs(this._segments[0]?.fromNode ?? this._position);
    return loops;
  }

  public computeDegreeDistribution(): Map<string, number> {
    const degree = new Map<string, number>();
    for (const seg of this._segments) {
      degree.set(seg.fromNode, (degree.get(seg.fromNode) ?? 0) + 1);
      degree.set(seg.toNode, (degree.get(seg.toNode) ?? 0) + 1);
    }
    return degree;
  }

  private _updateEntropy(): void {
    const total = this._segments.length;
    if (total === 0) return;
    const uniqueNodes = new Set(this._segments.map(s => s.toNode));
    const p = uniqueNodes.size / total;
    this._threadEntropy.push(-p * Math.log2(p + 1e-10));
  }

  private _updateMSTWeight(): void {
    const edges = this._segments.map((s, i) => ({ from: s.fromNode, to: s.toNode, weight: i + 1 }));
    const nodes = new Set(edges.flatMap(e => [e.from, e.to]));
    const parent = new Map<string, string>();
    for (const n of nodes) parent.set(n, n);
    const find = (x: string): string => {
      if (parent.get(x) !== x) parent.set(x, find(parent.get(x)!));
      return parent.get(x)!;
    };
    const union = (x: string, y: string): void => {
      parent.set(find(x), find(y));
    };
    edges.sort((a, b) => a.weight - b.weight);
    let weight = 0;
    for (const e of edges) {
      if (find(e.from) !== find(e.to)) {
        union(e.from, e.to);
        weight += e.weight;
      }
    }
    this._minimumSpanningTreeWeight = weight;
  }
}

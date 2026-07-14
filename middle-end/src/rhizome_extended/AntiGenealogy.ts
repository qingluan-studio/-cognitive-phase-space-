export interface AntiGenealogyNode {
  id: string;
  depth: number;
  connections: string[];
  centrality: number;
}

export class AntiGenealogy {
  private _nodes: Map<string, AntiGenealogyNode> = new Map();
  private _adjacency: Map<string, Set<string>> = new Map();
  private _state: Record<string, unknown> = {};
  private _pagerank: Map<string, number> = new Map();
  private _sccLabels: Map<string, number> = new Map();

  constructor() {}

  get nodeCount(): number {
    return this._nodes.size;
  }

  get edgeCount(): number {
    let count = 0;
    for (const set of this._adjacency.values()) count += set.size;
    return count / 2;
  }

  addNode(id: string): void {
    if (!this._nodes.has(id)) {
      this._nodes.set(id, { id, depth: 0, connections: [], centrality: 0 });
      this._adjacency.set(id, new Set());
    }
  }

  connect(a: string, b: string): void {
    this.addNode(a);
    this.addNode(b);
    this._adjacency.get(a)!.add(b);
    this._adjacency.get(b)!.add(a);
    this._updateNode(a);
    this._updateNode(b);
    this._computePageRank();
  }

  private _updateNode(id: string): void {
    const node = this._nodes.get(id);
    if (!node) return;
    const neighbors = this._adjacency.get(id)!;
    node.connections = Array.from(neighbors);
    node.depth = this._bfsDepth(id);
  }

  private _bfsDepth(start: string): number {
    const visited = new Set<string>();
    const queue: [string, number][] = [[start, 0]];
    let maxDepth = 0;
    while (queue.length > 0) {
      const [id, d] = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);
      maxDepth = Math.max(maxDepth, d);
      for (const neighbor of this._adjacency.get(id) ?? []) {
        if (!visited.has(neighbor)) queue.push([neighbor, d + 1]);
      }
    }
    return maxDepth;
  }

  private _computePageRank(damping: number = 0.85, iterations: number = 20): void {
    const n = this._nodes.size;
    const ids = Array.from(this._nodes.keys());
    const ranks = new Map<string, number>(ids.map((id) => [id, 1 / n]));
    for (let iter = 0; iter < iterations; iter++) {
      const newRanks = new Map<string, number>();
      for (const id of ids) {
        let sum = 0;
        for (const neighbor of this._adjacency.get(id) ?? []) {
          const degree = this._adjacency.get(neighbor)!.size;
          sum += (ranks.get(neighbor) ?? 0) / (degree || 1);
        }
        newRanks.set(id, (1 - damping) / n + damping * sum);
      }
      ranks.clear();
      newRanks.forEach((v, k) => ranks.set(k, v));
    }
    this._pagerank = ranks;
  }

  betweennessCentrality(id: string): number {
    const pathsThrough = new Map<string, number>();
    for (const source of this._nodes.keys()) {
      for (const target of this._nodes.keys()) {
        if (source === target) continue;
        const path = this._shortestPath(source, target);
        if (path.includes(id)) {
          pathsThrough.set(id, (pathsThrough.get(id) ?? 0) + 1);
        }
      }
    }
    return pathsThrough.get(id) ?? 0;
  }

  private _shortestPath(start: string, end: string): string[] {
    const visited = new Set<string>();
    const parent = new Map<string, string | null>();
    const queue: string[] = [start];
    parent.set(start, null);
    while (queue.length > 0) {
      const curr = queue.shift()!;
      if (curr === end) break;
      for (const neighbor of this._adjacency.get(curr) ?? []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          parent.set(neighbor, curr);
          queue.push(neighbor);
        }
      }
    }
    const path: string[] = [];
    let curr: string | null = end;
    while (curr) {
      path.unshift(curr);
      curr = parent.get(curr) ?? null;
    }
    return path;
  }

  findCycles(): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const stack: string[] = [];
    const dfs = (node: string, parent: string | null): void => {
      visited.add(node);
      stack.push(node);
      for (const neighbor of this._adjacency.get(node) ?? []) {
        if (neighbor === parent) continue;
        if (visited.has(neighbor)) {
          const cycleStart = stack.indexOf(neighbor);
          if (cycleStart >= 0) cycles.push(stack.slice(cycleStart));
        } else {
          dfs(neighbor, node);
        }
      }
      stack.pop();
      visited.delete(node);
    };
    for (const id of this._nodes.keys()) dfs(id, null);
    return cycles;
  }

  stronglyConnectedComponents(): Map<string, number> {
    const index = new Map<string, number>();
    const lowlink = new Map<string, number>();
    const onStack = new Set<string>();
    const stack: string[] = [];
    let idx = 0;
    let componentId = 0;
    const strongConnect = (v: string): void => {
      index.set(v, idx);
      lowlink.set(v, idx);
      idx++;
      stack.push(v);
      onStack.add(v);
      for (const w of this._adjacency.get(v) ?? []) {
        if (!index.has(w)) {
          strongConnect(w);
          lowlink.set(v, Math.min(lowlink.get(v)!, lowlink.get(w)!));
        } else if (onStack.has(w)) {
          lowlink.set(v, Math.min(lowlink.get(v)!, index.get(w)!));
        }
      }
      if (lowlink.get(v) === index.get(v)) {
        while (true) {
          const w = stack.pop()!;
          onStack.delete(w);
          this._sccLabels.set(w, componentId);
          if (w === v) break;
        }
        componentId++;
      }
    };
    for (const v of this._nodes.keys()) {
      if (!index.has(v)) strongConnect(v);
    }
    return new Map(this._sccLabels);
  }

  pageRankOf(id: string): number {
    return this._pagerank.get(id) ?? 0;
  }

  report(): Record<string, unknown> {
    return {
      nodes: this._nodes.size,
      edges: this.edgeCount,
      pagerank: Object.fromEntries(this._pagerank),
      scc: Object.fromEntries(this._sccLabels),
      state: this._state,
    };
  }
}

export interface LinkNode {
  id: string;
  x: number;
  y: number;
  weight: number;
  capacity: number;
  flow: number;
}

export interface LinkEdge {
  from: string;
  to: string;
  weight: number;
  capacity: number;
  flow: number;
}

export class SubterraneanLink {
  private _nodes: Map<string, LinkNode> = new Map();
  private _edges: LinkEdge[] = [];
  private _adjacency: Map<string, Map<string, number>> = new Map();
  private _state: Record<string, unknown> = {};
  private _maxFlow: number = 0;
  private _cliques: string[][] = [];

  constructor() {}

  get nodeCount(): number {
    return this._nodes.size;
  }

  get edgeCount(): number {
    return this._edges.length;
  }

  addNode(id: string, x: number, y: number, capacity: number = 1): void {
    this._nodes.set(id, { id, x, y, weight: 0, capacity, flow: 0 });
    this._adjacency.set(id, new Map());
  }

  link(from: string, to: string, weight: number, capacity: number = 1): void {
    if (!this._nodes.has(from) || !this._nodes.has(to)) return;
    this._edges.push({ from, to, weight, capacity, flow: 0 });
    this._adjacency.get(from)!.set(to, weight);
    this._adjacency.get(to)!.set(from, weight);
  }

  shortestPath(start: string, end: string): { path: string[]; distance: number } {
    const dist = new Map<string, number>();
    const prev = new Map<string, string | null>();
    const visited = new Set<string>();
    for (const id of this._nodes.keys()) {
      dist.set(id, Infinity);
      prev.set(id, null);
    }
    dist.set(start, 0);
    while (visited.size < this._nodes.size) {
      let u: string | null = null;
      let minDist = Infinity;
      for (const [id, d] of dist) {
        if (!visited.has(id) && d < minDist) {
          minDist = d;
          u = id;
        }
      }
      if (u === null) break;
      visited.add(u);
      for (const [v, w] of this._adjacency.get(u)!) {
        if (!visited.has(v)) {
          const alt = (dist.get(u) ?? Infinity) + w;
          if (alt < (dist.get(v) ?? Infinity)) {
            dist.set(v, alt);
            prev.set(v, u);
          }
        }
      }
    }
    const path: string[] = [];
    let curr: string | null = end;
    while (curr) {
      path.unshift(curr);
      curr = prev.get(curr) ?? null;
    }
    return { path, distance: dist.get(end) ?? Infinity };
  }

  steinerTree(terminalIds: string[]): LinkEdge[] {
    if (terminalIds.length <= 1) return [];
    const mstEdges: LinkEdge[] = [];
    const inTree = new Set<string>([terminalIds[0]]);
    while (inTree.size < terminalIds.length) {
      let bestEdge: LinkEdge | null = null;
      let bestWeight = Infinity;
      for (const edge of this._edges) {
        const aIn = inTree.has(edge.from);
        const bIn = inTree.has(edge.to);
        if (aIn !== bIn && edge.weight < bestWeight) {
          bestWeight = edge.weight;
          bestEdge = edge;
        }
      }
      if (!bestEdge) break;
      mstEdges.push(bestEdge);
      inTree.add(bestEdge.from);
      inTree.add(bestEdge.to);
    }
    return mstEdges;
  }

  fordFulkerson(source: string, sink: string): number {
    let maxFlow = 0;
    const residual = new Map<string, Map<string, number>>();
    for (const edge of this._edges) {
      if (!residual.has(edge.from)) residual.set(edge.from, new Map());
      if (!residual.has(edge.to)) residual.set(edge.to, new Map());
      residual.get(edge.from)!.set(edge.to, edge.capacity);
      residual.get(edge.to)!.set(edge.from, 0);
    }
    const bfs = (): string[] | null => {
      const parent = new Map<string, string | null>();
      const queue: string[] = [source];
      parent.set(source, null);
      while (queue.length > 0) {
        const u = queue.shift()!;
        for (const [v, cap] of residual.get(u) ?? []) {
          if (!parent.has(v) && cap > 0) {
            parent.set(v, u);
            if (v === sink) {
              const path: string[] = [];
              let curr: string | null = v;
              while (curr) {
                path.unshift(curr);
                curr = parent.get(curr) ?? null;
              }
              return path;
            }
            queue.push(v);
          }
        }
      }
      return null;
    };
    while (true) {
      const path = bfs();
      if (!path) break;
      let pathFlow = Infinity;
      for (let i = 0; i < path.length - 1; i++) {
        pathFlow = Math.min(pathFlow, residual.get(path[i])!.get(path[i + 1])!);
      }
      for (let i = 0; i < path.length - 1; i++) {
        const u = path[i];
        const v = path[i + 1];
        residual.get(u)!.set(v, residual.get(u)!.get(v)! - pathFlow);
        residual.get(v)!.set(u, (residual.get(v)!.get(u) ?? 0) + pathFlow);
      }
      maxFlow += pathFlow;
    }
    this._maxFlow = maxFlow;
    return maxFlow;
  }

  findCliques(): string[][] {
    const cliques: string[][] = [];
    const bronKerbosch = (r: string[], p: Set<string>, x: Set<string>): void => {
      if (p.size === 0 && x.size === 0) {
        cliques.push([...r]);
        return;
      }
      for (const v of Array.from(p)) {
        const neighbors = new Set(this._adjacency.get(v)?.keys() ?? []);
        bronKerbosch([...r, v], new Set(Array.from(p).filter((u) => neighbors.has(u))), new Set(Array.from(x).filter((u) => neighbors.has(u))));
        p.delete(v);
        x.add(v);
      }
    };
    bronKerbosch([], new Set(this._nodes.keys()), new Set());
    this._cliques = cliques;
    return cliques;
  }

  report(): Record<string, unknown> {
    return {
      nodes: this._nodes.size,
      edges: this._edges.length,
      maxFlow: this._maxFlow,
      cliques: this._cliques.length,
      state: this._state,
    };
  }
}

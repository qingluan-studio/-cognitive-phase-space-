export interface RhizomeNode {
  id: string;
  payload: Record<string, unknown>;
  depth: number;
}

export interface RhizomeEdge {
  from: string;
  to: string;
  weight: number;
}

export class RhizomeConnector {
  private _nodes: Map<string, RhizomeNode> = new Map();
  private _edges: RhizomeEdge[] = [];
  private _adjacency: Map<string, Map<string, number>> = new Map();
  private _betweenness: Map<string, number> = new Map();
  private _clusteringCoefficients: Map<string, number> = new Map();

  addNode(id: string, payload: Record<string, unknown>, depth: number = 0): RhizomeNode {
    const node: RhizomeNode = { id, payload, depth };
    this._nodes.set(id, node);
    if (!this._adjacency.has(id)) this._adjacency.set(id, new Map());
    return node;
  }

  connect(from: string, to: string, weight: number = 1): RhizomeEdge | null {
    if (!this._nodes.has(from) || !this._nodes.has(to)) return null;
    const edge: RhizomeEdge = { from, to, weight };
    this._edges.push(edge);
    this._adjacency.get(from)?.set(to, weight);
    this._adjacency.get(to)?.set(from, weight);
    this._recomputeCentrality();
    this._recomputeClustering();
    return edge;
  }

  private _recomputeCentrality(): void {
    for (const node of this._nodes.keys()) {
      let betweenness = 0;
      for (const s of this._nodes.keys()) {
        for (const t of this._nodes.keys()) {
          if (s === t || s === node || t === node) continue;
          const paths = this._countShortestPaths(s, t);
          const throughNode = this._countShortestPathsThrough(s, t, node);
          betweenness += paths > 0 ? throughNode / paths : 0;
        }
      }
      this._betweenness.set(node, betweenness / 2);
    }
  }

  private _countShortestPaths(start: string, end: string): number {
    const distances = new Map<string, number>();
    const counts = new Map<string, number>();
    const queue: string[] = [start];
    distances.set(start, 0);
    counts.set(start, 1);
    for (let i = 0; i < queue.length; i++) {
      const current = queue[i];
      const dist = distances.get(current)!;
      for (const [neighbor, w] of this._adjacency.get(current) ?? []) {
        if (!distances.has(neighbor)) {
          distances.set(neighbor, dist + 1 / w);
          counts.set(neighbor, counts.get(current)!);
          queue.push(neighbor);
        } else if (distances.get(neighbor) === dist + 1 / w) {
          counts.set(neighbor, counts.get(neighbor)! + counts.get(current)!);
        }
      }
    }
    return counts.get(end) ?? 0;
  }

  private _countShortestPathsThrough(start: string, end: string, through: string): number {
    return this._countShortestPaths(start, through) * this._countShortestPaths(through, end);
  }

  private _recomputeClustering(): void {
    for (const [node, neighbors] of this._adjacency) {
      const neighborList = Array.from(neighbors.keys());
      const n = neighborList.length;
      if (n < 2) {
        this._clusteringCoefficients.set(node, 0);
        continue;
      }
      let triangles = 0;
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          if (this._adjacency.get(neighborList[i])?.has(neighborList[j])) triangles++;
        }
      }
      this._clusteringCoefficients.set(node, (2 * triangles) / (n * (n - 1)));
    }
  }

  findPath(start: string, end: string): string[] | null {
    if (!this._nodes.has(start) || !this._nodes.has(end)) return null;
    const distances = new Map<string, number>();
    const previous = new Map<string, string | null>();
    const unvisited = new Set<string>();
    for (const node of this._nodes.keys()) {
      distances.set(node, node === start ? 0 : Infinity);
      previous.set(node, null);
      unvisited.add(node);
    }
    while (unvisited.size > 0) {
      let current = '';
      let minDist = Infinity;
      for (const node of unvisited) {
        const d = distances.get(node)!;
        if (d < minDist) { minDist = d; current = node; }
      }
      if (current === '' || current === end) break;
      unvisited.delete(current);
      for (const [neighbor, w] of this._adjacency.get(current) ?? []) {
        if (!unvisited.has(neighbor)) continue;
        const alt = distances.get(current)! + 1 / w;
        if (alt < distances.get(neighbor)!) {
          distances.set(neighbor, alt);
          previous.set(neighbor, current);
        }
      }
    }
    if (distances.get(end) === Infinity) return null;
    const path: string[] = [];
    let at: string | null = end;
    while (at !== null) { path.unshift(at); at = previous.get(at) ?? null; }
    return path;
  }

  getNode(id: string): RhizomeNode | null {
    return this._nodes.get(id) ?? null;
  }

  neighbors(id: string): string[] {
    return Array.from(this._adjacency.get(id)?.keys() ?? []);
  }
  getBetweennessCentrality(id: string): number {
    return this._betweenness.get(id) ?? 0;
  }

  getClusteringCoefficient(id: string): number {
    return this._clusteringCoefficients.get(id) ?? 0;
  }
  averagePathLength(): number {
    let total = 0;
    let count = 0;
    for (const a of this._nodes.keys()) {
      for (const b of this._nodes.keys()) {
        if (a >= b) continue;
        const path = this.findPath(a, b);
        if (path) { total += path.length - 1; count++; }
      }
    }
    return count > 0 ? total / count : 0;
  }

  smallWorldIndex(): number {
    const avgPath = this.averagePathLength();
    const avgCluster = Array.from(this._clusteringCoefficients.values()).reduce((a, b) => a + b, 0) / this._nodes.size;
    return avgPath > 0 ? avgCluster / avgPath : 0;
  }
  get nodeCount(): number {
    return this._nodes.size;
  }

  get edgeCount(): number {
    return this._edges.length;
  }
  prune(weightThreshold: number): number {
    let removed = 0;
    this._edges = this._edges.filter(e => {
      if (e.weight < weightThreshold) {
        this._adjacency.get(e.from)?.delete(e.to);
        this._adjacency.get(e.to)?.delete(e.from);
        removed++;
        return false;
      }
      return true;
    });
    this._recomputeCentrality();
    this._recomputeClustering();
    return removed;
  }

  getNetworkDensity(): number {
    const n = this._nodes.size;
    return n > 1 ? (2 * this._edges.length) / (n * (n - 1)) : 0;
  }

  getDegreeDistribution(): Map<number, number> {
    const dist = new Map<number, number>();
    for (const [node, neighbors] of this._adjacency) {
      const d = neighbors.size;
      dist.set(d, (dist.get(d) ?? 0) + 1);
    }
    return dist;
  }
}

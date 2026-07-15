export interface MapNode {
  id: string;
  x: number;
  y: number;
  salience: number;
}

export interface MapEdge {
  source: string;
  target: string;
  weight: number;
  traversals: number;
}

export class CognitiveMap {
  private _nodes: Map<string, MapNode>;
  private _edges: Map<string, MapEdge>;
  private _adjacency: Map<string, Map<string, number>>;
  private _activation: Map<string, number>;
  private _history: Map<string, number>[];
  private _decayRate: number;

  constructor(decayRate: number = 0.1) {
    this._nodes = new Map();
    this._edges = new Map();
    this._adjacency = new Map();
    this._activation = new Map();
    this._history = [];
    this._decayRate = decayRate;
  }

  get nodeCount(): number { return this._nodes.size; }
  get edgeCount(): number { return this._edges.size; }
  get decayRate(): number { return this._decayRate; }

  public addNode(id: string, x: number = 0, y: number = 0, salience: number = 1.0): void {
    this._nodes.set(id, { id, x, y, salience });
    this._adjacency.set(id, new Map());
    this._activation.set(id, 0);
  }

  public addEdge(source: string, target: string, weight: number = 1.0): void {
    if (!this._nodes.has(source)) this.addNode(source);
    if (!this._nodes.has(target)) this.addNode(target);
    const key = `${source}->${target}`;
    this._edges.set(key, { source, target, weight, traversals: 0 });
    this._adjacency.get(source)!.set(target, weight);
    this._adjacency.get(target)!.set(source, weight);
  }

  public activateNode(id: string, strength: number = 1.0): void {
    if (this._nodes.has(id)) {
      this._activation.set(id, (this._activation.get(id) || 0) + strength);
    }
  }

  public spreadActivation(iterations: number = 5): void {
    for (let i = 0; i < iterations; i++) {
      const newActivation = new Map(this._activation);
      for (const [nodeId, act] of this._activation) {
        if (act > 0.01) {
          const neighbors = this._adjacency.get(nodeId);
          if (neighbors) {
            for (const [neighborId, weight] of neighbors) {
              const spread = act * weight * (1 - this._decayRate);
              newActivation.set(neighborId, (newActivation.get(neighborId) || 0) + spread);
            }
          }
        }
      }
      for (const [id, val] of newActivation) {
        newActivation.set(id, val * (1 - this._decayRate));
      }
      this._activation = newActivation;
      this._history.push(new Map(this._activation));
    }
  }

  public findShortestPath(start: string, goal: string): string[] {
    if (!this._nodes.has(start) || !this._nodes.has(goal)) return [];
    const dist = new Map<string, number>();
    const prev = new Map<string, string | null>();
    const unvisited = new Set<string>();
    for (const id of this._nodes.keys()) {
      dist.set(id, Infinity);
      prev.set(id, null);
      unvisited.add(id);
    }
    dist.set(start, 0);
    while (unvisited.size > 0) {
      let current = '';
      let minDist = Infinity;
      for (const id of unvisited) {
        if (dist.get(id)! < minDist) {
          minDist = dist.get(id)!;
          current = id;
        }
      }
      if (current === '' || current === goal) break;
      unvisited.delete(current);
      const neighbors = this._adjacency.get(current);
      if (neighbors) {
        for (const [neighbor, weight] of neighbors) {
          if (unvisited.has(neighbor)) {
            const alt = dist.get(current)! + 1 / weight;
            if (alt < dist.get(neighbor)!) {
              dist.set(neighbor, alt);
              prev.set(neighbor, current);
            }
          }
        }
      }
    }
    const path: string[] = [];
    let at: string | null = goal;
    while (at !== null) {
      path.unshift(at);
      at = prev.get(at)!;
    }
    return path[0] === start ? path : [];
  }

  public computeCentrality(nodeId: string): number {
    if (!this._nodes.has(nodeId)) return 0;
    const paths = this._floydWarshall();
    let sum = 0;
    for (const [i, row] of paths) {
      for (const [j, dist] of row) {
        if (i !== j && i === nodeId) sum += dist;
      }
    }
    return sum > 0 ? 1 / sum : 0;
  }

  private _floydWarshall(): Map<string, Map<string, number>> {
    const dist = new Map<string, Map<string, number>>();
    const nodes = Array.from(this._nodes.keys());
    for (const i of nodes) {
      dist.set(i, new Map());
      for (const j of nodes) {
        dist.get(i)!.set(j, i === j ? 0 : Infinity);
      }
    }
    for (const [key, edge] of this._edges) {
      dist.get(edge.source)!.set(edge.target, 1 / edge.weight);
    }
    for (const k of nodes) {
      for (const i of nodes) {
        for (const j of nodes) {
          const dIK = dist.get(i)!.get(k)!;
          const dKJ = dist.get(k)!.get(j)!;
          const dIJ = dist.get(i)!.get(j)!;
          if (dIK + dKJ < dIJ) {
            dist.get(i)!.set(j, dIK + dKJ);
          }
        }
      }
    }
    return dist;
  }

  public computeClusteringCoefficient(nodeId: string): number {
    const neighbors = Array.from(this._adjacency.get(nodeId)?.keys() || []);
    const n = neighbors.length;
    if (n < 2) return 0;
    let edges = 0;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (this._adjacency.get(neighbors[i])?.has(neighbors[j])) edges++;
      }
    }
    return edges / (n * (n - 1) / 2);
  }

  public computeMapEntropy(): number {
    const totalWeight = Array.from(this._edges.values()).reduce((sum, e) => sum + e.weight, 0);
    if (totalWeight === 0) return 0;
    let entropy = 0;
    for (const edge of this._edges.values()) {
      const p = edge.weight / totalWeight;
      entropy -= p * Math.log2(p);
    }
    return entropy;
  }

  public traverseEdge(source: string, target: string): void {
    const key = `${source}->${target}`;
    const edge = this._edges.get(key);
    if (edge) {
      edge.traversals++;
      edge.weight += 0.1;
    }
  }

  public reinforcePath(path: string[], amount: number = 0.1): void {
    for (let i = 0; i < path.length - 1; i++) {
      const key = `${path[i]}->${path[i + 1]}`;
      const edge = this._edges.get(key);
      if (edge) {
        edge.weight += amount;
        this._adjacency.get(path[i])!.set(path[i + 1], edge.weight);
      }
    }
  }

  public getActiveNodes(threshold: number = 0.5): string[] {
    const active: string[] = [];
    for (const [id, val] of this._activation) {
      if (val > threshold) active.push(id);
    }
    return active;
  }

  public getMostSalientNode(): string | null {
    let maxSalience = -Infinity;
    let maxId: string | null = null;
    for (const [id, node] of this._nodes) {
      if (node.salience > maxSalience) {
        maxSalience = node.salience;
        maxId = id;
      }
    }
    return maxId;
  }

  public decayAll(): void {
    for (const [id, val] of this._activation) {
      this._activation.set(id, val * (1 - this._decayRate));
    }
  }

  public resetActivations(): void {
    for (const id of this._activation.keys()) {
      this._activation.set(id, 0);
    }
    this._history = [];
  }

  public reset(): void {
    this._nodes.clear();
    this._edges.clear();
    this._adjacency.clear();
    this._activation.clear();
    this._history = [];
  }

  public exportMap(): { nodes: MapNode[]; edges: MapEdge[] } {
    return {
      nodes: Array.from(this._nodes.values()),
      edges: Array.from(this._edges.values())
    };
  }
}

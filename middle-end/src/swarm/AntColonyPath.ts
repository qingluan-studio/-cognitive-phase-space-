export interface PathNode {
  id: string;
  x: number;
  y: number;
}

export interface PheromoneEdge {
  from: string;
  to: string;
  pheromone: number;
  distance: number;
  heuristic: number;
}

export interface AntPath {
  antId: string;
  nodes: string[];
  totalDistance: number;
  completed: boolean;
  iterations: number;
}

export class AntColonyPath {
  private _nodes: Map<string, PathNode> = new Map();
  private _edges: Map<string, PheromoneEdge> = new Map();
  private _paths: AntPath[] = [];
  private _alpha = 1.0;
  private _beta = 2.0;
  private _evaporation = 0.1;
  private _deposit = 1.0;
  private _eliteBonus = 0.5;
  private _bestPath: AntPath | null = null;
  private _iterationCount = 0;

  addNode(node: PathNode): void {
    this._nodes.set(node.id, node);
  }

  private _edgeKey(a: string, b: string): string {
    return a < b ? `${a}-${b}` : `${b}-${a}`;
  }

  addEdge(a: string, b: string): PheromoneEdge | null {
    const na = this._nodes.get(a);
    const nb = this._nodes.get(b);
    if (!na || !nb) return null;
    const distance = Math.max(0.0001, Math.sqrt((na.x - nb.x) ** 2 + (na.y - nb.y) ** 2));
    const edge: PheromoneEdge = {
      from: a,
      to: b,
      pheromone: 0.1,
      distance,
      heuristic: 1 / distance,
    };
    this._edges.set(this._edgeKey(a, b), edge);
    return edge;
  }

  private _neighbors(node: string): { id: string; edge: PheromoneEdge }[] {
    const out: { id: string; edge: PheromoneEdge }[] = [];
    for (const [key, edge] of this._edges) {
      if (edge.from === node) out.push({ id: edge.to, edge });
      else if (edge.to === node) out.push({ id: edge.from, edge });
      void key;
    }
    return out;
  }

  private _selectNext(current: string, visited: Set<string>): string | null {
    const candidates = this._neighbors(current).filter(c => !visited.has(c.id));
    if (candidates.length === 0) return null;
    const weights = candidates.map(c => {
      const tau = Math.pow(c.edge.pheromone, this._alpha);
      const eta = Math.pow(c.edge.heuristic, this._beta);
      return tau * eta;
    });
    const total = weights.reduce((s, w) => s + w, 0);
    if (total === 0) return candidates[Math.floor(Math.random() * candidates.length)].id;
    let r = Math.random() * total;
    for (let i = 0; i < candidates.length; i++) {
      r -= weights[i];
      if (r <= 0) return candidates[i].id;
    }
    return candidates[candidates.length - 1].id;
  }

  dispatchAnt(antId: string, start: string, end: string): AntPath {
    this._iterationCount += 1;
    const path: string[] = [start];
    const visited = new Set<string>([start]);
    let current = start;
    let totalDistance = 0;
    let steps = 0;
    while (current !== end && visited.size < this._nodes.size && steps < this._nodes.size * 2) {
      const next = this._selectNext(current, visited);
      if (!next) break;
      const edge = this._edges.get(this._edgeKey(current, next));
      if (edge) totalDistance += edge.distance;
      path.push(next);
      visited.add(next);
      current = next;
      steps++;
    }
    const completed = current === end;
    const antPath: AntPath = {
      antId,
      nodes: path,
      totalDistance,
      completed,
      iterations: this._iterationCount,
    };
    this._paths.push(antPath);
    if (this._paths.length > 200) this._paths.shift();
    if (completed) {
      this._depositPheromones(path, totalDistance);
      if (!this._bestPath || totalDistance < this._bestPath.totalDistance) {
        this._bestPath = antPath;
        this._depositElite(path, totalDistance);
      }
    }
    return antPath;
  }

  private _depositPheromones(path: string[], distance: number): void {
    if (distance === 0) return;
    const deposit = this._deposit / distance;
    for (let i = 0; i < path.length - 1; i++) {
      const edge = this._edges.get(this._edgeKey(path[i], path[i + 1]));
      if (edge) edge.pheromone += deposit;
    }
  }

  private _depositElite(path: string[], distance: number): void {
    if (distance === 0) return;
    const bonus = this._eliteBonus / distance;
    for (let i = 0; i < path.length - 1; i++) {
      const edge = this._edges.get(this._edgeKey(path[i], path[i + 1]));
      if (edge) edge.pheromone += bonus;
    }
  }

  evaporate(): void {
    for (const edge of this._edges.values()) {
      edge.pheromone = Math.max(0.01, edge.pheromone * (1 - this._evaporation));
    }
  }

  getBestPath(): AntPath | null {
    return this._bestPath;
  }

  computeConvergence(): number {
    if (this._edges.size === 0) return 0;
    const phers = Array.from(this._edges.values()).map(e => e.pheromone);
    const sum = phers.reduce((s, p) => s + p, 0);
    if (sum === 0) return 0;
    const probs = phers.map(p => p / sum);
    let h = 0;
    for (const p of probs) if (p > 0) h -= p * Math.log2(p);
    return 1 - h / Math.log2(phers.length);
  }

  getPheromoneEdge(a: string, b: string): PheromoneEdge | null {
    return this._edges.get(this._edgeKey(a, b)) ?? null;
  }

  setParams(alpha: number, beta: number, evaporation: number): void {
    this._alpha = Math.max(0, alpha);
    this._beta = Math.max(0, beta);
    this._evaporation = Math.max(0, Math.min(1, evaporation));
  }

  setEliteBonus(value: number): void {
    this._eliteBonus = Math.max(0, value);
  }

  get nodeCount(): number {
    return this._nodes.size;
  }

  get edgeCount(): number {
    return this._edges.size;
  }

  get iterationCount(): number {
    return this._iterationCount;
  }
}

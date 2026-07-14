/**
 * 蚁群路径模块：基于信息素浓度动态优化路径选择，
 * 蚂蚁随机探索后留下信息素，后续蚂蚁倾向于走浓度更高的路径，
 * 最终收敛到接近最优的解。
 */

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
}

export interface AntPath {
  antId: string;
  nodes: string[];
  totalDistance: number;
  completed: boolean;
}

export class AntColonyPath {
  private _nodes: Map<string, PathNode> = new Map();
  private _edges: Map<string, PheromoneEdge> = new Map();
  private _paths: AntPath[] = [];
  private _alpha = 1.0;
  private _beta = 2.0;
  private _evaporation = 0.1;
  private _deposit = 1.0;

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
    const distance = Math.sqrt((na.x - nb.x) ** 2 + (na.y - nb.y) ** 2);
    const edge: PheromoneEdge = { from: a, to: b, pheromone: 0.1, distance };
    this._edges.set(this._edgeKey(a, b), edge);
    return edge;
  }

  private _selectNext(current: string, visited: Set<string>): string | null {
    const candidates: { nodeId: string; probability: number }[] = [];
    let total = 0;
    for (const [key, edge] of this._edges) {
      let neighbor: string | null = null;
      if (edge.from === current && !visited.has(edge.to)) neighbor = edge.to;
      else if (edge.to === current && !visited.has(edge.from)) neighbor = edge.from;
      if (!neighbor) continue;
      const tau = Math.pow(edge.pheromone, this._alpha);
      const eta = Math.pow(1 / edge.distance, this._beta);
      const probability = tau * eta;
      candidates.push({ nodeId: neighbor, probability });
      total += probability;
    }
    if (candidates.length === 0 || total === 0) return null;
    let r = Math.random() * total;
    for (const c of candidates) {
      r -= c.probability;
      if (r <= 0) return c.nodeId;
    }
    return candidates[candidates.length - 1].nodeId;
  }

  dispatchAnt(antId: string, start: string, end: string): AntPath {
    const path: string[] = [start];
    const visited = new Set<string>([start]);
    let current = start;
    let totalDistance = 0;
    while (current !== end && visited.size < this._nodes.size) {
      const next = this._selectNext(current, visited);
      if (!next) break;
      const edge = this._edges.get(this._edgeKey(current, next));
      if (edge) totalDistance += edge.distance;
      path.push(next);
      visited.add(next);
      current = next;
    }
    const completed = current === end;
    const antPath: AntPath = { antId, nodes: path, totalDistance, completed };
    this._paths.push(antPath);
    if (completed) this._depositPheromones(path, totalDistance);
    if (this._paths.length > 200) this._paths.shift();
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

  evaporate(): void {
    for (const edge of this._edges.values()) {
      edge.pheromone = Math.max(0.01, edge.pheromone * (1 - this._evaporation));
    }
  }

  getBestPath(): AntPath | null {
    const completed = this._paths.filter(p => p.completed);
    if (completed.length === 0) return null;
    return completed.reduce((best, p) => (p.totalDistance < best.totalDistance ? p : best));
  }

  getPheromoneEdge(a: string, b: string): PheromoneEdge | null {
    return this._edges.get(this._edgeKey(a, b)) ?? null;
  }

  setParams(alpha: number, beta: number, evaporation: number): void {
    this._alpha = alpha;
    this._beta = beta;
    this._evaporation = Math.max(0, Math.min(1, evaporation));
  }

  get nodeCount(): number {
    return this._nodes.size;
  }

  get edgeCount(): number {
    return this._edges.size;
  }
}

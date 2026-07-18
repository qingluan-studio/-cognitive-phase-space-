import type { DataPacket, KnowledgeUnit } from '../shared/types';

export type TieType = 'friendship' | 'collaboration' | 'conflict' | 'hierarchy' | 'information' | 'trust';

export type CentralityType = 'degree' | 'betweenness' | 'closeness' | 'eigenvector' | 'pagerank';

export interface Actor {
  id: string;
  name: string;
  attributes: Record<string, number>;
  group: string;
  status: number;
  activityLevel: number;
}

export interface SocialTie {
  id: string;
  source: string;
  target: string;
  type: TieType;
  weight: number;
  strength: number;
  reciprocated: boolean;
  createdAt: number;
}

export interface NetworkMetrics {
  nodeCount: number;
  edgeCount: number;
  density: number;
  avgDegree: number;
  diameter: number;
  clusteringCoefficient: number;
  centralization: number;
  assortativity: number;
  components: number;
}

export interface CentralityScores {
  id: string;
  degree: number;
  betweenness: number;
  closeness: number;
  eigenvector: number;
  pagerank: number;
}

export interface ISocialNetwork {
  addActor(id: string, name: string, group?: string): void;
  removeActor(id: string): void;
  addTie(source: string, target: string, type: TieType, weight: number): void;
  removeTie(source: string, target: string, type?: TieType): void;
  computeCentrality(actorId: string, type: CentralityType): number;
  computeAllCentralities(): CentralityScores[];
  getMetrics(): NetworkMetrics;
  getActor(id: string): Actor | undefined;
  getNeighbors(actorId: string): string[];
  update(deltaTime: number): void;
  processPacket(packet: DataPacket): DataPacket;
  reset(): void;
}

export class SocialNetwork implements ISocialNetwork {
  private _actors: Map<string, Actor> = new Map();
  private _ties: SocialTie[] = [];
  private _adjacency: Map<string, Map<string, SocialTie[]>> = new Map();
  private _centralityCache: Map<string, CentralityScores> = new Map();
  private _metricsCache: NetworkMetrics | null = null;
  private _history: NetworkMetrics[] = [];
  private _maxHistory: number = 100;
  private _lastUpdate: number = Date.now();
  private _decayRate: number = 0.001;
  private _growthRate: number = 0.002;
  private _reciprocityBias: number = 0.7;
  private _homophilyBias: number = 0.5;
  private _cacheDirty: boolean = true;

  constructor() {
    this._initializeDefaultNetwork();
  }

  get actorCount(): number { return this._actors.size; }
  get tieCount(): number { return this._ties.length; }
  get decayRate(): number { return this._decayRate; }
  set decayRate(value: number) { this._decayRate = Math.max(0, Math.min(0.01, value)); }
  get growthRate(): number { return this._growthRate; }
  set growthRate(value: number) { this._growthRate = Math.max(0, Math.min(0.01, value)); }
  get reciprocityBias(): number { return this._reciprocityBias; }
  set reciprocityBias(value: number) { this._reciprocityBias = Math.max(0, Math.min(1, value)); }

  private _initializeDefaultNetwork(): void {
    const groups = ['A', 'B', 'C'];
    const names = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry'];

    for (let i = 0; i < 8; i++) {
      this.addActor(`actor-${i}`, names[i], groups[i % 3]);
    }

    const tieTypes: TieType[] = ['friendship', 'collaboration', 'information', 'trust'];
    for (let i = 0; i < 8; i++) {
      for (let j = i + 1; j < 8; j++) {
        if (Math.random() < 0.4) {
          const type = tieTypes[Math.floor(Math.random() * tieTypes.length)];
          const weight = 0.3 + Math.random() * 0.7;
          this.addTie(`actor-${i}`, `actor-${j}`, type, weight);
        }
      }
    }

    this._updateActorStatus();
  }

  addActor(id: string, name: string, group: string = 'default'): void {
    if (this._actors.has(id)) return;

    const actor: Actor = {
      id,
      name,
      attributes: {},
      group,
      status: 0.5,
      activityLevel: 0.3 + Math.random() * 0.4,
    };

    this._actors.set(id, actor);
    this._adjacency.set(id, new Map());
    this._cacheDirty = true;
  }

  removeActor(id: string): void {
    this._actors.delete(id);
    this._adjacency.delete(id);
    this._ties = this._ties.filter(t => t.source !== id && t.target !== id);

    for (const [actorId, targets] of this._adjacency) {
      targets.delete(id);
    }

    this._centralityCache.delete(id);
    this._cacheDirty = true;
  }

  addTie(source: string, target: string, type: TieType, weight: number): void {
    if (!this._actors.has(source) || !this._actors.has(target)) return;
    if (source === target) return;

    const id = `${source}:${target}:${type}`;
    const existing = this._ties.find(t => t.id === id);

    if (existing) {
      existing.weight = weight;
      existing.strength = Math.min(1, existing.strength + 0.1);
      this._cacheDirty = true;
      return;
    }

    const tie: SocialTie = {
      id,
      source,
      target,
      type,
      weight,
      strength: weight,
      reciprocated: false,
      createdAt: Date.now(),
    };

    this._ties.push(tie);

    const sourceMap = this._adjacency.get(source);
    if (sourceMap) {
      if (!sourceMap.has(target)) {
        sourceMap.set(target, []);
      }
      sourceMap.get(target)!.push(tie);
    }

    const reverseId = `${target}:${source}:${type}`;
    const reverseExists = this._ties.find(t => t.id === reverseId);
    if (reverseExists) {
      tie.reciprocated = true;
      reverseExists.reciprocated = true;
    }

    this._centralityCache.clear();
    this._cacheDirty = true;
  }

  removeTie(source: string, target: string, type?: TieType): void {
    const predicate = (t: SocialTie) =>
      t.source === source && t.target === target && (type === undefined || t.type === type);

    const toRemove = this._ties.filter(predicate);
    this._ties = this._ties.filter(t => !predicate(t));

    const sourceMap = this._adjacency.get(source);
    if (sourceMap && sourceMap.has(target)) {
      const remaining = sourceMap.get(target)!.filter(t => !predicate(t));
      if (remaining.length === 0) {
        sourceMap.delete(target);
      } else {
        sourceMap.set(target, remaining);
      }
    }

    for (const removed of toRemove) {
      const reverseId = `${removed.target}:${removed.source}:${removed.type}`;
      const reverse = this._ties.find(t => t.id === reverseId);
      if (reverse) {
        reverse.reciprocated = false;
      }
    }

    this._centralityCache.clear();
    this._cacheDirty = true;
  }

  computeCentrality(actorId: string, type: CentralityType): number {
    if (!this._actors.has(actorId)) return 0;
    if (this._centralityCache.has(actorId)) {
      return this._centralityCache.get(actorId)![type];
    }
    this.computeAllCentralities();
    return this._centralityCache.get(actorId)?.[type] || 0;
  }

  computeAllCentralities(): CentralityScores[] {
    const nodeIds = Array.from(this._actors.keys());
    const n = nodeIds.length;
    if (n === 0) return [];

    const indexMap = new Map<string, number>();
    nodeIds.forEach((id, i) => indexMap.set(id, i));

    const adjMatrix: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));

    for (const tie of this._ties) {
      const i = indexMap.get(tie.source);
      const j = indexMap.get(tie.target);
      if (i !== undefined && j !== undefined) {
        adjMatrix[i][j] = Math.max(adjMatrix[i][j], tie.weight);
      }
    }

    const degree = this._computeDegreeCentrality(adjMatrix, n);
    const betweenness = this._computeBetweennessCentrality(adjMatrix, n);
    const closeness = this._computeClosenessCentrality(adjMatrix, n);
    const eigenvector = this._computeEigenvectorCentrality(adjMatrix, n);
    const pagerank = this._computePageRank(adjMatrix, n);

    const results: CentralityScores[] = [];
    for (let i = 0; i < n; i++) {
      const scores: CentralityScores = {
        id: nodeIds[i],
        degree: degree[i],
        betweenness: betweenness[i],
        closeness: closeness[i],
        eigenvector: eigenvector[i],
        pagerank: pagerank[i],
      };
      this._centralityCache.set(nodeIds[i], scores);
      results.push(scores);
    }

    return results;
  }

  private _computeDegreeCentrality(adj: number[][], n: number): number[] {
    const result = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      let count = 0;
      for (let j = 0; j < n; j++) {
        if (adj[i][j] > 0 || adj[j][i] > 0) count++;
      }
      result[i] = n > 1 ? count / (n - 1) : 0;
    }
    return result;
  }

  private _computeBetweennessCentrality(adj: number[][], n: number): number[] {
    const cb = new Array(n).fill(0);

    for (let s = 0; s < n; s++) {
      const dist = new Array(n).fill(Infinity);
      const sigma = new Array(n).fill(0);
      const pred: number[][] = Array.from({ length: n }, () => []);
      const stack: number[] = [];
      const queue: number[] = [];

      dist[s] = 0;
      sigma[s] = 1;
      queue.push(s);

      while (queue.length > 0) {
        const v = queue.shift()!;
        stack.push(v);
        for (let w = 0; w < n; w++) {
          if (adj[v][w] > 0) {
            if (dist[w] === Infinity) {
              dist[w] = dist[v] + 1;
              queue.push(w);
            }
            if (dist[w] === dist[v] + 1) {
              sigma[w] += sigma[v];
              pred[w].push(v);
            }
          }
        }
      }

      const delta = new Array(n).fill(0);
      while (stack.length > 0) {
        const w = stack.pop()!;
        for (const v of pred[w]) {
          delta[v] += (sigma[v] / sigma[w]) * (1 + delta[w]);
        }
        if (w !== s) {
          cb[w] += delta[w];
        }
      }
    }

    const denom = (n - 1) * (n - 2) / 2;
    return denom > 0 ? cb.map(v => v / denom) : cb;
  }

  private _computeClosenessCentrality(adj: number[][], n: number): number[] {
    const result = new Array(n).fill(0);

    for (let s = 0; s < n; s++) {
      const dist = new Array(n).fill(Infinity);
      const queue: number[] = [];
      dist[s] = 0;
      queue.push(s);

      while (queue.length > 0) {
        const v = queue.shift()!;
        for (let w = 0; w < n; w++) {
          if (adj[v][w] > 0 && dist[w] === Infinity) {
            dist[w] = dist[v] + 1;
            queue.push(w);
          }
        }
      }

      let sum = 0;
      let reachable = 0;
      for (let i = 0; i < n; i++) {
        if (dist[i] !== Infinity && i !== s) {
          sum += dist[i];
          reachable++;
        }
      }

      result[s] = sum > 0 ? reachable / sum : 0;
    }

    return result;
  }

  private _computeEigenvectorCentrality(adj: number[][], n: number): number[] {
    let x = new Array(n).fill(1 / n);
    const maxIter = 100;
    const tolerance = 1e-6;

    for (let iter = 0; iter < maxIter; iter++) {
      const y = new Array(n).fill(0);
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          y[i] += adj[i][j] * x[j];
        }
      }

      let norm = 0;
      for (const val of y) norm += val * val;
      norm = Math.sqrt(norm);
      if (norm === 0) break;

      let diff = 0;
      for (let i = 0; i < n; i++) {
        const newVal = y[i] / norm;
        diff += Math.abs(newVal - x[i]);
        x[i] = newVal;
      }

      if (diff < tolerance) break;
    }

    return x;
  }

  private _computePageRank(adj: number[][], n: number): number[] {
    const damping = 0.85;
    let pr = new Array(n).fill(1 / n);
    const maxIter = 100;
    const tolerance = 1e-6;

    const outDeg = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (adj[i][j] > 0) outDeg[i]++;
      }
    }

    for (let iter = 0; iter < maxIter; iter++) {
      const newPr = new Array(n).fill((1 - damping) / n);
      let dangling = 0;

      for (let i = 0; i < n; i++) {
        if (outDeg[i] === 0) dangling += pr[i];
      }

      for (let j = 0; j < n; j++) {
        newPr[j] += damping * dangling / n;
        for (let i = 0; i < n; i++) {
          if (adj[i][j] > 0 && outDeg[i] > 0) {
            newPr[j] += damping * pr[i] / outDeg[i];
          }
        }
      }

      let diff = 0;
      for (let i = 0; i < n; i++) {
        diff += Math.abs(newPr[i] - pr[i]);
      }

      pr = newPr;
      if (diff < tolerance) break;
    }

    return pr;
  }

  getMetrics(): NetworkMetrics {
    if (!this._cacheDirty && this._metricsCache) {
      return { ...this._metricsCache };
    }

    const n = this._actors.size;
    const e = this._ties.length;
    const density = n > 1 ? e / (n * (n - 1)) : 0;
    const avgDegree = n > 0 ? (2 * e) / n : 0;

    let clusteringSum = 0;
    let clusteringCount = 0;
    for (const actorId of this._actors.keys()) {
      const neighbors = this.getNeighbors(actorId);
      if (neighbors.length < 2) continue;

      let edgeCount = 0;
      for (let i = 0; i < neighbors.length; i++) {
        for (let j = i + 1; j < neighbors.length; j++) {
          if (this._hasTie(neighbors[i], neighbors[j])) {
            edgeCount++;
          }
        }
      }

      const possible = neighbors.length * (neighbors.length - 1) / 2;
      clusteringSum += possible > 0 ? edgeCount / possible : 0;
      clusteringCount++;
    }

    const clusteringCoefficient = clusteringCount > 0 ? clusteringSum / clusteringCount : 0;

    this._metricsCache = {
      nodeCount: n,
      edgeCount: e,
      density,
      avgDegree,
      diameter: this._computeDiameter(),
      clusteringCoefficient,
      centralization: this._computeCentralization(),
      assortativity: this._computeAssortativity(),
      components: this._countComponents(),
    };

    this._cacheDirty = false;
    return { ...this._metricsCache };
  }

  private _hasTie(a: string, b: string): boolean {
    const aMap = this._adjacency.get(a);
    return aMap?.has(b) || false;
  }

  private _computeDiameter(): number {
    const nodeIds = Array.from(this._actors.keys());
    const n = nodeIds.length;
    if (n < 2) return 0;

    let maxDist = 0;
    for (let s = 0; s < n; s++) {
      const dist = new Array(n).fill(Infinity);
      const queue: number[] = [s];
      dist[s] = 0;

      while (queue.length > 0) {
        const v = queue.shift()!;
        const neighbors = this.getNeighbors(nodeIds[v]);
        for (const neighborId of neighbors) {
          const w = nodeIds.indexOf(neighborId);
          if (dist[w] === Infinity) {
            dist[w] = dist[v] + 1;
            queue.push(w);
            maxDist = Math.max(maxDist, dist[w]);
          }
        }
      }
    }

    return maxDist;
  }

  private _computeCentralization(): number {
    const centralities = this.computeAllCentralities();
    const degrees = centralities.map(c => c.degree);
    const maxDegree = Math.max(...degrees);
    const sumDiff = degrees.reduce((s, d) => s + (maxDegree - d), 0);
    const n = degrees.length;
    const maxPossible = n > 1 ? (n - 1) * (n - 2) / (n - 1) : 0;
    return maxPossible > 0 ? sumDiff / maxPossible : 0;
  }

  private _computeAssortativity(): number {
    const centralities = this.computeAllCentralities();
    if (centralities.length < 2) return 0;

    let sumXY = 0, sumX = 0, sumY = 0;
    let sumX2 = 0, sumY2 = 0;
    let count = 0;

    const degreeMap = new Map<string, number>();
    for (const c of centralities) {
      degreeMap.set(c.id, c.degree);
    }

    for (const tie of this._ties) {
      const x = degreeMap.get(tie.source) || 0;
      const y = degreeMap.get(tie.target) || 0;
      sumXY += x * y;
      sumX += x;
      sumY += y;
      sumX2 += x * x;
      sumY2 += y * y;
      count++;
    }

    if (count === 0) return 0;

    const num = sumXY - (sumX * sumY) / count;
    const denX = Math.sqrt(sumX2 - (sumX * sumX) / count);
    const denY = Math.sqrt(sumY2 - (sumY * sumY) / count);
    const den = denX * denY;

    return den > 0 ? num / den : 0;
  }

  private _countComponents(): number {
    const nodeIds = Array.from(this._actors.keys());
    const visited = new Set<string>();
    let components = 0;

    for (const id of nodeIds) {
      if (visited.has(id)) continue;
      components++;

      const queue: string[] = [id];
      visited.add(id);

      while (queue.length > 0) {
        const current = queue.shift()!;
        for (const neighbor of this.getNeighbors(current)) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push(neighbor);
          }
        }
      }
    }

    return components;
  }

  private _updateActorStatus(): void {
    const centralities = this.computeAllCentralities();
    for (const c of centralities) {
      const actor = this._actors.get(c.id);
      if (actor) {
        actor.status = (c.degree + c.betweenness + c.eigenvector) / 3;
      }
    }
  }

  getActor(id: string): Actor | undefined {
    const actor = this._actors.get(id);
    return actor ? { ...actor, attributes: { ...actor.attributes } } : undefined;
  }

  getNeighbors(actorId: string): string[] {
    const adj = this._adjacency.get(actorId);
    return adj ? Array.from(adj.keys()) : [];
  }

  getTies(actorId: string): SocialTie[] {
    const result: SocialTie[] = [];
    const adj = this._adjacency.get(actorId);
    if (adj) {
      for (const ties of adj.values()) {
        result.push(...ties);
      }
    }
    return result.map(t => ({ ...t }));
  }

  getAllActors(): Actor[] {
    return Array.from(this._actors.values()).map(a => ({ ...a, attributes: { ...a.attributes } }));
  }

  getAllTies(): SocialTie[] {
    return this._ties.map(t => ({ ...t }));
  }

  update(deltaTime: number): void {
    const dt = deltaTime / 1000;

    this._decayTies(dt);
    this._growTies(dt);
    this._updateActorStatus();

    this._lastUpdate = Date.now();
    this._recordMetrics();
  }

  private _decayTies(dt: number): void {
    for (const tie of this._ties) {
      tie.strength *= (1 - this._decayRate * dt);
      if (tie.strength < 0.01) {
        this.removeTie(tie.source, tie.target, tie.type);
        this._cacheDirty = true;
      }
    }
  }

  private _growTies(dt: number): void {
    const actorIds = Array.from(this._actors.keys());
    if (actorIds.length < 2) return;

    if (Math.random() < this._growthRate * dt * 10) {
      const i = Math.floor(Math.random() * actorIds.length);
      const neighbors = this.getNeighbors(actorIds[i]);

      if (neighbors.length > 0) {
        const j = Math.floor(Math.random() * neighbors.length);
        const neighborOfNeighbor = this.getNeighbors(neighbors[j]);
        const candidates = neighborOfNeighbor.filter(n =>
          n !== actorIds[i] && !neighbors.includes(n)
        );

        if (candidates.length > 0 && Math.random() < 0.3) {
          const target = candidates[Math.floor(Math.random() * candidates.length)];
          const types: TieType[] = ['friendship', 'collaboration', 'information'];
          const type = types[Math.floor(Math.random() * types.length)];
          this.addTie(actorIds[i], target, type, 0.3 + Math.random() * 0.3);
        }
      }
    }
  }

  private _recordMetrics(): void {
    this._history.push(this.getMetrics());
    if (this._history.length > this._maxHistory) {
      this._history.shift();
    }
  }

  getHistory(): NetworkMetrics[] {
    return this._history.map(m => ({ ...m }));
  }

  getTopActors(metric: CentralityType, k: number = 5): CentralityScores[] {
    const all = this.computeAllCentralities();
    return all.sort((a, b) => b[metric] - a[metric]).slice(0, k);
  }

  processPacket(packet: DataPacket): DataPacket {
    const metrics = this.getMetrics();
    return {
      ...packet,
      payload: {
        ...packet.payload as object,
        socialNetwork: metrics,
      },
      metadata: {
        ...packet.metadata,
        route: [...packet.metadata.route, 'social-network'],
        residue: metrics,
      },
    };
  }

  reset(): void {
    this._actors.clear();
    this._ties = [];
    this._adjacency.clear();
    this._centralityCache.clear();
    this._metricsCache = null;
    this._history = [];
    this._cacheDirty = true;
    this._lastUpdate = Date.now();
    this._initializeDefaultNetwork();
  }
}

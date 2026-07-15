export interface ScaleFreeNode {
  id: number;
  degree: number;
  fitness: number;
  neighbors: number[];
  betweenness: number;
}

export interface DegreeDistributionRecord {
  degree: number;
  count: number;
  probability: number;
  cumulative: number;
}

export class ScaleFreeNetwork {
  private _nodes: ScaleFreeNode[];
  private _edges: Array<[number, number]>;
  private _nodeCount: number;
  private _m: number;
  private _gamma: number;
  private _history: DegreeDistributionRecord[];
  private _preferentialExponent: number;
  private _agingFactor: number;
  private _fitnessDistribution: string;

  constructor(n: number = 100, m: number = 2, gamma: number = 3) {
    this._nodeCount = Math.max(3, n);
    this._m = Math.max(1, m);
    this._gamma = gamma;
    this._nodes = [];
    this._edges = [];
    this._history = [];
    this._preferentialExponent = 1;
    this._agingFactor = 0;
    this._fitnessDistribution = 'uniform';
    this._initializeBarabasiAlbert();
  }

  get nodeCount(): number {
    return this._nodeCount;
  }

  get edgeCount(): number {
    return this._edges.length;
  }

  get gamma(): number {
    return this._gamma;
  }

  get averageDegree(): number {
    return (2 * this._edges.length) / this._nodeCount;
  }

  private _initializeBarabasiAlbert(): void {
    this._nodes = [];
    this._edges = [];
    for (let i = 0; i < this._m + 1; i++) {
      this._nodes.push({ id: i, degree: 0, fitness: Math.random(), neighbors: [], betweenness: 0 });
    }
    for (let i = 0; i < this._m; i++) {
      for (let j = i + 1; j < this._m + 1; j++) {
        this._addEdge(i, j);
      }
    }
    for (let i = this._m + 1; i < this._nodeCount; i++) {
      this._addNode(i);
    }
    this._computeBetweenness();
  }

  private _addNode(id: number): void {
    const newNode: ScaleFreeNode = { id, degree: 0, fitness: Math.random(), neighbors: [], betweenness: 0 };
    this._nodes.push(newNode);
    const targets = this._preferentialAttachment(this._m);
    for (const target of targets) {
      this._addEdge(id, target);
    }
  }

  private _preferentialAttachment(count: number): number[] {
    const targets: number[] = [];
    const totalDegree = this._nodes.reduce((sum, n) => sum + Math.pow(n.degree, this._preferentialExponent) * n.fitness, 0);
    while (targets.length < count) {
      const rand = Math.random() * totalDegree;
      let cumulative = 0;
      for (const node of this._nodes) {
        cumulative += Math.pow(node.degree, this._preferentialExponent) * node.fitness;
        if (rand < cumulative) {
          if (!targets.includes(node.id) && node.id !== this._nodes.length - 1) {
            targets.push(node.id);
            break;
          }
        }
      }
    }
    return targets;
  }

  private _addEdge(u: number, v: number): void {
    if (u === v) return;
    const exists = this._edges.some(e => (e[0] === u && e[1] === v) || (e[0] === v && e[1] === u));
    if (!exists) {
      this._edges.push([u, v]);
      this._nodes[u].degree++;
      this._nodes[v].degree++;
      this._nodes[u].neighbors.push(v);
      this._nodes[v].neighbors.push(u);
    }
  }

  private _computeBetweenness(): void {
    for (const node of this._nodes) {
      node.betweenness = 0;
    }
    for (let s = 0; s < this._nodeCount; s++) {
      const dist = new Array(this._nodeCount).fill(Infinity);
      const paths = new Array(this._nodeCount).fill(0);
      const queue = [s];
      dist[s] = 0;
      paths[s] = 1;
      while (queue.length > 0) {
        const u = queue.shift()!;
        for (const v of this._nodes[u].neighbors) {
          if (dist[v] === Infinity) {
            dist[v] = dist[u] + 1;
            queue.push(v);
          }
          if (dist[v] === dist[u] + 1) {
            paths[v] += paths[u];
          }
        }
      }
      for (let t = 0; t < this._nodeCount; t++) {
        if (s !== t && paths[t] > 0) {
          this._nodes[s].betweenness += paths[t];
        }
      }
    }
  }

  public computeDegreeDistribution(): DegreeDistributionRecord[] {
    const maxDegree = Math.max(...this._nodes.map(n => n.degree));
    const counts = new Array(maxDegree + 1).fill(0);
    for (const node of this._nodes) {
      counts[node.degree]++;
    }
    const records: DegreeDistributionRecord[] = [];
    let cumulative = 0;
    for (let d = 0; d <= maxDegree; d++) {
      if (counts[d] > 0) {
        const prob = counts[d] / this._nodeCount;
        cumulative += prob;
        records.push({ degree: d, count: counts[d], probability: prob, cumulative });
      }
    }
    this._history = records;
    return records;
  }

  public computePowerLawFit(): { gammaFit: number; rSquared: number } {
    const dist = this.computeDegreeDistribution();
    const logK = dist.filter(r => r.degree > 0).map(r => Math.log(r.degree));
    const logP = dist.filter(r => r.degree > 0).map(r => Math.log(r.probability + 1e-10));
    const n = logK.length;
    const sumX = logK.reduce((a, b) => a + b, 0);
    const sumY = logP.reduce((a, b) => a + b, 0);
    const sumXY = logK.reduce((sum, x, i) => sum + x * logP[i], 0);
    const sumX2 = logK.reduce((sum, x) => sum + x * x, 0);
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const gammaFit = -slope;
    const meanY = sumY / n;
    const ssTot = logP.reduce((sum, y) => sum + Math.pow(y - meanY, 2), 0);
    const ssRes = logP.reduce((sum, y, i) => sum + Math.pow(y - (sumY / n + slope * (logK[i] - sumX / n)), 2), 0);
    const rSquared = ssTot > 0 ? 1 - ssRes / ssTot : 0;
    return { gammaFit, rSquared };
  }

  public computeAssortativity(): number {
    let sum1 = 0, sum2 = 0, sum3 = 0, sum4 = 0;
    for (const edge of this._edges) {
      const j = this._nodes[edge[0]].degree;
      const k = this._nodes[edge[1]].degree;
      sum1 += j * k;
      sum2 += j + k;
      sum3 += j * j + k * k;
      sum4 += 1;
    }
    const numerator = sum1 / sum4 - Math.pow(sum2 / (2 * sum4), 2);
    const denominator = sum3 / (2 * sum4) - Math.pow(sum2 / (2 * sum4), 2);
    return denominator > 0 ? numerator / denominator : 0;
  }

  public computeRichClubCoefficient(k: number): number {
    const richNodes = this._nodes.filter(n => n.degree > k);
    const richSet = new Set(richNodes.map(n => n.id));
    let richEdges = 0;
    for (const edge of this._edges) {
      if (richSet.has(edge[0]) && richSet.has(edge[1])) {
        richEdges++;
      }
    }
    const n = richNodes.length;
    return n > 1 ? (2 * richEdges) / (n * (n - 1)) : 0;
  }

  public setPreferentialExponent(exponent: number): void {
    this._preferentialExponent = exponent;
  }

  public setFitnessDistribution(type: string): void {
    this._fitnessDistribution = type;
  }

  public getNodes(): ScaleFreeNode[] {
    return this._nodes.map(n => ({ ...n, neighbors: [...n.neighbors] }));
  }

  public getEdges(): Array<[number, number]> {
    return this._edges.map(e => [e[0], e[1]]);
  }

  public getHistory(): DegreeDistributionRecord[] {
    return this._history.map(h => ({ ...h }));
  }

  public computeRobustness(removalFraction: number): number {
    const removed = new Set<number>();
    const targets = [...this._nodes].sort((a, b) => b.degree - a.degree);
    const count = Math.floor(removalFraction * this._nodeCount);
    for (let i = 0; i < count; i++) {
      removed.add(targets[i].id);
    }
    const remainingEdges = this._edges.filter(e => !removed.has(e[0]) && !removed.has(e[1]));
    return remainingEdges.length / this._edges.length;
  }

  public computeVulnerability(): number {
    const maxBetweenness = Math.max(...this._nodes.map(n => n.betweenness));
    return maxBetweenness / this._edges.length;
  }

  public reset(): void {
    this._initializeBarabasiAlbert();
    this._history = [];
  }
}

export interface NetworkNode {
  id: number;
  neighbors: number[];
  degree: number;
  clustering: number;
}

export interface PathLengthRecord {
  averagePathLength: number;
  diameter: number;
  characteristicPath: number;
}

export class SmallWorldNetwork {
  private _nodes: NetworkNode[];
  private _edgeList: Array<[number, number]>;
  private _averagePathLength: number;
  private _clusteringCoefficient: number;
  private _rewiringProbability: number;
  private _ringSize: number;
  private _nearestNeighbors: number;
  private _history: PathLengthRecord[];

  constructor(n: number = 100, k: number = 4, p: number = 0.1) {
    this._ringSize = Math.max(3, n);
    this._nearestNeighbors = Math.max(2, k);
    this._rewiringProbability = Math.max(0, Math.min(1, p));
    this._nodes = [];
    this._edgeList = [];
    this._averagePathLength = 0;
    this._clusteringCoefficient = 0;
    this._history = [];
    this._initializeRingLattice();
    this._rewireEdges();
    this._computeMetrics();
  }

  get nodeCount(): number {
    return this._ringSize;
  }

  get edgeCount(): number {
    return this._edgeList.length;
  }

  get averagePathLength(): number {
    return this._averagePathLength;
  }

  get clusteringCoefficient(): number {
    return this._clusteringCoefficient;
  }

  get rewiringProbability(): number {
    return this._rewiringProbability;
  }

  private _initializeRingLattice(): void {
    this._nodes = [];
    this._edgeList = [];
    for (let i = 0; i < this._ringSize; i++) {
      this._nodes.push({ id: i, neighbors: [], degree: 0, clustering: 0 });
    }
    const halfK = Math.floor(this._nearestNeighbors / 2);
    for (let i = 0; i < this._ringSize; i++) {
      for (let j = 1; j <= halfK; j++) {
        const target = (i + j) % this._ringSize;
        this._addEdge(i, target);
      }
    }
  }

  private _addEdge(u: number, v: number): void {
    if (u === v) return;
    const exists = this._edgeList.some(e => (e[0] === u && e[1] === v) || (e[0] === v && e[1] === u));
    if (!exists) {
      this._edgeList.push([u, v]);
      this._nodes[u].neighbors.push(v);
      this._nodes[v].neighbors.push(u);
      this._nodes[u].degree++;
      this._nodes[v].degree++;
    }
  }

  private _rewireEdges(): void {
    for (const edge of [...this._edgeList]) {
      if (Math.random() < this._rewiringProbability) {
        const u = edge[0];
        const oldV = edge[1];
        let newV = Math.floor(Math.random() * this._ringSize);
        while (newV === u || this._nodes[u].neighbors.includes(newV)) {
          newV = Math.floor(Math.random() * this._ringSize);
        }
        this._removeEdge(u, oldV);
        this._addEdge(u, newV);
      }
    }
  }

  private _removeEdge(u: number, v: number): void {
    this._edgeList = this._edgeList.filter(e => !((e[0] === u && e[1] === v) || (e[0] === v && e[1] === u)));
    this._nodes[u].neighbors = this._nodes[u].neighbors.filter(n => n !== v);
    this._nodes[v].neighbors = this._nodes[v].neighbors.filter(n => n !== u);
    this._nodes[u].degree--;
    this._nodes[v].degree--;
  }

  private _computeMetrics(): void {
    this._computeClusteringCoefficient();
    this._computeAveragePathLength();
  }

  private _computeClusteringCoefficient(): void {
    let total = 0;
    for (const node of this._nodes) {
      const neighbors = node.neighbors;
      const k = neighbors.length;
      if (k < 2) continue;
      let edgesBetweenNeighbors = 0;
      for (let i = 0; i < k; i++) {
        for (let j = i + 1; j < k; j++) {
          if (this._nodes[neighbors[i]].neighbors.includes(neighbors[j])) {
            edgesBetweenNeighbors++;
          }
        }
      }
      const cc = (2 * edgesBetweenNeighbors) / (k * (k - 1));
      node.clustering = cc;
      total += cc;
    }
    this._clusteringCoefficient = total / this._ringSize;
  }

  private _computeAveragePathLength(): void {
    let totalLength = 0;
    let count = 0;
    let diameter = 0;
    for (let i = 0; i < this._ringSize; i++) {
      const distances = this._bfs(i);
      for (let j = i + 1; j < this._ringSize; j++) {
        if (distances[j] < Infinity) {
          totalLength += distances[j];
          count++;
          if (distances[j] > diameter) diameter = distances[j];
        }
      }
    }
    this._averagePathLength = count > 0 ? totalLength / count : 0;
  }

  private _bfs(start: number): number[] {
    const dist = new Array(this._ringSize).fill(Infinity);
    dist[start] = 0;
    const queue = [start];
    while (queue.length > 0) {
      const u = queue.shift()!;
      for (const v of this._nodes[u].neighbors) {
        if (dist[v] === Infinity) {
          dist[v] = dist[u] + 1;
          queue.push(v);
        }
      }
    }
    return dist;
  }

  public rewire(probability: number): void {
    this._rewiringProbability = Math.max(0, Math.min(1, probability));
    this._initializeRingLattice();
    this._rewireEdges();
    this._computeMetrics();
  }

  public getNodes(): NetworkNode[] {
    return this._nodes.map(n => ({ ...n, neighbors: [...n.neighbors] }));
  }

  public getEdges(): Array<[number, number]> {
    return this._edgeList.map(e => [e[0], e[1]]);
  }

  public computeDegreeDistribution(): number[] {
    const maxDegree = Math.max(...this._nodes.map(n => n.degree));
    const dist = new Array(maxDegree + 1).fill(0);
    for (const node of this._nodes) {
      dist[node.degree]++;
    }
    return dist.map(c => c / this._ringSize);
  }

  public computeBetweennessCentrality(): number[] {
    const centrality = new Array(this._ringSize).fill(0);
    for (let s = 0; s < this._ringSize; s++) {
      const dist = this._bfs(s);
      for (let t = 0; t < this._ringSize; t++) {
        if (s !== t && dist[t] < Infinity) {
          centrality[s] += 1 / dist[t];
        }
      }
    }
    return centrality;
  }

  public getPathLengthRecord(): PathLengthRecord {
    return {
      averagePathLength: this._averagePathLength,
      diameter: this._computeDiameter(),
      characteristicPath: this._averagePathLength,
    };
  }

  private _computeDiameter(): number {
    let diameter = 0;
    for (let i = 0; i < this._ringSize; i++) {
      const dist = this._bfs(i);
      const maxDist = Math.max(...dist.filter(d => d < Infinity));
      if (maxDist > diameter) diameter = maxDist;
    }
    return diameter;
  }

  public getHistory(): PathLengthRecord[] {
    return this._history.map(h => ({ ...h }));
  }

  public recordMetrics(): void {
    this._history.push(this.getPathLengthRecord());
    if (this._history.length > 200) this._history.shift();
  }

  public computeSmallWorldCoefficient(): number {
    const C = this._clusteringCoefficient;
    const L = this._averagePathLength;
    const C_random = this._nearestNeighbors / this._ringSize;
    const L_random = Math.log(this._ringSize) / Math.log(this._nearestNeighbors);
    return (C / C_random) / (L / L_random);
  }

  public addRandomEdges(count: number): void {
    for (let i = 0; i < count; i++) {
      const u = Math.floor(Math.random() * this._ringSize);
      const v = Math.floor(Math.random() * this._ringSize);
      this._addEdge(u, v);
    }
    this._computeMetrics();
  }

  public removeRandomEdges(count: number): void {
    for (let i = 0; i < count && this._edgeList.length > 0; i++) {
      const idx = Math.floor(Math.random() * this._edgeList.length);
      const edge = this._edgeList[idx];
      this._removeEdge(edge[0], edge[1]);
    }
    this._computeMetrics();
  }

  public reset(): void {
    this._initializeRingLattice();
    this._rewireEdges();
    this._computeMetrics();
    this._history = [];
  }
}

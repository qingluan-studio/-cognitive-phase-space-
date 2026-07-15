export interface CentralityRecord {
  nodeId: number;
  degree: number;
  betweenness: number;
  closeness: number;
  eigenvector: number;
  katz: number;
}

export class NetworkCentrality {
  private _adjacency: number[][];
  private _weights: number[][];
  private _nodeCount: number;
  private _records: CentralityRecord[];
  private _alpha: number;
  private _beta: number;

  constructor(nodeCount: number, alpha: number = 0.01, beta: number = 1.0) {
    this._nodeCount = nodeCount;
    this._adjacency = Array.from({ length: nodeCount }, () => []);
    this._weights = Array.from({ length: nodeCount }, () => new Array(nodeCount).fill(0));
    this._records = [];
    this._alpha = alpha;
    this._beta = beta;
  }

  get nodeCount(): number { return this._nodeCount; }
  get alpha(): number { return this._alpha; }
  get beta(): number { return this._beta; }
  get records(): CentralityRecord[] { return this._records; }

  public addEdge(u: number, v: number, weight: number = 1.0): void {
    if (u >= 0 && u < this._nodeCount && v >= 0 && v < this._nodeCount && u !== v) {
      if (!this._adjacency[u].includes(v)) {
        this._adjacency[u].push(v);
        this._adjacency[v].push(u);
        this._weights[u][v] = weight;
        this._weights[v][u] = weight;
      }
    }
  }

  public getNeighbors(nodeId: number): number[] {
    return this._adjacency[nodeId] || [];
  }

  public getDegree(nodeId: number): number {
    return this._adjacency[nodeId]?.length || 0;
  }

  public computeDegreeCentrality(): number[] {
    const result: number[] = [];
    for (let i = 0; i < this._nodeCount; i++) {
      result.push(this.getDegree(i));
    }
    return result;
  }

  public computeBetweennessCentrality(): number[] {
    const n = this._nodeCount;
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
        for (const w of this.getNeighbors(v)) {
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
    for (let i = 0; i < n; i++) {
      cb[i] = denom > 0 ? cb[i] / denom : 0;
    }
    return cb;
  }

  public computeClosenessCentrality(): number[] {
    const n = this._nodeCount;
    const cc = new Array(n).fill(0);
    for (let s = 0; s < n; s++) {
      const dist = new Array(n).fill(Infinity);
      const queue: number[] = [];
      dist[s] = 0;
      queue.push(s);
      while (queue.length > 0) {
        const v = queue.shift()!;
        for (const w of this.getNeighbors(v)) {
          if (dist[w] === Infinity) {
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
      cc[s] = sum > 0 ? reachable / sum : 0;
    }
    return cc;
  }

  public computeEigenvectorCentrality(maxIterations: number = 100, tolerance: number = 1e-6): number[] {
    const n = this._nodeCount;
    let x = new Array(n).fill(1.0 / n);
    for (let iter = 0; iter < maxIterations; iter++) {
      const y = new Array(n).fill(0);
      for (let i = 0; i < n; i++) {
        for (const j of this.getNeighbors(i)) {
          y[i] += x[j];
        }
      }
      let norm = 0;
      for (let i = 0; i < n; i++) {
        norm += y[i] * y[i];
      }
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

  public computeKatzCentrality(): number[] {
    const n = this._nodeCount;
    const katz = new Array(n).fill(this._beta);
    for (let iter = 0; iter < 100; iter++) {
      const newKatz = new Array(n).fill(this._beta);
      for (let i = 0; i < n; i++) {
        for (const j of this.getNeighbors(i)) {
          newKatz[i] += this._alpha * katz[j];
        }
      }
      katz.splice(0, katz.length, ...newKatz);
    }
    return katz;
  }

  public computePageRankCentrality(damping: number = 0.85, maxIterations: number = 100): number[] {
    const n = this._nodeCount;
    let pr = new Array(n).fill(1.0 / n);
    const outDeg = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      outDeg[i] = this.getDegree(i);
    }
    for (let iter = 0; iter < maxIterations; iter++) {
      const newPr = new Array(n).fill((1 - damping) / n);
      let dangling = 0;
      for (let i = 0; i < n; i++) {
        if (outDeg[i] === 0) dangling += pr[i];
      }
      for (let i = 0; i < n; i++) {
        newPr[i] += damping * dangling / n;
        for (const j of this.getNeighbors(i)) {
          if (outDeg[j] > 0) {
            newPr[i] += damping * pr[j] / outDeg[j];
          }
        }
      }
      pr = newPr;
    }
    return pr;
  }

  public computeHarmonicCentrality(): number[] {
    const n = this._nodeCount;
    const hc = new Array(n).fill(0);
    for (let s = 0; s < n; s++) {
      const dist = new Array(n).fill(Infinity);
      const queue: number[] = [];
      dist[s] = 0;
      queue.push(s);
      while (queue.length > 0) {
        const v = queue.shift()!;
        for (const w of this.getNeighbors(v)) {
          if (dist[w] === Infinity) {
            dist[w] = dist[v] + 1;
            queue.push(w);
          }
        }
      }
      for (let i = 0; i < n; i++) {
        if (i !== s && dist[i] !== Infinity) {
          hc[s] += 1 / dist[i];
        }
      }
      hc[s] /= n - 1;
    }
    return hc;
  }

  public computeLoadCentrality(): number[] {
    return this.computeBetweennessCentrality();
  }

  public computeAllCentralities(): CentralityRecord[] {
    const degree = this.computeDegreeCentrality();
    const betweenness = this.computeBetweennessCentrality();
    const closeness = this.computeClosenessCentrality();
    const eigenvector = this.computeEigenvectorCentrality();
    const katz = this.computeKatzCentrality();
    this._records = [];
    for (let i = 0; i < this._nodeCount; i++) {
      this._records.push({
        nodeId: i,
        degree: degree[i],
        betweenness: betweenness[i],
        closeness: closeness[i],
        eigenvector: eigenvector[i],
        katz: katz[i]
      });
    }
    return this._records;
  }

  public getTopNodesByCentrality(metric: keyof CentralityRecord, k: number = 5): CentralityRecord[] {
    if (this._records.length === 0) {
      this.computeAllCentralities();
    }
    const sorted = [...this._records].sort((a, b) => (b[metric] as number) - (a[metric] as number));
    return sorted.slice(0, k);
  }

  public generateErdosRenyi(p: number): void {
    for (let i = 0; i < this._nodeCount; i++) {
      for (let j = i + 1; j < this._nodeCount; j++) {
        if (Math.random() < p) {
          this.addEdge(i, j);
        }
      }
    }
  }

  public generateWattsStrogatz(k: number, p: number): void {
    const n = this._nodeCount;
    for (let i = 0; i < n; i++) {
      for (let j = 1; j <= k / 2; j++) {
        const target = (i + j) % n;
        this.addEdge(i, target);
      }
    }
    for (let i = 0; i < n; i++) {
      for (let j = 1; j <= k / 2; j++) {
        if (Math.random() < p) {
          const oldTarget = (i + j) % n;
          this._removeEdge(i, oldTarget);
          let newTarget = Math.floor(Math.random() * n);
          while (newTarget === i || this._adjacency[i].includes(newTarget)) {
            newTarget = Math.floor(Math.random() * n);
          }
          this.addEdge(i, newTarget);
        }
      }
    }
  }

  private _removeEdge(u: number, v: number): void {
    this._adjacency[u] = this._adjacency[u].filter(x => x !== v);
    this._adjacency[v] = this._adjacency[v].filter(x => x !== u);
    this._weights[u][v] = 0;
    this._weights[v][u] = 0;
  }

  public computeCentralization(metric: keyof CentralityRecord): number {
    const values = this.computeAllCentralities().map(r => r[metric] as number);
    const maxVal = Math.max(...values);
    const sumDiff = values.reduce((sum, val) => sum + (maxVal - val), 0);
    const n = this._nodeCount;
    const theoreticalMax = (n - 1) * (n - 2) / (n - 1);
    return theoreticalMax > 0 ? sumDiff / theoreticalMax : 0;
  }

  public reset(): void {
    this._adjacency = Array.from({ length: this._nodeCount }, () => []);
    this._weights = Array.from({ length: this._nodeCount }, () => new Array(this._nodeCount).fill(0));
    this._records = [];
  }

  public exportRecords(): CentralityRecord[] {
    return this._records.map(r => ({ ...r }));
  }
}

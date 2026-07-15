export interface HyperlinkEdge {
  source: string;
  target: string;
  weight: number;
  timestamp: number;
}

export interface PageRankRecord {
  url: string;
  rank: number;
  iterations: number;
}

export class HyperlinkTopology {
  private _nodes: Set<string>;
  private _edges: HyperlinkEdge[];
  private _outgoing: Map<string, Map<string, number>>;
  private _incoming: Map<string, Map<string, number>>;
  private _pageRanks: Map<string, number>;
  private _damping: number;
  private _convergenceThreshold: number;
  private _history: PageRankRecord[][];

  constructor(damping: number = 0.85, threshold: number = 1e-6) {
    this._nodes = new Set();
    this._edges = [];
    this._outgoing = new Map();
    this._incoming = new Map();
    this._pageRanks = new Map();
    this._damping = damping;
    this._convergenceThreshold = threshold;
    this._history = [];
  }

  get nodeCount(): number { return this._nodes.size; }
  get edgeCount(): number { return this._edges.length; }
  get damping(): number { return this._damping; }
  get history(): PageRankRecord[][] { return this._history; }

  public addNode(url: string): void {
    this._nodes.add(url);
    if (!this._outgoing.has(url)) this._outgoing.set(url, new Map());
    if (!this._incoming.has(url)) this._incoming.set(url, new Map());
  }

  public addEdge(source: string, target: string, weight: number = 1.0, timestamp: number = Date.now()): void {
    this.addNode(source);
    this.addNode(target);
    this._edges.push({ source, target, weight, timestamp });
    const outMap = this._outgoing.get(source)!;
    outMap.set(target, (outMap.get(target) || 0) + weight);
    const inMap = this._incoming.get(target)!;
    inMap.set(source, (inMap.get(source) || 0) + weight);
  }

  public getOutgoing(url: string): Map<string, number> {
    return new Map(this._outgoing.get(url) || []);
  }

  public getIncoming(url: string): Map<string, number> {
    return new Map(this._incoming.get(url) || []);
  }

  public getOutDegree(url: string): number {
    let sum = 0;
    for (const w of (this._outgoing.get(url) || new Map()).values()) {
      sum += w;
    }
    return sum;
  }

  public getInDegree(url: string): number {
    let sum = 0;
    for (const w of (this._incoming.get(url) || new Map()).values()) {
      sum += w;
    }
    return sum;
  }

  public computePageRank(maxIterations: number = 200): Map<string, number> {
    const n = this._nodes.size;
    if (n === 0) return new Map();
    const urls = Array.from(this._nodes);
    let ranks = new Map<string, number>();
    const initRank = 1.0 / n;
    for (const url of urls) {
      ranks.set(url, initRank);
    }
    this._history = [];
    for (let iter = 0; iter < maxIterations; iter++) {
      const newRanks = new Map<string, number>();
      let diff = 0;
      let danglingSum = 0;
      for (const url of urls) {
        if (this.getOutDegree(url) === 0) {
          danglingSum += ranks.get(url)!;
        }
      }
      for (const url of urls) {
        let rank = (1 - this._damping) / n + this._damping * danglingSum / n;
        for (const [src, weight] of this.getIncoming(url)) {
          const outDeg = this.getOutDegree(src);
          if (outDeg > 0) {
            rank += this._damping * ranks.get(src)! * weight / outDeg;
          }
        }
        newRanks.set(url, rank);
        diff += Math.abs(rank - ranks.get(url)!);
      }
      ranks = newRanks;
      const snapshot: PageRankRecord[] = [];
      for (const [url, rank] of ranks) {
        snapshot.push({ url, rank, iterations: iter });
      }
      this._history.push(snapshot);
      if (diff < this._convergenceThreshold) break;
    }
    this._pageRanks = ranks;
    return new Map(ranks);
  }

  public computeHITS(maxIterations: number = 100): { hubs: Map<string, number>; authorities: Map<string, number> } {
    const urls = Array.from(this._nodes);
    let hubs = new Map<string, number>();
    let auths = new Map<string, number>();
    for (const url of urls) {
      hubs.set(url, 1.0);
      auths.set(url, 1.0);
    }
    for (let iter = 0; iter < maxIterations; iter++) {
      const newAuths = new Map<string, number>();
      const newHubs = new Map<string, number>();
      let authNorm = 0;
      let hubNorm = 0;
      for (const url of urls) {
        let auth = 0;
        for (const [src] of this.getIncoming(url)) {
          auth += hubs.get(src)!;
        }
        newAuths.set(url, auth);
        authNorm += auth * auth;
      }
      authNorm = Math.sqrt(authNorm);
      for (const url of urls) {
        newAuths.set(url, newAuths.get(url)! / (authNorm || 1));
      }
      for (const url of urls) {
        let hub = 0;
        for (const [tgt] of this.getOutgoing(url)) {
          hub += newAuths.get(tgt)!;
        }
        newHubs.set(url, hub);
        hubNorm += hub * hub;
      }
      hubNorm = Math.sqrt(hubNorm);
      for (const url of urls) {
        newHubs.set(url, newHubs.get(url)! / (hubNorm || 1));
      }
      hubs = newHubs;
      auths = newAuths;
    }
    return { hubs, authorities: auths };
  }

  public computeSalsa(): { authorities: Map<string, number>; hubs: Map<string, number> } {
    const urls = Array.from(this._nodes);
    const authCounts = new Map<string, number>();
    const hubCounts = new Map<string, number>();
    for (const url of urls) {
      authCounts.set(url, this.getInDegree(url));
      hubCounts.set(url, this.getOutDegree(url));
    }
    const authNorm = Array.from(authCounts.values()).reduce((a, b) => a + b, 0) || 1;
    const hubNorm = Array.from(hubCounts.values()).reduce((a, b) => a + b, 0) || 1;
    const auths = new Map<string, number>();
    const hubs = new Map<string, number>();
    for (const url of urls) {
      auths.set(url, authCounts.get(url)! / authNorm);
      hubs.set(url, hubCounts.get(url)! / hubNorm);
    }
    return { authorities: auths, hubs };
  }

  public computeBetweennessCentrality(): Map<string, number> {
    const urls = Array.from(this._nodes);
    const betweenness = new Map<string, number>();
    for (const url of urls) betweenness.set(url, 0);
    for (const source of urls) {
      const dist = new Map<string, number>();
      const pred = new Map<string, string[]>();
      const sigma = new Map<string, number>();
      const queue: string[] = [];
      const stack: string[] = [];
      for (const url of urls) {
        dist.set(url, Infinity);
        sigma.set(url, 0);
        pred.set(url, []);
      }
      dist.set(source, 0);
      sigma.set(source, 1);
      queue.push(source);
      while (queue.length > 0) {
        const v = queue.shift()!;
        stack.push(v);
        for (const [w] of this.getOutgoing(v)) {
          if (dist.get(w) === Infinity) {
            dist.set(w, dist.get(v)! + 1);
            queue.push(w);
          }
          if (dist.get(w) === dist.get(v)! + 1) {
            sigma.set(w, sigma.get(w)! + sigma.get(v)!);
            pred.get(w)!.push(v);
          }
        }
      }
      const delta = new Map<string, number>();
      for (const url of urls) delta.set(url, 0);
      while (stack.length > 0) {
        const w = stack.pop()!;
        for (const v of pred.get(w)!) {
          delta.set(v, delta.get(v)! + (sigma.get(v)! / sigma.get(w)!) * (1 + delta.get(w)!));
        }
        if (w !== source) {
          betweenness.set(w, betweenness.get(w)! + delta.get(w)!);
        }
      }
    }
    for (const url of urls) {
      const n = urls.length;
      betweenness.set(url, betweenness.get(url)! / ((n - 1) * (n - 2) / 2));
    }
    return betweenness;
  }

  public computeClusteringCoefficient(url: string): number {
    const neighbors = Array.from(this.getOutgoing(url).keys()).filter(n => this.getOutgoing(url).has(n) || this.getIncoming(url).has(n));
    const n = neighbors.length;
    if (n < 2) return 0;
    let edges = 0;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (this.getOutgoing(neighbors[i]).has(neighbors[j]) || this.getIncoming(neighbors[i]).has(neighbors[j])) {
          edges++;
        }
      }
    }
    return edges / (n * (n - 1) / 2);
  }

  public computeAveragePathLength(): number {
    const urls = Array.from(this._nodes);
    let total = 0;
    let count = 0;
    for (const source of urls) {
      const dist = new Map<string, number>();
      for (const url of urls) dist.set(url, Infinity);
      dist.set(source, 0);
      const queue = [source];
      while (queue.length > 0) {
        const v = queue.shift()!;
        for (const [w] of this.getOutgoing(v)) {
          if (dist.get(w) === Infinity) {
            dist.set(w, dist.get(v)! + 1);
            queue.push(w);
          }
        }
      }
      for (const url of urls) {
        if (url !== source && dist.get(url) !== Infinity) {
          total += dist.get(url)!;
          count++;
        }
      }
    }
    return count > 0 ? total / count : 0;
  }

  public computeReciprocity(): number {
    let reciprocal = 0;
    for (const edge of this._edges) {
      if (this.getOutgoing(edge.target).has(edge.source)) {
        reciprocal++;
      }
    }
    return this._edges.length > 0 ? reciprocal / this._edges.length : 0;
  }

  public generateBarabasiAlbert(n: number, m: number): void {
    if (n < m + 1) return;
    for (let i = 0; i < n; i++) {
      this.addNode(`node_${i}`);
    }
    for (let i = 1; i <= m; i++) {
      this.addEdge('node_0', `node_${i}`);
    }
    const degrees = new Array(n).fill(0);
    degrees[0] = m;
    for (let i = 1; i <= m; i++) degrees[i] = 1;
    for (let i = m + 1; i < n; i++) {
      const targets = new Set<number>();
      let totalDegree = degrees.slice(0, i).reduce((a, b) => a + b, 0);
      while (targets.size < m && totalDegree > 0) {
        let r = Math.random() * totalDegree;
        let acc = 0;
        for (let j = 0; j < i; j++) {
          acc += degrees[j];
          if (acc >= r) {
            targets.add(j);
            break;
          }
        }
      }
      for (const t of targets) {
        this.addEdge(`node_${i}`, `node_${t}`);
        degrees[i]++;
        degrees[t]++;
      }
    }
  }

  public reset(): void {
    this._nodes.clear();
    this._edges = [];
    this._outgoing.clear();
    this._incoming.clear();
    this._pageRanks.clear();
    this._history = [];
  }

  public exportEdges(): HyperlinkEdge[] {
    return this._edges.map(e => ({ ...e }));
  }
}

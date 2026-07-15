export interface CascadeNodeState {
  id: number;
  load: number;
  capacity: number;
  failed: boolean;
  failureStep: number;
}

export interface CascadeSnapshot {
  step: number;
  failedCount: number;
  totalLoadLost: number;
  redistributionMap: Map<number, number>;
}

export class CascadeFailure {
  private _nodes: CascadeNodeState[];
  private _adjacency: number[][];
  private _tolerance: number;
  private _redistributionStrategy: 'equal' | 'proportional' | 'neighbor';
  private _snapshots: CascadeSnapshot[];
  private _currentStep: number;

  constructor(nodeCount: number, tolerance: number = 0.2, strategy: 'equal' | 'proportional' | 'neighbor' = 'proportional') {
    this._nodes = [];
    this._adjacency = [];
    this._tolerance = tolerance;
    this._redistributionStrategy = strategy;
    this._snapshots = [];
    this._currentStep = 0;
    for (let i = 0; i < nodeCount; i++) {
      this._nodes.push({ id: i, load: 1.0, capacity: 1.0, failed: false, failureStep: -1 });
      this._adjacency.push([]);
    }
  }

  get nodeCount(): number { return this._nodes.length; }
  get tolerance(): number { return this._tolerance; }
  get redistributionStrategy(): string { return this._redistributionStrategy; }
  get currentStep(): number { return this._currentStep; }
  get snapshots(): CascadeSnapshot[] { return this._snapshots; }

  public setTolerance(t: number): void {
    this._tolerance = t;
  }

  public addEdge(u: number, v: number): void {
    if (!this._adjacency[u].includes(v)) {
      this._adjacency[u].push(v);
      this._adjacency[v].push(u);
    }
  }

  public setLoad(nodeId: number, load: number): void {
    if (nodeId >= 0 && nodeId < this._nodes.length) {
      this._nodes[nodeId].load = load;
    }
  }

  public setCapacity(nodeId: number, cap: number): void {
    if (nodeId >= 0 && nodeId < this._nodes.length) {
      this._nodes[nodeId].capacity = cap;
    }
  }

  public generateRandomNetwork(p: number): void {
    const n = this._nodes.length;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (Math.random() < p) {
          this.addEdge(i, j);
        }
      }
    }
  }

  public generateScaleFreeNetwork(m: number): void {
    const n = this._nodes.length;
    if (n < m + 1) return;
    const degrees = new Array(n).fill(0);
    for (let i = 1; i <= m; i++) {
      this.addEdge(0, i);
      degrees[0]++;
      degrees[i]++;
    }
    for (let i = m + 1; i < n; i++) {
      const targets: number[] = [];
      const totalDegree = degrees.slice(0, i).reduce((a, b) => a + b, 0);
      while (targets.length < m) {
        let r = Math.random() * totalDegree;
        let acc = 0;
        for (let j = 0; j < i; j++) {
          acc += degrees[j];
          if (acc >= r && !targets.includes(j)) {
            targets.push(j);
            break;
          }
        }
      }
      for (const t of targets) {
        this.addEdge(i, t);
        degrees[i]++;
        degrees[t]++;
      }
    }
  }

  private _recordSnapshot(): void {
    const failed = this._nodes.filter(n => n.failed);
    const totalLoadLost = failed.reduce((sum, n) => sum + n.capacity, 0);
    const redistributionMap = new Map<number, number>();
    for (const n of this._nodes) {
      if (!n.failed) {
        redistributionMap.set(n.id, n.load);
      }
    }
    this._snapshots.push({
      step: this._currentStep,
      failedCount: failed.length,
      totalLoadLost,
      redistributionMap
    });
  }

  public triggerInitialFailure(nodeIds: number[]): void {
    for (const id of nodeIds) {
      if (id >= 0 && id < this._nodes.length && !this._nodes[id].failed) {
        this._nodes[id].failed = true;
        this._nodes[id].failureStep = this._currentStep;
      }
    }
    this._recordSnapshot();
  }

  private _redistributeLoad(failedId: number): void {
    const failedNode = this._nodes[failedId];
    const loadToRedistribute = failedNode.load;
    const neighbors = this._adjacency[failedId].filter(nid => !this._nodes[nid].failed);
    if (neighbors.length === 0) return;

    if (this._redistributionStrategy === 'equal') {
      const share = loadToRedistribute / neighbors.length;
      for (const nid of neighbors) {
        this._nodes[nid].load += share;
      }
    } else if (this._redistributionStrategy === 'proportional') {
      const totalCap = neighbors.reduce((sum, nid) => sum + this._nodes[nid].capacity, 0);
      for (const nid of neighbors) {
        this._nodes[nid].load += loadToRedistribute * (this._nodes[nid].capacity / totalCap);
      }
    } else {
      const share = loadToRedistribute / neighbors.length;
      for (const nid of neighbors) {
        this._nodes[nid].load += share;
      }
    }
  }

  public step(): boolean {
    this._currentStep++;
    const newlyFailed: number[] = [];
    for (const node of this._nodes) {
      if (!node.failed && node.load > node.capacity * (1 + this._tolerance)) {
        newlyFailed.push(node.id);
      }
    }
    if (newlyFailed.length === 0) return false;
    for (const id of newlyFailed) {
      this._nodes[id].failed = true;
      this._nodes[id].failureStep = this._currentStep;
      this._redistributeLoad(id);
    }
    this._recordSnapshot();
    return true;
  }

  public runFullCascade(): number {
    let steps = 0;
    while (this.step()) {
      steps++;
      if (steps > this._nodes.length) break;
    }
    return steps;
  }

  public getFailedNodes(): CascadeNodeState[] {
    return this._nodes.filter(n => n.failed);
  }

  public getSurvivingNodes(): CascadeNodeState[] {
    return this._nodes.filter(n => !n.failed);
  }

  public computeRobustness(): number {
    const survived = this.getSurvivingNodes().length;
    return survived / this._nodes.length;
  }

  public computeCascadeSizeDistribution(): Map<number, number> {
    const dist = new Map<number, number>();
    for (const snap of this._snapshots) {
      const size = snap.failedCount;
      dist.set(size, (dist.get(size) || 0) + 1);
    }
    return dist;
  }

  public computeLoadEntropy(): number {
    const loads = this._nodes.filter(n => !n.failed).map(n => n.load);
    const total = loads.reduce((a, b) => a + b, 0);
    if (total === 0) return 0;
    let entropy = 0;
    for (const l of loads) {
      const p = l / total;
      if (p > 0) entropy -= p * Math.log(p);
    }
    return entropy;
  }

  public reset(): void {
    for (const node of this._nodes) {
      node.load = 1.0;
      node.capacity = 1.0;
      node.failed = false;
      node.failureStep = -1;
    }
    this._snapshots = [];
    this._currentStep = 0;
  }

  public computeCriticalTolerance(): number {
    let low = 0;
    let high = 2.0;
    for (let iter = 0; iter < 30; iter++) {
      const mid = (low + high) / 2;
      this.setTolerance(mid);
      this.reset();
      this.triggerInitialFailure([0]);
      this.runFullCascade();
      const robust = this.computeRobustness();
      if (robust > 0.5) {
        high = mid;
      } else {
        low = mid;
      }
    }
    return (low + high) / 2;
  }

  public simulateRandomAttack(fraction: number): number {
    this.reset();
    const n = this._nodes.length;
    const targets: number[] = [];
    while (targets.length < Math.floor(n * fraction)) {
      const r = Math.floor(Math.random() * n);
      if (!targets.includes(r)) targets.push(r);
    }
    this.triggerInitialFailure(targets);
    return this.runFullCascade();
  }

  public simulateTargetedAttack(degreeSorted: boolean = true): number {
    this.reset();
    const n = this._nodes.length;
    const order = this._nodes.map((node, idx) => ({ idx, deg: this._adjacency[idx].length }));
    if (degreeSorted) {
      order.sort((a, b) => b.deg - a.deg);
    }
    const targets = order.slice(0, Math.floor(n * 0.05)).map(o => o.idx);
    this.triggerInitialFailure(targets);
    return this.runFullCascade();
  }

  public exportHistory(): CascadeSnapshot[] {
    return this._snapshots.map(s => ({
      step: s.step,
      failedCount: s.failedCount,
      totalLoadLost: s.totalLoadLost,
      redistributionMap: new Map(s.redistributionMap)
    }));
  }
}

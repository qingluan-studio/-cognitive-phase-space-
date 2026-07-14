export type PromisePhase = 'pending' | 'resolved' | 'rejected' | 'forgotten';

export interface PromiseRecord {
  id: string;
  phase: PromisePhase;
  createdAt: number;
  settledAt: number | null;
  age: number;
  dependencyCount: number;
}

export interface PromiseDependency {
  from: string;
  to: string;
  type: 'then' | 'catch' | 'finally';
}

export class UnresolvedPromise {
  private _promises: Map<string, PromiseRecord> = new Map();
  private _dependencies: PromiseDependency[] = [];
  private _history: PromiseRecord[] = [];
  private _state: Record<string, unknown> = {};
  private _ageDistribution: number[] = [];
  private _resolutionProbability: number = 0;
  private _forgottenThreshold: number = 10000;

  create(id: string): PromiseRecord {
    const record: PromiseRecord = {
      id,
      phase: 'pending',
      createdAt: Date.now(),
      settledAt: null,
      age: 0,
      dependencyCount: 0,
    };
    this._promises.set(id, record);
    this._history.push(record);
    if (this._history.length > 200) this._history.shift();
    this._updateResolutionProbability();
    return record;
  }

  resolve(id: string): boolean {
    const record = this._promises.get(id);
    if (!record || record.phase !== 'pending') return false;
    record.phase = 'resolved';
    record.settledAt = Date.now();
    this._updateResolutionProbability();
    return true;
  }

  reject(id: string): boolean {
    const record = this._promises.get(id);
    if (!record || record.phase !== 'pending') return false;
    record.phase = 'rejected';
    record.settledAt = Date.now();
    this._updateResolutionProbability();
    return true;
  }

  addDependency(from: string, to: string, type: 'then' | 'catch' | 'finally'): void {
    this._dependencies.push({ from, to, type });
    const record = this._promises.get(from);
    if (record) record.dependencyCount++;
  }

  agePromises(dt: number = 1): void {
    for (const record of this._promises.values()) {
      if (record.phase === 'pending') {
        record.age += dt;
        if (record.age > this._forgottenThreshold) {
          record.phase = 'forgotten';
        }
      }
    }
    this._ageDistribution = Array.from(this._promises.values()).map(p => p.age);
    this._updateResolutionProbability();
  }

  private _updateResolutionProbability(): void {
    const settled = Array.from(this._promises.values()).filter(p => p.phase === 'resolved' || p.phase === 'rejected').length;
    const total = this._promises.size;
    this._resolutionProbability = total > 0 ? settled / total : 0;
  }

  getPromise(id: string): PromiseRecord | null {
    return this._promises.get(id) ?? null;
  }

  listByPhase(phase: PromisePhase): PromiseRecord[] {
    return Array.from(this._promises.values()).filter(p => p.phase === phase);
  }

  getDependencyGraph(): Record<string, string[]> {
    const graph: Record<string, string[]> = {};
    for (const dep of this._dependencies) {
      graph[dep.from] = graph[dep.from] ?? [];
      graph[dep.from].push(dep.to);
    }
    return graph;
  }

  topologicalOrder(): string[] {
    const inDegree = new Map<string, number>();
    const adj = new Map<string, string[]>();
    for (const dep of this._dependencies) {
      inDegree.set(dep.to, (inDegree.get(dep.to) ?? 0) + 1);
      const list = adj.get(dep.from) ?? [];
      list.push(dep.to);
      adj.set(dep.from, list);
    }
    const queue: string[] = [];
    for (const id of this._promises.keys()) {
      if ((inDegree.get(id) ?? 0) === 0) queue.push(id);
    }
    const result: string[] = [];
    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);
      for (const neighbor of adj.get(current) ?? []) {
        const newDegree = (inDegree.get(neighbor) ?? 0) - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) queue.push(neighbor);
      }
    }
    return result;
  }

  averageAge(): number {
    if (this._promises.size === 0) return 0;
    return Array.from(this._promises.values()).reduce((s, p) => s + p.age, 0) / this._promises.size;
  }

  maxAge(): number {
    if (this._promises.size === 0) return 0;
    return Math.max(...Array.from(this._promises.values()).map(p => p.age));
  }

  ageEntropy(): number {
    if (this._ageDistribution.length === 0) return 0;
    const bins = 5;
    const maxAge = Math.max(...this._ageDistribution, 1);
    const counts = new Array(bins).fill(0);
    for (const age of this._ageDistribution) {
      const idx = Math.min(bins - 1, Math.floor((age / maxAge) * bins));
      counts[idx]++;
    }
    const total = this._ageDistribution.length;
    let entropy = 0;
    for (const c of counts) {
      if (c > 0) {
        const p = c / total;
        entropy -= p * Math.log2(p);
      }
    }
    return entropy;
  }

  forgetOld(threshold: number): number {
    let forgotten = 0;
    for (const record of this._promises.values()) {
      if (record.phase === 'pending' && record.age > threshold) {
        record.phase = 'forgotten';
        forgotten++;
      }
    }
    this._updateResolutionProbability();
    return forgotten;
  }

  get resolutionProbability(): number {
    return this._resolutionProbability;
  }

  get pendingCount(): number {
    return this.listByPhase('pending').length;
  }

  promiseReport(): Record<string, unknown> {
    return {
      totalPromises: this._promises.size,
      pendingCount: this.pendingCount,
      resolvedCount: this.listByPhase('resolved').length,
      rejectedCount: this.listByPhase('rejected').length,
      forgottenCount: this.listByPhase('forgotten').length,
      resolutionProbability: this._resolutionProbability.toFixed(4),
      averageAge: this.averageAge().toFixed(2),
      maxAge: this.maxAge(),
      ageEntropy: this.ageEntropy().toFixed(4),
      dependencyCount: this._dependencies.length,
      state: this._state,
    };
  }
}

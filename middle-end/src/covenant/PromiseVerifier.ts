export interface PromiseVerifierData {
  pending: number;
  fulfilled: number;
  broken: number;
  promises: Array<{ id: string; status: string; reliability: number }>;
  globalReliability: number;
}

export interface TrackedPromise {
  id: string;
  description: string;
  due: number;
  fulfilled: boolean;
  broken: boolean;
  weight: number;
  extensions: number;
  dependents: string[];
}

interface _DependencyEdge {
  from: string;
  to: string;
  lag: number;
}

export class PromiseVerifier {
  private _promises: Map<string, TrackedPromise>;
  private _now: () => number;
  private _dependencies: _DependencyEdge[];
  private _cascadeHistory: Array<{ origin: string; affected: string[]; ts: number }>;
  private _extensionPenalty: number;

  constructor(now: () => number = () => Date.now(), extensionPenalty: number = 0.2) {
    this._promises = new Map<string, TrackedPromise>();
    this._now = now;
    this._dependencies = [];
    this._cascadeHistory = [];
    this._extensionPenalty = extensionPenalty;
  }

  get pendingCount(): number {
    let n = 0;
    for (const p of this._promises.values()) {
      if (!p.fulfilled && !p.broken) n += 1;
    }
    return n;
  }

  get globalReliability(): number {
    if (this._promises.size === 0) return 1;
    let acc = 0;
    let total = 0;
    for (const p of this._promises.values()) {
      const score = p.fulfilled ? 1 : p.broken ? 0 : 0.5;
      acc += score * p.weight;
      total += p.weight;
    }
    return total === 0 ? 1 : acc / total;
  }

  public register(id: string, description: string, dueInMs: number, weight: number = 1): void {
    this._promises.set(id, {
      id,
      description,
      due: this._now() + dueInMs,
      fulfilled: false,
      broken: false,
      weight: Math.max(0, weight),
      extensions: 0,
      dependents: [],
    });
  }

  public linkDependency(fromId: string, toId: string, lag: number = 0): boolean {
    if (!this._promises.has(fromId) || !this._promises.has(toId)) return false;
    this._dependencies.push({ from: fromId, to: toId, lag });
    const from = this._promises.get(fromId)!;
    from.dependents.push(toId);
    return true;
  }

  public fulfill(id: string): boolean {
    const p = this._promises.get(id);
    if (!p || p.broken) return false;
    p.fulfilled = true;
    this._cascadeFulfillment(id);
    return true;
  }

  private _cascadeFulfillment(origin: string): void {
    const affected: string[] = [];
    const queue = [origin];
    const visited = new Set<string>([origin]);
    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const edge of this._dependencies) {
        if (edge.from !== current) continue;
        if (visited.has(edge.to)) continue;
        visited.add(edge.to);
        const target = this._promises.get(edge.to);
        if (target && !target.fulfilled && !target.broken) {
          target.weight = Math.min(2, target.weight + 0.1);
          affected.push(edge.to);
          queue.push(edge.to);
        }
      }
    }
    if (affected.length > 0) {
      this._cascadeHistory.push({ origin, affected, ts: this._now() });
      if (this._cascadeHistory.length > 64) this._cascadeHistory.shift();
    }
  }

  public tick(): string[] {
    const now = this._now();
    const broken: string[] = [];
    const sorted = Array.from(this._promises.entries()).sort((a, b) => a[1].due - b[1].due);
    for (const [id, p] of sorted) {
      if (!p.fulfilled && !p.broken && p.due < now) {
        p.broken = true;
        broken.push(id);
        this._propagateBreach(id);
      }
    }
    return broken;
  }

  private _propagateBreach(origin: string): void {
    const queue = [origin];
    const visited = new Set<string>([origin]);
    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const edge of this._dependencies) {
        if (edge.from !== current) continue;
        if (visited.has(edge.to)) continue;
        visited.add(edge.to);
        const target = this._promises.get(edge.to);
        if (target && !target.fulfilled && !target.broken) {
          target.weight = Math.max(0.1, target.weight * (1 - this._extensionPenalty));
          if (this._now() > target.due) {
            target.broken = true;
            queue.push(edge.to);
          }
        }
      }
    }
  }

  public extend(id: string, additionalMs: number): boolean {
    const p = this._promises.get(id);
    if (!p || p.fulfilled || p.broken) return false;
    p.due += additionalMs;
    p.extensions += 1;
    p.weight = Math.max(0.1, p.weight * (1 - this._extensionPenalty * 0.5));
    return true;
  }

  public cancel(id: string): void {
    this._promises.delete(id);
    this._dependencies = this._dependencies.filter((e) => e.from !== id && e.to !== id);
  }

  public statusOf(id: string): string {
    const p = this._promises.get(id);
    if (!p) return 'unknown';
    if (p.fulfilled) return 'fulfilled';
    if (p.broken) return 'broken';
    const slack = (p.due - this._now()) / Math.max(1, p.due - p.due + 1);
    return slack < 0.1 ? 'critical' : 'pending';
  }

  public criticalPath(): string[] {
    const memo = new Map<string, number>();
    const visiting = new Set<string>();
    const dfs = (id: string): number => {
      if (memo.has(id)) return memo.get(id)!;
      if (visiting.has(id)) return 0;
      visiting.add(id);
      const p = this._promises.get(id);
      if (!p) return 0;
      let maxChild = 0;
      for (const edge of this._dependencies) {
        if (edge.from === id) maxChild = Math.max(maxChild, dfs(edge.to) + edge.lag);
      }
      visiting.delete(id);
      const value = p.due + maxChild;
      memo.set(id, value);
      return value;
    };
    const ids = Array.from(this._promises.keys());
    ids.sort((a, b) => dfs(b) - dfs(a));
    return ids.slice(0, Math.min(10, ids.length));
  }

  public report(): PromiseVerifierData {
    let fulfilled = 0;
    let broken = 0;
    const list: Array<{ id: string; status: string; reliability: number }> = [];
    for (const p of this._promises.values()) {
      if (p.fulfilled) fulfilled += 1;
      if (p.broken) broken += 1;
      list.push({ id: p.id, status: this.statusOf(p.id), reliability: p.weight });
    }
    return {
      pending: this.pendingCount,
      fulfilled,
      broken,
      promises: list,
      globalReliability: this.globalReliability,
    };
  }
}

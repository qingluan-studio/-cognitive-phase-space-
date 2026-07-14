export interface LockRecord {
  id: string;
  resource: string;
  holder: string;
  acquiredAt: number;
  releasedAt: number | null;
  spinCount: number;
}

export interface LockWaitRecord {
  waiter: string;
  requestedAt: number;
  waitDuration: number;
}

export class PhantomLock {
  private _locks: Map<string, LockRecord> = new Map();
  private _waitQueue: Map<string, LockWaitRecord[]> = new Map();
  private _history: LockRecord[] = [];
  private _state: Record<string, unknown> = {};
  private _waitTimeDistribution: number[] = [];
  private _queueLengthHistory: number[] = [];
  private _contentionIndex: number = 0;

  acquire(resource: string, holder: string): boolean {
    if (this._locks.has(resource)) {
      const queue = this._waitQueue.get(resource) ?? [];
      queue.push({ waiter: holder, requestedAt: Date.now(), waitDuration: 0 });
      this._waitQueue.set(resource, queue);
      this._queueLengthHistory.push(queue.length);
      if (this._queueLengthHistory.length > 100) this._queueLengthHistory.shift();
      this._updateContentionIndex();
      return false;
    }
    const record: LockRecord = {
      id: `lock-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      resource,
      holder,
      acquiredAt: Date.now(),
      releasedAt: null,
      spinCount: 0,
    };
    this._locks.set(resource, record);
    this._history.push(record);
    if (this._history.length > 200) this._history.shift();
    return true;
  }

  release(resource: string, holder: string): boolean {
    const record = this._locks.get(resource);
    if (!record || record.holder !== holder) return false;
    record.releasedAt = Date.now();
    this._locks.delete(resource);
    const queue = this._waitQueue.get(resource) ?? [];
    if (queue.length > 0) {
      const next = queue.shift()!;
      next.waitDuration = Date.now() - next.requestedAt;
      this._waitTimeDistribution.push(next.waitDuration);
      if (this._waitTimeDistribution.length > 100) this._waitTimeDistribution.shift();
      this.acquire(resource, next.waiter);
    }
    this._updateContentionIndex();
    return true;
  }

  private _updateContentionIndex(): void {
    const totalQueue = Array.from(this._waitQueue.values()).reduce((s, q) => s + q.length, 0);
    this._contentionIndex = totalQueue / (this._locks.size + 1);
  }

  spin(resource: string, holder: string, spins: number): boolean {
    const record = this._locks.get(resource);
    if (!record) {
      return this.acquire(resource, holder);
    }
    if (record.holder === holder) return true;
    const queue = this._waitQueue.get(resource) ?? [];
    const entry = queue.find(w => w.waiter === holder);
    if (entry) {
      entry.waitDuration += spins;
    }
    return false;
  }

  isLocked(resource: string): boolean {
    return this._locks.has(resource);
  }

  getHolder(resource: string): string | null {
    return this._locks.get(resource)?.holder ?? null;
  }

  getWaitQueue(resource: string): LockWaitRecord[] {
    return [...(this._waitQueue.get(resource) ?? [])];
  }

  averageWaitTime(): number {
    if (this._waitTimeDistribution.length === 0) return 0;
    return this._waitTimeDistribution.reduce((a, b) => a + b, 0) / this._waitTimeDistribution.length;
  }

  maxWaitTime(): number {
    if (this._waitTimeDistribution.length === 0) return 0;
    return Math.max(...this._waitTimeDistribution);
  }

  getLockHistory(limit: number = 50): LockRecord[] {
    return this._history.slice(-limit);
  }

  detectDeadlock(): string[][] {
    const graph = new Map<string, Set<string>>();
    for (const [resource, record] of this._locks) {
      const waiters = this._waitQueue.get(resource) ?? [];
      for (const w of waiters) {
        const edges = graph.get(record.holder) ?? new Set();
        edges.add(w.waiter);
        graph.set(record.holder, edges);
      }
    }
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const stack = new Set<string>();
    const path: string[] = [];
    const dfs = (node: string) => {
      visited.add(node);
      stack.add(node);
      path.push(node);
      for (const neighbor of graph.get(node) ?? []) {
        if (!visited.has(neighbor)) {
          dfs(neighbor);
        } else if (stack.has(neighbor)) {
          const cycleStart = path.indexOf(neighbor);
          cycles.push(path.slice(cycleStart));
        }
      }
      path.pop();
      stack.delete(node);
    };
    for (const node of graph.keys()) {
      if (!visited.has(node)) dfs(node);
    }
    return cycles;
  }

  get contentionIndex(): number {
    return this._contentionIndex;
  }

  get averageQueueLength(): number {
    if (this._queueLengthHistory.length === 0) return 0;
    return this._queueLengthHistory.reduce((a, b) => a + b, 0) / this._queueLengthHistory.length;
  }

  lockReport(): Record<string, unknown> {
    return {
      activeLocks: this._locks.size,
      historyCount: this._history.length,
      averageWaitTime: this.averageWaitTime().toFixed(2),
      maxWaitTime: this.maxWaitTime(),
      contentionIndex: this._contentionIndex.toFixed(4),
      averageQueueLength: this.averageQueueLength.toFixed(2),
      deadlockCycles: this.detectDeadlock().length,
      state: this._state,
    };
  }
}

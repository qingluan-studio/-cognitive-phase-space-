export type TransactionStatus = 'pending' | 'prepared' | 'committed' | 'aborted' | 'orphan';

export interface Transaction {
  id: string;
  status: TransactionStatus;
  resources: string[];
  dependsOn: string[];
  startTime: number;
  endTime: number | null;
}

export interface DependencyEdge {
  from: string;
  to: string;
  weight: number;
}

export class PendingTransaction {
  private _transactions: Map<string, Transaction> = new Map();
  private _edges: DependencyEdge[] = [];
  private _state: Record<string, unknown> = {};
  private _waitForGraph: Map<string, Set<string>> = new Map();
  private _commitOrder: string[] = [];
  private _isolationLevel: string = 'serializable';

  begin(id: string, resources: string[]): Transaction {
    const tx: Transaction = {
      id,
      status: 'pending',
      resources,
      dependsOn: [],
      startTime: Date.now(),
      endTime: null,
    };
    this._transactions.set(id, tx);
    return tx;
  }

  addDependency(from: string, to: string): void {
    const tx = this._transactions.get(from);
    if (tx) tx.dependsOn.push(to);
    this._edges.push({ from, to, weight: 1 });
    const set = this._waitForGraph.get(from) ?? new Set();
    set.add(to);
    this._waitForGraph.set(from, set);
  }

  prepare(id: string): boolean {
    const tx = this._transactions.get(id);
    if (!tx || tx.status !== 'pending') return false;
    for (const dep of tx.dependsOn) {
      const depTx = this._transactions.get(dep);
      if (!depTx || depTx.status !== 'committed') return false;
    }
    tx.status = 'prepared';
    return true;
  }

  commit(id: string): boolean {
    const tx = this._transactions.get(id);
    if (!tx || tx.status !== 'prepared') return false;
    tx.status = 'committed';
    tx.endTime = Date.now();
    this._commitOrder.push(id);
    this._releaseResources(id);
    return true;
  }

  abort(id: string): boolean {
    const tx = this._transactions.get(id);
    if (!tx) return false;
    tx.status = 'aborted';
    tx.endTime = Date.now();
    this._releaseResources(id);
    return true;
  }

  private _releaseResources(id: string): void {
    const tx = this._transactions.get(id);
    if (!tx) return;
    for (const [otherId, otherTx] of this._transactions) {
      if (otherId === id) continue;
      const idx = otherTx.dependsOn.indexOf(id);
      if (idx >= 0) otherTx.dependsOn.splice(idx, 1);
    }
  }

  detectDeadlock(): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const stack = new Set<string>();
    const path: string[] = [];
    const dfs = (node: string) => {
      visited.add(node);
      stack.add(node);
      path.push(node);
      for (const neighbor of this._waitForGraph.get(node) ?? []) {
        if (!visited.has(neighbor)) {
          dfs(neighbor);
        } else if (stack.has(neighbor)) {
          const start = path.indexOf(neighbor);
          cycles.push(path.slice(start));
        }
      }
      path.pop();
      stack.delete(node);
    };
    for (const node of this._waitForGraph.keys()) {
      if (!visited.has(node)) dfs(node);
    }
    return cycles;
  }

  getTransaction(id: string): Transaction | null {
    return this._transactions.get(id) ?? null;
  }

  listByStatus(status: TransactionStatus): Transaction[] {
    return Array.from(this._transactions.values()).filter(t => t.status === status);
  }

  topologicalCommitOrder(): string[] {
    const inDegree = new Map<string, number>();
    const adj = new Map<string, string[]>();
    for (const tx of this._transactions.values()) {
      inDegree.set(tx.id, 0);
      adj.set(tx.id, []);
    }
    for (const edge of this._edges) {
      const list = adj.get(edge.from) ?? [];
      list.push(edge.to);
      adj.set(edge.from, list);
      inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1);
    }
    const queue: string[] = [];
    for (const [id, degree] of inDegree) {
      if (degree === 0) queue.push(id);
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

  averageDuration(): number {
    const completed = Array.from(this._transactions.values()).filter(t => t.endTime !== null);
    if (completed.length === 0) return 0;
    return completed.reduce((s, t) => s + (t.endTime! - t.startTime), 0) / completed.length;
  }

  maxDuration(): number {
    const completed = Array.from(this._transactions.values()).filter(t => t.endTime !== null);
    if (completed.length === 0) return 0;
    return Math.max(...completed.map(t => t.endTime! - t.startTime));
  }

  orphanTransactions(): Transaction[] {
    const now = Date.now();
    return Array.from(this._transactions.values()).filter(t => {
      return t.status === 'pending' && now - t.startTime > 30000;
    });
  }

  get throughput(): number {
    const committed = this.listByStatus('committed').length;
    const totalTime = Array.from(this._transactions.values()).reduce((s, t) => {
      return s + (t.endTime ?? Date.now()) - t.startTime;
    }, 0);
    return totalTime > 0 ? (committed * 1000) / totalTime : 0;
  }

  setIsolationLevel(level: string): void {
    this._isolationLevel = level;
  }

  get dependencyCount(): number {
    return this._edges.length;
  }

  transactionReport(): Record<string, unknown> {
    return {
      transactionCount: this._transactions.size,
      pendingCount: this.listByStatus('pending').length,
      committedCount: this.listByStatus('committed').length,
      abortedCount: this.listByStatus('aborted').length,
      orphanCount: this.orphanTransactions().length,
      deadlockCycles: this.detectDeadlock().length,
      averageDuration: this.averageDuration().toFixed(2),
      maxDuration: this.maxDuration(),
      throughput: this.throughput.toFixed(4),
      dependencyCount: this._edges.length,
      isolationLevel: this._isolationLevel,
      state: this._state,
    };
  }
}

export type ProcessState = 'running' | 'sleeping' | 'zombie' | 'orphan' | 'reaped';

export interface ProcessRecord {
  id: string;
  parentId: string | null;
  state: ProcessState;
  children: string[];
  exitCode: number | null;
  startTime: number;
  endTime: number | null;
}

export class GhostProcess {
  private _processes: Map<string, ProcessRecord> = new Map();
  private _state: Record<string, unknown> = {};
  private _reapQueue: string[] = [];
  private _orphanAdoptionChain: Map<string, string> = new Map();
  private _processTreeDepth: number = 0;

  spawn(id: string, parentId: string | null): ProcessRecord {
    const process: ProcessRecord = {
      id,
      parentId,
      state: 'running',
      children: [],
      exitCode: null,
      startTime: Date.now(),
      endTime: null,
    };
    this._processes.set(id, process);
    if (parentId) {
      const parent = this._processes.get(parentId);
      if (parent) parent.children.push(id);
    }
    this._updateTreeDepth();
    return process;
  }

  exit(id: string, exitCode: number): boolean {
    const process = this._processes.get(id);
    if (!process || process.state === 'zombie' || process.state === 'reaped') return false;
    process.state = 'zombie';
    process.exitCode = exitCode;
    process.endTime = Date.now();
    this._reapQueue.push(id);
    return true;
  }

  reap(id: string): boolean {
    const process = this._processes.get(id);
    if (!process || process.state !== 'zombie') return false;
    process.state = 'reaped';
    this._reapQueue = this._reapQueue.filter(pid => pid !== id);
    const parent = process.parentId ? this._processes.get(process.parentId) : null;
    if (parent) {
      parent.children = parent.children.filter(cid => cid !== id);
    }
    for (const childId of process.children) {
      const child = this._processes.get(childId);
      if (child && child.state !== 'reaped') {
        child.parentId = null;
        child.state = 'orphan';
        this._orphanAdoptionChain.set(childId, 'init');
      }
    }
    return true;
  }

  adopt(orphanId: string, adopterId: string): boolean {
    const orphan = this._processes.get(orphanId);
    const adopter = this._processes.get(adopterId);
    if (!orphan || !adopter || orphan.state !== 'orphan') return false;
    orphan.parentId = adopterId;
    orphan.state = 'running';
    adopter.children.push(orphanId);
    this._orphanAdoptionChain.set(orphanId, adopterId);
    return true;
  }

  private _updateTreeDepth(): void {
    let maxDepth = 0;
    for (const process of this._processes.values()) {
      let depth = 0;
      let current: ProcessRecord | undefined = process;
      while (current?.parentId) {
        depth++;
        current = this._processes.get(current.parentId);
        if (depth > 100) break;
      }
      if (depth > maxDepth) maxDepth = depth;
    }
    this._processTreeDepth = maxDepth;
  }

  getProcess(id: string): ProcessRecord | null {
    return this._processes.get(id) ?? null;
  }

  getChildren(parentId: string): ProcessRecord[] {
    const parent = this._processes.get(parentId);
    if (!parent) return [];
    return parent.children.map(cid => this._processes.get(cid)).filter((p): p is ProcessRecord => !!p);
  }

  listByState(state: ProcessState): ProcessRecord[] {
    return Array.from(this._processes.values()).filter(p => p.state === state);
  }

  getAncestors(id: string): string[] {
    const ancestors: string[] = [];
    let current = this._processes.get(id);
    while (current?.parentId) {
      ancestors.push(current.parentId);
      current = this._processes.get(current.parentId);
      if (ancestors.length > 100) break;
    }
    return ancestors;
  }

  getDescendants(id: string): string[] {
    const descendants: string[] = [];
    const queue = [id];
    while (queue.length > 0) {
      const current = queue.shift()!;
      const process = this._processes.get(current);
      if (!process) continue;
      for (const child of process.children) {
        if (!descendants.includes(child)) {
          descendants.push(child);
          queue.push(child);
        }
      }
    }
    return descendants;
  }

  reapAllZombies(): number {
    let reaped = 0;
    for (const id of [...this._reapQueue]) {
      if (this.reap(id)) reaped++;
    }
    return reaped;
  }

  averageLifetime(): number {
    const completed = Array.from(this._processes.values()).filter(p => p.endTime !== null);
    if (completed.length === 0) return 0;
    return completed.reduce((s, p) => s + (p.endTime! - p.startTime), 0) / completed.length;
  }

  get zombieCount(): number {
    return this.listByState('zombie').length;
  }

  get orphanCount(): number {
    return this.listByState('orphan').length;
  }

  get processTreeDepth(): number {
    return this._processTreeDepth;
  }

  processReport(): Record<string, unknown> {
    return {
      processCount: this._processes.size,
      runningCount: this.listByState('running').length,
      zombieCount: this.zombieCount,
      orphanCount: this.orphanCount,
      reapedCount: this.listByState('reaped').length,
      averageLifetime: this.averageLifetime().toFixed(2),
      treeDepth: this._processTreeDepth,
      reapQueueLength: this._reapQueue.length,
      adoptionChainSize: this._orphanAdoptionChain.size,
      state: this._state,
    };
  }
}

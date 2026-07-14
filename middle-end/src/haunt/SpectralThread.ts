export type ThreadState = 'ready' | 'running' | 'blocked' | 'sleeping' | 'terminated';

export interface ThreadRecord {
  id: string;
  state: ThreadState;
  priority: number;
  cpuAffinity: number;
  contextSwitches: number;
  totalRuntime: number;
  blockedOn: string | null;
}

export interface SchedulerSnapshot {
  timestamp: number;
  runningThread: string | null;
  readyQueueLength: number;
  blockedCount: number;
  cpuUtilization: number;
}

export class SpectralThread {
  private _threads: Map<string, ThreadRecord> = new Map();
  private _readyQueue: string[] = [];
  private _schedulerHistory: SchedulerSnapshot[] = [];
  private _state: Record<string, unknown> = {};
  private _contextSwitchEntropy: number = 0;
  private _priorityInversionCount: number = 0;
  private _cpuTimeDistribution: Map<string, number> = new Map();

  spawn(id: string, priority: number, cpuAffinity: number = -1): ThreadRecord {
    const thread: ThreadRecord = {
      id,
      state: 'ready',
      priority,
      cpuAffinity,
      contextSwitches: 0,
      totalRuntime: 0,
      blockedOn: null,
    };
    this._threads.set(id, thread);
    this._readyQueue.push(id);
    this._sortReadyQueue();
    return thread;
  }

  private _sortReadyQueue(): void {
    this._readyQueue.sort((a, b) => {
      const ta = this._threads.get(a)!;
      const tb = this._threads.get(b)!;
      return tb.priority - ta.priority;
    });
  }

  schedule(): string | null {
    if (this._readyQueue.length === 0) return null;
    const nextId = this._readyQueue.shift()!;
    const thread = this._threads.get(nextId);
    if (!thread) return null;
    for (const t of this._threads.values()) {
      if (t.state === 'running') {
        t.state = 'ready';
        this._readyQueue.push(t.id);
      }
    }
    thread.state = 'running';
    thread.contextSwitches++;
    this._cpuTimeDistribution.set(thread.id, (this._cpuTimeDistribution.get(thread.id) ?? 0) + 1);
    this._updateContextSwitchEntropy();
    const snapshot: SchedulerSnapshot = {
      timestamp: Date.now(),
      runningThread: thread.id,
      readyQueueLength: this._readyQueue.length,
      blockedCount: Array.from(this._threads.values()).filter(t => t.state === 'blocked').length,
      cpuUtilization: this._computeCpuUtilization(),
    };
    this._schedulerHistory.push(snapshot);
    if (this._schedulerHistory.length > 200) this._schedulerHistory.shift();
    this._detectPriorityInversion();
    return thread.id;
  }

  private _updateContextSwitchEntropy(): void {
    const total = Array.from(this._cpuTimeDistribution.values()).reduce((a, b) => a + b, 0);
    if (total === 0) return;
    let entropy = 0;
    for (const count of this._cpuTimeDistribution.values()) {
      const p = count / total;
      entropy -= p * Math.log2(p);
    }
    this._contextSwitchEntropy = entropy;
  }

  private _computeCpuUtilization(): number {
    const running = Array.from(this._threads.values()).filter(t => t.state === 'running').length;
    return this._threads.size > 0 ? running / this._threads.size : 0;
  }

  private _detectPriorityInversion(): void {
    const running = Array.from(this._threads.values()).find(t => t.state === 'running');
    if (!running) return;
    for (const t of this._threads.values()) {
      if (t.state === 'blocked' && t.blockedOn && t.priority > running.priority) {
        this._priorityInversionCount++;
      }
    }
  }

  block(threadId: string, resource: string): boolean {
    const thread = this._threads.get(threadId);
    if (!thread || thread.state !== 'running') return false;
    thread.state = 'blocked';
    thread.blockedOn = resource;
    const idx = this._readyQueue.indexOf(threadId);
    if (idx >= 0) this._readyQueue.splice(idx, 1);
    return true;
  }

  unblock(threadId: string): boolean {
    const thread = this._threads.get(threadId);
    if (!thread || thread.state !== 'blocked') return false;
    thread.state = 'ready';
    thread.blockedOn = null;
    this._readyQueue.push(threadId);
    this._sortReadyQueue();
    return true;
  }

  sleep(threadId: string): boolean {
    const thread = this._threads.get(threadId);
    if (!thread || thread.state !== 'running') return false;
    thread.state = 'sleeping';
    const idx = this._readyQueue.indexOf(threadId);
    if (idx >= 0) this._readyQueue.splice(idx, 1);
    return true;
  }

  wake(threadId: string): boolean {
    const thread = this._threads.get(threadId);
    if (!thread || thread.state !== 'sleeping') return false;
    thread.state = 'ready';
    this._readyQueue.push(threadId);
    this._sortReadyQueue();
    return true;
  }

  terminate(threadId: string): boolean {
    const thread = this._threads.get(threadId);
    if (!thread) return false;
    thread.state = 'terminated';
    const idx = this._readyQueue.indexOf(threadId);
    if (idx >= 0) this._readyQueue.splice(idx, 1);
    return true;
  }

  runQuantum(threadId: string, quantum: number): void {
    const thread = this._threads.get(threadId);
    if (thread && thread.state === 'running') {
      thread.totalRuntime += quantum;
    }
  }

  getThread(id: string): ThreadRecord | null {
    return this._threads.get(id) ?? null;
  }

  listByState(state: ThreadState): ThreadRecord[] {
    return Array.from(this._threads.values()).filter(t => t.state === state);
  }

  averagePriority(): number {
    if (this._threads.size === 0) return 0;
    return Array.from(this._threads.values()).reduce((s, t) => s + t.priority, 0) / this._threads.size;
  }

  getSchedulerHistory(limit: number = 50): SchedulerSnapshot[] {
    return this._schedulerHistory.slice(-limit);
  }

  get contextSwitchEntropy(): number {
    return this._contextSwitchEntropy;
  }

  get priorityInversionCount(): number {
    return this._priorityInversionCount;
  }

  threadReport(): Record<string, unknown> {
    return {
      threadCount: this._threads.size,
      readyQueueLength: this._readyQueue.length,
      runningCount: this.listByState('running').length,
      blockedCount: this.listByState('blocked').length,
      contextSwitchEntropy: this._contextSwitchEntropy.toFixed(4),
      priorityInversionCount: this._priorityInversionCount,
      cpuUtilization: this._computeCpuUtilization().toFixed(4),
      averagePriority: this.averagePriority().toFixed(2),
      state: this._state,
    };
  }
}

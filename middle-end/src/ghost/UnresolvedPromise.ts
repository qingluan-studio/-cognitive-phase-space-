/**
 * 未解决的承诺模块：未 resolve 的 Promise 永远等待，
 * 占用内存与回调资源，像幽灵般盘踞在事件循环中。
 */

export type PromiseState = 'pending' | 'fulfilled' | 'rejected' | 'haunting' | 'released';

export interface UnresolvedPromise {
  id: string;
  label: string;
  createdAt: number;
  state: PromiseState;
  awaitingCallbacks: number;
  memoryOccupied: number;
}

export interface ReleaseReport {
  promiseId: string;
  freedCallbacks: number;
  freedMemory: number;
  releasedAt: number;
}

export class UnresolvedPromise {
  private _promises: Map<string, UnresolvedPromise> = new Map();
  private _releases: ReleaseReport[] = [];
  private _hauntingThresholdMs = 10000;
  private _memoryPerCallback = 1024;
  private _maxPromises = 500;

  create(id: string, label: string, callbackCount: number): UnresolvedPromise {
    if (this._promises.size >= this._maxPromises) {
      const oldest = Array.from(this._promises.values()).sort((a, b) => a.createdAt - b.createdAt)[0];
      if (oldest) this._promises.delete(oldest.id);
    }
    const promise: UnresolvedPromise = {
      id,
      label,
      createdAt: Date.now(),
      state: 'pending',
      awaitingCallbacks: callbackCount,
      memoryOccupied: callbackCount * this._memoryPerCallback,
    };
    this._promises.set(id, promise);
    return promise;
  }

  attachCallback(promiseId: string, count: number = 1): boolean {
    const promise = this._promises.get(promiseId);
    if (!promise || promise.state !== 'pending') return false;
    promise.awaitingCallbacks += count;
    promise.memoryOccupied += count * this._memoryPerCallback;
    return true;
  }

  resolve(promiseId: string, _value?: unknown): boolean {
    const promise = this._promises.get(promiseId);
    if (!promise || promise.state !== 'pending') return false;
    promise.state = 'fulfilled';
    promise.awaitingCallbacks = 0;
    promise.memoryOccupied = 0;
    return true;
  }

  reject(promiseId: string, _reason?: unknown): boolean {
    const promise = this._promises.get(promiseId);
    if (!promise || promise.state !== 'pending') return false;
    promise.state = 'rejected';
    promise.awaitingCallbacks = 0;
    promise.memoryOccupied = 0;
    return true;
  }

  scanForHaunting(): number {
    const now = Date.now();
    let haunted = 0;
    for (const promise of this._promises.values()) {
      if (promise.state === 'pending') {
        const elapsed = now - promise.createdAt;
        if (elapsed > this._hauntingThresholdMs) {
          promise.state = 'haunting';
          haunted++;
        }
      }
    }
    return haunted;
  }

  release(promiseId: string): ReleaseReport | null {
    const promise = this._promises.get(promiseId);
    if (!promise) return null;
    const freedCallbacks = promise.awaitingCallbacks;
    const freedMemory = promise.memoryOccupied;
    promise.state = 'released';
    promise.awaitingCallbacks = 0;
    promise.memoryOccupied = 0;
    const report: ReleaseReport = {
      promiseId,
      freedCallbacks,
      freedMemory,
      releasedAt: Date.now(),
    };
    this._releases.push(report);
    if (this._releases.length > 200) this._releases.shift();
    return report;
  }

  releaseAllHaunting(): ReleaseReport[] {
    const reports: ReleaseReport[] = [];
    for (const promise of this._promises.values()) {
      if (promise.state === 'haunting') {
        const report = this.release(promise.id);
        if (report) reports.push(report);
      }
    }
    return reports;
  }

  computeTotalMemoryOccupied(): number {
    let total = 0;
    for (const promise of this._promises.values()) total += promise.memoryOccupied;
    return total;
  }

  setHauntingThreshold(ms: number): void {
    this._hauntingThresholdMs = Math.max(100, ms);
  }

  getHauntingPromises(): UnresolvedPromise[] {
    return Array.from(this._promises.values()).filter(p => p.state === 'haunting');
  }

  getReleaseHistory(limit: number = 50): ReleaseReport[] {
    return this._releases.slice(-limit);
  }

  get promiseCount(): number {
    return this._promises.size;
  }

  get hauntingCount(): number {
    return this.getHauntingPromises().length;
  }
}

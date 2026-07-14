export type HoldEntry = {
  id: string;
  data: Record<string, unknown>;
  timeout: number;
  maxDuration: number;
  isInfinite: boolean;
  priority: number;
};

export type HoldState = 'holding' | 'released' | 'timedOut' | 'aborted';

export type HoldResult = {
  id: string;
  state: HoldState;
  heldDuration: number;
  data: Record<string, unknown>;
  releaseReason: string;
  retryCount: number;
};

export type HoldMetrics = {
  activeCount: number;
  heldTotal: number;
  releasedTotal: number;
  timedOutTotal: number;
  abortedTotal: number;
  averageDuration: number;
};

export class FermataHolder {
  private _holds: Map<string, HoldEntry> = new Map();
  private _timers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private _heldStart: Map<string, number> = new Map();
  private _retryCounts: Map<string, number> = new Map();
  private _releaseCallbacks: Map<string, (result: HoldResult) => void> = new Map();
  
  private _exponentialBackoffBase = 100;
  private _exponentialBackoffMax = 10000;
  private _maxRetryCount = 5;
  
  private _metrics: HoldMetrics = {
    activeCount: 0,
    heldTotal: 0,
    releasedTotal: 0,
    timedOutTotal: 0,
    abortedTotal: 0,
    averageDuration: 0,
  };

  get metrics(): HoldMetrics {
    return { ...this._metrics };
  }

  get activeCount(): number {
    return this._metrics.activeCount;
  }

  hold(entry: HoldEntry): void {
    const existingTimer = this._timers.get(entry.id);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    this._holds.set(entry.id, { ...entry });
    this._heldStart.set(entry.id, Date.now());
    this._retryCounts.set(entry.id, 0);
    this._metrics.activeCount++;
    this._metrics.heldTotal++;

    if (!entry.isInfinite) {
      const effectiveTimeout = entry.maxDuration > 0 
        ? Math.min(entry.timeout, entry.maxDuration)
        : entry.timeout;
      
      this._scheduleTimeout(entry.id, effectiveTimeout);
    }
  }

  private _scheduleTimeout(id: string, timeout: number): void {
    const timer = setTimeout(() => {
      this._handleTimeout(id);
    }, timeout);
    
    this._timers.set(id, timer);
  }

  private _handleTimeout(id: string): void {
    const entry = this._holds.get(id);
    if (!entry) return;

    const retryCount = this._retryCounts.get(id) || 0;
    
    if (retryCount < this._maxRetryCount && !entry.isInfinite) {
      const backoff = this._calculateExponentialBackoff(retryCount);
      this._retryCounts.set(id, retryCount + 1);
      this._scheduleTimeout(id, backoff);
      return;
    }

    const heldDuration = Date.now() - (this._heldStart.get(id) || Date.now());
    
    this._completeHold(id, 'timedOut', `Timeout after ${retryCount + 1} attempts`, heldDuration);
  }

  private _calculateExponentialBackoff(retryCount: number): number {
    const backoff = this._exponentialBackoffBase * Math.pow(2, retryCount);
    const jitter = backoff * 0.1 * (Math.random() - 0.5);
    return Math.min(backoff + jitter, this._exponentialBackoffMax);
  }

  release(id: string, reason: string = 'manual'): HoldResult | null {
    const entry = this._holds.get(id);
    if (!entry) return null;

    const timer = this._timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this._timers.delete(id);
    }

    const heldDuration = Date.now() - (this._heldStart.get(id) || Date.now());
    
    return this._completeHold(id, 'released', reason, heldDuration);
  }

  abort(id: string, reason: string = 'aborted'): HoldResult | null {
    const entry = this._holds.get(id);
    if (!entry) return null;

    const timer = this._timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this._timers.delete(id);
    }

    const heldDuration = Date.now() - (this._heldStart.get(id) || Date.now());
    
    return this._completeHold(id, 'aborted', reason, heldDuration);
  }

  private _completeHold(id: string, state: HoldState, reason: string, heldDuration: number): HoldResult {
    const entry = this._holds.get(id)!;
    const retryCount = this._retryCounts.get(id) || 0;

    const result: HoldResult = {
      id,
      state,
      heldDuration,
      data: { ...entry.data },
      releaseReason: reason,
      retryCount,
    };

    this._metrics.activeCount--;
    
    switch (state) {
      case 'released':
        this._metrics.releasedTotal++;
        break;
      case 'timedOut':
        this._metrics.timedOutTotal++;
        break;
      case 'aborted':
        this._metrics.abortedTotal++;
        break;
    }

    const totalDuration = this._metrics.averageDuration * (
      this._metrics.releasedTotal + this._metrics.timedOutTotal + this._metrics.abortedTotal - 1
    );
    this._metrics.averageDuration = (totalDuration + heldDuration) / (
      this._metrics.releasedTotal + this._metrics.timedOutTotal + this._metrics.abortedTotal
    );

    this._holds.delete(id);
    this._heldStart.delete(id);
    this._retryCounts.delete(id);

    const callback = this._releaseCallbacks.get(id);
    if (callback) {
      callback(result);
      this._releaseCallbacks.delete(id);
    }

    return result;
  }

  getEntry(id: string): HoldEntry | undefined {
    return this._holds.get(id);
  }

  getState(id: string): HoldState {
    if (!this._holds.has(id)) return 'released';
    
    const entry = this._holds.get(id)!;
    const startTime = this._heldStart.get(id) || 0;
    
    if (!entry.isInfinite && entry.maxDuration > 0) {
      const elapsed = Date.now() - startTime;
      if (elapsed >= entry.maxDuration) return 'timedOut';
    }
    
    return 'holding';
  }

  isHolding(id: string): boolean {
    return this._holds.has(id);
  }

  onRelease(id: string, callback: (result: HoldResult) => void): void {
    this._releaseCallbacks.set(id, callback);
  }

  releaseAll(reason: string = 'releaseAll'): HoldResult[] {
    const results: HoldResult[] = [];
    
    for (const id of this._holds.keys()) {
      const result = this.release(id, reason);
      if (result) results.push(result);
    }
    
    return results;
  }

  abortAll(reason: string = 'abortAll'): HoldResult[] {
    const results: HoldResult[] = [];
    
    for (const id of this._holds.keys()) {
      const result = this.abort(id, reason);
      if (result) results.push(result);
    }
    
    return results;
  }

  prioritize(id: string, newPriority: number): boolean {
    const entry = this._holds.get(id);
    if (!entry) return false;

    this._holds.set(id, { ...entry, priority: newPriority });
    return true;
  }

  getHighestPriorityEntry(): HoldEntry | undefined {
    let highest: HoldEntry | undefined;
    let maxPriority = -Infinity;

    for (const entry of this._holds.values()) {
      if (entry.priority > maxPriority) {
        maxPriority = entry.priority;
        highest = entry;
      }
    }

    return highest;
  }

  getEntriesByPriority(): HoldEntry[] {
    return Array.from(this._holds.values()).sort((a, b) => b.priority - a.priority);
  }

  getRemainingTime(id: string): number {
    const entry = this._holds.get(id);
    if (!entry || entry.isInfinite) return -1;

    const startTime = this._heldStart.get(id) || 0;
    const elapsed = Date.now() - startTime;
    
    if (entry.maxDuration > 0) {
      return Math.max(0, entry.maxDuration - elapsed);
    }
    
    return Math.max(0, entry.timeout - elapsed);
  }

  extendHold(id: string, additionalTime: number): boolean {
    const entry = this._holds.get(id);
    if (!entry) return false;

    const timer = this._timers.get(id);
    if (timer) {
      clearTimeout(timer);
    }

    const newMaxDuration = entry.maxDuration > 0 
      ? entry.maxDuration + additionalTime
      : 0;
    
    this._holds.set(id, { ...entry, maxDuration: newMaxDuration });
    
    const remaining = this.getRemainingTime(id);
    if (remaining > 0 && !entry.isInfinite) {
      this._scheduleTimeout(id, remaining);
    }

    return true;
  }

  setExponentialBackoffParams(base: number, max: number, maxRetries: number): void {
    this._exponentialBackoffBase = Math.max(10, base);
    this._exponentialBackoffMax = Math.max(this._exponentialBackoffBase, max);
    this._maxRetryCount = Math.max(0, maxRetries);
  }

  resetMetrics(): void {
    this._metrics = {
      activeCount: this._holds.size,
      heldTotal: this._metrics.heldTotal,
      releasedTotal: 0,
      timedOutTotal: 0,
      abortedTotal: 0,
      averageDuration: 0,
    };
  }
}
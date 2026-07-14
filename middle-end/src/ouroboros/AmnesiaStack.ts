export interface MemoryItem {
  id: string;
  content: Record<string, unknown>;
  weight: number;
  pushedAt: number;
  accessCount: number;
  lastAccess: number;
  consolidation: number;
  entropy: number;
}

export type ForgettingPolicy = 'lru' | 'decay' | 'aggressive' | 'ebbinghaus';

export class AmnesiaStack {
  private _stack: MemoryItem[] = [];
  private _forgetThreshold: number = 0.1;
  private _policy: ForgettingPolicy = 'decay';
  private _forgotten: number = 0;
  private _consolidationRate: number = 0.05;
  private _decayHalfLife: number = 3600000;
  private _maxCapacity: number = 1000;
  private _totalPushed: number = 0;

  get depth(): number {
    return this._stack.length;
  }

  get forgottenCount(): number {
    return this._forgotten;
  }

  get policy(): ForgettingPolicy {
    return this._policy;
  }

  get threshold(): number {
    return this._forgetThreshold;
  }

  get maxCapacity(): number {
    return this._maxCapacity;
  }

  get memoryLoad(): number {
    return this._stack.reduce((sum, m) => sum + m.weight, 0);
  }

  get avgConsolidation(): number {
    if (this._stack.length === 0) return 0;
    return this._stack.reduce((s, m) => s + m.consolidation, 0) / this._stack.length;
  }

  push(item: MemoryItem): number {
    const entropy = this._computeEntropy(JSON.stringify(item.content));
    const fullItem: MemoryItem = {
      ...item,
      lastAccess: item.lastAccess || Date.now(),
      consolidation: item.consolidation || 0,
      entropy,
    };
    this._stack.push(fullItem);
    this._totalPushed++;
    if (this._stack.length > this._maxCapacity) {
      this.forget();
    }
    return this._stack.length;
  }

  pop(): MemoryItem | null {
    return this._stack.pop() ?? null;
  }

  recover(id: string): MemoryItem | null {
    const item = this._stack.find(m => m.id === id);
    if (!item) return null;
    item.accessCount++;
    item.lastAccess = Date.now();
    item.weight = Math.min(1, item.weight + 0.1);
    item.consolidation = Math.min(1, item.consolidation + this._consolidationRate);
    this._moveToTop(item);
    return item;
  }

  forget(): number {
    const before = this._stack.length;
    const now = Date.now();
    if (this._policy === 'lru') {
      this._stack.sort((a, b) => b.lastAccess - a.lastAccess);
    } else if (this._policy === 'decay') {
      for (const m of this._stack) {
        const age = now - m.pushedAt;
        const decayFactor = Math.exp(-age / this._decayHalfLife);
        const consolidationBonus = m.consolidation * 0.5;
        m.weight = Math.max(0, m.weight * decayFactor + consolidationBonus);
      }
    } else if (this._policy === 'aggressive') {
      for (const m of this._stack) {
        m.weight *= 0.5;
        m.consolidation = Math.max(0, m.consolidation - 0.1);
      }
    } else if (this._policy === 'ebbinghaus') {
      for (const m of this._stack) {
        const age = (now - m.pushedAt) / 1000;
        const stability = m.consolidation * 2 + m.accessCount * 0.1;
        const retention = Math.exp(-age / Math.max(1, stability * 60));
        m.weight = Math.max(0, m.weight * retention);
      }
    }
    this._stack = this._stack.filter(m => {
      if (m.weight < this._forgetThreshold) {
        this._forgotten++;
        return false;
      }
      return true;
    });
    return before - this._stack.length;
  }

  getMemoryLoad(): number {
    return this.memoryLoad;
  }

  setPolicy(policy: ForgettingPolicy): void {
    this._policy = policy;
  }

  setThreshold(threshold: number): void {
    this._forgetThreshold = Math.max(0, Math.min(1, threshold));
  }

  setMaxCapacity(capacity: number): void {
    this._maxCapacity = Math.max(1, capacity);
  }

  setDecayHalfLife(halfLife: number): void {
    this._decayHalfLife = Math.max(1000, halfLife);
  }

  setConsolidationRate(rate: number): void {
    this._consolidationRate = Math.max(0, Math.min(1, rate));
  }

  getStack(): MemoryItem[] {
    return [...this._stack];
  }

  getTop(n: number = 10): MemoryItem[] {
    return [...this._stack].sort((a, b) => b.weight - a.weight).slice(0, n);
  }

  search(query: string): MemoryItem[] {
    const results: { item: MemoryItem; score: number }[] = [];
    const q = query.toLowerCase();
    for (const item of this._stack) {
      const contentStr = JSON.stringify(item.content).toLowerCase();
      let score = 0;
      if (contentStr.includes(q)) score += 0.5;
      const words = q.split(/\s+/);
      let matches = 0;
      for (const w of words) if (contentStr.includes(w)) matches++;
      score += matches / Math.max(1, words.length) * 0.3;
      score += item.weight * 0.2;
      if (score > 0.1) results.push({ item, score });
    }
    return results.sort((a, b) => b.score - a.score).map(r => r.item);
  }

  consolidate(): number {
    let count = 0;
    for (const item of this._stack) {
      if (item.accessCount > 3) {
        const old = item.consolidation;
        item.consolidation = Math.min(1, item.consolidation + this._consolidationRate * 2);
        if (item.consolidation > old) count++;
      }
    }
    return count;
  }

  private _computeEntropy(s: string): number {
    const freq = new Map<string, number>();
    for (const ch of s) freq.set(ch, (freq.get(ch) ?? 0) + 1);
    let entropy = 0, len = s.length || 1;
    for (const count of freq.values()) {
      const p = count / len;
      entropy -= p * Math.log2(p);
    }
    return entropy;
  }

  private _moveToTop(item: MemoryItem): void {
    const idx = this._stack.indexOf(item);
    if (idx > -1) {
      this._stack.splice(idx, 1);
      this._stack.push(item);
    }
  }
}

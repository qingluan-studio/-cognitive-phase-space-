export interface InnateBarrier {
  id: string;
  pattern: string;
  threshold: number;
  blockCount: number;
}

export interface DefenseTrigger {
  barrierId: string;
  intruderSignature: string;
  blocked: boolean;
  triggeredAt: number;
}

export class InnateImmunity {
  private _barriers: Map<string, InnateBarrier> = new Map();
  private _triggers: DefenseTrigger[] = [];
  private _sensitivity = 0.5;
  private _maxTriggers = 300;
  private _ngramIndex: Map<string, Set<string>> = new Map();
  private _ngramSize = 2;

  installBarrier(barrier: InnateBarrier): void {
    this._barriers.set(barrier.id, barrier);
    this._indexPattern(barrier.id, barrier.pattern);
  }

  private _indexPattern(barrierId: string, pattern: string): void {
    for (let i = 0; i <= pattern.length - this._ngramSize; i++) {
      const ngram = pattern.slice(i, i + this._ngramSize);
      if (!this._ngramIndex.has(ngram)) {
        this._ngramIndex.set(ngram, new Set());
      }
      this._ngramIndex.get(ngram)!.add(barrierId);
    }
  }

  scan(signature: string): DefenseTrigger[] {
    const results: DefenseTrigger[] = [];
    const candidateBarriers = this._candidateBarriers(signature);
    const barriersToCheck = candidateBarriers.size > 0
      ? candidateBarriers
      : new Set(this._barriers.keys());
    for (const barrierId of barriersToCheck) {
      const barrier = this._barriers.get(barrierId);
      if (!barrier) continue;
      const score = this._jaccardSimilarity(signature, barrier.pattern);
      const blocked = score >= barrier.threshold * this._sensitivity;
      if (blocked) barrier.blockCount++;
      const trigger: DefenseTrigger = {
        barrierId: barrier.id,
        intruderSignature: signature,
        blocked,
        triggeredAt: Date.now(),
      };
      results.push(trigger);
      this._triggers.push(trigger);
    }
    if (this._triggers.length > this._maxTriggers) {
      this._triggers.splice(0, this._triggers.length - this._maxTriggers);
    }
    return results;
  }

  private _candidateBarriers(signature: string): Set<string> {
    const candidates = new Set<string>();
    for (let i = 0; i <= signature.length - this._ngramSize; i++) {
      const ngram = signature.slice(i, i + this._ngramSize);
      const barriers = this._ngramIndex.get(ngram);
      if (barriers) {
        for (const b of barriers) candidates.add(b);
      }
    }
    return candidates;
  }

  private _jaccardSimilarity(a: string, b: string): number {
    const setA = new Set(a);
    const setB = new Set(b);
    let intersection = 0;
    for (const ch of setA) {
      if (setB.has(ch)) intersection++;
    }
    const union = setA.size + setB.size - intersection;
    return union === 0 ? 0 : intersection / union;
  }

  reinforce(barrierId: string, amount: number): InnateBarrier | null {
    const barrier = this._barriers.get(barrierId);
    if (!barrier) return null;
    barrier.threshold = Math.max(0, Math.min(1, barrier.threshold - amount));
    return barrier;
  }

  computeCoverage(): number {
    if (this._barriers.size === 0) return 0;
    const allChars = new Set<string>();
    for (const barrier of this._barriers.values()) {
      for (const ch of barrier.pattern) allChars.add(ch);
    }
    return allChars.size / 128;
  }

  computeFalsePositiveRate(): number {
    if (this._triggers.length === 0) return 0;
    const blocked = this._triggers.filter(t => t.blocked);
    if (blocked.length === 0) return 0;
    const barriers = new Set(blocked.map(t => t.barrierId));
    return barriers.size / this._barriers.size;
  }

  setSensitivity(value: number): void {
    this._sensitivity = Math.max(0, Math.min(1, value));
  }

  getBarrier(id: string): InnateBarrier | null {
    return this._barriers.get(id) ?? null;
  }

  getTriggers(limit: number = 50): DefenseTrigger[] {
    return this._triggers.slice(-limit);
  }

  getBlockStatistics(): Record<string, number> {
    const stats: Record<string, number> = {};
    for (const barrier of this._barriers.values()) {
      stats[barrier.id] = barrier.blockCount;
    }
    return stats;
  }

  get barrierCount(): number {
    return this._barriers.size;
  }
}

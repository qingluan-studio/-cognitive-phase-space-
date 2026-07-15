export interface MemoryTrace {
  id: number;
  pattern: number[];
  strength: number;
  timestamp: number;
  consolidated: boolean;
  rehearsalCount: number;
}

export interface ConsolidationSnapshot {
  time: number;
  traceCount: number;
  meanStrength: number;
  consolidatedCount: number;
}

export class MemoryConsolidation {
  private _traces: MemoryTrace[];
  private _capacity: number;
  private _decayRate: number;
  private _consolidationThreshold: number;
  private _rehearsalGain: number;
  private _currentTime: number;
  private _history: ConsolidationSnapshot[];
  private _nextId: number;

  constructor(capacity: number = 1000, decayRate: number = 0.01, threshold: number = 0.5) {
    this._traces = [];
    this._capacity = capacity;
    this._decayRate = decayRate;
    this._consolidationThreshold = threshold;
    this._rehearsalGain = 0.2;
    this._currentTime = 0;
    this._history = [];
    this._nextId = 0;
  }

  get traceCount(): number { return this._traces.length; }
  get capacity(): number { return this._capacity; }
  get decayRate(): number { return this._decayRate; }
  get currentTime(): number { return this._currentTime; }
  get history(): ConsolidationSnapshot[] { return this._history; }

  public encode(pattern: number[], initialStrength: number = 1.0): MemoryTrace {
    const trace: MemoryTrace = {
      id: this._nextId++,
      pattern: [...pattern],
      strength: initialStrength,
      timestamp: this._currentTime,
      consolidated: initialStrength >= this._consolidationThreshold,
      rehearsalCount: 0
    };
    this._traces.push(trace);
    if (this._traces.length > this._capacity) {
      this._forgetWeakest();
    }
    return trace;
  }

  public rehearse(pattern: number[], similarityThreshold: number = 0.8): boolean {
    const match = this._findMostSimilar(pattern, similarityThreshold);
    if (match) {
      match.strength = Math.min(1.0, match.strength + this._rehearsalGain);
      match.rehearsalCount++;
      if (match.strength >= this._consolidationThreshold) {
        match.consolidated = true;
      }
      return true;
    }
    return false;
  }

  private _findMostSimilar(pattern: number[], threshold: number): MemoryTrace | null {
    let bestMatch: MemoryTrace | null = null;
    let bestSim = threshold;
    for (const trace of this._traces) {
      const sim = this._cosineSimilarity(pattern, trace.pattern);
      if (sim > bestSim) {
        bestSim = sim;
        bestMatch = trace;
      }
    }
    return bestMatch;
  }

  private _cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return normA > 0 && normB > 0 ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
  }

  private _forgetWeakest(): void {
    let minIndex = 0;
    let minStrength = Infinity;
    for (let i = 0; i < this._traces.length; i++) {
      if (this._traces[i].strength < minStrength) {
        minStrength = this._traces[i].strength;
        minIndex = i;
      }
    }
    this._traces.splice(minIndex, 1);
  }

  public decayStep(): void {
    this._currentTime++;
    for (const trace of this._traces) {
      const age = this._currentTime - trace.timestamp;
      const ebbinghausFactor = Math.exp(-this._decayRate * age);
      trace.strength *= ebbinghausFactor;
      if (trace.strength < 0.01 && !trace.consolidated) {
        trace.strength = 0;
      }
    }
    this._traces = this._traces.filter(t => t.strength > 0.001);
    this._recordSnapshot();
  }

  public consolidateSleep(epochs: number = 10): void {
    for (let e = 0; e < epochs; e++) {
      const recent = this._traces.filter(t => this._currentTime - t.timestamp < 50);
      for (let i = 0; i < recent.length; i++) {
        for (let j = i + 1; j < recent.length; j++) {
          const sim = this._cosineSimilarity(recent[i].pattern, recent[j].pattern);
          if (sim > 0.7) {
            recent[i].strength = Math.min(1.0, recent[i].strength + 0.05);
            recent[j].strength = Math.min(1.0, recent[j].strength + 0.05);
          }
        }
      }
      for (const trace of recent) {
        if (trace.strength >= this._consolidationThreshold) {
          trace.consolidated = true;
        }
      }
    }
  }

  public recall(pattern: number[], threshold: number = 0.7): MemoryTrace | null {
    return this._findMostSimilar(pattern, threshold);
  }

  public recallWithCompletion(partialPattern: number[], threshold: number = 0.6): MemoryTrace | null {
    let bestMatch: MemoryTrace | null = null;
    let bestSim = threshold;
    for (const trace of this._traces) {
      const sim = this._partialSimilarity(partialPattern, trace.pattern);
      if (sim > bestSim) {
        bestSim = sim;
        bestMatch = trace;
      }
    }
    return bestMatch;
  }

  private _partialSimilarity(partial: number[], full: number[]): number {
    let dot = 0;
    let normPartial = 0;
    let normFull = 0;
    for (let i = 0; i < Math.min(partial.length, full.length); i++) {
      dot += partial[i] * full[i];
      normPartial += partial[i] * partial[i];
      normFull += full[i] * full[i];
    }
    return normPartial > 0 && normFull > 0 ? dot / (Math.sqrt(normPartial) * Math.sqrt(normFull)) : 0;
  }

  public getConsolidatedTraces(): MemoryTrace[] {
    return this._traces.filter(t => t.consolidated).map(t => ({ ...t, pattern: [...t.pattern] }));
  }

  public getRecentTraces(window: number = 50): MemoryTrace[] {
    return this._traces
      .filter(t => this._currentTime - t.timestamp <= window)
      .map(t => ({ ...t, pattern: [...t.pattern] }));
  }

  public computeMemoryLoad(): number {
    return this._traces.length / this._capacity;
  }

  public computeMeanStrength(): number {
    if (this._traces.length === 0) return 0;
    return this._traces.reduce((sum, t) => sum + t.strength, 0) / this._traces.length;
  }

  public computeForgettingCurve(): { time: number; retention: number }[] {
    const curve: { time: number; retention: number }[] = [];
    const initial = this._traces.filter(t => t.timestamp === 0);
    for (let t = 0; t <= 100; t += 5) {
      let retained = 0;
      for (const trace of initial) {
        const strength = trace.strength * Math.exp(-this._decayRate * t);
        if (strength > 0.1) retained++;
      }
      curve.push({ time: t, retention: initial.length > 0 ? retained / initial.length : 0 });
    }
    return curve;
  }

  public interferenceEffect(newPattern: number[], oldPattern: number[]): number {
    const sim = this._cosineSimilarity(newPattern, oldPattern);
    return sim > 0.8 ? 1 - sim : 0;
  }

  private _recordSnapshot(): void {
    this._history.push({
      time: this._currentTime,
      traceCount: this._traces.length,
      meanStrength: this.computeMeanStrength(),
      consolidatedCount: this._traces.filter(t => t.consolidated).length
    });
  }

  public reset(): void {
    this._traces = [];
    this._currentTime = 0;
    this._history = [];
    this._nextId = 0;
  }

  public exportTraces(): MemoryTrace[] {
    return this._traces.map(t => ({ ...t, pattern: [...t.pattern] }));
  }
}

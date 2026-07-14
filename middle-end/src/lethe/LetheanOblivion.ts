export interface OblivionConfig {
  decayRate: number;
  traceThreshold: number;
  maxTraces: number;
}

export interface MemoryTrace {
  id: string;
  content: string;
  strength: number;
  createdAt: number;
  accessCount: number;
}

export class LetheanOblivion {
  private _config: OblivionConfig;
  private _traces: MemoryTrace[] = [];
  private _forgottenCount: number = 0;
  private _entropyRate: number = 0;
  private _forgettingCurve: { time: number; retained: number }[] = [];
  private _interferenceMatrix: Map<string, Map<string, number>> = new Map();

  constructor(config: OblivionConfig) {
    this._config = config;
  }

  get traceCount(): number {
    return this._traces.length;
  }

  get forgottenCount(): number {
    return this._forgottenCount;
  }

  get entropyRate(): number {
    return this._entropyRate;
  }

  encode(content: string): MemoryTrace {
    const trace: MemoryTrace = {
      id: `trace-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      content,
      strength: 1,
      createdAt: Date.now(),
      accessCount: 0,
    };
    this._traces.push(trace);
    if (this._traces.length > this._config.maxTraces) {
      this._evict();
    }
    this._updateInterference(trace);
    return trace;
  }

  private _updateInterference(newTrace: MemoryTrace): void {
    for (const trace of this._traces) {
      if (trace.id === newTrace.id) continue;
      const similarity = this._jaccardSimilarity(newTrace.content, trace.content);
      if (!this._interferenceMatrix.has(newTrace.id)) this._interferenceMatrix.set(newTrace.id, new Map());
      if (!this._interferenceMatrix.has(trace.id)) this._interferenceMatrix.set(trace.id, new Map());
      this._interferenceMatrix.get(newTrace.id)!.set(trace.id, similarity);
      this._interferenceMatrix.get(trace.id)!.set(newTrace.id, similarity);
    }
  }

  private _jaccardSimilarity(a: string, b: string): number {
    const setA = new Set(a.split(/\s+/));
    const setB = new Set(b.split(/\s+/));
    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  retrieve(id: string): MemoryTrace | null {
    const trace = this._traces.find(t => t.id === id);
    if (!trace) return null;
    const age = (Date.now() - trace.createdAt) / 1000;
    const ebbinghausRetention = Math.exp(-this._config.decayRate * age / Math.log(trace.accessCount + 2));
    const interference = this._computeInterference(trace);
    const effectiveStrength = trace.strength * ebbinghausRetention * (1 - interference);
    if (effectiveStrength < this._config.traceThreshold) {
      this.forget(id);
      return null;
    }
    trace.accessCount++;
    trace.strength = Math.min(1, trace.strength + 0.05);
    return trace;
  }

  private _computeInterference(trace: MemoryTrace): number {
    const row = this._interferenceMatrix.get(trace.id);
    if (!row) return 0;
    let total = 0;
    for (const sim of row.values()) total += sim;
    return row.size > 0 ? total / row.size : 0;
  }

  forget(id: string): boolean {
    const idx = this._traces.findIndex(t => t.id === id);
    if (idx === -1) return false;
    this._traces.splice(idx, 1);
    this._interferenceMatrix.delete(id);
    for (const row of this._interferenceMatrix.values()) row.delete(id);
    this._forgottenCount++;
    return true;
  }

  age(dt: number): void {
    for (const trace of this._traces) {
      const age = (Date.now() - trace.createdAt) / 1000 + dt;
      const decay = Math.exp(-this._config.decayRate * age);
      trace.strength *= decay;
    }
    this._traces = this._traces.filter(t => t.strength >= this._config.traceThreshold);
    this._updateEntropy();
  }

  private _updateEntropy(): void {
    const strengths = this._traces.map(t => t.strength);
    const total = strengths.reduce((a, b) => a + b, 0);
    if (total === 0) { this._entropyRate = 0; return; }
    let entropy = 0;
    for (const s of strengths) {
      const p = s / total;
      if (p > 0) entropy -= p * Math.log2(p);
    }
    this._entropyRate = entropy / Math.log2(this._traces.length + 1);
  }

  private _evict(): void {
    let weakest = 0;
    for (let i = 1; i < this._traces.length; i++) {
      if (this._traces[i].strength < this._traces[weakest].strength) weakest = i;
    }
    this.forget(this._traces[weakest].id);
  }

  batchForget(pattern: string): number {
    const matching = this._traces.filter(t => t.content.includes(pattern));
    for (const trace of matching) this.forget(trace.id);
    return matching.length;
  }

  recallPartial(content: string): MemoryTrace[] {
    return this._traces
      .filter(t => t.content.includes(content))
      .sort((a, b) => b.strength - a.strength);
  }

  getRetrievable(): MemoryTrace[] {
    return this._traces.filter(t => t.strength >= this._config.traceThreshold);
  }

  getForgettingCurve(): { time: number; retained: number }[] {
    this._forgettingCurve = [];
    for (let t = 0; t <= 100; t += 5) {
      const retained = Math.exp(-this._config.decayRate * t);
      this._forgettingCurve.push({ time: t, retained });
    }
    return [...this._forgettingCurve];
  }

  computeHalfLife(): number {
    return this._config.decayRate > 0 ? Math.log(2) / this._config.decayRate : Infinity;
  }

  setDecayRate(rate: number): void {
    this._config.decayRate = Math.max(0.001, rate);
  }

  getCapacityUtilization(): number {
    return this._config.maxTraces > 0 ? this._traces.length / this._config.maxTraces : 0;
  }
}

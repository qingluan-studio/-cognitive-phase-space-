export interface VoidTick {
  id: string;
  tick: number;
  produced: null;
  entropy: number;
}

export class VoidGenerator {
  private _ticks: VoidTick[];
  private _tickCount: number;
  private _entropyLog: number[];
  private _nullSequence: number[];
  private _markovChain: Map<number, Map<number, number>>;

  constructor() {
    this._ticks = [];
    this._tickCount = 0;
    this._entropyLog = [];
    this._nullSequence = [];
    this._markovChain = new Map();
  }

  get tickCount(): number {
    return this._tickCount;
  }

  public next(): VoidTick {
    this._tickCount++;
    const entropy = this._computeNullEntropy();
    const tick: VoidTick = {
      id: `void-${Date.now()}-${this._tickCount}`,
      tick: this._tickCount,
      produced: null,
      entropy,
    };
    this._ticks.push(tick);
    if (this._ticks.length > 100) this._ticks.shift();
    this._entropyLog.push(entropy);
    if (this._entropyLog.length > 50) this._entropyLog.shift();
    this._nullSequence.push(0);
    if (this._nullSequence.length > 100) this._nullSequence.shift();
    this._updateMarkov();
    return tick;
  }

  public batch(count: number): VoidTick[] {
    const batch: VoidTick[] = [];
    for (let i = 0; i < count; i++) {
      batch.push(this.next());
    }
    return batch;
  }

  public reset(): void {
    this._ticks = [];
    this._tickCount = 0;
    this._entropyLog = [];
    this._nullSequence = [];
    this._markovChain.clear();
  }

  public getTicks(limit: number = 50): VoidTick[] {
    return this._ticks.slice(-limit);
  }

  public computeVoidEntropy(): number {
    if (this._entropyLog.length === 0) return 0;
    const mean = this._entropyLog.reduce((a, b) => a + b, 0) / this._entropyLog.length;
    const variance = this._entropyLog.reduce((s, v) => s + (v - mean) ** 2, 0) / this._entropyLog.length;
    return 0.5 * Math.log2(2 * Math.PI * Math.E * Math.max(variance, 1e-10));
  }

  public computeMarkovEntropy(): number {
    let entropy = 0;
    for (const [state, trans] of this._markovChain) {
      const total = Array.from(trans.values()).reduce((a, b) => a + b, 0);
      if (total === 0) continue;
      for (const count of trans.values()) {
        const p = count / total;
        if (p > 0) entropy -= p * Math.log2(p);
      }
    }
    return entropy;
  }

  public simulateQuantumVacuum(steps: number): Array<{ step: number; energy: number; field: number }> {
    const vacuum: Array<{ step: number; energy: number; field: number }> = [];
    let field = 0;
    for (let i = 0; i < steps; i++) {
      const energy = Math.random() < 0.5 ? 0.5 : 0;
      field += energy * (Math.random() - 0.5);
      vacuum.push({ step: i, energy, field });
    }
    return vacuum;
  }

  public computeAutocorrelation(lag: number): number {
    if (this._nullSequence.length <= lag) return 0;
    const mean = this._nullSequence.reduce((a, b) => a + b, 0) / this._nullSequence.length;
    let num = 0;
    let den = 0;
    for (let i = 0; i < this._nullSequence.length - lag; i++) {
      num += (this._nullSequence[i] - mean) * (this._nullSequence[i + lag] - mean);
    }
    for (let i = 0; i < this._nullSequence.length; i++) {
      den += (this._nullSequence[i] - mean) ** 2;
    }
    return den > 0 ? num / den : 0;
  }

  private _computeNullEntropy(): number {
    const ones = this._nullSequence.filter(v => v === 0).length;
    const total = this._nullSequence.length + 1;
    const p0 = ones / total;
    const p1 = (total - ones) / total;
    return -(p0 * Math.log2(p0 + 1e-10) + p1 * Math.log2(p1 + 1e-10));
  }

  private _updateMarkov(): void {
    const n = this._nullSequence.length;
    if (n < 2) return;
    const prev = this._nullSequence[n - 2];
    const curr = this._nullSequence[n - 1];
    if (!this._markovChain.has(prev)) {
      this._markovChain.set(prev, new Map());
    }
    const trans = this._markovChain.get(prev)!;
    trans.set(curr, (trans.get(curr) ?? 0) + 1);
  }
}

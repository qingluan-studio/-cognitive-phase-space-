export interface Pendulum {
  id: string;
  phase: number;
  frequency: number;
  amplitude: number;
}

export class PendulumSync {
  private _pendulums: Map<string, Pendulum> = new Map();
  private _coupling = 0.05;
  private _syncThreshold = 0.05;
  private _ticks = 0;
  private _orderParameterHistory: number[] = [];
  private _naturalFrequencies: Map<string, number> = new Map();
  private _kuramotoOrderR = 0;
  private _kuramotoOrderPsi = 0;

  addPendulum(p: Pendulum): void {
    this._pendulums.set(p.id, p);
    this._naturalFrequencies.set(p.id, p.frequency);
  }

  tick(dt: number = 0.1): void {
    const pendulums = Array.from(this._pendulums.values());
    if (pendulums.length === 0) return;
    const { r, psi } = this._computeKuramotoOrder();
    this._kuramotoOrderR = r;
    this._kuramotoOrderPsi = psi;
    for (const p of pendulums) {
      const omega = this._naturalFrequencies.get(p.id) ?? p.frequency;
      p.phase = (p.phase + omega * dt) % (Math.PI * 2);
      p.frequency += this._coupling * r * Math.sin(psi - p.phase);
      p.amplitude *= 0.999;
    }
    this._ticks++;
    this._orderParameterHistory.push(r);
    if (this._orderParameterHistory.length > 200) this._orderParameterHistory.shift();
  }

  measureCoherence(): number {
    const ps = Array.from(this._pendulums.values());
    if (ps.length < 2) return 1;
    let sumSin = 0, sumCos = 0;
    for (const p of ps) {
      sumSin += Math.sin(p.phase);
      sumCos += Math.cos(p.phase);
    }
    return Math.sqrt(sumSin * sumSin + sumCos * sumCos) / ps.length;
  }

  isSynchronized(): boolean {
    return this.measureCoherence() >= 1 - this._syncThreshold;
  }

  forceLock(targetFreq: number): void {
    for (const p of this._pendulums.values()) {
      p.frequency = targetFreq;
    }
  }

  removePendulum(id: string): boolean {
    this._naturalFrequencies.delete(id);
    return this._pendulums.delete(id);
  }

  resetPhases(): void {
    for (const p of this._pendulums.values()) {
      p.phase = 0;
      p.amplitude = 1;
    }
  }

  meanFrequency(): number {
    const ps = Array.from(this._pendulums.values());
    if (ps.length === 0) return 0;
    return ps.reduce((s, p) => s + p.frequency, 0) / ps.length;
  }

  computePhaseDiffusion(): number {
    if (this._orderParameterHistory.length < 2) return 0;
    const mean = this._orderParameterHistory.reduce((s, v) => s + v, 0) / this._orderParameterHistory.length;
    const variance = this._orderParameterHistory.reduce((s, v) => s + (v - mean) ** 2, 0) / this._orderParameterHistory.length;
    return variance;
  }

  computeLyapunovSpectrum(sampleId: string): number {
    const p = this._pendulums.get(sampleId);
    if (!p) return 0;
    const neighbors = Array.from(this._pendulums.values()).filter((n) => n.id !== sampleId);
    let divergence = 0;
    for (const n of neighbors) {
      const phaseDiff = Math.sin(p.phase - n.phase);
      divergence += this._coupling * Math.abs(phaseDiff);
    }
    return Math.log(divergence + 1);
  }

  setCoupling(value: number): void {
    this._coupling = Math.max(0, Math.min(1, value));
  }

  getPendulum(id: string): Pendulum | null {
    return this._pendulums.get(id) ?? null;
  }

  getAllPendulums(): Pendulum[] {
    return Array.from(this._pendulums.values());
  }

  get pendulumCount(): number {
    return this._pendulums.size;
  }

  get ticks(): number {
    return this._ticks;
  }

  get kuramotoOrderR(): number {
    return this._kuramotoOrderR;
  }

  private _computeKuramotoOrder(): { r: number; psi: number } {
    const ps = Array.from(this._pendulums.values());
    if (ps.length === 0) return { r: 0, psi: 0 };
    let sumSin = 0, sumCos = 0;
    for (const p of ps) {
      sumSin += Math.sin(p.phase);
      sumCos += Math.cos(p.phase);
    }
    const r = Math.sqrt(sumSin * sumSin + sumCos * sumCos) / ps.length;
    const psi = Math.atan2(sumSin, sumCos);
    return { r, psi };
  }
}

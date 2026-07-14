/**
 * 钟摆同步：多个摆动逐渐同步到同一频率。
 * 实现耦合振子的相位同步，参考惠更斯钟摆同步现象。
 */

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

  addPendulum(p: Pendulum): void {
    this._pendulums.set(p.id, p);
  }

  tick(dt: number = 0.1): void {
    const pendulums = Array.from(this._pendulums.values());
    if (pendulums.length === 0) return;
    const meanFreq = pendulums.reduce((s, p) => s + p.frequency, 0) / pendulums.length;
    for (const p of pendulums) {
      p.phase = (p.phase + p.frequency * dt) % (Math.PI * 2);
      p.frequency += this._coupling * (meanFreq - p.frequency);
      p.amplitude *= 0.999;
    }
    this._ticks++;
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
}

export type ClockState = { phase: number; frequency: number; amplitude: number; offset: number; damping: number };
export type EntrainmentStatus = { isEntrained: boolean; phaseDifference: number; frequencyRatio: number; convergenceRate: number; coherence: number };
export type PhaseHistoryEntry = { timestamp: number; phase: number; frequency: number };

export class EntrainmentClock {
  private _internal: ClockState = { phase: 0, frequency: 1, amplitude: 1, offset: 0, damping: 0.95 };
  private _external: ClockState = { phase: 0, frequency: 1, amplitude: 1, offset: 0, damping: 0.95 };
  private _rate = 0.01;
  private _running = false;
  private _lastTick = 0;
  private _history: PhaseHistoryEntry[] = [];
  private _coupling = 0.15;
  private _adaptive = true;
  private _noise = 0.001;

  get internal(): ClockState { return { ...this._internal }; }
  get external(): ClockState { return { ...this._external }; }
  get isRunning(): boolean { return this._running; }

  setEntrainmentRate(rate: number): void { this._rate = Math.min(1, Math.max(0, rate)); }
  setCoupling(strength: number): void { this._coupling = Math.min(1, Math.max(0, strength)); }
  setAdaptive(enabled: boolean): void { this._adaptive = enabled; }
  setNoise(level: number): void { this._noise = Math.min(0.1, Math.max(0, level)); }

  setExternal(clock: Partial<ClockState>): void { this._external = { ...this._external, ...clock }; }

  start(): void { if (!this._running) { this._running = true; this._lastTick = Date.now(); this._tick(); } }
  stop(): void { this._running = false; }

  private _tick(): void {
    if (!this._running) return;
    const now = Date.now(), dt = (now - this._lastTick) / 1000;
    this._lastTick = now;
    this._integrate(dt);
    this._entrain();
    this._record(now);
    if (this._adaptive) this._adapt();
    setTimeout(() => this._tick(), 16);
  }

  private _integrate(dt: number): void {
    const noise = (Math.random() - 0.5) * 2 * this._noise;
    const accel = this._internal.amplitude * Math.sin(this._internal.phase + this._internal.offset) * this._internal.frequency;
    this._internal.phase = this._normalize(this._internal.phase + (this._internal.frequency + noise + accel * 0.1) * dt);
    this._internal.frequency = Math.max(0.1, Math.min(10, this._internal.frequency + noise * 0.1));
  }

  private _normalize(phase: number): number { let p = phase % (2 * Math.PI); return p < 0 ? p + 2 * Math.PI : p; }

  private _entrain(): void {
    const phaseDiff = this._phaseDiff();
    const freqDiff = this._external.frequency - this._internal.frequency;
    this._internal.phase = this._normalize(this._internal.phase + this._coupling * Math.sin(phaseDiff) * this._rate);
    this._internal.frequency *= (1 - this._internal.damping * 0.01);
    this._internal.frequency += freqDiff * this._coupling * this._rate * 0.3;
  }

  private _phaseDiff(): number { let diff = this._external.phase - this._internal.phase; return ((diff + Math.PI) % (2 * Math.PI)) - Math.PI; }

  private _adapt(): void {
    const diff = Math.abs(this._phaseDiff());
    if (diff > 0.5) this._coupling = Math.min(0.5, this._coupling + 0.005);
    else if (diff < 0.1) this._coupling = Math.max(0.05, this._coupling - 0.002);
  }

  private _record(ts: number): void {
    this._history.push({ timestamp: ts, phase: this._internal.phase, frequency: this._internal.frequency });
    if (this._history.length > 50) this._history.shift();
  }

  private _coherence(): number {
    if (this._history.length < 20) return 0;
    const recent = this._history.slice(-20);
    let [real, imag] = [0, 0];
    for (const p of recent) { real += Math.cos(p.phase); imag += Math.sin(p.phase); }
    const coh = Math.sqrt(real * real + imag * imag) / recent.length;
    const freqStd = this._stdDev(recent.map(p => p.frequency));
    return coh * 0.7 + Math.max(0, 1 - freqStd * 2) * 0.3;
  }

  private _stdDev(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length);
  }

  getStatus(): EntrainmentStatus {
    const phaseDiff = Math.abs(this._phaseDiff());
    const freqRatio = this._internal.frequency / this._external.frequency;
    return {
      isEntrained: phaseDiff < 0.1 && Math.abs(freqRatio - 1) < 0.01,
      phaseDifference: phaseDiff,
      frequencyRatio: freqRatio,
      convergenceRate: this._rate * this._coupling,
      coherence: this._coherence(),
    };
  }

  getHistory(): PhaseHistoryEntry[] { return [...this._history]; }
  reset(): void { this._internal = { phase: 0, frequency: 1, amplitude: 1, offset: 0, damping: 0.95 }; this._history = []; this._lastTick = Date.now(); }
  sync(): void { this._internal = { ...this._external }; this._history = []; }

  setPhase(phase: number): void { this._internal.phase = this._normalize(phase); }
  setFrequency(freq: number): void { this._internal.frequency = Math.max(0.1, Math.min(10, freq)); }

  phaseVelocity(): number {
    if (this._history.length < 2) return 0;
    const [a, b] = this._history.slice(-2);
    let dPhase = b.phase - a.phase;
    if (dPhase > Math.PI) dPhase -= 2 * Math.PI;
    if (dPhase < -Math.PI) dPhase += 2 * Math.PI;
    return dPhase / ((b.timestamp - a.timestamp) / 1000);
  }

  beatFrequency(): number { return Math.abs(this._external.frequency - this._internal.frequency); }
  isPhaseLocked(): boolean { return this.getStatus().phaseDifference < 0.05; }
  isFrequencyLocked(): boolean { return Math.abs(this.getStatus().frequencyRatio - 1) < 0.005; }
}
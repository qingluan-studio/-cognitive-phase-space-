export interface PresenceState {
  isPresent: boolean;
  startedAt: number;
  heartbeats: number;
  stillnessLevel: number;
  coherence: number;
  variability: number;
}

export interface PresenceSnapshot {
  capturedAt: number;
  present: boolean;
  duration: number;
  stillness: number;
  entropy: number;
}

export class PurePresence {
  private _state: PresenceState = {
    isPresent: false, startedAt: 0, heartbeats: 0,
    stillnessLevel: 1, coherence: 1, variability: 0,
  };
  private _snapshots: PresenceSnapshot[] = [];
  private _heartbeatIntervalMs = 1000;
  private _heartbeatTimestamps: number[] = [];
  private _stillnessSeries: number[] = [];
  private _timer: ReturnType<typeof setInterval> | null = null;
  private _maxSeries = 64;

  begin(): void {
    if (this._state.isPresent) return;
    this._state.isPresent = true;
    this._state.startedAt = Date.now();
    this._state.heartbeats = 0;
    this._heartbeatTimestamps = [];
    this._stillnessSeries = [this._state.stillnessLevel];
    this._startHeartbeat();
  }

  end(): void {
    this._state.isPresent = false;
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  private _startHeartbeat(): void {
    this._timer = setInterval(() => {
      if (!this._state.isPresent) return;
      this._state.heartbeats++;
      this._heartbeatTimestamps.push(Date.now());
      if (this._heartbeatTimestamps.length > this._maxSeries) this._heartbeatTimestamps.shift();
      this._state.variability = this._computeHeartRateVariability();
      this._state.coherence = this._computeCoherence();
    }, this._heartbeatIntervalMs);
  }

  captureSnapshot(): PresenceSnapshot {
    const entropy = this._stillnessEntropy();
    const snapshot: PresenceSnapshot = {
      capturedAt: Date.now(),
      present: this._state.isPresent,
      duration: this._state.isPresent ? Date.now() - this._state.startedAt : 0,
      stillness: this._state.stillnessLevel,
      entropy,
    };
    this._snapshots.push(snapshot);
    if (this._snapshots.length > 100) this._snapshots.shift();
    return snapshot;
  }

  deepenStillness(amount: number = 0.1): number {
    this._state.stillnessLevel = Math.min(1, this._state.stillnessLevel + amount);
    this._recordStillness();
    return this._state.stillnessLevel;
  }

  reduceStillness(amount: number = 0.1): number {
    this._state.stillnessLevel = Math.max(0, this._state.stillnessLevel - amount);
    this._recordStillness();
    return this._state.stillnessLevel;
  }

  getState(): Readonly<PresenceState> {
    return { ...this._state };
  }

  getSnapshots(): PresenceSnapshot[] {
    return [...this._snapshots];
  }

  get isPresent(): boolean { return this._state.isPresent; }
  get duration(): number {
    return this._state.isPresent ? Date.now() - this._state.startedAt : 0;
  }
  get coherence(): number { return this._state.coherence; }
  get variability(): number { return this._state.variability; }

  private _recordStillness(): void {
    this._stillnessSeries.push(this._state.stillnessLevel);
    if (this._stillnessSeries.length > this._maxSeries) this._stillnessSeries.shift();
  }

  private _computeHeartRateVariability(): number {
    if (this._heartbeatTimestamps.length < 3) return 0;
    const intervals: number[] = [];
    for (let i = 1; i < this._heartbeatTimestamps.length; i++) {
      intervals.push(this._heartbeatTimestamps[i] - this._heartbeatTimestamps[i - 1]);
    }
    const mean = intervals.reduce((s, v) => s + v, 0) / intervals.length;
    const variance = intervals.reduce((s, v) => s + (v - mean) ** 2, 0) / intervals.length;
    const sdnn = Math.sqrt(variance);
    const cv = mean > 0 ? sdnn / mean : 0;
    return Math.min(1, cv);
  }

  private _computeCoherence(): number {
    if (this._stillnessSeries.length < 2) return this._state.coherence;
    const recent = this._stillnessSeries.slice(-16);
    const mean = recent.reduce((s, v) => s + v, 0) / recent.length;
    const variance = recent.reduce((s, v) => s + (v - mean) ** 2, 0) / recent.length;
    const stability = 1 - Math.min(1, Math.sqrt(variance));
    const stillness = this._state.stillnessLevel;
    const hrv = this._state.variability;
    return 0.5 * stillness + 0.3 * stability + 0.2 * (1 - hrv);
  }

  private _stillnessEntropy(): number {
    if (this._stillnessSeries.length < 2) return 0;
    const bins = new Array(10).fill(0);
    for (const v of this._stillnessSeries) {
      const idx = Math.min(9, Math.max(0, Math.floor(v * 10)));
      bins[idx]++;
    }
    const total = this._stillnessSeries.length;
    let entropy = 0;
    for (const count of bins) {
      if (count === 0) continue;
      const p = count / total;
      entropy -= p * Math.log2(p);
    }
    return entropy;
  }
}

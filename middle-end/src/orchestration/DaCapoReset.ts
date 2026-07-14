export interface ResetCheckpoint {
  id: string;
  label: string;
  state: Record<string, unknown>;
  capturedAt: number;
  fingerprint: number;
  depth: number;
}

export interface OutOfTuneSignal {
  id: string;
  metric: string;
  deviation: number;
  detectedAt: number;
  severity: number;
  trend: number;
}

export interface DaCapoEvent {
  id: string;
  triggerSignalId: string;
  restoredCheckpointId: string;
  memoryPreserved: string[];
  resetAt: number;
  stateDelta: number;
  confidence: number;
}

export class DaCapoReset {
  private _checkpoints: Map<string, ResetCheckpoint> = new Map();
  private _signals: OutOfTuneSignal[] = [];
  private _events: DaCapoEvent[] = [];
  private _activeState: Record<string, unknown> = {};
  private _idCounter = 0;
  private _deviationThreshold = 0.3;
  private _severityThreshold = 0.5;
  private _memoryKeys: Set<string> = new Set();
  private _memoryWeights: Record<string, number> = {};
  private _signalHistory: number[] = [];
  private _predictionWindow = 5;

  captureCheckpoint(label: string, state: Record<string, unknown>): ResetCheckpoint {
    const id = `ckpt-${++this._idCounter}-${Date.now()}`;
    const checkpoint: ResetCheckpoint = {
      id,
      label,
      state: this._cloneState(state),
      capturedAt: Date.now(),
      fingerprint: this._computeFingerprint(state),
      depth: this._computeDepth(state),
    };
    this._checkpoints.set(id, checkpoint);
    this._activeState = this._cloneState(state);
    return checkpoint;
  }

  setState(state: Record<string, unknown>): void { this._activeState = this._cloneState(state); }

  registerMemoryKey(key: string, weight: number = 1): void {
    this._memoryKeys.add(key);
    this._memoryWeights[key] = Math.max(0, Math.min(1, weight));
  }

  unregisterMemoryKey(key: string): void { this._memoryKeys.delete(key); delete this._memoryWeights[key]; }

  signalOutOfTune(metric: string, deviation: number, severity: number): OutOfTuneSignal {
    if (deviation < 0) deviation = Math.abs(deviation);
    if (severity < 0 || severity > 1) throw new Error('Severity must be in [0,1]');
    const trend = this._computeTrend(this._signals.slice(-this._predictionWindow).map(s => s.deviation));
    const signal: OutOfTuneSignal = {
      id: `signal-${++this._idCounter}-${Date.now()}`,
      metric,
      deviation,
      detectedAt: Date.now(),
      severity,
      trend,
    };
    this._signals.push(signal);
    this._signalHistory.push(deviation);
    if (this._signalHistory.length > 100) this._signalHistory.shift();
    return signal;
  }

  shouldReset(signal: OutOfTuneSignal): boolean {
    return signal.deviation >= this._deviationThreshold || signal.severity >= this._severityThreshold ||
      (signal.trend > 0.1 && signal.deviation > this._deviationThreshold * 0.5);
  }

  predictResetProbability(): number {
    const recent = this._signalHistory.slice(-this._predictionWindow);
    if (recent.length < 3) return 0;
    const avg = recent.reduce((s, v) => s + v, 0) / recent.length;
    const variance = recent.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / recent.length;
    const trend = this._computeTrend(recent);
    return Math.min(1, avg / this._deviationThreshold) * 0.4 +
      Math.min(1, variance * 10) * 0.3 +
      Math.max(0, trend) * 0.3;
  }

  reset(signalId: string, checkpointId: string): DaCapoEvent {
    const signal = this._signals.find(s => s.id === signalId);
    const checkpoint = this._checkpoints.get(checkpointId);
    if (!signal || !checkpoint || !this.shouldReset(signal)) throw new Error('Invalid reset parameters');
    const stateDelta = this._computeStateDelta(this._activeState, checkpoint.state);
    const memoryPreserved = this._extractMemory(checkpoint.state);
    this._activeState = this._cloneState(checkpoint.state);
    for (const key of memoryPreserved) if (key in checkpoint.state) this._activeState[key] = checkpoint.state[key];
    const event: DaCapoEvent = {
      id: `dacapo-${++this._idCounter}-${Date.now()}`,
      triggerSignalId: signalId,
      restoredCheckpointId: checkpointId,
      memoryPreserved,
      resetAt: Date.now(),
      stateDelta,
      confidence: this._computeResetConfidence(signal, checkpoint),
    };
    this._events.push(event);
    return event;
  }

  setDeviationThreshold(t: number): void { if (t < 0) throw new Error('Threshold must be non-negative'); this._deviationThreshold = t; }
  setSeverityThreshold(t: number): void { if (t < 0 || t > 1) throw new Error('Threshold must be in [0,1]'); this._severityThreshold = t; }
  setPredictionWindow(w: number): void { if (w < 2) throw new Error('Window must be at least 2'); this._predictionWindow = w; }

  getCheckpoint(id: string): ResetCheckpoint | undefined { return this._checkpoints.get(id); }

  getClosestCheckpoint(state: Record<string, unknown>): ResetCheckpoint | null {
    const target = this._computeFingerprint(state);
    let closest: ResetCheckpoint | null = null;
    let minDist = Infinity;
    for (const cp of this._checkpoints.values()) {
      const dist = Math.abs(cp.fingerprint - target);
      if (dist < minDist) { minDist = dist; closest = cp; }
    }
    return closest;
  }

  get activeState(): Record<string, unknown> { return this._cloneState(this._activeState); }
  get checkpoints(): ResetCheckpoint[] { return Array.from(this._checkpoints.values()); }
  get signals(): OutOfTuneSignal[] { return [...this._signals]; }
  get events(): DaCapoEvent[] { return [...this._events]; }
  get deviationThreshold(): number { return this._deviationThreshold; }
  get severityThreshold(): number { return this._severityThreshold; }
  get memoryKeys(): string[] { return Array.from(this._memoryKeys); }
  get resetCount(): number { return this._events.length; }

  private _computeFingerprint(state: Record<string, unknown>): number {
    let hash = 0;
    for (const char of JSON.stringify(state)) {
      hash = ((hash << 5) - hash) + char.charCodeAt(0);
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  private _computeDepth(state: Record<string, unknown>): number {
    let depth = 0;
    const measure = (obj: Record<string, unknown>, current: number) => {
      depth = Math.max(depth, current);
      for (const value of Object.values(obj)) {
        if (typeof value === 'object' && value !== null) measure(value as Record<string, unknown>, current + 1);
      }
    };
    measure(state, 1);
    return depth;
  }

  private _computeStateDelta(a: Record<string, unknown>, b: Record<string, unknown>): number {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    let diff = 0;
    for (const key of keys) {
      const va = a[key], vb = b[key];
      if (typeof va === 'number' && typeof vb === 'number') diff += Math.abs(va - vb);
      else if (JSON.stringify(va) !== JSON.stringify(vb)) diff += 1;
    }
    return keys.size > 0 ? diff / keys.size : 0;
  }

  private _computeTrend(values: number[]): number {
    if (values.length < 2) return 0;
    const n = values.length;
    const sumX = values.reduce((s, _, i) => s + i, 0);
    const sumY = values.reduce((s, v) => s + v, 0);
    const sumXY = values.reduce((s, v, i) => s + i * v, 0);
    const sumX2 = values.reduce((s, _, i) => s + i * i, 0);
    return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  }

  private _extractMemory(cpState: Record<string, unknown>): string[] {
    const preserved: string[] = [];
    const weighted = Array.from(this._memoryKeys).map(k => ({ k, w: this._memoryWeights[k] || 0.5 }));
    weighted.sort((a, b) => b.w - a.w);
    for (const { k, w } of weighted) {
      if (k in this._activeState && Math.random() < w) preserved.push(k);
    }
    return preserved;
  }

  private _computeResetConfidence(signal: OutOfTuneSignal, cp: ResetCheckpoint): number {
    const age = Math.max(0, 1 - (Date.now() - cp.capturedAt) / 3600000);
    const dev = Math.min(1, signal.deviation / this._deviationThreshold);
    return age * 0.3 + dev * 0.4 + signal.severity * 0.3;
  }

  private _cloneState(state: Record<string, unknown>): Record<string, unknown> {
    return JSON.parse(JSON.stringify(state));
  }
}
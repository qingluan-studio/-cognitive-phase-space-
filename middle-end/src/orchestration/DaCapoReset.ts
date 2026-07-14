/** 从头再来重置器 - 当编排走调时从头重启，保留记忆 */

export interface ResetCheckpoint {
  id: string;
  label: string;
  state: Record<string, unknown>;
  capturedAt: number;
}

export interface OutOfTuneSignal {
  id: string;
  metric: string;
  deviation: number;
  detectedAt: number;
  severity: number;
}

export interface DaCapoEvent {
  id: string;
  triggerSignalId: string;
  restoredCheckpointId: string;
  memoryPreserved: string[];
  resetAt: number;
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

  captureCheckpoint(label: string, state: Record<string, unknown>): ResetCheckpoint {
    const id = `ckpt-${++this._idCounter}-${Date.now()}`;
    const checkpoint: ResetCheckpoint = {
      id,
      label,
      state: this._cloneState(state),
      capturedAt: Date.now(),
    };
    this._checkpoints.set(id, checkpoint);
    this._activeState = this._cloneState(state);
    return checkpoint;
  }

  setState(state: Record<string, unknown>): void {
    this._activeState = this._cloneState(state);
  }

  registerMemoryKey(key: string): void {
    this._memoryKeys.add(key);
  }

  unregisterMemoryKey(key: string): void {
    this._memoryKeys.delete(key);
  }

  signalOutOfTune(metric: string, deviation: number, severity: number): OutOfTuneSignal {
    if (deviation < 0) deviation = Math.abs(deviation);
    if (severity < 0 || severity > 1) throw new Error('Severity must be in [0,1]');
    const signal: OutOfTuneSignal = {
      id: `signal-${++this._idCounter}-${Date.now()}`,
      metric,
      deviation,
      detectedAt: Date.now(),
      severity,
    };
    this._signals.push(signal);
    return signal;
  }

  shouldReset(signal: OutOfTuneSignal): boolean {
    return (
      signal.deviation >= this._deviationThreshold ||
      signal.severity >= this._severityThreshold
    );
  }

  reset(signalId: string, checkpointId: string): DaCapoEvent {
    const signal = this._signals.find(s => s.id === signalId);
    const checkpoint = this._checkpoints.get(checkpointId);
    if (!signal) throw new Error(`Signal not found: ${signalId}`);
    if (!checkpoint) throw new Error(`Checkpoint not found: ${checkpointId}`);
    if (!this.shouldReset(signal)) {
      throw new Error('Signal does not warrant a reset');
    }
    const memoryPreserved = this._extractMemory();
    this._activeState = this._cloneState(checkpoint.state);
    for (const key of memoryPreserved) {
      // re-apply preserved memory into restored state
      this._activeState[key] = checkpoint.state[key];
    }
    const event: DaCapoEvent = {
      id: `dacapo-${++this._idCounter}-${Date.now()}`,
      triggerSignalId: signalId,
      restoredCheckpointId: checkpointId,
      memoryPreserved,
      resetAt: Date.now(),
    };
    this._events.push(event);
    return event;
  }

  setDeviationThreshold(t: number): void {
    if (t < 0) throw new Error('Threshold must be non-negative');
    this._deviationThreshold = t;
  }

  setSeverityThreshold(t: number): void {
    if (t < 0 || t > 1) throw new Error('Threshold must be in [0,1]');
    this._severityThreshold = t;
  }

  getCheckpoint(id: string): ResetCheckpoint | undefined {
    return this._checkpoints.get(id);
  }

  get activeState(): Record<string, unknown> {
    return this._cloneState(this._activeState);
  }

  get checkpoints(): ResetCheckpoint[] {
    return Array.from(this._checkpoints.values());
  }

  get signals(): OutOfTuneSignal[] {
    return [...this._signals];
  }

  get events(): DaCapoEvent[] {
    return [...this._events];
  }

  get deviationThreshold(): number {
    return this._deviationThreshold;
  }

  get severityThreshold(): number {
    return this._severityThreshold;
  }

  get memoryKeys(): string[] {
    return Array.from(this._memoryKeys);
  }

  get resetCount(): number {
    return this._events.length;
  }

  private _extractMemory(): string[] {
    const preserved: string[] = [];
    for (const key of this._memoryKeys) {
      if (key in this._activeState) preserved.push(key);
    }
    return preserved;
  }

  private _cloneState(state: Record<string, unknown>): Record<string, unknown> {
    return JSON.parse(JSON.stringify(state));
  }
}

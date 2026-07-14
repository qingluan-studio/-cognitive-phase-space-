/**
 * 纯粹存在：不执行任何功能，仅维持存在本身。
 * 该模块的存在即其目的，所有方法都围绕"维持在场"展开，不产生副作用或输出。
 */

export interface PresenceState {
  isPresent: boolean;
  startedAt: number;
  heartbeats: number;
  stillnessLevel: number;
}

export interface PresenceSnapshot {
  capturedAt: number;
  present: boolean;
  duration: number;
}

export class PurePresence {
  private _state: PresenceState = {
    isPresent: false,
    startedAt: 0,
    heartbeats: 0,
    stillnessLevel: 1,
  };
  private _snapshots: PresenceSnapshot[] = [];
  private _heartbeatIntervalMs = 1000;
  private _timer: ReturnType<typeof setInterval> | null = null;

  begin(): void {
    if (this._state.isPresent) return;
    this._state.isPresent = true;
    this._state.startedAt = Date.now();
    this._state.heartbeats = 0;
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
      if (this._state.isPresent) {
        this._state.heartbeats++;
      }
    }, this._heartbeatIntervalMs);
  }

  captureSnapshot(): PresenceSnapshot {
    const snapshot: PresenceSnapshot = {
      capturedAt: Date.now(),
      present: this._state.isPresent,
      duration: this._state.isPresent ? Date.now() - this._state.startedAt : 0,
    };
    this._snapshots.push(snapshot);
    if (this._snapshots.length > 100) this._snapshots.shift();
    return snapshot;
  }

  deepenStillness(amount: number = 0.1): number {
    this._state.stillnessLevel = Math.min(1, this._state.stillnessLevel + amount);
    return this._state.stillnessLevel;
  }

  reduceStillness(amount: number = 0.1): number {
    this._state.stillnessLevel = Math.max(0, this._state.stillnessLevel - amount);
    return this._state.stillnessLevel;
  }

  getState(): Readonly<PresenceState> {
    return { ...this._state };
  }

  getSnapshots(): PresenceSnapshot[] {
    return [...this._snapshots];
  }

  get isPresent(): boolean {
    return this._state.isPresent;
  }

  get duration(): number {
    return this._state.isPresent ? Date.now() - this._state.startedAt : 0;
  }
}

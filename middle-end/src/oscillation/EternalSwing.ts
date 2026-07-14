/**
 * 永恒摆动：在两种状态间永久来回。
 * 维护一个永不收敛的双态摆动系统，摆动周期与振幅可调，永不停止。
 */

export interface SwingState {
  label: 'A' | 'B';
  value: number;
  enteredAt: number;
}

export interface SwingRecord {
  cycles: number;
  lastTransition: number;
  amplitude: number;
  period: number;
}

export class EternalSwing {
  private _current: SwingState;
  private _records: SwingRecord[] = [];
  private _amplitude: number;
  private _period: number;
  private _cycleCount = 0;
  private _damping = 0;

  constructor(amplitude: number = 1.0, period: number = 1000) {
    this._amplitude = amplitude;
    this._period = period;
    this._current = { label: 'A', value: amplitude, enteredAt: Date.now() };
  }

  tick(now: number = Date.now()): SwingState {
    const elapsed = now - this._current.enteredAt;
    if (elapsed >= this._period) {
      const nextLabel = this._current.label === 'A' ? 'B' : 'A';
      const nextValue = nextLabel === 'A' ? this._amplitude : -this._amplitude;
      this._current = { label: nextLabel, value: nextValue * (1 - this._damping), enteredAt: now };
      this._cycleCount++;
      this._records.push({
        cycles: this._cycleCount,
        lastTransition: now,
        amplitude: this._amplitude,
        period: this._period,
      });
      if (this._records.length > 200) this._records.shift();
    }
    return this._current;
  }

  setAmplitude(value: number): void {
    this._amplitude = Math.max(0, value);
  }

  setPeriod(ms: number): void {
    this._period = Math.max(50, ms);
  }

  applyDamping(factor: number): void {
    this._damping = Math.max(0, Math.min(1, factor));
  }

  forceFlip(): SwingState {
    const nextLabel = this._current.label === 'A' ? 'B' : 'A';
    this._current = {
      label: nextLabel,
      value: nextLabel === 'A' ? this._amplitude : -this._amplitude,
      enteredAt: Date.now(),
    };
    return this._current;
  }

  getCurrent(): SwingState {
    return { ...this._current };
  }

  getRecords(limit: number = 50): SwingRecord[] {
    return this._records.slice(-limit);
  }

  get cycleCount(): number {
    return this._cycleCount;
  }
}

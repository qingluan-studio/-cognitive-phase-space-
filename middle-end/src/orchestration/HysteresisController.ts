export type HysteresisThresholds = { upper: number; lower: number; deadband: number };
export type ControlState = 'below' | 'inside' | 'above';
export type TransitionEvent = { timestamp: number; from: ControlState; to: ControlState; value: number };

export class HysteresisController {
  private _thresholds: HysteresisThresholds = { upper: 80, lower: 20, deadband: 5 };
  private _state: ControlState = 'inside';
  private _transitions: TransitionEvent[] = [];
  private _lastTrans = 0;
  private _cooldown = 1000;
  private _adaptive = true;
  private _sensitivity = 0.8;
  private _history: { value: number; timestamp: number }[] = [];

  get currentState(): ControlState { return this._state; }
  get thresholds(): HysteresisThresholds { return { ...this._thresholds }; }
  get bandwidth(): number { return this._thresholds.upper - this._thresholds.lower; }
  get transitionCount(): number { return this._transitions.length; }

  setThresholds(thresholds: Partial<HysteresisThresholds>): void { this._thresholds = { ...this._thresholds, ...thresholds }; }
  setCooldown(ms: number): void { this._cooldown = Math.max(100, ms); }
  setAdaptive(enabled: boolean): void { this._adaptive = enabled; }
  setSensitivity(value: number): void { this._sensitivity = Math.max(0.1, Math.min(1, value)); }

  evaluate(value: number): ControlState {
    const now = Date.now();
    this._history.push({ value, timestamp: now });
    if (this._history.length > 50) this._history.shift();

    if (now - this._lastTrans < this._cooldown) return this._state;
    if (this._adaptive) this._adapt();

    const { upper, lower, deadband } = this._thresholds;
    let newState = this._state;

    if (this._state !== 'above' && value >= upper + deadband) newState = 'above';
    else if (this._state !== 'below' && value <= lower - deadband) newState = 'below';
    else if (value > lower && value < upper) newState = 'inside';

    if (newState !== this._state) {
      this._transitions.push({ timestamp: now, from: this._state, to: newState, value });
      this._state = newState;
      this._lastTrans = now;
    }

    return this._state;
  }

  private _adapt(): void {
    if (this._transitions.length < 3) return;
    const recent = this._transitions.slice(-5);
    const avgInterval = recent.reduce((acc, t, i, arr) => i > 0 ? acc + (t.timestamp - arr[i-1].timestamp) : acc, 0) / (recent.length - 1);
    const rate = 1000 / avgInterval;
    const adj = (0.5 - rate) * this._sensitivity * 2;
    const newBand = Math.max(10, Math.min(100, this.bandwidth + adj));
    const center = (this._thresholds.upper + this._thresholds.lower) / 2;
    this._thresholds.lower = center - newBand / 2;
    this._thresholds.upper = center + newBand / 2;
  }

  private _derivative(): number {
    if (this._history.length < 3) return 0;
    const [a, b, c] = this._history.slice(-3);
    return ((c.value - b.value) / (c.timestamp - b.timestamp) + (b.value - a.value) / (b.timestamp - a.timestamp)) / 2;
  }

  getState(): ControlState { return this._state; }
  getTransitionHistory(): TransitionEvent[] { return [...this._transitions]; }

  isStable(): boolean {
    if (this._transitions.length < 2) return true;
    const recent = this._transitions.slice(-5);
    const avgInterval = recent.reduce((acc, t, i, arr) => i > 0 ? acc + (t.timestamp - arr[i-1].timestamp) : acc, 0) / (recent.length - 1);
    return avgInterval > this._cooldown * 3 && 1000 / avgInterval < 1;
  }

  calculateBandwidth(): number { return this.bandwidth; }

  predictNextState(value: number): ControlState {
    const predicted = value + this._derivative() * 500;
    const { upper, lower, deadband } = this._thresholds;
    if (predicted >= upper + deadband) return 'above';
    if (predicted <= lower - deadband) return 'below';
    return 'inside';
  }

  clearHistory(): void { this._transitions = []; this._history = []; }
  reset(): void { this._state = 'inside'; this._transitions = []; this._history = []; this._lastTrans = 0; }
  getStateDuration(): number { return Date.now() - (this._transitions[this._transitions.length - 1]?.timestamp ?? 0); }

  calculateStateDistribution(): { below: number; inside: number; above: number } {
    if (!this._transitions.length) return { below: 0, inside: 100, above: 0 };
    const total = Date.now() - this._transitions[0].timestamp;
    let [below, inside, above] = [0, 0, 0];
    this._transitions.forEach((t, i, arr) => {
      const dur = (arr[i+1]?.timestamp ?? Date.now()) - t.timestamp;
      if (t.to === 'below') below += dur; else if (t.to === 'inside') inside += dur; else above += dur;
    });
    return { below: (below / total) * 100, inside: (inside / total) * 100, above: (above / total) * 100 };
  }
}
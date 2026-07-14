export interface RepetitionState {
  value: number;
  iteration: number;
  period: number;
  lyapunov: number;
  bifurcation: number;
}

export class RepetitionChange {
  private _states: RepetitionState[] = [];
  private _current: RepetitionState = { value: 0.5, iteration: 0, period: 1, lyapunov: 0, bifurcation: 0 };
  private _history: number[] = [];
  private _state: Record<string, unknown> = {};
  private _r: number = 3.5;
  private _maxIterations: number = 1000;

  constructor(initialR: number = 3.5) {
    this._r = initialR;
  }

  get currentValue(): number {
    return this._current.value;
  }

  get iteration(): number {
    return this._current.iteration;
  }

  get lyapunov(): number {
    return this._current.lyapunov;
  }

  iterate(steps: number): RepetitionState[] {
    const result: RepetitionState[] = [];
    for (let i = 0; i < steps; i++) {
      const nextValue = this._r * this._current.value * (1 - this._current.value);
      this._current.iteration++;
      this._current.value = nextValue;
      this._history.push(nextValue);
      if (this._history.length > this._maxIterations) {
        this._history.shift();
      }
      const period = this._detectPeriod();
      const lyapunov = this._computeLyapunov();
      const bifurcation = this._detectBifurcation();
      this._current.period = period;
      this._current.lyapunov = lyapunov;
      this._current.bifurcation = bifurcation;
      result.push({ ...this._current });
    }
    return result;
  }

  private _detectPeriod(): number {
    const h = this._history;
    if (h.length < 10) return 1;
    for (let p = 1; p <= 20; p++) {
      let match = true;
      for (let i = h.length - 1; i >= h.length - 10 && i - p >= 0; i--) {
        if (Math.abs(h[i] - h[i - p]) > 1e-6) {
          match = false;
          break;
        }
      }
      if (match) return p;
    }
    return 1;
  }

  private _computeLyapunov(): number {
    if (this._history.length < 2) return 0;
    let sum = 0;
    for (let i = 1; i < this._history.length; i++) {
      const x = this._history[i - 1];
      const derivative = Math.abs(this._r * (1 - 2 * x));
      if (derivative > 0) sum += Math.log2(derivative);
    }
    return sum / (this._history.length - 1);
  }

  private _detectBifurcation(): number {
    if (this._history.length < 20) return 0;
    const recent = this._history.slice(-20);
    const unique = new Set(recent.map((v) => Math.round(v * 1000) / 1000));
    return unique.size;
  }

  setR(r: number): void {
    this._r = Math.max(0, Math.min(4, r));
    this._state.rUpdated = r;
  }

  reset(value: number = 0.5): void {
    this._current = { value, iteration: 0, period: 1, lyapunov: 0, bifurcation: 0 };
    this._history = [];
  }

  bifurcationDiagram(rStart: number, rEnd: number, steps: number, settle: number = 500, collect: number = 100): { r: number; values: number[] }[] {
    const result: { r: number; values: number[] }[] = [];
    for (let i = 0; i < steps; i++) {
      const r = rStart + ((rEnd - rStart) * i) / (steps - 1);
      let x = 0.5;
      for (let j = 0; j < settle; j++) {
        x = r * x * (1 - x);
      }
      const values: number[] = [];
      for (let j = 0; j < collect; j++) {
        x = r * x * (1 - x);
        values.push(x);
      }
      result.push({ r, values });
    }
    return result;
  }

  isChaotic(): boolean {
    return this._current.lyapunov > 0;
  }

  report(): Record<string, unknown> {
    return {
      currentValue: this._current.value,
      iteration: this._current.iteration,
      period: this._current.period,
      lyapunov: this._current.lyapunov,
      bifurcation: this._current.bifurcation,
      r: this._r,
      state: this._state,
    };
  }
}

export interface StateMonadData {
  state: number;
  value: number;
  transitions: number;
  pure: boolean;
  stateful: boolean;
}

export class StateMonad {
  private _state: number;
  private _value: number;
  private _transitions: number;
  private _pure: boolean;
  private _stateful: boolean;
  private _stateHistory: number[];
  private _runState: number;
  private _computations: number;

  constructor(initialState: number = 0) {
    this._state = initialState;
    this._value = 0;
    this._transitions = 0;
    this._pure = false;
    this._stateful = true;
    this._stateHistory = [initialState];
    this._runState = initialState;
    this._computations = 0;
  }

  get state(): number {
    return this._state;
  }

  get value(): number {
    return this._value;
  }

  get transitions(): number {
    return this._transitions;
  }

  get stateful(): boolean {
    return this._stateful;
  }

  public getState(): number {
    return this._state;
  }

  public setState(newState: number): void {
    this._state = newState;
    this._transitions++;
    this._stateHistory.push(newState);
    if (this._stateHistory.length > 100) this._stateHistory.shift();
  }

  public modify(f: (s: number) => number): void {
    this.setState(f(this._state));
  }

  public pure(value: number): number {
    this._value = value;
    this._pure = true;
    return value;
  }

  public bind(value: number, f: (x: number, s: number) => { value: number; state: number }): number {
    const result = f(value, this._state);
    this._value = result.value;
    this.setState(result.state);
    this._computations++;
    return result.value;
  }

  public map(f: (x: number) => number): number {
    this._value = f(this._value);
    return this._value;
  }

  public run(initialState: number): { value: number; state: number } {
    this._runState = initialState;
    this._state = initialState;
    return { value: this._value, state: this._state };
  }

  public evalState(initialState: number): number {
    this._state = initialState;
    return this._value;
  }

  public execState(initialState: number): number {
    this._state = initialState;
    return this._state;
  }

  public report(): StateMonadData {
    return {
      state: this._state,
      value: this._value,
      transitions: this._transitions,
      pure: this._pure,
      stateful: this._stateful,
    };
  }

  public getStateHistory(): number[] {
    return [...this._stateHistory];
  }

  public getComputationCount(): number {
    return this._computations;
  }

  public flatMap(f: (x: number) => number): number {
    return f(this._value);
  }

  public sequence(computations: ((s: number) => { value: number; state: number })[]): number[] {
    const results: number[] = [];
    let s = this._state;
    for (const comp of computations) {
      const r = comp(s);
      results.push(r.value);
      s = r.state;
    }
    this._state = s;
    return results;
  }

  public reset(): void {
    this._transitions = 0;
    this._computations = 0;
    this._stateHistory = [this._state];
  }
}

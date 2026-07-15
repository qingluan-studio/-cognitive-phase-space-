export interface TemporalLogicData {
  timePoints: number;
  past: number;
  future: number;
  always: number;
  eventually: number;
}

export class TemporalLogic {
  private _timePoints: number;
  private _past: number;
  private _future: number;
  private _always: number;
  private _eventually: number;
  private _propositions: Map<string, boolean[]>;
  private _currentTime: number;
  private _linear: boolean;
  private _branching: boolean;

  constructor(timePoints: number = 10) {
    this._timePoints = timePoints;
    this._past = 0;
    this._future = 0;
    this._always = 0;
    this._eventually = 0;
    this._propositions = new Map();
    this._currentTime = 0;
    this._linear = true;
    this._branching = false;
  }

  get timePoints(): number {
    return this._timePoints;
  }

  get currentTime(): number {
    return this._currentTime;
  }

  get always(): number {
    return this._always;
  }

  get eventually(): number {
    return this._eventually;
  }

  public setCurrentTime(time: number): void {
    if (time >= 0 && time < this._timePoints) {
      this._currentTime = time;
    }
  }

  public addProposition(name: string, truthValues: boolean[]): void {
    this._propositions.set(name, [...truthValues]);
  }

  public isTrueAt(time: number, proposition: string): boolean {
    const values = this._propositions.get(proposition);
    if (!values) return false;
    if (time < 0 || time >= this._timePoints) return false;
    return values[time];
  }

  public globally(proposition: string): boolean {
    const values = this._propositions.get(proposition);
    if (!values) return false;
    for (let t = this._currentTime; t < this._timePoints; t++) {
      if (!values[t]) return false;
    }
    this._always++;
    return true;
  }

  public finally(proposition: string): boolean {
    const values = this._propositions.get(proposition);
    if (!values) return false;
    for (let t = this._currentTime; t < this._timePoints; t++) {
      if (values[t]) {
        this._eventually++;
        return true;
      }
    }
    return false;
  }

  public next(proposition: string): boolean {
    const nextTime = this._currentTime + 1;
    if (nextTime >= this._timePoints) return false;
    return this.isTrueAt(nextTime, proposition);
  }

  public until(antecedent: string, consequent: string): boolean {
    const antVals = this._propositions.get(antecedent);
    const consVals = this._propositions.get(consequent);
    if (!antVals || !consVals) return false;
    for (let t = this._currentTime; t < this._timePoints; t++) {
      if (consVals[t]) return true;
      if (!antVals[t]) return false;
    }
    return false;
  }

  public historically(proposition: string): boolean {
    const values = this._propositions.get(proposition);
    if (!values) return false;
    for (let t = 0; t <= this._currentTime; t++) {
      if (!values[t]) return false;
    }
    this._past++;
    return true;
  }

  public once(proposition: string): boolean {
    const values = this._propositions.get(proposition);
    if (!values) return false;
    for (let t = 0; t <= this._currentTime; t++) {
      if (values[t]) {
        this._past++;
        return true;
      }
    }
    return false;
  }

  public previous(proposition: string): boolean {
    const prevTime = this._currentTime - 1;
    if (prevTime < 0) return false;
    return this.isTrueAt(prevTime, proposition);
  }

  public isLinear(): boolean {
    return this._linear;
  }

  public isBranching(): boolean {
    return this._branching;
  }

  public report(): TemporalLogicData {
    return {
      timePoints: this._timePoints,
      past: this._past,
      future: this._future,
      always: this._always,
      eventually: this._eventually,
    };
  }

  public getPropositions(): string[] {
    return [...this._propositions.keys()];
  }

  public addTimePoint(): number {
    this._timePoints++;
    return this._timePoints - 1;
  }

  public advanceTime(): void {
    if (this._currentTime < this._timePoints - 1) {
      this._currentTime++;
    }
  }

  public reset(): void {
    this._past = 0;
    this._future = 0;
    this._always = 0;
    this._eventually = 0;
    this._currentTime = 0;
  }
}

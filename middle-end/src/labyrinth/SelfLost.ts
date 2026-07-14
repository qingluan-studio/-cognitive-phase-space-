export interface SelfLostData {
  name: string;
  coordinates: { x: number; y: number };
  hope: number;
  lostness: number;
}

export class SelfLost {
  private _name: string;
  private _x: number;
  private _y: number;
  private _hope: number;
  private _lostness: number;
  private _stepCount: number;
  private _autocorrelation: number[];
  private _randomWalkSeed: number;

  constructor(name: string, startX: number = 0, startY: number = 0) {
    this._name = name;
    this._x = startX;
    this._y = startY;
    this._hope = 0.5;
    this._lostness = 0;
    this._stepCount = 0;
    this._autocorrelation = [];
    this._randomWalkSeed = name.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
  }

  get name(): string {
    return this._name;
  }

  get hope(): number {
    return this._hope;
  }

  get lostness(): number {
    return this._lostness;
  }

  get stepCount(): number {
    return this._stepCount;
  }

  public wander(steps: number): void {
    for (let i = 0; i < steps; i++) {
      const dx = Math.round((this._rand() - 0.5) * 2);
      const dy = Math.round((this._rand() - 0.5) * 2);
      this._x += dx;
      this._y += dy;
      this._stepCount++;
      this._lostness = Math.min(1, this._lostness + 0.01 * Math.sqrt(dx * dx + dy * dy));
      this._autocorrelation.push(this._x * this._x + this._y * this._y);
      if (this._autocorrelation.length > 100) this._autocorrelation.shift();
    }
    this._hope = Math.max(0, this._hope - this._lostness * 0.1);
  }

  public rest(): void {
    this._hope = Math.min(1, this._hope + 0.05);
    this._lostness = Math.max(0, this._lostness - 0.02);
  }

  public shout(): void {
    this._hope = Math.max(0, this._hope - 0.05);
    this._lostness = Math.min(1, this._lostness + 0.1);
  }

  public findSignal(): void {
    this._hope = Math.min(1, this._hope + 0.2);
    this._lostness = Math.max(0, this._lostness - 0.15);
  }

  public report(): SelfLostData {
    return {
      name: this._name,
      coordinates: { x: this._x, y: this._y },
      hope: this._hope,
      lostness: this._lostness,
    };
  }

  public computeMeanSquaredDisplacement(): number {
    if (this._stepCount === 0) return 0;
    return (this._x * this._x + this._y * this._y) / this._stepCount;
  }

  public computeAutocorrelation(lag: number): number {
    if (this._autocorrelation.length <= lag) return 0;
    const mean = this._autocorrelation.reduce((a, b) => a + b, 0) / this._autocorrelation.length;
    let num = 0;
    let den = 0;
    for (let i = 0; i < this._autocorrelation.length - lag; i++) {
      num += (this._autocorrelation[i] - mean) * (this._autocorrelation[i + lag] - mean);
    }
    for (let i = 0; i < this._autocorrelation.length; i++) {
      den += (this._autocorrelation[i] - mean) ** 2;
    }
    return den > 0 ? num / den : 0;
  }

  public estimateFractalDimension(): number {
    const r = Math.sqrt(Math.abs(this._x) + Math.abs(this._y) + 1);
    return this._stepCount > 0 ? Math.log(this._stepCount) / Math.log(r + 1) : 0;
  }

  public computeReturnProbability(): number {
    if (this._stepCount === 0) return 1;
    const msd = this.computeMeanSquaredDisplacement();
    return msd === 0 ? 1 : Math.exp(-1 / (2 * msd));
  }

  private _rand(): number {
    this._randomWalkSeed = (this._randomWalkSeed * 16807 + 0) % 2147483647;
    return this._randomWalkSeed / 2147483647;
  }
}

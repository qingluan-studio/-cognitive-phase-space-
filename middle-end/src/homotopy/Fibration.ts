export interface FibrationData {
  totalSpace: number;
  baseSpace: number;
  fiber: number;
  homotopyFiber: number;
  serreSpectralSequence: boolean;
}

export class Fibration {
  private _totalSpace: number;
  private _baseSpace: number;
  private _fiber: number;
  private _homotopyFiber: number;
  private _serreSpectralSequence: boolean;
  private _projection: number;
  private _homotopyLifting: boolean;
  private _longExactSequence: number[];

  constructor(total: number = 10, base: number = 5) {
    this._totalSpace = total;
    this._baseSpace = base;
    this._fiber = total - base;
    this._homotopyFiber = this._fiber;
    this._serreSpectralSequence = true;
    this._projection = base / total;
    this._homotopyLifting = true;
    this._longExactSequence = [];
    this._computeLES();
  }

  get totalSpace(): number {
    return this._totalSpace;
  }

  get baseSpace(): number {
    return this._baseSpace;
  }

  get fiber(): number {
    return this._fiber;
  }

  get homotopyFiber(): number {
    return this._homotopyFiber;
  }

  private _computeLES(): void {
    this._longExactSequence = [];
    for (let n = 0; n < 5; n++) {
      this._longExactSequence.push(this._fiber + n);
      this._longExactSequence.push(this._totalSpace + n);
      this._longExactSequence.push(this._baseSpace + n);
    }
  }

  public project(point: number): number {
    return Math.floor(point * this._projection);
  }

  public lift(basePoint: number): number {
    return Math.floor(basePoint / this._projection);
  }

  public homotopyLift(homotopy: number[]): number[] {
    return homotopy.map(h => this.lift(h));
  }

  public computeHomotopyGroup(n: number, space: 'fiber' | 'total' | 'base'): number {
    switch (space) {
      case 'fiber': return this._fiber + n;
      case 'total': return this._totalSpace + n;
      case 'base': return this._baseSpace + n;
    }
  }

  public checkExactness(): boolean {
    return this._homotopyLifting;
  }

  public isFibration(): boolean {
    return this._homotopyLifting;
  }

  public report(): FibrationData {
    return {
      totalSpace: this._totalSpace,
      baseSpace: this._baseSpace,
      fiber: this._fiber,
      homotopyFiber: this._homotopyFiber,
      serreSpectralSequence: this._serreSpectralSequence,
    };
  }

  public computeE2Page(p: number, q: number): number {
    return this.computeHomotopyGroup(q, 'fiber') * this.computeHomotopyGroup(p, 'base');
  }

  public setFiberDimension(dim: number): void {
    this._fiber = dim;
    this._totalSpace = this._baseSpace + this._fiber;
    this._computeLES();
  }

  public setBaseDimension(dim: number): void {
    this._baseSpace = dim;
    this._totalSpace = this._baseSpace + this._fiber;
    this._computeLES();
  }

  public getLongExactSequence(): number[] {
    return [...this._longExactSequence];
  }

  public reset(): void {
    this._longExactSequence = [];
  }
}

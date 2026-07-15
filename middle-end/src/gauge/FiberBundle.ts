export interface FiberBundleData {
  baseSpace: number;
  fiber: number;
  totalSpace: number;
  connection: number;
  curvature: number;
}

export class FiberBundle {
  private _baseSpace: number;
  private _fiber: number;
  private _totalSpace: number;
  private _connection: number;
  private _curvature: number;
  private _sections: number[];
  private _transitionFunctions: number[];
  private _trivial: boolean;

  constructor(baseDimension: number = 2, fiberDimension: number = 1) {
    this._baseSpace = baseDimension;
    this._fiber = fiberDimension;
    this._totalSpace = baseDimension + fiberDimension;
    this._connection = 0;
    this._curvature = 0;
    this._sections = [];
    this._transitionFunctions = [1, 1];
    this._trivial = true;
  }

  get baseSpace(): number {
    return this._baseSpace;
  }

  get fiber(): number {
    return this._fiber;
  }

  get totalSpace(): number {
    return this._totalSpace;
  }

  get curvature(): number {
    return this._curvature;
  }

  public setConnection(value: number): void {
    this._connection = value;
    this._computeCurvature();
  }

  private _computeCurvature(): void {
    this._curvature = this._connection * this._connection;
  }

  public addSection(value: number): void {
    this._sections.push(value);
    if (this._sections.length > 100) this._sections.shift();
  }

  public parallelTransport(section: number, path: number): number {
    const phase = this._connection * path;
    return section * Math.cos(phase);
  }

  public computeHolonomy(loop: number): number {
    const phase = this._connection * loop;
    return Math.exp(phase);
  }

  public checkTriviality(): boolean {
    if (this._transitionFunctions.length < 2) return true;
    const product = this._transitionFunctions.reduce((a, b) => a * b, 1);
    this._trivial = Math.abs(product - 1) < 0.001;
    return this._trivial;
  }

  public pullback(baseFunction: number): number {
    return baseFunction * this._fiber;
  }

  public report(): FiberBundleData {
    return {
      baseSpace: this._baseSpace,
      fiber: this._fiber,
      totalSpace: this._totalSpace,
      connection: this._connection,
      curvature: this._curvature,
    };
  }

  public setTransitionFunctions(fns: number[]): void {
    this._transitionFunctions = fns;
    this.checkTriviality();
  }

  public computeChernClass(): number {
    return this._curvature / (2 * Math.PI);
  }

  public isTrivial(): boolean {
    return this._trivial;
  }

  public liftToTotalSpace(basePoint: number, fiberPoint: number): number {
    return basePoint * this._fiber + fiberPoint;
  }

  public projectToBase(totalPoint: number): number {
    return Math.floor(totalPoint / this._fiber);
  }

  public reset(): void {
    this._connection = 0;
    this._curvature = 0;
    this._sections = [];
    this._trivial = true;
  }
}

export interface LoopSpaceData {
  basepoint: number;
  loops: number;
  concatenation: boolean;
  homotopyEquivalence: boolean;
  pathComponents: number;
}

export class LoopSpace {
  private _basepoint: number;
  private _loops: number;
  private _concatenation: boolean;
  private _homotopyEquivalence: boolean;
  private _pathComponents: number;
  private _loopPaths: number[][];
  private _compositionTable: number[][];
  private _inverses: number[];

  constructor(basepoint: number = 0) {
    this._basepoint = basepoint;
    this._loops = 0;
    this._concatenation = true;
    this._homotopyEquivalence = true;
    this._pathComponents = 1;
    this._loopPaths = [];
    this._compositionTable = [];
    this._inverses = [];
  }

  get basepoint(): number {
    return this._basepoint;
  }

  get loops(): number {
    return this._loops;
  }

  get pathComponents(): number {
    return this._pathComponents;
  }

  get homotopyEquivalence(): boolean {
    return this._homotopyEquivalence;
  }

  public addLoop(path: number[]): number {
    this._loopPaths.push([...path]);
    this._loops++;
    this._updatePathComponents();
    return this._loops - 1;
  }

  private _updatePathComponents(): void {
    this._pathComponents = Math.max(1, Math.floor(this._loops / 2));
  }

  public concatenate(indexA: number, indexB: number): number {
    if (indexA < 0 || indexA >= this._loops) return -1;
    if (indexB < 0 || indexB >= this._loops) return -1;
    const composed = [...this._loopPaths[indexA], ...this._loopPaths[indexB]];
    return this.addLoop(composed);
  }

  public inverse(index: number): number {
    if (index < 0 || index >= this._loops) return -1;
    const inv = [...this._loopPaths[index]].reverse();
    return this.addLoop(inv);
  }

  public isHomotopic(indexA: number, indexB: number): boolean {
    if (indexA < 0 || indexA >= this._loops) return false;
    if (indexB < 0 || indexB >= this._loops) return false;
    const pathA = this._loopPaths[indexA];
    const pathB = this._loopPaths[indexB];
    return pathA.length === pathB.length;
  }

  public computeOmegaSpectrum(level: number): number {
    return Math.max(0, this._loops - level);
  }

  public setBasepoint(point: number): void {
    this._basepoint = point;
  }

  public report(): LoopSpaceData {
    return {
      basepoint: this._basepoint,
      loops: this._loops,
      concatenation: this._concatenation,
      homotopyEquivalence: this._homotopyEquivalence,
      pathComponents: this._pathComponents,
    };
  }

  public getLoop(index: number): number[] {
    if (index < 0 || index >= this._loops) return [];
    return [...this._loopPaths[index]];
  }

  public computeHomotopyGroup(n: number): number {
    if (n === 0) return this._pathComponents;
    if (n === 1) return this._loops;
    return Math.floor(this._loops / (n + 1));
  }

  public isSimplyConnected(): boolean {
    return this._pathComponents === 1 && this._loops === 0;
  }

  public reset(): void {
    this._loops = 0;
    this._loopPaths = [];
    this._pathComponents = 1;
  }
}

/**
 * 基线猎手模块：自动寻找递归的基线条件。
 * 通过递归调用并探测终止条件，反推出能让递归收敛的最小基线集合。
 */

export interface BaseCaseHunterData {
  baseCases: number[];
  probed: number;
  converged: boolean;
}

export class BaseCaseHunter {
  private _baseCases: Set<number>;
  private _probed: number;
  private _converged: boolean;
  private _maxProbe: number;

  constructor(maxProbe: number = 100) {
    this._baseCases = new Set<number>();
    this._probed = 0;
    this._converged = false;
    this._maxProbe = maxProbe;
  }

  get baseCases(): number[] {
    return Array.from(this._baseCases).sort((a, b) => a - b);
  }

  get probedCount(): number {
    return this._probed;
  }

  public hunt(n: number): number {
    this._probed += 1;
    if (this._probed > this._maxProbe) {
      this._converged = false;
      return n;
    }
    if (n <= 1) {
      this._baseCases.add(n);
      this._converged = true;
      return n;
    }
    const sub = this.hunt(Math.floor(n / 2));
    this._baseCases.add(sub);
    return sub;
  }

  public isBaseCase(n: number): boolean {
    return this._baseCases.has(n);
  }

  public addBaseCase(n: number): void {
    this._baseCases.add(n);
  }

  public reset(): void {
    this._baseCases.clear();
    this._probed = 0;
    this._converged = false;
  }

  public setMaxProbe(m: number): void {
    this._maxProbe = Math.max(1, m);
  }

  public report(): BaseCaseHunterData {
    return {
      baseCases: this.baseCases,
      probed: this._probed,
      converged: this._converged,
    };
  }
}

export interface AdaptiveLogicData {
  upperLimit: number;
  lowerLimit: number;
  abnormalities: number;
  adaptive: boolean;
  dynamic: boolean;
}

export class AdaptiveLogic {
  private _upperLimit: number;
  private _lowerLimit: number;
  private _abnormalities: number;
  private _adaptive: boolean;
  private _dynamic: boolean;
  private _derivedFormulas: string[];
  private _conditionSets: string[][];
  private _marking: boolean[];
  private _reliability: number;

  constructor() {
    this._upperLimit = 100;
    this._lowerLimit = 50;
    this._abnormalities = 0;
    this._adaptive = true;
    this._dynamic = true;
    this._derivedFormulas = [];
    this._conditionSets = [];
    this._marking = [];
    this._reliability = 0.8;
  }

  get upperLimit(): number {
    return this._upperLimit;
  }

  get lowerLimit(): number {
    return this._lowerLimit;
  }

  get abnormalities(): number {
    return this._abnormalities;
  }

  get adaptive(): boolean {
    return this._adaptive;
  }

  public addAbnormality(): void {
    this._abnormalities++;
    this._updateMarking();
  }

  private _updateMarking(): void {
    for (let i = 0; i < this._marking.length; i++) {
      this._marking[i] = this._abnormalities > this._lowerLimit;
    }
  }

  public deriveFormula(formula: string, conditions: string[]): number {
    this._derivedFormulas.push(formula);
    this._conditionSets.push([...conditions]);
    this._marking.push(false);
    return this._derivedFormulas.length - 1;
  }

  public isMarked(index: number): boolean {
    if (index < 0 || index >= this._marking.length) return false;
    return this._marking[index];
  }

  public markLine(index: number): void {
    if (index >= 0 && index < this._marking.length) {
      this._marking[index] = true;
    }
  }

  public unmarkLine(index: number): void {
    if (index >= 0 && index < this._marking.length) {
      this._marking[index] = false;
    }
  }

  public isReliable(conditions: string[]): boolean {
    return conditions.length <= this._reliability * 10;
  }

  public minimalAbnormality(): number {
    return this._abnormalities;
  }

  public upperLimitLogic(): number {
    return this._upperLimit;
  }

  public lowerLimitLogic(): number {
    return this._lowerLimit;
  }

  public isAdaptive(): boolean {
    return this._adaptive;
  }

  public isDynamic(): boolean {
    return this._dynamic;
  }

  public report(): AdaptiveLogicData {
    return {
      upperLimit: this._upperLimit,
      lowerLimit: this._lowerLimit,
      abnormalities: this._abnormalities,
      adaptive: this._adaptive,
      dynamic: this._dynamic,
    };
  }

  public getFormulas(): string[] {
    return [...this._derivedFormulas];
  }

  public getConditions(index: number): string[] {
    if (index < 0 || index >= this._conditionSets.length) return [];
    return [...this._conditionSets[index]];
  }

  public setReliability(level: number): void {
    this._reliability = Math.max(0, Math.min(1, level));
  }

  public reset(): void {
    this._abnormalities = 0;
    this._derivedFormulas = [];
    this._conditionSets = [];
    this._marking = [];
  }
}

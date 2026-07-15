export interface ModalOperatorData {
  box: number;
  diamond: number;
  negations: number;
  iterations: number;
  reduction: boolean;
}

export class ModalOperator {
  private _box: number;
  private _diamond: number;
  private _negations: number;
  private _iterations: number;
  private _reduction: boolean;
  private _formulas: string[];
  private _modalDepths: number[];
  private _system: string;
  private _modalities: number;

  constructor() {
    this._box = 0;
    this._diamond = 0;
    this._negations = 0;
    this._iterations = 0;
    this._reduction = false;
    this._formulas = [];
    this._modalDepths = [];
    this._system = 'K';
    this._modalities = 0;
  }

  get box(): number {
    return this._box;
  }

  get diamond(): number {
    return this._diamond;
  }

  get iterations(): number {
    return this._iterations;
  }

  get reduction(): boolean {
    return this._reduction;
  }

  public addBox(): void {
    this._box++;
    this._modalities++;
  }

  public addDiamond(): void {
    this._diamond++;
    this._modalities++;
  }

  public addNegation(): void {
    this._negations++;
  }

  public negateBox(): string {
    this._negations++;
    this._diamond++;
    this._box--;
    return '◇¬';
  }

  public negateDiamond(): string {
    this._negations++;
    this._box++;
    this._diamond--;
    return '□¬';
  }

  public dual(operator: string): string {
    if (operator === '□') return '◇';
    if (operator === '◇') return '□';
    return operator;
  }

  public iterate(operator: string, times: number): string {
    this._iterations += times;
    if (operator === '□') {
      this._box += times;
    } else if (operator === '◇') {
      this._diamond += times;
    }
    return operator.repeat(times);
  }

  public reduce(operator: string, system: string): string {
    this._reduction = true;
    this._system = system;
    switch (system) {
      case 'S4':
        if (operator === '□□') { this._box--; return '□'; }
        if (operator === '◇◇') { this._diamond--; return '◇'; }
        break;
      case 'S5':
        if (operator.length >= 2) {
          return operator[operator.length - 1];
        }
        break;
    }
    return operator;
  }

  public modalDepth(formula: string): number {
    let depth = 0;
    let maxDepth = 0;
    let currentDepth = 0;
    for (const char of formula) {
      if (char === '□' || char === '◇') {
        currentDepth++;
        maxDepth = Math.max(maxDepth, currentDepth);
      } else if (char === '¬') {
        continue;
      } else {
        currentDepth = 0;
      }
    }
    this._formulas.push(formula);
    this._modalDepths.push(maxDepth);
    return maxDepth;
  }

  public isModalFormula(formula: string): boolean {
    return formula.includes('□') || formula.includes('◇');
  }

  public report(): ModalOperatorData {
    return {
      box: this._box,
      diamond: this._diamond,
      negations: this._negations,
      iterations: this._iterations,
      reduction: this._reduction,
    };
  }

  public getSystem(): string {
    return this._system;
  }

  public setSystem(system: string): void {
    this._system = system;
  }

  public getTotalModalities(): number {
    return this._modalities;
  }

  public getFormulas(): string[] {
    return [...this._formulas];
  }

  public getModalDepths(): number[] {
    return [...this._modalDepths];
  }

  public reset(): void {
    this._box = 0;
    this._diamond = 0;
    this._negations = 0;
    this._iterations = 0;
    this._reduction = false;
    this._formulas = [];
    this._modalDepths = [];
    this._modalities = 0;
  }
}

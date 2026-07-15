export interface LTLData {
  formulas: number;
  atomicProps: number;
  temporalOps: number;
  pathFormulas: number;
  stateFormulas: number;
}

export class LTL {
  private _formulas: number;
  private _atomicProps: number;
  private _temporalOps: number;
  private _pathFormulas: number;
  private _stateFormulas: number;
  private _propositions: string[];
  private _ltlFormulas: { formula: string; type: string }[];
  private _trace: boolean[][];
  private _traceLength: number;

  constructor(traceLength: number = 10) {
    this._formulas = 0;
    this._atomicProps = 0;
    this._temporalOps = 0;
    this._pathFormulas = 0;
    this._stateFormulas = 0;
    this._propositions = [];
    this._ltlFormulas = [];
    this._traceLength = traceLength;
    this._trace = [];
  }

  get formulas(): number {
    return this._formulas;
  }

  get atomicProps(): number {
    return this._atomicProps;
  }

  get temporalOps(): number {
    return this._temporalOps;
  }

  get traceLength(): number {
    return this._traceLength;
  }

  public addProposition(name: string): number {
    this._atomicProps++;
    this._propositions.push(name);
    return this._atomicProps - 1;
  }

  public addFormula(formula: string, type: string): number {
    this._formulas++;
    this._ltlFormulas.push({ formula, type });
    if (type === 'path') {
      this._pathFormulas++;
    } else {
      this._stateFormulas++;
    }
    if (formula.includes('G') || formula.includes('F') || formula.includes('X') || formula.includes('U')) {
      this._temporalOps++;
    }
    return this._formulas - 1;
  }

  public globally(propIndex: number): boolean {
    if (propIndex < 0 || propIndex >= this._atomicProps) return false;
    if (this._trace.length === 0) return true;
    for (let t = 0; t < this._traceLength; t++) {
      if (!this._trace[t][propIndex]) return false;
    }
    return true;
  }

  public finally(propIndex: number): boolean {
    if (propIndex < 0 || propIndex >= this._atomicProps) return false;
    if (this._trace.length === 0) return false;
    for (let t = 0; t < this._traceLength; t++) {
      if (this._trace[t][propIndex]) return true;
    }
    return false;
  }

  public next(propIndex: number, time: number): boolean {
    if (propIndex < 0 || propIndex >= this._atomicProps) return false;
    const nextTime = time + 1;
    if (nextTime >= this._traceLength) return false;
    if (this._trace.length === 0) return false;
    return this._trace[nextTime][propIndex];
  }

  public until(antIndex: number, consIndex: number): boolean {
    if (antIndex < 0 || antIndex >= this._atomicProps) return false;
    if (consIndex < 0 || consIndex >= this._atomicProps) return false;
    if (this._trace.length === 0) return false;
    for (let t = 0; t < this._traceLength; t++) {
      if (this._trace[t][consIndex]) return true;
      if (!this._trace[t][antIndex]) return false;
    }
    return false;
  }

  public release(antIndex: number, consIndex: number): boolean {
    if (antIndex < 0 || antIndex >= this._atomicProps) return false;
    if (consIndex < 0 || consIndex >= this._atomicProps) return false;
    if (this._trace.length === 0) return false;
    for (let t = 0; t < this._traceLength; t++) {
      if (this._trace[t][antIndex] && this._trace[t][consIndex]) return true;
      if (!this._trace[t][consIndex]) return false;
    }
    return true;
  }

  public setTrace(trace: boolean[][]): void {
    this._trace = trace.map(row => [...row]);
    this._traceLength = trace.length;
  }

  public getTrace(): boolean[][] {
    return this._trace.map(row => [...row]);
  }

  public report(): LTLData {
    return {
      formulas: this._formulas,
      atomicProps: this._atomicProps,
      temporalOps: this._temporalOps,
      pathFormulas: this._pathFormulas,
      stateFormulas: this._stateFormulas,
    };
  }

  public getPropositions(): string[] {
    return [...this._propositions];
  }

  public isLinearTime(): boolean {
    return true;
  }

  public reset(): void {
    this._formulas = 0;
    this._atomicProps = 0;
    this._temporalOps = 0;
    this._pathFormulas = 0;
    this._stateFormulas = 0;
    this._propositions = [];
    this._ltlFormulas = [];
    this._trace = [];
  }
}

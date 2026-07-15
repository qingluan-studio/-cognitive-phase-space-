export interface CTLData {
  states: number;
  transitions: number;
  pathQuantifiers: number;
  temporalOps: number;
  formulas: number;
}

export class CTL {
  private _states: number;
  private _transitions: number[][];
  private _pathQuantifiers: number;
  private _temporalOps: number;
  private _formulas: number;
  private _atomicProps: string[];
  private _labeling: Set<number>[];
  private _ctlFormulas: { formula: string; type: string }[];

  constructor(states: number = 5) {
    this._states = states;
    this._pathQuantifiers = 0;
    this._temporalOps = 0;
    this._formulas = 0;
    this._atomicProps = [];
    this._ctlFormulas = [];
    this._transitions = [];
    this._labeling = [];
    for (let i = 0; i < states; i++) {
      this._transitions.push([]);
      this._labeling.push(new Set());
      for (let j = 0; j < states; j++) {
        this._transitions[i].push(0);
      }
    }
  }

  get states(): number {
    return this._states;
  }

  get formulas(): number {
    return this._formulas;
  }

  get pathQuantifiers(): number {
    return this._pathQuantifiers;
  }

  get temporalOps(): number {
    return this._temporalOps;
  }

  public addTransition(from: number, to: number): void {
    if (from >= 0 && from < this._states && to >= 0 && to < this._states) {
      this._transitions[from][to] = 1;
    }
  }

  public hasTransition(from: number, to: number): boolean {
    if (from < 0 || from >= this._states) return false;
    if (to < 0 || to >= this._states) return false;
    return this._transitions[from][to] === 1;
  }

  public addAtomicProp(name: string): number {
    this._atomicProps.push(name);
    return this._atomicProps.length - 1;
  }

  public labelState(state: number, propIndex: number): void {
    if (state >= 0 && state < this._states && propIndex >= 0 && propIndex < this._atomicProps.length) {
      this._labeling[state].add(propIndex);
    }
  }

  public hasProp(state: number, propIndex: number): boolean {
    if (state < 0 || state >= this._states) return false;
    return this._labeling[state].has(propIndex);
  }

  public addFormula(formula: string, type: string): number {
    this._formulas++;
    this._ctlFormulas.push({ formula, type });
    if (formula.includes('A') || formula.includes('E')) {
      this._pathQuantifiers++;
    }
    if (formula.includes('G') || formula.includes('F') || formula.includes('X') || formula.includes('U')) {
      this._temporalOps++;
    }
    return this._formulas - 1;
  }

  public EX(state: number, propIndex: number): boolean {
    for (let s = 0; s < this._states; s++) {
      if (this.hasTransition(state, s) && this.hasProp(s, propIndex)) {
        return true;
      }
    }
    return false;
  }

  public AX(state: number, propIndex: number): boolean {
    let hasNext = false;
    for (let s = 0; s < this._states; s++) {
      if (this.hasTransition(state, s)) {
        hasNext = true;
        if (!this.hasProp(s, propIndex)) {
          return false;
        }
      }
    }
    return hasNext;
  }

  public EF(state: number, propIndex: number): boolean {
    const visited = new Set<number>();
    const queue: number[] = [state];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      if (this.hasProp(current, propIndex)) return true;
      for (let s = 0; s < this._states; s++) {
        if (this.hasTransition(current, s) && !visited.has(s)) {
          queue.push(s);
        }
      }
    }
    return false;
  }

  public AG(state: number, propIndex: number): boolean {
    const visited = new Set<number>();
    const stack: number[] = [state];
    while (stack.length > 0) {
      const current = stack.pop()!;
      if (visited.has(current)) continue;
      visited.add(current);
      if (!this.hasProp(current, propIndex)) return false;
      for (let s = 0; s < this._states; s++) {
        if (this.hasTransition(current, s) && !visited.has(s)) {
          stack.push(s);
        }
      }
    }
    return true;
  }

  public isBranchingTime(): boolean {
    return true;
  }

  public report(): CTLData {
    let transCount = 0;
    for (let i = 0; i < this._states; i++) {
      for (let j = 0; j < this._states; j++) {
        transCount += this._transitions[i][j];
      }
    }
    return {
      states: this._states,
      transitions: transCount,
      pathQuantifiers: this._pathQuantifiers,
      temporalOps: this._temporalOps,
      formulas: this._formulas,
    };
  }

  public getAtomicProps(): string[] {
    return [...this._atomicProps];
  }

  public reset(): void {
    this._pathQuantifiers = 0;
    this._temporalOps = 0;
    this._formulas = 0;
    this._ctlFormulas = [];
  }
}

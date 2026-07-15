export interface ChoiceSequenceData {
  elements: number;
  lawlike: boolean;
  free: boolean;
  creative: boolean;
  spread: number;
}

export class ChoiceSequence {
  private _elements: number[];
  private _lawlike: boolean;
  private _free: boolean;
  private _creative: boolean;
  private _spread: number;
  private _length: number;
  private _rule: ((n: number) => number) | null;
  private _initialSegments: number[][];

  constructor(lawlike: boolean = false) {
    this._elements = [];
    this._lawlike = lawlike;
    this._free = !lawlike;
    this._creative = false;
    this._spread = 0;
    this._length = 0;
    this._rule = lawlike ? (n: number) => n * 2 : null;
    this._initialSegments = [];
  }

  get elements(): number {
    return this._length;
  }

  get lawlike(): boolean {
    return this._lawlike;
  }

  get free(): boolean {
    return this._free;
  }

  get creative(): boolean {
    return this._creative;
  }

  public addElement(value: number): void {
    this._elements.push(value);
    this._length++;
    this._initialSegments.push([...this._elements]);
  }

  public getElement(index: number): number {
    if (index < 0 || index >= this._length) return 0;
    return this._elements[index];
  }

  public setRule(rule: (n: number) => number): void {
    this._rule = rule;
    this._lawlike = true;
    this._free = false;
  }

  public computeNth(n: number): number {
    if (this._rule) {
      return this._rule(n);
    }
    if (n < this._length) {
      return this._elements[n];
    }
    return Math.random();
  }

  public isLawlike(): boolean {
    return this._lawlike;
  }

  public isFreeChoice(): boolean {
    return this._free;
  }

  public setCreative(subject: boolean): void {
    this._creative = subject;
  }

  public initialSegment(n: number): number[] {
    if (n <= 0) return [];
    const result = [];
    for (let i = 0; i < Math.min(n, this._length); i++) {
      result.push(this._elements[i]);
    }
    return result;
  }

  public continuation(length: number): number[] {
    const result = [];
    for (let i = 0; i < length; i++) {
      result.push(this.computeNth(this._length + i));
    }
    return result;
  }

  public spread(): number {
    this._spread = this._length;
    return this._spread;
  }

  public barInduction(property: (seq: number[]) => boolean): boolean {
    return property(this._elements);
  }

  public report(): ChoiceSequenceData {
    return {
      elements: this._length,
      lawlike: this._lawlike,
      free: this._free,
      creative: this._creative,
      spread: this._spread,
    };
  }

  public getSequence(): number[] {
    return [...this._elements];
  }

  public isInfinite(): boolean {
    return this._free;
  }

  public fanTheorem(maxBranching: number): boolean {
    return maxBranching > 0;
  }

  public reset(): void {
    this._elements = [];
    this._length = 0;
    this._spread = 0;
    this._initialSegments = [];
  }
}

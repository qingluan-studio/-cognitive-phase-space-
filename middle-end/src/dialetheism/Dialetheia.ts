export interface DialetheiaData {
  trueContradictions: number;
  sentences: number;
  glutty: number;
  gappy: number;
  consistency: number;
}

export class Dialetheia {
  private _trueContradictions: number;
  private _sentences: number;
  private _glutty: number;
  private _gappy: number;
  private _consistency: number;
  private _sentenceValues: { sentence: string; value: number }[];
  private _truthValues: number;
  private _paraconsistent: boolean;

  constructor() {
    this._trueContradictions = 0;
    this._sentences = 0;
    this._glutty = 0;
    this._gappy = 0;
    this._consistency = 1.0;
    this._sentenceValues = [];
    this._truthValues = 4;
    this._paraconsistent = true;
  }

  get trueContradictions(): number {
    return this._trueContradictions;
  }

  get sentences(): number {
    return this._sentences;
  }

  get glutty(): number {
    return this._glutty;
  }

  get consistency(): number {
    return this._consistency;
  }

  public addSentence(sentence: string, value: number): number {
    this._sentences++;
    this._sentenceValues.push({ sentence, value });
    if (value === 2) {
      this._glutty++;
      this._trueContradictions++;
    }
    if (value === 0) {
      this._gappy++;
    }
    this._updateConsistency();
    return this._sentences - 1;
  }

  private _updateConsistency(): void {
    if (this._sentences === 0) {
      this._consistency = 1.0;
      return;
    }
    this._consistency = 1 - this._glutty / this._sentences;
  }

  public isTrue(index: number): boolean {
    if (index < 0 || index >= this._sentences) return false;
    const v = this._sentenceValues[index].value;
    return v === 1 || v === 2;
  }

  public isFalse(index: number): boolean {
    if (index < 0 || index >= this._sentences) return false;
    const v = this._sentenceValues[index].value;
    return v === 0 || v === 2;
  }

  public isBoth(index: number): boolean {
    if (index < 0 || index >= this._sentences) return false;
    return this._sentenceValues[index].value === 2;
  }

  public isNeither(index: number): boolean {
    if (index < 0 || index >= this._sentences) return false;
    return this._sentenceValues[index].value === 0;
  }

  public not(value: number): number {
    switch (value) {
      case 0: return 0;
      case 1: return 1;
      case 2: return 2;
      default: return value;
    }
  }

  public and(a: number, b: number): number {
    if (a === 2 && b === 2) return 2;
    if (a === 0 || b === 0) return 0;
    if (a === 2 || b === 2) return 1;
    return Math.min(a, b);
  }

  public or(a: number, b: number): number {
    if (a === 2 && b === 2) return 2;
    if (a === 1 || b === 1) return 1;
    if (a === 2 || b === 2) return 2;
    return Math.max(a, b);
  }

  public liarParadox(): number {
    return 2;
  }

  public isConsistent(): boolean {
    return this._glutty === 0;
  }

  public isParaconsistent(): boolean {
    return this._paraconsistent;
  }

  public report(): DialetheiaData {
    return {
      trueContradictions: this._trueContradictions,
      sentences: this._sentences,
      glutty: this._glutty,
      gappy: this._gappy,
      consistency: this._consistency,
    };
  }

  public getSentenceValue(index: number): number {
    if (index < 0 || index >= this._sentences) return -1;
    return this._sentenceValues[index].value;
  }

  public getSentences(): string[] {
    return this._sentenceValues.map(s => s.sentence);
  }

  public setTruthValues(n: number): void {
    this._truthValues = n;
  }

  public reset(): void {
    this._trueContradictions = 0;
    this._sentences = 0;
    this._glutty = 0;
    this._gappy = 0;
    this._consistency = 1.0;
    this._sentenceValues = [];
  }
}

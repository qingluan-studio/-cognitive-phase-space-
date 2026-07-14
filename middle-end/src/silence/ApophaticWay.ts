/**
 * 否定之道模块：通过说"不是"来逼近真相。
 * 不直接描述对象，而是否定它不是什么，逐步收敛到不可言说的本质。
 */

export interface ApophaticWayData {
  negations: string[];
  candidates: string[];
  residue: string | null;
}

export class ApophaticWay {
  private _negations: string[];
  private _candidates: string[];
  private _residue: string | null;

  constructor(candidates: string[] = []) {
    this._negations = [];
    this._candidates = candidates;
    this._residue = null;
  }

  get negationCount(): number {
    return this._negations.length;
  }

  get candidateCount(): number {
    return this._candidates.length;
  }

  public negate(property: string): void {
    if (!this._negations.includes(property)) {
      this._negations.push(property);
    }
  }

  public eliminate(candidate: string): void {
    this._candidates = this._candidates.filter((c) => c !== candidate);
  }

  public converge(): string | null {
    if (this._candidates.length === 1) {
      this._residue = this._candidates[0];
      return this._residue;
    }
    if (this._candidates.length === 0) {
      this._residue = 'ineffable';
      return this._residue;
    }
    return null;
  }

  public addCandidate(c: string): void {
    if (!this._candidates.includes(c)) this._candidates.push(c);
  }

  public residueValue(): string | null {
    return this._residue;
  }

  public reset(): void {
    this._negations = [];
    this._candidates = [];
    this._residue = null;
  }

  public report(): ApophaticWayData {
    return {
      negations: [...this._negations],
      candidates: [...this._candidates],
      residue: this._residue,
    };
  }
}

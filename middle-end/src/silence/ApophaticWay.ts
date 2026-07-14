export interface ApophaticNegation {
  id: string;
  attribute: string;
  negatedAt: number;
  depth: number;
}

export interface ApophaticTrace {
  path: string[];
  remainingAttributes: number;
  convergence: number;
}

export class ApophaticWay {
  private _negations: Map<string, ApophaticNegation> = new Map();
  private _trace: string[] = [];
  private _maxDepth: number;
  private _convergenceRate: number;
  private _entropyField: number[];

  constructor(maxDepth: number = 100) {
    this._maxDepth = maxDepth;
    this._convergenceRate = 1.0;
    this._entropyField = [];
  }

  get remainingAttributes(): number {
    return this._maxDepth - this._negations.size;
  }

  get depth(): number {
    return this._negations.size;
  }

  public negate(attribute: string): ApophaticNegation {
    const id = `neg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const negation: ApophaticNegation = {
      id,
      attribute,
      negatedAt: Date.now(),
      depth: this._negations.size + 1,
    };
    this._negations.set(id, negation);
    this._trace.push(attribute);
    this._convergenceRate = Math.max(0, this._convergenceRate - 1 / this._maxDepth);
    this._entropyField.push(this._computeNegationEntropy());
    if (this._entropyField.length > 50) this._entropyField.shift();
    return negation;
  }

  public trace(): ApophaticTrace {
    return {
      path: [...this._trace],
      remainingAttributes: this.remainingAttributes,
      convergence: this._convergenceRate,
    };
  }

  public whatRemains(): string | null {
    if (this._convergenceRate <= 0) return '不可言说之物';
    return null;
  }

  public reset(): void {
    this._negations.clear();
    this._trace = [];
    this._convergenceRate = 1.0;
    this._entropyField = [];
  }

  public getNegation(id: string): ApophaticNegation | null {
    return this._negations.get(id) ?? null;
  }

  public computeNegationEntropy(): number {
    if (this._entropyField.length === 0) return 0;
    const mean = this._entropyField.reduce((a, b) => a + b, 0) / this._entropyField.length;
    const variance = this._entropyField.reduce((s, v) => s + (v - mean) ** 2, 0) / this._entropyField.length;
    return 0.5 * Math.log2(2 * Math.PI * Math.E * Math.max(variance, 1e-10));
  }

  public computeConvergenceTrajectory(): number[] {
    const trajectory: number[] = [];
    let rate = 1.0;
    for (let i = 0; i < this._maxDepth; i++) {
      rate = Math.max(0, rate - 1 / this._maxDepth);
      trajectory.push(rate);
    }
    return trajectory;
  }

  public estimateRemnantDimension(): number {
    const negated = this._negations.size;
    return Math.max(0, 1 - negated / this._maxDepth);
  }

  private _computeNegationEntropy(): number {
    const attrs = Array.from(this._negations.values()).map(n => n.attribute);
    const freq = new Map<string, number>();
    for (const attr of attrs) {
      freq.set(attr, (freq.get(attr) ?? 0) + 1);
    }
    let entropy = 0;
    for (const count of freq.values()) {
      const p = count / attrs.length;
      entropy -= p * Math.log2(p);
    }
    return entropy;
  }
}

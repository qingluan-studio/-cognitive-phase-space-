/**
 * 半影逻辑模块：在清晰与完全黑暗之间的模糊区间进行推理。
 * 用于处理边界不明确、部分确定性的判断过程。
 */

export interface PenumbraAssertion {
  claim: string;
  confidence: number;
  evidence: number;
}

export type PenumbraVerdict = {
  claim: string;
  verdict: 'likely' | 'uncertain' | 'unlikely';
  score: number;
};

export interface PenumbraConfig {
  thresholdHigh: number;
  thresholdLow: number;
  evidenceWeight: number;
}

export class PenumbraLogic {
  private _config: PenumbraConfig;
  private _assertions: PenumbraAssertion[] = [];
  private _verdicts: PenumbraVerdict[] = [];
  private _meta: Record<string, unknown> = {};

  constructor(config: PenumbraConfig) {
    this._config = config;
  }

  get assertionCount(): number {
    return this._assertions.length;
  }

  get verdictCount(): number {
    return this._verdicts.length;
  }

  assert(claim: string, confidence: number, evidence: number): PenumbraAssertion {
    const a: PenumbraAssertion = { claim, confidence, evidence };
    this._assertions.push(a);
    if (this._assertions.length > 50) this._assertions.shift();
    return a;
  }

  evaluate(claim: string): PenumbraVerdict {
    const a = this._assertions.find((x) => x.claim === claim);
    const score = a
      ? a.confidence * (1 - this._config.evidenceWeight) +
        a.evidence * this._config.evidenceWeight
      : 0;
    const verdict: PenumbraVerdict['verdict'] =
      score >= this._config.thresholdHigh
        ? 'likely'
        : score <= this._config.thresholdLow
        ? 'unlikely'
        : 'uncertain';
    const result: PenumbraVerdict = { claim, verdict, score };
    this._verdicts.push(result);
    if (this._verdicts.length > 50) this._verdicts.shift();
    return result;
  }

  evaluateAll(): PenumbraVerdict[] {
    return this._assertions.map((a) => this.evaluate(a.claim));
  }

  borderlineClaims(): PenumbraAssertion[] {
    return this._assertions.filter((a) => {
      const score =
        a.confidence * (1 - this._config.evidenceWeight) +
        a.evidence * this._config.evidenceWeight;
      return (
        score > this._config.thresholdLow && score < this._config.thresholdHigh
      );
    });
  }

  averageConfidence(): number {
    if (this._assertions.length === 0) return 0;
    return this._assertions.reduce((acc, a) => acc + a.confidence, 0) / this._assertions.length;
  }

  strengthenEvidence(claim: string, amount: number): boolean {
    const a = this._assertions.find((x) => x.claim === claim);
    if (!a) return false;
    a.evidence = Math.min(1, a.evidence + amount);
    return true;
  }

  isAmbiguous(): boolean {
    return this.borderlineClaims().length > this._assertions.length / 2;
  }

  report(): Record<string, unknown> {
    return {
      assertions: this._assertions.length,
      verdicts: this._verdicts.length,
      averageConfidence: this.averageConfidence(),
      meta: this._meta,
    };
  }
}

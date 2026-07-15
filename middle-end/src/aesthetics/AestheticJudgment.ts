export interface JudgmentState {
  tasteScore: number;
  universalityClaim: number;
  disinterestedness: number;
  subjectiveValidity: number;
  reflectiveDistance: number;
}

export class AestheticJudgment {
  private _tasteScore: number;
  private _universalityClaim: number;
  private _disinterestedness: number;
  private _subjectiveValidity: number;
  private _reflectiveDistance: number;
  private _history: JudgmentState[];

  constructor() {
    this._tasteScore = 0.5;
    this._universalityClaim = 0.5;
    this._disinterestedness = 0.5;
    this._subjectiveValidity = 0.5;
    this._reflectiveDistance = 1.0;
    this._history = [];
  }

  get tasteScore(): number { return this._tasteScore; }
  get universalityClaim(): number { return this._universalityClaim; }
  get disinterestedness(): number { return this._disinterestedness; }
  get subjectiveValidity(): number { return this._subjectiveValidity; }
  get reflectiveDistance(): number { return this._reflectiveDistance; }

  public deliberateHarmony(proportions: number[]): number {
    const mean = proportions.reduce((a, b) => a + b, 0) / proportions.length;
    let variance = 0;
    for (const p of proportions) {
      variance += Math.pow(p - mean, 2);
    }
    variance /= proportions.length;
    const harmony = 1 / (1 + variance);
    this._tasteScore = 0.7 * this._tasteScore + 0.3 * harmony;
    this._recordState();
    return harmony;
  }

  public detachDesire(desireIntensity: number): number {
    this._disinterestedness = Math.tanh(1 / (desireIntensity + 0.01));
    this._recordState();
    return this._disinterestedness;
  }

  public claimUniversality(sampleSize: number, agreementRatio: number): number {
    const confidence = 1 - 1 / (1 + sampleSize * 0.1);
    this._universalityClaim = confidence * agreementRatio;
    this._recordState();
    return this._universalityClaim;
  }

  public reflectiveEndowment(rawSensation: number, contemplationTime: number): number {
    const endowment = rawSensation * (1 - Math.exp(-contemplationTime / 5));
    this._subjectiveValidity = endowment;
    this._recordState();
    return endowment;
  }

  public measurePurposiveness(formComplexity: number, purposeClarity: number): number {
    const purposiveness = formComplexity * (1 - purposeClarity);
    return Math.min(purposiveness, 1.0);
  }

  public schematizeImagination(concepts: string[], intuitions: number[]): number {
    const overlap = Math.min(concepts.length, intuitions.length);
    const maxLen = Math.max(concepts.length, intuitions.length);
    const schemaFit = overlap / maxLen;
    this._reflectiveDistance = 1 / (1 + schemaFit);
    this._recordState();
    return schemaFit;
  }

  public freePlayOfFaculties(understandingLoad: number, imaginationLoad: number): number {
    const balance = 1 - Math.abs(understandingLoad - imaginationLoad) / (understandingLoad + imaginationLoad + 0.001);
    this._tasteScore = 0.6 * this._tasteScore + 0.4 * balance;
    this._recordState();
    return balance;
  }

  public geniusCommunityWeight(individualGenius: number, communityEndorsement: number[]): number {
    const avgEndorsement = communityEndorsement.reduce((a, b) => a + b, 0) / communityEndorsement.length;
    const weighted = 0.3 * individualGenius + 0.7 * avgEndorsement;
    return weighted;
  }

  public temporalDisinterest(temporalDiscount: number): number {
    const adjusted = Math.exp(-temporalDiscount);
    this._disinterestedness = adjusted;
    this._recordState();
    return adjusted;
  }

  public judgmentEntropy(pastJudgments: number[]): number {
    const counts: Record<string, number> = {};
    for (const j of pastJudgments) {
      const bin = Math.floor(j * 10) / 10;
      counts[bin] = (counts[bin] || 0) + 1;
    }
    let entropy = 0;
    const total = pastJudgments.length;
    for (const key in counts) {
      const p = counts[key] / total;
      entropy -= p * Math.log2(p);
    }
    return entropy;
  }

  public commonSenseValidation(privateJudgments: number[], publicJudgments: number[]): number {
    if (privateJudgments.length !== publicJudgments.length) return 0;
    let correlation = 0;
    const n = privateJudgments.length;
    const meanP = privateJudgments.reduce((a, b) => a + b, 0) / n;
    const meanPub = publicJudgments.reduce((a, b) => a + b, 0) / n;
    let num = 0, denP = 0, denPub = 0;
    for (let i = 0; i < n; i++) {
      const dp = privateJudgments[i] - meanP;
      const dpub = publicJudgments[i] - meanPub;
      num += dp * dpub;
      denP += dp * dp;
      denPub += dpub * dpub;
    }
    correlation = num / Math.sqrt(denP * denPub + 0.0001);
    return correlation;
  }

  public reset(): void {
    this._tasteScore = 0.5;
    this._universalityClaim = 0.5;
    this._disinterestedness = 0.5;
    this._subjectiveValidity = 0.5;
    this._reflectiveDistance = 1.0;
    this._history = [];
  }

  private _recordState(): void {
    this._history.push({
      tasteScore: this._tasteScore,
      universalityClaim: this._universalityClaim,
      disinterestedness: this._disinterestedness,
      subjectiveValidity: this._subjectiveValidity,
      reflectiveDistance: this._reflectiveDistance
    });
  }

  public getHistory(): JudgmentState[] {
    return this._history;
  }
}

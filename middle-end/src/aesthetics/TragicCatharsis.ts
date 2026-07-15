export interface CatharsisState {
  pityIntensity: number;
  fearElevation: number;
  purificationLevel: number;
  hamartiaSeverity: number;
  dramaticIronyIndex: number;
}

export class TragicCatharsis {
  private _pityIntensity: number;
  private _fearElevation: number;
  private _purificationLevel: number;
  private _hamartiaSeverity: number;
  private _dramaticIronyIndex: number;
  private _history: CatharsisState[];

  constructor() {
    this._pityIntensity = 0;
    this._fearElevation = 0;
    this._purificationLevel = 0;
    this._hamartiaSeverity = 0.5;
    this._dramaticIronyIndex = 0;
    this._history = [];
  }

  get pityIntensity(): number { return this._pityIntensity; }
  get fearElevation(): number { return this._fearElevation; }
  get purificationLevel(): number { return this._purificationLevel; }
  get hamartiaSeverity(): number { return this._hamartiaSeverity; }
  get dramaticIronyIndex(): number { return this._dramaticIronyIndex; }

  public invokePity(heroVirtue: number, undeservedSuffering: number): number {
    const pity = heroVirtue * undeservedSuffering;
    this._pityIntensity = Math.tanh(pity);
    this._recordState();
    return this._pityIntensity;
  }

  public invokeFear(protagonistSimilarity: number, catastropheProbability: number): number {
    const fear = protagonistSimilarity * catastropheProbability;
    this._fearElevation = Math.tanh(fear);
    this._recordState();
    return this._fearElevation;
  }

  public calculatePurification(audienceCapacity: number, emotionalOverload: number): number {
    const rawPurification = (this._pityIntensity + this._fearElevation) * audienceCapacity;
    this._purificationLevel = Math.tanh(rawPurification / (emotionalOverload + 1));
    this._recordState();
    return this._purificationLevel;
  }

  public identifyHamartia(heroStrengths: number[], heroFlaws: number[]): number {
    const strengthSum = heroStrengths.reduce((a, b) => a + b, 0);
    const flawSum = heroFlaws.reduce((a, b) => a + b, 0);
    const severity = flawSum / (strengthSum + flawSum + 0.0001);
    this._hamartiaSeverity = severity;
    this._recordState();
    return severity;
  }

  public measureDramaticIrony(audienceKnowledge: number, characterKnowledge: number): number {
    const irony = audienceKnowledge - characterKnowledge;
    this._dramaticIronyIndex = Math.max(0, irony);
    this._recordState();
    return this._dramaticIronyIndex;
  }

  public peripeteiaReversal(fortuneSeries: number[]): number {
    if (fortuneSeries.length < 2) return 0;
    const last = fortuneSeries[fortuneSeries.length - 1];
    const prev = fortuneSeries[fortuneSeries.length - 2];
    const reversal = (prev - last) / (Math.abs(prev) + 0.0001);
    return reversal;
  }

  public anagnorisisMoment(confusionMatrix: number[][], truthVector: number[]): number {
    let recognition = 0;
    for (let i = 0; i < confusionMatrix.length; i++) {
      recognition += confusionMatrix[i][i] * truthVector[i];
    }
    const total = confusionMatrix.reduce((sum, row) => sum + row.reduce((a, b) => a + b, 0), 0);
    return recognition / (total + 0.0001);
  }

  public narrativeArcTension(events: number[]): number[] {
    const tensions: number[] = [];
    let cumulative = 0;
    for (const e of events) {
      cumulative += e;
      tensions.push(Math.tanh(cumulative));
    }
    return tensions;
  }

  public catharticReleaseCurve(emotionBuildup: number[], resolutionPoints: number[]): number[] {
    const curve: number[] = [];
    let current = 0;
    for (let i = 0; i < emotionBuildup.length; i++) {
      current += emotionBuildup[i];
      if (resolutionPoints.includes(i)) {
        current *= 0.5;
      }
      curve.push(current);
    }
    return curve;
  }

  public hubrisIndex(achievements: number[], prideLevel: number): number {
    const totalAchievement = achievements.reduce((a, b) => a + b, 0);
    const hubris = prideLevel / (totalAchievement + 1);
    return Math.min(1, hubris);
  }

  public fateProbability(causalChain: number[][]): number {
    let prob = 1;
    for (const link of causalChain) {
      const linkProb = link.reduce((a, b) => a + b, 0) / (link.length + 0.0001);
      prob *= linkProb;
    }
    return prob;
  }

  public nemesisAlignment(heroActions: number[], cosmicBalance: number): number {
    const actionSum = heroActions.reduce((a, b) => a + Math.abs(b), 0);
    const alignment = Math.abs(actionSum - cosmicBalance) / (cosmicBalance + 0.0001);
    return Math.tanh(alignment);
  }

  public reset(): void {
    this._pityIntensity = 0;
    this._fearElevation = 0;
    this._purificationLevel = 0;
    this._hamartiaSeverity = 0.5;
    this._dramaticIronyIndex = 0;
    this._history = [];
  }

  private _recordState(): void {
    this._history.push({
      pityIntensity: this._pityIntensity,
      fearElevation: this._fearElevation,
      purificationLevel: this._purificationLevel,
      hamartiaSeverity: this._hamartiaSeverity,
      dramaticIronyIndex: this._dramaticIronyIndex
    });
  }

  public getHistory(): CatharsisState[] {
    return this._history;
  }
}

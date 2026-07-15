export interface GeniusState {
  creativeIntensity: number;
  ruleBreakingIndex: number;
  productivityPulse: number;
  influenceRadius: number;
  imitationResistance: number;
}

export class ArtisticGenius {
  private _creativeIntensity: number;
  private _ruleBreakingIndex: number;
  private _productivityPulse: number;
  private _influenceRadius: number;
  private _imitationResistance: number;
  private _history: GeniusState[];

  constructor() {
    this._creativeIntensity = 1.0;
    this._ruleBreakingIndex = 0.5;
    this._productivityPulse = 0.5;
    this._influenceRadius = 1.0;
    this._imitationResistance = 0.8;
    this._history = [];
  }

  get creativeIntensity(): number { return this._creativeIntensity; }
  get ruleBreakingIndex(): number { return this._ruleBreakingIndex; }
  get productivityPulse(): number { return this._productivityPulse; }
  get influenceRadius(): number { return this._influenceRadius; }
  get imitationResistance(): number { return this._imitationResistance; }

  public inspirationSpark(basePotential: number, museFactor: number): number {
    const spark = basePotential * museFactor * (1 + Math.random());
    this._creativeIntensity = Math.min(this._creativeIntensity + spark * 0.1, 10.0);
    this._recordState();
    return spark;
  }

  public transgressConvention(conventionStrength: number, originality: number): number {
    const transgression = originality / (conventionStrength + 0.01);
    this._ruleBreakingIndex = Math.tanh(transgression);
    this._recordState();
    return this._ruleBreakingIndex;
  }

  public productivityCycle(days: number, peakDay: number): number[] {
    const cycle: number[] = [];
    for (let d = 0; d < days; d++) {
      const pulse = Math.sin((d / peakDay) * Math.PI) * Math.exp(-d / (peakDay * 2));
      cycle.push(Math.max(0, pulse));
    }
    this._productivityPulse = cycle.reduce((a, b) => a + b, 0) / days;
    this._recordState();
    return cycle;
  }

  public influenceDiffusion(initialRadius: number, timeSteps: number, mediumViscosity: number): number[] {
    const radii: number[] = [initialRadius];
    for (let t = 1; t < timeSteps; t++) {
      const next = radii[t - 1] + (1 / (1 + mediumViscosity * radii[t - 1]));
      radii.push(next);
    }
    this._influenceRadius = radii[radii.length - 1];
    this._recordState();
    return radii;
  }

  public resistImitation(marketSaturation: number, uniqueness: number): number {
    const resistance = uniqueness * Math.exp(-marketSaturation / 10);
    this._imitationResistance = resistance;
    this._recordState();
    return resistance;
  }

  public creativeDestruction(oldForms: number[], newForms: number[]): number {
    const overlap = oldForms.filter(o => newForms.includes(o)).length;
    const destruction = 1 - overlap / (oldForms.length + 0.0001);
    this._creativeIntensity *= (1 + destruction * 0.2);
    this._recordState();
    return destruction;
  }

  public zeitgeistAlignment(personalThemes: string[], eraThemes: string[]): number {
    const overlap = personalThemes.filter(t => eraThemes.includes(t)).length;
    const alignment = overlap / Math.max(personalThemes.length, eraThemes.length);
    return alignment;
  }

  public geniusDecayRate(currentOutput: number, peakOutput: number, yearsSincePeak: number): number {
    const decay = (peakOutput - currentOutput) / (peakOutput + 0.0001);
    const adjustedDecay = decay * Math.exp(-yearsSincePeak / 10);
    return adjustedDecay;
  }

  public stylisticFingerprint(features: number[]): number[] {
    const mean = features.reduce((a, b) => a + b, 0) / features.length;
    const variance = features.reduce((sum, f) => sum + Math.pow(f - mean, 2), 0) / features.length;
    const skewness = features.reduce((sum, f) => sum + Math.pow(f - mean, 3), 0) / (features.length * Math.pow(variance, 1.5) + 0.0001);
    return [mean, variance, skewness];
  }

  public networkCentralityOfGenius(collaborators: number[][], geniusIndex: number): number {
    const degree = collaborators[geniusIndex].reduce((a, b) => a + b, 0);
    const totalConnections = collaborators.reduce((sum, row) => sum + row.reduce((a, b) => a + b, 0), 0);
    return degree / (totalConnections + 0.0001);
  }

  public burstOfCreation(inspirationQueue: number[], processingCapacity: number): number {
    let processed = 0;
    let total = 0;
    for (const inspiration of inspirationQueue) {
      if (processed + inspiration <= processingCapacity) {
        processed += inspiration;
        total += inspiration;
      } else {
        const remainder = processingCapacity - processed;
        total += remainder;
        processed = processingCapacity;
        break;
      }
    }
    this._productivityPulse = total / processingCapacity;
    this._recordState();
    return total;
  }

  public aestheticInnovationIndex(novelty: number, value: number, surprise: number): number {
    const index = Math.pow(novelty * value * surprise, 1 / 3);
    this._creativeIntensity = Math.min(this._creativeIntensity * (1 + index * 0.05), 10.0);
    this._recordState();
    return index;
  }

  public reset(): void {
    this._creativeIntensity = 1.0;
    this._ruleBreakingIndex = 0.5;
    this._productivityPulse = 0.5;
    this._influenceRadius = 1.0;
    this._imitationResistance = 0.8;
    this._history = [];
  }

  private _recordState(): void {
    this._history.push({
      creativeIntensity: this._creativeIntensity,
      ruleBreakingIndex: this._ruleBreakingIndex,
      productivityPulse: this._productivityPulse,
      influenceRadius: this._influenceRadius,
      imitationResistance: this._imitationResistance
    });
  }

  public getHistory(): GeniusState[] {
    return this._history;
  }
}

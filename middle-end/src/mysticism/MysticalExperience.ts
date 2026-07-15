export interface ExperienceState {
  intensity: number;
  noeticQuality: number;
  transiency: number;
  passivity: number;
  ineffabilityDepth: number;
}

export class MysticalExperience {
  private _intensity: number;
  private _noeticQuality: number;
  private _transiency: number;
  private _passivity: number;
  private _ineffabilityDepth: number;
  private _history: ExperienceState[];

  constructor() {
    this._intensity = 0;
    this._noeticQuality = 0;
    this._transiency = 0.5;
    this._passivity = 0.5;
    this._ineffabilityDepth = 0;
    this._history = [];
  }

  get intensity(): number { return this._intensity; }
  get noeticQuality(): number { return this._noeticQuality; }
  get transiency(): number { return this._transiency; }
  get passivity(): number { return this._passivity; }
  get ineffabilityDepth(): number { return this._ineffabilityDepth; }

  public measureIntensity(preparation: number, grace: number): number {
    const intense = preparation * grace;
    this._intensity = Math.tanh(intense);
    this._recordState();
    return this._intensity;
  }

  public assessNoeticQuality(insightDepth: number, certitude: number): number {
    const noetic = insightDepth * certitude;
    this._noeticQuality = Math.tanh(noetic);
    this._recordState();
    return this._noeticQuality;
  }

  public timeTransient(duration: number, memoryHalfLife: number): number {
    const transient = Math.exp(-duration / (memoryHalfLife + 0.01));
    this._transiency = transient;
    this._recordState();
    return transient;
  }

  public gaugePassivity(egoEffort: number, divineAgency: number): number {
    const passive = divineAgency / (egoEffort + divineAgency + 0.01);
    this._passivity = passive;
    this._recordState();
    return passive;
  }

  public quantifyIneffability(verbalApproximations: number[], targetExperience: number): number {
    let bestFit = Infinity;
    for (const approx of verbalApproximations) {
      const fit = Math.abs(approx - targetExperience);
      if (fit < bestFit) bestFit = fit;
    }
    const ineffability = 1 / (1 + bestFit);
    this._ineffabilityDepth = ineffability;
    this._recordState();
    return ineffability;
  }

  public jamesianMarkers(preparation: number, culmination: number, fruit: number): number {
    const markers = (preparation + culmination + fruit) / 3;
    return markers;
  }

  public perennialPhilosophyAlignment(traditions: number[], currentExperience: number): number {
    const avgTradition = traditions.reduce((a, b) => a + b, 0) / traditions.length;
    const alignment = 1 - Math.abs(currentExperience - avgTradition);
    return alignment;
  }

  public transformativeAfterglow(initialImpact: number, integrationRate: number, weeks: number): number[] {
    const afterglow: number[] = [];
    for (let w = 0; w < weeks; w++) {
      afterglow.push(initialImpact * Math.exp(-w / (integrationRate + 0.01)));
    }
    return afterglow;
  }

  public egoDissolutionIndex(preSelf: number[], postSelf: number[]): number {
    if (preSelf.length !== postSelf.length) return 0;
    let diff = 0;
    for (let i = 0; i < preSelf.length; i++) {
      diff += Math.abs(preSelf[i] - postSelf[i]);
    }
    const dissolution = diff / preSelf.length;
    return dissolution;
  }

  public oceanicFeelingBoundaries(boundaryStrengths: number[]): number {
    const avgBoundary = boundaryStrengths.reduce((a, b) => a + b, 0) / boundaryStrengths.length;
    const oceanic = 1 - avgBoundary;
    return oceanic;
  }

  public numinousTremor(majesty: number, energy: number): number {
    const tremor = majesty * energy;
    return tremor;
  }

  public mysticalStateTaxonomy(features: number[], centroids: number[][]): number {
    let bestDist = Infinity;
    for (const c of centroids) {
      let dist = 0;
      for (let i = 0; i < features.length; i++) {
        dist += Math.pow(features[i] - c[i], 2);
      }
      if (dist < bestDist) bestDist = dist;
    }
    return Math.sqrt(bestDist);
  }

  public reset(): void {
    this._intensity = 0;
    this._noeticQuality = 0;
    this._transiency = 0.5;
    this._passivity = 0.5;
    this._ineffabilityDepth = 0;
    this._history = [];
  }

  private _recordState(): void {
    this._history.push({
      intensity: this._intensity,
      noeticQuality: this._noeticQuality,
      transiency: this._transiency,
      passivity: this._passivity,
      ineffabilityDepth: this._ineffabilityDepth
    });
  }

  public getHistory(): ExperienceState[] {
    return this._history;
  }
}

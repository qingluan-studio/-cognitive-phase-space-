export interface DistanceState {
  temporalGap: number;
  spatialSeparation: number;
  emotionalRemove: number;
  functionalDetachment: number;
  psychicPurity: number;
}

export class AestheticDistance {
  private _temporalGap: number;
  private _spatialSeparation: number;
  private _emotionalRemove: number;
  private _functionalDetachment: number;
  private _psychicPurity: number;
  private _history: DistanceState[];

  constructor() {
    this._temporalGap = 0;
    this._spatialSeparation = 0;
    this._emotionalRemove = 0.5;
    this._functionalDetachment = 0.5;
    this._psychicPurity = 0.5;
    this._history = [];
  }

  get temporalGap(): number { return this._temporalGap; }
  get spatialSeparation(): number { return this._spatialSeparation; }
  get emotionalRemove(): number { return this._emotionalRemove; }
  get functionalDetachment(): number { return this._functionalDetachment; }
  get psychicPurity(): number { return this._psychicPurity; }

  public stretchTemporalDistance(yearsElapsed: number, culturalDecay: number): number {
    const gap = yearsElapsed * (1 + culturalDecay);
    this._temporalGap = gap;
    this._recordState();
    return gap;
  }

  public measureSpatialSeparation(viewerPosition: [number, number], objectPosition: [number, number]): number {
    const dx = objectPosition[0] - viewerPosition[0];
    const dy = objectPosition[1] - viewerPosition[1];
    const dist = Math.sqrt(dx * dx + dy * dy);
    this._spatialSeparation = dist;
    this._recordState();
    return dist;
  }

  public cultivateEmotionalRemove(personalStake: number, empathyLevel: number): number {
    const remove = 1 - (personalStake * empathyLevel);
    this._emotionalRemove = Math.max(0, Math.min(1, remove));
    this._recordState();
    return this._emotionalRemove;
  }

  public detachFromFunction(utilityValue: number, contemplationDepth: number): number {
    const detachment = 1 - utilityValue * Math.exp(-contemplationDepth);
    this._functionalDetachment = Math.max(0, detachment);
    this._recordState();
    return this._functionalDetachment;
  }

  public calculatePsychicPurity(desireInterference: number, practicalConcern: number): number {
    const purity = 1 - (desireInterference + practicalConcern) / 2;
    this._psychicPurity = Math.max(0, purity);
    this._recordState();
    return this._psychicPurity;
  }

  public optimalDistance(objectSize: number, detailLevel: number): number {
    const optimal = objectSize / (2 * Math.tan(detailLevel / 2));
    return optimal;
  }

  public perspectiveDistortion(actualDistance: number, focalLength: number): number {
    const distortion = actualDistance / (actualDistance + focalLength);
    return distortion;
  }

  public frameIsolation(totalScene: number, framedScene: number): number {
    const isolation = framedScene / (totalScene + 0.0001);
    return isolation;
  }

  public defamiliarizationIndex(familiarity: number, alterationDegree: number): number {
    const defamiliarized = (1 - familiarity) * alterationDegree;
    return defamiliarized;
  }

  public voyeuristicTension(observedIntensity: number, observerSafety: number): number {
    const tension = observedIntensity * (1 - observerSafety);
    return Math.min(1, tension);
  }

  public historicalAura(originalContext: number, presentContext: number, timeElapsed: number): number {
    const aura = originalContext * (1 - presentContext / (originalContext + 0.0001)) * Math.log(1 + timeElapsed);
    return aura;
  }

  public overDistanceDecay(appreciation: number, distance: number, optimal: number): number {
    const decay = appreciation * Math.exp(-Math.pow(distance - optimal, 2) / (2 * optimal * optimal));
    return decay;
  }

  public reset(): void {
    this._temporalGap = 0;
    this._spatialSeparation = 0;
    this._emotionalRemove = 0.5;
    this._functionalDetachment = 0.5;
    this._psychicPurity = 0.5;
    this._history = [];
  }

  private _recordState(): void {
    this._history.push({
      temporalGap: this._temporalGap,
      spatialSeparation: this._spatialSeparation,
      emotionalRemove: this._emotionalRemove,
      functionalDetachment: this._functionalDetachment,
      psychicPurity: this._psychicPurity
    });
  }

  public getHistory(): DistanceState[] {
    return this._history;
  }
}

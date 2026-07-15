export interface SublimeState {
  magnitude: number;
  terrorCoefficient: number;
  pleasureIndex: number;
  horizonDistance: number;
  elevationRecord: number[];
}

export class SublimeHorizon {
  private _magnitude: number;
  private _terrorCoefficient: number;
  private _pleasureIndex: number;
  private _horizonDistance: number;
  private _elevationRecord: number[];
  private _history: SublimeState[];

  constructor() {
    this._magnitude = 1.0;
    this._terrorCoefficient = 0.5;
    this._pleasureIndex = 0.5;
    this._horizonDistance = 100.0;
    this._elevationRecord = [];
    this._history = [];
  }

  get magnitude(): number { return this._magnitude; }
  get terrorCoefficient(): number { return this._terrorCoefficient; }
  get pleasureIndex(): number { return this._pleasureIndex; }
  get horizonDistance(): number { return this._horizonDistance; }

  public elevateObserver(delta: number): void {
    const newElevation = (this._elevationRecord.length > 0 ? this._elevationRecord[this._elevationRecord.length - 1] : 0) + delta;
    this._elevationRecord.push(newElevation);
    const attenuation = Math.exp(-newElevation / (this._horizonDistance * 0.5));
    this._magnitude = Math.min(this._magnitude * (1 + delta * 0.01), 1000.0) * attenuation;
    this._recordState();
  }

  public calculateVastness(volume: number, observerCapacity: number): number {
    const rawVastness = volume / observerCapacity;
    const boundedVastness = rawVastness / (1 + rawVastness);
    return boundedVastness;
  }

  public measureTerror(threatLevel: number, safetyMargin: number): number {
    const effectiveThreat = Math.max(0, threatLevel - safetyMargin);
    this._terrorCoefficient = Math.tanh(effectiveThreat / 10.0);
    this._recalculatePleasure();
    this._recordState();
    return this._terrorCoefficient;
  }

  private _recalculatePleasure(): void {
    this._pleasureIndex = this._terrorCoefficient * (1 - this._terrorCoefficient);
    if (this._pleasureIndex < 0) this._pleasureIndex = 0;
  }

  public resonantFrequency(baseFreq: number, overtoneSeries: number[]): number {
    let resonance = baseFreq;
    for (const overtone of overtoneSeries) {
      resonance += baseFreq * overtone / Math.pow(overtone + 1, 2);
    }
    return resonance;
  }

  public perspectiveCompression(depthLayers: number[]): number {
    let compressed = 0;
    for (let i = 0; i < depthLayers.length; i++) {
      compressed += depthLayers[i] * Math.pow(0.618, i);
    }
    return compressed;
  }

  public infinitySymbolConvergence(iterations: number): number {
    let sum = 0;
    for (let n = 1; n <= iterations; n++) {
      sum += 1 / (n * n);
    }
    return sum * 6 / (Math.PI * Math.PI);
  }

  public atmosphericRefraction(angle: number, densityGradient: number): number {
    const refracted = angle + densityGradient * Math.sin(angle);
    return refracted % (Math.PI / 2);
  }

  public measureAnxietyResolution(unresolvedTension: number, resolvedTension: number): number {
    if (unresolvedTension + resolvedTension === 0) return 0;
    return resolvedTension / (unresolvedTension + resolvedTension);
  }

  public simulateStormApproach(initialDistance: number, velocity: number, timeSteps: number): number[] {
    const magnitudes: number[] = [];
    for (let t = 0; t < timeSteps; t++) {
      const distance = Math.max(0, initialDistance - velocity * t);
      const m = 100 / (1 + distance * 0.1);
      magnitudes.push(m);
    }
    this._magnitude = magnitudes[magnitudes.length - 1];
    this._recordState();
    return magnitudes;
  }

  public horizonDilation(baseHorizon: number, observerHeight: number): number {
    const dilation = baseHorizon * Math.sqrt(2 * observerHeight / 6371000);
    this._horizonDistance = dilation;
    this._recordState();
    return dilation;
  }

  public reset(): void {
    this._magnitude = 1.0;
    this._terrorCoefficient = 0.5;
    this._pleasureIndex = 0.5;
    this._horizonDistance = 100.0;
    this._elevationRecord = [];
    this._history = [];
  }

  private _recordState(): void {
    this._history.push({
      magnitude: this._magnitude,
      terrorCoefficient: this._terrorCoefficient,
      pleasureIndex: this._pleasureIndex,
      horizonDistance: this._horizonDistance,
      elevationRecord: [...this._elevationRecord]
    });
  }

  public getHistory(): SublimeState[] {
    return this._history;
  }
}

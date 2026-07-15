export interface RaptureState {
  elevationMagnitude: number;
  swoonDepth: number;
  divineIntoxication: number;
  wingspan: number;
  gravityDefiance: number;
}

export class EcstaticRapture {
  private _elevationMagnitude: number;
  private _swoonDepth: number;
  private _divineIntoxication: number;
  private _wingspan: number;
  private _gravityDefiance: number;
  private _history: RaptureState[];

  constructor() {
    this._elevationMagnitude = 0;
    this._swoonDepth = 0;
    this._divineIntoxication = 0;
    this._wingspan = 1.0;
    this._gravityDefiance = 0;
    this._history = [];
  }

  get elevationMagnitude(): number { return this._elevationMagnitude; }
  get swoonDepth(): number { return this._swoonDepth; }
  get divineIntoxication(): number { return this._divineIntoxication; }
  get wingspan(): number { return this._wingspan; }
  get gravityDefiance(): number { return this._gravityDefiance; }

  public soarToHeights(baseElevation: number, divineWind: number): number {
    const elevation = baseElevation + divineWind * 100;
    this._elevationMagnitude = elevation;
    this._recordState();
    return elevation;
  }

  public swoonIntoAbyss(surrenderFactor: number, trustLevel: number): number {
    const swoon = surrenderFactor * trustLevel;
    this._swoonDepth = Math.tanh(swoon);
    this._recordState();
    return this._swoonDepth;
  }

  public intoxicateWithDivineWine(wineStrength: number, vesselCapacity: number): number {
    const intoxication = wineStrength / (vesselCapacity + 0.01);
    this._divineIntoxication = Math.min(1, intoxication);
    this._recordState();
    return this._divineIntoxication;
  }

  public unfoldWings(devotion: number, courage: number): number {
    const span = devotion * courage;
    this._wingspan = span;
    this._recordState();
    return span;
  }

  public defyGravity(bodyWeight: number, upwardForce: number): number {
    const defiance = upwardForce / (bodyWeight + 0.001);
    this._gravityDefiance = Math.tanh(defiance);
    this._recordState();
    return this._gravityDefiance;
  }

  public rapturePulse(frequency: number, harmonics: number[]): number[] {
    const pulse: number[] = [];
    for (let t = 0; t < 100; t++) {
      let val = 0;
      for (const h of harmonics) {
        val += Math.sin(2 * Math.PI * frequency * h * t / 100) / h;
      }
      pulse.push(val);
    }
    return pulse;
  }

  public burningArrowTrajectory(initialVelocity: number, angle: number, timeSteps: number): [number, number][] {
    const points: [number, number][] = [];
    const g = 9.81 * (1 - this._gravityDefiance);
    for (let t = 0; t < timeSteps; t++) {
      const x = initialVelocity * Math.cos(angle) * t;
      const y = initialVelocity * Math.sin(angle) * t - 0.5 * g * t * t;
      points.push([x, Math.max(0, y)]);
    }
    return points;
  }

  public mothToFlameAttraction(flameIntensity: number, distance: number, sensitivity: number): number {
    const attraction = sensitivity * flameIntensity / (distance * distance + 0.001);
    return attraction;
  }

  public ecstaticTremor(intensity: number, decayRate: number, duration: number): number[] {
    const tremor: number[] = [];
    for (let t = 0; t < duration; t++) {
      tremor.push(intensity * Math.exp(-decayRate * t) * Math.sin(t));
    }
    return tremor;
  }

  public dissolutionVelocity(egoViscosity: number, heat: number): number {
    const velocity = heat / (egoViscosity + 0.001);
    return velocity;
  }

  public celestialMusicScale(baseFreq: number, celestialRatios: number[]): number[] {
    return celestialRatios.map(r => baseFreq * r);
  }

  public overflowCup(capacity: number, inflowRate: number, time: number): number {
    const overflow = Math.max(0, inflowRate * time - capacity);
    return overflow;
  }

  public reset(): void {
    this._elevationMagnitude = 0;
    this._swoonDepth = 0;
    this._divineIntoxication = 0;
    this._wingspan = 1.0;
    this._gravityDefiance = 0;
    this._history = [];
  }

  private _recordState(): void {
    this._history.push({
      elevationMagnitude: this._elevationMagnitude,
      swoonDepth: this._swoonDepth,
      divineIntoxication: this._divineIntoxication,
      wingspan: this._wingspan,
      gravityDefiance: this._gravityDefiance
    });
  }

  public getHistory(): RaptureState[] {
    return this._history;
  }
}

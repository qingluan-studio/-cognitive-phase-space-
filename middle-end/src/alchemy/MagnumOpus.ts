export interface OpusState {
  stageProgression: number;
  philosopherMercury: number;
  vesselIntegrity: number;
  fireIntensity: number;
  secretFire: number;
}

export class MagnumOpus {
  private _stageProgression: number;
  private _philosopherMercury: number;
  private _vesselIntegrity: number;
  private _fireIntensity: number;
  private _secretFire: number;
  private _history: OpusState[];

  constructor() {
    this._stageProgression = 0;
    this._philosopherMercury = 0;
    this._vesselIntegrity = 1.0;
    this._fireIntensity = 0;
    this._secretFire = 0.1;
    this._history = [];
  }

  get stageProgression(): number { return this._stageProgression; }
  get philosopherMercury(): number { return this._philosopherMercury; }
  get vesselIntegrity(): number { return this._vesselIntegrity; }
  get fireIntensity(): number { return this._fireIntensity; }
  get secretFire(): number { return this._secretFire; }

  public calcinateMatter(rawMaterial: number, heat: number): number {
    const calcined = rawMaterial * (1 - Math.exp(-heat / 100));
    this._stageProgression = Math.min(this._stageProgression + calcined * 0.1, 1.0);
    this._recordState();
    return calcined;
  }

  public distillEssence(impureMixture: number, purityThreshold: number): number {
    let distilled = impureMixture;
    let purity = 0;
    while (purity < purityThreshold && distilled > 0.01) {
      distilled *= 0.9;
      purity += 0.05;
    }
    this._philosopherMercury = purity;
    this._recordState();
    return distilled;
  }

  public sealVesselHermetically(pressure: number, sealQuality: number): number {
    const integrity = sealQuality * (1 - pressure * 0.01);
    this._vesselIntegrity = Math.max(0, integrity);
    this._recordState();
    return this._vesselIntegrity;
  }

  public regulateFireGradient(baseTemp: number, targetTemp: number, steps: number): number[] {
    const gradient: number[] = [];
    for (let i = 0; i < steps; i++) {
      const t = baseTemp + (targetTemp - baseTemp) * (i / steps);
      gradient.push(t);
    }
    this._fireIntensity = gradient[gradient.length - 1];
    this._recordState();
    return gradient;
  }

  public igniteSecretFire(latentHeat: number, friction: number): number {
    const fire = latentHeat * friction;
    this._secretFire = Math.min(1, this._secretFire + fire * 0.05);
    this._recordState();
    return this._secretFire;
  }

  public fermentGold(pureGold: number, philosopherStoneDust: number, time: number): number {
    const multiplier = 1 + philosopherStoneDust * Math.log(1 + time);
    return pureGold * multiplier;
  }

  public projectionCapacity(stonePurity: number, baseMetalMass: number): number {
    const projected = stonePurity * baseMetalMass * 100;
    return projected;
  }

  public rotationOfElements(elements: number[], rotations: number): number[] {
    const rotated = [...elements];
    for (let r = 0; r < rotations; r++) {
      const last = rotated.pop()!;
      rotated.unshift(last);
    }
    return rotated;
  }

  public sublimationCurve(temperature: number[], vaporPressure: number[]): number[] {
    const curve: number[] = [];
    for (let i = 0; i < temperature.length; i++) {
      curve.push(vaporPressure[i] * Math.exp(-1000 / (temperature[i] + 273.15)));
    }
    return curve;
  }

  public peacockTailSpectrum(mineralImpurities: number[]): number[] {
    return mineralImpurities.map(imp => Math.sin(imp * Math.PI) * 0.5 + 0.5);
  }

  public fixationOfVolatile(volatileComponent: number, earthComponent: number): number {
    const fixed = volatileComponent * earthComponent / (volatileComponent + earthComponent + 0.01);
    return fixed;
  }

  public multiplicationOfStone(originalStone: number, iterations: number): number {
    let stone = originalStone;
    for (let i = 0; i < iterations; i++) {
      stone *= 1.618;
    }
    return stone;
  }

  public reset(): void {
    this._stageProgression = 0;
    this._philosopherMercury = 0;
    this._vesselIntegrity = 1.0;
    this._fireIntensity = 0;
    this._secretFire = 0.1;
    this._history = [];
  }

  private _recordState(): void {
    this._history.push({
      stageProgression: this._stageProgression,
      philosopherMercury: this._philosopherMercury,
      vesselIntegrity: this._vesselIntegrity,
      fireIntensity: this._fireIntensity,
      secretFire: this._secretFire
    });
  }

  public getHistory(): OpusState[] {
    return this._history;
  }
}

export interface HaloProfile {
  radius: number;
  density: number;
  velocity: number;
  enclosedMass: number;
}

export interface NFWParameters {
  rs: number;
  rhoS: number;
  c: number;
  rVir: number;
}

export class DarkMatterHalo {
  private _scaleRadius: number;
  private _characteristicDensity: number;
  private _concentration: number;
  private _virialRadius: number;
  private _virialMass: number;
  private _velocityDispersion: number;
  private _spinParameter: number;
  private _profile: HaloProfile[];
  private _history: NFWParameters[];
  private _gravitationalConstant: number;
  private _hubbleParameter: number;

  constructor(virialMass: number = 1e12) {
    this._virialMass = virialMass;
    this._concentration = 10;
    this._virialRadius = this._computeVirialRadius();
    this._scaleRadius = this._virialRadius / this._concentration;
    this._characteristicDensity = this._computeCharacteristicDensity();
    this._velocityDispersion = this._computeVelocityDispersion();
    this._spinParameter = 0.04;
    this._profile = [];
    this._history = [];
    this._gravitationalConstant = 4.3e-6;
    this._hubbleParameter = 70;
  }

  get scaleRadius(): number {
    return this._scaleRadius;
  }

  get virialRadius(): number {
    return this._virialRadius;
  }

  get virialMass(): number {
    return this._virialMass;
  }

  get concentration(): number {
    return this._concentration;
  }

  get velocityDispersion(): number {
    return this._velocityDispersion;
  }

  private _computeVirialRadius(): number {
    const G = this._gravitationalConstant;
    const H = this._hubbleParameter;
    const M = this._virialMass;
    const deltaC = 200;
    return Math.pow((3 * M) / (4 * Math.PI * deltaC * (3 * H * H) / (8 * Math.PI * G)), 1 / 3);
  }

  private _computeCharacteristicDensity(): number {
    const c = this._concentration;
    const deltaC = (200 / 3) * (c * c * c) / (Math.log(1 + c) - c / (1 + c));
    const rhoCrit = (3 * this._hubbleParameter * this._hubbleParameter) / (8 * Math.PI * this._gravitationalConstant);
    return deltaC * rhoCrit;
  }

  private _computeVelocityDispersion(): number {
    const G = this._gravitationalConstant;
    const M = this._virialMass;
    const R = this._virialRadius;
    return Math.sqrt((G * M) / (2 * R));
  }

  public densityProfile(r: number): number {
    const rs = this._scaleRadius;
    const rhoS = this._characteristicDensity;
    const x = r / rs;
    return rhoS / (x * Math.pow(1 + x, 2));
  }

  public enclosedMass(r: number): number {
    const rs = this._scaleRadius;
    const rhoS = this._characteristicDensity;
    const c = this._concentration;
    const x = r / rs;
    const factor = Math.log(1 + x) - x / (1 + x);
    const totalFactor = Math.log(1 + c) - c / (1 + c);
    return this._virialMass * (factor / totalFactor);
  }

  public circularVelocity(r: number): number {
    const M = this.enclosedMass(r);
    return Math.sqrt((this._gravitationalConstant * M) / r);
  }

  public escapeVelocity(r: number): number {
    const M = this.enclosedMass(r);
    return Math.sqrt((2 * this._gravitationalConstant * M) / r);
  }

  public generateProfile(numPoints: number = 100): HaloProfile[] {
    const profile: HaloProfile[] = [];
    const rMax = this._virialRadius * 2;
    for (let i = 1; i <= numPoints; i++) {
      const r = (i / numPoints) * rMax;
      profile.push({
        radius: r,
        density: this.densityProfile(r),
        velocity: this.circularVelocity(r),
        enclosedMass: this.enclosedMass(r),
      });
    }
    this._profile = profile;
    return profile;
  }

  public computeSpinParameter(): number {
    const G = this._gravitationalConstant;
    const M = this._virialMass;
    const R = this._virialRadius;
    const J = this._spinParameter * M * Math.sqrt(G * M * R);
    return J / (M * Math.sqrt(G * M * R));
  }

  public setConcentration(c: number): void {
    this._concentration = Math.max(1, c);
    this._scaleRadius = this._virialRadius / this._concentration;
    this._characteristicDensity = this._computeCharacteristicDensity();
  }

  public setVirialMass(mass: number): void {
    this._virialMass = Math.max(1e6, mass);
    this._virialRadius = this._computeVirialRadius();
    this._scaleRadius = this._virialRadius / this._concentration;
    this._characteristicDensity = this._computeCharacteristicDensity();
    this._velocityDispersion = this._computeVelocityDispersion();
  }

  public computeTidalRadius(hostMass: number, pericenter: number): number {
    const satelliteMass = this._virialMass;
    const G = this._gravitationalConstant;
    const M = hostMass;
    const r = pericenter;
    return r * Math.pow(satelliteMass / (3 * M), 1 / 3);
  }

  public computeSubhaloMassFunction(dn: number, dM: number): number {
    const alpha = 1.9;
    const M = this._virialMass;
    return (dn / dM) * Math.pow(M, -alpha);
  }

  public computeVelocityAnisotropy(r: number): number {
    const rs = this._scaleRadius;
    const beta = r / (r + rs);
    return beta;
  }

  public getNFWParameters(): NFWParameters {
    return {
      rs: this._scaleRadius,
      rhoS: this._characteristicDensity,
      c: this._concentration,
      rVir: this._virialRadius,
    };
  }

  public getProfile(): HaloProfile[] {
    return this._profile.map(p => ({ ...p }));
  }

  public getHistory(): NFWParameters[] {
    return this._history.map(h => ({ ...h }));
  }

  public recordParameters(): void {
    this._history.push(this.getNFWParameters());
    if (this._history.length > 200) this._history.shift();
  }

  public computeSurfaceDensity(R: number): number {
    const rs = this._scaleRadius;
    const rhoS = this._characteristicDensity;
    const x = R / rs;
    if (x < 1) {
      const factor = 1 / (x * x - 1) * (1 - Math.acosh(1 / x) / Math.sqrt(1 - x * x));
      return 2 * rs * rhoS * factor;
    } else if (x > 1) {
      const factor = 1 / (x * x - 1) * (1 - Math.acos(1 / x) / Math.sqrt(x * x - 1));
      return 2 * rs * rhoS * factor;
    }
    return (2 / 3) * rs * rhoS;
  }

  public reset(): void {
    this._virialMass = 1e12;
    this._concentration = 10;
    this._virialRadius = this._computeVirialRadius();
    this._scaleRadius = this._virialRadius / this._concentration;
    this._characteristicDensity = this._computeCharacteristicDensity();
    this._velocityDispersion = this._computeVelocityDispersion();
    this._spinParameter = 0.04;
    this._profile = [];
    this._history = [];
  }
}

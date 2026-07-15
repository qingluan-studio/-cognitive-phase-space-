export interface SingularityState {
  scaleFactor: number;
  energyDensity: number;
  temperature: number;
  curvature: number;
  timeSinceBang: number;
}

export interface BigBangData {
  initialEntropy: number;
  horizonProblem: number;
  flatnessParameter: number;
  hubbleParameter: number;
}

export class BigBangSingularity {
  private _scaleFactor: number;
  private _energyDensity: number;
  private _temperature: number;
  private _curvature: number;
  private _timeSinceBang: number;
  private _initialEntropy: number;
  private _horizonProblem: number;
  private _flatnessParameter: number;
  private _hubbleParameter: number;
  private _radiationDensity: number;
  private _matterDensity: number;
  private _history: SingularityState[];
  private _gravitationalConstant: number;
  private _speedOfLight: number;

  constructor() {
    this._scaleFactor = 1e-35;
    this._energyDensity = 1e96;
    this._temperature = 1e32;
    this._curvature = 0;
    this._timeSinceBang = 1e-43;
    this._initialEntropy = 1e88;
    this._horizonProblem = 1e28;
    this._flatnessParameter = 1;
    this._hubbleParameter = 1e43;
    this._radiationDensity = 0.5;
    this._matterDensity = 0.5;
    this._history = [];
    this._gravitationalConstant = 6.674e-11;
    this._speedOfLight = 299792458;
  }

  get scaleFactor(): number {
    return this._scaleFactor;
  }

  get energyDensity(): number {
    return this._energyDensity;
  }

  get temperature(): number {
    return this._temperature;
  }

  get hubbleParameter(): number {
    return this._hubbleParameter;
  }

  get flatnessParameter(): number {
    return this._flatnessParameter;
  }

  private _computeFriedmannEquation(): number {
    const rho = this._energyDensity;
    const G = this._gravitationalConstant;
    const c = this._speedOfLight;
    const H = Math.sqrt((8 * Math.PI * G * rho) / (3 * c * c));
    return H;
  }

  public evolveScaleFactor(dt: number): number {
    const H = this._hubbleParameter;
    this._scaleFactor += H * this._scaleFactor * dt;
    this._energyDensity *= Math.pow(this._scaleFactor / (this._scaleFactor + H * this._scaleFactor * dt), 4);
    this._temperature *= Math.pow(this._scaleFactor / (this._scaleFactor + H * this._scaleFactor * dt), 1);
    this._timeSinceBang += dt;
    this._hubbleParameter = this._computeFriedmannEquation();
    this._updateFlatness();
    this._recordState();
    return this._scaleFactor;
  }

  private _updateFlatness(): void {
    const omega = this._energyDensity / this._criticalDensity();
    this._flatnessParameter = Math.abs(1 - omega);
  }

  private _criticalDensity(): number {
    const c = this._speedOfLight;
    const H = this._hubbleParameter;
    return (3 * H * H) / (8 * Math.PI * this._gravitationalConstant / (c * c));
  }

  public computeHorizonDistance(): number {
    const c = this._speedOfLight;
    const a = this._scaleFactor;
    const H = this._hubbleParameter;
    return (c / H) * a;
  }

  public computeParticleHorizon(): number {
    const c = this._speedOfLight;
    const a = this._scaleFactor;
    const integral = c * this._timeSinceBang / a;
    return integral * a;
  }

  public computeEntropyDensity(): number {
    const gStar = 100;
    const T = this._temperature;
    const kB = 1.38e-23;
    const hbar = 1.055e-34;
    const c = this._speedOfLight;
    return gStar * (2 * Math.PI * Math.PI / 45) * Math.pow(kB * T / (hbar * c), 3) * kB;
  }

  public solveFlatnessProblem(inflationEfolds: number): number {
    const reduction = Math.exp(-2 * inflationEfolds);
    this._flatnessParameter *= reduction;
    this._horizonProblem *= reduction;
    return this._flatnessParameter;
  }

  public computeNucleosynthesisTemperature(): number {
    return 1e9;
  }

  public computeRecombinationTemperature(): number {
    return 3000;
  }

  public computePhotonEnergyDensity(): number {
    const a = 7.5657e-16;
    return a * Math.pow(this._temperature, 4);
  }

  public computeNeutrinoTemperature(): number {
    return this._temperature * Math.pow(4 / 11, 1 / 3);
  }

  public tickCosmicTime(dt: number): SingularityState {
    this.evolveScaleFactor(dt);
    this._radiationDensity = this.computePhotonEnergyDensity() / this._energyDensity;
    this._matterDensity = 1 - this._radiationDensity;
    return this.getCurrentState();
  }

  public getCurrentState(): SingularityState {
    return {
      scaleFactor: this._scaleFactor,
      energyDensity: this._energyDensity,
      temperature: this._temperature,
      curvature: this._curvature,
      timeSinceBang: this._timeSinceBang,
    };
  }

  public getHistory(): SingularityState[] {
    return this._history.map(h => ({ ...h }));
  }

  private _recordState(): void {
    this._history.push(this.getCurrentState());
    if (this._history.length > 200) this._history.shift();
  }

  public computeAgeOfUniverse(): number {
    const H0 = 70;
    const omegaM = 0.3;
    const omegaL = 0.7;
    const integrand = (z: number) => 1 / Math.sqrt(omegaM * Math.pow(1 + z, 3) + omegaL);
    let age = 0;
    const steps = 1000;
    const zMax = 10000;
    for (let i = 0; i < steps; i++) {
      const z = (i / steps) * zMax;
      const dz = zMax / steps;
      age += integrand(z) * dz;
    }
    return age / H0;
  }

  public computeDecelerationParameter(): number {
    const omegaM = this._matterDensity;
    const omegaR = this._radiationDensity;
    const omegaL = 1 - omegaM - omegaR;
    return 0.5 * omegaM + omegaR - omegaL;
  }

  public reset(): void {
    this._scaleFactor = 1e-35;
    this._energyDensity = 1e96;
    this._temperature = 1e32;
    this._curvature = 0;
    this._timeSinceBang = 1e-43;
    this._initialEntropy = 1e88;
    this._horizonProblem = 1e28;
    this._flatnessParameter = 1;
    this._hubbleParameter = 1e43;
    this._radiationDensity = 0.5;
    this._matterDensity = 0.5;
    this._history = [];
  }
}

export interface VacuumState {
  energyDensity: number;
  pressure: number;
  cosmologicalConstant: number;
  quantumCorrection: number;
}

export interface LambdaHistory {
  epoch: string;
  lambdaValue: number;
  dominationTime: number;
}

export class CosmologicalConstant {
  private _lambda: number;
  private _vacuumEnergyDensity: number;
  private _pressure: number;
  private _quantumCorrection: number;
  private _cutoffScale: number;
  private _fineTuning: number;
  private _history: LambdaHistory[];
  private _hubbleConstant: number;
  private _gravitationConstant: number;
  private _speedOfLight: number;
  private _vacuumFluctuations: number;

  constructor() {
    this._lambda = 1.11e-52;
    this._vacuumEnergyDensity = 5.96e-27;
    this._pressure = -this._vacuumEnergyDensity;
    this._quantumCorrection = 0;
    this._cutoffScale = 1e19;
    this._fineTuning = 1e-120;
    this._history = [];
    this._hubbleConstant = 70;
    this._gravitationConstant = 6.674e-11;
    this._speedOfLight = 299792458;
    this._vacuumFluctuations = 0;
  }

  get lambda(): number {
    return this._lambda;
  }

  get vacuumEnergyDensity(): number {
    return this._vacuumEnergyDensity;
  }

  get pressure(): number {
    return this._pressure;
  }

  get fineTuning(): number {
    return this._fineTuning;
  }

  get quantumCorrection(): number {
    return this._quantumCorrection;
  }

  public computeFromObservation(hubbleConstant: number, omegaLambda: number): number {
    const c = this._speedOfLight;
    const H = hubbleConstant * 1000 / (3.086e22);
    const rhoLambda = (3 * H * H * omegaLambda) / (8 * Math.PI * this._gravitationConstant);
    const lambda = (8 * Math.PI * this._gravitationConstant * rhoLambda) / (c * c);
    this._lambda = lambda;
    this._vacuumEnergyDensity = rhoLambda;
    this._pressure = -rhoLambda * c * c;
    return lambda;
  }

  public computeQuantumVacuumEnergy(cutoff: number): number {
    const hbar = 1.055e-34;
    const c = this._speedOfLight;
    const kMax = cutoff;
    const rho = (hbar * Math.pow(kMax, 4)) / (16 * Math.PI * Math.PI * c);
    this._quantumCorrection = rho;
    this._vacuumFluctuations = rho;
    return rho;
  }

  public computeFineTuningProblem(): number {
    const rhoObserved = this._vacuumEnergyDensity;
    const rhoQuantum = this.computeQuantumVacuumEnergy(this._cutoffScale);
    this._fineTuning = rhoObserved / rhoQuantum;
    return this._fineTuning;
  }

  public setCosmologicalConstant(lambda: number): void {
    this._lambda = lambda;
    const c = this._speedOfLight;
    this._vacuumEnergyDensity = (this._lambda * c * c) / (8 * Math.PI * this._gravitationConstant);
    this._pressure = -this._vacuumEnergyDensity * c * c;
  }

  public computeCosmicEventHorizon(): number {
    const c = this._speedOfLight;
    const H = this._hubbleConstant * 1000 / (3.086e22);
    return c / H;
  }

  public computeDeSitterTemperature(): number {
    const hbar = 1.055e-34;
    const c = this._speedOfLight;
    const kB = 1.38e-23;
    const H = this._hubbleConstant * 1000 / (3.086e22);
    return (hbar * H) / (2 * Math.PI * kB);
  }

  public computeDeSitterEntropy(): number {
    const c = this._speedOfLight;
    const G = this._gravitationConstant;
    const hbar = 1.055e-34;
    const kB = 1.38e-23;
    const H = this._hubbleConstant * 1000 / (3.086e22);
    const area = 4 * Math.PI * c * c / (H * H);
    return (kB * c * c * c * area) / (4 * G * hbar);
  }

  public computeCoincidenceProblem(matterDensity: number): number {
    return Math.abs(matterDensity - this._vacuumEnergyDensity) / (matterDensity + this._vacuumEnergyDensity);
  }

  public addQuintessenceField(fieldValue: number, potential: number): void {
    const rhoField = 0.5 * fieldValue * fieldValue + potential;
    this._vacuumEnergyDensity += rhoField;
    this._pressure = -rhoField;
    this._lambda = (8 * Math.PI * this._gravitationConstant * this._vacuumEnergyDensity) / (this._speedOfLight * this._speedOfLight);
  }

  public computeWeylCurvature(): number {
    const c = this._speedOfLight;
    const H = this._hubbleConstant * 1000 / (3.086e22);
    return (H * H) / (c * c);
  }

  public getVacuumState(): VacuumState {
    return {
      energyDensity: this._vacuumEnergyDensity,
      pressure: this._pressure,
      cosmologicalConstant: this._lambda,
      quantumCorrection: this._quantumCorrection,
    };
  }

  public recordEpoch(epoch: string, dominationTime: number): void {
    this._history.push({
      epoch,
      lambdaValue: this._lambda,
      dominationTime,
    });
    if (this._history.length > 200) this._history.shift();
  }

  public getHistory(): LambdaHistory[] {
    return this._history.map(h => ({ ...h }));
  }

  public computeVacuumStability(): boolean {
    return this._vacuumEnergyDensity >= 0;
  }

  public computeDarkEnergyEquationOfState(): number {
    return this._pressure / (this._vacuumEnergyDensity * this._speedOfLight * this._speedOfLight);
  }

  public setCutoffScale(scale: number): void {
    this._cutoffScale = scale;
  }

  public computeBackReactionCorrection(perturbation: number): number {
    return this._lambda * (1 + perturbation);
  }

  public reset(): void {
    this._lambda = 1.11e-52;
    this._vacuumEnergyDensity = 5.96e-27;
    this._pressure = -this._vacuumEnergyDensity;
    this._quantumCorrection = 0;
    this._cutoffScale = 1e19;
    this._fineTuning = 1e-120;
    this._history = [];
    this._vacuumFluctuations = 0;
  }
}

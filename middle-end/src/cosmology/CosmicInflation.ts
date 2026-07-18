export interface InflatonField {
  value: number;
  velocity: number;
  potential: number;
}

export interface InflationRecord {
  eFolds: number;
  scalarPerturbation: number;
  tensorToScalarRatio: number;
  reheatingTemp: number;
}

export class CosmicInflation {
  private _fieldValue: number;
  private _fieldVelocity: number;
  private _potentialEnergy: number;
  private _mass: number;
  private _eFolds: number;
  private _slowRollEpsilon: number;
  private _slowRollEta: number;
  private _scalarPerturbation: number;
  private _tensorToScalarRatio: number;
  private _reheatingTemperature: number;
  private _history: InflationRecord[];
  private _planckMass: number;
  private _coupling: number;

  constructor() {
    this._fieldValue = 5.0;
    this._fieldVelocity = 0;
    this._mass = 1e-6;
    this._potentialEnergy = this._computePotential();
    this._eFolds = 0;
    this._slowRollEpsilon = 0;
    this._slowRollEta = 0;
    this._scalarPerturbation = 1e-5;
    this._tensorToScalarRatio = 0.01;
    this._reheatingTemperature = 1e15;
    this._history = [];
    this._planckMass = 1.22e19;
    this._coupling = 0.01;
  }

  get fieldValue(): number {
    return this._fieldValue;
  }

  get eFolds(): number {
    return this._eFolds;
  }

  get slowRollEpsilon(): number {
    return this._slowRollEpsilon;
  }

  get scalarPerturbation(): number {
    return this._scalarPerturbation;
  }

  get tensorToScalarRatio(): number {
    return this._tensorToScalarRatio;
  }

  private _computePotential(): number {
    const phi = this._fieldValue;
    const m = this._mass;
    return 0.5 * m * m * phi * phi;
  }

  private _computePotentialDerivative(): number {
    const phi = this._fieldValue;
    const m = this._mass;
    return m * m * phi;
  }

  private _computePotentialSecondDerivative(): number {
    return this._mass * this._mass;
  }

  public computeSlowRollParameters(): { epsilon: number; eta: number } {
    const V = this._potentialEnergy;
    const Vd = this._computePotentialDerivative();
    const Vdd = this._computePotentialSecondDerivative();
    const Mp = this._planckMass;
    const epsilon = (Mp * Mp / (16 * Math.PI)) * Math.pow(Vd / V, 2);
    const eta = (Mp * Mp / (8 * Math.PI)) * (Vdd / V);
    this._slowRollEpsilon = epsilon;
    this._slowRollEta = eta;
    return { epsilon, eta };
  }

  public evolveField(dt: number): void {
    const Vd = this._computePotentialDerivative();
    const H = this._computeHubbleParameter();
    const friction = 3 * H * this._fieldVelocity;
    const acceleration = -Vd - friction;
    this._fieldVelocity += acceleration * dt;
    this._fieldValue += this._fieldVelocity * dt;
    this._potentialEnergy = this._computePotential();
    const dN = H * dt;
    this._eFolds += dN;
    this.computeSlowRollParameters();
    this._computePerturbations(H);
  }

  private _computeHubbleParameter(): number {
    const V = this._potentialEnergy;
    const Mp = this._planckMass;
    return Math.sqrt((8 * Math.PI * V) / (3 * Mp * Mp));
  }

  private _computePerturbations(H: number): void {
    const epsilon = this._slowRollEpsilon;
    const Mp = this._planckMass;
    this._scalarPerturbation = (H / (2 * Math.PI * Mp)) / Math.sqrt(epsilon + 1e-10);
    this._tensorToScalarRatio = 16 * epsilon;
  }

  public runInflation(targetEFolds: number): InflationRecord {
    while (this._eFolds < targetEFolds && this._slowRollEpsilon < 1) {
      this.evolveField(1e-3);
    }
    const record: InflationRecord = {
      eFolds: this._eFolds,
      scalarPerturbation: this._scalarPerturbation,
      tensorToScalarRatio: this._tensorToScalarRatio,
      reheatingTemp: this._reheatingTemperature,
    };
    this._history.push(record);
    if (this._history.length > 200) this._history.shift();
    return record;
  }

  public computeReheatingTemperature(): number {
    const Vend = this._potentialEnergy;
    const kB = 1.38e-23;
    return Math.pow(Vend, 0.25) / Math.sqrt(kB);
  }

  public computeSpectralIndex(): number {
    const { epsilon, eta } = this.computeSlowRollParameters();
    return 1 - 6 * epsilon + 2 * eta;
  }

  public computeRunningOfSpectralIndex(): number {
    const { epsilon, eta } = this.computeSlowRollParameters();
    return -24 * epsilon * epsilon + 8 * epsilon * eta;
  }

  public computeNumberOfEFoldsToEnd(): number {
    const phi = this._fieldValue;
    const Mp = this._planckMass;
    return 4 * Math.PI * (phi * phi - 1) / (Mp * Mp);
  }

  public setPotentialParameters(mass: number, coupling: number): void {
    this._mass = Math.max(1e-10, mass);
    this._coupling = coupling;
    this._potentialEnergy = this._computePotential();
  }

  public setInitialField(value: number, velocity: number): void {
    this._fieldValue = value;
    this._fieldVelocity = velocity;
    this._potentialEnergy = this._computePotential();
  }

  public getInflatonState(): InflatonField {
    return {
      value: this._fieldValue,
      velocity: this._fieldVelocity,
      potential: this._potentialEnergy,
    };
  }

  public getHistory(): InflationRecord[] {
    return this._history.map(h => ({ ...h }));
  }

  public computeQuantumFluctuationAmplitude(k: number): number {
    const H = this._computeHubbleParameter();
    return H / (Math.sqrt(2) * k);
  }

  public isSlowRoll(): boolean {
    return this._slowRollEpsilon < 1 && Math.abs(this._slowRollEta) < 1;
  }

  public reset(): void {
    this._fieldValue = 5.0;
    this._fieldVelocity = 0;
    this._mass = 1e-6;
    this._potentialEnergy = this._computePotential();
    this._eFolds = 0;
    this._slowRollEpsilon = 0;
    this._slowRollEta = 0;
    this._scalarPerturbation = 1e-5;
    this._tensorToScalarRatio = 0.01;
    this._reheatingTemperature = 1e15;
    this._history = [];
  }
}

export interface CriticalExponentData {
  temperature: number;
  magnetization: number;
  susceptibility: number;
  specificHeat: number;
  correlationLength: number;
}

export interface ScalingFunction {
  argument: number;
  value: number;
}

export class CriticalPhenomena {
  private _criticalTemperature: number;
  private _criticalMagnetization: number;
  private _magneticField: number;
  private _temperature: number;
  private _magnetization: number;
  private _exponents: { alpha: number; beta: number; gamma: number; delta: number; eta: number; nu: number };
  private _history: CriticalExponentData[];
  private _scalingFunctions: ScalingFunction[];
  private _correlationLength: number;
  private _specificHeat: number;
  private _susceptibility: number;

  constructor(criticalTemp: number = 2.27) {
    this._criticalTemperature = criticalTemp;
    this._criticalMagnetization = 0;
    this._magneticField = 0;
    this._temperature = 3.0;
    this._magnetization = 0;
    this._exponents = { alpha: 0.11, beta: 0.326, gamma: 1.237, delta: 4.79, eta: 0.036, nu: 0.63 };
    this._history = [];
    this._scalingFunctions = [];
    this._correlationLength = 1;
    this._specificHeat = 1;
    this._susceptibility = 1;
  }

  get criticalTemperature(): number {
    return this._criticalTemperature;
  }

  get magnetization(): number {
    return this._magnetization;
  }

  get correlationLength(): number {
    return this._correlationLength;
  }

  get susceptibility(): number {
    return this._susceptibility;
  }

  public setExponents(alpha: number, beta: number, gamma: number, delta: number, eta: number, nu: number): void {
    this._exponents = { alpha, beta, gamma, delta, eta, nu };
  }

  public computeMagnetization(): number {
    const t = (this._criticalTemperature - this._temperature) / this._criticalTemperature;
    if (t > 0) {
      this._magnetization = Math.pow(t, this._exponents.beta);
    } else {
      this._magnetization = 0;
    }
    if (this._magneticField > 0 && t === 0) {
      this._magnetization = Math.pow(this._magneticField, 1 / this._exponents.delta);
    }
    return this._magnetization;
  }

  public computeSusceptibility(): number {
    const t = Math.abs(this._temperature - this._criticalTemperature) / this._criticalTemperature;
    this._susceptibility = Math.pow(t, -this._exponents.gamma);
    return this._susceptibility;
  }

  public computeSpecificHeat(): number {
    const t = Math.abs(this._temperature - this._criticalTemperature) / this._criticalTemperature;
    this._specificHeat = Math.pow(t, -this._exponents.alpha);
    return this._specificHeat;
  }

  public computeCorrelationLength(): number {
    const t = Math.abs(this._temperature - this._criticalTemperature) / this._criticalTemperature;
    this._correlationLength = Math.pow(t, -this._exponents.nu);
    return this._correlationLength;
  }

  public computeScalingFunction(x: number): number {
    return Math.exp(-x * x);
  }

  public generateScalingFunctionData(points: number = 100): ScalingFunction[] {
    const data: ScalingFunction[] = [];
    for (let i = 0; i < points; i++) {
      const x = (i / points) * 10 - 5;
      data.push({ argument: x, value: this.computeScalingFunction(x) });
    }
    this._scalingFunctions = data;
    return data;
  }

  public computeWidomScaling(): number {
    return this._exponents.gamma / this._exponents.beta;
  }

  public computeRushbrookeIdentity(): boolean {
    const lhs = this._exponents.alpha + 2 * this._exponents.beta + this._exponents.gamma;
    return Math.abs(lhs - 2) < 0.01;
  }

  public computeFisherIdentity(): boolean {
    const lhs = this._exponents.gamma - this._exponents.eta * this._exponents.nu;
    return Math.abs(lhs - 2 * this._exponents.nu) < 0.01;
  }

  public computeJosephsonIdentity(): boolean {
    const lhs = 3 * this._exponents.nu - this._exponents.beta;
    return Math.abs(lhs - 1) < 0.01;
  }

  public setTemperature(temp: number): void {
    this._temperature = temp;
    this.computeMagnetization();
    this.computeSusceptibility();
    this.computeSpecificHeat();
    this.computeCorrelationLength();
    this._recordState();
  }

  public setMagneticField(field: number): void {
    this._magneticField = field;
    this.computeMagnetization();
  }

  private _recordState(): void {
    this._history.push({
      temperature: this._temperature,
      magnetization: this._magnetization,
      susceptibility: this._susceptibility,
      specificHeat: this._specificHeat,
      correlationLength: this._correlationLength,
    });
    if (this._history.length > 200) this._history.shift();
  }

  public getCriticalExponentData(): CriticalExponentData {
    return {
      temperature: this._temperature,
      magnetization: this._magnetization,
      susceptibility: this._susceptibility,
      specificHeat: this._specificHeat,
      correlationLength: this._correlationLength,
    };
  }

  public getHistory(): CriticalExponentData[] {
    return this._history.map(h => ({ ...h }));
  }

  public computeScalingDimension(operatorDimension: number): number {
    return operatorDimension - this._exponents.eta;
  }

  public computeRenormalizationGroupFlow(initialCoupling: number, iterations: number): number[] {
    const flow: number[] = [initialCoupling];
    let g = initialCoupling;
    for (let i = 0; i < iterations; i++) {
      g = g * g - 2;
      flow.push(g);
    }
    return flow;
  }

  public computeUniversalityClass(spinDimension: number, latticeDimension: number): string {
    if (latticeDimension === 2 && spinDimension === 1) return 'Ising';
    if (latticeDimension === 3 && spinDimension === 1) return 'Ising3D';
    if (spinDimension === 2) return 'XY';
    if (spinDimension === 3) return 'Heisenberg';
    return 'Unknown';
  }

  public computeEffectiveDimension(): number {
    return 4 - this._exponents.alpha / this._exponents.nu;
  }

  public computeFiniteSizeScaling(systemSize: number): number {
    const L = systemSize;
    const nu = this._exponents.nu;
    const t = Math.abs(this._temperature - this._criticalTemperature) / this._criticalTemperature;
    return Math.pow(L, 1 / nu) * t;
  }

  public reset(): void {
    this._temperature = 3.0;
    this._magnetization = 0;
    this._magneticField = 0;
    this._history = [];
    this._scalingFunctions = [];
    this._correlationLength = 1;
    this._specificHeat = 1;
    this._susceptibility = 1;
    this._exponents = { alpha: 0.11, beta: 0.326, gamma: 1.237, delta: 4.79, eta: 0.036, nu: 0.63 };
  }
}

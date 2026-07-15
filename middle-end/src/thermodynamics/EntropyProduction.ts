export interface EntropyFlow {
  source: string;
  heatFlow: number;
  temperature: number;
  entropyRate: number;
}

export interface EntropyBalance {
  totalProduction: number;
  externalFlow: number;
  internalProduction: number;
  steadyState: boolean;
}

export class EntropyProduction {
  private _entropyRate: number;
  private _heatFlows: EntropyFlow[];
  private _temperatureProfile: number[];
  private _totalEntropyProduced: number;
  private _externalEntropyFlow: number;
  private _internalEntropyProduction: number;
  private _history: EntropyBalance[];
  private _conductivity: number;
  private _sourceTerms: number[];
  private _steadyState: boolean;

  constructor() {
    this._entropyRate = 0;
    this._heatFlows = [];
    this._temperatureProfile = [300, 300];
    this._totalEntropyProduced = 0;
    this._externalEntropyFlow = 0;
    this._internalEntropyProduction = 0;
    this._history = [];
    this._conductivity = 1;
    this._sourceTerms = [];
    this._steadyState = false;
  }

  get entropyRate(): number {
    return this._entropyRate;
  }

  get totalEntropyProduced(): number {
    return this._totalEntropyProduced;
  }

  get steadyState(): boolean {
    return this._steadyState;
  }

  get internalEntropyProduction(): number {
    return this._internalEntropyProduction;
  }

  public addHeatFlow(source: string, heatFlow: number, temperature: number): void {
    const rate = heatFlow / temperature;
    this._heatFlows.push({ source, heatFlow, temperature, entropyRate: rate });
    this._externalEntropyFlow += rate;
  }

  public computeEntropyProductionRate(temperatureGradient: number, heatFlux: number): number {
    return heatFlux * temperatureGradient / (temperatureGradient * temperatureGradient + 1e-10);
  }

  public computeOnsagerCoefficient(force: number, flux: number): number {
    return flux / (force + 1e-10);
  }

  public computeReciprocalRelation(L12: number, L21: number): number {
    return Math.abs(L12 - L21);
  }

  public setTemperatureProfile(profile: number[]): void {
    this._temperatureProfile = [...profile];
    this._updateSteadyState();
  }

  private _updateSteadyState(): void {
    const maxDiff = Math.max(...this._temperatureProfile) - Math.min(...this._temperatureProfile);
    this._steadyState = maxDiff < 0.01;
  }

  public tick(dt: number): void {
    this._internalEntropyProduction = 0;
    for (let i = 0; i < this._temperatureProfile.length - 1; i++) {
      const dT = this._temperatureProfile[i] - this._temperatureProfile[i + 1];
      const Tavg = (this._temperatureProfile[i] + this._temperatureProfile[i + 1]) / 2;
      const heatFlux = this._conductivity * dT;
      const sigma = heatFlux * dT / (Tavg * Tavg);
      this._internalEntropyProduction += sigma;
    }
    this._totalEntropyProduced += this._internalEntropyProduction * dt;
    this._entropyRate = this._internalEntropyProduction + this._externalEntropyFlow;
    const balance: EntropyBalance = {
      totalProduction: this._totalEntropyProduced,
      externalFlow: this._externalEntropyFlow,
      internalProduction: this._internalEntropyProduction,
      steadyState: this._steadyState,
    };
    this._history.push(balance);
    if (this._history.length > 200) this._history.shift();
  }

  public computeMinimumEntropyProduction(steadyStateFlux: number): number {
    const T1 = this._temperatureProfile[0];
    const T2 = this._temperatureProfile[this._temperatureProfile.length - 1];
    return steadyStateFlux * (1 / T2 - 1 / T1);
  }

  public computeExergyDestruction(ambientTemperature: number): number {
    return ambientTemperature * this._internalEntropyProduction;
  }

  public computeAffinityDrivenProduction(affinity: number, reactionRate: number): number {
    return affinity * reactionRate;
  }

  public computeDiffusionEntropyProduction(concentrationGradient: number, diffusionFlux: number, temperature: number): number {
    return -diffusionFlux * concentrationGradient / temperature;
  }

  public computeViscousEntropyProduction(velocityGradient: number, shearStress: number, temperature: number): number {
    return shearStress * velocityGradient / temperature;
  }

  public getHeatFlows(): EntropyFlow[] {
    return this._heatFlows.map(f => ({ ...f }));
  }

  public getTemperatureProfile(): number[] {
    return [...this._temperatureProfile];
  }

  public getHistory(): EntropyBalance[] {
    return this._history.map(h => ({ ...h }));
  }

  public computeEntropyBalance(): EntropyBalance {
    return {
      totalProduction: this._totalEntropyProduced,
      externalFlow: this._externalEntropyFlow,
      internalProduction: this._internalEntropyProduction,
      steadyState: this._steadyState,
    };
  }

  public setConductivity(k: number): void {
    this._conductivity = Math.max(0, k);
  }

  public addSourceTerm(source: number): void {
    this._sourceTerms.push(source);
    this._internalEntropyProduction += source;
  }

  public computePrigoginePrinciple(): boolean {
    return this._steadyState;
  }

  public reset(): void {
    this._entropyRate = 0;
    this._heatFlows = [];
    this._temperatureProfile = [300, 300];
    this._totalEntropyProduced = 0;
    this._externalEntropyFlow = 0;
    this._internalEntropyProduction = 0;
    this._history = [];
    this._conductivity = 1;
    this._sourceTerms = [];
    this._steadyState = false;
  }
}

export interface EntropyEngineData {
  entropy: number;
  temperature: number;
  volume: number;
  microstates: number;
  workOutput: number;
}

export class EntropyEngine {
  private _entropy: number;
  private _temperature: number;
  private _volume: number;
  private _microstates: number;
  private _workOutput: number;
  private _entropyHistory: number[];
  private _boltzmannConstant: number;
  private _maxEntropy: number;

  constructor(initialTemperature: number = 300) {
    this._entropy = 0;
    this._temperature = initialTemperature;
    this._volume = 1;
    this._microstates = 1;
    this._workOutput = 0;
    this._entropyHistory = [];
    this._boltzmannConstant = 1.380649e-23;
    this._maxEntropy = 1e6;
  }

  get entropy(): number {
    return this._entropy;
  }

  get temperature(): number {
    return this._temperature;
  }

  get volume(): number {
    return this._volume;
  }

  get workOutput(): number {
    return this._workOutput;
  }

  public addHeat(heat: number): void {
    if (this._temperature <= 0) return;
    const deltaS = heat / this._temperature;
    this._entropy += deltaS;
    this._microstates = Math.exp(this._entropy / this._boltzmannConstant);
    this._entropyHistory.push(this._entropy);
    if (this._entropyHistory.length > 100) this._entropyHistory.shift();
  }

  public expandVolume(ratio: number): number {
    if (ratio <= 0) return 0;
    const newVolume = this._volume * ratio;
    const deltaS = this._boltzmannConstant * Math.log(ratio);
    this._entropy += deltaS;
    this._volume = newVolume;
    const work = this._temperature * deltaS;
    this._workOutput += work;
    return work;
  }

  public coolDown(targetTemp: number): number {
    if (targetTemp >= this._temperature || targetTemp <= 0) return 0;
    const deltaS = this._boltzmannConstant * Math.log(targetTemp / this._temperature);
    const heatReleased = this._temperature - targetTemp;
    this._temperature = targetTemp;
    this._entropy += deltaS;
    return heatReleased;
  }

  public computeBoltzmannEntropy(): number {
    return this._boltzmannConstant * Math.log(Math.max(this._microstates, 1));
  }

  public computeGibbsFreeEnergy(enthalpy: number): number {
    return enthalpy - this._temperature * this._entropy;
  }

  public report(): EntropyEngineData {
    return {
      entropy: this._entropy,
      temperature: this._temperature,
      volume: this._volume,
      microstates: this._microstates,
      workOutput: this._workOutput,
    };
  }

  public reset(): void {
    this._entropy = 0;
    this._microstates = 1;
    this._workOutput = 0;
    this._entropyHistory = [];
  }

  public computeEntropyProductionRate(): number {
    if (this._entropyHistory.length < 2) return 0;
    const recent = this._entropyHistory.slice(-10);
    let totalRate = 0;
    for (let i = 1; i < recent.length; i++) {
      totalRate += recent[i] - recent[i - 1];
    }
    return totalRate / Math.max(recent.length - 1, 1);
  }

  public isEquilibrium(tolerance: number = 1e-6): boolean {
    const rate = this.computeEntropyProductionRate();
    return Math.abs(rate) < tolerance;
  }

  public cycle(heatIn: number, heatOut: number): number {
    this.addHeat(heatIn);
    const work = heatIn - heatOut;
    this._workOutput += Math.max(0, work);
    return Math.max(0, work);
  }
}

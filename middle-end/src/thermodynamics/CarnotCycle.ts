export interface ThermodynamicState {
  temperature: number;
  pressure: number;
  volume: number;
  entropy: number;
}

export interface CycleRecord {
  workOutput: number;
  heatInput: number;
  efficiency: number;
  reversibility: number;
}

export class CarnotCycle {
  private _hotReservoir: number;
  private _coldReservoir: number;
  private _currentState: ThermodynamicState;
  private _cycleHistory: CycleRecord[];
  private _stepCount: number;
  private _totalWork: number;
  private _totalHeatIn: number;
  private _totalHeatOut: number;
  private _gasConstant: number;
  private _adiabaticIndex: number;
  private _isReversible: boolean;

  constructor(hotTemp: number = 600, coldTemp: number = 300) {
    this._hotReservoir = Math.max(hotTemp, 1);
    this._coldReservoir = Math.max(coldTemp, 1);
    this._currentState = {
      temperature: this._hotReservoir,
      pressure: 1e5,
      volume: 1,
      entropy: 0,
    };
    this._cycleHistory = [];
    this._stepCount = 0;
    this._totalWork = 0;
    this._totalHeatIn = 0;
    this._totalHeatOut = 0;
    this._gasConstant = 8.314;
    this._adiabaticIndex = 1.4;
    this._isReversible = true;
  }

  get hotReservoir(): number {
    return this._hotReservoir;
  }

  get coldReservoir(): number {
    return this._coldReservoir;
  }

  get currentState(): ThermodynamicState {
    return { ...this._currentState };
  }

  get efficiency(): number {
    return 1 - this._coldReservoir / this._hotReservoir;
  }

  get totalWork(): number {
    return this._totalWork;
  }

  private _computeEntropyChange(heat: number, temp: number): number {
    return heat / temp;
  }

  public isothermalExpansion(targetVolume: number): number {
    const T = this._hotReservoir;
    const V1 = this._currentState.volume;
    const V2 = Math.max(V1, targetVolume);
    const work = this._gasConstant * T * Math.log(V2 / V1);
    const heat = work;
    this._currentState.volume = V2;
    this._currentState.pressure = this._gasConstant * T / V2;
    this._currentState.entropy += this._computeEntropyChange(heat, T);
    this._totalHeatIn += heat;
    this._totalWork += work;
    this._stepCount++;
    return work;
  }

  public adiabaticExpansion(targetVolume: number): number {
    const V1 = this._currentState.volume;
    const V2 = Math.max(V1, targetVolume);
    const gamma = this._adiabaticIndex;
    const T1 = this._currentState.temperature;
    const T2 = T1 * Math.pow(V1 / V2, gamma - 1);
    const work = (this._gasConstant * (T1 - T2)) / (gamma - 1);
    this._currentState.temperature = T2;
    this._currentState.volume = V2;
    this._currentState.pressure = this._gasConstant * T2 / V2;
    this._totalWork += work;
    this._stepCount++;
    return work;
  }

  public isothermalCompression(targetVolume: number): number {
    const T = this._coldReservoir;
    const V1 = this._currentState.volume;
    const V2 = Math.max(1e-10, targetVolume);
    const work = this._gasConstant * T * Math.log(V2 / V1);
    const heat = work;
    this._currentState.volume = V2;
    this._currentState.pressure = this._gasConstant * T / V2;
    this._currentState.temperature = T;
    this._currentState.entropy += this._computeEntropyChange(heat, T);
    this._totalHeatOut += Math.abs(heat);
    this._totalWork += work;
    this._stepCount++;
    return work;
  }

  public adiabaticCompression(targetVolume: number): number {
    const V1 = this._currentState.volume;
    const V2 = Math.max(1e-10, targetVolume);
    const gamma = this._adiabaticIndex;
    const T1 = this._currentState.temperature;
    const T2 = T1 * Math.pow(V1 / V2, gamma - 1);
    const work = (this._gasConstant * (T1 - T2)) / (gamma - 1);
    this._currentState.temperature = T2;
    this._currentState.volume = V2;
    this._currentState.pressure = this._gasConstant * T2 / V2;
    this._totalWork += work;
    this._stepCount++;
    return work;
  }

  public runFullCycle(expansionRatio: number = 2): CycleRecord {
    this._totalWork = 0;
    this._totalHeatIn = 0;
    this._totalHeatOut = 0;
    const V1 = this._currentState.volume;
    const V2 = V1 * expansionRatio;
    const V3 = V2 * Math.pow(this._coldReservoir / this._hotReservoir, 1 / (this._adiabaticIndex - 1));
    const V4 = V3 / expansionRatio;
    this.isothermalExpansion(V2);
    this.adiabaticExpansion(V3);
    this.isothermalCompression(V4);
    this.adiabaticCompression(V1);
    const eff = this._totalHeatIn > 0 ? this._totalWork / this._totalHeatIn : 0;
    const record: CycleRecord = {
      workOutput: this._totalWork,
      heatInput: this._totalHeatIn,
      efficiency: eff,
      reversibility: this._isReversible ? 1 : 0,
    };
    this._cycleHistory.push(record);
    if (this._cycleHistory.length > 200) this._cycleHistory.shift();
    return record;
  }

  public computeCarnotEfficiency(): number {
    return 1 - this._coldReservoir / this._hotReservoir;
  }

  public computeEntropyGeneration(): number {
    if (this._isReversible) return 0;
    return Math.abs(this._totalHeatIn / this._hotReservoir - this._totalHeatOut / this._coldReservoir);
  }

  public setReservoirTemperatures(hot: number, cold: number): void {
    this._hotReservoir = Math.max(1, hot);
    this._coldReservoir = Math.max(1, cold);
    if (this._coldReservoir >= this._hotReservoir) {
      this._coldReservoir = this._hotReservoir - 1;
    }
  }

  public getCycleHistory(): CycleRecord[] {
    return this._cycleHistory.map(c => ({ ...c }));
  }

  public computeAvailability(environmentTemp: number): number {
    const Q = this._totalHeatIn;
    const T0 = environmentTemp;
    const T1 = this._hotReservoir;
    return Q * (1 - T0 / T1);
  }

  public computeExergyDestruction(): number {
    const Sgen = this.computeEntropyGeneration();
    const T0 = this._coldReservoir;
    return T0 * Sgen;
  }

  public computeMeanEffectivePressure(): number {
    const V1 = 1;
    const V2 = V1 * 2;
    const sweptVolume = V2 - V1;
    return this._totalWork / sweptVolume;
  }

  public setReversibility(reversible: boolean): void {
    this._isReversible = reversible;
  }

  public computeIrreversibilityRatio(actualWork: number): number {
    const ideal = this.computeCarnotEfficiency() * this._totalHeatIn;
    return 1 - actualWork / ideal;
  }

  public reset(): void {
    this._currentState = {
      temperature: this._hotReservoir,
      pressure: 1e5,
      volume: 1,
      entropy: 0,
    };
    this._cycleHistory = [];
    this._stepCount = 0;
    this._totalWork = 0;
    this._totalHeatIn = 0;
    this._totalHeatOut = 0;
    this._isReversible = true;
  }
}

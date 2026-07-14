/**
 * FieldResonance - 场共振
 * 两个场频率匹配时发生能量传输，类似共振现象中能量从
 * 一个振动系统高效传递到另一个同频系统。
 */

export interface FieldResonanceData {
  readonly resonanceId: string;
  sourceFrequency: number;
  targetFrequency: number;
  couplingStrength: number;
  bandwidth: number;
}

export interface ResonanceReading {
  frequencyMatch: number;
  energyTransfer: number;
  inResonance: boolean;
  phaseAlignment: number;
}

export class FieldResonance {
  private _data: FieldResonanceData;
  private _readings: ResonanceReading[] = [];
  private _totalEnergyTransferred: number = 0;
  private _phaseLock: number = 0;
  private _resonanceSustained: number = 0;

  constructor(data: FieldResonanceData) {
    this._data = { ...data };
  }

  get resonanceId(): string {
    return this._data.resonanceId;
  }

  get inResonance(): boolean {
    return this._computeMatch() > 0.8;
  }

  private _computeMatch(): number {
    const freqDiff = Math.abs(this._data.sourceFrequency - this._data.targetFrequency);
    if (freqDiff > this._data.bandwidth) {
      return 0;
    }
    return 1 - freqDiff / this._data.bandwidth;
  }

  public measure(): ResonanceReading {
    const match = this._computeMatch();
    const energyTransfer = match * this._data.couplingStrength * (1 - this._phaseLock * 0.3);
    const inResonance = match > 0.8;
    const phaseAlignment = this._phaseLock;
    if (inResonance) {
      this._totalEnergyTransferred += energyTransfer;
      this._phaseLock = Math.min(1, this._phaseLock + 0.05);
      this._resonanceSustained++;
    } else {
      this._phaseLock = Math.max(0, this._phaseLock - 0.02);
      this._resonanceSustained = Math.max(0, this._resonanceSustained - 1);
    }
    const reading: ResonanceReading = {
      frequencyMatch: match,
      energyTransfer,
      inResonance,
      phaseAlignment,
    };
    this._readings.push(reading);
    if (this._readings.length > 50) {
      this._readings.shift();
    }
    return reading;
  }

  public tuneSource(frequency: number): void {
    this._data.sourceFrequency = Math.max(0.001, frequency);
  }

  public tuneTarget(frequency: number): void {
    this._data.targetFrequency = Math.max(0.001, frequency);
  }

  public adjustCoupling(delta: number): void {
    this._data.couplingStrength = Math.max(0, Math.min(1, this._data.couplingStrength + delta));
  }

  public widenBandwidth(delta: number): void {
    this._data.bandwidth = Math.max(0.001, this._data.bandwidth + delta);
  }

  public synchronize(): boolean {
    this._data.targetFrequency = this._data.sourceFrequency;
    this._phaseLock = 1;
    return this.inResonance;
  }

  public breakResonance(): void {
    this._data.targetFrequency = this._data.sourceFrequency * 2;
    this._phaseLock = 0;
    this._resonanceSustained = 0;
  }

  public computeEfficiency(): number {
    if (this._readings.length === 0) {
      return 0;
    }
    const transfers = this._readings.map((r) => r.energyTransfer);
    const sum = transfers.reduce((a, b) => a + b, 0);
    return sum / transfers.length;
  }

  public resonanceReport(): Record<string, unknown> {
    return {
      resonanceId: this.resonanceId,
      sourceFrequency: this._data.sourceFrequency.toFixed(3),
      targetFrequency: this._data.targetFrequency.toFixed(3),
      couplingStrength: this._data.couplingStrength.toFixed(3),
      bandwidth: this._data.bandwidth.toFixed(3),
      frequencyMatch: this._computeMatch().toFixed(3),
      inResonance: this.inResonance,
      phaseLock: this._phaseLock.toFixed(3),
      resonanceSustained: this._resonanceSustained,
      totalEnergyTransferred: this._totalEnergyTransferred.toFixed(2),
      efficiency: this.computeEfficiency().toFixed(3),
    };
  }
}

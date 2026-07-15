export interface EntropyCompressorData {
  inputEntropy: number;
  outputEntropy: number;
  compressionRatio: number;
  workInput: number;
  efficiency: number;
}

export class EntropyCompressor {
  private _inputEntropy: number;
  private _outputEntropy: number;
  private _compressionRatio: number;
  private _workInput: number;
  private _efficiency: number;
  private _compressionHistory: number[];
  private _maxRatio: number;
  private _temperature: number;

  constructor(efficiency: number = 0.6) {
    this._inputEntropy = 0;
    this._outputEntropy = 0;
    this._compressionRatio = 1;
    this._workInput = 0;
    this._efficiency = efficiency;
    this._compressionHistory = [];
    this._maxRatio = 100;
    this._temperature = 300;
  }

  get inputEntropy(): number {
    return this._inputEntropy;
  }

  get outputEntropy(): number {
    return this._outputEntropy;
  }

  get compressionRatio(): number {
    return this._compressionRatio;
  }

  get efficiency(): number {
    return this._efficiency;
  }

  public compress(entropy: number, targetRatio: number): number {
    const ratio = Math.min(targetRatio, this._maxRatio);
    this._inputEntropy += entropy;
    const reduced = entropy * (1 - 1 / ratio) * this._efficiency;
    const outputEntropy = entropy - reduced;
    this._outputEntropy += outputEntropy;
    this._compressionRatio = ratio;
    const work = this._temperature * reduced;
    this._workInput += work;
    this._compressionHistory.push(ratio);
    if (this._compressionHistory.length > 40) this._compressionHistory.shift();
    return outputEntropy;
  }

  public expand(entropy: number): number {
    this._outputEntropy -= entropy;
    this._inputEntropy += entropy;
    const workOutput = this._temperature * entropy * this._efficiency;
    return workOutput;
  }

  public setEfficiency(value: number): void {
    this._efficiency = Math.max(0, Math.min(0.99, value));
  }

  public computeTheoreticalLimit(entropy: number): number {
    return entropy * Math.log(this._maxRatio);
  }

  public report(): EntropyCompressorData {
    return {
      inputEntropy: this._inputEntropy,
      outputEntropy: this._outputEntropy,
      compressionRatio: this._compressionRatio,
      workInput: this._workInput,
      efficiency: this._efficiency,
    };
  }

  public reset(): void {
    this._inputEntropy = 0;
    this._outputEntropy = 0;
    this._compressionRatio = 1;
    this._workInput = 0;
    this._compressionHistory = [];
  }

  public computeAverageRatio(): number {
    if (this._compressionHistory.length === 0) return 1;
    return this._compressionHistory.reduce((a, b) => a + b, 0) / this._compressionHistory.length;
  }

  public computeCarnotWork(hotTemp: number, coldTemp: number): number {
    if (hotTemp <= coldTemp) return 0;
    const carnotEfficiency = 1 - coldTemp / hotTemp;
    return this._inputEntropy * carnotEfficiency;
  }

  public setTemperature(value: number): void {
    this._temperature = Math.max(1, value);
  }
}

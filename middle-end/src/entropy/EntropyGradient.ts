export interface EntropyGradientData {
  gradient: number;
  highEntropy: number;
  lowEntropy: number;
  distance: number;
  flux: number;
}

export class EntropyGradient {
  private _gradient: number;
  private _highEntropy: number;
  private _lowEntropy: number;
  private _distance: number;
  private _flux: number;
  private _gradientHistory: number[];
  private _diffusionCoefficient: number;
  private _equilibriumThreshold: number;

  constructor(high: number = 100, low: number = 10, distance: number = 1) {
    this._highEntropy = high;
    this._lowEntropy = low;
    this._distance = distance;
    this._gradient = (high - low) / distance;
    this._flux = 0;
    this._gradientHistory = [];
    this._diffusionCoefficient = 1.5;
    this._equilibriumThreshold = 0.01;
  }

  get gradient(): number {
    return this._gradient;
  }

  get highEntropy(): number {
    return this._highEntropy;
  }

  get lowEntropy(): number {
    return this._lowEntropy;
  }

  get flux(): number {
    return this._flux;
  }

  public diffuse(timeStep: number): number {
    const flux = this._diffusionCoefficient * this._gradient;
    const transfer = flux * timeStep;
    const actualTransfer = Math.min(transfer, this._highEntropy - this._lowEntropy);
    this._highEntropy -= actualTransfer / 2;
    this._lowEntropy += actualTransfer / 2;
    this._gradient = (this._highEntropy - this._lowEntropy) / this._distance;
    this._flux = flux;
    this._gradientHistory.push(this._gradient);
    if (this._gradientHistory.length > 60) this._gradientHistory.shift();
    return actualTransfer;
  }

  public setHighEntropy(value: number): void {
    this._highEntropy = Math.max(0, value);
    this._gradient = (this._highEntropy - this._lowEntropy) / this._distance;
  }

  public setLowEntropy(value: number): void {
    this._lowEntropy = Math.max(0, value);
    this._gradient = (this._highEntropy - this._lowEntropy) / this._distance;
  }

  public setDistance(value: number): void {
    this._distance = Math.max(0.01, value);
    this._gradient = (this._highEntropy - this._lowEntropy) / this._distance;
  }

  public computeWorkPotential(temperature: number): number {
    return temperature * Math.abs(this._highEntropy - this._lowEntropy);
  }

  public report(): EntropyGradientData {
    return {
      gradient: this._gradient,
      highEntropy: this._highEntropy,
      lowEntropy: this._lowEntropy,
      distance: this._distance,
      flux: this._flux,
    };
  }

  public isEquilibrium(): boolean {
    return Math.abs(this._gradient) < this._equilibriumThreshold;
  }

  public computeRelaxationTime(): number {
    if (this._diffusionCoefficient <= 0) return Infinity;
    return (this._distance ** 2) / (2 * this._diffusionCoefficient);
  }

  public steepen(amount: number): void {
    this._highEntropy += amount;
    this._lowEntropy = Math.max(0, this._lowEntropy - amount);
    this._gradient = (this._highEntropy - this._lowEntropy) / this._distance;
  }

  public computeEntropyProduction(): number {
    return this._flux * this._gradient / Math.max(this._highEntropy, 1);
  }
}

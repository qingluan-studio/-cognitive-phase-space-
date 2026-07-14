export interface FormantBand {
  index: number;
  center: number;
  bandwidth: number;
  gain: number;
}

export type ShiftResult = {
  original: number;
  shifted: number;
  delta: number;
  probability: number;
};

export interface FormantShiftConfig {
  baseShift: number;
  scaleFactor: number;
  preserveFormants: boolean;
}

export class FormantShift {
  private _config: FormantShiftConfig;
  private _bands: FormantBand[] = [];
  private _shiftHistory: ShiftResult[] = [];
  private _state: Record<string, unknown> = {};
  private _markovChain: number[][] = [];
  private _currentState: number = 0;
  private _spectralTilt: number = 0;

  constructor(config: FormantShiftConfig) {
    this._config = config;
    this._initBands();
    this._initMarkov();
  }

  get bandCount(): number {
    return this._bands.length;
  }

  get shiftCount(): number {
    return this._shiftHistory.length;
  }

  get spectralTilt(): number {
    return this._spectralTilt;
  }

  private _initBands(): void {
    const defaults = [
      { center: 500, bandwidth: 80 },
      { center: 1500, bandwidth: 120 },
      { center: 2500, bandwidth: 150 },
      { center: 3500, bandwidth: 200 },
    ];
    this._bands = defaults.map((d, i) => ({ index: i, ...d, gain: 1 }));
  }

  private _initMarkov(): void {
    const n = this._bands.length;
    this._markovChain = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => {
        if (i === j) return 0.5;
        return Math.abs(i - j) === 1 ? 0.25 : 0.25 / (n - 2);
      })
    );
    this._currentState = 0;
  }

  private _transitionMarkov(): number {
    const row = this._markovChain[this._currentState];
    const r = Math.random();
    let cum = 0;
    for (let i = 0; i < row.length; i++) {
      cum += row[i];
      if (r <= cum) {
        this._currentState = i;
        return i;
      }
    }
    return this._currentState;
  }

  shift(amount: number): ShiftResult[] {
    const results: ShiftResult[] = [];
    for (const band of this._bands) {
      const original = band.center;
      const stateInfluence = this._currentState / (this._bands.length - 1);
      const adjustedAmount = amount * (1 + 0.2 * stateInfluence);
      const shifted = this._config.preserveFormants
        ? original + adjustedAmount
        : original * this._config.scaleFactor + adjustedAmount;
      band.center = shifted;
      const delta = shifted - original;
      const probability = 1 / (1 + Math.exp(-delta / 200));
      const result: ShiftResult = { original, shifted, delta, probability };
      results.push(result);
      this._shiftHistory.push(result);
      this._transitionMarkov();
    }
    if (this._shiftHistory.length > 40) this._shiftHistory.splice(0, this._shiftHistory.length - 40);
    this._state.lastShift = amount;
    this._updateSpectralTilt();
    return results;
  }

  private _updateSpectralTilt(): void {
    if (this._bands.length < 2) return;
    let sumXY = 0;
    let sumX = 0;
    let sumY = 0;
    let sumX2 = 0;
    for (let i = 0; i < this._bands.length; i++) {
      const x = this._bands[i].center;
      const y = this._bands[i].gain;
      sumXY += x * y;
      sumX += x;
      sumY += y;
      sumX2 += x * x;
    }
    const n = this._bands.length;
    this._spectralTilt = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  }

  shiftBand(index: number, amount: number): ShiftResult | null {
    const band = this._bands.find((b) => b.index === index);
    if (!band) return null;
    const original = band.center;
    band.center += amount;
    const probability = 1 / (1 + Math.exp(-amount / 200));
    const result: ShiftResult = { original, shifted: band.center, delta: amount, probability };
    this._shiftHistory.push(result);
    this._updateSpectralTilt();
    return result;
  }

  setGain(index: number, gain: number): boolean {
    const band = this._bands.find((b) => b.index === index);
    if (!band) return false;
    band.gain = gain;
    this._updateSpectralTilt();
    return true;
  }

  averageCenter(): number {
    if (this._bands.length === 0) return 0;
    return this._bands.reduce((acc, b) => acc + b.center, 0) / this._bands.length;
  }

  totalGain(): number {
    return this._bands.reduce((acc, b) => acc + b.gain, 0);
  }

  formantEntropy(): number {
    const total = this.totalGain();
    if (total === 0) return 0;
    return -this._bands.reduce((s, b) => {
      const p = b.gain / total;
      return p > 0 ? s + p * Math.log2(p) : s;
    }, 0);
  }

  resetBands(): void {
    this._initBands();
    this._state.resetAt = Date.now();
    this._spectralTilt = 0;
  }

  report(): Record<string, unknown> {
    return {
      bands: this._bands.length,
      averageCenter: this.averageCenter(),
      shiftHistory: this._shiftHistory.length,
      state: this._state,
      spectralTilt: this._spectralTilt,
      entropy: this.formantEntropy(),
    };
  }
}

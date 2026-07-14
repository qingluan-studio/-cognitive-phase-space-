/**
 * 共振峰移位模块：移动频谱中共振峰的位置以改变特征频率。
 * 用于在不改变基频的前提下变换音色身份。
 */

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

  constructor(config: FormantShiftConfig) {
    this._config = config;
    this._initBands();
  }

  get bandCount(): number {
    return this._bands.length;
  }

  get shiftCount(): number {
    return this._shiftHistory.length;
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

  shift(amount: number): ShiftResult[] {
    const results: ShiftResult[] = [];
    for (const band of this._bands) {
      const original = band.center;
      const shifted = this._config.preserveFormants
        ? original + amount
        : original * this._config.scaleFactor + amount;
      band.center = shifted;
      const result: ShiftResult = { original, shifted, delta: shifted - original };
      results.push(result);
      this._shiftHistory.push(result);
    }
    if (this._shiftHistory.length > 40) this._shiftHistory.splice(0, this._shiftHistory.length - 40);
    this._state.lastShift = amount;
    return results;
  }

  shiftBand(index: number, amount: number): ShiftResult | null {
    const band = this._bands.find((b) => b.index === index);
    if (!band) return null;
    const original = band.center;
    band.center += amount;
    const result: ShiftResult = { original, shifted: band.center, delta: amount };
    this._shiftHistory.push(result);
    return result;
  }

  setGain(index: number, gain: number): boolean {
    const band = this._bands.find((b) => b.index === index);
    if (!band) return false;
    band.gain = gain;
    return true;
  }

  averageCenter(): number {
    if (this._bands.length === 0) return 0;
    return this._bands.reduce((acc, b) => acc + b.center, 0) / this._bands.length;
  }

  totalGain(): number {
    return this._bands.reduce((acc, b) => acc + b.gain, 0);
  }

  resetBands(): void {
    this._initBands();
    this._state.resetAt = Date.now();
  }

  report(): Record<string, unknown> {
    return {
      bands: this._bands.length,
      averageCenter: this.averageCenter(),
      shiftHistory: this._shiftHistory.length,
      state: this._state,
    };
  }
}

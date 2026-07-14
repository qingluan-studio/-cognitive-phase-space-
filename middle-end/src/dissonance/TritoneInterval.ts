export interface TritoneIntervalData {
  root: number;
  tritone: number;
  ratio: number;
  tension: number;
}

export type TritoneResolution = {
  resolved: boolean;
  direction: 'up' | 'down' | 'none';
  target: number;
};

export interface TritoneConfig {
  baseFrequency: number;
  temperament: 'equal' | 'just';
  tensionDecay: number;
}

export class TritoneInterval {
  private _config: TritoneConfig;
  private _intervals: TritoneIntervalData[] = [];
  private _tension: number = 0;
  private _resolutions: Record<string, unknown> = {};
  private _equalTemperamentTable: number[] = [];
  private _justIntonationTable: number[] = [];
  private _dissonanceCurve: number[] = [];

  constructor(config: TritoneConfig) {
    this._config = config;
    this._initTemperamentTables();
  }

  get intervalCount(): number {
    return this._intervals.length;
  }

  get currentTension(): number {
    return this._tension;
  }

  get dissonanceCurve(): readonly number[] {
    return this._dissonanceCurve;
  }

  private _initTemperamentTables(): void {
    this._equalTemperamentTable = [];
    this._justIntonationTable = [];
    for (let i = 0; i < 12; i++) {
      this._equalTemperamentTable.push(Math.pow(2, i / 12));
      const justRatios = [1, 16 / 15, 9 / 8, 6 / 5, 5 / 4, 4 / 3, 7 / 5, 3 / 2, 8 / 5, 5 / 3, 9 / 5, 15 / 8];
      this._justIntonationTable.push(justRatios[i] || 1);
    }
  }

  private _plompLevelDissonance(f1: number, f2: number): number {
    const fMin = Math.min(f1, f2);
    const fMax = Math.max(f1, f2);
    const s = 0.24 / (0.021 * fMin + 19);
    const x = Math.log2(fMax / fMin) / s;
    return Math.exp(-x * x) * (fMin * fMax) / ((fMin + fMax) * (fMin + fMax));
  }

  private _updateDissonanceCurve(root: number): void {
    this._dissonanceCurve = [];
    for (let i = 0; i < 12; i++) {
      const freq = root * this._equalTemperamentTable[i];
      const dissonance = this._plompLevelDissonance(root, freq);
      this._dissonanceCurve.push(dissonance);
    }
  }

  computeTritone(root: number): number {
    const semitone = this._config.temperament === 'equal' ? Math.pow(2, 6 / 12) : Math.SQRT2;
    return root * semitone;
  }

  addInterval(root: number): TritoneIntervalData {
    const tritone = this.computeTritone(root);
    const ratio = tritone / root;
    const tension = Math.abs(ratio - 1.5) + 0.5;
    this._tension += tension;
    const data: TritoneIntervalData = { root, tritone, ratio, tension };
    this._intervals.push(data);
    if (this._intervals.length > 30) this._intervals.shift();
    this._updateDissonanceCurve(root);
    return data;
  }

  attemptResolve(upward: boolean): TritoneResolution {
    if (this._intervals.length === 0) {
      return { resolved: false, direction: 'none', target: 0 };
    }
    const last = this._intervals[this._intervals.length - 1];
    const target = upward ? last.root * 1.5 : last.root * (2 / 1.5);
    const resolved = Math.abs(last.tritone - target) < last.root * 0.1;
    this._tension *= 1 - this._config.tensionDecay;
    this._resolutions.last = { upward, target, resolved };
    return { resolved, direction: upward ? 'up' : 'down', target };
  }

  totalTension(): number {
    return this._intervals.reduce((acc, i) => acc + i.tension, 0);
  }

  averageTension(): number {
    if (this._intervals.length === 0) return 0;
    return this.totalTension() / this._intervals.length;
  }

  isHighTension(): boolean {
    return this.averageTension() > 0.8;
  }

  computeSpectralDissonance(): number {
    if (this._dissonanceCurve.length === 0) return 0;
    return this._dissonanceCurve.reduce((a, b) => a + b, 0) / this._dissonanceCurve.length;
  }

  releaseAll(): void {
    this._intervals = [];
    this._tension = 0;
    this._resolutions.releasedAt = Date.now();
    this._dissonanceCurve = [];
  }

  report(): Record<string, unknown> {
    return {
      intervals: this._intervals.length,
      tension: this._tension,
      averageTension: this.averageTension(),
      resolutions: this._resolutions,
      spectralDissonance: this.computeSpectralDissonance().toFixed(4),
    };
  }
}

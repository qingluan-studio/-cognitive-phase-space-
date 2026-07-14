/**
 * 三全音模块：增四度（频率比 √2）的极度不和谐音程。
 * 用于建模系统中无法被简单调和的内在张力。
 */

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

  constructor(config: TritoneConfig) {
    this._config = config;
  }

  get intervalCount(): number {
    return this._intervals.length;
  }

  get currentTension(): number {
    return this._tension;
  }

  computeTritone(root: number): number {
    const semitone = this._config.temperament === 'equal' ? Math.pow(2, 3 / 12) : Math.SQRT2;
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

  releaseAll(): void {
    this._intervals = [];
    this._tension = 0;
    this._resolutions.releasedAt = Date.now();
  }

  report(): Record<string, unknown> {
    return {
      intervals: this._intervals.length,
      tension: this._tension,
      averageTension: this.averageTension(),
      resolutions: this._resolutions,
    };
  }
}

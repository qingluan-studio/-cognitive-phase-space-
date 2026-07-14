/**
 * 泛音歌唱模块：同时强化基音与某一高次泛音，使两者清晰可辨。
 * 用于在系统中突出特定隐藏维度同时保留主体。
 */

export interface OvertoneTarget {
  order: number;
  boost: number;
  formant: number;
}

export type OvertoneOutput = {
  fundamentalGain: number;
  overtoneGain: number;
  prominence: number;
};

export interface OvertoneSingingConfig {
  fundamental: number;
  baseGain: number;
  formantWidth: number;
}

export class OvertoneSinging {
  private _config: OvertoneSingingConfig;
  private _targets: OvertoneTarget[] = [];
  private _output: OvertoneOutput | null = null;
  private _diagnostics: Record<string, unknown> = {};

  constructor(config: OvertoneSingingConfig) {
    this._config = config;
  }

  get targetCount(): number {
    return this._targets.length;
  }

  get fundamental(): number {
    return this._config.fundamental;
  }

  addTarget(order: number, boost: number): OvertoneTarget {
    const target: OvertoneTarget = {
      order,
      boost,
      formant: this._config.fundamental * order,
    };
    this._targets.push(target);
    if (this._targets.length > 10) this._targets.shift();
    return target;
  }

  synthesize(): OvertoneOutput {
    const fundamentalGain = this._config.baseGain;
    let overtoneGain = 0;
    for (const t of this._targets) {
      overtoneGain += t.boost;
    }
    const prominence = fundamentalGain > 0 ? overtoneGain / fundamentalGain : 0;
    this._output = { fundamentalGain, overtoneGain, prominence };
    this._diagnostics.synthesizedAt = Date.now();
    return this._output;
  }

  adjustFormant(order: number, shift: number): boolean {
    const t = this._targets.find((x) => x.order === order);
    if (!t) return false;
    t.formant += shift;
    return true;
  }

  strongestTarget(): OvertoneTarget | null {
    if (this._targets.length === 0) return null;
    return this._targets.reduce((best, t) => (t.boost > best.boost ? t : best));
  }

  totalBoost(): number {
    return this._targets.reduce((acc, t) => acc + t.boost, 0);
  }

  isBalanced(): boolean {
    if (!this._output) return false;
    return this._output.prominence >= 0.3 && this._output.prominence <= 0.7;
  }

  retune(fundamental: number): void {
    this._config.fundamental = fundamental;
    for (const t of this._targets) {
      t.formant = fundamental * t.order;
    }
  }

  report(): Record<string, unknown> {
    return {
      fundamental: this._config.fundamental,
      targets: this._targets.length,
      output: this._output,
      diagnostics: this._diagnostics,
    };
  }
}

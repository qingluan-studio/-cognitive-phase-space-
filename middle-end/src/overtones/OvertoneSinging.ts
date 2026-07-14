export interface OvertoneTarget {
  order: number;
  boost: number;
  formant: number;
}

export type OvertoneOutput = {
  fundamentalGain: number;
  overtoneGain: number;
  prominence: number;
  harmonicEntropy: number;
  coherence: number;
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
  private _phaseCoherence: number = 0;
  private _harmonicSieve: boolean[] = [];

  constructor(config: OvertoneSingingConfig) {
    this._config = config;
  }

  get targetCount(): number {
    return this._targets.length;
  }

  get fundamental(): number {
    return this._config.fundamental;
  }

  get phaseCoherence(): number {
    return this._phaseCoherence;
  }

  addTarget(order: number, boost: number): OvertoneTarget {
    const target: OvertoneTarget = {
      order,
      boost,
      formant: this._config.fundamental * order,
    };
    this._targets.push(target);
    if (this._targets.length > 10) this._targets.shift();
    this._updateHarmonicSieve();
    return target;
  }

  private _updateHarmonicSieve(): void {
    const maxOrder = Math.max(...this._targets.map((t) => t.order), 1);
    this._harmonicSieve = Array.from({ length: maxOrder + 1 }, (_, i) =>
      this._targets.some((t) => t.order === i)
    );
  }

  synthesize(): OvertoneOutput {
    const fundamentalGain = this._config.baseGain;
    let overtoneGain = 0;
    for (const t of this._targets) {
      overtoneGain += t.boost;
    }
    const prominence = fundamentalGain > 0 ? overtoneGain / fundamentalGain : 0;
    const totalBoost = overtoneGain + fundamentalGain;
    const harmonicEntropy = totalBoost > 0
      ? -[
          fundamentalGain,
          ...this._targets.map((t) => t.boost),
        ].reduce((s, b) => {
          const p = b / totalBoost;
          return p > 0 ? s + p * Math.log2(p) : s;
        }, 0)
      : 0;
    this._phaseCoherence = this._computePhaseCoherence();
    const coherence = this._phaseCoherence;
    this._output = { fundamentalGain, overtoneGain, prominence, harmonicEntropy, coherence };
    this._diagnostics.synthesizedAt = Date.now();
    return this._output;
  }

  private _computePhaseCoherence(): number {
    if (this._targets.length < 2) return 1;
    let sumCos = 0;
    let sumSin = 0;
    for (const t of this._targets) {
      const phase = (t.order * Math.PI) % (2 * Math.PI);
      sumCos += Math.cos(phase) * t.boost;
      sumSin += Math.sin(phase) * t.boost;
    }
    const magnitude = Math.sqrt(sumCos * sumCos + sumSin * sumSin);
    const totalBoost = this._targets.reduce((s, t) => s + t.boost, 0);
    return totalBoost > 0 ? magnitude / totalBoost : 0;
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

  inharmonicity(): number {
    if (this._targets.length < 2) return 0;
    let sum = 0;
    for (const t of this._targets) {
      const ideal = this._config.fundamental * t.order;
      sum += Math.pow(t.formant - ideal, 2);
    }
    return sum / this._targets.length;
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
      inharmonicity: this.inharmonicity(),
      phaseCoherence: this._phaseCoherence,
    };
  }
}

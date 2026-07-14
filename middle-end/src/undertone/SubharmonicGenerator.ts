/**
 * 次谐波发生器模块：从基频生成低于基频整数分之一的振动成分。
 * 用于在系统中注入深沉的底层支撑频率。
 */

export interface SubharmonicTone {
  divisor: number;
  frequency: number;
  amplitude: number;
}

export type SubharmonicMix = {
  tones: SubharmonicTone[];
  fundamental: number;
  lowest: number;
};

export interface SubharmonicConfig {
  fundamental: number;
  maxDivisor: number;
  amplitudeDecay: number;
}

export class SubharmonicGenerator {
  private _config: SubharmonicConfig;
  private _tones: SubharmonicTone[] = [];
  private _mix: SubharmonicMix | null = null;
  private _state: Record<string, unknown> = {};

  constructor(config: SubharmonicConfig) {
    this._config = config;
    this._generate();
  }

  get toneCount(): number {
    return this._tones.length;
  }

  get fundamental(): number {
    return this._config.fundamental;
  }

  get lowestFrequency(): number {
    if (this._tones.length === 0) return this._config.fundamental;
    return Math.min(...this._tones.map((t) => t.frequency));
  }

  private _generate(): void {
    this._tones = [];
    for (let d = 1; d <= this._config.maxDivisor; d++) {
      this._tones.push({
        divisor: d,
        frequency: this._config.fundamental / d,
        amplitude: 1 / Math.pow(d, this._config.amplitudeDecay),
      });
    }
  }

  sample(time: number): number {
    let value = 0;
    for (const t of this._tones) {
      value += t.amplitude * Math.sin(2 * Math.PI * t.frequency * time);
    }
    return value;
  }

  computeMix(): SubharmonicMix {
    this._mix = {
      tones: [...this._tones],
      fundamental: this._config.fundamental,
      lowest: this.lowestFrequency,
    };
    return this._mix;
  }

  emphasize(divisor: number, gain: number): boolean {
    const t = this._tones.find((x) => x.divisor === divisor);
    if (!t) return false;
    t.amplitude *= gain;
    this._state.emphasized = divisor;
    return true;
  }

  setFundamental(frequency: number): void {
    this._config.fundamental = frequency;
    this._generate();
  }

  dominantTone(): SubharmonicTone | null {
    if (this._tones.length === 0) return null;
    return this._tones.reduce((best, t) => (t.amplitude > best.amplitude ? t : best));
  }

  totalAmplitude(): number {
    return this._tones.reduce((acc, t) => acc + t.amplitude, 0);
  }

  adjustDecay(rate: number): void {
    this._config.amplitudeDecay = rate;
    this._generate();
  }

  report(): Record<string, unknown> {
    return {
      toneCount: this._tones.length,
      fundamental: this._config.fundamental,
      lowest: this.lowestFrequency,
      state: this._state,
    };
  }
}

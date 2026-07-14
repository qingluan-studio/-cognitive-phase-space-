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
  private _centsDeviation: number[] = [];
  private _inharmonicityCoeff: number = 0.001;

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
    this._centsDeviation = [];
    for (let d = 1; d <= this._config.maxDivisor; d++) {
      const inharmonicity = this._inharmonicityCoeff * d * d;
      const exactFreq = this._config.fundamental / d;
      const stretchedFreq = exactFreq * (1 + inharmonicity);
      const cents = 1200 * Math.log2(stretchedFreq / exactFreq);
      this._tones.push({
        divisor: d,
        frequency: stretchedFreq,
        amplitude: 1 / Math.pow(d, this._config.amplitudeDecay),
      });
      this._centsDeviation.push(cents);
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

  computeRationalApproximation(targetRatio: number): { numerator: number; denominator: number; error: number } {
    let bestNum = 1;
    let bestDen = 1;
    let bestError = Infinity;
    for (let d = 1; d <= this._config.maxDivisor; d++) {
      const n = Math.round(targetRatio * d);
      if (n < 1) continue;
      const error = Math.abs(targetRatio - n / d);
      if (error < bestError) {
        bestError = error;
        bestNum = n;
        bestDen = d;
      }
    }
    return { numerator: bestNum, denominator: bestDen, error: bestError };
  }

  computeInharmonicity(): number {
    return this._centsDeviation.reduce((a, c) => a + Math.abs(c), 0) / this._centsDeviation.length;
  }

  setInharmonicityCoeff(b: number): void {
    this._inharmonicityCoeff = Math.max(0, b);
    this._generate();
  }

  computeOvertoneAlignment(): number {
    const fundamental = this._config.fundamental;
    let alignment = 0;
    for (const t of this._tones) {
      const harmonicNum = fundamental / t.frequency;
      const nearestInteger = Math.round(harmonicNum);
      alignment += Math.abs(harmonicNum - nearestInteger);
    }
    return this._tones.length > 0 ? 1 - alignment / this._tones.length : 0;
  }
}

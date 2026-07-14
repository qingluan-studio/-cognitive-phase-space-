/**
 * 亥姆霍兹共鸣器模块：具有短颈和腔体的结构，在特定频率上发生强烈共振。
 * 用于从复杂信号中提取并放大目标频率成分。
 */

export interface HelmholtzParams {
  cavityVolume: number;
  neckLength: number;
  neckArea: number;
  soundSpeed: number;
}

export type ResonanceResponse = {
  frequency: number;
  amplitude: number;
  qFactor: number;
};

export interface HelmholtzConfig {
  params: HelmholtzParams;
  damping: number;
  gain: number;
}

export class HelmholtzResonator {
  private _config: HelmholtzConfig;
  private _responses: ResonanceResponse[] = [];
  private _input: number = 0;
  private _output: number = 0;
  private _meta: Record<string, unknown> = {};

  constructor(config: HelmholtzConfig) {
    this._config = config;
  }

  get resonantFrequency(): number {
    const { cavityVolume, neckArea, neckLength, soundSpeed } = this._config.params;
    return (soundSpeed / (2 * Math.PI)) * Math.sqrt(neckArea / (neckLength * cavityVolume));
  }

  get responseCount(): number {
    return this._responses.length;
  }

  get output(): number {
    return this._output;
  }

  feed(signal: number): number {
    this._input = signal;
    const f0 = this.resonantFrequency;
    const q = 1 / (2 * this._config.damping);
    const band = f0 / q;
    const response = this._config.gain * signal * (band / (band + Math.abs(signal - f0)));
    this._output = response;
    this._responses.push({ frequency: signal, amplitude: response, qFactor: q });
    if (this._responses.length > 50) this._responses.shift();
    this._meta.lastInput = signal;
    return response;
  }

  peakResponse(): ResonanceResponse | null {
    if (this._responses.length === 0) return null;
    return this._responses.reduce((best, r) => (r.amplitude > best.amplitude ? r : best));
  }

  tuneCavity(volume: number): void {
    this._config.params.cavityVolume = volume;
    this._meta.tunedVolume = volume;
  }

  tuneNeck(length: number, area: number): void {
    this._config.params.neckLength = length;
    this._config.params.neckArea = area;
  }

  bandwidth(): number {
    const q = 1 / (2 * this._config.damping);
    return this.resonantFrequency / q;
  }

  isAtResonance(frequency: number, tolerance: number = 0.05): boolean {
    return Math.abs(frequency - this.resonantFrequency) / this.resonantFrequency < tolerance;
  }

  sweep(start: number, end: number, steps: number): ResonanceResponse[] {
    const out: ResonanceResponse[] = [];
    for (let i = 0; i <= steps; i++) {
      const f = start + (i / steps) * (end - start);
      this.feed(f);
      out.push(this._responses[this._responses.length - 1]);
    }
    return out;
  }

  report(): Record<string, unknown> {
    return {
      resonantFrequency: this.resonantFrequency,
      bandwidth: this.bandwidth(),
      output: this._output,
      meta: this._meta,
    };
  }
}

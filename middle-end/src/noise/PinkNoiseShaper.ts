/**
 * 粉红噪声塑形器：按1/f频谱塑形噪声用于测试。
 * 生成符合 1/f 频谱分布的粉红噪声，用于测试系统在不同频段的响应特性。
 */

export interface ShapedSample {
  index: number;
  value: number;
  frequency: number;
  power: number;
}

export interface SpectrumProfile {
  frequencies: number[];
  powers: number[];
  slope: number;
}

export class PinkNoiseShaper {
  private _samples: ShapedSample[] = [];
  private _sampleRate = 44100;
  private _octaves = 8;
  private _profile: SpectrumProfile | null = null;

  generate(count: number): ShapedSample[] {
    const generated: ShapedSample[] = [];
    const octaves = this._octaves;
    const phase = new Array(octaves).fill(0).map(() => Math.random() * 2 * Math.PI);

    for (let i = 0; i < count; i++) {
      let value = 0;
      for (let o = 0; o < octaves; o++) {
        const freq = this._sampleRate / Math.pow(2, octaves - o);
        phase[o] += (2 * Math.PI * freq) / this._sampleRate;
        const amplitude = 1 / Math.sqrt(o + 1);
        value += amplitude * Math.sin(phase[o]);
      }
      value /= octaves;
      generated.push({
        index: i,
        value,
        frequency: this._sampleRate / Math.pow(2, octaves / 2),
        power: value * value,
      });
    }
    this._samples = generated;
    this._profile = this._computeProfile(generated);
    return generated;
  }

  shape(values: number[]): ShapedSample[] {
    const shaped: ShapedSample[] = values.map((v, i) => ({
      index: i,
      value: v / Math.sqrt(1 + i / 100),
      frequency: this._sampleRate / Math.pow(2, this._octaves / 2),
      power: v * v / (1 + i / 100),
    }));
    this._samples = shaped;
    this._profile = this._computeProfile(shaped);
    return shaped;
  }

  filterBand(minFreq: number, maxFreq: number): ShapedSample[] {
    return this._samples.filter(s => s.frequency >= minFreq && s.frequency <= maxFreq);
  }

  private _computeProfile(samples: ShapedSample[]): SpectrumProfile {
    const frequencies: number[] = [];
    const powers: number[] = [];
    const bins = 16;
    const binSize = Math.max(1, Math.floor(samples.length / bins));
    for (let b = 0; b < bins; b++) {
      const slice = samples.slice(b * binSize, (b + 1) * binSize);
      if (slice.length === 0) continue;
      const avgPower = slice.reduce((s, x) => s + x.power, 0) / slice.length;
      const freq = (b + 1) / bins * this._sampleRate / 2;
      frequencies.push(freq);
      powers.push(avgPower);
    }
    const slope = this._fitSlope(frequencies, powers);
    return { frequencies, powers, slope };
  }

  private _fitSlope(freqs: number[], powers: number[]): number {
    if (freqs.length < 2) return 0;
    const logF = freqs.map(f => Math.log(Math.max(1e-9, f)));
    const logP = powers.map(p => Math.log(Math.max(1e-9, p)));
    const n = logF.length;
    const sumX = logF.reduce((a, b) => a + b, 0);
    const sumY = logP.reduce((a, b) => a + b, 0);
    const sumXY = logF.reduce((s, x, i) => s + x * logP[i], 0);
    const sumXX = logF.reduce((s, x) => s + x * x, 0);
    return (n * sumXY - sumX * sumY) / Math.max(1e-9, n * sumXX - sumX * sumX);
  }

  setSampleRate(rate: number): void {
    this._sampleRate = Math.max(1, rate);
  }

  setOctaves(n: number): void {
    this._octaves = Math.max(1, n);
  }

  getProfile(): SpectrumProfile | null {
    return this._profile;
  }

  getSamples(): ShapedSample[] {
    return [...this._samples];
  }
}

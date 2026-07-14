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
  rSquared: number;
}

export class PinkNoiseShaper {
  private _samples: ShapedSample[] = [];
  private _sampleRate = 44100;
  private _octaves = 8;
  private _profile: SpectrumProfile | null = null;
  private _vossCounters: number[] = [];
  private _vossValues: number[] = [];
  private _vossRows = 8;

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

  generateVossMcCartney(count: number): ShapedSample[] {
    const rows = this._vossRows;
    if (this._vossValues.length !== rows) {
      this._vossValues = new Array(rows).fill(0).map(() => Math.random() * 2 - 1);
      this._vossCounters = new Array(rows).fill(0);
    }
    const generated: ShapedSample[] = [];
    let counter = 0;
    for (let i = 0; i < count; i++) {
      const changed = (counter ^ (counter + 1)) & counter;
      let numChanged = 0;
      let sum = this._vossValues[0];
      for (let r = 1; r < rows; r++) {
        if ((changed >> r) & 1) {
          this._vossValues[r] = Math.random() * 2 - 1;
          numChanged++;
        }
        sum += this._vossValues[r];
      }
      counter++;
      const value = sum / rows;
      const freq = (i / count) * (this._sampleRate / 2);
      generated.push({
        index: i,
        value,
        frequency: freq,
        power: value * value,
      });
    }
    this._samples = generated;
    this._profile = this._computeProfile(generated);
    return generated;
  }

  shape(values: number[]): ShapedSample[] {
    const shaped: ShapedSample[] = values.map((v, i) => {
      const scaling = 1 / Math.sqrt(1 + i / 100);
      return {
        index: i,
        value: v * scaling,
        frequency: (i / values.length) * (this._sampleRate / 2),
        power: v * v * scaling * scaling,
      };
    });
    this._samples = shaped;
    this._profile = this._computeProfile(shaped);
    return shaped;
  }

  filterBand(minFreq: number, maxFreq: number): ShapedSample[] {
    return this._samples.filter(s => s.frequency >= minFreq && s.frequency <= maxFreq);
  }

  fitSlopeToProfile(): { slope: number; rSquared: number } {
    if (!this._profile) return { slope: 0, rSquared: 0 };
    return { slope: this._profile.slope, rSquared: this._profile.rSquared };
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
      powers.push(Math.max(1e-12, avgPower));
    }
    const { slope, rSquared } = this._fitSlopeWithR2(frequencies, powers);
    return { frequencies, powers, slope, rSquared };
  }

  private _fitSlopeWithR2(freqs: number[], powers: number[]): { slope: number; rSquared: number } {
    if (freqs.length < 2) return { slope: 0, rSquared: 0 };
    const logF = freqs.map(f => Math.log(Math.max(1e-9, f)));
    const logP = powers.map(p => Math.log(Math.max(1e-9, p)));
    const n = logF.length;
    const sumX = logF.reduce((a, b) => a + b, 0);
    const sumY = logP.reduce((a, b) => a + b, 0);
    const sumXY = logF.reduce((s, x, i) => s + x * logP[i], 0);
    const sumXX = logF.reduce((s, x) => s + x * x, 0);
    const sumYY = logP.reduce((s, y) => s + y * y, 0);
    const denom = Math.max(1e-9, n * sumXX - sumX * sumX);
    const slope = (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;
    const ssTot = sumYY - sumY * sumY / n;
    let ssRes = 0;
    for (let i = 0; i < n; i++) {
      const pred = slope * logF[i] + intercept;
      ssRes += (logP[i] - pred) ** 2;
    }
    const rSquared = ssTot > 1e-9 ? Math.max(0, 1 - ssRes / ssTot) : 0;
    return { slope, rSquared };
  }

  crestFactor(): number {
    if (this._samples.length === 0) return 0;
    const peak = Math.max(...this._samples.map(s => Math.abs(s.value)));
    const rms = Math.sqrt(this._samples.reduce((s, x) => s + x.value * x.value, 0) / this._samples.length);
    return rms > 0 ? peak / rms : 0;
  }

  setSampleRate(rate: number): void {
    this._sampleRate = Math.max(1, rate);
  }

  setOctaves(n: number): void {
    this._octaves = Math.max(1, n);
  }

  setVossRows(n: number): void {
    this._vossRows = Math.max(2, Math.min(16, n));
    this._vossValues = [];
    this._vossCounters = [];
  }

  getProfile(): SpectrumProfile | null {
    return this._profile;
  }

  getSamples(): ShapedSample[] {
    return [...this._samples];
  }
}

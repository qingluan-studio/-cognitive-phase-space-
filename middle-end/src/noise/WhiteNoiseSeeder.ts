/**
 * 白噪声播种器：用白噪声作为随机种子。
 * 从均匀分布的白噪声流中提取种子，为下游随机过程提供高质量熵源。
 */

export interface WhiteNoiseSample {
  value: number;
  timestamp: number;
  source: string;
}

export interface SeededPayload {
  seed: number;
  entropy: number;
  derivedFrom: number;
  createdAt: number;
}

export class WhiteNoiseSeeder {
  private _samples: WhiteNoiseSample[] = [];
  private _payloads: SeededPayload[] = [];
  private _maxSamples = 1024;
  private _sources: Set<string> = new Set();

  collect(value: number, source: string = 'default'): WhiteNoiseSample {
    const sample: WhiteNoiseSample = { value, timestamp: Date.now(), source };
    this._samples.push(sample);
    this._sources.add(source);
    if (this._samples.length > this._maxSamples) this._samples.shift();
    return sample;
  }

  generateSeed(): SeededPayload {
    if (this._samples.length === 0) {
      return { seed: 0, entropy: 0, derivedFrom: 0, createdAt: Date.now() };
    }
    const slice = this._samples.slice(-32);
    let seed = 0;
    for (let i = 0; i < slice.length; i++) {
      seed = ((seed << 5) - seed + Math.floor(slice[i].value * 1e6)) | 0;
    }
    const entropy = this._estimateEntropy(slice.map(s => s.value));
    const payload: SeededPayload = {
      seed: Math.abs(seed),
      entropy,
      derivedFrom: slice.length,
      createdAt: Date.now(),
    };
    this._payloads.push(payload);
    if (this._payloads.length > 100) this._payloads.shift();
    return payload;
  }

  private _estimateEntropy(values: number[]): number {
    if (values.length === 0) return 0;
    const buckets = new Array(10).fill(0);
    for (const v of values) {
      const idx = Math.min(9, Math.max(0, Math.floor(v * 10)));
      buckets[idx]++;
    }
    let entropy = 0;
    const total = values.length;
    for (const count of buckets) {
      if (count === 0) continue;
      const p = count / total;
      entropy -= p * Math.log2(p);
    }
    return entropy;
  }

  burstCollect(count: number, source: string = 'burst'): WhiteNoiseSample[] {
    const collected: WhiteNoiseSample[] = [];
    for (let i = 0; i < count; i++) {
      collected.push(this.collect(Math.random(), source));
    }
    return collected;
  }

  purge(source?: string): number {
    if (!source) {
      const count = this._samples.length;
      this._samples = [];
      return count;
    }
    const before = this._samples.length;
    this._samples = this._samples.filter(s => s.source !== source);
    return before - this._samples.length;
  }

  getSamples(): WhiteNoiseSample[] {
    return [...this._samples];
  }

  getPayloads(): SeededPayload[] {
    return [...this._payloads];
  }

  get sourceCount(): number {
    return this._sources.size;
  }

  get sampleCount(): number {
    return this._samples.length;
  }
}

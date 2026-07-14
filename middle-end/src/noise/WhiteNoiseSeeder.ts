export interface WhiteNoiseSample {
  value: number;
  timestamp: number;
  source: string;
}

export interface SeededPayload {
  seed: number;
  entropy: number;
  derivedFrom: number;
  biasIndex: number;
  createdAt: number;
}

export class WhiteNoiseSeeder {
  private _samples: WhiteNoiseSample[] = [];
  private _payloads: SeededPayload[] = [];
  private _maxSamples = 1024;
  private _sources: Set<string> = new Set();
  private _bitStream: number[] = [];
  private _extractedBits: number[] = [];

  collect(value: number, source: string = 'default'): WhiteNoiseSample {
    const sample: WhiteNoiseSample = { value, timestamp: Date.now(), source };
    this._samples.push(sample);
    this._sources.add(source);
    if (this._samples.length > this._maxSamples) this._samples.shift();
    const bit = value >= 0.5 ? 1 : 0;
    this._bitStream.push(bit);
    if (this._bitStream.length > 256) this._bitStream.shift();
    return sample;
  }

  generateSeed(): SeededPayload {
    if (this._samples.length === 0) {
      return { seed: 0, entropy: 0, derivedFrom: 0, biasIndex: 0.5, createdAt: Date.now() };
    }
    const slice = this._samples.slice(-32);
    this._vonNeumannExtract();
    let seed = 0;
    const bits = this._extractedBits.slice(-31);
    for (let i = 0; i < bits.length; i++) {
      seed = (seed << 1) | bits[i];
    }
    seed = seed >>> 0;
    const entropy = this._estimateEntropy(slice.map(s => s.value));
    const biasIndex = this._computeBiasIndex();
    const payload: SeededPayload = {
      seed,
      entropy,
      derivedFrom: slice.length,
      biasIndex,
      createdAt: Date.now(),
    };
    this._payloads.push(payload);
    if (this._payloads.length > 100) this._payloads.shift();
    return payload;
  }

  private _vonNeumannExtract(): void {
    this._extractedBits = [];
    const bits = this._bitStream;
    for (let i = 0; i + 1 < bits.length; i += 2) {
      if (bits[i] === 0 && bits[i + 1] === 1) this._extractedBits.push(0);
      else if (bits[i] === 1 && bits[i + 1] === 0) this._extractedBits.push(1);
    }
  }

  private _computeBiasIndex(): number {
    if (this._bitStream.length === 0) return 0.5;
    const ones = this._bitStream.reduce((s, b) => s + b, 0);
    return ones / this._bitStream.length;
  }

  private _estimateEntropy(values: number[]): number {
    if (values.length === 0) return 0;
    const buckets = new Array(16).fill(0);
    for (const v of values) {
      const idx = Math.min(15, Math.max(0, Math.floor(v * 16)));
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

  chiSquareUniformity(): number {
    if (this._bitStream.length < 16) return 0;
    const n = this._bitStream.length;
    const ones = this._bitStream.reduce((s, b) => s + b, 0);
    const zeros = n - ones;
    const expected = n / 2;
    return ((zeros - expected) ** 2 + (ones - expected) ** 2) / expected;
  }

  runsTest(): { runs: number; zScore: number } {
    const bits = this._bitStream;
    if (bits.length < 4) return { runs: 0, zScore: 0 };
    let runs = 1;
    for (let i = 1; i < bits.length; i++) {
      if (bits[i] !== bits[i - 1]) runs++;
    }
    const n = bits.length;
    const n1 = bits.reduce((s, b) => s + b, 0);
    const n0 = n - n1;
    const expected = (2 * n0 * n1) / n + 1;
    const variance = (2 * n0 * n1 * (2 * n0 * n1 - n)) / (n * n * (n - 1));
    const zScore = variance > 0 ? (runs - expected) / Math.sqrt(variance) : 0;
    return { runs, zScore };
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
      this._bitStream = [];
      this._extractedBits = [];
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

  get extractedBitCount(): number {
    return this._extractedBits.length;
  }
}

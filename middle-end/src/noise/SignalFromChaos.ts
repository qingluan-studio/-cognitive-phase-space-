export interface ChaosChunk {
  data: number[];
  capturedAt: number;
  entropy: number;
}

export interface ExtractedSignal {
  signal: number[];
  confidence: number;
  iterations: number;
  snr: number;
  extractedAt: number;
}

export class SignalFromChaos {
  private _chunks: ChaosChunk[] = [];
  private _maxChunks = 100;
  private _iterations = 50;
  private _threshold = 0.55;
  private _matchedTemplate: number[] = [];
  private _snrHistory: number[] = [];

  ingest(data: number[]): ChaosChunk {
    const entropy = this._computeShannonEntropy(data);
    const chunk: ChaosChunk = { data, capturedAt: Date.now(), entropy };
    this._chunks.push(chunk);
    if (this._chunks.length > this._maxChunks) this._chunks.shift();
    if (this._matchedTemplate.length === 0) this._updateTemplate();
    return chunk;
  }

  extract(): ExtractedSignal {
    if (this._chunks.length === 0) {
      return { signal: [], confidence: 0, iterations: 0, snr: 0, extractedAt: Date.now() };
    }
    const minLen = Math.min(...this._chunks.map(c => c.data.length));
    const accumulated = new Array(minLen).fill(0);
    let weightSum = 0;

    for (const chunk of this._chunks) {
      const coherence = 1 / (1 + chunk.entropy);
      weightSum += coherence;
      for (let i = 0; i < minLen; i++) {
        accumulated[i] += chunk.data[i] * coherence;
      }
    }

    for (let iter = 0; iter < this._iterations; iter++) {
      const decay = 1 / Math.sqrt(iter + 1);
      for (let i = 0; i < minLen; i++) {
        accumulated[i] += accumulated[i] * decay * 0.01;
      }
    }

    const normalized = accumulated.map(v => v / Math.max(1e-9, weightSum));
    const matched = this._applyMatchedFilter(normalized);
    const confidence = this._computeConfidence(matched);
    const snr = this._computeSnr(matched);
    this._snrHistory.push(snr);
    if (this._snrHistory.length > 50) this._snrHistory.shift();
    return {
      signal: matched,
      confidence,
      iterations: this._iterations,
      snr,
      extractedAt: Date.now(),
    };
  }

  private _applyMatchedFilter(signal: number[]): number[] {
    if (this._matchedTemplate.length < 2) return signal;
    const t = this._matchedTemplate;
    const n = t.length;
    const energy = t.reduce((s, v) => s + v * v, 0) || 1;
    const out: number[] = [];
    for (let i = 0; i < signal.length; i++) {
      let acc = 0;
      for (let k = 0; k < n && i + k < signal.length; k++) {
        acc += signal[i + k] * t[k];
      }
      out.push(acc / energy);
    }
    return out;
  }

  private _updateTemplate(): void {
    if (this._chunks.length === 0) return;
    const minLen = Math.min(...this._chunks.map(c => c.data.length));
    const template = new Array(Math.min(16, minLen)).fill(0);
    for (const chunk of this._chunks) {
      for (let i = 0; i < template.length; i++) template[i] += chunk.data[i];
    }
    const n = this._chunks.length || 1;
    this._matchedTemplate = template.map(v => v / n);
  }

  autocorrelate(signal: number[], lag: number): number {
    if (lag >= signal.length || signal.length === 0) return 0;
    const mean = signal.reduce((a, b) => a + b, 0) / signal.length;
    let num = 0, den = 0;
    for (let i = 0; i < signal.length - lag; i++) {
      num += (signal[i] - mean) * (signal[i + lag] - mean);
    }
    for (let i = 0; i < signal.length; i++) {
      den += (signal[i] - mean) ** 2;
    }
    return den === 0 ? 0 : num / den;
  }

  filterAboveThreshold(signal: number[]): number[] {
    const mean = signal.reduce((a, b) => a + b, 0) / Math.max(1, signal.length);
    const variance = signal.reduce((s, v) => s + (v - mean) ** 2, 0) / Math.max(1, signal.length);
    const sigma = Math.sqrt(variance);
    return signal.filter(v => Math.abs(v) >= Math.abs(mean) + sigma * this._threshold);
  }

  private _computeShannonEntropy(data: number[]): number {
    if (data.length === 0) return 0;
    const buckets = new Array(16).fill(0);
    const min = Math.min(...data), max = Math.max(...data);
    const range = max - min || 1;
    for (const v of data) {
      const idx = Math.min(15, Math.floor((v - min) / range * 16));
      buckets[idx]++;
    }
    let h = 0;
    for (const c of buckets) {
      if (c === 0) continue;
      const p = c / data.length;
      h -= p * Math.log2(p);
    }
    return h;
  }

  private _computeConfidence(signal: number[]): number {
    if (signal.length === 0) return 0;
    const mean = signal.reduce((a, b) => a + b, 0) / signal.length;
    const variance = signal.reduce((s, v) => s + (v - mean) ** 2, 0) / signal.length;
    const sigma = Math.sqrt(variance) || 1e-9;
    const peaks = signal.filter(v => Math.abs(v) > mean + 2 * sigma).length;
    return Math.min(1, peaks / signal.length * 10);
  }

  private _computeSnr(signal: number[]): number {
    if (signal.length < 2) return 0;
    const half = Math.floor(signal.length / 2);
    const signalPart = signal.slice(0, half);
    const noisePart = signal.slice(half);
    const sigPower = signalPart.reduce((s, v) => s + v * v, 0) / Math.max(1, signalPart.length);
    const noisePower = noisePart.reduce((s, v) => s + v * v, 0) / Math.max(1, noisePart.length);
    return noisePower === 0 ? 0 : 10 * Math.log10(sigPower / noisePower);
  }

  setIterations(n: number): void {
    this._iterations = Math.max(1, n);
  }

  setThreshold(t: number): void {
    this._threshold = Math.max(0, Math.min(1, t));
  }

  getChunks(): ChaosChunk[] {
    return [...this._chunks];
  }

  get chunkCount(): number {
    return this._chunks.length;
  }

  get averageSnr(): number {
    if (this._snrHistory.length === 0) return 0;
    return this._snrHistory.reduce((a, b) => a + b, 0) / this._snrHistory.length;
  }

  get matchedTemplate(): number[] {
    return [...this._matchedTemplate];
  }
}

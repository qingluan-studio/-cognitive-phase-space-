/**
 * 混沌取信：从完全混沌中提取微弱信号。
 * 在信噪比极低的混沌数据流中，通过统计聚合与相干累积提取出隐藏的微弱信号。
 */

export interface ChaosChunk {
  data: number[];
  capturedAt: number;
  entropy: number;
}

export interface ExtractedSignal {
  signal: number[];
  confidence: number;
  iterations: number;
  extractedAt: number;
}

export class SignalFromChaos {
  private _chunks: ChaosChunk[] = [];
  private _maxChunks = 100;
  private _iterations = 50;
  private _threshold = 0.55;

  ingest(data: number[]): ChaosChunk {
    const entropy = this._computeEntropy(data);
    const chunk: ChaosChunk = { data, capturedAt: Date.now(), entropy };
    this._chunks.push(chunk);
    if (this._chunks.length > this._maxChunks) this._chunks.shift();
    return chunk;
  }

  extract(): ExtractedSignal {
    if (this._chunks.length === 0) {
      return { signal: [], confidence: 0, iterations: 0, extractedAt: Date.now() };
    }
    const minLen = Math.min(...this._chunks.map(c => c.data.length));
    const accumulated = new Array(minLen).fill(0);

    for (let iter = 0; iter < this._iterations; iter++) {
      for (const chunk of this._chunks) {
        for (let i = 0; i < minLen; i++) {
          accumulated[i] += chunk.data[i] * (1 / Math.sqrt(iter + 1));
        }
      }
    }

    const normalized = accumulated.map(v => v / (this._chunks.length * this._iterations));
    const confidence = this._computeConfidence(normalized);
    return {
      signal: normalized,
      confidence,
      iterations: this._iterations,
      extractedAt: Date.now(),
    };
  }

  filterAboveThreshold(signal: number[]): number[] {
    const mean = signal.reduce((a, b) => a + b, 0) / Math.max(1, signal.length);
    return signal.filter(v => Math.abs(v) >= Math.abs(mean) * this._threshold);
  }

  private _computeEntropy(data: number[]): number {
    if (data.length === 0) return 0;
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const variance = data.reduce((s, v) => s + (v - mean) ** 2, 0) / data.length;
    return Math.sqrt(variance);
  }

  private _computeConfidence(signal: number[]): number {
    if (signal.length === 0) return 0;
    const mean = signal.reduce((a, b) => a + b, 0) / signal.length;
    const peaks = signal.filter(v => Math.abs(v) > Math.abs(mean) * 2).length;
    return Math.min(1, peaks / signal.length);
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
}

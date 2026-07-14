export interface VoidSample {
  id: string;
  noise: Record<string, unknown>;
  capturedAt: number;
}

export interface ExtractedOrder {
  id: string;
  pattern: string;
  confidence: number;
  derivedFrom: string[];
}

interface FrequencyPeak {
  frequency: number;
  magnitude: number;
  phase: number;
}

export class VoidGazer {
  private _samples: VoidSample[] = [];
  private _extracted: ExtractedOrder[] = [];
  private _gazeDuration: number = 0;
  private _gazing: boolean = false;
  private _idleThreshold: number = 1000;
  private _timeSeries: number[] = [];
  private _autocorrelation: number[] = [];

  idle(durationMs: number): number {
    this._gazing = true;
    this._gazeDuration += durationMs;
    return this._gazeDuration;
  }

  gaze(sample: VoidSample): void {
    this._samples.push(sample);
    this._gazeDuration += 50;
    const numericValue = this._noiseToScalar(sample.noise);
    this._timeSeries.push(numericValue);
    if (this._timeSeries.length > 256) this._timeSeries.shift();
  }

  extractOrder(): ExtractedOrder[] {
    const results: ExtractedOrder[] = [];
    const buckets = new Map<string, VoidSample[]>();
    for (const s of this._samples) {
      const key = this._signature(s.noise);
      const list = buckets.get(key) ?? [];
      list.push(s);
      buckets.set(key, list);
    }
    for (const [pattern, list] of buckets) {
      if (list.length < 2) continue;
      const confidence = Math.min(1, list.length / 10);
      const order: ExtractedOrder = {
        id: `order-${pattern}-${Date.now()}`,
        pattern,
        confidence,
        derivedFrom: list.map(s => s.id),
      };
      results.push(order);
      this._extracted.push(order);
    }
    if (this._timeSeries.length >= 32) {
      const periodicPatterns = this._extractPeriodicPatterns();
      for (const pp of periodicPatterns) {
        const order: ExtractedOrder = {
          id: `periodic-${pp.frequency.toFixed(3)}-${Date.now()}`,
          pattern: `periodic-freq:${pp.frequency.toFixed(3)}`,
          confidence: pp.magnitude,
          derivedFrom: this._samples.slice(-20).map(s => s.id),
        };
        results.push(order);
        this._extracted.push(order);
      }
    }
    const entropyPattern = this._extractEntropyPattern();
    if (entropyPattern) {
      results.push(entropyPattern);
      this._extracted.push(entropyPattern);
    }
    this._gazing = false;
    return results;
  }

  findPattern(pattern: string): ExtractedOrder | null {
    return this._extracted.find(o => o.pattern === pattern) ?? null;
  }

  stopGazing(): void {
    this._gazing = false;
  }

  get duration(): number {
    return this._gazeDuration;
  }

  get isGazing(): boolean {
    return this._gazing;
  }

  getExtracted(): ExtractedOrder[] {
    return [...this._extracted];
  }

  get sampleCount(): number {
    return this._samples.length;
  }

  get autocorrelation(): number[] {
    return [...this._autocorrelation];
  }

  private _signature(noise: Record<string, unknown>): string {
    const keys = Object.keys(noise).sort();
    return keys.map(k => `${k}:${typeof noise[k]}`).join('|');
  }

  private _noiseToScalar(noise: Record<string, unknown>): number {
    let hash = 0;
    const str = JSON.stringify(noise);
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return (Math.sin(hash) + 1) / 2;
  }

  private _extractPeriodicPatterns(): FrequencyPeak[] {
    const n = this._timeSeries.length;
    this._autocorrelation = this._computeAutocorrelation(this._timeSeries);
    const peaks: FrequencyPeak[] = [];
    const minLag = 4;
    const maxLag = Math.floor(n / 2);
    for (let lag = minLag; lag < maxLag; lag++) {
      const prev = this._autocorrelation[lag - 1] ?? 0;
      const curr = this._autocorrelation[lag];
      const next = this._autocorrelation[lag + 1] ?? 0;
      if (curr > prev && curr > next && curr > 0.3) {
        const frequency = 1 / lag;
        const magnitude = curr;
        const phase = this._estimatePhase(lag);
        peaks.push({ frequency, magnitude, phase });
      }
    }
    peaks.sort((a, b) => b.magnitude - a.magnitude);
    return peaks.slice(0, 3);
  }

  private _computeAutocorrelation(series: number[]): number[] {
    const n = series.length;
    const mean = series.reduce((a, b) => a + b, 0) / n;
    const variance = series.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
    const result: number[] = [];
    for (let lag = 0; lag < n; lag++) {
      let sum = 0;
      for (let i = 0; i < n - lag; i++) {
        sum += (series[i] - mean) * (series[i + lag] - mean);
      }
      const autocorr = variance > 0 ? sum / ((n - lag) * variance) : 0;
      result.push(Math.min(1, Math.max(-1, autocorr)));
    }
    return result;
  }

  private _estimatePhase(period: number): number {
    const n = this._timeSeries.length;
    if (n < period * 2) return 0;
    let maxCorr = -Infinity;
    let bestPhase = 0;
    for (let phase = 0; phase < period; phase++) {
      let sum = 0;
      for (let i = phase; i + period < n; i += period) {
        sum += this._timeSeries[i];
      }
      if (sum > maxCorr) {
        maxCorr = sum;
        bestPhase = phase;
      }
    }
    return bestPhase / period;
  }

  private _extractEntropyPattern(): ExtractedOrder | null {
    if (this._samples.length < 5) return null;
    const recent = this._samples.slice(-20);
    const entropies: number[] = [];
    for (const s of recent) {
      entropies.push(this._sampleEntropy(s.noise));
    }
    const meanEntropy = entropies.reduce((a, b) => a + b, 0) / entropies.length;
    const variance = entropies.reduce((a, b) => a + (b - meanEntropy) ** 2, 0) / entropies.length;
    const cv = Math.sqrt(variance) / (meanEntropy || 1);
    if (cv < 0.15 && meanEntropy > 0.3 && meanEntropy < 0.8) {
      return {
        id: `entropy-${Date.now()}`,
        pattern: `stable-entropy:${meanEntropy.toFixed(3)}`,
        confidence: 1 - cv,
        derivedFrom: recent.map(s => s.id),
      };
    }
    return null;
  }

  private _sampleEntropy(noise: Record<string, unknown>): number {
    const values = Object.values(noise);
    if (values.length === 0) return 0;
    const freq: Record<string, number> = {};
    for (const v of values) {
      const key = typeof v === 'number' ? v.toFixed(2) : String(v);
      freq[key] = (freq[key] || 0) + 1;
    }
    const total = values.length;
    let entropy = 0;
    for (const k in freq) {
      const p = freq[k] / total;
      if (p > 0) entropy -= p * Math.log2(p);
    }
    return entropy / Math.log2(total || 1);
  }
}

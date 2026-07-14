export interface WordlessResponseData {
  intensity: number;
  duration: number;
  timestamp: number;
}

export class WordlessResponse {
  private _intensity: number;
  private _duration: number;
  private _history: WordlessResponseData[];
  private _signalEntropy: number[];
  private _fourierCache: number[];

  constructor() {
    this._intensity = 0;
    this._duration = 0;
    this._history = [];
    this._signalEntropy = [];
    this._fourierCache = [];
  }

  get intensity(): number {
    return this._intensity;
  }

  get duration(): number {
    return this._duration;
  }

  public emit(intensity: number, duration: number): WordlessResponseData {
    this._intensity = intensity;
    this._duration = duration;
    const data: WordlessResponseData = {
      intensity,
      duration,
      timestamp: Date.now(),
    };
    this._history.push(data);
    if (this._history.length > 100) this._history.shift();
    this._signalEntropy.push(this._computeSignalEntropy());
    if (this._signalEntropy.length > 50) this._signalEntropy.shift();
    this._updateFourier();
    return data;
  }

  public silence(): void {
    this._intensity = 0;
    this._duration = 0;
  }

  public amplify(factor: number): void {
    this._intensity = Math.min(1, this._intensity * factor);
  }

  public report(): WordlessResponseData {
    return {
      intensity: this._intensity,
      duration: this._duration,
      timestamp: Date.now(),
    };
  }

  public getHistory(limit: number = 50): WordlessResponseData[] {
    return this._history.slice(-limit);
  }

  public computeSignalEntropy(): number {
    if (this._signalEntropy.length === 0) return 0;
    const mean = this._signalEntropy.reduce((a, b) => a + b, 0) / this._signalEntropy.length;
    const variance = this._signalEntropy.reduce((s, v) => s + (v - mean) ** 2, 0) / this._signalEntropy.length;
    return 0.5 * Math.log2(2 * Math.PI * Math.E * Math.max(variance, 1e-10));
  }

  public computeFourierSpectrum(): number[] {
    return [...this._fourierCache];
  }

  public computeSpectralCentroid(): number {
    if (this._fourierCache.length === 0) return 0;
    const weightedSum = this._fourierCache.reduce((s, v, i) => s + v * i, 0);
    const total = this._fourierCache.reduce((s, v) => s + v, 0);
    return total > 0 ? weightedSum / total : 0;
  }

  public detectPatterns(): Array<{ start: number; end: number; avgIntensity: number }> {
    const patterns: Array<{ start: number; end: number; avgIntensity: number }> = [];
    if (this._history.length < 2) return patterns;
    let start = 0;
    for (let i = 1; i < this._history.length; i++) {
      if (Math.abs(this._history[i].intensity - this._history[i - 1].intensity) > 0.1) {
        const segment = this._history.slice(start, i);
        const avg = segment.reduce((s, v) => s + v.intensity, 0) / segment.length;
        patterns.push({ start, end: i - 1, avgIntensity: avg });
        start = i;
      }
    }
    const segment = this._history.slice(start);
    const avg = segment.reduce((s, v) => s + v.intensity, 0) / segment.length;
    patterns.push({ start, end: this._history.length - 1, avgIntensity: avg });
    return patterns;
  }

  private _computeSignalEntropy(): number {
    const intensities = this._history.map(h => h.intensity);
    const total = intensities.reduce((a, b) => a + b, 0);
    if (total === 0) return 0;
    let entropy = 0;
    for (const v of intensities) {
      const p = v / total;
      if (p > 0) entropy -= p * Math.log2(p);
    }
    return entropy;
  }

  private _updateFourier(): void {
    const intensities = this._history.map(h => h.intensity);
    const N = intensities.length;
    if (N === 0) return;
    const result: number[] = new Array(N).fill(0);
    for (let k = 0; k < N; k++) {
      let real = 0;
      let imag = 0;
      for (let n = 0; n < N; n++) {
        const angle = -2 * Math.PI * k * n / N;
        real += intensities[n] * Math.cos(angle);
        imag += intensities[n] * Math.sin(angle);
      }
      result[k] = Math.sqrt(real * real + imag * imag);
    }
    this._fourierCache = result;
  }
}

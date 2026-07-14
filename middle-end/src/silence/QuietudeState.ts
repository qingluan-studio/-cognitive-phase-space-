export interface QuietudeSnapshot {
  timestamp: number;
  amplitude: number;
  dominantFrequency: number;
  entropy: number;
}

export class QuietudeState {
  private _amplitude: number;
  private _dominantFrequency: number;
  private _history: QuietudeSnapshot[];
  private _threshold: number;
  private _spectralDensity: number[];
  private _autocorrelation: number[];

  constructor(threshold: number = 0.01) {
    this._amplitude = 0;
    this._dominantFrequency = 0;
    this._history = [];
    this._threshold = threshold;
    this._spectralDensity = [];
    this._autocorrelation = [];
  }

  get amplitude(): number {
    return this._amplitude;
  }

  get dominantFrequency(): number {
    return this._dominantFrequency;
  }

  get isSilent(): boolean {
    return this._amplitude < this._threshold;
  }

  public sample(value: number): QuietudeSnapshot {
    this._amplitude = Math.abs(value);
    this._dominantFrequency = this._estimateFrequency(value);
    const entropy = this._computeSpectralEntropy();
    const snapshot: QuietudeSnapshot = {
      timestamp: Date.now(),
      amplitude: this._amplitude,
      dominantFrequency: this._dominantFrequency,
      entropy,
    };
    this._history.push(snapshot);
    if (this._history.length > 100) this._history.shift();
    this._autocorrelation.push(this._amplitude);
    if (this._autocorrelation.length > 100) this._autocorrelation.shift();
    return snapshot;
  }

  public deepenSilence(factor: number): void {
    this._amplitude = Math.max(0, this._amplitude * (1 - factor));
  }

  public disturb(amount: number): void {
    this._amplitude += amount;
  }

  public report(): QuietudeSnapshot {
    return {
      timestamp: Date.now(),
      amplitude: this._amplitude,
      dominantFrequency: this._dominantFrequency,
      entropy: this._computeSpectralEntropy(),
    };
  }

  public getHistory(limit: number = 50): QuietudeSnapshot[] {
    return this._history.slice(-limit);
  }

  public computeSpectralEntropy(): number {
    if (this._spectralDensity.length === 0) return 0;
    const total = this._spectralDensity.reduce((a, b) => a + b, 0);
    if (total === 0) return 0;
    let entropy = 0;
    for (const d of this._spectralDensity) {
      const p = d / total;
      if (p > 0) entropy -= p * Math.log2(p);
    }
    return entropy;
  }

  public computeAutocorrelation(lag: number): number {
    if (this._autocorrelation.length <= lag) return 0;
    const mean = this._autocorrelation.reduce((a, b) => a + b, 0) / this._autocorrelation.length;
    let num = 0;
    let den = 0;
    for (let i = 0; i < this._autocorrelation.length - lag; i++) {
      num += (this._autocorrelation[i] - mean) * (this._autocorrelation[i + lag] - mean);
    }
    for (let i = 0; i < this._autocorrelation.length; i++) {
      den += (this._autocorrelation[i] - mean) ** 2;
    }
    return den > 0 ? num / den : 0;
  }

  public detectSilenceEvents(): QuietudeSnapshot[] {
    return this._history.filter(s => s.amplitude < this._threshold);
  }

  public computeSignalToNoiseRatio(): number {
    const signal = this._history.filter(s => s.amplitude >= this._threshold).reduce((s, v) => s + v.amplitude, 0);
    const noise = this._history.filter(s => s.amplitude < this._threshold).reduce((s, v) => s + v.amplitude, 0);
    return noise > 0 ? signal / noise : signal;
  }

  private _estimateFrequency(value: number): number {
    return Math.abs(value) * 100;
  }

  private _computeSpectralEntropy(): number {
    this._spectralDensity = [this._amplitude, this._amplitude * 0.5, this._amplitude * 0.25];
    return this.computeSpectralEntropy();
  }
}

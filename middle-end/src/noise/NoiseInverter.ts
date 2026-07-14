export interface NoiseSample {
  timestamp: number;
  amplitude: number;
  frequency: number;
  phase: number;
}

export interface CancellationResult {
  original: number;
  inverted: number;
  residual: number;
  cancelledRatio: number;
}

export interface CoherenceReport {
  magnitude: number;
  phaseLock: number;
  isCoherent: boolean;
}

export class NoiseInverter {
  private _buffer: NoiseSample[] = [];
  private _maxBufferSize = 1024;
  private _calibrationFactor = 1.0;
  private _totalCancelled = 0;
  private _totalProcessed = 0;
  private _lmsWeights: number[] = new Array(16).fill(0);
  private _lmsStep = 0.005;
  private _referenceHistory: number[] = [];
  private _dcOffset = 0;
  private _coherenceWindow = 64;

  ingest(sample: NoiseSample): void {
    this._buffer.push(sample);
    this._referenceHistory.push(sample.amplitude);
    if (this._buffer.length > this._maxBufferSize) this._buffer.shift();
    if (this._referenceHistory.length > this._lmsWeights.length) this._referenceHistory.shift();
    this._dcOffset = 0.95 * this._dcOffset + 0.05 * sample.amplitude;
  }

  invert(sample: NoiseSample): NoiseSample {
    const adjusted = sample.amplitude - this._dcOffset;
    return {
      timestamp: sample.timestamp,
      amplitude: -adjusted * this._calibrationFactor,
      frequency: sample.frequency,
      phase: (sample.phase + Math.PI) % (2 * Math.PI),
    };
  }

  cancel(sample: NoiseSample): CancellationResult {
    const predicted = this._lmsPredict();
    const inverted = this.invert(sample);
    const residual = sample.amplitude + inverted.amplitude - predicted;
    const cancelledRatio = sample.amplitude !== 0
      ? Math.abs(residual / sample.amplitude)
      : 0;
    this._lmsAdapt(sample.amplitude, residual);
    this._totalProcessed++;
    this._totalCancelled += Math.abs(sample.amplitude) - Math.abs(residual);
    return {
      original: sample.amplitude,
      inverted: inverted.amplitude,
      residual,
      cancelledRatio: 1 - Math.min(1, Math.abs(cancelledRatio)),
    };
  }

  private _lmsPredict(): number {
    const w = this._lmsWeights;
    const h = this._referenceHistory;
    let y = 0;
    const n = Math.min(w.length, h.length);
    for (let i = 0; i < n; i++) y += w[i] * h[h.length - 1 - i];
    return y;
  }

  private _lmsAdapt(target: number, residual: number): void {
    const w = this._lmsWeights;
    const h = this._referenceHistory;
    const n = Math.min(w.length, h.length);
    const err = residual;
    for (let i = 0; i < n; i++) {
      w[i] += this._lmsStep * err * h[h.length - 1 - i];
    }
  }

  calibrate(reference: NoiseSample[]): number {
    if (reference.length === 0) return this._calibrationFactor;
    const n = reference.length;
    const mean = reference.reduce((s, r) => s + r.amplitude, 0) / n;
    const variance = reference.reduce((s, r) => s + (r.amplitude - mean) ** 2, 0) / n;
    const sigma = Math.sqrt(variance) || 1e-9;
    this._calibrationFactor = 1 / (1 + sigma);
    this._dcOffset = mean;
    return this._calibrationFactor;
  }

  spectralCoherence(): CoherenceReport {
    const win = this._buffer.slice(-this._coherenceWindow);
    if (win.length < 8) return { magnitude: 0, phaseLock: 0, isCoherent: false };
    const mags: number[] = [];
    const phases: number[] = [];
    const half = Math.floor(win.length / 2);
    for (let k = 1; k < half; k++) {
      let re = 0, im = 0;
      for (let t = 0; t < win.length; t++) {
        const angle = -2 * Math.PI * k * t / win.length;
        re += win[t].amplitude * Math.cos(angle);
        im += win[t].amplitude * Math.sin(angle);
      }
      mags.push(Math.hypot(re, im));
      phases.push(Math.atan2(im, re));
    }
    const meanMag = mags.reduce((a, b) => a + b, 0) / mags.length;
    const maxMag = Math.max(...mags);
    const magnitude = maxMag > 0 ? meanMag / maxMag : 0;
    const phaseMean = phases.reduce((a, b) => a + b, 0) / phases.length;
    const phaseLock = Math.abs(phases.reduce((s, p) => s + Math.cos(p - phaseMean), 0)) / phases.length;
    return { magnitude, phaseLock, isCoherent: phaseLock > 0.6 && magnitude < 0.4 };
  }

  setCalibration(factor: number): void {
    this._calibrationFactor = Math.max(0, factor);
  }

  setLmsStep(step: number): void {
    this._lmsStep = Math.max(0, Math.min(0.1, step));
  }

  clearBuffer(): void {
    this._buffer = [];
    this._referenceHistory = [];
    this._lmsWeights = new Array(this._lmsWeights.length).fill(0);
  }

  getBuffer(): NoiseSample[] {
    return [...this._buffer];
  }

  get averageCancellation(): number {
    if (this._totalProcessed === 0) return 0;
    return this._totalCancelled / this._totalProcessed;
  }

  get bufferSize(): number {
    return this._buffer.length;
  }

  get dcOffset(): number {
    return this._dcOffset;
  }

  get lmsWeights(): number[] {
    return [...this._lmsWeights];
  }
}

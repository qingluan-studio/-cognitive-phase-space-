export interface AnomalySignal {
  id: string;
  raw: number;
  amplified: number;
  baseline: number;
  anomalyScore: number;
  detected: boolean;
  zScore: number;
  snr: number;
  scale: number;
  coherence: number;
}

export interface AmplifierConfig {
  noiseFloor: number;
  gain: number;
  saturation: number;
  sensitivity: number;
  resonanceNoise: number;
  waveletScales: number;
  ewmaAlpha: number;
  coherenceThreshold: number;
}

interface WaveletCoeff {
  scale: number;
  value: number;
}

export class StochasticAmplifier {
  private _signals: Map<string, AnomalySignal> = new Map();
  private _config: AmplifierConfig;
  private _baseline: number;
  private _baselineVar: number;
  private _detectionCount = 0;
  private _rejectionCount = 0;
  private _sampleBuffer: number[] = [];
  private _maxBuffer = 64;
  private _waveletHistory: WaveletCoeff[][] = [];
  private _rngState = 12345;
  private _autoCorrelation: number[] = [];
  private _resonanceLevel = 0;
  private _optimalNoise = 0;

  constructor(config?: Partial<AmplifierConfig>) {
    this._config = {
      noiseFloor: config?.noiseFloor ?? 0.02,
      gain: config?.gain ?? 8,
      saturation: config?.saturation ?? 1,
      sensitivity: config?.sensitivity ?? 0.05,
      resonanceNoise: config?.resonanceNoise ?? 0.01,
      waveletScales: config?.waveletScales ?? 4,
      ewmaAlpha: config?.ewmaAlpha ?? 0.05,
      coherenceThreshold: config?.coherenceThreshold ?? 0.3,
    };
    this._baseline = this._config.noiseFloor;
    this._baselineVar = this._config.noiseFloor * this._config.noiseFloor;
  }

  private _nextRandom(): number {
    this._rngState = (this._rngState * 1664525 + 1013904223) | 0;
    return ((this._rngState >>> 0) % 10000) / 10000;
  }

  private _gaussianNoise(std: number): number {
    const u1 = Math.max(0.0001, this._nextRandom());
    const u2 = this._nextRandom();
    return std * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  feed(id: string, raw: number): AnomalySignal {
    this._sampleBuffer.push(raw);
    if (this._sampleBuffer.length > this._maxBuffer) this._sampleBuffer.shift();

    const noiseInjected = raw + this._gaussianNoise(this._config.resonanceNoise);
    const waveletCoeffs = this._morletWaveletTransform(noiseInjected);
    this._waveletHistory.push(waveletCoeffs);
    if (this._waveletHistory.length > 16) this._waveletHistory.shift();

    const multiScaleScore = this._multiScaleDetection(waveletCoeffs);
    const zScore = this._zScore(raw);
    const coherence = this._temporalCoherence(waveletCoeffs);

    const deviation = Math.abs(raw - this._baseline);
    const stdBaseline = Math.sqrt(this._baselineVar);
    const rawZ = stdBaseline > 0 ? deviation / stdBaseline : 0;

    const anomalyScore = this._combineScores(multiScaleScore, rawZ, coherence);
    const isAnomaly = anomalyScore > this._config.sensitivity;

    let amplified: number;
    if (isAnomaly) {
      const resonanceBoost = 1 + this._resonanceLevel * 0.5;
      amplified = this._nonlinearAmplification(raw, this._baseline, this._config.gain * resonanceBoost);
      this._detectionCount++;
    } else {
      amplified = raw;
      this._rejectionCount++;
    }

    const snr = this._computeSNR(raw, this._baseline, stdBaseline);

    const signal: AnomalySignal = {
      id,
      raw,
      amplified,
      baseline: this._baseline,
      anomalyScore,
      detected: isAnomaly,
      zScore,
      snr,
      scale: this._dominantScale(waveletCoeffs),
      coherence,
    };

    this._signals.set(id, signal);
    this._updateBaseline(raw);
    this._updateAutoCorrelation(raw);
    this._adaptResonanceNoise();

    return signal;
  }

  private _morletWaveletTransform(x: number): WaveletCoeff[] {
    const scales = this._config.waveletScales;
    const coeffs: WaveletCoeff[] = [];
    const history = this._sampleBuffer;
    const n = history.length;

    for (let s = 1; s <= scales; s++) {
      const scale = Math.pow(1.5, s - 1);
      const width = Math.floor(scale * 3);
      if (width >= n) {
        coeffs.push({ scale, value: 0 });
        continue;
      }

      let real = 0, imag = 0;
      const norm = 1 / Math.sqrt(Math.PI * scale * scale);
      for (let k = 0; k < width; k++) {
        const idx = n - 1 - k;
        if (idx < 0) break;
        const t = k / scale;
        const gauss = Math.exp(-0.5 * t * t);
        const omega0 = 5;
        real += history[idx] * norm * gauss * Math.cos(omega0 * t);
        imag += history[idx] * norm * gauss * Math.sin(omega0 * t);
      }
      const magnitude = Math.sqrt(real * real + imag * imag);
      coeffs.push({ scale, value: magnitude });
    }

    return coeffs;
  }

  private _multiScaleDetection(coeffs: WaveletCoeff[]): number {
    if (coeffs.length === 0) return 0;

    let totalScore = 0;
    let totalWeight = 0;

    for (let i = 0; i < coeffs.length; i++) {
      const c = coeffs[i];
      const history = this._waveletHistory;
      if (history.length < 2) continue;

      const prevCoeffs = history[history.length - 2];
      const prev = prevCoeffs[i]?.value ?? 0;
      const baselineScale = this._scaleBaseline(i);
      const stdScale = this._scaleStd(i);

      const z = stdScale > 0 ? (c.value - baselineScale) / stdScale : 0;
      const consistency = prev > baselineScale * 0.5 ? 1 : 0.3;
      const weight = 1 / (1 + c.scale);

      totalScore += Math.max(0, z) * weight * consistency;
      totalWeight += weight;
    }

    return totalWeight === 0 ? 0 : totalScore / totalWeight;
  }

  private _scaleBaseline(scaleIdx: number): number {
    let sum = 0, count = 0;
    for (const h of this._waveletHistory.slice(0, -1)) {
      if (h[scaleIdx]) {
        sum += h[scaleIdx].value;
        count++;
      }
    }
    return count === 0 ? 0 : sum / count;
  }

  private _scaleStd(scaleIdx: number): number {
    const mean = this._scaleBaseline(scaleIdx);
    let sum = 0, count = 0;
    for (const h of this._waveletHistory.slice(0, -1)) {
      if (h[scaleIdx]) {
        sum += (h[scaleIdx].value - mean) ** 2;
        count++;
      }
    }
    return count === 0 ? 0.001 : Math.sqrt(sum / count);
  }

  private _temporalCoherence(current: WaveletCoeff[]): number {
    if (this._waveletHistory.length < 4) return 1;

    let coherenceSum = 0;
    let count = 0;

    for (let s = 0; s < current.length; s++) {
      let phaseConsistency = 0;
      const recent = this._waveletHistory.slice(-4);
      for (let t = 1; t < recent.length; t++) {
        const prev = recent[t - 1][s]?.value ?? 0;
        const curr = recent[t][s]?.value ?? 0;
        if (prev > 0 && curr > 0) {
          phaseConsistency += Math.sign(curr - prev) === Math.sign(prev - (recent[t - 2]?.[s]?.value ?? 0)) ? 1 : 0;
        }
      }
      coherenceSum += phaseConsistency / Math.max(1, recent.length - 2);
      count++;
    }

    return count === 0 ? 0 : coherenceSum / count;
  }

  private _zScore(value: number): number {
    const std = Math.sqrt(this._baselineVar);
    return std === 0 ? 0 : Math.abs(value - this._baseline) / std;
  }

  private _combineScores(multiScale: number, zScore: number, coherence: number): number {
    const ms = 1 - Math.exp(-multiScale * 2);
    const zs = 1 - Math.exp(-zScore * 0.8);
    const co = coherence;
    return ms * 0.4 + zs * 0.35 + co * 0.25;
  }

  private _nonlinearAmplification(raw: number, baseline: number, gain: number): number {
    const delta = raw - baseline;
    const sign = Math.sign(delta);
    const magnitude = Math.abs(delta);
    const compressed = Math.log1p(magnitude * gain) * this._config.saturation / Math.log1p(gain);
    return baseline + sign * Math.min(this._config.saturation, compressed);
  }

  private _computeSNR(raw: number, baseline: number, std: number): number {
    const signalPower = (raw - baseline) ** 2;
    const noisePower = std * std;
    return noisePower === 0 ? 0 : 10 * Math.log10(signalPower / noisePower);
  }

  private _dominantScale(coeffs: WaveletCoeff[]): number {
    let best = 0, bestVal = -1;
    for (const c of coeffs) {
      if (c.value > bestVal) {
        bestVal = c.value;
        best = c.scale;
      }
    }
    return best;
  }

  private _updateBaseline(value: number): void {
    const alpha = this._config.ewmaAlpha;
    const prevMean = this._baseline;
    this._baseline = prevMean + alpha * (value - prevMean);
    this._baselineVar = (1 - alpha) * (this._baselineVar + alpha * (value - prevMean) ** 2);
    this._baselineVar = Math.max(0.0001, this._baselineVar);
  }

  private _updateAutoCorrelation(value: number): void {
    const n = this._sampleBuffer.length;
    if (n < 4) return;
    const mean = this._baseline;
    const autoc: number[] = [];
    for (let lag = 1; lag <= Math.min(8, n - 1); lag++) {
      let sum = 0;
      for (let i = lag; i < n; i++) {
        sum += (this._sampleBuffer[i] - mean) * (this._sampleBuffer[i - lag] - mean);
      }
      autoc.push(sum / (n - lag));
    }
    this._autoCorrelation = autoc;
  }

  private _adaptResonanceNoise(): void {
    if (this._detectionCount + this._rejectionCount < 10) return;
    const detectionRate = this.detectionRate;
    const targetRate = 0.1;
    const error = targetRate - detectionRate;
    this._optimalNoise = this._config.resonanceNoise * (1 + error * 2);
    this._optimalNoise = Math.max(0.001, Math.min(0.1, this._optimalNoise));
    this._resonanceLevel = Math.exp(-Math.abs(error) * 5);
  }

  burstFeed(items: Array<{ id: string; raw: number }>): AnomalySignal[] {
    return items.map(item => this.feed(item.id, item.raw));
  }

  detectedSignals(): AnomalySignal[] {
    return Array.from(this._signals.values()).filter(s => s.detected);
  }

  topAnomalies(limit = 5): AnomalySignal[] {
    return Array.from(this._signals.values())
      .filter(s => s.detected)
      .sort((a, b) => b.anomalyScore - a.anomalyScore)
      .slice(0, limit);
  }

  recalibrate(): void {
    const values = Array.from(this._signals.values()).map(s => s.raw);
    if (values.length > 0) {
      const mean = values.reduce((s, v) => s + v, 0) / values.length;
      const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
      this._baseline = mean;
      this._baselineVar = Math.max(0.0001, variance);
    }
  }

  tune(partial: Partial<AmplifierConfig>): void {
    this._config = { ...this._config, ...partial };
  }

  signalToNoise(): number {
    const detected = this.detectedSignals();
    if (detected.length === 0) return 0;
    const signalPower = detected.reduce((s, x) => s + Math.pow(x.amplified - x.baseline, 2), 0) / detected.length;
    const noisePower = this._baselineVar;
    return noisePower === 0 ? 0 : 10 * Math.log10(signalPower / noisePower);
  }

  autoCorrelationAt(lag: number): number {
    return this._autoCorrelation[lag] ?? 0;
  }

  reset(): void {
    this._signals.clear();
    this._detectionCount = 0;
    this._rejectionCount = 0;
    this._baseline = this._config.noiseFloor;
    this._baselineVar = this._config.noiseFloor * this._config.noiseFloor;
    this._sampleBuffer = [];
    this._waveletHistory = [];
    this._autoCorrelation = [];
    this._resonanceLevel = 0;
    this._optimalNoise = this._config.resonanceNoise;
  }

  get signalCount(): number { return this._signals.size; }
  get detectionRate(): number {
    const total = this._detectionCount + this._rejectionCount;
    return total === 0 ? 0 : this._detectionCount / total;
  }
  get baseline(): number { return this._baseline; }
  get baselineStd(): number { return Math.sqrt(this._baselineVar); }
  get resonanceLevel(): number { return this._resonanceLevel; }
  get optimalNoise(): number { return this._optimalNoise; }
  get config(): AmplifierConfig { return { ...this._config }; }
}

export interface ResonanceSample {
  id: string;
  signal: number;
  noise: number;
  combined: number;
  detected: boolean;
  snr: number;
  resonanceScore: number;
}

export interface ResonanceConfig {
  noiseAmplitude: number;
  detectionThreshold: number;
  iterations: number;
  adaptiveLearningRate: number;
}

export class StochasticResonator {
  private _samples: Map<string, ResonanceSample> = new Map();
  private _config: ResonanceConfig;
  private _bestNoiseAmplitude = 0;
  private _bestSnr = 0;
  private _detectionCount = 0;
  private _noiseHistory: number[] = [];
  private _snrHistory: number[] = [];
  private _adaptiveNoise = 0.3;

  constructor(config?: Partial<ResonanceConfig>) {
    this._config = {
      noiseAmplitude: config?.noiseAmplitude ?? 0.3,
      detectionThreshold: config?.detectionThreshold ?? 0.5,
      iterations: config?.iterations ?? 5,
      adaptiveLearningRate: config?.adaptiveLearningRate ?? 0.05,
    };
    this._adaptiveNoise = this._config.noiseAmplitude;
  }

  resonate(id: string, signal: number): ResonanceSample {
    const noiseAmp = this._adaptiveNoise;
    let bestCombined = signal;
    let bestNoise = 0;
    let bestResonance = 0;
    let detected = signal >= this._config.detectionThreshold;
    const noiseSamples: number[] = [];

    for (let i = 0; i < this._config.iterations; i++) {
      const noise = this._gaussianNoise(noiseAmp);
      noiseSamples.push(noise);
      const combined = signal + noise;
      const resonance = this._resonanceMeasure(signal, noise, combined);
      if (Math.abs(combined) >= this._config.detectionThreshold && !detected) {
        bestCombined = combined;
        bestNoise = noise;
        bestResonance = resonance;
        detected = true;
      }
      if (resonance > bestResonance) {
        bestResonance = resonance;
        if (!detected) {
          bestCombined = combined;
          bestNoise = noise;
        }
      }
    }

    const noisePower = noiseSamples.reduce((s, n) => s + n * n, 0) / noiseSamples.length;
    const snr = noisePower === 0 ? 0 : (signal * signal) / noisePower;

    const sample: ResonanceSample = {
      id, signal, noise: bestNoise, combined: bestCombined,
      detected, snr, resonanceScore: bestResonance,
    };

    this._samples.set(id, sample);
    if (detected) this._detectionCount++;

    this._noiseHistory.push(noiseAmp);
    this._snrHistory.push(snr);
    if (this._noiseHistory.length > 50) {
      this._noiseHistory.shift();
      this._snrHistory.shift();
    }

    this._adaptNoise(snr, detected);

    if (snr > this._bestSnr) {
      this._bestSnr = snr;
      this._bestNoiseAmplitude = noiseAmp;
    }

    return sample;
  }

  private _gaussianNoise(std: number): number {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v) * std;
  }

  private _resonanceMeasure(signal: number, noise: number, combined: number): number {
    const threshold = this._config.detectionThreshold;
    const distance = Math.abs(Math.abs(combined) - threshold);
    const proximityBoost = Math.exp(-distance * 10);
    const signalToNoiseRatio = Math.abs(signal) / (Math.abs(noise) + 0.001);
    return Math.min(1, proximityBoost * (1 + signalToNoiseRatio * 0.1));
  }

  private _adaptNoise(currentSnr: number, detected: boolean): void {
    if (this._snrHistory.length < 5) return;
    const recentSnr = this._snrHistory.slice(-5);
    const avgSnr = recentSnr.reduce((s, x) => s + x, 0) / recentSnr.length;
    const snrTrend = currentSnr - avgSnr;
    const rateError = 0.7 - this.detectionRate();
    const adjustment = rateError * this._config.adaptiveLearningRate + snrTrend * 0.01;
    this._adaptiveNoise = Math.max(0.01, Math.min(1.0, this._adaptiveNoise + adjustment));
  }

  burstResonate(items: Array<{ id: string; signal: number }>): ResonanceSample[] {
    return items.map(item => this.resonate(item.id, item.signal));
  }

  optimizeNoise(testSignals: number[]): number {
    const amplitudes: number[] = [];
    for (let i = 1; i <= 10; i++) amplitudes.push(i * 0.1);
    let bestAmp = this._config.noiseAmplitude;
    let bestScore = -Infinity;
    const original = this._config.noiseAmplitude;

    for (const amp of amplitudes) {
      this._config.noiseAmplitude = amp;
      this._adaptiveNoise = amp;
      let detected = 0, totalSnr = 0;
      for (let j = 0; j < testSignals.length; j++) {
        const sample = this.resonate(`opt-${amp}-${j}`, testSignals[j]);
        if (sample.detected) detected++;
        totalSnr += sample.snr;
      }
      const score = (detected / testSignals.length) * 0.6 + Math.min(1, (totalSnr / testSignals.length) * 0.4);
      if (score > bestScore) {
        bestScore = score;
        bestAmp = amp;
      }
    }
    this._config.noiseAmplitude = original;
    this._adaptiveNoise = bestAmp;
    return bestAmp;
  }

  findResonancePeak(signal: number, steps = 20): { amplitude: number; score: number } {
    let peakAmp = 0, peakScore = 0, threshold = this._config.detectionThreshold;
    for (let i = 0; i <= steps; i++) {
      const amp = (i / steps) * 1.0;
      let avgResonance = 0, detectionCount = 0;
      for (let j = 0; j < 30; j++) {
        const noise = this._gaussianNoise(amp), combined = signal + noise;
        avgResonance += this._resonanceMeasure(signal, noise, combined);
        if (Math.abs(combined) >= threshold) detectionCount++;
      }
      const score = (avgResonance / 30) * 0.4 + (detectionCount / 30) * 0.6;
      if (score > peakScore) { peakScore = score; peakAmp = amp; }
    }
    return { amplitude: peakAmp, score: peakScore };
  }

  detectedSamples(): ResonanceSample[] {
    return Array.from(this._samples.values()).filter(s => s.detected);
  }

  averageSnr(): number {
    if (this._samples.size === 0) return 0;
    return Array.from(this._samples.values()).reduce((s, x) => s + x.snr, 0) / this._samples.size;
  }

  detectionRate(): number {
    return this._samples.size === 0 ? 0 : this._detectionCount / this._samples.size;
  }

  tune(partial: Partial<ResonanceConfig>): void {
    this._config = { ...this._config, ...partial };
    if (partial.noiseAmplitude !== undefined) this._adaptiveNoise = partial.noiseAmplitude;
  }

  reset(): void {
    this._samples.clear();
    this._detectionCount = 0;
    this._bestSnr = 0;
    this._noiseHistory = [];
    this._snrHistory = [];
    this._adaptiveNoise = this._config.noiseAmplitude;
  }

  get sampleCount(): number { return this._samples.size; }
  get bestNoiseAmplitude(): number { return this._bestNoiseAmplitude; }
  get adaptiveNoise(): number { return this._adaptiveNoise; }
  get config(): ResonanceConfig { return { ...this._config }; }
}
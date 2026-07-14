/**
 * 随机共振器模块：通过注入受控噪声增强微弱信号的检测能力，
 * 利用噪声与信号的共振效应将亚阈值信号抬升至可检测范围。
 */

export interface ResonanceSample {
  id: string;
  signal: number;
  noise: number;
  combined: number;
  detected: boolean;
  snr: number;
}

export interface ResonanceConfig {
  noiseAmplitude: number;
  detectionThreshold: number;
  iterations: number;
}

export class StochasticResonator {
  private _samples: Map<string, ResonanceSample> = new Map();
  private _config: ResonanceConfig;
  private _bestNoiseAmplitude = 0;
  private _bestSnr = 0;
  private _detectionCount = 0;

  constructor(config?: Partial<ResonanceConfig>) {
    this._config = {
      noiseAmplitude: config?.noiseAmplitude ?? 0.3,
      detectionThreshold: config?.detectionThreshold ?? 0.5,
      iterations: config?.iterations ?? 5,
    };
  }

  resonate(id: string, signal: number): ResonanceSample {
    let bestCombined = signal;
    let bestNoise = 0;
    let detected = signal >= this._config.detectionThreshold;

    if (!detected) {
      for (let i = 0; i < this._config.iterations; i++) {
        const noise = (Math.random() - 0.5) * 2 * this._config.noiseAmplitude;
        const combined = signal + noise;
        if (Math.abs(combined) >= this._config.detectionThreshold) {
          bestCombined = combined;
          bestNoise = noise;
          detected = true;
          break;
        }
      }
    }

    const snr = signal === 0 ? 0 : Math.abs(signal) / (this._config.noiseAmplitude + 0.001);
    const sample: ResonanceSample = {
      id,
      signal,
      noise: bestNoise,
      combined: bestCombined,
      detected,
      snr,
    };
    this._samples.set(id, sample);
    if (detected) this._detectionCount++;

    if (snr > this._bestSnr) {
      this._bestSnr = snr;
      this._bestNoiseAmplitude = this._config.noiseAmplitude;
    }

    return sample;
  }

  burstResonate(items: Array<{ id: string; signal: number }>): ResonanceSample[] {
    return items.map(item => this.resonate(item.id, item.signal));
  }

  optimizeNoise(testSignals: number[]): number {
    const amplitudes = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6];
    let bestAmp = this._config.noiseAmplitude;
    let bestDetectionRate = 0;

    for (const amp of amplitudes) {
      const original = this._config.noiseAmplitude;
      this._config.noiseAmplitude = amp;
      let detected = 0;
      for (const signal of testSignals) {
        const sample = this.resonate(`opt-${amp}-${detected}`, signal);
        if (sample.detected) detected++;
      }
      const rate = detected / testSignals.length;
      if (rate > bestDetectionRate) {
        bestDetectionRate = rate;
        bestAmp = amp;
      }
      this._config.noiseAmplitude = original;
    }

    this._config.noiseAmplitude = bestAmp;
    return bestAmp;
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
  }

  reset(): void {
    this._samples.clear();
    this._detectionCount = 0;
    this._bestSnr = 0;
  }

  get sampleCount(): number {
    return this._samples.size;
  }

  get bestNoiseAmplitude(): number {
    return this._bestNoiseAmplitude;
  }

  get config(): ResonanceConfig {
    return { ...this._config };
  }
}

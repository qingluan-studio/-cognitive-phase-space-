export interface ScotopicDetection {
  photonCount: number;
  detected: boolean;
  confidence: number;
  timestamp: number;
}

export type ScotopicSensitivity = {
  threshold: number;
  snr: number;
  active: boolean;
};

export interface ScotopicConfig {
  photonThreshold: number;
  rodSensitivity: number;
  integrationTime: number;
}

export class ScotopicVision {
  private _config: ScotopicConfig;
  private _detections: ScotopicDetection[] = [];
  private _sensitivity: ScotopicSensitivity | null = null;
  private _buffer: number = 0;
  private _state: Record<string, unknown> = {};
  private _noiseSpectrum: number[] = [];
  private _fftReal: number[] = [];
  private _fftImag: number[] = [];
  private _bayesianPrior: number = 0.5;

  constructor(config: ScotopicConfig) {
    this._config = config;
    this._initSpectrum();
  }

  get detectionCount(): number {
    return this._detections.length;
  }

  get photonBuffer(): number {
    return this._buffer;
  }

  get posteriorProbability(): number {
    return this._bayesianPrior;
  }

  private _initSpectrum(): void {
    this._noiseSpectrum = [];
    for (let i = 0; i < 16; i++) {
      this._noiseSpectrum.push(Math.random() * 0.1);
    }
    this._fftReal = new Array(16).fill(0);
    this._fftImag = new Array(16).fill(0);
  }

  private _computeDFT(signal: number[]): void {
    const N = signal.length;
    for (let k = 0; k < N; k++) {
      let real = 0;
      let imag = 0;
      for (let n = 0; n < N; n++) {
        const angle = (-2 * Math.PI * k * n) / N;
        real += signal[n] * Math.cos(angle);
        imag += signal[n] * Math.sin(angle);
      }
      this._fftReal[k] = real / N;
      this._fftImag[k] = imag / N;
    }
  }

  private _powerSpectralDensity(): number[] {
    const psd: number[] = [];
    for (let i = 0; i < this._fftReal.length; i++) {
      psd.push(this._fftReal[i] * this._fftReal[i] + this._fftImag[i] * this._fftImag[i]);
    }
    return psd;
  }

  private _wienerFilter(signalPower: number, noisePower: number): number {
    return signalPower / (signalPower + noisePower + 0.0001);
  }

  collect(photons: number): ScotopicDetection {
    const quantumEfficiency = this._config.rodSensitivity;
    const photoelectrons = photons * quantumEfficiency;
    this._buffer += photoelectrons;
    const shotNoise = Math.sqrt(Math.max(0, photoelectrons));
    const darkCurrent = 0.05;
    const totalNoise = Math.sqrt(shotNoise * shotNoise + darkCurrent * darkCurrent);
    const likelihood = this._buffer / (this._buffer + totalNoise + 0.001);
    const posterior = (likelihood * this._bayesianPrior) / ((likelihood * this._bayesianPrior) + (1 - likelihood) * (1 - this._bayesianPrior) + 0.001);
    this._bayesianPrior = posterior;
    const detected = this._buffer >= this._config.photonThreshold;
    const confidence = Math.min(1, posterior);
    const detection: ScotopicDetection = {
      photonCount: photons,
      detected,
      confidence,
      timestamp: Date.now(),
    };
    this._detections.push(detection);
    if (this._detections.length > 50) this._detections.shift();
    if (detected) this._buffer = 0;
    const recentSignal = this._detections.slice(-16).map((d) => d.photonCount);
    while (recentSignal.length < 16) recentSignal.unshift(0);
    this._computeDFT(recentSignal);
    return detection;
  }

  computeSensitivity(): ScotopicSensitivity {
    const threshold = this._config.photonThreshold / this._config.rodSensitivity;
    const recent = this._detections.slice(-10);
    const signal = recent.reduce((acc, d) => acc + d.photonCount, 0);
    const noise = Math.max(1, recent.length);
    const snr = signal / noise;
    const psd = this._powerSpectralDensity();
    const filteredSNR = snr * this._wienerFilter(psd[1] || 0, psd[0] || 0.01);
    const active = filteredSNR > threshold * 0.5;
    this._sensitivity = { threshold, snr: filteredSNR, active };
    return this._sensitivity;
  }

  isActive(): boolean {
    return this.computeSensitivity().active;
  }

  integrate(dt: number): void {
    this._buffer *= Math.exp(-dt / this._config.integrationTime);
    this._state.integrated = dt;
  }

  tuneSensitivity(factor: number): void {
    this._config.rodSensitivity *= factor;
    this._state.sensitivityTuned = factor;
  }

  strongestDetection(): ScotopicDetection | null {
    if (this._detections.length === 0) return null;
    return this._detections.reduce((best, d) =>
      d.photonCount > best.photonCount ? d : best
    );
  }

  detectionRate(): number {
    if (this._detections.length === 0) return 0;
    return this._detections.filter((d) => d.detected).length / this._detections.length;
  }

  reset(): void {
    this._detections = [];
    this._buffer = 0;
    this._state.resetAt = Date.now();
    this._bayesianPrior = 0.5;
    this._initSpectrum();
  }

  report(): Record<string, unknown> {
    return {
      detectionCount: this._detections.length,
      buffer: this._buffer,
      sensitivity: this._sensitivity,
      state: this._state,
      posteriorProbability: this._bayesianPrior.toFixed(4),
    };
  }
}

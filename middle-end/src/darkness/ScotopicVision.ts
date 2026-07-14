/**
 * 暗视觉模块：仅依赖极少光子进行探测的低光视觉模式。
 * 用于在极低信号条件下仍能维持基本感知。
 */

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

  constructor(config: ScotopicConfig) {
    this._config = config;
  }

  get detectionCount(): number {
    return this._detections.length;
  }

  get photonBuffer(): number {
    return this._buffer;
  }

  collect(photons: number): ScotopicDetection {
    this._buffer += photons * this._config.rodSensitivity;
    const detected = this._buffer >= this._config.photonThreshold;
    const confidence = Math.min(1, this._buffer / (this._config.photonThreshold * 2));
    const detection: ScotopicDetection = {
      photonCount: photons,
      detected,
      confidence,
      timestamp: Date.now(),
    };
    this._detections.push(detection);
    if (this._detections.length > 50) this._detections.shift();
    if (detected) this._buffer = 0;
    return detection;
  }

  computeSensitivity(): ScotopicSensitivity {
    const threshold = this._config.photonThreshold / this._config.rodSensitivity;
    const recent = this._detections.slice(-10);
    const signal = recent.reduce((acc, d) => acc + d.photonCount, 0);
    const noise = Math.max(1, recent.length);
    const snr = signal / noise;
    const active = snr > threshold * 0.5;
    this._sensitivity = { threshold, snr, active };
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
  }

  report(): Record<string, unknown> {
    return {
      detectionCount: this._detections.length,
      buffer: this._buffer,
      sensitivity: this._sensitivity,
      state: this._state,
    };
  }
}

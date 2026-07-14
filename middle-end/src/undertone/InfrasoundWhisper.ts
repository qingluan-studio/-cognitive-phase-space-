/**
 * 次声低语模块：产生低于人类听觉阈值的振动，无法被直接感知但影响身心。
 * 用于在系统中传递潜意识层面的微弱信号。
 */

export interface InfrasoundPulse {
  frequency: number;
  intensity: number;
  duration: number;
  perceived: boolean;
}

export type InfrasoundExposure = {
  totalEnergy: number;
  subliminalLoad: number;
  awarenessRatio: number;
};

export interface InfrasoundConfig {
  baseFrequency: number;
  hearingThreshold: number;
  maxIntensity: number;
}

export class InfrasoundWhisper {
  private _config: InfrasoundConfig;
  private _pulses: InfrasoundPulse[] = [];
  private _exposure: InfrasoundExposure | null = null;
  private _trace: Record<string, unknown> = {};

  constructor(config: InfrasoundConfig) {
    this._config = config;
  }

  get pulseCount(): number {
    return this._pulses.length;
  }

  get baseFrequency(): number {
    return this._config.baseFrequency;
  }

  emit(duration: number, intensity: number): InfrasoundPulse {
    const clampedIntensity = Math.min(intensity, this._config.maxIntensity);
    const perceived = clampedIntensity >= this._config.hearingThreshold;
    const pulse: InfrasoundPulse = {
      frequency: this._config.baseFrequency,
      intensity: clampedIntensity,
      duration,
      perceived,
    };
    this._pulses.push(pulse);
    if (this._pulses.length > 60) this._pulses.shift();
    return pulse;
  }

  computeExposure(): InfrasoundExposure {
    const totalEnergy = this._pulses.reduce(
      (acc, p) => acc + p.intensity * p.duration,
      0
    );
    const subliminal = this._pulses
      .filter((p) => !p.perceived)
      .reduce((acc, p) => acc + p.intensity * p.duration, 0);
    const awarenessRatio = totalEnergy > 0 ? (totalEnergy - subliminal) / totalEnergy : 0;
    this._exposure = { totalEnergy, subliminalLoad: subliminal, awarenessRatio };
    return this._exposure;
  }

  modulate(frequency: number): void {
    this._config.baseFrequency = frequency;
    this._trace.lastModulation = frequency;
  }

  isSubliminal(): boolean {
    const exp = this.computeExposure();
    return exp.awarenessRatio < 0.1;
  }

  strongestPulse(): InfrasoundPulse | null {
    if (this._pulses.length === 0) return null;
    return this._pulses.reduce((best, p) => (p.intensity > best.intensity ? p : best));
  }

  averageIntensity(): number {
    if (this._pulses.length === 0) return 0;
    return this._pulses.reduce((acc, p) => acc + p.intensity, 0) / this._pulses.length;
  }

  purge(): void {
    this._pulses = [];
    this._exposure = null;
    this._trace.purgedAt = Date.now();
  }

  report(): Record<string, unknown> {
    return {
      pulseCount: this._pulses.length,
      baseFrequency: this._config.baseFrequency,
      exposure: this._exposure,
      trace: this._trace,
    };
  }
}

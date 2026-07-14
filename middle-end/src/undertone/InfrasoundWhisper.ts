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
  private _maskingThreshold: number[] = [];
  private _equalLoudnessContour: number = 40;

  constructor(config: InfrasoundConfig) {
    this._config = config;
    this._initMaskingCurve();
  }

  private _initMaskingCurve(): void {
    for (let i = 0; i < 20; i++) {
      const freq = 1 + i * 1;
      const threshold = 20 * Math.log10(freq) + this._equalLoudnessContour;
      this._maskingThreshold.push(threshold);
    }
  }

  private _phonToSone(phon: number): number {
    return phon >= 40 ? Math.pow(2, (phon - 40) / 10) : Math.pow(phon / 40, 2.86);
  }

  get pulseCount(): number {
    return this._pulses.length;
  }

  get baseFrequency(): number {
    return this._config.baseFrequency;
  }

  emit(duration: number, intensity: number): InfrasoundPulse {
    const clampedIntensity = Math.min(intensity, this._config.maxIntensity);
    const spl = 20 * Math.log10(clampedIntensity + 1e-6);
    const phon = spl + this._equalLoudnessContour * Math.log10(this._config.baseFrequency + 1);
    const perceived = phon >= this._config.hearingThreshold;
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

  computeLoudnessInSones(): number {
    const avgIntensity = this.averageIntensity();
    const spl = 20 * Math.log10(avgIntensity + 1e-6);
    const phon = spl + this._equalLoudnessContour;
    return this._phonToSone(phon);
  }

  computeTemporalMaskingRatio(): number {
    if (this._pulses.length < 2) return 0;
    let masked = 0;
    for (let i = 1; i < this._pulses.length; i++) {
      const gap = 0;
      if (gap < 0.005) masked++;
    }
    return masked / (this._pulses.length - 1);
  }

  setEqualLoudnessContour(phon: number): void {
    this._equalLoudnessContour = phon;
    this._maskingThreshold = [];
    this._initMaskingCurve();
  }
}

export interface VibrationMode {
  frequency: number;
  amplitude: number;
  phase: number;
  module: string;
}

export type ResonanceGain = {
  gain: number;
  detuning: number;
  locked: boolean;
  qualityFactor: number;
};

export interface SympatheticConfig {
  naturalFrequency: number;
  damping: number;
  couplingFactor: number;
}

export class SympatheticVibration {
  private _config: SympatheticConfig;
  private _modes: VibrationMode[] = [];
  private _drivingFrequency: number = 0;
  private _drivingAmplitude: number = 0;
  private _lockState: Record<string, unknown> = {};
  private _energy: number = 0;

  constructor(config: SympatheticConfig) {
    this._config = config;
  }

  get drivingFrequency(): number {
    return this._drivingFrequency;
  }

  get modeCount(): number {
    return this._modes.length;
  }

  get naturalFrequency(): number {
    return this._config.naturalFrequency;
  }

  get energy(): number {
    return this._energy;
  }

  public drive(frequency: number, amplitude: number): void {
    this._drivingFrequency = frequency;
    this._drivingAmplitude = amplitude;
    const detuning = frequency - this._config.naturalFrequency;
    const gain = 1 / Math.sqrt(detuning * detuning + this._config.damping * this._config.damping);
    const phase = Math.atan2(-detuning, this._config.damping);
    this._modes.push({
      frequency,
      amplitude: amplitude * gain,
      phase,
      module: 'self',
    });
    if (this._modes.length > 50) this._modes.shift();
    this._energy = 0.5 * (amplitude * gain) ** 2;
    this._lockState.lastGain = gain;
  }

  public computeGain(): ResonanceGain {
    const detuning = this._drivingFrequency - this._config.naturalFrequency;
    const gain = 1 / Math.sqrt(detuning * detuning + this._config.damping * this._config.damping);
    const locked = Math.abs(detuning) < this._config.couplingFactor;
    const qualityFactor = this._config.naturalFrequency / (2 * this._config.damping);
    return { gain, detuning, locked, qualityFactor };
  }

  public computeBandwidth(): number {
    return 2 * this._config.damping;
  }

  public computePhaseResponse(frequency: number): number {
    const detuning = frequency - this._config.naturalFrequency;
    return Math.atan2(-detuning, this._config.damping);
  }

  public couple(other: VibrationMode): void {
    const detuning = Math.abs(other.frequency - this._config.naturalFrequency);
    const couplingStrength = Math.exp(-detuning * detuning / (2 * this._config.couplingFactor * this._config.couplingFactor));
    this._modes.push({
      ...other,
      amplitude: other.amplitude * couplingStrength,
      module: 'coupled',
    });
    this._lockState.coupledWith = other.module;
    this._lockState.couplingStrength = couplingStrength;
  }

  public totalAmplitude(): number {
    return this._modes.reduce((acc, m) => acc + m.amplitude, 0);
  }

  public peakMode(): VibrationMode | null {
    if (this._modes.length === 0) return null;
    return this._modes.reduce((best, m) => (m.amplitude > best.amplitude ? m : best));
  }

  public sweep(start: number, end: number, steps: number): VibrationMode[] {
    const result: VibrationMode[] = [];
    for (let i = 0; i < steps; i++) {
      const f = start + (i / steps) * (end - start);
      this.drive(f, this._drivingAmplitude || 1);
      result.push(this._modes[this._modes.length - 1]);
    }
    return result;
  }

  public resonanceCurve(start: number, end: number, steps: number): { frequency: number; gain: number }[] {
    const curve: { frequency: number; gain: number }[] = [];
    for (let i = 0; i <= steps; i++) {
      const f = start + (i / steps) * (end - start);
      const detuning = f - this._config.naturalFrequency;
      const gain = 1 / Math.sqrt(detuning * detuning + this._config.damping * this._config.damping);
      curve.push({ frequency: f, gain });
    }
    return curve;
  }

  public isAtResonance(): boolean {
    return Math.abs(this._drivingFrequency - this._config.naturalFrequency) < this._config.damping;
  }

  public report(): Record<string, unknown> {
    return {
      drivingFrequency: this._drivingFrequency,
      modes: this._modes.length,
      totalAmplitude: this.totalAmplitude(),
      energy: this._energy,
      qualityFactor: this.computeGain().qualityFactor,
      bandwidth: this.computeBandwidth(),
      atResonance: this.isAtResonance(),
      lockState: this._lockState,
    };
  }
}

/**
 * 共鸣振动模块：当外部激励频率与模块固有频率一致时，振幅被显著放大。
 * 用于检测多模块之间的同频耦合并量化共振增益。
 */

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

  drive(frequency: number, amplitude: number): void {
    this._drivingFrequency = frequency;
    this._drivingAmplitude = amplitude;
    const detuning = frequency - this._config.naturalFrequency;
    const gain = 1 / Math.sqrt(detuning * detuning + this._config.damping * this._config.damping);
    this._modes.push({
      frequency,
      amplitude: amplitude * gain,
      phase: Math.atan2(-detuning, this._config.damping),
      module: 'self',
    });
    if (this._modes.length > 50) this._modes.shift();
    this._lockState.lastGain = gain;
  }

  computeGain(): ResonanceGain {
    const detuning = this._drivingFrequency - this._config.naturalFrequency;
    const gain = 1 / Math.sqrt(detuning * detuning + this._config.damping * this._config.damping);
    const locked = Math.abs(detuning) < this._config.couplingFactor;
    return { gain, detuning, locked };
  }

  couple(other: VibrationMode): void {
    this._modes.push({ ...other, module: 'coupled' });
    this._lockState.coupledWith = other.module;
  }

  totalAmplitude(): number {
    return this._modes.reduce((acc, m) => acc + m.amplitude, 0);
  }

  peakMode(): VibrationMode | null {
    if (this._modes.length === 0) return null;
    return this._modes.reduce((best, m) => (m.amplitude > best.amplitude ? m : best));
  }

  sweep(start: number, end: number, steps: number): VibrationMode[] {
    const result: VibrationMode[] = [];
    for (let i = 0; i < steps; i++) {
      const f = start + (i / steps) * (end - start);
      this.drive(f, this._drivingAmplitude || 1);
      result.push(this._modes[this._modes.length - 1]);
    }
    return result;
  }

  report(): Record<string, unknown> {
    return {
      drivingFrequency: this._drivingFrequency,
      modes: this._modes.length,
      totalAmplitude: this.totalAmplitude(),
      lockState: this._lockState,
    };
  }
}

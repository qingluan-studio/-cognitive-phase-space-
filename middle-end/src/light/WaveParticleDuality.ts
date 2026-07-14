/**
 * 波粒二象性模块：信息既表现为连续波动又表现为离散粒子。
 * 用于建模同时具备连续与离散特性的混合信息处理。
 */

export interface WaveState {
  amplitude: number;
  frequency: number;
  phase: number;
}

export interface ParticleState {
  position: number;
  momentum: number;
  energy: number;
}

export type DualityMeasurement = {
  mode: 'wave' | 'particle';
  value: number;
  uncertainty: number;
};

export interface DualityConfig {
  planckConstant: number;
  observationStrength: number;
  wavelength: number;
}

export class WaveParticleDuality {
  private _config: DualityConfig;
  private _wave: WaveState;
  private _particle: ParticleState;
  private _measurements: DualityMeasurement[] = [];
  private _state: Record<string, unknown> = {};

  constructor(config: DualityConfig) {
    this._config = config;
    this._wave = { amplitude: 1, frequency: 1 / config.wavelength, phase: 0 };
    this._particle = { position: 0, momentum: 1, energy: 1 };
  }

  get waveMode(): WaveState {
    return { ...this._wave };
  }

  get particleMode(): ParticleState {
    return { ...this._particle };
  }

  get measurementCount(): number {
    return this._measurements.length;
  }

  evolve(time: number): void {
    this._wave.phase += 2 * Math.PI * this._wave.frequency * time;
    this._particle.position += (this._particle.momentum * time) / this._config.planckConstant;
    this._wave.amplitude = Math.cos(this._wave.phase);
  }

  measure(): DualityMeasurement {
    const observation = this._config.observationStrength;
    let mode: 'wave' | 'particle';
    let value: number;
    let uncertainty: number;
    if (observation > 0.5) {
      mode = 'particle';
      value = this._particle.position;
      uncertainty = this._config.planckConstant / (2 * Math.abs(this._particle.momentum));
    } else {
      mode = 'wave';
      value = this._wave.amplitude;
      uncertainty = this._config.planckConstant / (2 * this._wave.frequency);
    }
    const result: DualityMeasurement = { mode, value, uncertainty };
    this._measurements.push(result);
    if (this._measurements.length > 30) this._measurements.shift();
    return result;
  }

  setObservationStrength(strength: number): void {
    this._config.observationStrength = Math.max(0, Math.min(1, strength));
    this._state.observationAdjusted = strength;
  }

  averageUncertainty(): number {
    if (this._measurements.length === 0) return 0;
    return this._measurements.reduce((acc, m) => acc + m.uncertainty, 0) / this._measurements.length;
  }

  dominantMode(): 'wave' | 'particle' {
    if (this._measurements.length === 0) return 'wave';
    const waves = this._measurements.filter((m) => m.mode === 'wave').length;
    return waves > this._measurements.length / 2 ? 'wave' : 'particle';
  }

  collapse(): void {
    this._wave.amplitude = 0;
    this._state.collapsedAt = Date.now();
  }

  reset(): void {
    this._wave = { amplitude: 1, frequency: 1 / this._config.wavelength, phase: 0 };
    this._particle = { position: 0, momentum: 1, energy: 1 };
    this._measurements = [];
  }

  report(): Record<string, unknown> {
    return {
      wave: this._wave,
      particle: this._particle,
      measurements: this._measurements.length,
      state: this._state,
    };
  }
}

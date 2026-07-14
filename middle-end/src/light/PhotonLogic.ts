/**
 * 光子逻辑模块：以光速运行的逻辑单元，处理瞬时传输的信息。
 * 用于建模系统中接近零延迟的高速推理路径。
 */

export interface PhotonPulse {
  id: number;
  wavelength: number;
  energy: number;
  direction: number;
}

export type PhotonTransmission = {
  pulses: number;
  totalEnergy: number;
  latency: number;
};

export interface PhotonLogicConfig {
  speedOfLight: number;
  maxPulses: number;
  energyQuanta: number;
}

export class PhotonLogic {
  private _config: PhotonLogicConfig;
  private _pulses: PhotonPulse[] = [];
  private _nextId: number = 0;
  private _transmission: PhotonTransmission | null = null;
  private _state: Record<string, unknown> = {};

  constructor(config: PhotonLogicConfig) {
    this._config = config;
  }

  get pulseCount(): number {
    return this._pulses.length;
  }

  get speedOfLight(): number {
    return this._config.speedOfLight;
  }

  emit(wavelength: number, direction: number): PhotonPulse {
    const pulse: PhotonPulse = {
      id: this._nextId++,
      wavelength,
      energy: this._config.energyQuanta / wavelength,
      direction,
    };
    this._pulses.push(pulse);
    if (this._pulses.length > this._config.maxPulses) {
      this._pulses.shift();
    }
    return pulse;
  }

  transmit(distance: number): PhotonTransmission {
    const latency = distance / this._config.speedOfLight;
    const totalEnergy = this._pulses.reduce((acc, p) => acc + p.energy, 0);
    this._transmission = {
      pulses: this._pulses.length,
      totalEnergy,
      latency,
    };
    this._state.lastTransmission = { distance, latency };
    return this._transmission;
  }

  scatter(angle: number): void {
    for (const p of this._pulses) {
      p.direction += angle;
    }
    this._state.scatteredAt = Date.now();
  }

  filterByWavelength(min: number, max: number): PhotonPulse[] {
    return this._pulses.filter((p) => p.wavelength >= min && p.wavelength <= max);
  }

  averageEnergy(): number {
    if (this._pulses.length === 0) return 0;
    return this._pulses.reduce((acc, p) => acc + p.energy, 0) / this._pulses.length;
  }

  isInstantaneous(distance: number): boolean {
    const latency = distance / this._config.speedOfLight;
    return latency < 1e-9;
  }

  absorb(id: number): boolean {
    const idx = this._pulses.findIndex((p) => p.id === id);
    if (idx === -1) return false;
    this._pulses.splice(idx, 1);
    return true;
  }

  report(): Record<string, unknown> {
    return {
      pulseCount: this._pulses.length,
      averageEnergy: this.averageEnergy(),
      transmission: this._transmission,
      state: this._state,
    };
  }
}

/**
 * 深空长音模块：持续稳定的低频嗡鸣，提供无尽的背景支撑。
 * 用于营造持久的低频氛围与空间感。
 */

export interface DroneLayer {
  frequency: number;
  amplitude: number;
  detune: number;
  active: boolean;
}

export type DroneState = {
  layers: number;
  totalAmplitude: number;
  dominant: number;
};

export interface DroneConfig {
  baseFrequency: number;
  layerCount: number;
  detuneSpread: number;
}

export class DeepDrone {
  private _config: DroneConfig;
  private _layers: DroneLayer[] = [];
  private _state: DroneState | null = null;
  private _duration: number = 0;
  private _flags: Record<string, unknown> = {};

  constructor(config: DroneConfig) {
    this._config = config;
    this._buildLayers();
  }

  get layerCount(): number {
    return this._layers.length;
  }

  get duration(): number {
    return this._duration;
  }

  get baseFrequency(): number {
    return this._config.baseFrequency;
  }

  private _buildLayers(): void {
    this._layers = [];
    for (let i = 0; i < this._config.layerCount; i++) {
      const detune = (i / this._config.layerCount - 0.5) * this._config.detuneSpread;
      this._layers.push({
        frequency: this._config.baseFrequency * Math.pow(2, detune / 1200),
        amplitude: 1 / (i + 1),
        detune,
        active: true,
      });
    }
  }

  sustain(dt: number): number {
    this._duration += dt;
    let value = 0;
    for (const layer of this._layers) {
      if (layer.active) {
        value += layer.amplitude * Math.sin(2 * Math.PI * layer.frequency * this._duration);
      }
    }
    return value;
  }

  computeState(): DroneState {
    const active = this._layers.filter((l) => l.active);
    const totalAmplitude = active.reduce((acc, l) => acc + l.amplitude, 0);
    const dominant = active.length > 0
      ? active.reduce((best, l) => (l.amplitude > best.amplitude ? l : best)).frequency
      : 0;
    this._state = { layers: active.length, totalAmplitude, dominant };
    return this._state;
  }

  toggleLayer(index: number): boolean {
    if (index < 0 || index >= this._layers.length) return false;
    this._layers[index].active = !this._layers[index].active;
    this._flags.toggled = index;
    return true;
  }

  setLayerAmplitude(index: number, amplitude: number): boolean {
    const layer = this._layers[index];
    if (!layer) return false;
    layer.amplitude = amplitude;
    return true;
  }

  dominantFrequency(): number {
    return this.computeState().dominant;
  }

  totalAmplitude(): number {
    return this.computeState().totalAmplitude;
  }

  rebase(frequency: number): void {
    this._config.baseFrequency = frequency;
    this._buildLayers();
    this._flags.rebasedAt = Date.now();
  }

  report(): Record<string, unknown> {
    return {
      layerCount: this._layers.length,
      duration: this._duration,
      state: this._state,
      flags: this._flags,
    };
  }
}

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
  private _phaseAccumulator: number[] = [];
  private _harmonicSeries: number[] = [];

  constructor(config: DroneConfig) {
    this._config = config;
    this._buildLayers();
    this._buildHarmonicSeries();
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
    this._phaseAccumulator = [];
    for (let i = 0; i < this._config.layerCount; i++) {
      const detune = (i / this._config.layerCount - 0.5) * this._config.detuneSpread;
      const freq = this._config.baseFrequency * Math.pow(2, detune / 1200);
      this._layers.push({
        frequency: freq,
        amplitude: 1 / (i + 1),
        detune,
        active: true,
      });
      this._phaseAccumulator.push(0);
    }
  }

  private _buildHarmonicSeries(): void {
    this._harmonicSeries = [];
    for (let n = 1; n <= this._config.layerCount * 2; n++) {
      this._harmonicSeries.push(1 / n);
    }
  }

  sustain(dt: number): number {
    this._duration += dt;
    let value = 0;
    for (let i = 0; i < this._layers.length; i++) {
      const layer = this._layers[i];
      if (layer.active) {
        this._phaseAccumulator[i] += 2 * Math.PI * layer.frequency * dt;
        const harmonicWeight = this._harmonicSeries[i % this._harmonicSeries.length];
        value += layer.amplitude * harmonicWeight * Math.sin(this._phaseAccumulator[i]);
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

  computeFourierApproximation(harmonics: number): number[] {
    const coefficients: number[] = [];
    for (let n = 1; n <= harmonics; n++) {
      let an = 0;
      let bn = 0;
      for (let i = 0; i < this._layers.length; i++) {
        const layer = this._layers[i];
        if (layer.active) {
          an += layer.amplitude * Math.cos(2 * Math.PI * n * layer.frequency / this._config.baseFrequency);
          bn += layer.amplitude * Math.sin(2 * Math.PI * n * layer.frequency / this._config.baseFrequency);
        }
      }
      coefficients.push(Math.sqrt(an * an + bn * bn));
    }
    return coefficients;
  }

  computeBeatingFrequency(): number {
    if (this._layers.length < 2) return 0;
    const f1 = this._layers[0].frequency;
    const f2 = this._layers[1].frequency;
    return Math.abs(f1 - f2);
  }

  getPhaseCoherence(): number {
    if (this._phaseAccumulator.length === 0) return 0;
    const sumSin = this._phaseAccumulator.reduce((a, p) => a + Math.sin(p), 0);
    const sumCos = this._phaseAccumulator.reduce((a, p) => a + Math.cos(p), 0);
    const magnitude = Math.sqrt(sumSin * sumSin + sumCos * sumCos);
    return magnitude / this._phaseAccumulator.length;
  }
}

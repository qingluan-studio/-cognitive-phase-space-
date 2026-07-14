export interface CavityMode {
  frequency: number;
  qFactor: number;
  gain: number;
  active: boolean;
}

export type CavityResponse = {
  frequency: number;
  amplitude: number;
  dominantMode: number;
};

export interface CavityConfig {
  volume: number;
  openingArea: number;
  modeCount: number;
}

export class ResonantCavity {
  private _config: CavityConfig;
  private _modes: CavityMode[] = [];
  private _response: CavityResponse | null = null;
  private _meta: Record<string, unknown> = {};
  private _helmholtzFreq: number = 0;
  private _impedanceCurve: number[] = [];
  private _transferFunction: number[] = [];

  constructor(config: CavityConfig) {
    this._config = config;
    this._buildModes();
  }

  get modeCount(): number {
    return this._modes.length;
  }

  get volume(): number {
    return this._config.volume;
  }

  get helmholtzFrequency(): number {
    return this._helmholtzFreq;
  }

  private _buildModes(): void {
    this._modes = [];
    const c = 343;
    const baseFreq = c / (2 * Math.cbrt(this._config.volume));
    this._helmholtzFreq = (c / (2 * Math.PI)) * Math.sqrt(this._config.openingArea / (this._config.volume * 0.1));
    for (let n = 1; n <= this._config.modeCount; n++) {
      this._modes.push({
        frequency: baseFreq * n,
        qFactor: 10 * n,
        gain: 1 / n,
        active: true,
      });
    }
  }

  private _detuningBandwidth(detune: number, q: number): number {
    return (detune * detune) / (q * q);
  }

  private _lorentzian(f: number, f0: number, q: number): number {
    const gamma = f0 / (2 * q);
    return (gamma * gamma) / ((f - f0) * (f - f0) + gamma * gamma);
  }

  private _computeTransferFunction(excitationFreq: number): void {
    this._transferFunction = [];
    for (const mode of this._modes) {
      if (!mode.active) continue;
      const response = mode.gain * this._lorentzian(excitationFreq, mode.frequency, mode.qFactor);
      this._transferFunction.push(response);
    }
  }

  excite(frequency: number): CavityResponse {
    let amplitude = 0;
    let dominantMode = 0;
    let bestGain = 0;
    for (const mode of this._modes) {
      if (!mode.active) continue;
      const detune = frequency - mode.frequency;
      const response = mode.gain / Math.sqrt(1 + this._detuningBandwidth(detune, mode.qFactor));
      amplitude += response;
      if (response > bestGain) {
        bestGain = response;
        dominantMode = mode.frequency;
      }
    }
    this._response = { frequency, amplitude, dominantMode };
    this._meta.lastExcitation = frequency;
    this._computeTransferFunction(frequency);
    return this._response;
  }

  tuneMode(index: number, frequency: number): boolean {
    const mode = this._modes[index];
    if (!mode) return false;
    mode.frequency = frequency;
    return true;
  }

  toggleMode(index: number): boolean {
    const mode = this._modes[index];
    if (!mode) return false;
    mode.active = !mode.active;
    return true;
  }

  dominantMode(): CavityMode | null {
    const active = this._modes.filter((m) => m.active);
    if (active.length === 0) return null;
    return active.reduce((best, m) => (m.gain > best.gain ? m : best));
  }

  totalGain(): number {
    return this._modes.filter((m) => m.active).reduce((acc, m) => acc + m.gain, 0);
  }

  resize(volume: number): void {
    this._config.volume = volume;
    this._buildModes();
    this._meta.resizedAt = Date.now();
  }

  computeImpedance(frequency: number): number {
    const rho = 1.225;
    const c = 343;
    const k = (2 * Math.PI * frequency) / c;
    const V = this._config.volume;
    return (rho * c * c) / (V * k * k);
  }

  report(): Record<string, unknown> {
    return {
      modeCount: this._modes.length,
      volume: this._config.volume,
      response: this._response,
      meta: this._meta,
      helmholtzFrequency: this._helmholtzFreq.toFixed(2),
      transferFunctionPeak: this._transferFunction.length > 0 ? Math.max(...this._transferFunction).toFixed(4) : 0,
    };
  }
}

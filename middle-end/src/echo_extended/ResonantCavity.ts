/**
 * 共振腔模块：在特定频率上放大并持续回荡的封闭空间。
 * 用于选择性地增强目标频段并形成腔体共振。
 */

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

  private _buildModes(): void {
    this._modes = [];
    const baseFreq = 343 / (2 * Math.cbrt(this._config.volume));
    for (let n = 1; n <= this._config.modeCount; n++) {
      this._modes.push({
        frequency: baseFreq * n,
        qFactor: 10 * n,
        gain: 1 / n,
        active: true,
      });
    }
  }

  excite(frequency: number): CavityResponse {
    let amplitude = 0;
    let dominantMode = 0;
    let bestGain = 0;
    for (const mode of this._modes) {
      if (!mode.active) continue;
      const detune = frequency - mode.frequency;
      const response = mode.gain / Math.sqrt(1 + (detuning_bandwidth(detune, mode.qFactor)));
      amplitude += response;
      if (response > bestGain) {
        bestGain = response;
        dominantMode = mode.frequency;
      }
    }
    this._response = { frequency, amplitude, dominantMode };
    this._meta.lastExcitation = frequency;
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

  report(): Record<string, unknown> {
    return {
      modeCount: this._modes.length,
      volume: this._config.volume,
      response: this._response,
      meta: this._meta,
    };
  }
}

function detuning_bandwidth(detune: number, q: number): number {
  return (detune * detune) / (q * q);
}

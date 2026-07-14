/**
 * 相干光束模块：所有成分同频同相叠加形成高强度信息流。
 * 用于建模高度同步、方向一致的协同信号。
 */

export interface CoherentRay {
  id: number;
  phase: number;
  amplitude: number;
}

export type CoherenceMeasure = {
  totalAmplitude: number;
  coherence: number;
  phaseSpread: number;
};

export interface CoherentBeamConfig {
  targetPhase: number;
  wavelength: number;
  maxRays: number;
}

export class CoherentBeam {
  private _config: CoherentBeamConfig;
  private _rays: CoherentRay[] = [];
  private _nextId: number = 0;
  private _coherence: CoherenceMeasure | null = null;
  private _state: Record<string, unknown> = {};

  constructor(config: CoherentBeamConfig) {
    this._config = config;
  }

  get rayCount(): number {
    return this._rays.length;
  }

  get targetPhase(): number {
    return this._config.targetPhase;
  }

  addRay(amplitude: number, phase: number): CoherentRay {
    const ray: CoherentRay = { id: this._nextId++, amplitude, phase };
    this._rays.push(ray);
    if (this._rays.length > this._config.maxRays) {
      this._rays.shift();
    }
    return ray;
  }

  measureCoherence(): CoherenceMeasure {
    if (this._rays.length === 0) {
      this._coherence = { totalAmplitude: 0, coherence: 0, phaseSpread: 0 };
      return this._coherence;
    }
    let realSum = 0;
    let imagSum = 0;
    for (const r of this._rays) {
      realSum += r.amplitude * Math.cos(r.phase);
      imagSum += r.amplitude * Math.sin(r.phase);
    }
    const totalAmplitude = Math.sqrt(realSum * realSum + imagSum * imagSum);
    const sumAmplitudes = this._rays.reduce((acc, r) => acc + r.amplitude, 0);
    const coherence = sumAmplitudes > 0 ? totalAmplitude / sumAmplitudes : 0;
    const phases = this._rays.map((r) => r.phase);
    const phaseSpread = Math.max(...phases) - Math.min(...phases);
    this._coherence = { totalAmplitude, coherence, phaseSpread };
    return this._coherence;
  }

  align(): void {
    for (const r of this._rays) {
      r.phase = this._config.targetPhase;
    }
    this._state.alignedAt = Date.now();
  }

  isCoherent(): boolean {
    return this.measureCoherence().coherence > 0.9;
  }

  dominantRay(): CoherentRay | null {
    if (this._rays.length === 0) return null;
    return this._rays.reduce((best, r) => (r.amplitude > best.amplitude ? r : best));
  }

  totalAmplitude(): number {
    return this.measureCoherence().totalAmplitude;
  }

  phaseLock(target: number): void {
    this._config.targetPhase = target;
    this.align();
  }

  disperse(): void {
    for (const r of this._rays) {
      r.phase += (Math.random() - 0.5) * Math.PI;
    }
    this._state.dispersedAt = Date.now();
  }

  report(): Record<string, unknown> {
    return {
      rayCount: this._rays.length,
      coherence: this._coherence,
      state: this._state,
    };
  }
}

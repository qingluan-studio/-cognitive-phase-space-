export interface EclipsePhase {
  phase: 'first-contact' | 'partial' | 'totality' | 'partial-end' | 'last-contact';
  obscuration: number;
  darkness: number;
  timestamp: number;
}

export type EclipseSummary = {
  totalityDuration: number;
  maxObscuration: number;
  phases: number;
};

export interface TotalEclipseConfig {
  totalityDuration: number;
  ingressDuration: number;
  egressDuration: number;
}

export class TotalEclipse {
  private _config: TotalEclipseConfig;
  private _phases: EclipsePhase[] = [];
  private _elapsed: number = 0;
  private _summary: EclipseSummary | null = null;
  private _state: Record<string, unknown> = {};
  private _besselianCorrections: number[] = [];
  private _limbDarkening: number = 0.6;

  constructor(config: TotalEclipseConfig) {
    this._config = config;
  }

  get phaseCount(): number {
    return this._phases.length;
  }

  get elapsed(): number {
    return this._elapsed;
  }

  private _obscurationFunction(t: number): number {
    const ingress = this._config.ingressDuration;
    const totality = ingress + this._config.totalityDuration;
    const egress = totality + this._config.egressDuration;
    if (t < 0) return 0;
    if (t < ingress) {
      return Math.pow(Math.sin((t / ingress) * Math.PI / 2), 2);
    }
    if (t < totality) {
      return 1;
    }
    if (t < egress) {
      return Math.pow(Math.cos(((t - totality) / this._config.egressDuration) * Math.PI / 2), 2);
    }
    return 0;
  }

  advance(dt: number): EclipsePhase {
    this._elapsed += dt;
    const obscuration = this._obscurationFunction(this._elapsed);
    const ingress = this._config.ingressDuration;
    const totality = ingress + this._config.totalityDuration;
    const egress = totality + this._config.egressDuration;
    let phase: EclipsePhase['phase'];
    if (this._elapsed < ingress * 0.2) {
      phase = 'first-contact';
    } else if (this._elapsed < ingress) {
      phase = 'partial';
    } else if (this._elapsed < totality) {
      phase = 'totality';
    } else if (this._elapsed < egress * 0.8) {
      phase = 'partial-end';
    } else {
      phase = 'last-contact';
    }
    const darkness = obscuration * (1 - this._limbDarkening * (1 - obscuration));
    const entry: EclipsePhase = { phase, obscuration, darkness, timestamp: Date.now() };
    this._phases.push(entry);
    if (this._phases.length > 100) this._phases.shift();
    this._besselianCorrections.push(obscuration - (this._phases[this._phases.length - 1]?.obscuration ?? 0));
    if (this._besselianCorrections.length > 50) this._besselianCorrections.shift();
    return entry;
  }

  computeSummary(): EclipseSummary {
    const maxObscuration =
      this._phases.length > 0
        ? Math.max(...this._phases.map((p) => p.obscuration))
        : 0;
    this._summary = {
      totalityDuration: this._config.totalityDuration,
      maxObscuration,
      phases: this._phases.length,
    };
    return this._summary;
  }

  isInTotality(): boolean {
    if (this._phases.length === 0) return false;
    return this._phases[this._phases.length - 1].phase === 'totality';
  }

  currentObscuration(): number {
    if (this._phases.length === 0) return 0;
    return this._phases[this._phases.length - 1].obscuration;
  }

  isComplete(): boolean {
    if (this._phases.length === 0) return false;
    return this._phases[this._phases.length - 1].phase === 'last-contact';
  }

  totalityProgress(): number {
    if (!this.isInTotality()) return 0;
    const totalityStart = this._config.ingressDuration;
    return Math.min(1, (this._elapsed - totalityStart) / this._config.totalityDuration);
  }

  reset(): void {
    this._phases = [];
    this._elapsed = 0;
    this._besselianCorrections = [];
    this._state.resetAt = Date.now();
  }

  report(): Record<string, unknown> {
    return {
      phaseCount: this._phases.length,
      elapsed: this._elapsed,
      summary: this._summary,
      state: this._state,
    };
  }

  computeContactTimes(): { first: number; second: number; third: number; fourth: number } {
    const first = 0;
    const second = this._config.ingressDuration;
    const third = second + this._config.totalityDuration;
    const fourth = third + this._config.egressDuration;
    return { first, second, third, fourth };
  }

  computeBailyBeadsProbability(): number {
    if (!this.isInTotality()) return 0;
    const progress = this.totalityProgress();
    const edgeProximity = Math.abs(progress - 0.5) * 2;
    return Math.exp(-edgeProximity * 5);
  }

  setLimbDarkening(u: number): void {
    this._limbDarkening = Math.max(0, Math.min(1, u));
  }

  getBesselianDerivative(): number {
    if (this._besselianCorrections.length < 2) return 0;
    const vals = this._besselianCorrections;
    return (vals[vals.length - 1] - vals[vals.length - 2]);
  }
}

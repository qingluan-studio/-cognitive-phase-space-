/**
 * 全食模块：天体被完全遮蔽，进入彻底黑暗的瞬间。
 * 用于刻画系统中完全中断与极致遮蔽的事件。
 */

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

  constructor(config: TotalEclipseConfig) {
    this._config = config;
  }

  get phaseCount(): number {
    return this._phases.length;
  }

  get elapsed(): number {
    return this._elapsed;
  }

  advance(dt: number): EclipsePhase {
    this._elapsed += dt;
    const ingress = this._config.ingressDuration;
    const totality = ingress + this._config.totalityDuration;
    const egress = totality + this._config.egressDuration;
    let phase: EclipsePhase['phase'];
    let obscuration: number;
    if (this._elapsed < ingress) {
      phase = 'first-contact';
      obscuration = this._elapsed / ingress;
    } else if (this._elapsed < totality) {
      phase = 'totality';
      obscuration = 1;
    } else if (this._elapsed < egress) {
      phase = 'partial-end';
      obscuration = 1 - (this._elapsed - totality) / this._config.egressDuration;
    } else {
      phase = 'last-contact';
      obscuration = 0;
    }
    const darkness = obscuration;
    const entry: EclipsePhase = { phase, obscuration, darkness, timestamp: Date.now() };
    this._phases.push(entry);
    if (this._phases.length > 100) this._phases.shift();
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
}

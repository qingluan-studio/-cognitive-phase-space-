/**
 * 未解决终止模块：故意不回到主音的终止式，留下悬念与开放性。
 * 用于在系统收尾时保留张力，避免过早的闭合。
 */

export interface CadencePoint {
  step: number;
  pitch: number;
  resolved: boolean;
  label: string;
}

export type CadenceOutcome = {
  closed: boolean;
  finalPitch: number;
  tonicDistance: number;
};

export interface CadenceConfig {
  tonic: number;
  dominant: number;
  leadingTone: number;
  closureProbability: number;
}

export class UnresolvedCadence {
  private _config: CadenceConfig;
  private _points: CadencePoint[] = [];
  private _step: number = 0;
  private _suspension: Record<string, unknown> = {};

  constructor(config: CadenceConfig) {
    this._config = config;
  }

  get pointCount(): number {
    return this._points.length;
  }

  get currentStep(): number {
    return this._step;
  }

  approachDominant(): CadencePoint {
    const point: CadencePoint = {
      step: this._step++,
      pitch: this._config.dominant,
      resolved: false,
      label: 'V',
    };
    this._points.push(point);
    return point;
  }

  addLeadingTone(): CadencePoint {
    const point: CadencePoint = {
      step: this._step++,
      pitch: this._config.leadingTone,
      resolved: false,
      label: 'vii°',
    };
    this._points.push(point);
    return point;
  }

  attemptResolve(): CadenceOutcome {
    const last = this._points[this._points.length - 1];
    const finalPitch = last ? last.pitch : this._config.dominant;
    const closed = Math.random() < this._config.closureProbability;
    if (closed && last) {
      last.resolved = true;
      last.pitch = this._config.tonic;
    }
    const tonicDistance = Math.abs(finalPitch - this._config.tonic);
    this._suspension.lastAttempt = { closed, finalPitch, tonicDistance };
    return { closed, finalPitch, tonicDistance };
  }

  forceUnresolved(): void {
    const last = this._points[this._points.length - 1];
    if (last) {
      last.resolved = false;
      last.pitch = this._config.leadingTone;
    }
    this._suspension.forcedUnresolved = Date.now();
  }

  isSuspended(): boolean {
    return this._points.some((p) => !p.resolved);
  }

  pendingCount(): number {
    return this._points.filter((p) => !p.resolved).length;
  }

  tensionIndex(): number {
    if (this._points.length === 0) return 0;
    let sum = 0;
    for (const p of this._points) {
      sum += Math.abs(p.pitch - this._config.tonic);
    }
    return sum / this._points.length;
  }

  report(): Record<string, unknown> {
    return {
      points: this._points.length,
      step: this._step,
      suspended: this.isSuspended(),
      pending: this.pendingCount(),
      suspension: this._suspension,
    };
  }
}

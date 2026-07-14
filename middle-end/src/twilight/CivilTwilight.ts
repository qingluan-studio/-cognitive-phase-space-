/**
 * 民用曙光模块：太阳位于地平线下0-6度，足够亮以进行日常活动。
 * 用于刻画系统从黑暗过渡到可操作状态的早期阶段。
 */

export interface CivilTwilightPhase {
  sunAngle: number;
  illuminance: number;
  activityLevel: number;
  label: string;
}

export type TwilightTransition = {
  from: string;
  to: string;
  progress: number;
  ready: boolean;
};

export interface CivilTwilightConfig {
  startAngle: number;
  endAngle: number;
  maxIlluminance: number;
}

export class CivilTwilight {
  private _config: CivilTwilightConfig;
  private _phases: CivilTwilightPhase[] = [];
  private _currentAngle: number = 0;
  private _transition: TwilightTransition | null = null;
  private _state: Record<string, unknown> = {};

  constructor(config: CivilTwilightConfig) {
    this._config = config;
    this._currentAngle = config.startAngle;
  }

  get phaseCount(): number {
    return this._phases.length;
  }

  get currentAngle(): number {
    return this._currentAngle;
  }

  advance(deltaAngle: number): CivilTwilightPhase {
    this._currentAngle += deltaAngle;
    const range = this._config.endAngle - this._config.startAngle;
    const progress = Math.max(0, Math.min(1, (this._currentAngle - this._config.startAngle) / range));
    const illuminance = this._config.maxIlluminance * progress;
    const activityLevel = Math.min(1, illuminance / (this._config.maxIlluminance * 0.5));
    const label = progress < 0.3 ? 'early' : progress < 0.7 ? 'mid' : 'late';
    const phase: CivilTwilightPhase = {
      sunAngle: this._currentAngle,
      illuminance,
      activityLevel,
      label,
    };
    this._phases.push(phase);
    if (this._phases.length > 50) this._phases.shift();
    return phase;
  }

  computeTransition(): TwilightTransition {
    const progress = Math.max(0, Math.min(1,
      (this._currentAngle - this._config.startAngle) / (this._config.endAngle - this._config.startAngle)
    ));
    const from = 'night';
    const to = 'day';
    const ready = progress >= 0.8;
    this._transition = { from, to, progress, ready };
    return this._transition;
  }

  isOperational(): boolean {
    if (this._phases.length === 0) return false;
    return this._phases[this._phases.length - 1].activityLevel > 0.5;
  }

  currentIlluminance(): number {
    if (this._phases.length === 0) return 0;
    return this._phases[this._phases.length - 1].illuminance;
  }

  averageActivity(): number {
    if (this._phases.length === 0) return 0;
    return this._phases.reduce((acc, p) => acc + p.activityLevel, 0) / this._phases.length;
  }

  reset(): void {
    this._phases = [];
    this._currentAngle = this._config.startAngle;
    this._state.resetAt = Date.now();
  }

  report(): Record<string, unknown> {
    return {
      phaseCount: this._phases.length,
      currentAngle: this._currentAngle,
      transition: this._transition,
      state: this._state,
    };
  }
}

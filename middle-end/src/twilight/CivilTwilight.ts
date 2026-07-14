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
  private _photopicResponse: number[] = [];
  private _scotopicGain: number = 0.4;

  constructor(config: CivilTwilightConfig) {
    this._config = config;
    this._currentAngle = config.startAngle;
    this._precomputePhotopic();
  }

  private _precomputePhotopic(): void {
    for (let i = 0; i <= 100; i++) {
      const angle = -6 + (i / 100) * 6;
      const vm = this._vLambda(angle);
      this._photopicResponse.push(vm);
    }
  }

  private _vLambda(angle: number): number {
    const x = Math.abs(angle) / 6;
    return Math.exp(-3.2 * Math.pow(x, 1.3));
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
    const vm = this._vLambda(this._currentAngle);
    const scotopic = Math.pow(this._scotopicGain, 1 - progress);
    const illuminance = this._config.maxIlluminance * vm * scotopic;
    const mesopicFactor = 0.3 * vm + 0.7 * scotopic;
    const activityLevel = Math.min(1, mesopicFactor * 1.2);
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

  computeColorTemperature(): number {
    const angle = this._currentAngle;
    const baseTemp = 6500 - Math.abs(angle) * 800;
    const aerosolShift = Math.sin(angle * 0.5) * 200;
    return Math.max(2000, Math.min(6500, baseTemp + aerosolShift));
  }

  getPhotopicIntegral(): number {
    return this._photopicResponse.reduce((a, b) => a + b, 0) / this._photopicResponse.length;
  }

  setScotopicGain(gain: number): void {
    this._scotopicGain = Math.max(0.1, Math.min(1, gain));
  }
}

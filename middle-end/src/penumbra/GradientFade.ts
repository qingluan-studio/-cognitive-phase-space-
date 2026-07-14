export interface GradientStep {
  index: number;
  position: number;
  brightness: number;
  fadeRate: number;
  bezierT: number;
}

export type GradientCurve = {
  steps: number;
  startPoint: number;
  endPoint: number;
  totalFade: number;
  arcLength: number;
};

export interface GradientFadeConfig {
  stepCount: number;
  startBrightness: number;
  endBrightness: number;
  exponent: number;
}

export class GradientFade {
  private _config: GradientFadeConfig;
  private _steps: GradientStep[] = [];
  private _curve: GradientCurve | null = null;
  private _state: Record<string, unknown> = {};
  private _splineCoefficients: number[] = [];

  constructor(config: GradientFadeConfig) {
    this._config = config;
    this._build();
  }

  get stepCount(): number {
    return this._steps.length;
  }

  get startBrightness(): number {
    return this._config.startBrightness;
  }

  private _build(): void {
    this._steps = [];
    const n = this._config.stepCount;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const brightness = this._config.startBrightness + (this._config.endBrightness - this._config.startBrightness) * Math.pow(t, this._config.exponent);
      const fadeRate = this._config.exponent * (this._config.endBrightness - this._config.startBrightness) * Math.pow(t, this._config.exponent - 1);
      const bezierT = this._cubicBezier(t, 0.4, 0, 0.6, 1);
      this._steps.push({ index: i, position: t, brightness, fadeRate, bezierT });
    }
    this._computeSpline();
  }

  private _cubicBezier(t: number, p0: number, p1: number, p2: number, p3: number): number {
    const u = 1 - t;
    return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
  }

  private _computeSpline(): void {
    const n = this._steps.length;
    this._splineCoefficients = Array(n).fill(0);
    for (let i = 1; i < n - 1; i++) {
      this._splineCoefficients[i] = (this._steps[i + 1].brightness - 2 * this._steps[i].brightness + this._steps[i - 1].brightness) / 2;
    }
  }

  computeCurve(): GradientCurve {
    let arcLength = 0;
    for (let i = 1; i < this._steps.length; i++) {
      const dx = this._steps[i].position - this._steps[i - 1].position;
      const dy = this._steps[i].brightness - this._steps[i - 1].brightness;
      arcLength += Math.sqrt(dx * dx + dy * dy);
    }
    this._curve = {
      steps: this._steps.length,
      startPoint: this._config.startBrightness,
      endPoint: this._config.endBrightness,
      totalFade: this._config.startBrightness - this._config.endBrightness,
      arcLength,
    };
    return this._curve;
  }

  brightnessAt(position: number): number {
    if (this._steps.length === 0) return 0;
    const idx = Math.floor(position * (this._steps.length - 1));
    const clamped = Math.max(0, Math.min(this._steps.length - 1, idx));
    return this._steps[clamped].brightness;
  }

  splineBrightnessAt(position: number): number {
    const idx = Math.floor(position * (this._steps.length - 1));
    const i = Math.max(0, Math.min(this._steps.length - 2, idx));
    const t = position * (this._steps.length - 1) - i;
    const a = this._splineCoefficients[i];
    const b = this._splineCoefficients[i + 1];
    return this._steps[i].brightness + t * (this._steps[i + 1].brightness - this._steps[i].brightness) + t * (1 - t) * (a * (1 - t) + b * t);
  }

  isFullyFaded(): boolean {
    if (this._steps.length === 0) return false;
    return this._steps[this._steps.length - 1].brightness <= 0.01;
  }

  steepestFade(): GradientStep | null {
    if (this._steps.length === 0) return null;
    return this._steps.reduce((best, s) => Math.abs(s.fadeRate) > Math.abs(best.fadeRate) ? s : best);
  }

  averageBrightness(): number {
    if (this._steps.length === 0) return 0;
    return this._steps.reduce((acc, s) => acc + s.brightness, 0) / this._steps.length;
  }

  gradientEntropy(): number {
    const total = this._steps.reduce((s, st) => s + st.brightness, 0);
    if (total === 0) return 0;
    return -this._steps.reduce((s, st) => {
      const p = st.brightness / total;
      return p > 0 ? s + p * Math.log2(p) : s;
    }, 0);
  }

  setExponent(exponent: number): void {
    this._config.exponent = exponent;
    this._build();
    this._state.exponentUpdated = exponent;
  }

  setRange(start: number, end: number): void {
    this._config.startBrightness = start;
    this._config.endBrightness = end;
    this._build();
  }

  report(): Record<string, unknown> {
    return {
      stepCount: this._steps.length,
      curve: this._curve,
      state: this._state,
      entropy: this.gradientEntropy(),
    };
  }
}

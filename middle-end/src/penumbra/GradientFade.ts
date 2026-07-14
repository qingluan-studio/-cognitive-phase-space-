/**
 * 梯度渐暗模块：从亮到暗的逐渐过渡过程。
 * 用于刻画系统中沿某一方向亮度的连续衰减。
 */

export interface GradientStep {
  index: number;
  position: number;
  brightness: number;
  fadeRate: number;
}

export type GradientCurve = {
  steps: number;
  startPoint: number;
  endPoint: number;
  totalFade: number;
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
    for (let i = 0; i < this._config.stepCount; i++) {
      const t = i / (this._config.stepCount - 1);
      const brightness =
        this._config.startBrightness +
        (this._config.endBrightness - this._config.startBrightness) * Math.pow(t, this._config.exponent);
      const fadeRate =
        this._config.exponent *
        (this._config.endBrightness - this._config.startBrightness) *
        Math.pow(t, this._config.exponent - 1);
      this._steps.push({
        index: i,
        position: t,
        brightness,
        fadeRate,
      });
    }
  }

  computeCurve(): GradientCurve {
    this._curve = {
      steps: this._steps.length,
      startPoint: this._config.startBrightness,
      endPoint: this._config.endBrightness,
      totalFade: this._config.startBrightness - this._config.endBrightness,
    };
    return this._curve;
  }

  brightnessAt(position: number): number {
    if (this._steps.length === 0) return 0;
    const idx = Math.floor(position * (this._steps.length - 1));
    const clamped = Math.max(0, Math.min(this._steps.length - 1, idx));
    return this._steps[clamped].brightness;
  }

  isFullyFaded(): boolean {
    if (this._steps.length === 0) return false;
    return this._steps[this._steps.length - 1].brightness <= 0.01;
  }

  steepestFade(): GradientStep | null {
    if (this._steps.length === 0) return null;
    return this._steps.reduce((best, s) =>
      Math.abs(s.fadeRate) > Math.abs(best.fadeRate) ? s : best
    );
  }

  averageBrightness(): number {
    if (this._steps.length === 0) return 0;
    return this._steps.reduce((acc, s) => acc + s.brightness, 0) / this._steps.length;
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
    };
  }
}

/**
 * 暗适应模块：在黑暗中逐渐提高敏感度的过程。
 * 用于建模系统对低信号环境的渐进式适应能力。
 */

export interface AdaptationStage {
  level: number;
  sensitivity: number;
  threshold: number;
  timestamp: number;
}

export type AdaptationCurve = {
  stages: AdaptationStage[];
  finalSensitivity: number;
  duration: number;
};

export interface DarkAdaptationConfig {
  initialSensitivity: number;
  finalSensitivity: number;
  stepCount: number;
}

export class DarkAdaptation {
  private _config: DarkAdaptationConfig;
  private _stages: AdaptationStage[] = [];
  private _currentLevel: number = 0;
  private _curve: AdaptationCurve | null = null;
  private _state: Record<string, unknown> = {};

  constructor(config: DarkAdaptationConfig) {
    this._config = config;
  }

  get stageCount(): number {
    return this._stages.length;
  }

  get currentSensitivity(): number {
    if (this._stages.length === 0) return this._config.initialSensitivity;
    return this._stages[this._stages.length - 1].sensitivity;
  }

  adapt(): AdaptationStage {
    this._currentLevel++;
    const progress = Math.min(1, this._currentLevel / this._config.stepCount);
    const sensitivity =
      this._config.initialSensitivity +
      (this._config.finalSensitivity - this._config.initialSensitivity) * progress;
    const threshold = 1 / sensitivity;
    const stage: AdaptationStage = {
      level: this._currentLevel,
      sensitivity,
      threshold,
      timestamp: Date.now(),
    };
    this._stages.push(stage);
    this._state.lastAdaptation = stage.level;
    return stage;
  }

  computeCurve(): AdaptationCurve {
    const finalSensitivity = this.currentSensitivity;
    const duration =
      this._stages.length > 0
        ? this._stages[this._stages.length - 1].timestamp - this._stages[0].timestamp
        : 0;
    this._curve = {
      stages: [...this._stages],
      finalSensitivity,
      duration,
    };
    return this._curve;
  }

  isFullyAdapted(): boolean {
    return this.currentSensitivity >= this._config.finalSensitivity * 0.95;
  }

  expose(brightness: number): void {
    if (brightness > this.currentSensitivity * 0.5) {
      this._currentLevel = Math.max(0, this._currentLevel - 2);
      this._state.exposureReset = brightness;
    }
  }

  currentThreshold(): number {
    if (this._stages.length === 0) return 1 / this._config.initialSensitivity;
    return this._stages[this._stages.length - 1].threshold;
  }

  sensitivityGain(): number {
    return this.currentSensitivity / this._config.initialSensitivity;
  }

  reset(): void {
    this._stages = [];
    this._currentLevel = 0;
    this._state.resetAt = Date.now();
  }

  report(): Record<string, unknown> {
    return {
      stageCount: this._stages.length,
      currentLevel: this._currentLevel,
      currentSensitivity: this.currentSensitivity,
      state: this._state,
    };
  }
}

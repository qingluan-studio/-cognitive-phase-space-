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
  private _weberFraction: number = 0.02;
  private _photonPool: number = 0;
  private _gainModel: number[] = [];
  private _poissonLambda: number = 5;

  constructor(config: DarkAdaptationConfig) {
    this._config = config;
    this._initGainModel();
  }

  get stageCount(): number {
    return this._stages.length;
  }

  get currentSensitivity(): number {
    if (this._stages.length === 0) return this._config.initialSensitivity;
    return this._stages[this._stages.length - 1].sensitivity;
  }

  get weberFraction(): number {
    return this._weberFraction;
  }

  private _initGainModel(): void {
    this._gainModel = [];
    for (let i = 0; i < this._config.stepCount; i++) {
      const sigmoid = 1 / (1 + Math.exp(-(i - this._config.stepCount * 0.5) * 0.3));
      this._gainModel.push(sigmoid);
    }
  }

  private _poissonProbability(k: number): number {
    const lambda = this._poissonLambda;
    let factorial = 1;
    for (let i = 2; i <= k; i++) {
      factorial *= i;
    }
    return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial;
  }

  private _weberLaw(intensity: number): number {
    return this._weberFraction * intensity;
  }

  adapt(): AdaptationStage {
    this._currentLevel++;
    const progress = Math.min(1, this._currentLevel / this._config.stepCount);
    const gain = this._gainModel[Math.min(this._gainModel.length - 1, this._currentLevel - 1)];
    const sensitivity =
      this._config.initialSensitivity +
      (this._config.finalSensitivity - this._config.initialSensitivity) * progress * (1 + gain);
    const threshold = this._weberLaw(1 / sensitivity);
    const stage: AdaptationStage = {
      level: this._currentLevel,
      sensitivity,
      threshold,
      timestamp: Date.now(),
    };
    this._stages.push(stage);
    this._state.lastAdaptation = stage.level;
    this._photonPool += this._poissonProbability(this._currentLevel % 10);
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
      this._photonPool = Math.max(0, this._photonPool - brightness * 0.1);
    }
  }

  currentThreshold(): number {
    if (this._stages.length === 0) return 1 / this._config.initialSensitivity;
    return this._stages[this._stages.length - 1].threshold;
  }

  sensitivityGain(): number {
    return this.currentSensitivity / this._config.initialSensitivity;
  }

  computeSignalToNoise(): number {
    if (this._photonPool <= 0) return 0;
    const shotNoise = Math.sqrt(this._photonPool);
    return this._photonPool / shotNoise;
  }

  reset(): void {
    this._stages = [];
    this._currentLevel = 0;
    this._state.resetAt = Date.now();
    this._photonPool = 0;
  }

  report(): Record<string, unknown> {
    return {
      stageCount: this._stages.length,
      currentLevel: this._currentLevel,
      currentSensitivity: this.currentSensitivity,
      state: this._state,
      weberFraction: this._weberFraction,
      signalToNoise: this.computeSignalToNoise().toFixed(3),
    };
  }
}

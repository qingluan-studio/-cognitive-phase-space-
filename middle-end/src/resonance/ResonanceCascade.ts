/**
 * 共振级联模块：一次共振事件触发后续模块的连锁共振。
 * 模拟能量沿频率链逐级放大的雪崩过程。
 */

export interface CascadeStage {
  level: number;
  frequency: number;
  amplitude: number;
  triggered: boolean;
}

export type CascadeReport = {
  stages: CascadeStage[];
  totalGain: number;
  terminated: boolean;
};

export interface CascadeConfig {
  baseFrequency: number;
  ratio: number;
  threshold: number;
  maxLevels: number;
}

export class ResonanceCascade {
  private _config: CascadeConfig;
  private _stages: CascadeStage[] = [];
  private _active: boolean = false;
  private _triggerLog: Record<string, unknown> = {};

  constructor(config: CascadeConfig) {
    this._config = config;
    this._seedStages();
  }

  get stageCount(): number {
    return this._stages.length;
  }

  get isActive(): boolean {
    return this._active;
  }

  get totalGain(): number {
    return this._stages.reduce((acc, s) => acc * (s.triggered ? s.amplitude : 1), 1);
  }

  private _seedStages(): void {
    for (let i = 0; i < this._config.maxLevels; i++) {
      this._stages.push({
        level: i,
        frequency: this._config.baseFrequency * Math.pow(this._config.ratio, i),
        amplitude: 1 / (i + 1),
        triggered: false,
      });
    }
  }

  ignite(amplitude: number): boolean {
    if (amplitude < this._config.threshold) {
      this._triggerLog.igniteFailed = { amplitude };
      return false;
    }
    this._active = true;
    this._stages[0].triggered = true;
    this._stages[0].amplitude = amplitude;
    this._cascadeDown();
    this._triggerLog.ignitedAt = Date.now();
    return true;
  }

  private _cascadeDown(): void {
    for (let i = 1; i < this._stages.length; i++) {
      const prev = this._stages[i - 1];
      const curr = this._stages[i];
      if (prev.triggered && prev.amplitude * curr.amplitude >= this._config.threshold) {
        curr.triggered = true;
        curr.amplitude = prev.amplitude * curr.amplitude;
      } else {
        break;
      }
    }
  }

  propagate(): CascadeReport {
    if (!this._active) {
      return { stages: [...this._stages], totalGain: this.totalGain, terminated: true };
    }
    this._cascadeDown();
    const terminated = this._stages.every((s) => !s.triggered);
    if (terminated) this._active = false;
    return { stages: [...this._stages], totalGain: this.totalGain, terminated };
  }

  resetStage(level: number): void {
    if (level < 0 || level >= this._stages.length) return;
    this._stages[level].triggered = false;
    this._stages[level].amplitude = 1 / (level + 1);
  }

  activeStages(): CascadeStage[] {
    return this._stages.filter((s) => s.triggered);
  }

  summary(): Record<string, unknown> {
    return {
      active: this._active,
      stageCount: this._stages.length,
      totalGain: this.totalGain,
      triggerLog: this._triggerLog,
    };
  }
}

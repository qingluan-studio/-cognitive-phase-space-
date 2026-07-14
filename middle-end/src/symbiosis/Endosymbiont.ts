/**
 * Endosymbiont - 内共生体模块
 * 模拟生活在另一个模块内部的共生者，依赖宿主环境生存，
 * 同时为宿主提供代谢产物，形成不可分割的依赖关系。
 */

export interface EndosymbiontRecord {
  readonly organismId: string;
  hostId: string;
  metabolicProduct: string;
  yieldRate: number;
  energyReserve: number;
  integrated: boolean;
}

export interface HostEnvironment {
  hostId: string;
  temperature: number;
  nutrientLevel: number;
  wasteLevel: number;
}

export class Endosymbiont {
  private _record: EndosymbiontRecord;
  private _environment: HostEnvironment | null = null;
  private _producedHistory: number[] = [];
  private _adaptationScore: number = 0.5;
  private _stressLevel: number = 0;

  constructor(record: EndosymbiontRecord) {
    this._record = { ...record };
  }

  get organismId(): string {
    return this._record.organismId;
  }

  get hostId(): string {
    return this._record.hostId;
  }

  get integrated(): boolean {
    return this._record.integrated;
  }

  get energyReserve(): number {
    return this._record.energyReserve;
  }

  get adaptationScore(): number {
    return this._adaptationScore;
  }

  public attachToHost(env: HostEnvironment): boolean {
    if (env.hostId !== this._record.hostId) {
      return false;
    }
    if (env.temperature < 0 || env.temperature > 100) {
      return false;
    }
    this._environment = { ...env };
    return true;
  }

  public metabolize(cycleCount: number): number {
    if (!this._environment) {
      return 0;
    }
    const nutrient = this._environment.nutrientLevel;
    const efficiency = this._adaptationScore * (1 - this._stressLevel);
    const produced = cycleCount * nutrient * this._record.yieldRate * efficiency;
    this._record.energyReserve += produced * 0.3;
    this._producedHistory.push(produced);
    if (this._producedHistory.length > 50) {
      this._producedHistory.shift();
    }
    return produced;
  }

  public adapt(): void {
    if (!this._environment) {
      return;
    }
    const tempFit = 1 - Math.abs(this._environment.temperature - 37) / 37;
    this._adaptationScore = Math.min(1, this._adaptationScore * 0.7 + tempFit * 0.3);
    this._stressLevel = Math.max(0, this._stressLevel - 0.05);
  }

  public handleStress(intensity: number): void {
    this._stressLevel = Math.min(1, this._stressLevel + intensity);
    if (this._stressLevel > 0.8) {
      this._record.energyReserve *= 0.5;
    }
  }

  public detoxify(): number {
    if (!this._environment) {
      return 0;
    }
    const removed = Math.min(this._environment.wasteLevel, this._record.energyReserve * 0.1);
    this._environment.wasteLevel -= removed;
    return removed;
  }

  public integrate(): boolean {
    if (this._adaptationScore > 0.85 && this._record.energyReserve > 10) {
      this._record.integrated = true;
      return true;
    }
    return false;
  }

  public detach(): void {
    this._environment = null;
    this._record.integrated = false;
    this._stressLevel = 0.5;
  }

  public statusReport(): Record<string, unknown> {
    return {
      organismId: this.organismId,
      hostId: this.hostId,
      integrated: this.integrated,
      energy: this._record.energyReserve.toFixed(2),
      adaptation: this._adaptationScore.toFixed(3),
      stress: this._stressLevel.toFixed(3),
      avgYield: this._avgYield().toFixed(3),
    };
  }

  private _avgYield(): number {
    if (this._producedHistory.length === 0) {
      return 0;
    }
    const sum = this._producedHistory.reduce((a, b) => a + b, 0);
    return sum / this._producedHistory.length;
  }
}

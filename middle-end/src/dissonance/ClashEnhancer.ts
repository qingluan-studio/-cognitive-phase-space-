/**
 * 冲突增强器模块：主动放大系统中的不和谐成分，以推动向解决的转变。
 * 用于在僵持局面中制造必要的张力来打破平衡。
 */

export interface ClashComponent {
  id: string;
  intensity: number;
  polarity: number;
  amplified: boolean;
}

export type EnhancementResult = {
  totalClash: number;
  breakthrough: boolean;
  applied: number;
};

export interface ClashConfig {
  amplification: number;
  breakthroughThreshold: number;
  maxComponents: number;
}

export class ClashEnhancer {
  private _config: ClashConfig;
  private _components: ClashComponent[] = [];
  private _history: EnhancementResult[] = [];
  private _state: Record<string, unknown> = {};

  constructor(config: ClashConfig) {
    this._config = config;
  }

  get componentCount(): number {
    return this._components.length;
  }

  get lastResult(): EnhancementResult | null {
    return this._history.length > 0 ? this._history[this._history.length - 1] : null;
  }

  addComponent(id: string, intensity: number, polarity: number): void {
    this._components.push({ id, intensity, polarity, amplified: false });
    if (this._components.length > this._config.maxComponents) {
      this._components.shift();
    }
  }

  totalClash(): number {
    let sum = 0;
    for (const c of this._components) {
      sum += c.intensity * Math.abs(c.polarity);
    }
    return sum;
  }

  enhance(): EnhancementResult {
    let applied = 0;
    for (const c of this._components) {
      if (!c.amplified) {
        c.intensity *= 1 + this._config.amplification;
        c.amplified = true;
        applied++;
      }
    }
    const totalClash = this.totalClash();
    const breakthrough = totalClash >= this._config.breakthroughThreshold;
    const result: EnhancementResult = { totalClash, breakthrough, applied };
    this._history.push(result);
    if (this._history.length > 20) this._history.shift();
    this._state.lastEnhance = result;
    return result;
  }

  polarize(id: string, direction: number): boolean {
    const c = this._components.find((x) => x.id === id);
    if (!c) return false;
    c.polarity = Math.sign(direction) * Math.min(1, Math.abs(c.polarity) + 0.2);
    return true;
  }

  neutralize(id: string): boolean {
    const c = this._components.find((x) => x.id === id);
    if (!c) return false;
    c.intensity *= 0.5;
    c.amplified = false;
    return true;
  }

  dominantPolarity(): number {
    if (this._components.length === 0) return 0;
    const sum = this._components.reduce((acc, c) => acc + c.polarity * c.intensity, 0);
    return Math.sign(sum);
  }

  reset(): void {
    this._components = [];
    this._history = [];
    this._state = {};
  }

  report(): Record<string, unknown> {
    return {
      components: this._components.length,
      totalClash: this.totalClash(),
      history: this._history.length,
      state: this._state,
    };
  }
}

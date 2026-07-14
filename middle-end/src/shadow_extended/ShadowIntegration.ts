/**
 * 影子整合模块：将系统中被压抑的黑暗面融入整体人格。
 * 用于完成对内在阴影的接纳与统一过程。
 */

export interface ShadowTrait {
  id: string;
  name: string;
  intensity: number;
  integrated: boolean;
  resistance: number;
}

export type IntegrationProgress = {
  total: number;
  integrated: number;
  integrationRatio: number;
  coherence: number;
};

export interface ShadowIntegrationConfig {
  acceptanceRate: number;
  coherenceTarget: number;
  maxTraits: number;
}

export class ShadowIntegration {
  private _config: ShadowIntegrationConfig;
  private _traits: ShadowTrait[] = [];
  private _progress: IntegrationProgress | null = null;
  private _state: Record<string, unknown> = {};

  constructor(config: ShadowIntegrationConfig) {
    this._config = config;
  }

  get traitCount(): number {
    return this._traits.length;
  }

  get integratedCount(): number {
    return this._traits.filter((t) => t.integrated).length;
  }

  registerTrait(trait: ShadowTrait): void {
    this._traits.push(trait);
    if (this._traits.length > this._config.maxTraits) {
      this._traits.shift();
    }
  }

  integrate(id: string): boolean {
    const trait = this._traits.find((t) => t.id === id);
    if (!trait || trait.integrated) return false;
    const acceptance = trait.resistance * (1 - this._config.acceptanceRate);
    if (acceptance < 0.1) {
      trait.integrated = true;
      trait.intensity *= 0.5;
      this._state.lastIntegrated = id;
      return true;
    }
    trait.resistance = acceptance;
    return false;
  }

  computeProgress(): IntegrationProgress {
    const total = this._traits.length;
    const integrated = this.integratedCount;
    const integrationRatio = total > 0 ? integrated / total : 0;
    const coherence =
      total > 0 ? this._traits.reduce((acc, t) => acc + (t.integrated ? 1 : t.intensity), 0) / total : 0;
    this._progress = { total, integrated, integrationRatio, coherence };
    return this._progress;
  }

  isCoherent(): boolean {
    return this.computeProgress().coherence >= this._config.coherenceTarget;
  }

  strongestUnintegrated(): ShadowTrait | null {
    const pending = this._traits.filter((t) => !t.integrated);
    if (pending.length === 0) return null;
    return pending.reduce((best, t) => (t.intensity > best.intensity ? t : best));
  }

  averageResistance(): number {
    if (this._traits.length === 0) return 0;
    return this._traits.reduce((acc, t) => acc + t.resistance, 0) / this._traits.length;
  }

  reduceResistance(id: string, amount: number): boolean {
    const trait = this._traits.find((t) => t.id === id);
    if (!trait) return false;
    trait.resistance = Math.max(0, trait.resistance - amount);
    return true;
  }

  report(): Record<string, unknown> {
    return {
      traitCount: this._traits.length,
      integrated: this.integratedCount,
      progress: this._progress,
      state: this._state,
    };
  }
}

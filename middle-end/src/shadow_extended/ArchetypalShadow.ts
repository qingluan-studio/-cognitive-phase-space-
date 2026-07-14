/**
 * 原型影子模块：集体无意识中普遍存在的黑暗原型。
 * 用于建模跨模块共享的深层原型模式。
 */

export interface ArchetypeShadowData {
  id: string;
  name: string;
  prevalence: number;
  shadowIntensity: number;
  activations: number;
}

export type ArchetypeProjection = {
  archetype: string;
  target: string;
  intensity: number;
};

export interface ArchetypeConfig {
  resonanceThreshold: number;
  decayRate: number;
  maxArchetypes: number;
}

export class ArchetypalShadow {
  private _config: ArchetypeConfig;
  private _archetypes: ArchetypeShadowData[] = [];
  private _projections: ArchetypeProjection[] = [];
  private _state: Record<string, unknown> = {};

  constructor(config: ArchetypeConfig) {
    this._config = config;
  }

  get archetypeCount(): number {
    return this._archetypes.length;
  }

  get projectionCount(): number {
    return this._projections.length;
  }

  register(archetype: ArchetypeShadowData): void {
    this._archetypes.push(archetype);
    if (this._archetypes.length > this._config.maxArchetypes) {
      this._archetypes.shift();
    }
  }

  activate(id: string): boolean {
    const a = this._archetypes.find((x) => x.id === id);
    if (!a) return false;
    a.activations++;
    a.shadowIntensity = Math.min(1, a.shadowIntensity + 0.1);
    this._state.lastActivation = id;
    return true;
  }

  project(archetypeId: string, target: string): ArchetypeProjection | null {
    const a = this._archetypes.find((x) => x.id === archetypeId);
    if (!a || a.shadowIntensity < this._config.resonanceThreshold) return null;
    const projection: ArchetypeProjection = {
      archetype: archetypeId,
      target,
      intensity: a.shadowIntensity * a.prevalence,
    };
    this._projections.push(projection);
    if (this._projections.length > 30) this._projections.shift();
    return projection;
  }

  decayAll(): void {
    for (const a of this._archetypes) {
      a.shadowIntensity *= 1 - this._config.decayRate;
    }
  }

  dominantArchetype(): ArchetypeShadowData | null {
    if (this._archetypes.length === 0) return null;
    return this._archetypes.reduce((best, a) =>
      a.shadowIntensity * a.prevalence > best.shadowIntensity * best.prevalence ? a : best
    );
  }

  totalShadowIntensity(): number {
    return this._archetypes.reduce((acc, a) => acc + a.shadowIntensity, 0);
  }

  averagePrevalence(): number {
    if (this._archetypes.length === 0) return 0;
    return this._archetypes.reduce((acc, a) => acc + a.prevalence, 0) / this._archetypes.length;
  }

  isCollectiveActive(): boolean {
    return this.totalShadowIntensity() > this._config.resonanceThreshold * this._archetypes.length;
  }

  report(): Record<string, unknown> {
    return {
      archetypes: this._archetypes.length,
      projections: this._projections.length,
      dominant: this.dominantArchetype(),
      state: this._state,
    };
  }
}

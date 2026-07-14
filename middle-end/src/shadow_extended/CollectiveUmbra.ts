/**
 * 集体本影模块：所有模块共同投射形成的完全阴影区域。
 * 用于刻画系统中全局共享的黑暗底层。
 */

export interface UmbraContribution {
  moduleId: string;
  contribution: number;
  timestamp: number;
}

export type UmbraDensity = {
  total: number;
  average: number;
  peak: number;
};

export interface CollectiveUmbraConfig {
  maxContributors: number;
  densityThreshold: number;
  decayRate: number;
}

export class CollectiveUmbra {
  private _config: CollectiveUmbraConfig;
  private _contributions: UmbraContribution[] = [];
  private _density: UmbraDensity | null = null;
  private _state: Record<string, unknown> = {};

  constructor(config: CollectiveUmbraConfig) {
    this._config = config;
  }

  get contributorCount(): number {
    return this._contributions.length;
  }

  get totalContribution(): number {
    return this._contributions.reduce((acc, c) => acc + c.contribution, 0);
  }

  contribute(moduleId: string, contribution: number): UmbraContribution {
    const entry: UmbraContribution = {
      moduleId,
      contribution,
      timestamp: Date.now(),
    };
    this._contributions.push(entry);
    if (this._contributions.length > this._config.maxContributors) {
      this._contributions.shift();
    }
    this._state.lastContributor = moduleId;
    return entry;
  }

  computeDensity(): UmbraDensity {
    const total = this.totalContribution;
    const average = this._contributions.length > 0 ? total / this._contributions.length : 0;
    const peak =
      this._contributions.length > 0
        ? Math.max(...this._contributions.map((c) => c.contribution))
        : 0;
    this._density = { total, average, peak };
    return this._density;
  }

  isDense(): boolean {
    return this.computeDensity().average >= this._config.densityThreshold;
  }

  topContributor(): UmbraContribution | null {
    if (this._contributions.length === 0) return null;
    return this._contributions.reduce((best, c) =>
      c.contribution > best.contribution ? c : best
    );
  }

  applyDecay(): void {
    for (const c of this._contributions) {
      c.contribution *= 1 - this._config.decayRate;
    }
    this._state.decayAppliedAt = Date.now();
  }

  filterByModule(moduleId: string): UmbraContribution[] {
    return this._contributions.filter((c) => c.moduleId === moduleId);
  }

  redistribute(source: string, target: string, fraction: number): boolean {
    const src = this._contributions.find((c) => c.moduleId === source);
    if (!src) return false;
    const amount = src.contribution * fraction;
    src.contribution -= amount;
    this.contribute(target, amount);
    return true;
  }

  report(): Record<string, unknown> {
    return {
      contributors: this._contributions.length,
      total: this.totalContribution,
      density: this._density,
      state: this._state,
    };
  }
}

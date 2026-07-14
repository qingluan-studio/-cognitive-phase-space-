/** 滑音迁移器 - 平滑迁移服务调用，像滑音一样不产生断点 */

export interface MigrationEndpoint {
  id: string;
  service: string;
  weight: number;
  healthy: boolean;
}

export interface MigrationPlan {
  id: string;
  service: string;
  fromId: string;
  toId: string;
  duration: number;
  startedAt: number;
  progress: number;
}

export interface MigrationStep {
  planId: string;
  timestamp: number;
  fromWeight: number;
  toWeight: number;
  smoothness: number;
}

export class GlissandoMigrator {
  private _endpoints: Map<string, MigrationEndpoint> = new Map();
  private _plans: Map<string, MigrationPlan> = new Map();
  private _steps: MigrationStep[] = [];
  private _idCounter = 0;
  private _defaultDuration = 5000;
  private _granularity = 100;

  registerEndpoint(service: string, weight: number = 1): MigrationEndpoint {
    const id = `ep-${++this._idCounter}-${Date.now()}`;
    const endpoint: MigrationEndpoint = { id, service, weight: Math.max(0, weight), healthy: true };
    this._endpoints.set(id, endpoint);
    return endpoint;
  }

  markUnhealthy(endpointId: string): boolean {
    const ep = this._endpoints.get(endpointId);
    if (!ep) return false;
    ep.healthy = false;
    return true;
  }

  planMigration(service: string, fromId: string, toId: string, duration?: number): MigrationPlan {
    if (!this._endpoints.has(fromId) || !this._endpoints.has(toId)) {
      throw new Error('Endpoint(s) not found');
    }
    const plan: MigrationPlan = {
      id: `mig-${++this._idCounter}-${Date.now()}`,
      service,
      fromId,
      toId,
      duration: duration ?? this._defaultDuration,
      startedAt: Date.now(),
      progress: 0,
    };
    this._plans.set(plan.id, plan);
    return plan;
  }

  executeStep(planId: string): MigrationStep | null {
    const plan = this._plans.get(planId);
    if (!plan) return null;
    const elapsed = Date.now() - plan.startedAt;
    const progress = Math.min(1, elapsed / plan.duration);
    plan.progress = progress;
    const fromEp = this._endpoints.get(plan.fromId);
    const toEp = this._endpoints.get(plan.toId);
    if (!fromEp || !toEp) return null;
    const fromWeight = (1 - progress) * fromEp.weight;
    const toWeight = progress * toEp.weight;
    fromEp.weight = fromWeight;
    toEp.weight = toWeight;
    const smoothness = this._computeSmoothness(progress);
    const step: MigrationStep = {
      planId,
      timestamp: Date.now(),
      fromWeight,
      toWeight,
      smoothness,
    };
    this._steps.push(step);
    return step;
  }

  runMigration(planId: string): MigrationStep[] {
    const plan = this._plans.get(planId);
    if (!plan) return [];
    const steps: MigrationStep[] = [];
    const stepCount = Math.ceil(plan.duration / this._granularity);
    for (let i = 0; i < stepCount; i++) {
      // simulate time progression for synchronous run
      plan.startedAt = Date.now() - (i * plan.duration) / stepCount;
      const step = this.executeStep(planId);
      if (step) steps.push(step);
    }
    plan.progress = 1;
    return steps;
  }

  selectEndpoint(service: string): MigrationEndpoint | null {
    const candidates = Array.from(this._endpoints.values()).filter(
      e => e.service === service && e.healthy && e.weight > 0
    );
    if (candidates.length === 0) return null;
    const totalWeight = candidates.reduce((s, e) => s + e.weight, 0);
    let roll = Math.random() * totalWeight;
    for (const ep of candidates) {
      roll -= ep.weight;
      if (roll <= 0) return ep;
    }
    return candidates[candidates.length - 1];
  }

  setDefaultDuration(d: number): void {
    if (d <= 0) throw new Error('Duration must be positive');
    this._defaultDuration = d;
  }

  setGranularity(g: number): void {
    if (g <= 0) throw new Error('Granularity must be positive');
    this._granularity = g;
  }

  getEndpoint(id: string): MigrationEndpoint | undefined {
    return this._endpoints.get(id);
  }

  getPlan(id: string): MigrationPlan | undefined {
    return this._plans.get(id);
  }

  get endpoints(): MigrationEndpoint[] {
    return Array.from(this._endpoints.values());
  }

  get plans(): MigrationPlan[] {
    return Array.from(this._plans.values());
  }

  get steps(): MigrationStep[] {
    return [...this._steps];
  }

  private _computeSmoothness(progress: number): number {
    // S-curve for smooth glissando transition
    return 1 / (1 + Math.exp(-10 * (progress - 0.5)));
  }
}

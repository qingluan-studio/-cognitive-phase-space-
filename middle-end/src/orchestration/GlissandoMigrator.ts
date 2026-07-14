export interface MigrationEndpoint {
  id: string;
  service: string;
  weight: number;
  healthy: boolean;
  capacity: number;
  load: number;
}

export interface MigrationPlan {
  id: string;
  service: string;
  fromId: string;
  toId: string;
  duration: number;
  startedAt: number;
  progress: number;
  strategy: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'bezier';
  controlPoints: number[];
}

export interface MigrationStep {
  planId: string;
  timestamp: number;
  fromWeight: number;
  toWeight: number;
  smoothness: number;
  gradient: number;
}

export interface MigrationMetrics {
  totalMigrations: number;
  completedMigrations: number;
  failedMigrations: number;
  averageDuration: number;
  averageSmoothness: number;
}

export class GlissandoMigrator {
  private _endpoints: Map<string, MigrationEndpoint> = new Map();
  private _plans: Map<string, MigrationPlan> = new Map();
  private _steps: MigrationStep[] = [];
  private _idCounter = 0;
  private _defaultDuration = 5000;
  private _granularity = 100;
  private _safetyMargin = 0.1;
  
  private _metrics: MigrationMetrics = {
    totalMigrations: 0,
    completedMigrations: 0,
    failedMigrations: 0,
    averageDuration: 0,
    averageSmoothness: 0,
  };

  get metrics(): MigrationMetrics {
    return { ...this._metrics };
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

  registerEndpoint(service: string, weight: number = 1, capacity: number = 100): MigrationEndpoint {
    const id = `ep-${++this._idCounter}-${Date.now()}`;
    const endpoint: MigrationEndpoint = { 
      id, 
      service, 
      weight: Math.max(0, weight), 
      healthy: true,
      capacity,
      load: 0,
    };
    this._endpoints.set(id, endpoint);
    return endpoint;
  }

  markUnhealthy(endpointId: string): boolean {
    const ep = this._endpoints.get(endpointId);
    if (!ep) return false;
    ep.healthy = false;
    return true;
  }

  markHealthy(endpointId: string): boolean {
    const ep = this._endpoints.get(endpointId);
    if (!ep) return false;
    ep.healthy = true;
    return true;
  }

  updateLoad(endpointId: string, load: number): boolean {
    const ep = this._endpoints.get(endpointId);
    if (!ep) return false;
    ep.load = Math.max(0, Math.min(ep.capacity, load));
    return true;
  }

  planMigration(service: string, fromId: string, toId: string, duration?: number, strategy: MigrationPlan['strategy'] = 'bezier'): MigrationPlan {
    if (!this._endpoints.has(fromId) || !this._endpoints.has(toId)) {
      throw new Error('Endpoint(s) not found');
    }
    
    const fromEp = this._endpoints.get(fromId)!;
    const toEp = this._endpoints.get(toId)!;
    
    if (!fromEp.healthy || !toEp.healthy) {
      throw new Error('One or both endpoints are unhealthy');
    }

    const controlPoints = this._generateControlPoints(strategy);
    
    const plan: MigrationPlan = {
      id: `mig-${++this._idCounter}-${Date.now()}`,
      service,
      fromId,
      toId,
      duration: duration ?? this._defaultDuration,
      startedAt: Date.now(),
      progress: 0,
      strategy,
      controlPoints,
    };
    
    this._plans.set(plan.id, plan);
    this._metrics.totalMigrations++;
    
    return plan;
  }

  private _generateControlPoints(strategy: MigrationPlan['strategy']): number[] {
    switch (strategy) {
      case 'linear':
        return [0, 0, 1, 1];
      case 'easeIn':
        return [0.42, 0, 1, 1];
      case 'easeOut':
        return [0, 0, 0.58, 1];
      case 'easeInOut':
        return [0.42, 0, 0.58, 1];
      case 'bezier':
      default:
        return [0.25, 0.1, 0.25, 1];
    }
  }

  executeStep(planId: string): MigrationStep | null {
    const plan = this._plans.get(planId);
    if (!plan) return null;
    
    const elapsed = Date.now() - plan.startedAt;
    const rawProgress = Math.min(1, elapsed / plan.duration);
    const easedProgress = this._applyBezierCurve(rawProgress, plan.controlPoints);
    plan.progress = easedProgress;
    
    const fromEp = this._endpoints.get(plan.fromId);
    const toEp = this._endpoints.get(plan.toId);
    if (!fromEp || !toEp) return null;
    
    const totalWeight = fromEp.weight + toEp.weight;
    const fromWeight = Math.max(0, totalWeight * (1 - easedProgress));
    const toWeight = Math.max(0, totalWeight * easedProgress);
    
    fromEp.weight = fromWeight;
    toEp.weight = toWeight;
    
    const smoothness = this._computeSmoothness(easedProgress);
    const gradient = this._computeGradient(rawProgress, plan.controlPoints);
    
    const step: MigrationStep = {
      planId,
      timestamp: Date.now(),
      fromWeight,
      toWeight,
      smoothness,
      gradient,
    };
    
    this._steps.push(step);
    
    if (easedProgress >= 1) {
      this._completeMigration(plan);
    }
    
    return step;
  }

  private _applyBezierCurve(t: number, controlPoints: number[]): number {
    const [x1, y1, x2, y2] = controlPoints;
    
    const cubicBezier = (t: number, p0: number, p1: number, p2: number, p3: number): number => {
      const t2 = t * t;
      const t3 = t2 * t;
      const mt = 1 - t;
      const mt2 = mt * mt;
      const mt3 = mt2 * mt;
      
      return mt3 * p0 + 3 * mt2 * t * p1 + 3 * mt * t2 * p2 + t3 * p3;
    };
    
    let low = 0;
    let high = 1;
    let iterations = 8;
    
    while (iterations--) {
      const mid = (low + high) / 2;
      const x = cubicBezier(mid, 0, x1, x2, 1);
      
      if (x < t) {
        low = mid;
      } else {
        high = mid;
      }
    }
    
    return cubicBezier((low + high) / 2, 0, y1, y2, 1);
  }

  private _computeGradient(t: number, controlPoints: number[]): number {
    const [x1, y1, x2, y2] = controlPoints;
    const mt = 1 - t;
    
    const dx = 3 * mt * mt * x1 + 3 * mt * t * (x2 - x1) + 3 * t * t * (1 - x2);
    const dy = 3 * mt * mt * y1 + 3 * mt * t * (y2 - y1) + 3 * t * t * (1 - y2);
    
    return dx !== 0 ? dy / dx : 0;
  }

  private _computeSmoothness(progress: number): number {
    return 1 / (1 + Math.exp(-12 * (progress - 0.5)));
  }

  runMigration(planId: string): MigrationStep[] {
    const plan = this._plans.get(planId);
    if (!plan) return [];
    
    const steps: MigrationStep[] = [];
    const stepCount = Math.ceil(plan.duration / this._granularity);
    
    for (let i = 0; i <= stepCount; i++) {
      plan.startedAt = Date.now() - (i * plan.duration) / stepCount;
      const step = this.executeStep(planId);
      if (step) steps.push(step);
    }
    
    plan.progress = 1;
    return steps;
  }

  private _completeMigration(plan: MigrationPlan): void {
    this._metrics.completedMigrations++;
    
    const planSteps = this._steps.filter(s => s.planId === plan.id);
    if (planSteps.length > 0) {
      const totalSmoothness = planSteps.reduce((sum, s) => sum + s.smoothness, 0);
      this._metrics.averageSmoothness = (
        this._metrics.averageSmoothness * (this._metrics.completedMigrations - 1) +
        totalSmoothness / planSteps.length
      ) / this._metrics.completedMigrations;
    }
  }

  selectEndpoint(service: string): MigrationEndpoint | null {
    const candidates = Array.from(this._endpoints.values()).filter(
      e => e.service === service && e.healthy && e.weight > 0
    );
    
    if (candidates.length === 0) return null;
    
    const weightedCandidates = candidates.map(e => ({
      endpoint: e,
      score: e.weight * (1 - e.load / e.capacity),
    }));
    
    const totalScore = weightedCandidates.reduce((sum, wc) => sum + wc.score, 0);
    
    let roll = Math.random() * totalScore;
    for (const wc of weightedCandidates) {
      roll -= wc.score;
      if (roll <= 0) return wc.endpoint;
    }
    
    return weightedCandidates[weightedCandidates.length - 1].endpoint;
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

  cancelMigration(planId: string): boolean {
    const plan = this._plans.get(planId);
    if (!plan) return false;
    
    this._plans.delete(planId);
    this._metrics.failedMigrations++;
    
    return true;
  }

  getServiceEndpoints(service: string): MigrationEndpoint[] {
    return Array.from(this._endpoints.values()).filter(e => e.service === service);
  }

  balanceLoad(service: string): void {
    const endpoints = this.getServiceEndpoints(service).filter(e => e.healthy);
    if (endpoints.length < 2) return;
    
    const totalWeight = endpoints.reduce((sum, e) => sum + e.weight, 0);
    const averageWeight = totalWeight / endpoints.length;
    
    for (const ep of endpoints) {
      const targetWeight = averageWeight * (1 - ep.load / ep.capacity * 0.5);
      ep.weight = Math.max(0.1, targetWeight);
    }
    
    const newTotal = endpoints.reduce((sum, e) => sum + e.weight, 0);
    for (const ep of endpoints) {
      ep.weight = (ep.weight / newTotal) * totalWeight;
    }
  }

  predictMigrationTime(service: string, fromId: string, toId: string): number {
    const fromEp = this._endpoints.get(fromId);
    const toEp = this._endpoints.get(toId);
    
    if (!fromEp || !toEp) return 0;
    
    const totalWeight = fromEp.weight + toEp.weight;
    const fromUtilization = fromEp.load / fromEp.capacity;
    const toUtilization = toEp.load / toEp.capacity;
    
    const baseTime = this._defaultDuration;
    const utilizationFactor = fromUtilization + toUtilization;
    
    return Math.round(baseTime * (1 + utilizationFactor * 0.5));
  }

  getMigrationProgress(planId: string): number {
    const plan = this._plans.get(planId);
    return plan ? plan.progress : 0;
  }

  validateMigration(planId: string): { valid: boolean; reasons: string[] } {
    const reasons: string[] = [];
    const plan = this._plans.get(planId);
    
    if (!plan) {
      return { valid: false, reasons: ['Plan not found'] };
    }
    
    const fromEp = this._endpoints.get(plan.fromId);
    const toEp = this._endpoints.get(plan.toId);
    
    if (!fromEp) reasons.push('Source endpoint not found');
    if (!toEp) reasons.push('Target endpoint not found');
    if (fromEp && !fromEp.healthy) reasons.push('Source endpoint is unhealthy');
    if (toEp && !toEp.healthy) reasons.push('Target endpoint is unhealthy');
    if (fromEp && toEp && fromEp.service !== toEp.service) {
      reasons.push('Endpoints belong to different services');
    }
    
    return { valid: reasons.length === 0, reasons };
  }
}
export interface TailSegment {
  id: string;
  name: string;
  priority: number;
  regenerable: boolean;
  data: Record<string, unknown>;
  criticality: number;
  recoveryComplexity: number;
}

export interface AutotomicEvent {
  timestamp: number;
  threatLevel: number;
  detachedSegments: string[];
  coreIntact: boolean;
  optimizationScore: number;
  strategy: 'minimal' | 'balanced' | 'maximal';
}

export interface RegenerationPlan {
  segmentId: string;
  eta: number;
  progress: number;
  completed: boolean;
  phase: 'dormant' | 'initiation' | 'growth' | 'maturation' | 'complete';
  growthRate: number;
}

export interface RegenerationDynamics {
  currentPhase: string;
  overallProgress: number;
  activeSegments: number;
  remainingTime: number;
}

export class AutotomicTail {
  private _segments: Map<string, TailSegment> = new Map();
  private _detached: Set<string> = new Set();
  private _plans: Map<string, RegenerationPlan> = new Map();
  private _events: AutotomicEvent[] = [];
  private _coreIntact = true;
  private _lethalThreshold = 0.8;
  private _regenerationBaseTime = 60000;
  private _energyReserve = 1.0;

  attachSegment(segment: TailSegment): void {
    this._segments.set(segment.id, segment);
  }

  assessThreat(level: number): boolean {
    return level >= this._lethalThreshold;
  }

  detachTail(threatLevel: number): AutotomicEvent {
    const strategy = this._selectStrategy(threatLevel);
    const toDetach: string[] = [];
    const allSegments = Array.from(this._segments.values());
    
    const sorted = allSegments.sort((a, b) => {
      const priorityDiff = a.priority - b.priority;
      const criticalityDiff = b.criticality - a.criticality;
      return 0.6 * priorityDiff + 0.4 * criticalityDiff;
    });

    const dropRatio = this._computeDropRatio(threatLevel, strategy);
    const dropCount = Math.max(1, Math.min(sorted.length, Math.ceil(sorted.length * dropRatio)));
    
    for (const seg of sorted.slice(0, dropCount)) {
      this._detached.add(seg.id);
      toDetach.push(seg.id);
      if (seg.regenerable) {
        this._plans.set(seg.id, this._createRegenerationPlan(seg));
      }
    }

    const optimizationScore = this._computeOptimizationScore(toDetach);
    this.preserveCore();

    const event: AutotomicEvent = {
      timestamp: Date.now(),
      threatLevel,
      detachedSegments: toDetach,
      coreIntact: this._coreIntact,
      optimizationScore,
      strategy,
    };
    this._events.push(event);
    return event;
  }

  private _selectStrategy(threatLevel: number): 'minimal' | 'balanced' | 'maximal' {
    const excess = threatLevel - this._lethalThreshold;
    if (excess < 0.1) return 'minimal';
    if (excess < 0.2) return 'balanced';
    return 'maximal';
  }

  private _computeDropRatio(threatLevel: number, strategy: 'minimal' | 'balanced' | 'maximal'): number {
    const baseRatio = Math.min(1, (threatLevel - this._lethalThreshold) / (1 - this._lethalThreshold));
    const strategyMultiplier = { minimal: 0.5, balanced: 1.0, maximal: 1.5 };
    return Math.min(0.95, baseRatio * strategyMultiplier[strategy]);
  }

  private _createRegenerationPlan(segment: TailSegment): RegenerationPlan {
    const complexityFactor = 1 + segment.recoveryComplexity * 0.5;
    const energyFactor = this._energyReserve;
    const baseDuration = this._regenerationBaseTime * complexityFactor / energyFactor;
    
    return {
      segmentId: segment.id,
      eta: Date.now() + baseDuration,
      progress: 0,
      completed: false,
      phase: 'dormant',
      growthRate: 1 / (baseDuration / 1000),
    };
  }

  private _computeOptimizationScore(detached: string[]): number {
    let savedCriticality = 0;
    let lostCriticality = 0;
    
    for (const [id, seg] of this._segments) {
      if (detached.includes(id)) {
        lostCriticality += seg.criticality;
      } else {
        savedCriticality += seg.criticality;
      }
    }
    
    const totalCriticality = savedCriticality + lostCriticality;
    return totalCriticality > 0 ? savedCriticality / totalCriticality : 0;
  }

  preserveCore(): boolean {
    const activeSegments = this._segments.size - this._detached.size;
    const coreThreshold = Math.ceil(this._segments.size * 0.3);
    this._coreIntact = activeSegments >= coreThreshold;
    return this._coreIntact;
  }

  regenerateTail(): RegenerationPlan[] {
    const updates: RegenerationPlan[] = [];
    const now = Date.now();
    const energyAvailable = this._energyReserve;

    for (const plan of this._plans.values()) {
      if (plan.completed) {
        updates.push(plan);
        continue;
      }

      const timeElapsed = now - (plan.eta - this._regenerationBaseTime);
      const totalDuration = plan.eta - (plan.eta - this._regenerationBaseTime);
      
      let rawProgress = Math.min(1, timeElapsed / totalDuration);
      const energyAdjusted = rawProgress * energyAvailable;
      
      plan.progress = energyAdjusted;
      plan.phase = this._determineRegenerationPhase(plan.progress);
      
      if (plan.progress >= 1) {
        plan.completed = true;
        plan.phase = 'complete';
        this._detached.delete(plan.segmentId);
      }
      
      updates.push(plan);
    }

    this._consumeEnergyForRegeneration();
    return updates;
  }

  private _determineRegenerationPhase(progress: number): RegenerationPlan['phase'] {
    if (progress < 0.05) return 'dormant';
    if (progress < 0.2) return 'initiation';
    if (progress < 0.8) return 'growth';
    if (progress < 1) return 'maturation';
    return 'complete';
  }

  private _consumeEnergyForRegeneration(): void {
    const activeRegenerations = Array.from(this._plans.values()).filter(p => !p.completed).length;
    const energyCost = activeRegenerations * 0.01;
    this._energyReserve = Math.max(0.1, this._energyReserve - energyCost);
  }

  replenishEnergy(amount: number): void {
    this._energyReserve = Math.min(1.0, this._energyReserve + amount);
  }

  getRegenerationDynamics(): RegenerationDynamics {
    const plans = Array.from(this._plans.values());
    const active = plans.filter(p => !p.completed);
    const totalProgress = active.reduce((sum, p) => sum + p.progress, 0);
    const avgProgress = active.length > 0 ? totalProgress / active.length : 0;
    
    const remainingTimes = active.map(p => Math.max(0, p.eta - Date.now()));
    const avgRemaining = remainingTimes.length > 0 
      ? remainingTimes.reduce((sum, t) => sum + t, 0) / remainingTimes.length 
      : 0;

    return {
      currentPhase: active.length > 0 ? active[0].phase : 'complete',
      overallProgress: avgProgress,
      activeSegments: active.length,
      remainingTime: avgRemaining,
    };
  }

  getLostSegments(): string[] {
    return Array.from(this._detached);
  }

  getActiveSegments(): string[] {
    return Array.from(this._segments.keys()).filter(id => !this._detached.has(id));
  }

  isCoreIntact(): boolean {
    return this._coreIntact;
  }

  getAutotomyHistory(): AutotomicEvent[] {
    return [...this._events];
  }

  get segmentCount(): number {
    return this._segments.size;
  }

  get energyReserve(): number {
    return this._energyReserve;
  }
}
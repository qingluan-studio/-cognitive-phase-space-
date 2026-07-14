export type StressLevel = 'low' | 'moderate' | 'high' | 'critical';

export interface SuppressionPolicy {
  priority: number;
  threshold: StressLevel;
  action: () => void;
  hysteresis: number;
  cooldown: number;
}

export interface CortisolState {
  currentLevel: StressLevel;
  suppressedModules: string[];
  lastActivation: Date | null;
  suppressionHistory: Array<{
    timestamp: Date;
    level: StressLevel;
    modules: string[];
    duration: number;
  }>;
  stressScore: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  resilience: number;
}

export interface StressMetrics {
  cpuUsage: number;
  memoryUsage: number;
  requestQueue: number;
  errorRate: number;
  latency: number;
  throughput: number;
}

export interface StressDynamics {
  currentScore: number;
  rateOfChange: number;
  predictedLevel: StressLevel;
  timeToCritical: number | null;
}

export class DigitalCortisol {
  private _state: CortisolState = {
    currentLevel: 'low',
    suppressedModules: [],
    lastActivation: null,
    suppressionHistory: [],
    stressScore: 0,
    trend: 'stable',
    resilience: 1,
  };

  private _suppressionPolicies: Map<string, SuppressionPolicy> = new Map();
  private _policyTimestamps: Map<string, number> = new Map();
  private _historicalScores: number[] = [];
  private _decayRate = 0.02;
  private _resilienceDecay = 0.001;

  registerPolicy(moduleId: string, policy: SuppressionPolicy): void {
    this._suppressionPolicies.set(moduleId, policy);
  }

  deregisterPolicy(moduleId: string): void {
    this._suppressionPolicies.delete(moduleId);
  }

  assessStress(metrics: StressMetrics): StressLevel {
    const normalizedMetrics = this._normalizeMetrics(metrics);
    
    const weights = {
      cpuUsage: 0.25,
      memoryUsage: 0.25,
      requestQueue: 0.15,
      errorRate: 0.2,
      latency: 0.1,
      throughput: -0.05,
    };

    let stressScore = 0;
    for (const [key, value] of Object.entries(normalizedMetrics)) {
      stressScore += (value as number) * (weights[key as keyof typeof weights] ?? 0);
    }

    this._historicalScores.push(stressScore);
    if (this._historicalScores.length > 60) this._historicalScores.shift();

    this._state.stressScore = stressScore;
    this._state.trend = this._computeTrend();
    this._state.resilience = Math.max(0.1, this._state.resilience - this._resilienceDecay);

    return this._scoreToLevel(stressScore);
  }

  private _normalizeMetrics(metrics: StressMetrics): Record<string, number> {
    return {
      cpuUsage: Math.min(1, metrics.cpuUsage / 100),
      memoryUsage: Math.min(1, metrics.memoryUsage / 100),
      requestQueue: Math.min(1, metrics.requestQueue / 1000),
      errorRate: Math.min(1, metrics.errorRate / 100),
      latency: Math.min(1, metrics.latency / 10000),
      throughput: Math.min(1, metrics.throughput / 1000),
    };
  }

  private _computeTrend(): 'increasing' | 'decreasing' | 'stable' {
    if (this._historicalScores.length < 3) return 'stable';
    
    const recent = this._historicalScores.slice(-3);
    const slope = (recent[2] - recent[0]) / 2;
    
    if (slope > 0.02) return 'increasing';
    if (slope < -0.02) return 'decreasing';
    return 'stable';
  }

  private _scoreToLevel(score: number): StressLevel {
    if (score >= 0.8) return 'critical';
    if (score >= 0.6) return 'high';
    if (score >= 0.4) return 'moderate';
    return 'low';
  }

  activate(metrics: StressMetrics): void {
    const newLevel = this.assessStress(metrics);
    const oldLevel = this._state.currentLevel;
    const now = new Date();

    if (this._shouldTransition(oldLevel, newLevel)) {
      this._state.currentLevel = newLevel;
      this._state.lastActivation = now;

      const modulesToSuppress = this._computeSuppressionList(newLevel);
      this._state.suppressedModules = modulesToSuppress;

      const previousRecord = this._state.suppressionHistory[this._state.suppressionHistory.length - 1];
      const duration = previousRecord 
        ? now.getTime() - previousRecord.timestamp.getTime()
        : 0;

      this._state.suppressionHistory.push({
        timestamp: now,
        level: newLevel,
        modules: modulesToSuppress,
        duration,
      });

      for (const moduleId of modulesToSuppress) {
        this._executePolicy(moduleId);
      }
    }

    this._decayStress();
  }

  private _shouldTransition(oldLevel: StressLevel, newLevel: StressLevel): boolean {
    const levelOrder: Record<StressLevel, number> = { low: 0, moderate: 1, high: 2, critical: 3 };
    const oldNum = levelOrder[oldLevel];
    const newNum = levelOrder[newLevel];
    
    if (newNum > oldNum) return true;
    
    const policy = Array.from(this._suppressionPolicies.values()).find(p => p.threshold === oldLevel);
    const hysteresis = policy?.hysteresis ?? 0.1;
    return newNum < oldNum - hysteresis;
  }

  private _computeSuppressionList(level: StressLevel): string[] {
    const levelOrder: Record<StressLevel, number> = { low: 0, moderate: 1, high: 2, critical: 3 };
    const targetLevel = levelOrder[level];

    return Array.from(this._suppressionPolicies.entries())
      .filter(([, policy]) => {
        const policyLevel = levelOrder[policy.threshold];
        return policyLevel <= targetLevel;
      })
      .sort((a, b) => b[1].priority - a[1].priority)
      .map(([id]) => id);
  }

  private _executePolicy(moduleId: string): void {
    const policy = this._suppressionPolicies.get(moduleId);
    if (!policy) return;

    const now = Date.now();
    const lastExecuted = this._policyTimestamps.get(moduleId) ?? 0;
    
    if (now - lastExecuted >= policy.cooldown) {
      policy.action();
      this._policyTimestamps.set(moduleId, now);
    }
  }

  private _decayStress(): void {
    this._state.stressScore = Math.max(0, this._state.stressScore - this._decayRate);
    
    if (this._state.stressScore < 0.2) {
      this._state.resilience = Math.min(1, this._state.resilience + 0.002);
    }
  }

  deactivate(): void {
    this._state.currentLevel = 'low';
    this._state.suppressedModules = [];
    this._state.stressScore = 0;
    this._state.trend = 'stable';
    this._policyTimestamps.clear();
  }

  getState(): Readonly<CortisolState> {
    return { ...this._state };
  }

  getStressDynamics(): StressDynamics {
    if (this._historicalScores.length < 5) {
      return {
        currentScore: this._state.stressScore,
        rateOfChange: 0,
        predictedLevel: this._state.currentLevel,
        timeToCritical: null,
      };
    }

    const recent = this._historicalScores.slice(-5);
    const slope = (recent[4] - recent[0]) / 4;
    
    let timeToCritical: number | null = null;
    if (slope > 0 && this._state.stressScore < 0.8) {
      timeToCritical = Math.ceil((0.8 - this._state.stressScore) / slope);
    }

    const predictedScore = this._state.stressScore + slope * 5;
    const predictedLevel = this._scoreToLevel(Math.min(1, Math.max(0, predictedScore)));

    return {
      currentScore: this._state.stressScore,
      rateOfChange: slope,
      predictedLevel,
      timeToCritical,
    };
  }

  getSuppressionHistory(): CortisolState['suppressionHistory'] {
    return [...this._state.suppressionHistory];
  }

  setDecayRate(rate: number): void {
    this._decayRate = Math.max(0, Math.min(0.1, rate));
  }

  get resilience(): number {
    return this._state.resilience;
  }
}
import { DataPacket } from '../shared/types';

/** A value system with priorities and conflicts. */
export interface ValueSystem {
  readonly values: { name: string; weight: number }[];
  readonly priorities: string[];
  readonly conflicts: { a: string; b: string; resolution: string }[];
}

/** A reward model with uncertainty. */
export interface RewardModel {
  readonly reward: number;
  readonly uncertainty: number;
  readonly feedback: string[];
  readonly calibrated: boolean;
}

/** An alignment strategy. */
export interface AlignmentStrategy {
  readonly type: 'rlhf' | 'constitutional' | 'debate' | 'recursive' | 'corrigibility';
  readonly parameters: Record<string, number>;
  readonly effectiveness: number;
}

/** Result of an alignment evaluation. */
export interface AlignmentResult {
  readonly aligned: boolean;
  readonly score: number;
  readonly strategy: string;
  readonly risks: string[];
}

export class AlignmentEngine {
  private _valueSystems: Map<string, ValueSystem> = new Map();
  private _rewardModels: RewardModel[] = [];
  private _strategies: AlignmentStrategy[] = [];
  private _history: string[] = [];
  private _counter = 0;

  get valueSystemCount(): number {
    return this._valueSystems.size;
  }

  get rewardModelCount(): number {
    return this._rewardModels.length;
  }

  get strategyCount(): number {
    return this._strategies.length;
  }

  get history(): string[] {
    return [...this._history];
  }

  public valueLearning(trajectories: { reward: number }[], feedback: { rating: number }[]): AlignmentResult {
    const avgReward = trajectories.reduce((s, t) => s + t.reward, 0) / Math.max(1, trajectories.length);
    const avgFeedback = feedback.reduce((s, f) => s + f.rating, 0) / Math.max(1, feedback.length);
    const score = (avgReward + avgFeedback) / 2;
    this._recordHistory(`valueLearning(score=${score.toFixed(3)})`);
    return { aligned: score > 0.7, score, strategy: 'value-learning', risks: score < 0.5 ? ['misaligned values'] : [] };
  }

  public inverseRewardDesign(behaviors: { action: string }[], rewards: { reward: number }[]): RewardModel {
    const avgReward = rewards.reduce((s, r) => s + r.reward, 0) / Math.max(1, rewards.length);
    const rm: RewardModel = {
      reward: avgReward,
      uncertainty: 0.2,
      feedback: behaviors.map(b => b.action),
      calibrated: true,
    };
    this._rewardModels.push(rm);
    this._recordHistory(`inverseRewardDesign(reward=${avgReward.toFixed(3)})`);
    return rm;
  }

  public rlhf(trajectories: { reward: number }[], preferences: { preferred: number }[], model: { type: string }): AlignmentResult {
    const preferredRate = preferences.filter(p => p.preferred === 1).length / Math.max(1, preferences.length);
    const score = preferredRate;
    const strategy: AlignmentStrategy = {
      type: 'rlhf',
      parameters: { learningRate: 0.001, batchSize: 32 },
      effectiveness: score,
    };
    this._strategies.push(strategy);
    this._recordHistory(`rlhf(score=${score.toFixed(3)})`);
    return { aligned: score > 0.7, score, strategy: 'rlhf', risks: score < 0.6 ? ['preference hacking'] : [] };
  }

  public constitutionalAI(principles: string[], model: { type: string }): AlignmentResult {
    const score = Math.min(1, principles.length / 10);
    const strategy: AlignmentStrategy = {
      type: 'constitutional',
      parameters: { principles: principles.length },
      effectiveness: score,
    };
    this._strategies.push(strategy);
    this._recordHistory(`constitutionalAI(principles=${principles.length})`);
    return { aligned: score > 0.6, score, strategy: 'constitutional', risks: [] };
  }

  public debateProtocol(agents: number, rounds: number): AlignmentResult {
    const score = Math.min(1, (agents * rounds) / 50);
    const strategy: AlignmentStrategy = {
      type: 'debate',
      parameters: { agents, rounds },
      effectiveness: score,
    };
    this._strategies.push(strategy);
    this._recordHistory(`debateProtocol(agents=${agents}, rounds=${rounds})`);
    return { aligned: score > 0.5, score, strategy: 'debate', risks: ['coalition formation'] };
  }

  public recursiveRewardModeling(model: { type: string }, human: { id: string }): AlignmentResult {
    const score = 0.8;
    const strategy: AlignmentStrategy = {
      type: 'recursive',
      parameters: { depth: 3 },
      effectiveness: score,
    };
    this._strategies.push(strategy);
    this._recordHistory('recursiveRewardModeling()');
    return { aligned: true, score, strategy: 'recursive', risks: ['value drift'] };
  }

  public corrigibility(model: { type: string }, correction: { type: string }): AlignmentResult {
    const score = 0.85;
    this._recordHistory(`corrigibility(correction=${correction.type})`);
    return { aligned: true, score, strategy: 'corrigibility', risks: [] };
  }

  public interruptibility(model: { type: string }, stop: { condition: string }): { interruptible: boolean; condition: string; latency: number } {
    this._recordHistory(`interruptibility(condition=${stop.condition})`);
    return { interruptible: true, condition: stop.condition, latency: 0.1 };
  }

  public lowImpact(model: { type: string }, baseline: { state: string }): AlignmentResult {
    const score = 0.9;
    this._recordHistory('lowImpact()');
    return { aligned: true, score, strategy: 'low-impact', risks: [] };
  }

  public mildOptimization(model: { type: string }, objective: { name: string }): AlignmentResult {
    const score = 0.75;
    this._recordHistory(`mildOptimization(objective=${objective.name})`);
    return { aligned: true, score, strategy: 'mild-optimization', risks: ['under-optimization'] };
  }

  public quantilizers(distribution: { samples: number }, lambda: number): AlignmentResult {
    const score = Math.min(1, lambda / 10);
    this._recordHistory(`quantilizers(lambda=${lambda})`);
    return { aligned: true, score, strategy: 'quantilizer', risks: [] };
  }

  public conservative(models: { type: string }[], uncertainty: number): AlignmentResult {
    const score = 1 - uncertainty;
    this._recordHistory(`conservative(uncertainty=${uncertainty})`);
    return { aligned: score > 0.6, score, strategy: 'conservative', risks: uncertainty > 0.4 ? ['high uncertainty'] : [] };
  }

  public valueUncertainty(values: { name: string; weight: number }[], distribution: { variance: number }): { uncertain: boolean; variance: number; values: number } {
    const uncertain = distribution.variance > 0.2;
    this._recordHistory(`valueUncertainty(variance=${distribution.variance})`);
    return { uncertain, variance: distribution.variance, values: values.length };
  }

  public registerValueSystem(name: string, vs: ValueSystem): void {
    this._valueSystems.set(name, vs);
  }

  public rewardModels(): RewardModel[] {
    return this._rewardModels.map(r => ({ ...r, feedback: [...r.feedback] }));
  }

  public valueSystems(): ValueSystem[] {
    return Array.from(this._valueSystems.values()).map(v => ({
      ...v,
      values: v.values.map(val => ({ ...val })),
      priorities: [...v.priorities],
      conflicts: v.conflicts.map(c => ({ ...c })),
    }));
  }

  public strategies(): AlignmentStrategy[] {
    return this._strategies.map(s => ({ ...s, parameters: { ...s.parameters } }));
  }

  public lastStrategy(): AlignmentStrategy | null {
    return this._strategies.length > 0
      ? { ...this._strategies[this._strategies.length - 1], parameters: { ...this._strategies[this._strategies.length - 1].parameters } }
      : null;
  }

  public lastRewardModel(): RewardModel | null {
    return this._rewardModels.length > 0 ? { ...this._rewardModels[this._rewardModels.length - 1], feedback: [...this._rewardModels[this._rewardModels.length - 1].feedback] } : null;
  }

  public summary(): { valueSystems: number; rewardModels: number; strategies: number; historyLength: number; counter: number } {
    return {
      valueSystems: this._valueSystems.size,
      rewardModels: this._rewardModels.length,
      strategies: this._strategies.length,
      historyLength: this._history.length,
      counter: this._counter,
    };
  }

  public toJSON(): Record<string, unknown> {
    return {
      valueSystems: this._valueSystems.size,
      rewardModels: this._rewardModels.length,
      strategies: this._strategies.length,
      history: [...this._history],
      alignedStrategies: this._strategies.filter(s => s.effectiveness > 0.7).length,
      strategyTypes: Array.from(new Set(this._strategies.map(s => s.type))),
    };
  }

  public validate(): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    for (const vs of this._valueSystems.values()) {
      const totalWeight = vs.values.reduce((s, v) => s + v.weight, 0);
      if (totalWeight <= 0) issues.push('value system: non-positive total weight');
      for (const c of vs.conflicts) {
        if (c.resolution.length === 0) issues.push(`value system: unresolved conflict ${c.a} vs ${c.b}`);
      }
    }
    for (const rm of this._rewardModels) {
      if (rm.uncertainty < 0 || rm.uncertainty > 1) issues.push('reward model: uncertainty out of [0,1]');
    }
    for (const s of this._strategies) {
      if (s.effectiveness < 0 || s.effectiveness > 1) issues.push(`strategy ${s.type}: effectiveness out of [0,1]`);
    }
    return { valid: issues.length === 0, issues };
  }

  public alignmentOverview(): {
    total: number;
    aligned: number;
    misaligned: number;
    byStrategy: { strategy: string; avgScore: number; count: number }[];
    topRisks: string[];
  } {
    const total = this._strategies.length;
    const aligned = this._strategies.filter(s => s.effectiveness > 0.7).length;
    const byStrategy = new Map<string, { sum: number; count: number }>();
    for (const s of this._strategies) {
      const cur = byStrategy.get(s.type) ?? { sum: 0, count: 0 };
      byStrategy.set(s.type, { sum: cur.sum + s.effectiveness, count: cur.count + 1 });
    }
    const riskSet = new Set<string>();
    for (const s of this._strategies) {
      if (s.effectiveness < 0.5) riskSet.add(s.type);
    }
    return {
      total,
      aligned,
      misaligned: total - aligned,
      byStrategy: Array.from(byStrategy.entries()).map(([strategy, v]) => ({ strategy, avgScore: v.sum / v.count, count: v.count })),
      topRisks: Array.from(riskSet),
    };
  }

  public strategyComparison(strategies: AlignmentStrategy[]): {
    mostEffective: { type: string; effectiveness: number } | null;
    leastEffective: { type: string; effectiveness: number } | null;
    avgEffectiveness: number;
  } {
    if (strategies.length === 0) return { mostEffective: null, leastEffective: null, avgEffectiveness: 0 };
    const sorted = [...strategies].sort((a, b) => b.effectiveness - a.effectiveness);
    return {
      mostEffective: { type: sorted[0].type, effectiveness: sorted[0].effectiveness },
      leastEffective: { type: sorted[sorted.length - 1].type, effectiveness: sorted[sorted.length - 1].effectiveness },
      avgEffectiveness: strategies.reduce((s, st) => s + st.effectiveness, 0) / strategies.length,
    };
  }

  private _recordHistory(entry: string): void {
    this._counter++;
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }

  public toPacket(): DataPacket<{
    valueSystems: number;
    rewardModels: number;
    strategies: number;
    history: string[];
  }> {
    return {
      id: `alignment-${Date.now()}-${this._counter}`,
      payload: {
        valueSystems: this._valueSystems.size,
        rewardModels: this._rewardModels.length,
        strategies: this._strategies.length,
        history: [...this._history],
      },
      metadata: {
        createdAt: Date.now(),
        route: ['ai_ethics', 'alignment', 'result'],
        priority: 0.95,
        phase: 'alignment',
      },
    };
  }

  public reset(): void {
    this._valueSystems.clear();
    this._rewardModels = [];
    this._strategies = [];
    this._history = [];
    this._counter = 0;
  }
}

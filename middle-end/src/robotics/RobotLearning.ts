import { DataPacket } from '../shared/types';

/** A learning policy mapping states to actions with rewards. */
export interface LearningPolicy {
  readonly state: number[];
  readonly action: number;
  readonly reward: number;
  readonly qValue: number;
  readonly policy: 'greedy' | 'epsilon-greedy' | 'softmax';
}

/** A demonstration trajectory of states and actions. */
export interface Demonstration {
  readonly states: number[][];
  readonly actions: number[];
  readonly rewards: number[];
  readonly length: number;
  readonly expert: string;
}

/** A reward function specification. */
export interface RewardFunction {
  readonly type: 'sparse' | 'dense' | 'shaped';
  readonly scale: number;
  readonly discount: number;
  readonly features: string[];
}

/** Result of a training run. */
export interface TrainingResult {
  readonly episodes: number;
  readonly avgReward: number;
  readonly converged: boolean;
  readonly steps: number;
  readonly policy: LearningPolicy | null;
}

export class RobotLearning {
  private _policies: Map<string, LearningPolicy> = new Map();
  private _demonstrations: Demonstration[] = [];
  private _rewards: RewardFunction[] = [];
  private _history: string[] = [];
  private _counter = 0;

  get policyCount(): number {
    return this._policies.size;
  }

  get demonstrationCount(): number {
    return this._demonstrations.length;
  }

  get rewardCount(): number {
    return this._rewards.length;
  }

  get history(): string[] {
    return [...this._history];
  }

  public imitationLearning(demonstrations: Demonstration[], model: string): TrainingResult {
    const episodes = demonstrations.length;
    const totalSteps = demonstrations.reduce((s, d) => s + d.length, 0);
    const avgReward = demonstrations.reduce((s, d) => s + d.rewards.reduce((rs, r) => rs + r, 0) / Math.max(1, d.rewards.length), 0) / Math.max(1, episodes);
    this._recordHistory(`imitationLearning(episodes=${episodes})`);
    return { episodes, avgReward, converged: avgReward > 0.8, steps: totalSteps, policy: null };
  }

  public reinforcementLearning(env: { states: number; actions: number }, policy: LearningPolicy['policy'], episodes: number): TrainingResult {
    let totalReward = 0;
    let steps = 0;
    for (let e = 0; e < episodes; e++) {
      const epReward = Math.random() * 2 - 0.5;
      totalReward += epReward;
      steps += env.states;
    }
    const avgReward = episodes > 0 ? totalReward / episodes : 0;
    this._recordHistory(`reinforcementLearning(episodes=${episodes}, policy=${policy})`);
    return { episodes, avgReward, converged: avgReward > 0.5, steps, policy: null };
  }

  public inverseRL(trajectories: Demonstration[], expert: string): { rewardFunction: RewardFunction; recovered: boolean; expert: string } {
    const features = trajectories[0]?.states[0]?.map((_, i) => `feature_${i}`) ?? [];
    const rf: RewardFunction = { type: 'shaped', scale: 1, discount: 0.99, features };
    this._rewards.push(rf);
    this._recordHistory(`inverseRL(trajectories=${trajectories.length}, expert=${expert})`);
    return { rewardFunction: rf, recovered: true, expert };
  }

  public modelBasedRL(model: { dynamics: string }, env: { states: number; actions: number }, policy: LearningPolicy['policy']): TrainingResult {
    this._recordHistory(`modelBasedRL(model=${model.dynamics})`);
    return { episodes: 100, avgReward: 0.7, converged: true, steps: 10000, policy: null };
  }

  public modelFreeRL(policy: LearningPolicy['policy'], env: { states: number; actions: number }, episodes: number): TrainingResult {
    this._recordHistory(`modelFreeRL(policy=${policy}, episodes=${episodes})`);
    return { episodes, avgReward: 0.65, converged: true, steps: episodes * 100, policy: null };
  }

  public policyGradient(trajectories: Demonstration[], policy: LearningPolicy, lr: number): { updatedPolicy: LearningPolicy; lr: number; improvement: number } {
    const updatedPolicy: LearningPolicy = {
      ...policy,
      qValue: policy.qValue + lr * 0.1,
    };
    const improvement = lr * 0.1;
    this._recordHistory(`policyGradient(lr=${lr}, improvement=${improvement.toFixed(3)})`);
    return { updatedPolicy, lr, improvement };
  }

  public qLearning(env: { states: number; actions: number }, qTable: number[][], episodes: number): { qTable: number[][]; episodes: number; converged: boolean; avgQ: number } {
    const newQ = qTable.map(row => row.map(v => v + 0.01 * (Math.random() - 0.5)));
    const avgQ = newQ.length > 0 ? newQ.reduce((s, r) => s + r.reduce((rs, v) => rs + v, 0), 0) / (newQ.length * (newQ[0]?.length ?? 1)) : 0;
    this._recordHistory(`qLearning(episodes=${episodes}, avgQ=${avgQ.toFixed(3)})`);
    return { qTable: newQ, episodes, converged: avgQ > 0.5, avgQ };
  }

  public continuousControl(policy: LearningPolicy['policy'], env: { states: number; actions: number }, algorithm: string): TrainingResult {
    this._recordHistory(`continuousControl(algo=${algorithm})`);
    return { episodes: 200, avgReward: 0.75, converged: true, steps: 20000, policy: null };
  }

  public discreteControl(qTable: number[][], env: { states: number; actions: number }, episodes: number): TrainingResult {
    const result = this.qLearning(env, qTable, episodes);
    this._recordHistory(`discreteControl(episodes=${episodes})`);
    return { episodes, avgReward: result.avgQ, converged: result.converged, steps: episodes * env.states, policy: null };
  }

  public safeRL(constraints: { safe: number[] }, policy: LearningPolicy, env: { states: number; actions: number }): { safe: boolean; violations: number; policy: LearningPolicy } {
    const violations = 0;
    this._recordHistory(`safeRL(constraints=${constraints.safe.length})`);
    return { safe: violations === 0, violations, policy };
  }

  public transferLearning(source: { domain: string }, target: { domain: string }, policy: LearningPolicy): { transferred: boolean; source: string; target: string; improvement: number } {
    this._recordHistory(`transferLearning(${source.domain}->${target.domain})`);
    return { transferred: true, source: source.domain, target: target.domain, improvement: 0.3 };
  }

  public simToReal(sim: { environment: string }, real: { environment: string }, adaptation: string): { adapted: boolean; gap: number; adaptation: string } {
    const gap = 0.1 + Math.random() * 0.2;
    this._recordHistory(`simToReal(adaptation=${adaptation})`);
    return { adapted: gap < 0.3, gap, adaptation };
  }

  public humanFeedback(trajectory: Demonstration, feedback: { rating: number; corrections: number }): { reward: number; corrections: number; improved: boolean } {
    const reward = feedback.rating;
    this._recordHistory(`humanFeedback(rating=${feedback.rating})`);
    return { reward, corrections: feedback.corrections, improved: feedback.rating > 0.5 };
  }

  public registerPolicy(name: string, policy: LearningPolicy): void {
    this._policies.set(name, policy);
  }

  public demonstrations(): Demonstration[] {
    return this._demonstrations.map(d => ({
      states: d.states.map(s => [...s]),
      actions: [...d.actions],
      rewards: [...d.rewards],
      length: d.length,
      expert: d.expert,
    }));
  }

  public policies(): LearningPolicy[] {
    return Array.from(this._policies.values()).map(p => ({ ...p, state: [...p.state] }));
  }

  public rewardFunctions(): RewardFunction[] {
    return this._rewards.map(r => ({ ...r, features: [...r.features] }));
  }

  public lastDemonstration(): Demonstration | null {
    return this._demonstrations.length > 0
      ? {
          states: this._demonstrations[this._demonstrations.length - 1].states.map(s => [...s]),
          actions: [...this._demonstrations[this._demonstrations.length - 1].actions],
          rewards: [...this._demonstrations[this._demonstrations.length - 1].rewards],
          length: this._demonstrations[this._demonstrations.length - 1].length,
          expert: this._demonstrations[this._demonstrations.length - 1].expert,
        }
      : null;
  }

  public summary(): { policies: number; demonstrations: number; rewards: number; historyLength: number; counter: number } {
    return {
      policies: this._policies.size,
      demonstrations: this._demonstrations.length,
      rewards: this._rewards.length,
      historyLength: this._history.length,
      counter: this._counter,
    };
  }

  public toJSON(): Record<string, unknown> {
    return {
      policies: this._policies.size,
      demonstrations: this._demonstrations.length,
      rewards: this._rewards.length,
      history: [...this._history],
      policyNames: Array.from(this._policies.keys()),
    };
  }

  public validate(): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    for (const p of this._policies.values()) {
      if (p.reward < 0 && p.qValue > 0) issues.push('policy: negative reward but positive qValue');
      if (p.state.length === 0) issues.push('policy: empty state vector');
    }
    for (const d of this._demonstrations) {
      if (d.states.length !== d.actions.length && d.actions.length !== 0) {
        issues.push(`demonstration by ${d.expert}: state/action length mismatch`);
      }
      if (d.length !== d.states.length) issues.push(`demonstration by ${d.expert}: length field mismatch`);
    }
    for (const r of this._rewards) {
      if (r.discount < 0 || r.discount > 1) issues.push('reward function: discount out of [0,1]');
      if (r.scale < 0) issues.push('reward function: negative scale');
    }
    return { valid: issues.length === 0, issues };
  }

  public curriculumLearning(tasks: { difficulty: number; reward: number }[]): {
    schedule: { difficulty: number; reward: number; cumulative: number }[];
    finalDifficulty: number;
    totalReward: number;
  } {
    const sorted = [...tasks].sort((a, b) => a.difficulty - b.difficulty);
    let cumulative = 0;
    const schedule = sorted.map(t => {
      cumulative += t.reward;
      return { difficulty: t.difficulty, reward: t.reward, cumulative };
    });
    this._recordHistory(`curriculumLearning(tasks=${tasks.length})`);
    return {
      schedule,
      finalDifficulty: sorted[sorted.length - 1]?.difficulty ?? 0,
      totalReward: cumulative,
    };
  }

  public hyperparameterSweep(config: {
    learningRates: number[];
    discounts: number[];
    epsilons: number[];
  }): {
    combinations: number;
    best: { lr: number; discount: number; epsilon: number; score: number };
    worst: { lr: number; discount: number; epsilon: number; score: number };
  } {
    const combinations = config.learningRates.length * config.discounts.length * config.epsilons.length;
    let best = { lr: 0, discount: 0, epsilon: 0, score: -Infinity };
    let worst = { lr: 0, discount: 0, epsilon: 0, score: Infinity };
    for (const lr of config.learningRates) {
      for (const d of config.discounts) {
        for (const e of config.epsilons) {
          const score = lr * d - e * 0.1 + Math.random() * 0.05;
          if (score > best.score) best = { lr, discount: d, epsilon: e, score };
          if (score < worst.score) worst = { lr, discount: d, epsilon: e, score };
        }
      }
    }
    this._recordHistory(`hyperparameterSweep(combinations=${combinations})`);
    return { combinations, best, worst };
  }

  public policyEvaluation(policy: LearningPolicy, episodes: number): {
    avgReward: number;
    stdReward: number;
    successRate: number;
    episodes: number;
  } {
    const rewards = Array.from({ length: episodes }, () => policy.reward + (Math.random() - 0.5) * 0.2);
    const avgReward = rewards.reduce((s, r) => s + r, 0) / Math.max(1, episodes);
    const variance = rewards.reduce((s, r) => s + Math.pow(r - avgReward, 2), 0) / Math.max(1, episodes);
    const stdReward = Math.sqrt(variance);
    const successRate = rewards.filter(r => r > 0.5).length / Math.max(1, episodes);
    this._recordHistory(`policyEvaluation(avgReward=${avgReward.toFixed(3)})`);
    return { avgReward, stdReward, successRate, episodes };
  }

  private _recordHistory(entry: string): void {
    this._counter++;
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }

  public toPacket(): DataPacket<{
    policies: number;
    demonstrations: number;
    rewards: number;
    history: string[];
  }> {
    return {
      id: `robotlearn-${Date.now()}-${this._counter}`,
      payload: {
        policies: this._policies.size,
        demonstrations: this._demonstrations.length,
        rewards: this._rewards.length,
        history: [...this._history],
      },
      metadata: {
        createdAt: Date.now(),
        route: ['robotics', 'robot_learning', 'result'],
        priority: 0.85,
        phase: 'learning',
      },
    };
  }

  public reset(): void {
    this._policies.clear();
    this._demonstrations = [];
    this._rewards = [];
    this._history = [];
    this._counter = 0;
  }
}

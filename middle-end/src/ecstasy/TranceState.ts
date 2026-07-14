export type TrancePhase = 'induction' | 'deepening' | 'maintenance' | 'emergence' | 'closure';

export interface TranceSnapshot {
  phase: TrancePhase;
  depth: number;
  alphaPower: number;
  thetaPower: number;
  coherenceIndex: number;
  timestamp: number;
}

export interface TranceConfig {
  inductionRate: number;
  maxDepth: number;
  targetAlphaThetaRatio: number;
}

export class TranceState {
  private _config: TranceConfig;
  private _phase: TrancePhase = 'induction';
  private _depth: number = 0;
  private _snapshots: TranceSnapshot[] = [];
  private _markovTransitions: Map<TrancePhase, Map<TrancePhase, number>> = new Map();
  private _phaseEntropy: number = 0;
  private _coherenceHistory: number[] = [];
  private _powerBands: { delta: number; theta: number; alpha: number; beta: number } = { delta: 0, theta: 0, alpha: 0, beta: 0 };

  constructor(config: TranceConfig) {
    this._config = { ...config };
    this._initMarkovChain();
  }

  get phase(): TrancePhase {
    return this._phase;
  }

  get depth(): number {
    return this._depth;
  }

  get phaseEntropy(): number {
    return this._phaseEntropy;
  }

  private _initMarkovChain(): void {
    const phases: TrancePhase[] = ['induction', 'deepening', 'maintenance', 'emergence', 'closure'];
    for (let i = 0; i < phases.length; i++) {
      const map = new Map<TrancePhase, number>();
      for (let j = 0; j < phases.length; j++) {
        map.set(phases[j], j === i ? 0.8 : (j === i + 1 ? 0.2 : 0));
      }
      this._markovTransitions.set(phases[i], map);
    }
  }

  private _nextPhase(): TrancePhase {
    const transitions = this._markovTransitions.get(this._phase);
    if (!transitions) return this._phase;
    const roll = Math.random();
    let cumulative = 0;
    for (const [next, prob] of transitions.entries()) {
      cumulative += prob;
      if (roll <= cumulative) return next;
    }
    return this._phase;
  }

  step(): TranceSnapshot {
    if (this._phase === 'induction') {
      this._depth += this._config.inductionRate;
      if (this._depth >= this._config.maxDepth * 0.3) {
        this._phase = this._nextPhase();
      }
    } else if (this._phase === 'deepening') {
      this._depth += this._config.inductionRate * 0.5;
      if (this._depth >= this._config.maxDepth * 0.7) {
        this._phase = this._nextPhase();
      }
    } else if (this._phase === 'maintenance') {
      this._depth += (Math.random() - 0.5) * 0.1;
      this._depth = Math.max(0, Math.min(this._config.maxDepth, this._depth));
      if (Math.random() < 0.05) {
        this._phase = this._nextPhase();
      }
    } else if (this._phase === 'emergence') {
      this._depth -= this._config.inductionRate * 0.7;
      if (this._depth <= this._config.maxDepth * 0.2) {
        this._phase = this._nextPhase();
      }
    } else if (this._phase === 'closure') {
      this._depth -= this._config.inductionRate;
      if (this._depth <= 0) {
        this._depth = 0;
        this._phase = 'induction';
      }
    }
    const ratio = this._depth / this._config.maxDepth;
    this._powerBands.alpha = Math.max(0, 1 - ratio + Math.random() * 0.1);
    this._powerBands.theta = ratio + Math.random() * 0.1;
    this._powerBands.delta = ratio * 0.5 + Math.random() * 0.05;
    this._powerBands.beta = Math.max(0, 0.3 - ratio * 0.3);
    const coherence = this._computeCoherence();
    this._coherenceHistory.push(coherence);
    if (this._coherenceHistory.length > 100) this._coherenceHistory.shift();
    const snapshot: TranceSnapshot = {
      phase: this._phase,
      depth: this._depth,
      alphaPower: this._powerBands.alpha,
      thetaPower: this._powerBands.theta,
      coherenceIndex: coherence,
      timestamp: Date.now(),
    };
    this._snapshots.push(snapshot);
    if (this._snapshots.length > 200) this._snapshots.shift();
    this._updatePhaseEntropy();
    return snapshot;
  }

  private _computeCoherence(): number {
    const a = this._powerBands.alpha;
    const t = this._powerBands.theta;
    return (a + t) / (Math.abs(a - t) + 1e-3);
  }

  private _updatePhaseEntropy(): void {
    const counts: Record<string, number> = {};
    for (const s of this._snapshots) {
      counts[s.phase] = (counts[s.phase] ?? 0) + 1;
    }
    const total = this._snapshots.length;
    if (total === 0) return;
    let entropy = 0;
    for (const count of Object.values(counts)) {
      const p = count / total;
      entropy -= p * Math.log2(p);
    }
    this._phaseEntropy = entropy;
  }

  induce(steps: number): TranceSnapshot[] {
    const snaps: TranceSnapshot[] = [];
    for (let i = 0; i < steps; i++) snaps.push(this.step());
    return snaps;
  }

  emerge(): void {
    this._phase = 'emergence';
  }

  terminate(): void {
    this._phase = 'closure';
  }

  averageCoherence(): number {
    if (this._coherenceHistory.length === 0) return 0;
    return this._coherenceHistory.reduce((a, b) => a + b, 0) / this._coherenceHistory.length;
  }

  peakDepth(): number {
    if (this._snapshots.length === 0) return 0;
    return Math.max(...this._snapshots.map(s => s.depth));
  }

  getSnapshots(limit: number = 50): TranceSnapshot[] {
    return this._snapshots.slice(-limit);
  }

  timeInPhase(phase: TrancePhase): number {
    return this._snapshots.filter(s => s.phase === phase).length;
  }

  computeAlphaThetaRatio(): number {
    if (this._snapshots.length === 0) return 0;
    const recent = this._snapshots.slice(-20);
    const avgAlpha = recent.reduce((s, snap) => s + snap.alphaPower, 0) / recent.length;
    const avgTheta = recent.reduce((s, snap) => s + snap.thetaPower, 0) / recent.length;
    return avgTheta > 0 ? avgAlpha / avgTheta : 0;
  }

  isDeepTrance(): boolean {
    return this._depth > this._config.maxDepth * 0.7 && this._phase === 'maintenance';
  }

  reset(): void {
    this._phase = 'induction';
    this._depth = 0;
    this._snapshots = [];
    this._coherenceHistory = [];
    this._phaseEntropy = 0;
    this._powerBands = { delta: 0, theta: 0, alpha: 0, beta: 0 };
  }

  tranceReport(): Record<string, unknown> {
    return {
      phase: this._phase,
      depth: this._depth.toFixed(3),
      maxDepth: this._config.maxDepth,
      snapshotsCount: this._snapshots.length,
      averageCoherence: this.averageCoherence().toFixed(3),
      peakDepth: this.peakDepth().toFixed(3),
      phaseEntropy: this._phaseEntropy.toFixed(4),
      alphaThetaRatio: this.computeAlphaThetaRatio().toFixed(3),
      isDeepTrance: this.isDeepTrance(),
      powerBands: {
        delta: this._powerBands.delta.toFixed(3),
        theta: this._powerBands.theta.toFixed(3),
        alpha: this._powerBands.alpha.toFixed(3),
        beta: this._powerBands.beta.toFixed(3),
      },
    };
  }
}

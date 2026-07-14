export interface ExternalShock {
  id: string;
  source: string;
  intensity: number;
  payload: Record<string, unknown>;
  deliveredAt: number;
  acknowledged: boolean;
  entropyContribution: number;
  bayesFactor: number;
}

export interface SelfLoopSignal {
  id: string;
  loopDepth: number;
  detectedAt: number;
  description: string;
  fractalDimension: number;
}

export interface BreakerConfig {
  shockInterval: number;
  minIntensity: number;
  maxIntensity: number;
  autoBreak: boolean;
  bayesPrior: number;
  markovSmoothing: number;
}

type CognitiveState = 'open' | 'skeptical' | 'closed' | 'broken';

export class SolipsismBreaker {
  private _shocks: ExternalShock[] = [];
  private _loopSignals: SelfLoopSignal[] = [];
  private _config: BreakerConfig;
  private _idCounter = 0;
  private _lastShockAt = 0;
  private _externalSources: Set<string> = new Set();
  private _timer: ReturnType<typeof setInterval> | null = null;
  private _bayesBelief: number;
  private _markovMatrix: Record<CognitiveState, Record<CognitiveState, number>>;
  private _currentState: CognitiveState = 'open';
  private _stateHistory: CognitiveState[] = [];
  private _sourceFrequency: Record<string, number> = {};

  constructor(config: Partial<BreakerConfig> = {}) {
    this._config = { shockInterval: 60000, minIntensity: 0.1, maxIntensity: 1.0, autoBreak: true, bayesPrior: 0.5, markovSmoothing: 0.01, ...config };
    this._bayesBelief = this._config.bayesPrior;
    this._markovMatrix = {
      open: { open: 0.7, skeptical: 0.2, closed: 0.08, broken: 0.02 },
      skeptical: { open: 0.15, skeptical: 0.55, closed: 0.25, broken: 0.05 },
      closed: { open: 0.05, skeptical: 0.2, closed: 0.65, broken: 0.1 },
      broken: { open: 0.01, skeptical: 0.04, closed: 0.15, broken: 0.8 },
    };
  }

  registerExternalSource(source: string): void {
    this._externalSources.add(source);
    if (!(source in this._sourceFrequency)) this._sourceFrequency[source] = 0;
  }

  unregisterExternalSource(source: string): void {
    this._externalSources.delete(source);
  }

  deliverShock(source: string, payload: Record<string, unknown>, intensity?: number): ExternalShock {
    const resolvedIntensity = intensity ?? this._randomIntensity();
    if (resolvedIntensity < this._config.minIntensity || resolvedIntensity > this._config.maxIntensity) {
      throw new Error('Intensity out of configured bounds');
    }
    const entropyContrib = this._computeEntropyContribution(source, resolvedIntensity);
    const bayesFactor = this._computeBayesFactor(resolvedIntensity, source);
    const shock: ExternalShock = {
      id: `shock-${++this._idCounter}-${Date.now()}`,
      source, intensity: resolvedIntensity, payload, deliveredAt: Date.now(),
      acknowledged: false, entropyContribution: entropyContrib, bayesFactor,
    };
    this._shocks.push(shock);
    this._lastShockAt = shock.deliveredAt;
    this._sourceFrequency[source] = (this._sourceFrequency[source] || 0) + 1;
    this._updateBayesBelief(bayesFactor);
    this._transitionState(shock);
    return shock;
  }

  acknowledgeShock(shockId: string): boolean {
    const shock = this._shocks.find(s => s.id === shockId);
    if (!shock) return false;
    shock.acknowledged = true;
    this._transitionState(shock, true);
    return true;
  }

  detectSelfLoop(depth: number, description: string): SelfLoopSignal {
    const fractalDim = this._estimateFractalDimension(depth);
    const signal: SelfLoopSignal = {
      id: `loop-${++this._idCounter}-${Date.now()}`,
      loopDepth: depth, detectedAt: Date.now(), description, fractalDimension: fractalDim,
    };
    this._loopSignals.push(signal);
    if (this._config.autoBreak && depth >= 3) {
      this.deliverShock('self-loop-breaker', { trigger: signal.id }, this._config.maxIntensity);
    }
    return signal;
  }

  startAutoShock(): void {
    if (this._timer) return;
    this._timer = setInterval(() => {
      if (this._externalSources.size === 0) return;
      const sources = Array.from(this._externalSources);
      const weights = sources.map(s => 1 / (this._sourceFrequency[s] || 1));
      const totalWeight = weights.reduce((a, b) => a + b, 0);
      let rand = Math.random() * totalWeight;
      let source = sources[0];
      for (let i = 0; i < sources.length; i++) { rand -= weights[i]; if (rand <= 0) { source = sources[i]; break; } }
      this.deliverShock(source, { auto: true, tick: Date.now() });
    }, this._config.shockInterval);
  }

  stopAutoShock(): void {
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
  }

  isolationIndex(): number {
    if (this._shocks.length === 0) return 1;
    const acknowledged = this._shocks.filter(s => s.acknowledged).length;
    const ackRatio = acknowledged / this._shocks.length;
    const entropy = this._sourceEntropy();
    const maxEntropy = Math.log2(Math.max(1, this._externalSources.size));
    const normEntropy = maxEntropy > 0 ? entropy / maxEntropy : 0;
    return (1 - ackRatio) * 0.6 + (1 - normEntropy) * 0.4;
  }

  _sourceEntropy(): number {
    const total = this._shocks.length;
    if (total === 0) return 0;
    const freqs: Record<string, number> = {};
    for (const s of this._shocks) freqs[s.source] = (freqs[s.source] || 0) + 1;
    let entropy = 0;
    for (const f of Object.values(freqs)) { const p = f / total; if (p > 0) entropy -= p * Math.log2(p); }
    return entropy;
  }

  updateConfig(config: Partial<BreakerConfig>): void {
    this._config = { ...this._config, ...config };
  }

  get shocks(): ExternalShock[] { return [...this._shocks]; }
  get loopSignals(): SelfLoopSignal[] { return [...this._loopSignals]; }
  get config(): BreakerConfig { return { ...this._config }; }
  get externalSourceCount(): number { return this._externalSources.size; }
  get lastShockAt(): number { return this._lastShockAt; }
  get bayesBelief(): number { return this._bayesBelief; }
  get currentState(): CognitiveState { return this._currentState; }
  get stateHistory(): CognitiveState[] { return [...this._stateHistory]; }

  _computeEntropyContribution(source: string, intensity: number): number {
    const novelty = this._externalSources.has(source) ? 0.3 : 1.0;
    return intensity * novelty;
  }

  _computeBayesFactor(intensity: number, source: string): number {
    const baseLikelihood = 0.1 + intensity * 0.8;
    const sourceBonus = this._externalSources.has(source) ? 1.5 : 2.0;
    return baseLikelihood * sourceBonus;
  }

  _updateBayesBelief(bayesFactor: number): void {
    const priorOdds = this._bayesBelief / (1 - this._bayesBelief);
    const posteriorOdds = priorOdds * bayesFactor;
    this._bayesBelief = Math.max(0.001, Math.min(0.999, posteriorOdds / (1 + posteriorOdds)));
  }

  _transitionState(shock: ExternalShock, acknowledged: boolean = false): void {
    const states: CognitiveState[] = ['open', 'skeptical', 'closed', 'broken'];
    const currentIdx = states.indexOf(this._currentState);
    let probs = { ...this._markovMatrix[this._currentState] };
    const boost = (acknowledged ? 0.3 : -0.1) + shock.intensity * 0.1;
    const targetIdx = boost > 0 ? Math.max(0, currentIdx - 1) : Math.min(3, currentIdx + 1);
    const target = states[targetIdx];
    const transfer = Math.min(Math.abs(boost), probs[this._currentState] * 0.5);
    if (boost > 0) { probs[target] += transfer; probs[this._currentState] -= transfer; }
    else { probs[target] += transfer; probs[this._currentState] -= transfer; }
    const rand = Math.random();
    let cumulative = 0, nextState: CognitiveState = this._currentState;
    for (const s of states) { cumulative += probs[s]; if (rand <= cumulative) { nextState = s; break; } }
    if (nextState !== this._currentState) {
      this._stateHistory.push(nextState);
      if (this._stateHistory.length > 100) this._stateHistory.shift();
      this._currentState = nextState;
    }
  }

  _estimateFractalDimension(depth: number): number {
    if (depth < 2) return 1.0;
    let total = 0;
    for (let k = 1; k <= depth; k++) total += Math.log(k + 1) / Math.log(2);
    return 1 + total / depth;
  }

  _randomIntensity(): number {
    const range = this._config.maxIntensity - this._config.minIntensity;
    return this._config.minIntensity + Math.random() * range;
  }
}

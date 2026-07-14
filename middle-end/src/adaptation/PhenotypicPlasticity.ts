export type EnvironmentKind =
  | 'hostile'
  | 'benign'
  | 'resource-scarce'
  | 'resource-rich'
  | 'stealth'
  | 'diagnostic';

export interface Environment {
  kind: EnvironmentKind;
  signalStrength: number;
  detectedAt: number;
  cues: Record<string, unknown>;
}

export interface PhenotypeConfig {
  name: string;
  triggers: EnvironmentKind[];
  handler: (payload: Record<string, unknown>) => Record<string, unknown>;
  cost: number;
  priors: Partial<Record<EnvironmentKind, number>>;
}

export interface PhenotypeState {
  active: boolean;
  activations: number;
  lastActivatedAt: number | null;
  successRate: number;
  trials: number;
}

export interface AdaptationRecord {
  timestamp: number;
  environment: EnvironmentKind;
  phenotype: string;
  success: boolean;
  confidence: number;
}

export class PhenotypicPlasticity {
  private _phenotypes: Map<string, PhenotypeConfig> = new Map();
  private _states: Map<string, PhenotypeState> = new Map();
  private _currentEnvironment: Environment | null = null;
  private _activePhenotype: string | null = null;
  private _history: AdaptationRecord[] = [];
  private _morphCost = 0;
  private _environmentCounts: Record<EnvironmentKind, number> = {
    hostile: 0, benign: 0, 'resource-scarce': 0, 'resource-rich': 0, stealth: 0, diagnostic: 0,
  };

  registerPhenotype(config: PhenotypeConfig): void {
    this._phenotypes.set(config.name, config);
    this._states.set(config.name, {
      active: false,
      activations: 0,
      lastActivatedAt: null,
      successRate: 0,
      trials: 0,
    });
  }

  detectEnvironment(env: Environment): void {
    this._currentEnvironment = env;
    this._environmentCounts[env.kind]++;
    const posterior = this._computePosterior(env);
    const candidate = this._selectPhenotype(posterior);
    if (candidate && candidate !== this._activePhenotype) {
      const confidence = posterior[candidate] ?? 0;
      this.morphTo(candidate, confidence);
    }
  }

  private _computePosterior(env: Environment): Record<string, number> {
    const posterior: Record<string, number> = {};
    const totalEnv = Object.values(this._environmentCounts).reduce((a, b) => a + b, 0) || 1;
    
    for (const [name, config] of this._phenotypes) {
      let likelihood = 0;
      for (const trigger of config.triggers) {
        const prior = config.priors[trigger] ?? 0.2;
        const baseRate = this._environmentCounts[trigger] / totalEnv;
        const cueMatch = this._matchCues(config, env.cues);
        likelihood += prior * baseRate * (0.5 + 0.5 * cueMatch);
      }
      posterior[name] = likelihood;
    }
    
    const sum = Object.values(posterior).reduce((a, b) => a + b, 0) || 1;
    for (const name of Object.keys(posterior)) {
      posterior[name] /= sum;
    }
    return posterior;
  }

  private _matchCues(config: PhenotypeConfig, cues: Record<string, unknown>): number {
    if (Object.keys(cues).length === 0) return 0.5;
    let matches = 0;
    for (const trigger of config.triggers) {
      const triggerKey = trigger.replace('-', '_');
      if (cues[triggerKey] !== undefined) matches++;
    }
    return matches / config.triggers.length;
  }

  private _selectPhenotype(posterior: Record<string, number>): string | null {
    let bestName: string | null = null;
    let bestScore = -Infinity;
    
    for (const [name, prob] of Object.entries(posterior)) {
      const state = this._states.get(name);
      const adjusted = prob * (0.7 + 0.3 * (state?.successRate ?? 0.5));
      if (adjusted > bestScore) {
        bestScore = adjusted;
        bestName = name;
      }
    }
    return bestName;
  }

  activatePhenotype(name: string, payload: Record<string, unknown> = {}): Record<string, unknown> {
    const config = this._phenotypes.get(name);
    const state = this._states.get(name);
    if (!config || !state) throw new Error(`Unknown phenotype: ${name}`);

    this._deactivateAll();
    state.active = true;
    state.activations++;
    state.lastActivatedAt = Date.now();
    this._activePhenotype = name;
    this._morphCost += config.cost;

    return config.handler(payload);
  }

  morphTo(name: string, confidence: number = 0): boolean {
    if (!this._phenotypes.has(name)) return false;
    this.activatePhenotype(name);
    this._history.push({
      timestamp: Date.now(),
      environment: this._currentEnvironment?.kind ?? 'benign',
      phenotype: name,
      success: true,
      confidence,
    });
    return true;
  }

  recordOutcome(phenotypeName: string, success: boolean): void {
    const state = this._states.get(phenotypeName);
    if (!state) return;
    state.trials++;
    state.successRate = ((state.successRate * (state.trials - 1)) + (success ? 1 : 0)) / state.trials;
  }

  private _deactivateAll(): void {
    for (const state of this._states.values()) state.active = false;
    this._activePhenotype = null;
  }

  getCurrentPhenotype(): string | null {
    return this._activePhenotype;
  }

  getCurrentEnvironment(): Environment | null {
    return this._currentEnvironment;
  }

  listPhenotypes(): string[] {
    return Array.from(this._phenotypes.keys());
  }

  getAdaptationHistory(): AdaptationRecord[] {
    return [...this._history];
  }

  getPhenotypeConfidence(name: string): number {
    if (!this._currentEnvironment) return 0;
    const posterior = this._computePosterior(this._currentEnvironment);
    return posterior[name] ?? 0;
  }

  get totalMorphCost(): number {
    return this._morphCost;
  }

  get phenotypeCount(): number {
    return this._phenotypes.size;
  }

  get adaptationSuccessRate(): number {
    if (this._history.length === 0) return 0;
    return this._history.filter(h => h.success).length / this._history.length;
  }
}
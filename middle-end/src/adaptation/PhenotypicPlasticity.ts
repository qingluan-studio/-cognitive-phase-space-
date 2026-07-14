/**
 * 表型可塑性模块：同一套核心代码根据所处环境信号呈现不同的处理形态，
 * 在不修改底层逻辑的前提下，通过激活/抑制表型实现运行时形态切换。
 */

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
}

export interface PhenotypeState {
  active: boolean;
  activations: number;
  lastActivatedAt: number | null;
}

export interface AdaptationRecord {
  timestamp: number;
  environment: EnvironmentKind;
  phenotype: string;
  success: boolean;
}

export class PhenotypicPlasticity {
  private _phenotypes: Map<string, PhenotypeConfig> = new Map();
  private _states: Map<string, PhenotypeState> = new Map();
  private _currentEnvironment: Environment | null = null;
  private _activePhenotype: string | null = null;
  private _history: AdaptationRecord[] = [];
  private _morphCost = 0;

  registerPhenotype(config: PhenotypeConfig): void {
    this._phenotypes.set(config.name, config);
    this._states.set(config.name, {
      active: false,
      activations: 0,
      lastActivatedAt: null,
    });
  }

  detectEnvironment(env: Environment): void {
    this._currentEnvironment = env;
    const candidate = this._pickPhenotype(env.kind);
    if (candidate && candidate !== this._activePhenotype) {
      this.morphTo(candidate);
    }
  }

  private _pickPhenotype(kind: EnvironmentKind): string | null {
    for (const [name, config] of this._phenotypes) {
      if (config.triggers.includes(kind)) return name;
    }
    return null;
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

  morphTo(name: string): boolean {
    if (!this._phenotypes.has(name)) return false;
    this.activatePhenotype(name);
    this._history.push({
      timestamp: Date.now(),
      environment: this._currentEnvironment?.kind ?? 'benign',
      phenotype: name,
      success: true,
    });
    return true;
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

  get totalMorphCost(): number {
    return this._morphCost;
  }

  get phenotypeCount(): number {
    return this._phenotypes.size;
  }
}

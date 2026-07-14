export interface FieldInteraction {
  source: string;
  target: string;
  strength: number;
  range: number;
}

export type InteractionResult = {
  force: number;
  coupled: boolean;
  distance: number;
};

export interface ActionConfig {
  couplingConstant: number;
  maxRange: number;
  attenuation: number;
}

export class ActionAtDistance {
  private _config: ActionConfig;
  private _interactions: FieldInteraction[] = [];
  private _log: Record<string, unknown> = {};
  private _adjacencyMatrix: Map<string, Map<string, number>> = new Map();
  private _propagator: number[] = [];
  private _kineticEnergy: number = 0;

  constructor(config: ActionConfig) {
    this._config = config;
    this._initPropagator();
  }

  get interactionCount(): number {
    return this._interactions.length;
  }

  get kineticEnergy(): number {
    return this._kineticEnergy;
  }

  get propagatorPeak(): number {
    return this._propagator.length > 0 ? Math.max(...this._propagator) : 0;
  }

  private _initPropagator(): void {
    this._propagator = [];
    for (let r = 0; r < 10; r++) {
      const range = r + 1;
      this._propagator.push(this._config.couplingConstant / (range * range + 0.001));
    }
  }

  private _updateAdjacency(): void {
    this._adjacencyMatrix.clear();
    for (const inter of this._interactions) {
      if (!this._adjacencyMatrix.has(inter.source)) {
        this._adjacencyMatrix.set(inter.source, new Map());
      }
      this._adjacencyMatrix.get(inter.source)!.set(inter.target, inter.strength);
    }
  }

  private _computeGraphCentrality(entity: string): number {
    let sum = 0;
    const neighbors = this._adjacencyMatrix.get(entity);
    if (!neighbors) return 0;
    for (const [, strength] of neighbors) {
      sum += strength;
    }
    return sum;
  }

  register(source: string, target: string, strength: number, range: number): void {
    this._interactions.push({ source, target, strength, range });
    if (this._interactions.length > 50) {
      this._interactions.shift();
    }
    this._updateAdjacency();
  }

  computeForce(source: string, target: string): InteractionResult {
    const pair = this._interactions.find(
      (i) => i.source === source && i.target === target
    );
    if (!pair) {
      return { force: 0, coupled: false, distance: Infinity };
    }
    const distance = Math.max(1, pair.range);
    const attenuation = Math.exp(-distance * this._config.attenuation);
    const centrality = this._computeGraphCentrality(source);
    const force = (this._config.couplingConstant * pair.strength * attenuation * centrality) / (distance * distance);
    const coupled = force > 0.001;
    this._kineticEnergy += force * distance;
    return { force, coupled, distance };
  }

  broadcast(source: string, signal: number): Record<string, number> {
    const results: Record<string, number> = {};
    for (const inter of this._interactions) {
      if (inter.source === source) {
        const distance = Math.max(1, inter.range);
        const attenuation = Math.exp(-distance * this._config.attenuation);
        results[inter.target] = signal * attenuation * inter.strength;
      }
    }
    this._log.lastBroadcast = { source, signal, targets: Object.keys(results).length };
    return results;
  }

  weaken(source: string, factor: number): void {
    for (const inter of this._interactions) {
      if (inter.source === source) {
        inter.strength *= factor;
      }
    }
    this._updateAdjacency();
  }

  strengthen(source: string, factor: number): void {
    this.weaken(source, 1 + factor);
  }

  strongestCoupling(): FieldInteraction | null {
    if (this._interactions.length === 0) return null;
    return this._interactions.reduce((best, i) => (i.strength > best.strength ? i : best));
  }

  totalCoupling(): number {
    return this._interactions.reduce((acc, i) => acc + i.strength, 0);
  }

  computeNetworkDiameter(): number {
    let max = 0;
    for (const inter of this._interactions) {
      if (inter.range > max) max = inter.range;
    }
    return max;
  }

  reset(): void {
    this._interactions = [];
    this._adjacencyMatrix.clear();
    this._kineticEnergy = 0;
  }

  report(): Record<string, unknown> {
    return {
      interactions: this._interactions.length,
      kineticEnergy: this._kineticEnergy,
      log: this._log,
      propagatorPeak: this.propagatorPeak.toFixed(4),
      networkDiameter: this.computeNetworkDiameter(),
    };
  }
}

export interface PlateauState {
  id: string;
  elevation: number;
  energy: number;
  connections: string[];
  visited: boolean;
  localMinimum: boolean;
  globalMinimum: boolean;
  saddlePoint: boolean;
  partitionFunction: number;
  barrierHeight: number;
}

export interface HopResult {
  from: string;
  to: string;
  energyChange: number;
  temperature: number;
  probability: number;
  boltzmannFactor: number;
  accepted: boolean;
}

export interface PlateauConfig {
  temperature: number;
  coolingRate: number;
  threshold: number;
}

export class PlateauHopper {
  private _config: PlateauConfig;
  private _states: Map<string, PlateauState> = new Map();
  private _currentStateId: string = '';
  private _hopHistory: HopResult[] = [];
  private _meta: Record<string, unknown> = {};
  private _totalEnergy: number = 0;
  private _transitionMatrix: Map<string, Map<string, number>> = new Map();
  private _barrierMatrix: Map<string, Map<string, number>> = new Map();
  private _markovChain: Map<string, number[]> = new Map();
  private _equilibriumDistribution: Map<string, number> = new Map();

  constructor(config: PlateauConfig) {
    this._config = { ...config };
  }

  get stateCount(): number {
    return this._states.size;
  }

  get currentStateId(): string {
    return this._currentStateId;
  }

  get temperature(): number {
    return this._config.temperature;
  }

  addState(id: string, elevation: number): PlateauState {
    const state: PlateauState = {
      id,
      elevation,
      energy: elevation,
      connections: [],
      visited: false,
      localMinimum: false,
      globalMinimum: false,
      saddlePoint: false,
      partitionFunction: 0,
      barrierHeight: 0,
    };
    this._states.set(id, state);
    this._transitionMatrix.set(id, new Map());
    this._barrierMatrix.set(id, new Map());
    this._markovChain.set(id, []);
    if (this._currentStateId === '') {
      this._currentStateId = id;
      state.visited = true;
    }
    return state;
  }

  connectStates(a: string, b: string, weight: number = 1): void {
    const stateA = this._states.get(a);
    const stateB = this._states.get(b);
    if (!stateA || !stateB) return;
    stateA.connections.push(b);
    stateB.connections.push(a);
    this._transitionMatrix.get(a)!.set(b, weight);
    this._transitionMatrix.get(b)!.set(a, weight);
    const barrier = Math.abs(stateA.elevation - stateB.elevation) / 2;
    this._barrierMatrix.get(a)!.set(b, barrier);
    this._barrierMatrix.get(b)!.set(a, barrier);
  }

  hop(targetId: string): HopResult | null {
    const current = this._states.get(this._currentStateId);
    const target = this._states.get(targetId);
    if (!current || !target) return null;
    const energyChange = target.energy - current.energy;
    const boltzmannFactor = Math.exp(-energyChange / (this._config.temperature || 1));
    const weight = this._transitionMatrix.get(this._currentStateId)?.get(targetId) ?? 1;
    const probability = weight * boltzmannFactor;
    const accepted = Math.random() < probability || energyChange < 0;
    const result: HopResult = {
      from: this._currentStateId,
      to: targetId,
      energyChange,
      temperature: this._config.temperature,
      probability,
      boltzmannFactor,
      accepted,
    };
    this._hopHistory.push(result);
    if (this._hopHistory.length > 100) this._hopHistory.shift();
    if (accepted) {
      this._currentStateId = targetId;
      target.visited = true;
      this._totalEnergy += energyChange;
    }
    this._cool();
    return result;
  }

  private _cool(): void {
    this._config.temperature *= this._config.coolingRate;
    if (this._config.temperature < this._config.threshold) {
      this._config.temperature = this._config.threshold;
    }
  }

  findLocalMinima(): PlateauState[] {
    const minima: PlateauState[] = [];
    for (const state of this._states.values()) {
      const neighborElevations = state.connections.map((id) => this._states.get(id)!.elevation);
      state.localMinimum = neighborElevations.every((e) => e >= state.elevation);
      if (state.localMinimum) minima.push(state);
    }
    return minima;
  }

  findGlobalMinimum(): PlateauState | null {
    const states = Array.from(this._states.values());
    if (states.length === 0) return null;
    const min = states.reduce((best, s) => (s.elevation < best.elevation ? s : best));
    for (const s of states) s.globalMinimum = s.id === min.id;
    return min;
  }

  findSaddlePoints(): PlateauState[] {
    const saddles: PlateauState[] = [];
    for (const state of this._states.values()) {
      if (state.connections.length < 2) continue;
      const elevations = state.connections.map((id) => this._states.get(id)!.elevation);
      const higher = elevations.filter((e) => e > state.elevation).length;
      const lower = elevations.filter((e) => e < state.elevation).length;
      state.saddlePoint = higher > 0 && lower > 0;
      if (state.saddlePoint) saddles.push(state);
    }
    return saddles;
  }

  computePartitionFunction(): number {
    let z = 0;
    for (const state of this._states.values()) {
      state.partitionFunction = Math.exp(-state.energy / (this._config.temperature || 1));
      z += state.partitionFunction;
    }
    return z;
  }

  barrierHeight(from: string, to: string): number {
    return this._barrierMatrix.get(from)?.get(to) ?? 0;
  }

  hopReport(): Record<string, unknown> {
    return {
      states: this._states.size,
      currentState: this._currentStateId,
      totalEnergy: this._totalEnergy,
      hopCount: this._hopHistory.length,
      temperature: this._config.temperature,
      localMinima: this.findLocalMinima().length,
      globalMinimum: this.findGlobalMinimum()?.id,
      saddlePoints: this.findSaddlePoints().length,
      partitionFunction: this.computePartitionFunction(),
      equilibrium: Object.fromEntries(this._equilibriumDistribution),
      meta: this._meta,
    };
  }
}

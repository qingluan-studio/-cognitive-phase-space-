export type EntropyPhase = 'growth' | 'equilibrium' | 'saturation' | 'death' | 'fluctuation';

export interface EntropyState {
  totalEntropy: number;
  entropyRate: number;
  phase: EntropyPhase;
  reversibility: number;
  arrowDirection: number;
  fluctuationAmplitude: number;
  timestamp: number;
}

export interface IrreversibleAction {
  id: string;
  description: string;
  entropyCost: number;
  committedAt: number;
  cannotUndo: boolean;
  branchingFactor: number;
  dissipativeCoating: number;
}

export interface HeatDeathPrediction {
  timeToDeath: number;
  maxEntropy: number;
  currentProgress: number;
  confidence: number;
  temperatureAtDeath: number;
  orderParameter: number;
}

interface PoincareCycle {
  recurrenceTime: number;
  microstates: number;
  isApproximate: boolean;
}

interface FluctuationTheorem {
  entropyProd: number;
  negativeProb: number;
  positiveProb: number;
  ratio: number;
  symmetry: number;
}

export class ThermodynamicArrow {
  private _totalEntropy = 0;
  private _entropyRate = 0;
  private _entropyHistory: EntropyState[] = [];
  private _actions: Map<string, IrreversibleAction> = new Map();
  private _phase: EntropyPhase = 'growth';
  private _ticker = 0;
  private _counter = 0;
  private _bekensteinBound = 1e120;
  private _boltzmannK = 1.380649e-23;
  private _reversibility = 0.1;
  private _bornEntropy = 0.001;
  private _fluctuations: FluctuationTheorem[] = [];
  private _arrowIntegrity = 1.0;
  private _maxwellDemonPresent = false;
  private _poincareCycle: PoincareCycle;
  private _dissipativeStructures: Map<string, { entropyGradient: number; selfOrganization: number }> = new Map();

  get totalEntropy(): number { return this._totalEntropy; }
  get entropyRate(): number { return this._entropyRate; }
  get phase(): EntropyPhase { return this._phase; }
  get arrowIntegrity(): number { return this._arrowIntegrity; }
  get isHeatDeath(): boolean {
    return this._totalEntropy >= this._bekensteinBound * 0.999;
  }

  constructor(initialEntropy: number = 0) {
    this._totalEntropy = initialEntropy || this._bornEntropy;
    this._poincareCycle = {
      recurrenceTime: Math.exp(this._totalEntropy),
      microstates: Math.floor(Math.exp(this._totalEntropy)),
      isApproximate: true,
    };
  }

  tick(deltaT: number = 1): EntropyState {
    this._ticker++;
    const prevEntropy = this._totalEntropy;
    const baseGrowth = this._totalEntropy * 0.01 * deltaT;
    const phaseFactor = this._phaseGrowthFactor();
    const fluctuation = this._entropyFluctuation();
    const demonDrain = this._maxwellDemonEntropyDrain();
    const deltaS = (baseGrowth * phaseFactor) + fluctuation - demonDrain;
    this._totalEntropy = Math.max(0, this._totalEntropy + deltaS);
    this._entropyRate = (this._totalEntropy - prevEntropy) / Math.max(0.001, deltaT);
    this._reversibility = Math.max(0, this._reversibility - 0.001 * this._entropyRate * deltaT);
    this._updatePhase();
    this._poincareCycle.recurrenceTime = Math.exp(this._totalEntropy);
    this._poincareCycle.microstates = Math.floor(Math.exp(this._totalEntropy));
    if (this._ticker % 20 === 0) {
      this._recordFluctuation(deltaS);
    }
    const state: EntropyState = {
      totalEntropy: this._totalEntropy,
      entropyRate: this._entropyRate,
      phase: this._phase,
      reversibility: this._reversibility,
      arrowDirection: this._arrowIntegrity,
      fluctuationAmplitude: Math.abs(fluctuation),
      timestamp: Date.now(),
    };
    this._entropyHistory.push(state);
    if (this._entropyHistory.length > 500) this._entropyHistory.shift();
    return state;
  }

  commitIrreversibleAction(description: string, entropyCost: number): IrreversibleAction {
    const id = `irrev-${++this._counter}-${Date.now().toString(36)}`;
    const action: IrreversibleAction = {
      id, description, entropyCost,
      committedAt: Date.now(),
      cannotUndo: entropyCost > this._reversibility * this._totalEntropy,
      branchingFactor: Math.exp(entropyCost * 0.1),
      dissipativeCoating: entropyCost * this._totalEntropy * 0.01,
    };
    this._actions.set(id, action);
    this._totalEntropy += entropyCost;
    if (action.cannotUndo) {
      this._arrowIntegrity = Math.min(1, this._arrowIntegrity + 0.01);
    }
    return action;
  }

  attemptReversal(actionId: string): boolean {
    const action = this._actions.get(actionId);
    if (!action) return false;
    if (action.cannotUndo) return false;
    const reversalCost = action.entropyCost * (1 + this._totalEntropy * 0.01);
    const success = Math.random() < this._reversibility;
    if (success) {
      this._totalEntropy = Math.max(0, this._totalEntropy - action.entropyCost);
      this._actions.delete(actionId);
      this._reversibility *= 1.01;
    }
    return success;
  }

  predictHeatDeath(): HeatDeathPrediction {
    const remaining = this._bekensteinBound - this._totalEntropy;
    const timeToDeath = this._entropyRate > 0 ? remaining / this._entropyRate : Infinity;
    return {
      timeToDeath: isFinite(timeToDeath) ? timeToDeath : 1e12,
      maxEntropy: this._bekensteinBound,
      currentProgress: this._totalEntropy / this._bekensteinBound,
      confidence: 1 - this._reversibility,
      temperatureAtDeath: 1 / (this._boltzmannK * this._bekensteinBound),
      orderParameter: 1 - this._totalEntropy / this._bekensteinBound,
    };
  }

  getSecondLawDeviation(): number {
    const negativeCount = this._fluctuations.filter(f => f.entropyProd < 0).length;
    return negativeCount / Math.max(1, this._fluctuations.length);
  }

  poincareRecurrenceTime(): number {
    return this._poincareCycle.recurrenceTime;
  }

  installMaxwellDemon(position: string, sortingEfficiency: number): void {
    this._maxwellDemonPresent = true;
    this._dissipativeStructures.set(position, {
      entropyGradient: sortingEfficiency,
      selfOrganization: 1 - sortingEfficiency,
    });
  }

  removeMaxwellDemon(position: string): void {
    this._dissipativeStructures.delete(position);
    if (this._dissipativeStructures.size === 0) this._maxwellDemonPresent = false;
  }

  getEntropyHistory(): EntropyState[] { return [...this._entropyHistory]; }
  getActions(): IrreversibleAction[] { return Array.from(this._actions.values()); }

  private _phaseGrowthFactor(): number {
    switch (this._phase) {
      case 'growth': return 1.5;
      case 'equilibrium': return 0.5;
      case 'saturation': return 0.1;
      case 'death': return 0.01;
      case 'fluctuation': return 0.3 + 0.7 * Math.sin(this._ticker * 0.1);
    }
  }

  private _entropyFluctuation(): number {
    const scale = Math.sqrt(2 * this._boltzmannK * this._totalEntropy) * 0.01;
    return (Math.random() - 0.5) * 2 * scale;
  }

  private _maxwellDemonEntropyDrain(): number {
    if (!this._maxwellDemonPresent) return 0;
    let drain = 0;
    for (const [_, ds] of this._dissipativeStructures) {
      drain += ds.entropyGradient * this._totalEntropy * 0.001;
    }
    return drain;
  }

  private _updatePhase(): void {
    const progress = this._totalEntropy / this._bekensteinBound;
    if (progress > 0.95) this._phase = 'death';
    else if (progress > 0.8) this._phase = 'saturation';
    else if (progress > 0.5) this._phase = 'equilibrium';
    else if (Math.random() < 0.05) this._phase = 'fluctuation';
    else this._phase = 'growth';
  }

  private _recordFluctuation(deltaS: number): void {
    const negProb = Math.exp(-Math.abs(deltaS));
    const posProb = 1 - negProb;
    const theorem: FluctuationTheorem = {
      entropyProd: deltaS,
      negativeProb: negProb,
      positiveProb: posProb,
      ratio: negProb / Math.max(1e-15, posProb),
      symmetry: negProb / posProb,
    };
    this._fluctuations.push(theorem);
    if (this._fluctuations.length > 100) this._fluctuations.shift();
  }
}

export interface ContractPayoff {
  cooperate: number;
  defect: number;
}

export interface ContractStrategy {
  playerId: string;
  cooperateProbability: number;
  reciprocity: number;
  memoryLength: number;
}

export interface ContractOutcome {
  round: number;
  playerA: string;
  playerB: string;
  actionA: boolean;
  actionB: boolean;
  payoffA: number;
  payoffB: number;
  cumulativeA: number;
  cumulativeB: number;
}

export class MutualismContract {
  private _payoffs: Map<string, ContractPayoff> = new Map();
  private _strategies: Map<string, ContractStrategy> = new Map();
  private _history: ContractOutcome[] = [];
  private _state: Record<string, unknown> = {};
  private _ESS: Map<string, number> = new Map();
  private _reciprocityMatrix: Map<string, Map<string, number>> = new Map();

  constructor() {}

  get playerCount(): number {
    return this._strategies.size;
  }

  get roundCount(): number {
    return this._history.length;
  }

  setPayoff(playerId: string, cooperate: number, defect: number): void {
    this._payoffs.set(playerId, { cooperate, defect });
  }

  registerStrategy(playerId: string, cooperateProbability: number, reciprocity: number, memoryLength: number): void {
    this._strategies.set(playerId, { playerId, cooperateProbability, reciprocity, memoryLength });
    this._reciprocityMatrix.set(playerId, new Map());
  }

  playRound(playerA: string, playerB: string): ContractOutcome | null {
    const strategyA = this._strategies.get(playerA);
    const strategyB = this._strategies.get(playerB);
    const payoffA = this._payoffs.get(playerA);
    const payoffB = this._payoffs.get(playerB);
    if (!strategyA || !strategyB || !payoffA || !payoffB) return null;
    const actionA = Math.random() < strategyA.cooperateProbability;
    const actionB = Math.random() < strategyB.cooperateProbability;
    let pA = 0;
    let pB = 0;
    if (actionA && actionB) {
      pA = payoffA.cooperate;
      pB = payoffB.cooperate;
    } else if (actionA && !actionB) {
      pA = 0;
      pB = payoffB.defect;
    } else if (!actionA && actionB) {
      pA = payoffA.defect;
      pB = 0;
    } else {
      pA = payoffA.defect * 0.5;
      pB = payoffB.defect * 0.5;
    }
    const prev = this._history.filter((h) => h.playerA === playerA && h.playerB === playerB);
    const cumA = prev.length > 0 ? prev[prev.length - 1].cumulativeA + pA : pA;
    const cumB = prev.length > 0 ? prev[prev.length - 1].cumulativeB + pB : pB;
    const outcome: ContractOutcome = {
      round: this._history.length + 1,
      playerA,
      playerB,
      actionA,
      actionB,
      payoffA: pA,
      payoffB: pB,
      cumulativeA: cumA,
      cumulativeB: cumB,
    };
    this._history.push(outcome);
    this._updateReciprocity(playerA, playerB, actionA, actionB);
    return outcome;
  }

  private _updateReciprocity(a: string, b: string, actionA: boolean, actionB: boolean): void {
    const matrixA = this._reciprocityMatrix.get(a)!;
    const current = matrixA.get(b) ?? 0;
    const delta = actionA && actionB ? 0.1 : -0.1;
    matrixA.set(b, Math.max(-1, Math.min(1, current + delta)));
  }

  nashEquilibrium(playerA: string, playerB: string): { aCoop: number; bCoop: number } | null {
    const payoffA = this._payoffs.get(playerA);
    const payoffB = this._payoffs.get(playerB);
    if (!payoffA || !payoffB) return null;
    const r = payoffA.cooperate;
    const s = 0;
    const t = payoffA.defect;
    const p = payoffA.defect * 0.5;
    const denom = r - s - t + p;
    const pA = denom !== 0 ? (p - s) / denom : 0.5;
    const pB = denom !== 0 ? (p - s) / denom : 0.5;
    return { aCoop: Math.max(0, Math.min(1, pA)), bCoop: Math.max(0, Math.min(1, pB)) };
  }

  evolutionaryStableStrategy(playerId: string): boolean {
    const strategy = this._strategies.get(playerId);
    if (!strategy) return false;
    const payoff = this._payoffs.get(playerId);
    if (!payoff) return false;
    const benefit = payoff.cooperate;
    const cost = payoff.cooperate - payoff.defect;
    const ess = benefit > cost;
    this._ESS.set(playerId, ess ? 1 : 0);
    return ess;
  }

  averagePayoff(playerId: string): number {
    const relevant = this._history.filter((h) => h.playerA === playerId || h.playerB === playerId);
    if (relevant.length === 0) return 0;
    return relevant.reduce((s, h) => s + (h.playerA === playerId ? h.payoffA : h.payoffB), 0) / relevant.length;
  }

  cooperationRate(): number {
    if (this._history.length === 0) return 0;
    const coopA = this._history.filter((h) => h.actionA).length;
    const coopB = this._history.filter((h) => h.actionB).length;
    return (coopA + coopB) / (this._history.length * 2);
  }

  reciprocityScore(a: string, b: string): number {
    return this._reciprocityMatrix.get(a)?.get(b) ?? 0;
  }

  report(): Record<string, unknown> {
    return {
      players: this._strategies.size,
      rounds: this._history.length,
      cooperationRate: this.cooperationRate(),
      essCount: Array.from(this._ESS.values()).filter(Boolean).length,
      state: this._state,
    };
  }
}

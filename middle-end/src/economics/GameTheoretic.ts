import { DataPacket, ParadoxResult } from '../shared/types';

export type GameStrategy = string;

export interface PayoffMatrix {
  players: number;
  strategies: GameStrategy[][];
  payoffs: number[][][];
}

export interface NashEquilibrium {
  strategyProfile: number[];
  isPure: boolean;
  payoffs: number[];
  deviationBenefit: number[];
}

export interface ParetoResult {
  optima: number[][];
  dominated: number[][];
  paretoFrontierSize: number;
}

export interface EvolutionaryState {
  population: number[];
  fitness: number[];
  averageFitness: number;
  generation: number;
}

export class GameTheoretic {
  private _payoffMatrix: PayoffMatrix | null;
  private _nashEquilibria: NashEquilibrium[];
  private _evolutionaryState: EvolutionaryState | null;
  private _mutationRate: number;
  private _selectionPressure: number;
  private _history: EvolutionaryState[];

  constructor() {
    this._payoffMatrix = null;
    this._nashEquilibria = [];
    this._evolutionaryState = null;
    this._mutationRate = 0.01;
    this._selectionPressure = 1.0;
    this._history = [];
  }

  get hasGame(): boolean { return this._payoffMatrix !== null; }
  get nashEquilibria(): NashEquilibrium[] { return [...this._nashEquilibria]; }
  get mutationRate(): number { return this._mutationRate; }
  get selectionPressure(): number { return this._selectionPressure; }

  public setMutationRate(rate: number): void {
    this._mutationRate = Math.max(0, Math.min(1, rate));
  }

  public setSelectionPressure(pressure: number): void {
    this._selectionPressure = Math.max(0, pressure);
  }

  public define2x2Game(
    strategyA1: string,
    strategyA2: string,
    strategyB1: string,
    strategyB2: string,
    payoffAA: [number, number],
    payoffAB: [number, number],
    payoffBA: [number, number],
    payoffBB: [number, number]
  ): void {
    this._payoffMatrix = {
      players: 2,
      strategies: [[strategyA1, strategyA2], [strategyB1, strategyB2]],
      payoffs: [
        [[payoffAA[0], payoffAA[1]], [payoffAB[0], payoffAB[1]]],
        [[payoffBA[0], payoffBA[1]], [payoffBB[0], payoffBB[1]]]
      ]
    };
    this._nashEquilibria = [];
  }

  public definePrisonersDilemma(): void {
    this.define2x2Game(
      'Cooperate', 'Defect',
      'Cooperate', 'Defect',
      [3, 3], [0, 5],
      [5, 0], [1, 1]
    );
  }

  public defineStagHunt(): void {
    this.define2x2Game(
      'Stag', 'Hare',
      'Stag', 'Hare',
      [4, 4], [0, 2],
      [2, 0], [2, 2]
    );
  }

  public defineChickenGame(): void {
    this.define2x2Game(
      'Swerve', 'Straight',
      'Swerve', 'Straight',
      [3, 3], [2, 5],
      [5, 2], [0, 0]
    );
  }

  public getPayoff(playerStrategies: number[]): number[] {
    if (!this._payoffMatrix) return [];
    return this._payoffMatrix.payoffs[playerStrategies[0]][playerStrategies[1]];
  }

  public findPureNashEquilibria(): NashEquilibrium[] {
    if (!this._payoffMatrix) return [];
    const equilibria: NashEquilibrium[] = [];
    const [s1, s2] = this._payoffMatrix.strategies;

    for (let i = 0; i < s1.length; i++) {
      for (let j = 0; j < s2.length; j++) {
        const payoffs = this._payoffMatrix.payoffs[i][j];
        let isNash = true;

        for (let i2 = 0; i2 < s1.length; i2++) {
          if (i2 !== i && this._payoffMatrix.payoffs[i2][j][0] > payoffs[0]) {
            isNash = false;
            break;
          }
        }
        if (!isNash) continue;

        for (let j2 = 0; j2 < s2.length; j2++) {
          if (j2 !== j && this._payoffMatrix.payoffs[i][j2][1] > payoffs[1]) {
            isNash = false;
            break;
          }
        }

        if (isNash) {
          equilibria.push({
            strategyProfile: [i, j],
            isPure: true,
            payoffs: [...payoffs],
            deviationBenefit: [0, 0]
          });
        }
      }
    }

    this._nashEquilibria = equilibria;
    return equilibria;
  }

  public findMixedNashEquilibrium2x2(): NashEquilibrium | null {
    if (!this._payoffMatrix) return null;
    const p = this._payoffMatrix.payoffs;

    const a = p[0][0][0];
    const b = p[0][1][0];
    const c = p[1][0][0];
    const d = p[1][1][0];

    const A = p[0][0][1];
    const B = p[1][0][1];
    const C = p[0][1][1];
    const D = p[1][1][1];

    const denom1 = a - b - c + d;
    const denom2 = A - B - C + D;

    if (Math.abs(denom1) < 1e-10 || Math.abs(denom2) < 1e-10) return null;

    const q = (d - b) / denom1;
    const p2 = (D - B) / denom2;

    if (q < 0 || q > 1 || p2 < 0 || p2 > 1) return null;

    const payoff1 = q * p2 * a + q * (1 - p2) * b + (1 - q) * p2 * c + (1 - q) * (1 - p2) * d;
    const payoff2 = q * p2 * A + (1 - q) * p2 * B + q * (1 - p2) * C + (1 - q) * (1 - p2) * D;

    return {
      strategyProfile: [q, p2],
      isPure: false,
      payoffs: [payoff1, payoff2],
      deviationBenefit: [0, 0]
    };
  }

  public findAllNashEquilibria(): NashEquilibrium[] {
    const pure = this.findPureNashEquilibria();
    const mixed = this.findMixedNashEquilibrium2x2();
    const all = [...pure];
    if (mixed) all.push(mixed);
    this._nashEquilibria = all;
    return all;
  }

  public findParetoOptima(): ParetoResult {
    if (!this._payoffMatrix) {
      return { optima: [], dominated: [], paretoFrontierSize: 0 };
    }

    const [s1, s2] = this._payoffMatrix.strategies;
    const allProfiles: number[][] = [];
    const allPayoffs: number[][] = [];

    for (let i = 0; i < s1.length; i++) {
      for (let j = 0; j < s2.length; j++) {
        allProfiles.push([i, j]);
        allPayoffs.push([...this._payoffMatrix.payoffs[i][j]]);
      }
    }

    const optima: number[][] = [];
    const dominated: number[][] = [];

    for (let i = 0; i < allPayoffs.length; i++) {
      let isDominated = false;
      for (let j = 0; j < allPayoffs.length; j++) {
        if (i === j) continue;
        const dominates = allPayoffs[j][0] >= allPayoffs[i][0] && allPayoffs[j][1] >= allPayoffs[i][1];
        const strictlyDominates = allPayoffs[j][0] > allPayoffs[i][0] || allPayoffs[j][1] > allPayoffs[i][1];
        if (dominates && strictlyDominates) {
          isDominated = true;
          break;
        }
      }
      if (isDominated) {
        dominated.push(allProfiles[i]);
      } else {
        optima.push(allProfiles[i]);
      }
    }

    return { optima, dominated, paretoFrontierSize: optima.length };
  }

  public initializeEvolutionary(strategies: number, initialPopulation?: number[]): EvolutionaryState {
    if (!initialPopulation) {
      initialPopulation = new Array(strategies).fill(1 / strategies);
    }
    const total = initialPopulation.reduce((a, b) => a + b, 0);
    const normalized = initialPopulation.map(x => x / total);

    this._evolutionaryState = {
      population: normalized,
      fitness: new Array(strategies).fill(1),
      averageFitness: 1,
      generation: 0
    };
    this._history = [{ ...this._evolutionaryState }];
    return { ...this._evolutionaryState };
  }

  public evolutionaryStep(): EvolutionaryState {
    if (!this._evolutionaryState || !this._payoffMatrix) {
      throw new Error('Must initialize game and population first');
    }

    const pop = this._evolutionaryState.population;
    const strategies = pop.length;
    const fitness: number[] = new Array(strategies).fill(0);

    for (let i = 0; i < strategies; i++) {
      for (let j = 0; j < strategies; j++) {
        if (i < this._payoffMatrix.payoffs.length && j < this._payoffMatrix.payoffs[i].length) {
          fitness[i] += pop[j] * this._payoffMatrix.payoffs[i][j][0];
        }
      }
    }

    const avgFitness = fitness.reduce((a, b, i) => a + b * pop[i], 0);
    if (avgFitness === 0) return { ...this._evolutionaryState };

    const newPop = pop.map((p, i) => p * (1 + this._selectionPressure * (fitness[i] - avgFitness)));

    for (let i = 0; i < newPop.length; i++) {
      newPop[i] = (1 - this._mutationRate) * newPop[i] + this._mutationRate / newPop.length;
    }

    const total = newPop.reduce((a, b) => a + b, 0);
    const normalized = newPop.map(x => Math.max(0, x / total));

    const nextState: EvolutionaryState = {
      population: normalized,
      fitness,
      averageFitness: avgFitness,
      generation: this._evolutionaryState.generation + 1
    };

    this._evolutionaryState = nextState;
    this._history.push({ ...nextState, population: [...nextState.population], fitness: [...nextState.fitness] });
    return nextState;
  }

  public evolve(generations: number): EvolutionaryState[] {
    const history: EvolutionaryState[] = [];
    for (let i = 0; i < generations; i++) {
      history.push(this.evolutionaryStep());
    }
    return history;
  }

  public calculateEvolutionaryStableStrategy(): number[] | null {
    if (!this._evolutionaryState || this._history.length < 10) return null;
    const recent = this._history.slice(-10);
    const first = recent[0].population;
    const last = recent[recent.length - 1].population;
    const maxChange = Math.max(...first.map((v, i) => Math.abs(v - last[i])));
    if (maxChange < 0.001) return [...last];
    return null;
  }

  public socialWelfare(equilibrium: NashEquilibrium): number {
    return equilibrium.payoffs.reduce((a, b) => a + b, 0);
  }

  public gameToParadoxResult(): ParadoxResult<NashEquilibrium[]> {
    const equilibria = this.findAllNashEquilibria();
    const pareto = this.findParetoOptima();
    const contradictionEnergy = equilibria.length > 1 ? 1 / equilibria.length : 0;
    return {
      resolved: equilibria.length > 0,
      output: equilibria,
      contradictionEnergy,
      fuelUsed: pareto.paretoFrontierSize
    };
  }

  public strategiesToPacket(): DataPacket<string[]> {
    if (!this._payoffMatrix) {
      return {
        id: 'game-empty',
        payload: [],
        metadata: {
          createdAt: Date.now(),
          route: ['game'],
          priority: 0,
          phase: 'empty'
        }
      };
    }
    return {
      id: `game-strategies-${Date.now()}`,
      payload: this._payoffMatrix.strategies.flat(),
      metadata: {
        createdAt: Date.now(),
        route: ['game', 'strategies'],
        priority: 0.6,
        phase: 'definition'
      }
    };
  }

  public reset(): void {
    this._payoffMatrix = null;
    this._nashEquilibria = [];
    this._evolutionaryState = null;
    this._history = [];
  }

  public getEvolutionaryHistory(): EvolutionaryState[] {
    return this._history.map(h => ({
      ...h,
      population: [...h.population],
      fitness: [...h.fitness]
    }));
  }
}

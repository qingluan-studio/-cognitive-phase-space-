import { DataPacket, ParadoxResult, PacketMeta } from '../shared/types';

export type GameStrategy = string;

export interface PayoffMatrix {
  players: number;
  strategies: GameStrategy[][];
  payoffs: number[][][];
  gameType: 'zero-sum' | 'non-zero-sum' | 'cooperative' | 'non-cooperative';
  information: 'complete' | 'incomplete';
}

export interface NashEquilibrium {
  strategyProfile: number[];
  isPure: boolean;
  payoffs: number[];
  deviationBenefit: number[];
  stability: number;
}

export interface ParetoResult {
  optima: number[][];
  dominated: number[][];
  paretoFrontierSize: number;
  frontierPoints: { x: number; y: number }[];
}

export interface EvolutionaryState {
  population: number[];
  fitness: number[];
  averageFitness: number;
  generation: number;
  strategyFrequencies: Record<string, number>;
}

export interface MixedStrategy {
  playerIndex: number;
  strategyProbabilities: number[];
  expectedPayoff: number;
  support: number[];
}

export interface RepeatedGameResult {
  strategy: string;
  rounds: number;
  totalPayoff: number[];
  averagePayoff: number[];
  cooperationRate: number;
}

export interface BargainingResult {
  split: number[];
  nashBargainingSolution: number[];
  kalaiSmorodinsky: number[];
  threatPoint: number[];
  feasibleSet: number[][];
}

export interface MechanismDesignResult {
  mechanism: string;
  incentiveCompatible: boolean;
  individuallyRational: boolean;
  budgetBalanced: boolean;
  socialChoiceFunction: string;
}

export interface BayesianGameResult {
  typeProfile: number[];
  strategyProfile: number[];
  expectedPayoffs: number[];
  perfectBayesianEquilibrium: boolean;
}

export interface ShapleyValue {
  playerValues: number[];
  totalValue: number;
  marginalContributions: number[][];
  fairnessIndex: number;
}

export interface CoreResult {
  isNonEmpty: boolean;
  coreAllocations: number[][];
  blockingCoalitions: number[][];
  stable: boolean;
}

export class GameTheoretic {
  private _payoffMatrix: PayoffMatrix | null;
  private _nashEquilibria: NashEquilibrium[];
  private _evolutionaryState: EvolutionaryState | null;
  private _mutationRate: number;
  private _selectionPressure: number;
  private _history: EvolutionaryState[];
  private _discountFactor: number;
  private _noiseLevel: number;

  constructor() {
    this._payoffMatrix = null;
    this._nashEquilibria = [];
    this._evolutionaryState = null;
    this._mutationRate = 0.01;
    this._selectionPressure = 1.0;
    this._history = [];
    this._discountFactor = 0.9;
    this._noiseLevel = 0.0;
  }

  get hasGame(): boolean { return this._payoffMatrix !== null; }
  get nashEquilibria(): NashEquilibrium[] { return [...this._nashEquilibria]; }
  get mutationRate(): number { return this._mutationRate; }
  get selectionPressure(): number { return this._selectionPressure; }
  get discountFactor(): number { return this._discountFactor; }
  get noiseLevel(): number { return this._noiseLevel; }

  public setMutationRate(rate: number): void {
    this._mutationRate = Math.max(0, Math.min(1, rate));
  }

  public setSelectionPressure(pressure: number): void {
    this._selectionPressure = Math.max(0, pressure);
  }

  public setDiscountFactor(factor: number): void {
    this._discountFactor = Math.max(0, Math.min(1, factor));
  }

  public setNoiseLevel(noise: number): void {
    this._noiseLevel = Math.max(0, Math.min(1, noise));
  }

  public define2x2Game(strategyA1: string, strategyA2: string, strategyB1: string, strategyB2: string, payoffAA: [number, number], payoffAB: [number, number], payoffBA: [number, number], payoffBB: [number, number], gameType: PayoffMatrix['gameType'] = 'non-zero-sum'): void {
    this._payoffMatrix = {
      players: 2,
      strategies: [[strategyA1, strategyA2], [strategyB1, strategyB2]],
      payoffs: [
        [[payoffAA[0], payoffAA[1]], [payoffAB[0], payoffAB[1]]],
        [[payoffBA[0], payoffBA[1]], [payoffBB[0], payoffBB[1]]]
      ],
      gameType,
      information: 'complete',
    };
    this._nashEquilibria = [];
  }

  public definePrisonersDilemma(): void {
    this.define2x2Game(
      'Cooperate', 'Defect',
      'Cooperate', 'Defect',
      [3, 3], [0, 5],
      [5, 0], [1, 1],
      'non-zero-sum'
    );
  }

  public defineStagHunt(): void {
    this.define2x2Game(
      'Stag', 'Hare',
      'Stag', 'Hare',
      [4, 4], [0, 2],
      [2, 0], [2, 2],
      'non-cooperative'
    );
  }

  public defineChickenGame(): void {
    this.define2x2Game(
      'Swerve', 'Straight',
      'Swerve', 'Straight',
      [3, 3], [2, 5],
      [5, 2], [0, 0],
      'non-zero-sum'
    );
  }

  public defineBattleOfTheSexes(): void {
    this.define2x2Game(
      'Football', 'Ballet',
      'Football', 'Ballet',
      [3, 2], [0, 0],
      [0, 0], [2, 3],
      'non-zero-sum'
    );
  }

  public defineMatchingPennies(): void {
    this.define2x2Game(
      'Heads', 'Tails',
      'Heads', 'Tails',
      [1, -1], [-1, 1],
      [-1, 1], [1, -1],
      'zero-sum'
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
          const deviationBenefit = [0, 0];
          for (let i2 = 0; i2 < s1.length; i2++) {
            deviationBenefit[0] = Math.max(deviationBenefit[0], this._payoffMatrix.payoffs[i2][j][0] - payoffs[0]);
          }
          for (let j2 = 0; j2 < s2.length; j2++) {
            deviationBenefit[1] = Math.max(deviationBenefit[1], this._payoffMatrix.payoffs[i][j2][1] - payoffs[1]);
          }

          equilibria.push({
            strategyProfile: [i, j],
            isPure: true,
            payoffs: [...payoffs],
            deviationBenefit,
            stability: 1 - Math.max(...deviationBenefit),
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
      deviationBenefit: [0, 0],
      stability: 0.5,
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
      return { optima: [], dominated: [], paretoFrontierSize: 0, frontierPoints: [] };
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

    const frontierPoints = optima.map(idx => ({
      x: allPayoffs[idx[0] * s2.length + idx[1]][0],
      y: allPayoffs[idx[0] * s2.length + idx[1]][1],
    })).sort((a, b) => a.x - b.x);

    return { optima, dominated, paretoFrontierSize: optima.length, frontierPoints };
  }

  public initializeEvolutionary(strategies: number, initialPopulation?: number[]): EvolutionaryState {
    if (!initialPopulation) {
      initialPopulation = new Array(strategies).fill(1 / strategies);
    }
    const total = initialPopulation.reduce((a, b) => a + b, 0);
    const normalized = initialPopulation.map(x => x / total);

    const strategyFrequencies: Record<string, number> = {};
    if (this._payoffMatrix) {
      this._payoffMatrix.strategies[0].forEach((s, i) => {
        strategyFrequencies[s] = normalized[i];
      });
    }

    this._evolutionaryState = {
      population: normalized,
      fitness: new Array(strategies).fill(1),
      averageFitness: 1,
      generation: 0,
      strategyFrequencies,
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
          fitness[i] += pop[j] * (this._payoffMatrix.payoffs[i][j][0] + this._noiseLevel * (Math.random() - 0.5));
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

    const strategyFrequencies: Record<string, number> = {};
    this._payoffMatrix.strategies[0].forEach((s, i) => {
      strategyFrequencies[s] = normalized[i];
    });

    const nextState: EvolutionaryState = {
      population: normalized,
      fitness,
      averageFitness: avgFitness,
      generation: this._evolutionaryState.generation + 1,
      strategyFrequencies,
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

  public utilitarianWelfare(equilibrium: NashEquilibrium): number {
    return this.socialWelfare(equilibrium);
  }

  public egalitarianWelfare(equilibrium: NashEquilibrium): number {
    const minPayoff = Math.min(...equilibrium.payoffs);
    return minPayoff;
  }

  public maxMinWelfare(equilibrium: NashEquilibrium): number {
    return this.egalitarianWelfare(equilibrium);
  }

  public repeatedGame(cooperationStrategy: 'tit-for-tat' | 'always-cooperate' | 'always-defect' | 'grim-trigger', rounds: number): RepeatedGameResult {
    if (!this._payoffMatrix) {
      return { strategy: cooperationStrategy, rounds, totalPayoff: [0, 0], averagePayoff: [0, 0], cooperationRate: 0 };
    }

    const totalPayoff = [0, 0];
    let cooperationCount = 0;

    for (let round = 0; round < rounds; round++) {
      let strategyA = cooperationStrategy === 'always-cooperate' ? 0 : 1;
      let strategyB = 1;

      if (cooperationStrategy === 'tit-for-tat' && round > 0) {
        strategyA = strategyB;
      }

      if (cooperationStrategy === 'grim-trigger') {
        if (round > 0 && strategyB === 1) {
          strategyA = 1;
        }
      }

      const payoffs = this._payoffMatrix.payoffs[strategyA][strategyB];
      totalPayoff[0] += payoffs[0] * Math.pow(this._discountFactor, round);
      totalPayoff[1] += payoffs[1] * Math.pow(this._discountFactor, round);

      if (strategyA === 0 && strategyB === 0) {
        cooperationCount++;
      }
    }

    return {
      strategy: cooperationStrategy,
      rounds,
      totalPayoff,
      averagePayoff: totalPayoff.map(p => p / rounds),
      cooperationRate: cooperationCount / rounds,
    };
  }

  public triggerStrategyAnalysis(): { cooperationSustainable: boolean; minDiscountFactor: number; criticalThreshold: number } {
    if (!this._payoffMatrix) {
      return { cooperationSustainable: false, minDiscountFactor: 0, criticalThreshold: 0 };
    }

    const defectPayoff = this._payoffMatrix.payoffs[1][0][0];
    const cooperatePayoff = this._payoffMatrix.payoffs[0][0][0];
    const punishmentPayoff = this._payoffMatrix.payoffs[1][1][0];

    if (defectPayoff <= cooperatePayoff) {
      return { cooperationSustainable: true, minDiscountFactor: 0, criticalThreshold: 1 };
    }

    const minDiscountFactor = (defectPayoff - cooperatePayoff) / (defectPayoff - punishmentPayoff);
    const cooperationSustainable = this._discountFactor >= minDiscountFactor;

    return { cooperationSustainable, minDiscountFactor, criticalThreshold: minDiscountFactor };
  }

  public bargainingGame(threatPoint: number[], feasibleSet: number[][]): BargainingResult {
    const maxUtility = [0, 0];
    for (const point of feasibleSet) {
      maxUtility[0] = Math.max(maxUtility[0], point[0]);
      maxUtility[1] = Math.max(maxUtility[1], point[1]);
    }

    const nashBargainingSolution = [
      0.5 * (threatPoint[0] + maxUtility[0]),
      0.5 * (threatPoint[1] + maxUtility[1]),
    ];

    const kalaiSmorodinsky = [
      threatPoint[0] + (maxUtility[0] - threatPoint[0]) * 0.5,
      threatPoint[1] + (maxUtility[1] - threatPoint[1]) * 0.5,
    ];

    const split = [0.5, 0.5];

    return {
      split,
      nashBargainingSolution,
      kalaiSmorodinsky,
      threatPoint,
      feasibleSet,
    };
  }

  public mechanismDesign(type: 'vickrey' | 'second-price' | 'auction' | 'revelation'): MechanismDesignResult {
    return {
      mechanism: type,
      incentiveCompatible: type === 'vickrey' || type === 'second-price',
      individuallyRational: true,
      budgetBalanced: type !== 'vickrey',
      socialChoiceFunction: 'utilitarian',
    };
  }

  public bayesianGame(typeProbabilities: number[][], strategies: number[][]): BayesianGameResult {
    const typeProfile = [0, 0];
    const strategyProfile = strategies[0].slice(0, 2);
    const expectedPayoffs = [0, 0];

    for (let i = 0; i < typeProbabilities.length; i++) {
      for (let j = 0; j < typeProbabilities[i].length; j++) {
        const prob = typeProbabilities[i][j];
        expectedPayoffs[0] += prob * (i * 2);
        expectedPayoffs[1] += prob * (j * 2);
      }
    }

    return {
      typeProfile,
      strategyProfile,
      expectedPayoffs,
      perfectBayesianEquilibrium: true,
    };
  }

  public shapleyValue(coalitions: number[][], coalitionValues: number[]): ShapleyValue {
    const n = 2;
    const playerValues = [0, 0];

    for (let i = 0; i < coalitions.length; i++) {
      const coalition = coalitions[i];
      const value = coalitionValues[i];

      for (const player of coalition) {
        const withoutPlayer = coalition.filter(p => p !== player);
        const withoutValue = coalitionValues[coalitions.findIndex(c => 
          c.length === withoutPlayer.length && c.every((p, idx) => p === withoutPlayer[idx])
        )] || 0;
        playerValues[player] += (value - withoutValue) / coalition.length;
      }
    }

    const totalValue = coalitionValues[coalitions.findIndex(c => c.length === n)] || 0;
    const fairnessIndex = 1 - Math.abs(playerValues[0] - playerValues[1]) / totalValue;

    const marginalContributions: number[][] = [];
    for (let i = 0; i < n; i++) {
      marginalContributions.push([]);
      for (const coalition of coalitions) {
        if (coalition.includes(i)) {
          const withoutPlayer = coalition.filter(p => p !== i);
          const withoutValue = coalitionValues[coalitions.findIndex(c => 
            c.length === withoutPlayer.length && c.every((p, idx) => p === withoutPlayer[idx])
          )] || 0;
          const withValue = coalitionValues[coalitions.findIndex(c => 
            c.length === coalition.length && c.every((p, idx) => p === coalition[idx])
          )] || 0;
          marginalContributions[i].push(withValue - withoutValue);
        }
      }
    }

    return {
      playerValues,
      totalValue,
      marginalContributions,
      fairnessIndex,
    };
  }

  public coreAnalysis(coalitions: number[][], coalitionValues: number[], allocations: number[][]): CoreResult {
    const n = allocations[0].length;
    let isNonEmpty = true;
    const blockingCoalitions: number[][] = [];

    for (let i = 0; i < coalitions.length; i++) {
      const coalition = coalitions[i];
      const coalitionValue = coalitionValues[i];
      const allocationToCoalition = allocations[0].filter((_, idx) => coalition.includes(idx)).reduce((sum, val) => sum + val, 0);

      if (allocationToCoalition < coalitionValue) {
        isNonEmpty = false;
        blockingCoalitions.push(coalition);
      }
    }

    const coreAllocations = isNonEmpty ? allocations : [];

    return {
      isNonEmpty,
      coreAllocations,
      blockingCoalitions,
      stable: isNonEmpty,
    };
  }

  public minimaxStrategy(player: number): MixedStrategy {
    if (!this._payoffMatrix) {
      return { playerIndex: player, strategyProbabilities: [], expectedPayoff: 0, support: [] };
    }

    const strategies = player === 0 ? this._payoffMatrix.strategies[0].length : this._payoffMatrix.strategies[1].length;
    const strategyProbabilities = new Array(strategies).fill(1 / strategies);
    const expectedPayoff = 0;
    const support = Array.from({ length: strategies }, (_, i) => i);

    return { playerIndex: player, strategyProbabilities, expectedPayoff, support };
  }

  public maximinStrategy(player: number): MixedStrategy {
    return this.minimaxStrategy(player);
  }

  public dominanceSolutions(): { strictlyDominant: number[]; weaklyDominant: number[]; dominated: number[] } {
    if (!this._payoffMatrix) {
      return { strictlyDominant: [], weaklyDominant: [], dominated: [] };
    }

    const [s1, s2] = this._payoffMatrix.strategies;
    const strictlyDominant: number[] = [];
    const weaklyDominant: number[] = [];
    const dominated: number[] = [];

    for (let i = 0; i < s1.length; i++) {
      let isStrictlyDominant = true;
      let isWeaklyDominant = true;
      for (let i2 = 0; i2 < s1.length; i2++) {
        if (i === i2) continue;
        let strictlyBetter = false;
        let weaklyBetter = false;
        for (let j = 0; j < s2.length; j++) {
          if (this._payoffMatrix.payoffs[i][j][0] > this._payoffMatrix.payoffs[i2][j][0]) {
            strictlyBetter = true;
          }
          if (this._payoffMatrix.payoffs[i][j][0] >= this._payoffMatrix.payoffs[i2][j][0]) {
            weaklyBetter = true;
          }
        }
        if (!strictlyBetter) isStrictlyDominant = false;
        if (!weaklyBetter) isWeaklyDominant = false;
      }
      if (isStrictlyDominant) strictlyDominant.push(i);
      else if (isWeaklyDominant) weaklyDominant.push(i);
      else dominated.push(i);
    }

    return { strictlyDominant, weaklyDominant, dominated };
  }

  public correlatedEquilibrium(): { exists: boolean; correlationDevice: number[][]; expectedPayoffs: number[] } {
    return {
      exists: true,
      correlationDevice: [[0.25, 0.25], [0.25, 0.25]],
      expectedPayoffs: [2.5, 2.5],
    };
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
      const metadata: PacketMeta = {
        createdAt: Date.now(),
        route: ['game'],
        priority: 0,
        phase: 'empty'
      };
      return {
        id: 'game-empty',
        payload: [],
        metadata,
      };
    }
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['game', 'strategies'],
      priority: 0.6,
      phase: 'definition'
    };
    return {
      id: `game-strategies-${Date.now()}`,
      payload: this._payoffMatrix.strategies.flat(),
      metadata,
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

  public toPacket(): DataPacket<{
    hasGame: boolean;
    nashEquilibriumCount: number;
    evolutionaryGenerations: number;
    gameType: string;
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['game', 'summary'],
      priority: 1,
      phase: 'summary',
    };
    return {
      id: `game-theoretic-${Date.now()}`,
      payload: {
        hasGame: this._payoffMatrix !== null,
        nashEquilibriumCount: this._nashEquilibria.length,
        evolutionaryGenerations: this._history.length,
        gameType: this._payoffMatrix?.gameType ?? 'none',
      },
      metadata,
    };
  }
}
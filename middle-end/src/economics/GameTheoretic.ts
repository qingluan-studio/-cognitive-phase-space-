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

  /** Compute the minimax value of a zero-sum game. */
  public minimaxValue(payoffs: number[][]): number {
    if (payoffs.length === 0) return 0;
    const rowMin = payoffs.map(row => Math.min(...row));
    return Math.max(...rowMin);
  }

  /** Compute the maximin value of a zero-sum game. */
  public maximinValue(payoffs: number[][]): number {
    if (payoffs.length === 0) return 0;
    const colMax: number[] = [];
    for (let j = 0; j < payoffs[0].length; j++) {
      const col = payoffs.map(row => row[j]);
      colMax.push(Math.max(...col));
    }
    return Math.min(...colMax);
  }

  /** Determine if a game has a saddle point. */
  public hasSaddlePoint(payoffs: number[][]): boolean {
    return this.minimaxValue(payoffs) === this.maximinValue(payoffs);
  }

  /** Compute the Shapley value for a player in a cooperative game. */
  public shapleyValue(coalitionValues: Record<string, number>, player: string, allPlayers: string[]): number {
    let shapley = 0;
    const others = allPlayers.filter(p => p !== player);
    const n = allPlayers.length;
    const subsets = this._subsets(others);
    for (const subset of subsets) {
      const subsetKey = [...subset].sort().join(',');
      const withPlayerKey = [...subset, player].sort().join(',');
      const subsetValue = coalitionValues[subsetKey] ?? 0;
      const withPlayerValue = coalitionValues[withPlayerKey] ?? 0;
      const factorial = this._factorial(subset.length) * this._factorial(n - subset.length - 1);
      const weight = factorial / this._factorial(n);
      shapley += weight * (withPlayerValue - subsetValue);
    }
    return Number(shapley.toFixed(4));
  }

  private _subsets(arr: string[]): string[][] {
    const result: string[][] = [[]];
    for (const el of arr) {
      const newSubsets = result.map(s => [...s, el]);
      result.push(...newSubsets);
    }
    return result;
  }

  private _factorial(n: number): number {
    if (n <= 1) return 1;
    let result = 1;
    for (let i = 2; i <= n; i++) result *= i;
    return result;
  }

  /** Compute the core of a cooperative game. */
  public coreOfGame(coalitionValues: Record<string, number>, allPlayers: string[]): boolean {
    const grand = allPlayers.sort().join(',');
    const grandValue = coalitionValues[grand] ?? 0;
    let sumOfIndividual = 0;
    for (const p of allPlayers) {
      sumOfIndividual += coalitionValues[p] ?? 0;
    }
    return grandValue <= sumOfIndividual;
  }

  /** Compute the Pareto optimal allocations. */
  public paretoOptimalAllocations(utilities: { agent: string; utility: number }[]): { agent: string; utility: number }[] {
    return [...utilities].sort((a, b) => b.utility - a.utility);
  }

  /** Determine if an allocation is Pareto efficient. */
  public isParetoEfficient(allocation: { agent: string; utility: number }[], alternative: { agent: string; utility: number }[]): boolean {
    let atLeastOneBetter = false;
    let allAtLeastAsGood = true;
    for (let i = 0; i < allocation.length; i++) {
      if (alternative[i].utility > allocation[i].utility) atLeastOneBetter = true;
      if (alternative[i].utility < allocation[i].utility) allAtLeastAsGood = false;
    }
    return !(atLeastOneBetter && allAtLeastAsGood);
  }

  /** Compute the price of anarchy. */
  public priceOfAnarchy(socialOptimum: number, nashEquilibrium: number): number {
    if (nashEquilibrium === 0) return 0;
    return Number((socialOptimum / nashEquilibrium).toFixed(4));
  }

  /** Compute the price of stability. */
  public priceOfStability(socialOptimum: number, bestNashEquilibrium: number): number {
    if (bestNashEquilibrium === 0) return 0;
    return Number((socialOptimum / bestNashEquilibrium).toFixed(4));
  }

  /** Compute the mixed strategy Nash equilibrium (2x2 game). */
  public mixedStrategyNash(payoffsA: number[][], payoffsB: number[][]): { playerA: number[]; playerB: number[] } | null {
    if (payoffsA.length !== 2 || payoffsA[0].length !== 2) return null;
    const a = payoffsA[0][0];
    const b = payoffsA[1][0];
    const c = payoffsA[0][1];
    const d = payoffsA[1][1];
    const denomA = (a - c) - (b - d);
    const probA1 = denomA === 0 ? 0.5 : (d - c) / denomA;
    const e = payoffsB[0][0];
    const f = payoffsB[1][0];
    const g = payoffsB[0][1];
    const h = payoffsB[1][1];
    const denomB = (e - g) - (f - h);
    const probB1 = denomB === 0 ? 0.5 : (h - g) / denomB;
    return {
      playerA: [Number(probA1.toFixed(4)), Number((1 - probA1).toFixed(4))],
      playerB: [Number(probB1.toFixed(4)), Number((1 - probB1).toFixed(4))],
    };
  }

  /** Compute the expected payoff for a mixed strategy. */
  public expectedPayoff(mixedStrategy: number[], payoffs: number[]): number {
    if (mixedStrategy.length !== payoffs.length) return 0;
    return Number(mixedStrategy.reduce((s, p, i) => s + p * payoffs[i], 0).toFixed(4));
  }

  /** Compute the expected payoff matrix for mixed strategies. */
  public expectedPayoffMatrix(strategyA: number[], strategyB: number[], payoffMatrix: number[][]): number {
    let expected = 0;
    for (let i = 0; i < strategyA.length; i++) {
      for (let j = 0; j < strategyB.length; j++) {
        expected += strategyA[i] * strategyB[j] * payoffMatrix[i][j];
      }
    }
    return Number(expected.toFixed(4));
  }

  /** Determine if a game is dominance solvable. */
  public isDominanceSolvable(payoffs: number[][]): boolean {
    let matrix = payoffs.map(row => [...row]);
    let player = 0;
    let iterations = 0;
    while (matrix.length > 1 && matrix[0].length > 1 && iterations < 20) {
      let reduced = false;
      if (player === 0) {
        for (let i = 0; i < matrix.length; i++) {
          for (let j = i + 1; j < matrix.length; j++) {
            if (matrix[i].every((v, k) => v >= matrix[j][k])) {
              matrix.splice(j, 1);
              reduced = true;
              break;
            }
          }
          if (reduced) break;
        }
      } else {
        for (let i = 0; i < matrix[0].length; i++) {
          for (let j = i + 1; j < matrix[0].length; j++) {
            if (matrix.every(row => row[i] >= row[j])) {
              matrix = matrix.map(row => { row.splice(j, 1); return row; });
              reduced = true;
              break;
            }
          }
          if (reduced) break;
        }
      }
      if (!reduced) player = 1 - player;
      iterations++;
    }
    return matrix.length === 1 || matrix[0].length === 1;
  }

  /** Compute the trembling-hand perfect equilibrium (simplified). */
  public tremblingHandPerfect(strategies: number[][], epsilon: number = 0.01): number[][] {
    return strategies.map(s => s.map(p => (1 - epsilon) * p + epsilon / s.length));
  }

  /** Compute the Stackelberg equilibrium (leader-follower). */
  public stackelbergEquilibrium(leaderPayoffs: number[][], followerPayoffs: number[][]): { leader: number; follower: number } | null {
    if (leaderPayoffs.length === 0) return null;
    let bestLeader = 0;
    let bestFollower = 0;
    let bestLeaderPayoff = -Infinity;
    for (let i = 0; i < leaderPayoffs.length; i++) {
      let bestFollowerForLeader = 0;
      let bestFollowerPayoff = -Infinity;
      for (let j = 0; j < followerPayoffs[i].length; j++) {
        if (followerPayoffs[i][j] > bestFollowerPayoff) {
          bestFollowerPayoff = followerPayoffs[i][j];
          bestFollowerForLeader = j;
        }
      }
      if (leaderPayoffs[i][bestFollowerForLeader] > bestLeaderPayoff) {
        bestLeaderPayoff = leaderPayoffs[i][bestFollowerForLeader];
        bestLeader = i;
        bestFollower = bestFollowerForLeader;
      }
    }
    return { leader: bestLeader, follower: bestFollower };
  }

  /** Compute the Cournot equilibrium (duopoly). */
  public cournotEquilibrium(costA: number, costB: number, demand: { a: number; b: number }): { qa: number; qb: number; price: number } {
    const qa = (demand.a - 2 * costA + costB) / (3 * demand.b);
    const qb = (demand.a - 2 * costB + costA) / (3 * demand.b);
    const price = demand.a - demand.b * (qa + qb);
    return {
      qa: Number(qa.toFixed(4)),
      qb: Number(qb.toFixed(4)),
      price: Number(price.toFixed(4)),
    };
  }

  /** Compute the Bertrand equilibrium (duopoly). */
  public bertrandEquilibrium(costA: number, costB: number): { price: number; profit: number } {
    const price = Math.min(costA, costB);
    return {
      price,
      profit: 0,
    };
  }

  /** Compute the Hotelling model equilibrium. */
  public hotellingEquilibrium(positions: number[]): { leftPrice: number; rightPrice: number } {
    if (positions.length < 2) return { leftPrice: 0, rightPrice: 0 };
    const sorted = [...positions].sort((a, b) => a - b);
    const left = sorted[0];
    const right = sorted[sorted.length - 1];
    const midpoint = (left + right) / 2;
    return {
      leftPrice: Number((midpoint - left).toFixed(4)),
      rightPrice: Number((right - midpoint).toFixed(4)),
    };
  }

  /** Compute the median voter theorem. */
  public medianVoter(positions: number[]): number {
    if (positions.length === 0) return 0;
    const sorted = [...positions].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }

  /** Compute the Condorcet winner. */
  public condorcetWinner(preferences: number[][]): number | null {
    const numCandidates = preferences[0]?.length ?? 0;
    if (numCandidates === 0) return null;
    for (let c = 0; c < numCandidates; c++) {
      let winsAll = true;
      for (let other = 0; other < numCandidates; other++) {
        if (c === other) continue;
        let cWins = 0;
        for (const pref of preferences) {
          if (pref.indexOf(c) < pref.indexOf(other)) cWins++;
        }
        if (cWins <= preferences.length / 2) {
          winsAll = false;
          break;
        }
      }
      if (winsAll) return c;
    }
    return null;
  }

  /** Compute the Borda count winner. */
  public bordaCount(preferences: number[][]): number {
    const numCandidates = preferences[0]?.length ?? 0;
    if (numCandidates === 0) return -1;
    const scores: number[] = new Array(numCandidates).fill(0);
    for (const pref of preferences) {
      for (let i = 0; i < pref.length; i++) {
        scores[pref[i]] += pref.length - i - 1;
      }
    }
    return scores.indexOf(Math.max(...scores));
  }

  /** Compute the Arrow impossibility theorem check. */
  public arrowImpossibility(properties: { unrestrictedDomain: boolean; pareto: boolean; iia: boolean; dictatorship: boolean }): boolean {
    return properties.unrestrictedDomain && properties.pareto && properties.iia && !properties.dictatorship;
  }

  /** Compute the Gibbard-Satterthwaite theorem applicability. */
  public gibbardSatterthwaite(mechanism: { manipulable: boolean; atLeastThreeAlternatives: boolean; surjective: boolean }): boolean {
    return mechanism.atLeastThreeAlternatives && mechanism.surjective && mechanism.manipulable;
  }

  /** Compute the folk theorem prediction. */
  public folkTheoremPayoff(minPayoff: number, maxPayoff: number, discountFactor: number): number {
    if (discountFactor < 0.5) return minPayoff;
    return Number(((minPayoff + maxPayoff) / 2).toFixed(4));
  }

  /** Compute the discount factor threshold for cooperation. */
  public cooperationThreshold(delta: number, temptation: number, reward: number, punishment: number, sucker: number): boolean {
    return delta >= (temptation - reward) / (temptation - punishment);
  }

  /** Compute the tit-for-tat strategy response. */
  public titForTat(opponentLastMove: 'cooperate' | 'defect'): 'cooperate' | 'defect' {
    return opponentLastMove;
  }

  /** Compute the grim trigger strategy response. */
  public grimTrigger(opponentHistory: ('cooperate' | 'defect')[]): 'cooperate' | 'defect' {
    return opponentHistory.includes('defect') ? 'defect' : 'cooperate';
  }

  /** Compute the pavlov (win-stay, lose-shift) strategy response. */
  public pavlov(ownLastMove: 'cooperate' | 'defect', opponentLastMove: 'cooperate' | 'defect'): 'cooperate' | 'defect' {
    const bothCooperate = ownLastMove === 'cooperate' && opponentLastMove === 'cooperate';
    const bothDefect = ownLastMove === 'defect' && opponentLastMove === 'defect';
    return (bothCooperate || bothDefect) ? ownLastMove : (ownLastMove === 'cooperate' ? 'defect' : 'cooperate');
  }

  /** Compute the value of the game (zero-sum). */
  public valueOfGame(payoffs: number[][]): number {
    if (this.hasSaddlePoint(payoffs)) return this.minimaxValue(payoffs);
    const mixed = this.mixedStrategyNash(payoffs, payoffs.map(row => row.map(() => 0)));
    if (!mixed) return 0;
    let value = 0;
    for (let i = 0; i < payoffs.length; i++) {
      for (let j = 0; j < payoffs[0].length; j++) {
        value += mixed.playerA[i] * mixed.playerB[j] * payoffs[i][j];
      }
    }
    return Number(value.toFixed(4));
  }

  /** Compute the bargaining solution (Nash). */
  public nashBargainingSolution(utilityA: (x: number) => number, utilityB: (x: number) => number, disagreementA: number, disagreementB: number): number {
    let bestX = 0;
    let bestProduct = -Infinity;
    for (let x = 0; x <= 1; x += 0.01) {
      const ua = utilityA(x) - disagreementA;
      const ub = utilityB(x) - disagreementB;
      if (ua > 0 && ub > 0) {
        const product = ua * ub;
        if (product > bestProduct) {
          bestProduct = product;
          bestX = x;
        }
      }
    }
    return Number(bestX.toFixed(4));
  }

  /** Compute the Kalai-Smorodinsky bargaining solution. */
  public kalaiSmorodinskySolution(utilityA: (x: number) => number, utilityB: (x: number) => number, maxA: number, maxB: number): number {
    let bestX = 0;
    let bestDiff = Infinity;
    for (let x = 0; x <= 1; x += 0.01) {
      const ua = utilityA(x);
      const ub = utilityB(x);
      const ratioA = ua / Math.max(0.0001, maxA);
      const ratioB = ub / Math.max(0.0001, maxB);
      const diff = Math.abs(ratioA - ratioB);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestX = x;
      }
    }
    return Number(bestX.toFixed(4));
  }

  /** Compute the Rubinstein bargaining solution. */
  public rubinsteinBargaining(discountA: number, discountB: number): { shareA: number; shareB: number } {
    if (discountA + discountB === 0) return { shareA: 0.5, shareB: 0.5 };
    const shareA = (1 - discountB) / (1 - discountA * discountB);
    return {
      shareA: Number(shareA.toFixed(4)),
      shareB: Number((1 - shareA).toFixed(4)),
    };
  }

  /** Compute the principal-agent model (hidden action). */
  public principalAgent(agentEffort: number, agentCost: number, outputCoefficient: number, riskAversion: number): { wage: number; effort: number } {
    const optimalEffort = outputCoefficient / (2 * agentCost);
    const wage = agentCost * optimalEffort * optimalEffort + riskAversion * optimalEffort;
    return {
      wage: Number(wage.toFixed(4)),
      effort: Number(optimalEffort.toFixed(4)),
    };
  }

  /** Compute the moral hazard indicator. */
  public moralHazardIndicator(effortObservable: boolean, agentRiskAversion: number): 'high' | 'moderate' | 'low' {
    if (!effortObservable && agentRiskAversion < 0.3) return 'high';
    if (!effortObservable) return 'moderate';
    return 'low';
  }

  /** Compute the adverse selection indicator (Akerlof's lemons). */
  public adverseSelectionIndicator(infoAsymmetry: number, qualityVariance: number): number {
    return Number((infoAsymmetry * qualityVariance).toFixed(4));
  }

  /** Compute the signaling game equilibrium (separating). */
  public separatingEquilibrium(highTypeCost: number, lowTypeCost: number, signalCost: number): { highSignals: boolean; lowSignals: boolean } {
    return {
      highSignals: signalCost < highTypeCost,
      lowSignals: false,
    };
  }

  /** Compute the pooling equilibrium. */
  public poolingEquilibrium(): { highSignals: boolean; lowSignals: boolean } {
    return {
      highSignals: true,
      lowSignals: true,
    };
  }

  /** Compute the mechanism design revelation principle. */
  public revelationPrinciple(directMechanism: boolean, truthfulness: boolean): boolean {
    return directMechanism && truthfulness;
  }

  /** Compute the Vickrey-Clarke-Groves (VCG) mechanism payment. */
  public vcgPayment(playerValues: Record<string, number>, winner: string, allPlayers: string[]): number {
    const others = allPlayers.filter(p => p !== winner);
    const othersValue = others.reduce((s, p) => s + (playerValues[p] ?? 0), 0);
    return Number(othersValue.toFixed(4));
  }

  /** Compute the expected social welfare. */
  public expectedSocialWelfare(allocations: { agent: string; value: number }[]): number {
    return Number(allocations.reduce((s, a) => s + a.value, 0).toFixed(4));
  }

  /** Compute the envy-free allocation indicator. */
  public isEnvyFree(allocations: { agent: string; value: number }[]): boolean {
    for (let i = 0; i < allocations.length; i++) {
      for (let j = 0; j < allocations.length; j++) {
        if (i !== j && allocations[i].value < allocations[j].value) return false;
      }
    }
    return true;
  }

  /** Compute the proportional fairness allocation. */
  public proportionalFairness(claims: number[], totalResource: number): number[] {
    const total = claims.reduce((s, c) => s + c, 0);
    if (total === 0) return claims.map(() => 0);
    return claims.map(c => Number((c / total * totalResource).toFixed(4)));
  }

  /** Compute the max-min fairness allocation. */
  public maxMinFairness(demands: number[], totalResource: number): number[] {
    const sorted = demands.map((d, i) => ({ d, i })).sort((a, b) => a.d - b.d);
    const allocation = new Array(demands.length).fill(0);
    let remaining = totalResource;
    for (let k = 0; k < sorted.length; k++) {
      const share = remaining / (sorted.length - k);
      const allocated = Math.min(sorted[k].d, share);
      allocation[sorted[k].i] = Number(allocated.toFixed(4));
      remaining -= allocated;
    }
    return allocation;
  }

  /** Compute the strategy complexity (number of pure strategies). */
  public strategyComplexity(strategy: number[][]): number {
    return strategy.length * (strategy[0]?.length ?? 0);
  }

  /** Compute the game entropy (information content). */
  public gameEntropy(mixedStrategies: number[][]): number {
    let entropy = 0;
    for (const strategy of mixedStrategies) {
      for (const p of strategy) {
        if (p > 0) entropy -= p * Math.log2(p);
      }
    }
    return Number(entropy.toFixed(4));
  }

  /** Generate a game theory summary dashboard. */
  public gameTheoryDashboard(): Record<string, unknown> {
    return {
      hasGame: this._payoffMatrix !== null,
      nashEquilibria: this._nashEquilibria.length,
      evolutionaryGenerations: this._history.length,
      gameType: this._payoffMatrix?.gameType ?? 'none',
      hasSaddlePoint: this._payoffMatrix ? this.hasSaddlePoint(this._payoffMatrix.payoffs) : false,
      minimaxValue: this._payoffMatrix ? this.minimaxValue(this._payoffMatrix.payoffs) : 0,
    };
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
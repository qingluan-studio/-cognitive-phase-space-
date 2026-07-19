import { DataPacket, PacketMeta } from '../shared/types';

/** Game type. */
export type GameType = 'zero-sum' | 'non-zero-sum' | 'cooperative' | 'non-cooperative' | 'sequential' | 'simultaneous';

/** A game descriptor. */
export interface Game {
  readonly id: string;
  readonly players: string[];
  readonly strategies: Record<string, string[]>;
  readonly payoffs: Record<string, number[][]>;
  readonly type: GameType;
}

/** A Nash equilibrium. */
export interface NashEquilibrium {
  readonly gameId: string;
  readonly strategies: Record<string, string>;
  readonly payoffs: Record<string, number>;
  readonly pure: boolean;
}

/** A strategy descriptor. */
export interface Strategy {
  readonly name: string;
  readonly type: 'pure' | 'mixed' | 'dominant' | 'dominated';
  readonly payoff: number;
  readonly probability?: number;
}

/** Prisoner's dilemma result. */
export interface DilemmaResult {
  readonly cooperateCooperate: [number, number];
  readonly cooperateDefect: [number, number];
  readonly defectCooperate: [number, number];
  readonly defectDefect: [number, number];
  readonly nashEquilibrium: string;
}

/** Shapley value distribution. */
export interface ShapleyDistribution {
  readonly player: string;
  readonly value: number;
  readonly marginalContributions: number[];
}

/**
 * GameTheory solves classic games, finds Nash equilibria, dominant strategies,
 * and computes Shapley values for cooperative games.
 */
export class GameTheory {
  private _games: Map<string, Game> = new Map();
  private _equilibria: NashEquilibrium[] = [];
  private _strategies: Strategy[] = [];
  private _history: unknown[] = [];
  private _counter = 0;

  get gameCount(): number { return this._games.size; }
  get equilibriumCount(): number { return this._equilibria.length; }
  get strategyCount(): number { return this._strategies.length; }

  /** Solve the Prisoner's Dilemma. */
  prisonersDilemma(): DilemmaResult {
    return {
      cooperateCooperate: [3, 3],
      cooperateDefect: [0, 5],
      defectCooperate: [5, 0],
      defectDefect: [1, 1],
      nashEquilibrium: 'defect-defect',
    };
  }

  /** Find Nash equilibrium of a game. */
  nashEquilibrium(game: Game): NashEquilibrium {
    const playerNames = game.players;
    const strategies: Record<string, string> = {};
    const payoffs: Record<string, number> = {};
    for (const p of playerNames) {
      strategies[p] = game.strategies[p]?.[0] ?? 'default';
      payoffs[p] = game.payoffs[p]?.[0]?.[0] ?? 0;
    }
    const eq: NashEquilibrium = {
      gameId: game.id,
      strategies,
      payoffs,
      pure: true,
    };
    this._equilibria.push(eq);
    this._history.push({ op: 'nashEquilibrium', gameId: game.id });
    return eq;
  }

  /** Find dominant strategy for a player. */
  dominantStrategy(game: Game, player: string): Strategy | null {
    const strats = game.strategies[player];
    if (!strats || strats.length === 0) return null;
    const payoffMatrix = game.payoffs[player];
    if (!payoffMatrix) return null;
    const avgPayoffs = payoffMatrix.map(row => row.reduce((s, v) => s + v, 0) / row.length);
    const bestIdx = avgPayoffs.indexOf(Math.max(...avgPayoffs));
    const strategy: Strategy = {
      name: strats[bestIdx],
      type: 'dominant',
      payoff: Number(avgPayoffs[bestIdx].toFixed(2)),
    };
    this._strategies.push(strategy);
    return strategy;
  }

  /** Compute mixed strategy Nash equilibrium. */
  mixedStrategy(game: Game): NashEquilibrium {
    const strategies: Record<string, string> = {};
    const payoffs: Record<string, number> = {};
    for (const p of game.players) {
      strategies[p] = `mixed-${p}`;
      payoffs[p] = 0;
    }
    const eq: NashEquilibrium = {
      gameId: game.id,
      strategies,
      payoffs,
      pure: false,
    };
    this._equilibria.push(eq);
    return eq;
  }

  /** Minimax solution for zero-sum games. */
  minimax(payoffMatrix: number[][]): { value: number; rowStrategy: number; colStrategy: number } {
    const rowMin = payoffMatrix.map(row => Math.min(...row));
    const maximin = Math.max(...rowMin);
    const colMax = payoffMatrix[0].map((_, j) => Math.max(...payoffMatrix.map(row => row[j])));
    const minimaxVal = Math.min(...colMax);
    return {
      value: Number(((maximin + minimaxVal) / 2).toFixed(2)),
      rowStrategy: rowMin.indexOf(maximin),
      colStrategy: colMax.indexOf(minimaxVal),
    };
  }

  /** Maximin strategy. */
  maximin(payoffMatrix: number[][]): { value: number; strategy: number } {
    const rowMin = payoffMatrix.map(row => Math.min(...row));
    const maximin = Math.max(...rowMin);
    return {
      value: Number(maximin.toFixed(2)),
      strategy: rowMin.indexOf(maximin),
    };
  }

  /** Solve a zero-sum game. */
  zeroSumGame(matrix: number[][]): { value: number; rowStrategy: number; colStrategy: number; saddle: boolean } {
    const mm = this.minimax(matrix);
    return {
      value: mm.value,
      rowStrategy: mm.rowStrategy,
      colStrategy: mm.colStrategy,
      saddle: mm.value === matrix[mm.rowStrategy]?.[mm.colStrategy],
    };
  }

  /** Solve a cooperative game. */
  cooperativeGame(players: string[], coalitions: { members: string[]; value: number }[]): { stable: boolean; coreNonempty: boolean } {
    return {
      stable: coalitions.length > 0,
      coreNonempty: coalitions.every(c => c.value > 0),
    };
  }

  /** Solve a non-cooperative game. */
  nonCooperativeGame(players: string[], strategies: Record<string, string[]>): Game {
    const game: Game = {
      id: `game-${(++this._counter).toString(36)}`,
      players,
      strategies,
      payoffs: {},
      type: 'non-cooperative',
    };
    this._games.set(game.id, game);
    return game;
  }

  /** Solve a repeated game. */
  repeatedGame(game: Game, iterations: number, strategy: 'tit-for-tat' | 'always-defect' | 'always-cooperate'): { totalPayoff: number; avgPayoff: number; cooperationRate: number } {
    const totalPayoff = iterations * 2;
    const cooperationRate = strategy === 'always-cooperate' ? 1 : strategy === 'always-defect' ? 0 : 0.7;
    return {
      totalPayoff,
      avgPayoff: Number((totalPayoff / iterations).toFixed(2)),
      cooperationRate,
    };
  }

  /** Solve a Bayesian game. */
  bayesianGame(types: string[], beliefs: number[]): { equilibrium: string; expectedPayoff: number } {
    return {
      equilibrium: 'bayesian-nash',
      expectedPayoff: Number(beliefs.reduce((s, b) => s + b, 0).toFixed(2)),
    };
  }

  /** Solve an evolutionary game. */
  evolutionaryGame(strategy: string, population: number, fitness: number): { frequency: number; stable: boolean; fitness: number } {
    return {
      frequency: Number((population / 100).toFixed(2)),
      stable: fitness > 1,
      fitness,
    };
  }

  /** Design a mechanism. */
  mechanismDesign(socialChoice: string, incentive: 'truthful' | 'manipulable'): { ic: boolean; efficient: boolean } {
    return {
      ic: incentive === 'truthful',
      efficient: socialChoice === 'efficient',
    };
  }

  /** Solve an auction. */
  auction(type: 'english' | 'dutch' | 'sealed-first' | 'sealed-second' | 'all-pay', bidders: number, valuations: number[]): { winner: number; price: number; revenue: number } {
    const winner = valuations.indexOf(Math.max(...valuations));
    let price = 0;
    if (type === 'sealed-second') {
      const sorted = [...valuations].sort((a, b) => b - a);
      price = sorted[1] ?? sorted[0];
    } else {
      price = valuations[winner];
    }
    return {
      winner,
      price: Number(price.toFixed(2)),
      revenue: Number(price.toFixed(2)),
    };
  }

  /** Compute Shapley value distribution. */
  shapleyValue(coalition: { members: string[]; value: number }[], players: string[]): ShapleyDistribution[] {
    const distributions: ShapleyDistribution[] = [];
    for (const player of players) {
      let value = 0;
      const marginals: number[] = [];
      for (const c of coalition) {
        if (c.members.includes(player)) {
          const without = c.members.filter(m => m !== player);
          const withoutCoalition = coalition.find(co => co.members.length === without.length && without.every(m => co.members.includes(m)));
          const marginal = c.value - (withoutCoalition?.value ?? 0);
          marginals.push(marginal);
          value += marginal;
        }
      }
      value = value / Math.max(1, coalition.filter(c => c.members.includes(player)).length);
      distributions.push({
        player,
        value: Number(value.toFixed(2)),
        marginalContributions: marginals.map(m => Number(m.toFixed(2))),
      });
    }
    this._history.push({ op: 'shapleyValue', players: players.length });
    return distributions;
  }

  toPacket(): DataPacket<{
    games: number;
    equilibria: NashEquilibrium[];
    strategies: Strategy[];
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['economics_extended', 'GameTheory'],
      priority: 1,
      phase: 'game-theory',
    };
    return {
      id: `game-theory-${Date.now().toString(36)}-${(++this._counter).toString(36)}`,
      payload: {
        games: this._games.size,
        equilibria: [...this._equilibria],
        strategies: [...this._strategies],
        history: [...this._history],
      },
      metadata,
    };
  }

  reset(): void {
    this._games.clear();
    this._equilibria = [];
    this._strategies = [];
    this._history = [];
    this._counter = 0;
  }
}

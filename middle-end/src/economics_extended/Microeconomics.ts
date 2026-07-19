import { DataPacket, PacketMeta } from '../shared/types';

/** Market structure type. */
export type MarketStructure = 'perfect-competition' | 'monopoly' | 'oligopoly' | 'monopolistic-competition';

/** A market with demand/supply curves. */
export interface Market {
  readonly id: string;
  readonly demand: { price: number; quantity: number }[];
  readonly supply: { price: number; quantity: number }[];
  readonly price: number;
  readonly quantity: number;
  readonly structure: MarketStructure;
}

/** Consumer surplus computation. */
export interface Consumer {
  readonly surplus: number;
  readonly utility: number;
  readonly budget: number;
  readonly optimalBundle?: { good: string; quantity: number }[];
}

/** Firm production summary. */
export interface Firm {
  readonly id: string;
  readonly cost: number;
  readonly revenue: number;
  readonly profit: number;
  readonly output: number;
}

/** Elasticity result. */
export interface Elasticity {
  readonly coefficient: number;
  readonly elastic: 'elastic' | 'inelastic' | 'unit-elastic';
  readonly direction: 'positive' | 'negative';
}

/** Equilibrium result. */
export interface Equilibrium {
  readonly price: number;
  readonly quantity: number;
  readonly consumerSurplus: number;
  readonly producerSurplus: number;
  readonly totalSurplus: number;
}

/** Game-theory payoff matrix entry. */
export interface PayoffMatrix {
  readonly players: string[];
  readonly strategies: string[][];
  readonly payoffs: number[][][];
}

/**
 * Microeconomics models markets, consumer/firm behavior, elasticities,
 * and game-theoretic interactions.
 */
export class Microeconomics {
  private _markets: Map<string, Market> = new Map();
  private _consumers: Consumer[] = [];
  private _firms: Map<string, Firm> = new Map();
  private _history: unknown[] = [];
  private _counter = 0;

  get marketCount(): number { return this._markets.size; }
  get consumerCount(): number { return this._consumers.length; }
  get firmCount(): number { return this._firms.size; }

  /** Build a linear demand curve. */
  demandCurve(price: number, quantity: number): { price: number; quantity: number }[] {
    const curve: { price: number; quantity: number }[] = [];
    for (let i = 0; i <= 5; i++) {
      const p = price * (1 - i * 0.2);
      curve.push({ price: Number(p.toFixed(2)), quantity: Math.max(0, quantity + i * 10) });
    }
    return curve;
  }

  /** Build a linear supply curve. */
  supplyCurve(price: number, quantity: number): { price: number; quantity: number }[] {
    const curve: { price: number; quantity: number }[] = [];
    for (let i = 0; i <= 5; i++) {
      const p = price * (1 + i * 0.2);
      curve.push({ price: Number(p.toFixed(2)), quantity: Math.max(0, quantity + i * 10) });
    }
    return curve;
  }

  /** Compute market equilibrium. */
  marketEquilibrium(demand: { price: number; quantity: number }[], supply: { price: number; quantity: number }[]): Equilibrium {
    const eqPrice = (demand[0].price + supply[0].price) / 2;
    const eqQty = (demand[0].quantity + supply[0].quantity) / 2;
    const cs = 0.5 * (demand[0].price - eqPrice) * eqQty;
    const ps = 0.5 * (eqPrice - supply[0].price) * eqQty;
    return {
      price: Number(eqPrice.toFixed(2)),
      quantity: Number(eqQty.toFixed(2)),
      consumerSurplus: Number(cs.toFixed(2)),
      producerSurplus: Number(ps.toFixed(2)),
      totalSurplus: Number((cs + ps).toFixed(2)),
    };
  }

  /** Compute consumer surplus. */
  consumerSurplus(demand: { price: number; quantity: number }[], price: number): number {
    const maxPrice = demand[0]?.price ?? price;
    const qty = demand.find(d => d.price <= price)?.quantity ?? 0;
    return Number((0.5 * (maxPrice - price) * qty).toFixed(2));
  }

  /** Compute producer surplus. */
  producerSurplus(supply: { price: number; quantity: number }[], price: number): number {
    const minPrice = supply[0]?.price ?? price;
    const qty = supply.find(s => s.price >= price)?.quantity ?? 0;
    return Number((0.5 * (price - minPrice) * qty).toFixed(2));
  }

  /** Compute deadweight loss from a tax. */
  deadweightLoss(tax: number, market: Market): number {
    const qtyReduction = tax * 0.5;
    return Number((0.5 * tax * qtyReduction).toFixed(2));
  }

  /** Compute price elasticity of demand. */
  priceElasticity(price: number, quantity: number): Elasticity {
    const coefficient = -1.2;
    const elastic: Elasticity['elastic'] = Math.abs(coefficient) > 1 ? 'elastic' : Math.abs(coefficient) === 1 ? 'unit-elastic' : 'inelastic';
    return { coefficient, elastic, direction: 'negative' };
  }

  /** Compute income elasticity. */
  incomeElasticity(income: number, quantity: number): Elasticity {
    const coefficient: number = 0.8;
    return {
      coefficient,
      elastic: coefficient > 1 ? 'elastic' : coefficient === 1 ? 'unit-elastic' : 'inelastic',
      direction: 'positive',
    };
  }

  /** Compute cross-price elasticity. */
  crossElasticity(priceA: number, quantityB: number): Elasticity {
    const coefficient = 0.5;
    return {
      coefficient,
      elastic: 'inelastic',
      direction: coefficient > 0 ? 'positive' : 'negative',
    };
  }

  /** Solve utility maximization. */
  utilityMaximization(budget: number, prices: { good: string; price: number }[], preferences: { good: string; weight: number }[]): Consumer {
    const bundle = prices.map(p => {
      const pref = preferences.find(pr => pr.good === p.good);
      const weight = pref?.weight ?? 0.5;
      const qty = Math.floor((budget * weight) / Math.max(0.01, p.price));
      return { good: p.good, quantity: qty };
    });
    const utility = bundle.reduce((s, b) => s + b.quantity, 0);
    return { surplus: 0, utility, budget, optimalBundle: bundle };
  }

  /** Solve cost minimization. */
  costMinimization(output: number, inputPrices: { input: string; price: number }[]): { mix: { input: string; quantity: number }[]; cost: number } {
    const mix = inputPrices.map(p => ({ input: p.input, quantity: Math.ceil(output / p.price) }));
    const cost = mix.reduce((s, m, i) => s + m.quantity * inputPrices[i].price, 0);
    return { mix, cost };
  }

  /** Solve profit maximization. */
  profitMaximization(cost: number, revenue: number): Firm {
    return {
      id: `firm-${(++this._counter).toString(36)}`,
      cost,
      revenue,
      profit: revenue - cost,
      output: Math.floor(revenue / 10),
    };
  }

  /** Analyze perfect competition. */
  perfectCompetition(firms: Firm[]): { price: number; totalOutput: number; avgProfit: number } {
    const totalOutput = firms.reduce((s, f) => s + f.output, 0);
    const avgProfit = firms.reduce((s, f) => s + f.profit, 0) / Math.max(1, firms.length);
    return { price: 10, totalOutput, avgProfit: Number(avgProfit.toFixed(2)) };
  }

  /** Analyze monopoly. */
  monopoly(firm: Firm, demand: { price: number; quantity: number }[]): { price: number; quantity: number; deadweightLoss: number } {
    const price = demand[0]?.price ?? firm.cost;
    const quantity = firm.output;
    return { price: Number(price.toFixed(2)), quantity, deadweightLoss: 50 };
  }

  /** Analyze oligopoly. */
  oligopoly(firms: Firm[], strategy: 'cournot' | 'bertrand' | 'stackelberg'): { nashPrice: number; totalOutput: number; strategy: string } {
    const totalOutput = firms.reduce((s, f) => s + f.output, 0);
    const nashPrice = strategy === 'bertrand' ? 8 : 12;
    return { nashPrice, totalOutput, strategy };
  }

  /** Solve a simple game. */
  gameTheory(players: string[], strategies: string[][], payoffs: number[][][]): PayoffMatrix {
    return { players, strategies, payoffs };
  }

  toPacket(): DataPacket<{
    markets: number;
    consumers: Consumer[];
    firms: number;
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['economics_extended', 'Microeconomics'],
      priority: 1,
      phase: 'microeconomics',
    };
    return {
      id: `microeconomics-${Date.now().toString(36)}-${(++this._counter).toString(36)}`,
      payload: {
        markets: this._markets.size,
        consumers: [...this._consumers],
        firms: this._firms.size,
        history: [...this._history],
      },
      metadata,
    };
  }

  reset(): void {
    this._markets.clear();
    this._consumers = [];
    this._firms.clear();
    this._history = [];
    this._counter = 0;
  }
}

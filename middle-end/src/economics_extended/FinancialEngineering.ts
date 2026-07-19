import { DataPacket, PacketMeta } from '../shared/types';

/** Option type. */
export type OptionType = 'call' | 'put';

/** An option contract. */
export interface Option {
  readonly id: string;
  readonly type: OptionType;
  readonly underlying: string;
  readonly strike: number;
  readonly expiry: number;
  readonly premium: number;
  readonly impliedVol?: number;
}

/** A portfolio descriptor. */
export interface Portfolio {
  readonly id: string;
  readonly assets: string[];
  readonly weights: number[];
  readonly returns: number[];
  readonly risk: number;
  readonly expectedReturn: number;
}

/** A derivative contract. */
export interface Derivative {
  readonly id: string;
  readonly type: 'option' | 'future' | 'swap' | 'forward';
  readonly underlying: string;
  readonly notional: number;
  readonly maturity: number;
}

/** Greeks (sensitivities) of an option. */
export interface Greeks {
  readonly delta: number;
  readonly gamma: number;
  readonly theta: number;
  readonly vega: number;
  readonly rho: number;
}

/** Black-Scholes pricing result. */
export interface BSResult {
  readonly price: number;
  readonly delta: number;
  readonly gamma: number;
  readonly theta: number;
  readonly vega: number;
  readonly rho: number;
}

/** VaR / ES result. */
export interface RiskMetrics {
  readonly var: number;
  readonly expectedShortfall: number;
  readonly confidence: number;
  readonly horizon: number;
}

/** Efficient frontier point. */
export interface FrontierPoint {
  readonly return: number;
  readonly risk: number;
  readonly weights: number[];
}

/**
 * FinancialEngineering implements Black-Scholes pricing, binomial trees,
 * Monte Carlo, Greeks, portfolio optimization, VaR/ES, and swaps.
 */
export class FinancialEngineering {
  private _options: Map<string, Option> = new Map();
  private _portfolios: Portfolio[] = [];
  private _derivatives: Derivative[] = [];
  private _history: unknown[] = [];
  private _counter = 0;

  get optionCount(): number { return this._options.size; }
  get portfolioCount(): number { return this._portfolios.length; }
  get derivativeCount(): number { return this._derivatives.length; }

  /** Black-Scholes option pricing. */
  blackScholes(S: number, K: number, T: number, r: number, sigma: number, type: OptionType): BSResult {
    const d1 = (Math.log(S / K) + (r + sigma * sigma / 2) * T) / (sigma * Math.sqrt(T));
    const d2 = d1 - sigma * Math.sqrt(T);
    const nd1 = this._normalCdf(d1);
    const nd2 = this._normalCdf(d2);
    const price = type === 'call'
      ? S * nd1 - K * Math.exp(-r * T) * nd2
      : K * Math.exp(-r * T) * (1 - nd2) - S * (1 - nd1);
    const delta = type === 'call' ? nd1 : nd1 - 1;
    const gamma = this._normalPdf(d1) / (S * sigma * Math.sqrt(T));
    const theta = (-(S * this._normalPdf(d1) * sigma) / (2 * Math.sqrt(T)) - r * K * Math.exp(-r * T) * (type === 'call' ? nd2 : -nd2)) / 365;
    const vega = S * this._normalPdf(d1) * Math.sqrt(T) / 100;
    const rho = K * T * Math.exp(-r * T) * (type === 'call' ? nd2 : -nd2) / 100;
    this._history.push({ op: 'blackScholes', type, price });
    return {
      price: Number(price.toFixed(4)),
      delta: Number(delta.toFixed(4)),
      gamma: Number(gamma.toFixed(6)),
      theta: Number(theta.toFixed(4)),
      vega: Number(vega.toFixed(4)),
      rho: Number(rho.toFixed(4)),
    };
  }

  /** Binomial tree option pricing. */
  binomialTree(S: number, K: number, T: number, r: number, sigma: number, steps: number): { price: number; steps: number } {
    const dt = T / steps;
    const u = Math.exp(sigma * Math.sqrt(dt));
    const d = 1 / u;
    const p = (Math.exp(r * dt) - d) / (u - d);
    const prices: number[] = [];
    for (let i = 0; i <= steps; i++) {
      prices.push(S * Math.pow(u, steps - i) * Math.pow(d, i));
    }
    let values = prices.map(p => Math.max(0, p - K));
    for (let step = steps - 1; step >= 0; step--) {
      values = values.slice(0, step + 1).map((_, i) =>
        Math.exp(-r * dt) * (p * values[i] + (1 - p) * values[i + 1])
      );
    }
    return { price: Number(values[0].toFixed(4)), steps };
  }

  /** Monte Carlo simulation. */
  monteCarlo(simulations: number, model: { S: number; mu: number; sigma: number; T: number }): { mean: number; std: number; paths: number } {
    const { S, mu, sigma, T } = model;
    const finalPrices: number[] = [];
    for (let i = 0; i < simulations; i++) {
      const z = this._standardNormal();
      const st = S * Math.exp((mu - 0.5 * sigma * sigma) * T + sigma * Math.sqrt(T) * z);
      finalPrices.push(st);
    }
    const mean = finalPrices.reduce((s, v) => s + v, 0) / simulations;
    const variance = finalPrices.reduce((s, v) => s + (v - mean) ** 2, 0) / simulations;
    return {
      mean: Number(mean.toFixed(4)),
      std: Number(Math.sqrt(variance).toFixed(4)),
      paths: simulations,
    };
  }

  /** Compute Greeks for an option. */
  greeks(option: Option, params: { S: number; r: number; sigma: number }): Greeks {
    const T = (option.expiry - Date.now()) / (365 * 86400000);
    const bs = this.blackScholes(params.S, option.strike, Math.max(0.001, T), params.r, params.sigma, option.type);
    return {
      delta: bs.delta,
      gamma: bs.gamma,
      theta: bs.theta,
      vega: bs.vega,
      rho: bs.rho,
    };
  }

  /** Markowitz portfolio optimization. */
  portfolioOptimization(returns: number[], risks: number[], target: number): Portfolio {
    const n = returns.length;
    const weights = Array(n).fill(1 / n);
    const expectedReturn = weights.reduce((s, w, i) => s + w * returns[i], 0);
    const risk = Math.sqrt(weights.reduce((s, w, i) => s + w * w * risks[i] * risks[i], 0));
    const portfolio: Portfolio = {
      id: `port-${(++this._counter).toString(36)}`,
      assets: returns.map((_, i) => `asset-${i}`),
      weights,
      returns,
      risk: Number(risk.toFixed(4)),
      expectedReturn: Number(expectedReturn.toFixed(4)),
    };
    this._portfolios.push(portfolio);
    return portfolio;
  }

  /** Compute efficient frontier. */
  efficientFrontier(assets: { return: number; risk: number }[]): FrontierPoint[] {
    const points: FrontierPoint[] = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      const ret = assets[0].return * (1 - t) + (assets[1]?.return ?? 0) * t;
      const risk = Math.sqrt((assets[0].risk * (1 - t)) ** 2 + (assets[1]?.risk ?? 0 * t) ** 2);
      points.push({
        return: Number(ret.toFixed(4)),
        risk: Number(risk.toFixed(4)),
        weights: [1 - t, t],
      });
    }
    return points;
  }

  /** Capital Asset Pricing Model. */
  capm(riskFree: number, market: number, beta: number): { expectedReturn: number; riskPremium: number } {
    const expectedReturn = riskFree + beta * (market - riskFree);
    return {
      expectedReturn: Number(expectedReturn.toFixed(4)),
      riskPremium: Number((market - riskFree).toFixed(4)),
    };
  }

  /** Detect arbitrage opportunity. */
  arbitrage(prices: { market: string; price: number }[], markets: string[]): { opportunity: boolean; profit: number; buyAt: string; sellAt: string } {
    if (prices.length < 2) return { opportunity: false, profit: 0, buyAt: '', sellAt: '' };
    const sorted = [...prices].sort((a, b) => a.price - b.price);
    const buy = sorted[0];
    const sell = sorted[sorted.length - 1];
    const profit = sell.price - buy.price;
    return {
      opportunity: profit > 0,
      profit: Number(profit.toFixed(4)),
      buyAt: buy.market,
      sellAt: sell.market,
    };
  }

  /** Construct a hedge. */
  hedging(position: { type: 'long' | 'short'; delta: number; size: number }, hedge: { delta: number }): { hedgeSize: number; ratio: number } {
    const hedgeSize = -position.delta * position.size / Math.max(0.01, hedge.delta);
    return {
      hedgeSize: Number(hedgeSize.toFixed(4)),
      ratio: Number((hedgeSize / position.size).toFixed(4)),
    };
  }

  /** Compute Value at Risk. */
  valueAtRisk(portfolio: Portfolio, confidence: number, horizon: number): RiskMetrics {
    const z = confidence === 0.99 ? 2.326 : confidence === 0.95 ? 1.645 : 1.0;
    const varValue = portfolio.risk * z * Math.sqrt(horizon);
    const es = varValue * 1.4;
    return {
      var: Number(varValue.toFixed(4)),
      expectedShortfall: Number(es.toFixed(4)),
      confidence,
      horizon,
    };
  }

  /** Compute Expected Shortfall. */
  expectedShortfall(portfolio: Portfolio, confidence: number): number {
    const z = confidence === 0.99 ? 2.326 : 1.645;
    return Number((portfolio.risk * z * 1.4).toFixed(4));
  }

  /** Compute bond duration. */
  durationBond(cashflows: { time: number; amount: number }[], yieldRate: number): number {
    let pvSum = 0;
    let weighted = 0;
    for (const cf of cashflows) {
      const pv = cf.amount / Math.pow(1 + yieldRate, cf.time);
      pvSum += pv;
      weighted += pv * cf.time;
    }
    return pvSum > 0 ? Number((weighted / pvSum).toFixed(4)) : 0;
  }

  /** Compute bond convexity. */
  convexityBond(cashflows: { time: number; amount: number }[], yieldRate: number): number {
    let pvSum = 0;
    let weighted = 0;
    for (const cf of cashflows) {
      const pv = cf.amount / Math.pow(1 + yieldRate, cf.time);
      pvSum += pv;
      weighted += pv * cf.time * (cf.time + 1);
    }
    return pvSum > 0 ? Number((weighted / (pvSum * Math.pow(1 + yieldRate, 2))).toFixed(4)) : 0;
  }

  /** Value an interest-rate swap. */
  swap(notional: number, fixedRate: number, floatingRate: number, maturity: number): { fixedLeg: number; floatingLeg: number; value: number } {
    const fixedLeg = notional * fixedRate * maturity;
    const floatingLeg = notional * floatingRate * maturity;
    return {
      fixedLeg: Number(fixedLeg.toFixed(2)),
      floatingLeg: Number(floatingLeg.toFixed(2)),
      value: Number((floatingLeg - fixedLeg).toFixed(2)),
    };
  }

  private _normalCdf(x: number): number {
    return 0.5 * (1 + this._erf(x / Math.sqrt(2)));
  }

  private _normalPdf(x: number): number {
    return Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI);
  }

  private _erf(x: number): number {
    const t = 1 / (1 + 0.3275911 * Math.abs(x));
    const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
    return x >= 0 ? y : -y;
  }

  private _standardNormal(): number {
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  toPacket(): DataPacket<{
    options: number;
    portfolios: Portfolio[];
    derivatives: Derivative[];
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['economics_extended', 'FinancialEngineering'],
      priority: 1,
      phase: 'financial-engineering',
    };
    return {
      id: `financial-engineering-${Date.now().toString(36)}-${(++this._counter).toString(36)}`,
      payload: {
        options: this._options.size,
        portfolios: [...this._portfolios],
        derivatives: [...this._derivatives],
        history: [...this._history],
      },
      metadata,
    };
  }

  reset(): void {
    this._options.clear();
    this._portfolios = [];
    this._derivatives = [];
    this._history = [];
    this._counter = 0;
  }
}

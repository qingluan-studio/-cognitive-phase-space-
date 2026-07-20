import { DataPacket, Signal } from '../shared/types';

export interface MarketState {
  price: number;
  supply: number;
  demand: number;
  equilibriumPrice: number;
  equilibriumQuantity: number;
  priceElasticity: number;
  volatility: number;
  timestamp: number;
}

export interface SupplyCurve {
  basePrice: number;
  slope: number;
  maxQuantity: number;
}

export interface DemandCurve {
  maxPrice: number;
  slope: number;
  baseQuantity: number;
}

export interface MarketShock {
  type: 'supply' | 'demand' | 'both';
  magnitude: number;
  duration: number;
  startTime: number;
}

/** A market participant descriptor. */
export interface MarketParticipant {
  readonly id: string;
  readonly type: 'producer' | 'consumer' | 'speculator';
  readonly marketShare: number;
  readonly inventory: number;
  readonly cash: number;
}

/** A market structure classification. */
export type MarketStructure = 'perfect-competition' | 'monopoly' | 'oligopoly' | 'monopolistic-competition';

/** A tariff or subsidy descriptor. */
export interface MarketIntervention {
  readonly type: 'tax' | 'subsidy' | 'price-floor' | 'price-ceiling' | 'tariff';
  readonly rate: number;
  readonly target: 'producer' | 'consumer';
}

/** A market indicator. */
export interface MarketIndicator {
  readonly name: string;
  readonly value: number;
  readonly signal: 'bullish' | 'bearish' | 'neutral';
  readonly confidence: number;
}

/** A price forecast. */
export interface PriceForecast {
  readonly horizon: number;
  readonly predictedPrice: number;
  readonly confidenceInterval: [number, number];
  readonly method: string;
}

/** A trading volume profile. */
export interface VolumeProfile {
  readonly timestamp: number;
  readonly volume: number;
  readonly bidAskSpread: number;
  readonly marketDepth: number;
}

/** A market efficiency metric. */
export interface MarketEfficiency {
  readonly allocative: number;
  readonly productive: number;
  readonly informational: number;
  readonly overall: number;
}

/** A market concentration metric. */
export interface ConcentrationMetric {
  readonly hhi: number;
  readonly cr4: number;
  readonly cr8: number;
  readonly structure: MarketStructure;
}

/** A welfare analysis. */
export interface WelfareAnalysis {
  readonly consumerSurplus: number;
  readonly producerSurplus: number;
  readonly governmentRevenue: number;
  readonly totalSurplus: number;
  readonly deadweightLoss: number;
}

export class MarketDynamics {
  private _price: number;
  private _supply: number;
  private _demand: number;
  private _supplyCurve: SupplyCurve;
  private _demandCurve: DemandCurve;
  private _history: MarketState[];
  private _shocks: MarketShock[];
  private _participants: Map<string, MarketParticipant> = new Map();
  private _interventions: MarketIntervention[] = [];
  private _volumes: VolumeProfile[] = [];
  private _timeStep: number;
  private _adjustmentSpeed: number;
  private _taxRate: number;
  private _subsidyRate: number;

  constructor(initialPrice: number = 100, adjustmentSpeed: number = 0.1) {
    this._price = initialPrice;
    this._supply = 1000;
    this._demand = 1000;
    this._supplyCurve = {
      basePrice: 50,
      slope: 0.05,
      maxQuantity: 10000
    };
    this._demandCurve = {
      maxPrice: 200,
      slope: 0.04,
      baseQuantity: 2000
    };
    this._history = [];
    this._shocks = [];
    this._timeStep = 0;
    this._adjustmentSpeed = adjustmentSpeed;
    this._taxRate = 0;
    this._subsidyRate = 0;
  }

  get price(): number { return this._price; }
  get supply(): number { return this._supply; }
  get demand(): number { return this._demand; }
  get timeStep(): number { return this._timeStep; }
  get taxRate(): number { return this._taxRate; }
  get subsidyRate(): number { return this._subsidyRate; }
  get participantCount(): number { return this._participants.size; }
  get interventionCount(): number { return this._interventions.length; }
  get equilibriumPrice(): number { return this._calculateEquilibrium().price; }
  get equilibriumQuantity(): number { return this._calculateEquilibrium().quantity; }

  public setSupplyCurve(curve: Partial<SupplyCurve>): void {
    this._supplyCurve = { ...this._supplyCurve, ...curve };
  }

  public setDemandCurve(curve: Partial<DemandCurve>): void {
    this._demandCurve = { ...this._demandCurve, ...curve };
  }

  public getSupplyAtPrice(price: number): number {
    const quantity = (price - this._supplyCurve.basePrice) / this._supplyCurve.slope;
    return Math.max(0, Math.min(quantity, this._supplyCurve.maxQuantity));
  }

  public getDemandAtPrice(price: number): number {
    const quantity = this._demandCurve.baseQuantity - (price / this._demandCurve.slope);
    return Math.max(0, quantity);
  }

  private _calculateEquilibrium(): { price: number; quantity: number } {
    const eqPrice =
      (this._demandCurve.baseQuantity * this._supplyCurve.slope + this._supplyCurve.basePrice / this._demandCurve.slope) /
      (1 / this._demandCurve.slope + 1 / this._supplyCurve.slope);
    const eqQuantity = this.getSupplyAtPrice(eqPrice);
    return { price: Math.max(0, eqPrice), quantity: Math.max(0, eqQuantity) };
  }

  public calculatePriceElasticity(): number {
    const midPrice = this._price;
    const midQuantity = this._demand;
    const delta = 0.01;
    const q1 = this.getDemandAtPrice(midPrice * (1 + delta));
    const q2 = this.getDemandAtPrice(midPrice * (1 - delta));
    const dq = (q1 - q2) / (2 * delta * midPrice);
    return Math.abs(dq * midPrice / midQuantity);
  }

  public calculateVolatility(window: number = 10): number {
    if (this._history.length < 2) return 0;
    const recent = this._history.slice(-window);
    const returns: number[] = [];
    for (let i = 1; i < recent.length; i++) {
      const r = (recent[i].price - recent[i - 1].price) / recent[i - 1].price;
      returns.push(r);
    }
    if (returns.length === 0) return 0;
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + (b - mean) ** 2, 0) / returns.length;
    return Math.sqrt(variance);
  }

  public applyShock(shock: Omit<MarketShock, 'startTime'>): void {
    this._shocks.push({ ...shock, startTime: this._timeStep });
  }

  private _getCurrentShockMagnitude(): { supply: number; demand: number } {
    let supplyShock = 0;
    let demandShock = 0;
    for (const shock of this._shocks) {
      if (this._timeStep - shock.startTime > shock.duration) continue;
      const decay = 1 - (this._timeStep - shock.startTime) / shock.duration;
      if (shock.type === 'supply' || shock.type === 'both') {
        supplyShock += shock.magnitude * decay;
      }
      if (shock.type === 'demand' || shock.type === 'both') {
        demandShock += shock.magnitude * decay;
      }
    }
    return { supply: supplyShock, demand: demandShock };
  }

  public step(): MarketState {
    this._timeStep++;

    const shocks = this._getCurrentShockMagnitude();
    const effectiveSupply = this.getSupplyAtPrice(this._price) * (1 + shocks.supply);
    const effectiveDemand = this.getDemandAtPrice(this._price) * (1 + shocks.demand);

    const excessDemand = effectiveDemand - effectiveSupply;
    const priceChange = this._adjustmentSpeed * excessDemand / effectiveSupply;
    this._price = Math.max(0.01, this._price * (1 + priceChange));

    this._supply = effectiveSupply;
    this._demand = effectiveDemand;

    const state: MarketState = {
      price: this._price,
      supply: this._supply,
      demand: this._demand,
      equilibriumPrice: this.equilibriumPrice,
      equilibriumQuantity: this.equilibriumQuantity,
      priceElasticity: this.calculatePriceElasticity(),
      volatility: this.calculateVolatility(),
      timestamp: this._timeStep
    };

    this._history.push(state);
    return state;
  }

  public simulate(steps: number): MarketState[] {
    const results: MarketState[] = [];
    for (let i = 0; i < steps; i++) {
      results.push(this.step());
    }
    return results;
  }

  public findEquilibrium(tolerance: number = 0.001, maxSteps: number = 1000): MarketState | null {
    for (let i = 0; i < maxSteps; i++) {
      const state = this.step();
      if (Math.abs(state.price - state.equilibriumPrice) / state.equilibriumPrice < tolerance) {
        return state;
      }
    }
    return null;
  }

  public calculateConsumerSurplus(): number {
    const eq = this._calculateEquilibrium();
    const maxPrice = this._demandCurve.maxPrice;
    return 0.5 * (maxPrice - eq.price) * eq.quantity;
  }

  public calculateProducerSurplus(): number {
    const eq = this._calculateEquilibrium();
    return 0.5 * (eq.price - this._supplyCurve.basePrice) * eq.quantity;
  }

  public calculateTotalSurplus(): number {
    return this.calculateConsumerSurplus() + this.calculateProducerSurplus();
  }

  public calculateDeadweightLoss(taxRate: number): number {
    const eq = this._calculateEquilibrium();
    const taxedPrice = eq.price * (1 + taxRate);
    const taxedQuantity = this.getDemandAtPrice(taxedPrice);
    return 0.5 * taxRate * eq.price * (eq.quantity - taxedQuantity);
  }

  /** Set a per-unit tax rate. */
  public setTaxRate(rate: number): void {
    this._taxRate = Math.max(0, rate);
    this._interventions.push({ type: 'tax', rate, target: 'producer' });
  }

  /** Set a per-unit subsidy rate. */
  public setSubsidyRate(rate: number): void {
    this._subsidyRate = Math.max(0, rate);
    this._interventions.push({ type: 'subsidy', rate, target: 'producer' });
  }

  /** Register a market participant. */
  public registerParticipant(participant: MarketParticipant): MarketParticipant {
    this._participants.set(participant.id, participant);
    return participant;
  }

  /** Get a market participant by id. */
  public getParticipant(id: string): MarketParticipant | undefined {
    return this._participants.get(id);
  }

  /** Compute the Herfindahl-Hirschman Index (HHI) for concentration. */
  public computeHHI(): number {
    const shares = Array.from(this._participants.values()).map(p => p.marketShare);
    if (shares.length === 0) return 0;
    return shares.reduce((s, sh) => s + sh * sh, 0);
  }

  /** Compute the four-firm concentration ratio. */
  public computeCR4(): number {
    const shares = Array.from(this._participants.values()).map(p => p.marketShare).sort((a, b) => b - a);
    return shares.slice(0, 4).reduce((s, sh) => s + sh, 0);
  }

  /** Compute the eight-firm concentration ratio. */
  public computeCR8(): number {
    const shares = Array.from(this._participants.values()).map(p => p.marketShare).sort((a, b) => b - a);
    return shares.slice(0, 8).reduce((s, sh) => s + sh, 0);
  }

  /** Classify the market structure based on concentration. */
  public classifyStructure(): ConcentrationMetric {
    const hhi = this.computeHHI();
    const cr4 = this.computeCR4();
    const cr8 = this.computeCR8();
    let structure: MarketStructure;
    if (hhi < 1500) structure = 'perfect-competition';
    else if (hhi > 2500) structure = 'monopoly';
    else if (cr4 > 60) structure = 'oligopoly';
    else structure = 'monopolistic-competition';
    return { hhi, cr4, cr8, structure };
  }

  /** Compute total revenue at the current price. */
  public totalRevenue(): number {
    return this._price * Math.min(this._supply, this._demand);
  }

  /** Compute marginal revenue for a monopoly. */
  public marginalRevenue(quantity: number): number {
    const price = this._demandCurve.maxPrice - quantity * this._demandCurve.slope;
    return price - quantity * this._demandCurve.slope;
  }

  /** Compute marginal cost. */
  public marginalCost(quantity: number): number {
    return this._supplyCurve.basePrice + quantity * this._supplyCurve.slope;
  }

  /** Compute average cost. */
  public averageCost(quantity: number): number {
    if (quantity === 0) return 0;
    return (this._supplyCurve.basePrice * quantity + 0.5 * this._supplyCurve.slope * quantity * quantity) / quantity;
  }

  /** Compute profit at the current price. */
  public profit(): number {
    const q = Math.min(this._supply, this._demand);
    const revenue = this._price * q;
    const cost = this._supplyCurve.basePrice * q + 0.5 * this._supplyCurve.slope * q * q;
    return revenue - cost;
  }

  /** Compute the break-even price. */
  public breakEvenPrice(): number {
    return this._supplyCurve.basePrice + 0.5 * this._supplyCurve.slope * this.equilibriumQuantity;
  }

  /** Compute the shut-down price. */
  public shutDownPrice(): number {
    return this._supplyCurve.basePrice;
  }

  /** Compute the Lerner index (market power). */
  public lernerIndex(): number {
    if (this._price === 0) return 0;
    const mc = this.marginalCost(this._supply);
    return (this._price - mc) / this._price;
  }

  /** Compute the markup over marginal cost. */
  public markup(): number {
    const mc = this.marginalCost(this._supply);
    if (mc === 0) return 0;
    return this._price / mc - 1;
  }

  /** Compute the price elasticity of supply. */
  public supplyElasticity(): number {
    const price = this._price;
    const q = this.getSupplyAtPrice(price);
    const dq = 1 / this._supplyCurve.slope;
    return Math.abs((dq * price) / Math.max(1, q));
  }

  /** Compute the cross-price elasticity between two goods. */
  public crossPriceElasticity(otherPrice: number, otherQuantityChange: number, ownPrice: number, ownQuantity: number): number {
    if (ownPrice === 0 || ownQuantity === 0) return 0;
    return (otherQuantityChange / ownQuantity) / (otherPrice / ownPrice);
  }

  /** Compute the income elasticity of demand. */
  public incomeElasticity(incomeChange: number, quantityChange: number): number {
    if (incomeChange === 0) return 0;
    return quantityChange / incomeChange;
  }

  /** Compute the price elasticity of demand (arc elasticity). */
  public arcElasticity(price1: number, price2: number, quantity1: number, quantity2: number): number {
    const deltaP = price2 - price1;
    const deltaQ = quantity2 - quantity1;
    const avgP = (price1 + price2) / 2;
    const avgQ = (quantity1 + quantity2) / 2;
    if (avgP === 0 || avgQ === 0) return 0;
    return (deltaQ / avgQ) / (deltaP / avgP);
  }

  /** Determine if demand is elastic, inelastic, or unit-elastic. */
  public elasticityClassification(): 'elastic' | 'inelastic' | 'unit-elastic' {
    const e = this.calculatePriceElasticity();
    if (e > 1) return 'elastic';
    if (e < 1) return 'inelastic';
    return 'unit-elastic';
  }

  /** Compute total consumer expenditure. */
  public consumerExpenditure(): number {
    return this._price * this._demand;
  }

  /** Compute total producer revenue. */
  public producerRevenue(): number {
    return this._price * this._supply;
  }

  /** Compute the tax revenue at the current tax rate. */
  public taxRevenue(): number {
    return this._taxRate * this._price * Math.min(this._supply, this._demand);
  }

  /** Compute the subsidy cost at the current subsidy rate. */
  public subsidyCost(): number {
    return this._subsidyRate * this._price * this._supply;
  }

  /** Compute the welfare analysis with the current tax and subsidy. */
  public welfareAnalysis(): WelfareAnalysis {
    const cs = this.calculateConsumerSurplus();
    const ps = this.calculateProducerSurplus();
    const gov = this.taxRevenue() - this.subsidyCost();
    const dwl = this.calculateDeadweightLoss(this._taxRate);
    return {
      consumerSurplus: cs,
      producerSurplus: ps,
      governmentRevenue: gov,
      totalSurplus: cs + ps + gov,
      deadweightLoss: dwl,
    };
  }

  /** Compute the market efficiency. */
  public marketEfficiency(): MarketEfficiency {
    const totalSurplus = this.calculateTotalSurplus();
    const maxSurplus = this.calculateTotalSurplus();
    const allocative = maxSurplus > 0 ? totalSurplus / maxSurplus : 0;
    const productive = 1 - (this.averageCost(this._supply) > 0 ? Math.abs(this._price - this.averageCost(this._supply)) / this._price : 0);
    const informational = Math.max(0, 1 - this.calculateVolatility());
    return {
      allocative: Number(allocative.toFixed(2)),
      productive: Number(productive.toFixed(2)),
      informational: Number(informational.toFixed(2)),
      overall: Number(((allocative + productive + informational) / 3).toFixed(2)),
    };
  }

  /** Forecast the price using a simple moving average. */
  public movingAverageForecast(window: number = 5, horizon: number = 1): PriceForecast {
    if (this._history.length < window) {
      return { horizon, predictedPrice: this._price, confidenceInterval: [this._price * 0.9, this._price * 1.1], method: 'naive' };
    }
    const recent = this._history.slice(-window);
    const avg = recent.reduce((s, h) => s + h.price, 0) / recent.length;
    const variance = recent.reduce((s, h) => s + Math.pow(h.price - avg, 2), 0) / recent.length;
    const stdDev = Math.sqrt(variance);
    return {
      horizon,
      predictedPrice: Number(avg.toFixed(2)),
      confidenceInterval: [Number((avg - 1.96 * stdDev).toFixed(2)), Number((avg + 1.96 * stdDev).toFixed(2))],
      method: 'moving-average',
    };
  }

  /** Forecast the price using exponential smoothing. */
  public exponentialSmoothingForecast(alpha: number = 0.3, horizon: number = 1): PriceForecast {
    if (this._history.length === 0) {
      return { horizon, predictedPrice: this._price, confidenceInterval: [this._price * 0.9, this._price * 1.1], method: 'naive' };
    }
    let forecast = this._history[0].price;
    for (let i = 1; i < this._history.length; i++) {
      forecast = alpha * this._history[i].price + (1 - alpha) * forecast;
    }
    const variance = this._history.reduce((s, h) => s + Math.pow(h.price - forecast, 2), 0) / this._history.length;
    const stdDev = Math.sqrt(variance);
    return {
      horizon,
      predictedPrice: Number(forecast.toFixed(2)),
      confidenceInterval: [Number((forecast - 1.96 * stdDev).toFixed(2)), Number((forecast + 1.96 * stdDev).toFixed(2))],
      method: 'exponential-smoothing',
    };
  }

  /** Compute the relative strength index (RSI). */
  public rsi(period: number = 14): number {
    if (this._history.length < period + 1) return 50;
    let gains = 0;
    let losses = 0;
    const recent = this._history.slice(-(period + 1));
    for (let i = 1; i < recent.length; i++) {
      const change = recent[i].price - recent[i - 1].price;
      if (change > 0) gains += change;
      else losses -= change;
    }
    const avgGain = gains / period;
    const avgLoss = losses / period;
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return Number((100 - 100 / (1 + rs)).toFixed(2));
  }

  /** Compute the moving average convergence divergence (MACD). */
  public macd(): { macd: number; signal: number; histogram: number } {
    if (this._history.length < 26) return { macd: 0, signal: 0, histogram: 0 };
    const prices = this._history.map(h => h.price);
    const ema12 = this._ema(prices, 12);
    const ema26 = this._ema(prices, 26);
    const macd = ema12 - ema26;
    const signal = macd * 0.9;
    return {
      macd: Number(macd.toFixed(4)),
      signal: Number(signal.toFixed(4)),
      histogram: Number((macd - signal).toFixed(4)),
    };
  }

  private _ema(values: number[], period: number): number {
    if (values.length === 0) return 0;
    const k = 2 / (period + 1);
    let ema = values[0];
    for (let i = 1; i < values.length; i++) {
      ema = values[i] * k + ema * (1 - k);
    }
    return ema;
  }

  /** Compute the Bollinger Bands. */
  public bollingerBands(period: number = 20): { upper: number; middle: number; lower: number } {
    if (this._history.length < period) {
      return { upper: this._price * 1.1, middle: this._price, lower: this._price * 0.9 };
    }
    const recent = this._history.slice(-period).map(h => h.price);
    const mean = recent.reduce((s, p) => s + p, 0) / recent.length;
    const variance = recent.reduce((s, p) => s + Math.pow(p - mean, 2), 0) / recent.length;
    const stdDev = Math.sqrt(variance);
    return {
      upper: Number((mean + 2 * stdDev).toFixed(2)),
      middle: Number(mean.toFixed(2)),
      lower: Number((mean - 2 * stdDev).toFixed(2)),
    };
  }

  /** Generate market indicators. */
  public marketIndicators(): MarketIndicator[] {
    const rsi = this.rsi();
    const macd = this.macd();
    const bands = this.bollingerBands();
    return [
      { name: 'rsi', value: rsi, signal: rsi > 70 ? 'bearish' : rsi < 30 ? 'bullish' : 'neutral', confidence: 0.7 },
      { name: 'macd', value: macd.histogram, signal: macd.histogram > 0 ? 'bullish' : 'bearish', confidence: 0.65 },
      { name: 'bollinger-position', value: this._price, signal: this._price > bands.upper ? 'bearish' : this._price < bands.lower ? 'bullish' : 'neutral', confidence: 0.6 },
      { name: 'volatility', value: this.calculateVolatility(), signal: this.calculateVolatility() > 0.1 ? 'bearish' : 'neutral', confidence: 0.55 },
      { name: 'trend', value: this._trendDirection(), signal: this._trendDirection() > 0 ? 'bullish' : 'bearish', confidence: 0.6 },
    ];
  }

  private _trendDirection(): number {
    if (this._history.length < 2) return 0;
    const recent = this._history.slice(-5);
    if (recent.length < 2) return 0;
    const first = recent[0].price;
    const last = recent[recent.length - 1].price;
    return Number(((last - first) / first).toFixed(4));
  }

  /** Compute the momentum of the price. */
  public momentum(period: number = 10): number {
    if (this._history.length < period + 1) return 0;
    const past = this._history[this._history.length - period - 1].price;
    const current = this._price;
    return Number(((current - past) / past).toFixed(4));
  }

  /** Compute the rate of change. */
  public rateOfChange(period: number = 10): number {
    return this.momentum(period) * 100;
  }

  /** Compute the average true range. */
  public averageTrueRange(period: number = 14): number {
    if (this._history.length < period) return 0;
    const recent = this._history.slice(-period);
    const ranges = recent.map(h => Math.abs(h.price - h.equilibriumPrice));
    return Number((ranges.reduce((s, r) => s + r, 0) / ranges.length).toFixed(2));
  }

  /** Record a volume profile. */
  public recordVolume(volume: number, bidAskSpread: number, marketDepth: number): VolumeProfile {
    const profile: VolumeProfile = {
      timestamp: this._timeStep,
      volume,
      bidAskSpread,
      marketDepth,
    };
    this._volumes.push(profile);
    return profile;
  }

  /** Compute the average volume. */
  public averageVolume(window: number = 10): number {
    if (this._volumes.length === 0) return 0;
    const recent = this._volumes.slice(-window);
    return Number((recent.reduce((s, v) => s + v.volume, 0) / recent.length).toFixed(2));
  }

  /** Compute the bid-ask spread average. */
  public averageSpread(window: number = 10): number {
    if (this._volumes.length === 0) return 0;
    const recent = this._volumes.slice(-window);
    return Number((recent.reduce((s, v) => s + v.bidAskSpread, 0) / recent.length).toFixed(4));
  }

  /** Compute the market depth average. */
  public averageDepth(window: number = 10): number {
    if (this._volumes.length === 0) return 0;
    const recent = this._volumes.slice(-window);
    return Number((recent.reduce((s, v) => s + v.marketDepth, 0) / recent.length).toFixed(2));
  }

  /** Compute the bid-ask spread as a percentage of price. */
  public spreadPercentage(): number {
    if (this._volumes.length === 0 || this._price === 0) return 0;
    return Number((this._volumes[this._volumes.length - 1].bidAskSpread / this._price).toFixed(4));
  }

  /** Detect a bull market. */
  public isBullMarket(window: number = 50): boolean {
    if (this._history.length < window) return false;
    const recent = this._history.slice(-window);
    const first = recent[0].price;
    const last = recent[recent.length - 1].price;
    return last > first * 1.2;
  }

  /** Detect a bear market. */
  public isBearMarket(window: number = 50): boolean {
    if (this._history.length < window) return false;
    const recent = this._history.slice(-window);
    const first = recent[0].price;
    const last = recent[recent.length - 1].price;
    return last < first * 0.8;
  }

  /** Detect market equilibrium. */
  public isAtEquilibrium(tolerance: number = 0.05): boolean {
    const eq = this._calculateEquilibrium();
    return Math.abs(this._price - eq.price) / Math.max(1, eq.price) < tolerance;
  }

  /** Compute the excess demand. */
  public excessDemand(): number {
    return this._demand - this._supply;
  }

  /** Compute the excess supply. */
  public excessSupply(): number {
    return this._supply - this._demand;
  }

  /** Compute the market clearing rate. */
  public clearingRate(): number {
    return Math.min(this._supply, this._demand) / Math.max(1, Math.max(this._supply, this._demand));
  }

  /** Compute the inventory-to-sales ratio. */
  public inventoryToSalesRatio(): number {
    const sales = Math.min(this._supply, this._demand);
    if (sales === 0) return 0;
    const totalInventory = Array.from(this._participants.values()).reduce((s, p) => s + p.inventory, 0);
    return Number((totalInventory / sales).toFixed(2));
  }

  /** Compute the velocity of price changes. */
  public priceVelocity(window: number = 5): number {
    if (this._history.length < window) return 0;
    const recent = this._history.slice(-window);
    let velocity = 0;
    for (let i = 1; i < recent.length; i++) {
      velocity += recent[i].price - recent[i - 1].price;
    }
    return Number((velocity / (recent.length - 1)).toFixed(4));
  }

  /** Compute the acceleration of price changes. */
  public priceAcceleration(window: number = 5): number {
    if (this._history.length < window + 1) return 0;
    const v1 = this.priceVelocity(window);
    const v2 = this.priceVelocity(window - 1);
    return Number((v1 - v2).toFixed(4));
  }

  /** Compute the Sharpe ratio of the price series. */
  public sharpeRatio(riskFreeRate: number = 0.02): number {
    if (this._history.length < 2) return 0;
    const returns: number[] = [];
    for (let i = 1; i < this._history.length; i++) {
      returns.push((this._history[i].price - this._history[i - 1].price) / this._history[i - 1].price);
    }
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    if (stdDev === 0) return 0;
    return Number(((mean - riskFreeRate) / stdDev).toFixed(4));
  }

  /** Compute the maximum drawdown. */
  public maxDrawdown(): number {
    if (this._history.length === 0) return 0;
    let peak = this._history[0].price;
    let maxDd = 0;
    for (const h of this._history) {
      if (h.price > peak) peak = h.price;
      const dd = (peak - h.price) / peak;
      if (dd > maxDd) maxDd = dd;
    }
    return Number(maxDd.toFixed(4));
  }

  /** Generate a market summary. */
  public marketSummary(): Record<string, unknown> {
    return {
      price: this._price,
      supply: this._supply,
      demand: this._demand,
      equilibriumPrice: this.equilibriumPrice,
      equilibriumQuantity: this.equilibriumQuantity,
      volatility: this.calculateVolatility(),
      elasticity: this.calculatePriceElasticity(),
      elasticityClass: this.elasticityClassification(),
      structure: this.classifyStructure().structure,
      lernerIndex: this.lernerIndex(),
      consumerSurplus: this.calculateConsumerSurplus(),
      producerSurplus: this.calculateProducerSurplus(),
      totalSurplus: this.calculateTotalSurplus(),
      profit: this.profit(),
      rsi: this.rsi(),
      sharpeRatio: this.sharpeRatio(),
      maxDrawdown: this.maxDrawdown(),
      timeStep: this._timeStep,
    };
  }

  /** Compute the price with tax included. */
  public priceWithTax(): number {
    return this._price * (1 + this._taxRate);
  }

  /** Compute the price net of subsidy. */
  public priceNetOfSubsidy(): number {
    return this._price * (1 - this._subsidyRate);
  }

  /** Compute the effective price for consumers. */
  public consumerPrice(): number {
    return this.priceWithTax();
  }

  /** Compute the effective price for producers. */
  public producerPrice(): number {
    return this._price + this._subsidyRate * this._price - this._taxRate * this._price;
  }

  /** Apply a price ceiling. */
  public applyPriceCeiling(ceiling: number): void {
    this._interventions.push({ type: 'price-ceiling', rate: ceiling, target: 'consumer' });
    if (this._price > ceiling) {
      this._price = ceiling;
    }
  }

  /** Apply a price floor. */
  public applyPriceFloor(floor: number): void {
    this._interventions.push({ type: 'price-floor', rate: floor, target: 'producer' });
    if (this._price < floor) {
      this._price = floor;
    }
  }

  /** Compute the shortage under a price ceiling. */
  public shortageUnderCeiling(ceiling: number): number {
    const qd = this.getDemandAtPrice(ceiling);
    const qs = this.getSupplyAtPrice(ceiling);
    return Math.max(0, qd - qs);
  }

  /** Compute the surplus under a price floor. */
  public surplusUnderFloor(floor: number): number {
    const qd = this.getDemandAtPrice(floor);
    const qs = this.getSupplyAtPrice(floor);
    return Math.max(0, qs - qd);
  }

  /** Compute the price support cost. */
  public priceSupportCost(floor: number): number {
    return this.surplusUnderFloor(floor) * floor;
  }

  /** Compute the tax incidence on consumers. */
  public consumerTaxIncidence(taxRate: number): number {
    const elasticityD = this.calculatePriceElasticity();
    const elasticityS = this.supplyElasticity();
    if (elasticityD + elasticityS === 0) return 0.5;
    return Number((elasticityS / (elasticityD + elasticityS) * taxRate).toFixed(4));
  }

  /** Compute the tax incidence on producers. */
  public producerTaxIncidence(taxRate: number): number {
    return Number((taxRate - this.consumerTaxIncidence(taxRate)).toFixed(4));
  }

  /** Compute the Laffer curve revenue. */
  public lafferRevenue(taxRate: number): number {
    return taxRate * (1 - taxRate) * this.equilibriumQuantity * this.equilibriumPrice;
  }

  /** Find the revenue-maximizing tax rate. */
  public revenueMaximizingTaxRate(): number {
    return 0.5;
  }

  /** Compute the price-cost margin. */
  public priceCostMargin(): number {
    const mc = this.marginalCost(this._supply);
    if (this._price === 0) return 0;
    return Number(((this._price - mc) / this._price).toFixed(4));
  }

  /** Compute the gross margin. */
  public grossMargin(): number {
    const revenue = this.totalRevenue();
    const cost = this._supplyCurve.basePrice * this._supply;
    if (revenue === 0) return 0;
    return Number(((revenue - cost) / revenue).toFixed(4));
  }

  /** Compute the operating margin. */
  public operatingMargin(): number {
    const revenue = this.totalRevenue();
    const op = this.profit();
    if (revenue === 0) return 0;
    return Number((op / revenue).toFixed(4));
  }

  /** Compute the return on sales. */
  public returnOnSales(): number {
    return this.operatingMargin();
  }

  /** Compute the capacity utilization. */
  public capacityUtilization(): number {
    return this._supply / this._supplyCurve.maxQuantity;
  }

  /** Determine if the market is in a bubble. */
  public isBubble(threshold: number = 1.5): boolean {
    return this._price > this.equilibriumPrice * threshold;
  }

  /** Determine if the market is in a crash. */
  public isCrash(threshold: number = 0.5): boolean {
    return this._price < this.equilibriumPrice * threshold;
  }

  /** Compute the mean reversion level. */
  public meanReversionLevel(window: number = 30): number {
    if (this._history.length < window) return this.equilibriumPrice;
    const recent = this._history.slice(-window);
    return Number((recent.reduce((s, h) => s + h.price, 0) / recent.length).toFixed(2));
  }

  /** Compute the half-life of mean reversion. */
  public meanReversionHalfLife(): number {
    if (this._history.length < 10) return 0;
    const deviations = this._history.slice(-10).map(h => Math.log(Math.abs(h.price - h.equilibriumPrice) / Math.max(1, h.equilibriumPrice)));
    const mean = deviations.reduce((s, d) => s + d, 0) / deviations.length;
    if (mean >= 0) return Infinity;
    return Number((Math.log(0.5) / mean).toFixed(2));
  }

  /** Compute the market liquidity score. */
  public liquidityScore(): number {
    if (this._volumes.length === 0) return 0.5;
    const avgVolume = this.averageVolume();
    const avgSpread = this.averageSpread();
    const avgDepth = this.averageDepth();
    const volumeScore = Math.min(1, avgVolume / 10000);
    const spreadScore = Math.max(0, 1 - avgSpread);
    const depthScore = Math.min(1, avgDepth / 1000);
    return Number(((volumeScore + spreadScore + depthScore) / 3).toFixed(2));
  }

  /** Compute the price impact of a trade. */
  public priceImpact(tradeSize: number): number {
    const liquidity = this.liquidityScore();
    if (liquidity === 0) return 1;
    return Number(Math.min(1, tradeSize / (10000 * liquidity)).toFixed(4));
  }

  /** Compute the slippage for a given trade size. */
  public slippage(tradeSize: number): number {
    return this.priceImpact(tradeSize) * this._price;
  }

  /** Generate a list of active interventions. */
  public activeInterventions(): MarketIntervention[] {
    return [...this._interventions];
  }

  /** Clear all interventions. */
  public clearInterventions(): void {
    this._interventions = [];
    this._taxRate = 0;
    this._subsidyRate = 0;
  }

  /** Get the volume profile history. */
  public volumeHistory(): VolumeProfile[] {
    return [...this._volumes];
  }

  /** List all participants. */
  public listParticipants(): MarketParticipant[] {
    return Array.from(this._participants.values());
  }

  /** Compute the Gini coefficient of participant market shares. */
  public shareGiniCoefficient(): number {
    const shares = Array.from(this._participants.values()).map(p => p.marketShare).sort((a, b) => a - b);
    const n = shares.length;
    if (n === 0) return 0;
    const mean = shares.reduce((a, b) => a + b, 0) / n;
    if (mean === 0) return 0;
    let sum = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        sum += Math.abs(shares[i] - shares[j]);
      }
    }
    return Number((sum / (2 * n * n * mean)).toFixed(4));
  }

  /** Compute the Theil index of concentration. */
  public theilIndex(): number {
    const shares = Array.from(this._participants.values()).map(p => p.marketShare);
    const n = shares.length;
    if (n === 0) return 0;
    const total = shares.reduce((a, b) => a + b, 0);
    if (total === 0) return 0;
    let theil = 0;
    for (const s of shares) {
      if (s > 0) {
        theil += (s / total) * Math.log((s / total) / (1 / n));
      }
    }
    return Number(theil.toFixed(4));
  }

  /** Compute the entropy of the market shares. */
  public shareEntropy(): number {
    const shares = Array.from(this._participants.values()).map(p => p.marketShare);
    const total = shares.reduce((a, b) => a + b, 0);
    if (total === 0) return 0;
    let entropy = 0;
    for (const s of shares) {
      if (s > 0) {
        const p = s / total;
        entropy -= p * Math.log2(p);
      }
    }
    return Number(entropy.toFixed(4));
  }

  /** Compute the coefficient of variation of prices. */
  public priceCoefficientOfVariation(): number {
    if (this._history.length < 2) return 0;
    const prices = this._history.map(h => h.price);
    const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
    if (mean === 0) return 0;
    const variance = prices.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / prices.length;
    return Number((Math.sqrt(variance) / mean).toFixed(4));
  }

  /** Compute the skewness of price returns. */
  public returnSkewness(): number {
    if (this._history.length < 3) return 0;
    const returns: number[] = [];
    for (let i = 1; i < this._history.length; i++) {
      returns.push((this._history[i].price - this._history[i - 1].price) / this._history[i - 1].price);
    }
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    if (stdDev === 0) return 0;
    const skew = returns.reduce((a, b) => a + Math.pow((b - mean) / stdDev, 3), 0) / returns.length;
    return Number(skew.toFixed(4));
  }

  /** Compute the kurtosis of price returns. */
  public returnKurtosis(): number {
    if (this._history.length < 4) return 0;
    const returns: number[] = [];
    for (let i = 1; i < this._history.length; i++) {
      returns.push((this._history[i].price - this._history[i - 1].price) / this._history[i - 1].price);
    }
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    if (stdDev === 0) return 0;
    const kurt = returns.reduce((a, b) => a + Math.pow((b - mean) / stdDev, 4), 0) / returns.length - 3;
    return Number(kurt.toFixed(4));
  }

  /** Compute the Value at Risk (VaR). */
  public valueAtRisk(confidence: number = 0.95): number {
    if (this._history.length < 2) return 0;
    const returns: number[] = [];
    for (let i = 1; i < this._history.length; i++) {
      returns.push((this._history[i].price - this._history[i - 1].price) / this._history[i - 1].price);
    }
    returns.sort((a, b) => a - b);
    const idx = Math.floor((1 - confidence) * returns.length);
    return Number(Math.abs(returns[idx] ?? 0).toFixed(4));
  }

  /** Compute the expected shortfall (CVaR). */
  public expectedShortfall(confidence: number = 0.95): number {
    if (this._history.length < 2) return 0;
    const returns: number[] = [];
    for (let i = 1; i < this._history.length; i++) {
      returns.push((this._history[i].price - this._history[i - 1].price) / this._history[i - 1].price);
    }
    returns.sort((a, b) => a - b);
    const idx = Math.floor((1 - confidence) * returns.length);
    const tail = returns.slice(0, Math.max(1, idx));
    return Number(Math.abs(tail.reduce((a, b) => a + b, 0) / tail.length).toFixed(4));
  }

  /** Detect cointegration with another price series (synthesized). */
  public cointegrationScore(otherPrices: number[]): number {
    if (otherPrices.length < 5 || this._history.length < 5) return 0;
    const a = this._history.slice(-5).map(h => h.price);
    const b = otherPrices.slice(-5);
    const meanA = a.reduce((s, p) => s + p, 0) / a.length;
    const meanB = b.reduce((s, p) => s + p, 0) / b.length;
    let cov = 0;
    let varA = 0;
    let varB = 0;
    for (let i = 0; i < a.length; i++) {
      cov += (a[i] - meanA) * (b[i] - meanB);
      varA += Math.pow(a[i] - meanA, 2);
      varB += Math.pow(b[i] - meanB, 2);
    }
    const denom = Math.sqrt(varA * varB);
    return denom > 0 ? Number((cov / denom).toFixed(4)) : 0;
  }

  /** Compute the autocorrelation of prices. */
  public autocorrelation(lag: number = 1): number {
    if (this._history.length < lag + 2) return 0;
    const prices = this._history.map(h => h.price);
    const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
    let cov = 0;
    let variance = 0;
    for (let i = lag; i < prices.length; i++) {
      cov += (prices[i] - mean) * (prices[i - lag] - mean);
    }
    for (let i = 0; i < prices.length; i++) {
      variance += Math.pow(prices[i] - mean, 2);
    }
    return variance > 0 ? Number((cov / variance).toFixed(4)) : 0;
  }

  /** Compute the trading volume-weighted average price. */
  public vwap(): number {
    if (this._volumes.length === 0) return this._price;
    const totalVolume = this._volumes.reduce((s, v) => s + v.volume, 0);
    if (totalVolume === 0) return this._price;
    const recent = this._history.slice(-this._volumes.length);
    if (recent.length === 0) return this._price;
    let weighted = 0;
    for (let i = 0; i < Math.min(recent.length, this._volumes.length); i++) {
      weighted += recent[i].price * this._volumes[i].volume;
    }
    return Number((weighted / totalVolume).toFixed(2));
  }

  /** Compute the time-weighted average price. */
  public twap(): number {
    if (this._history.length === 0) return this._price;
    return Number((this._history.reduce((s, h) => s + h.price, 0) / this._history.length).toFixed(2));
  }

  /** Generate a market dashboard. */
  public dashboard(): Record<string, unknown> {
    return {
      price: this._price,
      supply: this._supply,
      demand: this._demand,
      timeStep: this._timeStep,
      historyLength: this._history.length,
      participantCount: this._participants.size,
      interventionCount: this._interventions.length,
      volumeProfileCount: this._volumes.length,
      structure: this.classifyStructure(),
      efficiency: this.marketEfficiency(),
      indicators: this.marketIndicators(),
      liquidity: this.liquidityScore(),
    };
  }

  public priceSignalToPacket(price: number): DataPacket<Signal> {
    return {
      id: `price-signal-${Date.now()}`,
      payload: {
        source: 'market',
        magnitude: price,
        entropy: this.calculateVolatility(),
        timestamp: Date.now()
      },
      metadata: {
        createdAt: Date.now(),
        route: ['market', 'signal'],
        priority: 0.7,
        phase: 'transmission'
      }
    };
  }

  public reset(): void {
    this._price = 100;
    this._supply = 1000;
    this._demand = 1000;
    this._history = [];
    this._shocks = [];
    this._participants.clear();
    this._interventions = [];
    this._volumes = [];
    this._timeStep = 0;
    this._taxRate = 0;
    this._subsidyRate = 0;
  }

  public getHistory(): MarketState[] {
    return [...this._history];
  }

  public exportSupplyCurve(): SupplyCurve {
    return { ...this._supplyCurve };
  }

  public exportDemandCurve(): DemandCurve {
    return { ...this._demandCurve };
  }
}

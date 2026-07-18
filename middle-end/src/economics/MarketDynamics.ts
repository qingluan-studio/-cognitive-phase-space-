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

export class MarketDynamics {
  private _price: number;
  private _supply: number;
  private _demand: number;
  private _supplyCurve: SupplyCurve;
  private _demandCurve: DemandCurve;
  private _history: MarketState[];
  private _shocks: MarketShock[];
  private _timeStep: number;
  private _adjustmentSpeed: number;

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
  }

  get price(): number { return this._price; }
  get supply(): number { return this._supply; }
  get demand(): number { return this._demand; }
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
    this._timeStep = 0;
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

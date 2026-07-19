import { DataPacket, PacketMeta } from '../shared/types';

/** A trade flow descriptor. */
export interface TradeFlow {
  readonly id: string;
  readonly exports: number;
  readonly imports: number;
  readonly balance: number;
  readonly partners: string[];
  readonly period: number;
}

/** A tariff descriptor. */
export interface Tariff {
  readonly rate: number;
  readonly product: string;
  readonly country: string;
  readonly adValorem: boolean;
  readonly revenue: number;
}

/** An exchange rate descriptor. */
export interface ExchangeRate {
  readonly base: string;
  readonly quote: string;
  readonly rate: number;
  readonly spot: number;
  readonly forward?: number;
  readonly timestamp: number;
}

/** Balance of payments summary. */
export interface BalanceOfPayments {
  readonly current: number;
  readonly capital: number;
  readonly financial: number;
  readonly total: number;
  readonly reservesChange: number;
}

/** Comparative advantage result. */
export interface ComparativeAdvantage {
  readonly countryA: string;
  readonly countryB: string;
  readonly goodA: string;
  readonly goodB: string;
  readonly opportunityCostA: number;
  readonly opportunityCostB: number;
}

/** Terms of trade. */
export interface TermsOfTrade {
  readonly exportPriceIndex: number;
  readonly importPriceIndex: number;
  readonly ratio: number;
  readonly favorable: boolean;
}

/**
 * InternationalTrade computes comparative advantage, terms of trade, balance
 * of payments, tariff effects, exchange rates, and trade-creation/diversion.
 */
export class InternationalTrade {
  private _flows: TradeFlow[] = [];
  private _tariffs: Tariff[] = [];
  private _rates: ExchangeRate[] = [];
  private _history: unknown[] = [];
  private _counter = 0;

  get flowCount(): number { return this._flows.length; }
  get tariffCount(): number { return this._tariffs.length; }
  get rateCount(): number { return this._rates.length; }

  /** Compute comparative advantage between two countries. */
  comparativeAdvantage(countryA: string, countryB: string, goods: { country: string; good: string; cost: number }[]): ComparativeAdvantage {
    const aGood1 = goods.find(g => g.country === countryA && g.good === 'good1')?.cost ?? 1;
    const aGood2 = goods.find(g => g.country === countryA && g.good === 'good2')?.cost ?? 1;
    const bGood1 = goods.find(g => g.country === countryB && g.good === 'good1')?.cost ?? 1;
    const bGood2 = goods.find(g => g.country === countryB && g.good === 'good2')?.cost ?? 1;
    const ocA = aGood1 / aGood2;
    const ocB = bGood1 / bGood2;
    return {
      countryA,
      countryB,
      goodA: ocA < ocB ? 'good1' : 'good2',
      goodB: ocA < ocB ? 'good2' : 'good1',
      opportunityCostA: Number(ocA.toFixed(3)),
      opportunityCostB: Number(ocB.toFixed(3)),
    };
  }

  /** Compute terms of trade. */
  termsOfTrade(exportPrice: number, importPrice: number): TermsOfTrade {
    const ratio = importPrice > 0 ? exportPrice / importPrice : 0;
    return {
      exportPriceIndex: exportPrice,
      importPriceIndex: importPrice,
      ratio: Number(ratio.toFixed(3)),
      favorable: ratio > 1,
    };
  }

  /** Compute balance of trade. */
  balanceOfTrade(exports: number, imports: number): { balance: number; surplus: boolean } {
    const balance = exports - imports;
    return { balance: Number(balance.toFixed(2)), surplus: balance > 0 };
  }

  /** Compute balance of payments. */
  balanceOfPayments(current: number, capital: number, financial: number): BalanceOfPayments {
    return {
      current,
      capital,
      financial,
      total: current + capital + financial,
      reservesChange: -(current + capital + financial),
    };
  }

  /** Compute tariff impact on domestic and world prices. */
  tariffImpact(tariff: number, domestic: number, world: number, quantity: number): {
    newDomesticPrice: number; quantityChange: number; deadweightLoss: number; governmentRevenue: number;
  } {
    const newDomesticPrice = world * (1 + tariff);
    const quantityChange = -tariff * quantity * 0.5;
    const deadweightLoss = 0.5 * tariff * Math.abs(quantityChange);
    const governmentRevenue = tariff * world * (quantity + quantityChange);
    return {
      newDomesticPrice: Number(newDomesticPrice.toFixed(2)),
      quantityChange: Number(quantityChange.toFixed(2)),
      deadweightLoss: Number(deadweightLoss.toFixed(2)),
      governmentRevenue: Number(Math.max(0, governmentRevenue).toFixed(2)),
    };
  }

  /** Compute quota effect. */
  quotaEffect(quota: number, domestic: number, world: number): { priceRise: number; quantityReduction: number; rent: number } {
    const priceRise = (domestic - world) * 0.3;
    return {
      priceRise: Number(priceRise.toFixed(2)),
      quantityReduction: quota,
      rent: Number((priceRise * quota).toFixed(2)),
    };
  }

  /** Quote an exchange rate. */
  exchangeRate(base: string, quote: string, rate: number): ExchangeRate {
    const er: ExchangeRate = {
      base,
      quote,
      rate,
      spot: rate,
      timestamp: Date.now(),
    };
    this._rates.push(er);
    return er;
  }

  /** Compute purchasing power parity. */
  purchasingPowerParity(price1: number, price2: number, rate: number): { implied: number; actual: number; misalignment: number } {
    const implied = price1 / price2;
    return {
      implied: Number(implied.toFixed(4)),
      actual: rate,
      misalignment: Number(((rate - implied) / implied).toFixed(3)),
    };
  }

  /** Compute interest rate parity. */
  interestRateParity(rate1: number, rate2: number, spot: number, forward: number): { parityHolds: boolean; arbitrage: number } {
    const implied = spot * (1 + rate1) / (1 + rate2);
    const arb = forward - implied;
    return {
      parityHolds: Math.abs(arb) < 0.001,
      arbitrage: Number(arb.toFixed(4)),
    };
  }

  /** Apply Mundell-Fleming model. */
  mundellFleming(model: 'fixed' | 'floating', policy: 'fiscal' | 'monetary', mobility: 'high' | 'low'): { effective: boolean; outputEffect: number } {
    let effective = false;
    if (model === 'floating' && policy === 'monetary') effective = true;
    if (model === 'fixed' && policy === 'fiscal') effective = true;
    if (mobility === 'high' && model === 'floating' && policy === 'fiscal') effective = false;
    return {
      effective,
      outputEffect: effective ? 1.5 : 0.3,
    };
  }

  /** Compute trade creation effect. */
  tradeCreation(block: string, members: string[]): { newTrade: number; welfareGain: number } {
    return {
      newTrade: members.length * 100,
      welfareGain: members.length * 10,
    };
  }

  /** Compute trade diversion effect. */
  tradeDiversion(block: string, nonMembers: string[]): { lostTrade: number; welfareLoss: number } {
    return {
      lostTrade: nonMembers.length * 80,
      welfareLoss: nonMembers.length * 8,
    };
  }

  /** Register a trade flow. */
  registerFlow(exports: number, imports: number, partners: string[]): TradeFlow {
    const flow: TradeFlow = {
      id: `flow-${(++this._counter).toString(36)}`,
      exports,
      imports,
      balance: exports - imports,
      partners,
      period: Date.now(),
    };
    this._flows.push(flow);
    return flow;
  }

  /** Impose a tariff. */
  imposeTariff(rate: number, product: string, country: string): Tariff {
    const t: Tariff = {
      rate,
      product,
      country,
      adValorem: true,
      revenue: rate * 1000,
    };
    this._tariffs.push(t);
    return t;
  }

  toPacket(): DataPacket<{
    flows: TradeFlow[];
    tariffs: Tariff[];
    rates: ExchangeRate[];
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['economics_extended', 'InternationalTrade'],
      priority: 1,
      phase: 'international-trade',
    };
    return {
      id: `international-trade-${Date.now().toString(36)}-${(++this._counter).toString(36)}`,
      payload: {
        flows: [...this._flows],
        tariffs: [...this._tariffs],
        rates: [...this._rates],
        history: [...this._history],
      },
      metadata,
    };
  }

  reset(): void {
    this._flows = [];
    this._tariffs = [];
    this._rates = [];
    this._history = [];
    this._counter = 0;
  }
}

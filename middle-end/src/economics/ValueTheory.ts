import { KnowledgeUnit, DataPacket } from '../shared/types';

export interface ValueComponents {
  useValue: number;
  exchangeValue: number;
  symbolicValue: number;
  totalValue: number;
}

export interface SymbolicDimension {
  name: string;
  weight: number;
  score: number;
}

export interface ValueTransformation {
  fromType: 'use' | 'exchange' | 'symbolic';
  toType: 'use' | 'exchange' | 'symbolic';
  efficiency: number;
  friction: number;
  timestamp: number;
}

export interface Commodity {
  id: string;
  name: string;
  utility: number;
  scarcity: number;
  laborContent: number;
  symbolicAssociations: string[];
}

/** A market transaction. */
export interface Transaction {
  readonly commodityId: string;
  readonly price: number;
  readonly quantity: number;
  readonly timestamp: number;
  readonly buyer: string;
  readonly seller: string;
}

/** A value metric descriptor. */
export interface ValueMetric {
  readonly name: string;
  readonly value: number;
  readonly unit: string;
  readonly benchmark?: number;
}

/** A labor theory descriptor. */
export interface LaborTheoryResult {
  readonly commodityId: string;
  readonly laborValue: number;
  readonly sociallyNecessaryLabor: number;
  readonly surplusValue: number;
  readonly exploitationRate: number;
}

/** A marginal utility result. */
export interface MarginalUtilityResult {
  readonly commodityId: string;
  readonly quantity: number;
  readonly totalUtility: number;
  readonly marginalUtility: number;
  readonly averageUtility: number;
}

/** A subjective value descriptor. */
export interface SubjectiveValue {
  readonly subjectId: string;
  readonly commodityId: string;
  readonly perceivedValue: number;
  readonly willingnessToPay: number;
  readonly reservationPrice: number;
}

/** An exchange ratio. */
export interface ExchangeRatio {
  readonly commodityA: string;
  readonly commodityB: string;
  readonly ratio: number;
  readonly basedOn: 'labor' | 'utility' | 'scarcity' | 'market';
}

/** A value depreciation record. */
export interface ValueDepreciation {
  readonly commodityId: string;
  readonly initialValue: number;
  readonly currentValue: number;
  readonly depreciationRate: number;
  readonly age: number;
}

/** A price equilibrium result. */
export interface PriceEquilibrium {
  readonly commodityId: string;
  readonly laborPrice: number;
  readonly utilityPrice: number;
  readonly marketPrice: number;
  readonly equilibriumPrice: number;
  readonly deviation: number;
}

/** A value distribution analysis. */
export interface ValueDistribution {
  readonly totalValue: number;
  readonly giniCoefficient: number;
  readonly topQuintileShare: number;
  readonly bottomQuintileShare: number;
  readonly median: number;
}

export class ValueTheory {
  private _commodities: Map<string, Commodity>;
  private _symbolicDimensions: SymbolicDimension[];
  private _transformationHistory: ValueTransformation[];
  private _transactions: Transaction[] = [];
  private _subjectiveValues: Map<string, SubjectiveValue> = new Map();
  private _conversionRates: { [key: string]: number };
  private _marginalUtilityDecay: number;
  private _symbolicAmplification: number;
  private _sociallyNecessaryLaborTime: number;
  private _laborTimeUnit: number;

  constructor() {
    this._commodities = new Map();
    this._symbolicDimensions = [
      { name: 'status', weight: 0.3, score: 0.5 },
      { name: 'identity', weight: 0.25, score: 0.5 },
      { name: 'aesthetic', weight: 0.2, score: 0.5 },
      { name: 'cultural', weight: 0.15, score: 0.5 },
      { name: 'spiritual', weight: 0.1, score: 0.5 }
    ];
    this._transformationHistory = [];
    this._conversionRates = {
      'use-exchange': 0.8,
      'exchange-use': 0.75,
      'use-symbolic': 0.4,
      'symbolic-use': 0.3,
      'exchange-symbolic': 0.6,
      'symbolic-exchange': 0.5
    };
    this._marginalUtilityDecay = 0.9;
    this._symbolicAmplification = 1.5;
    this._sociallyNecessaryLaborTime = 8;
    this._laborTimeUnit = 10;
  }

  get symbolicDimensions(): SymbolicDimension[] {
    return this._symbolicDimensions.map(d => ({ ...d }));
  }

  get marginalUtilityDecay(): number { return this._marginalUtilityDecay; }
  get symbolicAmplification(): number { return this._symbolicAmplification; }
  get sociallyNecessaryLaborTime(): number { return this._sociallyNecessaryLaborTime; }
  get commodityCount(): number { return this._commodities.size; }
  get transactionCount(): number { return this._transactions.length; }
  get subjectiveValueCount(): number { return this._subjectiveValues.size; }

  public setMarginalUtilityDecay(decay: number): void {
    this._marginalUtilityDecay = Math.max(0, Math.min(1, decay));
  }

  public setSymbolicAmplification(amp: number): void {
    this._symbolicAmplification = Math.max(0, amp);
  }

  public setSymbolicDimension(name: string, weight: number, score: number): void {
    const dim = this._symbolicDimensions.find(d => d.name === name);
    if (dim) {
      dim.weight = weight;
      dim.score = score;
    } else {
      this._symbolicDimensions.push({ name, weight, score });
    }
    this._normalizeWeights();
  }

  private _normalizeWeights(): void {
    const total = this._symbolicDimensions.reduce((s, d) => s + d.weight, 0);
    if (total > 0) {
      for (const d of this._symbolicDimensions) {
        d.weight /= total;
      }
    }
  }

  public setConversionRate(from: string, to: string, rate: number): void {
    this._conversionRates[`${from}-${to}`] = Math.max(0, Math.min(1, rate));
  }

  public addCommodity(commodity: Commodity): void {
    this._commodities.set(commodity.id, { ...commodity });
  }

  public removeCommodity(id: string): boolean {
    return this._commodities.delete(id);
  }

  public getCommodity(id: string): Commodity | undefined {
    const c = this._commodities.get(id);
    return c ? { ...c } : undefined;
  }

  public calculateUseValue(commodity: Commodity, quantity: number = 1): number {
    let totalUtility = 0;
    for (let i = 0; i < quantity; i++) {
      totalUtility += commodity.utility * Math.pow(this._marginalUtilityDecay, i);
    }
    return totalUtility;
  }

  public calculateExchangeValue(commodity: Commodity, marketSupply: number, marketDemand: number): number {
    const laborComponent = commodity.laborContent;
    const scarcityFactor = marketSupply > 0 ? marketDemand / marketSupply : 1;
    return laborComponent * Math.sqrt(scarcityFactor);
  }

  public calculateSymbolicValue(commodity: Commodity): number {
    let symbolicScore = 0;
    const associationCount = commodity.symbolicAssociations.length;
    for (const dim of this._symbolicDimensions) {
      const associationMatch = commodity.symbolicAssociations.filter(a =>
        a.toLowerCase().includes(dim.name)).length;
      const dimensionContribution = dim.weight * dim.score * (1 + associationMatch * 0.5);
      symbolicScore += dimensionContribution;
    }
    const diversityBonus = Math.min(1, associationCount * 0.1);
    return symbolicScore * this._symbolicAmplification * (1 + diversityBonus);
  }

  public calculateTotalValue(
    commodity: Commodity,
    quantity: number = 1,
    marketSupply: number = 1000,
    marketDemand: number = 1000
  ): ValueComponents {
    const useValue = this.calculateUseValue(commodity, quantity);
    const exchangeValue = this.calculateExchangeValue(commodity, marketSupply, marketDemand) * quantity;
    const symbolicValue = this.calculateSymbolicValue(commodity) * quantity;
    const totalValue = useValue + exchangeValue + symbolicValue;
    return { useValue, exchangeValue, symbolicValue, totalValue };
  }

  public transformValue(
    commodity: Commodity,
    fromType: 'use' | 'exchange' | 'symbolic',
    toType: 'use' | 'exchange' | 'symbolic',
    amount: number
  ): { result: number; friction: number } {
    const key = `${fromType}-${toType}`;
    const rate = this._conversionRates[key] || 0.5;
    const result = amount * rate;
    const friction = amount * (1 - rate);

    this._transformationHistory.push({
      fromType,
      toType,
      efficiency: rate,
      friction,
      timestamp: Date.now()
    });

    return { result, friction };
  }

  public calculateSurplusValue(commodity: Commodity, wage: number): number {
    const exchangeValue = this.calculateExchangeValue(commodity, 1000, 1000);
    return Math.max(0, exchangeValue - wage);
  }

  public calculateCommodityFetishism(commodity: Commodity): number {
    const useValue = this.calculateUseValue(commodity, 1);
    const symbolicValue = this.calculateSymbolicValue(commodity);
    const total = useValue + symbolicValue;
    return total > 0 ? symbolicValue / total : 0;
  }

  public knowledgeUnitToValue(knowledge: KnowledgeUnit): ValueComponents {
    const pseudoCommodity: Commodity = {
      id: knowledge.id,
      name: knowledge.content.substring(0, 30),
      utility: knowledge.vector.reduce((a, b) => a + Math.abs(b), 0),
      scarcity: 1 / (1 + knowledge.lineage.length),
      laborContent: knowledge.lineage.length * 10,
      symbolicAssociations: knowledge.content.split(' ').slice(0, 5)
    };
    return this.calculateTotalValue(pseudoCommodity);
  }

  public valueToPacket(components: ValueComponents): DataPacket<ValueComponents> {
    return {
      id: `value-${Date.now()}`,
      payload: components,
      metadata: {
        createdAt: Date.now(),
        route: ['value', 'analysis'],
        priority: 0.65,
        phase: 'evaluation'
      }
    };
  }

  public findValueDiscrepancy(commodity: Commodity, marketPrice: number): number {
    const exchangeValue = this.calculateExchangeValue(commodity, 1000, 1000);
    return (marketPrice - exchangeValue) / exchangeValue;
  }

  public calculateGiniCoefficient(commodities: Commodity[]): number {
    const values = commodities.map(c => this.calculateTotalValue(c).totalValue).sort((a, b) => a - b);
    const n = values.length;
    if (n === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / n;
    let sum = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        sum += Math.abs(values[i] - values[j]);
      }
    }
    return sum / (2 * n * n * mean);
  }

  public calculateEngelCoefficient(foodExpenditure: number, totalExpenditure: number): number {
    return totalExpenditure > 0 ? foodExpenditure / totalExpenditure : 0;
  }

  public hedonicPricing(
    basePrice: number, attributes: { [key: string]: { value: number; implicitPrice: number } }): number {
    let price = basePrice;
    for (const key in attributes) {
      price += attributes[key].value * attributes[key].implicitPrice;
    }
    return price;
  }

  /** Set the socially necessary labor time. */
  public setSociallyNecessaryLaborTime(hours: number): void {
    this._sociallyNecessaryLaborTime = Math.max(0, hours);
  }

  /** Set the labor time unit. */
  public setLaborTimeUnit(value: number): void {
    this._laborTimeUnit = Math.max(1, value);
  }

  /** Compute the labor theory of value for a commodity. */
  public laborTheoryOfValue(commodity: Commodity, wage: number = 10): LaborTheoryResult {
    const laborValue = commodity.laborContent * this._laborTimeUnit;
    const sociallyNecessaryLabor = this._sociallyNecessaryLaborTime * this._laborTimeUnit;
    const surplusValue = Math.max(0, laborValue - wage);
    const exploitationRate = wage > 0 ? surplusValue / wage : 0;
    return {
      commodityId: commodity.id,
      laborValue,
      sociallyNecessaryLabor,
      surplusValue,
      exploitationRate: Number(exploitationRate.toFixed(4)),
    };
  }

  /** Compute marginal utility analysis for a commodity. */
  public marginalUtilityAnalysis(commodity: Commodity, quantity: number): MarginalUtilityResult {
    const totalUtility = this.calculateUseValue(commodity, quantity);
    const marginalUtility = commodity.utility * Math.pow(this._marginalUtilityDecay, quantity - 1);
    const averageUtility = totalUtility / Math.max(1, quantity);
    return {
      commodityId: commodity.id,
      quantity,
      totalUtility,
      marginalUtility,
      averageUtility: Number(averageUtility.toFixed(4)),
    };
  }

  /** Compute the law of diminishing marginal utility. */
  public diminishingMarginalUtility(commodity: Commodity, maxQuantity: number): { quantity: number; marginalUtility: number }[] {
    const results: { quantity: number; marginalUtility: number }[] = [];
    for (let q = 1; q <= maxQuantity; q++) {
      results.push({ quantity: q, marginalUtility: commodity.utility * Math.pow(this._marginalUtilityDecay, q - 1) });
    }
    return results;
  }

  /** Record a subjective value assessment. */
  public recordSubjectiveValue(value: SubjectiveValue): SubjectiveValue {
    this._subjectiveValues.set(`${value.subjectId}-${value.commodityId}`, value);
    return value;
  }

  /** Get a subjective value assessment. */
  public getSubjectiveValue(subjectId: string, commodityId: string): SubjectiveValue | undefined {
    return this._subjectiveValues.get(`${subjectId}-${commodityId}`);
  }

  /** Compute the average perceived value of a commodity. */
  public averagePerceivedValue(commodityId: string): number {
    const values = Array.from(this._subjectiveValues.values()).filter(v => v.commodityId === commodityId);
    if (values.length === 0) return 0;
    return Number((values.reduce((s, v) => s + v.perceivedValue, 0) / values.length).toFixed(4));
  }

  /** Compute the average willingness to pay. */
  public averageWillingnessToPay(commodityId: string): number {
    const values = Array.from(this._subjectiveValues.values()).filter(v => v.commodityId === commodityId);
    if (values.length === 0) return 0;
    return Number((values.reduce((s, v) => s + v.willingnessToPay, 0) / values.length).toFixed(4));
  }

  /** Compute the average reservation price. */
  public averageReservationPrice(commodityId: string): number {
    const values = Array.from(this._subjectiveValues.values()).filter(v => v.commodityId === commodityId);
    if (values.length === 0) return 0;
    return Number((values.reduce((s, v) => s + v.reservationPrice, 0) / values.length).toFixed(4));
  }

  /** Compute the consumer surplus based on subjective value. */
  public subjectiveConsumerSurplus(subjectId: string, commodityId: string, actualPrice: number): number {
    const sv = this._subjectiveValues.get(`${subjectId}-${commodityId}`);
    if (!sv) return 0;
    return Math.max(0, sv.willingnessToPay - actualPrice);
  }

  /** Record a transaction. */
  public recordTransaction(transaction: Transaction): Transaction {
    this._transactions.push(transaction);
    return transaction;
  }

  /** List transactions for a commodity. */
  public commodityTransactions(commodityId: string): Transaction[] {
    return this._transactions.filter(t => t.commodityId === commodityId);
  }

  /** Compute the average transaction price for a commodity. */
  public averageTransactionPrice(commodityId: string): number {
    const txs = this.commodityTransactions(commodityId);
    if (txs.length === 0) return 0;
    return Number((txs.reduce((s, t) => s + t.price * t.quantity, 0) / txs.reduce((s, t) => s + t.quantity, 0)).toFixed(2));
  }

  /** Compute the total transaction volume for a commodity. */
  public totalTransactionVolume(commodityId: string): number {
    return this.commodityTransactions(commodityId).reduce((s, t) => s + t.price * t.quantity, 0);
  }

  /** Compute the average transaction quantity. */
  public averageTransactionQuantity(commodityId: string): number {
    const txs = this.commodityTransactions(commodityId);
    if (txs.length === 0) return 0;
    return Number((txs.reduce((s, t) => s + t.quantity, 0) / txs.length).toFixed(2));
  }

  /** Compute the velocity of transactions. */
  public transactionVelocity(commodityId: string, windowMs: number = 86400000): number {
    const now = Date.now();
    const recent = this.commodityTransactions(commodityId).filter(t => now - t.timestamp < windowMs);
    return recent.length;
  }

  /** Compute the exchange ratio between two commodities. */
  public exchangeRatio(commodityA: Commodity, commodityB: Commodity, basedOn: ExchangeRatio['basedOn']): ExchangeRatio {
    let ratio = 1;
    if (basedOn === 'labor') {
      ratio = commodityA.laborContent / Math.max(1, commodityB.laborContent);
    } else if (basedOn === 'utility') {
      ratio = commodityA.utility / Math.max(1, commodityB.utility);
    } else if (basedOn === 'scarcity') {
      ratio = commodityA.scarcity / Math.max(0.01, commodityB.scarcity);
    } else {
      const avgA = this.averageTransactionPrice(commodityA.id);
      const avgB = this.averageTransactionPrice(commodityB.id);
      ratio = avgB > 0 ? avgA / avgB : 1;
    }
    return {
      commodityA: commodityA.id,
      commodityB: commodityB.id,
      ratio: Number(ratio.toFixed(4)),
      basedOn,
    };
  }

  /** Compute value depreciation for a commodity. */
  public valueDepreciation(commodity: Commodity, age: number, depreciationRate: number = 0.1): ValueDepreciation {
    const initialValue = this.calculateTotalValue(commodity).totalValue;
    const currentValue = initialValue * Math.pow(1 - depreciationRate, age);
    return {
      commodityId: commodity.id,
      initialValue,
      currentValue: Number(currentValue.toFixed(4)),
      depreciationRate,
      age,
    };
  }

  /** Compute straight-line depreciation. */
  public straightLineDepreciation(initialValue: number, salvageValue: number, usefulLife: number, age: number): number {
    if (usefulLife === 0) return 0;
    const annualDepreciation = (initialValue - salvageValue) / usefulLife;
    return Math.max(salvageValue, initialValue - annualDepreciation * age);
  }

  /** Compute declining-balance depreciation. */
  public decliningBalanceDepreciation(initialValue: number, rate: number, age: number): number {
    return Number((initialValue * Math.pow(1 - rate, age)).toFixed(4));
  }

  /** Compute the present value of a future value. */
  public presentValue(futureValue: number, discountRate: number, periods: number): number {
    return Number((futureValue / Math.pow(1 + discountRate, periods)).toFixed(4));
  }

  /** Compute the future value of a present value. */
  public futureValue(presentValue: number, discountRate: number, periods: number): number {
    return Number((presentValue * Math.pow(1 + discountRate, periods)).toFixed(4));
  }

  /** Compute the net present value of cash flows. */
  public netPresentValue(cashFlows: number[], discountRate: number): number {
    return Number(cashFlows.reduce((s, cf, t) => s + cf / Math.pow(1 + discountRate, t), 0).toFixed(4));
  }

  /** Compute the internal rate of return (approximation). */
  public internalRateOfReturn(cashFlows: number[]): number {
    let low = -0.99;
    let high = 1;
    for (let i = 0; i < 100; i++) {
      const mid = (low + high) / 2;
      const npv = this.netPresentValue(cashFlows, mid);
      if (Math.abs(npv) < 0.001) return Number(mid.toFixed(4));
      if (npv > 0) low = mid;
      else high = mid;
    }
    return Number(((low + high) / 2).toFixed(4));
  }

  /** Compute price equilibrium for a commodity. */
  public priceEquilibrium(commodity: Commodity, marketPrice: number, marketSupply: number = 1000, marketDemand: number = 1000): PriceEquilibrium {
    const laborPrice = commodity.laborContent * this._laborTimeUnit;
    const utilityPrice = commodity.utility * 10;
    const exchangeValue = this.calculateExchangeValue(commodity, marketSupply, marketDemand);
    const equilibriumPrice = (laborPrice + utilityPrice + exchangeValue) / 3;
    const deviation = (marketPrice - equilibriumPrice) / Math.max(1, equilibriumPrice);
    return {
      commodityId: commodity.id,
      laborPrice,
      utilityPrice,
      marketPrice,
      equilibriumPrice: Number(equilibriumPrice.toFixed(4)),
      deviation: Number(deviation.toFixed(4)),
    };
  }

  /** Compute the value distribution of a set of commodities. */
  public valueDistribution(commodities: Commodity[]): ValueDistribution {
    const values = commodities.map(c => this.calculateTotalValue(c).totalValue).sort((a, b) => a - b);
    const n = values.length;
    if (n === 0) return { totalValue: 0, giniCoefficient: 0, topQuintileShare: 0, bottomQuintileShare: 0, median: 0 };
    const total = values.reduce((s, v) => s + v, 0);
    const quintileSize = Math.floor(n / 5);
    const bottomQuintile = values.slice(0, Math.max(1, quintileSize)).reduce((s, v) => s + v, 0);
    const topQuintile = values.slice(-Math.max(1, quintileSize)).reduce((s, v) => s + v, 0);
    const median = n % 2 === 0 ? (values[n / 2 - 1] + values[n / 2]) / 2 : values[Math.floor(n / 2)];
    return {
      totalValue: total,
      giniCoefficient: this.calculateGiniCoefficient(commodities),
      topQuintileShare: Number((topQuintile / total).toFixed(4)),
      bottomQuintileShare: Number((bottomQuintile / total).toFixed(4)),
      median: Number(median.toFixed(4)),
    };
  }

  /** Compute value metrics for a commodity. */
  public valueMetrics(commodity: Commodity, marketPrice: number): ValueMetric[] {
    const components = this.calculateTotalValue(commodity);
    const labor = this.laborTheoryOfValue(commodity);
    return [
      { name: 'use-value', value: components.useValue, unit: 'utils' },
      { name: 'exchange-value', value: components.exchangeValue, unit: 'currency', benchmark: marketPrice },
      { name: 'symbolic-value', value: components.symbolicValue, unit: 'utils' },
      { name: 'total-value', value: components.totalValue, unit: 'utils' },
      { name: 'labor-value', value: labor.laborValue, unit: 'hours' },
      { name: 'surplus-value', value: labor.surplusValue, unit: 'currency' },
      { name: 'exploitation-rate', value: labor.exploitationRate, unit: 'ratio' },
      { name: 'fetishism', value: this.calculateCommodityFetishism(commodity), unit: 'ratio' },
      { name: 'value-discrepancy', value: this.findValueDiscrepancy(commodity, marketPrice), unit: 'ratio' },
    ];
  }

  /** Compute the Marxist exploitation rate. */
  public exploitationRate(commodity: Commodity, wage: number): number {
    const labor = this.laborTheoryOfValue(commodity, wage);
    return labor.exploitationRate;
  }

  /** Compute the organic composition of capital. */
  public organicCompositionOfCapital(constantCapital: number, variableCapital: number): number {
    if (variableCapital === 0) return 0;
    return Number((constantCapital / variableCapital).toFixed(4));
  }

  /** Compute the rate of profit. */
  public rateOfProfit(surplusValue: number, constantCapital: number, variableCapital: number): number {
    const total = constantCapital + variableCapital;
    if (total === 0) return 0;
    return Number((surplusValue / total).toFixed(4));
  }

  /** Compute the tendency for the rate of profit to fall. */
  public profitTrend(ratesOverTime: number[]): 'rising' | 'falling' | 'stable' {
    if (ratesOverTime.length < 2) return 'stable';
    const first = ratesOverTime[0];
    const last = ratesOverTime[ratesOverTime.length - 1];
    if (last < first - 0.01) return 'falling';
    if (last > first + 0.01) return 'rising';
    return 'stable';
  }

  /** Compute the Veblen effect (snob value). */
  public veblenEffect(commodity: Commodity, priceIncrease: number): number {
    const symbolicValue = this.calculateSymbolicValue(commodity);
    return Number((symbolicValue * priceIncrease).toFixed(4));
  }

  /** Compute the network effect value. */
  public networkEffectValue(networkSize: number, coefficient: number = 1): number {
    return Number((coefficient * networkSize * (networkSize - 1) / 2).toFixed(4));
  }

  /** Compute Metcalf's law value. */
  public metcalfValue(networkSize: number): number {
    return Number((networkSize * networkSize).toFixed(4));
  }

  /** Compute the information value of a commodity. */
  public informationValue(commodity: Commodity): number {
    const entropy = commodity.symbolicAssociations.length > 0
      ? -commodity.symbolicAssociations.length * Math.log2(1 / commodity.symbolicAssociations.length)
      : 0;
    return Number(entropy.toFixed(4));
  }

  /** Compute the scarcity premium. */
  public scarcityPremium(commodity: Commodity, baseValue: number): number {
    return Number((baseValue * (1 / Math.max(0.01, commodity.scarcity))).toFixed(4));
  }

  /** Compute the demand elasticity from transactions. */
  public demandElasticity(commodityId: string): number {
    const txs = this.commodityTransactions(commodityId);
    if (txs.length < 2) return 0;
    const sorted = [...txs].sort((a, b) => a.timestamp - b.timestamp);
    const priceChange = (sorted[sorted.length - 1].price - sorted[0].price) / sorted[0].price;
    const quantityChange = (sorted[sorted.length - 1].quantity - sorted[0].quantity) / sorted[0].quantity;
    if (priceChange === 0) return 0;
    return Number((quantityChange / priceChange).toFixed(4));
  }

  /** Compute the time-value decay. */
  public timeValueDecay(initialValue: number, decayRate: number, timePeriods: number): number {
    return Number((initialValue * Math.exp(-decayRate * timePeriods)).toFixed(4));
  }

  /** Compute the option value of waiting. */
  public optionValue(currentValue: number, futureValue: number, probability: number, discountRate: number, periods: number): number {
    const expectedFuture = futureValue * probability;
    const presentExpected = this.presentValue(expectedFuture, discountRate, periods);
    return Number((presentExpected - currentValue).toFixed(4));
  }

  /** Compute the risk-adjusted value. */
  public riskAdjustedValue(value: number, riskFreeRate: number, riskPremium: number): number {
    return Number((value / (1 + riskFreeRate + riskPremium)).toFixed(4));
  }

  /** Compute the certainty equivalent. */
  public certaintyEquivalent(expectedValue: number, variance: number, riskAversion: number): number {
    return Number((expectedValue - 0.5 * riskAversion * variance).toFixed(4));
  }

  /** Compute the expected utility. */
  public expectedUtility(outcomes: { value: number; probability: number }[], riskAversion: number = 1): number {
    const expected = outcomes.reduce((s, o) => s + o.value * o.probability, 0);
    const variance = outcomes.reduce((s, o) => s + o.probability * Math.pow(o.value - expected, 2), 0);
    return Number((expected - 0.5 * riskAversion * variance).toFixed(4));
  }

  /** Compute the Arrow-Pratt risk aversion coefficient. */
  public arrowPrattRiskAversion(utility: number, wealth: number): number {
    if (wealth === 0) return 0;
    return Number((-utility / wealth).toFixed(4));
  }

  /** Compute the value at risk. */
  public valueAtRisk(values: number[], confidence: number = 0.95): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const idx = Math.floor((1 - confidence) * sorted.length);
    return Number(Math.abs(sorted[idx] ?? 0).toFixed(4));
  }

  /** Compute the Sharpe ratio. */
  public sharpeRatio(returns: number[], riskFreeRate: number = 0.02): number {
    if (returns.length === 0) return 0;
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    if (stdDev === 0) return 0;
    return Number(((mean - riskFreeRate) / stdDev).toFixed(4));
  }

  /** Compute the Solow residual (total factor productivity). */
  public solowResidual(output: number, capital: number, labor: number, capitalShare: number = 0.3): number {
    const laborShare = 1 - capitalShare;
    if (labor === 0 || capital === 0) return 0;
    return Number((output / (Math.pow(capital, capitalShare) * Math.pow(labor, laborShare))).toFixed(4));
  }

  /** Compute the Cobb-Douglas production function. */
  public cobbDouglas(capital: number, labor: number, alpha: number = 0.3, efficiency: number = 1): number {
    return Number((efficiency * Math.pow(capital, alpha) * Math.pow(labor, 1 - alpha)).toFixed(4));
  }

  /** Compute the marginal product of capital. */
  public marginalProductOfCapital(output: number, capital: number, alpha: number = 0.3): number {
    if (capital === 0) return 0;
    return Number((alpha * output / capital).toFixed(4));
  }

  /** Compute the marginal product of labor. */
  public marginalProductOfLabor(output: number, labor: number, alpha: number = 0.3): number {
    if (labor === 0) return 0;
    return Number(((1 - alpha) * output / labor).toFixed(4));
  }

  /** Compute the elasticity of substitution. */
  public elasticityOfSubstitution(capital1: number, labor1: number, capital2: number, labor2: number): number {
    const ratio1 = capital1 / Math.max(1, labor1);
    const ratio2 = capital2 / Math.max(1, labor2);
    const mrt1 = labor1 / Math.max(1, capital1);
    const mrt2 = labor2 / Math.max(1, capital2);
    if (ratio1 === ratio2 || mrt1 === mrt2) return 1;
    return Number((Math.log(ratio2 / ratio1) / Math.log(mrt2 / mrt1)).toFixed(4));
  }

  /** Compute the Leontief production function. */
  public leontiefProduction(capital: number, labor: number, capitalCoeff: number = 1, laborCoeff: number = 1): number {
    return Math.min(capital * capitalCoeff, labor * laborCoeff);
  }

  /** Compute the CES production function. */
  public cesProduction(capital: number, labor: number, alpha: number = 0.5, rho: number = -1, efficiency: number = 1): number {
    if (rho === 0) return this.cobbDouglas(capital, labor, alpha, efficiency);
    const inner = alpha * Math.pow(capital, rho) + (1 - alpha) * Math.pow(labor, rho);
    return Number((efficiency * Math.pow(inner, 1 / rho)).toFixed(4));
  }

  /** Compute the Pareto optimal allocation. */
  public paretoOptimalAllocation(allocations: { agent: string; utility: number }[]): { agent: string; utility: number }[] {
    return [...allocations].sort((a, b) => b.utility - a.utility);
  }

  /** Compute the Edgeworth box allocation efficiency. */
  public edgeworthEfficiency(allocationA: number, allocationB: number, total: number): number {
    if (total === 0) return 0;
    const sum = allocationA + allocationB;
    return Number((1 - Math.abs(sum - total) / total).toFixed(4));
  }

  /** Compute the Lorenz curve area. */
  public lorenzCurveArea(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const total = sorted.reduce((s, v) => s + v, 0);
    if (total === 0) return 0;
    let area = 0;
    let cumulativeShare = 0;
    for (let i = 0; i < sorted.length; i++) {
      const share = sorted[i] / total;
      const popShare = 1 / sorted.length;
      area += cumulativeShare * popShare + 0.5 * share * popShare;
      cumulativeShare += share;
    }
    return Number(area.toFixed(4));
  }

  /** Compute the Atkinson index of inequality. */
  public atkinsonIndex(values: number[], epsilon: number = 0.5): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    if (mean === 0) return 0;
    if (epsilon === 1) {
      const geoMean = Math.exp(values.reduce((s, v) => s + Math.log(Math.max(0.0001, v)), 0) / values.length);
      return Number((1 - geoMean / mean).toFixed(4));
    }
    const weighted = values.reduce((s, v) => s + Math.pow(v, 1 - epsilon), 0) / values.length;
    const equityEquivalent = Math.pow(weighted, 1 / (1 - epsilon));
    return Number((1 - equityEquivalent / mean).toFixed(4));
  }

  /** Compute the Theil index of inequality. */
  public theilIndex(values: number[]): number {
    if (values.length === 0) return 0;
    const total = values.reduce((a, b) => a + b, 0);
    if (total === 0) return 0;
    const mean = total / values.length;
    let theil = 0;
    for (const v of values) {
      if (v > 0) {
        theil += (v / total) * Math.log((v / mean));
      }
    }
    return Number((theil / values.length).toFixed(4));
  }

  /** Compute the Hoover index of inequality. */
  public hooverIndex(values: number[]): number {
    if (values.length === 0) return 0;
    const total = values.reduce((a, b) => a + b, 0);
    const mean = total / values.length;
    if (mean === 0) return 0;
    const sumAbs = values.reduce((s, v) => s + Math.abs(v - mean), 0);
    return Number((sumAbs / (2 * total)).toFixed(4));
  }

  /** Compute the consumer price index (CPI). */
  public consumerPriceIndex(currentPrices: { item: string; price: number; weight: number }[], basePrices: { item: string; price: number }[]): number {
    let weightedSum = 0;
    let totalWeight = 0;
    for (const cp of currentPrices) {
      const base = basePrices.find(bp => bp.item === cp.item);
      if (base && base.price > 0) {
        weightedSum += (cp.price / base.price) * cp.weight;
        totalWeight += cp.weight;
      }
    }
    return totalWeight > 0 ? Number((weightedSum / totalWeight * 100).toFixed(2)) : 100;
  }

  /** Compute inflation rate. */
  public inflationRate(currentCPI: number, previousCPI: number): number {
    if (previousCPI === 0) return 0;
    return Number(((currentCPI - previousCPI) / previousCPI * 100).toFixed(2));
  }

  /** Compute the real value adjusted for inflation. */
  public realValue(nominalValue: number, cpi: number, baseCPI: number = 100): number {
    if (cpi === 0) return 0;
    return Number((nominalValue * baseCPI / cpi).toFixed(4));
  }

  /** Compute the real interest rate. */
  public realInterestRate(nominalRate: number, inflationRate: number): number {
    return Number((nominalRate - inflationRate).toFixed(4));
  }

  /** Compute the Fisher effect. */
  public fisherEffect(nominalRate: number, realRate: number): number {
    return Number((nominalRate - realRate).toFixed(4));
  }

  /** Compute the purchasing power parity. */
  public purchasingPowerPPP(domesticPrice: number, foreignPrice: number, exchangeRate: number): number {
    if (foreignPrice === 0 || exchangeRate === 0) return 0;
    return Number((domesticPrice / (foreignPrice * exchangeRate)).toFixed(4));
  }

  /** Compute the real exchange rate. */
  public realExchangeRate(nominalRate: number, domesticCPI: number, foreignCPI: number): number {
    if (foreignCPI === 0) return 0;
    return Number((nominalRate * foreignCPI / domesticCPI).toFixed(4));
  }

  /** Compute the terms of trade. */
  public termsOfTrade(exportPriceIndex: number, importPriceIndex: number): number {
    if (importPriceIndex === 0) return 0;
    return Number((exportPriceIndex / importPriceIndex * 100).toFixed(2));
  }

  /** Compute the value of human capital. */
  public humanCapitalValue(annualEarnings: number, yearsRemaining: number, discountRate: number = 0.05): number {
    let value = 0;
    for (let t = 0; t < yearsRemaining; t++) {
      value += annualEarnings / Math.pow(1 + discountRate, t);
    }
    return Number(value.toFixed(4));
  }

  /** Compute the return on education. */
  public returnOnEducation(earningsWithEducation: number, earningsWithoutEducation: number, educationCost: number): number {
    const incremental = earningsWithEducation - earningsWithoutEducation;
    if (educationCost === 0) return 0;
    return Number((incremental / educationCost).toFixed(4));
  }

  /** Compute the social value of a public good. */
  public socialValueOfPublicGood(individualValues: number[]): number {
    return Number(individualValues.reduce((s, v) => s + v, 0).toFixed(4));
  }

  /** Compute the Samuelson condition for public goods. */
  public samuelsonCondition(marginalCosts: number[], marginalRatesOfSubstitution: number[]): boolean {
    if (marginalCosts.length === 0) return false;
    const totalMRS = marginalRatesOfSubstitution.reduce((s, v) => s + v, 0);
    const mc = marginalCosts[0];
    return Math.abs(totalMRS - mc) < 0.01;
  }

  /** Compute the Lindahl price for a public good. */
  public lindahlPrice(individualBenefits: number[], totalCost: number): number[] {
    const totalBenefit = individualBenefits.reduce((s, v) => s + v, 0);
    if (totalBenefit === 0) return individualBenefits.map(() => 0);
    return individualBenefits.map(b => Number((b / totalBenefit * totalCost).toFixed(4)));
  }

  /** Generate a value analysis summary. */
  public valueAnalysisSummary(commodity: Commodity, marketPrice: number): Record<string, unknown> {
    const components = this.calculateTotalValue(commodity);
    const labor = this.laborTheoryOfValue(commodity);
    const equilibrium = this.priceEquilibrium(commodity, marketPrice);
    const fetishism = this.calculateCommodityFetishism(commodity);
    return {
      commodityId: commodity.id,
      useValue: components.useValue,
      exchangeValue: components.exchangeValue,
      symbolicValue: components.symbolicValue,
      totalValue: components.totalValue,
      laborValue: labor.laborValue,
      surplusValue: labor.surplusValue,
      exploitationRate: labor.exploitationRate,
      fetishism,
      equilibriumPrice: equilibrium.equilibriumPrice,
      marketDeviation: equilibrium.deviation,
      scarcity: commodity.scarcity,
      laborContent: commodity.laborContent,
    };
  }

  public reset(): void {
    this._commodities.clear();
    this._symbolicDimensions = [
      { name: 'status', weight: 0.3, score: 0.5 },
      { name: 'identity', weight: 0.25, score: 0.5 },
      { name: 'aesthetic', weight: 0.2, score: 0.5 },
      { name: 'cultural', weight: 0.15, score: 0.5 },
      { name: 'spiritual', weight: 0.1, score: 0.5 }
    ];
    this._transformationHistory = [];
    this._transactions = [];
    this._subjectiveValues.clear();
    this._sociallyNecessaryLaborTime = 8;
    this._laborTimeUnit = 10;
  }

  public getTransformationHistory(): ValueTransformation[] {
    return [...this._transformationHistory];
  }

  public getAllCommodities(): Commodity[] {
    return Array.from(this._commodities.values()).map(c => ({ ...c }));
  }
}

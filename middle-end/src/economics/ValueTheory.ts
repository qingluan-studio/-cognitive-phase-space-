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

export class ValueTheory {
  private _commodities: Map<string, Commodity>;
  private _symbolicDimensions: SymbolicDimension[];
  private _transformationHistory: ValueTransformation[];
  private _conversionRates: { [key: string]: number };
  private _marginalUtilityDecay: number;
  private _symbolicAmplification: number;

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
  }

  get symbolicDimensions(): SymbolicDimension[] {
    return this._symbolicDimensions.map(d => ({ ...d }));
  }

  get marginalUtilityDecay(): number { return this._marginalUtilityDecay; }
  get symbolicAmplification(): number { return this._symbolicAmplification; }

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
  }

  public getTransformationHistory(): ValueTransformation[] {
    return [...this._transformationHistory];
  }

  public getAllCommodities(): Commodity[] {
    return Array.from(this._commodities.values()).map(c => ({ ...c }));
  }
}

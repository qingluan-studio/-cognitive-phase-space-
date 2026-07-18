import { DataPacket, Signal } from '../shared/types';

export interface CostBenefitResult {
  totalCost: number;
  totalBenefit: number;
  netBenefit: number;
  benefitCostRatio: number;
  roi: number;
  breakEvenPoint: number;
}

export interface ResourceAllocation {
  resourceId: string;
  allocated: number;
  opportunityCost: number;
  marginalProduct: number;
}

export interface DiscountedCashFlow {
  npv: number;
  irr: number;
  paybackPeriod: number;
  discountedPayback: number;
}

export interface SensitivityAnalysis {
  variable: string;
  baseValue: number;
  optimisticValue: number;
  pessimisticValue: number;
  impactOnNPV: number[];
  sensitivityIndex: number;
}

export interface OpportunityCostMatrix {
  options: string[];
  costs: number[][];
  optimalChoice: number;
  minRegret: number;
}

export class EconomicCalculus {
  private _discountRate: number;
  private _timeHorizon: number;
  private _allocations: Map<string, ResourceAllocation>;
  private _analysisHistory: CostBenefitResult[];
  private _riskPremium: number;
  private _taxRate: number;
  private _inflationRate: number;

  constructor(discountRate: number = 0.05) {
    this._discountRate = discountRate;
    this._timeHorizon = 10;
    this._allocations = new Map();
    this._analysisHistory = [];
    this._riskPremium = 0.03;
    this._taxRate = 0.2;
    this._inflationRate = 0.02;
  }

  get discountRate(): number { return this._discountRate; }
  get timeHorizon(): number { return this._timeHorizon; }
  get riskPremium(): number { return this._riskPremium; }
  get taxRate(): number { return this._taxRate; }
  get inflationRate(): number { return this._inflationRate; }

  public setDiscountRate(rate: number): void {
    this._discountRate = Math.max(0, rate);
  }

  public setTimeHorizon(years: number): void {
    this._timeHorizon = Math.max(1, years);
  }

  public setRiskPremium(premium: number): void {
    this._riskPremium = Math.max(0, premium);
  }

  public setTaxRate(rate: number): void {
    this._taxRate = Math.max(0, Math.min(1, rate));
  }

  public setInflationRate(rate: number): void {
    this._inflationRate = rate;
  }

  public calculatePresentValue(futureValue: number, periods: number): number {
    return futureValue / Math.pow(1 + this._discountRate, periods);
  }

  public calculateFutureValue(presentValue: number, periods: number): number {
    return presentValue * Math.pow(1 + this._discountRate, periods);
  }

  public calculateNPV(initialInvestment: number, cashFlows: number[]): number {
    let npv = -initialInvestment;
    for (let t = 0; t < cashFlows.length; t++) {
      npv += this.calculatePresentValue(cashFlows[t], t + 1);
    }
    return npv;
  }

  public calculateIRR(initialInvestment: number, cashFlows: number[], tolerance: number = 0.0001): number {
    let low = -0.99;
    let high = 10;
    for (let i = 0; i < 100; i++) {
      const mid = (low + high) / 2;
      let npv = -initialInvestment;
      for (let t = 0; t < cashFlows.length; t++) {
        npv += cashFlows[t] / Math.pow(1 + mid, t + 1);
      }
      if (Math.abs(npv) < tolerance) return mid;
      if (npv > 0) {
        low = mid;
      } else {
        high = mid;
      }
    }
    return (low + high) / 2;
  }

  public calculatePaybackPeriod(initialInvestment: number, cashFlows: number[]): number {
    let cumulative = 0;
    for (let i = 0; i < cashFlows.length; i++) {
      cumulative += cashFlows[i];
      if (cumulative >= initialInvestment) {
        const prevCumulative = cumulative - cashFlows[i];
        const fraction = (initialInvestment - prevCumulative) / cashFlows[i];
        return i + fraction;
      }
    }
    return -1;
  }

  public discountedCashFlowAnalysis(
    initialInvestment: number,
    cashFlows: number[]
  ): DiscountedCashFlow {
    const npv = this.calculateNPV(initialInvestment, cashFlows);
    const irr = this.calculateIRR(initialInvestment, cashFlows);
    const paybackPeriod = this.calculatePaybackPeriod(initialInvestment, cashFlows);

    const discountedFlows = cashFlows.map((cf, t) => this.calculatePresentValue(cf, t + 1));
    const discountedPayback = this.calculatePaybackPeriod(initialInvestment, discountedFlows);

    return { npv, irr, paybackPeriod, discountedPayback };
  }

  public costBenefitAnalysis(
    costs: number[],
    benefits: number[],
    timeline: number = 1
  ): CostBenefitResult {
    const totalCost = costs.reduce((a, b) => a + b, 0);
    const totalBenefit = benefits.reduce((a, b) => a + b, 0);
    const netBenefit = totalBenefit - totalCost;
    const benefitCostRatio = totalCost > 0 ? totalBenefit / totalCost : 0;
    const roi = totalCost > 0 ? (netBenefit / totalCost) * 100 : 0;
    const breakEvenPoint = totalBenefit > 0 ? (totalCost / totalBenefit) * timeline : 0;

    const result: CostBenefitResult = {
      totalCost,
      totalBenefit,
      netBenefit,
      benefitCostRatio,
      roi,
      breakEvenPoint
    };

    this._analysisHistory.push(result);
    return result;
  }

  public marginalAnalysis(
    totalCost: number,
    totalBenefit: number,
    additionalCost: number,
    additionalBenefit: number
  ): { marginalCost: number; marginalBenefit: number; shouldProceed: boolean } {
    const marginalCost = additionalCost;
    const marginalBenefit = additionalBenefit;
    const shouldProceed = marginalBenefit > marginalCost;
    return { marginalCost, marginalBenefit, shouldProceed };
  }

  public allocateResource(
    resourceId: string,
    amount: number,
    opportunityCost: number,
    marginalProduct: number
  ): void {
    this._allocations.set(resourceId, {
      resourceId,
      allocated: amount,
      opportunityCost,
      marginalProduct
    });
  }

  public getAllocation(resourceId: string): ResourceAllocation | undefined {
    const a = this._allocations.get(resourceId);
    return a ? { ...a } : undefined;
  }

  public optimalAllocation(budget: number): Map<string, number> {
    const allocations = Array.from(this._allocations.values());
    const ratios = allocations.map(a => ({
      id: a.resourceId,
      ratio: a.marginalProduct / Math.max(0.001, a.opportunityCost)
    }));
    ratios.sort((a, b) => b.ratio - a.ratio);

    const result = new Map<string, number>();
    let remaining = budget;
    for (const r of ratios) {
      const alloc = this._allocations.get(r.id)!;
      const amount = Math.min(remaining, alloc.allocated);
      result.set(r.id, amount);
      remaining -= amount;
      if (remaining <= 0) break;
    }
    return result;
  }

  public opportunityCostAnalysis(options: string[], costs: number[][]): OpportunityCostMatrix {
    const n = options.length;
    let minTotal = Infinity;
    let optimalChoice = 0;

    for (let i = 0; i < n; i++) {
      const total = costs[i].reduce((a, b) => a + b, 0);
      if (total < minTotal) {
        minTotal = total;
        optimalChoice = i;
      }
    }

    const regrets: number[] = new Array(n).fill(0);
    for (let j = 0; j < costs[0].length; j++) {
      let minCost = Infinity;
      for (let i = 0; i < n; i++) {
        if (costs[i][j] < minCost) minCost = costs[i][j];
      }
      for (let i = 0; i < n; i++) {
        regrets[i] += costs[i][j] - minCost;
      }
    }

    const minRegret = Math.min(...regrets);

    return { options, costs, optimalChoice, minRegret };
  }

  public sensitivityAnalysis(
    baseNPV: number,
    variable: string,
    baseValue: number,
    optimisticChange: number,
    pessimisticChange: number,
    impactFunction: (value: number) => number
  ): SensitivityAnalysis {
    const optimisticValue = baseValue * (1 + optimisticChange);
    const pessimisticValue = baseValue * (1 + pessimisticChange);

    const baseImpact = impactFunction(baseValue);
    const optimisticImpact = impactFunction(optimisticValue);
    const pessimisticImpact = impactFunction(pessimisticValue);

    const impactOnNPV = [pessimisticImpact, baseImpact, optimisticImpact];

    const range = Math.abs(optimisticImpact - pessimisticImpact);
    const sensitivityIndex = range / Math.abs(baseNPV);

    return {
      variable,
      baseValue,
      optimisticValue,
      pessimisticValue,
      impactOnNPV,
      sensitivityIndex
    };
  }

  public breakEvenAnalysis(
    fixedCost: number,
    variableCostPerUnit: number,
    pricePerUnit: number
  ): { breakEvenQuantity: number; breakEvenRevenue: number } {
    const contributionMargin = pricePerUnit - variableCostPerUnit;
    if (contributionMargin <= 0) return { breakEvenQuantity: Infinity, breakEvenRevenue: Infinity };
    const breakEvenQuantity = fixedCost / contributionMargin;
    const breakEvenRevenue = breakEvenQuantity * pricePerUnit;
    return { breakEvenQuantity, breakEvenRevenue };
  }

  public calculateEconomicOrderQuantity(
    demand: number,
    orderingCost: number,
    holdingCost: number
  ): number {
    if (holdingCost <= 0) return 0;
    return Math.sqrt((2 * demand * orderingCost) / holdingCost);
  }

  public shadowPrice(
    constraintValue: number,
    marginalBenefit: number,
    totalBenefit: number
  ): number {
    return constraintValue > 0 ? marginalBenefit / constraintValue : 0;
  }

  public paretoImprovement(
    currentUtilities: number[],
    newUtilities: number[]
  ): { isImprovement: boolean; gainers: number[]; losers: number[] } {
    const gainers: number[] = [];
    const losers: number[] = [];
    let isImprovement = true;

    for (let i = 0; i < currentUtilities.length; i++) {
      if (newUtilities[i] > currentUtilities[i]) {
        gainers.push(i);
      } else if (newUtilities[i] < currentUtilities[i]) {
          losers.push(i);
          isImprovement = false;
        }
    }

    return { isImprovement, gainers, losers };
  }

  public kaldorHicksEfficiency(
    currentUtilities: number[],
    newUtilities: number[]
  ): { isEfficient: boolean; netGain: number; compensationRequired: number } {
    let totalGain = 0;
    let totalLoss = 0;

    for (let i = 0; i < currentUtilities.length; i++) {
      const diff = newUtilities[i] - currentUtilities[i];
      if (diff > 0) {
        totalGain += diff;
      } else {
        totalLoss += Math.abs(diff);
      }
    }

    return {
      isEfficient: totalGain > totalLoss,
      netGain: totalGain - totalLoss,
      compensationRequired: totalLoss
    };
  }

  public analysisToPacket(result: CostBenefitResult): DataPacket<CostBenefitResult> {
    return {
      id: `economic-analysis-${Date.now()}`,
      payload: result,
      metadata: {
        createdAt: Date.now(),
        route: ['economic', 'calculus', 'result'],
        priority: 0.7,
        phase: 'analysis'
      }
    };
  }

  public resourceSignal(allocation: ResourceAllocation): Signal {
    return {
      source: allocation.resourceId,
      magnitude: allocation.allocated,
      entropy: allocation.opportunityCost / Math.max(0.001, allocation.marginalProduct),
      timestamp: Date.now()
    };
  }

  public reset(): void {
    this._allocations.clear();
    this._analysisHistory = [];
  }

  public getAnalysisHistory(): CostBenefitResult[] {
    return [...this._analysisHistory];
  }

  public getAllAllocations(): ResourceAllocation[] {
    return Array.from(this._allocations.values()).map(a => ({ ...a }));
  }
}

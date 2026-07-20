import { DataPacket, Signal, PacketMeta } from '../shared/types';

export interface CostBenefitResult {
  totalCost: number;
  totalBenefit: number;
  netBenefit: number;
  benefitCostRatio: number;
  roi: number;
  breakEvenPoint: number;
  paybackPeriod: number;
  netPresentValue: number;
}

export interface ResourceAllocation {
  resourceId: string;
  allocated: number;
  opportunityCost: number;
  marginalProduct: number;
  efficiency: number;
  shadowPrice: number;
}

export interface DiscountedCashFlow {
  npv: number;
  irr: number;
  paybackPeriod: number;
  discountedPayback: number;
  profitabilityIndex: number;
  npvProfile: { rate: number; npv: number }[];
}

export interface SensitivityAnalysis {
  variable: string;
  baseValue: number;
  optimisticValue: number;
  pessimisticValue: number;
  impactOnNPV: number[];
  sensitivityIndex: number;
  tornadoChartData: { label: string; min: number; max: number; base: number }[];
}

export interface OpportunityCostMatrix {
  options: string[];
  costs: number[][];
  benefits: number[][];
  optimalChoice: number;
  minRegret: number;
  expectedValue: number;
}

export interface CapitalBudgetingResult {
  projects: string[];
  selected: string[];
  totalNPV: number;
  totalCost: number;
  budgetUtilization: number;
  ranking: { project: string; npv: number; cost: number; ratio: number }[];
}

export interface RiskAnalysis {
  mean: number;
  variance: number;
  standardDeviation: number;
  skewness: number;
  kurtosis: number;
  valueAtRisk: number;
  conditionalValueAtRisk: number;
}

export interface BreakEvenAnalysis {
  breakEvenQuantity: number;
  breakEvenRevenue: number;
  contributionMargin: number;
  contributionMarginRatio: number;
  marginOfSafety: number;
  targetProfitQuantity: number;
}

export interface EconomicOrderQuantity {
  eoq: number;
  totalCost: number;
  orderingCost: number;
  holdingCost: number;
  optimalOrdersPerYear: number;
  cycleTime: number;
}

export interface TimeValueOfMoney {
  presentValue: number;
  futureValue: number;
  annuityPayment: number;
  numberPeriods: number;
  internalRate: number;
}

export interface GameTheoryResult {
  nashEquilibrium: number[];
  payoffs: number[];
  paretoOptimal: boolean;
  socialWelfare: number;
}

export class EconomicCalculus {
  private _discountRate: number;
  private _timeHorizon: number;
  private _allocations: Map<string, ResourceAllocation>;
  private _analysisHistory: CostBenefitResult[];
  private _riskPremium: number;
  private _taxRate: number;
  private _inflationRate: number;
  private _capitalCost: number;
  private _depreciationRate: number;
  private _projectHistory: CapitalBudgetingResult[];

  constructor(discountRate: number = 0.05) {
    this._discountRate = discountRate;
    this._timeHorizon = 10;
    this._allocations = new Map();
    this._analysisHistory = [];
    this._riskPremium = 0.03;
    this._taxRate = 0.2;
    this._inflationRate = 0.02;
    this._capitalCost = 0.08;
    this._depreciationRate = 0.1;
    this._projectHistory = [];
  }

  get discountRate(): number { return this._discountRate; }
  get timeHorizon(): number { return this._timeHorizon; }
  get riskPremium(): number { return this._riskPremium; }
  get taxRate(): number { return this._taxRate; }
  get inflationRate(): number { return this._inflationRate; }
  get capitalCost(): number { return this._capitalCost; }
  get depreciationRate(): number { return this._depreciationRate; }

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

  public setCapitalCost(cost: number): void {
    this._capitalCost = Math.max(0, cost);
  }

  public setDepreciationRate(rate: number): void {
    this._depreciationRate = Math.max(0, Math.min(1, rate));
  }

  public calculatePresentValue(futureValue: number, periods: number, rate?: number): number {
    const r = rate ?? this._discountRate;
    return futureValue / Math.pow(1 + r, periods);
  }

  public calculateFutureValue(presentValue: number, periods: number, rate?: number): number {
    const r = rate ?? this._discountRate;
    return presentValue * Math.pow(1 + r, periods);
  }

  public calculateAnnuityPayment(presentValue: number, periods: number, rate?: number): number {
    const r = rate ?? this._discountRate;
    if (r === 0) return presentValue / periods;
    return presentValue * r / (1 - Math.pow(1 + r, -periods));
  }

  public calculateAnnuityPresentValue(payment: number, periods: number, rate?: number): number {
    const r = rate ?? this._discountRate;
    if (r === 0) return payment * periods;
    return payment * (1 - Math.pow(1 + r, -periods)) / r;
  }

  public calculateAnnuityFutureValue(payment: number, periods: number, rate?: number): number {
    const r = rate ?? this._discountRate;
    if (r === 0) return payment * periods;
    return payment * (Math.pow(1 + r, periods) - 1) / r;
  }

  public calculateGrowingAnnuityPresentValue(payment: number, growthRate: number, periods: number, rate?: number): number {
    const r = rate ?? this._discountRate;
    if (r === growthRate) return payment * periods;
    return payment * (1 - Math.pow((1 + growthRate) / (1 + r), periods)) / (r - growthRate);
  }

  public calculatePerpetuityValue(payment: number, rate?: number): number {
    const r = rate ?? this._discountRate;
    return payment / r;
  }

  public calculateGrowingPerpetuityValue(payment: number, growthRate: number, rate?: number): number {
    const r = rate ?? this._discountRate;
    return payment / (r - growthRate);
  }

  public calculateNPV(initialInvestment: number, cashFlows: number[], rate?: number): number {
    const r = rate ?? this._discountRate;
    let npv = -initialInvestment;
    for (let t = 0; t < cashFlows.length; t++) {
      npv += cashFlows[t] / Math.pow(1 + r, t + 1);
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

  public calculateModifiedIRR(initialInvestment: number, cashFlows: number[], financingRate: number = 0.05): number {
    const positiveFlows: number[] = [];
    const negativeFlows: number[] = [];
    
    for (let t = 0; t < cashFlows.length; t++) {
      if (cashFlows[t] >= 0) {
        positiveFlows.push(cashFlows[t]);
      } else {
        negativeFlows.push(cashFlows[t]);
      }
    }
    
    const pvNegative = negativeFlows.reduce((sum, cf, t) => sum + cf / Math.pow(1 + financingRate, t + 1), 0);
    const fvPositive = positiveFlows.reduce((sum, cf, t) => sum + cf * Math.pow(1 + this._discountRate, positiveFlows.length - t - 1), 0);
    
    return Math.pow(fvPositive / (-pvNegative - initialInvestment), 1 / cashFlows.length) - 1;
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

  public calculateDiscountedPaybackPeriod(initialInvestment: number, cashFlows: number[], rate?: number): number {
    const r = rate ?? this._discountRate;
    let cumulative = 0;
    for (let i = 0; i < cashFlows.length; i++) {
      cumulative += cashFlows[i] / Math.pow(1 + r, i + 1);
      if (cumulative >= initialInvestment) {
        const prevCumulative = cumulative - cashFlows[i] / Math.pow(1 + r, i + 1);
        const discountedFlow = cashFlows[i] / Math.pow(1 + r, i + 1);
        const fraction = (initialInvestment - prevCumulative) / discountedFlow;
        return i + fraction;
      }
    }
    return -1;
  }

  public calculateProfitabilityIndex(initialInvestment: number, cashFlows: number[], rate?: number): number {
    const r = rate ?? this._discountRate;
    let pvOfBenefits = 0;
    for (let t = 0; t < cashFlows.length; t++) {
      pvOfBenefits += cashFlows[t] / Math.pow(1 + r, t + 1);
    }
    return pvOfBenefits / initialInvestment;
  }

  public discountedCashFlowAnalysis(initialInvestment: number, cashFlows: number[], rate?: number): DiscountedCashFlow {
    const r = rate ?? this._discountRate;
    const npv = this.calculateNPV(initialInvestment, cashFlows, r);
    const irr = this.calculateIRR(initialInvestment, cashFlows);
    const paybackPeriod = this.calculatePaybackPeriod(initialInvestment, cashFlows);
    const discountedPayback = this.calculateDiscountedPaybackPeriod(initialInvestment, cashFlows, r);
    const profitabilityIndex = this.calculateProfitabilityIndex(initialInvestment, cashFlows, r);
    
    const npvProfile: { rate: number; npv: number }[] = [];
    for (let i = 0; i <= 20; i++) {
      const testRate = i * 0.01;
      npvProfile.push({ rate: testRate, npv: this.calculateNPV(initialInvestment, cashFlows, testRate) });
    }

    return { npv, irr, paybackPeriod, discountedPayback, profitabilityIndex, npvProfile };
  }

  public costBenefitAnalysis(costs: number[], benefits: number[], timeline: number = 1): CostBenefitResult {
    const totalCost = costs.reduce((a, b) => a + b, 0);
    const totalBenefit = benefits.reduce((a, b) => a + b, 0);
    const netBenefit = totalBenefit - totalCost;
    const benefitCostRatio = totalCost > 0 ? totalBenefit / totalCost : 0;
    const roi = totalCost > 0 ? (netBenefit / totalCost) * 100 : 0;
    const breakEvenPoint = totalBenefit > 0 ? (totalCost / totalBenefit) * timeline : 0;
    const paybackPeriod = this.calculatePaybackPeriod(totalCost, [totalBenefit]);
    const netPresentValue = this.calculateNPV(totalCost, benefits);

    const result: CostBenefitResult = {
      totalCost,
      totalBenefit,
      netBenefit,
      benefitCostRatio,
      roi,
      breakEvenPoint,
      paybackPeriod,
      netPresentValue,
    };

    this._analysisHistory.push(result);
    return result;
  }

  public marginalAnalysis(totalCost: number, totalBenefit: number, additionalCost: number, additionalBenefit: number): { 
    marginalCost: number; 
    marginalBenefit: number; 
    shouldProceed: boolean;
    marginalReturn: number;
    optimalQuantity: number;
  } {
    const marginalCost = additionalCost;
    const marginalBenefit = additionalBenefit;
    const shouldProceed = marginalBenefit > marginalCost;
    const marginalReturn = marginalCost > 0 ? (marginalBenefit - marginalCost) / marginalCost : 0;
    const optimalQuantity = shouldProceed ? Math.floor(marginalBenefit / marginalCost) : 0;

    return { marginalCost, marginalBenefit, shouldProceed, marginalReturn, optimalQuantity };
  }

  public marginalCostFunction(quantity: number, fixedCost: number, variableCostPerUnit: number): number {
    return variableCostPerUnit;
  }

  public marginalRevenueFunction(quantity: number, price: number, demandElasticity: number): number {
    return price * (1 + 1 / demandElasticity);
  }

  public profitMaximizingQuantity(fixedCost: number, variableCostPerUnit: number, price: number, demandElasticity: number): number {
    const marginalCost = variableCostPerUnit;
    const marginalRevenue = this.marginalRevenueFunction(0, price, demandElasticity);
    return marginalRevenue > marginalCost ? Math.floor((price - marginalCost) / (price * (1 - 1 / demandElasticity))) : 0;
  }

  public allocateResource(resourceId: string, amount: number, opportunityCost: number, marginalProduct: number): void {
    const efficiency = marginalProduct > 0 ? 1 - (opportunityCost / marginalProduct) : 0;
    const shadowPrice = opportunityCost > 0 ? marginalProduct / opportunityCost : 0;
    this._allocations.set(resourceId, {
      resourceId,
      allocated: amount,
      opportunityCost,
      marginalProduct,
      efficiency: Math.max(0, efficiency),
      shadowPrice,
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

  public opportunityCostAnalysis(options: string[], costs: number[][], benefits: number[][]): OpportunityCostMatrix {
    const n = options.length;
    let maxTotal = -Infinity;
    let optimalChoice = 0;

    for (let i = 0; i < n; i++) {
      const total = benefits[i].reduce((a, b) => a + b, 0) - costs[i].reduce((a, b) => a + b, 0);
      if (total > maxTotal) {
        maxTotal = total;
        optimalChoice = i;
      }
    }

    const regrets: number[] = new Array(n).fill(0);
    for (let j = 0; j < costs[0].length; j++) {
      let maxBenefit = -Infinity;
      for (let i = 0; i < n; i++) {
        const net = benefits[i][j] - costs[i][j];
        if (net > maxBenefit) maxBenefit = net;
      }
      for (let i = 0; i < n; i++) {
        regrets[i] += maxBenefit - (benefits[i][j] - costs[i][j]);
      }
    }

    const minRegret = Math.min(...regrets);
    const expectedValue = maxTotal;

    return { options, costs, benefits, optimalChoice, minRegret, expectedValue };
  }

  public sensitivityAnalysis(baseNPV: number, variable: string, baseValue: number, optimisticChange: number, pessimisticChange: number, impactFunction: (value: number) => number): SensitivityAnalysis {
    const optimisticValue = baseValue * (1 + optimisticChange);
    const pessimisticValue = baseValue * (1 + pessimisticChange);

    const baseImpact = impactFunction(baseValue);
    const optimisticImpact = impactFunction(optimisticValue);
    const pessimisticImpact = impactFunction(pessimisticValue);

    const impactOnNPV = [pessimisticImpact, baseImpact, optimisticImpact];

    const range = Math.abs(optimisticImpact - pessimisticImpact);
    const sensitivityIndex = range / Math.abs(baseNPV);

    const tornadoChartData = [{
      label: variable,
      min: pessimisticImpact,
      max: optimisticImpact,
      base: baseImpact,
    }];

    return {
      variable,
      baseValue,
      optimisticValue,
      pessimisticValue,
      impactOnNPV,
      sensitivityIndex,
      tornadoChartData,
    };
  }

  public multiVariableSensitivityAnalysis(variables: { name: string; baseValue: number; optimisticChange: number; pessimisticChange: number; impactFunction: (value: number) => number }[], baseNPV: number): SensitivityAnalysis[] {
    return variables.map(v => this.sensitivityAnalysis(baseNPV, v.name, v.baseValue, v.optimisticChange, v.pessimisticChange, v.impactFunction));
  }

  public breakEvenAnalysis(fixedCost: number, variableCostPerUnit: number, pricePerUnit: number, targetProfit: number = 0): BreakEvenAnalysis {
    const contributionMargin = pricePerUnit - variableCostPerUnit;
    const contributionMarginRatio = pricePerUnit > 0 ? contributionMargin / pricePerUnit : 0;
    
    if (contributionMargin <= 0) {
      return {
        breakEvenQuantity: Infinity,
        breakEvenRevenue: Infinity,
        contributionMargin: 0,
        contributionMarginRatio: 0,
        marginOfSafety: 0,
        targetProfitQuantity: Infinity,
      };
    }
    
    const breakEvenQuantity = fixedCost / contributionMargin;
    const breakEvenRevenue = breakEvenQuantity * pricePerUnit;
    const marginOfSafety = pricePerUnit > 0 ? (pricePerUnit - breakEvenQuantity * variableCostPerUnit) / pricePerUnit : 0;
    const targetProfitQuantity = (fixedCost + targetProfit) / contributionMargin;

    return {
      breakEvenQuantity,
      breakEvenRevenue,
      contributionMargin,
      contributionMarginRatio,
      marginOfSafety,
      targetProfitQuantity,
    };
  }

  public calculateEconomicOrderQuantity(demand: number, orderingCost: number, holdingCost: number, unitPrice: number = 0): EconomicOrderQuantity {
    if (holdingCost <= 0) {
      return {
        eoq: 0,
        totalCost: 0,
        orderingCost: 0,
        holdingCost: 0,
        optimalOrdersPerYear: 0,
        cycleTime: 0,
      };
    }
    
    const eoq = Math.sqrt((2 * demand * orderingCost) / holdingCost);
    const orderingCostTotal = (demand / eoq) * orderingCost;
    const holdingCostTotal = (eoq / 2) * holdingCost;
    const totalCost = orderingCostTotal + holdingCostTotal;
    const optimalOrdersPerYear = demand / eoq;
    const cycleTime = 365 / optimalOrdersPerYear;

    return {
      eoq: Number(eoq.toFixed(2)),
      totalCost: Number(totalCost.toFixed(2)),
      orderingCost: Number(orderingCostTotal.toFixed(2)),
      holdingCost: Number(holdingCostTotal.toFixed(2)),
      optimalOrdersPerYear: Number(optimalOrdersPerYear.toFixed(2)),
      cycleTime: Number(cycleTime.toFixed(2)),
    };
  }

  public shadowPrice(constraintValue: number, marginalBenefit: number, totalBenefit: number): number {
    return constraintValue > 0 ? marginalBenefit / constraintValue : 0;
  }

  public capitalRationing(projects: { name: string; cost: number; npv: number }[], budget: number): CapitalBudgetingResult {
    const ranking = projects
      .map(p => ({ project: p.name, npv: p.npv, cost: p.cost, ratio: p.npv / p.cost }))
      .sort((a, b) => b.ratio - a.ratio);

    const selected: string[] = [];
    let totalNPV = 0;
    let totalCost = 0;

    for (const p of ranking) {
      if (totalCost + p.cost <= budget) {
        selected.push(p.project);
        totalNPV += p.npv;
        totalCost += p.cost;
      }
    }

    const budgetUtilization = budget > 0 ? totalCost / budget : 0;

    const result: CapitalBudgetingResult = {
      projects: projects.map(p => p.name),
      selected,
      totalNPV,
      totalCost,
      budgetUtilization,
      ranking,
    };

    this._projectHistory.push(result);
    return result;
  }

  public riskAnalysis(cashFlows: number[]): RiskAnalysis {
    const mean = cashFlows.reduce((sum, cf) => sum + cf, 0) / cashFlows.length;
    const variance = cashFlows.reduce((sum, cf) => sum + Math.pow(cf - mean, 2), 0) / cashFlows.length;
    const standardDeviation = Math.sqrt(variance);
    
    const skewness = cashFlows.reduce((sum, cf) => sum + Math.pow(cf - mean, 3), 0) / (cashFlows.length * Math.pow(standardDeviation, 3));
    const kurtosis = cashFlows.reduce((sum, cf) => sum + Math.pow(cf - mean, 4), 0) / (cashFlows.length * Math.pow(standardDeviation, 4)) - 3;

    const sortedFlows = [...cashFlows].sort((a, b) => a - b);
    const var95Index = Math.floor(sortedFlows.length * 0.05);
    const valueAtRisk = sortedFlows[var95Index];
    const conditionalValueAtRisk = sortedFlows.slice(0, var95Index + 1).reduce((sum, cf) => sum + cf, 0) / (var95Index + 1);

    return {
      mean: Number(mean.toFixed(2)),
      variance: Number(variance.toFixed(2)),
      standardDeviation: Number(standardDeviation.toFixed(2)),
      skewness: Number(skewness.toFixed(2)),
      kurtosis: Number(kurtosis.toFixed(2)),
      valueAtRisk: Number(valueAtRisk.toFixed(2)),
      conditionalValueAtRisk: Number(conditionalValueAtRisk.toFixed(2)),
    };
  }

  public monteCarloSimulation(runs: number, generateCashFlows: () => number[]): RiskAnalysis {
    const allNPVs: number[] = [];
    for (let i = 0; i < runs; i++) {
      const cashFlows = generateCashFlows();
      allNPVs.push(this.calculateNPV(0, cashFlows));
    }
    return this.riskAnalysis(allNPVs);
  }

  public paretoImprovement(currentUtilities: number[], newUtilities: number[]): { isImprovement: boolean; gainers: number[]; losers: number[]; totalGain: number; totalLoss: number } {
    const gainers: number[] = [];
    const losers: number[] = [];
    let isImprovement = true;
    let totalGain = 0;
    let totalLoss = 0;

    for (let i = 0; i < currentUtilities.length; i++) {
      const diff = newUtilities[i] - currentUtilities[i];
      if (diff > 0) {
        gainers.push(i);
        totalGain += diff;
      } else if (diff < 0) {
          losers.push(i);
          totalLoss += Math.abs(diff);
          isImprovement = false;
        }
    }

    return { isImprovement, gainers, losers, totalGain, totalLoss };
  }

  public kaldorHicksEfficiency(currentUtilities: number[], newUtilities: number[]): { isEfficient: boolean; netGain: number; compensationRequired: number; potentialWinners: number; potentialLosers: number } {
    let totalGain = 0;
    let totalLoss = 0;
    let potentialWinners = 0;
    let potentialLosers = 0;

    for (let i = 0; i < currentUtilities.length; i++) {
      const diff = newUtilities[i] - currentUtilities[i];
      if (diff > 0) {
        totalGain += diff;
        potentialWinners++;
      } else if (diff < 0) {
        totalLoss += Math.abs(diff);
        potentialLosers++;
      }
    }

    return {
      isEfficient: totalGain > totalLoss,
      netGain: totalGain - totalLoss,
      compensationRequired: totalLoss,
      potentialWinners,
      potentialLosers,
    };
  }

  public calculateWACC(equityCost: number, debtCost: number, equityWeight: number, debtWeight: number, taxRate?: number): number {
    const tr = taxRate ?? this._taxRate;
    return equityCost * equityWeight + debtCost * (1 - tr) * debtWeight;
  }

  public calculateFreeCashFlow(ebit: number, taxRate: number, depreciation: number, capitalExpenditure: number, changeInWorkingCapital: number): number {
    return ebit * (1 - taxRate) + depreciation - capitalExpenditure - changeInWorkingCapital;
  }

  public calculateTerminalValue(fcf: number, growthRate: number, discountRate: number): number {
    return fcf * (1 + growthRate) / (discountRate - growthRate);
  }

  public calculateEnterpriseValue(fcfs: number[], terminalValue: number, discountRate: number): number {
    let ev = 0;
    for (let t = 0; t < fcfs.length; t++) {
      ev += fcfs[t] / Math.pow(1 + discountRate, t + 1);
    }
    ev += terminalValue / Math.pow(1 + discountRate, fcfs.length);
    return ev;
  }

  public calculateEquityValue(enterpriseValue: number, debt: number, cash: number): number {
    return enterpriseValue - debt + cash;
  }

  public analysisToPacket(result: CostBenefitResult): DataPacket<CostBenefitResult> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['economic', 'calculus', 'result'],
      priority: 0.7,
      phase: 'analysis'
    };
    return {
      id: `economic-analysis-${Date.now()}`,
      payload: result,
      metadata,
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

  /** Compute the internal rate of return (IRR) via bisection. */
  public irr(cashFlows: number[]): number {
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

  /** Compute the modified internal rate of return (MIRR). */
  public mirr(cashFlows: number[], financeRate: number = 0.1, reinvestRate: number = 0.1): number {
    const positives = cashFlows.filter(cf => cf > 0);
    const negatives = cashFlows.filter(cf => cf < 0);
    if (positives.length === 0 || negatives.length === 0) return 0;
    const futureValue = positives.reduce((s, cf, t) => s + cf * Math.pow(1 + reinvestRate, cashFlows.length - 1 - t), 0);
    const presentValue = Math.abs(negatives.reduce((s, cf, t) => s + cf / Math.pow(1 + financeRate, t), 0));
    if (presentValue === 0) return 0;
    const n = cashFlows.length - 1;
    return Number((Math.pow(futureValue / presentValue, 1 / n) - 1).toFixed(4));
  }

  /** Compute the profitability index. */
  public profitabilityIndex(cashFlows: number[], discountRate: number): number {
    if (cashFlows.length === 0 || cashFlows[0] === 0) return 0;
    const pv = this.netPresentValue(cashFlows, discountRate) - cashFlows[0];
    return Number((pv / Math.abs(cashFlows[0])).toFixed(4));
  }

  /** Compute the discounted payback period. */
  public discountedPaybackPeriod(cashFlows: number[], discountRate: number): number {
    let cumulative = 0;
    for (let t = 0; t < cashFlows.length; t++) {
      const discounted = cashFlows[t] / Math.pow(1 + discountRate, t);
      if (cumulative + discounted >= 0) {
        const prev = cumulative;
        cumulative += discounted;
        const fraction = Math.abs(prev) / Math.abs(discounted);
        return Number((t - 1 + fraction).toFixed(4));
      }
      cumulative += discounted;
    }
    return Infinity;
  }

  /** Compute the accounting rate of return. */
  public accountingRateOfReturn(averageProfit: number, initialInvestment: number): number {
    if (initialInvestment === 0) return 0;
    return Number((averageProfit / initialInvestment).toFixed(4));
  }

  /** Compute the equivalent annual annuity. */
  public equivalentAnnualAnnuity(npv: number, discountRate: number, periods: number): number {
    if (periods === 0) return 0;
    const factor = (1 - Math.pow(1 + discountRate, -periods)) / discountRate;
    if (factor === 0) return 0;
    return Number((npv / factor).toFixed(4));
  }

  /** Compute the capital asset pricing model (CAPM) expected return. */
  public capmReturn(riskFreeRate: number, beta: number, marketReturn: number): number {
    return Number((riskFreeRate + beta * (marketReturn - riskFreeRate)).toFixed(4));
  }

  /** Compute the weighted average cost of capital (WACC). */
  public wacc(equityValue: number, debtValue: number, costOfEquity: number, costOfDebt: number, taxRate: number): number {
    const total = equityValue + debtValue;
    if (total === 0) return 0;
    const equityWeight = equityValue / total;
    const debtWeight = debtValue / total;
    return Number((equityWeight * costOfEquity + debtWeight * costOfDebt * (1 - taxRate)).toFixed(4));
  }

  /** Compute the Gordon growth model (dividend discount). */
  public gordonGrowthModel(dividend: number, growthRate: number, discountRate: number): number {
    if (discountRate <= growthRate) return 0;
    return Number((dividend * (1 + growthRate) / (discountRate - growthRate)).toFixed(4));
  }

  /** Compute the price-to-earnings ratio. */
  public priceToEarnings(marketPrice: number, earningsPerShare: number): number {
    if (earningsPerShare === 0) return 0;
    return Number((marketPrice / earningsPerShare).toFixed(4));
  }

  /** Compute the dividend yield. */
  public dividendYield(annualDividend: number, marketPrice: number): number {
    if (marketPrice === 0) return 0;
    return Number((annualDividend / marketPrice).toFixed(4));
  }

  /** Compute the earnings per share. */
  public earningsPerShare(netIncome: number, preferredDividends: number, weightedShares: number): number {
    if (weightedShares === 0) return 0;
    return Number(((netIncome - preferredDividends) / weightedShares).toFixed(4));
  }

  /** Compute the return on equity. */
  public returnOnEquity(netIncome: number, shareholderEquity: number): number {
    if (shareholderEquity === 0) return 0;
    return Number((netIncome / shareholderEquity).toFixed(4));
  }

  /** Compute the return on assets. */
  public returnOnAssets(netIncome: number, totalAssets: number): number {
    if (totalAssets === 0) return 0;
    return Number((netIncome / totalAssets).toFixed(4));
  }

  /** Compute the return on invested capital. */
  public returnOnInvestedCapital(nopat: number, investedCapital: number): number {
    if (investedCapital === 0) return 0;
    return Number((nopat / investedCapital).toFixed(4));
  }

  /** Compute the economic value added (EVA). */
  public economicValueAdded(nopat: number, investedCapital: number, wacc: number): number {
    return Number((nopat - investedCapital * wacc).toFixed(4));
  }

  /** Compute the free cash flow to firm. */
  public freeCashFlowToFirm(ebit: number, taxRate: number, depreciation: number, capex: number, workingCapitalChange: number): number {
    return Number((ebit * (1 - taxRate) + depreciation - capex - workingCapitalChange).toFixed(4));
  }

  /** Compute the free cash flow to equity. */
  public freeCashFlowToEquity(netIncome: number, depreciation: number, capex: number, workingCapitalChange: number, netBorrowing: number): number {
    return Number((netIncome + depreciation - capex - workingCapitalChange + netBorrowing).toFixed(4));
  }

  /** Compute the DuPont decomposition. */
  public dupontDecomposition(netIncome: number, revenue: number, totalAssets: number, shareholderEquity: number): { roe: number; profitMargin: number; assetTurnover: number; equityMultiplier: number } {
    const profitMargin = revenue === 0 ? 0 : netIncome / revenue;
    const assetTurnover = totalAssets === 0 ? 0 : revenue / totalAssets;
    const equityMultiplier = shareholderEquity === 0 ? 0 : totalAssets / shareholderEquity;
    const roe = profitMargin * assetTurnover * equityMultiplier;
    return {
      roe: Number(roe.toFixed(4)),
      profitMargin: Number(profitMargin.toFixed(4)),
      assetTurnover: Number(assetTurnover.toFixed(4)),
      equityMultiplier: Number(equityMultiplier.toFixed(4)),
    };
  }

  /** Compute the Altman Z-score (bankruptcy predictor). */
  public altmanZScore(workingCapital: number, retainedEarnings: number, ebit: number, marketValue: number, sales: number, totalAssets: number, totalLiabilities: number): number {
    if (totalAssets === 0 || totalLiabilities === 0) return 0;
    const a = workingCapital / totalAssets;
    const b = retainedEarnings / totalAssets;
    const c = ebit / totalAssets;
    const d = marketValue / totalLiabilities;
    const e = sales / totalAssets;
    return Number((1.2 * a + 1.4 * b + 3.3 * c + 0.6 * d + 1.0 * e).toFixed(4));
  }

  /** Compute the current ratio. */
  public currentRatio(currentAssets: number, currentLiabilities: number): number {
    if (currentLiabilities === 0) return 0;
    return Number((currentAssets / currentLiabilities).toFixed(4));
  }

  /** Compute the quick ratio. */
  public quickRatio(currentAssets: number, inventory: number, currentLiabilities: number): number {
    if (currentLiabilities === 0) return 0;
    return Number(((currentAssets - inventory) / currentLiabilities).toFixed(4));
  }

  /** Compute the debt-to-equity ratio. */
  public debtToEquity(totalDebt: number, shareholderEquity: number): number {
    if (shareholderEquity === 0) return 0;
    return Number((totalDebt / shareholderEquity).toFixed(4));
  }

  /** Compute the debt-to-assets ratio. */
  public debtToAssets(totalDebt: number, totalAssets: number): number {
    if (totalAssets === 0) return 0;
    return Number((totalDebt / totalAssets).toFixed(4));
  }

  /** Compute the interest coverage ratio. */
  public interestCoverageRatio(ebit: number, interestExpense: number): number {
    if (interestExpense === 0) return 0;
    return Number((ebit / interestExpense).toFixed(4));
  }

  /** Compute the inventory turnover ratio. */
  public inventoryTurnover(cogs: number, averageInventory: number): number {
    if (averageInventory === 0) return 0;
    return Number((cogs / averageInventory).toFixed(4));
  }

  /** Compute the receivables turnover ratio. */
  public receivablesTurnover(creditSales: number, averageReceivables: number): number {
    if (averageReceivables === 0) return 0;
    return Number((creditSales / averageReceivables).toFixed(4));
  }

  /** Compute the asset turnover ratio. */
  public assetTurnover(revenue: number, totalAssets: number): number {
    if (totalAssets === 0) return 0;
    return Number((revenue / totalAssets).toFixed(4));
  }

  /** Compute the gross profit margin. */
  public grossProfitMargin(revenue: number, cogs: number): number {
    if (revenue === 0) return 0;
    return Number(((revenue - cogs) / revenue).toFixed(4));
  }

  /** Compute the operating margin. */
  public operatingMargin(operatingIncome: number, revenue: number): number {
    if (revenue === 0) return 0;
    return Number((operatingIncome / revenue).toFixed(4));
  }

  /** Compute the net profit margin. */
  public netProfitMargin(netIncome: number, revenue: number): number {
    if (revenue === 0) return 0;
    return Number((netIncome / revenue).toFixed(4));
  }

  /** Compute the cash conversion cycle. */
  public cashConversionCycle(daysInventoryOutstanding: number, daysSalesOutstanding: number, daysPayableOutstanding: number): number {
    return daysInventoryOutstanding + daysSalesOutstanding - daysPayableOutstanding;
  }

  /** Compute the working capital. */
  public workingCapital(currentAssets: number, currentLiabilities: number): number {
    return currentAssets - currentLiabilities;
  }

  /** Compute the perpetuity value. */
  public perpetuityValue(payment: number, discountRate: number): number {
    if (discountRate === 0) return 0;
    return Number((payment / discountRate).toFixed(4));
  }

  /** Compute the growing perpetuity value. */
  public growingPerpetuityValue(payment: number, growthRate: number, discountRate: number): number {
    if (discountRate <= growthRate) return 0;
    return Number((payment / (discountRate - growthRate)).toFixed(4));
  }

  /** Compute the annuity future value. */
  public annuityFutureValue(payment: number, rate: number, periods: number): number {
    if (rate === 0) return payment * periods;
    return Number((payment * ((Math.pow(1 + rate, periods) - 1) / rate)).toFixed(4));
  }

  /** Compute the annuity present value. */
  public annuityPresentValue(payment: number, rate: number, periods: number): number {
    if (rate === 0) return payment * periods;
    return Number((payment * ((1 - Math.pow(1 + rate, -periods)) / rate)).toFixed(4));
  }

  /** Compute the bond price. */
  public bondPrice(faceValue: number, couponRate: number, discountRate: number, periods: number): number {
    const coupon = faceValue * couponRate;
    const pvCoupons = this.annuityPresentValue(coupon, discountRate, periods);
    const pvFace = this.presentValue(faceValue, discountRate, periods);
    return Number((pvCoupons + pvFace).toFixed(4));
  }

  /** Compute the bond yield to maturity (approximation). */
  public yieldToMaturity(faceValue: number, couponRate: number, marketPrice: number, periods: number): number {
    const coupon = faceValue * couponRate;
    let low = 0;
    let high = 1;
    for (let i = 0; i < 100; i++) {
      const mid = (low + high) / 2;
      const price = this.bondPrice(faceValue, couponRate, mid, periods);
      if (Math.abs(price - marketPrice) < 0.01) return Number(mid.toFixed(4));
      if (price > marketPrice) low = mid;
      else high = mid;
    }
    return Number(((low + high) / 2).toFixed(4));
  }

  /** Compute the duration of a bond. */
  public bondDuration(faceValue: number, couponRate: number, discountRate: number, periods: number): number {
    const coupon = faceValue * couponRate;
    let weightedSum = 0;
    let price = 0;
    for (let t = 1; t <= periods; t++) {
      const cf = t === periods ? coupon + faceValue : coupon;
      const pv = this.presentValue(cf, discountRate, t);
      weightedSum += t * pv;
      price += pv;
    }
    return price === 0 ? 0 : Number((weightedSum / price).toFixed(4));
  }

  /** Compute the modified duration. */
  public modifiedDuration(faceValue: number, couponRate: number, discountRate: number, periods: number): number {
    const duration = this.bondDuration(faceValue, couponRate, discountRate, periods);
    return Number((duration / (1 + discountRate)).toFixed(4));
  }

  /** Compute the convexity of a bond. */
  public bondConvexity(faceValue: number, couponRate: number, discountRate: number, periods: number): number {
    const coupon = faceValue * couponRate;
    let weightedSum = 0;
    let price = 0;
    for (let t = 1; t <= periods; t++) {
      const cf = t === periods ? coupon + faceValue : coupon;
      const pv = this.presentValue(cf, discountRate, t);
      weightedSum += t * (t + 1) * pv / Math.pow(1 + discountRate, 2);
      price += pv;
    }
    return price === 0 ? 0 : Number((weightedSum / price).toFixed(4));
  }

  /** Compute the Black-Scholes option price (call). */
  public blackScholesCall(spot: number, strike: number, riskFreeRate: number, volatility: number, timeToMaturity: number): number {
    if (timeToMaturity === 0) return Math.max(0, spot - strike);
    const d1 = (Math.log(spot / strike) + (riskFreeRate + 0.5 * volatility * volatility) * timeToMaturity) / (volatility * Math.sqrt(timeToMaturity));
    const d2 = d1 - volatility * Math.sqrt(timeToMaturity);
    const nd1 = this._standardNormalCDF(d1);
    const nd2 = this._standardNormalCDF(d2);
    return Number((spot * nd1 - strike * Math.exp(-riskFreeRate * timeToMaturity) * nd2).toFixed(4));
  }

  /** Compute the Black-Scholes option price (put). */
  public blackScholesPut(spot: number, strike: number, riskFreeRate: number, volatility: number, timeToMaturity: number): number {
    if (timeToMaturity === 0) return Math.max(0, strike - spot);
    const d1 = (Math.log(spot / strike) + (riskFreeRate + 0.5 * volatility * volatility) * timeToMaturity) / (volatility * Math.sqrt(timeToMaturity));
    const d2 = d1 - volatility * Math.sqrt(timeToMaturity);
    const nd1 = this._standardNormalCDF(-d1);
    const nd2 = this._standardNormalCDF(-d2);
    return Number((strike * Math.exp(-riskFreeRate * timeToMaturity) * nd2 - spot * nd1).toFixed(4));
  }

  /** Standard normal cumulative distribution function (approximation). */
  private _standardNormalCDF(x: number): number {
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp(-x * x / 2);
    const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return x > 0 ? 1 - p : p;
  }

  /** Compute the option delta. */
  public optionDelta(spot: number, strike: number, riskFreeRate: number, volatility: number, timeToMaturity: number): number {
    if (timeToMaturity === 0) return spot > strike ? 1 : 0;
    const d1 = (Math.log(spot / strike) + (riskFreeRate + 0.5 * volatility * volatility) * timeToMaturity) / (volatility * Math.sqrt(timeToMaturity));
    return Number(this._standardNormalCDF(d1).toFixed(4));
  }

  /** Compute the option gamma. */
  public optionGamma(spot: number, strike: number, riskFreeRate: number, volatility: number, timeToMaturity: number): number {
    if (timeToMaturity === 0 || spot === 0) return 0;
    const d1 = (Math.log(spot / strike) + (riskFreeRate + 0.5 * volatility * volatility) * timeToMaturity) / (volatility * Math.sqrt(timeToMaturity));
    const nPrime = Math.exp(-d1 * d1 / 2) / Math.sqrt(2 * Math.PI);
    return Number((nPrime / (spot * volatility * Math.sqrt(timeToMaturity))).toFixed(4));
  }

  /** Compute the option vega. */
  public optionVega(spot: number, strike: number, riskFreeRate: number, volatility: number, timeToMaturity: number): number {
    if (timeToMaturity === 0) return 0;
    const d1 = (Math.log(spot / strike) + (riskFreeRate + 0.5 * volatility * volatility) * timeToMaturity) / (volatility * Math.sqrt(timeToMaturity));
    const nPrime = Math.exp(-d1 * d1 / 2) / Math.sqrt(2 * Math.PI);
    return Number((spot * nPrime * Math.sqrt(timeToMaturity) / 100).toFixed(4));
  }

  /** Compute the option theta. */
  public optionTheta(spot: number, strike: number, riskFreeRate: number, volatility: number, timeToMaturity: number): number {
    if (timeToMaturity === 0) return 0;
    const d1 = (Math.log(spot / strike) + (riskFreeRate + 0.5 * volatility * volatility) * timeToMaturity) / (volatility * Math.sqrt(timeToMaturity));
    const d2 = d1 - volatility * Math.sqrt(timeToMaturity);
    const nPrime = Math.exp(-d1 * d1 / 2) / Math.sqrt(2 * Math.PI);
    const term1 = -spot * nPrime * volatility / (2 * Math.sqrt(timeToMaturity));
    const term2 = -riskFreeRate * strike * Math.exp(-riskFreeRate * timeToMaturity) * this._standardNormalCDF(d2);
    return Number(((term1 + term2) / 365).toFixed(4));
  }

  /** Compute the option rho. */
  public optionRho(spot: number, strike: number, riskFreeRate: number, volatility: number, timeToMaturity: number): number {
    if (timeToMaturity === 0) return 0;
    const d1 = (Math.log(spot / strike) + (riskFreeRate + 0.5 * volatility * volatility) * timeToMaturity) / (volatility * Math.sqrt(timeToMaturity));
    const d2 = d1 - volatility * Math.sqrt(timeToMaturity);
    return Number((strike * timeToMaturity * Math.exp(-riskFreeRate * timeToMaturity) * this._standardNormalCDF(d2) / 100).toFixed(4));
  }

  /** Compute the implied volatility using bisection. */
  public impliedVolatility(marketPrice: number, spot: number, strike: number, riskFreeRate: number, timeToMaturity: number): number {
    let low = 0.01;
    let high = 5;
    for (let i = 0; i < 100; i++) {
      const mid = (low + high) / 2;
      const price = this.blackScholesCall(spot, strike, riskFreeRate, mid, timeToMaturity);
      if (Math.abs(price - marketPrice) < 0.01) return Number(mid.toFixed(4));
      if (price < marketPrice) low = mid;
      else high = mid;
    }
    return Number(((low + high) / 2).toFixed(4));
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

  /** Compute the Treynor ratio. */
  public treynorRatio(returns: number[], beta: number, riskFreeRate: number = 0.02): number {
    if (returns.length === 0 || beta === 0) return 0;
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    return Number(((mean - riskFreeRate) / beta).toFixed(4));
  }

  /** Compute the Jensen's alpha. */
  public jensenAlpha(returns: number[], beta: number, marketReturns: number[], riskFreeRate: number = 0.02): number {
    if (returns.length === 0 || marketReturns.length === 0) return 0;
    const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const meanMarket = marketReturns.reduce((a, b) => a + b, 0) / marketReturns.length;
    const expected = riskFreeRate + beta * (meanMarket - riskFreeRate);
    return Number((meanReturn - expected).toFixed(4));
  }

  /** Compute the Sortino ratio. */
  public sortinoRatio(returns: number[], targetReturn: number = 0): number {
    if (returns.length === 0) return 0;
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const downsideReturns = returns.filter(r => r < targetReturn);
    if (downsideReturns.length === 0) return 0;
    const downsideDeviation = Math.sqrt(downsideReturns.reduce((s, r) => s + Math.pow(r - targetReturn, 2), 0) / downsideReturns.length);
    if (downsideDeviation === 0) return 0;
    return Number(((mean - targetReturn) / downsideDeviation).toFixed(4));
  }

  /** Compute the Information ratio. */
  public informationRatio(returns: number[], benchmarkReturns: number[]): number {
    if (returns.length === 0 || benchmarkReturns.length === 0) return 0;
    const excessReturns = returns.map((r, i) => r - (benchmarkReturns[i] ?? 0));
    const mean = excessReturns.reduce((a, b) => a + b, 0) / excessReturns.length;
    const variance = excessReturns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / excessReturns.length;
    const stdDev = Math.sqrt(variance);
    if (stdDev === 0) return 0;
    return Number((mean / stdDev).toFixed(4));
  }

  /** Compute the maximum drawdown. */
  public maximumDrawdown(values: number[]): number {
    if (values.length === 0) return 0;
    let peak = values[0];
    let maxDd = 0;
    for (const v of values) {
      if (v > peak) peak = v;
      const dd = (peak - v) / peak;
      if (dd > maxDd) maxDd = dd;
    }
    return Number(maxDd.toFixed(4));
  }

  /** Compute the Calmar ratio. */
  public calmarRatio(annualReturn: number, maxDrawdown: number): number {
    if (maxDrawdown === 0) return 0;
    return Number((annualReturn / maxDrawdown).toFixed(4));
  }

  /** Compute the Value at Risk (historical). */
  public valueAtRisk(returns: number[], confidence: number = 0.95): number {
    if (returns.length === 0) return 0;
    const sorted = [...returns].sort((a, b) => a - b);
    const idx = Math.floor((1 - confidence) * sorted.length);
    return Number(Math.abs(sorted[idx] ?? 0).toFixed(4));
  }

  /** Compute the Expected Shortfall (CVaR). */
  public expectedShortfall(returns: number[], confidence: number = 0.95): number {
    if (returns.length === 0) return 0;
    const sorted = [...returns].sort((a, b) => a - b);
    const idx = Math.floor((1 - confidence) * sorted.length);
    const tail = sorted.slice(0, Math.max(1, idx));
    return Number(Math.abs(tail.reduce((a, b) => a + b, 0) / tail.length).toFixed(4));
  }

  /** Compute the portfolio variance (two assets). */
  public portfolioVariance(weightA: number, weightB: number, varianceA: number, varianceB: number, correlation: number): number {
    return Number((Math.pow(weightA, 2) * varianceA + Math.pow(weightB, 2) * varianceB + 2 * weightA * weightB * correlation * Math.sqrt(varianceA * varianceB)).toFixed(4));
  }

  /** Compute the portfolio expected return. */
  public portfolioReturn(weights: number[], returns: number[]): number {
    if (weights.length !== returns.length) return 0;
    return Number(weights.reduce((s, w, i) => s + w * returns[i], 0).toFixed(4));
  }

  /** Compute the efficient frontier weight (two assets). */
  public efficientFrontierWeight(varianceA: number, varianceB: number, correlation: number): number {
    const covAB = correlation * Math.sqrt(varianceA * varianceB);
    const denom = varianceA + varianceB - 2 * covAB;
    if (denom === 0) return 0.5;
    return Number(((varianceB - covAB) / denom).toFixed(4));
  }

  /** Compute the capital market line. */
  public capitalMarketLine(riskFreeRate: number, marketReturn: number, marketStdDev: number, portfolioStdDev: number): number {
    if (marketStdDev === 0) return 0;
    return Number((riskFreeRate + (marketReturn - riskFreeRate) * portfolioStdDev / marketStdDev).toFixed(4));
  }

  /** Compute the security market line. */
  public securityMarketLine(riskFreeRate: number, marketReturn: number, beta: number): number {
    return Number((riskFreeRate + beta * (marketReturn - riskFreeRate)).toFixed(4));
  }

  /** Compute the beta coefficient. */
  public beta(assetReturns: number[], marketReturns: number[]): number {
    if (assetReturns.length === 0 || marketReturns.length === 0) return 0;
    const n = Math.min(assetReturns.length, marketReturns.length);
    const meanAsset = assetReturns.slice(0, n).reduce((a, b) => a + b, 0) / n;
    const meanMarket = marketReturns.slice(0, n).reduce((a, b) => a + b, 0) / n;
    let cov = 0;
    let varMarket = 0;
    for (let i = 0; i < n; i++) {
      cov += (assetReturns[i] - meanAsset) * (marketReturns[i] - meanMarket);
      varMarket += Math.pow(marketReturns[i] - meanMarket, 2);
    }
    return varMarket === 0 ? 0 : Number((cov / varMarket).toFixed(4));
  }

  /** Compute the correlation coefficient. */
  public correlation(seriesA: number[], seriesB: number[]): number {
    if (seriesA.length === 0 || seriesB.length === 0) return 0;
    const n = Math.min(seriesA.length, seriesB.length);
    const meanA = seriesA.slice(0, n).reduce((a, b) => a + b, 0) / n;
    const meanB = seriesB.slice(0, n).reduce((a, b) => a + b, 0) / n;
    let cov = 0;
    let varA = 0;
    let varB = 0;
    for (let i = 0; i < n; i++) {
      cov += (seriesA[i] - meanA) * (seriesB[i] - meanB);
      varA += Math.pow(seriesA[i] - meanA, 2);
      varB += Math.pow(seriesB[i] - meanB, 2);
    }
    const denom = Math.sqrt(varA * varB);
    return denom === 0 ? 0 : Number((cov / denom).toFixed(4));
  }

  /** Compute the Lerner index of market power. */
  public lernerIndex(price: number, marginalCost: number): number {
    if (price === 0) return 0;
    return Number(((price - marginalCost) / price).toFixed(4));
  }

  /** Compute the Herfindahl-Hirschman Index. */
  public herfindahlIndex(marketShares: number[]): number {
    return Number(marketShares.reduce((s, sh) => s + sh * sh, 0).toFixed(4));
  }

  /** Compute the Gini coefficient. */
  public giniCoefficient(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;
    const mean = sorted.reduce((a, b) => a + b, 0) / n;
    if (mean === 0) return 0;
    let sum = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        sum += Math.abs(sorted[i] - sorted[j]);
      }
    }
    return Number((sum / (2 * n * n * mean)).toFixed(4));
  }

  /** Compute the concentration ratio (CRn). */
  public concentrationRatio(marketShares: number[], n: number): number {
    const sorted = [...marketShares].sort((a, b) => b - a);
    return Number(sorted.slice(0, n).reduce((s, sh) => s + sh, 0).toFixed(4));
  }

  /** Compute the deadweight loss from a tax. */
  public deadweightLoss(taxRate: number, quantity: number, elasticity: number): number {
    return Number((0.5 * taxRate * quantity * elasticity / (1 + elasticity)).toFixed(4));
  }

  /** Compute the consumer surplus. */
  public consumerSurplus(willingnessToPay: number, actualPrice: number, quantity: number): number {
    return Number(((willingnessToPay - actualPrice) * quantity).toFixed(4));
  }

  /** Compute the producer surplus. */
  public producerSurplus(marketPrice: number, marginalCost: number, quantity: number): number {
    return Number(((marketPrice - marginalCost) * quantity).toFixed(4));
  }

  /** Compute the total surplus. */
  public totalSurplus(consumerSurplus: number, producerSurplus: number): number {
    return Number((consumerSurplus + producerSurplus).toFixed(4));
  }

  /** Compute the tax revenue. */
  public taxRevenue(taxRate: number, quantity: number): number {
    return Number((taxRate * quantity).toFixed(4));
  }

  /** Compute the tax incidence on consumers. */
  public consumerTaxIncidence(taxRate: number, demandElasticity: number, supplyElasticity: number): number {
    const denom = demandElasticity + supplyElasticity;
    if (denom === 0) return 0;
    return Number((taxRate * supplyElasticity / denom).toFixed(4));
  }

  /** Compute the tax incidence on producers. */
  public producerTaxIncidence(taxRate: number, demandElasticity: number, supplyElasticity: number): number {
    return Number((taxRate - this.consumerTaxIncidence(taxRate, demandElasticity, supplyElasticity)).toFixed(4));
  }

  /** Compute the multiplier effect. */
  public multiplierEffect(marginalPropensityToConsume: number): number {
    const denom = 1 - marginalPropensityToConsume;
    if (denom === 0) return 0;
    return Number((1 / denom).toFixed(4));
  }

  /** Compute the spending multiplier. */
  public spendingMultiplier(mpc: number, taxRate: number = 0): number {
    const denom = 1 - mpc * (1 - taxRate);
    if (denom === 0) return 0;
    return Number((1 / denom).toFixed(4));
  }

  /** Compute the tax multiplier. */
  public taxMultiplier(mpc: number): number {
    return Number((-mpc / (1 - mpc)).toFixed(4));
  }

  /** Compute the balanced budget multiplier. */
  public balancedBudgetMultiplier(): number {
    return 1;
  }

  /** Compute the money multiplier. */
  public moneyMultiplier(reserveRequirement: number): number {
    if (reserveRequirement === 0) return 0;
    return Number((1 / reserveRequirement).toFixed(4));
  }

  /** Compute the velocity of money. */
  public velocityOfMoney(nominalGDP: number, moneySupply: number): number {
    if (moneySupply === 0) return 0;
    return Number((nominalGDP / moneySupply).toFixed(4));
  }

  /** Compute the quantity theory of money. */
  public quantityTheoryOfMoney(moneySupply: number, velocity: number, priceLevel: number, realOutput: number): boolean {
    return Math.abs(moneySupply * velocity - priceLevel * realOutput) < 0.01;
  }

  /** Compute the real GDP. */
  public realGDP(nominalGDP: number, gdpDeflator: number): number {
    if (gdpDeflator === 0) return 0;
    return Number((nominalGDP / gdpDeflator * 100).toFixed(4));
  }

  /** Compute the GDP growth rate. */
  public gdpGrowthRate(currentGDP: number, previousGDP: number): number {
    if (previousGDP === 0) return 0;
    return Number(((currentGDP - previousGDP) / previousGDP).toFixed(4));
  }

  /** Compute the inflation rate from CPI. */
  public inflationFromCPI(currentCPI: number, previousCPI: number): number {
    if (previousCPI === 0) return 0;
    return Number(((currentCPI - previousCPI) / previousCPI).toFixed(4));
  }

  /** Compute the unemployment rate. */
  public unemploymentRate(unemployed: number, laborForce: number): number {
    if (laborForce === 0) return 0;
    return Number((unemployed / laborForce).toFixed(4));
  }

  /** Compute the labor force participation rate. */
  public laborForceParticipationRate(laborForce: number, workingAgePopulation: number): number {
    if (workingAgePopulation === 0) return 0;
    return Number((laborForce / workingAgePopulation).toFixed(4));
  }

  /** Compute the Okun's law deviation. */
  public okunsLaw(actualGDP: number, potentialGDP: number): number {
    if (potentialGDP === 0) return 0;
    return Number(((actualGDP - potentialGDP) / potentialGDP).toFixed(4));
  }

  /** Compute the Phillips curve relationship. */
  public phillipsCurve(unemploymentRate: number, naturalRate: number, expectedInflation: number, alpha: number = 1): number {
    return Number((expectedInflation - alpha * (unemploymentRate - naturalRate)).toFixed(4));
  }

  /** Compute the Taylor rule interest rate. */
  public taylorRule(inflation: number, targetInflation: number, outputGap: number, equilibriumRate: number): number {
    return Number((equilibriumRate + inflation + 0.5 * (inflation - targetInflation) + 0.5 * outputGap).toFixed(4));
  }

  /** Compute the sacrifice ratio. */
  public sacrificeRatio(outputLoss: number, inflationReduction: number): number {
    if (inflationReduction === 0) return 0;
    return Number((outputLoss / inflationReduction).toFixed(4));
  }

  /** Compute the Solow growth model steady state. */
  public solowSteadyState(savingsRate: number, depreciationRate: number, populationGrowth: number, technologyGrowth: number, alpha: number = 0.3): number {
    const denom = depreciationRate + populationGrowth + technologyGrowth;
    if (denom === 0) return 0;
    return Number(Math.pow(savingsRate / denom, 1 / (1 - alpha)).toFixed(4));
  }

  /** Compute the golden rule savings rate. */
  public goldenRuleSavingsRate(depreciationRate: number, populationGrowth: number, technologyGrowth: number, alpha: number = 0.3): number {
    return Number((alpha * (depreciationRate + populationGrowth + technologyGrowth) / (depreciationRate + populationGrowth + technologyGrowth)).toFixed(4));
  }

  /** Compute the convergence hypothesis indicator. */
  public convergenceIndicator(initialOutputPoor: number, initialOutputRich: number, growthPoor: number, growthRich: number, periods: number): boolean {
    const finalPoor = initialOutputPoor * Math.pow(1 + growthPoor, periods);
    const finalRich = initialOutputRich * Math.pow(1 + growthRich, periods);
    return finalPoor / finalRich > initialOutputPoor / initialOutputRich;
  }

  /** Compute the Ricardian equivalence indicator. */
  public ricardianEquivalence(publicSaving: number, privateSaving: number, fiscalDeficit: number): boolean {
    return Math.abs(publicSaving + privateSaving + fiscalDeficit) < 0.01;
  }

  /** Compute the seigniorage revenue. */
  public seigniorage(moneyGrowth: number, moneySupply: number): number {
    return Number((moneyGrowth * moneySupply).toFixed(4));
  }

  /** Compute the Fisher equation (nominal = real + inflation). */
  public fisherEquation(realRate: number, inflationRate: number): number {
    return Number((realRate + inflationRate).toFixed(4));
  }

  /** Compute the term structure slope. */
  public termStructureSlope(shortRate: number, longRate: number): number {
    return Number((longRate - shortRate).toFixed(4));
  }

  /** Compute the yield curve classification. */
  public yieldCurveClassification(shortRate: number, mediumRate: number, longRate: number): 'normal' | 'inverted' | 'flat' {
    if (longRate < shortRate) return 'inverted';
    if (Math.abs(longRate - shortRate) < 0.001) return 'flat';
    return 'normal';
  }

  /** Compute the IS-LM equilibrium. */
  public islmEquilibrium(isCurve: (r: number) => number, lmCurve: (r: number) => number): { interestRate: number; output: number } {
    let low = 0;
    let high = 1;
    for (let i = 0; i < 100; i++) {
      const mid = (low + high) / 2;
      const isY = isCurve(mid);
      const lmY = lmCurve(mid);
      if (Math.abs(isY - lmY) < 0.01) return { interestRate: Number(mid.toFixed(4)), output: Number(isY.toFixed(4)) };
      if (isY > lmY) low = mid;
      else high = mid;
    }
    return { interestRate: Number(((low + high) / 2).toFixed(4)), output: 0 };
  }

  /** Compute the AD-AS equilibrium. */
  public adasEquilibrium(adCurve: (p: number) => number, srasCurve: (p: number) => number): { priceLevel: number; output: number } {
    let low = 0.5;
    let high = 2;
    for (let i = 0; i < 100; i++) {
      const mid = (low + high) / 2;
      const adY = adCurve(mid);
      const srasY = srasCurve(mid);
      if (Math.abs(adY - srasY) < 0.01) return { priceLevel: Number(mid.toFixed(4)), output: Number(adY.toFixed(4)) };
      if (adY < srasY) low = mid;
      else high = mid;
    }
    return { priceLevel: Number(((low + high) / 2).toFixed(4)), output: 0 };
  }

  /** Compute the Laffer curve peak. */
  public lafferCurvePeak(): number {
    return 0.5;
  }

  /** Compute the Laffer curve revenue. */
  public lafferRevenue(taxRate: number, baseIncome: number): number {
    return Number((taxRate * (1 - taxRate) * 4 * baseIncome).toFixed(4));
  }

  /** Compute the deadweight loss of monopoly. */
  public monopolyDeadweightLoss(monopolyPrice: number, competitivePrice: number, monopolyQuantity: number, competitiveQuantity: number): number {
    return Number((0.5 * (monopolyPrice - competitivePrice) * (competitiveQuantity - monopolyQuantity)).toFixed(4));
  }

  /** Compute the consumer surplus under monopoly. */
  public monopolyConsumerSurplus(monopolyPrice: number, willingnessToPay: number, monopolyQuantity: number): number {
    return Number(((willingnessToPay - monopolyPrice) * monopolyQuantity / 2).toFixed(4));
  }

  /** Compute the producer surplus under monopoly. */
  public monopolyProducerSurplus(monopolyPrice: number, marginalCost: number, monopolyQuantity: number): number {
    return Number(((monopolyPrice - marginalCost) * monopolyQuantity).toFixed(4));
  }

  /** Compute the X-inefficiency. */
  public xInefficiency(actualCost: number, minimumCost: number): number {
    if (minimumCost === 0) return 0;
    return Number(((actualCost - minimumCost) / minimumCost).toFixed(4));
  }

  /** Compute the rent-seeking cost. */
  public rentSeekingCost(monopolyProfit: number): number {
    return Number((monopolyProfit * 0.5).toFixed(4));
  }

  /** Compute the deadweight loss of a price ceiling. */
  public priceCeilingDeadweightLoss(ceilingPrice: number, equilibriumPrice: number, equilibriumQuantity: number, elasticity: number): number {
    const shortage = equilibriumQuantity * elasticity * (equilibriumPrice - ceilingPrice) / equilibriumPrice;
    return Number((0.5 * (equilibriumPrice - ceilingPrice) * shortage).toFixed(4));
  }

  /** Compute the deadweight loss of a price floor. */
  public priceFloorDeadweightLoss(floorPrice: number, equilibriumPrice: number, equilibriumQuantity: number, elasticity: number): number {
    const surplus = equilibriumQuantity * elasticity * (floorPrice - equilibriumPrice) / equilibriumPrice;
    return Number((0.5 * (floorPrice - equilibriumPrice) * surplus).toFixed(4));
  }

  /** Compute the deadweight loss of a subsidy. */
  public subsidyDeadweightLoss(subsidyRate: number, equilibriumQuantity: number, elasticity: number): number {
    return Number((0.5 * subsidyRate * subsidyRate * equilibriumQuantity * elasticity).toFixed(4));
  }

  /** Compute the excess burden of taxation. */
  public excessBurdenOfTaxation(taxRate: number, taxableIncome: number, elasticity: number): number {
    return Number((0.5 * taxRate * taxRate * taxableIncome * elasticity).toFixed(4));
  }

  /** Compute the marginal excess burden. */
  public marginalExcessBurden(taxRate: number, elasticity: number): number {
    return Number((taxRate * elasticity / (1 - taxRate * elasticity)).toFixed(4));
  }

  /** Compute the cost of inflation (shoe-leather cost). */
  public shoeLeatherCost(inflationRate: number, moneyDemand: number, interestRate: number): number {
    return Number((inflationRate * moneyDemand * interestRate * 0.5).toFixed(4));
  }

  /** Compute the menu cost of inflation. */
  public menuCost(inflationRate: number, priceAdjustmentCost: number, numberOfPrices: number): number {
    return Number((inflationRate * priceAdjustmentCost * numberOfPrices).toFixed(4));
  }

  /** Compute the Tobin's q ratio. */
  public tobinsQ(marketValue: number, replacementCost: number): number {
    if (replacementCost === 0) return 0;
    return Number((marketValue / replacementCost).toFixed(4));
  }

  /** Compute the Modigliani-Miller proposition I (no taxes). */
  public modiglianiMillerProp1(valueUnlevered: number): number {
    return valueUnlevered;
  }

  /** Compute the Modigliani-Miller proposition II (no taxes). */
  public modiglianiMillerProp2(costOfEquityUnlevered: number, costOfDebt: number, debtToEquity: number): number {
    return Number((costOfEquityUnlevered + (costOfEquityUnlevered - costOfDebt) * debtToEquity).toFixed(4));
  }

  /** Compute the Modigliani-Miller proposition I (with taxes). */
  public modiglianiMillerWithTaxes(valueUnlevered: number, debt: number, taxRate: number): number {
    return Number((valueUnlevered + debt * taxRate).toFixed(4));
  }

  /** Compute the trade-off theory optimal debt ratio. */
  public tradeoffOptimalDebt(taxRate: number, bankruptcyCost: number, firmValue: number): number {
    if (bankruptcyCost === 0) return 0;
    return Number((taxRate * firmValue / (2 * bankruptcyCost)).toFixed(4));
  }

  /** Compute the pecking order theory financing preference. */
  public peckingOrder(internalFunds: number, investmentNeeded: number): 'internal' | 'debt' | 'equity' {
    if (internalFunds >= investmentNeeded) return 'internal';
    return 'debt';
  }

  /** Compute the agency cost of debt. */
  public agencyCostOfDebt(debt: number, riskShiftingCost: number, monitoringCost: number): number {
    return Number((debt * riskShiftingCost + monitoringCost).toFixed(4));
  }

  /** Compute the agency cost of equity. */
  public agencyCostOfEquity(equity: number, monitoringCost: number, bondingCost: number, residualLoss: number): number {
    return Number((equity * monitoringCost + bondingCost + residualLoss).toFixed(4));
  }

  /** Compute the free cash flow hypothesis indicator. */
  public freeCashFlowHypothesis(freeCashFlow: number, growthOpportunities: number): boolean {
    return freeCashFlow > growthOpportunities;
  }

  /** Compute the market efficiency classification. */
  public marketEfficiencyClassification(informationSet: 'weak' | 'semi-strong' | 'strong'): string {
    const descriptions: Record<string, string> = {
      weak: 'past-price-information-reflected',
      'semi-strong': 'public-information-reflected',
      strong: 'all-information-reflected',
    };
    return descriptions[informationSet] ?? 'unknown';
  }

  /** Compute the random walk hypothesis test. */
  public randomWalkHypothesis(returns: number[]): { autocorrelation: number; supportsRandomWalk: boolean } {
    if (returns.length < 2) return { autocorrelation: 0, supportsRandomWalk: true };
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    let cov = 0;
    let variance = 0;
    for (let i = 1; i < returns.length; i++) {
      cov += (returns[i] - mean) * (returns[i - 1] - mean);
    }
    for (let i = 0; i < returns.length; i++) {
      variance += Math.pow(returns[i] - mean, 2);
    }
    const autocorrelation = variance > 0 ? cov / variance : 0;
    return {
      autocorrelation: Number(autocorrelation.toFixed(4)),
      supportsRandomWalk: Math.abs(autocorrelation) < 0.1,
    };
  }

  /** Compute the volatility (standard deviation of returns). */
  public volatility(returns: number[]): number {
    if (returns.length === 0) return 0;
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
    return Number(Math.sqrt(variance).toFixed(4));
  }

  /** Compute the annualized volatility. */
  public annualizedVolatility(returns: number[], periodsPerYear: number = 252): number {
    const vol = this.volatility(returns);
    return Number((vol * Math.sqrt(periodsPerYear)).toFixed(4));
  }

  /** Compute the skewness. */
  public skewness(returns: number[]): number {
    if (returns.length < 3) return 0;
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    if (stdDev === 0) return 0;
    return Number((returns.reduce((a, b) => a + Math.pow((b - mean) / stdDev, 3), 0) / returns.length).toFixed(4));
  }

  /** Compute the kurtosis. */
  public kurtosis(returns: number[]): number {
    if (returns.length < 4) return 0;
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    if (stdDev === 0) return 0;
    return Number((returns.reduce((a, b) => a + Math.pow((b - mean) / stdDev, 4), 0) / returns.length - 3).toFixed(4));
  }

  /** Compute the Value at Risk (parametric). */
  public parametricVaR(mean: number, stdDev: number, confidence: number = 0.95, timeHorizon: number = 1): number {
    const zScore = confidence === 0.99 ? 2.33 : confidence === 0.95 ? 1.645 : 1.0;
    return Number((Math.abs(mean - zScore * stdDev) * Math.sqrt(timeHorizon)).toFixed(4));
  }

  /** Compute the Cornish-Fisher VaR. */
  public cornishFisherVaR(mean: number, stdDev: number, skewness: number, kurtosis: number, confidence: number = 0.95): number {
    const z = confidence === 0.99 ? 2.33 : 1.645;
    const cf = z + (z * z - 1) * skewness / 6 + (z * z * z - 3 * z) * kurtosis / 24 - (2 * z * z * z - 5 * z) * skewness * skewness / 36;
    return Number(Math.abs(mean - cf * stdDev).toFixed(4));
  }

  /** Compute the economic capital. */
  public economicCapital(valueAtRisk: number, expectedLoss: number): number {
    return Number((valueAtRisk - expectedLoss).toFixed(4));
  }

  /** Compute the regulatory capital (Basel). */
  public regulatoryCapital(riskWeightedAssets: number, capitalRatio: number = 0.08): number {
    return Number((riskWeightedAssets * capitalRatio).toFixed(4));
  }

  /** Compute the risk-weighted assets. */
  public computeRiskWeightedAssets(assets: { value: number; riskWeight: number }[]): number {
    return Number(assets.reduce((s, a) => s + a.value * a.riskWeight, 0).toFixed(4));
  }

  /** Compute the tier 1 capital ratio. */
  public tier1CapitalRatio(tier1Capital: number, riskWeightedAssets: number): number {
    if (riskWeightedAssets === 0) return 0;
    return Number((tier1Capital / riskWeightedAssets).toFixed(4));
  }

  /** Compute the leverage ratio. */
  public computeLeverageRatio(tier1Capital: number, totalExposure: number): number {
    if (totalExposure === 0) return 0;
    return Number((tier1Capital / totalExposure).toFixed(4));
  }

  /** Compute the liquidity coverage ratio. */
  public liquidityCoverageRatio(highQualityLiquidAssets: number, totalNetCashFlows: number): number {
    if (totalNetCashFlows === 0) return 0;
    return Number((highQualityLiquidAssets / totalNetCashFlows).toFixed(4));
  }

  /** Compute the net stable funding ratio. */
  public netStableFundingRatio(availableStableFunding: number, requiredStableFunding: number): number {
    if (requiredStableFunding === 0) return 0;
    return Number((availableStableFunding / requiredStableFunding).toFixed(4));
  }

  /** Generate a financial analysis dashboard. */
  public financialDashboard(metrics: { npv: number; irr: number; payback: number; roi: number; roe: number; roa: number }): Record<string, unknown> {
    return {
      ...metrics,
      profitabilityIndex: metrics.npv > 0 ? 'profitable' : 'unprofitable',
      riskAdjustedReturn: metrics.irr - 0.05,
      efficiencyScore: (metrics.roe + metrics.roa) / 2,
      timestamp: Date.now(),
    };
  }

  public reset(): void {
    this._allocations.clear();
    this._analysisHistory = [];
    this._projectHistory = [];
  }

  public getAnalysisHistory(): CostBenefitResult[] {
    return [...this._analysisHistory];
  }

  public getAllAllocations(): ResourceAllocation[] {
    return Array.from(this._allocations.values()).map(a => ({ ...a }));
  }

  public getProjectHistory(): CapitalBudgetingResult[] {
    return [...this._projectHistory];
  }

  public toPacket(): DataPacket<{
    discountRate: number;
    timeHorizon: number;
    allocationCount: number;
    analysisCount: number;
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['economic', 'calculus'],
      priority: 1,
      phase: 'summary',
    };
    return {
      id: `economic-calculus-${Date.now()}`,
      payload: {
        discountRate: this._discountRate,
        timeHorizon: this._timeHorizon,
        allocationCount: this._allocations.size,
        analysisCount: this._analysisHistory.length,
      },
      metadata,
    };
  }
}
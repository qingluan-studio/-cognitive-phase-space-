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
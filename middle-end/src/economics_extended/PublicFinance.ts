import { DataPacket, PacketMeta } from '../shared/types';

/** Tax type. */
export type TaxType = 'income' | 'corporate' | 'sales' | 'property' | 'wealth' | 'vat' | 'payroll' | 'capital-gains';

/** A tax descriptor. */
export interface Tax {
  readonly type: TaxType;
  readonly rate: number;
  readonly base: number;
  readonly revenue: number;
  readonly progressive: boolean;
}

/** Government spending descriptor. */
export interface GovernmentSpending {
  readonly category: string;
  readonly amount: number;
  readonly multiplier: number;
  readonly gdpImpact: number;
}

/** Fiscal deficit descriptor. */
export interface FiscalDeficit {
  readonly spending: number;
  readonly revenue: number;
  readonly deficit: number;
  readonly asPercentGdp: number;
  readonly structural: boolean;
}

/** Tax bracket. */
export interface TaxBracket {
  readonly min: number;
  readonly max: number | null;
  readonly rate: number;
}

/** Tax incidence result. */
export interface TaxIncidence {
  readonly onConsumers: number;
  readonly onProducers: number;
  readonly totalBurden: number;
}

/** Laffer curve point. */
export interface LafferPoint {
  readonly rate: number;
  readonly revenue: number;
  readonly peak: boolean;
}

/** National debt descriptor. */
export interface NationalDebt {
  readonly debt: number;
  readonly gdp: number;
  readonly ratio: number;
  readonly serviceCost: number;
  readonly sustainable: boolean;
}

/**
 * PublicFinance computes taxes (income, corporate, sales, property, wealth,
 * VAT), tax incidence, Laffer curve, fiscal multipliers, and debt dynamics.
 */
export class PublicFinance {
  private _taxes: Map<string, Tax> = new Map();
  private _spending: GovernmentSpending[] = [];
  private _deficits: FiscalDeficit[] = [];
  private _history: unknown[] = [];
  private _counter = 0;

  get taxCount(): number { return this._taxes.size; }
  get spendingCount(): number { return this._spending.length; }
  get deficitCount(): number { return this._deficits.length; }

  /** Compute income tax with brackets and deductions. */
  incomeTax(income: number, brackets: TaxBracket[], deductions: number): { taxableIncome: number; tax: number; effectiveRate: number; marginalRate: number } {
    const taxable = Math.max(0, income - deductions);
    let tax = 0;
    let marginal = 0;
    for (const b of brackets) {
      if (taxable > b.min) {
        const upper = b.max === null ? taxable : Math.min(taxable, b.max);
        tax += (upper - b.min) * b.rate;
        marginal = b.rate;
      }
    }
    return {
      taxableIncome: taxable,
      tax: Number(tax.toFixed(2)),
      effectiveRate: taxable > 0 ? Number((tax / taxable).toFixed(4)) : 0,
      marginalRate: marginal,
    };
  }

  /** Compute corporate tax. */
  corporateTax(profit: number, rate: number, credits: number): { taxable: number; tax: number; afterCredits: number } {
    const taxable = Math.max(0, profit);
    const tax = taxable * rate;
    return {
      taxable,
      tax: Number(tax.toFixed(2)),
      afterCredits: Number(Math.max(0, tax - credits).toFixed(2)),
    };
  }

  /** Compute sales tax. */
  salesTax(purchase: number, rate: number, exemptions: number): { taxable: number; tax: number; total: number } {
    const taxable = Math.max(0, purchase - exemptions);
    const tax = taxable * rate;
    return {
      taxable: Number(taxable.toFixed(2)),
      tax: Number(tax.toFixed(2)),
      total: Number((taxable + tax).toFixed(2)),
    };
  }

  /** Compute property tax. */
  propertyTax(value: number, rate: number, assessments: { deduction: number; homestead: number }): { assessedValue: number; tax: number } {
    const assessed = Math.max(0, value - assessments.deduction - assessments.homestead);
    return {
      assessedValue: Number(assessed.toFixed(2)),
      tax: Number((assessed * rate).toFixed(2)),
    };
  }

  /** Compute wealth tax. */
  wealthTax(wealth: number, threshold: number, rate: number): { taxable: number; tax: number; effectiveRate: number } {
    const taxable = Math.max(0, wealth - threshold);
    const tax = taxable * rate;
    return {
      taxable,
      tax: Number(tax.toFixed(2)),
      effectiveRate: wealth > 0 ? Number((tax / wealth).toFixed(4)) : 0,
    };
  }

  /** Compute VAT. */
  vatCalculation(value: number, rate: number, inputCredit: number): { outputVat: number; netVat: number; payable: number } {
    const outputVat = value * rate;
    return {
      outputVat: Number(outputVat.toFixed(2)),
      netVat: Number(outputVat.toFixed(2)),
      payable: Number(Math.max(0, outputVat - inputCredit).toFixed(2)),
    };
  }

  /** Compute tax incidence on consumers/producers. */
  taxIncidence(tax: number, demand: { elasticity: number }, supply: { elasticity: number }): TaxIncidence {
    const sum = Math.abs(demand.elasticity) + Math.abs(supply.elasticity);
    const onConsumers = sum > 0 ? (Math.abs(supply.elasticity) / sum) * tax : tax / 2;
    const onProducers = tax - onConsumers;
    return {
      onConsumers: Number(onConsumers.toFixed(2)),
      onProducers: Number(onProducers.toFixed(2)),
      totalBurden: Number(tax.toFixed(2)),
    };
  }

  /** Compute deadweight loss of taxation. */
  deadweightLossTax(tax: number, market: { quantity: number; demandElasticity: number; supplyElasticity: number }): number {
    const qReduction = tax * 0.1 * Math.abs(market.demandElasticity);
    return Number((0.5 * tax * qReduction).toFixed(2));
  }

  /** Compute Laffer curve point. */
  lafferCurve(rate: number, revenue: number): LafferPoint {
    const peakRate = 0.5;
    const adjustedRevenue = revenue * Math.sin(rate * Math.PI);
    return {
      rate,
      revenue: Number(adjustedRevenue.toFixed(2)),
      peak: Math.abs(rate - peakRate) < 0.05,
    };
  }

  /** Compute government spending multiplier. */
  governmentMultiplier(spending: number, mpc: number): { multiplier: number; gdpImpact: number } {
    const m = 1 / (1 - mpc);
    return {
      multiplier: Number(m.toFixed(2)),
      gdpImpact: Number((spending * m).toFixed(2)),
    };
  }

  /** Compute fiscal multiplier (spending and taxes combined). */
  fiscalMultiplier(spending: number, taxes: number, mpc: number): { multiplier: number; netImpact: number } {
    const m = 1 / (1 - mpc);
    const taxMultiplier = -mpc / (1 - mpc);
    const netImpact = spending * m + taxes * taxMultiplier;
    return {
      multiplier: Number(m.toFixed(2)),
      netImpact: Number(netImpact.toFixed(2)),
    };
  }

  /** Analyze balanced budget. */
  balancedBudget(spending: number, taxes: number): { balanced: boolean; multiplier: number; impact: number } {
    return {
      balanced: spending === taxes,
      multiplier: 1,
      impact: spending,
    };
  }

  /** Compute crowding-out effect. */
  crowdingOut(government: number, privateInvestment: number): { crowdedOut: number; netEffect: number } {
    const crowdedOut = government * 0.3;
    return {
      crowdedOut: Number(crowdedOut.toFixed(2)),
      netEffect: Number((government - crowdedOut).toFixed(2)),
    };
  }

  /** Analyze national debt sustainability. */
  nationalDebt(debt: number, gdp: number, service: number): NationalDebt {
    const ratio = gdp > 0 ? debt / gdp : 0;
    return {
      debt,
      gdp,
      ratio: Number(ratio.toFixed(3)),
      serviceCost: service,
      sustainable: ratio < 0.77,
    };
  }

  toPacket(): DataPacket<{
    taxes: number;
    spending: GovernmentSpending[];
    deficits: FiscalDeficit[];
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['economics_extended', 'PublicFinance'],
      priority: 1,
      phase: 'public-finance',
    };
    return {
      id: `public-finance-${Date.now().toString(36)}-${(++this._counter).toString(36)}`,
      payload: {
        taxes: this._taxes.size,
        spending: [...this._spending],
        deficits: [...this._deficits],
        history: [...this._history],
      },
      metadata,
    };
  }

  reset(): void {
    this._taxes.clear();
    this._spending = [];
    this._deficits = [];
    this._history = [];
    this._counter = 0;
  }
}

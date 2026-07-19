import { DataPacket, PacketMeta } from '../shared/types';

/** GDP components descriptor. */
export interface GDP {
  readonly consumption: number;
  readonly investment: number;
  readonly government: number;
  readonly netExports: number;
  readonly total: number;
  readonly nominal: boolean;
}

/** Inflation descriptor. */
export interface Inflation {
  readonly rate: number;
  readonly type: 'demand-pull' | 'cost-push' | 'built-in' | 'hyperinflation';
  readonly causes: string[];
}

/** Unemployment descriptor. */
export interface Unemployment {
  readonly rate: number;
  readonly type: 'frictional' | 'structural' | 'cyclical' | 'seasonal';
  readonly laborForce: number;
  readonly unemployed: number;
}

/** Phillips curve point. */
export interface PhillipsPoint {
  readonly inflation: number;
  readonly unemployment: number;
  readonly shortRun: boolean;
}

/** IS-LM model state. */
export interface ISLMState {
  readonly interestRate: number;
  readonly income: number;
  readonly equilibrium: boolean;
}

/** AD-AS model state. */
export interface ADASState {
  readonly priceLevel: number;
  readonly output: number;
  readonly gap: 'inflationary' | 'recessionary' | 'none';
}

/** Solow growth model state. */
export interface SolowState {
  readonly capital: number;
  readonly savingsRate: number;
  readonly populationGrowth: number;
  readonly technologyGrowth: number;
  readonly depreciation: number;
  readonly steadyStateCapital: number;
  readonly outputPerWorker: number;
}

/** Business cycle phase. */
export interface BusinessCycle {
  readonly phase: 'expansion' | 'peak' | 'contraction' | 'trough';
  readonly duration: number;
  readonly amplitude: number;
}

/**
 * Macroeconomics computes GDP, inflation, unemployment, fiscal/monetary
 * policy effects, IS-LM, AD-AS, Solow growth, and business cycles.
 */
export class Macroeconomics {
  private _gdp: GDP | null = null;
  private _inflation: Inflation | null = null;
  private _unemployment: Unemployment | null = null;
  private _history: unknown[] = [];
  private _counter = 0;

  get hasGdp(): boolean { return this._gdp !== null; }
  get hasInflation(): boolean { return this._inflation !== null; }
  get hasUnemployment(): boolean { return this._unemployment !== null; }

  /** Calculate GDP using expenditure approach. */
  gdpCalculate(C: number, I: number, G: number, NX: number): GDP {
    const gdp: GDP = {
      consumption: C,
      investment: I,
      government: G,
      netExports: NX,
      total: C + I + G + NX,
      nominal: true,
    };
    this._gdp = gdp;
    this._history.push({ op: 'gdpCalculate', total: gdp.total });
    return gdp;
  }

  /** Calculate GDP deflator. */
  gdpDeflator(nominal: number, real: number): number {
    if (real === 0) return 0;
    return Number(((nominal / real) * 100).toFixed(2));
  }

  /** Calculate Consumer Price Index. */
  cpi(basket: { item: string; quantity: number; price: number }[], prices: { item: string; price: number }[]): number {
    const cost = basket.reduce((s, b) => {
      const p = prices.find(pr => pr.item === b.item)?.price ?? b.price;
      return s + b.quantity * p;
    }, 0);
    const baseCost = basket.reduce((s, b) => s + b.quantity * b.price, 0);
    return baseCost > 0 ? Number(((cost / baseCost) * 100).toFixed(2)) : 0;
  }

  /** Calculate inflation rate. */
  inflationRate(cpiOld: number, cpiNew: number): number {
    if (cpiOld === 0) return 0;
    return Number((((cpiNew - cpiOld) / cpiOld) * 100).toFixed(2));
  }

  /** Calculate unemployment rate. */
  unemploymentRate(unemployed: number, laborForce: number): Unemployment {
    const rate = laborForce > 0 ? (unemployed / laborForce) * 100 : 0;
    const u: Unemployment = {
      rate: Number(rate.toFixed(2)),
      type: rate > 8 ? 'cyclical' : rate > 5 ? 'frictional' : 'structural',
      laborForce,
      unemployed,
    };
    this._unemployment = u;
    return u;
  }

  /** Compute Phillips curve point. */
  phillipsCurve(inflation: number, unemployment: number): PhillipsPoint {
    return { inflation, unemployment, shortRun: true };
  }

  /** Analyze fiscal policy. */
  fiscalPolicy(government: number, taxes: number, multiplier: number): { gdpChange: number; deficit: number; expansionary: boolean } {
    const gdpChange = (government - taxes) * multiplier;
    return {
      gdpChange: Number(gdpChange.toFixed(2)),
      deficit: taxes - government,
      expansionary: government > taxes,
    };
  }

  /** Analyze monetary policy. */
  monetaryPolicy(moneySupply: number, interestRate: number, fed: 'expansionary' | 'contractionary'): { effect: string; rateChange: number } {
    const rateChange = fed === 'expansionary' ? -0.25 : 0.25;
    return {
      effect: fed === 'expansionary' ? 'lower-rates-increase-borrowing' : 'raise-rates-reduce-inflation',
      rateChange,
    };
  }

  /** Solve IS-LM model. */
  isLmModel(interestRate: number, income: number): ISLMState {
    return { interestRate, income, equilibrium: interestRate > 0 && income > 0 };
  }

  /** Compute aggregate demand. */
  aggregateDemand(price: number, output: number): ADASState {
    const potential = 100;
    const gap: ADASState['gap'] = output > potential * 1.02 ? 'inflationary' : output < potential * 0.98 ? 'recessionary' : 'none';
    return { priceLevel: price, output, gap };
  }

  /** Compute aggregate supply. */
  aggregateSupply(price: number, output: number): ADASState {
    return this.aggregateDemand(price, output);
  }

  /** Solve Solow growth model. */
  solowGrowthModel(k: number, s: number, n: number, g: number, delta: number): SolowState {
    const alpha = 0.3;
    const steadyStateCapital = Math.pow((s) / (n + g + delta), 1 / (1 - alpha));
    const outputPerWorker = Math.pow(k, alpha);
    return {
      capital: k,
      savingsRate: s,
      populationGrowth: n,
      technologyGrowth: g,
      depreciation: delta,
      steadyStateCapital: Number(steadyStateCapital.toFixed(2)),
      outputPerWorker: Number(outputPerWorker.toFixed(2)),
    };
  }

  /** Identify business cycle phase. */
  businessCycle(phase: BusinessCycle['phase']): BusinessCycle {
    const duration = phase === 'expansion' ? 58 : phase === 'contraction' ? 11 : 4;
    return { phase, duration, amplitude: phase === 'peak' || phase === 'trough' ? 0 : 5 };
  }

  /** Compute spending multiplier. */
  multiplier(spending: number, mpc: number): { multiplier: number; totalEffect: number } {
    const m = 1 / (1 - mpc);
    return { multiplier: Number(m.toFixed(2)), totalEffect: Number((spending * m).toFixed(2)) };
  }

  toPacket(): DataPacket<{
    gdp: GDP | null;
    inflation: Inflation | null;
    unemployment: Unemployment | null;
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['economics_extended', 'Macroeconomics'],
      priority: 1,
      phase: 'macroeconomics',
    };
    return {
      id: `macroeconomics-${Date.now().toString(36)}-${(++this._counter).toString(36)}`,
      payload: {
        gdp: this._gdp,
        inflation: this._inflation,
        unemployment: this._unemployment,
        history: [...this._history],
      },
      metadata,
    };
  }

  reset(): void {
    this._gdp = null;
    this._inflation = null;
    this._unemployment = null;
    this._history = [];
    this._counter = 0;
  }
}

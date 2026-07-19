import { DataPacket } from '../shared/types';

/** A lending pool for a single asset. */
export interface LendingPool {
  readonly asset: string;
  readonly borrowers: number;
  readonly lenders: number;
  readonly rates: { supply: number; borrow: number };
  readonly totalBorrowed: number;
  readonly totalSupplied: number;
}

/** An automated market maker liquidity pool. */
export interface LiquidityPool {
  readonly tokenA: string;
  readonly tokenB: string;
  readonly reserveA: number;
  readonly reserveB: number;
  readonly fee: number;
  readonly k: number;
}

/** A yield farming opportunity. */
export interface YieldFarm {
  readonly stake: number;
  readonly reward: number;
  readonly duration: number;
  readonly apy: number;
  readonly active: boolean;
}

/** Result of an AMM swap. */
export interface SwapResult {
  readonly amountIn: number;
  readonly amountOut: number;
  readonly fee: number;
  readonly priceImpact: number;
  readonly newReserveA: number;
  readonly newReserveB: number;
}

export class DeFiProtocol {
  private _pools: Map<string, LiquidityPool> = new Map();
  private _lending: LendingPool[] = [];
  private _farms: YieldFarm[] = [];
  private _history: string[] = [];
  private _counter = 0;

  get poolCount(): number {
    return this._pools.size;
  }

  get lendingCount(): number {
    return this._lending.length;
  }

  get farmCount(): number {
    return this._farms.length;
  }

  get history(): string[] {
    return [...this._history];
  }

  public ammSwap(pool: LiquidityPool, amountIn: number, tokenIn: 'A' | 'B'): SwapResult {
    const fee = amountIn * pool.fee;
    const amountInAfterFee = amountIn - fee;
    let amountOut: number;
    let newReserveA = pool.reserveA;
    let newReserveB = pool.reserveB;
    if (tokenIn === 'A') {
      amountOut = (amountInAfterFee * pool.reserveB) / (pool.reserveA + amountInAfterFee);
      newReserveA = pool.reserveA + amountInAfterFee;
      newReserveB = pool.reserveB - amountOut;
    } else {
      amountOut = (amountInAfterFee * pool.reserveA) / (pool.reserveB + amountInAfterFee);
      newReserveB = pool.reserveB + amountInAfterFee;
      newReserveA = pool.reserveA - amountOut;
    }
    const priceImpact = amountIn / (amountIn + (tokenIn === 'A' ? pool.reserveA : pool.reserveB));
    const result: SwapResult = {
      amountIn,
      amountOut,
      fee,
      priceImpact,
      newReserveA,
      newReserveB,
    };
    this._recordHistory(`ammSwap(in=${amountIn}, out=${amountOut.toFixed(4)})`);
    return result;
  }

  public constantProduct(reserveA: number, reserveB: number, fee: number): { k: number; fee: number; price: number } {
    const k = reserveA * reserveB;
    const price = reserveA > 0 ? reserveB / reserveA : 0;
    this._recordHistory(`constantProduct(k=${k}, fee=${fee})`);
    return { k, fee, price };
  }

  public flashLoan(asset: string, amount: number, fee: number, callback: () => boolean): { executed: boolean; asset: string; amount: number; fee: number; repaid: boolean } {
    const repaid = callback();
    const executed = repaid;
    this._recordHistory(`flashLoan(asset=${asset}, amount=${amount}, repaid=${repaid})`);
    return { executed, asset, amount, fee: amount * fee, repaid };
  }

  public lendingSupply(asset: string, amount: number, apy: number): { asset: string; supplied: number; apy: number; interest: number } {
    const interest = amount * apy;
    this._recordHistory(`lendingSupply(asset=${asset}, amount=${amount})`);
    return { asset, supplied: amount, apy, interest };
  }

  public lendingBorrow(asset: string, amount: number, collateral: number, rate: number): { asset: string; borrowed: number; collateral: number; rate: number; healthy: boolean } {
    const healthy = collateral >= amount * 1.5;
    this._recordHistory(`lendingBorrow(asset=${asset}, borrowed=${amount}, healthy=${healthy})`);
    return { asset, borrowed: amount, collateral, rate, healthy };
  }

  public liquidation(position: { debt: number; collateral: number }, price: number, threshold: number): { liquidated: boolean; collateralSeized: number; debtRepaid: number } {
    const collateralValue = position.collateral * price;
    const liquidated = collateralValue / position.debt < threshold;
    this._recordHistory(`liquidation(liquidated=${liquidated})`);
    return {
      liquidated,
      collateralSeized: liquidated ? position.collateral : 0,
      debtRepaid: liquidated ? Math.min(position.debt, collateralValue) : 0,
    };
  }

  public collateralizationRatio(debt: number, collateral: number, price: number): { ratio: number; safe: boolean; liquidationPrice: number } {
    const ratio = debt > 0 ? (collateral * price) / debt : Infinity;
    const safe = ratio >= 1.5;
    const liquidationPrice = collateral > 0 ? (debt * 1.5) / collateral : 0;
    this._recordHistory(`collateralizationRatio(ratio=${ratio.toFixed(3)})`);
    return { ratio, safe, liquidationPrice };
  }

  public yieldFarm(stake: number, reward: number, duration: number, apy: number): YieldFarm {
    const farm: YieldFarm = { stake, reward, duration, apy, active: true };
    this._farms.push(farm);
    this._recordHistory(`yieldFarm(stake=${stake}, apy=${apy})`);
    return farm;
  }

  public autoCompound(principal: number, apy: number, frequency: number): { final: number; compounded: number; periods: number } {
    const periodsPerYear = frequency;
    const ratePerPeriod = apy / periodsPerYear;
    const final = principal * Math.pow(1 + ratePerPeriod, periodsPerYear);
    this._recordHistory(`autoCompound(principal=${principal}, freq=${frequency})`);
    return { final, compounded: final - principal, periods: periodsPerYear };
  }

  public oraclePrice(asset: string, sources: { name: string; price: number }[], aggregation: 'median' | 'mean' | 'weighted'): { price: number; sources: number; aggregation: string } {
    const prices = sources.map(s => s.price).sort((a, b) => a - b);
    let price: number;
    switch (aggregation) {
      case 'median':
        price = prices.length > 0 ? prices[Math.floor(prices.length / 2)] : 0;
        break;
      case 'mean':
        price = prices.length > 0 ? prices.reduce((s, p) => s + p, 0) / prices.length : 0;
        break;
      case 'weighted':
        price = prices.length > 0 ? prices.reduce((s, p) => s + p, 0) / prices.length : 0;
        break;
    }
    this._recordHistory(`oraclePrice(asset=${asset}, price=${price.toFixed(2)})`);
    return { price, sources: sources.length, aggregation };
  }

  public priceImpact(amount: number, liquidity: number): { impact: number; effectivePrice: number; slippage: number } {
    const impact = liquidity > 0 ? amount / liquidity : 0;
    const slippage = impact * 0.5;
    this._recordHistory(`priceImpact(impact=${impact.toFixed(4)})`);
    return { impact, effectivePrice: 1 - slippage, slippage };
  }

  public impermanentLoss(priceRatio: number, liquidity: number): { loss: number; priceRatio: number; liquidity: number } {
    const r = priceRatio;
    const il = 2 * Math.sqrt(r) / (1 + r) - 1;
    const loss = Math.abs(il) * liquidity;
    this._recordHistory(`impermanentLoss(loss=${loss.toFixed(4)})`);
    return { loss, priceRatio, liquidity };
  }

  public tvl(protocol: string, assets: { asset: string; amount: number; price: number }[]): { protocol: string; tvl: number; assets: number } {
    const total = assets.reduce((s, a) => s + a.amount * a.price, 0);
    this._recordHistory(`tvl(protocol=${protocol}, tvl=${total.toFixed(2)})`);
    return { protocol, tvl: total, assets: assets.length };
  }

  public registerPool(pool: LiquidityPool): void {
    this._pools.set(`${pool.tokenA}-${pool.tokenB}`, pool);
  }

  public pools(): LiquidityPool[] {
    return Array.from(this._pools.values()).map(p => ({ ...p }));
  }

  public lastFarm(): YieldFarm | null {
    return this._farms.length > 0 ? { ...this._farms[this._farms.length - 1] } : null;
  }

  public summary(): { pools: number; lending: number; farms: number; historyLength: number; counter: number } {
    return {
      pools: this._pools.size,
      lending: this._lending.length,
      farms: this._farms.length,
      historyLength: this._history.length,
      counter: this._counter,
    };
  }

  public toJSON(): Record<string, unknown> {
    return {
      pools: this._pools.size,
      lending: this._lending.length,
      farms: this._farms.length,
      history: [...this._history],
      poolPairs: Array.from(this._pools.keys()),
    };
  }

  public validate(): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    for (const p of this._pools.values()) {
      if (p.reserveA < 0 || p.reserveB < 0) issues.push(`pool ${p.tokenA}-${p.tokenB}: negative reserve`);
      if (p.fee < 0 || p.fee > 1) issues.push(`pool ${p.tokenA}-${p.tokenB}: fee out of [0,1]`);
      if (p.k !== p.reserveA * p.reserveB) issues.push(`pool ${p.tokenA}-${p.tokenB}: k invariant mismatch`);
    }
    for (const f of this._farms) {
      if (f.stake < 0) issues.push('farm: negative stake');
      if (f.duration <= 0) issues.push('farm: non-positive duration');
    }
    return { valid: issues.length === 0, issues };
  }

  public poolStatistics(pool: LiquidityPool): {
    reserves: { a: number; b: number };
    price: number;
    depth: number;
    utilization: number;
  } {
    return {
      reserves: { a: pool.reserveA, b: pool.reserveB },
      price: pool.reserveA > 0 ? pool.reserveB / pool.reserveA : 0,
      depth: pool.reserveA + pool.reserveB,
      utilization: pool.k > 0 ? 1 : 0,
    };
  }

  public portfolioAnalysis(positions: { asset: string; amount: number; price: number; weight: number }[]): {
    totalValue: number;
    weightedReturn: number;
    diversification: number;
    largestPosition: { asset: string; share: number };
  } {
    const totalValue = positions.reduce((s, p) => s + p.amount * p.price, 0);
    const weightedReturn = positions.reduce((s, p) => s + p.weight * p.price, 0) / Math.max(1, positions.length);
    const weights = positions.map(p => totalValue > 0 ? (p.amount * p.price) / totalValue : 0);
    const diversification = weights.reduce((s, w) => s - w * Math.log(w + 1e-9), 0);
    const largest = positions.reduce((max, p) => (p.amount * p.price > max.value ? { asset: p.asset, value: p.amount * p.price } : max), { asset: '', value: 0 });
    return {
      totalValue,
      weightedReturn,
      diversification,
      largestPosition: { asset: largest.asset, share: totalValue > 0 ? largest.value / totalValue : 0 },
    };
  }

  public riskMetrics(positions: { debt: number; collateral: number; price: number }[]): {
    totalDebt: number;
    totalCollateral: number;
    healthFactor: number;
    liquidationRisk: 'low' | 'medium' | 'high';
  } {
    const totalDebt = positions.reduce((s, p) => s + p.debt, 0);
    const totalCollateral = positions.reduce((s, p) => s + p.collateral * p.price, 0);
    const healthFactor = totalDebt > 0 ? totalCollateral / totalDebt : Infinity;
    const liquidationRisk: 'low' | 'medium' | 'high' = healthFactor < 1.2 ? 'high' : healthFactor < 1.5 ? 'medium' : 'low';
    return { totalDebt, totalCollateral, healthFactor, liquidationRisk };
  }

  private _recordHistory(entry: string): void {
    this._counter++;
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }

  public toPacket(): DataPacket<{
    pools: number;
    lending: number;
    farms: number;
    history: string[];
  }> {
    return {
      id: `defi-${Date.now()}-${this._counter}`,
      payload: {
        pools: this._pools.size,
        lending: this._lending.length,
        farms: this._farms.length,
        history: [...this._history],
      },
      metadata: {
        createdAt: Date.now(),
        route: ['blockchain', 'defi', 'result'],
        priority: 0.85,
        phase: 'finance',
      },
    };
  }

  public reset(): void {
    this._pools.clear();
    this._lending = [];
    this._farms = [];
    this._history = [];
    this._counter = 0;
  }
}

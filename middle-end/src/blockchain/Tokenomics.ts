import { DataPacket } from '../shared/types';

/** A token definition with supply and distribution. */
export interface Token {
  readonly name: string;
  readonly symbol: string;
  readonly supply: number;
  readonly distribution: Record<string, number>;
  readonly utility: string[];
  readonly type: 'utility' | 'governance' | 'security' | 'stablecoin';
}

/** A vesting schedule for a beneficiary. */
export interface VestingSchedule {
  readonly beneficiary: string;
  readonly amount: number;
  readonly cliff: number;
  readonly duration: number;
  readonly vested: number;
  readonly released: number;
}

/** A governance proposal with voting parameters. */
export interface Governance {
  readonly proposal: string;
  readonly quorum: number;
  readonly threshold: number;
  readonly voting: { for: number; against: number; abstain: number };
  readonly status: 'pending' | 'active' | 'passed' | 'rejected';
}

/** Result of a valuation model. */
export interface ValuationResult {
  readonly model: string;
  readonly value: number;
  readonly factors: Record<string, number>;
}

export class Tokenomics {
  private _tokens: Map<string, Token> = new Map();
  private _vesting: VestingSchedule[] = [];
  private _governance: Governance[] = [];
  private _history: string[] = [];
  private _counter = 0;

  get tokenCount(): number {
    return this._tokens.size;
  }

  get vestingCount(): number {
    return this._vesting.length;
  }

  get governanceCount(): number {
    return this._governance.length;
  }

  get history(): string[] {
    return [...this._history];
  }

  public tokenModel(name: string, type: Token['type'], supply: number): Token {
    const token: Token = {
      name,
      symbol: name.substring(0, 4).toUpperCase(),
      supply,
      distribution: {},
      utility: [],
      type,
    };
    this._tokens.set(name, token);
    this._recordHistory(`tokenModel(${name}, supply=${supply})`);
    return token;
  }

  public distribution(allocation: string[], percentages: number[]): Record<string, number> {
    const dist: Record<string, number> = {};
    allocation.forEach((a, i) => { dist[a] = percentages[i] ?? 0; });
    this._recordHistory(`distribution(allocs=${allocation.length})`);
    return dist;
  }

  public vesting(beneficiary: string, amount: number, schedule: { cliff: number; duration: number }): VestingSchedule {
    const vs: VestingSchedule = {
      beneficiary,
      amount,
      cliff: schedule.cliff,
      duration: schedule.duration,
      vested: 0,
      released: 0,
    };
    this._vesting.push(vs);
    this._recordHistory(`vesting(${beneficiary}, amount=${amount})`);
    return vs;
  }

  public cliff(beneficiary: string, period: number): { cliffEnds: number; vested: number; beneficiary: string } {
    const cliffEnds = period;
    this._recordHistory(`cliff(${beneficiary}, period=${period})`);
    return { cliffEnds, vested: 0, beneficiary };
  }

  public inflation(rate: number, period: number, mechanism: string): { newSupply: number; rate: number; period: number } {
    const base = 1000000;
    const newSupply = base * Math.pow(1 + rate, period);
    this._recordHistory(`inflation(rate=${rate}, period=${period})`);
    return { newSupply, rate, period };
  }

  public deflation(burn: number, mechanism: 'buyback' | 'direct' | 'protocol'): { burned: number; mechanism: string; supplyReduced: number } {
    this._recordHistory(`deflation(burn=${burn}, mech=${mechanism})`);
    return { burned: burn, mechanism, supplyReduced: burn };
  }

  public stakingReward(amount: number, duration: number, apy: number): { reward: number; totalReturn: number; apy: number } {
    const reward = amount * apy * (duration / 365);
    this._recordHistory(`stakingReward(amount=${amount}, apy=${apy})`);
    return { reward, totalReturn: amount + reward, apy };
  }

  public liquidityMining(reward: number, pool: string, duration: number): { reward: number; pool: string; apr: number } {
    const apr = (reward / duration) * 365;
    this._recordHistory(`liquidityMining(pool=${pool}, duration=${duration})`);
    return { reward, pool, apr };
  }

  public governance(proposal: string, quorum: number, threshold: number, voting: { for: number; against: number; abstain: number }): Governance {
    const total = voting.for + voting.against + voting.abstain;
    const reachedQuorum = total >= quorum;
    const passed = reachedQuorum && voting.for > voting.against && (voting.for / total) >= threshold;
    const gov: Governance = {
      proposal,
      quorum,
      threshold,
      voting,
      status: passed ? 'passed' : 'rejected',
    };
    this._governance.push(gov);
    this._recordHistory(`governance(${proposal}, status=${gov.status})`);
    return gov;
  }

  public quadraticVoting(voter: string, credits: number, options: number[]): { distribution: number[]; voter: string; spent: number } {
    const total = options.reduce((s, o) => s + o * o, 0);
    const distribution = options.map(o => (o * o) / total * credits);
    const spent = distribution.reduce((s, d) => s + Math.sqrt(d), 0);
    this._recordHistory(`quadraticVoting(voter=${voter}, credits=${credits})`);
    return { distribution, voter, spent };
  }

  public tokenVelocity(supply: number, gdp: number, velocity: number): { velocity: number; price: number; marketCap: number } {
    const price = velocity > 0 ? gdp / (supply * velocity) : 0;
    const marketCap = price * supply;
    this._recordHistory(`tokenVelocity(velocity=${velocity})`);
    return { velocity, price, marketCap };
  }

  public valuation(model: 'discounted-cashflow' | 'network-value' | 'metcalfe', factors: Record<string, number>): ValuationResult {
    let value = 0;
    for (const v of Object.values(factors)) value += v;
    switch (model) {
      case 'discounted-cashflow':
        value *= 0.8;
        break;
      case 'network-value':
        value *= 1.2;
        break;
      case 'metcalfe':
        value = Math.pow(value, 2) * 0.01;
        break;
    }
    this._recordHistory(`valuation(model=${model}, value=${value.toFixed(2)})`);
    return { model, value, factors: { ...factors } };
  }

  public vestingSchedules(): VestingSchedule[] {
    return this._vesting.map(v => ({ ...v }));
  }

  public tokens(): Token[] {
    return Array.from(this._tokens.values()).map(t => ({ ...t, utility: [...t.utility] }));
  }

  public governanceProposals(): Governance[] {
    return this._governance.map(g => ({ ...g, voting: { ...g.voting } }));
  }

  public lastGovernance(): Governance | null {
    return this._governance.length > 0 ? { ...this._governance[this._governance.length - 1], voting: { ...this._governance[this._governance.length - 1].voting } } : null;
  }

  public summary(): { tokens: number; vesting: number; governance: number; historyLength: number; counter: number } {
    return {
      tokens: this._tokens.size,
      vesting: this._vesting.length,
      governance: this._governance.length,
      historyLength: this._history.length,
      counter: this._counter,
    };
  }

  public toJSON(): Record<string, unknown> {
    return {
      tokens: this._tokens.size,
      vesting: this._vesting.length,
      governance: this._governance.length,
      history: [...this._history],
      tokenSymbols: Array.from(this._tokens.values()).map(t => t.symbol),
    };
  }

  public validate(): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    for (const t of this._tokens.values()) {
      if (t.supply < 0) issues.push(`token ${t.name}: negative supply`);
      const total = Object.values(t.distribution).reduce((s, v) => s + v, 0);
      if (total > 1.01) issues.push(`token ${t.name}: distribution exceeds 100%`);
    }
    for (const v of this._vesting) {
      if (v.amount < 0) issues.push(`vesting for ${v.beneficiary}: negative amount`);
      if (v.cliff < 0 || v.cliff > v.duration) issues.push(`vesting for ${v.beneficiary}: invalid cliff`);
      if (v.released > v.vested + 1e-6) issues.push(`vesting for ${v.beneficiary}: released exceeds vested`);
    }
    for (const g of this._governance) {
      const total = g.voting.for + g.voting.against + g.voting.abstain;
      if (g.voting.for < 0 || g.voting.against < 0 || g.voting.abstain < 0) {
        issues.push(`governance ${g.proposal}: negative vote count`);
      }
      if (total === 0 && g.status !== 'pending' && g.status !== 'active') {
        issues.push(`governance ${g.proposal}: decided with zero votes`);
      }
    }
    return { valid: issues.length === 0, issues };
  }

  public releaseVesting(beneficiary: string, currentTime: number): { released: number; remaining: number; beneficiary: string } {
    const schedule = this._vesting.find(v => v.beneficiary === beneficiary);
    if (!schedule) return { released: 0, remaining: 0, beneficiary };
    const cliffEnd = schedule.cliff;
    if (currentTime < cliffEnd) return { released: 0, remaining: schedule.amount, beneficiary };
    const elapsed = Math.max(0, currentTime - cliffEnd);
    const duration = Math.max(1, schedule.duration - cliffEnd);
    const vested = Math.min(schedule.amount, schedule.amount * (elapsed / duration));
    const newlyReleased = Math.max(0, vested - schedule.released);
    this._recordHistory(`releaseVesting(${beneficiary}, released=${newlyReleased})`);
    return { released: newlyReleased, remaining: schedule.amount - vested, beneficiary };
  }

  public tokenomicsMetrics(): {
    totalSupply: number;
    totalVesting: number;
    activeProposals: number;
    passedProposals: number;
    avgApy: number;
  } {
    const totalSupply = Array.from(this._tokens.values()).reduce((s, t) => s + t.supply, 0);
    const totalVesting = this._vesting.reduce((s, v) => s + v.amount, 0);
    const activeProposals = this._governance.filter(g => g.status === 'active' || g.status === 'pending').length;
    const passedProposals = this._governance.filter(g => g.status === 'passed').length;
    const avgApy = 0.05;
    return { totalSupply, totalVesting, activeProposals, passedProposals, avgApy };
  }

  public tokenomicsComparison(tokens: Token[]): {
    bySupply: { name: string; supply: number }[];
    byUtility: { name: string; utilityCount: number }[];
  } {
    return {
      bySupply: tokens.map(t => ({ name: t.name, supply: t.supply })).sort((a, b) => b.supply - a.supply),
      byUtility: tokens.map(t => ({ name: t.name, utilityCount: t.utility.length })).sort((a, b) => b.utilityCount - a.utilityCount),
    };
  }

  private _recordHistory(entry: string): void {
    this._counter++;
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }

  public toPacket(): DataPacket<{
    tokens: number;
    vesting: number;
    governance: number;
    history: string[];
  }> {
    return {
      id: `tokenomics-${Date.now()}-${this._counter}`,
      payload: {
        tokens: this._tokens.size,
        vesting: this._vesting.length,
        governance: this._governance.length,
        history: [...this._history],
      },
      metadata: {
        createdAt: Date.now(),
        route: ['blockchain', 'tokenomics', 'result'],
        priority: 0.8,
        phase: 'economics',
      },
    };
  }

  public reset(): void {
    this._tokens.clear();
    this._vesting = [];
    this._governance = [];
    this._history = [];
    this._counter = 0;
  }
}

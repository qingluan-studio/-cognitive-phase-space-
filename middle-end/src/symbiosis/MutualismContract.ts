/**
 * MutualismContract - 互利契约模块
 * 定义两个模块互助协作的契约关系，双方均从合作中获益，
 * 契约约束资源交换、义务分配与违约处理。
 */

export interface MutualismContractData {
  readonly contractId: string;
  partyA: string;
  partyB: string;
  exchangeRate: number;
  signedAt: number;
  duration: number;
  terms: string[];
}

export interface ContractObligation {
  party: string;
  resource: string;
  amount: number;
  fulfilled: boolean;
}

export type ContractStatus = 'draft' | 'active' | 'breached' | 'expired';

export class MutualismContract {
  private _data: MutualismContractData;
  private _obligations: ContractObligation[] = [];
  private _status: ContractStatus = 'draft';
  private _benefitLedger: Record<string, number> = {};
  private _breachCount: number = 0;

  constructor(data: MutualismContractData) {
    this._data = { ...data, terms: [...data.terms] };
    this._benefitLedger[data.partyA] = 0;
    this._benefitLedger[data.partyB] = 0;
  }

  get contractId(): string {
    return this._data.contractId;
  }

  get status(): ContractStatus {
    return this._status;
  }

  get parties(): readonly string[] {
    return [this._data.partyA, this._data.partyB];
  }

  get exchangeRate(): number {
    return this._data.exchangeRate;
  }

  public activate(): boolean {
    if (this._status !== 'draft') {
      return false;
    }
    if (this._obligations.length === 0) {
      return false;
    }
    this._status = 'active';
    return true;
  }

  public addObligation(obligation: ContractObligation): void {
    if (!this.parties.includes(obligation.party)) {
      throw new Error(`Unknown party: ${obligation.party}`);
    }
    this._obligations.push({ ...obligation });
  }

  public exchange(provider: string, resource: string, amount: number): void {
    if (this._status !== 'active') {
      throw new Error('Contract is not active');
    }
    const receiver = provider === this._data.partyA
      ? this._data.partyB
      : this._data.partyA;
    const converted = amount * this._data.exchangeRate;
    this._benefitLedger[provider] = (this._benefitLedger[provider] ?? 0) + amount;
    this._benefitLedger[receiver] = (this._benefitLedger[receiver] ?? 0) + converted;
    this._markObligationFulfilled(provider, resource, amount);
  }

  private _markObligationFulfilled(party: string, resource: string, amount: number): void {
    const ob = this._obligations.find(
      (o) => o.party === party && o.resource === resource && !o.fulfilled
    );
    if (ob && amount >= ob.amount) {
      ob.fulfilled = true;
    }
  }

  public reportBreach(reason: string): void {
    this._breachCount++;
    if (this._breachCount >= 3) {
      this._status = 'breached';
    }
    this._data.terms.push(`BREACH#${this._breachCount}: ${reason}`);
  }

  public evaluateBalance(): { balanced: boolean; surplus: string | null } {
    const a = this._benefitLedger[this._data.partyA] ?? 0;
    const b = this._benefitLedger[this._data.partyB] ?? 0;
    const diff = Math.abs(a - b);
    const threshold = Math.max(a, b) * 0.15;
    const balanced = diff <= threshold;
    return {
      balanced,
      surplus: balanced ? null : (a > b ? this._data.partyA : this._data.partyB),
    };
  }

  public isExpired(now: number): boolean {
    const elapsed = now - this._data.signedAt;
    if (elapsed >= this._data.duration) {
      this._status = 'expired';
      return true;
    }
    return false;
  }

  public summarize(): Record<string, unknown> {
    return {
      contractId: this._data.contractId,
      parties: this.parties,
      status: this._status,
      obligations: this._obligations.length,
      fulfilled: this._obligations.filter((o) => o.fulfilled).length,
      breaches: this._breachCount,
      benefits: { ...this._benefitLedger },
    };
  }
}

/**
 * 待定事务模块：未提交的事务像鬼魂一样缠着系统，
 * 占用资源并可能干扰后续操作，必须最终化或驱除。
 */

export type TransactionState = 'pending' | 'haunting' | 'committed' | 'rolled_back' | 'exorcised';

export interface GhostTransaction {
  id: string;
  startedAt: number;
  state: TransactionState;
  operations: string[];
  resourceLocks: string[];
  hauntingIntensity: number;
}

export interface ExorcismResult {
  transactionId: string;
  exorcised: boolean;
  releasedLocks: string[];
  message: string;
}

export class PendingTransaction {
  private _transactions: Map<string, GhostTransaction> = new Map();
  private _exorcisms: ExorcismResult[] = [];
  private _hauntingThresholdMs = 5000;
  private _maxHauntingIntensity = 1.0;

  begin(transactionId: string): GhostTransaction {
    const transaction: GhostTransaction = {
      id: transactionId,
      startedAt: Date.now(),
      state: 'pending',
      operations: [],
      resourceLocks: [],
      hauntingIntensity: 0,
    };
    this._transactions.set(transactionId, transaction);
    return transaction;
  }

  addOperation(transactionId: string, operation: string): boolean {
    const transaction = this._transactions.get(transactionId);
    if (!transaction) return false;
    transaction.operations.push(operation);
    return true;
  }

  acquireLock(transactionId: string, resource: string): boolean {
    const transaction = this._transactions.get(transactionId);
    if (!transaction) return false;
    if (!transaction.resourceLocks.includes(resource)) {
      transaction.resourceLocks.push(resource);
    }
    return true;
  }

  commit(transactionId: string): boolean {
    const transaction = this._transactions.get(transactionId);
    if (!transaction || transaction.state !== 'pending') return false;
    transaction.state = 'committed';
    transaction.resourceLocks = [];
    return true;
  }

  rollback(transactionId: string): boolean {
    const transaction = this._transactions.get(transactionId);
    if (!transaction) return false;
    transaction.state = 'rolled_back';
    transaction.resourceLocks = [];
    return true;
  }

  updateHaunting(): number {
    const now = Date.now();
    let haunted = 0;
    for (const transaction of this._transactions.values()) {
      if (transaction.state === 'pending') {
        const elapsed = now - transaction.startedAt;
        if (elapsed > this._hauntingThresholdMs) {
          transaction.state = 'haunting';
          transaction.hauntingIntensity = Math.min(
            this._maxHauntingIntensity,
            (elapsed - this._hauntingThresholdMs) / 10000
          );
          haunted++;
        }
      }
    }
    return haunted;
  }

  exorcise(transactionId: string): ExorcismResult {
    const transaction = this._transactions.get(transactionId);
    const releasedLocks = transaction ? [...transaction.resourceLocks] : [];
    if (!transaction) {
      return { transactionId, exorcised: false, releasedLocks: [], message: 'Transaction not found' };
    }
    transaction.state = 'exorcised';
    transaction.resourceLocks = [];
    const result: ExorcismResult = {
      transactionId,
      exorcised: true,
      releasedLocks,
      message: 'Ghost transaction exorcised',
    };
    this._exorcisms.push(result);
    if (this._exorcisms.length > 200) this._exorcisms.shift();
    return result;
  }

  exorciseAllHaunting(): ExorcismResult[] {
    const results: ExorcismResult[] = [];
    for (const transaction of this._transactions.values()) {
      if (transaction.state === 'haunting') {
        results.push(this.exorcise(transaction.id));
      }
    }
    return results;
  }

  getHauntingTransactions(): GhostTransaction[] {
    return Array.from(this._transactions.values()).filter(t => t.state === 'haunting');
  }

  setHauntingThreshold(ms: number): void {
    this._hauntingThresholdMs = Math.max(100, ms);
  }

  getExorcismHistory(limit: number = 50): ExorcismResult[] {
    return this._exorcisms.slice(-limit);
  }

  get transactionCount(): number {
    return this._transactions.size;
  }

  get hauntingCount(): number {
    return this.getHauntingTransactions().length;
  }
}

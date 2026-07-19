import { DataPacket } from '../shared/types';

export interface BankAccount {
  id: string;
  type: string;
  balance: number;
  currency: string;
  holder: string;
  status: 'active' | 'inactive' | 'frozen' | 'closed';
}

export interface Transaction {
  id: string;
  type: string;
  amount: number;
  currency: string;
  fromAccount: string;
  toAccount: string;
  status: 'pending' | 'completed' | 'failed' | 'reversed';
  timestamp: number;
}

interface Loan {
  id: string;
  applicant: string;
  amount: number;
  term: number;
  rate: number;
  status: string;
  balance: number;
}

export class CoreBanking {
  private _accounts: Map<string, BankAccount> = new Map();
  private _transactions: Map<string, Transaction> = new Map();
  private _loans: Map<string, Loan> = new Map();
  private _ledger: Map<string, { debit: number; credit: number }> = new Map();
  private _counter = 0;
  private _stats = {
    totalAccounts: 0,
    totalTransactions: 0,
    totalBalance: 0,
    totalLoans: 0,
    loanPortfolio: 0,
  };

  openAccount(type: string, holder: string, initialDeposit: number, currency: string): BankAccount {
    const id = `acc-${Date.now()}-${this._counter++}`;
    const account: BankAccount = {
      id,
      type,
      balance: initialDeposit,
      currency,
      holder,
      status: 'active',
    };
    this._accounts.set(id, account);
    this._stats.totalAccounts++;
    this._stats.totalBalance += initialDeposit;
    return account;
  }

  closeAccount(accountId: string, reason: string): boolean {
    const account = this._accounts.get(accountId);
    if (!account) return false;
    account.status = 'closed';
    this._stats.totalBalance -= account.balance;
    return true;
  }

  deposit(accountId: string, amount: number, source: string): Transaction {
    const account = this._accounts.get(accountId);
    const txId = `tx-${Date.now()}-${this._counter++}`;
    const tx: Transaction = {
      id: txId,
      type: 'deposit',
      amount,
      currency: account?.currency || 'USD',
      fromAccount: source,
      toAccount: accountId,
      status: 'completed',
      timestamp: Date.now(),
    };
    if (account) {
      account.balance += amount;
      this._stats.totalBalance += amount;
    }
    this._transactions.set(txId, tx);
    this._stats.totalTransactions++;
    return tx;
  }

  withdraw(accountId: string, amount: number, method: string): Transaction {
    const account = this._accounts.get(accountId);
    const txId = `tx-${Date.now()}-${this._counter++}`;
    const success = account && account.balance >= amount;
    const tx: Transaction = {
      id: txId,
      type: 'withdrawal',
      amount,
      currency: account?.currency || 'USD',
      fromAccount: accountId,
      toAccount: method,
      status: success ? 'completed' : 'failed',
      timestamp: Date.now(),
    };
    if (account && success) {
      account.balance -= amount;
      this._stats.totalBalance -= amount;
    }
    this._transactions.set(txId, tx);
    this._stats.totalTransactions++;
    return tx;
  }

  transfer(fromAccount: string, toAccount: string, amount: number, description: string): Transaction {
    const from = this._accounts.get(fromAccount);
    const to = this._accounts.get(toAccount);
    const txId = `tx-${Date.now()}-${this._counter++}`;
    const success = from && from.balance >= amount;
    const tx: Transaction = {
      id: txId,
      type: 'transfer',
      amount,
      currency: from?.currency || 'USD',
      fromAccount,
      toAccount,
      status: success ? 'completed' : 'failed',
      timestamp: Date.now(),
    };
    if (from && to && success) {
      from.balance -= amount;
      to.balance += amount;
    }
    this._transactions.set(txId, tx);
    this._stats.totalTransactions++;
    return tx;
  }

  accountStatement(accountId: string, startDate: number, endDate: number): { account: string; transactions: Transaction[]; balance: number; startBalance: number; endBalance: number } {
    const account = this._accounts.get(accountId);
    const txList = Array.from(this._transactions.values()).filter(tx =>
      (tx.fromAccount === accountId || tx.toAccount === accountId) &&
      tx.timestamp >= startDate && tx.timestamp <= endDate
    );
    return {
      account: accountId,
      transactions: txList,
      balance: account?.balance || 0,
      startBalance: (account?.balance || 0) * 0.9,
      endBalance: account?.balance || 0,
    };
  }

  interestCalculation(account: string, rate: number, period: string, method: string): { account: string; rate: number; period: string; interest: number; method: string } {
    const acc = this._accounts.get(account);
    const balance = acc?.balance || 0;
    const interest = balance * rate * (period === 'yearly' ? 1 : period === 'monthly' ? 1 / 12 : 1 / 365);
    return { account, rate, period, interest, method };
  }

  loanOrigination(applicant: string, amount: number, term: number, rate: number): Loan {
    const id = `loan-${Date.now()}-${this._counter++}`;
    const loan: Loan = {
      id,
      applicant,
      amount,
      term,
      rate,
      status: 'approved',
      balance: amount,
    };
    this._loans.set(id, loan);
    this._stats.totalLoans++;
    this._stats.loanPortfolio += amount;
    return loan;
  }

  loanRepayment(loanId: string, amount: number, schedule: string): { loanId: string; payment: number; principal: number; interest: number; remainingBalance: number } {
    const loan = this._loans.get(loanId);
    if (!loan) return { loanId, payment: 0, principal: 0, interest: 0, remainingBalance: 0 };
    const interest = loan.balance * loan.rate / 12;
    const principal = amount - interest;
    loan.balance = Math.max(0, loan.balance - principal);
    return {
      loanId,
      payment: amount,
      principal,
      interest,
      remainingBalance: loan.balance,
    };
  }

  overdraft(accountId: string, limit: number, fee: number): { accountId: string; limit: number; used: number; fee: number; available: number } {
    const account = this._accounts.get(accountId);
    const used = account ? Math.max(0, -account.balance) : 0;
    return {
      accountId,
      limit,
      used,
      fee,
      available: limit - used,
    };
  }

  ledgerEntry(debits: { account: string; amount: number }[], credits: { account: string; amount: number }[], journal: string): { journal: string; debits: number; credits: number; balanced: boolean; entryId: string } {
    const totalDebit = debits.reduce((s, d) => s + d.amount, 0);
    const totalCredit = credits.reduce((s, c) => s + c.amount, 0);
    const entryId = `ledger-${Date.now()}-${this._counter++}`;
    this._ledger.set(entryId, { debit: totalDebit, credit: totalCredit });
    return {
      journal,
      debits: totalDebit,
      credits: totalCredit,
      balanced: Math.abs(totalDebit - totalCredit) < 0.01,
      entryId,
    };
  }

  reconciliation(system: string, external: string, rules: string[]): { system: string; external: string; matched: number; unmatched: number; differences: number } {
    const total = 100;
    const matched = Math.floor(total * 0.95);
    return {
      system,
      external,
      matched,
      unmatched: total - matched,
      differences: total - matched,
    };
  }

  generalLedger(chart: string[], periods: string[], trialBalance: string): { chart: number; periods: string[]; trialBalance: string; debitTotal: number; creditTotal: number } {
    const debitTotal = Math.random() * 1000000 + 100000;
    return {
      chart: chart.length,
      periods,
      trialBalance,
      debitTotal,
      creditTotal: debitTotal,
    };
  }

  get accountCount(): number {
    return this._accounts.size;
  }

  get transactionCount(): number {
    return this._transactions.size;
  }

  get loanCount(): number {
    return this._loans.size;
  }

  get stats(): { totalAccounts: number; totalTransactions: number; totalBalance: number; totalLoans: number; loanPortfolio: number } {
    return { ...this._stats };
  }

  public toPacket(): DataPacket<{
    accounts: number;
    transactions: number;
    loans: number;
    ledgerEntries: number;
    stats: { totalAccounts: number; totalTransactions: number; totalBalance: number; totalLoans: number; loanPortfolio: number };
  }> {
    return {
      id: `core-banking-${Date.now()}-${this._counter}`,
      payload: {
        accounts: this._accounts.size,
        transactions: this._transactions.size,
        loans: this._loans.size,
        ledgerEntries: this._ledger.size,
        stats: { ...this._stats },
      },
      metadata: {
        createdAt: Date.now(),
        route: ['fintech', 'core_banking', 'result'],
        priority: 0.9,
        phase: 'banking',
      },
    };
  }

  public reset(): void {
    this._accounts.clear();
    this._transactions.clear();
    this._loans.clear();
    this._ledger.clear();
    this._counter = 0;
    this._stats = {
      totalAccounts: 0,
      totalTransactions: 0,
      totalBalance: 0,
      totalLoans: 0,
      loanPortfolio: 0,
    };
  }
}

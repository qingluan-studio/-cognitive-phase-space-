import { DataPacket } from '../shared/types';

export interface Payment {
  id: string;
  amount: number;
  currency: string;
  method: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
}

export interface PaymentResult {
  id: string;
  success: boolean;
  transactionId: string;
  amount: number;
  currency: string;
  timestamp: number;
  error?: string;
}

interface PaymentMethod {
  id: string;
  type: string;
  name: string;
  supported: boolean;
  fees: number;
}

export class PaymentProcessor {
  private _payments: Map<string, Payment> = new Map();
  private _methods: Map<string, PaymentMethod> = new Map();
  private _transactions: Map<string, PaymentResult> = new Map();
  private _gateways: Map<string, { name: string; status: string; latency: number }> = new Map();
  private _counter = 0;
  private _stats = {
    totalPayments: 0,
    successfulPayments: 0,
    failedPayments: 0,
    totalVolume: 0,
    avgFee: 0,
  };

  processPayment(amount: number, method: string, details: Record<string, unknown>): PaymentResult {
    const id = `pay-${Date.now()}-${this._counter++}`;
    const success = Math.random() > 0.05;
    const result: PaymentResult = {
      id,
      success,
      transactionId: `txn-${Date.now()}-${this._counter++}`,
      amount,
      currency: (details.currency as string) || 'USD',
      timestamp: Date.now(),
      error: success ? undefined : 'payment_failed',
    };
    const payment: Payment = {
      id,
      amount,
      currency: (details.currency as string) || 'USD',
      method,
      status: success ? 'completed' : 'failed',
    };
    this._payments.set(id, payment);
    this._transactions.set(id, result);
    this._stats.totalPayments++;
    if (success) {
      this._stats.successfulPayments++;
      this._stats.totalVolume += amount;
    } else {
      this._stats.failedPayments++;
    }
    return result;
  }

  creditCardPayment(amount: number, card: string, merchant: string): PaymentResult {
    return this.processPayment(amount, 'credit_card', { card, merchant, currency: 'USD' });
  }

  bankTransfer(amount: number, sender: string, receiver: string, bank: string): PaymentResult {
    return this.processPayment(amount, 'bank_transfer', { sender, receiver, bank, currency: 'USD' });
  }

  digitalWallet(amount: number, wallet: string, transaction: string): PaymentResult {
    return this.processPayment(amount, 'digital_wallet', { wallet, transaction, currency: 'USD' });
  }

  cryptoPayment(amount: number, crypto: string, address: string): PaymentResult {
    return this.processPayment(amount, 'crypto', { crypto, address, currency: crypto });
  }

  paymentGateway(payment: string, gateway: string, config: Record<string, unknown>): { gateway: string; transactionId: string; fee: number; status: string } {
    const success = Math.random() > 0.03;
    this._gateways.set(gateway, { name: gateway, status: success ? 'active' : 'error', latency: Math.random() * 200 + 50 });
    return {
      gateway,
      transactionId: `gw-${Date.now()}-${this._counter++}`,
      fee: Math.random() * 0.05 + 0.01,
      status: success ? 'success' : 'failed',
    };
  }

  paymentRouting(payment: string, rules: string[], providers: string[]): { provider: string; route: string[]; cost: number; speed: number } {
    const provider = providers[Math.floor(Math.random() * providers.length)];
    return {
      provider,
      route: rules,
      cost: Math.random() * 0.03 + 0.005,
      speed: Math.random() * 3 + 1,
    };
  }

  paymentFraudCheck(payment: string, rules: string[], score: number): { riskScore: number; fraud: boolean; rulesTriggered: string[]; action: string } {
    const riskScore = Math.random() * 100;
    const fraud = riskScore > 80;
    const triggered = rules.filter(() => Math.random() > 0.7);
    return {
      riskScore,
      fraud,
      rulesTriggered: triggered,
      action: fraud ? 'reject' : riskScore > 50 ? 'review' : 'approve',
    };
  }

  chargebackHandling(dispute: string, evidence: string[]): { dispute: string; status: string; evidenceCount: number; outcome: string } {
    const won = Math.random() > 0.4;
    return {
      dispute,
      status: won ? 'won' : 'lost',
      evidenceCount: evidence.length,
      outcome: won ? 'merchant_wins' : 'cardholder_wins',
    };
  }

  refundPayment(transaction: string, reason: string, amount: number): PaymentResult {
    const id = `refund-${Date.now()}-${this._counter++}`;
    return {
      id,
      success: true,
      transactionId: `refund-txn-${Date.now()}`,
      amount: -amount,
      currency: 'USD',
      timestamp: Date.now(),
    };
  }

  recurringBilling(subscription: string, plan: string, cycle: string): { subscription: string; plan: string; cycle: string; nextBilling: number; amount: number } {
    return {
      subscription,
      plan,
      cycle,
      nextBilling: Date.now() + (cycle === 'monthly' ? 2592000000 : cycle === 'weekly' ? 604800000 : 31536000000),
      amount: Math.random() * 100 + 10,
    };
  }

  paymentTokenization(payment: string, token: string, vault: string): { token: string; vault: string; tokenized: boolean; expiry: number } {
    return {
      token,
      vault,
      tokenized: true,
      expiry: Date.now() + 31536000000,
    };
  }

  paymentSettlement(merchant: string, processor: string, schedule: string): { merchant: string; processor: string; amount: number; schedule: string; settlementDate: number } {
    return {
      merchant,
      processor,
      amount: Math.random() * 100000 + 10000,
      schedule,
      settlementDate: Date.now() + 86400000 * 3,
    };
  }

  get paymentCount(): number {
    return this._payments.size;
  }

  get transactionCount(): number {
    return this._transactions.size;
  }

  get methodCount(): number {
    return this._methods.size;
  }

  get stats(): { totalPayments: number; successfulPayments: number; failedPayments: number; totalVolume: number; avgFee: number } {
    return { ...this._stats };
  }

  public toPacket(): DataPacket<{
    payments: number;
    transactions: number;
    gateways: number;
    stats: { totalPayments: number; successfulPayments: number; failedPayments: number; totalVolume: number; avgFee: number };
  }> {
    return {
      id: `payment-${Date.now()}-${this._counter}`,
      payload: {
        payments: this._payments.size,
        transactions: this._transactions.size,
        gateways: this._gateways.size,
        stats: { ...this._stats },
      },
      metadata: {
        createdAt: Date.now(),
        route: ['fintech', 'payment_processor', 'result'],
        priority: 0.9,
        phase: 'processing',
      },
    };
  }

  public reset(): void {
    this._payments.clear();
    this._methods.clear();
    this._transactions.clear();
    this._gateways.clear();
    this._counter = 0;
    this._stats = {
      totalPayments: 0,
      successfulPayments: 0,
      failedPayments: 0,
      totalVolume: 0,
      avgFee: 0,
    };
  }
}

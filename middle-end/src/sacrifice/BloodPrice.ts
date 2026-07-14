/**
 * 血价模块：获得新能力必须付出的代价，
 * 代价可以是计算资源、内存、功能损失或时间成本，按价值量化计价。
 */

export type BloodCurrency = 'cycles' | 'memory' | 'features' | 'latency' | 'entropy';

export interface PriceQuote {
  id: string;
  capability: string;
  currency: BloodCurrency;
  amount: number;
  dueBy: number;
  paid: boolean;
}

export interface PaymentReceipt {
  quoteId: string;
  paidAmount: number;
  remaining: number;
  paidAt: number;
}

export class BloodPrice {
  private _quotes: Map<string, PriceQuote> = new Map();
  private _receipts: PaymentReceipt[] = [];
  private _exchangeRates: Map<BloodCurrency, number> = new Map();
  private _inflationRate = 0.02;
  private _totalPaid = 0;

  constructor() {
    this._exchangeRates.set('cycles', 1);
    this._exchangeRates.set('memory', 2);
    this._exchangeRates.set('features', 5);
    this._exchangeRates.set('latency', 3);
    this._exchangeRates.set('entropy', 8);
  }

  quote(capability: string, currency: BloodCurrency, amount: number): PriceQuote {
    const rate = this._exchangeRates.get(currency) ?? 1;
    const inflatedAmount = Math.ceil(amount * rate * (1 + this._inflationRate));
    const quote: PriceQuote = {
      id: `quote-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      capability,
      currency,
      amount: inflatedAmount,
      dueBy: Date.now() + 60000,
      paid: false,
    };
    this._quotes.set(quote.id, quote);
    return quote;
  }

  pay(quoteId: string, paidAmount: number): PaymentReceipt | null {
    const quote = this._quotes.get(quoteId);
    if (!quote || quote.paid) return null;
    const previousPayments = this._receipts
      .filter(r => r.quoteId === quoteId)
      .reduce((sum, r) => sum + r.paidAmount, 0);
    const totalPaid = previousPayments + paidAmount;
    const remaining = Math.max(0, quote.amount - totalPaid);
    if (remaining === 0) {
      quote.paid = true;
    }
    const receipt: PaymentReceipt = {
      quoteId,
      paidAmount,
      remaining,
      paidAt: Date.now(),
    };
    this._receipts.push(receipt);
    if (this._receipts.length > 300) this._receipts.shift();
    this._totalPaid += paidAmount;
    return receipt;
  }

  isPaid(quoteId: string): boolean {
    const quote = this._quotes.get(quoteId);
    return !!quote && quote.paid;
  }

  applyInflation(): void {
    for (const quote of this._quotes.values()) {
      if (!quote.paid) {
        quote.amount = Math.ceil(quote.amount * (1 + this._inflationRate));
      }
    }
  }

  setExchangeRate(currency: BloodCurrency, rate: number): void {
    this._exchangeRates.set(currency, Math.max(0.1, rate));
  }

  findCheapestCurrency(amount: number): BloodCurrency {
    let cheapest: BloodCurrency = 'cycles';
    let cheapestCost = Infinity;
    for (const [currency, rate] of this._exchangeRates) {
      const cost = amount * rate;
      if (cost < cheapestCost) {
        cheapestCost = cost;
        cheapest = currency;
      }
    }
    return cheapest;
  }

  getOutstandingQuotes(): PriceQuote[] {
    return Array.from(this._quotes.values()).filter(q => !q.paid);
  }

  getReceipts(quoteId: string): PaymentReceipt[] {
    return this._receipts.filter(r => r.quoteId === quoteId);
  }

  getReceiptHistory(limit: number = 50): PaymentReceipt[] {
    return this._receipts.slice(-limit);
  }

  get totalPaid(): number {
    return this._totalPaid;
  }

  get quoteCount(): number {
    return this._quotes.size;
  }
}

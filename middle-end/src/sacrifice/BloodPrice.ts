export type BloodCurrency = 'cycles' | 'memory' | 'features' | 'latency' | 'entropy';

export interface PriceQuote {
  id: string;
  capability: string;
  currency: BloodCurrency;
  amount: number;
  baseAmount: number;
  volatility: number;
  dueBy: number;
  paid: boolean;
}

export interface PaymentReceipt {
  quoteId: string;
  paidAmount: number;
  remaining: number;
  amortized: number;
  paidAt: number;
}

export interface CurrencyCorrelation {
  pair: [BloodCurrency, BloodCurrency];
  coefficient: number;
}

export class BloodPrice {
  private _quotes: Map<string, PriceQuote> = new Map();
  private _receipts: PaymentReceipt[] = [];
  private _exchangeRates: Map<BloodCurrency, number> = new Map();
  private _volatility: Map<BloodCurrency, number> = new Map();
  private _priceHistory: Map<BloodCurrency, number[]> = new Map();
  private _correlation: Map<string, number> = new Map();
  private _inflationRate = 0.02;
  private _totalPaid = 0;
  private _tick = 0;

  constructor() {
    const baseRates: Record<BloodCurrency, number> = {
      cycles: 1,
      memory: 2,
      features: 5,
      latency: 3,
      entropy: 8,
    };
    const baseVols: Record<BloodCurrency, number> = {
      cycles: 0.05,
      memory: 0.12,
      features: 0.25,
      latency: 0.18,
      entropy: 0.4,
    };
    (Object.keys(baseRates) as BloodCurrency[]).forEach((c) => {
      this._exchangeRates.set(c, baseRates[c]);
      this._volatility.set(c, baseVols[c]);
      this._priceHistory.set(c, [baseRates[c]]);
    });
    this._seedCorrelation();
  }

  private _seedCorrelation(): void {
    const pairs: Array<[BloodCurrency, BloodCurrency]> = [
      ['cycles', 'memory'], ['cycles', 'latency'], ['memory', 'features'],
      ['memory', 'latency'], ['features', 'entropy'], ['latency', 'entropy'],
    ];
    for (const [a, b] of pairs) {
      const coef = Math.tanh((this._exchangeRates.get(a)! - this._exchangeRates.get(b)!) / 6);
      this._correlation.set(`${a}|${b}`, coef);
      this._correlation.set(`${b}|${a}`, coef);
    }
  }

  quote(capability: string, currency: BloodCurrency, amount: number): PriceQuote {
    const rate = this._exchangeRates.get(currency) ?? 1;
    const vol = this._volatility.get(currency) ?? 0.1;
    const shock = 1 + (Math.sin(this._tick * vol * 7) * vol);
    const inflatedAmount = Math.ceil(amount * rate * (1 + this._inflationRate) * shock);
    const quote: PriceQuote = {
      id: `quote-${this._tick}-${Math.random().toString(36).slice(2, 6)}`,
      capability,
      currency,
      amount: Math.max(1, inflatedAmount),
      baseAmount: amount,
      volatility: vol,
      dueBy: this._tick + 60,
      paid: false,
    };
    this._quotes.set(quote.id, quote);
    this._tick += 1;
    return quote;
  }

  pay(quoteId: string, paidAmount: number): PaymentReceipt | null {
    const quote = this._quotes.get(quoteId);
    if (!quote || quote.paid) return null;
    const previous = this._receipts
      .filter((r) => r.quoteId === quoteId)
      .reduce((s, r) => s + r.paidAmount, 0);
    const totalPaid = previous + paidAmount;
    const remaining = Math.max(0, quote.amount - totalPaid);
    const decay = Math.exp(-remaining / Math.max(1, quote.amount));
    const amortized = paidAmount * decay;
    if (remaining === 0) quote.paid = true;
    const receipt: PaymentReceipt = {
      quoteId,
      paidAmount,
      remaining,
      amortized,
      paidAt: this._tick,
    };
    this._receipts.push(receipt);
    if (this._receipts.length > 300) this._receipts.shift();
    this._totalPaid += amortized;
    return receipt;
  }

  applyInflation(): void {
    for (const quote of this._quotes.values()) {
      if (!quote.paid) {
        const vol = this._volatility.get(quote.currency) ?? 0.1;
        quote.amount = Math.ceil(quote.amount * (1 + this._inflationRate + vol * 0.1));
      }
    }
    this._recomputeVolatility();
  }

  private _recomputeVolatility(): void {
    for (const [currency, history] of this._priceHistory) {
      if (history.length < 3) continue;
      const mean = history.reduce((s, v) => s + v, 0) / history.length;
      const variance = history.reduce((s, v) => s + (v - mean) ** 2, 0) / history.length;
      const vol = Math.sqrt(variance) / Math.max(0.01, mean);
      this._volatility.set(currency, Math.min(0.9, vol));
    }
  }

  recordPrice(currency: BloodCurrency, price: number): void {
    const history = this._priceHistory.get(currency) ?? [];
    history.push(price);
    if (history.length > 50) history.shift();
    this._priceHistory.set(currency, history);
  }

  currencyEntropy(): number {
    const rates = Array.from(this._exchangeRates.values());
    const total = rates.reduce((s, v) => s + v, 0);
    if (total === 0) return 0;
    let entropy = 0;
    for (const r of rates) {
      const p = r / total;
      if (p > 0) entropy -= p * Math.log2(p);
    }
    return entropy;
  }

  setExchangeRate(currency: BloodCurrency, rate: number): void {
    this._exchangeRates.set(currency, Math.max(0.1, rate));
    this.recordPrice(currency, rate);
  }

  correlation(a: BloodCurrency, b: BloodCurrency): number {
    if (a === b) return 1;
    return this._correlation.get(`${a}|${b}`) ?? 0;
  }

  findCheapestCurrency(amount: number): BloodCurrency {
    let cheapest: BloodCurrency = 'cycles';
    let cheapestCost = Infinity;
    for (const [currency, rate] of this._exchangeRates) {
      const vol = this._volatility.get(currency) ?? 0.1;
      const riskAdjusted = amount * rate * (1 + vol);
      if (riskAdjusted < cheapestCost) {
        cheapestCost = riskAdjusted;
        cheapest = currency;
      }
    }
    return cheapest;
  }

  getOutstandingQuotes(): PriceQuote[] {
    return Array.from(this._quotes.values()).filter((q) => !q.paid);
  }

  getReceipts(quoteId: string): PaymentReceipt[] {
    return this._receipts.filter((r) => r.quoteId === quoteId);
  }

  getReceiptHistory(limit: number = 50): PaymentReceipt[] {
    return this._receipts.slice(-limit);
  }

  correlations(): CurrencyCorrelation[] {
    const seen = new Set<string>();
    const out: CurrencyCorrelation[] = [];
    const currencies = Array.from(this._exchangeRates.keys());
    for (let i = 0; i < currencies.length; i++) {
      for (let j = i + 1; j < currencies.length; j++) {
        const key = `${currencies[i]}|${currencies[j]}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ pair: [currencies[i], currencies[j]], coefficient: this.correlation(currencies[i], currencies[j]) });
      }
    }
    return out;
  }

  get totalPaid(): number {
    return this._totalPaid;
  }

  get quoteCount(): number {
    return this._quotes.size;
  }

  get inflationRate(): number {
    return this._inflationRate;
  }
}

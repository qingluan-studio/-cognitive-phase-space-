import { DataPacket } from '../shared/types';

export interface Order {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: string;
  quantity: number;
  price: number;
  status: 'pending' | 'filled' | 'partial' | 'cancelled' | 'rejected';
}

export interface TradeResult {
  id: string;
  orderId: string;
  symbol: string;
  side: string;
  quantity: number;
  price: number;
  timestamp: number;
  fee: number;
}

interface OrderBookLevel {
  price: number;
  quantity: number;
  count: number;
}

export class TradingEngine {
  private _orders: Map<string, Order> = new Map();
  private _trades: Map<string, TradeResult> = new Map();
  private _orderBooks: Map<string, { bids: OrderBookLevel[]; asks: OrderBookLevel[] }> = new Map();
  private _strategies: Map<string, { name: string; type: string; pnl: number }> = new Map();
  private _counter = 0;
  private _stats = {
    totalOrders: 0,
    filledOrders: 0,
    totalVolume: 0,
    avgSpread: 0,
    pnl: 0,
  };

  placeOrder(order: Order, exchange: string): TradeResult {
    const trade: TradeResult = {
      id: `trade-${Date.now()}-${this._counter++}`,
      orderId: order.id,
      symbol: order.symbol,
      side: order.side,
      quantity: order.quantity,
      price: order.price * (1 + (Math.random() - 0.5) * 0.001),
      timestamp: Date.now(),
      fee: order.quantity * order.price * 0.001,
    };
    this._orders.set(order.id, { ...order, status: 'filled' });
    this._trades.set(trade.id, trade);
    this._stats.totalOrders++;
    this._stats.filledOrders++;
    this._stats.totalVolume += trade.quantity * trade.price;
    return trade;
  }

  cancelOrder(orderId: string): boolean {
    const order = this._orders.get(orderId);
    if (!order) return false;
    order.status = 'cancelled';
    return true;
  }

  modifyOrder(orderId: string, changes: Partial<Order>): Order | null {
    const order = this._orders.get(orderId);
    if (!order) return null;
    Object.assign(order, changes);
    return order;
  }

  orderBook(symbol: string, levels: number): { bids: OrderBookLevel[]; asks: OrderBookLevel[]; midPrice: number; spread: number } {
    const mid = 100 + Math.random() * 10;
    const bids: OrderBookLevel[] = [];
    const asks: OrderBookLevel[] = [];
    for (let i = 0; i < levels; i++) {
      const bidPrice = mid - (i + 1) * 0.01;
      const askPrice = mid + (i + 1) * 0.01;
      bids.push({ price: bidPrice, quantity: Math.random() * 1000 + 100, count: Math.floor(Math.random() * 10 + 1) });
      asks.push({ price: askPrice, quantity: Math.random() * 1000 + 100, count: Math.floor(Math.random() * 10 + 1) });
    }
    this._orderBooks.set(symbol, { bids, asks });
    const spread = asks[0].price - bids[0].price;
    this._stats.avgSpread = spread;
    return { bids, asks, midPrice: mid, spread };
  }

  matchingEngine(buys: Order[], sells: Order[], rules: string[]): { trades: TradeResult[]; remainingBuys: Order[]; remainingSells: Order[]; volume: number } {
    const trades: TradeResult[] = [];
    const matched = Math.min(buys.length, sells.length);
    for (let i = 0; i < matched; i++) {
      trades.push({
        id: `match-${Date.now()}-${this._counter++}`,
        orderId: buys[i].id,
        symbol: buys[i].symbol,
        side: 'buy',
        quantity: Math.min(buys[i].quantity, sells[i].quantity),
        price: (buys[i].price + sells[i].price) / 2,
        timestamp: Date.now(),
        fee: 0,
      });
    }
    return {
      trades,
      remainingBuys: buys.slice(matched),
      remainingSells: sells.slice(matched),
      volume: trades.reduce((s, t) => s + t.quantity * t.price, 0),
    };
  }

  marketOrder(symbol: string, side: 'buy' | 'sell', quantity: number): TradeResult {
    const order: Order = {
      id: `order-${Date.now()}-${this._counter++}`,
      symbol,
      side,
      type: 'market',
      quantity,
      price: 100 + Math.random() * 10,
      status: 'pending',
    };
    return this.placeOrder(order, 'default');
  }

  limitOrder(symbol: string, side: 'buy' | 'sell', quantity: number, price: number): TradeResult {
    const order: Order = {
      id: `order-${Date.now()}-${this._counter++}`,
      symbol,
      side,
      type: 'limit',
      quantity,
      price,
      status: 'pending',
    };
    return this.placeOrder(order, 'default');
  }

  stopOrder(symbol: string, side: 'buy' | 'sell', quantity: number, stopPrice: number): TradeResult {
    const order: Order = {
      id: `order-${Date.now()}-${this._counter++}`,
      symbol,
      side,
      type: 'stop',
      quantity,
      price: stopPrice,
      status: 'pending',
    };
    return this.placeOrder(order, 'default');
  }

  algorithmicTrading(strategy: string, data: Record<string, number[]>, execution: string): { strategy: string; signals: number; trades: number; pnl: number; sharpe: number } {
    const pnl = (Math.random() - 0.4) * 10000;
    this._stats.pnl += pnl;
    this._strategies.set(strategy, { name: strategy, type: execution, pnl });
    return {
      strategy,
      signals: Math.floor(Math.random() * 100 + 10),
      trades: Math.floor(Math.random() * 50 + 5),
      pnl,
      sharpe: Math.random() * 3 + 0.5,
    };
  }

  pairTrading(pair: string[], model: string, spread: number): { pair: string[]; spread: number; zScore: number; signal: string; entry: number; exit: number } {
    const zScore = (Math.random() - 0.5) * 4;
    return {
      pair,
      spread,
      zScore,
      signal: zScore > 2 ? 'short' : zScore < -2 ? 'long' : 'neutral',
      entry: spread * 1.5,
      exit: spread * 0.2,
    };
  }

  arbitrage(exchanges: string[], pair: string, opportunity: number): { profit: number; exchanges: string[]; pair: string; opportunity: number; latency: number } {
    return {
      profit: Math.random() * 1000 + 100,
      exchanges,
      pair,
      opportunity,
      latency: Math.random() * 10 + 1,
    };
  }

  marketMaking(symbol: string, spread: number, inventory: number): { symbol: string; bidPrice: number; askPrice: number; spread: number; inventory: number; pnl: number } {
    const mid = 100 + Math.random() * 10;
    return {
      symbol,
      bidPrice: mid - spread / 2,
      askPrice: mid + spread / 2,
      spread,
      inventory,
      pnl: Math.random() * 1000 - 500,
    };
  }

  backtestStrategy(strategy: string, data: Record<string, number[]>, period: { start: number; end: number }): { strategy: string; period: { start: number; end: number }; pnl: number; sharpe: number; maxDrawdown: number; winRate: number } {
    const pnl = (Math.random() - 0.3) * 100000;
    return {
      strategy,
      period,
      pnl,
      sharpe: Math.random() * 3 + 0.5,
      maxDrawdown: Math.random() * 0.3 + 0.05,
      winRate: Math.random() * 0.4 + 0.4,
    };
  }

  get orderCount(): number {
    return this._orders.size;
  }

  get tradeCount(): number {
    return this._trades.size;
  }

  get strategyCount(): number {
    return this._strategies.size;
  }

  get stats(): { totalOrders: number; filledOrders: number; totalVolume: number; avgSpread: number; pnl: number } {
    return { ...this._stats };
  }

  public toPacket(): DataPacket<{
    orders: number;
    trades: number;
    orderBooks: number;
    strategies: number;
    stats: { totalOrders: number; filledOrders: number; totalVolume: number; avgSpread: number; pnl: number };
  }> {
    return {
      id: `trading-${Date.now()}-${this._counter}`,
      payload: {
        orders: this._orders.size,
        trades: this._trades.size,
        orderBooks: this._orderBooks.size,
        strategies: this._strategies.size,
        stats: { ...this._stats },
      },
      metadata: {
        createdAt: Date.now(),
        route: ['fintech', 'trading_engine', 'result'],
        priority: 0.9,
        phase: 'trading',
      },
    };
  }

  public reset(): void {
    this._orders.clear();
    this._trades.clear();
    this._orderBooks.clear();
    this._strategies.clear();
    this._counter = 0;
    this._stats = {
      totalOrders: 0,
      filledOrders: 0,
      totalVolume: 0,
      avgSpread: 0,
      pnl: 0,
    };
  }
}

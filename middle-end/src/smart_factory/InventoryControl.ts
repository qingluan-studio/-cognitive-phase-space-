import { DataPacket } from '../shared/types';

export interface Inventory {
  items: string[];
  locations: string[];
  value: number;
  turnover: number;
}

export interface StockItem {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  location: string;
  unitCost: number;
}

interface StockCountResult {
  item: string;
  systemQty: number;
  physicalQty: number;
  variance: number;
  variancePercent: number;
}

export class InventoryControl {
  private _inventories: Map<string, Inventory> = new Map();
  private _items: Map<string, StockItem> = new Map();
  private _locations: Map<string, string[]> = new Map();
  private _transactions: Map<string, { type: string; qty: number; timestamp: number }[]> = new Map();
  private _counter = 0;
  private _stats = {
    totalItems: 0,
    totalValue: 0,
    turnoverRate: 0,
    fillRate: 0,
    accuracy: 0,
  };

  stockCount(items: string[], method: string): { counted: number; method: string; variances: StockCountResult[]; accuracy: number } {
    const variances: StockCountResult[] = [];
    for (const item of items) {
      const systemQty = Math.floor(Math.random() * 100 + 10);
      const physicalQty = systemQty + Math.floor((Math.random() - 0.5) * systemQty * 0.1);
      const variance = physicalQty - systemQty;
      variances.push({
        item,
        systemQty,
        physicalQty,
        variance,
        variancePercent: (variance / systemQty) * 100,
      });
    }
    const accuracy = 1 - variances.filter(v => v.variance !== 0).length / items.length;
    this._stats.accuracy = accuracy;
    return { counted: items.length, method, variances, accuracy };
  }

  cycleCount(items: string[], schedule: string, frequency: string): { items: number; schedule: string; frequency: string; completed: number; accuracy: number } {
    return {
      items: items.length,
      schedule,
      frequency,
      completed: Math.floor(items.length * 0.7),
      accuracy: Math.random() * 0.05 + 0.95,
    };
  }

  reorderPoint(item: string, demand: number, leadTime: number): { item: string; reorderPoint: number; safetyStock: number; orderQuantity: number } {
    const safetyStock = demand * leadTime * 0.2;
    const rop = demand * leadTime + safetyStock;
    return {
      item,
      reorderPoint: rop,
      safetyStock,
      orderQuantity: demand * leadTime * 2,
    };
  }

  safetyStock(item: string, demandVariability: number, serviceLevel: number): { item: string; safetyStock: number; serviceLevel: number; zScore: number } {
    const z = serviceLevel === 0.95 ? 1.645 : serviceLevel === 0.99 ? 2.326 : 1.28;
    return {
      item,
      safetyStock: z * demandVariability,
      serviceLevel,
      zScore: z,
    };
  }

  eoqItem(item: string, demand: number, orderCost: number, holdingCost: number): { item: string; eoq: number; annualOrders: number; totalCost: number } {
    const eoq = Math.sqrt((2 * demand * orderCost) / holdingCost);
    return {
      item,
      eoq,
      annualOrders: demand / eoq,
      totalCost: Math.sqrt(2 * demand * orderCost * holdingCost),
    };
  }

  abcAnalysis(items: string[], value: number[], classes: string[]): { classes: Record<string, { items: string[]; value: number; percent: number }>; classification: Record<string, string> } {
    const result: Record<string, { items: string[]; value: number; percent: number }> = {
      A: { items: [], value: 0, percent: 0.7 },
      B: { items: [], value: 0, percent: 0.2 },
      C: { items: [], value: 0, percent: 0.1 },
    };
    const classification: Record<string, string> = {};
    for (let i = 0; i < items.length; i++) {
      const cls = i < items.length * 0.2 ? 'A' : i < items.length * 0.5 ? 'B' : 'C';
      result[cls].items.push(items[i]);
      result[cls].value += value[i] || 0;
      classification[items[i]] = cls;
    }
    return { classes: result, classification };
  }

  fsnAnalysis(items: string[], movement: number[], classification: string[]): { classification: Record<string, string>; fast: string[]; slow: string[]; nonMoving: string[] } {
    const fast: string[] = [];
    const slow: string[] = [];
    const nonMoving: string[] = [];
    const classMap: Record<string, string> = {};
    for (let i = 0; i < items.length; i++) {
      const m = movement[i] || 0;
      let cls = 'N';
      if (m > 0.7) { cls = 'F'; fast.push(items[i]); }
      else if (m > 0.3) { cls = 'S'; slow.push(items[i]); }
      else { nonMoving.push(items[i]); }
      classMap[items[i]] = cls;
    }
    return { classification: classMap, fast, slow, nonMoving };
  }

  vedAnalysis(items: string[], criticality: number[], classification: string[]): { classification: Record<string, string>; vital: string[]; essential: string[]; desirable: string[] } {
    const vital: string[] = [];
    const essential: string[] = [];
    const desirable: string[] = [];
    const classMap: Record<string, string> = {};
    for (let i = 0; i < items.length; i++) {
      const c = criticality[i] || 0;
      let cls = 'D';
      if (c > 0.8) { cls = 'V'; vital.push(items[i]); }
      else if (c > 0.5) { cls = 'E'; essential.push(items[i]); }
      else { desirable.push(items[i]); }
      classMap[items[i]] = cls;
    }
    return { classification: classMap, vital, essential, desirable };
  }

  justInTime(inventory: string, schedule: string[], suppliers: string[]): { inventory: string; schedule: string[]; suppliers: string[]; reductionPercent: number } {
    return {
      inventory,
      schedule,
      suppliers,
      reductionPercent: Math.random() * 30 + 20,
    };
  }

  kanbanSystem(bins: string[], triggers: string[], replenishment: string): { bins: number; activeCards: number; replenishmentLeadTime: number; stockoutRisk: number } {
    return {
      bins: bins.length,
      activeCards: Math.floor(bins.length * 0.6),
      replenishmentLeadTime: Math.random() * 5 + 1,
      stockoutRisk: Math.random() * 0.05,
    };
  }

  batchTracking(batches: string[], properties: Record<string, string>, genealogy: string[]): { batches: number; properties: Record<string, string>; genealogy: string[]; traceable: boolean } {
    return {
      batches: batches.length,
      properties,
      genealogy,
      traceable: true,
    };
  }

  serialTracking(items: string[], serials: string[], transactions: string[]): { items: number; serials: string[]; transactions: number; traceable: boolean } {
    return {
      items: items.length,
      serials,
      transactions: transactions.length,
      traceable: true,
    };
  }

  warehouseManagement(items: string[], locations: string[], operations: string[]): { items: number; locations: number; operations: number; efficiency: number; utilization: number } {
    return {
      items: items.length,
      locations: locations.length,
      operations: operations.length,
      efficiency: Math.random() * 0.2 + 0.8,
      utilization: Math.random() * 0.3 + 0.6,
    };
  }

  get itemCount(): number {
    return this._items.size;
  }

  get locationCount(): number {
    return this._locations.size;
  }

  get transactionCount(): number {
    let total = 0;
    for (const tx of this._transactions.values()) {
      total += tx.length;
    }
    return total;
  }

  get stats(): { totalItems: number; totalValue: number; turnoverRate: number; fillRate: number; accuracy: number } {
    return { ...this._stats };
  }

  public toPacket(): DataPacket<{
    items: number;
    locations: number;
    transactions: number;
    stats: { totalItems: number; totalValue: number; turnoverRate: number; fillRate: number; accuracy: number };
  }> {
    return {
      id: `inventory-${Date.now()}-${this._counter}`,
      payload: {
        items: this._items.size,
        locations: this._locations.size,
        transactions: this.transactionCount,
        stats: { ...this._stats },
      },
      metadata: {
        createdAt: Date.now(),
        route: ['smart_factory', 'inventory_control', 'result'],
        priority: 0.7,
        phase: 'inventory',
      },
    };
  }

  public reset(): void {
    this._inventories.clear();
    this._items.clear();
    this._locations.clear();
    this._transactions.clear();
    this._counter = 0;
    this._stats = {
      totalItems: 0,
      totalValue: 0,
      turnoverRate: 0,
      fillRate: 0,
      accuracy: 0,
    };
  }
}

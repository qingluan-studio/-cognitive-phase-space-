import { DataPacket } from '../shared/types';

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseItem[];
  status: 'draft' | 'approved' | 'sent' | 'confirmed' | 'partial' | 'received' | 'cancelled';
  totalAmount: number;
  currency: string;
  orderDate: number;
  expectedDeliveryDate: number;
  actualDeliveryDate?: number;
  paymentTerms: string;
  buyer: string;
}

export interface PurchaseItem {
  itemId: string;
  itemName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  unit: string;
  receivedQuantity: number;
  status: 'pending' | 'partial' | 'received' | 'rejected';
}

export interface Supplier {
  id: string;
  name: string;
  category: string;
  address: string;
  contact: string;
  phone: string;
  email: string;
  rating: number;
  status: 'active' | 'inactive' | 'suspended';
  certification: string[];
  totalOrders: number;
  totalSpend: number;
  onTimeDeliveryRate: number;
  qualityScore: number;
  paymentTerms: string;
  leadTime: number;
}

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  description: string;
  unit: string;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  reorderPoint: number;
  safetyStock: number;
  leadTime: number;
  unitCost: number;
  totalValue: number;
  location: string;
  lastUpdated: number;
}

export interface Shipment {
  id: string;
  type: 'inbound' | 'outbound' | 'internal';
  orderId?: string;
  supplierId?: string;
  customerId?: string;
  status: 'created' | 'picking' | 'packed' | 'shipped' | 'in_transit' | 'delivered' | 'returned';
  items: ShipmentItem[];
  origin: string;
  destination: string;
  carrier: string;
  trackingNumber: string;
  estimatedArrival: number;
  actualArrival?: number;
  weight: number;
  volume: number;
  cost: number;
}

export interface ShipmentItem {
  itemId: string;
  itemName: string;
  quantity: number;
  unit: string;
  batchNumber?: string;
  serialNumbers?: string[];
}

export interface LogisticsTracking {
  shipmentId: string;
  trackingNumber: string;
  status: string;
  currentLocation: string;
  estimatedDelivery: number;
  checkpoints: LogisticsCheckpoint[];
  delayHours: number;
  delayReason?: string;
}

export interface LogisticsCheckpoint {
  timestamp: number;
  location: string;
  status: string;
  description: string;
}

export interface DemandForecast {
  productId: string;
  productName: string;
  period: 'monthly' | 'quarterly' | 'yearly';
  historicalData: number[];
  forecastData: number[];
  confidenceLower: number[];
  confidenceUpper: number[];
  method: string;
  accuracy: number;
  trend: string;
  seasonality: number;
}

export interface SafetyStockCalculation {
  itemId: string;
  itemName: string;
  serviceLevel: number;
  demandStdDev: number;
  leadTimeStdDev: number;
  avgDemand: number;
  avgLeadTime: number;
  safetyStock: number;
  reorderPoint: number;
  zScore: number;
}

export class SupplyChain {
  private _purchaseOrders: Map<string, PurchaseOrder> = new Map();
  private _suppliers: Map<string, Supplier> = new Map();
  private _inventory: Map<string, InventoryItem> = new Map();
  private _shipments: Map<string, Shipment> = new Map();
  private _logistics: Map<string, LogisticsTracking> = new Map();
  private _demandForecasts: Map<string, DemandForecast> = new Map();
  private _safetyStocks: Map<string, SafetyStockCalculation> = new Map();
  private _categories: Map<string, { id: string; name: string; items: string[] }> = new Map();
  private _counter = 0;
  private _stats = {
    totalPurchaseOrders: 0,
    openPurchaseOrders: 0,
    totalSuppliers: 0,
    activeSuppliers: 0,
    totalInventoryItems: 0,
    totalInventoryValue: 0,
    totalShipments: 0,
    inTransitShipments: 0,
  };

  constructor() {
    this._initializeDefaultSuppliers();
    this._initializeDefaultInventory();
  }

  private _initializeDefaultSuppliers(): void {
    const suppliers = [
      { id: 'sup-001', name: '华东金属材料有限公司', category: '原材料', rating: 4.5, otd: 0.92, quality: 4.7, leadTime: 7 },
      { id: 'sup-002', name: '精密电子元器件厂', category: '电子元件', rating: 4.8, otd: 0.96, quality: 4.9, leadTime: 10 },
      { id: 'sup-003', name: '标准件制造有限公司', category: '紧固件', rating: 4.2, otd: 0.88, quality: 4.3, leadTime: 5 },
      { id: 'sup-004', name: '塑料化工科技', category: '塑料件', rating: 4.0, otd: 0.85, quality: 4.1, leadTime: 14 },
      { id: 'sup-005', name: '包装材料供应', category: '包装材料', rating: 4.3, otd: 0.90, quality: 4.5, leadTime: 3 },
    ];

    for (const s of suppliers) {
      const supplier: Supplier = {
        id: s.id,
        name: s.name,
        category: s.category,
        address: '地址信息',
        contact: '联系人',
        phone: '13800138000',
        email: 'contact@supplier.com',
        rating: s.rating,
        status: 'active',
        certification: ['ISO 9001'],
        totalOrders: Math.floor(Math.random() * 100 + 20),
        totalSpend: Math.random() * 1000000 + 100000,
        onTimeDeliveryRate: s.otd,
        qualityScore: s.quality,
        paymentTerms: 'Net 30',
        leadTime: s.leadTime,
      };
      this._suppliers.set(s.id, supplier);
      this._stats.totalSuppliers++;
      this._stats.activeSuppliers++;
    }
  }

  private _initializeDefaultInventory(): void {
    const items = [
      { id: 'inv-001', sku: 'MAT-STEEL-001', name: '钢板 Q235 5mm', category: '原材料', unit: 'sheet', qty: 500, rop: 100, ss: 50, cost: 120, loc: 'A-01-01' },
      { id: 'inv-002', sku: 'MAT-ALU-001', name: '铝板 6061 T6', category: '原材料', unit: 'sheet', qty: 300, rop: 80, ss: 40, cost: 280, loc: 'A-01-02' },
      { id: 'inv-003', sku: 'ELC-RES-001', name: '电阻 10kΩ', category: '电子元件', unit: 'pcs', qty: 50000, rop: 10000, ss: 5000, cost: 0.05, loc: 'B-02-01' },
      { id: 'inv-004', sku: 'ELC-CAP-001', name: '电容 100uF', category: '电子元件', unit: 'pcs', qty: 30000, rop: 8000, ss: 4000, cost: 0.12, loc: 'B-02-02' },
      { id: 'inv-005', sku: 'FST-M6x20', name: '螺栓 M6x20', category: '紧固件', unit: 'pcs', qty: 20000, rop: 5000, ss: 2000, cost: 0.15, loc: 'C-01-01' },
      { id: 'inv-006', sku: 'PKG-BOX-001', name: '外包装箱 L', category: '包装材料', unit: 'pcs', qty: 2000, rop: 500, ss: 200, cost: 5.5, loc: 'D-01-01' },
      { id: 'inv-007', sku: 'FG-PROD-A', name: '产品A 成品', category: '成品', unit: 'pcs', qty: 1500, rop: 300, ss: 150, cost: 250, loc: 'E-01-01' },
      { id: 'inv-008', sku: 'WIP-PART-01', name: '在制品组件1', category: '在制品', unit: 'pcs', qty: 800, rop: 200, ss: 100, cost: 85, loc: 'F-01-01' },
    ];

    for (const item of items) {
      const invItem: InventoryItem = {
        id: item.id,
        sku: item.sku,
        name: item.name,
        category: item.category,
        description: `${item.name} 库存`,
        unit: item.unit,
        quantity: item.qty,
        reservedQuantity: Math.floor(item.qty * 0.1),
        availableQuantity: Math.floor(item.qty * 0.9),
        reorderPoint: item.rop,
        safetyStock: item.ss,
        leadTime: 7,
        unitCost: item.cost,
        totalValue: item.qty * item.cost,
        location: item.loc,
        lastUpdated: Date.now(),
      };
      this._inventory.set(item.id, invItem);
      this._stats.totalInventoryItems++;
      this._stats.totalInventoryValue += invItem.totalValue;
    }
  }

  createPurchaseOrder(
    supplierId: string,
    items: { itemId: string; itemName: string; quantity: number; unitPrice: number; unit: string }[],
    expectedDeliveryDate: number,
    buyer: string,
    paymentTerms: string = 'Net 30'
  ): PurchaseOrder {
    const id = `po-${Date.now()}-${this._counter++}`;
    const supplier = this._suppliers.get(supplierId);

    const purchaseItems: PurchaseItem[] = items.map(item => ({
      itemId: item.itemId,
      itemName: item.itemName,
      description: item.itemName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.quantity * item.unitPrice,
      unit: item.unit,
      receivedQuantity: 0,
      status: 'pending',
    }));

    const totalAmount = purchaseItems.reduce((s, i) => s + i.totalPrice, 0);

    const po: PurchaseOrder = {
      id,
      supplierId,
      supplierName: supplier?.name || 'Unknown Supplier',
      items: purchaseItems,
      status: 'draft',
      totalAmount,
      currency: 'CNY',
      orderDate: Date.now(),
      expectedDeliveryDate,
      paymentTerms,
      buyer,
    };

    this._purchaseOrders.set(id, po);
    this._stats.totalPurchaseOrders++;
    this._stats.openPurchaseOrders++;

    return po;
  }

  approvePurchaseOrder(orderId: string): PurchaseOrder | null {
    const po = this._purchaseOrders.get(orderId);
    if (!po || po.status !== 'draft') return null;
    po.status = 'approved';
    return po;
  }

  sendPurchaseOrder(orderId: string): PurchaseOrder | null {
    const po = this._purchaseOrders.get(orderId);
    if (!po || po.status !== 'approved') return null;
    po.status = 'sent';
    return po;
  }

  receivePurchaseOrder(orderId: string, itemReceipts: { itemId: string; quantity: number }[]): PurchaseOrder | null {
    const po = this._purchaseOrders.get(orderId);
    if (!po || (po.status !== 'sent' && po.status !== 'confirmed' && po.status !== 'partial')) return null;

    let allReceived = true;

    for (const receipt of itemReceipts) {
      const item = po.items.find(i => i.itemId === receipt.itemId);
      if (item) {
        item.receivedQuantity += receipt.quantity;
        if (item.receivedQuantity >= item.quantity) {
          item.status = 'received';
        } else if (item.receivedQuantity > 0) {
          item.status = 'partial';
          allReceived = false;
        }

        const invItem = Array.from(this._inventory.values()).find(inv => inv.sku === receipt.itemId || inv.id === receipt.itemId);
        if (invItem) {
          invItem.quantity += receipt.quantity;
          invItem.availableQuantity += receipt.quantity;
          invItem.totalValue = invItem.quantity * invItem.unitCost;
          invItem.lastUpdated = Date.now();
          this._stats.totalInventoryValue += receipt.quantity * invItem.unitCost;
        }
      }
    }

    if (allReceived && po.items.every(i => i.status === 'received')) {
      po.status = 'received';
      po.actualDeliveryDate = Date.now();
      this._stats.openPurchaseOrders--;
    } else {
      po.status = 'partial';
    }

    return po;
  }

  addSupplier(
    name: string,
    category: string,
    contact: string,
    phone: string,
    email: string,
    address: string,
    paymentTerms: string = 'Net 30',
    leadTime: number = 7
  ): Supplier {
    const id = `sup-${Date.now()}-${this._counter++}`;
    const supplier: Supplier = {
      id,
      name,
      category,
      address,
      contact,
      phone,
      email,
      rating: 0,
      status: 'active',
      certification: [],
      totalOrders: 0,
      totalSpend: 0,
      onTimeDeliveryRate: 0,
      qualityScore: 0,
      paymentTerms,
      leadTime,
    };
    this._suppliers.set(id, supplier);
    this._stats.totalSuppliers++;
    this._stats.activeSuppliers++;
    return supplier;
  }

  supplierEvaluation(
    supplierId: string,
    criteria: { quality: number; delivery: number; cost: number; service: number; technology: number }
  ): {
    supplierId: string;
    overallScore: number;
    rating: string;
    criteria: { quality: number; delivery: number; cost: number; service: number; technology: number };
    strengths: string[];
    weaknesses: string[];
  } | null {
    const supplier = this._suppliers.get(supplierId);
    if (!supplier) return null;

    const weights = { quality: 0.3, delivery: 0.25, cost: 0.2, service: 0.15, technology: 0.1 };
    const overallScore =
      criteria.quality * weights.quality +
      criteria.delivery * weights.delivery +
      criteria.cost * weights.cost +
      criteria.service * weights.service +
      criteria.technology * weights.technology;

    let rating = 'C';
    if (overallScore >= 90) rating = 'A+';
    else if (overallScore >= 80) rating = 'A';
    else if (overallScore >= 70) rating = 'B';
    else if (overallScore >= 60) rating = 'C';
    else rating = 'D';

    supplier.rating = overallScore / 20;
    supplier.onTimeDeliveryRate = criteria.delivery / 100;
    supplier.qualityScore = criteria.quality;

    const strengths: string[] = [];
    const weaknesses: string[] = [];

    if (criteria.quality >= 85) strengths.push('质量优秀');
    else if (criteria.quality < 65) weaknesses.push('质量需改进');

    if (criteria.delivery >= 85) strengths.push('交付准时');
    else if (criteria.delivery < 65) weaknesses.push('交付延迟');

    if (criteria.cost >= 80) strengths.push('成本竞争力强');
    else if (criteria.cost < 60) weaknesses.push('成本偏高');

    return { supplierId, overallScore, rating, criteria, strengths, weaknesses };
  }

  supplierPerformance(period: 'month' | 'quarter' | 'year'): {
    suppliers: Record<string, {
      onTimeDeliveryRate: number;
      qualityScore: number;
      costPerformance: number;
      overallScore: number;
      orderCount: number;
    }>;
    ranking: string[];
    avgScore: number;
    topPerformer: string;
  } {
    const result: Record<string, {
      onTimeDeliveryRate: number;
      qualityScore: number;
      costPerformance: number;
      overallScore: number;
      orderCount: number;
    }> = {};

    for (const [id, supplier] of this._suppliers) {
      const otd = 0.7 + Math.random() * 0.28;
      const quality = 70 + Math.random() * 28;
      const cost = 65 + Math.random() * 30;
      const overall = (otd * 100 * 0.3 + quality * 0.35 + cost * 0.35);

      result[id] = {
        onTimeDeliveryRate: otd,
        qualityScore: quality,
        costPerformance: cost,
        overallScore: overall,
        orderCount: supplier.totalOrders,
      };
    }

    const ranking = Object.entries(result)
      .sort((a, b) => b[1].overallScore - a[1].overallScore)
      .map(([id]) => id);

    const totalScore = Object.values(result).reduce((s, v) => s + v.overallScore, 0);
    const avgScore = Object.keys(result).length > 0 ? totalScore / Object.keys(result).length : 0;

    return {
      suppliers: result,
      ranking,
      avgScore,
      topPerformer: ranking[0] || '',
    };
  }

  inventoryQuery(category?: string, keyword?: string): {
    items: InventoryItem[];
    total: number;
    totalValue: number;
    lowStockItems: string[];
    outOfStockItems: string[];
    overstockItems: string[];
  } {
    let items = Array.from(this._inventory.values());

    if (category) {
      items = items.filter(i => i.category === category);
    }

    if (keyword) {
      const kw = keyword.toLowerCase();
      items = items.filter(i =>
        i.name.toLowerCase().includes(kw) ||
        i.sku.toLowerCase().includes(kw) ||
        i.description.toLowerCase().includes(kw)
      );
    }

    const lowStock = items.filter(i => i.availableQuantity <= i.reorderPoint).map(i => i.id);
    const outOfStock = items.filter(i => i.availableQuantity === 0).map(i => i.id);
    const overstock = items.filter(i => i.quantity > i.reorderPoint * 3).map(i => i.id);
    const totalValue = items.reduce((s, i) => s + i.totalValue, 0);

    return {
      items,
      total: items.length,
      totalValue,
      lowStockItems: lowStock,
      outOfStockItems: outOfStock,
      overstockItems: overstock,
    };
  }

  stockIn(itemId: string, quantity: number, unitCost?: number): InventoryItem | null {
    const item = this._inventory.get(itemId);
    if (!item) return null;

    item.quantity += quantity;
    item.availableQuantity += quantity;
    if (unitCost) {
      const totalCost = item.totalValue + quantity * unitCost;
      const totalQty = item.quantity;
      item.unitCost = totalCost / totalQty;
    }
    item.totalValue = item.quantity * item.unitCost;
    item.lastUpdated = Date.now();
    this._stats.totalInventoryValue = Array.from(this._inventory.values()).reduce((s, i) => s + i.totalValue, 0);

    return item;
  }

  stockOut(itemId: string, quantity: number): InventoryItem | null {
    const item = this._inventory.get(itemId);
    if (!item || item.availableQuantity < quantity) return null;

    item.quantity -= quantity;
    item.availableQuantity -= quantity;
    item.totalValue = item.quantity * item.unitCost;
    item.lastUpdated = Date.now();
    this._stats.totalInventoryValue = Array.from(this._inventory.values()).reduce((s, i) => s + i.totalValue, 0);

    return item;
  }

  abcAnalysis(): {
    classA: InventoryItem[];
    classB: InventoryItem[];
    classC: InventoryItem[];
    classAValue: number;
    classBValue: number;
    classCValue: number;
    totalValue: number;
  } {
    const items = Array.from(this._inventory.values()).sort((a, b) => b.totalValue - a.totalValue);
    const totalValue = items.reduce((s, i) => s + i.totalValue, 0);

    let cumulative = 0;
    const classA: InventoryItem[] = [];
    const classB: InventoryItem[] = [];
    const classC: InventoryItem[] = [];

    for (const item of items) {
      cumulative += item.totalValue;
      const percentage = cumulative / totalValue;
      if (percentage <= 0.8) {
        classA.push(item);
      } else if (percentage <= 0.95) {
        classB.push(item);
      } else {
        classC.push(item);
      }
    }

    return {
      classA,
      classB,
      classC,
      classAValue: classA.reduce((s, i) => s + i.totalValue, 0),
      classBValue: classB.reduce((s, i) => s + i.totalValue, 0),
      classCValue: classC.reduce((s, i) => s + i.totalValue, 0),
      totalValue,
    };
  }

  createShipment(
    type: Shipment['type'],
    items: ShipmentItem[],
    origin: string,
    destination: string,
    carrier: string,
    orderId?: string,
    supplierId?: string,
    customerId?: string
  ): Shipment {
    const id = `ship-${Date.now()}-${this._counter++}`;
    const trackingNumber = `${carrier.slice(0, 3).toUpperCase()}${Date.now().toString().slice(-10)}`;
    const weight = items.reduce((s, i) => s + i.quantity * 0.5, 0);
    const volume = items.reduce((s, i) => s + i.quantity * 0.001, 0);
    const cost = weight * 5 + volume * 100 + 50;

    const shipment: Shipment = {
      id,
      type,
      orderId,
      supplierId,
      customerId,
      status: 'created',
      items,
      origin,
      destination,
      carrier,
      trackingNumber,
      estimatedArrival: Date.now() + 3 * 24 * 3600000,
      weight,
      volume,
      cost,
    };

    this._shipments.set(id, shipment);
    this._stats.totalShipments++;

    return shipment;
  }

  updateShipmentStatus(shipmentId: string, status: Shipment['status'], location?: string): Shipment | null {
    const shipment = this._shipments.get(shipmentId);
    if (!shipment) return null;

    shipment.status = status;
    if (status === 'delivered') {
      shipment.actualArrival = Date.now();
    }

    let logistics = this._logistics.get(shipmentId);
    if (!logistics) {
      logistics = {
        shipmentId,
        trackingNumber: shipment.trackingNumber,
        status: status.toString(),
        currentLocation: location || shipment.origin,
        estimatedDelivery: shipment.estimatedArrival,
        checkpoints: [],
        delayHours: 0,
      };
      this._logistics.set(shipmentId, logistics);
    }

    logistics.status = status.toString();
    if (location) logistics.currentLocation = location;
    logistics.checkpoints.push({
      timestamp: Date.now(),
      location: location || logistics.currentLocation,
      status: status.toString(),
      description: `状态更新为: ${status}`,
    });

    if (status === 'in_transit') {
      this._stats.inTransitShipments++;
    } else if (status === 'delivered' || status === 'returned') {
      this._stats.inTransitShipments--;
    }

    return shipment;
  }

  trackShipment(trackingNumber: string): LogisticsTracking | null {
    const shipment = Array.from(this._shipments.values()).find(s => s.trackingNumber === trackingNumber);
    if (!shipment) return null;

    let logistics = this._logistics.get(shipment.id);
    if (!logistics) {
      logistics = {
        shipmentId: shipment.id,
        trackingNumber,
        status: shipment.status.toString(),
        currentLocation: shipment.origin,
        estimatedDelivery: shipment.estimatedArrival,
        checkpoints: [{
          timestamp: Date.now(),
          location: shipment.origin,
          status: shipment.status.toString(),
          description: '发货地扫描',
        }],
        delayHours: 0,
      };
      this._logistics.set(shipment.id, logistics);
    }

    return logistics;
  }

  demandForecasting(
    productId: string,
    productName: string,
    historicalData: number[],
    method: string = 'exponential_smoothing',
    periods: number = 12
  ): DemandForecast {
    const alpha = 0.3;
    const forecastData: number[] = [];
    const confidenceLower: number[] = [];
    const confidenceUpper: number[] = [];

    let lastForecast = historicalData[0] || 100;
    for (const actual of historicalData) {
      lastForecast = alpha * actual + (1 - alpha) * lastForecast;
    }

    const stdDev = this._calculateStdDev(historicalData);
    let trend = 0;
    if (historicalData.length >= 2) {
      trend = (historicalData[historicalData.length - 1] - historicalData[0]) / historicalData.length;
    }

    for (let i = 0; i < periods; i++) {
      const forecast = lastForecast + trend * (i + 1);
      forecastData.push(Math.max(0, forecast));
      const margin = 1.96 * stdDev * Math.sqrt(i + 1);
      confidenceLower.push(Math.max(0, forecast - margin));
      confidenceUpper.push(forecast + margin);
    }

    const accuracy = 0.75 + Math.random() * 0.2;
    const trendDirection = trend > 0 ? '增长' : trend < 0 ? '下降' : '稳定';
    const seasonality = 0.1 + Math.random() * 0.3;

    const forecast: DemandForecast = {
      productId,
      productName,
      period: 'monthly',
      historicalData,
      forecastData,
      confidenceLower,
      confidenceUpper,
      method,
      accuracy,
      trend: trendDirection,
      seasonality,
    };

    this._demandForecasts.set(productId, forecast);
    return forecast;
  }

  private _calculateStdDev(data: number[]): number {
    if (data.length < 2) return 0;
    const mean = data.reduce((s, v) => s + v, 0) / data.length;
    const squaredDiffs = data.map(v => Math.pow(v - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((s, v) => s + v, 0) / (data.length - 1);
    return Math.sqrt(avgSquaredDiff);
  }

  safetyStockCalculation(
    itemId: string,
    itemName: string,
    avgDemand: number,
    demandStdDev: number,
    avgLeadTime: number,
    leadTimeStdDev: number,
    serviceLevel: number = 0.95
  ): SafetyStockCalculation {
    const zScore = this._zScore(serviceLevel);
    const safetyStock = zScore * Math.sqrt(
      avgLeadTime * Math.pow(demandStdDev, 2) +
      Math.pow(avgDemand, 2) * Math.pow(leadTimeStdDev, 2)
    );
    const reorderPoint = avgDemand * avgLeadTime + safetyStock;

    const result: SafetyStockCalculation = {
      itemId,
      itemName,
      serviceLevel,
      demandStdDev,
      leadTimeStdDev,
      avgDemand,
      avgLeadTime,
      safetyStock: Math.ceil(safetyStock),
      reorderPoint: Math.ceil(reorderPoint),
      zScore,
    };

    this._safetyStocks.set(itemId, result);

    const invItem = this._inventory.get(itemId);
    if (invItem) {
      invItem.safetyStock = Math.ceil(safetyStock);
      invItem.reorderPoint = Math.ceil(reorderPoint);
      invItem.leadTime = avgLeadTime;
    }

    return result;
  }

  private _zScore(p: number): number {
    if (p <= 0.5) return 0;
    const a = [
      -3.969683028665376e+01, 2.209460984245205e+02,
      -2.759285104469687e+02, 1.383577518672690e+02,
      -3.066479806614716e+01, 2.506628277459239e+00,
    ];
    const b = [
      -5.447609879822406e+01, 1.615858368580409e+02,
      -1.556989798598866e+02, 6.680131188771972e+01,
      -1.328068155288572e+01,
    ];
    const q = Math.min(p, 1 - p);
    const r = Math.sqrt(-2 * Math.log(q));
    const num = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]);
    const den = ((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1;
    let z = r - num / den;
    if (p < 0.5) z = -z;
    return z;
  }

  inventoryTurnover(period: 'month' | 'quarter' | 'year'): {
    overallTurnover: number;
    byCategory: Record<string, number>;
    daysInventoryOutstanding: number;
    bestTurnoverCategory: string;
    worstTurnoverCategory: string;
  } {
    const byCategory: Record<string, number> = {};
    const categories = new Set(Array.from(this._inventory.values()).map(i => i.category));

    for (const cat of categories) {
      byCategory[cat] = 2 + Math.random() * 8;
    }

    const values = Object.values(byCategory);
    const overall = values.length > 0 ? values.reduce((s, v) => s + v, 0) / values.length : 0;
    const dio = overall > 0 ? 365 / overall : 0;

    const sorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);

    return {
      overallTurnover: overall,
      byCategory,
      daysInventoryOutstanding: dio,
      bestTurnoverCategory: sorted[0]?.[0] || '',
      worstTurnoverCategory: sorted[sorted.length - 1]?.[0] || '',
    };
  }

  get purchaseOrderCount(): number {
    return this._purchaseOrders.size;
  }

  get supplierCount(): number {
    return this._suppliers.size;
  }

  get inventoryItemCount(): number {
    return this._inventory.size;
  }

  get shipmentCount(): number {
    return this._shipments.size;
  }

  get forecastCount(): number {
    return this._demandForecasts.size;
  }

  get stats(): {
    totalPurchaseOrders: number;
    openPurchaseOrders: number;
    totalSuppliers: number;
    activeSuppliers: number;
    totalInventoryItems: number;
    totalInventoryValue: number;
    totalShipments: number;
    inTransitShipments: number;
  } {
    return { ...this._stats };
  }

  getPurchaseOrder(id: string): PurchaseOrder | undefined {
    return this._purchaseOrders.get(id);
  }

  getSupplier(id: string): Supplier | undefined {
    return this._suppliers.get(id);
  }

  getInventoryItem(id: string): InventoryItem | undefined {
    return this._inventory.get(id);
  }

  getShipment(id: string): Shipment | undefined {
    return this._shipments.get(id);
  }

  getLogistics(id: string): LogisticsTracking | undefined {
    return this._logistics.get(id);
  }

  toPacket(): DataPacket<{
    purchaseOrders: number;
    suppliers: number;
    inventoryItems: number;
    shipments: number;
    logisticsTrackings: number;
    demandForecasts: number;
    safetyStocks: number;
    stats: {
      totalPurchaseOrders: number;
      openPurchaseOrders: number;
      totalSuppliers: number;
      activeSuppliers: number;
      totalInventoryItems: number;
      totalInventoryValue: number;
      totalShipments: number;
      inTransitShipments: number;
    };
  }> {
    return {
      id: `supply-chain-${Date.now()}-${this._counter}`,
      payload: {
        purchaseOrders: this._purchaseOrders.size,
        suppliers: this._suppliers.size,
        inventoryItems: this._inventory.size,
        shipments: this._shipments.size,
        logisticsTrackings: this._logistics.size,
        demandForecasts: this._demandForecasts.size,
        safetyStocks: this._safetyStocks.size,
        stats: { ...this._stats },
      },
      metadata: {
        createdAt: Date.now(),
        route: ['smart_factory', 'supply_chain', 'result'],
        priority: 0.7,
        phase: 'supply_chain',
      },
    };
  }

  reset(): void {
    this._purchaseOrders.clear();
    this._suppliers.clear();
    this._inventory.clear();
    this._shipments.clear();
    this._logistics.clear();
    this._demandForecasts.clear();
    this._safetyStocks.clear();
    this._categories.clear();
    this._counter = 0;
    this._stats = {
      totalPurchaseOrders: 0,
      openPurchaseOrders: 0,
      totalSuppliers: 0,
      activeSuppliers: 0,
      totalInventoryItems: 0,
      totalInventoryValue: 0,
      totalShipments: 0,
      inTransitShipments: 0,
    };
    this._initializeDefaultSuppliers();
    this._initializeDefaultInventory();
  }
}

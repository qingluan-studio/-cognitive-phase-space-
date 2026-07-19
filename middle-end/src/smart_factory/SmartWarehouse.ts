import { DataPacket } from '../shared/types';

export interface Warehouse {
  id: string;
  name: string;
  type: string;
  location: string;
  area: number;
  capacity: number;
  usedCapacity: number;
  zones: string[];
  status: 'operational' | 'maintenance' | 'closed';
}

export interface StorageLocation {
  id: string;
  code: string;
  zone: string;
  aisle: string;
  rack: string;
  level: number;
  position: number;
  type: 'pallet' | 'bin' | 'bulk' | 'rack' | 'floor';
  capacity: number;
  usedCapacity: number;
  items: string[];
  status: 'available' | 'occupied' | 'reserved' | 'blocked';
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
  locations: { locationId: string; quantity: number; lotNumber?: string; serialNumber?: string }[];
  unitCost: number;
  totalValue: number;
  abcClass: 'A' | 'B' | 'C';
  lastUpdated: number;
  expiryDate?: number;
  batchNumber?: string;
}

export interface InboundOrder {
  id: string;
  type: 'purchase' | 'return' | 'transfer';
  status: 'created' | 'arrived' | 'receiving' | 'putaway' | 'completed' | 'cancelled';
  supplierId?: string;
  items: { itemId: string; itemName: string; expectedQuantity: number; receivedQuantity: number; unit: string }[];
  expectedDate: number;
  actualDate?: number;
  warehouse: string;
  dock?: string;
  receiver?: string;
}

export interface OutboundOrder {
  id: string;
  type: 'sales' | 'transfer' | 'return';
  status: 'created' | 'picking' | 'packed' | 'shipped' | 'completed' | 'cancelled';
  customerId?: string;
  items: { itemId: string; itemName: string; orderedQuantity: number; pickedQuantity: number; unit: string }[];
  orderDate: number;
  shippedDate?: number;
  warehouse: string;
  carrier?: string;
  trackingNumber?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
}

export interface AGV {
  id: string;
  name: string;
  type: string;
  status: 'idle' | 'moving' | 'loading' | 'unloading' | 'charging' | 'fault' | 'maintenance';
  currentLocation: string;
  targetLocation?: string;
  currentTask?: string;
  batteryLevel: number;
  totalTasks: number;
  completedTasks: number;
  totalDistance: number;
  lastMaintenance: number;
  firmwareVersion: string;
}

export interface AGVTask {
  id: string;
  agvId?: string;
  type: 'transport' | 'pickup' | 'delivery' | 'charging';
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  sourceLocation: string;
  targetLocation: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  items?: string[];
  createdTime: number;
  startTime?: number;
  endTime?: number;
  estimatedDuration: number;
}

export interface PickingStrategy {
  id: string;
  name: string;
  type: 'single_order' | 'batch' | 'wave' | 'zone' | 'cluster';
  efficiency: number;
  accuracy: number;
  avgPickTime: number;
  description: string;
}

export interface CycleCount {
  id: string;
  type: 'cycle_count' | 'full_inventory' | 'spot_check';
  status: 'scheduled' | 'in_progress' | 'completed' | 'reconciled';
  scheduledDate: number;
  startTime?: number;
  endTime?: number;
  items: {
    itemId: string;
    locationId: string;
    systemQuantity: number;
    countedQuantity: number;
    variance: number;
    variancePercent: number;
    status: 'matched' | 'over' | 'short' | 'pending';
  }[];
  counter: string;
  totalItems: number;
  countedItems: number;
  varianceCount: number;
  varianceValue: number;
}

export interface WarehouseKPI {
  date: number;
  warehouse: string;
  receiving: {
    totalReceipts: number;
    receivedItems: number;
    avgReceivingTime: number;
    putawayAccuracy: number;
  };
  shipping: {
    totalOrders: number;
    shippedItems: number;
    avgPickingTime: number;
    orderAccuracy: number;
    onTimeShipment: number;
  };
  inventory: {
    totalItems: number;
    totalValue: number;
    inventoryAccuracy: number;
    turnoverRate: number;
  };
  utilization: {
    spaceUtilization: number;
    laborUtilization: number;
    equipmentUtilization: number;
  };
}

export class SmartWarehouse {
  private _warehouses: Map<string, Warehouse> = new Map();
  private _storageLocations: Map<string, StorageLocation> = new Map();
  private _inventory: Map<string, InventoryItem> = new Map();
  private _inboundOrders: Map<string, InboundOrder> = new Map();
  private _outboundOrders: Map<string, OutboundOrder> = new Map();
  private _agvs: Map<string, AGV> = new Map();
  private _agvTasks: Map<string, AGVTask> = new Map();
  private _pickingStrategies: Map<string, PickingStrategy> = new Map();
  private _cycleCounts: Map<string, CycleCount> = new Map();
  private _kpis: Map<string, WarehouseKPI> = new Map();
  private _counter = 0;
  private _stats = {
    totalItems: 0,
    totalValue: 0,
    spaceUtilization: 0,
    orderAccuracy: 0,
    inventoryAccuracy: 0,
    agvUtilization: 0,
    totalInboundOrders: 0,
    totalOutboundOrders: 0,
  };

  constructor() {
    this._initializeWarehouse();
    this._initializeStorageLocations();
    this._initializeInventory();
    this._initializeAGVs();
    this._initializePickingStrategies();
  }

  private _initializeWarehouse(): void {
    const wh: Warehouse = {
      id: 'wh-001',
      name: '智能仓储中心',
      type: 'distribution',
      location: '厂区东',
      area: 10000,
      capacity: 50000,
      usedCapacity: 28000,
      zones: ['A-原材料区', 'B-半成品区', 'C-成品区', 'D-备件区', 'E-退货区'],
      status: 'operational',
    };
    this._warehouses.set(wh.id, wh);
    this._stats.spaceUtilization = wh.usedCapacity / wh.capacity;
  }

  private _initializeStorageLocations(): void {
    const zones = ['A', 'B', 'C', 'D', 'E'];
    let id = 1;

    for (const zone of zones) {
      for (let aisle = 1; aisle <= 5; aisle++) {
        for (let rack = 1; rack <= 10; rack++) {
          for (let level = 1; level <= 4; level++) {
            for (let pos = 1; pos <= 2; pos++) {
              const locId = `loc-${String(id).padStart(5, '0')}`;
              const code = `${zone}-${String(aisle).padStart(2, '0')}-${String(rack).padStart(2, '0')}-${level}-${pos}`;
              const loc: StorageLocation = {
                id: locId,
                code,
                zone,
                aisle: String(aisle),
                rack: String(rack),
                level,
                position: pos,
                type: zone === 'C' ? 'pallet' : 'bin',
                capacity: zone === 'C' ? 1 : 50,
                usedCapacity: 0,
                items: [],
                status: 'available',
              };
              this._storageLocations.set(locId, loc);
              id++;
            }
          }
        }
      }
    }
  }

  private _initializeInventory(): void {
    const items = [
      { id: 'inv-001', sku: 'MAT-STEEL-001', name: '钢板 Q235 5mm', cat: '原材料', unit: 'sheet', qty: 500, cost: 120, zone: 'A', abc: 'B' },
      { id: 'inv-002', sku: 'MAT-ALU-001', name: '铝板 6061 T6', cat: '原材料', unit: 'sheet', qty: 300, cost: 280, zone: 'A', abc: 'A' },
      { id: 'inv-003', sku: 'ELC-RES-001', name: '电阻 10kΩ', cat: '电子元件', unit: 'pcs', qty: 50000, cost: 0.05, zone: 'D', abc: 'C' },
      { id: 'inv-004', sku: 'ELC-CAP-001', name: '电容 100uF', cat: '电子元件', unit: 'pcs', qty: 30000, cost: 0.12, zone: 'D', abc: 'C' },
      { id: 'inv-005', sku: 'FST-M6x20', name: '螺栓 M6x20', cat: '紧固件', unit: 'pcs', qty: 20000, cost: 0.15, zone: 'D', abc: 'C' },
      { id: 'inv-006', sku: 'PKG-BOX-001', name: '外包装箱 L', cat: '包装材料', unit: 'pcs', qty: 2000, cost: 5.5, zone: 'D', abc: 'B' },
      { id: 'inv-007', sku: 'FG-PROD-A', name: '产品A 成品', cat: '成品', unit: 'pcs', qty: 1500, cost: 250, zone: 'C', abc: 'A' },
      { id: 'inv-008', sku: 'FG-PROD-B', name: '产品B 成品', cat: '成品', unit: 'pcs', qty: 800, cost: 380, zone: 'C', abc: 'A' },
      { id: 'inv-009', sku: 'WIP-PART-01', name: '在制品组件1', cat: '半成品', unit: 'pcs', qty: 800, cost: 85, zone: 'B', abc: 'B' },
      { id: 'inv-010', sku: 'WIP-PART-02', name: '在制品组件2', cat: '半成品', unit: 'pcs', qty: 600, cost: 120, zone: 'B', abc: 'B' },
    ];

    const locations = Array.from(this._storageLocations.values());
    let totalValue = 0;

    for (const item of items) {
      const zoneLocs = locations.filter(l => l.zone === item.zone && l.status === 'available');
      const loc = zoneLocs[Math.floor(Math.random() * zoneLocs.length)];

      const invItem: InventoryItem = {
        id: item.id,
        sku: item.sku,
        name: item.name,
        category: item.cat,
        description: item.name,
        unit: item.unit,
        quantity: item.qty,
        reservedQuantity: Math.floor(item.qty * 0.1),
        availableQuantity: Math.floor(item.qty * 0.9),
        locations: loc ? [{ locationId: loc.id, quantity: item.qty }] : [],
        unitCost: item.cost,
        totalValue: item.qty * item.cost,
        abcClass: item.abc as InventoryItem['abcClass'],
        lastUpdated: Date.now(),
      };

      this._inventory.set(item.id, invItem);
      this._stats.totalItems++;
      totalValue += invItem.totalValue;

      if (loc) {
        loc.usedCapacity = item.qty;
        loc.items = [item.id];
        loc.status = 'occupied';
      }
    }

    this._stats.totalValue = totalValue;
  }

  private _initializeAGVs(): void {
    const agvDefs = [
      { id: 'agv-001', name: 'AGV-01', type: 'latent' },
      { id: 'agv-002', name: 'AGV-02', type: 'latent' },
      { id: 'agv-003', name: 'AGV-03', type: 'forklift' },
      { id: 'agv-004', name: 'AGV-04', type: 'forklift' },
      { id: 'agv-005', name: 'AGV-05', type: 'conveyor' },
      { id: 'agv-006', name: 'AGV-06', type: 'sorter' },
    ];

    for (const a of agvDefs) {
      const agv: AGV = {
        id: a.id,
        name: a.name,
        type: a.type,
        status: Math.random() > 0.2 ? 'idle' : 'charging',
        currentLocation: '充电区',
        batteryLevel: 60 + Math.random() * 40,
        totalTasks: Math.floor(Math.random() * 500 + 100),
        completedTasks: Math.floor(Math.random() * 450 + 80),
        totalDistance: Math.random() * 1000 + 200,
        lastMaintenance: Date.now() - Math.random() * 30 * 24 * 3600000,
        firmwareVersion: 'v2.5.0',
      };
      this._agvs.set(a.id, agv);
    }
  }

  private _initializePickingStrategies(): void {
    const strategies = [
      { id: 'pk-001', name: '单人摘果式', type: 'single_order' as const, eff: 0.7, acc: 0.99, avgTime: 5, desc: '单个订单拣选，适合订单少、品种多' },
      { id: 'pk-002', name: '播种式批次拣选', type: 'batch' as const, eff: 0.85, acc: 0.97, avgTime: 3, desc: '多订单合并拣选，适合订单多、品种少' },
      { id: 'pk-003', name: '波次拣选', type: 'wave' as const, eff: 0.9, acc: 0.96, avgTime: 2.5, desc: '按波次组织拣选，适合大规模订单' },
      { id: 'pk-004', name: '分区拣选', type: 'zone' as const, eff: 0.88, acc: 0.98, avgTime: 3.5, desc: '按区域分工拣选，适合大型仓库' },
      { id: 'pk-005', name: '集束拣选', type: 'cluster' as const, eff: 0.92, acc: 0.95, avgTime: 2, desc: '多订单集束拣选，适合电商订单' },
    ];

    for (const s of strategies) {
      const strategy: PickingStrategy = {
        id: s.id,
        name: s.name,
        type: s.type,
        efficiency: s.eff,
        accuracy: s.acc,
        avgPickTime: s.avgTime,
        description: s.desc,
      };
      this._pickingStrategies.set(s.id, strategy);
    }
  }

  createInboundOrder(
    type: InboundOrder['type'],
    items: { itemId: string; itemName: string; expectedQuantity: number; unit: string }[],
    expectedDate: number,
    warehouse: string = 'wh-001',
    supplierId?: string,
    dock?: string
  ): InboundOrder {
    const id = `in-${Date.now()}-${this._counter++}`;
    const order: InboundOrder = {
      id,
      type,
      status: 'created',
      supplierId,
      items: items.map(i => ({ ...i, receivedQuantity: 0 })),
      expectedDate,
      warehouse,
      dock,
    };
    this._inboundOrders.set(id, order);
    this._stats.totalInboundOrders++;
    return order;
  }

  receiveInboundOrder(
    orderId: string,
    receipts: { itemId: string; receivedQuantity: number; locationId: string; lotNumber?: string }[],
    receiver: string
  ): InboundOrder | null {
    const order = this._inboundOrders.get(orderId);
    if (!order || order.status === 'completed' || order.status === 'cancelled') return null;

    order.status = 'receiving';
    order.receiver = receiver;
    order.actualDate = Date.now();

    for (const receipt of receipts) {
      const item = order.items.find(i => i.itemId === receipt.itemId);
      if (item) {
        item.receivedQuantity += receipt.receivedQuantity;
      }

      const invItem = this._inventory.get(receipt.itemId);
      if (invItem) {
        invItem.quantity += receipt.receivedQuantity;
        invItem.availableQuantity += receipt.receivedQuantity;
        invItem.totalValue = invItem.quantity * invItem.unitCost;
        invItem.lastUpdated = Date.now();

        const loc = this._storageLocations.get(receipt.locationId);
        if (loc) {
          const existingLoc = invItem.locations.find(l => l.locationId === receipt.locationId);
          if (existingLoc) {
            existingLoc.quantity += receipt.receivedQuantity;
          } else {
            invItem.locations.push({
              locationId: receipt.locationId,
              quantity: receipt.receivedQuantity,
              lotNumber: receipt.lotNumber,
            });
          }
          loc.usedCapacity += receipt.receivedQuantity;
          loc.items.push(receipt.itemId);
          if (loc.status === 'available') loc.status = 'occupied';
        }
      }
    }

    const allReceived = order.items.every(i => i.receivedQuantity >= i.expectedQuantity);
    if (allReceived) {
      order.status = 'putaway';
    } else {
      order.status = 'receiving';
    }

    this._updateStats();
    return order;
  }

  completePutaway(orderId: string): InboundOrder | null {
    const order = this._inboundOrders.get(orderId);
    if (!order) return null;
    order.status = 'completed';
    return order;
  }

  createOutboundOrder(
    type: OutboundOrder['type'],
    items: { itemId: string; itemName: string; orderedQuantity: number; unit: string }[],
    priority: OutboundOrder['priority'] = 'normal',
    warehouse: string = 'wh-001',
    customerId?: string,
    carrier?: string
  ): OutboundOrder {
    const id = `out-${Date.now()}-${this._counter++}`;
    const order: OutboundOrder = {
      id,
      type,
      status: 'created',
      customerId,
      items: items.map(i => ({ ...i, pickedQuantity: 0 })),
      orderDate: Date.now(),
      warehouse,
      carrier,
      priority,
    };
    this._outboundOrders.set(id, order);
    this._stats.totalOutboundOrders++;
    return order;
  }

  pickOutboundOrder(
    orderId: string,
    picks: { itemId: string; pickedQuantity: number; locationId: string }[],
    strategyId?: string
  ): OutboundOrder | null {
    const order = this._outboundOrders.get(orderId);
    if (!order || order.status === 'completed' || order.status === 'cancelled') return null;

    order.status = 'picking';

    for (const pick of picks) {
      const item = order.items.find(i => i.itemId === pick.itemId);
      if (item) {
        item.pickedQuantity += pick.pickedQuantity;
      }

      const invItem = this._inventory.get(pick.itemId);
      if (invItem) {
        invItem.quantity -= pick.pickedQuantity;
        invItem.reservedQuantity -= Math.min(pick.pickedQuantity, invItem.reservedQuantity);
        invItem.availableQuantity = invItem.quantity - invItem.reservedQuantity;
        invItem.totalValue = invItem.quantity * invItem.unitCost;
        invItem.lastUpdated = Date.now();

        const loc = invItem.locations.find(l => l.locationId === pick.locationId);
        if (loc) {
          loc.quantity -= pick.pickedQuantity;
        }

        const storage = this._storageLocations.get(pick.locationId);
        if (storage) {
          storage.usedCapacity -= pick.pickedQuantity;
          if (storage.usedCapacity <= 0) {
            storage.status = 'available';
            storage.items = storage.items.filter(i => i !== pick.itemId);
          }
        }
      }
    }

    const allPicked = order.items.every(i => i.pickedQuantity >= i.orderedQuantity);
    if (allPicked) {
      order.status = 'packed';
    }

    this._updateStats();
    return order;
  }

  shipOutboundOrder(orderId: string, trackingNumber: string): OutboundOrder | null {
    const order = this._outboundOrders.get(orderId);
    if (!order) return null;
    order.status = 'shipped';
    order.shippedDate = Date.now();
    order.trackingNumber = trackingNumber;
    return order;
  }

  completeOutboundOrder(orderId: string): OutboundOrder | null {
    const order = this._outboundOrders.get(orderId);
    if (!order) return null;
    order.status = 'completed';
    return order;
  }

  assignAGVTask(
    type: AGVTask['type'],
    sourceLocation: string,
    targetLocation: string,
    priority: AGVTask['priority'] = 'normal',
    items?: string[]
  ): AGVTask {
    const id = `agt-${Date.now()}-${this._counter++}`;
    const task: AGVTask = {
      id,
      type,
      status: 'pending',
      sourceLocation,
      targetLocation,
      priority,
      items,
      createdTime: Date.now(),
      estimatedDuration: Math.random() * 300 + 60,
    };

    const availableAGV = Array.from(this._agvs.values()).find(a => a.status === 'idle' && a.batteryLevel > 20);
    if (availableAGV) {
      task.agvId = availableAGV.id;
      task.status = 'assigned';
      availableAGV.status = 'moving';
      availableAGV.currentTask = id;
      availableAGV.targetLocation = targetLocation;
    }

    this._agvTasks.set(id, task);
    return task;
  }

  agvDispatching(
    tasks: string[],
    agvIds: string[],
    algorithm: string = 'nearest_neighbor'
  ): {
    assignments: Record<string, string>;
    totalDistance: number;
    avgWaitTime: number;
    unassignedTasks: string[];
  } {
    const assignments: Record<string, string> = {};
    const unassigned: string[] = [];
    let totalDist = 0;

    const availableAGVs = agvIds.filter(id => {
      const agv = this._agvs.get(id);
      return agv && agv.status === 'idle' && agv.batteryLevel > 20;
    });

    let taskIdx = 0;
    for (const taskId of tasks) {
      if (taskIdx < availableAGVs.length) {
        assignments[taskId] = availableAGVs[taskIdx];
        const dist = Math.random() * 100 + 20;
        totalDist += dist;

        const agv = this._agvs.get(availableAGVs[taskIdx]);
        const task = this._agvTasks.get(taskId);
        if (agv && task) {
          agv.status = 'moving';
          agv.currentTask = taskId;
          agv.targetLocation = task.targetLocation;
          task.agvId = availableAGVs[taskIdx];
          task.status = 'assigned';
        }
      } else {
        unassigned.push(taskId);
      }
      taskIdx++;
    }

    this._stats.agvUtilization = availableAGVs.length > 0
      ? (agvIds.length - availableAGVs.length + taskIdx) / agvIds.length
      : 0;

    return {
      assignments,
      totalDistance: totalDist,
      avgWaitTime: tasks.length > 0 ? Math.random() * 60 + 10 : 0,
      unassignedTasks: unassigned,
    };
  }

  agvStatus(): {
    total: number;
    idle: number;
    working: number;
    charging: number;
    fault: number;
    maintenance: number;
    avgBattery: number;
    totalTasksCompleted: number;
    utilization: number;
    agvs: AGV[];
  } {
    const agvs = Array.from(this._agvs.values());
    const idle = agvs.filter(a => a.status === 'idle').length;
    const working = agvs.filter(a => a.status === 'moving' || a.status === 'loading' || a.status === 'unloading').length;
    const charging = agvs.filter(a => a.status === 'charging').length;
    const fault = agvs.filter(a => a.status === 'fault').length;
    const maint = agvs.filter(a => a.status === 'maintenance').length;
    const avgBattery = agvs.reduce((s, a) => s + a.batteryLevel, 0) / (agvs.length || 1);
    const totalTasks = agvs.reduce((s, a) => s + a.completedTasks, 0);
    const utilization = agvs.length > 0 ? working / agvs.length : 0;

    this._stats.agvUtilization = utilization;

    return {
      total: agvs.length,
      idle,
      working,
      charging,
      fault,
      maintenance: maint,
      avgBattery,
      totalTasksCompleted: totalTasks,
      utilization,
      agvs,
    };
  }

  pickingStrategyOptimization(
    orders: string[],
    itemsPerOrder: number,
    warehouseLayout: string
  ): {
    recommendedStrategy: string;
    strategies: Record<string, {
      efficiency: number;
      accuracy: number;
      avgTime: number;
      estimatedCost: number;
    }>;
    bestStrategy: string;
    expectedImprovement: number;
  } {
    const strategies = Array.from(this._pickingStrategies.values());
    const results: Record<string, {
      efficiency: number;
      accuracy: number;
      avgTime: number;
      estimatedCost: number;
    }> = {};

    for (const s of strategies) {
      const efficiency = s.efficiency * (0.9 + Math.random() * 0.2);
      const accuracy = s.accuracy * (0.95 + Math.random() * 0.08);
      const avgTime = s.avgPickTime * (0.8 + Math.random() * 0.4);
      const cost = orders.length * avgTime * 0.5;

      results[s.id] = { efficiency, accuracy, avgTime, estimatedCost: cost };
    }

    const sorted = Object.entries(results).sort((a, b) => b[1].efficiency - a[1].efficiency);
    const best = sorted[0][0];
    const worst = sorted[sorted.length - 1][1].efficiency;
    const improvement = (results[best].efficiency - worst) / worst;

    return {
      recommendedStrategy: best,
      strategies: results,
      bestStrategy: best,
      expectedImprovement: improvement,
    };
  }

  createCycleCount(
    type: CycleCount['type'],
    items: { itemId: string; locationId: string; systemQuantity: number }[],
    scheduledDate: number,
    counter: string
  ): CycleCount {
    const id = `cc-${Date.now()}-${this._counter++}`;
    const cc: CycleCount = {
      id,
      type,
      status: 'scheduled',
      scheduledDate,
      items: items.map(i => ({
        ...i,
        countedQuantity: 0,
        variance: 0,
        variancePercent: 0,
        status: 'pending',
      })),
      counter,
      totalItems: items.length,
      countedItems: 0,
      varianceCount: 0,
      varianceValue: 0,
    };
    this._cycleCounts.set(id, cc);
    return cc;
  }

  recordCount(
    cycleCountId: string,
    counts: { itemId: string; locationId: string; countedQuantity: number }[]
  ): CycleCount | null {
    const cc = this._cycleCounts.get(cycleCountId);
    if (!cc || cc.status === 'completed' || cc.status === 'reconciled') return null;

    if (cc.status === 'scheduled') {
      cc.status = 'in_progress';
      cc.startTime = Date.now();
    }

    let varianceCount = 0;
    let varianceValue = 0;

    for (const count of counts) {
      const item = cc.items.find(i => i.itemId === count.itemId && i.locationId === count.locationId);
      if (item) {
        item.countedQuantity = count.countedQuantity;
        item.variance = count.countedQuantity - item.systemQuantity;
        item.variancePercent = item.systemQuantity > 0 ? item.variance / item.systemQuantity : 0;
        item.status = item.variance === 0 ? 'matched' : item.variance > 0 ? 'over' : 'short';

        if (item.variance !== 0) {
          varianceCount++;
          const invItem = this._inventory.get(count.itemId);
          if (invItem) {
            varianceValue += Math.abs(item.variance) * invItem.unitCost;
          }
        }
      }
    }

    cc.countedItems = cc.items.filter(i => i.status !== 'pending').length;
    cc.varianceCount = varianceCount;
    cc.varianceValue = varianceValue;

    if (cc.countedItems >= cc.totalItems) {
      cc.status = 'completed';
      cc.endTime = Date.now();
    }

    const accuracy = cc.totalItems > 0 ? (cc.totalItems - cc.varianceCount) / cc.totalItems : 0;
    this._stats.inventoryAccuracy = accuracy;

    return cc;
  }

  reconcileInventory(cycleCountId: string): CycleCount | null {
    const cc = this._cycleCounts.get(cycleCountId);
    if (!cc) return null;

    cc.status = 'reconciled';

    for (const item of cc.items) {
      if (item.variance !== 0) {
        const invItem = this._inventory.get(item.itemId);
        if (invItem) {
          invItem.quantity = item.countedQuantity;
          invItem.availableQuantity = invItem.quantity - invItem.reservedQuantity;
          invItem.totalValue = invItem.quantity * invItem.unitCost;
          invItem.lastUpdated = Date.now();
        }
      }
    }

    return cc;
  }

  warehouseKPI(date: number, warehouse: string = 'wh-001'): WarehouseKPI {
    const kpi: WarehouseKPI = {
      date,
      warehouse,
      receiving: {
        totalReceipts: Math.floor(Math.random() * 50 + 20),
        receivedItems: Math.floor(Math.random() * 5000 + 1000),
        avgReceivingTime: Math.random() * 30 + 15,
        putawayAccuracy: 0.97 + Math.random() * 0.025,
      },
      shipping: {
        totalOrders: Math.floor(Math.random() * 100 + 50),
        shippedItems: Math.floor(Math.random() * 8000 + 2000),
        avgPickingTime: Math.random() * 10 + 3,
        orderAccuracy: 0.98 + Math.random() * 0.018,
        onTimeShipment: 0.95 + Math.random() * 0.04,
      },
      inventory: {
        totalItems: this._inventory.size,
        totalValue: this._stats.totalValue,
        inventoryAccuracy: 0.97 + Math.random() * 0.025,
        turnoverRate: 3 + Math.random() * 4,
      },
      utilization: {
        spaceUtilization: this._stats.spaceUtilization,
        laborUtilization: 0.75 + Math.random() * 0.2,
        equipmentUtilization: 0.65 + Math.random() * 0.25,
      },
    };

    this._kpis.set(`${warehouse}-${date}`, kpi);
    this._stats.orderAccuracy = kpi.shipping.orderAccuracy;
    this._stats.inventoryAccuracy = kpi.inventory.inventoryAccuracy;

    return kpi;
  }

  slottingOptimization(
    items: string[],
    orderFrequency: Record<string, number>,
    layout: string = 'standard'
  ): {
    assignments: Record<string, { zone: string; location: string; level: number; position: number }>;
    estimatedTravelTimeReduction: number;
    estimatedPickingEfficiency: number;
    categoryDistribution: Record<string, number>;
  } {
    const assignments: Record<string, { zone: string; location: string; level: number; position: number }> = {};
    const categoryDist: Record<string, number> = { 'A': 0, 'B': 0, 'C': 0 };

    const sortedItems = items.sort((a, b) => (orderFrequency[b] || 0) - (orderFrequency[a] || 0));
    const total = sortedItems.length;

    for (let i = 0; i < sortedItems.length; i++) {
      const itemId = sortedItems[i];
      const percentile = i / total;
      let zone: string;
      let level: number;

      if (percentile < 0.2) {
        zone = 'C';
        level = 2;
        categoryDist['A']++;
      } else if (percentile < 0.5) {
        zone = 'B';
        level = 3;
        categoryDist['B']++;
      } else {
        zone = 'A';
        level = 4;
        categoryDist['C']++;
      }

      assignments[itemId] = {
        zone,
        location: `${zone}-01-0${(i % 10) + 1}-${level}-1`,
        level,
        position: (i % 2) + 1,
      };
    }

    return {
      assignments,
      estimatedTravelTimeReduction: 0.2 + Math.random() * 0.2,
      estimatedPickingEfficiency: 0.85 + Math.random() * 0.1,
      categoryDistribution: categoryDist,
    };
  }

  private _updateStats(): void {
    this._stats.totalValue = Array.from(this._inventory.values()).reduce((s, i) => s + i.totalValue, 0);
    this._stats.totalItems = this._inventory.size;
  }

  get warehouseCount(): number {
    return this._warehouses.size;
  }

  get locationCount(): number {
    return this._storageLocations.size;
  }

  get inventoryCount(): number {
    return this._inventory.size;
  }

  get inboundOrderCount(): number {
    return this._inboundOrders.size;
  }

  get outboundOrderCount(): number {
    return this._outboundOrders.size;
  }

  get agvCount(): number {
    return this._agvs.size;
  }

  get agvTaskCount(): number {
    return this._agvTasks.size;
  }

  get cycleCountCount(): number {
    return this._cycleCounts.size;
  }

  get stats(): {
    totalItems: number;
    totalValue: number;
    spaceUtilization: number;
    orderAccuracy: number;
    inventoryAccuracy: number;
    agvUtilization: number;
    totalInboundOrders: number;
    totalOutboundOrders: number;
  } {
    return { ...this._stats };
  }

  getWarehouse(id: string): Warehouse | undefined {
    return this._warehouses.get(id);
  }

  getStorageLocation(id: string): StorageLocation | undefined {
    return this._storageLocations.get(id);
  }

  getInventoryItem(id: string): InventoryItem | undefined {
    return this._inventory.get(id);
  }

  getInboundOrder(id: string): InboundOrder | undefined {
    return this._inboundOrders.get(id);
  }

  getOutboundOrder(id: string): OutboundOrder | undefined {
    return this._outboundOrders.get(id);
  }

  getAGV(id: string): AGV | undefined {
    return this._agvs.get(id);
  }

  getAGVTask(id: string): AGVTask | undefined {
    return this._agvTasks.get(id);
  }

  getCycleCount(id: string): CycleCount | undefined {
    return this._cycleCounts.get(id);
  }

  toPacket(): DataPacket<{
    warehouses: number;
    storageLocations: number;
    inventoryItems: number;
    inboundOrders: number;
    outboundOrders: number;
    agvs: number;
    agvTasks: number;
    cycleCounts: number;
    kpis: number;
    stats: {
      totalItems: number;
      totalValue: number;
      spaceUtilization: number;
      orderAccuracy: number;
      inventoryAccuracy: number;
      agvUtilization: number;
      totalInboundOrders: number;
      totalOutboundOrders: number;
    };
  }> {
    return {
      id: `wms-${Date.now()}-${this._counter}`,
      payload: {
        warehouses: this._warehouses.size,
        storageLocations: this._storageLocations.size,
        inventoryItems: this._inventory.size,
        inboundOrders: this._inboundOrders.size,
        outboundOrders: this._outboundOrders.size,
        agvs: this._agvs.size,
        agvTasks: this._agvTasks.size,
        cycleCounts: this._cycleCounts.size,
        kpis: this._kpis.size,
        stats: { ...this._stats },
      },
      metadata: {
        createdAt: Date.now(),
        route: ['smart_factory', 'smart_warehouse', 'result'],
        priority: 0.75,
        phase: 'warehouse',
      },
    };
  }

  reset(): void {
    this._warehouses.clear();
    this._storageLocations.clear();
    this._inventory.clear();
    this._inboundOrders.clear();
    this._outboundOrders.clear();
    this._agvs.clear();
    this._agvTasks.clear();
    this._pickingStrategies.clear();
    this._cycleCounts.clear();
    this._kpis.clear();
    this._counter = 0;
    this._stats = {
      totalItems: 0,
      totalValue: 0,
      spaceUtilization: 0,
      orderAccuracy: 0,
      inventoryAccuracy: 0,
      agvUtilization: 0,
      totalInboundOrders: 0,
      totalOutboundOrders: 0,
    };
    this._initializeWarehouse();
    this._initializeStorageLocations();
    this._initializeInventory();
    this._initializeAGVs();
    this._initializePickingStrategies();
  }
}

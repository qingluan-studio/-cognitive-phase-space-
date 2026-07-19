import { DataPacket } from '../shared/types';

export interface Asset {
  id: string;
  name: string;
  type: string;
  location: string;
  status: 'active' | 'inactive' | 'maintenance' | 'retired';
  specs: Record<string, unknown>;
}

export interface MaintenanceOrder {
  id: string;
  asset: string;
  type: 'preventive' | 'corrective' | 'predictive' | 'inspection';
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  scheduledDate: number;
}

interface AssetHierarchy {
  parent: string;
  children: string[];
  level: number;
}

interface SparePart {
  id: string;
  name: string;
  quantity: number;
  reorderPoint: number;
  location: string;
}

export class AssetManagement {
  private _assets: Map<string, Asset> = new Map();
  private _maintenanceOrders: Map<string, MaintenanceOrder> = new Map();
  private _hierarchies: Map<string, AssetHierarchy> = new Map();
  private _spareParts: Map<string, SparePart> = new Map();
  private _counter = 0;
  private _stats = {
    totalAssets: 0,
    activeAssets: 0,
    maintenanceOrders: 0,
    mtbf: 0,
    availability: 0,
  };

  assetRegister(asset: Asset, details: Record<string, unknown>, hierarchy: string): Asset {
    this._assets.set(asset.id, asset);
    this._stats.totalAssets++;
    if (asset.status === 'active') this._stats.activeAssets++;
    return asset;
  }

  assetHierarchy(parent: string, children: string[], structure: string): { parent: string; children: string[]; levels: number } {
    this._hierarchies.set(parent, { parent, children, level: 0 });
    return { parent, children, levels: Math.floor(children.length / 5) + 1 };
  }

  workOrderManagement(orders: MaintenanceOrder[], type: string, status: string): { orders: number; completed: number; backlog: number; avgCompletionTime: number } {
    for (const order of orders) {
      this._maintenanceOrders.set(order.id, order);
      this._stats.maintenanceOrders++;
    }
    const completed = orders.filter(o => o.status === 'completed').length;
    return {
      orders: orders.length,
      completed,
      backlog: orders.length - completed,
      avgCompletionTime: Math.random() * 24 + 4,
    };
  }

  preventiveMaintenance(assets: string[], schedule: string[], tasks: string[]): { assets: number; tasks: number; schedule: string[]; complianceRate: number } {
    return {
      assets: assets.length,
      tasks: tasks.length,
      schedule,
      complianceRate: Math.random() * 0.2 + 0.8,
    };
  }

  predictiveMaintenance(assets: string[], sensors: string[], model: string): { assets: number; predictions: number; alerts: number; accuracy: number } {
    return {
      assets: assets.length,
      predictions: assets.length,
      alerts: Math.floor(assets.length * 0.2),
      accuracy: Math.random() * 0.2 + 0.7,
    };
  }

  conditionMonitoring(assets: string[], parameters: string[], thresholds: Record<string, { min: number; max: number }>): { assets: number; parameters: number; alerts: number; healthIndex: number } {
    return {
      assets: assets.length,
      parameters: parameters.length,
      alerts: Math.floor(assets.length * 0.15),
      healthIndex: Math.random() * 20 + 80,
    };
  }

  sparesManagement(parts: string[], inventory: number[], reorder: number[]): { parts: number; stockValue: number; reorders: number; turnover: number } {
    for (let i = 0; i < parts.length; i++) {
      const part: SparePart = {
        id: `part-${Date.now()}-${this._counter++}`,
        name: parts[i],
        quantity: inventory[i] || 0,
        reorderPoint: reorder[i] || 10,
        location: `warehouse-${Math.floor(Math.random() * 3) + 1}`,
      };
      this._spareParts.set(part.id, part);
    }
    return {
      parts: parts.length,
      stockValue: parts.length * 500 + Math.random() * 10000,
      reorders: Math.floor(parts.length * 0.3),
      turnover: Math.random() * 4 + 2,
    };
  }

  calibrationSchedule(tools: string[], intervals: number[], records: string[]): { tools: number; due: number; pastDue: number; compliance: number } {
    return {
      tools: tools.length,
      due: Math.floor(tools.length * 0.2),
      pastDue: Math.floor(tools.length * 0.05),
      compliance: Math.random() * 0.1 + 0.9,
    };
  }

  warrantyTracking(assets: string[], vendors: string[], claims: string[]): { assets: number; inWarranty: number; claims: number; avgSettlement: number } {
    return {
      assets: assets.length,
      inWarranty: Math.floor(assets.length * 0.6),
      claims: claims.length,
      avgSettlement: Math.random() * 5000 + 1000,
    };
  }

  assetDepreciation(asset: string, method: string, life: number): { asset: string; method: string; usefulLife: number; currentValue: number; annualDepreciation: number } {
    const initialValue = 100000;
    const currentValue = initialValue * (1 - Math.random() * 0.5);
    return {
      asset,
      method,
      usefulLife: life,
      currentValue,
      annualDepreciation: initialValue / life,
    };
  }

  assetPerformance(asset: string, metrics: string[], targets: Record<string, number>): { metrics: Record<string, number>; targets: Record<string, number>; overallScore: number } {
    const values: Record<string, number> = {};
    let totalScore = 0;
    for (const metric of metrics) {
      values[metric] = Math.random() * 100;
      totalScore += targets[metric] ? values[metric] / targets[metric] : 0;
    }
    return {
      metrics: values,
      targets,
      overallScore: metrics.length > 0 ? totalScore / metrics.length : 0,
    };
  }

  assetLifecycle(asset: string, stages: string[], history: string[]): { stage: string; age: number; remainingLife: number; lifecycleCost: number } {
    const stage = stages[Math.floor(Math.random() * stages.length)];
    return {
      stage,
      age: Math.random() * 10,
      remainingLife: Math.random() * 10,
      lifecycleCost: Math.random() * 500000 + 100000,
    };
  }

  cmmsIntegration(cmms: string, data: string[], sync: string): { connected: boolean; cmms: string; dataPoints: number; lastSync: number } {
    return {
      connected: true,
      cmms,
      dataPoints: data.length,
      lastSync: Date.now() - 3600000,
    };
  }

  get assetCount(): number {
    return this._assets.size;
  }

  get workOrderCount(): number {
    return this._maintenanceOrders.size;
  }

  get sparePartCount(): number {
    return this._spareParts.size;
  }

  get stats(): { totalAssets: number; activeAssets: number; maintenanceOrders: number; mtbf: number; availability: number } {
    return { ...this._stats };
  }

  public toPacket(): DataPacket<{
    assets: number;
    maintenanceOrders: number;
    hierarchies: number;
    spareParts: number;
    stats: { totalAssets: number; activeAssets: number; maintenanceOrders: number; mtbf: number; availability: number };
  }> {
    return {
      id: `asset-mgmt-${Date.now()}-${this._counter}`,
      payload: {
        assets: this._assets.size,
        maintenanceOrders: this._maintenanceOrders.size,
        hierarchies: this._hierarchies.size,
        spareParts: this._spareParts.size,
        stats: { ...this._stats },
      },
      metadata: {
        createdAt: Date.now(),
        route: ['smart_factory', 'asset_management', 'result'],
        priority: 0.7,
        phase: 'management',
      },
    };
  }

  public reset(): void {
    this._assets.clear();
    this._maintenanceOrders.clear();
    this._hierarchies.clear();
    this._spareParts.clear();
    this._counter = 0;
    this._stats = {
      totalAssets: 0,
      activeAssets: 0,
      maintenanceOrders: 0,
      mtbf: 0,
      availability: 0,
    };
  }
}

import { DataPacket } from '../shared/types';

export interface DigitalTwin {
  id: string;
  physical: string;
  virtual: string;
  syncState: 'synced' | 'syncing' | 'out_of_sync' | 'disconnected';
}

export interface TwinModel {
  id: string;
  type: string;
  schema: string;
  version: string;
}

interface SensorReading {
  sensorId: string;
  value: number;
  timestamp: number;
  unit: string;
}

interface TwinState {
  twinId: string;
  state: Record<string, unknown>;
  timestamp: number;
  syncLatency: number;
}

interface TwinVersion {
  version: string;
  timestamp: number;
  changes: string[];
  author: string;
}

export class DigitalTwinCore {
  private _twins: Map<string, DigitalTwin> = new Map();
  private _models: Map<string, TwinModel> = new Map();
  private _states: Map<string, TwinState> = new Map();
  private _versions: Map<string, TwinVersion[]> = new Map();
  private _counter = 0;
  private _syncStats = {
    totalSyncs: 0,
    avgLatency: 0,
    successRate: 1,
    failedSyncs: 0,
  };

  createTwin(physicalAsset: string, model: TwinModel): DigitalTwin {
    const id = `twin-${Date.now()}-${this._counter++}`;
    const twin: DigitalTwin = {
      id,
      physical: physicalAsset,
      virtual: `virtual-${id}`,
      syncState: 'syncing',
    };
    this._twins.set(id, twin);
    this._models.set(model.id, model);
    this._states.set(id, {
      twinId: id,
      state: {},
      timestamp: Date.now(),
      syncLatency: 0,
    });
    twin.syncState = 'synced';
    return twin;
  }

  syncTwin(twinId: string, sensorData: SensorReading[]): { synced: boolean; latency: number; dataPoints: number } {
    const twin = this._twins.get(twinId);
    if (!twin) return { synced: false, latency: 0, dataPoints: 0 };
    const latency = Math.random() * 100 + 10;
    const state = this._states.get(twinId);
    if (state) {
      const newState = { ...state.state };
      for (const reading of sensorData) {
        newState[reading.sensorId] = reading.value;
      }
      state.state = newState;
      state.timestamp = Date.now();
      state.syncLatency = latency;
    }
    twin.syncState = 'synced';
    this._syncStats.totalSyncs++;
    this._syncStats.avgLatency = (this._syncStats.avgLatency * (this._syncStats.totalSyncs - 1) + latency) / this._syncStats.totalSyncs;
    return { synced: true, latency, dataPoints: sensorData.length };
  }

  updateState(twinId: string, state: Record<string, unknown>, timestamp: number): boolean {
    const twin = this._twins.get(twinId);
    if (!twin) return false;
    this._states.set(twinId, {
      twinId,
      state,
      timestamp,
      syncLatency: Date.now() - timestamp,
    });
    return true;
  }

  visualizeTwin(twinId: string, viewer: string): { view: string; model: string; quality: number } {
    const quality = Math.random() * 0.3 + 0.7;
    return {
      view: `view-${twinId}-${viewer}`,
      model: `model-${twinId}`,
      quality,
    };
  }

  simulateTwin(twinId: string, scenario: string, duration: number): { results: Record<string, number>; duration: number; scenario: string } {
    const results: Record<string, number> = {};
    const metrics = ['temperature', 'pressure', 'vibration', 'efficiency', 'output'];
    for (const metric of metrics) {
      results[metric] = Math.random() * 100;
    }
    return { results, duration, scenario };
  }

  predictTwin(twinId: string, model: string, horizon: number): { predictions: Record<string, number[]>; horizon: number; confidence: number } {
    const predictions: Record<string, number[]> = {};
    const metrics = ['temperature', 'pressure', 'health', 'remaining_life'];
    for (const metric of metrics) {
      const values: number[] = [];
      let current = Math.random() * 50 + 50;
      for (let i = 0; i < horizon; i++) {
        current += (Math.random() - 0.5) * 5;
        values.push(current);
      }
      predictions[metric] = values;
    }
    return {
      predictions,
      horizon,
      confidence: Math.random() * 0.3 + 0.6,
    };
  }

  twinModel(twin: DigitalTwin, type: string, schema: string): TwinModel {
    const model: TwinModel = {
      id: `model-${Date.now()}-${this._counter++}`,
      type,
      schema,
      version: '1.0.0',
    };
    this._models.set(model.id, model);
    return model;
  }

  assetTwin(asset: string, sensors: string[], model: TwinModel): DigitalTwin {
    return this.createTwin(asset, model);
  }

  processTwin(process: string, parameters: Record<string, number>, sensor: string): DigitalTwin {
    const model: TwinModel = {
      id: `process-model-${Date.now()}-${this._counter++}`,
      type: 'process',
      schema: 'process-v1',
      version: '1.0.0',
    };
    return this.createTwin(process, model);
  }

  systemTwin(system: string, components: string[], behavior: string): DigitalTwin {
    const model: TwinModel = {
      id: `system-model-${Date.now()}-${this._counter++}`,
      type: 'system',
      schema: behavior,
      version: '1.0.0',
    };
    return this.createTwin(system, model);
  }

  twinComposition(twins: DigitalTwin[], relationships: string[]): { composed: string; twins: string[]; relationships: string[] } {
    return {
      composed: `composed-${Date.now()}-${this._counter++}`,
      twins: twins.map(t => t.id),
      relationships,
    };
  }

  twinHierarchy(parent: DigitalTwin, children: DigitalTwin[], hierarchy: string): { parent: string; children: string[]; hierarchy: string } {
    return {
      parent: parent.id,
      children: children.map(c => c.id),
      hierarchy,
    };
  }

  twinVersioning(twin: DigitalTwin, versions: TwinVersion[], history: string[]): { currentVersion: string; versionCount: number; history: string[] } {
    this._versions.set(twin.id, versions);
    return {
      currentVersion: versions.length > 0 ? versions[versions.length - 1].version : '1.0.0',
      versionCount: versions.length,
      history: [...history],
    };
  }

  get twinCount(): number {
    return this._twins.size;
  }

  get modelCount(): number {
    return this._models.size;
  }

  get syncStats(): { totalSyncs: number; avgLatency: number; successRate: number; failedSyncs: number } {
    return { ...this._syncStats };
  }

  public toPacket(): DataPacket<{
    twins: number;
    models: number;
    states: number;
    syncStats: { totalSyncs: number; avgLatency: number; successRate: number; failedSyncs: number };
  }> {
    return {
      id: `dt-core-${Date.now()}-${this._counter}`,
      payload: {
        twins: this._twins.size,
        models: this._models.size,
        states: this._states.size,
        syncStats: { ...this._syncStats },
      },
      metadata: {
        createdAt: Date.now(),
        route: ['digital_twin', 'core', 'result'],
        priority: 0.8,
        phase: 'sync',
      },
    };
  }

  public reset(): void {
    this._twins.clear();
    this._models.clear();
    this._states.clear();
    this._versions.clear();
    this._counter = 0;
    this._syncStats = {
      totalSyncs: 0,
      avgLatency: 0,
      successRate: 1,
      failedSyncs: 0,
    };
  }
}
importimport { DataPacket } from '../shared/types';

export interface DigitalTwin {
  id
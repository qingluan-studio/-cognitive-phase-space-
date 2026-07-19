import { DataPacket } from '../shared/types';

export interface TwinIntegration {
  twin: string;
  systems: string[];
  connections: Connection[];
  dataFlow: DataFlow[];
}

export interface DataSource {
  id: string;
  type: string;
  name: string;
  protocol: string;
  status: 'connected' | 'disconnected' | 'error';
}

interface Connection {
  id: string;
  source: string;
  target: string;
  protocol: string;
  status: 'active' | 'inactive' | 'error';
  latency: number;
}

interface DataFlow {
  id: string;
  source: string;
  destination: string;
  dataType: string;
  frequency: number;
  lastSync: number;
  throughput: number;
}

export class TwinIntegration {
  private _integrations: Map<string, TwinIntegration> = new Map();
  private _dataSources: Map<string, DataSource> = new Map();
  private _connections: Map<string, Connection> = new Map();
  private _dataFlows: Map<string, DataFlow> = new Map();
  private _counter = 0;
  private _stats = {
    totalConnections: 0,
    activeConnections: 0,
    dataPointsPerSecond: 0,
    failedSyncs: 0,
  };

  iotIntegration(twin: string, iotHub: string, devices: string[]): { connected: boolean; devices: string[]; messagesPerSecond: number } {
    for (const device of devices) {
      const ds: DataSource = {
        id: `iot-${device}`,
        type: 'iot_device',
        name: device,
        protocol: 'mqtt',
        status: 'connected',
      };
      this._dataSources.set(ds.id, ds);
      this._addConnection(twin, device, 'mqtt');
      this._addDataFlow(device, twin, 'telemetry', 1);
    }
    this._stats.totalConnections += devices.length;
    this._stats.activeConnections += devices.length;
    return {
      connected: true,
      devices,
      messagesPerSecond: devices.length * Math.random() * 10,
    };
  }

  sensorIntegration(twin: string, sensors: string[], protocol: string): { connected: boolean; sensors: string[]; sampleRate: number } {
    for (const sensor of sensors) {
      const ds: DataSource = {
        id: `sensor-${sensor}`,
        type: 'sensor',
        name: sensor,
        protocol,
        status: 'connected',
      };
      this._dataSources.set(ds.id, ds);
      this._addConnection(twin, sensor, protocol);
      this._addDataFlow(sensor, twin, 'sensor_data', 10);
    }
    return {
      connected: true,
      sensors,
      sampleRate: Math.random() * 100 + 10,
    };
  }

  scadaIntegration(twin: string, scada: string, tags: string[]): { connected: boolean; tags: string[]; updateRate: number } {
    const ds: DataSource = {
      id: `scada-${scada}`,
      type: 'scada',
      name: scada,
      protocol: 'opcua',
      status: 'connected',
    };
    this._dataSources.set(ds.id, ds);
    this._addConnection(twin, scada, 'opcua');
    this._addDataFlow(scada, twin, 'scada_tags', 1);
    return {
      connected: true,
      tags,
      updateRate: Math.random() * 5 + 1,
    };
  }

  plcIntegration(twin: string, plc: string, registers: string[]): { connected: boolean; registers: string[]; scanRate: number } {
    const ds: DataSource = {
      id: `plc-${plc}`,
      type: 'plc',
      name: plc,
      protocol: 'modbus',
      status: 'connected',
    };
    this._dataSources.set(ds.id, ds);
    this._addConnection(twin, plc, 'modbus');
    this._addDataFlow(plc, twin, 'register_data', 100);
    return {
      connected: true,
      registers,
      scanRate: Math.random() * 50 + 10,
    };
  }

  mesIntegration(twin: string, mes: string, operations: string[]): { connected: boolean; operations: string[]; syncFrequency: string } {
    const ds: DataSource = {
      id: `mes-${mes}`,
      type: 'mes',
      name: mes,
      protocol: 'api',
      status: 'connected',
    };
    this._dataSources.set(ds.id, ds);
    this._addConnection(twin, mes, 'rest');
    this._addDataFlow(mes, twin, 'production_data', 0.1);
    return {
      connected: true,
      operations,
      syncFrequency: '5min',
    };
  }

  erpIntegration(twin: string, erp: string, modules: string[]): { connected: boolean; modules: string[]; syncStatus: string } {
    const ds: DataSource = {
      id: `erp-${erp}`,
      type: 'erp',
      name: erp,
      protocol: 'api',
      status: 'connected',
    };
    this._dataSources.set(ds.id, ds);
    this._addConnection(twin, erp, 'rest');
    this._addDataFlow(erp, twin, 'business_data', 0.016);
    return {
      connected: true,
      modules,
      syncStatus: 'synced',
    };
  }

  cmmsIntegration(twin: string, cmms: string, workOrders: string[]): { connected: boolean; workOrders: string[]; lastSync: number } {
    const ds: DataSource = {
      id: `cmms-${cmms}`,
      type: 'cmms',
      name: cmms,
      protocol: 'api',
      status: 'connected',
    };
    this._dataSources.set(ds.id, ds);
    this._addConnection(twin, cmms, 'rest');
    this._addDataFlow(cmms, twin, 'maintenance_data', 0.1);
    return {
      connected: true,
      workOrders,
      lastSync: Date.now(),
    };
  }

  bimIntegration(twin: string, bim: string, elements: string[]): { connected: boolean; elements: string[]; modelVersion: string } {
    const ds: DataSource = {
      id: `bim-${bim}`,
      type: 'bim',
      name: bim,
      protocol: 'ifc',
      status: 'connected',
    };
    this._dataSources.set(ds.id, ds);
    this._addConnection(twin, bim, 'ifc');
    this._addDataFlow(bim, twin, 'model_data', 0.001);
    return {
      connected: true,
      elements,
      modelVersion: '1.0.0',
    };
  }

  cadIntegration(twin: string, cad: string, geometry: string[]): { connected: boolean; geometryCount: number; format: string } {
    const ds: DataSource = {
      id: `cad-${cad}`,
      type: 'cad',
      name: cad,
      protocol: 'file',
      status: 'connected',
    };
    this._dataSources.set(ds.id, ds);
    this._addConnection(twin, cad, 'file');
    return {
      connected: true,
      geometryCount: geometry.length,
      format: 'step',
    };
  }

  historianIntegration(twin: string, historian: string, tags: string[]): { connected: boolean; tags: string[]; dataPoints: number; compression: string } {
    const ds: DataSource = {
      id: `historian-${historian}`,
      type: 'historian',
      name: historian,
      protocol: 'opchda',
      status: 'connected',
    };
    this._dataSources.set(ds.id, ds);
    this._addConnection(twin, historian, 'opchda');
    this._addDataFlow(historian, twin, 'historical_data', 1);
    return {
      connected: true,
      tags,
      dataPoints: tags.length * 10000,
      compression: 'lossy',
    };
  }

  eventBus(twin: string, events: string[], subscribers: string[]): { bus: string; events: string[]; subscribers: string[]; throughput: number } {
    this._addDataFlow('event_bus', twin, 'events', 10);
    return {
      bus: `bus-${twin}`,
      events,
      subscribers,
      throughput: Math.random() * 1000 + 100,
    };
  }

  apiIntegration(twin: string, endpoints: string[], auth: string): { connected: boolean; endpoints: string[]; authType: string; rateLimit: number } {
    this._addConnection(twin, 'api', 'rest');
    return {
      connected: true,
      endpoints,
      authType: auth,
      rateLimit: 1000,
    };
  }

  dataHistorian(twin: string, tags: string[], retention: { days: number; compression: string }): { stored: boolean; tags: string[]; retentionDays: number; compression: string } {
    const ds: DataSource = {
      id: `historian-local-${twin}`,
      type: 'historian',
      name: 'local_historian',
      protocol: 'internal',
      status: 'connected',
    };
    this._dataSources.set(ds.id, ds);
    return {
      stored: true,
      tags,
      retentionDays: retention.days,
      compression: retention.compression,
    };
  }

  private _addConnection(twin: string, source: string, protocol: string): void {
    const id = `conn-${twin}-${source}-${this._counter++}`;
    const conn: Connection = {
      id,
      source,
      target: twin,
      protocol,
      status: 'active',
      latency: Math.random() * 100 + 10,
    };
    this._connections.set(id, conn);
    this._stats.totalConnections++;
    this._stats.activeConnections++;
  }

  private _addDataFlow(source: string, destination: string, dataType: string, frequency: number): void {
    const id = `flow-${source}-${destination}-${this._counter++}`;
    const flow: DataFlow = {
      id,
      source,
      destination,
      dataType,
      frequency,
      lastSync: Date.now(),
      throughput: Math.random() * 1000 + 100,
    };
    this._dataFlows.set(id, flow);
    this._stats.dataPointsPerSecond += frequency;
  }

  get integrationCount(): number {
    return this._integrations.size;
  }

  get dataSourceCount(): number {
    return this._dataSources.size;
  }

  get connectionCount(): number {
    return this._connections.size;
  }

  get stats(): { totalConnections: number; activeConnections: number; dataPointsPerSecond: number; failedSyncs: number } {
    return { ...this._stats };
  }

  public toPacket(): DataPacket<{
    integrations: number;
    dataSources: number;
    connections: number;
    dataFlows: number;
    stats: { totalConnections: number; activeConnections: number; dataPointsPerSecond: number; failedSyncs: number };
  }> {
    return {
      id: `dt-integration-${Date.now()}-${this._counter}`,
      payload: {
        integrations: this._integrations.size,
        dataSources: this._dataSources.size,
        connections: this._connections.size,
        dataFlows: this._dataFlows.size,
        stats: { ...this._stats },
      },
      metadata: {
        createdAt: Date.now(),
        route: ['digital_twin', 'integration', 'result'],
        priority: 0.7,
        phase: 'integration',
      },
    };
  }

  public reset(): void {
    this._integrations.clear();
    this._dataSources.clear();
    this._connections.clear();
    this._dataFlows.clear();
    this._counter = 0;
    this._stats = {
      totalConnections: 0,
      activeConnections: 0,
      dataPointsPerSecond: 0,
      failedSyncs: 0,
    };
  }
}

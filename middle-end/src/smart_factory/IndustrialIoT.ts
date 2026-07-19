import { DataPacket } from '../shared/types';

export interface SensorNode {
  id: string;
  name: string;
  type: string;
  category: string;
  location: string;
  equipmentId?: string;
  status: 'online' | 'offline' | 'fault' | 'sleep';
  protocol: string;
  samplingRate: number;
  unit: string;
  lastReading: number;
  lastReadingTime: number;
  batteryLevel?: number;
  signalStrength?: number;
  firmwareVersion: string;
}

export interface SensorReading {
  sensorId: string;
  timestamp: number;
  value: number;
  quality: 'good' | 'bad' | 'uncertain';
  unit: string;
}

export interface DataAcquisition {
  id: string;
  name: string;
  type: string;
  status: 'running' | 'stopped' | 'error';
  tags: string[];
  frequency: number;
  dataPoints: number;
  lastUpdate: number;
  source: string;
}

export interface EdgeDevice {
  id: string;
  name: string;
  type: string;
  location: string;
  status: 'online' | 'offline' | 'error';
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  temperature: number;
  connectedSensors: number;
  localDataSize: number;
  processingLatency: number;
  lastHeartbeat: number;
  firmwareVersion: string;
}

export interface ProtocolGateway {
  id: string;
  name: string;
  sourceProtocol: string;
  targetProtocol: string;
  status: 'running' | 'stopped' | 'error';
  connectedDevices: number;
  dataPointsPerSecond: number;
  conversionLatency: number;
  errorRate: number;
  lastUpdate: number;
  supportedProtocols: string[];
}

export interface IndustrialNetwork {
  id: string;
  name: string;
  type: string;
  topology: string;
  status: 'operational' | 'degraded' | 'down';
  bandwidth: number;
  latency: number;
  packetLoss: number;
  connectedDevices: number;
  switches: string[];
  lastUpdate: number;
}

export interface MQTTTopic {
  topic: string;
  qos: 0 | 1 | 2;
  retained: boolean;
  publishers: number;
  subscribers: number;
  messagesPerSecond: number;
  lastMessage?: SensorReading;
}

export interface OPCUAServer {
  id: string;
  name: string;
  endpoint: string;
  status: 'running' | 'stopped' | 'error';
  nodes: number;
  subscriptions: number;
  connectedClients: number;
  sessionCount: number;
  lastUpdate: number;
}

export interface DigitalTwin {
  id: string;
  name: string;
  type: string;
  physicalAssetId: string;
  status: 'active' | 'inactive' | 'syncing';
  model: string;
  properties: Record<string, unknown>;
  telemetry: Record<string, number>;
  lastSyncTime: number;
  syncInterval: number;
  dataPoints: number;
}

export interface ConditionMonitoring {
  equipmentId: string;
  parameters: Record<string, {
    currentValue: number;
    unit: string;
    minValue: number;
    maxValue: number;
    threshold: { warning: number; alarm: number; critical: number };
    trend: 'increasing' | 'decreasing' | 'stable';
    healthScore: number;
  }>;
  overallHealth: number;
  alerts: number;
  lastUpdate: number;
}

export class IndustrialIoT {
  private _sensors: Map<string, SensorNode> = new Map();
  private _readings: Map<string, SensorReading[]> = new Map();
  private _dataAcquisitions: Map<string, DataAcquisition> = new Map();
  private _edgeDevices: Map<string, EdgeDevice> = new Map();
  private _protocolGateways: Map<string, ProtocolGateway> = new Map();
  private _networks: Map<string, IndustrialNetwork> = new Map();
  private _mqttTopics: Map<string, MQTTTopic> = new Map();
  private _opcuaServers: Map<string, OPCUAServer> = new Map();
  private _digitalTwins: Map<string, DigitalTwin> = new Map();
  private _conditionMonitorings: Map<string, ConditionMonitoring> = new Map();
  private _counter = 0;
  private _stats = {
    totalSensors: 0,
    onlineSensors: 0,
    totalEdgeDevices: 0,
    onlineEdgeDevices: 0,
    totalGateways: 0,
    dataPointsPerDay: 0,
    avgLatency: 0,
    networkHealth: 0,
  };

  constructor() {
    this._initializeDefaultSensors();
    this._initializeDefaultEdgeDevices();
    this._initializeDefaultNetworks();
    this._initializeDefaultGateways();
  }

  private _initializeDefaultSensors(): void {
    const sensorDefs = [
      { id: 'sen-001', name: '温度传感器01', type: 'temperature', cat: '环境', loc: '机加工车间', eq: 'eq-001', proto: 'Modbus', rate: 1, unit: '°C' },
      { id: 'sen-002', name: '振动传感器01', type: 'vibration', cat: '设备状态', loc: '机加工车间', eq: 'eq-001', proto: 'Modbus', rate: 10, unit: 'mm/s' },
      { id: 'sen-003', name: '电流传感器01', type: 'current', cat: '电气', loc: '机加工车间', eq: 'eq-001', proto: 'Modbus', rate: 1, unit: 'A' },
      { id: 'sen-004', name: '压力传感器01', type: 'pressure', cat: '液压', loc: '冲压车间', eq: 'eq-004', proto: 'Profinet', rate: 5, unit: 'MPa' },
      { id: 'sen-005', name: '温度传感器02', type: 'temperature', cat: '环境', loc: '焊接车间', eq: 'eq-005', proto: 'MQTT', rate: 1, unit: '°C' },
      { id: 'sen-006', name: '气体传感器01', type: 'gas', cat: '安全', loc: '喷涂车间', proto: 'LoRa', rate: 0.1, unit: 'ppm' },
      { id: 'sen-007', name: '位移传感器01', type: 'displacement', cat: '精密测量', loc: '装配车间', eq: 'eq-006', proto: 'EtherCAT', rate: 100, unit: 'mm' },
      { id: 'sen-008', name: '光电传感器01', type: 'photoelectric', cat: '计数', loc: '装配车间', eq: 'eq-006', proto: 'IO-Link', rate: 10, unit: 'count' },
      { id: 'sen-009', name: '温湿度传感器01', type: 'humidity', cat: '环境', loc: '仓库', proto: 'LoRaWAN', rate: 0.2, unit: '%RH' },
      { id: 'sen-010', name: '流量计01', type: 'flow', cat: '能源', loc: '锅炉房', proto: 'Modbus', rate: 1, unit: 'm³/h' },
    ];

    for (const s of sensorDefs) {
      const sensor: SensorNode = {
        id: s.id,
        name: s.name,
        type: s.type,
        category: s.cat,
        location: s.loc,
        equipmentId: s.eq,
        status: Math.random() > 0.1 ? 'online' : 'offline',
        protocol: s.proto,
        samplingRate: s.rate,
        unit: s.unit,
        lastReading: Math.random() * 100,
        lastReadingTime: Date.now(),
        batteryLevel: s.proto.includes('LoRa') ? Math.random() * 50 + 50 : undefined,
        signalStrength: s.proto.includes('LoRa') || s.proto === 'MQTT' ? Math.random() * 30 + 60 : undefined,
        firmwareVersion: 'v2.1.0',
      };
      this._sensors.set(s.id, sensor);
      this._stats.totalSensors++;
      if (sensor.status === 'online') this._stats.onlineSensors++;

      this._generateInitialReadings(s.id);
    }
  }

  private _generateInitialReadings(sensorId: string): void {
    const readings: SensorReading[] = [];
    const now = Date.now();
    const baseValue = 50;

    for (let i = 100; i >= 0; i--) {
      readings.push({
        sensorId,
        timestamp: now - i * 60000,
        value: baseValue + (Math.random() - 0.5) * 20,
        quality: Math.random() > 0.05 ? 'good' : 'uncertain',
        unit: this._sensors.get(sensorId)?.unit || '',
      });
    }

    this._readings.set(sensorId, readings);
  }

  private _initializeDefaultEdgeDevices(): void {
    const edgeDefs = [
      { id: 'edge-001', name: '边缘网关01', type: 'gateway', loc: '机加工车间', sensors: 15 },
      { id: 'edge-002', name: '边缘计算节点01', type: 'compute', loc: '冲压车间', sensors: 10 },
      { id: 'edge-003', name: '边缘网关02', type: 'gateway', loc: '焊接车间', sensors: 8 },
      { id: 'edge-004', name: '边缘计算节点02', type: 'compute', loc: '装配车间', sensors: 12 },
    ];

    for (const e of edgeDefs) {
      const device: EdgeDevice = {
        id: e.id,
        name: e.name,
        type: e.type,
        location: e.loc,
        status: 'online',
        cpuUsage: 30 + Math.random() * 40,
        memoryUsage: 40 + Math.random() * 30,
        diskUsage: 20 + Math.random() * 20,
        temperature: 35 + Math.random() * 15,
        connectedSensors: e.sensors,
        localDataSize: Math.random() * 50 + 10,
        processingLatency: Math.random() * 50 + 10,
        lastHeartbeat: Date.now(),
        firmwareVersion: 'v3.2.1',
      };
      this._edgeDevices.set(e.id, device);
      this._stats.totalEdgeDevices++;
      this._stats.onlineEdgeDevices++;
    }
  }

  private _initializeDefaultNetworks(): void {
    const netDefs = [
      { id: 'net-001', name: '工业以太网', type: 'ethernet', topo: 'star', bw: 1000 },
      { id: 'net-002', name: 'Modbus网络', type: 'serial', topo: 'bus', bw: 1 },
      { id: 'net-003', name: 'Profinet网络', type: 'industrial', topo: 'ring', bw: 100 },
      { id: 'net-004', name: 'LoRaWAN网络', type: 'wireless', topo: 'star', bw: 0.5 },
    ];

    for (const n of netDefs) {
      const network: IndustrialNetwork = {
        id: n.id,
        name: n.name,
        type: n.type,
        topology: n.topo,
        status: 'operational',
        bandwidth: n.bw,
        latency: Math.random() * 50 + 5,
        packetLoss: Math.random() * 0.01,
        connectedDevices: Math.floor(Math.random() * 20 + 10),
        switches: ['sw-001', 'sw-002'],
        lastUpdate: Date.now(),
      };
      this._networks.set(n.id, network);
    }

    this._stats.networkHealth = 95;
    this._stats.avgLatency = 25;
  }

  private _initializeDefaultGateways(): void {
    const gwDefs = [
      { id: 'gw-001', name: 'Modbus转MQTT网关', src: 'Modbus', tgt: 'MQTT' },
      { id: 'gw-002', name: 'OPC UA网关', src: 'OPCUA', tgt: 'MQTT' },
      { id: 'gw-003', name: 'Profinet转EtherNet/IP', src: 'Profinet', tgt: 'EtherNet/IP' },
    ];

    for (const g of gwDefs) {
      const gw: ProtocolGateway = {
        id: g.id,
        name: g.name,
        sourceProtocol: g.src,
        targetProtocol: g.tgt,
        status: 'running',
        connectedDevices: Math.floor(Math.random() * 10 + 5),
        dataPointsPerSecond: Math.floor(Math.random() * 1000 + 100),
        conversionLatency: Math.random() * 20 + 5,
        errorRate: Math.random() * 0.005,
        lastUpdate: Date.now(),
        supportedProtocols: ['Modbus', 'MQTT', 'OPC UA', 'Profinet', 'EtherCAT'],
      };
      this._protocolGateways.set(g.id, gw);
      this._stats.totalGateways++;
    }
  }

  addSensor(
    name: string,
    type: string,
    category: string,
    location: string,
    protocol: string,
    samplingRate: number,
    unit: string,
    equipmentId?: string
  ): SensorNode {
    const id = `sen-${Date.now()}-${this._counter++}`;
    const sensor: SensorNode = {
      id,
      name,
      type,
      category,
      location,
      equipmentId,
      status: 'offline',
      protocol,
      samplingRate,
      unit,
      lastReading: 0,
      lastReadingTime: Date.now(),
      firmwareVersion: 'v1.0.0',
    };
    this._sensors.set(id, sensor);
    this._stats.totalSensors++;
    return sensor;
  }

  updateSensorReading(sensorId: string, value: number, quality: SensorReading['quality'] = 'good'): SensorReading | null {
    const sensor = this._sensors.get(sensorId);
    if (!sensor) return null;

    sensor.lastReading = value;
    sensor.lastReadingTime = Date.now();
    if (sensor.status === 'offline') {
      sensor.status = 'online';
      this._stats.onlineSensors++;
    }

    const reading: SensorReading = {
      sensorId,
      timestamp: Date.now(),
      value,
      quality,
      unit: sensor.unit,
    };

    const readings = this._readings.get(sensorId) || [];
    readings.push(reading);
    if (readings.length > 1000) {
      readings.splice(0, readings.length - 1000);
    }
    this._readings.set(sensorId, readings);

    this._stats.dataPointsPerDay += 1;

    return reading;
  }

  getSensorReadings(sensorId: string, startTime?: number, endTime?: number): SensorReading[] {
    const readings = this._readings.get(sensorId) || [];
    if (!startTime && !endTime) return readings;

    return readings.filter(r => {
      if (startTime && r.timestamp < startTime) return false;
      if (endTime && r.timestamp > endTime) return false;
      return true;
    });
  }

  sensorNetworkStatus(): {
    total: number;
    online: number;
    offline: number;
    fault: number;
    byType: Record<string, number>;
    byLocation: Record<string, number>;
    onlineRate: number;
    avgBatteryLevel: number;
  } {
    const sensors = Array.from(this._sensors.values());
    const online = sensors.filter(s => s.status === 'online').length;
    const offline = sensors.filter(s => s.status === 'offline').length;
    const fault = sensors.filter(s => s.status === 'fault').length;

    const byType: Record<string, number> = {};
    const byLocation: Record<string, number> = {};
    let totalBattery = 0;
    let batteryCount = 0;

    for (const s of sensors) {
      byType[s.type] = (byType[s.type] || 0) + 1;
      byLocation[s.location] = (byLocation[s.location] || 0) + 1;
      if (s.batteryLevel !== undefined) {
        totalBattery += s.batteryLevel;
        batteryCount++;
      }
    }

    return {
      total: sensors.length,
      online,
      offline,
      fault,
      byType,
      byLocation,
      onlineRate: sensors.length > 0 ? online / sensors.length : 0,
      avgBatteryLevel: batteryCount > 0 ? totalBattery / batteryCount : 0,
    };
  }

  dataAcquisition(
    name: string,
    source: string,
    tags: string[],
    frequency: number
  ): DataAcquisition {
    const id = `da-${Date.now()}-${this._counter++}`;
    const da: DataAcquisition = {
      id,
      name,
      type: 'periodic',
      status: 'running',
      tags,
      frequency,
      dataPoints: 0,
      lastUpdate: Date.now(),
      source,
    };
    this._dataAcquisitions.set(id, da);
    return da;
  }

  startDataAcquisition(daId: string): DataAcquisition | null {
    const da = this._dataAcquisitions.get(daId);
    if (!da) return null;
    da.status = 'running';
    return da;
  }

  stopDataAcquisition(daId: string): DataAcquisition | null {
    const da = this._dataAcquisitions.get(daId);
    if (!da) return null;
    da.status = 'stopped';
    return da;
  }

  addEdgeDevice(
    name: string,
    type: string,
    location: string
  ): EdgeDevice {
    const id = `edge-${Date.now()}-${this._counter++}`;
    const device: EdgeDevice = {
      id,
      name,
      type,
      location,
      status: 'offline',
      cpuUsage: 0,
      memoryUsage: 0,
      diskUsage: 0,
      temperature: 0,
      connectedSensors: 0,
      localDataSize: 0,
      processingLatency: 0,
      lastHeartbeat: Date.now(),
      firmwareVersion: 'v1.0.0',
    };
    this._edgeDevices.set(id, device);
    this._stats.totalEdgeDevices++;
    return device;
  }

  edgeComputing(
    deviceId: string,
    task: string,
    dataSize: number,
    model?: string
  ): {
    deviceId: string;
    task: string;
    model?: string;
    inputDataSize: number;
    outputDataSize: number;
    processingTime: number;
    cpuBefore: number;
    cpuAfter: number;
    memoryBefore: number;
    memoryAfter: number;
    success: boolean;
  } {
    const device = this._edgeDevices.get(deviceId);
    if (!device) {
      throw new Error(`Edge device ${deviceId} not found`);
    }

    const cpuBefore = device.cpuUsage;
    const memoryBefore = device.memoryUsage;
    const processingTime = Math.random() * 100 + 50;
    const outputDataSize = dataSize * (0.1 + Math.random() * 0.2);

    device.cpuUsage = Math.min(100, cpuBefore + Math.random() * 20);
    device.memoryUsage = Math.min(100, memoryBefore + Math.random() * 5);
    device.localDataSize += outputDataSize;
    device.processingLatency = processingTime;
    device.lastHeartbeat = Date.now();

    setTimeout(() => {
      device.cpuUsage = cpuBefore;
      device.memoryUsage = memoryBefore;
    }, 100);

    return {
      deviceId,
      task,
      model,
      inputDataSize: dataSize,
      outputDataSize,
      processingTime,
      cpuBefore,
      cpuAfter: device.cpuUsage,
      memoryBefore,
      memoryAfter: device.memoryUsage,
      success: true,
    };
  }

  edgeDeviceHealth(): {
    total: number;
    online: number;
    offline: number;
    error: number;
    avgCpuUsage: number;
    avgMemoryUsage: number;
    avgTemperature: number;
    avgLatency: number;
    devices: EdgeDevice[];
  } {
    const devices = Array.from(this._edgeDevices.values());
    const online = devices.filter(d => d.status === 'online').length;
    const offline = devices.filter(d => d.status === 'offline').length;
    const error = devices.filter(d => d.status === 'error').length;

    const avgCpu = devices.reduce((s, d) => s + d.cpuUsage, 0) / (devices.length || 1);
    const avgMem = devices.reduce((s, d) => s + d.memoryUsage, 0) / (devices.length || 1);
    const avgTemp = devices.reduce((s, d) => s + d.temperature, 0) / (devices.length || 1);
    const avgLat = devices.reduce((s, d) => s + d.processingLatency, 0) / (devices.length || 1);

    return {
      total: devices.length,
      online,
      offline,
      error,
      avgCpuUsage: avgCpu,
      avgMemoryUsage: avgMem,
      avgTemperature: avgTemp,
      avgLatency: avgLat,
      devices,
    };
  }

  protocolConversion(
    gatewayId: string,
    sourceData: Record<string, unknown>,
    sourceProtocol: string,
    targetProtocol: string
  ): {
    gatewayId: string;
    sourceProtocol: string;
    targetProtocol: string;
    inputPoints: number;
    outputPoints: number;
    conversionTime: number;
    success: boolean;
    convertedData: Record<string, unknown>;
    error?: string;
  } {
    const gw = this._protocolGateways.get(gatewayId);
    if (!gw) {
      throw new Error(`Gateway ${gatewayId} not found`);
    }

    const inputPoints = Object.keys(sourceData).length;
    const conversionTime = Math.random() * 20 + 5;
    const convertedData: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(sourceData)) {
      if (targetProtocol === 'MQTT') {
        convertedData[`${key}`] = {
          value,
          timestamp: Date.now(),
          qos: 1,
          retain: false,
        };
      } else if (targetProtocol === 'OPCUA') {
        convertedData[`ns=2;s=${key}`] = {
          Value: value,
          StatusCode: 'Good',
          SourceTimestamp: Date.now(),
        };
      } else {
        convertedData[key] = value;
      }
    }

    gw.dataPointsPerSecond = Math.floor(inputPoints / (conversionTime / 1000));
    gw.conversionLatency = conversionTime;
    gw.lastUpdate = Date.now();

    return {
      gatewayId,
      sourceProtocol,
      targetProtocol,
      inputPoints,
      outputPoints: inputPoints,
      conversionTime,
      success: true,
      convertedData,
    };
  }

  createMQTTTopic(topic: string, qos: 0 | 1 | 2 = 1, retained: boolean = false): MQTTTopic {
    const mqttTopic: MQTTTopic = {
      topic,
      qos,
      retained,
      publishers: 0,
      subscribers: 0,
      messagesPerSecond: 0,
    };
    this._mqttTopics.set(topic, mqttTopic);
    return mqttTopic;
  }

  publishMQTTMessage(topic: string, payload: unknown): boolean {
    const mqttTopic = this._mqttTopics.get(topic);
    if (!mqttTopic) return false;

    mqttTopic.messagesPerSecond++;
    mqttTopic.lastMessage = {
      sensorId: topic,
      timestamp: Date.now(),
      value: typeof payload === 'number' ? payload : 0,
      quality: 'good',
      unit: '',
    };

    return true;
  }

  createOPCUAServer(name: string, endpoint: string): OPCUAServer {
    const id = `opcua-${Date.now()}-${this._counter++}`;
    const server: OPCUAServer = {
      id,
      name,
      endpoint,
      status: 'stopped',
      nodes: 0,
      subscriptions: 0,
      connectedClients: 0,
      sessionCount: 0,
      lastUpdate: Date.now(),
    };
    this._opcuaServers.set(id, server);
    return server;
  }

  createDigitalTwin(
    name: string,
    type: string,
    physicalAssetId: string,
    model: string,
    properties: Record<string, unknown>
  ): DigitalTwin {
    const id = `dt-${Date.now()}-${this._counter++}`;
    const twin: DigitalTwin = {
      id,
      name,
      type,
      physicalAssetId,
      status: 'active',
      model,
      properties,
      telemetry: {},
      lastSyncTime: Date.now(),
      syncInterval: 1000,
      dataPoints: 0,
    };
    this._digitalTwins.set(id, twin);
    return twin;
  }

  syncDigitalTwin(twinId: string, telemetry: Record<string, number>): DigitalTwin | null {
    const twin = this._digitalTwins.get(twinId);
    if (!twin) return null;

    twin.telemetry = { ...twin.telemetry, ...telemetry };
    twin.lastSyncTime = Date.now();
    twin.dataPoints += Object.keys(telemetry).length;
    twin.status = 'active';

    return twin;
  }

  conditionMonitoring(
    equipmentId: string,
    parameters: string[]
  ): ConditionMonitoring {
    const existing = this._conditionMonitorings.get(equipmentId);
    if (existing) return existing;

    const cmParameters: ConditionMonitoring['parameters'] = {};
    let totalHealth = 0;
    let alerts = 0;

    for (const param of parameters) {
      const currentValue = Math.random() * 100;
      const warning = 70 + Math.random() * 10;
      const alarm = 85 + Math.random() * 10;
      const critical = 95;
      const healthScore = Math.max(0, 100 - (currentValue / critical) * 100);

      cmParameters[param] = {
        currentValue,
        unit: 'value',
        minValue: 0,
        maxValue: 100,
        threshold: { warning, alarm, critical },
        trend: currentValue > 50 ? 'increasing' : currentValue < 30 ? 'decreasing' : 'stable',
        healthScore,
      };

      totalHealth += healthScore;
      if (currentValue > warning) alerts++;
    }

    const overallHealth = parameters.length > 0 ? totalHealth / parameters.length : 0;

    const cm: ConditionMonitoring = {
      equipmentId,
      parameters: cmParameters,
      overallHealth,
      alerts,
      lastUpdate: Date.now(),
    };

    this._conditionMonitorings.set(equipmentId, cm);
    return cm;
  }

  networkStatus(): {
    networks: IndustrialNetwork[];
    overallHealth: number;
    avgBandwidth: number;
    avgLatency: number;
    avgPacketLoss: number;
    totalDevices: number;
    byType: Record<string, number>;
  } {
    const networks = Array.from(this._networks.values());
    const avgBw = networks.reduce((s, n) => s + n.bandwidth, 0) / (networks.length || 1);
    const avgLat = networks.reduce((s, n) => s + n.latency, 0) / (networks.length || 1);
    const avgLoss = networks.reduce((s, n) => s + n.packetLoss, 0) / (networks.length || 1);
    const totalDev = networks.reduce((s, n) => s + n.connectedDevices, 0);

    const byType: Record<string, number> = {};
    for (const n of networks) {
      byType[n.type] = (byType[n.type] || 0) + 1;
    }

    const operational = networks.filter(n => n.status === 'operational').length;
    const health = networks.length > 0 ? (operational / networks.length) * 100 : 0;

    this._stats.networkHealth = health;
    this._stats.avgLatency = avgLat;

    return {
      networks,
      overallHealth: health,
      avgBandwidth: avgBw,
      avgLatency: avgLat,
      avgPacketLoss: avgLoss,
      totalDevices: totalDev,
      byType,
    };
  }

  get sensorCount(): number {
    return this._sensors.size;
  }

  get edgeDeviceCount(): number {
    return this._edgeDevices.size;
  }

  get gatewayCount(): number {
    return this._protocolGateways.size;
  }

  get digitalTwinCount(): number {
    return this._digitalTwins.size;
  }

  get conditionMonitoringCount(): number {
    return this._conditionMonitorings.size;
  }

  get stats(): {
    totalSensors: number;
    onlineSensors: number;
    totalEdgeDevices: number;
    onlineEdgeDevices: number;
    totalGateways: number;
    dataPointsPerDay: number;
    avgLatency: number;
    networkHealth: number;
  } {
    return { ...this._stats };
  }

  getSensor(id: string): SensorNode | undefined {
    return this._sensors.get(id);
  }

  getEdgeDevice(id: string): EdgeDevice | undefined {
    return this._edgeDevices.get(id);
  }

  getGateway(id: string): ProtocolGateway | undefined {
    return this._protocolGateways.get(id);
  }

  getNetwork(id: string): IndustrialNetwork | undefined {
    return this._networks.get(id);
  }

  getDigitalTwin(id: string): DigitalTwin | undefined {
    return this._digitalTwins.get(id);
  }

  toPacket(): DataPacket<{
    sensors: number;
    edgeDevices: number;
    gateways: number;
    networks: number;
    dataAcquisitions: number;
    digitalTwins: number;
    conditionMonitorings: number;
    mqttTopics: number;
    opcuaServers: number;
    stats: {
      totalSensors: number;
      onlineSensors: number;
      totalEdgeDevices: number;
      onlineEdgeDevices: number;
      totalGateways: number;
      dataPointsPerDay: number;
      avgLatency: number;
      networkHealth: number;
    };
  }> {
    return {
      id: `iiot-${Date.now()}-${this._counter}`,
      payload: {
        sensors: this._sensors.size,
        edgeDevices: this._edgeDevices.size,
        gateways: this._protocolGateways.size,
        networks: this._networks.size,
        dataAcquisitions: this._dataAcquisitions.size,
        digitalTwins: this._digitalTwins.size,
        conditionMonitorings: this._conditionMonitorings.size,
        mqttTopics: this._mqttTopics.size,
        opcuaServers: this._opcuaServers.size,
        stats: { ...this._stats },
      },
      metadata: {
        createdAt: Date.now(),
        route: ['smart_factory', 'industrial_iot', 'result'],
        priority: 0.8,
        phase: 'iot',
      },
    };
  }

  reset(): void {
    this._sensors.clear();
    this._readings.clear();
    this._dataAcquisitions.clear();
    this._edgeDevices.clear();
    this._protocolGateways.clear();
    this._networks.clear();
    this._mqttTopics.clear();
    this._opcuaServers.clear();
    this._digitalTwins.clear();
    this._conditionMonitorings.clear();
    this._counter = 0;
    this._stats = {
      totalSensors: 0,
      onlineSensors: 0,
      totalEdgeDevices: 0,
      onlineEdgeDevices: 0,
      totalGateways: 0,
      dataPointsPerDay: 0,
      avgLatency: 0,
      networkHealth: 0,
    };
    this._initializeDefaultSensors();
    this._initializeDefaultEdgeDevices();
    this._initializeDefaultNetworks();
    this._initializeDefaultGateways();
  }
}

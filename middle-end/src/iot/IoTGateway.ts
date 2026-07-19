import { DataPacket } from '../shared/types';

export interface IoTGatewayInfo {
  readonly id: string;
  readonly devices: number;
  readonly protocols: string[];
  readonly bandwidth: number;
  readonly status: string;
}

export interface ProtocolAdapter {
  readonly source: string;
  readonly target: string;
  readonly converter: string;
  readonly enabled: boolean;
}

export class IoTGateway {
  private _gateway: IoTGatewayInfo | null = null;
  private _adapters: ProtocolAdapter[] = [];
  private _history: string[] = [];
  private _counter = 0;

  get gatewayId(): string {
    return this._gateway?.id ?? 'none';
  }

  get adapterCount(): number {
    return this._adapters.length;
  }

  get history(): string[] {
    return [...this._history];
  }

  public gatewaySetup(id: string, config: Record<string, unknown>): { id: string; config: Record<string, unknown>; status: string } {
    this._gateway = { id, devices: 0, protocols: [], bandwidth: 100, status: 'running' };
    this._recordHistory(`gatewaySetup(id=${id}) -> running`);
    return { id, config, status: 'running' };
  }

  public protocolConversion(source: string, target: string, data: string): { converted: string; source: string; target: string } {
    const converted = `converted-from-${source}-to-${target}:${data}`;
    this._adapters.push({ source, target, converter: `${source}-to-${target}`, enabled: true });
    this._recordHistory(`protocolConversion(${source} -> ${target})`);
    return { converted, source, target };
  }

  public mqttToHttp(message: string, endpoint: string): { httpRequest: string; endpoint: string; method: string } {
    const httpRequest = `POST ${endpoint} body=${message}`;
    this._recordHistory(`mqttToHttp -> ${endpoint}`);
    return { httpRequest, endpoint, method: 'POST' };
  }

  public httpToMqtt(request: string, topic: string): { mqttMessage: string; topic: string; qos: number } {
    this._recordHistory(`httpToMqtt -> topic=${topic}`);
    return { mqttMessage: request, topic, qos: 1 };
  }

  public modbusToMQTT(device: string, register: number, topic: string): { value: string; device: string; register: number; topic: string } {
    const value = Math.floor(Math.random() * 100).toString();
    this._recordHistory(`modbusToMQTT(device=${device}, reg=${register}) -> topic=${topic}`);
    return { value, device, register, topic };
  }

  public opcuaToMQTT(node: string, topic: string): { value: string; node: string; topic: string } {
    const value = Math.floor(Math.random() * 100).toString();
    this._recordHistory(`opcuaToMQTT(node=${node}) -> topic=${topic}`);
    return { value, node, topic };
  }

  public bleGateway(central: string, devices: string[], services: string[]): { central: string; devices: number; services: string[]; connected: boolean } {
    this._recordHistory(`bleGateway(central=${central}, devices=${devices.length})`);
    return { central, devices: devices.length, services, connected: true };
  }

  public zigbeeGateway(coordinator: string, devices: string[]): { coordinator: string; devices: number; network: string; joined: number } {
    const joined = devices.length;
    this._recordHistory(`zigbeeGateway(coordinator=${coordinator}, devices=${devices.length})`);
    return { coordinator, devices: devices.length, network: 'zigbee-net', joined };
  }

  public edgeProcessing(gateway: string, data: string, model: string): { result: string; gateway: string; model: string; latency: number } {
    const latency = Math.floor(Math.random() * 50) + 10;
    this._recordHistory(`edgeProcessing(gateway=${gateway}, model=${model}) -> latency=${latency}ms`);
    return { result: 'processed', gateway, model, latency };
  }

  public deviceManagement(gateway: string, devices: string[]): { gateway: string; devices: number; managed: number; online: number } {
    const online = Math.floor(devices.length * 0.9);
    this._recordHistory(`deviceManagement(gateway=${gateway}, devices=${devices.length}) -> online=${online}`);
    return { gateway, devices: devices.length, managed: devices.length, online };
  }

  public protocolTranslation(sourceProtocol: string, targetProtocol: string, payload: string): { translated: string; source: string; target: string } {
    const translated = `[${targetProtocol}] ${payload}`;
    this._recordHistory(`protocolTranslation(${sourceProtocol} -> ${targetProtocol})`);
    return { translated, source: sourceProtocol, target: targetProtocol };
  }

  public offlineBuffering(gateway: string, data: string[], maxSize: number): { buffer: string[]; maxSize: number; currentSize: number; overflow: number } {
    const currentSize = Math.min(data.length, maxSize);
    const buffer = data.slice(0, currentSize);
    const overflow = data.length - currentSize;
    this._recordHistory(`offlineBuffering(gateway=${gateway}, maxSize=${maxSize}) -> buffer=${currentSize}, overflow=${overflow}`);
    return { buffer, maxSize, currentSize, overflow };
  }

  public edgeComputing(gateway: string, func: string, data: string): { result: string; gateway: string; function: string; executionTime: number } {
    const executionTime = Math.floor(Math.random() * 100) + 10;
    this._recordHistory(`edgeComputing(gateway=${gateway}, func=${func}) -> ${executionTime}ms`);
    return { result: 'computed', gateway, function: func, executionTime };
  }

  public toPacket(): DataPacket<{
    gateway: string;
    adapters: number;
    history: string[];
  }> {
    return {
      id: `iot-gateway-${Date.now()}-${this._counter}`,
      payload: {
        gateway: this._gateway?.id ?? 'none',
        adapters: this._adapters.length,
        history: [...this._history],
      },
      metadata: {
        createdAt: Date.now(),
        route: ['iot', 'gateway', 'result'],
        priority: 0.75,
        phase: 'bridging',
      },
    };
  }

  public reset(): void {
    this._gateway = null;
    this._adapters = [];
    this._history = [];
    this._counter = 0;
  }

  private _recordHistory(entry: string): void {
    this._counter++;
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }
}

import { DataPacket } from '../shared/types';

export interface IoTGatewayInfo {
  readonly id: string;
  readonly devices: number;
  readonly protocols: string[];
  readonly bandwidth: number;
  readonly status: 'online' | 'offline' | 'degraded' | 'maintenance';
  readonly region: string;
  readonly firmwareVersion: string;
}

export interface ProtocolAdapter {
  readonly source: string;
  readonly target: string;
  readonly converter: string;
  readonly enabled: boolean;
  readonly throughput: number;
}

export interface GatewayRoute {
  readonly routeId: string;
  readonly sourceTopic: string;
  readonly targetEndpoint: string;
  readonly filter: string;
  readonly qos: 0 | 1 | 2;
}

export interface DeviceSession {
  readonly deviceId: string;
  readonly connectedAt: number;
  readonly lastSeen: number;
  readonly bytesTransferred: number;
  readonly connectionType: 'mqtt' | 'coap' | 'http' | 'websocket';
}

export interface ProtocolBridge {
  readonly bridgeId: string;
  readonly ingressProtocol: string;
  readonly egressProtocol: string;
  readonly transformation: 'none' | 'json' | 'protobuf' | 'avro';
  readonly active: boolean;
}

export class IoTGateway {
  private _gateway: IoTGatewayInfo | null = null;
  private _adapters: ProtocolAdapter[] = [];
  private _history: string[] = [];
  private _counter = 0;
  private _routes: Map<string, GatewayRoute> = new Map();
  private _sessions: Map<string, DeviceSession> = new Map();
  private _bridges: Map<string, ProtocolBridge> = new Map();
  private _rateLimiters: Map<string, { maxRequests: number; windowMs: number; current: number }> = new Map();
  private _aggregatedBuffers: Map<string, { data: unknown[]; lastFlush: number; size: number }> = new Map();
  private _healthChecks: Map<string, { lastCheck: number; status: 'healthy' | 'unhealthy' | 'unknown'; latency: number }> = new Map();

  get gatewayId(): string {
    return this._gateway?.id ?? 'none';
  }

  get adapterCount(): number {
    return this._adapters.length;
  }

  get history(): string[] {
    return [...this._history];
  }

  get routeCount(): number {
    return this._routes.size;
  }

  get sessionCount(): number {
    return this._sessions.size;
  }

  get bridgeCount(): number {
    return this._bridges.size;
  }

  get activeDeviceCount(): number {
    return Array.from(this._sessions.values()).filter(s => Date.now() - s.lastSeen < 300000).length;
  }

  public gatewaySetup(id: string, config: Record<string, unknown>): { id: string; config: Record<string, unknown>; status: string; initializedAt: number } {
    this._gateway = { id, devices: 0, protocols: [], bandwidth: 100, status: 'online', region: 'default', firmwareVersion: '1.0.0' };
    this._recordHistory(`gatewaySetup(id=${id}) -> running`);
    return { id, config, status: 'online', initializedAt: Date.now() };
  }

  public protocolConversion(source: string, target: string, data: string): { converted: string; source: string; target: string; converter: string; latency: number } {
    const converted = `converted-from-${source}-to-${target}:${data}`;
    this._adapters.push({ source, target, converter: `${source}-to-${target}`, enabled: true, throughput: 1000 });
    this._recordHistory(`protocolConversion(${source} -> ${target})`);
    return { converted, source, target, converter: `${source}-to-${target}`, latency: 5 };
  }

  public mqttToHttp(message: string, endpoint: string): { httpRequest: string; endpoint: string; method: string; headers: Record<string, string> } {
    const httpRequest = `POST ${endpoint} body=${message}`;
    this._recordHistory(`mqttToHttp -> ${endpoint}`);
    return { httpRequest, endpoint, method: 'POST', headers: { 'Content-Type': 'application/json' } };
  }

  public httpToMqtt(request: string, topic: string): { mqttMessage: string; topic: string; qos: number; retain: boolean } {
    this._recordHistory(`httpToMqtt -> topic=${topic}`);
    return { mqttMessage: request, topic, qos: 1, retain: false };
  }

  public modbusToMQTT(device: string, register: number, topic: string): { value: string; device: string; register: number; topic: string; timestamp: number } {
    const value = Math.floor(Math.random() * 100).toString();
    this._recordHistory(`modbusToMQTT(device=${device}, reg=${register}) -> topic=${topic}`);
    return { value, device, register, topic, timestamp: Date.now() };
  }

  public opcuaToMQTT(node: string, topic: string): { value: string; node: string; topic: string; dataType: string } {
    const value = Math.floor(Math.random() * 100).toString();
    this._recordHistory(`opcuaToMQTT(node=${node}) -> topic=${topic}`);
    return { value, node, topic, dataType: 'Double' };
  }

  public bleGateway(central: string, devices: string[], services: string[]): { central: string; devices: number; services: string[]; connected: boolean; rssi: number } {
    const rssi = -50 - Math.floor(Math.random() * 40);
    this._recordHistory(`bleGateway(central=${central}, devices=${devices.length})`);
    return { central, devices: devices.length, services, connected: true, rssi };
  }

  public zigbeeGateway(coordinator: string, devices: string[]): { coordinator: string; devices: number; network: string; joined: number; panId: string } {
    const joined = devices.length;
    this._recordHistory(`zigbeeGateway(coordinator=${coordinator}, devices=${devices.length})`);
    return { coordinator, devices: devices.length, network: 'zigbee-net', joined, panId: '0x1A62' };
  }

  public lorawanGateway(gatewayEui: string, endDevices: string[]): { gatewayEui: string; endDevices: number; spreadingFactor: number; frequency: number; receivedPackets: number } {
    const spreadingFactor = 7 + Math.floor(Math.random() * 6);
    const frequency = 868.1 + Math.random() * 1.6;
    const receivedPackets = endDevices.length * 10;
    this._recordHistory(`lorawanGateway(eui=${gatewayEui}, devices=${endDevices.length})`);
    return { gatewayEui, endDevices: endDevices.length, spreadingFactor, frequency, receivedPackets };
  }

  public edgeProcessing(gateway: string, data: string, model: string): { result: string; gateway: string; model: string; latency: number; confidence: number } {
    const latency = Math.floor(Math.random() * 50) + 10;
    const confidence = 0.85 + Math.random() * 0.1;
    this._recordHistory(`edgeProcessing(gateway=${gateway}, model=${model}) -> latency=${latency}ms`);
    return { result: 'processed', gateway, model, latency, confidence };
  }

  public deviceManagement(gateway: string, devices: string[]): { gateway: string; devices: number; managed: number; online: number; offline: number } {
    const online = Math.floor(devices.length * 0.9);
    const offline = devices.length - online;
    this._recordHistory(`deviceManagement(gateway=${gateway}, devices=${devices.length}) -> online=${online}`);
    return { gateway, devices: devices.length, managed: devices.length, online, offline };
  }

  public protocolTranslation(sourceProtocol: string, targetProtocol: string, payload: string): { translated: string; source: string; target: string; payloadSize: number; overhead: number } {
    const translated = `[${targetProtocol}] ${payload}`;
    const overhead = translated.length - payload.length;
    this._recordHistory(`protocolTranslation(${sourceProtocol} -> ${targetProtocol})`);
    return { translated, source: sourceProtocol, target: targetProtocol, payloadSize: payload.length, overhead };
  }

  public offlineBuffering(gateway: string, data: string[], maxSize: number): { buffer: string[]; maxSize: number; currentSize: number; overflow: number; oldestEntry: number } {
    const currentSize = Math.min(data.length, maxSize);
    const buffer = data.slice(0, currentSize);
    const overflow = data.length - currentSize;
    const oldestEntry = Date.now() - 3600000;
    this._recordHistory(`offlineBuffering(gateway=${gateway}, maxSize=${maxSize}) -> buffer=${currentSize}, overflow=${overflow}`);
    return { buffer, maxSize, currentSize, overflow, oldestEntry };
  }

  public edgeComputing(gateway: string, func: string, data: string): { result: string; gateway: string; function: string; executionTime: number; memoryUsed: number } {
    const executionTime = Math.floor(Math.random() * 100) + 10;
    const memoryUsed = 16 + Math.floor(Math.random() * 240);
    this._recordHistory(`edgeComputing(gateway=${gateway}, func=${func}) -> ${executionTime}ms`);
    return { result: 'computed', gateway, function: func, executionTime, memoryUsed };
  }

  public addRoute(routeId: string, sourceTopic: string, targetEndpoint: string, filter: string, qos: 0 | 1 | 2): { added: boolean; route: GatewayRoute; duplicates: number } {
    const route: GatewayRoute = { routeId, sourceTopic, targetEndpoint, filter, qos };
    this._routes.set(routeId, route);
    this._recordHistory(`addRoute(id=${routeId}, ${sourceTopic} -> ${targetEndpoint})`);
    return { added: true, route, duplicates: 0 };
  }

  public removeRoute(routeId: string): { removed: boolean; routeId: string; remaining: number } {
    const removed = this._routes.delete(routeId);
    this._recordHistory(`removeRoute(id=${routeId}) -> ${removed}`);
    return { removed, routeId, remaining: this._routes.size };
  }

  public registerSession(deviceId: string, connectionType: 'mqtt' | 'coap' | 'http' | 'websocket'): { registered: boolean; session: DeviceSession; sessionId: string } {
    const session: DeviceSession = { deviceId, connectedAt: Date.now(), lastSeen: Date.now(), bytesTransferred: 0, connectionType };
    this._sessions.set(deviceId, session);
    const sessionId = `sess-${deviceId}-${Date.now()}`;
    this._recordHistory(`registerSession(device=${deviceId}, type=${connectionType})`);
    return { registered: true, session, sessionId };
  }

  public updateSessionActivity(deviceId: string, bytesTransferred: number): { updated: boolean; deviceId: string; totalBytes: number; idleTime: number } {
    const session = this._sessions.get(deviceId);
    if (session) {
      this._sessions.set(deviceId, { ...session, lastSeen: Date.now(), bytesTransferred: session.bytesTransferred + bytesTransferred });
    }
    const totalBytes = session?.bytesTransferred ?? 0;
    const idleTime = session ? Date.now() - session.lastSeen : 0;
    this._recordHistory(`updateSessionActivity(device=${deviceId}, bytes=${bytesTransferred})`);
    return { updated: !!session, deviceId, totalBytes, idleTime };
  }

  public configureBridge(bridgeId: string, ingressProtocol: string, egressProtocol: string, transformation: 'none' | 'json' | 'protobuf' | 'avro'): { configured: boolean; bridge: ProtocolBridge } {
    const bridge: ProtocolBridge = { bridgeId, ingressProtocol, egressProtocol, transformation, active: true };
    this._bridges.set(bridgeId, bridge);
    this._recordHistory(`configureBridge(id=${bridgeId}, ${ingressProtocol} -> ${egressProtocol})`);
    return { configured: true, bridge };
  }

  public loadBalancing(endpoints: string[], strategy: 'round-robin' | 'least-connections' | 'weighted'): { selected: string; strategy: string; endpointLoad: Record<string, number>; healthy: number } {
    const healthy = endpoints.length;
    const endpointLoad: Record<string, number> = {};
    for (const ep of endpoints) {
      endpointLoad[ep] = Math.floor(Math.random() * 100);
    }
    const selected = strategy === 'least-connections'
      ? endpoints.reduce((a, b) => (endpointLoad[a] ?? 0) < (endpointLoad[b] ?? 0) ? a : b)
      : endpoints[Math.floor(Math.random() * endpoints.length)] ?? '';
    this._recordHistory(`loadBalancing(endpoints=${endpoints.length}, strategy=${strategy}) -> ${selected}`);
    return { selected, strategy, endpointLoad, healthy };
  }

  public healthCheck(nodeId: string): { healthy: boolean; nodeId: string; latency: number; checks: string[]; lastError: string | null } {
    const latency = 5 + Math.floor(Math.random() * 50);
    const healthy = Math.random() > 0.1;
    const checks = ['connectivity', 'protocol', 'auth'];
    const lastError = healthy ? null : 'connection-timeout';
    this._healthChecks.set(nodeId, { lastCheck: Date.now(), status: healthy ? 'healthy' : 'unhealthy', latency });
    this._recordHistory(`healthCheck(node=${nodeId}) -> healthy=${healthy}`);
    return { healthy, nodeId, latency, checks, lastError };
  }

  public rateLimiting(clientId: string, maxRequests: number, windowMs: number): { allowed: boolean; clientId: string; remaining: number; resetTime: number; current: number } {
    const limiter = this._rateLimiters.get(clientId) ?? { maxRequests, windowMs, current: 0 };
    const allowed = limiter.current < maxRequests;
    const current = allowed ? limiter.current + 1 : limiter.current;
    this._rateLimiters.set(clientId, { ...limiter, current });
    const resetTime = Date.now() + windowMs;
    this._recordHistory(`rateLimiting(client=${clientId}, max=${maxRequests}) -> allowed=${allowed}`);
    return { allowed, clientId, remaining: maxRequests - current, resetTime, current };
  }

  public dataAggregation(deviceId: string, data: unknown[], flushSize: number): { aggregated: unknown[]; flushed: boolean; buffered: number; deviceId: string } {
    const buffer = this._aggregatedBuffers.get(deviceId) ?? { data: [], lastFlush: Date.now(), size: 0 };
    const combined = [...buffer.data, ...data];
    const flushed = combined.length >= flushSize;
    const remaining = flushed ? combined.slice(flushSize) : combined;
    this._aggregatedBuffers.set(deviceId, { data: remaining, lastFlush: flushed ? Date.now() : buffer.lastFlush, size: remaining.length });
    this._recordHistory(`dataAggregation(device=${deviceId}, data=${data.length}) -> flushed=${flushed}`);
    return { aggregated: combined.slice(0, flushSize), flushed, buffered: remaining.length, deviceId };
  }

  public ruleEngine(topic: string, condition: string, action: string): { triggered: boolean; topic: string; condition: string; action: string; matches: number } {
    const triggered = Math.random() > 0.5;
    const matches = triggered ? Math.floor(Math.random() * 10) + 1 : 0;
    this._recordHistory(`ruleEngine(topic=${topic}, condition=${condition}) -> triggered=${triggered}`);
    return { triggered, topic, condition, action, matches };
  }

  public getGatewayStats(): { routes: number; sessions: number; bridges: number; rateLimiters: number; buffers: number; healthChecks: number; overallStatus: string } {
    const unhealthy = Array.from(this._healthChecks.values()).filter(h => h.status === 'unhealthy').length;
    const overallStatus = unhealthy > 0 ? 'degraded' : 'healthy';
    this._recordHistory(`getGatewayStats() -> routes=${this._routes.size}, sessions=${this._sessions.size}`);
    return {
      routes: this._routes.size,
      sessions: this._sessions.size,
      bridges: this._bridges.size,
      rateLimiters: this._rateLimiters.size,
      buffers: this._aggregatedBuffers.size,
      healthChecks: this._healthChecks.size,
      overallStatus,
    };
  }

  public disconnectAll(): { disconnected: number; reason: string } {
    const count = this._sessions.size;
    this._sessions.clear();
    this._recordHistory(`disconnectAll() -> ${count} sessions cleared`);
    return { disconnected: count, reason: 'gateway-shutdown' };
  }

  public toPacket(): DataPacket<{
    gateway: string;
    adapters: number;
    routes: number;
    sessions: number;
    bridges: number;
    activeDevices: number;
    history: string[];
  }> {
    return {
      id: `iot-gateway-${Date.now()}-${this._counter}`,
      payload: {
        gateway: this._gateway?.id ?? 'none',
        adapters: this._adapters.length,
        routes: this._routes.size,
        sessions: this._sessions.size,
        bridges: this._bridges.size,
        activeDevices: this.activeDeviceCount,
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
    this._routes.clear();
    this._sessions.clear();
    this._bridges.clear();
    this._rateLimiters.clear();
    this._aggregatedBuffers.clear();
    this._healthChecks.clear();
  }

  private _recordHistory(entry: string): void {
    this._counter++;
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }
}

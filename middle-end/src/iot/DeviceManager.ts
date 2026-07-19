import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error';
  readonly capabilities: string[];
  readonly lastSeen: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now() };
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number {
    return this._devices.size;
  }

  get registryCount(): number {
    return this._registry.count;
  }

  get history(): string[] {
    return [...this._history];
  }

  public registerDevice(id: string, type: string, capabilities: string[]): { device: IoTDevice; registered: boolean; id: string } {
    const device: IoTDevice = { id, type, status: 'online', capabilities, lastSeen: Date.now() };
    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.updatedAt = Date.now();
    this._recordHistory(`registerDevice(id=${id}, type=${type})`);
    return { device, registered: true, id };
  }

  public unregisterDevice(id: string): { id: string; unregistered: boolean; removed: boolean } {
    const removed = this._devices.has(id);
    this._devices.delete(id);
    this._registry.devices.delete(id);
    if (removed) this._registry.count--;
    this._registry.updatedAt = Date.now();
    this._recordHistory(`unregisterDevice(id=${id}) -> ${removed}`);
    return { id, unregistered: removed, removed };
  }

  public updateDeviceStatus(id: string, status: IoTDevice['status'], properties: Record<string, unknown>): { id: string; status: string; updated: boolean; properties: Record<string, unknown> } {
    const device = this._devices.get(id);
    const updated = !!device;
    if (device) {
      const updatedDevice: IoTDevice = { ...device, status, lastSeen: Date.now() };
      this._devices.set(id, updatedDevice);
      this._registry.devices.set(id, updatedDevice);
    }
    this._recordHistory(`updateDeviceStatus(id=${id}, status=${status})`);
    return { id, status, updated, properties };
  }

  public deviceList(filter: string | null, pagination: { page: number; pageSize: number }): { devices: IoTDevice[]; total: number; page: number; pageSize: number } {
    const all = Array.from(this._devices.values());
    const filtered = filter ? all.filter(d => d.type.includes(filter) || d.id.includes(filter)) : all;
    const start = (pagination.page - 1) * pagination.pageSize;
    const devices = filtered.slice(start, start + pagination.pageSize);
    this._recordHistory(`deviceList(filter=${filter ?? 'none'}, page=${pagination.page}) -> ${devices.length} results`);
    return { devices, total: filtered.length, page: pagination.page, pageSize: pagination.pageSize };
  }

  public deviceSearch(query: string, criteria: string[]): { results: IoTDevice[]; query: string; criteria: string[]; count: number } {
    const results = Array.from(this._devices.values()).filter(d =>
      criteria.some(c => d.id.includes(query) || d.type.includes(query) || d.capabilities.includes(c))
    );
    this._recordHistory(`deviceSearch(query=${query}, criteria=${criteria.length}) -> ${results.length} results`);
    return { results, query, criteria, count: results.length };
  }

  public deviceProvisioning(device: string, method: string): { device: string; method: string; provisioned: boolean; status: string } {
    this._recordHistory(`deviceProvisioning(device=${device}, method=${method})`);
    return { device, method, provisioned: true, status: 'provisioned' };
  }

  public zeroTouchProvision(devices: string[], server: string): { devices: number; server: string; provisioned: number; failed: number } {
    const provisioned = Math.floor(devices.length * 0.95);
    const failed = devices.length - provisioned;
    this._recordHistory(`zeroTouchProvision(devices=${devices.length}, server=${server}) -> provisioned=${provisioned}`);
    return { devices: devices.length, server, provisioned, failed };
  }

  public deviceShadow(device: string, desired: Record<string, unknown>, reported: Record<string, unknown>): { device: string; desired: Record<string, unknown>; reported: Record<string, unknown>; delta: Record<string, unknown> } {
    const delta: Record<string, unknown> = {};
    for (const key of Object.keys(desired)) {
      if (desired[key] !== reported[key]) {
        delta[key] = desired[key];
      }
    }
    this._recordHistory(`deviceShadow(device=${device}) -> delta=${Object.keys(delta).length} changes`);
    return { device, desired, reported, delta };
  }

  public deviceConfiguration(id: string, config: Record<string, unknown>): { id: string; config: Record<string, unknown>; applied: boolean; version: number } {
    this._recordHistory(`deviceConfiguration(id=${id}) -> applied`);
    return { id, config, applied: true, version: this._counter };
  }

  public firmwareUpdate(id: string, firmware: string): { id: string; firmware: string; status: string; progress: number } {
    const progress = Math.floor(Math.random() * 100);
    const status = progress === 100 ? 'completed' : progress > 0 ? 'in-progress' : 'pending';
    this._recordHistory(`firmwareUpdate(id=${id}, firmware=${firmware}) -> ${status} (${progress}%)`);
    return { id, firmware, status, progress };
  }

  public otaUpdate(device: string, image: string, method: string): { device: string; image: string; method: string; status: string } {
    this._recordHistory(`otaUpdate(device=${device}, image=${image}, method=${method})`);
    return { device, image, method, status: 'downloading' };
  }

  public deviceHealth(id: string, metrics: { cpu: number; memory: number; temperature: number }): { id: string; healthy: boolean; metrics: { cpu: number; memory: number; temperature: number } } {
    const healthy = metrics.cpu < 90 && metrics.memory < 90 && metrics.temperature < 80;
    this._recordHistory(`deviceHealth(id=${id}) -> healthy=${healthy}`);
    return { id, healthy, metrics };
  }

  public deviceHeartbeat(device: string, interval: number): { device: string; interval: number; online: boolean; lastBeat: number } {
    const online = Math.random() > 0.1;
    const lastBeat = Date.now();
    this._recordHistory(`deviceHeartbeat(device=${device}, interval=${interval}s) -> online=${online}`);
    return { device, interval, online, lastBeat };
  }

  public deviceTwin(device: string, state: Record<string, unknown>): { device: string; state: Record<string, unknown>; version: number; synced: boolean } {
    this._recordHistory(`deviceTwin(device=${device})`);
    return { device, state, version: this._counter, synced: Math.random() > 0.05 };
  }

  public toPacket(): DataPacket<{
    devices: number;
    registryCount: number;
    history: string[];
  }> {
    return {
      id: `device-mgr-${Date.now()}-${this._counter}`,
      payload: {
        devices: this._devices.size,
        registryCount: this._registry.count,
        history: [...this._history],
      },
      metadata: {
        createdAt: Date.now(),
        route: ['iot', 'device_manager', 'result'],
        priority: 0.75,
        phase: 'management',
      },
    };
  }

  public reset(): void {
    this._devices.clear();
    this._registry = { devices: new Map(), count: 0, updatedAt: Date.now() };
    this._history = [];
    this._counter = 0;
  }

  private _recordHistory(entry: string): void {
    this._counter++;
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }
}

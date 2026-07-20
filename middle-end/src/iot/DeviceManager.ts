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
import { DataPacket } from '../shared/typesimport { DataPacket } from '../shared/types';

export interface IoTDevice {
import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type:import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online'import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle'import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' |import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities:import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen:import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string,import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonlyimport { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersionimport { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonlyimport { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly nameimport { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[]import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

exportimport { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: stringimport { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'errorimport { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' |import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceIdimport { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<stringimport { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta:import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly versionimport { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonlyimport { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId:import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending'import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing'import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceimport { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devicesimport { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = newimport { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistryimport { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count:import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCountimport { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadowimport { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfoimport { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configimport { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[]import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter =import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number {import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number {import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.sizeimport { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number {import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  getimport { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._historyimport { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: stringimport { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { latimport { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { deviceimport { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; idimport { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordimport { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> alreadyimport { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: thisimport { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false,import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device:import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen:import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: 'import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0',
    };

    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.onlineCount++;
    thisimport { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0',
    };

    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.onlineCount++;
    this._registry.updatedAt = Date.now();

import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0',
    };

    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.onlineCount++;
    this._registry.updatedAt = Date.now();

    this._shadows.set(id, {
import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0',
    };

    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.onlineCount++;
    this._registry.updatedAt = Date.now();

    this._shadows.set(id, {
      deviceId: id,
      desired: {},
      reported: {},
      delta:import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0',
    };

    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.onlineCount++;
    this._registry.updatedAt = Date.now();

    this._shadows.set(id, {
      deviceId: id,
      desired: {},
      reported: {},
      delta: {},
      version: 1,
      timestamp: Date.now(),
    });

import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0',
    };

    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.onlineCount++;
    this._registry.updatedAt = Date.now();

    this._shadows.set(id, {
      deviceId: id,
      desired: {},
      reported: {},
      delta: {},
      version: 1,
      timestamp: Date.now(),
    });

    this._recordHistory(`registerDevice(id=${id}, type=${type}, capabilities=${capabilities.lengthimport { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0',
    };

    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.onlineCount++;
    this._registry.updatedAt = Date.now();

    this._shadows.set(id, {
      deviceId: id,
      desired: {},
      reported: {},
      delta: {},
      version: 1,
      timestamp: Date.now(),
    });

    this._recordHistory(`registerDevice(id=${id}, type=${type}, capabilities=${capabilities.length})`);
    return { device, registered: true, id };
  }

import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0',
    };

    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.onlineCount++;
    this._registry.updatedAt = Date.now();

    this._shadows.set(id, {
      deviceId: id,
      desired: {},
      reported: {},
      delta: {},
      version: 1,
      timestamp: Date.now(),
    });

    this._recordHistory(`registerDevice(id=${id}, type=${type}, capabilities=${capabilities.length})`);
    return { device, registered: true, id };
  }

  public bulkRegister(devices: { id: string; type: string; capabilities: string[] }[]): { registered: number; skipped: numberimport { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0',
    };

    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.onlineCount++;
    this._registry.updatedAt = Date.now();

    this._shadows.set(id, {
      deviceId: id,
      desired: {},
      reported: {},
      delta: {},
      version: 1,
      timestamp: Date.now(),
    });

    this._recordHistory(`registerDevice(id=${id}, type=${type}, capabilities=${capabilities.length})`);
    return { device, registered: true, id };
  }

  public bulkRegister(devices: { id: string; type: string; capabilities: string[] }[]): { registered: number; skipped: number; devices: IoTDevice[] } {
import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0',
    };

    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.onlineCount++;
    this._registry.updatedAt = Date.now();

    this._shadows.set(id, {
      deviceId: id,
      desired: {},
      reported: {},
      delta: {},
      version: 1,
      timestamp: Date.now(),
    });

    this._recordHistory(`registerDevice(id=${id}, type=${type}, capabilities=${capabilities.length})`);
    return { device, registered: true, id };
  }

  public bulkRegister(devices: { id: string; type: string; capabilities: string[] }[]): { registered: number; skipped: number; devices: IoTDevice[] } {
    const registeredDevices: IoTDevice[] =import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0',
    };

    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.onlineCount++;
    this._registry.updatedAt = Date.now();

    this._shadows.set(id, {
      deviceId: id,
      desired: {},
      reported: {},
      delta: {},
      version: 1,
      timestamp: Date.now(),
    });

    this._recordHistory(`registerDevice(id=${id}, type=${type}, capabilities=${capabilities.length})`);
    return { device, registered: true, id };
  }

  public bulkRegister(devices: { id: string; type: string; capabilities: string[] }[]): { registered: number; skipped: number; devices: IoTDevice[] } {
    const registeredDevices: IoTDevice[] = [];
    let registered = 0;
    let skipped = 0;

    for (const device of devices) {
      const result = this.registerDevice(device.id, deviceimport { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0',
    };

    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.onlineCount++;
    this._registry.updatedAt = Date.now();

    this._shadows.set(id, {
      deviceId: id,
      desired: {},
      reported: {},
      delta: {},
      version: 1,
      timestamp: Date.now(),
    });

    this._recordHistory(`registerDevice(id=${id}, type=${type}, capabilities=${capabilities.length})`);
    return { device, registered: true, id };
  }

  public bulkRegister(devices: { id: string; type: string; capabilities: string[] }[]): { registered: number; skipped: number; devices: IoTDevice[] } {
    const registeredDevices: IoTDevice[] = [];
    let registered = 0;
    let skipped = 0;

    for (const device of devices) {
      const result = this.registerDevice(device.id, device.type, device.capabilities);
      if (result.registered) {
        registered++;
        registeredDevices.push(result.device);
      } else {
        skipped++;
      }
import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0',
    };

    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.onlineCount++;
    this._registry.updatedAt = Date.now();

    this._shadows.set(id, {
      deviceId: id,
      desired: {},
      reported: {},
      delta: {},
      version: 1,
      timestamp: Date.now(),
    });

    this._recordHistory(`registerDevice(id=${id}, type=${type}, capabilities=${capabilities.length})`);
    return { device, registered: true, id };
  }

  public bulkRegister(devices: { id: string; type: string; capabilities: string[] }[]): { registered: number; skipped: number; devices: IoTDevice[] } {
    const registeredDevices: IoTDevice[] = [];
    let registered = 0;
    let skipped = 0;

    for (const device of devices) {
      const result = this.registerDevice(device.id, device.type, device.capabilities);
      if (result.registered) {
        registered++;
        registeredDevices.push(result.device);
      } else {
        skipped++;
      }
    }

    this._recordHistory(`bulkRegister(devices=${devices.length}) -> registeredimport { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0',
    };

    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.onlineCount++;
    this._registry.updatedAt = Date.now();

    this._shadows.set(id, {
      deviceId: id,
      desired: {},
      reported: {},
      delta: {},
      version: 1,
      timestamp: Date.now(),
    });

    this._recordHistory(`registerDevice(id=${id}, type=${type}, capabilities=${capabilities.length})`);
    return { device, registered: true, id };
  }

  public bulkRegister(devices: { id: string; type: string; capabilities: string[] }[]): { registered: number; skipped: number; devices: IoTDevice[] } {
    const registeredDevices: IoTDevice[] = [];
    let registered = 0;
    let skipped = 0;

    for (const device of devices) {
      const result = this.registerDevice(device.id, device.type, device.capabilities);
      if (result.registered) {
        registered++;
        registeredDevices.push(result.device);
      } else {
        skipped++;
      }
    }

    this._recordHistory(`bulkRegister(devices=${devices.length}) -> registered=${registered}, skipped=${skipped}`);
import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0',
    };

    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.onlineCount++;
    this._registry.updatedAt = Date.now();

    this._shadows.set(id, {
      deviceId: id,
      desired: {},
      reported: {},
      delta: {},
      version: 1,
      timestamp: Date.now(),
    });

    this._recordHistory(`registerDevice(id=${id}, type=${type}, capabilities=${capabilities.length})`);
    return { device, registered: true, id };
  }

  public bulkRegister(devices: { id: string; type: string; capabilities: string[] }[]): { registered: number; skipped: number; devices: IoTDevice[] } {
    const registeredDevices: IoTDevice[] = [];
    let registered = 0;
    let skipped = 0;

    for (const device of devices) {
      const result = this.registerDevice(device.id, device.type, device.capabilities);
      if (result.registered) {
        registered++;
        registeredDevices.push(result.device);
      } else {
        skipped++;
      }
    }

    this._recordHistory(`bulkRegister(devices=${devices.length}) -> registered=${registered}, skipped=${skipped}`);
    return { registered, skipped, devices: registeredDevices };
  }

  public unregisterDevice(id: string): { id: string;import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0',
    };

    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.onlineCount++;
    this._registry.updatedAt = Date.now();

    this._shadows.set(id, {
      deviceId: id,
      desired: {},
      reported: {},
      delta: {},
      version: 1,
      timestamp: Date.now(),
    });

    this._recordHistory(`registerDevice(id=${id}, type=${type}, capabilities=${capabilities.length})`);
    return { device, registered: true, id };
  }

  public bulkRegister(devices: { id: string; type: string; capabilities: string[] }[]): { registered: number; skipped: number; devices: IoTDevice[] } {
    const registeredDevices: IoTDevice[] = [];
    let registered = 0;
    let skipped = 0;

    for (const device of devices) {
      const result = this.registerDevice(device.id, device.type, device.capabilities);
      if (result.registered) {
        registered++;
        registeredDevices.push(result.device);
      } else {
        skipped++;
      }
    }

    this._recordHistory(`bulkRegister(devices=${devices.length}) -> registered=${registered}, skipped=${skipped}`);
    return { registered, skipped, devices: registeredDevices };
  }

  public unregisterDevice(id: string): { id: string; unregistered: boolean; removed: boolean } {import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0',
    };

    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.onlineCount++;
    this._registry.updatedAt = Date.now();

    this._shadows.set(id, {
      deviceId: id,
      desired: {},
      reported: {},
      delta: {},
      version: 1,
      timestamp: Date.now(),
    });

    this._recordHistory(`registerDevice(id=${id}, type=${type}, capabilities=${capabilities.length})`);
    return { device, registered: true, id };
  }

  public bulkRegister(devices: { id: string; type: string; capabilities: string[] }[]): { registered: number; skipped: number; devices: IoTDevice[] } {
    const registeredDevices: IoTDevice[] = [];
    let registered = 0;
    let skipped = 0;

    for (const device of devices) {
      const result = this.registerDevice(device.id, device.type, device.capabilities);
      if (result.registered) {
        registered++;
        registeredDevices.push(result.device);
      } else {
        skipped++;
      }
    }

    this._recordHistory(`bulkRegister(devices=${devices.length}) -> registered=${registered}, skipped=${skipped}`);
    return { registered, skipped, devices: registeredDevices };
  }

  public unregisterDevice(id: string): { id: string; unregistered: boolean; removed: boolean } {
    const removed = this._devices.has(id);
    if (removed) {
      const device = this._devices.get(id)!;import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0',
    };

    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.onlineCount++;
    this._registry.updatedAt = Date.now();

    this._shadows.set(id, {
      deviceId: id,
      desired: {},
      reported: {},
      delta: {},
      version: 1,
      timestamp: Date.now(),
    });

    this._recordHistory(`registerDevice(id=${id}, type=${type}, capabilities=${capabilities.length})`);
    return { device, registered: true, id };
  }

  public bulkRegister(devices: { id: string; type: string; capabilities: string[] }[]): { registered: number; skipped: number; devices: IoTDevice[] } {
    const registeredDevices: IoTDevice[] = [];
    let registered = 0;
    let skipped = 0;

    for (const device of devices) {
      const result = this.registerDevice(device.id, device.type, device.capabilities);
      if (result.registered) {
        registered++;
        registeredDevices.push(result.device);
      } else {
        skipped++;
      }
    }

    this._recordHistory(`bulkRegister(devices=${devices.length}) -> registered=${registered}, skipped=${skipped}`);
    return { registered, skipped, devices: registeredDevices };
  }

  public unregisterDevice(id: string): { id: string; unregistered: boolean; removed: boolean } {
    const removed = this._devices.has(id);
    if (removed) {
      const device = this._devices.get(id)!;
      this._devices.delete(id);
import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0',
    };

    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.onlineCount++;
    this._registry.updatedAt = Date.now();

    this._shadows.set(id, {
      deviceId: id,
      desired: {},
      reported: {},
      delta: {},
      version: 1,
      timestamp: Date.now(),
    });

    this._recordHistory(`registerDevice(id=${id}, type=${type}, capabilities=${capabilities.length})`);
    return { device, registered: true, id };
  }

  public bulkRegister(devices: { id: string; type: string; capabilities: string[] }[]): { registered: number; skipped: number; devices: IoTDevice[] } {
    const registeredDevices: IoTDevice[] = [];
    let registered = 0;
    let skipped = 0;

    for (const device of devices) {
      const result = this.registerDevice(device.id, device.type, device.capabilities);
      if (result.registered) {
        registered++;
        registeredDevices.push(result.device);
      } else {
        skipped++;
      }
    }

    this._recordHistory(`bulkRegister(devices=${devices.length}) -> registered=${registered}, skipped=${skipped}`);
    return { registered, skipped, devices: registeredDevices };
  }

  public unregisterDevice(id: string): { id: string; unregistered: boolean; removed: boolean } {
    const removed = this._devices.has(id);
    if (removed) {
      const device = this._devices.get(id)!;
      this._devices.delete(id);
      this._registry.devices.delete(id);
      this._registry.count--;
      if (device.status === 'online') this._registry.onimport { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0',
    };

    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.onlineCount++;
    this._registry.updatedAt = Date.now();

    this._shadows.set(id, {
      deviceId: id,
      desired: {},
      reported: {},
      delta: {},
      version: 1,
      timestamp: Date.now(),
    });

    this._recordHistory(`registerDevice(id=${id}, type=${type}, capabilities=${capabilities.length})`);
    return { device, registered: true, id };
  }

  public bulkRegister(devices: { id: string; type: string; capabilities: string[] }[]): { registered: number; skipped: number; devices: IoTDevice[] } {
    const registeredDevices: IoTDevice[] = [];
    let registered = 0;
    let skipped = 0;

    for (const device of devices) {
      const result = this.registerDevice(device.id, device.type, device.capabilities);
      if (result.registered) {
        registered++;
        registeredDevices.push(result.device);
      } else {
        skipped++;
      }
    }

    this._recordHistory(`bulkRegister(devices=${devices.length}) -> registered=${registered}, skipped=${skipped}`);
    return { registered, skipped, devices: registeredDevices };
  }

  public unregisterDevice(id: string): { id: string; unregistered: boolean; removed: boolean } {
    const removed = this._devices.has(id);
    if (removed) {
      const device = this._devices.get(id)!;
      this._devices.delete(id);
      this._registry.devices.delete(id);
      this._registry.count--;
      if (device.status === 'online') this._registry.onlineCount--;
      else this._registryimport { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0',
    };

    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.onlineCount++;
    this._registry.updatedAt = Date.now();

    this._shadows.set(id, {
      deviceId: id,
      desired: {},
      reported: {},
      delta: {},
      version: 1,
      timestamp: Date.now(),
    });

    this._recordHistory(`registerDevice(id=${id}, type=${type}, capabilities=${capabilities.length})`);
    return { device, registered: true, id };
  }

  public bulkRegister(devices: { id: string; type: string; capabilities: string[] }[]): { registered: number; skipped: number; devices: IoTDevice[] } {
    const registeredDevices: IoTDevice[] = [];
    let registered = 0;
    let skipped = 0;

    for (const device of devices) {
      const result = this.registerDevice(device.id, device.type, device.capabilities);
      if (result.registered) {
        registered++;
        registeredDevices.push(result.device);
      } else {
        skipped++;
      }
    }

    this._recordHistory(`bulkRegister(devices=${devices.length}) -> registered=${registered}, skipped=${skipped}`);
    return { registered, skipped, devices: registeredDevices };
  }

  public unregisterDevice(id: string): { id: string; unregistered: boolean; removed: boolean } {
    const removed = this._devices.has(id);
    if (removed) {
      const device = this._devices.get(id)!;
      this._devices.delete(id);
      this._registry.devices.delete(id);
      this._registry.count--;
      if (device.status === 'online') this._registry.onlineCount--;
      else this._registry.offlineCount--;
      this._registry.updatedAt = Date.now();
      this._shadows.delete(id);
      thisimport { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0',
    };

    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.onlineCount++;
    this._registry.updatedAt = Date.now();

    this._shadows.set(id, {
      deviceId: id,
      desired: {},
      reported: {},
      delta: {},
      version: 1,
      timestamp: Date.now(),
    });

    this._recordHistory(`registerDevice(id=${id}, type=${type}, capabilities=${capabilities.length})`);
    return { device, registered: true, id };
  }

  public bulkRegister(devices: { id: string; type: string; capabilities: string[] }[]): { registered: number; skipped: number; devices: IoTDevice[] } {
    const registeredDevices: IoTDevice[] = [];
    let registered = 0;
    let skipped = 0;

    for (const device of devices) {
      const result = this.registerDevice(device.id, device.type, device.capabilities);
      if (result.registered) {
        registered++;
        registeredDevices.push(result.device);
      } else {
        skipped++;
      }
    }

    this._recordHistory(`bulkRegister(devices=${devices.length}) -> registered=${registered}, skipped=${skipped}`);
    return { registered, skipped, devices: registeredDevices };
  }

  public unregisterDevice(id: string): { id: string; unregistered: boolean; removed: boolean } {
    const removed = this._devices.has(id);
    if (removed) {
      const device = this._devices.get(id)!;
      this._devices.delete(id);
      this._registry.devices.delete(id);
      this._registry.count--;
      if (device.status === 'online') this._registry.onlineCount--;
      else this._registry.offlineCount--;
      this._registry.updatedAt = Date.now();
      this._shadows.delete(id);
      this._firmwareUpdates.delete(id);
      thisimport { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0',
    };

    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.onlineCount++;
    this._registry.updatedAt = Date.now();

    this._shadows.set(id, {
      deviceId: id,
      desired: {},
      reported: {},
      delta: {},
      version: 1,
      timestamp: Date.now(),
    });

    this._recordHistory(`registerDevice(id=${id}, type=${type}, capabilities=${capabilities.length})`);
    return { device, registered: true, id };
  }

  public bulkRegister(devices: { id: string; type: string; capabilities: string[] }[]): { registered: number; skipped: number; devices: IoTDevice[] } {
    const registeredDevices: IoTDevice[] = [];
    let registered = 0;
    let skipped = 0;

    for (const device of devices) {
      const result = this.registerDevice(device.id, device.type, device.capabilities);
      if (result.registered) {
        registered++;
        registeredDevices.push(result.device);
      } else {
        skipped++;
      }
    }

    this._recordHistory(`bulkRegister(devices=${devices.length}) -> registered=${registered}, skipped=${skipped}`);
    return { registered, skipped, devices: registeredDevices };
  }

  public unregisterDevice(id: string): { id: string; unregistered: boolean; removed: boolean } {
    const removed = this._devices.has(id);
    if (removed) {
      const device = this._devices.get(id)!;
      this._devices.delete(id);
      this._registry.devices.delete(id);
      this._registry.count--;
      if (device.status === 'online') this._registry.onlineCount--;
      else this._registry.offlineCount--;
      this._registry.updatedAt = Date.now();
      this._shadows.delete(id);
      this._firmwareUpdates.delete(id);
      this._configs.delete(id);
    }
    this._recordHistory(`unregisterDevice(idimport { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0',
    };

    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.onlineCount++;
    this._registry.updatedAt = Date.now();

    this._shadows.set(id, {
      deviceId: id,
      desired: {},
      reported: {},
      delta: {},
      version: 1,
      timestamp: Date.now(),
    });

    this._recordHistory(`registerDevice(id=${id}, type=${type}, capabilities=${capabilities.length})`);
    return { device, registered: true, id };
  }

  public bulkRegister(devices: { id: string; type: string; capabilities: string[] }[]): { registered: number; skipped: number; devices: IoTDevice[] } {
    const registeredDevices: IoTDevice[] = [];
    let registered = 0;
    let skipped = 0;

    for (const device of devices) {
      const result = this.registerDevice(device.id, device.type, device.capabilities);
      if (result.registered) {
        registered++;
        registeredDevices.push(result.device);
      } else {
        skipped++;
      }
    }

    this._recordHistory(`bulkRegister(devices=${devices.length}) -> registered=${registered}, skipped=${skipped}`);
    return { registered, skipped, devices: registeredDevices };
  }

  public unregisterDevice(id: string): { id: string; unregistered: boolean; removed: boolean } {
    const removed = this._devices.has(id);
    if (removed) {
      const device = this._devices.get(id)!;
      this._devices.delete(id);
      this._registry.devices.delete(id);
      this._registry.count--;
      if (device.status === 'online') this._registry.onlineCount--;
      else this._registry.offlineCount--;
      this._registry.updatedAt = Date.now();
      this._shadows.delete(id);
      this._firmwareUpdates.delete(id);
      this._configs.delete(id);
    }
    this._recordHistory(`unregisterDevice(id=${id}) -> ${removed}`);
    return { id, unregistered: removed, removedimport { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0',
    };

    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.onlineCount++;
    this._registry.updatedAt = Date.now();

    this._shadows.set(id, {
      deviceId: id,
      desired: {},
      reported: {},
      delta: {},
      version: 1,
      timestamp: Date.now(),
    });

    this._recordHistory(`registerDevice(id=${id}, type=${type}, capabilities=${capabilities.length})`);
    return { device, registered: true, id };
  }

  public bulkRegister(devices: { id: string; type: string; capabilities: string[] }[]): { registered: number; skipped: number; devices: IoTDevice[] } {
    const registeredDevices: IoTDevice[] = [];
    let registered = 0;
    let skipped = 0;

    for (const device of devices) {
      const result = this.registerDevice(device.id, device.type, device.capabilities);
      if (result.registered) {
        registered++;
        registeredDevices.push(result.device);
      } else {
        skipped++;
      }
    }

    this._recordHistory(`bulkRegister(devices=${devices.length}) -> registered=${registered}, skipped=${skipped}`);
    return { registered, skipped, devices: registeredDevices };
  }

  public unregisterDevice(id: string): { id: string; unregistered: boolean; removed: boolean } {
    const removed = this._devices.has(id);
    if (removed) {
      const device = this._devices.get(id)!;
      this._devices.delete(id);
      this._registry.devices.delete(id);
      this._registry.count--;
      if (device.status === 'online') this._registry.onlineCount--;
      else this._registry.offlineCount--;
      this._registry.updatedAt = Date.now();
      this._shadows.delete(id);
      this._firmwareUpdates.delete(id);
      this._configs.delete(id);
    }
    this._recordHistory(`unregisterDevice(id=${id}) -> ${removed}`);
    return { id, unregistered: removed, removed };
  }

  public updateDeviceStatusimport { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0',
    };

    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.onlineCount++;
    this._registry.updatedAt = Date.now();

    this._shadows.set(id, {
      deviceId: id,
      desired: {},
      reported: {},
      delta: {},
      version: 1,
      timestamp: Date.now(),
    });

    this._recordHistory(`registerDevice(id=${id}, type=${type}, capabilities=${capabilities.length})`);
    return { device, registered: true, id };
  }

  public bulkRegister(devices: { id: string; type: string; capabilities: string[] }[]): { registered: number; skipped: number; devices: IoTDevice[] } {
    const registeredDevices: IoTDevice[] = [];
    let registered = 0;
    let skipped = 0;

    for (const device of devices) {
      const result = this.registerDevice(device.id, device.type, device.capabilities);
      if (result.registered) {
        registered++;
        registeredDevices.push(result.device);
      } else {
        skipped++;
      }
    }

    this._recordHistory(`bulkRegister(devices=${devices.length}) -> registered=${registered}, skipped=${skipped}`);
    return { registered, skipped, devices: registeredDevices };
  }

  public unregisterDevice(id: string): { id: string; unregistered: boolean; removed: boolean } {
    const removed = this._devices.has(id);
    if (removed) {
      const device = this._devices.get(id)!;
      this._devices.delete(id);
      this._registry.devices.delete(id);
      this._registry.count--;
      if (device.status === 'online') this._registry.onlineCount--;
      else this._registry.offlineCount--;
      this._registry.updatedAt = Date.now();
      this._shadows.delete(id);
      this._firmwareUpdates.delete(id);
      this._configs.delete(id);
    }
    this._recordHistory(`unregisterDevice(id=${id}) -> ${removed}`);
    return { id, unregistered: removed, removed };
  }

  public updateDeviceStatus(id: string, status: IoTDevice['status'], properties?: Record<string, unknown>): { id: string; status: string; updatedimport { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0',
    };

    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.onlineCount++;
    this._registry.updatedAt = Date.now();

    this._shadows.set(id, {
      deviceId: id,
      desired: {},
      reported: {},
      delta: {},
      version: 1,
      timestamp: Date.now(),
    });

    this._recordHistory(`registerDevice(id=${id}, type=${type}, capabilities=${capabilities.length})`);
    return { device, registered: true, id };
  }

  public bulkRegister(devices: { id: string; type: string; capabilities: string[] }[]): { registered: number; skipped: number; devices: IoTDevice[] } {
    const registeredDevices: IoTDevice[] = [];
    let registered = 0;
    let skipped = 0;

    for (const device of devices) {
      const result = this.registerDevice(device.id, device.type, device.capabilities);
      if (result.registered) {
        registered++;
        registeredDevices.push(result.device);
      } else {
        skipped++;
      }
    }

    this._recordHistory(`bulkRegister(devices=${devices.length}) -> registered=${registered}, skipped=${skipped}`);
    return { registered, skipped, devices: registeredDevices };
  }

  public unregisterDevice(id: string): { id: string; unregistered: boolean; removed: boolean } {
    const removed = this._devices.has(id);
    if (removed) {
      const device = this._devices.get(id)!;
      this._devices.delete(id);
      this._registry.devices.delete(id);
      this._registry.count--;
      if (device.status === 'online') this._registry.onlineCount--;
      else this._registry.offlineCount--;
      this._registry.updatedAt = Date.now();
      this._shadows.delete(id);
      this._firmwareUpdates.delete(id);
      this._configs.delete(id);
    }
    this._recordHistory(`unregisterDevice(id=${id}) -> ${removed}`);
    return { id, unregistered: removed, removed };
  }

  public updateDeviceStatus(id: string, status: IoTDevice['status'], properties?: Record<string, unknown>): { id: string; status: string; updated: boolean; properties: Record<string, unknown>import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0',
    };

    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.onlineCount++;
    this._registry.updatedAt = Date.now();

    this._shadows.set(id, {
      deviceId: id,
      desired: {},
      reported: {},
      delta: {},
      version: 1,
      timestamp: Date.now(),
    });

    this._recordHistory(`registerDevice(id=${id}, type=${type}, capabilities=${capabilities.length})`);
    return { device, registered: true, id };
  }

  public bulkRegister(devices: { id: string; type: string; capabilities: string[] }[]): { registered: number; skipped: number; devices: IoTDevice[] } {
    const registeredDevices: IoTDevice[] = [];
    let registered = 0;
    let skipped = 0;

    for (const device of devices) {
      const result = this.registerDevice(device.id, device.type, device.capabilities);
      if (result.registered) {
        registered++;
        registeredDevices.push(result.device);
      } else {
        skipped++;
      }
    }

    this._recordHistory(`bulkRegister(devices=${devices.length}) -> registered=${registered}, skipped=${skipped}`);
    return { registered, skipped, devices: registeredDevices };
  }

  public unregisterDevice(id: string): { id: string; unregistered: boolean; removed: boolean } {
    const removed = this._devices.has(id);
    if (removed) {
      const device = this._devices.get(id)!;
      this._devices.delete(id);
      this._registry.devices.delete(id);
      this._registry.count--;
      if (device.status === 'online') this._registry.onlineCount--;
      else this._registry.offlineCount--;
      this._registry.updatedAt = Date.now();
      this._shadows.delete(id);
      this._firmwareUpdates.delete(id);
      this._configs.delete(id);
    }
    this._recordHistory(`unregisterDevice(id=${id}) -> ${removed}`);
    return { id, unregistered: removed, removed };
  }

  public updateDeviceStatus(id: string, status: IoTDevice['status'], properties?: Record<string, unknown>): { id: string; status: string; updated: boolean; properties: Record<string, unknown> } {
    const device = this._devices.get(id);
    const updated = !!deviceimport { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0',
    };

    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.onlineCount++;
    this._registry.updatedAt = Date.now();

    this._shadows.set(id, {
      deviceId: id,
      desired: {},
      reported: {},
      delta: {},
      version: 1,
      timestamp: Date.now(),
    });

    this._recordHistory(`registerDevice(id=${id}, type=${type}, capabilities=${capabilities.length})`);
    return { device, registered: true, id };
  }

  public bulkRegister(devices: { id: string; type: string; capabilities: string[] }[]): { registered: number; skipped: number; devices: IoTDevice[] } {
    const registeredDevices: IoTDevice[] = [];
    let registered = 0;
    let skipped = 0;

    for (const device of devices) {
      const result = this.registerDevice(device.id, device.type, device.capabilities);
      if (result.registered) {
        registered++;
        registeredDevices.push(result.device);
      } else {
        skipped++;
      }
    }

    this._recordHistory(`bulkRegister(devices=${devices.length}) -> registered=${registered}, skipped=${skipped}`);
    return { registered, skipped, devices: registeredDevices };
  }

  public unregisterDevice(id: string): { id: string; unregistered: boolean; removed: boolean } {
    const removed = this._devices.has(id);
    if (removed) {
      const device = this._devices.get(id)!;
      this._devices.delete(id);
      this._registry.devices.delete(id);
      this._registry.count--;
      if (device.status === 'online') this._registry.onlineCount--;
      else this._registry.offlineCount--;
      this._registry.updatedAt = Date.now();
      this._shadows.delete(id);
      this._firmwareUpdates.delete(id);
      this._configs.delete(id);
    }
    this._recordHistory(`unregisterDevice(id=${id}) -> ${removed}`);
    return { id, unregistered: removed, removed };
  }

  public updateDeviceStatus(id: string, status: IoTDevice['status'], properties?: Record<string, unknown>): { id: string; status: string; updated: boolean; properties: Record<string, unknown> } {
    const device = this._devices.get(id);
    const updated = !!device;
    if (device) {
import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0',
    };

    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.onlineCount++;
    this._registry.updatedAt = Date.now();

    this._shadows.set(id, {
      deviceId: id,
      desired: {},
      reported: {},
      delta: {},
      version: 1,
      timestamp: Date.now(),
    });

    this._recordHistory(`registerDevice(id=${id}, type=${type}, capabilities=${capabilities.length})`);
    return { device, registered: true, id };
  }

  public bulkRegister(devices: { id: string; type: string; capabilities: string[] }[]): { registered: number; skipped: number; devices: IoTDevice[] } {
    const registeredDevices: IoTDevice[] = [];
    let registered = 0;
    let skipped = 0;

    for (const device of devices) {
      const result = this.registerDevice(device.id, device.type, device.capabilities);
      if (result.registered) {
        registered++;
        registeredDevices.push(result.device);
      } else {
        skipped++;
      }
    }

    this._recordHistory(`bulkRegister(devices=${devices.length}) -> registered=${registered}, skipped=${skipped}`);
    return { registered, skipped, devices: registeredDevices };
  }

  public unregisterDevice(id: string): { id: string; unregistered: boolean; removed: boolean } {
    const removed = this._devices.has(id);
    if (removed) {
      const device = this._devices.get(id)!;
      this._devices.delete(id);
      this._registry.devices.delete(id);
      this._registry.count--;
      if (device.status === 'online') this._registry.onlineCount--;
      else this._registry.offlineCount--;
      this._registry.updatedAt = Date.now();
      this._shadows.delete(id);
      this._firmwareUpdates.delete(id);
      this._configs.delete(id);
    }
    this._recordHistory(`unregisterDevice(id=${id}) -> ${removed}`);
    return { id, unregistered: removed, removed };
  }

  public updateDeviceStatus(id: string, status: IoTDevice['status'], properties?: Record<string, unknown>): { id: string; status: string; updated: boolean; properties: Record<string, unknown> } {
    const device = this._devices.get(id);
    const updated = !!device;
    if (device) {
      const oldStatus = device.status;
      constimport { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0',
    };

    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.onlineCount++;
    this._registry.updatedAt = Date.now();

    this._shadows.set(id, {
      deviceId: id,
      desired: {},
      reported: {},
      delta: {},
      version: 1,
      timestamp: Date.now(),
    });

    this._recordHistory(`registerDevice(id=${id}, type=${type}, capabilities=${capabilities.length})`);
    return { device, registered: true, id };
  }

  public bulkRegister(devices: { id: string; type: string; capabilities: string[] }[]): { registered: number; skipped: number; devices: IoTDevice[] } {
    const registeredDevices: IoTDevice[] = [];
    let registered = 0;
    let skipped = 0;

    for (const device of devices) {
      const result = this.registerDevice(device.id, device.type, device.capabilities);
      if (result.registered) {
        registered++;
        registeredDevices.push(result.device);
      } else {
        skipped++;
      }
    }

    this._recordHistory(`bulkRegister(devices=${devices.length}) -> registered=${registered}, skipped=${skipped}`);
    return { registered, skipped, devices: registeredDevices };
  }

  public unregisterDevice(id: string): { id: string; unregistered: boolean; removed: boolean } {
    const removed = this._devices.has(id);
    if (removed) {
      const device = this._devices.get(id)!;
      this._devices.delete(id);
      this._registry.devices.delete(id);
      this._registry.count--;
      if (device.status === 'online') this._registry.onlineCount--;
      else this._registry.offlineCount--;
      this._registry.updatedAt = Date.now();
      this._shadows.delete(id);
      this._firmwareUpdates.delete(id);
      this._configs.delete(id);
    }
    this._recordHistory(`unregisterDevice(id=${id}) -> ${removed}`);
    return { id, unregistered: removed, removed };
  }

  public updateDeviceStatus(id: string, status: IoTDevice['status'], properties?: Record<string, unknown>): { id: string; status: string; updated: boolean; properties: Record<string, unknown> } {
    const device = this._devices.get(id);
    const updated = !!device;
    if (device) {
      const oldStatus = device.status;
      const updatedDevice: IoTDevice = { ...deviceimport { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0',
    };

    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.onlineCount++;
    this._registry.updatedAt = Date.now();

    this._shadows.set(id, {
      deviceId: id,
      desired: {},
      reported: {},
      delta: {},
      version: 1,
      timestamp: Date.now(),
    });

    this._recordHistory(`registerDevice(id=${id}, type=${type}, capabilities=${capabilities.length})`);
    return { device, registered: true, id };
  }

  public bulkRegister(devices: { id: string; type: string; capabilities: string[] }[]): { registered: number; skipped: number; devices: IoTDevice[] } {
    const registeredDevices: IoTDevice[] = [];
    let registered = 0;
    let skipped = 0;

    for (const device of devices) {
      const result = this.registerDevice(device.id, device.type, device.capabilities);
      if (result.registered) {
        registered++;
        registeredDevices.push(result.device);
      } else {
        skipped++;
      }
    }

    this._recordHistory(`bulkRegister(devices=${devices.length}) -> registered=${registered}, skipped=${skipped}`);
    return { registered, skipped, devices: registeredDevices };
  }

  public unregisterDevice(id: string): { id: string; unregistered: boolean; removed: boolean } {
    const removed = this._devices.has(id);
    if (removed) {
      const device = this._devices.get(id)!;
      this._devices.delete(id);
      this._registry.devices.delete(id);
      this._registry.count--;
      if (device.status === 'online') this._registry.onlineCount--;
      else this._registry.offlineCount--;
      this._registry.updatedAt = Date.now();
      this._shadows.delete(id);
      this._firmwareUpdates.delete(id);
      this._configs.delete(id);
    }
    this._recordHistory(`unregisterDevice(id=${id}) -> ${removed}`);
    return { id, unregistered: removed, removed };
  }

  public updateDeviceStatus(id: string, status: IoTDevice['status'], properties?: Record<string, unknown>): { id: string; status: string; updated: boolean; properties: Record<string, unknown> } {
    const device = this._devices.get(id);
    const updated = !!device;
    if (device) {
      const oldStatus = device.status;
      const updatedDevice: IoTDevice = { ...device, status, lastSeen: Date.now(), metadata: { ...device.metadata, ...properties }import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0',
    };

    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.onlineCount++;
    this._registry.updatedAt = Date.now();

    this._shadows.set(id, {
      deviceId: id,
      desired: {},
      reported: {},
      delta: {},
      version: 1,
      timestamp: Date.now(),
    });

    this._recordHistory(`registerDevice(id=${id}, type=${type}, capabilities=${capabilities.length})`);
    return { device, registered: true, id };
  }

  public bulkRegister(devices: { id: string; type: string; capabilities: string[] }[]): { registered: number; skipped: number; devices: IoTDevice[] } {
    const registeredDevices: IoTDevice[] = [];
    let registered = 0;
    let skipped = 0;

    for (const device of devices) {
      const result = this.registerDevice(device.id, device.type, device.capabilities);
      if (result.registered) {
        registered++;
        registeredDevices.push(result.device);
      } else {
        skipped++;
      }
    }

    this._recordHistory(`bulkRegister(devices=${devices.length}) -> registered=${registered}, skipped=${skipped}`);
    return { registered, skipped, devices: registeredDevices };
  }

  public unregisterDevice(id: string): { id: string; unregistered: boolean; removed: boolean } {
    const removed = this._devices.has(id);
    if (removed) {
      const device = this._devices.get(id)!;
      this._devices.delete(id);
      this._registry.devices.delete(id);
      this._registry.count--;
      if (device.status === 'online') this._registry.onlineCount--;
      else this._registry.offlineCount--;
      this._registry.updatedAt = Date.now();
      this._shadows.delete(id);
      this._firmwareUpdates.delete(id);
      this._configs.delete(id);
    }
    this._recordHistory(`unregisterDevice(id=${id}) -> ${removed}`);
    return { id, unregistered: removed, removed };
  }

  public updateDeviceStatus(id: string, status: IoTDevice['status'], properties?: Record<string, unknown>): { id: string; status: string; updated: boolean; properties: Record<string, unknown> } {
    const device = this._devices.get(id);
    const updated = !!device;
    if (device) {
      const oldStatus = device.status;
      const updatedDevice: IoTDevice = { ...device, status, lastSeen: Date.now(), metadata: { ...device.metadata, ...properties } };
      this._devices.set(id, updatedimport { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0',
    };

    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.onlineCount++;
    this._registry.updatedAt = Date.now();

    this._shadows.set(id, {
      deviceId: id,
      desired: {},
      reported: {},
      delta: {},
      version: 1,
      timestamp: Date.now(),
    });

    this._recordHistory(`registerDevice(id=${id}, type=${type}, capabilities=${capabilities.length})`);
    return { device, registered: true, id };
  }

  public bulkRegister(devices: { id: string; type: string; capabilities: string[] }[]): { registered: number; skipped: number; devices: IoTDevice[] } {
    const registeredDevices: IoTDevice[] = [];
    let registered = 0;
    let skipped = 0;

    for (const device of devices) {
      const result = this.registerDevice(device.id, device.type, device.capabilities);
      if (result.registered) {
        registered++;
        registeredDevices.push(result.device);
      } else {
        skipped++;
      }
    }

    this._recordHistory(`bulkRegister(devices=${devices.length}) -> registered=${registered}, skipped=${skipped}`);
    return { registered, skipped, devices: registeredDevices };
  }

  public unregisterDevice(id: string): { id: string; unregistered: boolean; removed: boolean } {
    const removed = this._devices.has(id);
    if (removed) {
      const device = this._devices.get(id)!;
      this._devices.delete(id);
      this._registry.devices.delete(id);
      this._registry.count--;
      if (device.status === 'online') this._registry.onlineCount--;
      else this._registry.offlineCount--;
      this._registry.updatedAt = Date.now();
      this._shadows.delete(id);
      this._firmwareUpdates.delete(id);
      this._configs.delete(id);
    }
    this._recordHistory(`unregisterDevice(id=${id}) -> ${removed}`);
    return { id, unregistered: removed, removed };
  }

  public updateDeviceStatus(id: string, status: IoTDevice['status'], properties?: Record<string, unknown>): { id: string; status: string; updated: boolean; properties: Record<string, unknown> } {
    const device = this._devices.get(id);
    const updated = !!device;
    if (device) {
      const oldStatus = device.status;
      const updatedDevice: IoTDevice = { ...device, status, lastSeen: Date.now(), metadata: { ...device.metadata, ...properties } };
      this._devices.set(id, updatedDevice);
      this._registry.devices.set(id, updatedDevice);
      this._registry.updatedAt = Date.now();

      ifimport { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0',
    };

    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.onlineCount++;
    this._registry.updatedAt = Date.now();

    this._shadows.set(id, {
      deviceId: id,
      desired: {},
      reported: {},
      delta: {},
      version: 1,
      timestamp: Date.now(),
    });

    this._recordHistory(`registerDevice(id=${id}, type=${type}, capabilities=${capabilities.length})`);
    return { device, registered: true, id };
  }

  public bulkRegister(devices: { id: string; type: string; capabilities: string[] }[]): { registered: number; skipped: number; devices: IoTDevice[] } {
    const registeredDevices: IoTDevice[] = [];
    let registered = 0;
    let skipped = 0;

    for (const device of devices) {
      const result = this.registerDevice(device.id, device.type, device.capabilities);
      if (result.registered) {
        registered++;
        registeredDevices.push(result.device);
      } else {
        skipped++;
      }
    }

    this._recordHistory(`bulkRegister(devices=${devices.length}) -> registered=${registered}, skipped=${skipped}`);
    return { registered, skipped, devices: registeredDevices };
  }

  public unregisterDevice(id: string): { id: string; unregistered: boolean; removed: boolean } {
    const removed = this._devices.has(id);
    if (removed) {
      const device = this._devices.get(id)!;
      this._devices.delete(id);
      this._registry.devices.delete(id);
      this._registry.count--;
      if (device.status === 'online') this._registry.onlineCount--;
      else this._registry.offlineCount--;
      this._registry.updatedAt = Date.now();
      this._shadows.delete(id);
      this._firmwareUpdates.delete(id);
      this._configs.delete(id);
    }
    this._recordHistory(`unregisterDevice(id=${id}) -> ${removed}`);
    return { id, unregistered: removed, removed };
  }

  public updateDeviceStatus(id: string, status: IoTDevice['status'], properties?: Record<string, unknown>): { id: string; status: string; updated: boolean; properties: Record<string, unknown> } {
    const device = this._devices.get(id);
    const updated = !!device;
    if (device) {
      const oldStatus = device.status;
      const updatedDevice: IoTDevice = { ...device, status, lastSeen: Date.now(), metadata: { ...device.metadata, ...properties } };
      this._devices.set(id, updatedDevice);
      this._registry.devices.set(id, updatedDevice);
      this._registry.updatedAt = Date.now();

      if (oldStatus === 'online' && status !== 'online') this._registry.onlineCount--import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0',
    };

    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.onlineCount++;
    this._registry.updatedAt = Date.now();

    this._shadows.set(id, {
      deviceId: id,
      desired: {},
      reported: {},
      delta: {},
      version: 1,
      timestamp: Date.now(),
    });

    this._recordHistory(`registerDevice(id=${id}, type=${type}, capabilities=${capabilities.length})`);
    return { device, registered: true, id };
  }

  public bulkRegister(devices: { id: string; type: string; capabilities: string[] }[]): { registered: number; skipped: number; devices: IoTDevice[] } {
    const registeredDevices: IoTDevice[] = [];
    let registered = 0;
    let skipped = 0;

    for (const device of devices) {
      const result = this.registerDevice(device.id, device.type, device.capabilities);
      if (result.registered) {
        registered++;
        registeredDevices.push(result.device);
      } else {
        skipped++;
      }
    }

    this._recordHistory(`bulkRegister(devices=${devices.length}) -> registered=${registered}, skipped=${skipped}`);
    return { registered, skipped, devices: registeredDevices };
  }

  public unregisterDevice(id: string): { id: string; unregistered: boolean; removed: boolean } {
    const removed = this._devices.has(id);
    if (removed) {
      const device = this._devices.get(id)!;
      this._devices.delete(id);
      this._registry.devices.delete(id);
      this._registry.count--;
      if (device.status === 'online') this._registry.onlineCount--;
      else this._registry.offlineCount--;
      this._registry.updatedAt = Date.now();
      this._shadows.delete(id);
      this._firmwareUpdates.delete(id);
      this._configs.delete(id);
    }
    this._recordHistory(`unregisterDevice(id=${id}) -> ${removed}`);
    return { id, unregistered: removed, removed };
  }

  public updateDeviceStatus(id: string, status: IoTDevice['status'], properties?: Record<string, unknown>): { id: string; status: string; updated: boolean; properties: Record<string, unknown> } {
    const device = this._devices.get(id);
    const updated = !!device;
    if (device) {
      const oldStatus = device.status;
      const updatedDevice: IoTDevice = { ...device, status, lastSeen: Date.now(), metadata: { ...device.metadata, ...properties } };
      this._devices.set(id, updatedDevice);
      this._registry.devices.set(id, updatedDevice);
      this._registry.updatedAt = Date.now();

      if (oldStatus === 'online' && status !== 'online') this._registry.onlineCount--;
      if (oldStatus !== 'onlineimport { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0',
    };

    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.onlineCount++;
    this._registry.updatedAt = Date.now();

    this._shadows.set(id, {
      deviceId: id,
      desired: {},
      reported: {},
      delta: {},
      version: 1,
      timestamp: Date.now(),
    });

    this._recordHistory(`registerDevice(id=${id}, type=${type}, capabilities=${capabilities.length})`);
    return { device, registered: true, id };
  }

  public bulkRegister(devices: { id: string; type: string; capabilities: string[] }[]): { registered: number; skipped: number; devices: IoTDevice[] } {
    const registeredDevices: IoTDevice[] = [];
    let registered = 0;
    let skipped = 0;

    for (const device of devices) {
      const result = this.registerDevice(device.id, device.type, device.capabilities);
      if (result.registered) {
        registered++;
        registeredDevices.push(result.device);
      } else {
        skipped++;
      }
    }

    this._recordHistory(`bulkRegister(devices=${devices.length}) -> registered=${registered}, skipped=${skipped}`);
    return { registered, skipped, devices: registeredDevices };
  }

  public unregisterDevice(id: string): { id: string; unregistered: boolean; removed: boolean } {
    const removed = this._devices.has(id);
    if (removed) {
      const device = this._devices.get(id)!;
      this._devices.delete(id);
      this._registry.devices.delete(id);
      this._registry.count--;
      if (device.status === 'online') this._registry.onlineCount--;
      else this._registry.offlineCount--;
      this._registry.updatedAt = Date.now();
      this._shadows.delete(id);
      this._firmwareUpdates.delete(id);
      this._configs.delete(id);
    }
    this._recordHistory(`unregisterDevice(id=${id}) -> ${removed}`);
    return { id, unregistered: removed, removed };
  }

  public updateDeviceStatus(id: string, status: IoTDevice['status'], properties?: Record<string, unknown>): { id: string; status: string; updated: boolean; properties: Record<string, unknown> } {
    const device = this._devices.get(id);
    const updated = !!device;
    if (device) {
      const oldStatus = device.status;
      const updatedDevice: IoTDevice = { ...device, status, lastSeen: Date.now(), metadata: { ...device.metadata, ...properties } };
      this._devices.set(id, updatedDevice);
      this._registry.devices.set(id, updatedDevice);
      this._registry.updatedAt = Date.now();

      if (oldStatus === 'online' && status !== 'online') this._registry.onlineCount--;
      if (oldStatus !== 'online' && status === 'online') this._registryimport { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0',
    };

    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.onlineCount++;
    this._registry.updatedAt = Date.now();

    this._shadows.set(id, {
      deviceId: id,
      desired: {},
      reported: {},
      delta: {},
      version: 1,
      timestamp: Date.now(),
    });

    this._recordHistory(`registerDevice(id=${id}, type=${type}, capabilities=${capabilities.length})`);
    return { device, registered: true, id };
  }

  public bulkRegister(devices: { id: string; type: string; capabilities: string[] }[]): { registered: number; skipped: number; devices: IoTDevice[] } {
    const registeredDevices: IoTDevice[] = [];
    let registered = 0;
    let skipped = 0;

    for (const device of devices) {
      const result = this.registerDevice(device.id, device.type, device.capabilities);
      if (result.registered) {
        registered++;
        registeredDevices.push(result.device);
      } else {
        skipped++;
      }
    }

    this._recordHistory(`bulkRegister(devices=${devices.length}) -> registered=${registered}, skipped=${skipped}`);
    return { registered, skipped, devices: registeredDevices };
  }

  public unregisterDevice(id: string): { id: string; unregistered: boolean; removed: boolean } {
    const removed = this._devices.has(id);
    if (removed) {
      const device = this._devices.get(id)!;
      this._devices.delete(id);
      this._registry.devices.delete(id);
      this._registry.count--;
      if (device.status === 'online') this._registry.onlineCount--;
      else this._registry.offlineCount--;
      this._registry.updatedAt = Date.now();
      this._shadows.delete(id);
      this._firmwareUpdates.delete(id);
      this._configs.delete(id);
    }
    this._recordHistory(`unregisterDevice(id=${id}) -> ${removed}`);
    return { id, unregistered: removed, removed };
  }

  public updateDeviceStatus(id: string, status: IoTDevice['status'], properties?: Record<string, unknown>): { id: string; status: string; updated: boolean; properties: Record<string, unknown> } {
    const device = this._devices.get(id);
    const updated = !!device;
    if (device) {
      const oldStatus = device.status;
      const updatedDevice: IoTDevice = { ...device, status, lastSeen: Date.now(), metadata: { ...device.metadata, ...properties } };
      this._devices.set(id, updatedDevice);
      this._registry.devices.set(id, updatedDevice);
      this._registry.updatedAt = Date.now();

      if (oldStatus === 'online' && status !== 'online') this._registry.onlineCount--;
      if (oldStatus !== 'online' && status === 'online') this._registry.onlineCount++;
      if (oldStatusimport { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0',
    };

    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.onlineCount++;
    this._registry.updatedAt = Date.now();

    this._shadows.set(id, {
      deviceId: id,
      desired: {},
      reported: {},
      delta: {},
      version: 1,
      timestamp: Date.now(),
    });

    this._recordHistory(`registerDevice(id=${id}, type=${type}, capabilities=${capabilities.length})`);
    return { device, registered: true, id };
  }

  public bulkRegister(devices: { id: string; type: string; capabilities: string[] }[]): { registered: number; skipped: number; devices: IoTDevice[] } {
    const registeredDevices: IoTDevice[] = [];
    let registered = 0;
    let skipped = 0;

    for (const device of devices) {
      const result = this.registerDevice(device.id, device.type, device.capabilities);
      if (result.registered) {
        registered++;
        registeredDevices.push(result.device);
      } else {
        skipped++;
      }
    }

    this._recordHistory(`bulkRegister(devices=${devices.length}) -> registered=${registered}, skipped=${skipped}`);
    return { registered, skipped, devices: registeredDevices };
  }

  public unregisterDevice(id: string): { id: string; unregistered: boolean; removed: boolean } {
    const removed = this._devices.has(id);
    if (removed) {
      const device = this._devices.get(id)!;
      this._devices.delete(id);
      this._registry.devices.delete(id);
      this._registry.count--;
      if (device.status === 'online') this._registry.onlineCount--;
      else this._registry.offlineCount--;
      this._registry.updatedAt = Date.now();
      this._shadows.delete(id);
      this._firmwareUpdates.delete(id);
      this._configs.delete(id);
    }
    this._recordHistory(`unregisterDevice(id=${id}) -> ${removed}`);
    return { id, unregistered: removed, removed };
  }

  public updateDeviceStatus(id: string, status: IoTDevice['status'], properties?: Record<string, unknown>): { id: string; status: string; updated: boolean; properties: Record<string, unknown> } {
    const device = this._devices.get(id);
    const updated = !!device;
    if (device) {
      const oldStatus = device.status;
      const updatedDevice: IoTDevice = { ...device, status, lastSeen: Date.now(), metadata: { ...device.metadata, ...properties } };
      this._devices.set(id, updatedDevice);
      this._registry.devices.set(id, updatedDevice);
      this._registry.updatedAt = Date.now();

      if (oldStatus === 'online' && status !== 'online') this._registry.onlineCount--;
      if (oldStatus !== 'online' && status === 'online') this._registry.onlineCount++;
      if (oldStatus === 'offline' && status !== 'offline') this._registry.offlineCount--import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0',
    };

    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.onlineCount++;
    this._registry.updatedAt = Date.now();

    this._shadows.set(id, {
      deviceId: id,
      desired: {},
      reported: {},
      delta: {},
      version: 1,
      timestamp: Date.now(),
    });

    this._recordHistory(`registerDevice(id=${id}, type=${type}, capabilities=${capabilities.length})`);
    return { device, registered: true, id };
  }

  public bulkRegister(devices: { id: string; type: string; capabilities: string[] }[]): { registered: number; skipped: number; devices: IoTDevice[] } {
    const registeredDevices: IoTDevice[] = [];
    let registered = 0;
    let skipped = 0;

    for (const device of devices) {
      const result = this.registerDevice(device.id, device.type, device.capabilities);
      if (result.registered) {
        registered++;
        registeredDevices.push(result.device);
      } else {
        skipped++;
      }
    }

    this._recordHistory(`bulkRegister(devices=${devices.length}) -> registered=${registered}, skipped=${skipped}`);
    return { registered, skipped, devices: registeredDevices };
  }

  public unregisterDevice(id: string): { id: string; unregistered: boolean; removed: boolean } {
    const removed = this._devices.has(id);
    if (removed) {
      const device = this._devices.get(id)!;
      this._devices.delete(id);
      this._registry.devices.delete(id);
      this._registry.count--;
      if (device.status === 'online') this._registry.onlineCount--;
      else this._registry.offlineCount--;
      this._registry.updatedAt = Date.now();
      this._shadows.delete(id);
      this._firmwareUpdates.delete(id);
      this._configs.delete(id);
    }
    this._recordHistory(`unregisterDevice(id=${id}) -> ${removed}`);
    return { id, unregistered: removed, removed };
  }

  public updateDeviceStatus(id: string, status: IoTDevice['status'], properties?: Record<string, unknown>): { id: string; status: string; updated: boolean; properties: Record<string, unknown> } {
    const device = this._devices.get(id);
    const updated = !!device;
    if (device) {
      const oldStatus = device.status;
      const updatedDevice: IoTDevice = { ...device, status, lastSeen: Date.now(), metadata: { ...device.metadata, ...properties } };
      this._devices.set(id, updatedDevice);
      this._registry.devices.set(id, updatedDevice);
      this._registry.updatedAt = Date.now();

      if (oldStatus === 'online' && status !== 'online') this._registry.onlineCount--;
      if (oldStatus !== 'online' && status === 'online') this._registry.onlineCount++;
      if (oldStatus === 'offline' && status !== 'offline') this._registry.offlineCount--;
      if (oldStatus !== 'offline' && status === 'offline') this._registry.offlineCount++;

      this._recordEvent(id, 'status_change', { oldStatus, newStatus: status, properties }, status === 'error' ? 'critical' : 'low');
    }
    this._recordHistory(`updateDeviceStatus(id=${id}, status=${status})`);
    return {import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0',
    };

    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.onlineCount++;
    this._registry.updatedAt = Date.now();

    this._shadows.set(id, {
      deviceId: id,
      desired: {},
      reported: {},
      delta: {},
      version: 1,
      timestamp: Date.now(),
    });

    this._recordHistory(`registerDevice(id=${id}, type=${type}, capabilities=${capabilities.length})`);
    return { device, registered: true, id };
  }

  public bulkRegister(devices: { id: string; type: string; capabilities: string[] }[]): { registered: number; skipped: number; devices: IoTDevice[] } {
    const registeredDevices: IoTDevice[] = [];
    let registered = 0;
    let skipped = 0;

    for (const device of devices) {
      const result = this.registerDevice(device.id, device.type, device.capabilities);
      if (result.registered) {
        registered++;
        registeredDevices.push(result.device);
      } else {
        skipped++;
      }
    }

    this._recordHistory(`bulkRegister(devices=${devices.length}) -> registered=${registered}, skipped=${skipped}`);
    return { registered, skipped, devices: registeredDevices };
  }

  public unregisterDevice(id: string): { id: string; unregistered: boolean; removed: boolean } {
    const removed = this._devices.has(id);
    if (removed) {
      const device = this._devices.get(id)!;
      this._devices.delete(id);
      this._registry.devices.delete(id);
      this._registry.count--;
      if (device.status === 'online') this._registry.onlineCount--;
      else this._registry.offlineCount--;
      this._registry.updatedAt = Date.now();
      this._shadows.delete(id);
      this._firmwareUpdates.delete(id);
      this._configs.delete(id);
    }
    this._recordHistory(`unregisterDevice(id=${id}) -> ${removed}`);
    return { id, unregistered: removed, removed };
  }

  public updateDeviceStatus(id: string, status: IoTDevice['status'], properties?: Record<string, unknown>): { id: string; status: string; updated: boolean; properties: Record<string, unknown> } {
    const device = this._devices.get(id);
    const updated = !!device;
    if (device) {
      const oldStatus = device.status;
      const updatedDevice: IoTDevice = { ...device, status, lastSeen: Date.now(), metadata: { ...device.metadata, ...properties } };
      this._devices.set(id, updatedDevice);
      this._registry.devices.set(id, updatedDevice);
      this._registry.updatedAt = Date.now();

      if (oldStatus === 'online' && status !== 'online') this._registry.onlineCount--;
      if (oldStatus !== 'online' && status === 'online') this._registry.onlineCount++;
      if (oldStatus === 'offline' && status !== 'offline') this._registry.offlineCount--;
      if (oldStatus !== 'offline' && status === 'offline') this._registry.offlineCount++;

      this._recordEvent(id, 'status_change', { oldStatus, newStatus: status, properties }, status === 'error' ? 'critical' : 'low');
    }
    this._recordHistory(`updateDeviceStatus(id=${id}, status=${status})`);
    return { id, status, updated, properties: properties ||import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0',
    };

    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.onlineCount++;
    this._registry.updatedAt = Date.now();

    this._shadows.set(id, {
      deviceId: id,
      desired: {},
      reported: {},
      delta: {},
      version: 1,
      timestamp: Date.now(),
    });

    this._recordHistory(`registerDevice(id=${id}, type=${type}, capabilities=${capabilities.length})`);
    return { device, registered: true, id };
  }

  public bulkRegister(devices: { id: string; type: string; capabilities: string[] }[]): { registered: number; skipped: number; devices: IoTDevice[] } {
    const registeredDevices: IoTDevice[] = [];
    let registered = 0;
    let skipped = 0;

    for (const device of devices) {
      const result = this.registerDevice(device.id, device.type, device.capabilities);
      if (result.registered) {
        registered++;
        registeredDevices.push(result.device);
      } else {
        skipped++;
      }
    }

    this._recordHistory(`bulkRegister(devices=${devices.length}) -> registered=${registered}, skipped=${skipped}`);
    return { registered, skipped, devices: registeredDevices };
  }

  public unregisterDevice(id: string): { id: string; unregistered: boolean; removed: boolean } {
    const removed = this._devices.has(id);
    if (removed) {
      const device = this._devices.get(id)!;
      this._devices.delete(id);
      this._registry.devices.delete(id);
      this._registry.count--;
      if (device.status === 'online') this._registry.onlineCount--;
      else this._registry.offlineCount--;
      this._registry.updatedAt = Date.now();
      this._shadows.delete(id);
      this._firmwareUpdates.delete(id);
      this._configs.delete(id);
    }
    this._recordHistory(`unregisterDevice(id=${id}) -> ${removed}`);
    return { id, unregistered: removed, removed };
  }

  public updateDeviceStatus(id: string, status: IoTDevice['status'], properties?: Record<string, unknown>): { id: string; status: string; updated: boolean; properties: Record<string, unknown> } {
    const device = this._devices.get(id);
    const updated = !!device;
    if (device) {
      const oldStatus = device.status;
      const updatedDevice: IoTDevice = { ...device, status, lastSeen: Date.now(), metadata: { ...device.metadata, ...properties } };
      this._devices.set(id, updatedDevice);
      this._registry.devices.set(id, updatedDevice);
      this._registry.updatedAt = Date.now();

      if (oldStatus === 'online' && status !== 'online') this._registry.onlineCount--;
      if (oldStatus !== 'online' && status === 'online') this._registry.onlineCount++;
      if (oldStatus === 'offline' && status !== 'offline') this._registry.offlineCount--;
      if (oldStatus !== 'offline' && status === 'offline') this._registry.offlineCount++;

      this._recordEvent(id, 'status_change', { oldStatus, newStatus: status, properties }, status === 'error' ? 'critical' : 'low');
    }
    this._recordHistory(`updateDeviceStatus(id=${id}, status=${status})`);
    return { id, status, updated, properties: properties || {} };
  }

  public deviceList(filter?: string, pagination?: { page: number; pageSize: number }): { devices:import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0',
    };

    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.onlineCount++;
    this._registry.updatedAt = Date.now();

    this._shadows.set(id, {
      deviceId: id,
      desired: {},
      reported: {},
      delta: {},
      version: 1,
      timestamp: Date.now(),
    });

    this._recordHistory(`registerDevice(id=${id}, type=${type}, capabilities=${capabilities.length})`);
    return { device, registered: true, id };
  }

  public bulkRegister(devices: { id: string; type: string; capabilities: string[] }[]): { registered: number; skipped: number; devices: IoTDevice[] } {
    const registeredDevices: IoTDevice[] = [];
    let registered = 0;
    let skipped = 0;

    for (const device of devices) {
      const result = this.registerDevice(device.id, device.type, device.capabilities);
      if (result.registered) {
        registered++;
        registeredDevices.push(result.device);
      } else {
        skipped++;
      }
    }

    this._recordHistory(`bulkRegister(devices=${devices.length}) -> registered=${registered}, skipped=${skipped}`);
    return { registered, skipped, devices: registeredDevices };
  }

  public unregisterDevice(id: string): { id: string; unregistered: boolean; removed: boolean } {
    const removed = this._devices.has(id);
    if (removed) {
      const device = this._devices.get(id)!;
      this._devices.delete(id);
      this._registry.devices.delete(id);
      this._registry.count--;
      if (device.status === 'online') this._registry.onlineCount--;
      else this._registry.offlineCount--;
      this._registry.updatedAt = Date.now();
      this._shadows.delete(id);
      this._firmwareUpdates.delete(id);
      this._configs.delete(id);
    }
    this._recordHistory(`unregisterDevice(id=${id}) -> ${removed}`);
    return { id, unregistered: removed, removed };
  }

  public updateDeviceStatus(id: string, status: IoTDevice['status'], properties?: Record<string, unknown>): { id: string; status: string; updated: boolean; properties: Record<string, unknown> } {
    const device = this._devices.get(id);
    const updated = !!device;
    if (device) {
      const oldStatus = device.status;
      const updatedDevice: IoTDevice = { ...device, status, lastSeen: Date.now(), metadata: { ...device.metadata, ...properties } };
      this._devices.set(id, updatedDevice);
      this._registry.devices.set(id, updatedDevice);
      this._registry.updatedAt = Date.now();

      if (oldStatus === 'online' && status !== 'online') this._registry.onlineCount--;
      if (oldStatus !== 'online' && status === 'online') this._registry.onlineCount++;
      if (oldStatus === 'offline' && status !== 'offline') this._registry.offlineCount--;
      if (oldStatus !== 'offline' && status === 'offline') this._registry.offlineCount++;

      this._recordEvent(id, 'status_change', { oldStatus, newStatus: status, properties }, status === 'error' ? 'critical' : 'low');
    }
    this._recordHistory(`updateDeviceStatus(id=${id}, status=${status})`);
    return { id, status, updated, properties: properties || {} };
  }

  public deviceList(filter?: string, pagination?: { page: number; pageSize: number }): { devices: IoTDevice[]; total: number; page: number; pageSize: number } {
import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0',
    };

    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.onlineCount++;
    this._registry.updatedAt = Date.now();

    this._shadows.set(id, {
      deviceId: id,
      desired: {},
      reported: {},
      delta: {},
      version: 1,
      timestamp: Date.now(),
    });

    this._recordHistory(`registerDevice(id=${id}, type=${type}, capabilities=${capabilities.length})`);
    return { device, registered: true, id };
  }

  public bulkRegister(devices: { id: string; type: string; capabilities: string[] }[]): { registered: number; skipped: number; devices: IoTDevice[] } {
    const registeredDevices: IoTDevice[] = [];
    let registered = 0;
    let skipped = 0;

    for (const device of devices) {
      const result = this.registerDevice(device.id, device.type, device.capabilities);
      if (result.registered) {
        registered++;
        registeredDevices.push(result.device);
      } else {
        skipped++;
      }
    }

    this._recordHistory(`bulkRegister(devices=${devices.length}) -> registered=${registered}, skipped=${skipped}`);
    return { registered, skipped, devices: registeredDevices };
  }

  public unregisterDevice(id: string): { id: string; unregistered: boolean; removed: boolean } {
    const removed = this._devices.has(id);
    if (removed) {
      const device = this._devices.get(id)!;
      this._devices.delete(id);
      this._registry.devices.delete(id);
      this._registry.count--;
      if (device.status === 'online') this._registry.onlineCount--;
      else this._registry.offlineCount--;
      this._registry.updatedAt = Date.now();
      this._shadows.delete(id);
      this._firmwareUpdates.delete(id);
      this._configs.delete(id);
    }
    this._recordHistory(`unregisterDevice(id=${id}) -> ${removed}`);
    return { id, unregistered: removed, removed };
  }

  public updateDeviceStatus(id: string, status: IoTDevice['status'], properties?: Record<string, unknown>): { id: string; status: string; updated: boolean; properties: Record<string, unknown> } {
    const device = this._devices.get(id);
    const updated = !!device;
    if (device) {
      const oldStatus = device.status;
      const updatedDevice: IoTDevice = { ...device, status, lastSeen: Date.now(), metadata: { ...device.metadata, ...properties } };
      this._devices.set(id, updatedDevice);
      this._registry.devices.set(id, updatedDevice);
      this._registry.updatedAt = Date.now();

      if (oldStatus === 'online' && status !== 'online') this._registry.onlineCount--;
      if (oldStatus !== 'online' && status === 'online') this._registry.onlineCount++;
      if (oldStatus === 'offline' && status !== 'offline') this._registry.offlineCount--;
      if (oldStatus !== 'offline' && status === 'offline') this._registry.offlineCount++;

      this._recordEvent(id, 'status_change', { oldStatus, newStatus: status, properties }, status === 'error' ? 'critical' : 'low');
    }
    this._recordHistory(`updateDeviceStatus(id=${id}, status=${status})`);
    return { id, status, updated, properties: properties || {} };
  }

  public deviceList(filter?: string, pagination?: { page: number; pageSize: number }): { devices: IoTDevice[]; total: number; page: number; pageSize: number } {
    const all = Array.from(this._devices.valuesimport { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0',
    };

    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.onlineCount++;
    this._registry.updatedAt = Date.now();

    this._shadows.set(id, {
      deviceId: id,
      desired: {},
      reported: {},
      delta: {},
      version: 1,
      timestamp: Date.now(),
    });

    this._recordHistory(`registerDevice(id=${id}, type=${type}, capabilities=${capabilities.length})`);
    return { device, registered: true, id };
  }

  public bulkRegister(devices: { id: string; type: string; capabilities: string[] }[]): { registered: number; skipped: number; devices: IoTDevice[] } {
    const registeredDevices: IoTDevice[] = [];
    let registered = 0;
    let skipped = 0;

    for (const device of devices) {
      const result = this.registerDevice(device.id, device.type, device.capabilities);
      if (result.registered) {
        registered++;
        registeredDevices.push(result.device);
      } else {
        skipped++;
      }
    }

    this._recordHistory(`bulkRegister(devices=${devices.length}) -> registered=${registered}, skipped=${skipped}`);
    return { registered, skipped, devices: registeredDevices };
  }

  public unregisterDevice(id: string): { id: string; unregistered: boolean; removed: boolean } {
    const removed = this._devices.has(id);
    if (removed) {
      const device = this._devices.get(id)!;
      this._devices.delete(id);
      this._registry.devices.delete(id);
      this._registry.count--;
      if (device.status === 'online') this._registry.onlineCount--;
      else this._registry.offlineCount--;
      this._registry.updatedAt = Date.now();
      this._shadows.delete(id);
      this._firmwareUpdates.delete(id);
      this._configs.delete(id);
    }
    this._recordHistory(`unregisterDevice(id=${id}) -> ${removed}`);
    return { id, unregistered: removed, removed };
  }

  public updateDeviceStatus(id: string, status: IoTDevice['status'], properties?: Record<string, unknown>): { id: string; status: string; updated: boolean; properties: Record<string, unknown> } {
    const device = this._devices.get(id);
    const updated = !!device;
    if (device) {
      const oldStatus = device.status;
      const updatedDevice: IoTDevice = { ...device, status, lastSeen: Date.now(), metadata: { ...device.metadata, ...properties } };
      this._devices.set(id, updatedDevice);
      this._registry.devices.set(id, updatedDevice);
      this._registry.updatedAt = Date.now();

      if (oldStatus === 'online' && status !== 'online') this._registry.onlineCount--;
      if (oldStatus !== 'online' && status === 'online') this._registry.onlineCount++;
      if (oldStatus === 'offline' && status !== 'offline') this._registry.offlineCount--;
      if (oldStatus !== 'offline' && status === 'offline') this._registry.offlineCount++;

      this._recordEvent(id, 'status_change', { oldStatus, newStatus: status, properties }, status === 'error' ? 'critical' : 'low');
    }
    this._recordHistory(`updateDeviceStatus(id=${id}, status=${status})`);
    return { id, status, updated, properties: properties || {} };
  }

  public deviceList(filter?: string, pagination?: { page: number; pageSize: number }): { devices: IoTDevice[]; total: number; page: number; pageSize: number } {
    const all = Array.from(this._devices.values());
    const filtered = filter ? all.filterimport { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0',
    };

    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.onlineCount++;
    this._registry.updatedAt = Date.now();

    this._shadows.set(id, {
      deviceId: id,
      desired: {},
      reported: {},
      delta: {},
      version: 1,
      timestamp: Date.now(),
    });

    this._recordHistory(`registerDevice(id=${id}, type=${type}, capabilities=${capabilities.length})`);
    return { device, registered: true, id };
  }

  public bulkRegister(devices: { id: string; type: string; capabilities: string[] }[]): { registered: number; skipped: number; devices: IoTDevice[] } {
    const registeredDevices: IoTDevice[] = [];
    let registered = 0;
    let skipped = 0;

    for (const device of devices) {
      const result = this.registerDevice(device.id, device.type, device.capabilities);
      if (result.registered) {
        registered++;
        registeredDevices.push(result.device);
      } else {
        skipped++;
      }
    }

    this._recordHistory(`bulkRegister(devices=${devices.length}) -> registered=${registered}, skipped=${skipped}`);
    return { registered, skipped, devices: registeredDevices };
  }

  public unregisterDevice(id: string): { id: string; unregistered: boolean; removed: boolean } {
    const removed = this._devices.has(id);
    if (removed) {
      const device = this._devices.get(id)!;
      this._devices.delete(id);
      this._registry.devices.delete(id);
      this._registry.count--;
      if (device.status === 'online') this._registry.onlineCount--;
      else this._registry.offlineCount--;
      this._registry.updatedAt = Date.now();
      this._shadows.delete(id);
      this._firmwareUpdates.delete(id);
      this._configs.delete(id);
    }
    this._recordHistory(`unregisterDevice(id=${id}) -> ${removed}`);
    return { id, unregistered: removed, removed };
  }

  public updateDeviceStatus(id: string, status: IoTDevice['status'], properties?: Record<string, unknown>): { id: string; status: string; updated: boolean; properties: Record<string, unknown> } {
    const device = this._devices.get(id);
    const updated = !!device;
    if (device) {
      const oldStatus = device.status;
      const updatedDevice: IoTDevice = { ...device, status, lastSeen: Date.now(), metadata: { ...device.metadata, ...properties } };
      this._devices.set(id, updatedDevice);
      this._registry.devices.set(id, updatedDevice);
      this._registry.updatedAt = Date.now();

      if (oldStatus === 'online' && status !== 'online') this._registry.onlineCount--;
      if (oldStatus !== 'online' && status === 'online') this._registry.onlineCount++;
      if (oldStatus === 'offline' && status !== 'offline') this._registry.offlineCount--;
      if (oldStatus !== 'offline' && status === 'offline') this._registry.offlineCount++;

      this._recordEvent(id, 'status_change', { oldStatus, newStatus: status, properties }, status === 'error' ? 'critical' : 'low');
    }
    this._recordHistory(`updateDeviceStatus(id=${id}, status=${status})`);
    return { id, status, updated, properties: properties || {} };
  }

  public deviceList(filter?: string, pagination?: { page: number; pageSize: number }): { devices: IoTDevice[]; total: number; page: number; pageSize: number } {
    const all = Array.from(this._devices.values());
    const filtered = filter ? all.filter(d => d.type.includes(filter) || d.idimport { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0',
    };

    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.onlineCount++;
    this._registry.updatedAt = Date.now();

    this._shadows.set(id, {
      deviceId: id,
      desired: {},
      reported: {},
      delta: {},
      version: 1,
      timestamp: Date.now(),
    });

    this._recordHistory(`registerDevice(id=${id}, type=${type}, capabilities=${capabilities.length})`);
    return { device, registered: true, id };
  }

  public bulkRegister(devices: { id: string; type: string; capabilities: string[] }[]): { registered: number; skipped: number; devices: IoTDevice[] } {
    const registeredDevices: IoTDevice[] = [];
    let registered = 0;
    let skipped = 0;

    for (const device of devices) {
      const result = this.registerDevice(device.id, device.type, device.capabilities);
      if (result.registered) {
        registered++;
        registeredDevices.push(result.device);
      } else {
        skipped++;
      }
    }

    this._recordHistory(`bulkRegister(devices=${devices.length}) -> registered=${registered}, skipped=${skipped}`);
    return { registered, skipped, devices: registeredDevices };
  }

  public unregisterDevice(id: string): { id: string; unregistered: boolean; removed: boolean } {
    const removed = this._devices.has(id);
    if (removed) {
      const device = this._devices.get(id)!;
      this._devices.delete(id);
      this._registry.devices.delete(id);
      this._registry.count--;
      if (device.status === 'online') this._registry.onlineCount--;
      else this._registry.offlineCount--;
      this._registry.updatedAt = Date.now();
      this._shadows.delete(id);
      this._firmwareUpdates.delete(id);
      this._configs.delete(id);
    }
    this._recordHistory(`unregisterDevice(id=${id}) -> ${removed}`);
    return { id, unregistered: removed, removed };
  }

  public updateDeviceStatus(id: string, status: IoTDevice['status'], properties?: Record<string, unknown>): { id: string; status: string; updated: boolean; properties: Record<string, unknown> } {
    const device = this._devices.get(id);
    const updated = !!device;
    if (device) {
      const oldStatus = device.status;
      const updatedDevice: IoTDevice = { ...device, status, lastSeen: Date.now(), metadata: { ...device.metadata, ...properties } };
      this._devices.set(id, updatedDevice);
      this._registry.devices.set(id, updatedDevice);
      this._registry.updatedAt = Date.now();

      if (oldStatus === 'online' && status !== 'online') this._registry.onlineCount--;
      if (oldStatus !== 'online' && status === 'online') this._registry.onlineCount++;
      if (oldStatus === 'offline' && status !== 'offline') this._registry.offlineCount--;
      if (oldStatus !== 'offline' && status === 'offline') this._registry.offlineCount++;

      this._recordEvent(id, 'status_change', { oldStatus, newStatus: status, properties }, status === 'error' ? 'critical' : 'low');
    }
    this._recordHistory(`updateDeviceStatus(id=${id}, status=${status})`);
    return { id, status, updated, properties: properties || {} };
  }

  public deviceList(filter?: string, pagination?: { page: number; pageSize: number }): { devices: IoTDevice[]; total: number; page: number; pageSize: number } {
    const all = Array.from(this._devices.values());
    const filtered = filter ? all.filter(d => d.type.includes(filter) || d.id.includes(filter) || d.capabilities.includes(filter))import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0',
    };

    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.onlineCount++;
    this._registry.updatedAt = Date.now();

    this._shadows.set(id, {
      deviceId: id,
      desired: {},
      reported: {},
      delta: {},
      version: 1,
      timestamp: Date.now(),
    });

    this._recordHistory(`registerDevice(id=${id}, type=${type}, capabilities=${capabilities.length})`);
    return { device, registered: true, id };
  }

  public bulkRegister(devices: { id: string; type: string; capabilities: string[] }[]): { registered: number; skipped: number; devices: IoTDevice[] } {
    const registeredDevices: IoTDevice[] = [];
    let registered = 0;
    let skipped = 0;

    for (const device of devices) {
      const result = this.registerDevice(device.id, device.type, device.capabilities);
      if (result.registered) {
        registered++;
        registeredDevices.push(result.device);
      } else {
        skipped++;
      }
    }

    this._recordHistory(`bulkRegister(devices=${devices.length}) -> registered=${registered}, skipped=${skipped}`);
    return { registered, skipped, devices: registeredDevices };
  }

  public unregisterDevice(id: string): { id: string; unregistered: boolean; removed: boolean } {
    const removed = this._devices.has(id);
    if (removed) {
      const device = this._devices.get(id)!;
      this._devices.delete(id);
      this._registry.devices.delete(id);
      this._registry.count--;
      if (device.status === 'online') this._registry.onlineCount--;
      else this._registry.offlineCount--;
      this._registry.updatedAt = Date.now();
      this._shadows.delete(id);
      this._firmwareUpdates.delete(id);
      this._configs.delete(id);
    }
    this._recordHistory(`unregisterDevice(id=${id}) -> ${removed}`);
    return { id, unregistered: removed, removed };
  }

  public updateDeviceStatus(id: string, status: IoTDevice['status'], properties?: Record<string, unknown>): { id: string; status: string; updated: boolean; properties: Record<string, unknown> } {
    const device = this._devices.get(id);
    const updated = !!device;
    if (device) {
      const oldStatus = device.status;
      const updatedDevice: IoTDevice = { ...device, status, lastSeen: Date.now(), metadata: { ...device.metadata, ...properties } };
      this._devices.set(id, updatedDevice);
      this._registry.devices.set(id, updatedDevice);
      this._registry.updatedAt = Date.now();

      if (oldStatus === 'online' && status !== 'online') this._registry.onlineCount--;
      if (oldStatus !== 'online' && status === 'online') this._registry.onlineCount++;
      if (oldStatus === 'offline' && status !== 'offline') this._registry.offlineCount--;
      if (oldStatus !== 'offline' && status === 'offline') this._registry.offlineCount++;

      this._recordEvent(id, 'status_change', { oldStatus, newStatus: status, properties }, status === 'error' ? 'critical' : 'low');
    }
    this._recordHistory(`updateDeviceStatus(id=${id}, status=${status})`);
    return { id, status, updated, properties: properties || {} };
  }

  public deviceList(filter?: string, pagination?: { page: number; pageSize: number }): { devices: IoTDevice[]; total: number; page: number; pageSize: number } {
    const all = Array.from(this._devices.values());
    const filtered = filter ? all.filter(d => d.type.includes(filter) || d.id.includes(filter) || d.capabilities.includes(filter)) : all;
    
    const page = pagination?.import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0',
    };

    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.onlineCount++;
    this._registry.updatedAt = Date.now();

    this._shadows.set(id, {
      deviceId: id,
      desired: {},
      reported: {},
      delta: {},
      version: 1,
      timestamp: Date.now(),
    });

    this._recordHistory(`registerDevice(id=${id}, type=${type}, capabilities=${capabilities.length})`);
    return { device, registered: true, id };
  }

  public bulkRegister(devices: { id: string; type: string; capabilities: string[] }[]): { registered: number; skipped: number; devices: IoTDevice[] } {
    const registeredDevices: IoTDevice[] = [];
    let registered = 0;
    let skipped = 0;

    for (const device of devices) {
      const result = this.registerDevice(device.id, device.type, device.capabilities);
      if (result.registered) {
        registered++;
        registeredDevices.push(result.device);
      } else {
        skipped++;
      }
    }

    this._recordHistory(`bulkRegister(devices=${devices.length}) -> registered=${registered}, skipped=${skipped}`);
    return { registered, skipped, devices: registeredDevices };
  }

  public unregisterDevice(id: string): { id: string; unregistered: boolean; removed: boolean } {
    const removed = this._devices.has(id);
    if (removed) {
      const device = this._devices.get(id)!;
      this._devices.delete(id);
      this._registry.devices.delete(id);
      this._registry.count--;
      if (device.status === 'online') this._registry.onlineCount--;
      else this._registry.offlineCount--;
      this._registry.updatedAt = Date.now();
      this._shadows.delete(id);
      this._firmwareUpdates.delete(id);
      this._configs.delete(id);
    }
    this._recordHistory(`unregisterDevice(id=${id}) -> ${removed}`);
    return { id, unregistered: removed, removed };
  }

  public updateDeviceStatus(id: string, status: IoTDevice['status'], properties?: Record<string, unknown>): { id: string; status: string; updated: boolean; properties: Record<string, unknown> } {
    const device = this._devices.get(id);
    const updated = !!device;
    if (device) {
      const oldStatus = device.status;
      const updatedDevice: IoTDevice = { ...device, status, lastSeen: Date.now(), metadata: { ...device.metadata, ...properties } };
      this._devices.set(id, updatedDevice);
      this._registry.devices.set(id, updatedDevice);
      this._registry.updatedAt = Date.now();

      if (oldStatus === 'online' && status !== 'online') this._registry.onlineCount--;
      if (oldStatus !== 'online' && status === 'online') this._registry.onlineCount++;
      if (oldStatus === 'offline' && status !== 'offline') this._registry.offlineCount--;
      if (oldStatus !== 'offline' && status === 'offline') this._registry.offlineCount++;

      this._recordEvent(id, 'status_change', { oldStatus, newStatus: status, properties }, status === 'error' ? 'critical' : 'low');
    }
    this._recordHistory(`updateDeviceStatus(id=${id}, status=${status})`);
    return { id, status, updated, properties: properties || {} };
  }

  public deviceList(filter?: string, pagination?: { page: number; pageSize: number }): { devices: IoTDevice[]; total: number; page: number; pageSize: number } {
    const all = Array.from(this._devices.values());
    const filtered = filter ? all.filter(d => d.type.includes(filter) || d.id.includes(filter) || d.capabilities.includes(filter)) : all;
    
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 20;
    const start = (page - 1import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0',
    };

    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.onlineCount++;
    this._registry.updatedAt = Date.now();

    this._shadows.set(id, {
      deviceId: id,
      desired: {},
      reported: {},
      delta: {},
      version: 1,
      timestamp: Date.now(),
    });

    this._recordHistory(`registerDevice(id=${id}, type=${type}, capabilities=${capabilities.length})`);
    return { device, registered: true, id };
  }

  public bulkRegister(devices: { id: string; type: string; capabilities: string[] }[]): { registered: number; skipped: number; devices: IoTDevice[] } {
    const registeredDevices: IoTDevice[] = [];
    let registered = 0;
    let skipped = 0;

    for (const device of devices) {
      const result = this.registerDevice(device.id, device.type, device.capabilities);
      if (result.registered) {
        registered++;
        registeredDevices.push(result.device);
      } else {
        skipped++;
      }
    }

    this._recordHistory(`bulkRegister(devices=${devices.length}) -> registered=${registered}, skipped=${skipped}`);
    return { registered, skipped, devices: registeredDevices };
  }

  public unregisterDevice(id: string): { id: string; unregistered: boolean; removed: boolean } {
    const removed = this._devices.has(id);
    if (removed) {
      const device = this._devices.get(id)!;
      this._devices.delete(id);
      this._registry.devices.delete(id);
      this._registry.count--;
      if (device.status === 'online') this._registry.onlineCount--;
      else this._registry.offlineCount--;
      this._registry.updatedAt = Date.now();
      this._shadows.delete(id);
      this._firmwareUpdates.delete(id);
      this._configs.delete(id);
    }
    this._recordHistory(`unregisterDevice(id=${id}) -> ${removed}`);
    return { id, unregistered: removed, removed };
  }

  public updateDeviceStatus(id: string, status: IoTDevice['status'], properties?: Record<string, unknown>): { id: string; status: string; updated: boolean; properties: Record<string, unknown> } {
    const device = this._devices.get(id);
    const updated = !!device;
    if (device) {
      const oldStatus = device.status;
      const updatedDevice: IoTDevice = { ...device, status, lastSeen: Date.now(), metadata: { ...device.metadata, ...properties } };
      this._devices.set(id, updatedDevice);
      this._registry.devices.set(id, updatedDevice);
      this._registry.updatedAt = Date.now();

      if (oldStatus === 'online' && status !== 'online') this._registry.onlineCount--;
      if (oldStatus !== 'online' && status === 'online') this._registry.onlineCount++;
      if (oldStatus === 'offline' && status !== 'offline') this._registry.offlineCount--;
      if (oldStatus !== 'offline' && status === 'offline') this._registry.offlineCount++;

      this._recordEvent(id, 'status_change', { oldStatus, newStatus: status, properties }, status === 'error' ? 'critical' : 'low');
    }
    this._recordHistory(`updateDeviceStatus(id=${id}, status=${status})`);
    return { id, status, updated, properties: properties || {} };
  }

  public deviceList(filter?: string, pagination?: { page: number; pageSize: number }): { devices: IoTDevice[]; total: number; page: number; pageSize: number } {
    const all = Array.from(this._devices.values());
    const filtered = filter ? all.filter(d => d.type.includes(filter) || d.id.includes(filter) || d.capabilities.includes(filter)) : all;
    
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 20;
    const start = (page - 1) * pageSize;
    const devices = filtered.slice(start, start + pageSize);

import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0',
    };

    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.onlineCount++;
    this._registry.updatedAt = Date.now();

    this._shadows.set(id, {
      deviceId: id,
      desired: {},
      reported: {},
      delta: {},
      version: 1,
      timestamp: Date.now(),
    });

    this._recordHistory(`registerDevice(id=${id}, type=${type}, capabilities=${capabilities.length})`);
    return { device, registered: true, id };
  }

  public bulkRegister(devices: { id: string; type: string; capabilities: string[] }[]): { registered: number; skipped: number; devices: IoTDevice[] } {
    const registeredDevices: IoTDevice[] = [];
    let registered = 0;
    let skipped = 0;

    for (const device of devices) {
      const result = this.registerDevice(device.id, device.type, device.capabilities);
      if (result.registered) {
        registered++;
        registeredDevices.push(result.device);
      } else {
        skipped++;
      }
    }

    this._recordHistory(`bulkRegister(devices=${devices.length}) -> registered=${registered}, skipped=${skipped}`);
    return { registered, skipped, devices: registeredDevices };
  }

  public unregisterDevice(id: string): { id: string; unregistered: boolean; removed: boolean } {
    const removed = this._devices.has(id);
    if (removed) {
      const device = this._devices.get(id)!;
      this._devices.delete(id);
      this._registry.devices.delete(id);
      this._registry.count--;
      if (device.status === 'online') this._registry.onlineCount--;
      else this._registry.offlineCount--;
      this._registry.updatedAt = Date.now();
      this._shadows.delete(id);
      this._firmwareUpdates.delete(id);
      this._configs.delete(id);
    }
    this._recordHistory(`unregisterDevice(id=${id}) -> ${removed}`);
    return { id, unregistered: removed, removed };
  }

  public updateDeviceStatus(id: string, status: IoTDevice['status'], properties?: Record<string, unknown>): { id: string; status: string; updated: boolean; properties: Record<string, unknown> } {
    const device = this._devices.get(id);
    const updated = !!device;
    if (device) {
      const oldStatus = device.status;
      const updatedDevice: IoTDevice = { ...device, status, lastSeen: Date.now(), metadata: { ...device.metadata, ...properties } };
      this._devices.set(id, updatedDevice);
      this._registry.devices.set(id, updatedDevice);
      this._registry.updatedAt = Date.now();

      if (oldStatus === 'online' && status !== 'online') this._registry.onlineCount--;
      if (oldStatus !== 'online' && status === 'online') this._registry.onlineCount++;
      if (oldStatus === 'offline' && status !== 'offline') this._registry.offlineCount--;
      if (oldStatus !== 'offline' && status === 'offline') this._registry.offlineCount++;

      this._recordEvent(id, 'status_change', { oldStatus, newStatus: status, properties }, status === 'error' ? 'critical' : 'low');
    }
    this._recordHistory(`updateDeviceStatus(id=${id}, status=${status})`);
    return { id, status, updated, properties: properties || {} };
  }

  public deviceList(filter?: string, pagination?: { page: number; pageSize: number }): { devices: IoTDevice[]; total: number; page: number; pageSize: number } {
    const all = Array.from(this._devices.values());
    const filtered = filter ? all.filter(d => d.type.includes(filter) || d.id.includes(filter) || d.capabilities.includes(filter)) : all;
    
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 20;
    const start = (page - 1) * pageSize;
    const devices = filtered.slice(start, start + pageSize);

    this._recordHistory(`deviceList(filter=${import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0',
    };

    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.onlineCount++;
    this._registry.updatedAt = Date.now();

    this._shadows.set(id, {
      deviceId: id,
      desired: {},
      reported: {},
      delta: {},
      version: 1,
      timestamp: Date.now(),
    });

    this._recordHistory(`registerDevice(id=${id}, type=${type}, capabilities=${capabilities.length})`);
    return { device, registered: true, id };
  }

  public bulkRegister(devices: { id: string; type: string; capabilities: string[] }[]): { registered: number; skipped: number; devices: IoTDevice[] } {
    const registeredDevices: IoTDevice[] = [];
    let registered = 0;
    let skipped = 0;

    for (const device of devices) {
      const result = this.registerDevice(device.id, device.type, device.capabilities);
      if (result.registered) {
        registered++;
        registeredDevices.push(result.device);
      } else {
        skipped++;
      }
    }

    this._recordHistory(`bulkRegister(devices=${devices.length}) -> registered=${registered}, skipped=${skipped}`);
    return { registered, skipped, devices: registeredDevices };
  }

  public unregisterDevice(id: string): { id: string; unregistered: boolean; removed: boolean } {
    const removed = this._devices.has(id);
    if (removed) {
      const device = this._devices.get(id)!;
      this._devices.delete(id);
      this._registry.devices.delete(id);
      this._registry.count--;
      if (device.status === 'online') this._registry.onlineCount--;
      else this._registry.offlineCount--;
      this._registry.updatedAt = Date.now();
      this._shadows.delete(id);
      this._firmwareUpdates.delete(id);
      this._configs.delete(id);
    }
    this._recordHistory(`unregisterDevice(id=${id}) -> ${removed}`);
    return { id, unregistered: removed, removed };
  }

  public updateDeviceStatus(id: string, status: IoTDevice['status'], properties?: Record<string, unknown>): { id: string; status: string; updated: boolean; properties: Record<string, unknown> } {
    const device = this._devices.get(id);
    const updated = !!device;
    if (device) {
      const oldStatus = device.status;
      const updatedDevice: IoTDevice = { ...device, status, lastSeen: Date.now(), metadata: { ...device.metadata, ...properties } };
      this._devices.set(id, updatedDevice);
      this._registry.devices.set(id, updatedDevice);
      this._registry.updatedAt = Date.now();

      if (oldStatus === 'online' && status !== 'online') this._registry.onlineCount--;
      if (oldStatus !== 'online' && status === 'online') this._registry.onlineCount++;
      if (oldStatus === 'offline' && status !== 'offline') this._registry.offlineCount--;
      if (oldStatus !== 'offline' && status === 'offline') this._registry.offlineCount++;

      this._recordEvent(id, 'status_change', { oldStatus, newStatus: status, properties }, status === 'error' ? 'critical' : 'low');
    }
    this._recordHistory(`updateDeviceStatus(id=${id}, status=${status})`);
    return { id, status, updated, properties: properties || {} };
  }

  public deviceList(filter?: string, pagination?: { page: number; pageSize: number }): { devices: IoTDevice[]; total: number; page: number; pageSize: number } {
    const all = Array.from(this._devices.values());
    const filtered = filter ? all.filter(d => d.type.includes(filter) || d.id.includes(filter) || d.capabilities.includes(filter)) : all;
    
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 20;
    const start = (page - 1) * pageSize;
    const devices = filtered.slice(start, start + pageSize);

    this._recordHistory(`deviceList(filter=${filter ?? 'none'}, page=${page}) ->import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0',
    };

    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.onlineCount++;
    this._registry.updatedAt = Date.now();

    this._shadows.set(id, {
      deviceId: id,
      desired: {},
      reported: {},
      delta: {},
      version: 1,
      timestamp: Date.now(),
    });

    this._recordHistory(`registerDevice(id=${id}, type=${type}, capabilities=${capabilities.length})`);
    return { device, registered: true, id };
  }

  public bulkRegister(devices: { id: string; type: string; capabilities: string[] }[]): { registered: number; skipped: number; devices: IoTDevice[] } {
    const registeredDevices: IoTDevice[] = [];
    let registered = 0;
    let skipped = 0;

    for (const device of devices) {
      const result = this.registerDevice(device.id, device.type, device.capabilities);
      if (result.registered) {
        registered++;
        registeredDevices.push(result.device);
      } else {
        skipped++;
      }
    }

    this._recordHistory(`bulkRegister(devices=${devices.length}) -> registered=${registered}, skipped=${skipped}`);
    return { registered, skipped, devices: registeredDevices };
  }

  public unregisterDevice(id: string): { id: string; unregistered: boolean; removed: boolean } {
    const removed = this._devices.has(id);
    if (removed) {
      const device = this._devices.get(id)!;
      this._devices.delete(id);
      this._registry.devices.delete(id);
      this._registry.count--;
      if (device.status === 'online') this._registry.onlineCount--;
      else this._registry.offlineCount--;
      this._registry.updatedAt = Date.now();
      this._shadows.delete(id);
      this._firmwareUpdates.delete(id);
      this._configs.delete(id);
    }
    this._recordHistory(`unregisterDevice(id=${id}) -> ${removed}`);
    return { id, unregistered: removed, removed };
  }

  public updateDeviceStatus(id: string, status: IoTDevice['status'], properties?: Record<string, unknown>): { id: string; status: string; updated: boolean; properties: Record<string, unknown> } {
    const device = this._devices.get(id);
    const updated = !!device;
    if (device) {
      const oldStatus = device.status;
      const updatedDevice: IoTDevice = { ...device, status, lastSeen: Date.now(), metadata: { ...device.metadata, ...properties } };
      this._devices.set(id, updatedDevice);
      this._registry.devices.set(id, updatedDevice);
      this._registry.updatedAt = Date.now();

      if (oldStatus === 'online' && status !== 'online') this._registry.onlineCount--;
      if (oldStatus !== 'online' && status === 'online') this._registry.onlineCount++;
      if (oldStatus === 'offline' && status !== 'offline') this._registry.offlineCount--;
      if (oldStatus !== 'offline' && status === 'offline') this._registry.offlineCount++;

      this._recordEvent(id, 'status_change', { oldStatus, newStatus: status, properties }, status === 'error' ? 'critical' : 'low');
    }
    this._recordHistory(`updateDeviceStatus(id=${id}, status=${status})`);
    return { id, status, updated, properties: properties || {} };
  }

  public deviceList(filter?: string, pagination?: { page: number; pageSize: number }): { devices: IoTDevice[]; total: number; page: number; pageSize: number } {
    const all = Array.from(this._devices.values());
    const filtered = filter ? all.filter(d => d.type.includes(filter) || d.id.includes(filter) || d.capabilities.includes(filter)) : all;
    
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 20;
    const start = (page - 1) * pageSize;
    const devices = filtered.slice(start, start + pageSize);

    this._recordHistory(`deviceList(filter=${filter ?? 'none'}, page=${page}) -> ${devices.length} results`);
    return { devices, total: filtered.length, page, pageSize };
  }

  public deviceimport { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0',
    };

    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.onlineCount++;
    this._registry.updatedAt = Date.now();

    this._shadows.set(id, {
      deviceId: id,
      desired: {},
      reported: {},
      delta: {},
      version: 1,
      timestamp: Date.now(),
    });

    this._recordHistory(`registerDevice(id=${id}, type=${type}, capabilities=${capabilities.length})`);
    return { device, registered: true, id };
  }

  public bulkRegister(devices: { id: string; type: string; capabilities: string[] }[]): { registered: number; skipped: number; devices: IoTDevice[] } {
    const registeredDevices: IoTDevice[] = [];
    let registered = 0;
    let skipped = 0;

    for (const device of devices) {
      const result = this.registerDevice(device.id, device.type, device.capabilities);
      if (result.registered) {
        registered++;
        registeredDevices.push(result.device);
      } else {
        skipped++;
      }
    }

    this._recordHistory(`bulkRegister(devices=${devices.length}) -> registered=${registered}, skipped=${skipped}`);
    return { registered, skipped, devices: registeredDevices };
  }

  public unregisterDevice(id: string): { id: string; unregistered: boolean; removed: boolean } {
    const removed = this._devices.has(id);
    if (removed) {
      const device = this._devices.get(id)!;
      this._devices.delete(id);
      this._registry.devices.delete(id);
      this._registry.count--;
      if (device.status === 'online') this._registry.onlineCount--;
      else this._registry.offlineCount--;
      this._registry.updatedAt = Date.now();
      this._shadows.delete(id);
      this._firmwareUpdates.delete(id);
      this._configs.delete(id);
    }
    this._recordHistory(`unregisterDevice(id=${id}) -> ${removed}`);
    return { id, unregistered: removed, removed };
  }

  public updateDeviceStatus(id: string, status: IoTDevice['status'], properties?: Record<string, unknown>): { id: string; status: string; updated: boolean; properties: Record<string, unknown> } {
    const device = this._devices.get(id);
    const updated = !!device;
    if (device) {
      const oldStatus = device.status;
      const updatedDevice: IoTDevice = { ...device, status, lastSeen: Date.now(), metadata: { ...device.metadata, ...properties } };
      this._devices.set(id, updatedDevice);
      this._registry.devices.set(id, updatedDevice);
      this._registry.updatedAt = Date.now();

      if (oldStatus === 'online' && status !== 'online') this._registry.onlineCount--;
      if (oldStatus !== 'online' && status === 'online') this._registry.onlineCount++;
      if (oldStatus === 'offline' && status !== 'offline') this._registry.offlineCount--;
      if (oldStatus !== 'offline' && status === 'offline') this._registry.offlineCount++;

      this._recordEvent(id, 'status_change', { oldStatus, newStatus: status, properties }, status === 'error' ? 'critical' : 'low');
    }
    this._recordHistory(`updateDeviceStatus(id=${id}, status=${status})`);
    return { id, status, updated, properties: properties || {} };
  }

  public deviceList(filter?: string, pagination?: { page: number; pageSize: number }): { devices: IoTDevice[]; total: number; page: number; pageSize: number } {
    const all = Array.from(this._devices.values());
    const filtered = filter ? all.filter(d => d.type.includes(filter) || d.id.includes(filter) || d.capabilities.includes(filter)) : all;
    
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 20;
    const start = (page - 1) * pageSize;
    const devices = filtered.slice(start, start + pageSize);

    this._recordHistory(`deviceList(filter=${filter ?? 'none'}, page=${page}) -> ${devices.length} results`);
    return { devices, total: filtered.length, page, pageSize };
  }

  public deviceSearch(query: string, criteria?: { type?:import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0',
    };

    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.onlineCount++;
    this._registry.updatedAt = Date.now();

    this._shadows.set(id, {
      deviceId: id,
      desired: {},
      reported: {},
      delta: {},
      version: 1,
      timestamp: Date.now(),
    });

    this._recordHistory(`registerDevice(id=${id}, type=${type}, capabilities=${capabilities.length})`);
    return { device, registered: true, id };
  }

  public bulkRegister(devices: { id: string; type: string; capabilities: string[] }[]): { registered: number; skipped: number; devices: IoTDevice[] } {
    const registeredDevices: IoTDevice[] = [];
    let registered = 0;
    let skipped = 0;

    for (const device of devices) {
      const result = this.registerDevice(device.id, device.type, device.capabilities);
      if (result.registered) {
        registered++;
        registeredDevices.push(result.device);
      } else {
        skipped++;
      }
    }

    this._recordHistory(`bulkRegister(devices=${devices.length}) -> registered=${registered}, skipped=${skipped}`);
    return { registered, skipped, devices: registeredDevices };
  }

  public unregisterDevice(id: string): { id: string; unregistered: boolean; removed: boolean } {
    const removed = this._devices.has(id);
    if (removed) {
      const device = this._devices.get(id)!;
      this._devices.delete(id);
      this._registry.devices.delete(id);
      this._registry.count--;
      if (device.status === 'online') this._registry.onlineCount--;
      else this._registry.offlineCount--;
      this._registry.updatedAt = Date.now();
      this._shadows.delete(id);
      this._firmwareUpdates.delete(id);
      this._configs.delete(id);
    }
    this._recordHistory(`unregisterDevice(id=${id}) -> ${removed}`);
    return { id, unregistered: removed, removed };
  }

  public updateDeviceStatus(id: string, status: IoTDevice['status'], properties?: Record<string, unknown>): { id: string; status: string; updated: boolean; properties: Record<string, unknown> } {
    const device = this._devices.get(id);
    const updated = !!device;
    if (device) {
      const oldStatus = device.status;
      const updatedDevice: IoTDevice = { ...device, status, lastSeen: Date.now(), metadata: { ...device.metadata, ...properties } };
      this._devices.set(id, updatedDevice);
      this._registry.devices.set(id, updatedDevice);
      this._registry.updatedAt = Date.now();

      if (oldStatus === 'online' && status !== 'online') this._registry.onlineCount--;
      if (oldStatus !== 'online' && status === 'online') this._registry.onlineCount++;
      if (oldStatus === 'offline' && status !== 'offline') this._registry.offlineCount--;
      if (oldStatus !== 'offline' && status === 'offline') this._registry.offlineCount++;

      this._recordEvent(id, 'status_change', { oldStatus, newStatus: status, properties }, status === 'error' ? 'critical' : 'low');
    }
    this._recordHistory(`updateDeviceStatus(id=${id}, status=${status})`);
    return { id, status, updated, properties: properties || {} };
  }

  public deviceList(filter?: string, pagination?: { page: number; pageSize: number }): { devices: IoTDevice[]; total: number; page: number; pageSize: number } {
    const all = Array.from(this._devices.values());
    const filtered = filter ? all.filter(d => d.type.includes(filter) || d.id.includes(filter) || d.capabilities.includes(filter)) : all;
    
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 20;
    const start = (page - 1) * pageSize;
    const devices = filtered.slice(start, start + pageSize);

    this._recordHistory(`deviceList(filter=${filter ?? 'none'}, page=${page}) -> ${devices.length} results`);
    return { devices, total: filtered.length, page, pageSize };
  }

  public deviceSearch(query: string, criteria?: { type?: string; status?: string; tags?: string[]; capabilities?: string[] }): { results:import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0',
    };

    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.onlineCount++;
    this._registry.updatedAt = Date.now();

    this._shadows.set(id, {
      deviceId: id,
      desired: {},
      reported: {},
      delta: {},
      version: 1,
      timestamp: Date.now(),
    });

    this._recordHistory(`registerDevice(id=${id}, type=${type}, capabilities=${capabilities.length})`);
    return { device, registered: true, id };
  }

  public bulkRegister(devices: { id: string; type: string; capabilities: string[] }[]): { registered: number; skipped: number; devices: IoTDevice[] } {
    const registeredDevices: IoTDevice[] = [];
    let registered = 0;
    let skipped = 0;

    for (const device of devices) {
      const result = this.registerDevice(device.id, device.type, device.capabilities);
      if (result.registered) {
        registered++;
        registeredDevices.push(result.device);
      } else {
        skipped++;
      }
    }

    this._recordHistory(`bulkRegister(devices=${devices.length}) -> registered=${registered}, skipped=${skipped}`);
    return { registered, skipped, devices: registeredDevices };
  }

  public unregisterDevice(id: string): { id: string; unregistered: boolean; removed: boolean } {
    const removed = this._devices.has(id);
    if (removed) {
      const device = this._devices.get(id)!;
      this._devices.delete(id);
      this._registry.devices.delete(id);
      this._registry.count--;
      if (device.status === 'online') this._registry.onlineCount--;
      else this._registry.offlineCount--;
      this._registry.updatedAt = Date.now();
      this._shadows.delete(id);
      this._firmwareUpdates.delete(id);
      this._configs.delete(id);
    }
    this._recordHistory(`unregisterDevice(id=${id}) -> ${removed}`);
    return { id, unregistered: removed, removed };
  }

  public updateDeviceStatus(id: string, status: IoTDevice['status'], properties?: Record<string, unknown>): { id: string; status: string; updated: boolean; properties: Record<string, unknown> } {
    const device = this._devices.get(id);
    const updated = !!device;
    if (device) {
      const oldStatus = device.status;
      const updatedDevice: IoTDevice = { ...device, status, lastSeen: Date.now(), metadata: { ...device.metadata, ...properties } };
      this._devices.set(id, updatedDevice);
      this._registry.devices.set(id, updatedDevice);
      this._registry.updatedAt = Date.now();

      if (oldStatus === 'online' && status !== 'online') this._registry.onlineCount--;
      if (oldStatus !== 'online' && status === 'online') this._registry.onlineCount++;
      if (oldStatus === 'offline' && status !== 'offline') this._registry.offlineCount--;
      if (oldStatus !== 'offline' && status === 'offline') this._registry.offlineCount++;

      this._recordEvent(id, 'status_change', { oldStatus, newStatus: status, properties }, status === 'error' ? 'critical' : 'low');
    }
    this._recordHistory(`updateDeviceStatus(id=${id}, status=${status})`);
    return { id, status, updated, properties: properties || {} };
  }

  public deviceList(filter?: string, pagination?: { page: number; pageSize: number }): { devices: IoTDevice[]; total: number; page: number; pageSize: number } {
    const all = Array.from(this._devices.values());
    const filtered = filter ? all.filter(d => d.type.includes(filter) || d.id.includes(filter) || d.capabilities.includes(filter)) : all;
    
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 20;
    const start = (page - 1) * pageSize;
    const devices = filtered.slice(start, start + pageSize);

    this._recordHistory(`deviceList(filter=${filter ?? 'none'}, page=${page}) -> ${devices.length} results`);
    return { devices, total: filtered.length, page, pageSize };
  }

  public deviceSearch(query: string, criteria?: { type?: string; status?: string; tags?: string[]; capabilities?: string[] }): { results: IoTDevice[]; query: string; countimport { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0',
    };

    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.onlineCount++;
    this._registry.updatedAt = Date.now();

    this._shadows.set(id, {
      deviceId: id,
      desired: {},
      reported: {},
      delta: {},
      version: 1,
      timestamp: Date.now(),
    });

    this._recordHistory(`registerDevice(id=${id}, type=${type}, capabilities=${capabilities.length})`);
    return { device, registered: true, id };
  }

  public bulkRegister(devices: { id: string; type: string; capabilities: string[] }[]): { registered: number; skipped: number; devices: IoTDevice[] } {
    const registeredDevices: IoTDevice[] = [];
    let registered = 0;
    let skipped = 0;

    for (const device of devices) {
      const result = this.registerDevice(device.id, device.type, device.capabilities);
      if (result.registered) {
        registered++;
        registeredDevices.push(result.device);
      } else {
        skipped++;
      }
    }

    this._recordHistory(`bulkRegister(devices=${devices.length}) -> registered=${registered}, skipped=${skipped}`);
    return { registered, skipped, devices: registeredDevices };
  }

  public unregisterDevice(id: string): { id: string; unregistered: boolean; removed: boolean } {
    const removed = this._devices.has(id);
    if (removed) {
      const device = this._devices.get(id)!;
      this._devices.delete(id);
      this._registry.devices.delete(id);
      this._registry.count--;
      if (device.status === 'online') this._registry.onlineCount--;
      else this._registry.offlineCount--;
      this._registry.updatedAt = Date.now();
      this._shadows.delete(id);
      this._firmwareUpdates.delete(id);
      this._configs.delete(id);
    }
    this._recordHistory(`unregisterDevice(id=${id}) -> ${removed}`);
    return { id, unregistered: removed, removed };
  }

  public updateDeviceStatus(id: string, status: IoTDevice['status'], properties?: Record<string, unknown>): { id: string; status: string; updated: boolean; properties: Record<string, unknown> } {
    const device = this._devices.get(id);
    const updated = !!device;
    if (device) {
      const oldStatus = device.status;
      const updatedDevice: IoTDevice = { ...device, status, lastSeen: Date.now(), metadata: { ...device.metadata, ...properties } };
      this._devices.set(id, updatedDevice);
      this._registry.devices.set(id, updatedDevice);
      this._registry.updatedAt = Date.now();

      if (oldStatus === 'online' && status !== 'online') this._registry.onlineCount--;
      if (oldStatus !== 'online' && status === 'online') this._registry.onlineCount++;
      if (oldStatus === 'offline' && status !== 'offline') this._registry.offlineCount--;
      if (oldStatus !== 'offline' && status === 'offline') this._registry.offlineCount++;

      this._recordEvent(id, 'status_change', { oldStatus, newStatus: status, properties }, status === 'error' ? 'critical' : 'low');
    }
    this._recordHistory(`updateDeviceStatus(id=${id}, status=${status})`);
    return { id, status, updated, properties: properties || {} };
  }

  public deviceList(filter?: string, pagination?: { page: number; pageSize: number }): { devices: IoTDevice[]; total: number; page: number; pageSize: number } {
    const all = Array.from(this._devices.values());
    const filtered = filter ? all.filter(d => d.type.includes(filter) || d.id.includes(filter) || d.capabilities.includes(filter)) : all;
    
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 20;
    const start = (page - 1) * pageSize;
    const devices = filtered.slice(start, start + pageSize);

    this._recordHistory(`deviceList(filter=${filter ?? 'none'}, page=${page}) -> ${devices.length} results`);
    return { devices, total: filtered.length, page, pageSize };
  }

  public deviceSearch(query: string, criteria?: { type?: string; status?: string; tags?: string[]; capabilities?: string[] }): { results: IoTDevice[]; query: string; count: number } {
    let results = Array.from(this._devices.values());

    if (import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0',
    };

    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.onlineCount++;
    this._registry.updatedAt = Date.now();

    this._shadows.set(id, {
      deviceId: id,
      desired: {},
      reported: {},
      delta: {},
      version: 1,
      timestamp: Date.now(),
    });

    this._recordHistory(`registerDevice(id=${id}, type=${type}, capabilities=${capabilities.length})`);
    return { device, registered: true, id };
  }

  public bulkRegister(devices: { id: string; type: string; capabilities: string[] }[]): { registered: number; skipped: number; devices: IoTDevice[] } {
    const registeredDevices: IoTDevice[] = [];
    let registered = 0;
    let skipped = 0;

    for (const device of devices) {
      const result = this.registerDevice(device.id, device.type, device.capabilities);
      if (result.registered) {
        registered++;
        registeredDevices.push(result.device);
      } else {
        skipped++;
      }
    }

    this._recordHistory(`bulkRegister(devices=${devices.length}) -> registered=${registered}, skipped=${skipped}`);
    return { registered, skipped, devices: registeredDevices };
  }

  public unregisterDevice(id: string): { id: string; unregistered: boolean; removed: boolean } {
    const removed = this._devices.has(id);
    if (removed) {
      const device = this._devices.get(id)!;
      this._devices.delete(id);
      this._registry.devices.delete(id);
      this._registry.count--;
      if (device.status === 'online') this._registry.onlineCount--;
      else this._registry.offlineCount--;
      this._registry.updatedAt = Date.now();
      this._shadows.delete(id);
      this._firmwareUpdates.delete(id);
      this._configs.delete(id);
    }
    this._recordHistory(`unregisterDevice(id=${id}) -> ${removed}`);
    return { id, unregistered: removed, removed };
  }

  public updateDeviceStatus(id: string, status: IoTDevice['status'], properties?: Record<string, unknown>): { id: string; status: string; updated: boolean; properties: Record<string, unknown> } {
    const device = this._devices.get(id);
    const updated = !!device;
    if (device) {
      const oldStatus = device.status;
      const updatedDevice: IoTDevice = { ...device, status, lastSeen: Date.now(), metadata: { ...device.metadata, ...properties } };
      this._devices.set(id, updatedDevice);
      this._registry.devices.set(id, updatedDevice);
      this._registry.updatedAt = Date.now();

      if (oldStatus === 'online' && status !== 'online') this._registry.onlineCount--;
      if (oldStatus !== 'online' && status === 'online') this._registry.onlineCount++;
      if (oldStatus === 'offline' && status !== 'offline') this._registry.offlineCount--;
      if (oldStatus !== 'offline' && status === 'offline') this._registry.offlineCount++;

      this._recordEvent(id, 'status_change', { oldStatus, newStatus: status, properties }, status === 'error' ? 'critical' : 'low');
    }
    this._recordHistory(`updateDeviceStatus(id=${id}, status=${status})`);
    return { id, status, updated, properties: properties || {} };
  }

  public deviceList(filter?: string, pagination?: { page: number; pageSize: number }): { devices: IoTDevice[]; total: number; page: number; pageSize: number } {
    const all = Array.from(this._devices.values());
    const filtered = filter ? all.filter(d => d.type.includes(filter) || d.id.includes(filter) || d.capabilities.includes(filter)) : all;
    
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 20;
    const start = (page - 1) * pageSize;
    const devices = filtered.slice(start, start + pageSize);

    this._recordHistory(`deviceList(filter=${filter ?? 'none'}, page=${page}) -> ${devices.length} results`);
    return { devices, total: filtered.length, page, pageSize };
  }

  public deviceSearch(query: string, criteria?: { type?: string; status?: string; tags?: string[]; capabilities?: string[] }): { results: IoTDevice[]; query: string; count: number } {
    let results = Array.from(this._devices.values());

    if (criteria?.type) {
      results =import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0',
    };

    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.onlineCount++;
    this._registry.updatedAt = Date.now();

    this._shadows.set(id, {
      deviceId: id,
      desired: {},
      reported: {},
      delta: {},
      version: 1,
      timestamp: Date.now(),
    });

    this._recordHistory(`registerDevice(id=${id}, type=${type}, capabilities=${capabilities.length})`);
    return { device, registered: true, id };
  }

  public bulkRegister(devices: { id: string; type: string; capabilities: string[] }[]): { registered: number; skipped: number; devices: IoTDevice[] } {
    const registeredDevices: IoTDevice[] = [];
    let registered = 0;
    let skipped = 0;

    for (const device of devices) {
      const result = this.registerDevice(device.id, device.type, device.capabilities);
      if (result.registered) {
        registered++;
        registeredDevices.push(result.device);
      } else {
        skipped++;
      }
    }

    this._recordHistory(`bulkRegister(devices=${devices.length}) -> registered=${registered}, skipped=${skipped}`);
    return { registered, skipped, devices: registeredDevices };
  }

  public unregisterDevice(id: string): { id: string; unregistered: boolean; removed: boolean } {
    const removed = this._devices.has(id);
    if (removed) {
      const device = this._devices.get(id)!;
      this._devices.delete(id);
      this._registry.devices.delete(id);
      this._registry.count--;
      if (device.status === 'online') this._registry.onlineCount--;
      else this._registry.offlineCount--;
      this._registry.updatedAt = Date.now();
      this._shadows.delete(id);
      this._firmwareUpdates.delete(id);
      this._configs.delete(id);
    }
    this._recordHistory(`unregisterDevice(id=${id}) -> ${removed}`);
    return { id, unregistered: removed, removed };
  }

  public updateDeviceStatus(id: string, status: IoTDevice['status'], properties?: Record<string, unknown>): { id: string; status: string; updated: boolean; properties: Record<string, unknown> } {
    const device = this._devices.get(id);
    const updated = !!device;
    if (device) {
      const oldStatus = device.status;
      const updatedDevice: IoTDevice = { ...device, status, lastSeen: Date.now(), metadata: { ...device.metadata, ...properties } };
      this._devices.set(id, updatedDevice);
      this._registry.devices.set(id, updatedDevice);
      this._registry.updatedAt = Date.now();

      if (oldStatus === 'online' && status !== 'online') this._registry.onlineCount--;
      if (oldStatus !== 'online' && status === 'online') this._registry.onlineCount++;
      if (oldStatus === 'offline' && status !== 'offline') this._registry.offlineCount--;
      if (oldStatus !== 'offline' && status === 'offline') this._registry.offlineCount++;

      this._recordEvent(id, 'status_change', { oldStatus, newStatus: status, properties }, status === 'error' ? 'critical' : 'low');
    }
    this._recordHistory(`updateDeviceStatus(id=${id}, status=${status})`);
    return { id, status, updated, properties: properties || {} };
  }

  public deviceList(filter?: string, pagination?: { page: number; pageSize: number }): { devices: IoTDevice[]; total: number; page: number; pageSize: number } {
    const all = Array.from(this._devices.values());
    const filtered = filter ? all.filter(d => d.type.includes(filter) || d.id.includes(filter) || d.capabilities.includes(filter)) : all;
    
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 20;
    const start = (page - 1) * pageSize;
    const devices = filtered.slice(start, start + pageSize);

    this._recordHistory(`deviceList(filter=${filter ?? 'none'}, page=${page}) -> ${devices.length} results`);
    return { devices, total: filtered.length, page, pageSize };
  }

  public deviceSearch(query: string, criteria?: { type?: string; status?: string; tags?: string[]; capabilities?: string[] }): { results: IoTDevice[]; query: string; count: number } {
    let results = Array.from(this._devices.values());

    if (criteria?.type) {
      results = results.filter(d => d.type === criteria.type);import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0',
    };

    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.onlineCount++;
    this._registry.updatedAt = Date.now();

    this._shadows.set(id, {
      deviceId: id,
      desired: {},
      reported: {},
      delta: {},
      version: 1,
      timestamp: Date.now(),
    });

    this._recordHistory(`registerDevice(id=${id}, type=${type}, capabilities=${capabilities.length})`);
    return { device, registered: true, id };
  }

  public bulkRegister(devices: { id: string; type: string; capabilities: string[] }[]): { registered: number; skipped: number; devices: IoTDevice[] } {
    const registeredDevices: IoTDevice[] = [];
    let registered = 0;
    let skipped = 0;

    for (const device of devices) {
      const result = this.registerDevice(device.id, device.type, device.capabilities);
      if (result.registered) {
        registered++;
        registeredDevices.push(result.device);
      } else {
        skipped++;
      }
    }

    this._recordHistory(`bulkRegister(devices=${devices.length}) -> registered=${registered}, skipped=${skipped}`);
    return { registered, skipped, devices: registeredDevices };
  }

  public unregisterDevice(id: string): { id: string; unregistered: boolean; removed: boolean } {
    const removed = this._devices.has(id);
    if (removed) {
      const device = this._devices.get(id)!;
      this._devices.delete(id);
      this._registry.devices.delete(id);
      this._registry.count--;
      if (device.status === 'online') this._registry.onlineCount--;
      else this._registry.offlineCount--;
      this._registry.updatedAt = Date.now();
      this._shadows.delete(id);
      this._firmwareUpdates.delete(id);
      this._configs.delete(id);
    }
    this._recordHistory(`unregisterDevice(id=${id}) -> ${removed}`);
    return { id, unregistered: removed, removed };
  }

  public updateDeviceStatus(id: string, status: IoTDevice['status'], properties?: Record<string, unknown>): { id: string; status: string; updated: boolean; properties: Record<string, unknown> } {
    const device = this._devices.get(id);
    const updated = !!device;
    if (device) {
      const oldStatus = device.status;
      const updatedDevice: IoTDevice = { ...device, status, lastSeen: Date.now(), metadata: { ...device.metadata, ...properties } };
      this._devices.set(id, updatedDevice);
      this._registry.devices.set(id, updatedDevice);
      this._registry.updatedAt = Date.now();

      if (oldStatus === 'online' && status !== 'online') this._registry.onlineCount--;
      if (oldStatus !== 'online' && status === 'online') this._registry.onlineCount++;
      if (oldStatus === 'offline' && status !== 'offline') this._registry.offlineCount--;
      if (oldStatus !== 'offline' && status === 'offline') this._registry.offlineCount++;

      this._recordEvent(id, 'status_change', { oldStatus, newStatus: status, properties }, status === 'error' ? 'critical' : 'low');
    }
    this._recordHistory(`updateDeviceStatus(id=${id}, status=${status})`);
    return { id, status, updated, properties: properties || {} };
  }

  public deviceList(filter?: string, pagination?: { page: number; pageSize: number }): { devices: IoTDevice[]; total: number; page: number; pageSize: number } {
    const all = Array.from(this._devices.values());
    const filtered = filter ? all.filter(d => d.type.includes(filter) || d.id.includes(filter) || d.capabilities.includes(filter)) : all;
    
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 20;
    const start = (page - 1) * pageSize;
    const devices = filtered.slice(start, start + pageSize);

    this._recordHistory(`deviceList(filter=${filter ?? 'none'}, page=${page}) -> ${devices.length} results`);
    return { devices, total: filtered.length, page, pageSize };
  }

  public deviceSearch(query: string, criteria?: { type?: string; status?: string; tags?: string[]; capabilities?: string[] }): { results: IoTDevice[]; query: string; count: number } {
    let results = Array.from(this._devices.values());

    if (criteria?.type) {
      results = results.filter(d => d.type === criteria.type);
    }
    if (criteria?.status) {
      results = results.filter(d => d.status === criteria.status);
    }import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0',
    };

    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.onlineCount++;
    this._registry.updatedAt = Date.now();

    this._shadows.set(id, {
      deviceId: id,
      desired: {},
      reported: {},
      delta: {},
      version: 1,
      timestamp: Date.now(),
    });

    this._recordHistory(`registerDevice(id=${id}, type=${type}, capabilities=${capabilities.length})`);
    return { device, registered: true, id };
  }

  public bulkRegister(devices: { id: string; type: string; capabilities: string[] }[]): { registered: number; skipped: number; devices: IoTDevice[] } {
    const registeredDevices: IoTDevice[] = [];
    let registered = 0;
    let skipped = 0;

    for (const device of devices) {
      const result = this.registerDevice(device.id, device.type, device.capabilities);
      if (result.registered) {
        registered++;
        registeredDevices.push(result.device);
      } else {
        skipped++;
      }
    }

    this._recordHistory(`bulkRegister(devices=${devices.length}) -> registered=${registered}, skipped=${skipped}`);
    return { registered, skipped, devices: registeredDevices };
  }

  public unregisterDevice(id: string): { id: string; unregistered: boolean; removed: boolean } {
    const removed = this._devices.has(id);
    if (removed) {
      const device = this._devices.get(id)!;
      this._devices.delete(id);
      this._registry.devices.delete(id);
      this._registry.count--;
      if (device.status === 'online') this._registry.onlineCount--;
      else this._registry.offlineCount--;
      this._registry.updatedAt = Date.now();
      this._shadows.delete(id);
      this._firmwareUpdates.delete(id);
      this._configs.delete(id);
    }
    this._recordHistory(`unregisterDevice(id=${id}) -> ${removed}`);
    return { id, unregistered: removed, removed };
  }

  public updateDeviceStatus(id: string, status: IoTDevice['status'], properties?: Record<string, unknown>): { id: string; status: string; updated: boolean; properties: Record<string, unknown> } {
    const device = this._devices.get(id);
    const updated = !!device;
    if (device) {
      const oldStatus = device.status;
      const updatedDevice: IoTDevice = { ...device, status, lastSeen: Date.now(), metadata: { ...device.metadata, ...properties } };
      this._devices.set(id, updatedDevice);
      this._registry.devices.set(id, updatedDevice);
      this._registry.updatedAt = Date.now();

      if (oldStatus === 'online' && status !== 'online') this._registry.onlineCount--;
      if (oldStatus !== 'online' && status === 'online') this._registry.onlineCount++;
      if (oldStatus === 'offline' && status !== 'offline') this._registry.offlineCount--;
      if (oldStatus !== 'offline' && status === 'offline') this._registry.offlineCount++;

      this._recordEvent(id, 'status_change', { oldStatus, newStatus: status, properties }, status === 'error' ? 'critical' : 'low');
    }
    this._recordHistory(`updateDeviceStatus(id=${id}, status=${status})`);
    return { id, status, updated, properties: properties || {} };
  }

  public deviceList(filter?: string, pagination?: { page: number; pageSize: number }): { devices: IoTDevice[]; total: number; page: number; pageSize: number } {
    const all = Array.from(this._devices.values());
    const filtered = filter ? all.filter(d => d.type.includes(filter) || d.id.includes(filter) || d.capabilities.includes(filter)) : all;
    
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 20;
    const start = (page - 1) * pageSize;
    const devices = filtered.slice(start, start + pageSize);

    this._recordHistory(`deviceList(filter=${filter ?? 'none'}, page=${page}) -> ${devices.length} results`);
    return { devices, total: filtered.length, page, pageSize };
  }

  public deviceSearch(query: string, criteria?: { type?: string; status?: string; tags?: string[]; capabilities?: string[] }): { results: IoTDevice[]; query: string; count: number } {
    let results = Array.from(this._devices.values());

    if (criteria?.type) {
      results = results.filter(d => d.type === criteria.type);
    }
    if (criteria?.status) {
      results = results.filter(d => d.status === criteria.status);
    }
    if (criteria?.capabilities)import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0',
    };

    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.onlineCount++;
    this._registry.updatedAt = Date.now();

    this._shadows.set(id, {
      deviceId: id,
      desired: {},
      reported: {},
      delta: {},
      version: 1,
      timestamp: Date.now(),
    });

    this._recordHistory(`registerDevice(id=${id}, type=${type}, capabilities=${capabilities.length})`);
    return { device, registered: true, id };
  }

  public bulkRegister(devices: { id: string; type: string; capabilities: string[] }[]): { registered: number; skipped: number; devices: IoTDevice[] } {
    const registeredDevices: IoTDevice[] = [];
    let registered = 0;
    let skipped = 0;

    for (const device of devices) {
      const result = this.registerDevice(device.id, device.type, device.capabilities);
      if (result.registered) {
        registered++;
        registeredDevices.push(result.device);
      } else {
        skipped++;
      }
    }

    this._recordHistory(`bulkRegister(devices=${devices.length}) -> registered=${registered}, skipped=${skipped}`);
    return { registered, skipped, devices: registeredDevices };
  }

  public unregisterDevice(id: string): { id: string; unregistered: boolean; removed: boolean } {
    const removed = this._devices.has(id);
    if (removed) {
      const device = this._devices.get(id)!;
      this._devices.delete(id);
      this._registry.devices.delete(id);
      this._registry.count--;
      if (device.status === 'online') this._registry.onlineCount--;
      else this._registry.offlineCount--;
      this._registry.updatedAt = Date.now();
      this._shadows.delete(id);
      this._firmwareUpdates.delete(id);
      this._configs.delete(id);
    }
    this._recordHistory(`unregisterDevice(id=${id}) -> ${removed}`);
    return { id, unregistered: removed, removed };
  }

  public updateDeviceStatus(id: string, status: IoTDevice['status'], properties?: Record<string, unknown>): { id: string; status: string; updated: boolean; properties: Record<string, unknown> } {
    const device = this._devices.get(id);
    const updated = !!device;
    if (device) {
      const oldStatus = device.status;
      const updatedDevice: IoTDevice = { ...device, status, lastSeen: Date.now(), metadata: { ...device.metadata, ...properties } };
      this._devices.set(id, updatedDevice);
      this._registry.devices.set(id, updatedDevice);
      this._registry.updatedAt = Date.now();

      if (oldStatus === 'online' && status !== 'online') this._registry.onlineCount--;
      if (oldStatus !== 'online' && status === 'online') this._registry.onlineCount++;
      if (oldStatus === 'offline' && status !== 'offline') this._registry.offlineCount--;
      if (oldStatus !== 'offline' && status === 'offline') this._registry.offlineCount++;

      this._recordEvent(id, 'status_change', { oldStatus, newStatus: status, properties }, status === 'error' ? 'critical' : 'low');
    }
    this._recordHistory(`updateDeviceStatus(id=${id}, status=${status})`);
    return { id, status, updated, properties: properties || {} };
  }

  public deviceList(filter?: string, pagination?: { page: number; pageSize: number }): { devices: IoTDevice[]; total: number; page: number; pageSize: number } {
    const all = Array.from(this._devices.values());
    const filtered = filter ? all.filter(d => d.type.includes(filter) || d.id.includes(filter) || d.capabilities.includes(filter)) : all;
    
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 20;
    const start = (page - 1) * pageSize;
    const devices = filtered.slice(start, start + pageSize);

    this._recordHistory(`deviceList(filter=${filter ?? 'none'}, page=${page}) -> ${devices.length} results`);
    return { devices, total: filtered.length, page, pageSize };
  }

  public deviceSearch(query: string, criteria?: { type?: string; status?: string; tags?: string[]; capabilities?: string[] }): { results: IoTDevice[]; query: string; count: number } {
    let results = Array.from(this._devices.values());

    if (criteria?.type) {
      results = results.filter(d => d.type === criteria.type);
    }
    if (criteria?.status) {
      results = results.filter(d => d.status === criteria.status);
    }
    if (criteria?.capabilities) {
      results = results.filter(d => criteria.capabilities!.some(c => d.capabilities.includes(c)));
    }

    const lowerimport { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0',
    };

    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.onlineCount++;
    this._registry.updatedAt = Date.now();

    this._shadows.set(id, {
      deviceId: id,
      desired: {},
      reported: {},
      delta: {},
      version: 1,
      timestamp: Date.now(),
    });

    this._recordHistory(`registerDevice(id=${id}, type=${type}, capabilities=${capabilities.length})`);
    return { device, registered: true, id };
  }

  public bulkRegister(devices: { id: string; type: string; capabilities: string[] }[]): { registered: number; skipped: number; devices: IoTDevice[] } {
    const registeredDevices: IoTDevice[] = [];
    let registered = 0;
    let skipped = 0;

    for (const device of devices) {
      const result = this.registerDevice(device.id, device.type, device.capabilities);
      if (result.registered) {
        registered++;
        registeredDevices.push(result.device);
      } else {
        skipped++;
      }
    }

    this._recordHistory(`bulkRegister(devices=${devices.length}) -> registered=${registered}, skipped=${skipped}`);
    return { registered, skipped, devices: registeredDevices };
  }

  public unregisterDevice(id: string): { id: string; unregistered: boolean; removed: boolean } {
    const removed = this._devices.has(id);
    if (removed) {
      const device = this._devices.get(id)!;
      this._devices.delete(id);
      this._registry.devices.delete(id);
      this._registry.count--;
      if (device.status === 'online') this._registry.onlineCount--;
      else this._registry.offlineCount--;
      this._registry.updatedAt = Date.now();
      this._shadows.delete(id);
      this._firmwareUpdates.delete(id);
      this._configs.delete(id);
    }
    this._recordHistory(`unregisterDevice(id=${id}) -> ${removed}`);
    return { id, unregistered: removed, removed };
  }

  public updateDeviceStatus(id: string, status: IoTDevice['status'], properties?: Record<string, unknown>): { id: string; status: string; updated: boolean; properties: Record<string, unknown> } {
    const device = this._devices.get(id);
    const updated = !!device;
    if (device) {
      const oldStatus = device.status;
      const updatedDevice: IoTDevice = { ...device, status, lastSeen: Date.now(), metadata: { ...device.metadata, ...properties } };
      this._devices.set(id, updatedDevice);
      this._registry.devices.set(id, updatedDevice);
      this._registry.updatedAt = Date.now();

      if (oldStatus === 'online' && status !== 'online') this._registry.onlineCount--;
      if (oldStatus !== 'online' && status === 'online') this._registry.onlineCount++;
      if (oldStatus === 'offline' && status !== 'offline') this._registry.offlineCount--;
      if (oldStatus !== 'offline' && status === 'offline') this._registry.offlineCount++;

      this._recordEvent(id, 'status_change', { oldStatus, newStatus: status, properties }, status === 'error' ? 'critical' : 'low');
    }
    this._recordHistory(`updateDeviceStatus(id=${id}, status=${status})`);
    return { id, status, updated, properties: properties || {} };
  }

  public deviceList(filter?: string, pagination?: { page: number; pageSize: number }): { devices: IoTDevice[]; total: number; page: number; pageSize: number } {
    const all = Array.from(this._devices.values());
    const filtered = filter ? all.filter(d => d.type.includes(filter) || d.id.includes(filter) || d.capabilities.includes(filter)) : all;
    
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 20;
    const start = (page - 1) * pageSize;
    const devices = filtered.slice(start, start + pageSize);

    this._recordHistory(`deviceList(filter=${filter ?? 'none'}, page=${page}) -> ${devices.length} results`);
    return { devices, total: filtered.length, page, pageSize };
  }

  public deviceSearch(query: string, criteria?: { type?: string; status?: string; tags?: string[]; capabilities?: string[] }): { results: IoTDevice[]; query: string; count: number } {
    let results = Array.from(this._devices.values());

    if (criteria?.type) {
      results = results.filter(d => d.type === criteria.type);
    }
    if (criteria?.status) {
      results = results.filter(d => d.status === criteria.status);
    }
    if (criteria?.capabilities) {
      results = results.filter(d => criteria.capabilities!.some(c => d.capabilities.includes(c)));
    }

    const lowerQuery = query.toLowerCase();
    results = results.filter(d =>
      d.id.toLowerCase().includes(lowerQuery) ||
      d.type.toLowerCaseimport { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0',
    };

    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.onlineCount++;
    this._registry.updatedAt = Date.now();

    this._shadows.set(id, {
      deviceId: id,
      desired: {},
      reported: {},
      delta: {},
      version: 1,
      timestamp: Date.now(),
    });

    this._recordHistory(`registerDevice(id=${id}, type=${type}, capabilities=${capabilities.length})`);
    return { device, registered: true, id };
  }

  public bulkRegister(devices: { id: string; type: string; capabilities: string[] }[]): { registered: number; skipped: number; devices: IoTDevice[] } {
    const registeredDevices: IoTDevice[] = [];
    let registered = 0;
    let skipped = 0;

    for (const device of devices) {
      const result = this.registerDevice(device.id, device.type, device.capabilities);
      if (result.registered) {
        registered++;
        registeredDevices.push(result.device);
      } else {
        skipped++;
      }
    }

    this._recordHistory(`bulkRegister(devices=${devices.length}) -> registered=${registered}, skipped=${skipped}`);
    return { registered, skipped, devices: registeredDevices };
  }

  public unregisterDevice(id: string): { id: string; unregistered: boolean; removed: boolean } {
    const removed = this._devices.has(id);
    if (removed) {
      const device = this._devices.get(id)!;
      this._devices.delete(id);
      this._registry.devices.delete(id);
      this._registry.count--;
      if (device.status === 'online') this._registry.onlineCount--;
      else this._registry.offlineCount--;
      this._registry.updatedAt = Date.now();
      this._shadows.delete(id);
      this._firmwareUpdates.delete(id);
      this._configs.delete(id);
    }
    this._recordHistory(`unregisterDevice(id=${id}) -> ${removed}`);
    return { id, unregistered: removed, removed };
  }

  public updateDeviceStatus(id: string, status: IoTDevice['status'], properties?: Record<string, unknown>): { id: string; status: string; updated: boolean; properties: Record<string, unknown> } {
    const device = this._devices.get(id);
    const updated = !!device;
    if (device) {
      const oldStatus = device.status;
      const updatedDevice: IoTDevice = { ...device, status, lastSeen: Date.now(), metadata: { ...device.metadata, ...properties } };
      this._devices.set(id, updatedDevice);
      this._registry.devices.set(id, updatedDevice);
      this._registry.updatedAt = Date.now();

      if (oldStatus === 'online' && status !== 'online') this._registry.onlineCount--;
      if (oldStatus !== 'online' && status === 'online') this._registry.onlineCount++;
      if (oldStatus === 'offline' && status !== 'offline') this._registry.offlineCount--;
      if (oldStatus !== 'offline' && status === 'offline') this._registry.offlineCount++;

      this._recordEvent(id, 'status_change', { oldStatus, newStatus: status, properties }, status === 'error' ? 'critical' : 'low');
    }
    this._recordHistory(`updateDeviceStatus(id=${id}, status=${status})`);
    return { id, status, updated, properties: properties || {} };
  }

  public deviceList(filter?: string, pagination?: { page: number; pageSize: number }): { devices: IoTDevice[]; total: number; page: number; pageSize: number } {
    const all = Array.from(this._devices.values());
    const filtered = filter ? all.filter(d => d.type.includes(filter) || d.id.includes(filter) || d.capabilities.includes(filter)) : all;
    
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 20;
    const start = (page - 1) * pageSize;
    const devices = filtered.slice(start, start + pageSize);

    this._recordHistory(`deviceList(filter=${filter ?? 'none'}, page=${page}) -> ${devices.length} results`);
    return { devices, total: filtered.length, page, pageSize };
  }

  public deviceSearch(query: string, criteria?: { type?: string; status?: string; tags?: string[]; capabilities?: string[] }): { results: IoTDevice[]; query: string; count: number } {
    let results = Array.from(this._devices.values());

    if (criteria?.type) {
      results = results.filter(d => d.type === criteria.type);
    }
    if (criteria?.status) {
      results = results.filter(d => d.status === criteria.status);
    }
    if (criteria?.capabilities) {
      results = results.filter(d => criteria.capabilities!.some(c => d.capabilities.includes(c)));
    }

    const lowerQuery = query.toLowerCase();
    results = results.filter(d =>
      d.id.toLowerCase().includes(lowerQuery) ||
      d.type.toLowerCase().includes(lowerQuery) ||
      JSONimport { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0',
    };

    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.onlineCount++;
    this._registry.updatedAt = Date.now();

    this._shadows.set(id, {
      deviceId: id,
      desired: {},
      reported: {},
      delta: {},
      version: 1,
      timestamp: Date.now(),
    });

    this._recordHistory(`registerDevice(id=${id}, type=${type}, capabilities=${capabilities.length})`);
    return { device, registered: true, id };
  }

  public bulkRegister(devices: { id: string; type: string; capabilities: string[] }[]): { registered: number; skipped: number; devices: IoTDevice[] } {
    const registeredDevices: IoTDevice[] = [];
    let registered = 0;
    let skipped = 0;

    for (const device of devices) {
      const result = this.registerDevice(device.id, device.type, device.capabilities);
      if (result.registered) {
        registered++;
        registeredDevices.push(result.device);
      } else {
        skipped++;
      }
    }

    this._recordHistory(`bulkRegister(devices=${devices.length}) -> registered=${registered}, skipped=${skipped}`);
    return { registered, skipped, devices: registeredDevices };
  }

  public unregisterDevice(id: string): { id: string; unregistered: boolean; removed: boolean } {
    const removed = this._devices.has(id);
    if (removed) {
      const device = this._devices.get(id)!;
      this._devices.delete(id);
      this._registry.devices.delete(id);
      this._registry.count--;
      if (device.status === 'online') this._registry.onlineCount--;
      else this._registry.offlineCount--;
      this._registry.updatedAt = Date.now();
      this._shadows.delete(id);
      this._firmwareUpdates.delete(id);
      this._configs.delete(id);
    }
    this._recordHistory(`unregisterDevice(id=${id}) -> ${removed}`);
    return { id, unregistered: removed, removed };
  }

  public updateDeviceStatus(id: string, status: IoTDevice['status'], properties?: Record<string, unknown>): { id: string; status: string; updated: boolean; properties: Record<string, unknown> } {
    const device = this._devices.get(id);
    const updated = !!device;
    if (device) {
      const oldStatus = device.status;
      const updatedDevice: IoTDevice = { ...device, status, lastSeen: Date.now(), metadata: { ...device.metadata, ...properties } };
      this._devices.set(id, updatedDevice);
      this._registry.devices.set(id, updatedDevice);
      this._registry.updatedAt = Date.now();

      if (oldStatus === 'online' && status !== 'online') this._registry.onlineCount--;
      if (oldStatus !== 'online' && status === 'online') this._registry.onlineCount++;
      if (oldStatus === 'offline' && status !== 'offline') this._registry.offlineCount--;
      if (oldStatus !== 'offline' && status === 'offline') this._registry.offlineCount++;

      this._recordEvent(id, 'status_change', { oldStatus, newStatus: status, properties }, status === 'error' ? 'critical' : 'low');
    }
    this._recordHistory(`updateDeviceStatus(id=${id}, status=${status})`);
    return { id, status, updated, properties: properties || {} };
  }

  public deviceList(filter?: string, pagination?: { page: number; pageSize: number }): { devices: IoTDevice[]; total: number; page: number; pageSize: number } {
    const all = Array.from(this._devices.values());
    const filtered = filter ? all.filter(d => d.type.includes(filter) || d.id.includes(filter) || d.capabilities.includes(filter)) : all;
    
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 20;
    const start = (page - 1) * pageSize;
    const devices = filtered.slice(start, start + pageSize);

    this._recordHistory(`deviceList(filter=${filter ?? 'none'}, page=${page}) -> ${devices.length} results`);
    return { devices, total: filtered.length, page, pageSize };
  }

  public deviceSearch(query: string, criteria?: { type?: string; status?: string; tags?: string[]; capabilities?: string[] }): { results: IoTDevice[]; query: string; count: number } {
    let results = Array.from(this._devices.values());

    if (criteria?.type) {
      results = results.filter(d => d.type === criteria.type);
    }
    if (criteria?.status) {
      results = results.filter(d => d.status === criteria.status);
    }
    if (criteria?.capabilities) {
      results = results.filter(d => criteria.capabilities!.some(c => d.capabilities.includes(c)));
    }

    const lowerQuery = query.toLowerCase();
    results = results.filter(d =>
      d.id.toLowerCase().includes(lowerQuery) ||
      d.type.toLowerCase().includes(lowerQuery) ||
      JSON.stringify(d.metadata).toLowerCase().includes(lowerQuery)
    );

    this._recordHistory(`deviceSearch(query=${query}, criteria=${JSONimport { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0',
    };

    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.onlineCount++;
    this._registry.updatedAt = Date.now();

    this._shadows.set(id, {
      deviceId: id,
      desired: {},
      reported: {},
      delta: {},
      version: 1,
      timestamp: Date.now(),
    });

    this._recordHistory(`registerDevice(id=${id}, type=${type}, capabilities=${capabilities.length})`);
    return { device, registered: true, id };
  }

  public bulkRegister(devices: { id: string; type: string; capabilities: string[] }[]): { registered: number; skipped: number; devices: IoTDevice[] } {
    const registeredDevices: IoTDevice[] = [];
    let registered = 0;
    let skipped = 0;

    for (const device of devices) {
      const result = this.registerDevice(device.id, device.type, device.capabilities);
      if (result.registered) {
        registered++;
        registeredDevices.push(result.device);
      } else {
        skipped++;
      }
    }

    this._recordHistory(`bulkRegister(devices=${devices.length}) -> registered=${registered}, skipped=${skipped}`);
    return { registered, skipped, devices: registeredDevices };
  }

  public unregisterDevice(id: string): { id: string; unregistered: boolean; removed: boolean } {
    const removed = this._devices.has(id);
    if (removed) {
      const device = this._devices.get(id)!;
      this._devices.delete(id);
      this._registry.devices.delete(id);
      this._registry.count--;
      if (device.status === 'online') this._registry.onlineCount--;
      else this._registry.offlineCount--;
      this._registry.updatedAt = Date.now();
      this._shadows.delete(id);
      this._firmwareUpdates.delete(id);
      this._configs.delete(id);
    }
    this._recordHistory(`unregisterDevice(id=${id}) -> ${removed}`);
    return { id, unregistered: removed, removed };
  }

  public updateDeviceStatus(id: string, status: IoTDevice['status'], properties?: Record<string, unknown>): { id: string; status: string; updated: boolean; properties: Record<string, unknown> } {
    const device = this._devices.get(id);
    const updated = !!device;
    if (device) {
      const oldStatus = device.status;
      const updatedDevice: IoTDevice = { ...device, status, lastSeen: Date.now(), metadata: { ...device.metadata, ...properties } };
      this._devices.set(id, updatedDevice);
      this._registry.devices.set(id, updatedDevice);
      this._registry.updatedAt = Date.now();

      if (oldStatus === 'online' && status !== 'online') this._registry.onlineCount--;
      if (oldStatus !== 'online' && status === 'online') this._registry.onlineCount++;
      if (oldStatus === 'offline' && status !== 'offline') this._registry.offlineCount--;
      if (oldStatus !== 'offline' && status === 'offline') this._registry.offlineCount++;

      this._recordEvent(id, 'status_change', { oldStatus, newStatus: status, properties }, status === 'error' ? 'critical' : 'low');
    }
    this._recordHistory(`updateDeviceStatus(id=${id}, status=${status})`);
    return { id, status, updated, properties: properties || {} };
  }

  public deviceList(filter?: string, pagination?: { page: number; pageSize: number }): { devices: IoTDevice[]; total: number; page: number; pageSize: number } {
    const all = Array.from(this._devices.values());
    const filtered = filter ? all.filter(d => d.type.includes(filter) || d.id.includes(filter) || d.capabilities.includes(filter)) : all;
    
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 20;
    const start = (page - 1) * pageSize;
    const devices = filtered.slice(start, start + pageSize);

    this._recordHistory(`deviceList(filter=${filter ?? 'none'}, page=${page}) -> ${devices.length} results`);
    return { devices, total: filtered.length, page, pageSize };
  }

  public deviceSearch(query: string, criteria?: { type?: string; status?: string; tags?: string[]; capabilities?: string[] }): { results: IoTDevice[]; query: string; count: number } {
    let results = Array.from(this._devices.values());

    if (criteria?.type) {
      results = results.filter(d => d.type === criteria.type);
    }
    if (criteria?.status) {
      results = results.filter(d => d.status === criteria.status);
    }
    if (criteria?.capabilities) {
      results = results.filter(d => criteria.capabilities!.some(c => d.capabilities.includes(c)));
    }

    const lowerQuery = query.toLowerCase();
    results = results.filter(d =>
      d.id.toLowerCase().includes(lowerQuery) ||
      d.type.toLowerCase().includes(lowerQuery) ||
      JSON.stringify(d.metadata).toLowerCase().includes(lowerQuery)
    );

    this._recordHistory(`deviceSearch(query=${query}, criteria=${JSON.stringify(criteria)}) -> ${results.length}import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0',
    };

    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.onlineCount++;
    this._registry.updatedAt = Date.now();

    this._shadows.set(id, {
      deviceId: id,
      desired: {},
      reported: {},
      delta: {},
      version: 1,
      timestamp: Date.now(),
    });

    this._recordHistory(`registerDevice(id=${id}, type=${type}, capabilities=${capabilities.length})`);
    return { device, registered: true, id };
  }

  public bulkRegister(devices: { id: string; type: string; capabilities: string[] }[]): { registered: number; skipped: number; devices: IoTDevice[] } {
    const registeredDevices: IoTDevice[] = [];
    let registered = 0;
    let skipped = 0;

    for (const device of devices) {
      const result = this.registerDevice(device.id, device.type, device.capabilities);
      if (result.registered) {
        registered++;
        registeredDevices.push(result.device);
      } else {
        skipped++;
      }
    }

    this._recordHistory(`bulkRegister(devices=${devices.length}) -> registered=${registered}, skipped=${skipped}`);
    return { registered, skipped, devices: registeredDevices };
  }

  public unregisterDevice(id: string): { id: string; unregistered: boolean; removed: boolean } {
    const removed = this._devices.has(id);
    if (removed) {
      const device = this._devices.get(id)!;
      this._devices.delete(id);
      this._registry.devices.delete(id);
      this._registry.count--;
      if (device.status === 'online') this._registry.onlineCount--;
      else this._registry.offlineCount--;
      this._registry.updatedAt = Date.now();
      this._shadows.delete(id);
      this._firmwareUpdates.delete(id);
      this._configs.delete(id);
    }
    this._recordHistory(`unregisterDevice(id=${id}) -> ${removed}`);
    return { id, unregistered: removed, removed };
  }

  public updateDeviceStatus(id: string, status: IoTDevice['status'], properties?: Record<string, unknown>): { id: string; status: string; updated: boolean; properties: Record<string, unknown> } {
    const device = this._devices.get(id);
    const updated = !!device;
    if (device) {
      const oldStatus = device.status;
      const updatedDevice: IoTDevice = { ...device, status, lastSeen: Date.now(), metadata: { ...device.metadata, ...properties } };
      this._devices.set(id, updatedDevice);
      this._registry.devices.set(id, updatedDevice);
      this._registry.updatedAt = Date.now();

      if (oldStatus === 'online' && status !== 'online') this._registry.onlineCount--;
      if (oldStatus !== 'online' && status === 'online') this._registry.onlineCount++;
      if (oldStatus === 'offline' && status !== 'offline') this._registry.offlineCount--;
      if (oldStatus !== 'offline' && status === 'offline') this._registry.offlineCount++;

      this._recordEvent(id, 'status_change', { oldStatus, newStatus: status, properties }, status === 'error' ? 'critical' : 'low');
    }
    this._recordHistory(`updateDeviceStatus(id=${id}, status=${status})`);
    return { id, status, updated, properties: properties || {} };
  }

  public deviceList(filter?: string, pagination?: { page: number; pageSize: number }): { devices: IoTDevice[]; total: number; page: number; pageSize: number } {
    const all = Array.from(this._devices.values());
    const filtered = filter ? all.filter(d => d.type.includes(filter) || d.id.includes(filter) || d.capabilities.includes(filter)) : all;
    
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 20;
    const start = (page - 1) * pageSize;
    const devices = filtered.slice(start, start + pageSize);

    this._recordHistory(`deviceList(filter=${filter ?? 'none'}, page=${page}) -> ${devices.length} results`);
    return { devices, total: filtered.length, page, pageSize };
  }

  public deviceSearch(query: string, criteria?: { type?: string; status?: string; tags?: string[]; capabilities?: string[] }): { results: IoTDevice[]; query: string; count: number } {
    let results = Array.from(this._devices.values());

    if (criteria?.type) {
      results = results.filter(d => d.type === criteria.type);
    }
    if (criteria?.status) {
      results = results.filter(d => d.status === criteria.status);
    }
    if (criteria?.capabilities) {
      results = results.filter(d => criteria.capabilities!.some(c => d.capabilities.includes(c)));
    }

    const lowerQuery = query.toLowerCase();
    results = results.filter(d =>
      d.id.toLowerCase().includes(lowerQuery) ||
      d.type.toLowerCase().includes(lowerQuery) ||
      JSON.stringify(d.metadata).toLowerCase().includes(lowerQuery)
    );

    this._recordHistory(`deviceSearch(query=${query}, criteria=${JSON.stringify(criteria)}) -> ${results.length} results`);
    return { results, query, count: results.length };
  }

import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0',
    };

    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.onlineCount++;
    this._registry.updatedAt = Date.now();

    this._shadows.set(id, {
      deviceId: id,
      desired: {},
      reported: {},
      delta: {},
      version: 1,
      timestamp: Date.now(),
    });

    this._recordHistory(`registerDevice(id=${id}, type=${type}, capabilities=${capabilities.length})`);
    return { device, registered: true, id };
  }

  public bulkRegister(devices: { id: string; type: string; capabilities: string[] }[]): { registered: number; skipped: number; devices: IoTDevice[] } {
    const registeredDevices: IoTDevice[] = [];
    let registered = 0;
    let skipped = 0;

    for (const device of devices) {
      const result = this.registerDevice(device.id, device.type, device.capabilities);
      if (result.registered) {
        registered++;
        registeredDevices.push(result.device);
      } else {
        skipped++;
      }
    }

    this._recordHistory(`bulkRegister(devices=${devices.length}) -> registered=${registered}, skipped=${skipped}`);
    return { registered, skipped, devices: registeredDevices };
  }

  public unregisterDevice(id: string): { id: string; unregistered: boolean; removed: boolean } {
    const removed = this._devices.has(id);
    if (removed) {
      const device = this._devices.get(id)!;
      this._devices.delete(id);
      this._registry.devices.delete(id);
      this._registry.count--;
      if (device.status === 'online') this._registry.onlineCount--;
      else this._registry.offlineCount--;
      this._registry.updatedAt = Date.now();
      this._shadows.delete(id);
      this._firmwareUpdates.delete(id);
      this._configs.delete(id);
    }
    this._recordHistory(`unregisterDevice(id=${id}) -> ${removed}`);
    return { id, unregistered: removed, removed };
  }

  public updateDeviceStatus(id: string, status: IoTDevice['status'], properties?: Record<string, unknown>): { id: string; status: string; updated: boolean; properties: Record<string, unknown> } {
    const device = this._devices.get(id);
    const updated = !!device;
    if (device) {
      const oldStatus = device.status;
      const updatedDevice: IoTDevice = { ...device, status, lastSeen: Date.now(), metadata: { ...device.metadata, ...properties } };
      this._devices.set(id, updatedDevice);
      this._registry.devices.set(id, updatedDevice);
      this._registry.updatedAt = Date.now();

      if (oldStatus === 'online' && status !== 'online') this._registry.onlineCount--;
      if (oldStatus !== 'online' && status === 'online') this._registry.onlineCount++;
      if (oldStatus === 'offline' && status !== 'offline') this._registry.offlineCount--;
      if (oldStatus !== 'offline' && status === 'offline') this._registry.offlineCount++;

      this._recordEvent(id, 'status_change', { oldStatus, newStatus: status, properties }, status === 'error' ? 'critical' : 'low');
    }
    this._recordHistory(`updateDeviceStatus(id=${id}, status=${status})`);
    return { id, status, updated, properties: properties || {} };
  }

  public deviceList(filter?: string, pagination?: { page: number; pageSize: number }): { devices: IoTDevice[]; total: number; page: number; pageSize: number } {
    const all = Array.from(this._devices.values());
    const filtered = filter ? all.filter(d => d.type.includes(filter) || d.id.includes(filter) || d.capabilities.includes(filter)) : all;
    
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 20;
    const start = (page - 1) * pageSize;
    const devices = filtered.slice(start, start + pageSize);

    this._recordHistory(`deviceList(filter=${filter ?? 'none'}, page=${page}) -> ${devices.length} results`);
    return { devices, total: filtered.length, page, pageSize };
  }

  public deviceSearch(query: string, criteria?: { type?: string; status?: string; tags?: string[]; capabilities?: string[] }): { results: IoTDevice[]; query: string; count: number } {
    let results = Array.from(this._devices.values());

    if (criteria?.type) {
      results = results.filter(d => d.type === criteria.type);
    }
    if (criteria?.status) {
      results = results.filter(d => d.status === criteria.status);
    }
    if (criteria?.capabilities) {
      results = results.filter(d => criteria.capabilities!.some(c => d.capabilities.includes(c)));
    }

    const lowerQuery = query.toLowerCase();
    results = results.filter(d =>
      d.id.toLowerCase().includes(lowerQuery) ||
      d.type.toLowerCase().includes(lowerQuery) ||
      JSON.stringify(d.metadata).toLowerCase().includes(lowerQuery)
    );

    this._recordHistory(`deviceSearch(query=${query}, criteria=${JSON.stringify(criteria)}) -> ${results.length} results`);
    return { results, query, count: results.length };
  }

  public getDevice(id: string): IoTDevice | null {
    const device = thisimport { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0',
    };

    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.onlineCount++;
    this._registry.updatedAt = Date.now();

    this._shadows.set(id, {
      deviceId: id,
      desired: {},
      reported: {},
      delta: {},
      version: 1,
      timestamp: Date.now(),
    });

    this._recordHistory(`registerDevice(id=${id}, type=${type}, capabilities=${capabilities.length})`);
    return { device, registered: true, id };
  }

  public bulkRegister(devices: { id: string; type: string; capabilities: string[] }[]): { registered: number; skipped: number; devices: IoTDevice[] } {
    const registeredDevices: IoTDevice[] = [];
    let registered = 0;
    let skipped = 0;

    for (const device of devices) {
      const result = this.registerDevice(device.id, device.type, device.capabilities);
      if (result.registered) {
        registered++;
        registeredDevices.push(result.device);
      } else {
        skipped++;
      }
    }

    this._recordHistory(`bulkRegister(devices=${devices.length}) -> registered=${registered}, skipped=${skipped}`);
    return { registered, skipped, devices: registeredDevices };
  }

  public unregisterDevice(id: string): { id: string; unregistered: boolean; removed: boolean } {
    const removed = this._devices.has(id);
    if (removed) {
      const device = this._devices.get(id)!;
      this._devices.delete(id);
      this._registry.devices.delete(id);
      this._registry.count--;
      if (device.status === 'online') this._registry.onlineCount--;
      else this._registry.offlineCount--;
      this._registry.updatedAt = Date.now();
      this._shadows.delete(id);
      this._firmwareUpdates.delete(id);
      this._configs.delete(id);
    }
    this._recordHistory(`unregisterDevice(id=${id}) -> ${removed}`);
    return { id, unregistered: removed, removed };
  }

  public updateDeviceStatus(id: string, status: IoTDevice['status'], properties?: Record<string, unknown>): { id: string; status: string; updated: boolean; properties: Record<string, unknown> } {
    const device = this._devices.get(id);
    const updated = !!device;
    if (device) {
      const oldStatus = device.status;
      const updatedDevice: IoTDevice = { ...device, status, lastSeen: Date.now(), metadata: { ...device.metadata, ...properties } };
      this._devices.set(id, updatedDevice);
      this._registry.devices.set(id, updatedDevice);
      this._registry.updatedAt = Date.now();

      if (oldStatus === 'online' && status !== 'online') this._registry.onlineCount--;
      if (oldStatus !== 'online' && status === 'online') this._registry.onlineCount++;
      if (oldStatus === 'offline' && status !== 'offline') this._registry.offlineCount--;
      if (oldStatus !== 'offline' && status === 'offline') this._registry.offlineCount++;

      this._recordEvent(id, 'status_change', { oldStatus, newStatus: status, properties }, status === 'error' ? 'critical' : 'low');
    }
    this._recordHistory(`updateDeviceStatus(id=${id}, status=${status})`);
    return { id, status, updated, properties: properties || {} };
  }

  public deviceList(filter?: string, pagination?: { page: number; pageSize: number }): { devices: IoTDevice[]; total: number; page: number; pageSize: number } {
    const all = Array.from(this._devices.values());
    const filtered = filter ? all.filter(d => d.type.includes(filter) || d.id.includes(filter) || d.capabilities.includes(filter)) : all;
    
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 20;
    const start = (page - 1) * pageSize;
    const devices = filtered.slice(start, start + pageSize);

    this._recordHistory(`deviceList(filter=${filter ?? 'none'}, page=${page}) -> ${devices.length} results`);
    return { devices, total: filtered.length, page, pageSize };
  }

  public deviceSearch(query: string, criteria?: { type?: string; status?: string; tags?: string[]; capabilities?: string[] }): { results: IoTDevice[]; query: string; count: number } {
    let results = Array.from(this._devices.values());

    if (criteria?.type) {
      results = results.filter(d => d.type === criteria.type);
    }
    if (criteria?.status) {
      results = results.filter(d => d.status === criteria.status);
    }
    if (criteria?.capabilities) {
      results = results.filter(d => criteria.capabilities!.some(c => d.capabilities.includes(c)));
    }

    const lowerQuery = query.toLowerCase();
    results = results.filter(d =>
      d.id.toLowerCase().includes(lowerQuery) ||
      d.type.toLowerCase().includes(lowerQuery) ||
      JSON.stringify(d.metadata).toLowerCase().includes(lowerQuery)
    );

    this._recordHistory(`deviceSearch(query=${query}, criteria=${JSON.stringify(criteria)}) -> ${results.length} results`);
    return { results, query, count: results.length };
  }

  public getDevice(id: string): IoTDevice | null {
    const device = this._devices.get(id) || null;
    this._recordHistory(`getDevice(id=${id}) -> ${device ? 'found' : 'import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0',
    };

    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.onlineCount++;
    this._registry.updatedAt = Date.now();

    this._shadows.set(id, {
      deviceId: id,
      desired: {},
      reported: {},
      delta: {},
      version: 1,
      timestamp: Date.now(),
    });

    this._recordHistory(`registerDevice(id=${id}, type=${type}, capabilities=${capabilities.length})`);
    return { device, registered: true, id };
  }

  public bulkRegister(devices: { id: string; type: string; capabilities: string[] }[]): { registered: number; skipped: number; devices: IoTDevice[] } {
    const registeredDevices: IoTDevice[] = [];
    let registered = 0;
    let skipped = 0;

    for (const device of devices) {
      const result = this.registerDevice(device.id, device.type, device.capabilities);
      if (result.registered) {
        registered++;
        registeredDevices.push(result.device);
      } else {
        skipped++;
      }
    }

    this._recordHistory(`bulkRegister(devices=${devices.length}) -> registered=${registered}, skipped=${skipped}`);
    return { registered, skipped, devices: registeredDevices };
  }

  public unregisterDevice(id: string): { id: string; unregistered: boolean; removed: boolean } {
    const removed = this._devices.has(id);
    if (removed) {
      const device = this._devices.get(id)!;
      this._devices.delete(id);
      this._registry.devices.delete(id);
      this._registry.count--;
      if (device.status === 'online') this._registry.onlineCount--;
      else this._registry.offlineCount--;
      this._registry.updatedAt = Date.now();
      this._shadows.delete(id);
      this._firmwareUpdates.delete(id);
      this._configs.delete(id);
    }
    this._recordHistory(`unregisterDevice(id=${id}) -> ${removed}`);
    return { id, unregistered: removed, removed };
  }

  public updateDeviceStatus(id: string, status: IoTDevice['status'], properties?: Record<string, unknown>): { id: string; status: string; updated: boolean; properties: Record<string, unknown> } {
    const device = this._devices.get(id);
    const updated = !!device;
    if (device) {
      const oldStatus = device.status;
      const updatedDevice: IoTDevice = { ...device, status, lastSeen: Date.now(), metadata: { ...device.metadata, ...properties } };
      this._devices.set(id, updatedDevice);
      this._registry.devices.set(id, updatedDevice);
      this._registry.updatedAt = Date.now();

      if (oldStatus === 'online' && status !== 'online') this._registry.onlineCount--;
      if (oldStatus !== 'online' && status === 'online') this._registry.onlineCount++;
      if (oldStatus === 'offline' && status !== 'offline') this._registry.offlineCount--;
      if (oldStatus !== 'offline' && status === 'offline') this._registry.offlineCount++;

      this._recordEvent(id, 'status_change', { oldStatus, newStatus: status, properties }, status === 'error' ? 'critical' : 'low');
    }
    this._recordHistory(`updateDeviceStatus(id=${id}, status=${status})`);
    return { id, status, updated, properties: properties || {} };
  }

  public deviceList(filter?: string, pagination?: { page: number; pageSize: number }): { devices: IoTDevice[]; total: number; page: number; pageSize: number } {
    const all = Array.from(this._devices.values());
    const filtered = filter ? all.filter(d => d.type.includes(filter) || d.id.includes(filter) || d.capabilities.includes(filter)) : all;
    
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 20;
    const start = (page - 1) * pageSize;
    const devices = filtered.slice(start, start + pageSize);

    this._recordHistory(`deviceList(filter=${filter ?? 'none'}, page=${page}) -> ${devices.length} results`);
    return { devices, total: filtered.length, page, pageSize };
  }

  public deviceSearch(query: string, criteria?: { type?: string; status?: string; tags?: string[]; capabilities?: string[] }): { results: IoTDevice[]; query: string; count: number } {
    let results = Array.from(this._devices.values());

    if (criteria?.type) {
      results = results.filter(d => d.type === criteria.type);
    }
    if (criteria?.status) {
      results = results.filter(d => d.status === criteria.status);
    }
    if (criteria?.capabilities) {
      results = results.filter(d => criteria.capabilities!.some(c => d.capabilities.includes(c)));
    }

    const lowerQuery = query.toLowerCase();
    results = results.filter(d =>
      d.id.toLowerCase().includes(lowerQuery) ||
      d.type.toLowerCase().includes(lowerQuery) ||
      JSON.stringify(d.metadata).toLowerCase().includes(lowerQuery)
    );

    this._recordHistory(`deviceSearch(query=${query}, criteria=${JSON.stringify(criteria)}) -> ${results.length} results`);
    return { results, query, count: results.length };
  }

  public getDevice(id: string): IoTDevice | null {
    const device = this._devices.get(id) || null;
    this._recordHistory(`getDevice(id=${id}) -> ${device ? 'found' : 'not found'}`);
    return device;import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0',
    };

    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.onlineCount++;
    this._registry.updatedAt = Date.now();

    this._shadows.set(id, {
      deviceId: id,
      desired: {},
      reported: {},
      delta: {},
      version: 1,
      timestamp: Date.now(),
    });

    this._recordHistory(`registerDevice(id=${id}, type=${type}, capabilities=${capabilities.length})`);
    return { device, registered: true, id };
  }

  public bulkRegister(devices: { id: string; type: string; capabilities: string[] }[]): { registered: number; skipped: number; devices: IoTDevice[] } {
    const registeredDevices: IoTDevice[] = [];
    let registered = 0;
    let skipped = 0;

    for (const device of devices) {
      const result = this.registerDevice(device.id, device.type, device.capabilities);
      if (result.registered) {
        registered++;
        registeredDevices.push(result.device);
      } else {
        skipped++;
      }
    }

    this._recordHistory(`bulkRegister(devices=${devices.length}) -> registered=${registered}, skipped=${skipped}`);
    return { registered, skipped, devices: registeredDevices };
  }

  public unregisterDevice(id: string): { id: string; unregistered: boolean; removed: boolean } {
    const removed = this._devices.has(id);
    if (removed) {
      const device = this._devices.get(id)!;
      this._devices.delete(id);
      this._registry.devices.delete(id);
      this._registry.count--;
      if (device.status === 'online') this._registry.onlineCount--;
      else this._registry.offlineCount--;
      this._registry.updatedAt = Date.now();
      this._shadows.delete(id);
      this._firmwareUpdates.delete(id);
      this._configs.delete(id);
    }
    this._recordHistory(`unregisterDevice(id=${id}) -> ${removed}`);
    return { id, unregistered: removed, removed };
  }

  public updateDeviceStatus(id: string, status: IoTDevice['status'], properties?: Record<string, unknown>): { id: string; status: string; updated: boolean; properties: Record<string, unknown> } {
    const device = this._devices.get(id);
    const updated = !!device;
    if (device) {
      const oldStatus = device.status;
      const updatedDevice: IoTDevice = { ...device, status, lastSeen: Date.now(), metadata: { ...device.metadata, ...properties } };
      this._devices.set(id, updatedDevice);
      this._registry.devices.set(id, updatedDevice);
      this._registry.updatedAt = Date.now();

      if (oldStatus === 'online' && status !== 'online') this._registry.onlineCount--;
      if (oldStatus !== 'online' && status === 'online') this._registry.onlineCount++;
      if (oldStatus === 'offline' && status !== 'offline') this._registry.offlineCount--;
      if (oldStatus !== 'offline' && status === 'offline') this._registry.offlineCount++;

      this._recordEvent(id, 'status_change', { oldStatus, newStatus: status, properties }, status === 'error' ? 'critical' : 'low');
    }
    this._recordHistory(`updateDeviceStatus(id=${id}, status=${status})`);
    return { id, status, updated, properties: properties || {} };
  }

  public deviceList(filter?: string, pagination?: { page: number; pageSize: number }): { devices: IoTDevice[]; total: number; page: number; pageSize: number } {
    const all = Array.from(this._devices.values());
    const filtered = filter ? all.filter(d => d.type.includes(filter) || d.id.includes(filter) || d.capabilities.includes(filter)) : all;
    
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 20;
    const start = (page - 1) * pageSize;
    const devices = filtered.slice(start, start + pageSize);

    this._recordHistory(`deviceList(filter=${filter ?? 'none'}, page=${page}) -> ${devices.length} results`);
    return { devices, total: filtered.length, page, pageSize };
  }

  public deviceSearch(query: string, criteria?: { type?: string; status?: string; tags?: string[]; capabilities?: string[] }): { results: IoTDevice[]; query: string; count: number } {
    let results = Array.from(this._devices.values());

    if (criteria?.type) {
      results = results.filter(d => d.type === criteria.type);
    }
    if (criteria?.status) {
      results = results.filter(d => d.status === criteria.status);
    }
    if (criteria?.capabilities) {
      results = results.filter(d => criteria.capabilities!.some(c => d.capabilities.includes(c)));
    }

    const lowerQuery = query.toLowerCase();
    results = results.filter(d =>
      d.id.toLowerCase().includes(lowerQuery) ||
      d.type.toLowerCase().includes(lowerQuery) ||
      JSON.stringify(d.metadata).toLowerCase().includes(lowerQuery)
    );

    this._recordHistory(`deviceSearch(query=${query}, criteria=${JSON.stringify(criteria)}) -> ${results.length} results`);
    return { results, query, count: results.length };
  }

  public getDevice(id: string): IoTDevice | null {
    const device = this._devices.get(id) || null;
    this._recordHistory(`getDevice(id=${id}) -> ${device ? 'found' : 'not found'}`);
    return device;
  }

  public getDevicesByTypeimport { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0',
    };

    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.onlineCount++;
    this._registry.updatedAt = Date.now();

    this._shadows.set(id, {
      deviceId: id,
      desired: {},
      reported: {},
      delta: {},
      version: 1,
      timestamp: Date.now(),
    });

    this._recordHistory(`registerDevice(id=${id}, type=${type}, capabilities=${capabilities.length})`);
    return { device, registered: true, id };
  }

  public bulkRegister(devices: { id: string; type: string; capabilities: string[] }[]): { registered: number; skipped: number; devices: IoTDevice[] } {
    const registeredDevices: IoTDevice[] = [];
    let registered = 0;
    let skipped = 0;

    for (const device of devices) {
      const result = this.registerDevice(device.id, device.type, device.capabilities);
      if (result.registered) {
        registered++;
        registeredDevices.push(result.device);
      } else {
        skipped++;
      }
    }

    this._recordHistory(`bulkRegister(devices=${devices.length}) -> registered=${registered}, skipped=${skipped}`);
    return { registered, skipped, devices: registeredDevices };
  }

  public unregisterDevice(id: string): { id: string; unregistered: boolean; removed: boolean } {
    const removed = this._devices.has(id);
    if (removed) {
      const device = this._devices.get(id)!;
      this._devices.delete(id);
      this._registry.devices.delete(id);
      this._registry.count--;
      if (device.status === 'online') this._registry.onlineCount--;
      else this._registry.offlineCount--;
      this._registry.updatedAt = Date.now();
      this._shadows.delete(id);
      this._firmwareUpdates.delete(id);
      this._configs.delete(id);
    }
    this._recordHistory(`unregisterDevice(id=${id}) -> ${removed}`);
    return { id, unregistered: removed, removed };
  }

  public updateDeviceStatus(id: string, status: IoTDevice['status'], properties?: Record<string, unknown>): { id: string; status: string; updated: boolean; properties: Record<string, unknown> } {
    const device = this._devices.get(id);
    const updated = !!device;
    if (device) {
      const oldStatus = device.status;
      const updatedDevice: IoTDevice = { ...device, status, lastSeen: Date.now(), metadata: { ...device.metadata, ...properties } };
      this._devices.set(id, updatedDevice);
      this._registry.devices.set(id, updatedDevice);
      this._registry.updatedAt = Date.now();

      if (oldStatus === 'online' && status !== 'online') this._registry.onlineCount--;
      if (oldStatus !== 'online' && status === 'online') this._registry.onlineCount++;
      if (oldStatus === 'offline' && status !== 'offline') this._registry.offlineCount--;
      if (oldStatus !== 'offline' && status === 'offline') this._registry.offlineCount++;

      this._recordEvent(id, 'status_change', { oldStatus, newStatus: status, properties }, status === 'error' ? 'critical' : 'low');
    }
    this._recordHistory(`updateDeviceStatus(id=${id}, status=${status})`);
    return { id, status, updated, properties: properties || {} };
  }

  public deviceList(filter?: string, pagination?: { page: number; pageSize: number }): { devices: IoTDevice[]; total: number; page: number; pageSize: number } {
    const all = Array.from(this._devices.values());
    const filtered = filter ? all.filter(d => d.type.includes(filter) || d.id.includes(filter) || d.capabilities.includes(filter)) : all;
    
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 20;
    const start = (page - 1) * pageSize;
    const devices = filtered.slice(start, start + pageSize);

    this._recordHistory(`deviceList(filter=${filter ?? 'none'}, page=${page}) -> ${devices.length} results`);
    return { devices, total: filtered.length, page, pageSize };
  }

  public deviceSearch(query: string, criteria?: { type?: string; status?: string; tags?: string[]; capabilities?: string[] }): { results: IoTDevice[]; query: string; count: number } {
    let results = Array.from(this._devices.values());

    if (criteria?.type) {
      results = results.filter(d => d.type === criteria.type);
    }
    if (criteria?.status) {
      results = results.filter(d => d.status === criteria.status);
    }
    if (criteria?.capabilities) {
      results = results.filter(d => criteria.capabilities!.some(c => d.capabilities.includes(c)));
    }

    const lowerQuery = query.toLowerCase();
    results = results.filter(d =>
      d.id.toLowerCase().includes(lowerQuery) ||
      d.type.toLowerCase().includes(lowerQuery) ||
      JSON.stringify(d.metadata).toLowerCase().includes(lowerQuery)
    );

    this._recordHistory(`deviceSearch(query=${query}, criteria=${JSON.stringify(criteria)}) -> ${results.length} results`);
    return { results, query, count: results.length };
  }

  public getDevice(id: string): IoTDevice | null {
    const device = this._devices.get(id) || null;
    this._recordHistory(`getDevice(id=${id}) -> ${device ? 'found' : 'not found'}`);
    return device;
  }

  public getDevicesByType(type: string): IoTDevice[] {
import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0',
    };

    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.onlineCount++;
    this._registry.updatedAt = Date.now();

    this._shadows.set(id, {
      deviceId: id,
      desired: {},
      reported: {},
      delta: {},
      version: 1,
      timestamp: Date.now(),
    });

    this._recordHistory(`registerDevice(id=${id}, type=${type}, capabilities=${capabilities.length})`);
    return { device, registered: true, id };
  }

  public bulkRegister(devices: { id: string; type: string; capabilities: string[] }[]): { registered: number; skipped: number; devices: IoTDevice[] } {
    const registeredDevices: IoTDevice[] = [];
    let registered = 0;
    let skipped = 0;

    for (const device of devices) {
      const result = this.registerDevice(device.id, device.type, device.capabilities);
      if (result.registered) {
        registered++;
        registeredDevices.push(result.device);
      } else {
        skipped++;
      }
    }

    this._recordHistory(`bulkRegister(devices=${devices.length}) -> registered=${registered}, skipped=${skipped}`);
    return { registered, skipped, devices: registeredDevices };
  }

  public unregisterDevice(id: string): { id: string; unregistered: boolean; removed: boolean } {
    const removed = this._devices.has(id);
    if (removed) {
      const device = this._devices.get(id)!;
      this._devices.delete(id);
      this._registry.devices.delete(id);
      this._registry.count--;
      if (device.status === 'online') this._registry.onlineCount--;
      else this._registry.offlineCount--;
      this._registry.updatedAt = Date.now();
      this._shadows.delete(id);
      this._firmwareUpdates.delete(id);
      this._configs.delete(id);
    }
    this._recordHistory(`unregisterDevice(id=${id}) -> ${removed}`);
    return { id, unregistered: removed, removed };
  }

  public updateDeviceStatus(id: string, status: IoTDevice['status'], properties?: Record<string, unknown>): { id: string; status: string; updated: boolean; properties: Record<string, unknown> } {
    const device = this._devices.get(id);
    const updated = !!device;
    if (device) {
      const oldStatus = device.status;
      const updatedDevice: IoTDevice = { ...device, status, lastSeen: Date.now(), metadata: { ...device.metadata, ...properties } };
      this._devices.set(id, updatedDevice);
      this._registry.devices.set(id, updatedDevice);
      this._registry.updatedAt = Date.now();

      if (oldStatus === 'online' && status !== 'online') this._registry.onlineCount--;
      if (oldStatus !== 'online' && status === 'online') this._registry.onlineCount++;
      if (oldStatus === 'offline' && status !== 'offline') this._registry.offlineCount--;
      if (oldStatus !== 'offline' && status === 'offline') this._registry.offlineCount++;

      this._recordEvent(id, 'status_change', { oldStatus, newStatus: status, properties }, status === 'error' ? 'critical' : 'low');
    }
    this._recordHistory(`updateDeviceStatus(id=${id}, status=${status})`);
    return { id, status, updated, properties: properties || {} };
  }

  public deviceList(filter?: string, pagination?: { page: number; pageSize: number }): { devices: IoTDevice[]; total: number; page: number; pageSize: number } {
    const all = Array.from(this._devices.values());
    const filtered = filter ? all.filter(d => d.type.includes(filter) || d.id.includes(filter) || d.capabilities.includes(filter)) : all;
    
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 20;
    const start = (page - 1) * pageSize;
    const devices = filtered.slice(start, start + pageSize);

    this._recordHistory(`deviceList(filter=${filter ?? 'none'}, page=${page}) -> ${devices.length} results`);
    return { devices, total: filtered.length, page, pageSize };
  }

  public deviceSearch(query: string, criteria?: { type?: string; status?: string; tags?: string[]; capabilities?: string[] }): { results: IoTDevice[]; query: string; count: number } {
    let results = Array.from(this._devices.values());

    if (criteria?.type) {
      results = results.filter(d => d.type === criteria.type);
    }
    if (criteria?.status) {
      results = results.filter(d => d.status === criteria.status);
    }
    if (criteria?.capabilities) {
      results = results.filter(d => criteria.capabilities!.some(c => d.capabilities.includes(c)));
    }

    const lowerQuery = query.toLowerCase();
    results = results.filter(d =>
      d.id.toLowerCase().includes(lowerQuery) ||
      d.type.toLowerCase().includes(lowerQuery) ||
      JSON.stringify(d.metadata).toLowerCase().includes(lowerQuery)
    );

    this._recordHistory(`deviceSearch(query=${query}, criteria=${JSON.stringify(criteria)}) -> ${results.length} results`);
    return { results, query, count: results.length };
  }

  public getDevice(id: string): IoTDevice | null {
    const device = this._devices.get(id) || null;
    this._recordHistory(`getDevice(id=${id}) -> ${device ? 'found' : 'not found'}`);
    return device;
  }

  public getDevicesByType(type: string): IoTDevice[] {
    const devices = Array.from(this._devices.valuesimport { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0',
    };

    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.onlineCount++;
    this._registry.updatedAt = Date.now();

    this._shadows.set(id, {
      deviceId: id,
      desired: {},
      reported: {},
      delta: {},
      version: 1,
      timestamp: Date.now(),
    });

    this._recordHistory(`registerDevice(id=${id}, type=${type}, capabilities=${capabilities.length})`);
    return { device, registered: true, id };
  }

  public bulkRegister(devices: { id: string; type: string; capabilities: string[] }[]): { registered: number; skipped: number; devices: IoTDevice[] } {
    const registeredDevices: IoTDevice[] = [];
    let registered = 0;
    let skipped = 0;

    for (const device of devices) {
      const result = this.registerDevice(device.id, device.type, device.capabilities);
      if (result.registered) {
        registered++;
        registeredDevices.push(result.device);
      } else {
        skipped++;
      }
    }

    this._recordHistory(`bulkRegister(devices=${devices.length}) -> registered=${registered}, skipped=${skipped}`);
    return { registered, skipped, devices: registeredDevices };
  }

  public unregisterDevice(id: string): { id: string; unregistered: boolean; removed: boolean } {
    const removed = this._devices.has(id);
    if (removed) {
      const device = this._devices.get(id)!;
      this._devices.delete(id);
      this._registry.devices.delete(id);
      this._registry.count--;
      if (device.status === 'online') this._registry.onlineCount--;
      else this._registry.offlineCount--;
      this._registry.updatedAt = Date.now();
      this._shadows.delete(id);
      this._firmwareUpdates.delete(id);
      this._configs.delete(id);
    }
    this._recordHistory(`unregisterDevice(id=${id}) -> ${removed}`);
    return { id, unregistered: removed, removed };
  }

  public updateDeviceStatus(id: string, status: IoTDevice['status'], properties?: Record<string, unknown>): { id: string; status: string; updated: boolean; properties: Record<string, unknown> } {
    const device = this._devices.get(id);
    const updated = !!device;
    if (device) {
      const oldStatus = device.status;
      const updatedDevice: IoTDevice = { ...device, status, lastSeen: Date.now(), metadata: { ...device.metadata, ...properties } };
      this._devices.set(id, updatedDevice);
      this._registry.devices.set(id, updatedDevice);
      this._registry.updatedAt = Date.now();

      if (oldStatus === 'online' && status !== 'online') this._registry.onlineCount--;
      if (oldStatus !== 'online' && status === 'online') this._registry.onlineCount++;
      if (oldStatus === 'offline' && status !== 'offline') this._registry.offlineCount--;
      if (oldStatus !== 'offline' && status === 'offline') this._registry.offlineCount++;

      this._recordEvent(id, 'status_change', { oldStatus, newStatus: status, properties }, status === 'error' ? 'critical' : 'low');
    }
    this._recordHistory(`updateDeviceStatus(id=${id}, status=${status})`);
    return { id, status, updated, properties: properties || {} };
  }

  public deviceList(filter?: string, pagination?: { page: number; pageSize: number }): { devices: IoTDevice[]; total: number; page: number; pageSize: number } {
    const all = Array.from(this._devices.values());
    const filtered = filter ? all.filter(d => d.type.includes(filter) || d.id.includes(filter) || d.capabilities.includes(filter)) : all;
    
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 20;
    const start = (page - 1) * pageSize;
    const devices = filtered.slice(start, start + pageSize);

    this._recordHistory(`deviceList(filter=${filter ?? 'none'}, page=${page}) -> ${devices.length} results`);
    return { devices, total: filtered.length, page, pageSize };
  }

  public deviceSearch(query: string, criteria?: { type?: string; status?: string; tags?: string[]; capabilities?: string[] }): { results: IoTDevice[]; query: string; count: number } {
    let results = Array.from(this._devices.values());

    if (criteria?.type) {
      results = results.filter(d => d.type === criteria.type);
    }
    if (criteria?.status) {
      results = results.filter(d => d.status === criteria.status);
    }
    if (criteria?.capabilities) {
      results = results.filter(d => criteria.capabilities!.some(c => d.capabilities.includes(c)));
    }

    const lowerQuery = query.toLowerCase();
    results = results.filter(d =>
      d.id.toLowerCase().includes(lowerQuery) ||
      d.type.toLowerCase().includes(lowerQuery) ||
      JSON.stringify(d.metadata).toLowerCase().includes(lowerQuery)
    );

    this._recordHistory(`deviceSearch(query=${query}, criteria=${JSON.stringify(criteria)}) -> ${results.length} results`);
    return { results, query, count: results.length };
  }

  public getDevice(id: string): IoTDevice | null {
    const device = this._devices.get(id) || null;
    this._recordHistory(`getDevice(id=${id}) -> ${device ? 'found' : 'not found'}`);
    return device;
  }

  public getDevicesByType(type: string): IoTDevice[] {
    const devices = Array.from(this._devices.values()).filter(d => d.type === type);
    this._recordHistory(`getDevicesByType(type=${type}) -> ${devices.length} devicesimport { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0',
    };

    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.onlineCount++;
    this._registry.updatedAt = Date.now();

    this._shadows.set(id, {
      deviceId: id,
      desired: {},
      reported: {},
      delta: {},
      version: 1,
      timestamp: Date.now(),
    });

    this._recordHistory(`registerDevice(id=${id}, type=${type}, capabilities=${capabilities.length})`);
    return { device, registered: true, id };
  }

  public bulkRegister(devices: { id: string; type: string; capabilities: string[] }[]): { registered: number; skipped: number; devices: IoTDevice[] } {
    const registeredDevices: IoTDevice[] = [];
    let registered = 0;
    let skipped = 0;

    for (const device of devices) {
      const result = this.registerDevice(device.id, device.type, device.capabilities);
      if (result.registered) {
        registered++;
        registeredDevices.push(result.device);
      } else {
        skipped++;
      }
    }

    this._recordHistory(`bulkRegister(devices=${devices.length}) -> registered=${registered}, skipped=${skipped}`);
    return { registered, skipped, devices: registeredDevices };
  }

  public unregisterDevice(id: string): { id: string; unregistered: boolean; removed: boolean } {
    const removed = this._devices.has(id);
    if (removed) {
      const device = this._devices.get(id)!;
      this._devices.delete(id);
      this._registry.devices.delete(id);
      this._registry.count--;
      if (device.status === 'online') this._registry.onlineCount--;
      else this._registry.offlineCount--;
      this._registry.updatedAt = Date.now();
      this._shadows.delete(id);
      this._firmwareUpdates.delete(id);
      this._configs.delete(id);
    }
    this._recordHistory(`unregisterDevice(id=${id}) -> ${removed}`);
    return { id, unregistered: removed, removed };
  }

  public updateDeviceStatus(id: string, status: IoTDevice['status'], properties?: Record<string, unknown>): { id: string; status: string; updated: boolean; properties: Record<string, unknown> } {
    const device = this._devices.get(id);
    const updated = !!device;
    if (device) {
      const oldStatus = device.status;
      const updatedDevice: IoTDevice = { ...device, status, lastSeen: Date.now(), metadata: { ...device.metadata, ...properties } };
      this._devices.set(id, updatedDevice);
      this._registry.devices.set(id, updatedDevice);
      this._registry.updatedAt = Date.now();

      if (oldStatus === 'online' && status !== 'online') this._registry.onlineCount--;
      if (oldStatus !== 'online' && status === 'online') this._registry.onlineCount++;
      if (oldStatus === 'offline' && status !== 'offline') this._registry.offlineCount--;
      if (oldStatus !== 'offline' && status === 'offline') this._registry.offlineCount++;

      this._recordEvent(id, 'status_change', { oldStatus, newStatus: status, properties }, status === 'error' ? 'critical' : 'low');
    }
    this._recordHistory(`updateDeviceStatus(id=${id}, status=${status})`);
    return { id, status, updated, properties: properties || {} };
  }

  public deviceList(filter?: string, pagination?: { page: number; pageSize: number }): { devices: IoTDevice[]; total: number; page: number; pageSize: number } {
    const all = Array.from(this._devices.values());
    const filtered = filter ? all.filter(d => d.type.includes(filter) || d.id.includes(filter) || d.capabilities.includes(filter)) : all;
    
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 20;
    const start = (page - 1) * pageSize;
    const devices = filtered.slice(start, start + pageSize);

    this._recordHistory(`deviceList(filter=${filter ?? 'none'}, page=${page}) -> ${devices.length} results`);
    return { devices, total: filtered.length, page, pageSize };
  }

  public deviceSearch(query: string, criteria?: { type?: string; status?: string; tags?: string[]; capabilities?: string[] }): { results: IoTDevice[]; query: string; count: number } {
    let results = Array.from(this._devices.values());

    if (criteria?.type) {
      results = results.filter(d => d.type === criteria.type);
    }
    if (criteria?.status) {
      results = results.filter(d => d.status === criteria.status);
    }
    if (criteria?.capabilities) {
      results = results.filter(d => criteria.capabilities!.some(c => d.capabilities.includes(c)));
    }

    const lowerQuery = query.toLowerCase();
    results = results.filter(d =>
      d.id.toLowerCase().includes(lowerQuery) ||
      d.type.toLowerCase().includes(lowerQuery) ||
      JSON.stringify(d.metadata).toLowerCase().includes(lowerQuery)
    );

    this._recordHistory(`deviceSearch(query=${query}, criteria=${JSON.stringify(criteria)}) -> ${results.length} results`);
    return { results, query, count: results.length };
  }

  public getDevice(id: string): IoTDevice | null {
    const device = this._devices.get(id) || null;
    this._recordHistory(`getDevice(id=${id}) -> ${device ? 'found' : 'not found'}`);
    return device;
  }

  public getDevicesByType(type: string): IoTDevice[] {
    const devices = Array.from(this._devices.values()).filter(d => d.type === type);
    this._recordHistory(`getDevicesByType(type=${type}) -> ${devices.length} devices`);
    return devices;
  }

  public getDevicesByStatus(status: IoTDevice['status']): IoTDevice[]import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0',
    };

    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.onlineCount++;
    this._registry.updatedAt = Date.now();

    this._shadows.set(id, {
      deviceId: id,
      desired: {},
      reported: {},
      delta: {},
      version: 1,
      timestamp: Date.now(),
    });

    this._recordHistory(`registerDevice(id=${id}, type=${type}, capabilities=${capabilities.length})`);
    return { device, registered: true, id };
  }

  public bulkRegister(devices: { id: string; type: string; capabilities: string[] }[]): { registered: number; skipped: number; devices: IoTDevice[] } {
    const registeredDevices: IoTDevice[] = [];
    let registered = 0;
    let skipped = 0;

    for (const device of devices) {
      const result = this.registerDevice(device.id, device.type, device.capabilities);
      if (result.registered) {
        registered++;
        registeredDevices.push(result.device);
      } else {
        skipped++;
      }
    }

    this._recordHistory(`bulkRegister(devices=${devices.length}) -> registered=${registered}, skipped=${skipped}`);
    return { registered, skipped, devices: registeredDevices };
  }

  public unregisterDevice(id: string): { id: string; unregistered: boolean; removed: boolean } {
    const removed = this._devices.has(id);
    if (removed) {
      const device = this._devices.get(id)!;
      this._devices.delete(id);
      this._registry.devices.delete(id);
      this._registry.count--;
      if (device.status === 'online') this._registry.onlineCount--;
      else this._registry.offlineCount--;
      this._registry.updatedAt = Date.now();
      this._shadows.delete(id);
      this._firmwareUpdates.delete(id);
      this._configs.delete(id);
    }
    this._recordHistory(`unregisterDevice(id=${id}) -> ${removed}`);
    return { id, unregistered: removed, removed };
  }

  public updateDeviceStatus(id: string, status: IoTDevice['status'], properties?: Record<string, unknown>): { id: string; status: string; updated: boolean; properties: Record<string, unknown> } {
    const device = this._devices.get(id);
    const updated = !!device;
    if (device) {
      const oldStatus = device.status;
      const updatedDevice: IoTDevice = { ...device, status, lastSeen: Date.now(), metadata: { ...device.metadata, ...properties } };
      this._devices.set(id, updatedDevice);
      this._registry.devices.set(id, updatedDevice);
      this._registry.updatedAt = Date.now();

      if (oldStatus === 'online' && status !== 'online') this._registry.onlineCount--;
      if (oldStatus !== 'online' && status === 'online') this._registry.onlineCount++;
      if (oldStatus === 'offline' && status !== 'offline') this._registry.offlineCount--;
      if (oldStatus !== 'offline' && status === 'offline') this._registry.offlineCount++;

      this._recordEvent(id, 'status_change', { oldStatus, newStatus: status, properties }, status === 'error' ? 'critical' : 'low');
    }
    this._recordHistory(`updateDeviceStatus(id=${id}, status=${status})`);
    return { id, status, updated, properties: properties || {} };
  }

  public deviceList(filter?: string, pagination?: { page: number; pageSize: number }): { devices: IoTDevice[]; total: number; page: number; pageSize: number } {
    const all = Array.from(this._devices.values());
    const filtered = filter ? all.filter(d => d.type.includes(filter) || d.id.includes(filter) || d.capabilities.includes(filter)) : all;
    
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 20;
    const start = (page - 1) * pageSize;
    const devices = filtered.slice(start, start + pageSize);

    this._recordHistory(`deviceList(filter=${filter ?? 'none'}, page=${page}) -> ${devices.length} results`);
    return { devices, total: filtered.length, page, pageSize };
  }

  public deviceSearch(query: string, criteria?: { type?: string; status?: string; tags?: string[]; capabilities?: string[] }): { results: IoTDevice[]; query: string; count: number } {
    let results = Array.from(this._devices.values());

    if (criteria?.type) {
      results = results.filter(d => d.type === criteria.type);
    }
    if (criteria?.status) {
      results = results.filter(d => d.status === criteria.status);
    }
    if (criteria?.capabilities) {
      results = results.filter(d => criteria.capabilities!.some(c => d.capabilities.includes(c)));
    }

    const lowerQuery = query.toLowerCase();
    results = results.filter(d =>
      d.id.toLowerCase().includes(lowerQuery) ||
      d.type.toLowerCase().includes(lowerQuery) ||
      JSON.stringify(d.metadata).toLowerCase().includes(lowerQuery)
    );

    this._recordHistory(`deviceSearch(query=${query}, criteria=${JSON.stringify(criteria)}) -> ${results.length} results`);
    return { results, query, count: results.length };
  }

  public getDevice(id: string): IoTDevice | null {
    const device = this._devices.get(id) || null;
    this._recordHistory(`getDevice(id=${id}) -> ${device ? 'found' : 'not found'}`);
    return device;
  }

  public getDevicesByType(type: string): IoTDevice[] {
    const devices = Array.from(this._devices.values()).filter(d => d.type === type);
    this._recordHistory(`getDevicesByType(type=${type}) -> ${devices.length} devices`);
    return devices;
  }

  public getDevicesByStatus(status: IoTDevice['status']): IoTDevice[] {
    const devices = Array.from(this._import { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0',
    };

    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.onlineCount++;
    this._registry.updatedAt = Date.now();

    this._shadows.set(id, {
      deviceId: id,
      desired: {},
      reported: {},
      delta: {},
      version: 1,
      timestamp: Date.now(),
    });

    this._recordHistory(`registerDevice(id=${id}, type=${type}, capabilities=${capabilities.length})`);
    return { device, registered: true, id };
  }

  public bulkRegister(devices: { id: string; type: string; capabilities: string[] }[]): { registered: number; skipped: number; devices: IoTDevice[] } {
    const registeredDevices: IoTDevice[] = [];
    let registered = 0;
    let skipped = 0;

    for (const device of devices) {
      const result = this.registerDevice(device.id, device.type, device.capabilities);
      if (result.registered) {
        registered++;
        registeredDevices.push(result.device);
      } else {
        skipped++;
      }
    }

    this._recordHistory(`bulkRegister(devices=${devices.length}) -> registered=${registered}, skipped=${skipped}`);
    return { registered, skipped, devices: registeredDevices };
  }

  public unregisterDevice(id: string): { id: string; unregistered: boolean; removed: boolean } {
    const removed = this._devices.has(id);
    if (removed) {
      const device = this._devices.get(id)!;
      this._devices.delete(id);
      this._registry.devices.delete(id);
      this._registry.count--;
      if (device.status === 'online') this._registry.onlineCount--;
      else this._registry.offlineCount--;
      this._registry.updatedAt = Date.now();
      this._shadows.delete(id);
      this._firmwareUpdates.delete(id);
      this._configs.delete(id);
    }
    this._recordHistory(`unregisterDevice(id=${id}) -> ${removed}`);
    return { id, unregistered: removed, removed };
  }

  public updateDeviceStatus(id: string, status: IoTDevice['status'], properties?: Record<string, unknown>): { id: string; status: string; updated: boolean; properties: Record<string, unknown> } {
    const device = this._devices.get(id);
    const updated = !!device;
    if (device) {
      const oldStatus = device.status;
      const updatedDevice: IoTDevice = { ...device, status, lastSeen: Date.now(), metadata: { ...device.metadata, ...properties } };
      this._devices.set(id, updatedDevice);
      this._registry.devices.set(id, updatedDevice);
      this._registry.updatedAt = Date.now();

      if (oldStatus === 'online' && status !== 'online') this._registry.onlineCount--;
      if (oldStatus !== 'online' && status === 'online') this._registry.onlineCount++;
      if (oldStatus === 'offline' && status !== 'offline') this._registry.offlineCount--;
      if (oldStatus !== 'offline' && status === 'offline') this._registry.offlineCount++;

      this._recordEvent(id, 'status_change', { oldStatus, newStatus: status, properties }, status === 'error' ? 'critical' : 'low');
    }
    this._recordHistory(`updateDeviceStatus(id=${id}, status=${status})`);
    return { id, status, updated, properties: properties || {} };
  }

  public deviceList(filter?: string, pagination?: { page: number; pageSize: number }): { devices: IoTDevice[]; total: number; page: number; pageSize: number } {
    const all = Array.from(this._devices.values());
    const filtered = filter ? all.filter(d => d.type.includes(filter) || d.id.includes(filter) || d.capabilities.includes(filter)) : all;
    
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 20;
    const start = (page - 1) * pageSize;
    const devices = filtered.slice(start, start + pageSize);

    this._recordHistory(`deviceList(filter=${filter ?? 'none'}, page=${page}) -> ${devices.length} results`);
    return { devices, total: filtered.length, page, pageSize };
  }

  public deviceSearch(query: string, criteria?: { type?: string; status?: string; tags?: string[]; capabilities?: string[] }): { results: IoTDevice[]; query: string; count: number } {
    let results = Array.from(this._devices.values());

    if (criteria?.type) {
      results = results.filter(d => d.type === criteria.type);
    }
    if (criteria?.status) {
      results = results.filter(d => d.status === criteria.status);
    }
    if (criteria?.capabilities) {
      results = results.filter(d => criteria.capabilities!.some(c => d.capabilities.includes(c)));
    }

    const lowerQuery = query.toLowerCase();
    results = results.filter(d =>
      d.id.toLowerCase().includes(lowerQuery) ||
      d.type.toLowerCase().includes(lowerQuery) ||
      JSON.stringify(d.metadata).toLowerCase().includes(lowerQuery)
    );

    this._recordHistory(`deviceSearch(query=${query}, criteria=${JSON.stringify(criteria)}) -> ${results.length} results`);
    return { results, query, count: results.length };
  }

  public getDevice(id: string): IoTDevice | null {
    const device = this._devices.get(id) || null;
    this._recordHistory(`getDevice(id=${id}) -> ${device ? 'found' : 'not found'}`);
    return device;
  }

  public getDevicesByType(type: string): IoTDevice[] {
    const devices = Array.from(this._devices.values()).filter(d => d.type === type);
    this._recordHistory(`getDevicesByType(type=${type}) -> ${devices.length} devices`);
    return devices;
  }

  public getDevicesByStatus(status: IoTDevice['status']): IoTDevice[] {
    const devices = Array.from(this._devices.values()).filter(d => d.status === statusimport { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0',
    };

    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.onlineCount++;
    this._registry.updatedAt = Date.now();

    this._shadows.set(id, {
      deviceId: id,
      desired: {},
      reported: {},
      delta: {},
      version: 1,
      timestamp: Date.now(),
    });

    this._recordHistory(`registerDevice(id=${id}, type=${type}, capabilities=${capabilities.length})`);
    return { device, registered: true, id };
  }

  public bulkRegister(devices: { id: string; type: string; capabilities: string[] }[]): { registered: number; skipped: number; devices: IoTDevice[] } {
    const registeredDevices: IoTDevice[] = [];
    let registered = 0;
    let skipped = 0;

    for (const device of devices) {
      const result = this.registerDevice(device.id, device.type, device.capabilities);
      if (result.registered) {
        registered++;
        registeredDevices.push(result.device);
      } else {
        skipped++;
      }
    }

    this._recordHistory(`bulkRegister(devices=${devices.length}) -> registered=${registered}, skipped=${skipped}`);
    return { registered, skipped, devices: registeredDevices };
  }

  public unregisterDevice(id: string): { id: string; unregistered: boolean; removed: boolean } {
    const removed = this._devices.has(id);
    if (removed) {
      const device = this._devices.get(id)!;
      this._devices.delete(id);
      this._registry.devices.delete(id);
      this._registry.count--;
      if (device.status === 'online') this._registry.onlineCount--;
      else this._registry.offlineCount--;
      this._registry.updatedAt = Date.now();
      this._shadows.delete(id);
      this._firmwareUpdates.delete(id);
      this._configs.delete(id);
    }
    this._recordHistory(`unregisterDevice(id=${id}) -> ${removed}`);
    return { id, unregistered: removed, removed };
  }

  public updateDeviceStatus(id: string, status: IoTDevice['status'], properties?: Record<string, unknown>): { id: string; status: string; updated: boolean; properties: Record<string, unknown> } {
    const device = this._devices.get(id);
    const updated = !!device;
    if (device) {
      const oldStatus = device.status;
      const updatedDevice: IoTDevice = { ...device, status, lastSeen: Date.now(), metadata: { ...device.metadata, ...properties } };
      this._devices.set(id, updatedDevice);
      this._registry.devices.set(id, updatedDevice);
      this._registry.updatedAt = Date.now();

      if (oldStatus === 'online' && status !== 'online') this._registry.onlineCount--;
      if (oldStatus !== 'online' && status === 'online') this._registry.onlineCount++;
      if (oldStatus === 'offline' && status !== 'offline') this._registry.offlineCount--;
      if (oldStatus !== 'offline' && status === 'offline') this._registry.offlineCount++;

      this._recordEvent(id, 'status_change', { oldStatus, newStatus: status, properties }, status === 'error' ? 'critical' : 'low');
    }
    this._recordHistory(`updateDeviceStatus(id=${id}, status=${status})`);
    return { id, status, updated, properties: properties || {} };
  }

  public deviceList(filter?: string, pagination?: { page: number; pageSize: number }): { devices: IoTDevice[]; total: number; page: number; pageSize: number } {
    const all = Array.from(this._devices.values());
    const filtered = filter ? all.filter(d => d.type.includes(filter) || d.id.includes(filter) || d.capabilities.includes(filter)) : all;
    
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 20;
    const start = (page - 1) * pageSize;
    const devices = filtered.slice(start, start + pageSize);

    this._recordHistory(`deviceList(filter=${filter ?? 'none'}, page=${page}) -> ${devices.length} results`);
    return { devices, total: filtered.length, page, pageSize };
  }

  public deviceSearch(query: string, criteria?: { type?: string; status?: string; tags?: string[]; capabilities?: string[] }): { results: IoTDevice[]; query: string; count: number } {
    let results = Array.from(this._devices.values());

    if (criteria?.type) {
      results = results.filter(d => d.type === criteria.type);
    }
    if (criteria?.status) {
      results = results.filter(d => d.status === criteria.status);
    }
    if (criteria?.capabilities) {
      results = results.filter(d => criteria.capabilities!.some(c => d.capabilities.includes(c)));
    }

    const lowerQuery = query.toLowerCase();
    results = results.filter(d =>
      d.id.toLowerCase().includes(lowerQuery) ||
      d.type.toLowerCase().includes(lowerQuery) ||
      JSON.stringify(d.metadata).toLowerCase().includes(lowerQuery)
    );

    this._recordHistory(`deviceSearch(query=${query}, criteria=${JSON.stringify(criteria)}) -> ${results.length} results`);
    return { results, query, count: results.length };
  }

  public getDevice(id: string): IoTDevice | null {
    const device = this._devices.get(id) || null;
    this._recordHistory(`getDevice(id=${id}) -> ${device ? 'found' : 'not found'}`);
    return device;
  }

  public getDevicesByType(type: string): IoTDevice[] {
    const devices = Array.from(this._devices.values()).filter(d => d.type === type);
    this._recordHistory(`getDevicesByType(type=${type}) -> ${devices.length} devices`);
    return devices;
  }

  public getDevicesByStatus(status: IoTDevice['status']): IoTDevice[] {
    const devices = Array.from(this._devices.values()).filter(d => d.status === status);
    this._recordHistory(`getDevicesimport { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0',
    };

    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.onlineCount++;
    this._registry.updatedAt = Date.now();

    this._shadows.set(id, {
      deviceId: id,
      desired: {},
      reported: {},
      delta: {},
      version: 1,
      timestamp: Date.now(),
    });

    this._recordHistory(`registerDevice(id=${id}, type=${type}, capabilities=${capabilities.length})`);
    return { device, registered: true, id };
  }

  public bulkRegister(devices: { id: string; type: string; capabilities: string[] }[]): { registered: number; skipped: number; devices: IoTDevice[] } {
    const registeredDevices: IoTDevice[] = [];
    let registered = 0;
    let skipped = 0;

    for (const device of devices) {
      const result = this.registerDevice(device.id, device.type, device.capabilities);
      if (result.registered) {
        registered++;
        registeredDevices.push(result.device);
      } else {
        skipped++;
      }
    }

    this._recordHistory(`bulkRegister(devices=${devices.length}) -> registered=${registered}, skipped=${skipped}`);
    return { registered, skipped, devices: registeredDevices };
  }

  public unregisterDevice(id: string): { id: string; unregistered: boolean; removed: boolean } {
    const removed = this._devices.has(id);
    if (removed) {
      const device = this._devices.get(id)!;
      this._devices.delete(id);
      this._registry.devices.delete(id);
      this._registry.count--;
      if (device.status === 'online') this._registry.onlineCount--;
      else this._registry.offlineCount--;
      this._registry.updatedAt = Date.now();
      this._shadows.delete(id);
      this._firmwareUpdates.delete(id);
      this._configs.delete(id);
    }
    this._recordHistory(`unregisterDevice(id=${id}) -> ${removed}`);
    return { id, unregistered: removed, removed };
  }

  public updateDeviceStatus(id: string, status: IoTDevice['status'], properties?: Record<string, unknown>): { id: string; status: string; updated: boolean; properties: Record<string, unknown> } {
    const device = this._devices.get(id);
    const updated = !!device;
    if (device) {
      const oldStatus = device.status;
      const updatedDevice: IoTDevice = { ...device, status, lastSeen: Date.now(), metadata: { ...device.metadata, ...properties } };
      this._devices.set(id, updatedDevice);
      this._registry.devices.set(id, updatedDevice);
      this._registry.updatedAt = Date.now();

      if (oldStatus === 'online' && status !== 'online') this._registry.onlineCount--;
      if (oldStatus !== 'online' && status === 'online') this._registry.onlineCount++;
      if (oldStatus === 'offline' && status !== 'offline') this._registry.offlineCount--;
      if (oldStatus !== 'offline' && status === 'offline') this._registry.offlineCount++;

      this._recordEvent(id, 'status_change', { oldStatus, newStatus: status, properties }, status === 'error' ? 'critical' : 'low');
    }
    this._recordHistory(`updateDeviceStatus(id=${id}, status=${status})`);
    return { id, status, updated, properties: properties || {} };
  }

  public deviceList(filter?: string, pagination?: { page: number; pageSize: number }): { devices: IoTDevice[]; total: number; page: number; pageSize: number } {
    const all = Array.from(this._devices.values());
    const filtered = filter ? all.filter(d => d.type.includes(filter) || d.id.includes(filter) || d.capabilities.includes(filter)) : all;
    
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 20;
    const start = (page - 1) * pageSize;
    const devices = filtered.slice(start, start + pageSize);

    this._recordHistory(`deviceList(filter=${filter ?? 'none'}, page=${page}) -> ${devices.length} results`);
    return { devices, total: filtered.length, page, pageSize };
  }

  public deviceSearch(query: string, criteria?: { type?: string; status?: string; tags?: string[]; capabilities?: string[] }): { results: IoTDevice[]; query: string; count: number } {
    let results = Array.from(this._devices.values());

    if (criteria?.type) {
      results = results.filter(d => d.type === criteria.type);
    }
    if (criteria?.status) {
      results = results.filter(d => d.status === criteria.status);
    }
    if (criteria?.capabilities) {
      results = results.filter(d => criteria.capabilities!.some(c => d.capabilities.includes(c)));
    }

    const lowerQuery = query.toLowerCase();
    results = results.filter(d =>
      d.id.toLowerCase().includes(lowerQuery) ||
      d.type.toLowerCase().includes(lowerQuery) ||
      JSON.stringify(d.metadata).toLowerCase().includes(lowerQuery)
    );

    this._recordHistory(`deviceSearch(query=${query}, criteria=${JSON.stringify(criteria)}) -> ${results.length} results`);
    return { results, query, count: results.length };
  }

  public getDevice(id: string): IoTDevice | null {
    const device = this._devices.get(id) || null;
    this._recordHistory(`getDevice(id=${id}) -> ${device ? 'found' : 'not found'}`);
    return device;
  }

  public getDevicesByType(type: string): IoTDevice[] {
    const devices = Array.from(this._devices.values()).filter(d => d.type === type);
    this._recordHistory(`getDevicesByType(type=${type}) -> ${devices.length} devices`);
    return devices;
  }

  public getDevicesByStatus(status: IoTDevice['status']): IoTDevice[] {
    const devices = Array.from(this._devices.values()).filter(d => d.status === status);
    this._recordHistory(`getDevicesByStatus(status=${status}) -> ${devices.lengthimport { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0',
    };

    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.onlineCount++;
    this._registry.updatedAt = Date.now();

    this._shadows.set(id, {
      deviceId: id,
      desired: {},
      reported: {},
      delta: {},
      version: 1,
      timestamp: Date.now(),
    });

    this._recordHistory(`registerDevice(id=${id}, type=${type}, capabilities=${capabilities.length})`);
    return { device, registered: true, id };
  }

  public bulkRegister(devices: { id: string; type: string; capabilities: string[] }[]): { registered: number; skipped: number; devices: IoTDevice[] } {
    const registeredDevices: IoTDevice[] = [];
    let registered = 0;
    let skipped = 0;

    for (const device of devices) {
      const result = this.registerDevice(device.id, device.type, device.capabilities);
      if (result.registered) {
        registered++;
        registeredDevices.push(result.device);
      } else {
        skipped++;
      }
    }

    this._recordHistory(`bulkRegister(devices=${devices.length}) -> registered=${registered}, skipped=${skipped}`);
    return { registered, skipped, devices: registeredDevices };
  }

  public unregisterDevice(id: string): { id: string; unregistered: boolean; removed: boolean } {
    const removed = this._devices.has(id);
    if (removed) {
      const device = this._devices.get(id)!;
      this._devices.delete(id);
      this._registry.devices.delete(id);
      this._registry.count--;
      if (device.status === 'online') this._registry.onlineCount--;
      else this._registry.offlineCount--;
      this._registry.updatedAt = Date.now();
      this._shadows.delete(id);
      this._firmwareUpdates.delete(id);
      this._configs.delete(id);
    }
    this._recordHistory(`unregisterDevice(id=${id}) -> ${removed}`);
    return { id, unregistered: removed, removed };
  }

  public updateDeviceStatus(id: string, status: IoTDevice['status'], properties?: Record<string, unknown>): { id: string; status: string; updated: boolean; properties: Record<string, unknown> } {
    const device = this._devices.get(id);
    const updated = !!device;
    if (device) {
      const oldStatus = device.status;
      const updatedDevice: IoTDevice = { ...device, status, lastSeen: Date.now(), metadata: { ...device.metadata, ...properties } };
      this._devices.set(id, updatedDevice);
      this._registry.devices.set(id, updatedDevice);
      this._registry.updatedAt = Date.now();

      if (oldStatus === 'online' && status !== 'online') this._registry.onlineCount--;
      if (oldStatus !== 'online' && status === 'online') this._registry.onlineCount++;
      if (oldStatus === 'offline' && status !== 'offline') this._registry.offlineCount--;
      if (oldStatus !== 'offline' && status === 'offline') this._registry.offlineCount++;

      this._recordEvent(id, 'status_change', { oldStatus, newStatus: status, properties }, status === 'error' ? 'critical' : 'low');
    }
    this._recordHistory(`updateDeviceStatus(id=${id}, status=${status})`);
    return { id, status, updated, properties: properties || {} };
  }

  public deviceList(filter?: string, pagination?: { page: number; pageSize: number }): { devices: IoTDevice[]; total: number; page: number; pageSize: number } {
    const all = Array.from(this._devices.values());
    const filtered = filter ? all.filter(d => d.type.includes(filter) || d.id.includes(filter) || d.capabilities.includes(filter)) : all;
    
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 20;
    const start = (page - 1) * pageSize;
    const devices = filtered.slice(start, start + pageSize);

    this._recordHistory(`deviceList(filter=${filter ?? 'none'}, page=${page}) -> ${devices.length} results`);
    return { devices, total: filtered.length, page, pageSize };
  }

  public deviceSearch(query: string, criteria?: { type?: string; status?: string; tags?: string[]; capabilities?: string[] }): { results: IoTDevice[]; query: string; count: number } {
    let results = Array.from(this._devices.values());

    if (criteria?.type) {
      results = results.filter(d => d.type === criteria.type);
    }
    if (criteria?.status) {
      results = results.filter(d => d.status === criteria.status);
    }
    if (criteria?.capabilities) {
      results = results.filter(d => criteria.capabilities!.some(c => d.capabilities.includes(c)));
    }

    const lowerQuery = query.toLowerCase();
    results = results.filter(d =>
      d.id.toLowerCase().includes(lowerQuery) ||
      d.type.toLowerCase().includes(lowerQuery) ||
      JSON.stringify(d.metadata).toLowerCase().includes(lowerQuery)
    );

    this._recordHistory(`deviceSearch(query=${query}, criteria=${JSON.stringify(criteria)}) -> ${results.length} results`);
    return { results, query, count: results.length };
  }

  public getDevice(id: string): IoTDevice | null {
    const device = this._devices.get(id) || null;
    this._recordHistory(`getDevice(id=${id}) -> ${device ? 'found' : 'not found'}`);
    return device;
  }

  public getDevicesByType(type: string): IoTDevice[] {
    const devices = Array.from(this._devices.values()).filter(d => d.type === type);
    this._recordHistory(`getDevicesByType(type=${type}) -> ${devices.length} devices`);
    return devices;
  }

  public getDevicesByStatus(status: IoTDevice['status']): IoTDevice[] {
    const devices = Array.from(this._devices.values()).filter(d => d.status === status);
    this._recordHistory(`getDevicesByStatus(status=${status}) -> ${devices.length} devices`);
    return devices;
  }

  public deviceProvisioning(deviceimport { DataPacket } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'updating' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly metadata: Record<string, unknown>;
  readonly location?: { lat: number; lng: number };
  readonly firmwareVersion: string;
  readonly hardwareVersion: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
  readonly onlineCount: number;
  readonly offlineCount: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly devices: string[];
  readonly tags: string[];
  readonly createdAt: number;
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'connect' | 'disconnect' | 'status_change' | 'error' | 'update' | 'alert';
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly timestamp: number;
}

export interface FirmwareUpdateInfo {
  readonly id: string;
  readonly version: string;
  readonly deviceId: string;
  readonly status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  readonly progress: number;
  readonly error?: string;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface DeviceConfig {
  readonly deviceId: string;
  readonly settings: Record<string, unknown>;
  readonly version: number;
  readonly appliedAt: number;
  readonly active: boolean;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now(), onlineCount: 0, offlineCount: 0 };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _events: DeviceEvent[] = [];
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _firmwareUpdates: Map<string, FirmwareUpdateInfo> = new Map();
  private _configs: Map<string, DeviceConfig> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get deviceCount(): number { return this._devices.size; }
  get registryCount(): number { return this._registry.count; }
  get onlineCount(): number { return this._registry.onlineCount; }
  get offlineCount(): number { return this._registry.offlineCount; }
  get groupCount(): number { return this._groups.size; }
  get eventCount(): number { return this._events.length; }
  get history(): string[] { return [...this._history]; }

  public registerDevice(id: string, type: string, capabilities: string[], metadata?: Record<string, unknown>, location?: { lat: number; lng: number }): { device: IoTDevice; registered: boolean; id: string } {
    if (this._devices.has(id)) {
      this._recordHistory(`registerDevice(id=${id}) -> already exists`);
      return { device: this._devices.get(id)!, registered: false, id };
    }

    const device: IoTDevice = {
      id,
      type,
      status: 'online',
      capabilities,
      lastSeen: Date.now(),
      metadata: metadata || {},
      location,
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0',
    };

    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.onlineCount++;
    this._registry.updatedAt = Date.now();

    this._shadows.set(id, {
      deviceId: id,
      desired: {},
      reported: {},
      delta: {},
      version: 1,
      timestamp: Date.now(),
    });

    this._recordHistory(`registerDevice(id=${id}, type=${type}, capabilities=${capabilities.length})`);
    return { device, registered: true, id };
  }

  public bulkRegister(devices: { id: string; type: string; capabilities: string[] }[]): { registered: number; skipped: number; devices: IoTDevice[] } {
    const registeredDevices: IoTDevice[] = [];
    let registered = 0;
    let skipped = 0;

    for (const device of devices) {
      const result = this.registerDevice(device.id, device.type, device.capabilities);
      if (result.registered) {
        registered++;
        registeredDevices.push(result.device);
      } else {
        skipped++;
      }
    }

    this._recordHistory(`bulkRegister(devices=${devices.length}) -> registered=${registered}, skipped=${skipped}`);
    return { registered, skipped, devices: registeredDevices };
  }

  public unregisterDevice(id: string): { id: string; unregistered: boolean; removed: boolean } {
    const removed = this._devices.has(id);
    if (removed) {
      const device = this._devices.get(id)!;
      this._devices.delete(id);
      this._registry.devices.delete(id);
      this._registry.count--;
      if (device.status === 'online') this._registry.onlineCount--;
      else this._registry.offlineCount--;
      this._registry.updatedAt = Date.now();
      this._shadows.delete(id);
      this._firmwareUpdates.delete(id);
      this._configs.delete(id);
    }
    this._recordHistory(`unregisterDevice(id=${id}) -> ${removed}`);
    return { id, unregistered: removed, removed };
  }

  public updateDeviceStatus(id: string, status: IoTDevice['status'], properties?: Record<string, unknown>): { id: string; status: string; updated: boolean; properties: Record<string, unknown> } {
    const device = this._devices.get(id);
    const updated = !!device;
    if (device) {
      const oldStatus = device.status;
      const updatedDevice: IoTDevice = { ...device, status, lastSeen: Date.now(), metadata: { ...device.metadata, ...properties } };
      this._devices.set(id, updatedDevice);
      this._registry.devices.set(id, updatedDevice);
      this._registry.updatedAt = Date.now();

      if (oldStatus === 'online' && status !== 'online') this._registry.onlineCount--;
      if (oldStatus !== 'online' && status === 'online') this._registry.onlineCount++;
      if (oldStatus === 'offline' && status !== 'offline') this._registry.offlineCount--;
      if (oldStatus !== 'offline' && status === 'offline') this._registry.offlineCount++;

      this._recordEvent(id, 'status_change', { oldStatus, newStatus: status, properties }, status === 'error' ? 'critical' : 'low');
    }
    this._recordHistory(`updateDeviceStatus(id=${id}, status=${status})`);
    return { id, status, updated, properties: properties || {} };
  }

  public deviceList(filter?: string, pagination?: { page: number; pageSize: number }): { devices: IoTDevice[]; total: number; page: number; pageSize: number } {
    const all = Array.from(this._devices.values());
    const filtered = filter ? all.filter(d => d.type.includes(filter) || d.id.includes(filter) || d.capabilities.includes(filter)) : all;
    
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 20;
    const start = (page - 1) * pageSize;
    const devices = filtered.slice(start, start + pageSize);

    this._recordHistory(`deviceList(filter=${filter ?? 'none'}, page=${page}) -> ${devices.length} results`);
    return { devices, total: filtered.length, page, pageSize };
  }

  public deviceSearch(query: string, criteria?: { type?: string; status?: string; tags?: string[]; capabilities?: string[] }): { results: IoTDevice[]; query: string; count: number } {
    let results = Array.from(this._devices.values());

    if (criteria?.type) {
      results = results.filter(d => d.type === criteria.type);
    }
    if (criteria?.status) {
      results = results.filter(d => d.status === criteria.status);
    }
    if (criteria?.capabilities) {
      results = results.filter(d => criteria.capabilities!.some(c => d.capabilities.includes(c)));
    }

    const lowerQuery = query.toLowerCase();
    results = results.filter(d =>
      d.id.toLowerCase().includes(lowerQuery) ||
      d.type.toLowerCase().includes(lowerQuery) ||
      JSON.stringify(d.metadata).toLowerCase().includes(lowerQuery)
    );

    this._recordHistory(`deviceSearch(query=${query}, criteria=${JSON.stringify(criteria)}) -> ${results.length} results`);
    return { results, query, count: results.length };
  }

  public getDevice(id: string): IoTDevice | null {
    const device = this._devices.get(id) || null;
    this._recordHistory(`getDevice(id=${id}) -> ${device ? 'found' : 'not found'}`);
    return device;
  }

  public getDevicesByType(type: string): IoTDevice[] {
    const devices = Array.from(this._devices.values()).filter(d => d.type === type);
    this._recordHistory(`getDevicesByType(type=${type}) -> ${devices.length} devices`);
    return devices;
  }

  public getDevicesByStatus(status: IoTDevice['status']): IoTDevice[] {
    const devices = Array.from(this._devices.values()).filter(d => d.status === status);
    this._recordHistory(`getDevicesByStatus(status=${status}) -> ${devices.length} devices`);
    return devices;
  }

  public deviceProvisioning(deviceId: string, method: 'manual' |
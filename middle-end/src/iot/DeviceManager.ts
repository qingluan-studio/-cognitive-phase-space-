import { DataPacket, PacketMeta } from '../shared/types';

export interface IoTDevice {
  readonly id: string;
  readonly type: string;
  readonly status: 'online' | 'offline' | 'idle' | 'error' | 'maintenance' | 'provisioning';
  readonly capabilities: string[];
  readonly lastSeen: number;
  readonly manufacturer?: string;
  readonly model?: string;
  readonly firmwareVersion?: string;
  readonly hardwareRevision?: string;
  readonly serialNumber?: string;
  readonly location?: string;
  readonly tags?: string[];
  readonly protocol?: 'mqtt' | 'coap' | 'http' | 'modbus' | 'opcua' | 'ble' | 'zigbee' | 'lora' | 'nfc';
  readonly networkAddress?: string;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
  readonly owner?: string;
  readonly tenantId?: string;
  readonly provisionedAt?: number;
  readonly certificateFingerprint?: string;
}

export interface DeviceRegistry {
  readonly devices: Map<string, IoTDevice>;
  readonly count: number;
  readonly updatedAt: number;
}

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly deviceIds: string[];
  readonly tags: string[];
  readonly createdAt: number;
  readonly parentGroupId?: string;
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly desired: Record<string, unknown>;
  readonly reported: Record<string, unknown>;
  readonly delta: Record<string, unknown>;
  readonly version: number;
  readonly updatedAt: number;
  readonly metadata: Record<string, { timestamp: number }>;
}

export interface DeviceCommand {
  readonly id: string;
  readonly deviceId: string;
  readonly command: string;
  readonly parameters: Record<string, unknown>;
  readonly status: 'pending' | 'delivered' | 'executed' | 'failed' | 'timeout' | 'cancelled';
  readonly issuedAt: number;
  readonly deliveredAt?: number;
  readonly executedAt?: number;
  readonly response?: unknown;
  readonly ttl: number;
  readonly priority: 'low' | 'normal' | 'high' | 'critical';
}

export interface DeviceFirmware {
  readonly id: string;
  readonly deviceId: string;
  readonly version: string;
  readonly image: string;
  readonly checksum: string;
  readonly size: number;
  readonly status: 'pending' | 'downloading' | 'verifying' | 'installing' | 'rebooting' | 'completed' | 'failed' | 'rolled_back';
  readonly progress: number;
  readonly startedAt: number;
  readonly completedAt?: number;
  readonly failureReason?: string;
}

export interface DeviceHealth {
  readonly deviceId: string;
  readonly healthy: boolean;
  readonly cpu: number;
  readonly memory: number;
  readonly temperature: number;
  readonly batteryLevel?: number;
  readonly signalStrength?: number;
  readonly uptime: number;
  readonly lastReportedAt: number;
  readonly issues: string[];
}

export interface DeviceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly type: 'lifecycle' | 'state_change' | 'alert' | 'telemetry' | 'command' | 'connection' | 'firmware';
  readonly severity: 'info' | 'warning' | 'error' | 'critical';
  readonly message: string;
  readonly timestamp: number;
  readonly data?: unknown;
}

export interface ProvisioningProfile {
  readonly id: string;
  readonly name: string;
  readonly method: 'manual' | 'zero_touch' | 'bulk' | 'ble' | 'nfc' | 'qrcode';
  readonly template: Record<string, unknown>;
  readonly defaultCapabilities: string[];
  readonly requiredCert: boolean;
  readonly autoApprove: boolean;
}

export interface DeviceTwin {
  readonly deviceId: string;
  readonly properties: { desired: Record<string, unknown>; reported: Record<string, unknown> };
  readonly tags: Record<string, string>;
  readonly version: number;
  readonly lastSync: number;
  readonly syncStatus: 'synced' | 'pending' | 'conflict' | 'error';
}

export interface ConnectionStats {
  readonly deviceId: string;
  readonly connected: boolean;
  readonly protocol: string;
  readonly connectCount: number;
  readonly disconnectCount: number;
  readonly lastConnectAt: number;
  readonly lastDisconnectAt: number;
  readonly totalBytesRx: number;
  readonly totalBytesTx: number;
  readonly avgLatency: number;
}

export class DeviceManager {
  private _devices: Map<string, IoTDevice> = new Map();
  private _registry: DeviceRegistry = { devices: new Map(), count: 0, updatedAt: Date.now() };
  private _groups: Map<string, DeviceGroup> = new Map();
  private _shadows: Map<string, DeviceShadow> = new Map();
  private _commands: Map<string, DeviceCommand> = new Map();
  private _firmware: Map<string, DeviceFirmware> = new Map();
  private _health: Map<string, DeviceHealth> = new Map();
  private _events: DeviceEvent[] = [];
  private _provisioning: Map<string, ProvisioningProfile> = new Map();
  private _twins: Map<string, DeviceTwin> = new Map();
  private _connectionStats: Map<string, ConnectionStats> = new Map();
  private _history: string[] = [];
  private _counter = 0;
  private _eventCounter = 0;
  private _commandCounter = 0;
  private _firmwareCounter = 0;

  get deviceCount(): number {
    return this._devices.size;
  }

  get registryCount(): number {
    return this._registry.count;
  }

  get history(): string[] {
    return [...this._history];
  }

  get groupCount(): number {
    return this._groups.size;
  }

  get pendingCommands(): number {
    let count = 0;
    for (const cmd of this._commands.values()) {
      if (cmd.status === 'pending') count++;
    }
    return count;
  }

  get events(): DeviceEvent[] {
    return [...this._events];
  }

  get onlineDevices(): IoTDevice[] {
    return Array.from(this._devices.values()).filter(d => d.status === 'online');
  }

  get offlineDevices(): IoTDevice[] {
    return Array.from(this._devices.values()).filter(d => d.status === 'offline');
  }

  public registerDevice(id: string, type: string, capabilities: string[]): { device: IoTDevice; registered: boolean; id: string } {
    const device: IoTDevice = { id, type, status: 'online', capabilities, lastSeen: Date.now(), provisionedAt: Date.now() };
    this._devices.set(id, device);
    this._registry.devices.set(id, device);
    this._registry.count++;
    this._registry.updatedAt = Date.now();
    this._recordEvent(id, 'lifecycle', 'info', `Device ${id} registered (type=${type})`);
    this._recordHistory(`registerDevice(id=${id}, type=${type})`);
    return { device, registered: true, id };
  }

  public unregisterDevice(id: string): { id: string; unregistered: boolean; removed: boolean } {
    const removed = this._devices.has(id);
    this._devices.delete(id);
    this._registry.devices.delete(id);
    if (removed) this._registry.count--;
    this._registry.updatedAt = Date.now();
    this._shadows.delete(id);
    this._twins.delete(id);
    this._connectionStats.delete(id);
    for (const [gid, group] of this._groups.entries()) {
      if (group.deviceIds.includes(id)) {
        this._groups.set(gid, { ...group, deviceIds: group.deviceIds.filter(d => d !== id) });
      }
    }
    this._recordEvent(id, 'lifecycle', 'info', `Device ${id} unregistered`);
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
      this._registry.updatedAt = Date.now();
      this._recordEvent(id, 'state_change', 'info', `Device ${id} status -> ${status}`);
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
    this._recordEvent(device, 'lifecycle', 'info', `Provisioning device ${device} via ${method}`);
    this._recordHistory(`deviceProvisioning(device=${device}, method=${method})`);
    return { device, method, provisioned: true, status: 'provisioned' };
  }

  public zeroTouchProvision(devices: string[], server: string): { devices: number; server: string; provisioned: number; failed: number } {
    const provisioned = Math.floor(devices.length * 0.95);
    const failed = devices.length - provisioned;
    devices.forEach(d => this._recordEvent(d, 'lifecycle', 'info', `Zero-touch provisioning via ${server}`));
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
    const shadow: DeviceShadow = {
      deviceId: device,
      desired,
      reported,
      delta,
      version: (this._shadows.get(device)?.version ?? 0) + 1,
      updatedAt: Date.now(),
      metadata: {},
    };
    this._shadows.set(device, shadow);
    this._recordEvent(device, 'state_change', 'info', `Shadow updated: ${Object.keys(delta).length} delta fields`);
    this._recordHistory(`deviceShadow(device=${device}) -> delta=${Object.keys(delta).length} changes`);
    return { device, desired, reported, delta };
  }

  public getDeviceShadow(deviceId: string): DeviceShadow | undefined {
    return this._shadows.get(deviceId);
  }

  public updateDesiredState(deviceId: string, desired: Record<string, unknown>): DeviceShadow | null {
    const shadow = this._shadows.get(deviceId);
    if (!shadow) return null;
    const newDesired = { ...shadow.desired, ...desired };
    const delta: Record<string, unknown> = {};
    for (const key of Object.keys(newDesired)) {
      if (newDesired[key] !== shadow.reported[key]) delta[key] = newDesired[key];
    }
    const updated: DeviceShadow = { ...shadow, desired: newDesired, delta, version: shadow.version + 1, updatedAt: Date.now() };
    this._shadows.set(deviceId, updated);
    this._recordHistory(`updateDesiredState(device=${deviceId})`);
    return updated;
  }

  public updateReportedState(deviceId: string, reported: Record<string, unknown>): DeviceShadow | null {
    const shadow = this._shadows.get(deviceId);
    if (!shadow) return null;
    const newReported = { ...shadow.reported, ...reported };
    const delta: Record<string, unknown> = {};
    for (const key of Object.keys(shadow.desired)) {
      if (shadow.desired[key] !== newReported[key]) delta[key] = shadow.desired[key];
    }
    const updated: DeviceShadow = { ...shadow, reported: newReported, delta, version: shadow.version + 1, updatedAt: Date.now() };
    this._shadows.set(deviceId, updated);
    this._recordEvent(deviceId, 'state_change', 'info', `Reported state updated`);
    return updated;
  }

  public deviceConfiguration(id: string, config: Record<string, unknown>): { id: string; config: Record<string, unknown>; applied: boolean; version: number } {
    this._recordHistory(`deviceConfiguration(id=${id}) -> applied`);
    return { id, config, applied: true, version: this._counter };
  }

  public firmwareUpdate(id: string, firmware: string): { id: string; firmware: string; status: string; progress: number } {
    const progress = Math.floor(Math.random() * 100);
    const status = progress === 100 ? 'completed' : progress > 0 ? 'in-progress' : 'pending';
    this._recordEvent(id, 'firmware', 'info', `Firmware update ${firmware}: ${status} (${progress}%)`);
    this._recordHistory(`firmwareUpdate(id=${id}, firmware=${firmware}) -> ${status} (${progress}%)`);
    return { id, firmware, status, progress };
  }

  public otaUpdate(device: string, image: string, method: string): { device: string; image: string; method: string; status: string } {
    const fwId = `fw-${this._firmwareCounter++}`;
    this._firmware.set(fwId, {
      id: fwId,
      deviceId: device,
      version: image,
      image,
      checksum: 'sha256:' + Math.random().toString(36).substring(2),
      size: 1024 * 1024 * 4,
      status: 'downloading',
      progress: 0,
      startedAt: Date.now(),
    });
    this._recordEvent(device, 'firmware', 'info', `OTA update ${image} initiated via ${method}`);
    this._recordHistory(`otaUpdate(device=${device}, image=${image}, method=${method})`);
    return { device, image, method, status: 'downloading' };
  }

  public getFirmwareStatus(deviceId: string): DeviceFirmware | undefined {
    for (const fw of this._firmware.values()) {
      if (fw.deviceId === deviceId) return fw;
    }
    return undefined;
  }

  public updateFirmwareProgress(fwId: string, progress: number): DeviceFirmware | null {
    const fw = this._firmware.get(fwId);
    if (!fw) return null;
    const status: DeviceFirmware['status'] = progress >= 100 ? 'completed' : progress > 0 ? 'installing' : 'downloading';
    const updated: DeviceFirmware = { ...fw, progress, status, completedAt: progress >= 100 ? Date.now() : undefined };
    this._firmware.set(fwId, updated);
    return updated;
  }

  public rollbackFirmware(deviceId: string): { deviceId: string; rolledBack: boolean; previousVersion?: string } {
    this._recordEvent(deviceId, 'firmware', 'warning', `Firmware rollback initiated`);
    this._recordHistory(`rollbackFirmware(device=${deviceId})`);
    return { deviceId, rolledBack: true, previousVersion: '1.0.0' };
  }

  public deviceHealth(id: string, metrics: { cpu: number; memory: number; temperature: number }): { id: string; healthy: boolean; metrics: { cpu: number; memory: number; temperature: number } } {
    const healthy = metrics.cpu < 90 && metrics.memory < 90 && metrics.temperature < 80;
    const issues: string[] = [];
    if (metrics.cpu >= 90) issues.push('high cpu');
    if (metrics.memory >= 90) issues.push('high memory');
    if (metrics.temperature >= 80) issues.push('high temperature');
    this._health.set(id, {
      deviceId: id,
      healthy,
      cpu: metrics.cpu,
      memory: metrics.memory,
      temperature: metrics.temperature,
      uptime: 0,
      lastReportedAt: Date.now(),
      issues,
    });
    if (!healthy) {
      this._recordEvent(id, 'alert', 'warning', `Device ${id} unhealthy: ${issues.join(', ')}`);
    }
    this._recordHistory(`deviceHealth(id=${id}) -> healthy=${healthy}`);
    return { id, healthy, metrics };
  }

  public getDeviceHealth(deviceId: string): DeviceHealth | undefined {
    return this._health.get(deviceId);
  }

  public listUnhealthyDevices(): DeviceHealth[] {
    return Array.from(this._health.values()).filter(h => !h.healthy);
  }

  public deviceHeartbeat(device: string, interval: number): { device: string; interval: number; online: boolean; lastBeat: number } {
    const online = Math.random() > 0.1;
    const lastBeat = Date.now();
    const dev = this._devices.get(device);
    if (dev) {
      this._devices.set(device, { ...dev, lastSeen: lastBeat, status: online ? 'online' : 'offline' });
    }
    this._recordEvent(device, 'connection', 'info', `Heartbeat received (interval=${interval}s)`);
    this._recordHistory(`deviceHeartbeat(device=${device}, interval=${interval}s) -> online=${online}`);
    return { device, interval, online, lastBeat };
  }

  public deviceTwin(device: string, state: Record<string, unknown>): { device: string; state: Record<string, unknown>; version: number; synced: boolean } {
    const existing = this._twins.get(device);
    const version = (existing?.version ?? 0) + 1;
    const twin: DeviceTwin = {
      deviceId: device,
      properties: { desired: state, reported: existing?.properties.reported ?? {} },
      tags: existing?.tags ?? {},
      version,
      lastSync: Date.now(),
      syncStatus: Math.random() > 0.05 ? 'synced' : 'pending',
    };
    this._twins.set(device, twin);
    this._recordHistory(`deviceTwin(device=${device}, version=${version})`);
    return { device, state, version, synced: twin.syncStatus === 'synced' };
  }

  public getDeviceTwin(deviceId: string): DeviceTwin | undefined {
    return this._twins.get(deviceId);
  }

  public updateTwinTags(deviceId: string, tags: Record<string, string>): DeviceTwin | null {
    const twin = this._twins.get(deviceId);
    if (!twin) return null;
    const updated: DeviceTwin = { ...twin, tags: { ...twin.tags, ...tags }, lastSync: Date.now() };
    this._twins.set(deviceId, updated);
    return updated;
  }

  public issueCommand(deviceId: string, command: string, parameters: Record<string, unknown> = {}, priority: DeviceCommand['priority'] = 'normal', ttl: number = 60): DeviceCommand {
    const id = `cmd-${this._commandCounter++}`;
    const cmd: DeviceCommand = {
      id,
      deviceId,
      command,
      parameters,
      status: 'pending',
      issuedAt: Date.now(),
      ttl,
      priority,
    };
    this._commands.set(id, cmd);
    this._recordEvent(deviceId, 'command', 'info', `Command issued: ${command} (priority=${priority})`);
    this._recordHistory(`issueCommand(device=${deviceId}, command=${command}, id=${id})`);
    return cmd;
  }

  public deliverCommand(commandId: string): boolean {
    const cmd = this._commands.get(commandId);
    if (!cmd || cmd.status !== 'pending') return false;
    this._commands.set(commandId, { ...cmd, status: 'delivered', deliveredAt: Date.now() });
    this._recordHistory(`deliverCommand(id=${commandId})`);
    return true;
  }

  public completeCommand(commandId: string, response: unknown): boolean {
    const cmd = this._commands.get(commandId);
    if (!cmd) return false;
    this._commands.set(commandId, { ...cmd, status: 'executed', executedAt: Date.now(), response });
    this._recordHistory(`completeCommand(id=${commandId})`);
    return true;
  }

  public failCommand(commandId: string, reason: string): boolean {
    const cmd = this._commands.get(commandId);
    if (!cmd) return false;
    this._commands.set(commandId, { ...cmd, status: 'failed', response: { error: reason } });
    this._recordHistory(`failCommand(id=${commandId}): ${reason}`);
    return true;
  }

  public cancelCommand(commandId: string): boolean {
    const cmd = this._commands.get(commandId);
    if (!cmd || cmd.status === 'executed' || cmd.status === 'failed') return false;
    this._commands.set(commandId, { ...cmd, status: 'cancelled' });
    return true;
  }

  public listCommands(deviceId?: string, status?: DeviceCommand['status']): DeviceCommand[] {
    let cmds = Array.from(this._commands.values());
    if (deviceId) cmds = cmds.filter(c => c.deviceId === deviceId);
    if (status) cmds = cmds.filter(c => c.status === status);
    return cmds.sort((a, b) => b.issuedAt - a.issuedAt);
  }

  public expireStaleCommands(): number {
    const now = Date.now();
    let expired = 0;
    for (const [id, cmd] of this._commands.entries()) {
      if (cmd.status === 'pending' && now - cmd.issuedAt > cmd.ttl * 1000) {
        this._commands.set(id, { ...cmd, status: 'timeout' });
        expired++;
      }
    }
    if (expired > 0) this._recordHistory(`expireStaleCommands() -> ${expired} expired`);
    return expired;
  }

  public createGroup(name: string, description: string, deviceIds: string[] = [], tags: string[] = [], parentGroupId?: string): DeviceGroup {
    const id = `grp-${this._counter++}`;
    const group: DeviceGroup = { id, name, description, deviceIds, tags, createdAt: Date.now(), parentGroupId };
    this._groups.set(id, group);
    this._recordHistory(`createGroup(id=${id}, name=${name}, devices=${deviceIds.length})`);
    return group;
  }

  public deleteGroup(groupId: string): boolean {
    const removed = this._groups.delete(groupId);
    if (removed) this._recordHistory(`deleteGroup(id=${groupId})`);
    return removed;
  }

  public addDeviceToGroup(groupId: string, deviceId: string): boolean {
    const group = this._groups.get(groupId);
    if (!group) return false;
    if (group.deviceIds.includes(deviceId)) return false;
    this._groups.set(groupId, { ...group, deviceIds: [...group.deviceIds, deviceId] });
    this._recordHistory(`addDeviceToGroup(group=${groupId}, device=${deviceId})`);
    return true;
  }

  public removeDeviceFromGroup(groupId: string, deviceId: string): boolean {
    const group = this._groups.get(groupId);
    if (!group) return false;
    this._groups.set(groupId, { ...group, deviceIds: group.deviceIds.filter(d => d !== deviceId) });
    return true;
  }

  public listGroups(): DeviceGroup[] {
    return Array.from(this._groups.values());
  }

  public getDevicesByGroup(groupId: string): IoTDevice[] {
    const group = this._groups.get(groupId);
    if (!group) return [];
    return group.deviceIds.map(id => this._devices.get(id)).filter((d): d is IoTDevice => !!d);
  }

  public getDevicesByStatus(status: IoTDevice['status']): IoTDevice[] {
    const devices = Array.from(this._devices.values()).filter(d => d.status === status);
    this._recordHistory(`getDevicesByStatus(status=${status}) -> ${devices.length} devices`);
    return devices;
  }

  public getDevicesByType(type: string): IoTDevice[] {
    return Array.from(this._devices.values()).filter(d => d.type === type);
  }

  public getDevicesByCapability(capability: string): IoTDevice[] {
    return Array.from(this._devices.values()).filter(d => d.capabilities.includes(capability));
  }

  public getDevicesByTag(tag: string): IoTDevice[] {
    return Array.from(this._devices.values()).filter(d => d.tags?.includes(tag));
  }

  public getDevicesByProtocol(protocol: IoTDevice['protocol']): IoTDevice[] {
    return Array.from(this._devices.values()).filter(d => d.protocol === protocol);
  }

  public getDevicesByTenant(tenantId: string): IoTDevice[] {
    return Array.from(this._devices.values()).filter(d => d.tenantId === tenantId);
  }

  public createProvisioningProfile(name: string, method: ProvisioningProfile['method'], options: { template?: Record<string, unknown>; defaultCapabilities?: string[]; requiredCert?: boolean; autoApprove?: boolean } = {}): ProvisioningProfile {
    const id = `prov-${this._counter++}`;
    const profile: ProvisioningProfile = {
      id,
      name,
      method,
      template: options.template ?? {},
      defaultCapabilities: options.defaultCapabilities ?? [],
      requiredCert: options.requiredCert ?? false,
      autoApprove: options.autoApprove ?? true,
    };
    this._provisioning.set(id, profile);
    this._recordHistory(`createProvisioningProfile(id=${id}, name=${name}, method=${method})`);
    return profile;
  }

  public listProvisioningProfiles(): ProvisioningProfile[] {
    return Array.from(this._provisioning.values());
  }

  public bulkProvision(devices: Array<{ id: string; type: string }>, profileId: string): { provisioned: number; failed: number; profile: string } {
    const profile = this._provisioning.get(profileId);
    let provisioned = 0;
    let failed = 0;
    devices.forEach(d => {
      if (profile) {
        this.registerDevice(d.id, d.type, profile.defaultCapabilities);
        provisioned++;
      } else {
        failed++;
      }
    });
    this._recordHistory(`bulkProvision(devices=${devices.length}, profile=${profileId}) -> ${provisioned}/${failed}`);
    return { provisioned, failed, profile: profileId };
  }

  public recordConnection(deviceId: string, protocol: string, bytesRx: number, bytesTx: number, latency: number): ConnectionStats {
    const existing = this._connectionStats.get(deviceId);
    const stats: ConnectionStats = {
      deviceId,
      connected: true,
      protocol,
      connectCount: (existing?.connectCount ?? 0) + 1,
      disconnectCount: existing?.disconnectCount ?? 0,
      lastConnectAt: Date.now(),
      lastDisconnectAt: existing?.lastDisconnectAt ?? 0,
      totalBytesRx: (existing?.totalBytesRx ?? 0) + bytesRx,
      totalBytesTx: (existing?.totalBytesTx ?? 0) + bytesTx,
      avgLatency: existing ? (existing.avgLatency + latency) / 2 : latency,
    };
    this._connectionStats.set(deviceId, stats);
    return stats;
  }

  public recordDisconnection(deviceId: string): ConnectionStats | null {
    const existing = this._connectionStats.get(deviceId);
    if (!existing) return null;
    const updated: ConnectionStats = {
      ...existing,
      connected: false,
      disconnectCount: existing.disconnectCount + 1,
      lastDisconnectAt: Date.now(),
    };
    this._connectionStats.set(deviceId, updated);
    this._recordEvent(deviceId, 'connection', 'warning', `Device disconnected`);
    return updated;
  }

  public getConnectionStats(deviceId: string): ConnectionStats | undefined {
    return this._connectionStats.get(deviceId);
  }

  public listDeviceEvents(deviceId: string, limit: number = 50): DeviceEvent[] {
    return this._events.filter(e => e.deviceId === deviceId).slice(-limit);
  }

  public listEventsBySeverity(severity: DeviceEvent['severity']): DeviceEvent[] {
    return this._events.filter(e => e.severity === severity);
  }

  public clearEvents(): number {
    const count = this._events.length;
    this._events = [];
    return count;
  }

  public markDeviceMaintenance(deviceId: string, reason: string): boolean {
    return this.updateDeviceStatus(deviceId, 'maintenance', { reason }).updated;
  }

  public setDeviceTags(deviceId: string, tags: string[]): boolean {
    const device = this._devices.get(deviceId);
    if (!device) return false;
    this._devices.set(deviceId, { ...device, tags });
    return true;
  }

  public findDevicesByLocation(locationPattern: string): IoTDevice[] {
    return Array.from(this._devices.values()).filter(d => d.location?.includes(locationPattern));
  }

  public batchUpdateStatus(deviceIds: string[], status: IoTDevice['status']): { updated: number; failed: number } {
    let updated = 0;
    let failed = 0;
    deviceIds.forEach(id => {
      const result = this.updateDeviceStatus(id, status, {});
      if (result.updated) updated++;
      else failed++;
    });
    this._recordHistory(`batchUpdateStatus(devices=${deviceIds.length}, status=${status}) -> ${updated}/${failed}`);
    return { updated, failed };
  }

  public batchIssueCommand(deviceIds: string[], command: string, parameters: Record<string, unknown> = {}): DeviceCommand[] {
    const cmds: DeviceCommand[] = [];
    deviceIds.forEach(id => {
      cmds.push(this.issueCommand(id, command, parameters));
    });
    this._recordHistory(`batchIssueCommand(devices=${deviceIds.length}, command=${command})`);
    return cmds;
  }

  public batchRegister(devices: Array<{ id: string; type: string; capabilities: string[] }>): { registered: number; failed: number } {
    let registered = 0;
    let failed = 0;
    devices.forEach(d => {
      if (this._devices.has(d.id)) {
        failed++;
      } else {
        this.registerDevice(d.id, d.type, d.capabilities);
        registered++;
      }
    });
    this._recordHistory(`batchRegister(devices=${devices.length}) -> ${registered}/${failed}`);
    return { registered, failed };
  }

  public snapshotRegistry(): { devices: IoTDevice[]; groups: DeviceGroup[]; totalCommands: number; totalFirmware: number; totalShadows: number } {
    return {
      devices: Array.from(this._devices.values()),
      groups: Array.from(this._groups.values()),
      totalCommands: this._commands.size,
      totalFirmware: this._firmware.size,
      totalShadows: this._shadows.size,
    };
  }

  public exportDeviceList(format: 'json' | 'csv'): string {
    const devices = Array.from(this._devices.values());
    if (format === 'csv') {
      const header = 'id,type,status,capabilities,lastSeen,protocol';
      const rows = devices.map(d => `${d.id},${d.type},${d.status},"${d.capabilities.join(';')}",${d.lastSeen},${d.protocol ?? ''}`);
      return [header, ...rows].join('\n');
    }
    return JSON.stringify(devices, null, 2);
  }

  public cleanupStaleData(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): { eventsRemoved: number; commandsRemoved: number; firmwareRemoved: number } {
    const now = Date.now();
    const beforeEvents = this._events.length;
    this._events = this._events.filter(e => now - e.timestamp < maxAgeMs);
    const eventsRemoved = beforeEvents - this._events.length;
    let commandsRemoved = 0;
    for (const [id, cmd] of this._commands.entries()) {
      if (now - cmd.issuedAt > maxAgeMs && (cmd.status === 'executed' || cmd.status === 'failed' || cmd.status === 'cancelled' || cmd.status === 'timeout')) {
        this._commands.delete(id);
        commandsRemoved++;
      }
    }
    let firmwareRemoved = 0;
    for (const [id, fw] of this._firmware.entries()) {
      if (fw.completedAt && now - fw.completedAt > maxAgeMs) {
        this._firmware.delete(id);
        firmwareRemoved++;
      }
    }
    this._recordHistory(`cleanupStaleData() -> events=${eventsRemoved}, commands=${commandsRemoved}, firmware=${firmwareRemoved}`);
    return { eventsRemoved, commandsRemoved, firmwareRemoved };
  }

  public getDeviceById(deviceId: string): IoTDevice | undefined {
    return this._devices.get(deviceId);
  }

  public countDevicesByStatus(): Record<IoTDevice['status'], number> {
    const counts: Record<string, number> = {};
    for (const d of this._devices.values()) {
      counts[d.status] = (counts[d.status] ?? 0) + 1;
    }
    return counts as Record<IoTDevice['status'], number>;
  }

  public deviceStatistics(): {
    total: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    byProtocol: Record<string, number>;
    healthyCount: number;
    unhealthyCount: number;
    pendingCommands: number;
    activeFirmwareUpdates: number;
  } {
    const byStatus: Record<string, number> = {};
    const byType: Record<string, number> = {};
    const byProtocol: Record<string, number> = {};
    for (const d of this._devices.values()) {
      byStatus[d.status] = (byStatus[d.status] ?? 0) + 1;
      byType[d.type] = (byType[d.type] ?? 0) + 1;
      if (d.protocol) byProtocol[d.protocol] = (byProtocol[d.protocol] ?? 0) + 1;
    }
    const healthy = Array.from(this._health.values()).filter(h => h.healthy).length;
    const unhealthy = Array.from(this._health.values()).filter(h => !h.healthy).length;
    const activeFw = Array.from(this._firmware.values()).filter(f => f.status !== 'completed' && f.status !== 'failed').length;
    return {
      total: this._devices.size,
      byStatus,
      byType,
      byProtocol,
      healthyCount: healthy,
      unhealthyCount: unhealthy,
      pendingCommands: this.pendingCommands,
      activeFirmwareUpdates: activeFw,
    };
  }

  public toPacket(): DataPacket<{
    devices: number;
    registryCount: number;
    history: string[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['iot', 'device_manager', 'result'],
      priority: 0.75,
      phase: 'management',
    };
    return {
      id: `device-mgr-${Date.now()}-${this._counter}`,
      payload: {
        devices: this._devices.size,
        registryCount: this._registry.count,
        history: [...this._history],
      },
      metadata,
    };
  }

  public reset(): void {
    this._devices.clear();
    this._registry = { devices: new Map(), count: 0, updatedAt: Date.now() };
    this._groups.clear();
    this._shadows.clear();
    this._commands.clear();
    this._firmware.clear();
    this._health.clear();
    this._events = [];
    this._provisioning.clear();
    this._twins.clear();
    this._connectionStats.clear();
    this._history = [];
    this._counter = 0;
    this._eventCounter = 0;
    this._commandCounter = 0;
    this._firmwareCounter = 0;
  }

  private _recordHistory(entry: string): void {
    this._counter++;
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }

  private _recordEvent(deviceId: string, type: DeviceEvent['type'], severity: DeviceEvent['severity'], message: string, data?: unknown): void {
    const event: DeviceEvent = {
      id: `evt-${this._eventCounter++}`,
      deviceId,
      type,
      severity,
      message,
      timestamp: Date.now(),
      data,
    };
    this._events.push(event);
    if (this._events.length > 500) this._events.shift();
  }
}

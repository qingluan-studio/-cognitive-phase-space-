import { DataPacket, PacketMeta } from '../shared/types';

export interface SDNControllerInfo {
  readonly name: string;
  readonly switches: number;
  readonly applications: number;
  readonly topology: string;
}

export interface OpenFlowSwitch {
  readonly id: string;
  readonly dpId: string;
  readonly flows: number;
  readonly ports: number;
  readonly status: 'connected' | 'disconnected' | 'degraded' | 'maintenance';
  readonly manufacturer?: string;
  readonly hardwareVersion?: string;
  readonly softwareVersion?: string;
  readonly serialNumber?: string;
  readonly datapathType?: string;
  readonly buffers?: number;
  readonly capabilities?: string[];
  readonly actions?: string[];
  readonly lastConnectedAt?: number;
}

export interface OpenFlowPort {
  readonly portNo: number;
  readonly switchId: string;
  readonly name: string;
  readonly speed: number;
  readonly status: 'up' | 'down' | 'blocked';
  readonly mac: string;
  readonly rxBytes: number;
  readonly txBytes: number;
  readonly rxPackets: number;
  readonly txPackets: number;
  readonly rxErrors: number;
  readonly txErrors: number;
  readonly lastChangedAt: number;
}

export interface FlowEntry {
  readonly id: string;
  readonly switchId: string;
  readonly priority: number;
  readonly match: FlowMatch;
  readonly actions: FlowAction[];
  readonly idleTimeout: number;
  readonly hardTimeout: number;
  readonly cookie: number;
  readonly packetCount: number;
  readonly byteCount: number;
  readonly installedAt: number;
  readonly tableId: number;
}

export interface FlowMatch {
  inPort?: number;
  ethSrc?: string;
  ethDst?: string;
  ethType?: number;
  vlanId?: number;
  vlanPriority?: number;
  ipProto?: number;
  ipv4Src?: string;
  ipv4Dst?: string;
  ipv6Src?: string;
  ipv6Dst?: string;
  tcpSrc?: number;
  tcpDst?: number;
  udpSrc?: number;
  udpDst?: number;
  icmpType?: number;
  icmpCode?: number;
  arpOp?: number;
  arpSha?: string;
  arpTha?: string;
  arpSpa?: string;
  arpTpa?: string;
  metadata?: number;
  tunnelId?: number;
}

export interface FlowAction {
  type: 'output' | 'drop' | 'set_field' | 'push_vlan' | 'pop_vlan' | 'group' | 'meter' | 'copy_ttl_in' | 'copy_ttl_out' | 'dec_ttl' | 'set_queue' | 'push_mpls' | 'pop_mpls';
  field?: string;
  value?: string | number;
  port?: number;
  groupId?: number;
  meterId?: number;
  queueId?: number;
}

export interface GroupEntry {
  readonly id: string;
  readonly switchId: string;
  readonly groupId: number;
  readonly type: 'all' | 'select' | 'indirect' | 'fast_failover';
  readonly buckets: GroupBucket[];
  readonly counters: { packets: number; bytes: number };
}

export interface GroupBucket {
  readonly weight: number;
  readonly watchPort: number;
  readonly watchGroup: number;
  readonly actions: FlowAction[];
}

export interface MeterEntry {
  readonly id: string;
  readonly switchId: string;
  readonly meterId: number;
  readonly flags: string[];
  readonly bands: MeterBand[];
  readonly counters: { flowCount: number; packetsIn: number; bytesIn: number };
}

export interface MeterBand {
  readonly type: 'drop' | 'dscp_remark' | 'experimenter';
  readonly rate: number;
  readonly burstSize: number;
  readonly precedence?: number;
  readonly dscpRemark?: number;
}

export interface TopologyLink {
  readonly id: string;
  readonly srcSwitch: string;
  readonly srcPort: number;
  readonly dstSwitch: string;
  readonly dstPort: number;
  readonly bandwidth: number;
  readonly latency: number;
  readonly utilization: number;
  readonly status: 'up' | 'down';
  readonly discoveredAt: number;
}

export interface NetworkSlice {
  readonly id: string;
  readonly name: string;
  readonly tenantId: string;
  readonly switches: string[];
  readonly links: string[];
  readonly bandwidth: number;
  readonly isolation: 'soft' | 'hard';
  readonly sla: { latency: number; throughput: number; availability: number };
}

export interface QoSPolicy {
  readonly id: string;
  readonly name: string;
  readonly classes: QoSClass[];
  readonly defaultClass: string;
  readonly remarking: boolean;
}

export interface QoSClass {
  readonly name: string;
  readonly priority: number;
  readonly minRate: number;
  readonly maxRate: number;
  readonly dscp: number;
  readonly queueType: 'priority' | 'fair' | 'weighted' | 'round_robin';
}

export interface ControllerApplication {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly type: 'routing' | 'security' | 'monitoring' | 'qos' | 'load_balancing' | 'firewall' | 'custom';
  readonly status: 'running' | 'stopped' | 'error' | 'paused';
  readonly loadedAt: number;
  readonly eventsHandled: number;
  readonly description: string;
}

export interface SwitchEvent {
  readonly id: string;
  readonly switchId: string;
  readonly type: 'packet_in' | 'packet_out' | 'flow_removed' | 'port_status' | 'error' | 'role_change' | 'switch_connected' | 'switch_disconnected';
  readonly severity: 'info' | 'warning' | 'error' | 'critical';
  readonly message: string;
  readonly timestamp: number;
  readonly data?: unknown;
}

export interface ControllerRole {
  readonly role: 'master' | 'slave' | 'equal';
  readonly generationId: number;
  readonly switches: string[];
  readonly assumedAt: number;
}

export interface LoadBalancerPool {
  readonly id: string;
  readonly name: string;
  readonly servers: string[];
  readonly algorithm: 'round_robin' | 'least_connections' | 'weighted' | 'ip_hash' | 'least_response_time';
  readonly healthCheck: { interval: number; timeout: number; retries: number; path?: string };
  readonly members: number;
  readonly vips: string[];
}

export interface FlowStatistics {
  readonly switchId: string;
  readonly tableId: number;
  readonly activeFlows: number;
  readonly packetsLookedUp: number;
  readonly packetsMatched: number;
  readonly flowEntries: { id: string; packets: number; bytes: number; duration: number }[];
}

export class SDNController {
  private _controller: SDNControllerInfo | null = null;
  private _switches: Map<string, OpenFlowSwitch> = new Map();
  private _flows: Map<string, string[]> = new Map();
  private _flowEntries: Map<string, FlowEntry> = new Map();
  private _ports: Map<string, OpenFlowPort[]> = new Map();
  private _groups: Map<string, GroupEntry> = new Map();
  private _meters: Map<string, MeterEntry> = new Map();
  private _links: Map<string, TopologyLink> = new Map();
  private _slices: Map<string, NetworkSlice> = new Map();
  private _qosPolicies: Map<string, QoSPolicy> = new Map();
  private _applications: Map<string, ControllerApplication> = new Map();
  private _events: SwitchEvent[] = [];
  private _loadBalancers: Map<string, LoadBalancerPool> = new Map();
  private _role: ControllerRole = { role: 'master', generationId: 0, switches: [], assumedAt: Date.now() };
  private _history: string[] = [];
  private _counter = 0;
  private _eventCounter = 0;
  private _flowCounter = 0;
  private _linkCounter = 0;

  get switchCount(): number {
    return this._switches.size;
  }

  get flowCount(): number {
    let total = 0;
    for (const flows of this._flows.values()) {
      total += flows.length;
    }
    return total;
  }

  get history(): string[] {
    return [...this._history];
  }

  get events(): SwitchEvent[] {
    return [...this._events];
  }

  get applicationCount(): number {
    return this._applications.size;
  }

  get linkCount(): number {
    return this._links.size;
  }

  get sliceCount(): number {
    return this._slices.size;
  }

  get role(): ControllerRole {
    return this._role;
  }

  get controllerName(): string {
    return this._controller?.name ?? 'none';
  }

  public controllerSetup(controller: string, switches: string[]): { controller: string; switches: number; connected: boolean } {
    this._controller = { name: controller, switches: switches.length, applications: 5, topology: 'tree' };
    switches.forEach(sw => {
      this._switches.set(sw, { id: sw, dpId: `dpid-${sw}`, flows: 0, ports: 8, status: 'connected', lastConnectedAt: Date.now() });
      this._flows.set(sw, []);
      this._ports.set(sw, []);
      this._role.switches.push(sw);
    });
    this._recordHistory(`controllerSetup(${controller}, switches=${switches.length})`);
    return { controller, switches: switches.length, connected: true };
  }

  public openFlow(switchId: string, controller: string, version: string): { switch: string; controller: string; version: string; connected: boolean } {
    this._recordEvent(switchId, 'switch_connected', 'info', `OpenFlow ${version} handshake completed with ${controller}`);
    this._recordHistory(`OpenFlow ${version}: ${switchId} <-> ${controller}`);
    return { switch: switchId, controller, version, connected: true };
  }

  public flowTable(switchId: string, flows: string[]): { switch: string; flows: number; tableSize: number; utilized: number } {
    this._flows.set(switchId, flows);
    const sw = this._switches.get(switchId);
    if (sw) {
      this._switches.set(switchId, { ...sw, flows: flows.length });
    }
    this._recordHistory(`flowTable(${switchId}): ${flows.length} flows`);
    return { switch: switchId, flows: flows.length, tableSize: 4096, utilized: flows.length / 4096 };
  }

  public flowRuleAdd(switchId: string, rule: string, priority: number): { switch: string; rule: string; priority: number; added: boolean } {
    const flows = this._flows.get(switchId) ?? [];
    flows.push(rule);
    this._flows.set(switchId, flows);
    const sw = this._switches.get(switchId);
    if (sw) {
      this._switches.set(switchId, { ...sw, flows: sw.flows + 1 });
    }
    this._recordHistory(`flowRuleAdd(${switchId}, priority=${priority})`);
    return { switch: switchId, rule, priority, added: true };
  }

  public flowRuleModify(switchId: string, ruleId: string, actions: string[]): { switch: string; ruleId: string; actions: string[]; modified: boolean } {
    this._recordHistory(`flowRuleModify(${switchId}, ${ruleId})`);
    return { switch: switchId, ruleId, actions, modified: true };
  }

  public flowRuleRemove(switchId: string, ruleId: string): { switch: string; ruleId: string; removed: boolean } {
    const flows = this._flows.get(switchId) ?? [];
    const idx = flows.findIndex(f => f.includes(ruleId));
    if (idx >= 0) flows.splice(idx, 1);
    this._flows.set(switchId, flows);
    this._recordHistory(`flowRuleRemove(${switchId}, ${ruleId})`);
    return { switch: switchId, ruleId, removed: idx >= 0 };
  }

  public packetIn(switchId: string, packet: string): { switch: string; packet: string; forwarded: boolean; reason: string } {
    this._recordEvent(switchId, 'packet_in', 'info', `Packet-in received: ${packet.substring(0, 32)}`);
    this._recordHistory(`packetIn(${switchId}) -> controller`);
    return { switch: switchId, packet, forwarded: true, reason: 'no-match' };
  }

  public packetOut(switchId: string, port: number, packet: string): { switch: string; port: number; packet: string; sent: boolean } {
    this._recordHistory(`packetOut(${switchId}, port=${port})`);
    return { switch: switchId, port, packet, sent: true };
  }

  public topologyDiscovery(switches: string[], links: { from: string; to: string }[]): { switches: number; links: number; topology: string } {
    const topology = links.length > switches.length ? 'mesh' : 'tree';
    links.forEach(l => {
      const id = `link-${this._linkCounter++}`;
      this._links.set(id, {
        id,
        srcSwitch: l.from,
        srcPort: 1,
        dstSwitch: l.to,
        dstPort: 1,
        bandwidth: 10000,
        latency: 1,
        utilization: 0,
        status: 'up',
        discoveredAt: Date.now(),
      });
    });
    this._recordHistory(`topologyDiscovery: ${switches.length} switches, ${links.length} links`);
    return { switches: switches.length, links: links.length, topology };
  }

  public networkVirtualization(network: string, slices: number): { network: string; slices: number; isolated: boolean; overhead: number } {
    const overhead = 0.05;
    this._recordHistory(`networkVirtualization(${network}, slices=${slices})`);
    return { network, slices, isolated: true, overhead };
  }

  public trafficEngineering(flows: string[], demands: number[]): { flows: number; demands: number; optimized: boolean; utilization: number } {
    const utilization = 0.6 + Math.random() * 0.2;
    this._recordHistory(`trafficEngineering(flows=${flows.length}) -> utilization=${(utilization * 100).toFixed(1)}%`);
    return { flows: flows.length, demands: demands.length, optimized: true, utilization };
  }

  public loadBalancing(switches: string[], servers: string[]): { switches: number; servers: number; algorithm: string; balanced: boolean } {
    this._recordHistory(`loadBalancing(switches=${switches.length}, servers=${servers.length})`);
    return { switches: switches.length, servers: servers.length, algorithm: 'round-robin', balanced: true };
  }

  public accessControl(switches: string[], policies: string[]): { switches: number; policies: number; enforced: boolean; denied: number } {
    const denied = Math.floor(policies.length * 0.3);
    this._recordHistory(`accessControl(switches=${switches.length}, policies=${policies.length})`);
    return { switches: switches.length, policies: policies.length, enforced: true, denied };
  }

  public qualityOfService(flows: string[], classes: string[]): { flows: number; classes: number; queued: number; prioritized: boolean } {
    this._recordHistory(`qos(flows=${flows.length}, classes=${classes.length})`);
    return { flows: flows.length, classes: classes.length, queued: flows.length, prioritized: true };
  }

  public addSwitch(switchInfo: Omit<OpenFlowSwitch, 'status' | 'flows' | 'ports'> & { id: string }): OpenFlowSwitch {
    const sw: OpenFlowSwitch = {
      id: switchInfo.id,
      dpId: switchInfo.dpId,
      flows: 0,
      ports: 8,
      status: 'connected',
      manufacturer: switchInfo.manufacturer,
      hardwareVersion: switchInfo.hardwareVersion,
      softwareVersion: switchInfo.softwareVersion,
      serialNumber: switchInfo.serialNumber,
      lastConnectedAt: Date.now(),
    };
    this._switches.set(switchInfo.id, sw);
    this._flows.set(switchInfo.id, []);
    this._ports.set(switchInfo.id, []);
    this._recordEvent(switchInfo.id, 'switch_connected', 'info', `Switch ${switchInfo.id} (dpid=${switchInfo.dpId}) joined`);
    this._recordHistory(`addSwitch(id=${switchInfo.id}, dpid=${switchInfo.dpId})`);
    return sw;
  }

  public removeSwitch(switchId: string): boolean {
    const removed = this._switches.delete(switchId);
    if (removed) {
      this._flows.delete(switchId);
      this._ports.delete(switchId);
      this._recordEvent(switchId, 'switch_disconnected', 'warning', `Switch ${switchId} disconnected`);
      this._recordHistory(`removeSwitch(id=${switchId})`);
    }
    return removed;
  }

  public getSwitch(switchId: string): OpenFlowSwitch | undefined {
    return this._switches.get(switchId);
  }

  public listSwitches(): OpenFlowSwitch[] {
    return Array.from(this._switches.values());
  }

  public setSwitchStatus(switchId: string, status: OpenFlowSwitch['status']): boolean {
    const sw = this._switches.get(switchId);
    if (!sw) return false;
    this._switches.set(switchId, { ...sw, status, lastConnectedAt: status === 'connected' ? Date.now() : sw.lastConnectedAt });
    this._recordEvent(switchId, 'role_change', 'info', `Switch ${switchId} status changed to ${status}`);
    this._recordHistory(`setSwitchStatus(id=${switchId}, status=${status})`);
    return true;
  }

  public registerPort(switchId: string, port: Omit<OpenFlowPort, 'switchId' | 'lastChangedAt'>): OpenFlowPort | null {
    const fullPort: OpenFlowPort = { ...port, switchId, lastChangedAt: Date.now() };
    const ports = this._ports.get(switchId) ?? [];
    ports.push(fullPort);
    this._ports.set(switchId, ports);
    this._recordHistory(`registerPort(switch=${switchId}, port=${port.portNo})`);
    return fullPort;
  }

  public listPorts(switchId: string): OpenFlowPort[] {
    return this._ports.get(switchId) ?? [];
  }

  public updatePortStats(switchId: string, portNo: number, stats: Partial<Pick<OpenFlowPort, 'rxBytes' | 'txBytes' | 'rxPackets' | 'txPackets' | 'rxErrors' | 'txErrors'>>): boolean {
    const ports = this._ports.get(switchId);
    if (!ports) return false;
    const idx = ports.findIndex(p => p.portNo === portNo);
    if (idx < 0) return false;
    ports[idx] = { ...ports[idx], ...stats };
    return true;
  }

  public installFlowEntry(switchId: string, match: FlowMatch, actions: FlowAction[], options: { priority?: number; idleTimeout?: number; hardTimeout?: number; cookie?: number; tableId?: number } = {}): FlowEntry {
    const id = `flow-${this._flowCounter++}`;
    const entry: FlowEntry = {
      id,
      switchId,
      priority: options.priority ?? 100,
      match,
      actions,
      idleTimeout: options.idleTimeout ?? 0,
      hardTimeout: options.hardTimeout ?? 0,
      cookie: options.cookie ?? 0,
      packetCount: 0,
      byteCount: 0,
      installedAt: Date.now(),
      tableId: options.tableId ?? 0,
    };
    this._flowEntries.set(id, entry);
    const flows = this._flows.get(switchId) ?? [];
    flows.push(id);
    this._flows.set(switchId, flows);
    const sw = this._switches.get(switchId);
    if (sw) {
      this._switches.set(switchId, { ...sw, flows: sw.flows + 1 });
    }
    this._recordHistory(`installFlowEntry(switch=${switchId}, id=${id}, priority=${entry.priority})`);
    return entry;
  }

  public deleteFlowEntry(flowId: string): boolean {
    const entry = this._flowEntries.get(flowId);
    if (!entry) return false;
    this._flowEntries.delete(flowId);
    const flows = this._flows.get(entry.switchId) ?? [];
    const idx = flows.indexOf(flowId);
    if (idx >= 0) flows.splice(idx, 1);
    this._recordHistory(`deleteFlowEntry(id=${flowId})`);
    return true;
  }

  public listFlowEntries(switchId?: string): FlowEntry[] {
    const entries = Array.from(this._flowEntries.values());
    return switchId ? entries.filter(e => e.switchId === switchId) : entries;
  }

  public matchFlow(match: FlowMatch, switchId: string): FlowEntry | null {
    const entries = this.listFlowEntries(switchId);
    const sorted = entries.sort((a, b) => b.priority - a.priority);
    for (const entry of sorted) {
      if (this._matchEquals(entry.match, match)) return entry;
    }
    return null;
  }

  private _matchEquals(a: FlowMatch, b: FlowMatch): boolean {
    return (a.inPort === undefined || a.inPort === b.inPort) &&
           (a.ethSrc === undefined || a.ethSrc === b.ethSrc) &&
           (a.ethDst === undefined || a.ethDst === b.ethDst) &&
           (a.ethType === undefined || a.ethType === b.ethType) &&
           (a.ipProto === undefined || a.ipProto === b.ipProto);
  }

  public addGroup(switchId: string, groupId: number, type: GroupEntry['type'], buckets: GroupBucket[]): GroupEntry {
    const id = `group-${switchId}-${groupId}`;
    const group: GroupEntry = {
      id,
      switchId,
      groupId,
      type,
      buckets,
      counters: { packets: 0, bytes: 0 },
    };
    this._groups.set(id, group);
    this._recordHistory(`addGroup(switch=${switchId}, groupId=${groupId}, type=${type}, buckets=${buckets.length})`);
    return group;
  }

  public removeGroup(groupId: string): boolean {
    const removed = this._groups.delete(groupId);
    if (removed) this._recordHistory(`removeGroup(id=${groupId})`);
    return removed;
  }

  public listGroups(switchId?: string): GroupEntry[] {
    const groups = Array.from(this._groups.values());
    return switchId ? groups.filter(g => g.switchId === switchId) : groups;
  }

  public addMeter(switchId: string, meterId: number, bands: MeterBand[], flags: string[] = ['kbps']): MeterEntry {
    const id = `meter-${switchId}-${meterId}`;
    const meter: MeterEntry = {
      id,
      switchId,
      meterId,
      flags,
      bands,
      counters: { flowCount: 0, packetsIn: 0, bytesIn: 0 },
    };
    this._meters.set(id, meter);
    this._recordHistory(`addMeter(switch=${switchId}, meterId=${meterId}, bands=${bands.length})`);
    return meter;
  }

  public removeMeter(meterId: string): boolean {
    const removed = this._meters.delete(meterId);
    if (removed) this._recordHistory(`removeMeter(id=${meterId})`);
    return removed;
  }

  public listMeters(switchId?: string): MeterEntry[] {
    const meters = Array.from(this._meters.values());
    return switchId ? meters.filter(m => m.switchId === switchId) : meters;
  }

  public addLink(link: Omit<TopologyLink, 'id' | 'discoveredAt'>): TopologyLink {
    const id = `link-${this._linkCounter++}`;
    const full: TopologyLink = { ...link, id, discoveredAt: Date.now() };
    this._links.set(id, full);
    this._recordHistory(`addLink(id=${id}, ${link.srcSwitch} -> ${link.dstSwitch})`);
    return full;
  }

  public removeLink(linkId: string): boolean {
    const removed = this._links.delete(linkId);
    if (removed) this._recordHistory(`removeLink(id=${linkId})`);
    return removed;
  }

  public listLinks(): TopologyLink[] {
    return Array.from(this._links.values());
  }

  public computeShortestPath(srcSwitch: string, dstSwitch: string): string[] | null {
    const adj = new Map<string, string[]>();
    for (const link of this._links.values()) {
      if (link.status !== 'up') continue;
      if (!adj.has(link.srcSwitch)) adj.set(link.srcSwitch, []);
      if (!adj.has(link.dstSwitch)) adj.set(link.dstSwitch, []);
      adj.get(link.srcSwitch)!.push(link.dstSwitch);
      adj.get(link.dstSwitch)!.push(link.srcSwitch);
    }
    const visited = new Set<string>([srcSwitch]);
    const queue: { node: string; path: string[] }[] = [{ node: srcSwitch, path: [srcSwitch] }];
    while (queue.length > 0) {
      const { node, path } = queue.shift()!;
      if (node === dstSwitch) return path;
      const neighbors = adj.get(node) ?? [];
      for (const n of neighbors) {
        if (visited.has(n)) continue;
        visited.add(n);
        queue.push({ node: n, path: [...path, n] });
      }
    }
    return null;
  }

  public listSwitchTopology(): { switches: number; links: number; topology: string; avgDegree: number } {
    const adj = new Map<string, number>();
    for (const link of this._links.values()) {
      adj.set(link.srcSwitch, (adj.get(link.srcSwitch) ?? 0) + 1);
      adj.set(link.dstSwitch, (adj.get(link.dstSwitch) ?? 0) + 1);
    }
    const avgDegree = adj.size > 0 ? Array.from(adj.values()).reduce((a, b) => a + b, 0) / adj.size : 0;
    const topology = this._links.size > this._switches.size ? 'mesh' : 'tree';
    return { switches: this._switches.size, links: this._links.size, topology, avgDegree };
  }

  public createSlice(slice: Omit<NetworkSlice, 'id'>): NetworkSlice {
    const id = `slice-${this._counter++}`;
    const full: NetworkSlice = { ...slice, id };
    this._slices.set(id, full);
    this._recordHistory(`createSlice(id=${id}, name=${slice.name}, tenant=${slice.tenantId})`);
    return full;
  }

  public removeSlice(sliceId: string): boolean {
    const removed = this._slices.delete(sliceId);
    if (removed) this._recordHistory(`removeSlice(id=${sliceId})`);
    return removed;
  }

  public listSlices(): NetworkSlice[] {
    return Array.from(this._slices.values());
  }

  public getSlice(sliceId: string): NetworkSlice | undefined {
    return this._slices.get(sliceId);
  }

  public verifySliceIsolation(sliceId: string): { isolated: boolean; overlaps: string[] } {
    const slice = this._slices.get(sliceId);
    if (!slice) return { isolated: false, overlaps: [] };
    const overlaps: string[] = [];
    for (const other of this._slices.values()) {
      if (other.id === sliceId) continue;
      const shared = slice.switches.filter(s => other.switches.includes(s));
      if (shared.length > 0) overlaps.push(other.id);
    }
    return { isolated: overlaps.length === 0, overlaps };
  }

  public defineQoSPolicy(policy: Omit<QoSPolicy, 'id'>): QoSPolicy {
    const id = `qos-${this._counter++}`;
    const full: QoSPolicy = { ...policy, id };
    this._qosPolicies.set(id, full);
    this._recordHistory(`defineQoSPolicy(id=${id}, name=${policy.name}, classes=${policy.classes.length})`);
    return full;
  }

  public listQoSPolicies(): QoSPolicy[] {
    return Array.from(this._qosPolicies.values());
  }

  public applyQoSToFlow(flowId: string, qosPolicyId: string, className: string): boolean {
    const flow = this._flowEntries.get(flowId);
    const policy = this._qosPolicies.get(qosPolicyId);
    if (!flow || !policy) return false;
    const cls = policy.classes.find(c => c.name === className);
    if (!cls) return false;
    this._recordHistory(`applyQoSToFlow(flow=${flowId}, policy=${qosPolicyId}, class=${className})`);
    return true;
  }

  public loadApplication(app: Omit<ControllerApplication, 'id' | 'loadedAt' | 'eventsHandled' | 'status'>): ControllerApplication {
    const id = `app-${this._counter++}`;
    const full: ControllerApplication = { ...app, id, status: 'running', loadedAt: Date.now(), eventsHandled: 0 };
    this._applications.set(id, full);
    this._recordHistory(`loadApplication(id=${id}, name=${app.name}, version=${app.version})`);
    return full;
  }

  public unloadApplication(appId: string): boolean {
    const app = this._applications.get(appId);
    if (!app) return false;
    this._applications.set(appId, { ...app, status: 'stopped' });
    this._recordHistory(`unloadApplication(id=${appId})`);
    return true;
  }

  public listApplications(): ControllerApplication[] {
    return Array.from(this._applications.values());
  }

  public setControllerRole(role: ControllerRole['role'], switches: string[]): ControllerRole {
    this._role = {
      role,
      generationId: this._role.generationId + 1,
      switches,
      assumedAt: Date.now(),
    };
    this._recordEvent('controller', 'role_change', 'info', `Controller role changed to ${role} (gen ${this._role.generationId})`);
    this._recordHistory(`setControllerRole(role=${role}, gen=${this._role.generationId})`);
    return this._role;
  }

  public addLoadBalancer(pool: Omit<LoadBalancerPool, 'members'> & { id: string }): LoadBalancerPool {
    const lbPool: LoadBalancerPool = {
      id: pool.id,
      name: pool.name,
      servers: pool.servers,
      algorithm: pool.algorithm,
      healthCheck: pool.healthCheck,
      members: pool.servers.length,
      vips: pool.vips ?? [],
    };
    this._loadBalancers.set(pool.id, lbPool);
    this._recordHistory(`Added load balancer: ${pool.id}`);
    return lbPool;
  }

  public removeLoadBalancer(poolId: string): boolean {
    const removed = this._loadBalancers.delete(poolId);
    if (removed) {
      this._recordHistory(`Removed load balancer: ${poolId}`);
    }
    return removed;
  }

  public listLoadBalancers(): LoadBalancerPool[] {
    return Array.from(this._loadBalancers.values());
  }

  public selectServer(poolId: string, clientIp: string): string | null {
    const pool = this._loadBalancers.get(poolId);
    if (!pool || pool.servers.length === 0) return null;
    switch (pool.algorithm) {
      case 'round_robin': {
        const idx = this._counter % pool.servers.length;
        return pool.servers[idx];
      }
      case 'ip_hash': {
        let hash = 0;
        for (let i = 0; i < clientIp.length; i++) hash = (hash * 31 + clientIp.charCodeAt(i)) >>> 0;
        return pool.servers[hash % pool.servers.length];
      }
      case 'least_connections':
      case 'weighted':
      case 'least_response_time':
      default:
        return pool.servers[0];
    }
  }

  public collectFlowStatistics(switchId: string): FlowStatistics {
    const flows = this.listFlowEntries(switchId);
    return {
      switchId,
      tableId: 0,
      activeFlows: flows.length,
      packetsLookedUp: flows.reduce((s, f) => s + f.packetCount, 0),
      packetsMatched: flows.reduce((s, f) => s + f.packetCount, 0),
      flowEntries: flows.map(f => ({ id: f.id, packets: f.packetCount, bytes: f.byteCount, duration: (Date.now() - f.installedAt) / 1000 })),
    };
  }

  public aggregatePortStatistics(switchId: string): { totalRxBytes: number; totalTxBytes: number; totalRxPackets: number; totalTxPackets: number; totalErrors: number; portCount: number } {
    const ports = this._ports.get(switchId) ?? [];
    return {
      totalRxBytes: ports.reduce((s, p) => s + p.rxBytes, 0),
      totalTxBytes: ports.reduce((s, p) => s + p.txBytes, 0),
      totalRxPackets: ports.reduce((s, p) => s + p.rxPackets, 0),
      totalTxPackets: ports.reduce((s, p) => s + p.txPackets, 0),
      totalErrors: ports.reduce((s, p) => s + p.rxErrors + p.txErrors, 0),
      portCount: ports.length,
    };
  }

  public switchHealthCheck(switchId: string): { healthy: boolean; issues: string[]; latency: number } {
    const sw = this._switches.get(switchId);
    const issues: string[] = [];
    let latency = 1;
    if (!sw) {
      return { healthy: false, issues: ['switch not found'], latency: 0 };
    }
    if (sw.status === 'disconnected') issues.push('switch disconnected');
    if (sw.status === 'degraded') issues.push('switch degraded');
    if (sw.status === 'maintenance') issues.push('switch in maintenance');
    const ports = this._ports.get(switchId) ?? [];
    const downPorts = ports.filter(p => p.status === 'down').length;
    if (downPorts > 0) issues.push(`${downPorts} ports down`);
    const errorPorts = ports.filter(p => p.rxErrors + p.txErrors > 100).length;
    if (errorPorts > 0) issues.push(`${errorPorts} ports with high error rate`);
    latency = 1 + Math.random() * 4;
    return { healthy: issues.length === 0 && sw.status === 'connected', issues, latency };
  }

  public controllerHealth(): { status: string; switches: number; applications: number; events: number; uptime: number } {
    const connectedSwitches = Array.from(this._switches.values()).filter(s => s.status === 'connected').length;
    const runningApps = Array.from(this._applications.values()).filter(a => a.status === 'running').length;
    const status = connectedSwitches === this._switches.size && runningApps === this._applications.size ? 'healthy' : 'degraded';
    return {
      status,
      switches: connectedSwitches,
      applications: runningApps,
      events: this._events.length,
      uptime: Date.now() - (this._role.assumedAt),
    };
  }

  public pushFlowRule(switchId: string, match: FlowMatch, action: FlowAction, priority: number = 100): FlowEntry {
    return this.installFlowEntry(switchId, match, [action], { priority });
  }

  public installDropRule(switchId: string, match: FlowMatch, priority: number = 200): FlowEntry {
    return this.installFlowEntry(switchId, match, [{ type: 'drop' }], { priority });
  }

  public installForwardRule(switchId: string, match: FlowMatch, outPort: number, priority: number = 100): FlowEntry {
    return this.installFlowEntry(switchId, match, [{ type: 'output', port: outPort }], { priority });
  }

  public installRedirectRule(switchId: string, match: FlowMatch, groupId: number, priority: number = 150): FlowEntry {
    return this.installFlowEntry(switchId, match, [{ type: 'group', groupId }], { priority });
  }

  public clearFlowTable(switchId: string): number {
    const flows = this._flows.get(switchId) ?? [];
    const count = flows.length;
    flows.forEach(fid => this._flowEntries.delete(fid));
    this._flows.set(switchId, []);
    const sw = this._switches.get(switchId);
    if (sw) this._switches.set(switchId, { ...sw, flows: 0 });
    this._recordHistory(`clearFlowTable(switch=${switchId}) -> ${count} flows removed`);
    return count;
  }

  public exportFlowTable(switchId: string): FlowEntry[] {
    return this.listFlowEntries(switchId);
  }

  public importFlowTable(switchId: string, entries: FlowEntry[]): number {
    let imported = 0;
    entries.forEach(e => {
      const id = `flow-${this._flowCounter++}`;
      this._flowEntries.set(id, { ...e, id, switchId, installedAt: Date.now() });
      imported++;
    });
    this._recordHistory(`importFlowTable(switch=${switchId}) -> ${imported} flows imported`);
    return imported;
  }

  public listEvents(switchId?: string, severity?: SwitchEvent['severity']): SwitchEvent[] {
    let events = [...this._events];
    if (switchId) events = events.filter(e => e.switchId === switchId);
    if (severity) events = events.filter(e => e.severity === severity);
    return events;
  }

  public acknowledgeEvent(eventId: string): boolean {
    const idx = this._events.findIndex(e => e.id === eventId);
    if (idx < 0) return false;
    this._events.splice(idx, 1);
    return true;
  }

  public clearEvents(): number {
    const count = this._events.length;
    this._events = [];
    return count;
  }

  public reactiveFlowInstall(switchId: string, packet: string, match: FlowMatch, outPort: number): FlowEntry {
    this._recordEvent(switchId, 'packet_in', 'info', `Reactive flow install for packet ${packet.substring(0, 16)}`);
    return this.installForwardRule(switchId, match, outPort, 100);
  }

  public proactiveFlowInstall(switchId: string, match: FlowMatch, outPort: number): FlowEntry {
    this._recordHistory(`proactiveFlowInstall(switch=${switchId})`);
    return this.installForwardRule(switchId, match, outPort, 200);
  }

  public snapshotConfiguration(): {
    controller: SDNControllerInfo | null;
    switches: OpenFlowSwitch[];
    flowEntries: FlowEntry[];
    groups: GroupEntry[];
    meters: MeterEntry[];
    links: TopologyLink[];
    slices: NetworkSlice[];
    qosPolicies: QoSPolicy[];
    applications: ControllerApplication[];
  } {
    return {
      controller: this._controller,
      switches: this.listSwitches(),
      flowEntries: this.listFlowEntries(),
      groups: this.listGroups(),
      meters: this.listMeters(),
      links: this.listLinks(),
      slices: this.listSlices(),
      qosPolicies: this.listQoSPolicies(),
      applications: this.listApplications(),
    };
  }

  public toPacket(): DataPacket<{
    switches: number;
    flows: number;
    history: string[];
    controller: string;
  }> {
    let totalFlows = 0;
    for (const flows of this._flows.values()) {
      totalFlows += flows.length;
    }
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['computer_network', 'sdn', 'result'],
      priority: 0.75,
      phase: 'control',
    };
    return {
      id: `sdn-ctrl-${Date.now()}-${this._counter}`,
      payload: {
        switches: this._switches.size,
        flows: totalFlows,
        history: [...this._history],
        controller: this._controller?.name ?? 'none',
      },
      metadata,
    };
  }

  public reset(): void {
    this._controller = null;
    this._switches.clear();
    this._flows.clear();
    this._flowEntries.clear();
    this._ports.clear();
    this._groups.clear();
    this._meters.clear();
    this._links.clear();
    this._slices.clear();
    this._qosPolicies.clear();
    this._applications.clear();
    this._loadBalancers.clear();
    this._events = [];
    this._history = [];
    this._counter = 0;
    this._eventCounter = 0;
    this._flowCounter = 0;
    this._linkCounter = 0;
    this._role = { role: 'master', generationId: 0, switches: [], assumedAt: Date.now() };
  }

  private _recordHistory(entry: string): void {
    this._counter++;
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }

  private _recordEvent(switchId: string, type: SwitchEvent['type'], severity: SwitchEvent['severity'], message: string, data?: unknown): void {
    const event: SwitchEvent = {
      id: `evt-${this._eventCounter++}`,
      switchId,
      type,
      severity,
      message,
      timestamp: Date.now(),
      data,
    };
    this._events.push(event);
    if (this._events.length > 500) this._events.shift();
    const app = Array.from(this._applications.values()).find(a => a.status === 'running');
    if (app) {
      this._applications.set(app.id, { ...app, eventsHandled: app.eventsHandled + 1 });
    }
  }
}

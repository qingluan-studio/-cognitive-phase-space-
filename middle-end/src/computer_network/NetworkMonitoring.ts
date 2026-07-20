import { DataPacket } from '../shared/types';

export interface NetworkMetrics {
  readonly bandwidth: number;
  readonly latency: number;
  readonly packetLoss: number;
  readonly jitter: number;
}

export interface SNMPDevice {
  readonly hostname: string;
  readonly ip: string;
  readonly oids: string[];
  readonly community: string;
  readonly version: string;
  readonly port: number;
}

export interface FlowRecord {
  readonly srcIp: string;
  readonly dstIp: string;
  readonly srcPort: number;
  readonly dstPort: number;
  readonly protocol: string;
  readonly bytes: number;
  readonly packets: number;
  readonly duration: number;
}

export interface AlertThreshold {
  readonly metric: string;
  readonly type: 'absolute' | 'percentage' | 'delta';
  readonly threshold: number;
  readonly comparison: 'gt' | 'lt' | 'eq';
  readonly severity: 'info' | 'warning' | 'critical';
  readonly window: number;
}

export interface NetworkNode {
  readonly id: string;
  readonly ip: string;
  readonly type: 'router' | 'switch' | 'firewall' | 'server' | 'endpoint';
  readonly status: 'up' | 'down' | 'degraded';
  readonly metrics: NetworkMetrics;
}

export interface NetworkLink {
  readonly id: string;
  readonly source: string;
  readonly target: string;
  readonly bandwidth: number;
  readonly utilization: number;
  readonly latency: number;
}

export interface PingResult {
  readonly target: string;
  readonly count: number;
  readonly loss: number;
  readonly avgRtt: number;
  readonly minRtt: number;
  readonly maxRtt: number;
  readonly jitter: number;
}

export interface TracerouteHop {
  readonly hop: number;
  readonly ip: string;
  readonly hostname?: string;
  readonly rtts: number[];
  readonly loss: number;
}

export interface NetflowSummary {
  readonly totalFlows: number;
  readonly totalBytes: number;
  readonly totalPackets: number;
  readonly topTalkers: Array<{ ip: string; bytes: number; percentage: number }>;
  readonly topListeners: Array<{ ip: string; bytes: number; percentage: number }>;
  readonly protocolDistribution: Record<string, number>;
  readonly portDistribution: Record<string, number>;
}

export interface MonitoringAlert {
  readonly id: string;
  readonly type: string;
  readonly severity: 'info' | 'warning' | 'critical';
  readonly message: string;
  readonly source: string;
  readonly timestamp: number;
  readonly threshold: AlertThreshold;
  readonly currentValue: number;
}

export class NetworkMonitoring {
  private _metrics: Map<string, NetworkMetrics> = new Map();
  private _devices: Map<string, SNMPDevice> = new Map();
  private _history: string[] = [];
  private _counter = 0;
  private _alerts: Map<string, MonitoringAlert> = new Map();
  private _alertThresholds: Map<string, AlertThreshold> = new Map();
  private _topologyNodes: Map<string, NetworkNode> = new Map();
  private _topologyLinks: Map<string, NetworkLink> = new Map();
  private _flowCache: Map<string, FlowRecord[]> = new Map();
  private _pingHistory: Map<string, PingResult[]> = new Map();
  private _tracerouteCache: Map<string, TracerouteHop[]> = new Map();
  private _monitoringInterval: number = 60000;
  private _retentionDays: number = 30;
  private _collectors: Set<string> = new Set();

  get metricCount(): number {
    return this._metrics.size;
  }

  get deviceCount(): number {
    return this._devices.size;
  }

  get history(): string[] {
    return [...this._history];
  }

  get alertCount(): number {
    return this._alerts.size;
  }

  get thresholdCount(): number {
    return this._alertThresholds.size;
  }

  get nodeCount(): number {
    return this._topologyNodes.size;
  }

  get linkCount(): number {
    return this._topologyLinks.size;
  }

  get collectorCount(): number {
    return this._collectors.size;
  }

  get monitoringInterval(): number {
    return this._monitoringInterval;
  }

  get retentionDays(): number {
    return this._retentionDays;
  }

  set monitoringInterval(value: number) {
    if (value >= 1000 && value <= 3600000) {
      this._monitoringInterval = value;
    }
  }

  set retentionDays(value: number) {
    if (value >= 1 && value <= 365) {
      this._retentionDays = value;
    }
  }

  public bandwidthMonitor(iface: string, interval: number): { interface: string; bandwidth: number; utilization: number; interval: number } {
    const bandwidth = 1000;
    const utilization = 0.3 + Math.random() * 0.5;
    this._metrics.set(iface, { bandwidth, latency: 10, packetLoss: 0.1, jitter: 2 });
    this._recordHistory(`bandwidthMonitor(${iface}, interval=${interval}s) -> ${(utilization * 100).toFixed(1)}%`);
    return { interface: iface, bandwidth, utilization, interval };
  }

  public latencyMonitor(target: string, method: string): { target: string; latency: number; jitter: number; method: string } {
    const latency = Math.floor(Math.random() * 50) + 5;
    const jitter = Math.floor(Math.random() * 10) + 1;
    this._recordHistory(`latencyMonitor(target=${target}, method=${method}) -> ${latency}ms`);
    return { target, latency, jitter, method };
  }

  public packetLossMonitor(target: string, threshold: number): { target: string; loss: number; threshold: number; alert: boolean } {
    const loss = Math.random() * 5;
    const alert = loss > threshold;
    if (alert) {
      this._generateAlert('packet_loss', target, loss, threshold);
    }
    this._recordHistory(`packetLossMonitor(${target}) -> ${loss.toFixed(2)}%, alert=${alert}`);
    return { target, loss, threshold, alert };
  }

  public jitterMonitor(target: string): { target: string; jitter: number; maxJitter: number; mosScore: number } {
    const jitter = Math.random() * 10;
    const maxJitter = jitter * 2;
    const mosScore = Math.max(1, 5 - jitter / 10);
    this._recordHistory(`jitterMonitor(${target}) -> ${jitter.toFixed(2)}ms, MOS=${mosScore.toFixed(1)}`);
    return { target, jitter, maxJitter, mosScore };
  }

  public snmpPoll(device: string, oid: string, community: string): { device: string; oid: string; value: string; community: string } {
    const value = Math.floor(Math.random() * 100).toString();
    this._recordHistory(`SNMP poll: ${device}, oid=${oid.slice(0, 20)}...`);
    return { device, oid, value, community };
  }

  public snmpTrap(device: string, trap: string): { device: string; trap: string; received: boolean; severity: string } {
    const severity = 'warning';
    this._recordHistory(`SNMP trap: ${device}, trap=${trap}`);
    return { device, trap, received: true, severity };
  }

  public netflowAnalyze(records: number, filters: string[]): { records: number; flows: number; topTalkers: string[]; filters: string[] } {
    const flows = records;
    const topTalkers = ['192.168.1.1', '192.168.1.2', '10.0.0.1'];
    this._recordHistory(`NetFlow analyze: ${records} records, filters=${filters.length}`);
    return { records, flows, topTalkers, filters };
  }

  public sflowAnalyze(samples: number, collectors: string[]): { samples: number; collectors: number; sampled: number; rate: number } {
    const rate = 1000;
    const sampled = Math.floor(samples / rate);
    this._recordHistory(`sFlow: samples=${samples}, collectors=${collectors.length}`);
    return { samples, collectors: collectors.length, sampled, rate };
  }

  public pingMonitor(target: string, count: number, interval: number): { target: string; count: number; loss: number; avgRtt: number } {
    const loss = Math.random() * 2;
    const avgRtt = Math.floor(Math.random() * 30) + 10;
    this._recordHistory(`pingMonitor(${target}, count=${count}) -> loss=${loss.toFixed(1)}%, rtt=${avgRtt}ms`);
    return { target, count, loss, avgRtt };
  }

  public tracerouteMonitor(target: string, hops: number): { target: string; path: string[]; hops: number; anomalies: number } {
    const path: string[] = [];
    for (let i = 0; i < hops; i++) {
      path.push(`hop-${i}.example.com`);
    }
    const anomalies = Math.floor(Math.random() * 2);
    this._recordHistory(`tracerouteMonitor(${target}) -> ${hops} hops`);
    return { target, path, hops, anomalies };
  }

  public networkTopology(discovery: string, devices: string[]): { devices: number; links: number; topology: string; discovery: string } {
    const links = devices.length;
    this._recordHistory(`topology discovery (${discovery}): ${devices.length} devices`);
    return { devices: devices.length, links, topology: 'mesh', discovery };
  }

  public bandwidthUsage(iface: string, direction: 'in' | 'out' | 'both'): { interface: string; direction: string; in: number; out: number; total: number } {
    const inBw = Math.random() * 500;
    const outBw = Math.random() * 300;
    const total = inBw + outBw;
    this._recordHistory(`bandwidthUsage(${iface}, ${direction}) -> ${total.toFixed(1)} Mbps`);
    return { interface: iface, direction, in: inBw, out: outBw, total };
  }

  public throughputMonitor(link: string): { link: string; throughput: number; peak: number; utilization: number } {
    const throughput = Math.random() * 800 + 100;
    const peak = throughput * 1.5;
    const utilization = throughput / 1000;
    this._recordHistory(`throughputMonitor(${link}) -> ${throughput.toFixed(1)} Mbps`);
    return { link, throughput, peak, utilization };
  }

  public errorRateMonitor(iface: string): { interface: string; errors: number; drops: number; rate: number } {
    const errors = Math.floor(Math.random() * 10);
    const drops = Math.floor(Math.random() * 5);
    const rate = errors / 10000;
    this._recordHistory(`errorRateMonitor(${iface}) -> ${errors} errors, ${drops} drops`);
    return { interface: iface, errors, drops, rate };
  }

  public addSNMPDevice(device: Omit<SNMPDevice, 'id'> & { id: string }): SNMPDevice {
    const snmpDevice: SNMPDevice = {
      hostname: device.hostname,
      ip: device.ip,
      oids: device.oids,
      community: device.community,
      version: device.version || 'v2c',
      port: device.port || 161,
    };
    this._devices.set(device.id, snmpDevice);
    this._recordHistory(`Added SNMP device: ${device.id} (${device.hostname})`);
    return snmpDevice;
  }

  public removeSNMPDevice(deviceId: string): boolean {
    const removed = this._devices.delete(deviceId);
    if (removed) {
      this._recordHistory(`Removed SNMP device: ${deviceId}`);
    }
    return removed;
  }

  public getSNMPDevice(deviceId: string): SNMPDevice | undefined {
    return this._devices.get(deviceId);
  }

  public listSNMPDevices(): SNMPDevice[] {
    return Array.from(this._devices.values());
  }

  public configureSNMP(deviceId: string, config: Partial<SNMPDevice>): SNMPDevice | null {
    const device = this._devices.get(deviceId);
    if (!device) return null;
    const updated = { ...device, ...config };
    this._devices.set(deviceId, updated);
    this._recordHistory(`Configured SNMP device: ${deviceId}`);
    return updated;
  }

  public addAlertThreshold(id: string, threshold: AlertThreshold): void {
    this._alertThresholds.set(id, threshold);
    this._recordHistory(`Added alert threshold: ${id}`);
  }

  public removeAlertThreshold(id: string): boolean {
    const removed = this._alertThresholds.delete(id);
    if (removed) {
      this._recordHistory(`Removed alert threshold: ${id}`);
    }
    return removed;
  }

  public checkAlerts(metric: string, value: number): MonitoringAlert[] {
    const triggered: MonitoringAlert[] = [];
    for (const [id, threshold] of this._alertThresholds.entries()) {
      if (threshold.metric !== metric) continue;
      let triggeredAlert = false;
      switch (threshold.comparison) {
        case 'gt':
          triggeredAlert = value > threshold.threshold;
          break;
        case 'lt':
          triggeredAlert = value < threshold.threshold;
          break;
        case 'eq':
          triggeredAlert = value === threshold.threshold;
          break;
      }
      if (triggeredAlert) {
        const alert: MonitoringAlert = {
          id: `alert-${++this._counter}`,
          type: metric,
          severity: threshold.severity,
          message: `${metric} ${threshold.comparison} ${threshold.threshold} (current: ${value})`,
          source: 'monitoring',
          timestamp: Date.now(),
          threshold,
          currentValue: value,
        };
        this._alerts.set(alert.id, alert);
        triggered.push(alert);
      }
    }
    return triggered;
  }

  public listAlerts(severity?: 'info' | 'warning' | 'critical'): MonitoringAlert[] {
    let alerts = Array.from(this._alerts.values());
    if (severity) {
      alerts = alerts.filter(a => a.severity === severity);
    }
    return alerts;
  }

  public acknowledgeAlert(alertId: string): boolean {
    const alert = this._alerts.get(alertId);
    if (!alert) return false;
    this._alerts.delete(alertId);
    this._recordHistory(`Acknowledged alert: ${alertId}`);
    return true;
  }

  public acknowledgeAllAlerts(): number {
    const count = this._alerts.size;
    this._alerts.clear();
    this._recordHistory(`Acknowledged ${count} alerts`);
    return count;
  }

  public addTopologyNode(node: Omit<NetworkNode, 'id'> & { id: string }): NetworkNode {
    const networkNode: NetworkNode = {
      id: node.id,
      ip: node.ip,
      type: node.type,
      status: node.status,
      metrics: node.metrics,
    };
    this._topologyNodes.set(node.id, networkNode);
    this._recordHistory(`Added topology node: ${node.id}`);
    return networkNode;
  }

  public updateNodeStatus(nodeId: string, status: 'up' | 'down' | 'degraded'): boolean {
    const node = this._topologyNodes.get(nodeId);
    if (!node) return false;
    this._topologyNodes.set(nodeId, { ...node, status });
    this._recordHistory(`Updated node ${nodeId} status to ${status}`);
    return true;
  }

  public addTopologyLink(link: Omit<NetworkLink, 'id'> & { id: string }): NetworkLink {
    const networkLink: NetworkLink = {
      id: link.id,
      source: link.source,
      target: link.target,
      bandwidth: link.bandwidth,
      utilization: link.utilization,
      latency: link.latency,
    };
    this._topologyLinks.set(link.id, networkLink);
    this._recordHistory(`Added topology link: ${link.id}`);
    return networkLink;
  }

  public updateLinkUtilization(linkId: string, utilization: number): boolean {
    const link = this._topologyLinks.get(linkId);
    if (!link) return false;
    this._topologyLinks.set(linkId, { ...link, utilization: Math.min(1, Math.max(0, utilization)) });
    return true;
  }

  public performPing(target: string, count: number = 4, timeout: number = 2000): PingResult {
    const results: number[] = [];
    let loss = 0;
    for (let i = 0; i < count; i++) {
      const rtt = Math.random() > 0.05 ? Math.floor(Math.random() * 100) + 5 : -1;
      if (rtt > 0) {
        results.push(rtt);
      } else {
        loss++;
      }
    }
    const avgRtt = results.length > 0 ? Math.round(results.reduce((a, b) => a + b, 0) / results.length) : 0;
    const minRtt = results.length > 0 ? Math.min(...results) : 0;
    const maxRtt = results.length > 0 ? Math.max(...results) : 0;
    const jitter = results.length > 1 ? this._calculateJitter(results) : 0;
    const result: PingResult = {
      target,
      count,
      loss: (loss / count) * 100,
      avgRtt,
      minRtt,
      maxRtt,
      jitter,
    };
    const history = this._pingHistory.get(target) || [];
    history.push(result);
    if (history.length > 100) history.shift();
    this._pingHistory.set(target, history);
    this._recordHistory(`Ping ${target}: ${result.avgRtt}ms, ${result.loss.toFixed(1)}% loss`);
    return result;
  }

  public performTraceroute(target: string, maxHops: number = 30, timeout: number = 3000): TracerouteHop[] {
    const hops: TracerouteHop[] = [];
    for (let i = 1; i <= maxHops; i++) {
      const rtts: number[] = [];
      let loss = 0;
      for (let j = 0; j < 3; j++) {
        const rtt = Math.random() > 0.1 ? Math.floor(Math.random() * 50) + 10 : -1;
        if (rtt > 0) {
          rtts.push(rtt);
        } else {
          loss++;
        }
      }
      hops.push({
        hop: i,
        ip: `10.0.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        hostname: `router-${i}.example.net`,
        rtts,
        loss: (loss / 3) * 100,
      });
      if (Math.random() > 0.9) break;
    }
    this._tracerouteCache.set(target, hops);
    this._recordHistory(`Traceroute to ${target}: ${hops.length} hops`);
    return hops;
  }

  public analyzeNetflow(records: FlowRecord[], topN: number = 10): NetflowSummary {
    const totalBytes = records.reduce((sum, r) => sum + r.bytes, 0);
    const totalPackets = records.reduce((sum, r) => sum + r.packets, 0);
    const srcStats: Record<string, number> = {};
    const dstStats: Record<string, number> = {};
    const protocolStats: Record<string, number> = {};
    const portStats: Record<string, number> = {};
    for (const record of records) {
      srcStats[record.srcIp] = (srcStats[record.srcIp] || 0) + record.bytes;
      dstStats[record.dstIp] = (dstStats[record.dstIp] || 0) + record.bytes;
      protocolStats[record.protocol] = (protocolStats[record.protocol] || 0) + record.bytes;
      portStats[`${record.protocol}:${record.dstPort}`] = (portStats[`${record.protocol}:${record.dstPort}`] || 0) + record.packets;
    }
    const topTalkers = Object.entries(srcStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map(([ip, bytes]) => ({ ip, bytes, percentage: (bytes / totalBytes) * 100 }));
    const topListeners = Object.entries(dstStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map(([ip, bytes]) => ({ ip, bytes, percentage: (bytes / totalBytes) * 100 }));
    const summary: NetflowSummary = {
      totalFlows: records.length,
      totalBytes,
      totalPackets,
      topTalkers,
      topListeners,
      protocolDistribution: protocolStats,
      portDistribution: portStats,
    };
    this._recordHistory(`NetFlow analysis: ${records.length} flows, ${totalBytes.toLocaleString()} bytes`);
    return summary;
  }

  public addCollector(collectorIp: string): void {
    this._collectors.add(collectorIp);
    this._recordHistory(`Added collector: ${collectorIp}`);
  }

  public removeCollector(collectorIp: string): boolean {
    const removed = this._collectors.delete(collectorIp);
    if (removed) {
      this._recordHistory(`Removed collector: ${collectorIp}`);
    }
    return removed;
  }

  public listCollectors(): string[] {
    return Array.from(this._collectors);
  }

  public getPingHistory(target: string, limit: number = 20): PingResult[] {
    const history = this._pingHistory.get(target) || [];
    return history.slice(-limit);
  }

  public getTracerouteResult(target: string): TracerouteHop[] | undefined {
    return this._tracerouteCache.get(target);
  }

  public calculateAvailability(startTime: number, endTime: number, target: string): { target: string; uptime: number; downtime: number; availability: number } {
    const history = this._pingHistory.get(target) || [];
    const relevant = history.filter(h => h.timestamp >= startTime && h.timestamp <= endTime);
    const total = relevant.length;
    const successful = relevant.filter(h => h.loss < 100).length;
    const availability = total > 0 ? (successful / total) * 100 : 0;
    const uptime = availability / 100 * (endTime - startTime);
    const downtime = (100 - availability) / 100 * (endTime - startTime);
    return { target, uptime, downtime, availability };
  }

  public generateHealthReport(): {
    totalDevices: number;
    healthyDevices: number;
    degradedDevices: number;
    downDevices: number;
    avgLatency: number;
    avgUtilization: number;
    alerts: number;
    criticalAlerts: number;
  } {
    const nodes = Array.from(this._topologyNodes.values());
    const metrics = Array.from(this._metrics.values());
    const alerts = Array.from(this._alerts.values());
    return {
      totalDevices: nodes.length,
      healthyDevices: nodes.filter(n => n.status === 'up').length,
      degradedDevices: nodes.filter(n => n.status === 'degraded').length,
      downDevices: nodes.filter(n => n.status === 'down').length,
      avgLatency: metrics.length > 0 ? metrics.reduce((s, m) => s + m.latency, 0) / metrics.length : 0,
      avgUtilization: metrics.length > 0 ? metrics.reduce((s, m) => s + m.jitter, 0) / metrics.length : 0,
      alerts: alerts.length,
      criticalAlerts: alerts.filter(a => a.severity === 'critical').length,
    };
  }

  public exportMetrics(format: 'json' | 'csv' | 'prometheus'): string {
    const metrics = Array.from(this._metrics.entries());
    if (format === 'json') {
      return JSON.stringify(metrics, null, 2);
    } else if (format === 'csv') {
      const header = 'interface,bandwidth,latency,packetLoss,jitter\n';
      const rows = metrics.map(([iface, m]) => `${iface},${m.bandwidth},${m.latency},${m.packetLoss},${m.jitter}`).join('\n');
      return header + rows;
    } else {
      return metrics.map(([iface, m]) => [
        `network_bandwidth{interface="${iface}"} ${m.bandwidth}`,
        `network_latency{interface="${iface}"} ${m.latency}`,
        `network_packet_loss{interface="${iface}"} ${m.packetLoss}`,
        `network_jitter{interface="${iface}"} ${m.jitter}`,
      ].join('\n')).join('\n');
    }
  }

  public importMetrics(data: string, format: 'json' | 'csv'): number {
    let count = 0;
    if (format === 'json') {
      const metrics: Array<[string, NetworkMetrics]> = JSON.parse(data);
      for (const [iface, m] of metrics) {
        this._metrics.set(iface, m);
        count++;
      }
    } else if (format === 'csv') {
      const lines = data.split('\n').slice(1);
      for (const line of lines) {
        const [iface, bandwidth, latency, packetLoss, jitter] = line.split(',');
        if (iface) {
          this._metrics.set(iface, {
            bandwidth: parseFloat(bandwidth),
            latency: parseFloat(latency),
            packetLoss: parseFloat(packetLoss),
            jitter: parseFloat(jitter),
          });
          count++;
        }
      }
    }
    this._recordHistory(`Imported ${count} metrics`);
    return count;
  }

  public cleanupOldData(): number {
    const cutoff = Date.now() - this._retentionDays * 24 * 60 * 60 * 1000;
    let removed = 0;
    this._history = this._history.filter(h => {
      const match = h.match(/\[(\d+)\]/);
      if (match && parseInt(match[1]) < cutoff) {
        removed++;
        return false;
      }
      return true;
    });
    for (const [target, history] of this._pingHistory.entries()) {
      const originalLength = history.length;
      const filtered = history.filter(h => h.timestamp >= cutoff);
      this._pingHistory.set(target, filtered);
      removed += originalLength - filtered.length;
    }
    this._recordHistory(`Cleaned up ${removed} old records`);
    return removed;
  }

  private _generateAlert(type: string, source: string, value: number, threshold: number): MonitoringAlert {
    const alert: MonitoringAlert = {
      id: `alert-${++this._counter}`,
      type,
      severity: value > threshold * 1.5 ? 'critical' : value > threshold ? 'warning' : 'info',
      message: `${type} exceeded threshold at ${source}: ${value} > ${threshold}`,
      source,
      timestamp: Date.now(),
      threshold: {
        metric: type,
        type: 'absolute',
        threshold,
        comparison: 'gt',
        severity: 'warning',
        window: 60,
      },
      currentValue: value,
    };
    this._alerts.set(alert.id, alert);
    return alert;
  }

  private _calculateJitter(rtts: number[]): number {
    if (rtts.length < 2) return 0;
    const differences: number[] = [];
    for (let i = 1; i < rtts.length; i++) {
      differences.push(Math.abs(rtts[i] - rtts[i - 1]));
    }
    return Math.round(differences.reduce((a, b) => a + b, 0) / differences.length);
  }

  public alertSummary(): {
    total: number;
    bySeverity: Record<string, number>;
    byType: Record<string, number>;
    recentCount: number;
    acknowledged: number;
  } {
    const bySeverity: Record<string, number> = {};
    const byType: Record<string, number> = {};
    const now = Date.now();
    const recentCutoff = now - 24 * 60 * 60 * 1000;
    let recentCount = 0;
    for (const alert of this._alerts.values()) {
      bySeverity[alert.severity] = (bySeverity[alert.severity] ?? 0) + 1;
      byType[alert.type] = (byType[alert.type] ?? 0) + 1;
      if (alert.timestamp >= recentCutoff) recentCount++;
    }
    return {
      total: this._alerts.size,
      bySeverity,
      byType,
      recentCount,
      acknowledged: 0,
    };
  }

  public deviceHealthReport(): {
    total: number;
    up: number;
    down: number;
    degraded: number;
    byType: Record<string, { total: number; up: number; down: number; degraded: number }>;
  } {
    const byType: Record<string, { total: number; up: number; down: number; degraded: number }> = {};
    let up = 0;
    let down = 0;
    let degraded = 0;
    for (const node of this._topologyNodes.values()) {
      const stats = byType[node.type] ?? { total: 0, up: 0, down: 0, degraded: 0 };
      stats.total++;
      if (node.status === 'up') { stats.up++; up++; }
      else if (node.status === 'down') { stats.down++; down++; }
      else { stats.degraded++; degraded++; }
      byType[node.type] = stats;
    }
    return { total: this._topologyNodes.size, up, down, degraded, byType };
  }

  public bandwidthUtilizationReport(): { linkId: string; source: string; target: string; utilization: number; saturated: boolean }[] {
    return Array.from(this._topologyLinks.values()).map(link => ({
      linkId: link.id,
      source: link.source,
      target: link.target,
      utilization: link.utilization,
      saturated: link.utilization > 0.85,
    }));
  }

  public topTalkers(limit: number = 10): { srcIp: string; dstIp: string; bytes: number; packets: number }[] {
    const aggregated = new Map<string, { srcIp: string; dstIp: string; bytes: number; packets: number }>();
    for (const flow of this._flowCache.values()) {
      const key = `${flow.srcIp}-${flow.dstIp}`;
      const existing = aggregated.get(key);
      if (existing) {
        existing.bytes += flow.bytes;
        existing.packets += flow.packets;
      } else {
        aggregated.set(key, { srcIp: flow.srcIp, dstIp: flow.dstIp, bytes: flow.bytes, packets: flow.packets });
      }
    }
    return Array.from(aggregated.values()).sort((a, b) => b.bytes - a.bytes).slice(0, limit);
  }

  public metricTimeSeries(metric: keyof NetworkMetrics, window: number = 60): { interface: string; value: number }[] {
    return Array.from(this._metrics.entries())
      .filter(([iface, m]) => m[metric] !== undefined)
      .map(([iface, m]) => ({ interface: iface, value: m[metric] }))
      .slice(-window);
  }

  public averageMetric(metric: keyof NetworkMetrics): number {
    const values = Array.from(this._metrics.values()).map(m => m[metric]).filter((v): v is number => typeof v === 'number');
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  public exportMetrics(format: 'json' | 'csv' | 'prometheus'): string {
    const entries = Array.from(this._metrics.entries());
    if (format === 'csv') {
      const header = 'interface,bandwidth,latency,packetLoss,jitter';
      const rows = entries.map(([iface, m]) => `${iface},${m.bandwidth},${m.latency},${m.packetLoss},${m.jitter}`);
      return [header, ...rows].join('\n');
    }
    if (format === 'prometheus') {
      const lines: string[] = [];
      for (const [iface, m] of entries) {
        lines.push(`network_bandwidth{interface="${iface}"} ${m.bandwidth}`);
        lines.push(`network_latency{interface="${iface}"} ${m.latency}`);
        lines.push(`network_packet_loss{interface="${iface}"} ${m.packetLoss}`);
        lines.push(`network_jitter{interface="${iface}"} ${m.jitter}`);
      }
      return lines.join('\n');
    }
    return JSON.stringify(Object.fromEntries(entries), null, 2);
  }

  public acknowledgeAlert(alertId: string, user: string): boolean {
    const alert = this._alerts.get(alertId);
    if (!alert) return false;
    this._alerts.set(alertId, { ...alert, message: `[ACK:${user}] ${alert.message}` });
    this._recordHistory(`Alert ${alertId} acknowledged by ${user}`);
    return true;
  }

  public clearResolvedAlerts(): number {
    const before = this._alerts.size;
    const now = Date.now();
    for (const [id, alert] of this._alerts.entries()) {
      if (now - alert.timestamp > 7 * 24 * 60 * 60 * 1000) {
        this._alerts.delete(id);
      }
    }
    return before - this._alerts.size;
  }

  public toPacket(): DataPacket<{
    metrics: number;
    devices: number;
    history: string[];
    alerts: number;
    nodes: number;
    links: number;
  }> {
    return {
      id: `net-monitor-${Date.now()}-${this._counter}`,
      payload: {
        metrics: this._metrics.size,
        devices: this._devices.size,
        history: [...this._history],
        alerts: this._alerts.size,
        nodes: this._topologyNodes.size,
        links: this._topologyLinks.size,
      },
      metadata: {
        createdAt: Date.now(),
        route: ['computer_network', 'monitoring', 'result'],
        priority: 0.7,
        phase: 'observation',
      },
    };
  }

  public reset(): void {
    this._metrics.clear();
    this._devices.clear();
    this._history = [];
    this._counter = 0;
    this._alerts.clear();
    this._alertThresholds.clear();
    this._topologyNodes.clear();
    this._topologyLinks.clear();
    this._flowCache.clear();
    this._pingHistory.clear();
    this._tracerouteCache.clear();
    this._collectors.clear();
  }

  private _recordHistory(entry: string): void {
    this._counter++;
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }
}
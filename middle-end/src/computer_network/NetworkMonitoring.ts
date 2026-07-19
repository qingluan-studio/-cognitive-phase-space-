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
}

export class NetworkMonitoring {
  private _metrics: Map<string, NetworkMetrics> = new Map();
  private _devices: SNMPDevice[] = [];
  private _history: string[] = [];
  private _counter = 0;

  get metricCount(): number {
    return this._metrics.size;
  }

  get deviceCount(): number {
    return this._devices.length;
  }

  get history(): string[] {
    return [...this._history];
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

  public toPacket(): DataPacket<{
    metrics: number;
    devices: number;
    history: string[];
  }> {
    return {
      id: `net-monitor-${Date.now()}-${this._counter}`,
      payload: {
        metrics: this._metrics.size,
        devices: this._devices.length,
        history: [...this._history],
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
    this._devices = [];
    this._history = [];
    this._counter = 0;
  }

  private _recordHistory(entry: string): void {
    this._counter++;
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }
}

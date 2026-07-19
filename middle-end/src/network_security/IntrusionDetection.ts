import { DataPacket, PacketMeta } from '../shared/types';

export interface IDSAlert {
  severity: string;
  source: string;
  type: string;
  evidence: unknown;
  time: number;
}

export interface IDSRule {
  id: string;
  pattern: string;
  severity: string;
}

export class IntrusionDetection {
  private _alerts: IDSAlert[] = [];
  private _rules: Map<string, IDSRule> = new Map();
  private _counter = 0;

  signatureBasedDetection(traffic: Record<string, unknown>[], rules: IDSRule[]): IDSAlert[] {
    const alerts: IDSAlert[] = [];
    for (const packet of traffic) {
      const payload = String(packet.payload || '');
      for (const rule of rules) {
        if (payload.includes(rule.pattern)) {
          alerts.push({
            severity: rule.severity,
            source: String(packet.source || 'unknown'),
            type: 'signature_match',
            evidence: { pattern: rule.pattern, packet },
            time: Date.now(),
          });
        }
      }
    }
    this._alerts.push(...alerts);
    return alerts;
  }

  anomalyDetection(traffic: Record<string, unknown>[], baseline: Record<string, number>): IDSAlert[] {
    const alerts: IDSAlert[] = [];
    const stats = this._calculateTrafficStats(traffic);
    for (const [metric, value] of Object.entries(stats)) {
      const base = baseline[metric] || 0;
      if (base > 0 && Math.abs(value - base) / base > 2) {
        alerts.push({
          severity: 'medium',
          source: metric,
          type: 'anomaly',
          evidence: { value, baseline: base, deviation: Math.abs(value - base) / base },
          time: Date.now(),
        });
      }
    }
    this._alerts.push(...alerts);
    return alerts;
  }

  heuristicDetection(traffic: Record<string, unknown>[], heuristics: string[]): IDSAlert[] {
    const alerts: IDSAlert[] = [];
    for (const h of heuristics) {
      if (traffic.length > 100) {
        alerts.push({
          severity: 'low',
          source: 'traffic_volume',
          type: `heuristic_${h}`,
          evidence: { volume: traffic.length },
          time: Date.now(),
        });
        break;
      }
    }
    this._alerts.push(...alerts);
    return alerts;
  }

  misuseDetection(traffic: Record<string, unknown>[], signatures: string[]): IDSAlert[] {
    return this.signatureBasedDetection(traffic, signatures.map((s, i) => ({ id: `sig-${i}`, pattern: s, severity: 'high' })));
  }

  networkIDS(traffic: Record<string, unknown>[], iface: string): IDSAlert[] {
    const alerts: IDSAlert[] = [];
    for (const packet of traffic) {
      if (packet.scanDetected) {
        alerts.push({
          severity: 'high',
          source: String(packet.sourceIp || 'unknown'),
          type: 'port_scan',
          evidence: { interface: iface, packet },
          time: Date.now(),
        });
      }
    }
    this._alerts.push(...alerts);
    return alerts;
  }

  hostBasedIDS(host: string, logs: string[]): IDSAlert[] {
    const alerts: IDSAlert[] = [];
    for (const log of logs) {
      if (log.includes('Failed password') || log.includes('error')) {
        alerts.push({
          severity: 'medium',
          source: host,
          type: 'suspicious_log',
          evidence: { log },
          time: Date.now(),
        });
      }
    }
    this._alerts.push(...alerts);
    return alerts;
  }

  snortRules(rules: IDSRule[], traffic: Record<string, unknown>[]): IDSAlert[] {
    return this.signatureBasedDetection(traffic, rules);
  }

  suricataDetect(traffic: Record<string, unknown>[], rules: IDSRule[]): IDSAlert[] {
    return this.signatureBasedDetection(traffic, rules);
  }

  portScanDetect(traffic: Record<string, unknown>[], threshold: number): IDSAlert[] {
    const portCounts: Record<string, Set<number>> = {};
    for (const packet of traffic) {
      const src = String(packet.sourceIp || 'unknown');
      const port = Number(packet.destPort || 0);
      if (!portCounts[src]) portCounts[src] = new Set();
      portCounts[src].add(port);
    }
    const alerts: IDSAlert[] = [];
    for (const [src, ports] of Object.entries(portCounts)) {
      if (ports.size > threshold) {
        alerts.push({
          severity: 'high',
          source: src,
          type: 'port_scan',
          evidence: { portsScanned: ports.size, threshold },
          time: Date.now(),
        });
      }
    }
    this._alerts.push(...alerts);
    return alerts;
  }

  dosDetect(traffic: Record<string, unknown>[], threshold: number): IDSAlert[] {
    const counts: Record<string, number> = {};
    for (const packet of traffic) {
      const dest = String(packet.destIp || 'unknown');
      counts[dest] = (counts[dest] || 0) + 1;
    }
    const alerts: IDSAlert[] = [];
    for (const [dest, count] of Object.entries(counts)) {
      if (count > threshold) {
        alerts.push({
          severity: 'critical',
          source: dest,
          type: 'dos_attack',
          evidence: { packetCount: count, threshold },
          time: Date.now(),
        });
      }
    }
    this._alerts.push(...alerts);
    return alerts;
  }

  bruteForceDetect(logs: string[], threshold: number): IDSAlert[] {
    const attempts: Record<string, number> = {};
    for (const log of logs) {
      const match = log.match(/from (\d+\.\d+\.\d+\.\d+)/);
      if (match && log.includes('Failed')) {
        const ip = match[1];
        attempts[ip] = (attempts[ip] || 0) + 1;
      }
    }
    const alerts: IDSAlert[] = [];
    for (const [ip, count] of Object.entries(attempts)) {
      if (count > threshold) {
        alerts.push({
          severity: 'high',
          source: ip,
          type: 'brute_force',
          evidence: { attempts: count, threshold },
          time: Date.now(),
        });
      }
    }
    this._alerts.push(...alerts);
    return alerts;
  }

  fileIntegrityCheck(baseline: Record<string, string>, current: Record<string, string>): IDSAlert[] {
    const alerts: IDSAlert[] = [];
    for (const [file, hash] of Object.entries(current)) {
      if (baseline[file] && baseline[file] !== hash) {
        alerts.push({
          severity: 'high',
          source: file,
          type: 'file_modified',
          evidence: { baselineHash: baseline[file], currentHash: hash },
          time: Date.now(),
        });
      }
    }
    this._alerts.push(...alerts);
    return alerts;
  }

  rootkitDetect(system: Record<string, unknown>): IDSAlert[] {
    const alerts: IDSAlert[] = [];
    if (system.hiddenProcesses || system.suspiciousKernelModules) {
      alerts.push({
        severity: 'critical',
        source: String(system.hostname || 'unknown'),
        type: 'rootkit_suspected',
        evidence: system,
        time: Date.now(),
      });
    }
    this._alerts.push(...alerts);
    return alerts;
  }

  honeypot(system: string, attacker: string): IDSAlert[] {
    const alert: IDSAlert = {
      severity: 'high',
      source: attacker,
      type: 'honeypot_triggered',
      evidence: { system, attacker },
      time: Date.now(),
    };
    this._alerts.push(alert);
    return [alert];
  }

  private _calculateTrafficStats(traffic: Record<string, unknown>[]): Record<string, number> {
    return {
      totalPackets: traffic.length,
      uniqueSources: new Set(traffic.map(p => p.sourceIp)).size,
      avgSize: traffic.reduce((s, p) => s + (Number(p.size) || 0), 0) / Math.max(1, traffic.length),
    };
  }

  toPacket(): DataPacket<{
    alerts: IDSAlert[];
    rules: Map<string, IDSRule>;
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['network_security', 'IntrusionDetection'],
      priority: 1,
      phase: 'intrusion_detection',
    };
    return {
      id: `ids-${Date.now().toString(36)}`,
      payload: {
        alerts: this._alerts,
        rules: this._rules,
      },
      metadata,
    };
  }

  reset(): void {
    this._alerts = [];
    this._rules = new Map();
    this._counter = 0;
  }

  get alertCount(): number { return this._alerts.length; }
  get ruleCount(): number { return this._rules.size; }
}

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

export interface ThreatIntelIndicator {
  id: string;
  type: 'ip' | 'domain' | 'url' | 'hash' | 'email' | 'certificate';
  value: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  confidence: number;
  firstSeen: number;
  lastSeen: number;
  tags: string[];
}

export interface MITRETechnique {
  id: string;
  tactic: string;
  techniqueId: string;
  name: string;
  description: string;
  detected: boolean;
  confidence: number;
}

export interface BehaviorBaseline {
  subject: string;
  metric: string;
  mean: number;
  stddev: number;
  sampleCount: number;
  lastUpdated: number;
}

export interface AlertCorrelation {
  correlationId: string;
  alertIds: string[];
  pattern: string;
  confidence: number;
  incidentId?: string;
}

export interface EDRDetection {
  hostId: string;
  processName: string;
  pid: number;
  parentPid: number;
  commandLine: string;
  behavior: string;
  risk: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  mitigated: boolean;
}

export interface ThreatHuntQuery {
  id: string;
  name: string;
  description: string;
  query: string;
  mitreTechnique?: string;
  lastRun?: number;
  matches?: number;
}

export interface IncidentTimelineEntry {
  id: number;
  incidentId: string;
  timestamp: number;
  event: string;
  actor: string;
  phase: 'detection' | 'triage' | 'containment' | 'eradication' | 'recovery' | 'lessons';
}

export interface IOCCollection {
  id: string;
  incidentId: string;
  indicators: ThreatIntelIndicator[];
  collectedAt: number;
  source: string;
}

export interface PacketMetadata {
  timestamp: number;
  sourceIp: string;
  destIp: string;
  sourcePort: number;
  destPort: number;
  protocol: string;
  size: number;
  payload?: string;
  flags?: string[];
  scanDetected?: boolean;
  direction?: 'inbound' | 'outbound';
}

export class IntrusionDetection {
  private _alerts: IDSAlert[] = [];
  private _rules: Map<string, IDSRule> = new Map();
  private _counter = 0;
  private _threatIntel: Map<string, ThreatIntelIndicator> = new Map();
  private _mitreMappings: Map<string, MITRETechnique> = new Map();
  private _baselines: Map<string, BehaviorBaseline> = new Map();
  private _correlations: Map<string, AlertCorrelation> = new Map();
  private _edrDetections: EDRDetection[] = [];
  private _threatHunts: Map<string, ThreatHuntQuery> = new Map();
  private _incidentTimelines: Map<string, IncidentTimelineEntry[]> = new Map();
  private _iocCollections: Map<string, IOCCollection> = new Map();
  private _alertIdCounter = 0;
  private _suppressedAlerts: Set<string> = new Set();
  private _tuningRules: Map<string, { pattern: string; action: 'suppress' | 'escalate' | 'deescalate' }> = new Map();
  private _sensorStatus: Map<string, { online: boolean; lastHeartbeat: number; packetsInspected: number }> = new Map();
  private _quarantineHosts: Set<string> = new Set();

  get alertCount(): number { return this._alerts.length; }
  get ruleCount(): number { return this._rules.size; }
  get threatIntelCount(): number { return this._threatIntel.size; }
  get mitreMappingCount(): number { return this._mitreMappings.size; }
  get baselineCount(): number { return this._baselines.size; }
  get correlationCount(): number { return this._correlations.size; }
  get edrDetectionCount(): number { return this._edrDetections.length; }
  get threatHuntCount(): number { return this._threatHunts.size; }
  get incidentCount(): number { return this._incidentTimelines.size; }
  get iocCollectionCount(): number { return this._iocCollections.size; }
  get suppressedAlertCount(): number { return this._suppressedAlerts.size; }
  get onlineSensors(): number {
    let count = 0;
    for (const sensor of this._sensorStatus.values()) {
      if (sensor.online && Date.now() - sensor.lastHeartbeat < 60000) count++;
    }
    return count;
  }
  get quarantinedHosts(): number { return this._quarantineHosts.size; }
  get criticalAlertCount(): number {
    return this._alerts.filter(a => a.severity === 'critical').length;
  }
  get highAlertCount(): number {
    return this._alerts.filter(a => a.severity === 'high').length;
  }

  signatureBasedDetection(traffic: Record<string, unknown>[], rules: IDSRule[]): IDSAlert[] {
    const alerts: IDSAlert[] = [];
    for (const packet of traffic) {
      const payload = String(packet.payload || '');
      for (const rule of rules) {
        if (payload.includes(rule.pattern)) {
          const alertId = `alert-${++this._alertIdCounter}`;
          if (this._suppressedAlerts.has(alertId)) continue;
          alerts.push({
            severity: rule.severity,
            source: String(packet.source || 'unknown'),
            type: 'signature_match',
            evidence: { alertId, pattern: rule.pattern, packet, ruleId: rule.id },
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

  addThreatIntel(indicator: Omit<ThreatIntelIndicator, 'id' | 'firstSeen' | 'lastSeen'>): ThreatIntelIndicator {
    const id = `ti-${++this._counter}`;
    const now = Date.now();
    const full: ThreatIntelIndicator = { ...indicator, id, firstSeen: now, lastSeen: now };
    this._threatIntel.set(id, full);
    return full;
  }

  queryThreatIntel(query: { type?: string; value?: string; minSeverity?: string }): ThreatIntelIndicator[] {
    const severityOrder = ['low', 'medium', 'high', 'critical'];
    return Array.from(this._threatIntel.values()).filter(i => {
      if (query.type && i.type !== query.type) return false;
      if (query.value && !i.value.includes(query.value)) return false;
      if (query.minSeverity && severityOrder.indexOf(i.severity) < severityOrder.indexOf(query.minSeverity)) return false;
      return true;
    });
  }

  checkAgainstThreatIntel(observations: { type: string; value: string }[]): { matches: number; alerts: IDSAlert[]; indicators: ThreatIntelIndicator[] } {
    const alerts: IDSAlert[] = [];
    const matched: ThreatIntelIndicator[] = [];
    for (const obs of observations) {
      for (const indicator of this._threatIntel.values()) {
        if (indicator.type === obs.type && indicator.value === obs.value) {
          matched.push(indicator);
          alerts.push({
            severity: indicator.severity,
            source: obs.value,
            type: `threat_intel_match_${indicator.type}`,
            evidence: { indicator, observation: obs },
            time: Date.now(),
          });
        }
      }
    }
    this._alerts.push(...alerts);
    return { matches: matched.length, alerts, indicators: matched };
  }

  mapToMITRE(alert: IDSAlert, techniqueId: string): MITRETechnique {
    const technique: MITRETechnique = {
      id: `mitre-${++this._counter}`,
      tactic: this._tacticForTechnique(techniqueId),
      techniqueId,
      name: this._techniqueName(techniqueId),
      description: `MITRE ATT&CK mapping for ${alert.type}`,
      detected: true,
      confidence: 0.85,
    };
    this._mitreMappings.set(technique.id, technique);
    return technique;
  }

  private _tacticForTechnique(techniqueId: string): string {
    const tactics: Record<string, string> = {
      'T1059': 'Execution',
      'T1078': 'Initial Access',
      'T1486': 'Impact',
      'T1003': 'Credential Access',
      'T1567': 'Exfiltration',
      'T1057': 'Discovery',
      'T1071': 'Command and Control',
      'T1136': 'Persistence',
      'T1068': 'Privilege Escalation',
      'T1070': 'Defense Evasion',
      'T1046': 'Discovery',
      'T1558': 'Credential Access',
      'T1485': 'Impact',
    };
    return tactics[techniqueId] ?? 'Unknown';
  }

  private _techniqueName(techniqueId: string): string {
    const names: Record<string, string> = {
      'T1059': 'Command and Scripting Interpreter',
      'T1078': 'Valid Accounts',
      'T1486': 'Data Encrypted for Impact',
      'T1003': 'OS Credential Dumping',
      'T1567': 'Exfiltration Over Web Service',
      'T1057': 'Process Discovery',
      'T1071': 'Application Layer Protocol',
      'T1136': 'Create Account',
      'T1068': 'Exploitation for Privilege Escalation',
      'T1070': 'Indicator Removal',
      'T1046': 'Network Service Discovery',
      'T1558': 'Steal or Forge Kerberos Tickets',
      'T1485': 'Data Destruction',
    };
    return names[techniqueId] ?? `Unknown Technique ${techniqueId}`;
  }

  listMITREMappings(filter?: { tactic?: string; detected?: boolean }): MITRETechnique[] {
    return Array.from(this._mitreMappings.values()).filter(m => {
      if (filter?.tactic && m.tactic !== filter.tactic) return false;
      if (filter?.detected !== undefined && m.detected !== filter.detected) return false;
      return true;
    });
  }

  establishBaseline(subject: string, metric: string, samples: number[]): BehaviorBaseline {
    const mean = samples.reduce((s, v) => s + v, 0) / Math.max(1, samples.length);
    const variance = samples.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / Math.max(1, samples.length);
    const stddev = Math.sqrt(variance);
    const baseline: BehaviorBaseline = {
      subject,
      metric,
      mean,
      stddev,
      sampleCount: samples.length,
      lastUpdated: Date.now(),
    };
    this._baselines.set(`${subject}:${metric}`, baseline);
    return baseline;
  }

  evaluateAgainstBaseline(subject: string, metric: string, observation: number, sensitivity: number = 3): { anomaly: boolean; zscore: number; deviation: number } {
    const baseline = this._baselines.get(`${subject}:${metric}`);
    if (!baseline) return { anomaly: false, zscore: 0, deviation: 0 };
    const zscore = baseline.stddev > 0 ? Math.abs(observation - baseline.mean) / baseline.stddev : 0;
    return {
      anomaly: zscore > sensitivity,
      zscore: Math.round(zscore * 100) / 100,
      deviation: Math.abs(observation - baseline.mean),
    };
  }

  edrDetect(hostId: string, processName: string, pid: number, parentPid: number, commandLine: string, behavior: string, risk: EDRDetection['risk']): EDRDetection {
    const detection: EDRDetection = {
      hostId,
      processName,
      pid,
      parentPid,
      commandLine,
      behavior,
      risk,
      timestamp: Date.now(),
      mitigated: false,
    };
    this._edrDetections.push(detection);
    return detection;
  }

  mitigateEDRDetection(detectionIndex: number, action: string): { mitigated: boolean; action: string } {
    const detection = this._edrDetections[detectionIndex];
    if (!detection) return { mitigated: false, action: 'not_found' };
    detection.mitigated = true;
    return { mitigated: true, action };
  }

  quarantineHost(hostId: string, reason: string): { quarantined: boolean; hostId: string; reason: string } {
    this._quarantineHosts.add(hostId);
    this._recordIncidentEvent(`incident-${hostId}`, 'host_quarantined', 'ids-system', 'containment', reason);
    return { quarantined: true, hostId, reason };
  }

  releaseHost(hostId: string): { released: boolean; hostId: string } {
    return { released: this._quarantineHosts.delete(hostId), hostId };
  }

  isHostQuarantined(hostId: string): boolean {
    return this._quarantineHosts.has(hostId);
  }

  defineThreatHunt(query: Omit<ThreatHuntQuery, 'id'>): ThreatHuntQuery {
    const id = `hunt-${++this._counter}`;
    const full: ThreatHuntQuery = { ...query, id };
    this._threatHunts.set(id, full);
    return full;
  }

  executeThreatHunt(huntId: string, data: Record<string, unknown>[]): { huntId: string; matches: number; sampleMatches: Record<string, unknown>[]; executionTimeMs: number } {
    const hunt = this._threatHunts.get(huntId);
    if (!hunt) return { huntId, matches: 0, sampleMatches: [], executionTimeMs: 0 };
    const start = Date.now();
    const matches = data.filter(d => JSON.stringify(d).includes(hunt.query));
    hunt.lastRun = Date.now();
    hunt.matches = matches.length;
    return {
      huntId,
      matches: matches.length,
      sampleMatches: matches.slice(0, 10),
      executionTimeMs: Date.now() - start,
    };
  }

  correlateAlerts(timeWindow: number = 300000): { correlations: AlertCorrelation[]; correlatedAlerts: number } {
    const correlations: AlertCorrelation[] = [];
    const recent = this._alerts.filter(a => Date.now() - a.time < timeWindow);
    const grouped: Record<string, IDSAlert[]> = {};
    for (const alert of recent) {
      const key = `${alert.source}:${alert.type}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(alert);
    }
    for (const [key, alerts] of Object.entries(grouped)) {
      if (alerts.length >= 3) {
        const correlationId = `corr-${++this._counter}`;
        const correlation: AlertCorrelation = {
          correlationId,
          alertIds: alerts.map(a => (a.evidence as { alertId?: string })?.alertId ?? ''),
          pattern: key,
          confidence: Math.min(1, alerts.length / 10),
        };
        correlations.push(correlation);
        this._correlations.set(correlationId, correlation);
      }
    }
    return { correlations, correlatedAlerts: correlations.reduce((s, c) => s + c.alertIds.length, 0) };
  }

  createIncident(name: string, severity: string, relatedAlerts: IDSAlert[]): { incidentId: string; timeline: IncidentTimelineEntry[] } {
    const incidentId = `incident-${++this._counter}`;
    const timeline: IncidentTimelineEntry[] = [{
      id: ++this._counter,
      incidentId,
      timestamp: Date.now(),
      event: `Incident created: ${name}`,
      actor: 'ids-system',
      phase: 'detection',
    }];
    timeline.push({
      id: ++this._counter,
      incidentId,
      timestamp: Date.now(),
      event: `Triage: ${relatedAlerts.length} alerts associated, severity=${severity}`,
      actor: 'analyst',
      phase: 'triage',
    });
    this._incidentTimelines.set(incidentId, timeline);
    return { incidentId, timeline };
  }

  private _recordIncidentEvent(incidentId: string, event: string, actor: string, phase: IncidentTimelineEntry['phase'], details?: string): void {
    let timeline = this._incidentTimelines.get(incidentId);
    if (!timeline) {
      timeline = [];
      this._incidentTimelines.set(incidentId, timeline);
    }
    timeline.push({
      id: ++this._counter,
      incidentId,
      timestamp: Date.now(),
      event: details ? `${event}: ${details}` : event,
      actor,
      phase,
    });
  }

  advanceIncidentPhase(incidentId: string, phase: IncidentTimelineEntry['phase'], notes: string): { advanced: boolean; phase: string } {
    const timeline = this._incidentTimelines.get(incidentId);
    if (!timeline) return { advanced: false, phase: 'unknown' };
    this._recordIncidentEvent(incidentId, `Phase advanced: ${phase}`, 'analyst', phase, notes);
    return { advanced: true, phase };
  }

  getIncidentTimeline(incidentId: string): IncidentTimelineEntry[] {
    return this._incidentTimelines.get(incidentId) ?? [];
  }

  listIncidents(): { incidentId: string; entryCount: number; firstEvent: number; lastEvent: number; currentPhase: string }[] {
    return Array.from(this._incidentTimelines.entries()).map(([id, timeline]) => ({
      incidentId: id,
      entryCount: timeline.length,
      firstEvent: timeline[0]?.timestamp ?? 0,
      lastEvent: timeline[timeline.length - 1]?.timestamp ?? 0,
      currentPhase: timeline[timeline.length - 1]?.phase ?? 'unknown',
    }));
  }

  collectIOCs(incidentId: string, source: string, indicators: Omit<ThreatIntelIndicator, 'id' | 'firstSeen' | 'lastSeen'>[]): IOCCollection {
    const id = `ioc-${++this._counter}`;
    const now = Date.now();
    const fullIndicators: ThreatIntelIndicator[] = indicators.map(i => ({ ...i, id: `ti-${++this._counter}`, firstSeen: now, lastSeen: now }));
    const collection: IOCCollection = {
      id,
      incidentId,
      indicators: fullIndicators,
      collectedAt: now,
      source,
    };
    this._iocCollections.set(id, collection);
    return collection;
  }

  listIOCCollections(incidentId?: string): IOCCollection[] {
    const all = Array.from(this._iocCollections.values());
    return incidentId ? all.filter(c => c.incidentId === incidentId) : all;
  }

  suppressAlert(alertPattern: string): { suppressed: boolean; pattern: string } {
    this._suppressedAlerts.add(alertPattern);
    return { suppressed: true, pattern: alertPattern };
  }

  unsuppressAlert(alertPattern: string): { unsuppressed: boolean; pattern: string } {
    return { unsuppressed: this._suppressedAlerts.delete(alertPattern), pattern: alertPattern };
  }

  addTuningRule(name: string, pattern: string, action: 'suppress' | 'escalate' | 'deescalate'): { name: string; added: boolean } {
    this._tuningRules.set(name, { pattern, action });
    return { name, added: true };
  }

  registerSensor(sensorId: string): { registered: boolean; sensorId: string } {
    this._sensorStatus.set(sensorId, { online: true, lastHeartbeat: Date.now(), packetsInspected: 0 });
    return { registered: true, sensorId };
  }

  sensorHeartbeat(sensorId: string, packetsInspected: number): { received: boolean; sensorId: string } {
    const sensor = this._sensorStatus.get(sensorId);
    if (!sensor) return { received: false, sensorId };
    sensor.lastHeartbeat = Date.now();
    sensor.online = true;
    sensor.packetsInspected += packetsInspected;
    return { received: true, sensorId };
  }

  markSensorOffline(sensorId: string): { marked: boolean; sensorId: string } {
    const sensor = this._sensorStatus.get(sensorId);
    if (!sensor) return { marked: false, sensorId };
    sensor.online = false;
    return { marked: true, sensorId };
  }

  listSensors(filter?: { online?: boolean }): { sensorId: string; online: boolean; lastHeartbeat: number; packetsInspected: number }[] {
    return Array.from(this._sensorStatus.entries())
      .filter(([_, s]) => filter?.online === undefined || s.online === filter.online)
      .map(([id, s]) => ({ sensorId: id, ...s }));
  }

  mlBasedDetection(features: number[], modelType: 'isolation_forest' | 'autoencoder' | 'one_class_svm' = 'isolation_forest'): { anomalyScore: number; prediction: 'normal' | 'anomaly'; confidence: number } {
    const sum = features.reduce((s, v) => s + v, 0);
    const mean = sum / Math.max(1, features.length);
    const variance = features.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / Math.max(1, features.length);
    const score = Math.min(1, variance / 100);
    return {
      anomalyScore: Math.round(score * 100) / 100,
      prediction: score > 0.5 ? 'anomaly' : 'normal',
      confidence: Math.round((1 - Math.abs(score - 0.5) * 2) * 100) / 100,
    };
  }

  alertStatistics(timeWindow: number = 3600000): {
    total: number;
    bySeverity: Record<string, number>;
    byType: Record<string, number>;
    bySource: Record<string, number>;
    trend: 'increasing' | 'stable' | 'decreasing';
    topSources: { source: string; count: number }[];
  } {
    const now = Date.now();
    const recent = this._alerts.filter(a => now - a.time < timeWindow);
    const bySeverity: Record<string, number> = {};
    const byType: Record<string, number> = {};
    const bySource: Record<string, number> = {};
    for (const alert of recent) {
      bySeverity[alert.severity] = (bySeverity[alert.severity] ?? 0) + 1;
      byType[alert.type] = (byType[alert.type] ?? 0) + 1;
      bySource[alert.source] = (bySource[alert.source] ?? 0) + 1;
    }
    const halfWindow = timeWindow / 2;
    const firstHalf = recent.filter(a => now - a.time > halfWindow).length;
    const secondHalf = recent.length - firstHalf;
    const trend = secondHalf > firstHalf * 1.1 ? 'increasing' : secondHalf < firstHalf * 0.9 ? 'decreasing' : 'stable';
    const topSources = Object.entries(bySource)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    return { total: recent.length, bySeverity, byType, bySource, trend, topSources };
  }

  private _calculateTrafficStats(traffic: Record<string, unknown>[]): Record<string, number> {
    return {
      totalPackets: traffic.length,
      uniqueSources: new Set(traffic.map(p => p.sourceIp)).size,
      avgSize: traffic.reduce((s, p) => s + (Number(p.size) || 0), 0) / Math.max(1, traffic.length),
    };
  }

  exportAlerts(format: 'json' | 'stix' | 'cef' | 'leef'): { format: string; count: number; sample: string } {
    const sample = format === 'json'
      ? JSON.stringify(this._alerts[0] ?? {})
      : format === 'stix'
        ? JSON.stringify({ type: 'indicator', pattern: this._alerts[0]?.type ?? '' })
        : format === 'cef'
          ? `CEF:0|IDS|Engine|1.0|100|${this._alerts[0]?.type ?? 'alert'}|${this._alerts[0]?.severity ?? 'low'}`
          : `LEEF:1.0|IDS|Engine|1.0|${this._alerts[0]?.type ?? 'alert'}`;
    return { format, count: this._alerts.length, sample };
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
    this._threatIntel.clear();
    this._mitreMappings.clear();
    this._baselines.clear();
    this._correlations.clear();
    this._edrDetections = [];
    this._threatHunts.clear();
    this._incidentTimelines.clear();
    this._iocCollections.clear();
    this._alertIdCounter = 0;
    this._suppressedAlerts.clear();
    this._tuningRules.clear();
    this._sensorStatus.clear();
    this._quarantineHosts.clear();
  }
}

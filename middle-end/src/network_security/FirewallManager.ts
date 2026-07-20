import { DataPacket, PacketMeta } from '../shared/types';

export interface FirewallRule {
  id: string;
  action: string;
  source: string;
  dest: string;
  port: number;
  protocol: string;
}

export interface FirewallPolicy {
  name: string;
  rules: FirewallRule[];
  defaultAction: string;
}

export interface ConnectionState {
  connId: string;
  sourceIp: string;
  destIp: string;
  sourcePort: number;
  destPort: number;
  protocol: string;
  state: 'NEW' | 'ESTABLISHED' | 'RELATED' | 'INVALID' | 'CLOSED';
  createdAt: number;
  lastSeen: number;
  bytesSent: number;
  bytesReceived: number;
  packetsSent: number;
  packetsReceived: number;
}

export interface NATRule {
  id: string;
  type: 'SNAT' | 'DNAT' | 'MASQUERADE' | 'REDIRECT';
  source?: string;
  destination?: string;
  translatedSource?: string;
  translatedDestination?: string;
  port?: number;
  translatedPort?: number;
  interface?: string;
}

export interface GeoIPRule {
  id: string;
  countryCode: string;
  action: 'allow' | 'deny' | 'log';
  direction: 'inbound' | 'outbound' | 'both';
  notes?: string;
}

export interface RateLimitRule {
  id: string;
  source: string;
  limit: number;
  window: number;
  action: 'drop' | 'reject' | 'throttle' | 'log';
  burstSize: number;
}

export interface VPNTunnel {
  id: string;
  name: string;
  localEndpoint: string;
  remoteEndpoint: string;
  protocol: 'IKEv1' | 'IKEv2' | 'WireGuard' | 'OpenVPN' | 'IPSec';
  encryption: string;
  authentication: string;
  status: 'up' | 'down' | 'negotiating';
  establishedAt?: number;
  bytesIn: number;
  bytesOut: number;
}

export interface SSLInspectionPolicy {
  id: string;
  name: string;
  decrypt: boolean;
  caCert: string;
  bypassDomains: string[];
  categories: string[];
  enforceCertificateValidation: boolean;
}

export interface FirewallZone {
  id: string;
  name: string;
  interfaces: string[];
  networks: string[];
  defaultAction: 'allow' | 'deny' | 'reject';
  inspectInbound: boolean;
  inspectOutbound: boolean;
}

export interface FirewallLogEntry {
  id: number;
  timestamp: number;
  action: string;
  source: string;
  destination: string;
  port: number;
  protocol: string;
  rule: string;
  interface: string;
  packetSize: number;
  direction: 'inbound' | 'outbound';
}

export interface IPSecPhase {
  phase: 1 | 2;
  encryption: string;
  integrity: string;
  dhGroup: number;
  lifetime: number;
  mode?: 'tunnel' | 'transport';
}

export interface ApplicationRule {
  id: string;
  application: string;
  category: string;
  technology: string;
  risk: 'low' | 'medium' | 'high' | 'critical';
  action: 'allow' | 'deny' | 'monitor';
  bandwidthLimit?: number;
}

export class FirewallManager {
  private _rules: Map<string, FirewallRule> = new Map();
  private _policies: Map<string, FirewallPolicy> = new Map();
  private _counter = 0;
  private _connections: Map<string, ConnectionState> = new Map();
  private _natRules: Map<string, NATRule> = new Map();
  private _geoIpRules: Map<string, GeoIPRule> = new Map();
  private _rateLimitRules: Map<string, RateLimitRule> = new Map();
  private _vpnTunnels: Map<string, VPNTunnel> = new Map();
  private _sslPolicies: Map<string, SSLInspectionPolicy> = new Map();
  private _zones: Map<string, FirewallZone> = new Map();
  private _logs: FirewallLogEntry[] = [];
  private _ipsecPhases: Map<string, IPSecPhase[]> = new Map();
  private _appRules: Map<string, ApplicationRule> = new Map();
  private _ruleOrder: string[] = [];
  private _rateLimitBuckets: Map<string, { count: number; windowStart: number }> = new Map();
  private _blockedIPs: Set<string> = new Set();
  private _allowedIPs: Set<string> = new Set();
  private _macFilters: Map<string, { mac: string; action: string }> = new Map();
  private _arpInspection: Map<string, { interface: string; trusted: boolean }> = new Map();
  private _synCookieEnabled = true;
  private _logRetention = 10000;

  get ruleCount(): number { return this._rules.size; }
  get policyCount(): number { return this._policies.size; }
  get connectionCount(): number { return this._connections.size; }
  get natRuleCount(): number { return this._natRules.size; }
  get geoIpRuleCount(): number { return this._geoIpRules.size; }
  get rateLimitRuleCount(): number { return this._rateLimitRules.size; }
  get vpnTunnelCount(): number { return this._vpnTunnels.size; }
  get sslPolicyCount(): number { return this._sslPolicies.size; }
  get zoneCount(): number { return this._zones.size; }
  get logCount(): number { return this._logs.length; }
  get appRuleCount(): number { return this._appRules.size; }
  get blockedIPCount(): number { return this._blockedIPs.size; }
  get allowedIPCount(): number { return this._allowedIPs.size; }
  get activeVPNTunnels(): number {
    let count = 0;
    for (const tunnel of this._vpnTunnels.values()) {
      if (tunnel.status === 'up') count++;
    }
    return count;
  }
  get establishedConnections(): number {
    let count = 0;
    for (const conn of this._connections.values()) {
      if (conn.state === 'ESTABLISHED') count++;
    }
    return count;
  }

  addRule(rule: Omit<FirewallRule, 'id'>, position?: number): FirewallRule {
    const ruleId = `rule-${++this._counter}`;
    const newRule: FirewallRule = { id: ruleId, ...rule };
    this._rules.set(ruleId, newRule);
    if (position !== undefined && position >= 0 && position <= this._ruleOrder.length) {
      this._ruleOrder.splice(position, 0, ruleId);
    } else {
      this._ruleOrder.push(ruleId);
    }
    return newRule;
  }

  removeRule(ruleId: string): boolean {
    const deleted = this._rules.delete(ruleId);
    if (deleted) {
      this._ruleOrder = this._ruleOrder.filter(id => id !== ruleId);
    }
    return deleted;
  }

  modifyRule(ruleId: string, changes: Partial<FirewallRule>): FirewallRule | null {
    const rule = this._rules.get(ruleId);
    if (!rule) return null;
    Object.assign(rule, changes);
    return rule;
  }

  reorderRule(ruleId: string, newPosition: number): { moved: boolean; oldPosition: number; newPosition: number } {
    const oldPosition = this._ruleOrder.indexOf(ruleId);
    if (oldPosition < 0) return { moved: false, oldPosition: -1, newPosition: -1 };
    this._ruleOrder.splice(oldPosition, 1);
    this._ruleOrder.splice(Math.min(newPosition, this._ruleOrder.length), 0, ruleId);
    return { moved: true, oldPosition, newPosition };
  }

  ruleOrder(rules: FirewallRule[], method: string = 'priority'): FirewallRule[] {
    return [...rules].sort((a, b) => {
      if (method === 'port') return a.port - b.port;
      if (method === 'action') return a.action.localeCompare(b.action);
      return 0;
    });
  }

  getOrderedRules(): FirewallRule[] {
    return this._ruleOrder.map(id => this._rules.get(id)).filter((r): r is FirewallRule => !!r);
  }

  statelessInspection(packet: Record<string, unknown>, rules: FirewallRule[]): { allowed: boolean; matchedRule?: string } {
    for (const rule of rules) {
      if (this._matchPacket(packet, rule)) {
        this._recordLog(packet, rule);
        return { allowed: rule.action === 'allow', matchedRule: rule.id };
      }
    }
    return { allowed: false };
  }

  statefulInspection(packet: Record<string, unknown>, stateTable: Map<string, unknown>): { allowed: boolean; state: string } {
    const connKey = `${packet.sourceIp}-${packet.destIp}-${packet.port}`;
    const state = stateTable.get(connKey);
    if (state) return { allowed: true, state: String(state) };
    return { allowed: false, state: 'new' };
  }

  trackConnection(packet: Record<string, unknown>): ConnectionState {
    const connId = `${packet.sourceIp}-${packet.sourcePort}-${packet.destIp}-${packet.destPort}-${packet.protocol}`;
    let conn = this._connections.get(connId);
    if (!conn) {
      conn = {
        connId,
        sourceIp: String(packet.sourceIp ?? ''),
        destIp: String(packet.destIp ?? ''),
        sourcePort: Number(packet.sourcePort ?? 0),
        destPort: Number(packet.destPort ?? 0),
        protocol: String(packet.protocol ?? 'tcp'),
        state: 'NEW',
        createdAt: Date.now(),
        lastSeen: Date.now(),
        bytesSent: Number(packet.size ?? 0),
        bytesReceived: 0,
        packetsSent: 1,
        packetsReceived: 0,
      };
      this._connections.set(connId, conn);
    } else {
      conn.lastSeen = Date.now();
      conn.packetsSent++;
      conn.bytesSent += Number(packet.size ?? 0);
      if (conn.state === 'NEW') conn.state = 'ESTABLISHED';
    }
    return conn;
  }

  closeConnection(connId: string): { closed: boolean; finalStats: Partial<ConnectionState> | null } {
    const conn = this._connections.get(connId);
    if (!conn) return { closed: false, finalStats: null };
    conn.state = 'CLOSED';
    const stats = { bytesSent: conn.bytesSent, bytesReceived: conn.bytesReceived, packetsSent: conn.packetsSent, packetsReceived: conn.packetsReceived, lastSeen: conn.lastSeen };
    this._connections.delete(connId);
    return { closed: true, finalStats: stats };
  }

  cleanupStaleConnections(timeout: number = 300000): { cleaned: number; remaining: number } {
    const now = Date.now();
    let cleaned = 0;
    for (const [id, conn] of this._connections.entries()) {
      if (now - conn.lastSeen > timeout) {
        this._connections.delete(id);
        cleaned++;
      }
    }
    return { cleaned, remaining: this._connections.size };
  }

  listConnections(filter?: { state?: string; sourceIp?: string; destIp?: string }): ConnectionState[] {
    return Array.from(this._connections.values()).filter(c => {
      if (filter?.state && c.state !== filter.state) return false;
      if (filter?.sourceIp && c.sourceIp !== filter.sourceIp) return false;
      if (filter?.destIp && c.destIp !== filter.destIp) return false;
      return true;
    });
  }

  packetFiltering(packet: Record<string, unknown>, rules: FirewallRule[]): { allowed: boolean; rule?: string } {
    return this.statelessInspection(packet, rules);
  }

  deepPacketInspection(packet: Record<string, unknown>, signatures: string[]): { threat: boolean; matchedSignatures: string[] } {
    const matched: string[] = [];
    const payload = String(packet.payload || '');
    for (const sig of signatures) {
      if (payload.includes(sig)) matched.push(sig);
    }
    return { threat: matched.length > 0, matchedSignatures: matched };
  }

  applicationFirewall(app: string, rules: { pattern: string; action: string }[]): { app: string; rules: number; status: string } {
    return { app, rules: rules.length, status: 'active' };
  }

  webApplicationFirewall(request: Record<string, unknown>, rules: { type: string; pattern: string }[]): { blocked: boolean; reason: string } {
    const path = String(request.path || '');
    const body = String(request.body || '');
    for (const rule of rules) {
      if (path.includes(rule.pattern) || body.includes(rule.pattern)) {
        return { blocked: true, reason: rule.type };
      }
    }
    return { blocked: false, reason: 'none' };
  }

  nextGenFirewall(packet: Record<string, unknown>, features: string[]): { allowed: boolean; inspected: string[] } {
    const inspected: string[] = [];
    for (const f of features) {
      inspected.push(f);
    }
    return { allowed: true, inspected };
  }

  addApplicationRule(rule: Omit<ApplicationRule, 'id'>): ApplicationRule {
    const id = `app-${++this._counter}`;
    const full: ApplicationRule = { ...rule, id };
    this._appRules.set(id, full);
    return full;
  }

  evaluateApplicationRules(packet: Record<string, unknown>, detectedApp: string): { action: string; matchedRule?: ApplicationRule; reason: string } {
    for (const rule of this._appRules.values()) {
      if (rule.application === detectedApp || rule.application === '*') {
        return { action: rule.action, matchedRule: rule, reason: `app_${rule.application}_rule` };
      }
    }
    return { action: 'allow', reason: 'no_match' };
  }

  addNATRule(rule: Omit<NATRule, 'id'>): NATRule {
    const id = `nat-${++this._counter}`;
    const full: NATRule = { ...rule, id };
    this._natRules.set(id, full);
    return full;
  }

  applyNAT(packet: Record<string, unknown>): { translated: boolean; originalSource?: string; translatedSource?: string; rule?: string } {
    for (const [id, rule] of this._natRules.entries()) {
      if (rule.type === 'SNAT' && (!rule.source || packet.sourceIp === rule.source)) {
        return { translated: true, originalSource: String(packet.sourceIp), translatedSource: rule.translatedSource, rule: id };
      }
      if (rule.type === 'DNAT' && (!rule.destination || packet.destIp === rule.destination)) {
        return { translated: true, originalSource: String(packet.destIp), translatedSource: rule.translatedDestination, rule: id };
      }
      if (rule.type === 'MASQUERADE') {
        return { translated: true, originalSource: String(packet.sourceIp), translatedSource: 'egress-ip', rule: id };
      }
    }
    return { translated: false };
  }

  listNATRules(type?: string): NATRule[] {
    const rules = Array.from(this._natRules.values());
    return type ? rules.filter(r => r.type === type) : rules;
  }

  addGeoIPRule(rule: Omit<GeoIPRule, 'id'>): GeoIPRule {
    const id = `geo-${++this._counter}`;
    const full: GeoIPRule = { ...rule, id };
    this._geoIpRules.set(id, full);
    return full;
  }

  evaluateGeoIP(sourceIp: string, sourceCountry: string, direction: 'inbound' | 'outbound'): { allowed: boolean; rule?: string; reason: string } {
    for (const [id, rule] of this._geoIpRules.entries()) {
      if (rule.countryCode === sourceCountry && (rule.direction === direction || rule.direction === 'both')) {
        const allowed = rule.action === 'allow';
        return { allowed, rule: id, reason: `geo_${rule.action}_${sourceCountry}` };
      }
    }
    return { allowed: true, reason: 'no_geo_rule' };
  }

  blockCountries(countryCodes: string[]): { blocked: number; rules: string[] } {
    const rules: string[] = [];
    for (const cc of countryCodes) {
      const rule = this.addGeoIPRule({ countryCode: cc, action: 'deny', direction: 'both', notes: 'bulk_blocked' });
      rules.push(rule.id);
    }
    return { blocked: countryCodes.length, rules };
  }

  addRateLimitRule(rule: Omit<RateLimitRule, 'id'>): RateLimitRule {
    const id = `rate-${++this._counter}`;
    const full: RateLimitRule = { ...rule, id };
    this._rateLimitRules.set(id, full);
    return full;
  }

  enforceRateLimit(sourceIp: string): { allowed: boolean; rule?: string; currentCount: number; limit: number; resetIn: number } {
    for (const [id, rule] of this._rateLimitRules.entries()) {
      if (rule.source === sourceIp || rule.source === '*') {
        const now = Date.now();
        let bucket = this._rateLimitBuckets.get(id);
        if (!bucket || now - bucket.windowStart > rule.window) {
          bucket = { count: 0, windowStart: now };
          this._rateLimitBuckets.set(id, bucket);
        }
        bucket.count++;
        const allowed = bucket.count <= rule.limit + rule.burstSize;
        const resetIn = Math.max(0, rule.window - (now - bucket.windowStart));
        return { allowed, rule: id, currentCount: bucket.count, limit: rule.limit, resetIn };
      }
    }
    return { allowed: true, currentCount: 0, limit: 0, resetIn: 0 };
  }

  blockIP(ip: string, reason?: string): { blocked: boolean; totalBlocked: number; reason?: string } {
    this._blockedIPs.add(ip);
    return { blocked: true, totalBlocked: this._blockedIPs.size, reason };
  }

  unblockIP(ip: string): { unblocked: boolean; totalBlocked: number } {
    return { unblocked: this._blockedIPs.delete(ip), totalBlocked: this._blockedIPs.size };
  }

  allowIP(ip: string): { allowed: boolean; totalAllowed: number } {
    this._allowedIPs.add(ip);
    return { allowed: true, totalAllowed: this._allowedIPs.size };
  }

  isIPBlocked(ip: string): boolean {
    return this._blockedIPs.has(ip);
  }

  isIPAllowed(ip: string): boolean {
    return this._allowedIPs.has(ip);
  }

  createZone(zone: Omit<FirewallZone, 'id'>): FirewallZone {
    const id = `zone-${++this._counter}`;
    const full: FirewallZone = { ...zone, id };
    this._zones.set(id, full);
    return full;
  }

  zoneToZonePolicy(sourceZone: string, destZone: string, action: 'allow' | 'deny' | 'reject'): { applied: boolean; source: string; destination: string; action: string } {
    return { applied: true, source: sourceZone, destination: destZone, action };
  }

  createVPNTunnel(config: Omit<VPNTunnel, 'id' | 'bytesIn' | 'bytesOut' | 'status'>): VPNTunnel {
    const id = `vpn-${++this._counter}`;
    const tunnel: VPNTunnel = {
      ...config,
      id,
      status: 'negotiating',
      bytesIn: 0,
      bytesOut: 0,
    };
    this._vpnTunnels.set(id, tunnel);
    return tunnel;
  }

  bringUpVPNTunnel(tunnelId: string): { tunnelId: string; status: string; establishedAt?: number } {
    const tunnel = this._vpnTunnels.get(tunnelId);
    if (!tunnel) return { tunnelId, status: 'not_found' };
    tunnel.status = 'up';
    tunnel.establishedAt = Date.now();
    return { tunnelId, status: tunnel.status, establishedAt: tunnel.establishedAt };
  }

  bringDownVPNTunnel(tunnelId: string, reason?: string): { tunnelId: string; status: string; reason?: string } {
    const tunnel = this._vpnTunnels.get(tunnelId);
    if (!tunnel) return { tunnelId, status: 'not_found' };
    tunnel.status = 'down';
    return { tunnelId, status: tunnel.status, reason };
  }

  updateVPNTunnelStats(tunnelId: string, bytesIn: number, bytesOut: number): { updated: boolean; totalIn: number; totalOut: number } {
    const tunnel = this._vpnTunnels.get(tunnelId);
    if (!tunnel) return { updated: false, totalIn: 0, totalOut: 0 };
    tunnel.bytesIn += bytesIn;
    tunnel.bytesOut += bytesOut;
    return { updated: true, totalIn: tunnel.bytesIn, totalOut: tunnel.bytesOut };
  }

  configureIPSec(tunnelId: string, phase1: Omit<IPSecPhase, 'phase'>, phase2: Omit<IPSecPhase, 'phase'>): { tunnelId: string; phases: IPSecPhase[] } {
    const phases: IPSecPhase[] = [
      { ...phase1, phase: 1 },
      { ...phase2, phase: 2, mode: 'tunnel' },
    ];
    this._ipsecPhases.set(tunnelId, phases);
    return { tunnelId, phases };
  }

  defineSSLInspectionPolicy(policy: Omit<SSLInspectionPolicy, 'id'>): SSLInspectionPolicy {
    const id = `ssl-${++this._counter}`;
    const full: SSLInspectionPolicy = { ...policy, id };
    this._sslPolicies.set(id, full);
    return full;
  }

  inspectSSL(packet: Record<string, unknown>, serverName: string): { decrypted: boolean; bypassed: boolean; reason: string } {
    for (const policy of this._sslPolicies.values()) {
      if (policy.bypassDomains.some(d => serverName.includes(d))) {
        return { decrypted: false, bypassed: true, reason: 'domain_bypassed' };
      }
      if (policy.decrypt) {
        return { decrypted: true, bypassed: false, reason: 'policy_decrypt' };
      }
    }
    return { decrypted: false, bypassed: false, reason: 'no_policy' };
  }

  addMACFilter(mac: string, action: string): { mac: string; action: string; registered: boolean } {
    this._macFilters.set(mac, { mac, action });
    return { mac, action, registered: true };
  }

  evaluateMACFilter(mac: string): { action: string; mac: string } {
    const filter = this._macFilters.get(mac);
    return { action: filter?.action ?? 'allow', mac };
  }

  enableARPSpoofingProtection(interfaceName: string, trusted: boolean = false): { interface: string; trusted: boolean; enabled: boolean } {
    this._arpInspection.set(interfaceName, { interface: interfaceName, trusted });
    return { interface: interfaceName, trusted, enabled: true };
  }

  enableSynFloodProtection(enabled: boolean): { enabled: boolean; synCookies: boolean } {
    this._synCookieEnabled = enabled;
    return { enabled, synCookies: this._synCookieEnabled };
  }

  ruleOptimization(rules: FirewallRule[]): FirewallRule[] {
    const optimized: FirewallRule[] = [];
    const seen = new Set<string>();
    for (const rule of rules) {
      const key = `${rule.source}-${rule.dest}-${rule.port}-${rule.protocol}`;
      if (!seen.has(key)) {
        seen.add(key);
        optimized.push(rule);
      }
    }
    return optimized;
  }

  conflictDetection(rules: FirewallRule[]): { conflicts: { rule1: string; rule2: string; type: string }[] } {
    const conflicts: { rule1: string; rule2: string; type: string }[] = [];
    for (let i = 0; i < rules.length; i++) {
      for (let j = i + 1; j < rules.length; j++) {
        if (rules[i].source === rules[j].source && rules[i].dest === rules[j].dest
          && rules[i].port === rules[j].port && rules[i].protocol === rules[j].protocol
          && rules[i].action !== rules[j].action) {
          conflicts.push({ rule1: rules[i].id, rule2: rules[j].id, type: 'action_conflict' });
        }
      }
    }
    return { conflicts };
  }

  shadowRules(rules: FirewallRule[]): { shadowed: string[]; shadowing: string } {
    const shadowed: string[] = [];
    for (let i = 1; i < rules.length; i++) {
      if (rules[i].source === rules[0].source && rules[i].dest === rules[0].dest
        && rules[i].action === rules[0].action) {
        shadowed.push(rules[i].id);
      }
    }
    return { shadowed, shadowing: rules[0]?.id || '' };
  }

  ruleCoverageAnalysis(rules: FirewallRule[], observedTraffic: Record<string, unknown>[]): {
    matchedRules: Record<string, number>;
    unmatchedPackets: number;
    coveragePercent: number;
  } {
    const matchedRules: Record<string, number> = {};
    let unmatched = 0;
    for (const packet of observedTraffic) {
      let matched = false;
      for (const rule of rules) {
        if (this._matchPacket(packet, rule)) {
          matchedRules[rule.id] = (matchedRules[rule.id] ?? 0) + 1;
          matched = true;
          break;
        }
      }
      if (!matched) unmatched++;
    }
    const coverage = observedTraffic.length > 0 ? ((observedTraffic.length - unmatched) / observedTraffic.length) * 100 : 0;
    return { matchedRules, unmatchedPackets: unmatched, coveragePercent: Math.round(coverage * 100) / 100 };
  }

  policyComplianceCheck(): {
    totalRules: number;
    redundantRules: number;
    conflictingRules: number;
    shadowedRules: number;
    complianceScore: number;
    recommendations: string[];
  } {
    const rules = this.getOrderedRules();
    const conflicts = this.conflictDetection(rules).conflicts;
    const shadowed = this.shadowRules(rules).shadowed;
    const optimized = this.ruleOptimization(rules);
    const redundant = rules.length - optimized.length;
    const recs: string[] = [];
    if (conflicts.length > 0) recs.push(`resolve_${conflicts.length}_conflicts`);
    if (shadowed.length > 0) recs.push(`remove_${shadowed.length}_shadowed_rules`);
    if (redundant > 0) recs.push(`remove_${redundant}_redundant_rules`);
    const complianceScore = Math.max(0, 100 - conflicts.length * 10 - shadowed.length * 5 - redundant * 2);
    return {
      totalRules: rules.length,
      redundantRules: redundant,
      conflictingRules: conflicts.length,
      shadowedRules: shadowed.length,
      complianceScore,
      recommendations: recs,
    };
  }

  bulkImportRules(rules: Array<Omit<FirewallRule, 'id'>>): { imported: number; skipped: number; ruleIds: string[] } {
    const ruleIds: string[] = [];
    let imported = 0;
    let skipped = 0;
    const seen = new Set<string>();
    for (const rule of rules) {
      const key = `${rule.source}-${rule.dest}-${rule.port}-${rule.protocol}`;
      if (seen.has(key)) {
        skipped++;
        continue;
      }
      seen.add(key);
      const added = this.addRule(rule);
      ruleIds.push(added.id);
      imported++;
    }
    return { imported, skipped, ruleIds };
  }

  exportConfiguration(format: 'json' | 'iptables' | 'cisco-acl' | 'pf'): { format: string; rules: number; sample: string } {
    const rules = this.getOrderedRules();
    let sample = '';
    if (format === 'iptables') {
      sample = rules.slice(0, 3).map(r => `iptables -A ${r.action === 'allow' ? 'ACCEPT' : 'DROP'} -s ${r.source} -d ${r.dest} -p ${r.protocol} --dport ${r.port}`).join('\n');
    } else if (format === 'cisco-acl') {
      sample = rules.slice(0, 3).map(r => `access-list 100 permit ${r.protocol} ${r.source} ${r.dest} eq ${r.port}`).join('\n');
    } else if (format === 'pf') {
      sample = rules.slice(0, 3).map(r => `${r.action === 'allow' ? 'pass' : 'block'} in on \$ext_if proto ${r.protocol} from ${r.source} to ${r.dest} port ${r.port}`).join('\n');
    } else {
      sample = JSON.stringify(rules.slice(0, 1), null, 2);
    }
    return { format, rules: rules.length, sample };
  }

  trafficStatistics(): {
    totalConnections: number;
    activeConnections: number;
    blockedIPs: number;
    vpnTunnelsUp: number;
    bytesProcessed: number;
    avgConnectionDuration: number;
    topTalkers: { ip: string; bytes: number }[];
  } {
    const talkers: Record<string, number> = {};
    let totalBytes = 0;
    let totalDuration = 0;
    const now = Date.now();
    for (const conn of this._connections.values()) {
      const bytes = conn.bytesSent + conn.bytesReceived;
      totalBytes += bytes;
      talkers[conn.sourceIp] = (talkers[conn.sourceIp] ?? 0) + bytes;
      totalDuration += now - conn.createdAt;
    }
    const topTalkers = Object.entries(talkers)
      .map(([ip, bytes]) => ({ ip, bytes }))
      .sort((a, b) => b.bytes - a.bytes)
      .slice(0, 10);
    return {
      totalConnections: this._connections.size,
      activeConnections: this.establishedConnections,
      blockedIPs: this._blockedIPs.size,
      vpnTunnelsUp: this.activeVPNTunnels,
      bytesProcessed: totalBytes,
      avgConnectionDuration: this._connections.size > 0 ? Math.round(totalDuration / this._connections.size) : 0,
      topTalkers,
    };
  }

  private _matchPacket(packet: Record<string, unknown>, rule: FirewallRule): boolean {
    return (packet.sourceIp === rule.source || rule.source === '0.0.0.0/0')
      && (packet.destIp === rule.dest || rule.dest === '0.0.0.0/0')
      && (packet.port === rule.port)
      && (packet.protocol === rule.protocol);
  }

  private _recordLog(packet: Record<string, unknown>, rule: FirewallRule): void {
    this._logs.push({
      id: ++this._counter,
      timestamp: Date.now(),
      action: rule.action,
      source: String(packet.sourceIp ?? ''),
      destination: String(packet.destIp ?? ''),
      port: rule.port,
      protocol: rule.protocol,
      rule: rule.id,
      interface: String(packet.interface ?? 'any'),
      packetSize: Number(packet.size ?? 0),
      direction: packet.direction === 'outbound' ? 'outbound' : 'inbound',
    });
    if (this._logs.length > this._logRetention) this._logs.shift();
  }

  getLogs(filter?: { action?: string; source?: string; since?: number; limit?: number }): FirewallLogEntry[] {
    let filtered = this._logs.filter(entry => {
      if (filter?.action && entry.action !== filter.action) return false;
      if (filter?.source && entry.source !== filter.source) return false;
      if (filter?.since && entry.timestamp < filter.since) return false;
      return true;
    });
    if (filter?.limit) filtered = filtered.slice(-filter.limit);
    return filtered;
  }

  setLogRetention(entries: number): { previous: number; current: number } {
    const previous = this._logRetention;
    this._logRetention = entries;
    if (this._logs.length > entries) {
      this._logs = this._logs.slice(-entries);
    }
    return { previous, current: entries };
  }

  healthCheck(): { healthy: boolean; ruleEngine: boolean; connectionTracker: boolean; vpnSubsystem: boolean; issues: string[] } {
    const issues: string[] = [];
    if (this._ruleOrder.length !== this._rules.size) issues.push('rule_order_mismatch');
    if (this._logs.length >= this._logRetention * 0.95) issues.push('log_buffer_near_full');
    const negotiating = Array.from(this._vpnTunnels.values()).filter(t => t.status === 'negotiating').length;
    if (negotiating > 5) issues.push(`${negotiating}_vpn_tunnels_negotiating`);
    return {
      healthy: issues.length === 0,
      ruleEngine: this._ruleOrder.length === this._rules.size,
      connectionTracker: this._connections.size < 100000,
      vpnSubsystem: negotiating <= 5,
      issues,
    };
  }

  snapshotConfiguration(): { rules: FirewallRule[]; zones: FirewallZone[]; vpnTunnels: VPNTunnel[]; natRules: NATRule[]; timestamp: number } {
    return {
      rules: this.getOrderedRules(),
      zones: Array.from(this._zones.values()),
      vpnTunnels: Array.from(this._vpnTunnels.values()),
      natRules: Array.from(this._natRules.values()),
      timestamp: Date.now(),
    };
  }

  restoreConfiguration(snapshot: { rules: Omit<FirewallRule, 'id'>[]; zones: Omit<FirewallZone, 'id'>[]; vpnTunnels: Omit<VPNTunnel, 'id' | 'bytesIn' | 'bytesOut' | 'status'>[]; natRules: Omit<NATRule, 'id'>[] }): { restored: boolean; counts: { rules: number; zones: number; vpnTunnels: number; natRules: number } } {
    this.reset();
    let ruleCount = 0, zoneCount = 0, vpnCount = 0, natCount = 0;
    for (const rule of snapshot.rules) { this.addRule(rule); ruleCount++; }
    for (const zone of snapshot.zones) { this.createZone(zone); zoneCount++; }
    for (const tunnel of snapshot.vpnTunnels) { this.createVPNTunnel(tunnel); vpnCount++; }
    for (const nat of snapshot.natRules) { this.addNATRule(nat); natCount++; }
    return { restored: true, counts: { rules: ruleCount, zones: zoneCount, vpnTunnels: vpnCount, natRules: natCount } };
  }

  toPacket(): DataPacket<{
    rules: Map<string, FirewallRule>;
    policies: Map<string, FirewallPolicy>;
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['network_security', 'FirewallManager'],
      priority: 1,
      phase: 'firewall_manager',
    };
    return {
      id: `firewall-${Date.now().toString(36)}`,
      payload: {
        rules: this._rules,
        policies: this._policies,
      },
      metadata,
    };
  }

  reset(): void {
    this._rules = new Map();
    this._policies = new Map();
    this._counter = 0;
    this._connections.clear();
    this._natRules.clear();
    this._geoIpRules.clear();
    this._rateLimitRules.clear();
    this._vpnTunnels.clear();
    this._sslPolicies.clear();
    this._zones.clear();
    this._logs = [];
    this._ipsecPhases.clear();
    this._appRules.clear();
    this._ruleOrder = [];
    this._rateLimitBuckets.clear();
    this._blockedIPs.clear();
    this._allowedIPs.clear();
    this._macFilters.clear();
    this._arpInspection.clear();
    this._synCookieEnabled = true;
    this._logRetention = 10000;
  }
}

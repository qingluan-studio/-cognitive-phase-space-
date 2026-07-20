import { DataPacket, PacketMeta } from '../shared/types';

export type SecurityIncidentSeverity = 'low' | 'medium' | 'high' | 'critical';

export type SecurityIncidentType = 
  | 'firewall_violation'
  | 'intrusion_attempt'
  | 'port_scan'
  | 'ddos_attack'
  | 'sql_injection'
  | 'xss_attack'
  | 'phishing_attempt'
  | 'malware_detected'
  | 'data_leak'
  | 'unauthorized_access'
  | 'credential_compromise';

export type FirewallRuleAction = 'allow' | 'deny' | 'log' | 'reject';

export type FirewallRuleProtocol = 'TCP' | 'UDP' | 'ICMP' | 'ANY';

export type VPNProtocol = 'IPsec' | 'OpenVPN' | 'WireGuard' | 'L2TP' | 'PPTP';

export type IPsecMode = 'tunnel' | 'transport';

export type IPsecAlgorithm = 'AES-128' | 'AES-256' | '3DES' | 'ChaCha20';

export type AuthenticationAlgorithm = 'SHA-1' | 'SHA-256' | 'SHA-384' | 'MD5';

export type DDoSMitigationMethod = 'rate_limiting' | 'traffic_shaping' | 'blackholing' | 'anycast' | 'clean_pipe';

export type WebFilteringCategory = 
  | 'adult'
  | 'gambling'
  | 'social_media'
  | 'news'
  | 'business'
  | 'education'
  | 'malicious'
  | 'phishing';

export interface NetworkSecurityInfo {
  readonly policies: string[];
  readonly threats: string[];
  readonly defenses: string[];
  readonly complianceStatus: 'compliant' | 'non-compliant' | 'partial';
}

export interface SecurityIncident {
  readonly id: string;
  readonly type: SecurityIncidentType;
  readonly severity: SecurityIncidentSeverity;
  readonly source: string;
  readonly target: string;
  readonly timestamp: number;
  readonly description: string;
  readonly status: 'detected' | 'investigating' | 'resolved' | 'closed';
  readonly affectedSystems: string[];
  readonly mitigated: boolean;
  readonly reference?: string;
}

export interface FirewallRule {
  readonly id: string;
  readonly name: string;
  readonly action: FirewallRuleAction;
  readonly protocol: FirewallRuleProtocol;
  readonly sourceIP: string;
  readonly sourcePort?: number;
  readonly destinationIP: string;
  readonly destinationPort?: number;
  readonly direction: 'ingress' | 'egress';
  readonly priority: number;
  readonly enabled: boolean;
  readonly createdAt: number;
  readonly lastModified: number;
}

export interface FirewallPolicy {
  readonly id: string;
  readonly name: string;
  readonly rules: FirewallRule[];
  readonly defaultAction: FirewallRuleAction;
  readonly description?: string;
  readonly createdAt: number;
}

export interface VPNConnection {
  readonly id: string;
  readonly client: string;
  readonly server: string;
  readonly protocol: VPNProtocol;
  readonly encryption: string;
  readonly connected: boolean;
  readonly establishedAt: number;
  readonly bytesTransmitted: number;
  readonly bytesReceived: number;
  readonly latency: number;
}

export interface IPSecPolicy {
  readonly id: string;
  readonly name: string;
  readonly mode: IPsecMode;
  readonly encryptionAlgorithm: IPsecAlgorithm;
  readonly authenticationAlgorithm: AuthenticationAlgorithm;
  readonly lifetime: number;
  readonly tunnelIPs: { local: string; remote: string };
  readonly pfsEnabled: boolean;
}

export interface DDoSProtectionConfig {
  readonly id: string;
  readonly name: string;
  readonly methods: DDoSMitigationMethod[];
  readonly rateLimit: number;
  readonly threshold: number;
  readonly blackholeDuration: number;
  readonly enabled: boolean;
}

export interface WebFilteringRule {
  readonly id: string;
  readonly name: string;
  readonly categories: WebFilteringCategory[];
  readonly action: 'block' | 'allow' | 'warn';
  readonly whitelist?: string[];
  readonly blacklist?: string[];
  readonly schedule?: string;
  readonly priority: number;
}

export interface URLFilteringResult {
  readonly url: string;
  readonly allowed: boolean;
  readonly category: WebFilteringCategory;
  readonly reason: string;
  readonly timestamp: number;
}

export interface NetworkSegment {
  readonly id: string;
  readonly name: string;
  readonly zone: 'dmz' | 'internal' | 'external' | 'guest';
  readonly subnet: string;
  readonly vlanId?: number;
  readonly allowedServices: string[];
  readonly isolated: boolean;
}

export interface SSLTLSInspectionConfig {
  readonly id: string;
  readonly name: string;
  readonly enabled: boolean;
  readonly certificateAuthority: string;
  readonly decryptMode: 'full' | 'certificate_only';
  readonly excludedHosts: string[];
  readonly inspectionRules: string[];
}

export interface SSLTLSInspectionResult {
  readonly url: string;
  readonly inspected: boolean;
  readonly certificateValid: boolean;
  readonly threatDetected: boolean;
  readonly threatType?: string;
  readonly cipherSuite: string;
  readonly tlsVersion: string;
}

export interface IntrusionPreventionRule {
  readonly id: string;
  readonly name: string;
  readonly signature: string;
  readonly severity: SecurityIncidentSeverity;
  readonly action: 'block' | 'alert' | 'drop';
  readonly protocol: FirewallRuleProtocol;
  readonly enabled: boolean;
  readonly hits: number;
}

export interface DNSSecurityConfig {
  readonly id: string;
  readonly name: string;
  readonly dnssecEnabled: boolean;
  readonly dnsFilteringEnabled: boolean;
  readonly queryLoggingEnabled: boolean;
  readonly blockCategories: string[];
  readonly whitelistDomains: string[];
  readonly blacklistDomains: string[];
}

export interface DNSQueryResult {
  readonly domain: string;
  readonly resolved: boolean;
  readonly secure: boolean;
  readonly blocked: boolean;
  readonly category?: string;
  readonly responseTime: number;
}

export interface SecurityPolicy {
  readonly id: string;
  readonly name: string;
  readonly type: 'network' | 'application' | 'data' | 'access';
  readonly description: string;
  readonly rules: string[];
  readonly complianceRequirements: string[];
  readonly status: 'active' | 'draft' | 'archived';
  readonly createdAt: number;
  readonly lastModified: number;
}

export interface SecurityEvent {
  readonly id: string;
  readonly type: SecurityIncidentType;
  readonly severity: SecurityIncidentSeverity;
  readonly source: string;
  readonly destination: string;
  readonly protocol: string;
  readonly port?: number;
  readonly timestamp: number;
  readonly action: 'blocked' | 'allowed' | 'alerted';
  readonly details: Record<string, unknown>;
}

export interface SecurityStatistics {
  readonly totalIncidents: number;
  readonly openIncidents: number;
  readonly resolvedIncidents: number;
  readonly blockedPackets: number;
  readonly allowedPackets: number;
  readonly threatsDetected: number;
  readonly threatsBlocked: number;
  readonly avgResponseTime: number;
  readonly complianceScore: number;
}

export class NetworkSecurity {
  private _policies: SecurityPolicy[] = [];
  private _incidents: SecurityIncident[] = [];
  private _firewallRules: Map<string, FirewallRule> = new Map();
  private _firewallPolicies: Map<string, FirewallPolicy> = new Map();
  private _vpnConnections: Map<string, VPNConnection> = new Map();
  private _ipsecPolicies: Map<string, IPSecPolicy> = new Map();
  private _ddosConfigs: Map<string, DDoSProtectionConfig> = new Map();
  private _webFilterRules: Map<string, WebFilteringRule> = new Map();
  private _networkSegments: Map<string, NetworkSegment> = new Map();
  private _sslConfigs: Map<string, SSLTLSInspectionConfig> = new Map();
  private _ipsRules: Map<string, IntrusionPreventionRule> = new Map();
  private _dnsConfigs: Map<string, DNSSecurityConfig> = new Map();
  private _securityEvents: SecurityEvent[] = [];
  private _statistics: SecurityStatistics = {
    totalIncidents: 0,
    openIncidents: 0,
    resolvedIncidents: 0,
    blockedPackets: 0,
    allowedPackets: 0,
    threatsDetected: 0,
    threatsBlocked: 0,
    avgResponseTime: 0,
    complianceScore: 100,
  };
  private _history: string[] = [];
  private _counter = 0;

  get policyCount(): number {
    return this._policies.length;
  }

  get incidentCount(): number {
    return this._incidents.length;
  }

  get history(): string[] {
    return [...this._history];
  }

  get firewallRuleCount(): number {
    return this._firewallRules.size;
  }

  get vpnConnectionCount(): number {
    return this._vpnConnections.size;
  }

  get statistics(): SecurityStatistics {
    return { ...this._statistics };
  }

  firewallRules(rules: FirewallRule[], packet: { srcIP: string; dstIP: string; protocol: string; srcPort?: number; dstPort?: number }): { allowed: boolean; matched: FirewallRule | null; rules: number; action: FirewallRuleAction } {
    const sortedRules = [...rules].sort((a, b) => a.priority - b.priority);
    
    let matched: FirewallRule | null = null;
    for (const rule of sortedRules) {
      if (!rule.enabled) continue;
      
      const protocolMatch = rule.protocol === 'ANY' || rule.protocol === packet.protocol;
      const srcIPMatch = rule.sourceIP === 'ANY' || rule.sourceIP === packet.srcIP || 
        (rule.sourceIP.includes('/') && this._cidrMatch(packet.srcIP, rule.sourceIP));
      const dstIPMatch = rule.destinationIP === 'ANY' || rule.destinationIP === packet.dstIP ||
        (rule.destinationIP.includes('/') && this._cidrMatch(packet.dstIP, rule.destinationIP));
      const srcPortMatch = !rule.sourcePort || rule.sourcePort === packet.srcPort;
      const dstPortMatch = !rule.destinationPort || rule.destinationPort === packet.dstPort;

      if (protocolMatch && srcIPMatch && dstIPMatch && srcPortMatch && dstPortMatch) {
        matched = rule;
        break;
      }
    }

    const action = matched?.action ?? 'allow';
    const allowed = action === 'allow';

    if (!allowed) {
      this._securityEvents.push({
        id: `event-${++this._counter}`,
        type: 'firewall_violation',
        severity: 'medium',
        source: packet.srcIP,
        destination: packet.dstIP,
        protocol: packet.protocol,
        port: packet.dstPort,
        timestamp: Date.now(),
        action: 'blocked',
        details: { ruleId: matched?.id, ruleName: matched?.name },
      });
      this._statistics.blockedPackets++;
    } else {
      this._statistics.allowedPackets++;
    }

    this._recordHistory(`firewall(packet=${packet.srcIP}->${packet.dstIP}) -> ${action}${matched ? ` by ${matched.name}` : ''}`);
    return { allowed, matched, rules: rules.length, action };
  }

  private _cidrMatch(ip: string, cidr: string): boolean {
    const [network, prefix] = cidr.split('/');
    const prefixLen = parseInt(prefix, 10);
    const ipParts = ip.split('.').map(Number);
    const networkParts = network.split('.').map(Number);
    
    for (let i = 0; i < 4; i++) {
      const bitsInOctet = Math.min(8, Math.max(0, prefixLen - i * 8));
      const mask = bitsInOctet === 8 ? 0xFF : bitsInOctet === 0 ? 0x00 : 0xFF << (8 - bitsInOctet);
      if ((ipParts[i] & mask) !== (networkParts[i] & mask)) {
        return false;
      }
    }
    return true;
  }

  addFirewallRule(rule: Omit<FirewallRule, 'id' | 'createdAt' | 'lastModified'>): FirewallRule {
    const now = Date.now();
    const firewallRule: FirewallRule = {
      ...rule,
      id: `fw-rule-${++this._counter}`,
      createdAt: now,
      lastModified: now,
    };

    this._firewallRules.set(firewallRule.id, firewallRule);
    this._recordHistory(`addFirewallRule: ${firewallRule.name} (${firewallRule.action})`);
    return firewallRule;
  }

  updateFirewallRule(ruleId: string, updates: Partial<Omit<FirewallRule, 'id' | 'createdAt'>>): FirewallRule | null {
    const rule = this._firewallRules.get(ruleId);
    if (!rule) return null;

    const updated: FirewallRule = {
      ...rule,
      ...updates,
      lastModified: Date.now(),
    };

    this._firewallRules.set(ruleId, updated);
    this._recordHistory(`updateFirewallRule: ${ruleId}`);
    return updated;
  }

  deleteFirewallRule(ruleId: string): boolean {
    const deleted = this._firewallRules.delete(ruleId);
    if (deleted) {
      this._recordHistory(`deleteFirewallRule: ${ruleId}`);
    }
    return deleted;
  }

  createFirewallPolicy(name: string, rules: FirewallRule[], defaultAction: FirewallRuleAction): FirewallPolicy {
    const policy: FirewallPolicy = {
      id: `fw-policy-${++this._counter}`,
      name,
      rules,
      defaultAction,
      createdAt: Date.now(),
    };

    this._firewallPolicies.set(policy.id, policy);
    rules.forEach(r => this._firewallRules.set(r.id, r));
    this._recordHistory(`createFirewallPolicy: ${name}, ${rules.length} rules`);
    return policy;
  }

  vpnTunnel(client: string, server: string, protocol: VPNProtocol, options?: { encryption?: string; compression?: boolean }): VPNConnection {
    const connection: VPNConnection = {
      id: `vpn-${++this._counter}`,
      client,
      server,
      protocol,
      encryption: options?.encryption ?? 'AES-256-GCM',
      connected: true,
      establishedAt: Date.now(),
      bytesTransmitted: 0,
      bytesReceived: 0,
      latency: Math.floor(Math.random() * 50) + 20,
    };

    this._vpnConnections.set(connection.id, connection);
    this._recordHistory(`VPN tunnel: ${client} <-> ${server} (${protocol})`);
    return connection;
  }

  vpnDisconnect(connectionId: string): { disconnected: boolean; connectionId: string } {
    const connection = this._vpnConnections.get(connectionId);
    if (!connection) {
      return { disconnected: false, connectionId };
    }

    connection.connected = false;
    this._vpnConnections.delete(connectionId);
    this._recordHistory(`VPN disconnect: ${connectionId}`);
    return { disconnected: true, connectionId };
  }

  ipsecPolicy(name: string, traffic: string, mode: IPsecMode, algo: IPsecAlgorithm, authAlgo: AuthenticationAlgorithm): IPSecPolicy {
    const policy: IPSecPolicy = {
      id: `ipsec-${++this._counter}`,
      name,
      mode,
      encryptionAlgorithm: algo,
      authenticationAlgorithm: authAlgo,
      lifetime: 3600,
      tunnelIPs: { local: '10.0.0.1', remote: '10.0.0.2' },
      pfsEnabled: true,
    };

    this._ipsecPolicies.set(policy.id, policy);
    this._recordHistory(`IPSec: ${name}, mode=${mode}, algo=${algo}/${authAlgo}`);
    return policy;
  }

  ipsecNegotiate(policyId: string): { negotiated: boolean; policyId: string; saEstablished: boolean; spi?: number } {
    const policy = this._ipsecPolicies.get(policyId);
    if (!policy) {
      return { negotiated: false, policyId, saEstablished: false };
    }

    const spi = Math.floor(Math.random() * 0xFFFFFF);
    this._recordHistory(`IPSec negotiate: ${policyId}, SPI=${spi}`);
    return { negotiated: true, policyId, saEstablished: true, spi };
  }

  ddosMitigation(traffic: number, method: DDoSMitigationMethod, config?: DDoSProtectionConfig): { traffic: number; method: string; mitigated: number; clean: number; dropped: number } {
    const mitigationRate = method === 'blackholing' ? 0.95 : method === 'rate_limiting' ? 0.8 : 0.7;
    const mitigated = Math.floor(traffic * mitigationRate);
    const clean = traffic - mitigated;
    const dropped = mitigated;

    if (traffic > (config?.threshold ?? 10000)) {
      this._securityEvents.push({
        id: `event-${++this._counter}`,
        type: 'ddos_attack',
        severity: 'critical',
        source: 'unknown',
        destination: 'protected',
        protocol: 'ANY',
        timestamp: Date.now(),
        action: 'blocked',
        details: { traffic, method, dropped },
      });
      this._statistics.threatsDetected++;
      this._statistics.threatsBlocked++;
    }

    this._recordHistory(`DDoS mitigation: traffic=${traffic}, method=${method} -> dropped=${dropped}`);
    return { traffic, method, mitigated, clean, dropped };
  }

  createDDoSProtectionConfig(name: string, methods: DDoSMitigationMethod[], rateLimit: number, threshold: number): DDoSProtectionConfig {
    const config: DDoSProtectionConfig = {
      id: `ddos-${++this._counter}`,
      name,
      methods,
      rateLimit,
      threshold,
      blackholeDuration: 300,
      enabled: true,
    };

    this._ddosConfigs.set(config.id, config);
    this._recordHistory(`createDDoSProtection: ${name}, methods=${methods.join(',')}`);
    return config;
  }

  synFloodDefense(traffic: number, threshold: number, timeout: number = 30): { traffic: number; threshold: number; dropped: number; defended: boolean; synCookiesEnabled: boolean } {
    const dropped = Math.max(0, traffic - threshold);
    const defended = traffic > threshold;
    const synCookiesEnabled = defended;

    if (defended) {
      this._securityEvents.push({
        id: `event-${++this._counter}`,
        type: 'ddos_attack',
        severity: 'high',
        source: 'unknown',
        destination: 'protected',
        protocol: 'TCP',
        port: 80,
        timestamp: Date.now(),
        action: 'blocked',
        details: { type: 'SYN flood', traffic, dropped },
      });
    }

    this._recordHistory(`SYN flood defense: traffic=${traffic}, threshold=${threshold} -> dropped=${dropped}`);
    return { traffic, threshold, dropped, defended, synCookiesEnabled };
  }

  udpFloodDefense(traffic: number, rate: number, burstLimit: number = 1000): { traffic: number; rate: number; burstLimit: number; dropped: number; defended: boolean; rateLimited: boolean } {
    const dropped = Math.max(0, traffic - rate);
    const defended = traffic > rate;
    const rateLimited = traffic > burstLimit;

    if (defended) {
      this._securityEvents.push({
        id: `event-${++this._counter}`,
        type: 'ddos_attack',
        severity: 'high',
        source: 'unknown',
        destination: 'protected',
        protocol: 'UDP',
        timestamp: Date.now(),
        action: 'blocked',
        details: { type: 'UDP flood', traffic, dropped },
      });
    }

    this._recordHistory(`UDP flood defense: traffic=${traffic}, rate=${rate} -> dropped=${dropped}`);
    return { traffic, rate, burstLimit, dropped, defended, rateLimited };
  }

  networkSegmentation(zones: { id: string; name: string; zone: NetworkSegment['zone']; subnet: string; vlanId?: number }[], rules: { from: string; to: string; allowed: boolean; services: string[] }[]): { zones: number; rules: number; isolated: boolean; segments: NetworkSegment[] } {
    const segments: NetworkSegment[] = zones.map(z => ({
      id: z.id,
      name: z.name,
      zone: z.zone,
      subnet: z.subnet,
      vlanId: z.vlanId,
      allowedServices: [],
      isolated: z.zone === 'dmz' || z.zone === 'guest',
    }));

    segments.forEach(s => this._networkSegments.set(s.id, s));
    this._recordHistory(`networkSegmentation(zones=${zones.length}, rules=${rules.length})`);
    return { zones: zones.length, rules: rules.length, isolated: true, segments };
  }

  dmzNetwork(internal: string[], external: string[], dmzServices: string[]): { internal: number; external: number; dmz: string[]; dmzHosts: { name: string; ip: string; services: string[] }[]; secure: boolean } {
    const dmzHosts = [
      { name: 'web-server-1', ip: '192.168.1.10', services: ['HTTP', 'HTTPS'] },
      { name: 'mail-server-1', ip: '192.168.1.11', services: ['SMTP', 'IMAP'] },
      { name: 'load-balancer-1', ip: '192.168.1.12', services: ['HTTP', 'HTTPS'] },
    ];

    this._recordHistory(`DMZ: internal=${internal.length}, external=${external.length}, services=${dmzServices.length}`);
    return { internal: internal.length, external: external.length, dmz: dmzServices, dmzHosts, secure: true };
  }

  sslTlsInspection(urls: string[], certs: string[], config?: SSLTLSInspectionConfig): { inspected: number; certs: number; threats: number; results: SSLTLSInspectionResult[] } {
    const results: SSLTLSInspectionResult[] = [];
    let threats = 0;

    for (const url of urls) {
      const threatDetected = Math.random() > 0.9;
      if (threatDetected) threats++;

      results.push({
        url,
        inspected: true,
        certificateValid: Math.random() > 0.05,
        threatDetected,
        threatType: threatDetected ? 'malware' : undefined,
        cipherSuite: 'TLS_AES_256_GCM_SHA384',
        tlsVersion: 'TLSv1.3',
      });
    }

    if (threats > 0) {
      this._statistics.threatsDetected += threats;
    }

    this._recordHistory(`SSL/TLS inspection: ${urls.length} URLs, ${threats} threats`);
    return { inspected: urls.length, certs: certs.length, threats, results };
  }

  createSSLTLSInspectionConfig(name: string, enabled: boolean, certificateAuthority: string, decryptMode: SSLTLSInspectionConfig['decryptMode']): SSLTLSInspectionConfig {
    const config: SSLTLSInspectionConfig = {
      id: `ssl-${++this._counter}`,
      name,
      enabled,
      certificateAuthority,
      decryptMode,
      excludedHosts: [],
      inspectionRules: [],
    };

    this._sslConfigs.set(config.id, config);
    this._recordHistory(`createSSLTLSInspection: ${name}, mode=${decryptMode}`);
    return config;
  }

  webFiltering(websites: string[], categories: WebFilteringCategory[], policy: 'block' | 'allow'): { allowed: string[]; blocked: string[]; categories: string[]; policy: string; results: URLFilteringResult[] } {
    const allowed: string[] = [];
    const blocked: string[] = [];
    const results: URLFilteringResult[] = [];

    for (const website of websites) {
      const category: WebFilteringCategory = categories[Math.floor(Math.random() * categories.length)];
      const isBlocked = policy === 'block' && (category === 'adult' || category === 'gambling' || category === 'malicious');

      if (isBlocked) {
        blocked.push(website);
      } else {
        allowed.push(website);
      }

      results.push({
        url: website,
        allowed: !isBlocked,
        category,
        reason: isBlocked ? `${category} content` : 'allowed by policy',
        timestamp: Date.now(),
      });
    }

    this._recordHistory(`webFiltering(sites=${websites.length}, cats=${categories.length}) -> blocked=${blocked.length}`);
    return { allowed, blocked, categories: categories.map(c => c), policy, results };
  }

  createWebFilteringRule(name: string, categories: WebFilteringCategory[], action: 'block' | 'allow' | 'warn', priority: number): WebFilteringRule {
    const rule: WebFilteringRule = {
      id: `wf-rule-${++this._counter}`,
      name,
      categories,
      action,
      priority,
    };

    this._webFilterRules.set(rule.id, rule);
    this._recordHistory(`createWebFilteringRule: ${name}, categories=${categories.join(',')}`);
    return rule;
  }

  intrusionPrevention(system: string, signature: string, action: 'block' | 'alert' | 'drop'): { system: string; signature: string; blocked: boolean; detected: number; action: string; rule?: IntrusionPreventionRule } {
    const detected = Math.floor(Math.random() * 5);
    const blocked = detected > 0 && action !== 'alert';

    const rule: IntrusionPreventionRule = {
      id: `ips-${++this._counter}`,
      name: signature,
      signature,
      severity: detected > 3 ? 'critical' : detected > 1 ? 'high' : 'medium',
      action: action as IntrusionPreventionRule['action'],
      protocol: 'TCP',
      enabled: true,
      hits: detected,
    };

    this._ipsRules.set(rule.id, rule);

    if (detected > 0) {
      this._securityEvents.push({
        id: `event-${++this._counter}`,
        type: 'intrusion_attempt',
        severity: rule.severity,
        source: 'unknown',
        destination: system,
        protocol: 'TCP',
        timestamp: Date.now(),
        action: blocked ? 'blocked' : 'alerted',
        details: { signature, detected },
      });
      this._statistics.threatsDetected += detected;
      if (blocked) this._statistics.threatsBlocked += detected;
    }

    this._recordHistory(`IPS: ${system}, sig=${signature} -> ${action}, detected=${detected}`);
    return { system, signature, blocked, detected, action, rule };
  }

  addIPSRule(name: string, signature: string, severity: SecurityIncidentSeverity, action: IntrusionPreventionRule['action'], protocol: FirewallRuleProtocol): IntrusionPreventionRule {
    const rule: IntrusionPreventionRule = {
      id: `ips-rule-${++this._counter}`,
      name,
      signature,
      severity,
      action,
      protocol,
      enabled: true,
      hits: 0,
    };

    this._ipsRules.set(rule.id, rule);
    this._recordHistory(`addIPSRule: ${name}, severity=${severity}`);
    return rule;
  }

  urlFiltering(urls: string[], policy: string, categories?: WebFilteringCategory[]): { allowed: string[]; blocked: string[]; policy: string; results: URLFilteringResult[] } {
    const allowed: string[] = [];
    const blocked: string[] = [];
    const results: URLFilteringResult[] = [];

    for (const url of urls) {
      const isBlocked = Math.random() > 0.7;
      const category = categories?.[Math.floor(Math.random() * (categories?.length ?? 1))] ?? 'malicious';

      if (isBlocked) {
        blocked.push(url);
      } else {
        allowed.push(url);
      }

      results.push({
        url,
        allowed: !isBlocked,
        category,
        reason: isBlocked ? 'blocked by policy' : 'allowed',
        timestamp: Date.now(),
      });
    }

    this._recordHistory(`URL filtering: ${urls.length} URLs, policy=${policy}`);
    return { allowed, blocked, policy, results };
  }

  dnsSecurity(dns: string, dnssec: boolean, config?: DNSSecurityConfig): { dns: string; dnssec: boolean; secure: boolean; validated: number; queriesBlocked: number; results?: DNSQueryResult[] } {
    const validated = dnssec ? 10 : 0;
    const queriesBlocked = dnssec ? Math.floor(Math.random() * 3) : 0;
    const results: DNSQueryResult[] = [];

    for (let i = 0; i < 5; i++) {
      const domain = `test-${i}.example.com`;
      const blocked = Math.random() > 0.8;
      if (blocked) queriesBlocked++;

      results.push({
        domain,
        resolved: !blocked,
        secure: dnssec,
        blocked,
        category: blocked ? 'malicious' : undefined,
        responseTime: Math.floor(Math.random() * 50) + 5,
      });
    }

    this._recordHistory(`DNS security: ${dns}, dnssec=${dnssec}, blocked=${queriesBlocked}`);
    return { dns, dnssec, secure: dnssec, validated, queriesBlocked, results };
  }

  createDNSConfig(name: string, dnssecEnabled: boolean, dnsFilteringEnabled: boolean, blockCategories: string[]): DNSSecurityConfig {
    const config: DNSSecurityConfig = {
      id: `dns-${++this._counter}`,
      name,
      dnssecEnabled,
      dnsFilteringEnabled,
      queryLoggingEnabled: true,
      blockCategories,
      whitelistDomains: [],
      blacklistDomains: [],
    };

    this._dnsConfigs.set(config.id, config);
    this._recordHistory(`createDNSConfig: ${name}, dnssec=${dnssecEnabled}, filtering=${dnsFilteringEnabled}`);
    return config;
  }

  createSecurityPolicy(name: string, type: SecurityPolicy['type'], description: string, rules: string[], complianceRequirements: string[]): SecurityPolicy {
    const policy: SecurityPolicy = {
      id: `policy-${++this._counter}`,
      name,
      type,
      description,
      rules,
      complianceRequirements,
      status: 'active',
      createdAt: Date.now(),
      lastModified: Date.now(),
    };

    this._policies.push(policy);
    this._recordHistory(`createSecurityPolicy: ${name}, type=${type}`);
    return policy;
  }

  updateSecurityPolicy(policyId: string, updates: Partial<Pick<SecurityPolicy, 'rules' | 'complianceRequirements' | 'status'>>): SecurityPolicy | null {
    const policy = this._policies.find(p => p.id === policyId);
    if (!policy) return null;

    Object.assign(policy, updates);
    policy.lastModified = Date.now();
    this._recordHistory(`updateSecurityPolicy: ${policyId}`);
    return policy;
  }

  createIncident(type: SecurityIncidentType, severity: SecurityIncidentSeverity, source: string, target: string, description: string, affectedSystems: string[]): SecurityIncident {
    const incident: SecurityIncident = {
      id: `incident-${++this._counter}`,
      type,
      severity,
      source,
      target,
      timestamp: Date.now(),
      description,
      status: 'detected',
      affectedSystems,
      mitigated: false,
    };

    this._incidents.push(incident);
    this._statistics.totalIncidents++;
    this._statistics.openIncidents++;

    this._securityEvents.push({
      id: `event-${this._counter}`,
      type,
      severity,
      source,
      destination: target,
      protocol: 'ANY',
      timestamp: Date.now(),
      action: 'alerted',
      details: { incidentId: incident.id, description },
    });

    this._recordHistory(`createIncident: ${type}, ${severity}, ${source} -> ${target}`);
    return incident;
  }

  updateIncident(incidentId: string, updates: Partial<Pick<SecurityIncident, 'status' | 'mitigated' | 'description'>>): SecurityIncident | null {
    const incident = this._incidents.find(i => i.id === incidentId);
    if (!incident) return null;

    Object.assign(incident, updates);

    if (incident.status === 'resolved' || incident.status === 'closed') {
      this._statistics.openIncidents--;
      this._statistics.resolvedIncidents++;
    }

    this._recordHistory(`updateIncident: ${incidentId} -> ${incident.status}`);
    return incident;
  }

  getIncidents(filter?: { severity?: SecurityIncidentSeverity; status?: SecurityIncident['status']; type?: SecurityIncidentType }): SecurityIncident[] {
    let incidents = [...this._incidents];

    if (filter?.severity) {
      incidents = incidents.filter(i => i.severity === filter.severity);
    }
    if (filter?.status) {
      incidents = incidents.filter(i => i.status === filter.status);
    }
    if (filter?.type) {
      incidents = incidents.filter(i => i.type === filter.type);
    }

    return incidents;
  }

  getSecurityEvents(limit: number = 20): SecurityEvent[] {
    return [...this._securityEvents].reverse().slice(0, limit);
  }

  getFirewallRules(filter?: { direction?: 'ingress' | 'egress'; action?: FirewallRuleAction }): FirewallRule[] {
    let rules = Array.from(this._firewallRules.values());

    if (filter?.direction) {
      rules = rules.filter(r => r.direction === filter.direction);
    }
    if (filter?.action) {
      rules = rules.filter(r => r.action === filter.action);
    }

    return rules.sort((a, b) => a.priority - b.priority);
  }

  calculateComplianceScore(): number {
    let score = 100;
    
    if (this._firewallRules.size < 10) score -= 10;
    if (this._vpnConnections.size === 0) score -= 10;
    if (!this._ddosConfigs.size) score -= 15;
    if (this._incidents.filter(i => i.status === 'open').length > 5) score -= 20;
    if (!this._dnsConfigs.size) score -= 10;

    this._statistics.complianceScore = Math.max(0, score);
    this._recordHistory(`complianceScore: ${score}%`);
    return score;
  }

  updateStatistics(): void {
    this._statistics.totalIncidents = this._incidents.length;
    this._statistics.openIncidents = this._incidents.filter(i => i.status === 'detected' || i.status === 'investigating').length;
    this._statistics.resolvedIncidents = this._incidents.filter(i => i.status === 'resolved' || i.status === 'closed').length;
    this._statistics.threatsDetected = this._securityEvents.filter(e => e.type !== 'firewall_violation').length;
    this._statistics.threatsBlocked = this._securityEvents.filter(e => e.action === 'blocked').length;
  }

  cleanupStaleEntries(): { incidentsCleaned: number; eventsCleaned: number; rulesCleaned: number } {
    let incidentsCleaned = 0;
    let eventsCleaned = 0;
    let rulesCleaned = 0;
    const now = Date.now();

    const oldIncidents = this._incidents.filter(i => i.status === 'closed' && now - i.timestamp > 86400000 * 30);
    incidentsCleaned = oldIncidents.length;
    this._incidents = this._incidents.filter(i => !(i.status === 'closed' && now - i.timestamp > 86400000 * 30));

    const oldEvents = this._securityEvents.filter(e => now - e.timestamp > 86400000 * 7);
    eventsCleaned = oldEvents.length;
    this._securityEvents = this._securityEvents.filter(e => now - e.timestamp <= 86400000 * 7);

    for (const [id, rule] of this._firewallRules.entries()) {
      if (!rule.enabled && now - rule.lastModified > 86400000 * 90) {
        this._firewallRules.delete(id);
        rulesCleaned++;
      }
    }

    this._recordHistory(`cleanupStaleEntries: incidents=${incidentsCleaned}, events=${eventsCleaned}, rules=${rulesCleaned}`);
    return { incidentsCleaned, eventsCleaned, rulesCleaned };
  }

  toPacket(): DataPacket<{
    policies: number;
    incidents: number;
    openIncidents: number;
    firewallRules: number;
    vpnConnections: number;
    threatsDetected: number;
    threatsBlocked: number;
    complianceScore: number;
    history: string[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['computer_network', 'security', 'result'],
      priority: 0.85,
      phase: 'protection',
    };

    return {
      id: `net-security-${Date.now().toString(36)}-${this._counter}`,
      payload: {
        policies: this._policies.length,
        incidents: this._incidents.length,
        openIncidents: this._incidents.filter(i => i.status === 'detected' || i.status === 'investigating').length,
        firewallRules: this._firewallRules.size,
        vpnConnections: this._vpnConnections.size,
        threatsDetected: this._statistics.threatsDetected,
        threatsBlocked: this._statistics.threatsBlocked,
        complianceScore: this._statistics.complianceScore,
        history: [...this._history],
      },
      metadata,
    };
  }

  reset(): void {
    this._policies = [];
    this._incidents = [];
    this._firewallRules.clear();
    this._firewallPolicies.clear();
    this._vpnConnections.clear();
    this._ipsecPolicies.clear();
    this._ddosConfigs.clear();
    this._webFilterRules.clear();
    this._networkSegments.clear();
    this._sslConfigs.clear();
    this._ipsRules.clear();
    this._dnsConfigs.clear();
    this._securityEvents = [];
    this._statistics = {
      totalIncidents: 0,
      openIncidents: 0,
      resolvedIncidents: 0,
      blockedPackets: 0,
      allowedPackets: 0,
      threatsDetected: 0,
      threatsBlocked: 0,
      avgResponseTime: 0,
      complianceScore: 100,
    };
    this._history = [];
    this._counter = 0;
  }

  private _recordHistory(entry: string): void {
    this._counter++;
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }
}
import { DataPacket } from '../shared/types';

export interface NetworkSecurityInfo {
  readonly policies: string[];
  readonly threats: string[];
  readonly defenses: string[];
}

export interface SecurityIncident {
  readonly id: string;
  readonly type: string;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly source: string;
  readonly target: string;
  readonly timestamp: number;
}

export class NetworkSecurity {
  private _policies: string[] = [];
  private _incidents: SecurityIncident[] = [];
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

  public firewallRules(rules: string[], packet: string): { allowed: boolean; matched: string; rules: number } {
    const matched = rules[0] ?? 'default';
    const allowed = Math.random() > 0.3;
    this._policies = rules;
    this._recordHistory(`firewall(packet=${packet.slice(0, 20)}...) -> ${allowed ? 'ALLOW' : 'DENY'}`);
    return { allowed, matched, rules: rules.length };
  }

  public vpnTunnel(client: string, server: string, protocol: string): { client: string; server: string; protocol: string; encrypted: boolean } {
    this._recordHistory(`VPN tunnel: ${client} <-> ${server} (${protocol})`);
    return { client, server, protocol, encrypted: true };
  }

  public ipsecPolicy(traffic: string, mode: string, algo: string): { traffic: string; mode: string; algorithm: string; secured: boolean } {
    this._recordHistory(`IPSec: mode=${mode}, algo=${algo}`);
    return { traffic, mode, algorithm: algo, secured: true };
  }

  public ddosMitigation(traffic: number, method: string): { traffic: number; method: string; mitigated: number; clean: number } {
    const mitigated = Math.floor(traffic * 0.9);
    const clean = traffic - mitigated;
    this._recordHistory(`DDoS mitigation: traffic=${traffic}, method=${method} -> clean=${clean}`);
    return { traffic, method, mitigated, clean };
  }

  public synFloodDefense(traffic: number, threshold: number): { traffic: number; threshold: number; dropped: number; defended: boolean } {
    const dropped = Math.max(0, traffic - threshold);
    const defended = traffic > threshold;
    this._recordHistory(`SYN flood defense: traffic=${traffic}, threshold=${threshold} -> dropped=${dropped}`);
    return { traffic, threshold, dropped, defended };
  }

  public udpFloodDefense(traffic: number, rate: number): { traffic: number; rate: number; dropped: number; defended: boolean } {
    const dropped = Math.max(0, traffic - rate);
    const defended = traffic > rate;
    this._recordHistory(`UDP flood defense: traffic=${traffic}, rate=${rate} -> dropped=${dropped}`);
    return { traffic, rate, dropped, defended };
  }

  public networkSegmentation(zones: string[], rules: string[]): { zones: number; rules: number; isolated: boolean } {
    this._recordHistory(`networkSegmentation(zones=${zones.length}, rules=${rules.length})`);
    return { zones: zones.length, rules: rules.length, isolated: true };
  }

  public dmzNetwork(internal: string[], external: string[]): { internal: number; external: number; dmz: string[]; secure: boolean } {
    const dmz = ['web-server-1', 'mail-server-1'];
    this._recordHistory(`DMZ: internal=${internal.length}, external=${external.length}`);
    return { internal: internal.length, external: external.length, dmz, secure: true };
  }

  public sslTlsInspection(traffic: string[], certs: string[]): { inspected: number; certs: number; threats: number } {
    const inspected = traffic.length;
    const threats = Math.floor(traffic.length * 0.05);
    this._recordHistory(`SSL/TLS inspection: traffic=${traffic.length}, certs=${certs.length} -> threats=${threats}`);
    return { inspected, certs: certs.length, threats };
  }

  public webFiltering(websites: string[], categories: string[]): { allowed: string[]; blocked: string[]; categories: string[] } {
    const allowed = websites.slice(0, Math.floor(websites.length * 0.8));
    const blocked = websites.slice(Math.floor(websites.length * 0.8));
    this._recordHistory(`webFiltering(sites=${websites.length}, cats=${categories.length}) -> blocked=${blocked.length}`);
    return { allowed, blocked, categories };
  }

  public intrusionPrevention(system: string, signature: string): { system: string; signature: string; blocked: boolean; detected: number } {
    const detected = Math.floor(Math.random() * 5);
    const blocked = detected > 0;
    this._recordHistory(`IPS: system=${system}, sig=${signature} -> blocked=${blocked}`);
    return { system, signature, blocked, detected };
  }

  public urlFiltering(urls: string[], policy: string): { allowed: string[]; blocked: string[]; policy: string } {
    const allowed = urls.slice(0, Math.floor(urls.length * 0.7));
    const blocked = urls.slice(Math.floor(urls.length * 0.7));
    this._recordHistory(`URL filtering: urls=${urls.length}, policy=${policy}`);
    return { allowed, blocked, policy };
  }

  public dnsSecurity(dns: string, dnssec: boolean): { dns: string; dnssec: boolean; secure: boolean; validated: number } {
    const validated = dnssec ? 10 : 0;
    this._recordHistory(`DNS security: dns=${dns}, dnssec=${dnssec}`);
    return { dns, dnssec, secure: dnssec, validated };
  }

  public toPacket(): DataPacket<{
    policies: number;
    incidents: number;
    history: string[];
  }> {
    return {
      id: `net-security-${Date.now()}-${this._counter}`,
      payload: {
        policies: this._policies.length,
        incidents: this._incidents.length,
        history: [...this._history],
      },
      metadata: {
        createdAt: Date.now(),
        route: ['computer_network', 'security', 'result'],
        priority: 0.85,
        phase: 'protection',
      },
    };
  }

  public reset(): void {
    this._policies = [];
    this._incidents = [];
    this._history = [];
    this._counter = 0;
  }

  private _recordHistory(entry: string): void {
    this._counter++;
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }
}

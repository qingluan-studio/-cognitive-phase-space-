import { DataPacket } from '../shared/types';

export interface IoTSecurityInfo {
  readonly deviceAuth: string;
  readonly dataSecurity: string;
  readonly networkSec: string;
  readonly compliance: string[];
}

export interface DeviceIdentity {
  readonly deviceId: string;
  readonly identity: string;
  readonly type: string;
  readonly issuedAt: number;
  readonly expiresAt: number;
}

export class IoTSecurity {
  private _security: IoTSecurityInfo | null = null;
  private _identities: Map<string, DeviceIdentity> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get securityMode(): string {
    return this._security?.deviceAuth ?? 'none';
  }

  get identityCount(): number {
    return this._identities.size;
  }

  get history(): string[] {
    return [...this._history];
  }

  public deviceAuthentication(device: string, method: string, credentials: string): { device: string; method: string; authenticated: boolean; level: string } {
    const authenticated = Math.random() > 0.1;
    const level = method === 'x509' ? 'high' : method === 'token' ? 'medium' : 'low';
    this._recordHistory(`deviceAuth(device=${device}, method=${method}) -> ${authenticated}`);
    return { device, method, authenticated, level };
  }

  public x509Certificate(device: string, cert: string, key: string): { device: string; cert: string; valid: boolean; expires: number } {
    const valid = Math.random() > 0.05;
    const expires = Date.now() + 365 * 24 * 60 * 60 * 1000;
    this._identities.set(device, { deviceId: device, identity: cert, type: 'x509', issuedAt: Date.now(), expiresAt: expires });
    this._recordHistory(`x509Certificate(device=${device}) -> valid=${valid}`);
    return { device, cert, valid, expires };
  }

  public preSharedKey(device: string, key: string): { device: string; key: string; secure: boolean; rotated: boolean } {
    const secure = key.length >= 32;
    const rotated = Math.random() > 0.5;
    this._recordHistory(`preSharedKey(device=${device}) -> secure=${secure}`);
    return { device, key, secure, rotated };
  }

  public tokenAuthentication(device: string, token: string, expires: number): { device: string; token: string; valid: boolean; expires: number } {
    const valid = Math.random() > 0.1;
    this._recordHistory(`tokenAuth(device=${device}) -> valid=${valid}`);
    return { device, token, valid, expires };
  }

  public dataEncryption(data: string, method: string, key: string): { encrypted: string; method: string; key: string; secure: boolean } {
    const encrypted = btoa(data + key);
    const secure = method === 'AES-256' || method === 'ChaCha20';
    this._recordHistory(`dataEncryption(method=${method}) -> secure=${secure}`);
    return { encrypted, method, key, secure };
  }

  public messageIntegrity(message: string, hmac: string, key: string): { message: string; hmac: string; verified: boolean; algorithm: string } {
    const verified = Math.random() > 0.05;
    this._recordHistory(`messageIntegrity(algo=${hmac}) -> verified=${verified}`);
    return { message, hmac, verified, algorithm: hmac };
  }

  public secureBoot(device: string, firmware: string, signature: string): { device: string; firmware: string; verified: boolean; trusted: boolean } {
    const verified = Math.random() > 0.02;
    const trusted = verified;
    this._recordHistory(`secureBoot(device=${device}) -> verified=${verified}`);
    return { device, firmware, verified, trusted };
  }

  public secureFirmwareUpdate(device: string, image: string, signature: string): { device: string; image: string; verified: boolean; installed: boolean } {
    const verified = Math.random() > 0.05;
    const installed = verified;
    this._recordHistory(`secureFirmwareUpdate(device=${device}) -> verified=${verified}`);
    return { device, image, verified, installed };
  }

  public secureProvisioning(device: string, factory: string, method: string): { device: string; factory: string; method: string; provisioned: boolean } {
    this._recordHistory(`secureProvisioning(device=${device}, method=${method})`);
    return { device, factory, method, provisioned: true };
  }

  public accessControl(device: string, user: string, permissions: string[]): { device: string; user: string; permissions: string[]; allowed: boolean } {
    const allowed = permissions.length > 0;
    this._recordHistory(`accessControl(device=${device}, user=${user}) -> allowed=${allowed}`);
    return { device, user, permissions, allowed };
  }

  public threatDetection(device: string, behavior: string, baseline: string): { device: string; threat: boolean; severity: string; confidence: number } {
    const threat = Math.random() > 0.8;
    const severity = threat ? (Math.random() > 0.5 ? 'high' : 'medium') : 'none';
    const confidence = 0.7 + Math.random() * 0.3;
    this._recordHistory(`threatDetection(device=${device}) -> threat=${threat}, severity=${severity}`);
    return { device, threat, severity, confidence };
  }

  public vulnerabilityScanner(devices: string[], database: string): { scanned: number; vulnerable: number; critical: number; database: string } {
    const scanned = devices.length;
    const vulnerable = Math.floor(devices.length * 0.2);
    const critical = Math.floor(vulnerable * 0.3);
    this._recordHistory(`vulnScanner(devices=${devices.length}, db=${database}) -> vulnerable=${vulnerable}`);
    return { scanned, vulnerable, critical, database };
  }

  public toPacket(): DataPacket<{
    securityMode: string;
    identities: number;
    history: string[];
  }> {
    return {
      id: `iot-security-${Date.now()}-${this._counter}`,
      payload: {
        securityMode: this._security?.deviceAuth ?? 'none',
        identities: this._identities.size,
        history: [...this._history],
      },
      metadata: {
        createdAt: Date.now(),
        route: ['iot', 'security', 'result'],
        priority: 0.85,
        phase: 'protection',
      },
    };
  }

  public reset(): void {
    this._security = null;
    this._identities.clear();
    this._history = [];
    this._counter = 0;
  }

  private _recordHistory(entry: string): void {
    this._counter++;
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }
}

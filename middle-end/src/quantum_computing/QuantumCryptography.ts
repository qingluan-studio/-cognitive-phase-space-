import { DataPacket } from '../shared/types';

/** A quantum key distribution protocol specification. */
export interface QKDProtocol {
  readonly name: string;
  readonly keyRate: number;
  readonly distance: number;
  readonly security: string;
}

/** A photon with polarization and measurement basis. */
export interface PhotonState {
  readonly polarization: 0 | 45 | 90 | 135;
  readonly basis: 'rectilinear' | 'diagonal';
  readonly qubit: number;
}

/** A key exchange transcript between parties. */
export interface KeyExchange {
  readonly alice: string;
  readonly bob: string;
  readonly key: string;
  readonly length: number;
  readonly errorRate: number;
}

/** Result of a BB84 protocol execution. */
export interface QKDResult {
  readonly key: string;
  readonly length: number;
  readonly errorRate: number;
  readonly secure: boolean;
  finalKeyBits: number;
}

export class QuantumCryptography {
  private _protocols: Map<string, QKDProtocol> = new Map();
  private _photons: PhotonState[] = [];
  private _keys: KeyExchange[] = [];
  private _history: string[] = [];
  private _counter = 0;

  constructor() {
    this._initializeProtocols();
  }

  get protocolCount(): number {
    return this._protocols.size;
  }

  get photonCount(): number {
    return this._photons.length;
  }

  get keyCount(): number {
    return this._keys.length;
  }

  get history(): string[] {
    return [...this._history];
  }

  private _initializeProtocols(): void {
    this._protocols.set('BB84', { name: 'BB84', keyRate: 0.5, distance: 100, security: 'information-theoretic' });
    this._protocols.set('E91', { name: 'E91', keyRate: 0.3, distance: 50, security: 'entanglement-based' });
    this._protocols.set('B92', { name: 'B92', keyRate: 0.25, distance: 80, security: 'information-theoretic' });
    this._protocols.set('SARG04', { name: 'SARG04', keyRate: 0.4, distance: 90, security: 'information-theoretic' });
  }

  public bb84(length: number, errorRate: number): QKDResult {
    const photons = this._generatePhotons(length);
    const sifted = photons.filter(p => Math.random() > errorRate);
    const key = sifted.map(() => (Math.random() > 0.5 ? '1' : '0')).join('');
    const secure = errorRate < 0.11;
    const result: QKDResult = {
      key,
      length: key.length,
      errorRate,
      secure,
      finalKeyBits: Math.floor(key.length * (1 - 2 * errorRate)),
    };
    this._keys.push({ alice: 'Alice', bob: 'Bob', key, length: key.length, errorRate });
    this._recordHistory(`bb84(len=${length}, err=${errorRate})`);
    return result;
  }

  public e91(entropy: number, bellPairs: number): QKDResult {
    const keyLength = Math.floor(bellPairs * (1 - entropy));
    const key = Array.from({ length: keyLength }, () => (Math.random() > 0.5 ? '1' : '0')).join('');
    const errorRate = entropy * 0.5;
    const result: QKDResult = {
      key,
      length: key.length,
      errorRate,
      secure: entropy < 0.2,
      finalKeyBits: Math.floor(key.length * (1 - 2 * errorRate)),
    };
    this._recordHistory(`e91(pairs=${bellPairs}, H=${entropy.toFixed(3)})`);
    return result;
  }

  public b92(length: number): QKDResult {
    const key = Array.from({ length: Math.floor(length * 0.25) }, () => (Math.random() > 0.5 ? '1' : '0')).join('');
    const result: QKDResult = {
      key,
      length: key.length,
      errorRate: 0.05,
      secure: true,
      finalKeyBits: key.length,
    };
    this._recordHistory(`b92(len=${length})`);
    return result;
  }

  public sARG04(length: number): QKDResult {
    const key = Array.from({ length: Math.floor(length * 0.4) }, () => (Math.random() > 0.5 ? '1' : '0')).join('');
    const result: QKDResult = {
      key,
      length: key.length,
      errorRate: 0.04,
      secure: true,
      finalKeyBits: key.length,
    };
    this._recordHistory(`sARG04(len=${length})`);
    return result;
  }

  public generateKey(bits: number, protocol: string): { key: string; bits: number; protocol: string } {
    const key = Array.from({ length: bits }, () => (Math.random() > 0.5 ? '1' : '0')).join('');
    this._recordHistory(`generateKey(bits=${bits}, proto=${protocol})`);
    return { key, bits, protocol };
  }

  public photonSource(polarization: PhotonState['polarization'], basis: PhotonState['basis']): PhotonState {
    const photon: PhotonState = { polarization, basis, qubit: this._photons.length };
    this._photons.push(photon);
    return photon;
  }

  public photonDetect(photon: PhotonState, basis: PhotonState['basis']): { detected: boolean; bit: 0 | 1; matched: boolean } {
    const matched = photon.basis === basis;
    const detected = matched || Math.random() > 0.5;
    const bit: 0 | 1 = (matched ? photon.polarization % 90 === 0 : Math.random() > 0.5) ? 0 : 1;
    this._recordHistory(`photonDetect(matched=${matched})`);
    return { detected, bit, matched };
  }

  public sifting(alice: PhotonState[], bob: PhotonState[]): { sifted: number[]; matches: number } {
    const sifted: number[] = [];
    const n = Math.min(alice.length, bob.length);
    for (let i = 0; i < n; i++) {
      if (alice[i].basis === bob[i].basis) {
        sifted.push(i);
      }
    }
    this._recordHistory(`sifting(sifted=${sifted.length})`);
    return { sifted, matches: sifted.length };
  }

  public errorEstimate(sample: number[]): { errorRate: number; sampled: number } {
    const errors = sample.filter(s => Math.random() > 0.9).length;
    const errorRate = sample.length > 0 ? errors / sample.length : 0;
    this._recordHistory(`errorEstimate(rate=${errorRate.toFixed(3)})`);
    return { errorRate, sampled: sample.length };
  }

  public reconciliation(key: string, error: number): { key: string; corrected: number; error: number } {
    const corrected = Math.floor(key.length * error);
    const newKey = key.slice(corrected);
    this._recordHistory(`reconciliation(err=${error.toFixed(3)})`);
    return { key: newKey, corrected, error };
  }

  public privacyAmplification(key: string, leakage: number): { key: string; compressed: number; leakage: number } {
    const compressed = Math.floor(key.length * leakage);
    const newKey = key.slice(0, key.length - compressed);
    this._recordHistory(`privacyAmplification(leak=${leakage.toFixed(3)})`);
    return { key: newKey, compressed, leakage };
  }

  public entanglementBasedQKD(bellPairs: number): { key: string; pairs: number; secure: boolean } {
    const key = Array.from({ length: bellPairs }, () => (Math.random() > 0.5 ? '1' : '0')).join('');
    this._recordHistory(`entanglementBasedQKD(pairs=${bellPairs})`);
    return { key, pairs: bellPairs, secure: true };
  }

  public quantumRepeater(distance: number, segments: number): { fidelity: number; latency: number; segments: number } {
    const fidelity = Math.exp(-distance / (segments * 100));
    const latency = segments * 10;
    this._recordHistory(`quantumRepeater(dist=${distance}, segs=${segments})`);
    return { fidelity, latency, segments };
  }

  public pnsAttack(key: string, detector: { threshold: number }): { compromised: number; detected: boolean; key: string } {
    const compromised = Math.floor(key.length * detector.threshold);
    const detected = Math.random() > 0.7;
    this._recordHistory(`pnsAttack(comp=${compromised})`);
    return { compromised, detected, key };
  }

  public keys(): KeyExchange[] {
    return this._keys.map(k => ({ ...k }));
  }

  private _generatePhotons(n: number): PhotonState[] {
    const photons: PhotonState[] = [];
    const polarizations: PhotonState['polarization'][] = [0, 45, 90, 135];
    for (let i = 0; i < n; i++) {
      const polarization = polarizations[Math.floor(Math.random() * 4)];
      const basis: PhotonState['basis'] = Math.random() > 0.5 ? 'rectilinear' : 'diagonal';
      photons.push({ polarization, basis, qubit: i });
    }
    this._photons.push(...photons);
    return photons;
  }

  public summary(): { protocols: number; photons: number; keys: number; historyLength: number } {
    return {
      protocols: this._protocols.size,
      photons: this._photons.length,
      keys: this._keys.length,
      historyLength: this._history.length,
    };
  }

  public toJSON(): Record<string, unknown> {
    return {
      protocols: Array.from(this._protocols.keys()),
      photons: this._photons.length,
      keys: this._keys.length,
      history: [...this._history],
      counter: this._counter,
    };
  }

  public validate(): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    if (this._protocols.size === 0) issues.push('no protocols registered');
    for (const key of this._keys) {
      if (key.errorRate > 0.11) issues.push(`key ${key.alice}-${key.bob} exceeds error threshold`);
    }
    return { valid: issues.length === 0, issues };
  }

  public quantumMoney(bank: string, serial: string): { valid: boolean; bank: string; serial: string; verifiable: boolean } {
    const valid = Math.random() > 0.1;
    this._recordHistory(`quantumMoney(bank=${bank}, serial=${serial})`);
    return { valid, bank, serial, verifiable: true };
  }

  public positionBasedCryptography(position: [number, number, number], challenge: string): { authenticated: boolean; position: number[]; challenge: string } {
    const authenticated = Math.random() > 0.2;
    this._recordHistory(`positionBasedCryptography(authenticated=${authenticated})`);
    return { authenticated, position: [...position], challenge };
  }

  public deviceIndependentQKD(statistics: { violation: number }): { secure: boolean; violation: number; keyRate: number } {
    const secure = statistics.violation > 2;
    const keyRate = secure ? (statistics.violation - 2) * 0.1 : 0;
    this._recordHistory(`deviceIndependentQKD(violation=${statistics.violation.toFixed(3)})`);
    return { secure, violation: statistics.violation, keyRate };
  }

  public covertChannel(capacity: number, covertness: number): { bits: number; detectable: boolean; capacity: number } {
    const bits = Math.floor(capacity * covertness);
    const detectable = covertness < 0.5;
    this._recordHistory(`covertChannel(bits=${bits})`);
    return { bits, detectable, capacity };
  }

  public lastKey(): KeyExchange | null {
    return this._keys.length > 0 ? { ...this._keys[this._keys.length - 1] } : null;
  }

  private _recordHistory(entry: string): void {
    this._counter++;
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }

  public toPacket(): DataPacket<{
    protocols: number;
    photons: number;
    keys: number;
    history: string[];
  }> {
    return {
      id: `qcrypt-${Date.now()}-${this._counter}`,
      payload: {
        protocols: this._protocols.size,
        photons: this._photons.length,
        keys: this._keys.length,
        history: [...this._history],
      },
      metadata: {
        createdAt: Date.now(),
        route: ['quantum_computing', 'cryptography', 'result'],
        priority: 0.95,
        phase: 'security',
      },
    };
  }

  public reset(): void {
    this._protocols.clear();
    this._initializeProtocols();
    this._photons = [];
    this._keys = [];
    this._history = [];
    this._counter = 0;
  }
}

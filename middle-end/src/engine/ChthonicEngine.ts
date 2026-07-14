export type SteganographicEncoding = 'lsb' | 'semantic' | 'timing' | 'metadata';

export interface SteganographicPayload {
  id: string;
  carrier: string;
  hidden: Record<string, unknown>;
  encoding: SteganographicEncoding;
  embeddedAt: number;
}

export type NegotiationStatus = 'pending' | 'agreed' | 'broken';

export interface HiddenNegotiation {
  id: string;
  participants: string[];
  terms: Record<string, unknown>;
  status: NegotiationStatus;
  startedAt: number;
  settledAt: number | null;
}

export interface CovertChannel {
  id: string;
  name: string;
  capacity: number;
  active: boolean;
  payloads: number;
}

interface StegEncoding { bits: string; entropy: number; }
interface NegState { utilities: Map<string, number[]>; strategy: number[]; }

export class ChthonicEngine {
  private _payloads: Map<string, SteganographicPayload> = new Map();
  private _negotiations: Map<string, HiddenNegotiation> = new Map();
  private _channels: Map<string, CovertChannel> = new Map();
  private _encodings: Map<string, StegEncoding> = new Map();
  private _negStates: Map<string, NegState> = new Map();
  private _idCounter = 0;
  private _detectionLog: string[] = [];
  private _signalWindow: string[] = [];
  private _maxWindow = 50;
  private _zeroChars = ['\u200B', '\u200C', '\u200D', '\u2060'];

  embed(carrier: string, hidden: Record<string, unknown>, encoding: SteganographicEncoding = 'semantic'): SteganographicPayload {
    const id = `steg-${++this._idCounter}-${Date.now()}`;
    const hiddenStr = JSON.stringify(hidden);
    const enc = this._encodePayload(carrier, hiddenStr, encoding);
    const payload: SteganographicPayload = { id, carrier: enc.carrier, hidden: { ...hidden }, encoding, embeddedAt: Date.now() };
    this._payloads.set(id, payload);
    this._encodings.set(id, { bits: enc.bits, entropy: enc.entropy });
    return payload;
  }

  extract(payloadId: string): Record<string, unknown> | null {
    const p = this._payloads.get(payloadId);
    if (!p) return null;
    const enc = this._encodings.get(payloadId);
    if (!enc) return { ...p.hidden };
    try { return JSON.parse(this._decodePayload(p.carrier, p.encoding, enc.bits.length)); }
    catch { return { ...p.hidden }; }
  }

  openChannel(name: string, capacity: number = 100): CovertChannel {
    const id = `chan-${++this._idCounter}-${Date.now()}`;
    const ch: CovertChannel = { id, name, capacity: Math.max(1, capacity), active: true, payloads: 0 };
    this._channels.set(id, ch);
    return ch;
  }

  closeChannel(channelId: string): boolean {
    const ch = this._channels.get(channelId);
    if (!ch) return false;
    ch.active = false;
    return true;
  }

  routeThroughChannel(channelId: string, payloadId: string): boolean {
    const ch = this._channels.get(channelId);
    const p = this._payloads.get(payloadId);
    if (!ch || !p || !ch.active || ch.payloads >= ch.capacity) return false;
    const enc = this._encodings.get(payloadId);
    if (enc && Math.min(1, Math.abs(enc.entropy - 4.5) / 4.5 + (ch.payloads / ch.capacity) * 0.5) > 0.7) return false;
    ch.payloads++;
    return true;
  }

  startNegotiation(participants: string[], terms: Record<string, unknown>): HiddenNegotiation {
    if (participants.length < 2) throw new Error('Negotiation needs at least 2 participants');
    const id = `neg-${++this._idCounter}-${Date.now()}`;
    const neg: HiddenNegotiation = { id, participants: [...participants], terms: { ...terms }, status: 'pending', startedAt: Date.now(), settledAt: null };
    this._negotiations.set(id, neg);
    this._initNegState(id, participants, terms);
    return neg;
  }

  settleNegotiation(negotiationId: string, agree: boolean): HiddenNegotiation | null {
    const neg = this._negotiations.get(negotiationId);
    if (!neg || neg.status !== 'pending') return null;
    const state = this._negStates.get(negotiationId);
    if (state && agree) neg.terms = this._applyEquilibrium(neg.terms, this._nashEquilibrium(state), neg.participants);
    neg.status = agree ? 'agreed' : 'broken';
    neg.settledAt = Date.now();
    return neg;
  }

  detectIntrusion(signal: string): boolean {
    this._signalWindow.push(signal);
    if (this._signalWindow.length > this._maxWindow) this._signalWindow.shift();
    const h = this._entropy(signal);
    const avg = this._signalWindow.reduce((s, sig) => s + this._entropy(sig), 0) / this._signalWindow.length;
    const dev = Math.abs(h - avg) / (avg || 1);
    const risk = dev * 0.4 + this._patternScore(signal) * 0.6;
    if (risk > 0.6) { this._detectionLog.push(`[${Date.now()}] r=${risk.toFixed(2)} ${signal.substring(0, 40)}`); return true; }
    return false;
  }

  purgeExpiredPayloads(maxAge: number = 3600000): number {
    const now = Date.now();
    let purged = 0;
    for (const [id, p] of this._payloads) {
      if (now - p.embeddedAt > maxAge) { this._payloads.delete(id); this._encodings.delete(id); purged++; }
    }
    return purged;
  }

  getPayload(id: string): SteganographicPayload | undefined { return this._payloads.get(id); }
  getChannel(id: string): CovertChannel | undefined { return this._channels.get(id); }
  getNegotiation(id: string): HiddenNegotiation | undefined { return this._negotiations.get(id); }
  get payloads(): SteganographicPayload[] { return Array.from(this._payloads.values()); }
  get negotiations(): HiddenNegotiation[] { return Array.from(this._negotiations.values()); }
  get channels(): CovertChannel[] { return Array.from(this._channels.values()); }
  get detectionLog(): string[] { return [...this._detectionLog]; }
  get activeChannelCount(): number { return Array.from(this._channels.values()).filter(c => c.active).length; }

  private _encodePayload(carrier: string, data: string, encoding: SteganographicEncoding): { carrier: string; bits: string; entropy: number } {
    const bits = this._strToBits(data);
    const zc = this._zeroChars;
    let steg = carrier;
    if (encoding === 'lsb') {
      let bi = 0;
      const chars: string[] = [];
      for (let i = 0; i < carrier.length && bi < bits.length; i++) {
        chars.push(carrier[i]);
        chars.push(zc[parseInt(bits.substring(bi, bi + 2).padEnd(2, '0'), 2) % zc.length]);
        bi += 2;
      }
      steg = chars.join('');
    } else if (encoding === 'semantic') {
      steg = carrier + zc[0] + bits.split('').map(b => zc[parseInt(b, 2)]).join('');
    } else if (encoding === 'metadata') {
      steg = carrier + '\u2063' + data.length + '\u2063';
    }
    return { carrier: steg, bits, entropy: this._entropy(steg) };
  }

  private _decodePayload(carrier: string, encoding: SteganographicEncoding, bitLen: number): string {
    const zc = this._zeroChars;
    let bits = '';
    if (encoding === 'lsb' || encoding === 'semantic') {
      for (const ch of carrier) {
        const idx = zc.indexOf(ch);
        if (idx >= 0) bits += idx.toString(2).padStart(2, '0');
      }
    }
    return this._bitsToStr(bits.length > bitLen ? bits.substring(0, bitLen) : bits);
  }

  private _strToBits(str: string): string {
    let b = '';
    for (let i = 0; i < str.length; i++) b += str.charCodeAt(i).toString(2).padStart(16, '0');
    return b;
  }

  private _bitsToStr(bits: string): string {
    let s = '';
    for (let i = 0; i + 16 <= bits.length; i += 16) {
      const c = parseInt(bits.substring(i, i + 16), 2);
      if (c > 0) s += String.fromCharCode(c);
    }
    return s;
  }

  private _entropy(s: string): number {
    if (s.length === 0) return 0;
    const freq = new Map<string, number>();
    for (const ch of s) freq.set(ch, (freq.get(ch) || 0) + 1);
    let h = 0;
    for (const c of freq.values()) { const p = c / s.length; h -= p * Math.log2(p); }
    return h;
  }

  private _patternScore(s: string): number {
    const pats = [/probe/i, /extract/i, /scan/i, /decode/i, /decrypt/i, /steg/i, /hidden/i];
    let score = 0;
    for (const pat of pats) if (pat.test(s)) score += 0.2;
    const h = this._entropy(s);
    if (h < 1.5 || h > 6.5) score += 0.2;
    return Math.min(1, score);
  }

  private _initNegState(negId: string, participants: string[], terms: Record<string, unknown>): void {
    const utils = new Map<string, number[]>();
    const keys = Object.keys(terms);
    for (const p of participants) {
      const u: number[] = [];
      for (const k of keys) {
        const v = terms[k];
        u.push((typeof v === 'number' ? v : 0.5) + Math.sin(p.charCodeAt(0) + k.charCodeAt(0)) * 0.2);
      }
      utils.set(p, u);
    }
    this._negStates.set(negId, { utilities: utils, strategy: new Array(participants.length).fill(1 / participants.length) });
  }

  private _nashEquilibrium(state: NegState): number[] {
    const u = Array.from(state.utilities.values());
    const n = u.length;
    if (n < 2) return state.strategy;
    let s = [...state.strategy];
    for (let it = 0; it < 80; it++) {
      const pf: number[] = new Array(n).fill(0);
      for (let i = 0; i < n; i++) for (let j = 0; j < u[i].length; j++) {
        let p = 1; for (let k = 0; k < n; k++) if (k !== i) p *= s[k];
        pf[i] += u[i][j] * p;
      }
      const tot = pf.reduce((a, b) => a + b, 0);
      if (tot === 0) break;
      const nx = pf.map(x => Math.max(0.1, x / tot));
      const sm = nx.reduce((a, b) => a + b, 0);
      for (let i = 0; i < n; i++) nx[i] /= sm;
      let d = 0; for (let i = 0; i < n; i++) d += Math.abs(nx[i] - s[i]);
      s = nx; if (d < 1e-4) break;
    }
    return s;
  }

  private _applyEquilibrium(terms: Record<string, unknown>, eq: number[], participants: string[]): Record<string, unknown> {
    const r: Record<string, unknown> = { ...terms };
    for (const k of Object.keys(r)) {
      const v = r[k];
      if (typeof v === 'number') {
        let w = 0; for (let j = 0; j < participants.length; j++) w += v * eq[j];
        r[k] = Math.round(w * 1000) / 1000;
      }
    }
    r._equilibrium = eq.map(e => e.toFixed(3));
    return r;
  }
}

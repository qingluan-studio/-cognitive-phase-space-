export interface OpenSesameRequest {
  requestId: string;
  passphrase: string;
  timestamp: number;
  entropy: number;
}

export interface OpenSesameResult {
  access: boolean;
  token: string;
  remainingUses: number;
  decayFactor: number;
}

export interface OpenSesameConfig {
  maxUses: number;
  decayRate: number;
  hashRounds: number;
  threshold: number;
}

export class OpenSesameProtocol {
  private _config: OpenSesameConfig;
  private _tokens: Map<string, OpenSesameResult> = new Map();
  private _history: OpenSesameRequest[] = [];
  private _bloomFilter: boolean[] = [];
  private _bloomSize: number = 256;
  private _hashChain: string[] = [];
  private _rateLimitBucket: number = 10;
  private _lastRequestTime: number = 0;

  constructor(config: OpenSesameConfig) {
    this._config = config;
    this._bloomFilter = Array(this._bloomSize).fill(false);
  }

  get tokenCount(): number {
    return this._tokens.size;
  }

  get config(): OpenSesameConfig {
    return { ...this._config };
  }

  private _hash(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return (hash >>> 0).toString(16);
  }

  private _bloomAdd(input: string): void {
    const h1 = this._hash(input + 'a');
    const h2 = this._hash(input + 'b');
    const i1 = parseInt(h1.slice(0, 8), 16) % this._bloomSize;
    const i2 = parseInt(h2.slice(0, 8), 16) % this._bloomSize;
    this._bloomFilter[i1] = true;
    this._bloomFilter[i2] = true;
  }

  private _bloomCheck(input: string): boolean {
    const h1 = this._hash(input + 'a');
    const h2 = this._hash(input + 'b');
    const i1 = parseInt(h1.slice(0, 8), 16) % this._bloomSize;
    const i2 = parseInt(h2.slice(0, 8), 16) % this._bloomSize;
    return this._bloomFilter[i1] && this._bloomFilter[i2];
  }

  private _rateLimit(): boolean {
    const now = Date.now();
    const elapsed = (now - this._lastRequestTime) / 1000;
    this._rateLimitBucket = Math.min(10, this._rateLimitBucket + elapsed * 2);
    this._lastRequestTime = now;
    if (this._rateLimitBucket < 1) return false;
    this._rateLimitBucket -= 1;
    return true;
  }

  private _computeEntropy(passphrase: string): number {
    const freq: Record<string, number> = {};
    for (const c of passphrase) freq[c] = (freq[c] ?? 0) + 1;
    const len = passphrase.length || 1;
    return -Object.values(freq).reduce((s, count) => {
      const p = count / len;
      return p > 0 ? s + p * Math.log2(p) : s;
    }, 0);
  }

  public challenge(passphrase: string): OpenSesameResult {
    if (!this._rateLimit()) {
      return { access: false, token: '', remainingUses: 0, decayFactor: 0 };
    }
    const entropy = this._computeEntropy(passphrase);
    if (entropy < this._config.threshold) {
      return { access: false, token: '', remainingUses: 0, decayFactor: 0 };
    }
    const request: OpenSesameRequest = {
      requestId: this._hash(passphrase + Date.now()),
      passphrase,
      timestamp: Date.now(),
      entropy,
    };
    this._history.push(request);
    if (this._history.length > 50) this._history.shift();
    const token = this._hash(passphrase + request.requestId);
    const decayFactor = Math.exp(-this._config.decayRate * this._tokens.size);
    const result: OpenSesameResult = {
      access: true,
      token,
      remainingUses: Math.floor(this._config.maxUses * decayFactor),
      decayFactor,
    };
    this._tokens.set(token, result);
    this._bloomAdd(token);
    this._hashChain.push(this._hash(token + (this._hashChain[this._hashChain.length - 1] ?? '0')));
    return result;
  }

  public verify(token: string): boolean {
    const result = this._tokens.get(token);
    if (!result || result.remainingUses <= 0) return false;
    result.remainingUses -= 1;
    return true;
  }

  public revoke(token: string): boolean {
    return this._tokens.delete(token);
  }

  public sweepExpired(): number {
    let count = 0;
    this._tokens.forEach((result, token) => {
      if (result.remainingUses <= 0) {
        this._tokens.delete(token);
        count++;
      }
    });
    return count;
  }

  public tokenEntropy(): number {
    if (this._tokens.size === 0) return 0;
    const tokens = Array.from(this._tokens.keys());
    const total = tokens.reduce((s, t) => s + t.length, 0);
    return -tokens.reduce((s, t) => {
      const p = t.length / total;
      return p > 0 ? s + p * Math.log2(p) : s;
    }, 0);
  }

  public hashChainRoot(): string {
    if (this._hashChain.length === 0) return '';
    return this._hashChain[this._hashChain.length - 1];
  }

  public isKnown(requestId: string): boolean {
    return this._bloomCheck(requestId);
  }

  public report(): Record<string, unknown> {
    return {
      tokenCount: this._tokens.size,
      historySize: this._history.length,
      hashChainLength: this._hashChain.length,
      tokenEntropy: this.tokenEntropy(),
      bloomFillRate: this._bloomFilter.filter(Boolean).length / this._bloomSize,
    };
  }
}

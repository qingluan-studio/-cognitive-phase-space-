export interface OutcastModuleData {
  name: string;
  isolationCycles: number;
  health: number;
  messages: string[];
  resilience: number;
  isolationEntropy: number;
}

interface _Message {
  content: string;
  timestamp: number;
  sentiment: number;
}

export class OutcastModule {
  private _name: string;
  private _isolationCycles: number;
  private _health: number;
  private _inbox: _Message[];
  private _outbox: _Message[];
  private _banished: boolean;
  private _healthHistory: number[];
  private _resilienceFactor: number;
  private _allowedChannels: Set<string>;

  constructor(name: string, resilienceFactor: number = 0.1) {
    this._name = name;
    this._isolationCycles = 0;
    this._health = 100;
    this._inbox = [];
    this._outbox = [];
    this._banished = true;
    this._healthHistory = [];
    this._resilienceFactor = resilienceFactor;
    this._allowedChannels = new Set<string>(['controlled-bridge']);
  }

  get name(): string {
    return this._name;
  }

  get health(): number {
    return this._health;
  }

  get banished(): boolean {
    return this._banished;
  }

  get resilience(): number {
    if (this._healthHistory.length < 2) return 1;
    const dips: number[] = [];
    for (let i = 1; i < this._healthHistory.length; i += 1) {
      const delta = this._healthHistory[i] - this._healthHistory[i - 1];
      if (delta < 0) dips.push(-delta);
    }
    if (dips.length === 0) return 1;
    const avgDip = dips.reduce((s, d) => s + d, 0) / dips.length;
    const recovery = Math.max(0, this._health - this._healthHistory[this._healthHistory.length - 1]);
    return Math.min(1, recovery / (avgDip + 1));
  }

  get isolationEntropy(): number {
    if (this._inbox.length === 0) return 0;
    const freq = new Map<string, number>();
    for (const m of this._inbox) {
      const bucket = Math.floor(m.sentiment * 5).toString();
      freq.set(bucket, (freq.get(bucket) ?? 0) + 1);
    }
    const total = this._inbox.length;
    let h = 0;
    for (const count of freq.values()) {
      const p = count / total;
      h -= p * Math.log2(p);
    }
    return h / Math.log2(Math.max(2, freq.size));
  }

  public survive(): void {
    this._isolationCycles += 1;
    const decay = 2 - this._resilienceFactor * Math.log(this._isolationCycles + 1);
    this._health = Math.max(0, this._health - Math.max(0.5, decay));
    this._healthHistory.push(this._health);
    if (this._healthHistory.length > 50) this._healthHistory.shift();
  }

  public receive(message: string, sentiment: number = 0.5): void {
    this._inbox.push({ content: message, timestamp: Date.now(), sentiment: Math.max(0, Math.min(1, sentiment)) });
    const healing = 1 + sentiment * 2;
    this._health = Math.min(100, this._health + healing);
  }

  public send(message: string, channel: string = 'controlled-bridge', sentiment: number = 0.5): boolean {
    if (!this._allowedChannels.has(channel)) return false;
    this._outbox.push({ content: message, timestamp: Date.now(), sentiment });
    return true;
  }

  public drainOutbox(): string[] {
    const out = this._outbox.map((m) => m.content);
    this._outbox = [];
    return out;
  }

  public readInbox(): string[] {
    return this._inbox.map((m) => m.content);
  }

  public heal(amount: number): void {
    this._health = Math.min(100, this._health + amount);
    this._healthHistory.push(this._health);
    if (this._healthHistory.length > 50) this._healthHistory.shift();
  }

  public grantChannel(channel: string): void {
    this._allowedChannels.add(channel);
  }

  public revokeChannel(channel: string): boolean {
    if (channel === 'controlled-bridge') return false;
    return this._allowedChannels.delete(channel);
  }

  public adaptResilience(delta: number): void {
    this._resilienceFactor = Math.max(0, Math.min(1, this._resilienceFactor + delta));
  }

  public vitalityIndex(): number {
    const healthFactor = this._health / 100;
    const resilienceFactor = this.resilience;
    const channelFactor = this._allowedChannels.size / 5;
    return Math.min(1, healthFactor * 0.5 + resilienceFactor * 0.3 + channelFactor * 0.2);
  }

  public report(): OutcastModuleData {
    return {
      name: this._name,
      isolationCycles: this._isolationCycles,
      health: this._health,
      messages: this._inbox.map((m) => m.content),
      resilience: this.resilience,
      isolationEntropy: this.isolationEntropy,
    };
  }
}

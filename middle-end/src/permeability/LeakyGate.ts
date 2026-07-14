export interface GateChannel {
  id: string;
  capacity: number;
  leakage: number;
  noise: number;
  distortion: number;
}

export interface GatePassage {
  channelId: string;
  payloadSize: number;
  lossRate: number;
  mutualInformation: number;
}

export class LeakyGate {
  private _channels: Map<string, GateChannel> = new Map();
  private _passages: GatePassage[] = [];
  private _meta: Record<string, unknown> = {};
  private _totalPayload: number = 0;
  private _totalLoss: number = 0;

  constructor(channelCount: number) {
    for (let i = 0; i < channelCount; i++) {
      this._channels.set(`ch_${i}`, {
        id: `ch_${i}`,
        capacity: 1 + Math.random() * 9,
        leakage: Math.random() * 0.3,
        noise: Math.random() * 0.1,
        distortion: Math.random() * 0.05,
      });
    }
  }

  get channelCount(): number {
    return this._channels.size;
  }

  get totalPayload(): number {
    return this._totalPayload;
  }

  get totalLoss(): number {
    return this._totalLoss;
  }

  addChannel(id: string, capacity: number, leakage: number): void {
    this._channels.set(id, { id, capacity, leakage, noise: 0, distortion: 0 });
  }

  pass(channelId: string, payloadSize: number): GatePassage | null {
    const channel = this._channels.get(channelId);
    if (!channel) return null;
    const effectiveCapacity = channel.capacity * (1 - channel.leakage);
    const actualLoss = payloadSize > effectiveCapacity ? (payloadSize - effectiveCapacity) / payloadSize : channel.noise;
    const lossRate = Math.min(1, actualLoss + channel.distortion);
    const passed = payloadSize * (1 - lossRate);
    const entropyOut = -((passed / payloadSize) * Math.log2(passed / payloadSize) + (lossRate) * Math.log2(lossRate || 1e-10));
    const entropyIn = Math.log2(payloadSize || 2);
    const mutualInformation = Math.max(0, entropyIn - entropyOut);
    const passage: GatePassage = { channelId, payloadSize, lossRate, mutualInformation };
    this._passages.push(passage);
    this._totalPayload += payloadSize;
    this._totalLoss += payloadSize * lossRate;
    if (this._passages.length > 50) this._passages.shift();
    return passage;
  }

  capacityOf(channelId: string): number {
    return this._channels.get(channelId)?.capacity ?? 0;
  }

  isLeaking(channelId: string): boolean {
    const ch = this._channels.get(channelId);
    return !!ch && ch.leakage > 0.1;
  }

  seal(channelId: string): void {
    const ch = this._channels.get(channelId);
    if (ch) ch.leakage = Math.max(0, ch.leakage - 0.05);
  }

  forceOpen(channelId: string): void {
    const ch = this._channels.get(channelId);
    if (ch) ch.leakage = Math.min(1, ch.leakage + 0.3);
  }

  channelEntropy(): number {
    const caps = Array.from(this._channels.values()).map((c) => c.capacity);
    const total = caps.reduce((s, v) => s + v, 0);
    if (total === 0) return 0;
    return -caps.reduce((s, v) => {
      const p = v / total;
      return p > 0 ? s + p * Math.log2(p) : s;
    }, 0);
  }

  shannonCapacity(): number {
    let sum = 0;
    for (const ch of this._channels.values()) {
      const snr = (1 - ch.noise) / (ch.noise || 1e-10);
      sum += ch.capacity * Math.log2(1 + snr);
    }
    return sum;
  }

  channelUtilization(): number {
    if (this._totalPayload === 0) return 0;
    const totalCap = Array.from(this._channels.values()).reduce((s, ch) => s + ch.capacity, 0);
    return totalCap > 0 ? this._totalPayload / totalCap : 0;
  }

  report(): Record<string, unknown> {
    return {
      channels: this._channels.size,
      passages: this._passages.length,
      totalPayload: this._totalPayload,
      totalLoss: this._totalLoss,
      entropy: this.channelEntropy(),
      shannonCapacity: this.shannonCapacity(),
      meta: this._meta,
    };
  }
}

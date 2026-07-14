/** 冥府引擎 - 处理所有不可见的隐写、暗中谈判等隐蔽逻辑 */

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

export class ChthonicEngine {
  private _payloads: Map<string, SteganographicPayload> = new Map();
  private _negotiations: Map<string, HiddenNegotiation> = new Map();
  private _channels: Map<string, CovertChannel> = new Map();
  private _idCounter = 0;
  private _detectionLog: string[] = [];

  embed(
    carrier: string,
    hidden: Record<string, unknown>,
    encoding: SteganographicEncoding = 'semantic'
  ): SteganographicPayload {
    const payload: SteganographicPayload = {
      id: `steg-${++this._idCounter}-${Date.now()}`,
      carrier,
      hidden: { ...hidden },
      encoding,
      embeddedAt: Date.now(),
    };
    this._payloads.set(payload.id, payload);
    return payload;
  }

  extract(payloadId: string): Record<string, unknown> | null {
    const payload = this._payloads.get(payloadId);
    if (!payload) return null;
    return { ...payload.hidden };
  }

  openChannel(name: string, capacity: number = 100): CovertChannel {
    const id = `chan-${++this._idCounter}-${Date.now()}`;
    const channel: CovertChannel = {
      id,
      name,
      capacity: Math.max(1, capacity),
      active: true,
      payloads: 0,
    };
    this._channels.set(id, channel);
    return channel;
  }

  closeChannel(channelId: string): boolean {
    const channel = this._channels.get(channelId);
    if (!channel) return false;
    channel.active = false;
    return true;
  }

  routeThroughChannel(channelId: string, payloadId: string): boolean {
    const channel = this._channels.get(channelId);
    const payload = this._payloads.get(payloadId);
    if (!channel || !payload || !channel.active) return false;
    if (channel.payloads >= channel.capacity) return false;
    channel.payloads++;
    return true;
  }

  startNegotiation(participants: string[], terms: Record<string, unknown>): HiddenNegotiation {
    if (participants.length < 2) throw new Error('Negotiation needs at least 2 participants');
    const negotiation: HiddenNegotiation = {
      id: `neg-${++this._idCounter}-${Date.now()}`,
      participants: [...participants],
      terms: { ...terms },
      status: 'pending',
      startedAt: Date.now(),
      settledAt: null,
    };
    this._negotiations.set(negotiation.id, negotiation);
    return negotiation;
  }

  settleNegotiation(negotiationId: string, agree: boolean): HiddenNegotiation | null {
    const negotiation = this._negotiations.get(negotiationId);
    if (!negotiation || negotiation.status !== 'pending') return null;
    negotiation.status = agree ? 'agreed' : 'broken';
    negotiation.settledAt = Date.now();
    return negotiation;
  }

  detectIntrusion(signal: string): boolean {
    const suspicious = /probe|extract|scan/i.test(signal);
    if (suspicious) {
      this._detectionLog.push(`[${Date.now()}] ${signal}`);
    }
    return suspicious;
  }

  purgeExpiredPayloads(maxAge: number = 3600000): number {
    const now = Date.now();
    let purged = 0;
    for (const [id, payload] of this._payloads) {
      if (now - payload.embeddedAt > maxAge) {
        this._payloads.delete(id);
        purged++;
      }
    }
    return purged;
  }

  getPayload(id: string): SteganographicPayload | undefined {
    return this._payloads.get(id);
  }

  getChannel(id: string): CovertChannel | undefined {
    return this._channels.get(id);
  }

  getNegotiation(id: string): HiddenNegotiation | undefined {
    return this._negotiations.get(id);
  }

  get payloads(): SteganographicPayload[] {
    return Array.from(this._payloads.values());
  }

  get negotiations(): HiddenNegotiation[] {
    return Array.from(this._negotiations.values());
  }

  get channels(): CovertChannel[] {
    return Array.from(this._channels.values());
  }

  get detectionLog(): string[] {
    return [...this._detectionLog];
  }

  get activeChannelCount(): number {
    return Array.from(this._channels.values()).filter(c => c.active).length;
  }
}

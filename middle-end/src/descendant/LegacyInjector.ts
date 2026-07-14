/**
 * 遗产注入器：将核心精神注入后代。
 * 将"核心精神"封装为可注入的遗产包，在后代生成时将其注入，保证精神延续。
 */

export interface LegacyPacket {
  id: string;
  spirit: string;
  principles: string[];
  potency: number;
  createdAt: number;
}

export interface InjectionResult {
  packetId: string;
  recipientId: string;
  accepted: boolean;
  potencyAfter: number;
  injectedAt: number;
}

export class LegacyInjector {
  private _packets: Map<string, LegacyPacket> = new Map();
  private _injections: InjectionResult[] = [];
  private _recipients: Map<string, string[]> = new Map();
  private _acceptanceThreshold = 0.4;

  craftLegacy(spirit: string, principles: string[], potency: number = 1.0): LegacyPacket {
    const packet: LegacyPacket = {
      id: `leg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      spirit,
      principles,
      potency: Math.max(0, Math.min(1, potency)),
      createdAt: Date.now(),
    };
    this._packets.set(packet.id, packet);
    return packet;
  }

  inject(packetId: string, recipientId: string): InjectionResult | null {
    const packet = this._packets.get(packetId);
    if (!packet) return null;
    const accepted = packet.potency >= this._acceptanceThreshold;
    const potencyAfter = accepted ? packet.potency * 0.9 : packet.potency;
    packet.potency = potencyAfter;
    if (!this._recipients.has(recipientId)) this._recipients.set(recipientId, []);
    if (accepted) this._recipients.get(recipientId)!.push(packet.spirit);
    const result: InjectionResult = {
      packetId,
      recipientId,
      accepted,
      potencyAfter,
      injectedAt: Date.now(),
    };
    this._injections.push(result);
    if (this._injections.length > 200) this._injections.shift();
    return result;
  }

  recharge(packetId: string, amount: number): LegacyPacket | null {
    const packet = this._packets.get(packetId);
    if (!packet) return null;
    packet.potency = Math.min(1, packet.potency + amount);
    return packet;
  }

  setAcceptanceThreshold(value: number): void {
    this._acceptanceThreshold = Math.max(0, Math.min(1, value));
  }

  getRecipientSpirits(recipientId: string): string[] {
    return [...(this._recipients.get(recipientId) ?? [])];
  }

  getPacket(id: string): LegacyPacket | null {
    return this._packets.get(id) ?? null;
  }

  getInjections(limit: number = 50): InjectionResult[] {
    return this._injections.slice(-limit);
  }

  get packetCount(): number {
    return this._packets.size;
  }
}

/**
 * 阿尔奇拉桥：连接梦境与现实的彩虹桥。
 * 在梦境与现实间建立双向通道，允许信息在两侧流动并互相影响。
 */

export interface BridgePillar {
  id: string;
  side: 'dream' | 'reality';
  stability: number;
  load: number;
}

export interface CrossingEvent {
  id: string;
  direction: 'dream-to-reality' | 'reality-to-dream';
  payload: Record<string, unknown>;
  crossedAt: number;
}

export class AltjiraBridge {
  private _pillars: Map<string, BridgePillar> = new Map();
  private _crossings: CrossingEvent[] = [];
  private _structuralIntegrity = 1.0;
  private _maxPayloadSize = 1024;

  addPillar(pillar: BridgePillar): void {
    this._pillars.set(pillar.id, pillar);
  }

  cross(direction: CrossingEvent['direction'], payload: Record<string, unknown>): CrossingEvent | null {
    if (this._structuralIntegrity < 0.2) return null;
    const payloadSize = JSON.stringify(payload).length;
    if (payloadSize > this._maxPayloadSize) return null;
    const event: CrossingEvent = {
      id: `cross-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      direction,
      payload,
      crossedAt: Date.now(),
    };
    this._crossings.push(event);
    if (this._crossings.length > 100) this._crossings.shift();
    this._distributeLoad(payloadSize);
    return event;
  }

  private _distributeLoad(load: number): void {
    const pillars = Array.from(this._pillars.values());
    if (pillars.length === 0) return;
    const share = load / pillars.length;
    for (const p of pillars) {
      p.load += share;
      p.stability = Math.max(0, p.stability - share * 0.001);
    }
    this._structuralIntegrity = pillars.reduce((s, p) => s + p.stability, 0) / pillars.length;
  }

  reinforce(pillarId: string, amount: number): BridgePillar | null {
    const p = this._pillars.get(pillarId);
    if (!p) return null;
    p.stability = Math.min(1, p.stability + amount);
    p.load = Math.max(0, p.load - amount * 10);
    return p;
  }

  inspectIntegrity(): number {
    return this._structuralIntegrity;
  }

  listPillars(side?: BridgePillar['side']): BridgePillar[] {
    const all = Array.from(this._pillars.values());
    return side ? all.filter(p => p.side === side) : all;
  }

  getCrossings(limit: number = 50): CrossingEvent[] {
    return this._crossings.slice(-limit);
  }

  setMaxPayload(size: number): void {
    this._maxPayloadSize = Math.max(0, size);
  }

  get pillarCount(): number {
    return this._pillars.size;
  }
}

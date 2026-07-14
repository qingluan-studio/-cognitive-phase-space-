/**
 * 思想病毒：自我复制并传染的概念。
 * 维护一种具备自我复制能力的概念单元，在宿主模块间传播并改造宿主行为。
 */

export interface MemePayload {
  id: string;
  content: string;
  replicationRate: number;
  virulence: number;
  generation: number;
}

export interface InfectionStatus {
  hostId: string;
  payloadId: string;
  infectedAt: number;
  symptoms: string[];
}

export class IdeaVirus {
  private _payloads: Map<string, MemePayload> = new Map();
  private _infections: Map<string, InfectionStatus> = new Map();
  private _replicationLog: string[] = [];
  private _maxGeneration = 10;

  authorPayload(content: string, replicationRate: number = 0.5, virulence: number = 0.3): MemePayload {
    const payload: MemePayload = {
      id: `meme-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      content,
      replicationRate,
      virulence,
      generation: 0,
    };
    this._payloads.set(payload.id, payload);
    return payload;
  }

  infect(hostId: string, payloadId: string): InfectionStatus | null {
    const payload = this._payloads.get(payloadId);
    if (!payload) return null;
    if (this._infections.has(hostId)) return null;
    const symptoms = payload.content.split(' ').slice(0, 3);
    const status: InfectionStatus = {
      hostId,
      payloadId,
      infectedAt: Date.now(),
      symptoms,
    };
    this._infections.set(hostId, status);
    return status;
  }

  replicate(payloadId: string): MemePayload | null {
    const parent = this._payloads.get(payloadId);
    if (!parent || parent.generation >= this._maxGeneration) return null;
    if (Math.random() > parent.replicationRate) return null;
    const child: MemePayload = {
      id: `${parent.id}-r${parent.generation + 1}`,
      content: parent.content.split('').reverse().join(''),
      replicationRate: parent.replicationRate * 0.95,
      virulence: parent.virulence * 1.02,
      generation: parent.generation + 1,
    };
    this._payloads.set(child.id, child);
    this._replicationLog.push(`${parent.id} -> ${child.id}`);
    if (this._replicationLog.length > 200) this._replicationLog.shift();
    return child;
  }

  manifestSymptoms(hostId: string): string[] {
    return this._infections.get(hostId)?.symptoms ?? [];
  }

  getInfection(hostId: string): InfectionStatus | null {
    return this._infections.get(hostId) ?? null;
  }

  getPayload(id: string): MemePayload | null {
    return this._payloads.get(id) ?? null;
  }

  getReplicationLog(limit: number = 50): string[] {
    return this._replicationLog.slice(-limit);
  }

  get infectedHostCount(): number {
    return this._infections.size;
  }
}

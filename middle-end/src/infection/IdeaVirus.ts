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
  private _lineage: Map<string, string> = new Map();
  private _hostLoad: Map<string, number> = new Map();

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
    const symptoms = this._extractSymptoms(payload.content);
    const status: InfectionStatus = {
      hostId,
      payloadId,
      infectedAt: Date.now(),
      symptoms,
    };
    this._infections.set(hostId, status);
    this._hostLoad.set(hostId, (this._hostLoad.get(hostId) ?? 0) + payload.virulence);
    return status;
  }

  private _extractSymptoms(content: string): string[] {
    const tokens = content.split(/\s+/).filter(t => t.length > 0);
    const scored = tokens.map(t => ({ token: t, score: this._shannonEntropy(t) }));
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 3).map(s => s.token);
  }

  private _shannonEntropy(text: string): number {
    if (text.length === 0) return 0;
    const freq: Record<string, number> = {};
    for (const ch of text) freq[ch] = (freq[ch] ?? 0) + 1;
    let entropy = 0;
    const len = text.length;
    for (const count of Object.values(freq)) {
      const p = count / len;
      entropy -= p * Math.log2(p);
    }
    return entropy;
  }

  replicate(payloadId: string): MemePayload | null {
    const parent = this._payloads.get(payloadId);
    if (!parent || parent.generation >= this._maxGeneration) return null;
    const fitness = this._memeticFitness(parent);
    if (Math.random() > parent.replicationRate * fitness) return null;
    const mutatedContent = this._mutateContent(parent.content, parent.generation);
    const child: MemePayload = {
      id: `${parent.id}-r${parent.generation + 1}`,
      content: mutatedContent,
      replicationRate: Math.max(0.05, parent.replicationRate * 0.95),
      virulence: Math.min(1, parent.virulence * 1.02),
      generation: parent.generation + 1,
    };
    this._payloads.set(child.id, child);
    this._lineage.set(child.id, parent.id);
    this._replicationLog.push(`${parent.id} -> ${child.id}`);
    if (this._replicationLog.length > 200) this._replicationLog.shift();
    return child;
  }

  private _memeticFitness(payload: MemePayload): number {
    const entropy = this._shannonEntropy(payload.content);
    const normalizedEntropy = Math.min(1, entropy / 4);
    const senescence = 1 - payload.generation / this._maxGeneration;
    return 0.4 * normalizedEntropy + 0.3 * senescence + 0.3 * payload.virulence;
  }

  private _mutateContent(content: string, generation: number): string {
    const chars = content.split('');
    const mutationRate = 0.1 + generation * 0.02;
    for (let i = 0; i < chars.length; i++) {
      if (Math.random() < mutationRate) {
        const code = chars[i].charCodeAt(0);
        chars[i] = String.fromCharCode(code + (Math.random() < 0.5 ? 1 : -1));
      }
    }
    return chars.join('');
  }

  manifestSymptoms(hostId: string): string[] {
    return this._infections.get(hostId)?.symptoms ?? [];
  }

  traceLineage(payloadId: string): string[] {
    const chain: string[] = [payloadId];
    let current = payloadId;
    while (this._lineage.has(current)) {
      current = this._lineage.get(current)!;
      chain.unshift(current);
    }
    return chain;
  }

  computeR0(payloadId: string): number {
    const payload = this._payloads.get(payloadId);
    if (!payload) return 0;
    const descendants = Array.from(this._lineage.entries())
      .filter(([, parent]) => parent === payloadId).length;
    const fitness = this._memeticFitness(payload);
    return descendants + payload.replicationRate * fitness * this._maxGeneration;
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

  get payloadCount(): number {
    return this._payloads.size;
  }
}

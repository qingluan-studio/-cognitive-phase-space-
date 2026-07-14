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
  private _diffusionGraph: Map<string, Set<string>> = new Map();
  private _potencyEntropy: number = 0;
  private _injectionMatrix: Map<string, Map<string, number>> = new Map();

  craftLegacy(spirit: string, principles: string[], potency: number = 1.0): LegacyPacket {
    const packet: LegacyPacket = {
      id: `leg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      spirit,
      principles,
      potency: Math.max(0, Math.min(1, potency)),
      createdAt: Date.now(),
    };
    this._packets.set(packet.id, packet);
    this._updatePotencyEntropy();
    return packet;
  }

  inject(packetId: string, recipientId: string): InjectionResult | null {
    const packet = this._packets.get(packetId);
    if (!packet) {
      return null;
    }
    const accepted = packet.potency >= this._acceptanceThreshold;
    const potencyAfter = accepted ? packet.potency * 0.9 : packet.potency;
    packet.potency = potencyAfter;
    if (!this._recipients.has(recipientId)) {
      this._recipients.set(recipientId, []);
    }
    if (accepted) {
      this._recipients.get(recipientId)!.push(packet.spirit);
    }
    const result: InjectionResult = {
      packetId,
      recipientId,
      accepted,
      potencyAfter,
      injectedAt: Date.now(),
    };
    this._injections.push(result);
    if (this._injections.length > 200) {
      this._injections.shift();
    }
    this._updateDiffusionGraph(recipientId, packet.spirit);
    this._updateInjectionMatrix(recipientId, packetId, accepted ? 1 : 0);
    this._updatePotencyEntropy();
    return result;
  }

  recharge(packetId: string, amount: number): LegacyPacket | null {
    const packet = this._packets.get(packetId);
    if (!packet) {
      return null;
    }
    packet.potency = Math.min(1, packet.potency + amount);
    this._updatePotencyEntropy();
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

  get potencyEntropy(): number {
    return this._potencyEntropy;
  }

  computeDiffusionCentrality(recipientId: string): number {
    const visited = new Set<string>();
    const queue: Array<{ id: string; depth: number }> = [{ id: recipientId, depth: 0 }];
    visited.add(recipientId);
    let centrality = 0;
    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;
      centrality += 1 / (depth + 1);
      for (const neighbor of this._diffusionGraph.get(id) ?? []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push({ id: neighbor, depth: depth + 1 });
        }
      }
    }
    return centrality;
  }

  computeInjectionProbability(recipientId: string, packetId: string): number {
    const matrix = this._injectionMatrix.get(recipientId);
    if (!matrix) {
      return this._acceptanceThreshold;
    }
    const successes = matrix.get(packetId) ?? 0;
    const total = Array.from(matrix.values()).reduce((s, v) => s + v, 0);
    if (total === 0) {
      return this._acceptanceThreshold;
    }
    return successes / total;
  }

  computeNetworkDensity(): number {
    const nodes = this._recipients.size;
    if (nodes <= 1) {
      return 0;
    }
    let edges = 0;
    for (const set of this._diffusionGraph.values()) {
      edges += set.size;
    }
    const maxEdges = nodes * (nodes - 1);
    return maxEdges === 0 ? 0 : edges / maxEdges;
  }

  private _updateDiffusionGraph(recipientId: string, spirit: string): void {
    const set = this._diffusionGraph.get(recipientId) ?? new Set<string>();
    for (const [otherId, spirits] of this._recipients) {
      if (otherId !== recipientId && spirits.includes(spirit)) {
        set.add(otherId);
        const otherSet = this._diffusionGraph.get(otherId) ?? new Set<string>();
        otherSet.add(recipientId);
        this._diffusionGraph.set(otherId, otherSet);
      }
    }
    this._diffusionGraph.set(recipientId, set);
  }

  private _updateInjectionMatrix(recipientId: string, packetId: string, value: number): void {
    const matrix = this._injectionMatrix.get(recipientId) ?? new Map<string, number>();
    matrix.set(packetId, (matrix.get(packetId) ?? 0) + value);
    this._injectionMatrix.set(recipientId, matrix);
  }

  private _updatePotencyEntropy(): void {
    const values = Array.from(this._packets.values()).map((p) => p.potency);
    if (values.length === 0) {
      this._potencyEntropy = 0;
      return;
    }
    const buckets = new Map<number, number>();
    for (const v of values) {
      const b = Math.floor(v * 10);
      buckets.set(b, (buckets.get(b) ?? 0) + 1);
    }
    const total = values.length;
    let entropy = 0;
    for (const count of buckets.values()) {
      const p = count / total;
      entropy -= p * Math.log2(p);
    }
    this._potencyEntropy = entropy;
  }
}

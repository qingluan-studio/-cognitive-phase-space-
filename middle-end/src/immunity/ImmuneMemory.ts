export interface MemoryCell {
  id: string;
  signature: string;
  encounters: number;
  lastEncounteredAt: number;
  retainedFor: number;
}

export interface RapidResponse {
  memoryCellId: string;
  signature: string;
  responseLatencyMs: number;
  recognized: boolean;
}

export class ImmuneMemory {
  private _memory: Map<string, MemoryCell> = new Map();
  private _signatureIndex: Map<string, string> = new Map();
  private _rapidResponses: RapidResponse[] = [];
  private _retentionMs = 86400000;
  private _latencyOnRecognized = 5;
  private _latencyOnUnknown = 500;
  private _consolidationThreshold = 3;
  private _decayRate = 0.001;

  memorize(signature: string): MemoryCell {
    const existingId = this._signatureIndex.get(signature);
    if (existingId) {
      const existing = this._memory.get(existingId);
      if (existing) {
        existing.encounters++;
        existing.lastEncounteredAt = Date.now();
        existing.retainedFor = this._retentionMs * (1 + existing.encounters * 0.1);
        return existing;
      }
    }
    const cell: MemoryCell = {
      id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      signature,
      encounters: 1,
      lastEncounteredAt: Date.now(),
      retainedFor: this._retentionMs,
    };
    this._memory.set(cell.id, cell);
    this._signatureIndex.set(signature, cell.id);
    return cell;
  }

  recall(signature: string): RapidResponse {
    const matchId = this._signatureIndex.get(signature);
    const match = matchId ? this._memory.get(matchId) ?? null : null;
    const recognized = !!match;
    const latency = recognized
      ? this._computeRecallLatency(match!.encounters)
      : this._latencyOnUnknown;
    const response: RapidResponse = {
      memoryCellId: match?.id ?? 'none',
      signature,
      responseLatencyMs: latency,
      recognized,
    };
    if (match) {
      match.encounters++;
      match.lastEncounteredAt = Date.now();
    } else {
      this.memorize(signature);
    }
    this._rapidResponses.push(response);
    if (this._rapidResponses.length > 200) this._rapidResponses.shift();
    return response;
  }

  private _computeRecallLatency(encounters: number): number {
    const consolidation = Math.min(1, encounters / this._consolidationThreshold);
    return this._latencyOnRecognized + (1 - consolidation) * (this._latencyOnUnknown - this._latencyOnRecognized) * 0.3;
  }

  prune(): number {
    const now = Date.now();
    let pruned = 0;
    for (const [id, cell] of this._memory.entries()) {
      const age = now - cell.lastEncounteredAt;
      const effectiveRetention = cell.retainedFor * Math.exp(-this._decayRate * cell.encounters);
      if (age > effectiveRetention) {
        this._memory.delete(id);
        this._signatureIndex.delete(cell.signature);
        pruned++;
      }
    }
    return pruned;
  }

  computeMemoryStrength(signature: string): number {
    const cellId = this._signatureIndex.get(signature);
    if (!cellId) return 0;
    const cell = this._memory.get(cellId);
    if (!cell) return 0;
    const age = Date.now() - cell.lastEncounteredAt;
    const freshness = Math.exp(-age / cell.retainedFor);
    const consolidation = 1 - Math.exp(-cell.encounters / this._consolidationThreshold);
    return 0.5 * freshness + 0.5 * consolidation;
  }

  computeRecallAccuracy(): number {
    if (this._rapidResponses.length === 0) return 0;
    const recognized = this._rapidResponses.filter(r => r.recognized);
    return recognized.length / this._rapidResponses.length;
  }

  identifyHighAffinityCells(threshold: number): MemoryCell[] {
    return Array.from(this._memory.values())
      .filter(c => c.encounters >= threshold)
      .sort((a, b) => b.encounters - a.encounters);
  }

  setRetention(ms: number): void {
    this._retentionMs = Math.max(0, ms);
    for (const cell of this._memory.values()) cell.retainedFor = ms;
  }

  getMemoryCell(id: string): MemoryCell | null {
    return this._memory.get(id) ?? null;
  }

  getRapidResponses(limit: number = 50): RapidResponse[] {
    return this._rapidResponses.slice(-limit);
  }

  get memoryCount(): number {
    return this._memory.size;
  }
}

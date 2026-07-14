/**
 * 免疫记忆：记住入侵者特征快速响应。
 * 将曾经中和过的入侵者特征长期保存，再次遭遇时直接调用记忆进行快速响应。
 */

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
  private _rapidResponses: RapidResponse[] = [];
  private _retentionMs = 86400000;
  private _latencyOnRecognized = 5;
  private _latencyOnUnknown = 500;

  memorize(signature: string): MemoryCell {
    const existing = Array.from(this._memory.values()).find(m => m.signature === signature);
    if (existing) {
      existing.encounters++;
      existing.lastEncounteredAt = Date.now();
      return existing;
    }
    const cell: MemoryCell = {
      id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      signature,
      encounters: 1,
      lastEncounteredAt: Date.now(),
      retainedFor: this._retentionMs,
    };
    this._memory.set(cell.id, cell);
    return cell;
  }

  recall(signature: string): RapidResponse {
    const match = Array.from(this._memory.values()).find(m => m.signature === signature);
    const recognized = !!match;
    const response: RapidResponse = {
      memoryCellId: match?.id ?? 'none',
      signature,
      responseLatencyMs: recognized ? this._latencyOnRecognized : this._latencyOnUnknown,
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

  prune(): number {
    const now = Date.now();
    let pruned = 0;
    for (const [id, cell] of this._memory.entries()) {
      if (now - cell.lastEncounteredAt > cell.retainedFor) {
        this._memory.delete(id);
        pruned++;
      }
    }
    return pruned;
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

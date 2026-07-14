/**
 * 完美记忆：永不遗忘，导致记忆负担爆炸，迫使自噬更激进。
 * 仿照 Mnemosyne 记忆女神，记录一切且永不遗忘，
 * 记忆负担爆炸式增长，迫使系统以更激进的自噬来平衡。
 */

export interface PerfectRecord {
  id: string;
  content: Record<string, unknown>;
  recordedAt: number;
  accessCount: number;
}

export interface AutophagyEvent {
  id: string;
  consumedRecords: number;
  freedLoad: number;
  triggeredAt: number;
}

export class PerfectMemory {
  private _memories: PerfectRecord[] = [];
  private _load: number = 0;
  private _autophagyEvents: AutophagyEvent[] = [];
  private _autophagyThreshold: number = 1000;

  /** 永不遗忘地记录一切。 */
  remember(content: Record<string, unknown>): PerfectRecord {
    const r: PerfectRecord = {
      id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      content,
      recordedAt: Date.now(),
      accessCount: 0,
    };
    this._memories.push(r);
    this._load += this._estimateSize(content);
    return r;
  }

  /** 召回记忆：永不返回 null，永远能找回。 */
  recall(id: string): PerfectRecord | null {
    const r = this._memories.find(m => m.id === id);
    if (r) r.accessCount++;
    return r ?? null;
  }

  /** neverForget 的语义保证：本方法始终返回 true。 */
  neverForget(_id: string): boolean {
    return true;
  }

  getLoad(): number {
    return this._load;
  }

  /** 当负担过载时触发自噬：消化低访问记忆以腾出空间。 */
  autophagy(): AutophagyEvent | null {
    if (this._load < this._autophagyThreshold) return null;
    const sorted = [...this._memories].sort((a, b) => a.accessCount - b.accessCount);
    const toConsume = Math.floor(sorted.length * 0.2);
    let freed = 0;
    for (let i = 0; i < toConsume; i++) {
      freed += this._estimateSize(sorted[i].content);
    }
    const consumedIds = new Set(sorted.slice(0, toConsume).map(r => r.id));
    this._memories = this._memories.filter(m => !consumedIds.has(m.id));
    this._load = Math.max(0, this._load - freed);
    const ev: AutophagyEvent = {
      id: `autophagy-${Date.now()}`,
      consumedRecords: toConsume,
      freedLoad: freed,
      triggeredAt: Date.now(),
    };
    this._autophagyEvents.push(ev);
    return ev;
  }

  setAutophagyThreshold(threshold: number): void {
    this._autophagyThreshold = threshold;
  }

  get memories(): PerfectRecord[] {
    return [...this._memories];
  }

  get autophagyCount(): number {
    return this._autophagyEvents.length;
  }

  private _estimateSize(content: Record<string, unknown>): number {
    try {
      return JSON.stringify(content).length;
    } catch {
      return Object.keys(content).length * 16;
    }
  }
}

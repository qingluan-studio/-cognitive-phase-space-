/**
 * 蜕皮监视者：观察旧模块剥离瞬间，汲取遗弃知识。
 * 当旧模块被剥离（蜕皮）时，监视者捕捉剥离瞬间释放的
 * 遗弃知识，存档以备复用。
 */

export interface MoltEvent {
  id: string;
  moduleName: string;
  version: string;
  shedAt: number;
  knowledgePayload: Record<string, unknown>;
}

export interface ExtractedKnowledge {
  id: string;
  source: string;
  insights: string[];
  value: number;
}

export class MoltWatcher {
  private _molts: MoltEvent[] = [];
  private _extracted: ExtractedKnowledge[] = [];
  private _watching: boolean = false;
  private _current: MoltEvent | null = null;

  /** 进入监视状态。 */
  observe(): void {
    this._watching = true;
  }

  /** 捕捉一次蜕皮事件。 */
  capture(event: MoltEvent): MoltEvent {
    this._molts.push(event);
    this._current = event;
    return event;
  }

  /** 从蜕皮事件中汲取遗弃知识。 */
  extract(eventId: string): ExtractedKnowledge | null {
    const event = this._molts.find(m => m.id === eventId);
    if (!event) return null;
    const insights = Object.keys(event.knowledgePayload).map(k => `legacy:${k}`);
    const value = Math.min(1, insights.length * 0.2);
    const extracted: ExtractedKnowledge = {
      id: `knowledge-${eventId}`,
      source: event.moduleName,
      insights,
      value,
    };
    this._extracted.push(extracted);
    return extracted;
  }

  /** 把汲取到的知识归档。 */
  archive(extractedId: string): boolean {
    const k = this._extracted.find(e => e.id === extractedId);
    if (!k) return false;
    return true;
  }

  /** 评估已汲取知识的总价值。 */
  evaluate(): { total: number; averageValue: number } {
    const total = this._extracted.length;
    const sum = this._extracted.reduce((s, k) => s + k.value, 0);
    return { total, averageValue: total === 0 ? 0 : sum / total };
  }

  get current(): MoltEvent | null {
    return this._current;
  }

  getMolts(): MoltEvent[] {
    return [...this._molts];
  }

  getExtracted(): ExtractedKnowledge[] {
    return [...this._extracted];
  }

  stopObserving(): void {
    this._watching = false;
  }
}

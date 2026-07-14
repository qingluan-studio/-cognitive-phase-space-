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
  entropy: number;
  noveltyScore: number;
  distilledAt: number;
}

export class MoltWatcher {
  private _molts: MoltEvent[] = [];
  private _extracted: ExtractedKnowledge[] = [];
  private _watching: boolean = false;
  private _current: MoltEvent | null = null;
  private _knowledgeBase: Set<string> = new Set();
  private _distillationTemperature: number = 0.7;
  private _noveltyDecay: number = 0.95;

  observe(): void { this._watching = true; }

  capture(event: MoltEvent): MoltEvent {
    this._molts.push(event);
    this._current = event;
    return event;
  }

  extract(eventId: string): ExtractedKnowledge | null {
    const event = this._molts.find(m => m.id === eventId);
    if (!event) return null;
    const insights = this._distillInsights(event.knowledgePayload);
    const entropy = this._computeShannonEntropy(event.knowledgePayload);
    const noveltyScore = this._computeNovelty(insights);
    const value = this._computeKnowledgeValue(entropy, noveltyScore);
    const extracted: ExtractedKnowledge = {
      id: `knowledge-${eventId}-${Date.now()}`,
      source: event.moduleName,
      insights,
      value,
      entropy,
      noveltyScore,
      distilledAt: Date.now(),
    };
    this._extracted.push(extracted);
    for (const insight of insights) this._knowledgeBase.add(insight);
    return extracted;
  }

  archive(extractedId: string): boolean {
    const k = this._extracted.find(e => e.id === extractedId);
    if (!k) return false;
    for (const insight of k.insights) this._knowledgeBase.add(insight);
    return true;
  }

  evaluate(): { total: number; averageValue: number; totalEntropy: number; cumulativeNovelty: number } {
    const total = this._extracted.length;
    const sumValue = this._extracted.reduce((s, k) => s + k.value, 0);
    const totalEntropy = this._extracted.reduce((s, k) => s + k.entropy, 0);
    const cumulativeNovelty = this._extracted.reduce((s, k) => s + k.noveltyScore, 0);
    return { total, averageValue: total === 0 ? 0 : sumValue / total, totalEntropy, cumulativeNovelty };
  }

  get current(): MoltEvent | null { return this._current; }
  getMolts(): MoltEvent[] { return [...this._molts]; }
  getExtracted(): ExtractedKnowledge[] { return [...this._extracted]; }
  stopObserving(): void { this._watching = false; }
  get knowledgeBaseSize(): number { return this._knowledgeBase.size; }

  setDistillationTemperature(temp: number): void {
    this._distillationTemperature = Math.max(0.1, Math.min(1, temp));
  }

  private _distillInsights(payload: Record<string, unknown>): string[] {
    const keys = Object.keys(payload);
    const scored: { key: string; score: number }[] = [];
    for (const key of keys) {
      const value = payload[key];
      const complexity = this._valueComplexity(value);
      const depth = (key.match(/[._\-:]/g) || []).length;
      scored.push({ key, score: complexity * (1 + Math.min(5, depth) * 0.3) });
    }
    scored.sort((a, b) => b.score - a.score);
    const threshold = scored.length > 0 ? scored[0].score * (1 - this._distillationTemperature * 0.5) : 0;
    const insights: string[] = [];
    for (const { key, score } of scored) {
      if (score >= threshold) insights.push(`legacy:${key}=${this._summarizeValue(payload[key])}`);
    }
    return insights.slice(0, 15);
  }

  private _valueComplexity(value: unknown): number {
    if (value === null || value === undefined) return 0.1;
    const type = typeof value;
    if (type === 'boolean') return 0.2;
    if (type === 'number') return 0.4;
    if (type === 'string') return Math.min(1, (value as string).length * 0.02);
    if (type === 'object') {
      const obj = value as Record<string, unknown>;
      return Math.min(1, Object.keys(obj).length * 0.15);
    }
    return 0.3;
  }

  private _summarizeValue(value: unknown): string {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'object') {
      const keys = Object.keys(value as Record<string, unknown>);
      return `{${keys.length} fields}`;
    }
    const str = String(value);
    return str.length > 20 ? str.slice(0, 17) + '...' : str;
  }

  private _computeShannonEntropy(payload: Record<string, unknown>): number {
    const values = Object.values(payload);
    if (values.length === 0) return 0;
    const freq: Record<string, number> = {};
    let total = 0;
    for (const v of values) { const sig = this._valueSignature(v); freq[sig] = (freq[sig] ?? 0) + 1; total++; }
    let entropy = 0;
    for (const count of Object.values(freq)) {
      const p = count / total;
      if (p > 0) entropy -= p * Math.log2(p);
    }
    const maxEntropy = Math.log2(total);
    return maxEntropy === 0 ? 0 : entropy / maxEntropy;
  }

  private _valueSignature(value: unknown): string {
    const type = typeof value;
    if (type === 'object' && value !== null) {
      const keys = Object.keys(value as Record<string, unknown>).sort().join(',');
      return `obj:${keys.length}:${keys.slice(0, 50)}`;
    }
    if (type === 'string') return `str:${(value as string).length}`;
    if (type === 'number') return `num:${Math.floor((value as number) * 100)}`;
    return type;
  }

  private _computeNovelty(insights: string[]): number {
    if (insights.length === 0) return 0;
    let newCount = 0;
    for (const insight of insights) if (!this._knowledgeBase.has(insight)) newCount++;
    const ratio = newCount / insights.length;
    const decay = Math.pow(this._noveltyDecay, this._extracted.length);
    return ratio * (0.5 + decay * 0.5);
  }

  private _computeKnowledgeValue(entropy: number, novelty: number): number {
    const infoGain = entropy * 0.4;
    const noveltyGain = novelty * 0.4;
    const synergy = entropy * novelty * 0.2;
    return Math.min(1, infoGain + noveltyGain + synergy);
  }
}

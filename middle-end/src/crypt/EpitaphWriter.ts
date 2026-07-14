export interface EpitaphRecord {
  id: string;
  moduleId: string;
  moduleName: string;
  lines: string[];
  tone: 'reverent' | 'ironic' | 'tragic' | 'forgotten' | 'triumphant';
  writtenAt: number;
}

export interface EpitaphDraft {
  moduleId: string;
  summary: string;
  cause: string;
  contribution: string;
}

export class EpitaphWriter {
  private _epitaphs: Map<string, EpitaphRecord> = new Map();
  private _drafts: EpitaphDraft[] = [];
  private _maxLines = 6;
  private _templates: Map<EpitaphRecord['tone'], string[]> = new Map();
  private _markovChain: Map<string, string[]> = new Map();
  private _nGramFrequency: Map<string, number> = new Map();
  private _sentimentEntropy: number = 0;

  constructor() {
    this._templates.set('reverent', ['这里安息着{name}，尽职至最后一刻', '它服务了{n}次请求，从不抱怨']);
    this._templates.set('ironic', ['{name}说要永远运行，结果呢？', '它解决了一个bug，引发了两个']);
    this._templates.set('tragic', ['{name}死于无法预料的边界条件', '它的最后一次调用再未返回']);
    this._templates.set('forgotten', ['{name}已无人记得它做过什么', '只留下空日志和静默的指针']);
    this._templates.set('triumphant', ['{name}完成任务后光荣退役', '它消除了{n}个隐患，方才长眠']);
    this._buildMarkovChain();
  }

  private _buildMarkovChain(): void {
    const corpus = ['module', 'function', 'error', 'promise', 'async', 'await', 'return', 'void'];
    for (let i = 0; i < corpus.length - 1; i++) {
      const key = corpus[i];
      const next = corpus[i + 1];
      const list = this._markovChain.get(key) ?? [];
      list.push(next);
      this._markovChain.set(key, list);
    }
  }

  draft(moduleId: string, summary: string, cause: string, contribution: string): EpitaphDraft {
    const draft: EpitaphDraft = { moduleId, summary, cause, contribution };
    this._drafts.push(draft);
    if (this._drafts.length > 100) this._drafts.shift();
    this._updateNGramFrequency(summary);
    return draft;
  }

  private _updateNGramFrequency(text: string): void {
    const words = text.split(/\s+/);
    for (let i = 0; i < words.length - 1; i++) {
      const gram = `${words[i]} ${words[i + 1]}`;
      this._nGramFrequency.set(gram, (this._nGramFrequency.get(gram) ?? 0) + 1);
    }
    this._updateSentimentEntropy();
  }

  private _updateSentimentEntropy(): void {
    const total = Array.from(this._nGramFrequency.values()).reduce((a, b) => a + b, 0);
    if (total === 0) return;
    let entropy = 0;
    for (const count of this._nGramFrequency.values()) {
      const p = count / total;
      entropy -= p * Math.log2(p);
    }
    this._sentimentEntropy = entropy;
  }

  private _composeLines(moduleName: string, tone: EpitaphRecord['tone'], contribution: string): string[] {
    const templates = this._templates.get(tone) ?? ['{name}已逝'];
    const lines: string[] = [];
    const n = Math.floor(Math.random() * 100) + 1;
    for (const template of templates) {
      lines.push(template.replace('{name}', moduleName).replace('{n}', String(n)));
      if (lines.length >= this._maxLines) break;
    }
    lines.push(`贡献: ${contribution}`);
    return lines;
  }

  private _generateMarkovLine(start: string, length: number): string {
    let current = start;
    const result = [current];
    for (let i = 0; i < length; i++) {
      const neighbors = this._markovChain.get(current);
      if (!neighbors || neighbors.length === 0) break;
      current = neighbors[Math.floor(Math.random() * neighbors.length)];
      result.push(current);
    }
    return result.join(' ');
  }

  write(moduleId: string, moduleName: string, tone: EpitaphRecord['tone'], contribution: string): EpitaphRecord {
    const lines = this._composeLines(moduleName, tone, contribution);
    const epitaph: EpitaphRecord = {
      id: `epitaph-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      moduleId,
      moduleName,
      lines,
      tone,
      writtenAt: Date.now(),
    };
    this._epitaphs.set(moduleId, epitaph);
    return epitaph;
  }

  rewrite(moduleId: string, tone: EpitaphRecord['tone'], contribution: string): EpitaphRecord | null {
    const existing = this._epitaphs.get(moduleId);
    if (!existing) return null;
    existing.lines = this._composeLines(existing.moduleName, tone, contribution);
    existing.tone = tone;
    existing.writtenAt = Date.now();
    return existing;
  }

  read(moduleId: string): string | null {
    const epitaph = this._epitaphs.get(moduleId);
    if (!epitaph) return null;
    return `${epitaph.moduleName}\n${'-'.repeat(20)}\n${epitaph.lines.join('\n')}`;
  }

  findByTone(tone: EpitaphRecord['tone']): EpitaphRecord[] {
    return Array.from(this._epitaphs.values()).filter(e => e.tone === tone);
  }

  addTemplate(tone: EpitaphRecord['tone'], template: string): void {
    const list = this._templates.get(tone) ?? [];
    list.push(template);
    this._templates.set(tone, list);
  }

  listAll(): EpitaphRecord[] {
    return Array.from(this._epitaphs.values());
  }

  getDrafts(): EpitaphDraft[] {
    return [...this._drafts];
  }

  setMaxLines(value: number): void {
    this._maxLines = Math.max(1, value);
  }

  get epitaphCount(): number {
    return this._epitaphs.size;
  }

  get draftCount(): number {
    return this._drafts.length;
  }

  get sentimentEntropy(): number {
    return this._sentimentEntropy;
  }

  get nGramCount(): number {
    return this._nGramFrequency.size;
  }
}

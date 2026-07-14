/**
 * 墓志铭作者模块：为每个废弃模块撰写墓志铭，
 * 总结模块的功能、贡献与死亡原因，作为永久的纪念与档案。
 */

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

  constructor() {
    this._templates.set('reverent', ['这里安息着{name}，尽职至最后一刻', '它服务了{n}次请求，从不抱怨']);
    this._templates.set('ironic', ['{name}说要永远运行，结果呢？', '它解决了一个bug，引发了两个']);
    this._templates.set('tragic', ['{name}死于无法预料的边界条件', '它的最后一次调用再未返回']);
    this._templates.set('forgotten', ['{name}已无人记得它做过什么', '只留下空日志和静默的指针']);
    this._templates.set('triumphant', ['{name}完成任务后光荣退役', '它消除了{n}个隐患，方才长眠']);
  }

  draft(moduleId: string, summary: string, cause: string, contribution: string): EpitaphDraft {
    const draft: EpitaphDraft = { moduleId, summary, cause, contribution };
    this._drafts.push(draft);
    if (this._drafts.length > 100) this._drafts.shift();
    return draft;
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
}

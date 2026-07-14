/**
 * 奥德赛档案模块：记录所有离开与回归的史诗。
 * 每个模块的旅程都按章节归档，便于后世翻阅、对照、警示。
 */

export interface OdysseyArchiveData {
  chapters: number;
  volumes: string[];
  lastEntry: string | null;
}

export interface OdysseyChapter {
  id: string;
  module: string;
  event: 'departure' | 'trial' | 'return' | 'loss';
  summary: string;
  timestamp: number;
}

export class OdysseyArchive {
  private _chapters: OdysseyChapter[];
  private _volumes: Map<string, OdysseyChapter[]>;

  constructor() {
    this._chapters = [];
    this._volumes = new Map<string, OdysseyChapter[]>();
  }

  get chapterCount(): number {
    return this._chapters.length;
  }

  get volumeCount(): number {
    return this._volumes.size;
  }

  public record(chapter: OdysseyChapter): void {
    this._chapters.push(chapter);
    if (!this._volumes.has(chapter.module)) {
      this._volumes.set(chapter.module, []);
    }
    this._volumes.get(chapter.module)!.push(chapter);
  }

  public readVolume(module: string): OdysseyChapter[] {
    return [...(this._volumes.get(module) ?? [])];
  }

  public lastEntry(): OdysseyChapter | null {
    return this._chapters[this._chapters.length - 1] ?? null;
  }

  public search(event: OdysseyChapter['event']): OdysseyChapter[] {
    return this._chapters.filter((c) => c.event === event);
  }

  public volumes(): string[] {
    return Array.from(this._volumes.keys());
  }

  public report(): OdysseyArchiveData {
    const last = this.lastEntry();
    return {
      chapters: this._chapters.length,
      volumes: this.volumes(),
      lastEntry: last ? `${last.module}:${last.event}` : null,
    };
  }
}

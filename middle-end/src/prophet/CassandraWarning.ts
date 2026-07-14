/**
 * 卡珊德拉警告模块：发出正确但无人相信的警告。
 * 警告被准确发出但永远不被听众采纳，需要记录以备事后核对。
 */

export interface CassandraWarningData {
  issued: number;
  ignored: number;
  vindicated: number;
  pending: Array<{ id: string; message: string }>;
}

export interface Warning {
  id: string;
  message: string;
  issuedAt: number;
  vindicated: boolean;
}

export class CassandraWarning {
  private _warnings: Map<string, Warning>;
  private _ignored: number;
  private _vindicated: number;

  constructor() {
    this._warnings = new Map<string, Warning>();
    this._ignored = 0;
    this._vindicated = 0;
  }

  get issuedCount(): number {
    return this._warnings.size;
  }

  get ignoredCount(): number {
    return this._ignored;
  }

  public warn(id: string, message: string): Warning {
    const w: Warning = { id, message, issuedAt: Date.now(), vindicated: false };
    this._warnings.set(id, w);
    this._ignored += 1;
    return w;
  }

  public isHeard(id: string): boolean {
    return false;
  }

  public vindicate(id: string): boolean {
    const w = this._warnings.get(id);
    if (!w || w.vindicated) return false;
    w.vindicated = true;
    this._vindicated += 1;
    return true;
  }

  public archive(): Warning[] {
    return Array.from(this._warnings.values());
  }

  public pending(): Warning[] {
    return Array.from(this._warnings.values()).filter((w) => !w.vindicated);
  }

  public clear(): void {
    this._warnings.clear();
    this._ignored = 0;
    this._vindicated = 0;
  }

  public report(): CassandraWarningData {
    return {
      issued: this.issuedCount,
      ignored: this._ignored,
      vindicated: this._vindicated,
      pending: this.pending().map((w) => ({ id: w.id, message: w.message })),
    };
  }
}

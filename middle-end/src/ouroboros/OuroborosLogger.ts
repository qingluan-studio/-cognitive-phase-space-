/**
 * 衔尾蛇日志：日志记录器记录自身的记录动作，无限回归。
 * 每次写入日志都会触发对"写入动作"本身的元日志记录，
 * 形成无限自指回归；为防止栈爆，受最大回归深度限制。
 */

export interface LogEntry {
  id: number;
  level: 'info' | 'warn' | 'error' | 'meta';
  message: string;
  metaLevel: number;
  timestamp: number;
}

export class OuroborosLogger {
  private _logs: LogEntry[] = [];
  private _metaLevel: number = 0;
  private _maxDepth: number = 8;
  private _terminated: boolean = false;
  private _counter: number = 0;

  /** 写入一条日志，并触发对其自身的元日志记录。 */
  log(level: LogEntry['level'], message: string): LogEntry {
    const entry: LogEntry = {
      id: ++this._counter,
      level,
      message,
      metaLevel: 0,
      timestamp: Date.now(),
    };
    this._logs.push(entry);
    this._logTheLog(entry);
    return entry;
  }

  /** 记录"刚刚记录"这一动作，进入更高元层级。 */
  logTheLog(sourceId: number): LogEntry | null {
    const src = this._logs.find(l => l.id === sourceId);
    if (!src) return null;
    return this._logTheLog(src);
  }

  /** 显式执行一次自指回归。 */
  recurse(entryId: number): number {
    let depth = 0;
    let current = this._logs.find(l => l.id === entryId);
    while (current && depth < this._maxDepth) {
      const meta = this._logTheLog(current);
      if (!meta) break;
      current = meta;
      depth++;
    }
    return depth;
  }

  /** 终止自指链，停止元日志记录。 */
  terminate(): void {
    this._terminated = true;
  }

  resume(): void {
    this._terminated = false;
  }

  get depth(): number {
    return this._metaLevel;
  }

  getLogs(): LogEntry[] {
    return [...this._logs];
  }

  get totalEntries(): number {
    return this._logs.length;
  }

  setMaxDepth(depth: number): void {
    this._maxDepth = depth;
  }

  private _logTheLog(src: LogEntry): LogEntry | null {
    if (this._terminated || src.metaLevel >= this._maxDepth) return null;
    this._metaLevel = Math.max(this._metaLevel, src.metaLevel + 1);
    const meta: LogEntry = {
      id: ++this._counter,
      level: 'meta',
      message: `[meta] logged: "${src.message.slice(0, 32)}..."`,
      metaLevel: src.metaLevel + 1,
      timestamp: Date.now(),
    };
    this._logs.push(meta);
    return meta;
  }
}

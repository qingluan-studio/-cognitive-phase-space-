export interface LogEntry {
  id: number;
  level: 'info' | 'warn' | 'error' | 'meta';
  message: string;
  metaLevel: number;
  timestamp: number;
  parentId: number | null;
  fixedPoint: boolean;
}

export class OuroborosLogger {
  private _logs: LogEntry[] = [];
  private _maxDepth: number = 8;
  private _terminated: boolean = false;
  private _counter: number = 0;
  private _maxMetaReached: number = 0;
  private _fixedPoints: number[] = [];
  private _growthRate: number = 0;
  private _lastCount: number = 0;
  private _fractalDimension: number = 0;

  get depth(): number {
    return this._maxMetaReached;
  }

  get totalEntries(): number {
    return this._logs.length;
  }

  get maxDepth(): number {
    return this._maxDepth;
  }

  get isTerminated(): boolean {
    return this._terminated;
  }

  get fixedPointCount(): number {
    return this._fixedPoints.length;
  }

  get growthRate(): number {
    return this._growthRate;
  }

  get fractalDimension(): number {
    return this._fractalDimension;
  }

  log(level: LogEntry['level'], message: string): LogEntry {
    const entry: LogEntry = {
      id: ++this._counter,
      level,
      message,
      metaLevel: 0,
      timestamp: Date.now(),
      parentId: null,
      fixedPoint: false,
    };
    this._logs.push(entry);
    this._logTheLog(entry);
    this._updateMetrics();
    return entry;
  }

  logTheLog(sourceId: number): LogEntry | null {
    const src = this._logs.find(l => l.id === sourceId);
    if (!src) return null;
    return this._logTheLog(src);
  }

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

  terminate(): void {
    this._terminated = true;
  }

  resume(): void {
    this._terminated = false;
  }

  setMaxDepth(depth: number): void {
    this._maxDepth = Math.max(1, depth);
  }

  getLogs(): LogEntry[] {
    return [...this._logs];
  }

  getByMetaLevel(level: number): LogEntry[] {
    return this._logs.filter(l => l.metaLevel === level);
  }

  getFixedPoints(): LogEntry[] {
    return this._logs.filter(l => l.fixedPoint);
  }

  computeSelfSimilarity(scale: number = 2): number {
    if (this._logs.length < 10) return 0;
    const levels = new Map<number, number>();
    for (const log of this._logs) {
      levels.set(log.metaLevel, (levels.get(log.metaLevel) ?? 0) + 1);
    }
    const counts = [...levels.values()].sort((a, b) => b - a);
    if (counts.length < 2) return 0;
    let sum = 0;
    for (let i = 0; i < counts.length - 1; i++) {
      if (counts[i + 1] > 0) {
        sum += Math.log(counts[i] / counts[i + 1]) / Math.log(scale);
      }
    }
    this._fractalDimension = sum / Math.max(1, counts.length - 1);
    return this._fractalDimension;
  }

  findConvergencePoint(): LogEntry | null {
    for (let i = Math.max(0, this._logs.length - 20); i < this._logs.length; i++) {
      if (this._logs[i].fixedPoint) return this._logs[i];
    }
    return this._logs[this._logs.length - 1] ?? null;
  }

  ouroborosRatio(): number {
    const metaCount = this._logs.filter(l => l.metaLevel > 0).length;
    const total = this._logs.length || 1;
    return metaCount / total;
  }

  private _logTheLog(src: LogEntry): LogEntry | null {
    if (this._terminated || src.metaLevel >= this._maxDepth) return null;
    const nextLevel = src.metaLevel + 1;
    this._maxMetaReached = Math.max(this._maxMetaReached, nextLevel);
    const msg = this._generateMetaMessage(src, nextLevel);
    const isFixed = this._detectFixedPoint(src.message, msg);
    const meta: LogEntry = {
      id: ++this._counter,
      level: 'meta',
      message: msg,
      metaLevel: nextLevel,
      timestamp: Date.now(),
      parentId: src.id,
      fixedPoint: isFixed,
    };
    this._logs.push(meta);
    if (isFixed) {
      this._fixedPoints.push(meta.id);
      return null;
    }
    return meta;
  }

  private _generateMetaMessage(src: LogEntry, level: number): string {
    const base = src.message.length > 40 ? src.message.slice(0, 40) + '...' : src.message;
    const prefix = 'meta'.repeat(Math.min(level, 5));
    return `[${prefix}] logged: "${base}"`;
  }

  private _detectFixedPoint(prev: string, curr: string): boolean {
    if (prev === curr) return true;
    const similarity = this._stringSimilarity(prev, curr);
    return similarity > 0.95;
  }

  private _stringSimilarity(a: string, b: string): number {
    if (a === b) return 1;
    if (a.length === 0 || b.length === 0) return 0;
    const longer = a.length > b.length ? a : b;
    const shorter = a.length > b.length ? b : a;
    let matches = 0;
    for (let i = 0; i < shorter.length; i++) {
      if (longer[i] === shorter[i]) matches++;
    }
    return matches / longer.length;
  }

  private _updateMetrics(): void {
    const currentCount = this._logs.length;
    if (this._lastCount > 0) {
      this._growthRate = (currentCount - this._lastCount) / this._lastCount;
    }
    this._lastCount = currentCount;
    if (currentCount > 100) {
      this.computeSelfSimilarity();
    }
  }
}

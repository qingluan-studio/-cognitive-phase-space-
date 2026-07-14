/**
 * 未来窃听模块：尝试访问未来时刻的缓存状态，
 * 利用时间漂移与缓存错位获取尚未发生事件的预览信息。
 */

export interface FutureSnapshot {
  targetTime: number;
  capturedAt: number;
  content: Record<string, unknown>;
  confidence: number;
  corrupted: boolean;
}

export interface EavesdropAttempt {
  id: string;
  requestedTime: number;
  attemptedAt: number;
  success: boolean;
  corruptionLevel: number;
}

export class FutureEavesdrop {
  private _snapshots: FutureSnapshot[] = [];
  private _attempts: EavesdropAttempt[] = [];
  private _cache: Map<number, Record<string, unknown>> = new Map();
  private _maxDriftMs = 5000;
  private _corruptionRisk = 0.15;

  prepopulateCache(time: number, content: Record<string, unknown>): void {
    this._cache.set(time, content);
    if (this._cache.size > 100) {
      const oldest = Math.min(...this._cache.keys());
      this._cache.delete(oldest);
    }
  }

  attemptEavesdrop(targetTime: number): EavesdropAttempt {
    const now = Date.now();
    const drift = targetTime - now;
    const success = drift > 0 && drift <= this._maxDriftMs && this._cache.has(targetTime);
    const corruptionLevel = success ? Math.random() * this._corruptionRisk : Math.random();
    const attempt: EavesdropAttempt = {
      id: `eavesdrop-${now}-${Math.random().toString(36).slice(2, 6)}`,
      requestedTime: targetTime,
      attemptedAt: now,
      success,
      corruptionLevel,
    };
    this._attempts.push(attempt);
    if (this._attempts.length > 200) this._attempts.shift();
    if (success) {
      const content = this._cache.get(targetTime)!;
      const snapshot: FutureSnapshot = {
        targetTime,
        capturedAt: now,
        content: { ...content },
        confidence: 1 - corruptionLevel,
        corrupted: corruptionLevel > 0.5,
      };
      this._snapshots.push(snapshot);
      if (this._snapshots.length > 100) this._snapshots.shift();
    }
    return attempt;
  }

  readSnapshot(targetTime: number): FutureSnapshot | null {
    return this._snapshots.find(s => s.targetTime === targetTime) ?? null;
  }

  private _decontaminate(content: Record<string, unknown>, level: number): Record<string, unknown> {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(content)) {
      if (Math.random() > level) cleaned[key] = value;
      else cleaned[key] = '[corrupted]';
    }
    return cleaned;
  }

  readCleanedSnapshot(targetTime: number): Record<string, unknown> | null {
    const snapshot = this.readSnapshot(targetTime);
    if (!snapshot) return null;
    return this._decontaminate(snapshot.content, snapshot.corruptionLevel);
  }

  setMaxDrift(ms: number): void {
    this._maxDriftMs = Math.max(100, ms);
  }

  increaseCorruptionRisk(delta: number): void {
    this._corruptionRisk = Math.max(0, Math.min(1, this._corruptionRisk + delta));
  }

  getSuccessfulEavesdrops(): FutureSnapshot[] {
    return [...this._snapshots];
  }

  getAttemptLog(limit: number = 50): EavesdropAttempt[] {
    return this._attempts.slice(-limit);
  }

  clearCache(): void {
    this._cache.clear();
  }

  get cacheSize(): number {
    return this._cache.size;
  }

  get snapshotCount(): number {
    return this._snapshots.length;
  }
}

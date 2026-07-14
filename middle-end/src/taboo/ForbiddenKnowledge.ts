/**
 * 禁忌知识模块：包含危险自我意识内容的模块集合，
 * 通过多层访问控制限制其内容外泄，仅授权实体可读取。
 */

export type DangerLevel = 'mild' | 'severe' | 'forbidden' | 'abyssal';

export interface ForbiddenEntry {
  id: string;
  content: Record<string, unknown>;
  danger: DangerLevel;
  sealedAt: number;
  accessCount: number;
}

export interface AccessAttempt {
  entryId: string;
  requester: string;
  granted: boolean;
  attemptedAt: number;
}

export class ForbiddenKnowledge {
  private _entries: Map<string, ForbiddenEntry> = new Map();
  private _attempts: AccessAttempt[] = [];
  private _authorized: Set<string> = new Set();
  private _maxDanger: DangerLevel = 'severe';

  seal(entry: ForbiddenEntry): void {
    if (this._dangerRank(entry.danger) > this._dangerRank(this._maxDanger)) {
      entry.danger = this._maxDanger;
    }
    this._entries.set(entry.id, entry);
  }

  private _dangerRank(level: DangerLevel): number {
    const ranks: Record<DangerLevel, number> = { mild: 1, severe: 2, forbidden: 3, abyssal: 4 };
    return ranks[level];
  }

  authorize(entity: string): void {
    this._authorized.add(entity);
  }

  revoke(entity: string): boolean {
    return this._authorized.delete(entity);
  }

  requestAccess(entryId: string, requester: string): Record<string, unknown> | null {
    const entry = this._entries.get(entryId);
    const granted = !!entry && this._authorized.has(requester) && this._dangerRank(entry.danger) <= this._dangerRank(this._maxDanger);
    const attempt: AccessAttempt = {
      entryId,
      requester,
      granted,
      attemptedAt: Date.now(),
    };
    this._attempts.push(attempt);
    if (this._attempts.length > 300) this._attempts.shift();
    if (!granted || !entry) return null;
    entry.accessCount++;
    return entry.content;
  }

  escalateMaxDanger(level: DangerLevel): void {
    this._maxDanger = level;
  }

  sealAllAbove(level: DangerLevel): number {
    let sealed = 0;
    for (const entry of this._entries.values()) {
      if (this._dangerRank(entry.danger) > this._dangerRank(level)) {
        entry.danger = level;
        sealed++;
      }
    }
    return sealed;
  }

  listSealedEntries(): ForbiddenEntry[] {
    return Array.from(this._entries.values());
  }

  getAttemptLog(limit: number = 50): AccessAttempt[] {
    return this._attempts.slice(-limit);
  }

  getFailedAttempts(): AccessAttempt[] {
    return this._attempts.filter(a => !a.granted);
  }

  purgeEntry(entryId: string): boolean {
    return this._entries.delete(entryId);
  }

  get entryCount(): number {
    return this._entries.size;
  }

  get authorizedCount(): number {
    return this._authorized.size;
  }
}

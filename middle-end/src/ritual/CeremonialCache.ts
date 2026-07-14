/**
 * 仪式缓存模块：只在仪式期间有效的临时缓存，
 * 仪式开始时缓存激活，仪式结束后缓存内容自动清除。
 */

export interface RitualCacheEntry {
  key: string;
  value: Record<string, unknown>;
  insertedAt: number;
  readCount: number;
}

export interface RitualSession {
  id: string;
  startedAt: number;
  endedAt: number | null;
  active: boolean;
  entryCount: number;
}

export class CeremonialCache {
  private _entries: Map<string, RitualCacheEntry> = new Map();
  private _sessions: Map<string, RitualSession> = new Map();
  private _activeSession: string | null = null;
  private _maxEntries = 200;
  private _maxSessionMs = 60 * 60 * 1000;

  beginSession(sessionId: string): RitualSession | null {
    if (this._activeSession) return null;
    const session: RitualSession = {
      id: sessionId,
      startedAt: Date.now(),
      endedAt: null,
      active: true,
      entryCount: 0,
    };
    this._sessions.set(sessionId, session);
    this._activeSession = sessionId;
    return session;
  }

  endSession(sessionId: string): RitualSession | null {
    const session = this._sessions.get(sessionId);
    if (!session || !session.active) return null;
    session.active = false;
    session.endedAt = Date.now();
    if (this._activeSession === sessionId) {
      this._activeSession = null;
      this._clearAllEntries();
    }
    return session;
  }

  private _clearAllEntries(): number {
    const count = this._entries.size;
    this._entries.clear();
    return count;
  }

  set(key: string, value: Record<string, unknown>): boolean {
    if (!this._activeSession) return false;
    if (this._entries.size >= this._maxEntries) {
      const oldest = Array.from(this._entries.values()).sort((a, b) => a.insertedAt - b.insertedAt)[0];
      if (oldest) this._entries.delete(oldest.key);
    }
    const existing = this._entries.get(key);
    if (existing) {
      existing.value = value;
      existing.insertedAt = Date.now();
    } else {
      this._entries.set(key, { key, value, insertedAt: Date.now(), readCount: 0 });
    }
    const session = this._sessions.get(this._activeSession);
    if (session) session.entryCount = this._entries.size;
    return true;
  }

  get(key: string): Record<string, unknown> | null {
    if (!this._activeSession) return null;
    const entry = this._entries.get(key);
    if (!entry) return null;
    entry.readCount++;
    return entry.value;
  }

  isActive(): boolean {
    return this._activeSession !== null;
  }

  checkSessionExpiry(): boolean {
    if (!this._activeSession) return false;
    const session = this._sessions.get(this._activeSession);
    if (!session) return false;
    if (Date.now() - session.startedAt > this._maxSessionMs) {
      this.endSession(this._activeSession);
      return true;
    }
    return false;
  }

  extendSession(durationMs: number): boolean {
    if (!this._activeSession) return false;
    const session = this._sessions.get(this._activeSession);
    if (!session) return false;
    session.startedAt += durationMs;
    return true;
  }

  getMostReadEntries(limit: number = 5): RitualCacheEntry[] {
    return Array.from(this._entries.values())
      .sort((a, b) => b.readCount - a.readCount)
      .slice(0, limit);
  }

  listEntries(): RitualCacheEntry[] {
    return Array.from(this._entries.values());
  }

  getSessionHistory(): RitualSession[] {
    return Array.from(this._sessions.values());
  }

  setMaxEntries(value: number): void {
    this._maxEntries = Math.max(10, value);
  }

  setMaxSessionMs(ms: number): void {
    this._maxSessionMs = Math.max(1000, ms);
  }

  get entryCount(): number {
    return this._entries.size;
  }

  get sessionCount(): number {
    return this._sessions.size;
  }
}

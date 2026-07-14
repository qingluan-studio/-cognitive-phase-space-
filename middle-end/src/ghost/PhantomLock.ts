/**
 * 幻象锁模块：已释放的锁仍产生效果，资源看似被锁实则未锁，
 * 其他线程误以为资源被占用，导致虚假的阻塞与等待。
 */

export type LockPhantomState = 'held' | 'released' | 'phantom' | 'dispelled';

export interface PhantomLockEntry {
  id: string;
  resourceId: string;
  holder: string;
  state: LockPhantomState;
  acquiredAt: number;
  releasedAt: number | null;
  phantomWaiters: string[];
}

export interface WaiterReport {
  resourceId: string;
  waiterId: string;
  blocked: boolean;
  reason: string;
}

export class PhantomLock {
  private _locks: Map<string, PhantomLockEntry> = new Map();
  private _waiterReports: WaiterReport[] = [];
  private _phantomDecayMs = 30000;
  private _maxWaiters = 10;

  acquire(lockId: string, resourceId: string, holder: string): PhantomLockEntry | null {
    if (this._isHeld(resourceId)) return null;
    const entry: PhantomLockEntry = {
      id: lockId,
      resourceId,
      holder,
      state: 'held',
      acquiredAt: Date.now(),
      releasedAt: null,
      phantomWaiters: [],
    };
    this._locks.set(lockId, entry);
    return entry;
  }

  private _isHeld(resourceId: string): boolean {
    for (const lock of this._locks.values()) {
      if (lock.resourceId === resourceId && lock.state === 'held') return true;
    }
    return false;
  }

  release(lockId: string): boolean {
    const lock = this._locks.get(lockId);
    if (!lock || lock.state !== 'held') return false;
    lock.state = 'released';
    lock.releasedAt = Date.now();
    if (lock.phantomWaiters.length > 0) {
      lock.state = 'phantom';
    }
    return true;
  }

  attemptWait(resourceId: string, waiterId: string): WaiterReport {
    let blocked = false;
    let reason = 'resource available';
    for (const lock of this._locks.values()) {
      if (lock.resourceId !== resourceId) continue;
      if (lock.state === 'held' || lock.state === 'phantom') {
        blocked = true;
        reason = lock.state === 'phantom' ? 'phantom lock blocking' : 'lock genuinely held';
        if (lock.phantomWaiters.length < this._maxWaiters) {
          lock.phantomWaiters.push(waiterId);
        }
        break;
      }
    }
    const report: WaiterReport = { resourceId, waiterId, blocked, reason };
    this._waiterReports.push(report);
    if (this._waiterReports.length > 300) this._waiterReports.shift();
    return report;
  }

  scanForPhantoms(): number {
    const now = Date.now();
    let dispelled = 0;
    for (const lock of this._locks.values()) {
      if (lock.state === 'phantom' && lock.releasedAt) {
        if (now - lock.releasedAt > this._phantomDecayMs) {
          lock.state = 'dispelled';
          lock.phantomWaiters = [];
          dispelled++;
        }
      }
    }
    return dispelled;
  }

  dispel(lockId: string): boolean {
    const lock = this._locks.get(lockId);
    if (!lock || lock.state !== 'phantom') return false;
    lock.state = 'dispelled';
    lock.phantomWaiters = [];
    return true;
  }

  getPhantomLocks(): PhantomLockEntry[] {
    return Array.from(this._locks.values()).filter(l => l.state === 'phantom');
  }

  getLocksByResource(resourceId: string): PhantomLockEntry[] {
    return Array.from(this._locks.values()).filter(l => l.resourceId === resourceId);
  }

  setPhantomDecay(ms: number): void {
    this._phantomDecayMs = Math.max(1000, ms);
  }

  getWaiterReports(limit: number = 50): WaiterReport[] {
    return this._waiterReports.slice(-limit);
  }

  listAllLocks(): PhantomLockEntry[] {
    return Array.from(this._locks.values());
  }

  get lockCount(): number {
    return this._locks.size;
  }

  get phantomCount(): number {
    return this.getPhantomLocks().length;
  }
}

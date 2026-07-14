/**
 * 地穴看守者模块：守护死亡模块的金库，防止未经授权的复活，
 * 监控所有访问尝试，对可疑行为发出警报并主动封堵。
 */

export type AlertLevel = 'info' | 'warning' | 'critical' | 'lockdown';

export interface WatchEntry {
  moduleId: string;
  sealed: boolean;
  accessAttempts: number;
  lastWatcher: string | null;
}

export interface SecurityAlert {
  id: string;
  moduleId: string;
  level: AlertLevel;
  message: string;
  triggeredAt: number;
  resolved: boolean;
}

export class CryptKeeper {
  private _watch: Map<string, WatchEntry> = new Map();
  private _alerts: SecurityAlert[] = [];
  private _allowed: Set<string> = new Set();
  private _blocked: Set<string> = new Set();
  private _lockdownActive = false;
  private _maxAttemptsBeforeAlert = 3;

  grantAccess(entity: string): void {
    this._allowed.add(entity);
    this._blocked.delete(entity);
  }

  blockEntity(entity: string): void {
    this._blocked.add(entity);
    this._allowed.delete(entity);
  }

  sealModule(moduleId: string): void {
    const entry = this._watch.get(moduleId) ?? {
      moduleId,
      sealed: false,
      accessAttempts: 0,
      lastWatcher: null,
    };
    entry.sealed = true;
    this._watch.set(moduleId, entry);
  }

  unsealModule(moduleId: string, requester: string): boolean {
    if (this._lockdownActive) return false;
    if (!this._allowed.has(requester)) return false;
    const entry = this._watch.get(moduleId);
    if (!entry) return false;
    entry.sealed = false;
    return true;
  }

  authorizeResurrection(moduleId: string, requester: string): boolean {
    if (this._lockdownActive) {
      this._raiseAlert(moduleId, 'lockdown', `Resurrection blocked during lockdown by ${requester}`);
      return false;
    }
    if (this._blocked.has(requester)) {
      this._raiseAlert(moduleId, 'critical', `Blocked entity ${requester} attempted resurrection`);
      return false;
    }
    const entry = this._watch.get(moduleId);
    if (!entry || entry.sealed) {
      this._raiseAlert(moduleId, 'warning', `Sealed module ${moduleId} resurrection attempted by ${requester}`);
      return false;
    }
    if (!this._allowed.has(requester)) {
      entry.accessAttempts++;
      if (entry.accessAttempts >= this._maxAttemptsBeforeAlert) {
        this._raiseAlert(moduleId, 'critical', `Too many unauthorized attempts by ${requester}`);
        this._lockdownActive = true;
      }
      return false;
    }
    entry.lastWatcher = requester;
    return true;
  }

  private _raiseAlert(moduleId: string, level: AlertLevel, message: string): void {
    const alert: SecurityAlert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      moduleId,
      level,
      message,
      triggeredAt: Date.now(),
      resolved: false,
    };
    this._alerts.push(alert);
    if (this._alerts.length > 200) this._alerts.shift();
  }

  resolveAlert(alertId: string): boolean {
    const alert = this._alerts.find(a => a.id === alertId);
    if (!alert) return false;
    alert.resolved = true;
    return true;
  }

  liftLockdown(authorizer: string): boolean {
    if (!this._allowed.has(authorizer)) return false;
    this._lockdownActive = false;
    return true;
  }

  getActiveAlerts(): SecurityAlert[] {
    return this._alerts.filter(a => !a.resolved);
  }

  getAlertHistory(limit: number = 50): SecurityAlert[] {
    return this._alerts.slice(-limit);
  }

  listSealedModules(): string[] {
    return Array.from(this._watch.values()).filter(w => w.sealed).map(w => w.moduleId);
  }

  getWatchEntry(moduleId: string): WatchEntry | null {
    return this._watch.get(moduleId) ?? null;
  }

  setMaxAttemptsBeforeAlert(value: number): void {
    this._maxAttemptsBeforeAlert = Math.max(1, value);
  }

  get watchCount(): number {
    return this._watch.size;
  }

  get isLockdownActive(): boolean {
    return this._lockdownActive;
  }
}

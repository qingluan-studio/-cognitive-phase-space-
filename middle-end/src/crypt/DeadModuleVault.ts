/**
 * 死模块金库模块：保存已死但可能未来还有用的模块遗体，
 * 在金库中维持休眠态，需要时可取回参考或部分复活。
 */

export type VaultStatus = 'intact' | 'decaying' | 'fragmented' | 'dust';

export interface DeadModule {
  id: string;
  name: string;
  code: string;
  deathCause: string;
  status: VaultStatus;
  preservedAt: number;
  lastAccessedAt: number | null;
}

export interface VaultAccessLog {
  moduleId: string;
  accessor: string;
  purpose: string;
  accessedAt: number;
}

export class DeadModuleVault {
  private _modules: Map<string, DeadModule> = new Map();
  private _accessLogs: VaultAccessLog[] = [];
  private _decayInterval = 1000 * 60 * 60;
  private _lastDecay = Date.now();

  deposit(module: DeadModule): void {
    module.preservedAt = Date.now();
    module.lastAccessedAt = null;
    this._modules.set(module.id, module);
  }

  retrieve(moduleId: string, accessor: string, purpose: string): DeadModule | null {
    const module = this._modules.get(moduleId);
    if (!module) return null;
    module.lastAccessedAt = Date.now();
    const log: VaultAccessLog = {
      moduleId,
      accessor,
      purpose,
      accessedAt: Date.now(),
    };
    this._accessLogs.push(log);
    if (this._accessLogs.length > 300) this._accessLogs.shift();
    return module;
  }

  private _nextStatus(status: VaultStatus): VaultStatus {
    const order: VaultStatus[] = ['intact', 'decaying', 'fragmented', 'dust'];
    const index = order.indexOf(status);
    if (index < 0 || index >= order.length - 1) return status;
    return order[index + 1];
  }

  runDecay(): number {
    const now = Date.now();
    if (now - this._lastDecay < this._decayInterval) return 0;
    this._lastDecay = now;
    let decayed = 0;
    for (const module of this._modules.values()) {
      if (module.status !== 'dust') {
        module.status = this._nextStatus(module.status);
        decayed++;
      }
    }
    return decayed;
  }

  restore(moduleId: string): boolean {
    const module = this._modules.get(moduleId);
    if (!module) return false;
    if (module.status === 'dust') return false;
    module.status = 'intact';
    return true;
  }

  extractFragment(moduleId: string, fragmentLength: number): string | null {
    const module = this._modules.get(moduleId);
    if (!module || module.status === 'dust') return null;
    return module.code.slice(0, Math.min(fragmentLength, module.code.length));
  }

  listByStatus(status: VaultStatus): DeadModule[] {
    return Array.from(this._modules.values()).filter(m => m.status === status);
  }

  purgeDust(): number {
    let purged = 0;
    for (const [id, m] of this._modules) {
      if (m.status === 'dust') {
        this._modules.delete(id);
        purged++;
      }
    }
    return purged;
  }

  getAccessLog(limit: number = 50): VaultAccessLog[] {
    return this._accessLogs.slice(-limit);
  }

  findByName(name: string): DeadModule | null {
    for (const m of this._modules.values()) {
      if (m.name === name) return m;
    }
    return null;
  }

  setDecayInterval(ms: number): void {
    this._decayInterval = Math.max(1000, ms);
  }

  get moduleCount(): number {
    return this._modules.size;
  }

  get intactCount(): number {
    return this.listByStatus('intact').length;
  }
}

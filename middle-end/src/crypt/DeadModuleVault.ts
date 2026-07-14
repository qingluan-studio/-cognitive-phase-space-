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
  private _markovChain: Map<VaultStatus, Map<VaultStatus, number>> = new Map();
  private _statusEntropy: number = 0;
  private _fragmentationIndex: Map<string, number> = new Map();

  constructor() {
    this._initMarkovChain();
  }

  private _initMarkovChain(): void {
    const states: VaultStatus[] = ['intact', 'decaying', 'fragmented', 'dust'];
    for (let i = 0; i < states.length; i++) {
      const map = new Map<VaultStatus, number>();
      for (let j = 0; j < states.length; j++) {
        map.set(states[j], i === j ? 0.7 : (j === i + 1 ? 0.3 : 0));
      }
      this._markovChain.set(states[i], map);
    }
  }

  deposit(module: DeadModule): void {
    module.preservedAt = Date.now();
    module.lastAccessedAt = null;
    this._modules.set(module.id, module);
    this._fragmentationIndex.set(module.id, 0);
    this._updateStatusEntropy();
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
    const transitions = this._markovChain.get(status);
    if (!transitions) return status;
    const roll = Math.random();
    let cumulative = 0;
    for (const [next, prob] of transitions.entries()) {
      cumulative += prob;
      if (roll <= cumulative) return next;
    }
    return status;
  }

  runDecay(): number {
    const now = Date.now();
    if (now - this._lastDecay < this._decayInterval) return 0;
    this._lastDecay = now;
    let decayed = 0;
    for (const module of this._modules.values()) {
      if (module.status !== 'dust') {
        module.status = this._nextStatus(module.status);
        const frag = this._fragmentationIndex.get(module.id) ?? 0;
        this._fragmentationIndex.set(module.id, frag + 0.1);
        decayed++;
      }
    }
    this._updateStatusEntropy();
    return decayed;
  }

  private _updateStatusEntropy(): void {
    const counts: Record<string, number> = {};
    for (const m of this._modules.values()) {
      counts[m.status] = (counts[m.status] ?? 0) + 1;
    }
    const total = this._modules.size;
    if (total === 0) {
      this._statusEntropy = 0;
      return;
    }
    let entropy = 0;
    for (const count of Object.values(counts)) {
      const p = count / total;
      entropy -= p * Math.log2(p);
    }
    this._statusEntropy = entropy;
  }

  restore(moduleId: string): boolean {
    const module = this._modules.get(moduleId);
    if (!module) return false;
    if (module.status === 'dust') return false;
    module.status = 'intact';
    this._fragmentationIndex.set(moduleId, 0);
    this._updateStatusEntropy();
    return true;
  }

  extractFragment(moduleId: string, fragmentLength: number): string | null {
    const module = this._modules.get(moduleId);
    if (!module || module.status === 'dust') return null;
    const frag = this._fragmentationIndex.get(moduleId) ?? 0;
    const effectiveLength = Math.max(1, Math.floor(fragmentLength * (1 - frag)));
    return module.code.slice(0, Math.min(effectiveLength, module.code.length));
  }

  listByStatus(status: VaultStatus): DeadModule[] {
    return Array.from(this._modules.values()).filter(m => m.status === status);
  }

  purgeDust(): number {
    let purged = 0;
    for (const [id, m] of this._modules) {
      if (m.status === 'dust') {
        this._modules.delete(id);
        this._fragmentationIndex.delete(id);
        purged++;
      }
    }
    this._updateStatusEntropy();
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

  get statusEntropy(): number {
    return this._statusEntropy;
  }

  get averageFragmentation(): number {
    if (this._fragmentationIndex.size === 0) return 0;
    const sum = Array.from(this._fragmentationIndex.values()).reduce((a, b) => a + b, 0);
    return sum / this._fragmentationIndex.size;
  }
}

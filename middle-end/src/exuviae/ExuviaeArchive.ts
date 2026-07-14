export interface Shell {
  id: string;
  module: string;
  version: string;
  state: Record<string, unknown>;
  storedAt: number;
  resurrected: boolean;
}

export interface ArchaeologyReport {
  module: string;
  versions: number;
  lineage: string[];
  evolutionRate: number;
  changeVectors: Record<string, number>;
  stableVersions: string[];
}

export class ExuviaeArchive {
  private _shells: Map<string, Shell> = new Map();
  private _indexByModule: Map<string, string[]> = new Map();
  private _versionGraph: Map<string, Set<string>> = new Map();
  private _stableThreshold: number = 0.3;

  store(shell: Shell): Shell {
    this._shells.set(shell.id, shell);
    const list = this._indexByModule.get(shell.module) ?? [];
    list.push(shell.id);
    this._indexByModule.set(shell.module, list);
    this._updateVersionGraph(shell.module);
    return shell;
  }

  retrieve(id: string): Shell | null {
    return this._shells.get(id) ?? null;
  }

  resurrect(module: string): Shell | null {
    const ids = this._indexByModule.get(module) ?? [];
    for (let i = ids.length - 1; i >= 0; i--) {
      const shell = this._shells.get(ids[i]);
      if (shell && !shell.resurrected) { shell.resurrected = true; return shell; }
    }
    return null;
  }

  rollback(module: string, version: string): Shell | null {
    const ids = this._indexByModule.get(module) ?? [];
    for (const id of ids) {
      const shell = this._shells.get(id);
      if (shell && shell.version === version) return shell;
    }
    return null;
  }

  archaeology(module: string): ArchaeologyReport {
    const shells = this.byModule(module);
    const sorted = this._topologicalSort(shells);
    const versions = sorted.map(s => s.version);
    const { evolutionRate, changeVectors } = this._computeEvolutionMetrics(sorted);
    const stableVersions = this._identifyStableVersions(sorted);
    return { module, versions: sorted.length, lineage: versions, evolutionRate, changeVectors, stableVersions };
  }

  getShells(): Shell[] { return [...this._shells.values()]; }
  get moduleCount(): number { return this._indexByModule.size; }

  byModule(module: string): Shell[] {
    return (this._indexByModule.get(module) ?? [])
      .map(id => this._shells.get(id)).filter((s): s is Shell => !!s);
  }

  diff(versionA: string, versionB: string, module: string): Record<string, { a: unknown; b: unknown; changed: boolean }> {
    const shells = this.byModule(module);
    const a = shells.find(s => s.version === versionA);
    const b = shells.find(s => s.version === versionB);
    if (!a || !b) return {};
    const allKeys = new Set([...Object.keys(a.state), ...Object.keys(b.state)]);
    const diff: Record<string, { a: unknown; b: unknown; changed: boolean }> = {};
    for (const key of allKeys) diff[key] = { a: a.state[key], b: b.state[key], changed: !this._deepEqual(a.state[key], b.state[key]) };
    return diff;
  }

  findNearestAncestor(module: string, version: string): Shell | null {
    const shells = this.byModule(module);
    const target = shells.find(s => s.version === version);
    if (!target) return null;
    const ancestors = shells.filter(s => this._compareVersions(s.version, version) < 0 && s.id !== target.id);
    return ancestors.length === 0 ? null : ancestors.sort((a, b) => this._compareVersions(b.version, a.version))[0];
  }

  setStableThreshold(threshold: number): void {
    this._stableThreshold = Math.max(0, Math.min(1, threshold));
  }

  private _updateVersionGraph(module: string): void {
    const shells = this.byModule(module);
    const edges = new Set<string>();
    for (let i = 0; i < shells.length; i++)
      for (let j = 0; j < shells.length; j++)
        if (i !== j && this._compareVersions(shells[i].version, shells[j].version) < 0)
          edges.add(`${shells[i].version}->${shells[j].version}`);
    this._versionGraph.set(module, edges);
  }

  private _topologicalSort(shells: Shell[]): Shell[] {
    return [...shells].sort((a, b) => {
      const vcmp = this._compareVersions(a.version, b.version);
      return vcmp !== 0 ? vcmp : a.storedAt - b.storedAt;
    });
  }

  private _compareVersions(a: string, b: string): number {
    const pa = this._parseVersion(a), pb = this._parseVersion(b);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const na = pa[i] ?? 0, nb = pb[i] ?? 0;
      if (na !== nb) return na - nb;
    }
    return 0;
  }

  private _parseVersion(v: string): number[] {
    return v.split(/[.\-+]/).map(part => { const n = parseInt(part, 10); return isNaN(n) ? 0 : n; });
  }

  private _computeEvolutionMetrics(shells: Shell[]): { evolutionRate: number; changeVectors: Record<string, number> } {
    const vectors: Record<string, number> = {};
    const allKeys = new Set<string>();
    for (const s of shells) for (const k of Object.keys(s.state)) allKeys.add(k);
    let totalChanges = 0;
    for (const key of allKeys) {
      let changes = 0;
      for (let i = 1; i < shells.length; i++)
        if (!this._deepEqual(shells[i - 1].state[key], shells[i].state[key])) { changes++; totalChanges++; }
      vectors[key] = shells.length > 1 ? changes / (shells.length - 1) : 0;
    }
    const evolutionRate = allKeys.size === 0 || shells.length < 2 ? 0 : totalChanges / (shells.length * allKeys.size);
    return { evolutionRate, changeVectors: vectors };
  }

  private _identifyStableVersions(shells: Shell[]): string[] {
    if (shells.length < 2) return shells.map(s => s.version);
    const stable: string[] = [shells[0].version];
    for (let i = 1; i < shells.length; i++) {
      const prev = shells[i - 1].state, curr = shells[i].state;
      const keys = new Set([...Object.keys(prev), ...Object.keys(curr)]);
      let changed = 0;
      for (const k of keys) if (!this._deepEqual(prev[k], curr[k])) changed++;
      const changeRate = keys.size === 0 ? 0 : changed / keys.size;
      if (changeRate < this._stableThreshold) stable.push(shells[i].version);
    }
    return stable;
  }

  private _deepEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (typeof a !== typeof b) return false;
    if (typeof a !== 'object' || a === null || b === null) return false;
    const objA = a as Record<string, unknown>, objB = b as Record<string, unknown>;
    const keysA = Object.keys(objA), keysB = Object.keys(objB);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) if (!this._deepEqual(objA[key], objB[key])) return false;
    return true;
  }
}

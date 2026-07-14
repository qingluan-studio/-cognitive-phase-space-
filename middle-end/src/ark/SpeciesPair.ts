export interface SpeciesPairData {
  pairs: Array<{ species: string; left: unknown; right: unknown }>;
  orphans: string[];
}

export class SpeciesPair {
  private _pairs: Map<string, { left: Record<string, unknown>; right: Record<string, unknown> }>;
  private _orphans: Map<string, Record<string, unknown>>;
  private _adjacency: Map<string, Set<string>>;
  private _pairingEntropy: number;
  private _migrationCost: Map<string, number>;
  private _extinctionRisk: Map<string, number>;

  constructor() {
    this._pairs = new Map<string, { left: Record<string, unknown>; right: Record<string, unknown> }>();
    this._orphans = new Map<string, Record<string, unknown>>();
    this._adjacency = new Map<string, Set<string>>();
    this._pairingEntropy = 0;
    this._migrationCost = new Map<string, number>();
    this._extinctionRisk = new Map<string, number>();
  }

  get speciesCount(): number {
    return this._pairs.size + this._orphans.size;
  }

  get pairedCount(): number {
    return this._pairs.size;
  }

  get pairingEntropy(): number {
    return this._pairingEntropy;
  }

  public introduce(species: string, individual: Record<string, unknown>): boolean {
    const existing = this._pairs.get(species);
    if (existing) {
      return false;
    }
    const orphan = this._orphans.get(species);
    if (orphan !== undefined) {
      this._pairs.set(species, { left: orphan, right: individual });
      this._orphans.delete(species);
      this._updateAdjacency(species);
      this._recomputeEntropy();
      this._extinctionRisk.delete(species);
      return true;
    }
    this._orphans.set(species, individual);
    this._extinctionRisk.set(species, this._computeExtinctionRisk(species));
    return false;
  }

  public isPaired(species: string): boolean {
    return this._pairs.has(species);
  }

  public remove(species: string): void {
    this._pairs.delete(species);
    this._orphans.delete(species);
    this._adjacency.delete(species);
    this._migrationCost.delete(species);
    this._extinctionRisk.delete(species);
    this._recomputeEntropy();
  }

  public breed(species: string, factory: (a: Record<string, unknown>, b: Record<string, unknown>) => Record<string, unknown>): boolean {
    const pair = this._pairs.get(species);
    if (!pair) {
      return false;
    }
    const child = factory(pair.left, pair.right);
    this._orphans.set(`${species}:child`, child);
    this._recomputeEntropy();
    return true;
  }

  public orphansList(): string[] {
    return Array.from(this._orphans.keys());
  }

  public report(): SpeciesPairData {
    const pairs: Array<{ species: string; left: unknown; right: unknown }> = [];
    for (const [species, pair] of this._pairs) {
      pairs.push({ species, left: pair.left, right: pair.right });
    }
    return { pairs, orphans: this.orphansList() };
  }

  public migrate(species: string, target: SpeciesPair): boolean {
    const pair = this._pairs.get(species);
    if (!pair) {
      return false;
    }
    const cost = this._migrationCost.get(species) ?? 1;
    if (cost > 3) {
      return false;
    }
    target.introduce(species, pair.left);
    target.introduce(species, pair.right);
    this.remove(species);
    return true;
  }

  public computeGraphDiameter(): number {
    let diameter = 0;
    for (const start of this._pairs.keys()) {
      const dist = this._bfsDistance(start);
      for (const d of dist.values()) {
        if (d > diameter) {
          diameter = d;
        }
      }
    }
    return diameter;
  }

  public getExtinctionRisk(species: string): number {
    return this._extinctionRisk.get(species) ?? 1;
  }

  private _updateAdjacency(species: string): void {
    const set = new Set<string>();
    for (const other of this._pairs.keys()) {
      if (other !== species) {
        set.add(other);
      }
    }
    this._adjacency.set(species, set);
    for (const [s, neighbors] of this._adjacency) {
      if (s !== species && this._pairs.has(s)) {
        neighbors.add(species);
      }
    }
  }

  private _recomputeEntropy(): void {
    const total = this._pairs.size + this._orphans.size;
    if (total === 0) {
      this._pairingEntropy = 0;
      return;
    }
    const pPaired = this._pairs.size / total;
    const pOrphan = this._orphans.size / total;
    let entropy = 0;
    if (pPaired > 0) {
      entropy -= pPaired * Math.log2(pPaired);
    }
    if (pOrphan > 0) {
      entropy -= pOrphan * Math.log2(pOrphan);
    }
    this._pairingEntropy = entropy;
  }

  private _computeExtinctionRisk(species: string): number {
    const degree = this._adjacency.get(species)?.size ?? 0;
    const total = this._pairs.size + this._orphans.size;
    if (total <= 1) {
      return 1;
    }
    return 1 - degree / (total - 1);
  }

  private _bfsDistance(start: string): Map<string, number> {
    const dist = new Map<string, number>();
    const queue: string[] = [start];
    dist.set(start, 0);
    while (queue.length > 0) {
      const curr = queue.shift()!;
      const d = dist.get(curr)!;
      for (const next of this._adjacency.get(curr) ?? []) {
        if (!dist.has(next)) {
          dist.set(next, d + 1);
          queue.push(next);
        }
      }
    }
    return dist;
  }
}

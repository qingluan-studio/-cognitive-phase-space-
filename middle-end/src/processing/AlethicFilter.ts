export type Modality = 'necessary' | 'contingent' | 'possible' | 'impossible';

export interface AlethicProposition {
  id: string;
  content: Record<string, unknown>;
  modality: Modality;
  supportCount: number;
  counterCount: number;
  necessityDegree: number;
  worldRank: number;
}

export interface FilterStats {
  passed: number;
  rejected: number;
  passRate: number;
  averageNecessity: number;
  modalEntropy: number;
}

interface WorldNode {
  id: string;
  propositionIds: Set<string>;
  accessible: Set<string>;
  rank: number;
}

export class AlethicFilter {
  private _propositions: Map<string, AlethicProposition> = new Map();
  private _worlds: Map<string, WorldNode> = new Map();
  private _passed: string[] = [];
  private _rejected: string[] = [];
  private _requiredSupport = 2;
  private _necessityThreshold = 0.75;
  private _maxWorlds = 12;

  constructor() { this._createWorld('actual', 0); }

  submit(proposition: AlethicProposition): void {
    const enriched: AlethicProposition = { ...proposition, necessityDegree: proposition.necessityDegree ?? 0, worldRank: proposition.worldRank ?? 0 };
    this._propositions.set(proposition.id, enriched);
    this._assignToWorld(enriched);
  }

  private _createWorld(id: string, rank: number): void {
    if (this._worlds.size >= this._maxWorlds) return;
    this._worlds.set(id, { id, propositionIds: new Set(), accessible: new Set(), rank });
  }

  private _assignToWorld(prop: AlethicProposition): void {
    const actual = this._worlds.get('actual');
    if (actual) actual.propositionIds.add(prop.id);
    const counterRatio = prop.counterCount / Math.max(1, prop.supportCount + prop.counterCount);
    const rank = Math.floor(counterRatio * 10);
    prop.worldRank = rank;
    const worldId = `w_${rank}`;
    if (!this._worlds.has(worldId) && this._worlds.size < this._maxWorlds) this._createWorld(worldId, rank);
    this._worlds.get(worldId)?.propositionIds.add(prop.id);
    this._updateAccessibility();
  }

  private _updateAccessibility(): void {
    const worlds = Array.from(this._worlds.values());
    for (const w of worlds) {
      w.accessible.clear();
      for (const other of worlds) if (Math.abs(w.rank - other.rank) <= 3 || other.id === 'actual') w.accessible.add(other.id);
    }
    this._transitiveClosure();
  }

  private _transitiveClosure(): void {
    let changed = true;
    while (changed) {
      changed = false;
      for (const world of this._worlds.values()) {
        const newAccess = new Set(world.accessible);
        for (const accId of world.accessible) {
          const accWorld = this._worlds.get(accId);
          if (accWorld) for (const nextId of accWorld.accessible) if (!newAccess.has(nextId)) { newAccess.add(nextId); changed = true; }
        }
        world.accessible = newAccess;
      }
    }
  }

  evaluate(): AlethicProposition[] {
    this._passed = [];
    this._rejected = [];
    for (const prop of this._propositions.values()) {
      prop.necessityDegree = this._computeNecessity(prop);
      prop.modality = this._classify(prop);
      (prop.modality === 'necessary' ? this._passed : this._rejected).push(prop.id);
    }
    this._propagateEntailment();
    return this._passed.map(id => this._propositions.get(id)!);
  }

  private _computeNecessity(prop: AlethicProposition): number {
    const totalEvidence = prop.supportCount + prop.counterCount;
    if (totalEvidence === 0) return 0.3;
    const prior = 0.5;
    const likelihood = prop.supportCount / totalEvidence;
    const posterior = (likelihood * prior) / (likelihood * prior + (1 - likelihood) * (1 - prior));
    const worldCoverage = this._worldCoverage(prop);
    const consistencyBonus = this._consistencyWithOthers(prop);
    const entropyBonus = this._entropyBonus(prop);
    return Math.max(0, Math.min(1, posterior * 0.4 + worldCoverage * 0.25 + consistencyBonus * 0.25 + entropyBonus * 0.1));
  }

  private _worldCoverage(prop: AlethicProposition): number {
    let count = 0;
    for (const world of this._worlds.values()) if (world.propositionIds.has(prop.id)) count++;
    const coverage = this._worlds.size === 0 ? 0 : count / this._worlds.size;
    const rankWeight = Math.max(0, 1 - prop.worldRank / 10);
    return coverage * 0.6 + rankWeight * 0.4;
  }

  private _consistencyWithOthers(prop: AlethicProposition): number {
    let consistent = 0, total = 0;
    for (const other of this._propositions.values()) {
      if (other.id === prop.id) continue;
      total++;
      if (prop.supportCount > 0 && other.supportCount > 0 && prop.counterCount === 0 && other.counterCount === 0) consistent++;
      else if (prop.counterCount > 0 && other.supportCount > 0) consistent += 0.3;
    }
    return total === 0 ? 0.5 : consistent / total;
  }

  private _entropyBonus(prop: AlethicProposition): number {
    const total = prop.supportCount + prop.counterCount;
    if (total === 0) return 0.5;
    const pS = prop.supportCount / total, pC = prop.counterCount / total;
    const entropy = -(pS * Math.log2(pS + 1e-10) + pC * Math.log2(pC + 1e-10));
    return 1 - entropy / Math.log2(2);
  }

  private _classify(prop: AlethicProposition): Modality {
    if (prop.counterCount > 0 && prop.supportCount === 0) return 'impossible';
    if (prop.necessityDegree >= this._necessityThreshold && prop.counterCount === 0) return 'necessary';
    if (prop.supportCount > 0 && prop.counterCount > 0) return 'contingent';
    return 'possible';
  }

  private _propagateEntailment(): void {
    for (const prop of this._propositions.values()) {
      if (prop.modality !== 'necessary') continue;
      for (const other of this._propositions.values()) {
        if (other.id === prop.id) continue;
        if (this._entails(prop, other)) other.supportCount = Math.min(other.supportCount + 1, 99);
      }
    }
  }

  private _entails(a: AlethicProposition, b: AlethicProposition): boolean {
    const aKeys = new Set(Object.keys(a.content));
    const bKeys = new Set(Object.keys(b.content));
    let shared = 0, match = 0;
    for (const k of aKeys) if (bKeys.has(k)) { shared++; if (String(a.content[k]) === String(b.content[k])) match++; }
    return shared > 0 && match / shared >= 0.8 && b.supportCount >= this._requiredSupport - 1;
  }

  addSupport(id: string, count = 1): void { const prop = this._propositions.get(id); if (prop) { prop.supportCount += count; this._assignToWorld(prop); } }

  addCounter(id: string, count = 1): void { const prop = this._propositions.get(id); if (prop) { prop.counterCount += count; this._assignToWorld(prop); } }

  setRequiredSupport(n: number): void { this._requiredSupport = Math.max(1, n); this._necessityThreshold = 0.5 + n * 0.08; }

  passedPropositions(): AlethicProposition[] { return this._passed.map(id => this._propositions.get(id)!).filter(Boolean); }

  rejectedByModality(modality: Modality): AlethicProposition[] { return Array.from(this._propositions.values()).filter(p => p.modality === modality); }

  stats(): FilterStats {
    const passed = this._passed.length, rejected = this._rejected.length, total = passed + rejected;
    const allProps = Array.from(this._propositions.values());
    const avgNecessity = allProps.length === 0 ? 0 : allProps.reduce((s, p) => s + p.necessityDegree, 0) / allProps.length;
    const counts: Record<string, number> = { necessary: 0, contingent: 0, possible: 0, impossible: 0 };
    for (const p of allProps) counts[p.modality] = (counts[p.modality] || 0) + 1;
    const totalM = allProps.length || 1;
    let entropy = 0;
    for (const k of Object.keys(counts)) { const p = counts[k] / totalM; if (p > 0) entropy -= p * Math.log2(p); }
    return { passed, rejected, passRate: total === 0 ? 0 : passed / total, averageNecessity: avgNecessity, modalEntropy: entropy };
  }

  reset(): void { this._propositions.clear(); this._worlds.clear(); this._passed = []; this._rejected = []; this._createWorld('actual', 0); }

  get propositionCount(): number { return this._propositions.size; }
  get passedCount(): number { return this._passed.length; }
  get requiredSupport(): number { return this._requiredSupport; }
  get worldCount(): number { return this._worlds.size; }
}

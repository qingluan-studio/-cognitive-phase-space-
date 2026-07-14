export type ClanRelation = 'allied' | 'neutral' | 'rival' | 'hostile';

export interface ClanMembership {
  moduleId: string;
  clanTotem: string;
  joinedAt: number;
  rank: number;
}

export interface InterclanRelation {
  clanA: string;
  clanB: string;
  relation: ClanRelation;
  setAt: number;
}

export class ClanIdentity {
  private _members: Map<string, ClanMembership> = new Map();
  private _relations: InterclanRelation[] = [];
  private _clanPrivileges: Map<string, string[]> = new Map();
  private _maxRank = 10;
  private _influenceScores: Map<string, number> = new Map();
  private _adjacencyMatrix: Map<string, Map<string, number>> = new Map();

  joinClan(moduleId: string, clanTotem: string, initialRank: number = 1): ClanMembership {
    const membership: ClanMembership = {
      moduleId,
      clanTotem,
      joinedAt: Date.now(),
      rank: Math.min(initialRank, this._maxRank),
    };
    this._members.set(moduleId, membership);
    this._updateInfluence(clanTotem);
    return membership;
  }

  private _updateInfluence(clanTotem: string): void {
    const members = this.getClanMembers(clanTotem);
    const totalRank = members.reduce((s, m) => s + m.rank, 0);
    const count = members.length;
    const influence = count > 0 ? totalRank * Math.log(count + 1) : 0;
    this._influenceScores.set(clanTotem, influence);
    this._rebuildAdjacency();
  }

  private _rebuildAdjacency(): void {
    this._adjacencyMatrix.clear();
    const clans = this.listAllClans();
    for (const clan of clans) {
      const row = new Map<string, number>();
      for (const other of clans) {
        if (clan === other) {
          row.set(other, 0);
        } else {
          const relation = this.getRelation(clan, other);
          const weight = relation === 'allied' ? 1 : relation === 'neutral' ? 0.3 : relation === 'rival' ? -0.5 : -1;
          row.set(other, weight);
        }
      }
      this._adjacencyMatrix.set(clan, row);
    }
  }

  promote(moduleId: string, delta: number = 1): boolean {
    const member = this._members.get(moduleId);
    if (!member) return false;
    member.rank = Math.min(this._maxRank, member.rank + delta);
    this._updateInfluence(member.clanTotem);
    return true;
  }

  demote(moduleId: string, delta: number = 1): boolean {
    const member = this._members.get(moduleId);
    if (!member) return false;
    member.rank = Math.max(0, member.rank - delta);
    this._updateInfluence(member.clanTotem);
    return true;
  }

  areClanMembers(a: string, b: string): boolean {
    const memberA = this._members.get(a);
    const memberB = this._members.get(b);
    return !!memberA && !!memberB && memberA.clanTotem === memberB.clanTotem;
  }

  setRelation(clanA: string, clanB: string, relation: ClanRelation): void {
    const existing = this._relations.find(r =>
      (r.clanA === clanA && r.clanB === clanB) || (r.clanA === clanB && r.clanB === clanA)
    );
    if (existing) {
      existing.relation = relation;
      existing.setAt = Date.now();
    } else {
      this._relations.push({ clanA, clanB, relation, setAt: Date.now() });
    }
    this._rebuildAdjacency();
  }

  getRelation(clanA: string, clanB: string): ClanRelation {
    if (clanA === clanB) return 'allied';
    const relation = this._relations.find(r =>
      (r.clanA === clanA && r.clanB === clanB) || (r.clanA === clanB && r.clanB === clanA)
    );
    return relation?.relation ?? 'neutral';
  }

  grantPrivilege(clanTotem: string, privilege: string): void {
    const privileges = this._clanPrivileges.get(clanTotem) ?? [];
    if (!privileges.includes(privilege)) privileges.push(privilege);
    this._clanPrivileges.set(clanTotem, privileges);
  }

  hasPrivilege(moduleId: string, privilege: string): boolean {
    const member = this._members.get(moduleId);
    if (!member) return false;
    const privileges = this._clanPrivileges.get(member.clanTotem) ?? [];
    return privileges.includes(privilege);
  }

  getClanMembers(clanTotem: string): ClanMembership[] {
    return Array.from(this._members.values()).filter(m => m.clanTotem === clanTotem);
  }

  getClanSize(clanTotem: string): number {
    return this.getClanMembers(clanTotem).length;
  }

  listAllClans(): string[] {
    const clans = new Set<string>();
    for (const member of this._members.values()) clans.add(member.clanTotem);
    return Array.from(clans);
  }

  getRelations(): InterclanRelation[] {
    return [...this._relations];
  }

  expel(moduleId: string): boolean {
    const member = this._members.get(moduleId);
    const result = this._members.delete(moduleId);
    if (member) this._updateInfluence(member.clanTotem);
    return result;
  }

  get memberCount(): number {
    return this._members.size;
  }

  get clanCount(): number {
    return this.listAllClans().length;
  }

  getInfluence(clanTotem: string): number {
    return this._influenceScores.get(clanTotem) ?? 0;
  }

  computeCentrality(clanTotem: string): number {
    const row = this._adjacencyMatrix.get(clanTotem);
    if (!row) return 0;
    let sum = 0;
    for (const w of row.values()) sum += Math.abs(w);
    return sum;
  }

  rankClansByInfluence(): { clan: string; influence: number }[] {
    const clans = this.listAllClans();
    return clans.map(c => ({ clan: c, influence: this.getInfluence(c) })).sort((a, b) => b.influence - a.influence);
  }
}

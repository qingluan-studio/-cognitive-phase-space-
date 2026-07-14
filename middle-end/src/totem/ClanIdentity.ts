/**
 * 氏族身份模块：模块根据图腾划分族群，相同图腾的模块互认同族，
 * 族群内部享有特权协作，族群间可能存在竞争或敌对。
 */

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

  joinClan(moduleId: string, clanTotem: string, initialRank: number = 1): ClanMembership {
    const membership: ClanMembership = {
      moduleId,
      clanTotem,
      joinedAt: Date.now(),
      rank: Math.min(initialRank, this._maxRank),
    };
    this._members.set(moduleId, membership);
    return membership;
  }

  promote(moduleId: string, delta: number = 1): boolean {
    const member = this._members.get(moduleId);
    if (!member) return false;
    member.rank = Math.min(this._maxRank, member.rank + delta);
    return true;
  }

  demote(moduleId: string, delta: number = 1): boolean {
    const member = this._members.get(moduleId);
    if (!member) return false;
    member.rank = Math.max(0, member.rank - delta);
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
    return this._members.delete(moduleId);
  }

  get memberCount(): number {
    return this._members.size;
  }

  get clanCount(): number {
    return this.listAllClans().length;
  }
}

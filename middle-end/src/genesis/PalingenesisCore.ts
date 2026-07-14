/**
 * 轮回再生核：新模块继承前世记忆，循环进化。
 * 每个模块"死亡"时其记忆被压缩为前世遗产，新模块在诞生时
 * 继承这些记忆，从而跨"生命周期"实现累积进化。
 */

export interface PastLife {
  id: string;
  moduleName: string;
  memories: Record<string, unknown>;
  causeOfDeath: string;
  diedAt: number;
}

export interface Reincarnation {
  id: string;
  moduleName: string;
  inheritedFrom: string[];
  bornAt: number;
  generation: number;
}

export interface InheritedMemory {
  trait: string;
  weight: number;
  payload: Record<string, unknown>;
}

export class PalingenesisCore {
  private _pastLives: PastLife[] = [];
  private _incarnations: Reincarnation[] = [];
  private _inheritance: Map<string, InheritedMemory[]> = new Map();
  private _generation: number = 0;

  /** 模块死亡时记录前世记忆。 */
  recordLife(moduleName: string, memories: Record<string, unknown>, cause: string): PastLife {
    const life: PastLife = {
      id: `life-${moduleName}-${Date.now()}`,
      moduleName,
      memories,
      causeOfDeath: cause,
      diedAt: Date.now(),
    };
    this._pastLives.push(life);
    return life;
  }

  /** 把前世记忆压缩为可继承特征。 */
  inherit(lifeId: string): InheritedMemory[] {
    const life = this._pastLives.find(l => l.id === lifeId);
    if (!life) return [];
    const traits: InheritedMemory[] = [];
    for (const [key, value] of Object.entries(life.memories)) {
      const weight = typeof value === 'number' ? value : 0.5;
      traits.push({ trait: key, weight, payload: { value } });
    }
    this._inheritance.set(lifeId, traits);
    return traits;
  }

  /** 新模块诞生：从若干前世记忆中转世。 */
  reincarnate(moduleName: string, ancestorIds: string[]): Reincarnation {
    this._generation++;
    for (const id of ancestorIds) this.inherit(id);
    const incarnation: Reincarnation = {
      id: `inc-${moduleName}-${Date.now()}`,
      moduleName,
      inheritedFrom: ancestorIds,
      bornAt: Date.now(),
      generation: this._generation,
    };
    this._incarnations.push(incarnation);
    return incarnation;
  }

  /** 回溯特定转世的记忆。 */
  recall(incarnationId: string): InheritedMemory[] {
    const inc = this._incarnations.find(i => i.id === incarnationId);
    if (!inc) return [];
    const all: InheritedMemory[] = [];
    for (const id of inc.inheritedFrom) {
      const mem = this._inheritance.get(id);
      if (mem) all.push(...mem);
    }
    return all;
  }

  /** 进化评估：根据前世记忆收敛出主导特征。 */
  evolve(): InheritedMemory[] {
    const aggregated = new Map<string, { total: number; payload: Record<string, unknown> }>();
    for (const traits of this._inheritance.values()) {
      for (const t of traits) {
        const cur = aggregated.get(t.trait) ?? { total: 0, payload: t.payload };
        cur.total += t.weight;
        aggregated.set(t.trait, cur);
      }
    }
    return [...aggregated.entries()]
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 5)
      .map(([trait, v]) => ({ trait, weight: v.total, payload: v.payload }));
  }

  getMemories(): PastLife[] {
    return [...this._pastLives];
  }

  get generation(): number {
    return this._generation;
  }

  get incarnations(): Reincarnation[] {
    return [...this._incarnations];
  }
}

/**
 * SymbioticMerge - 共生融合模块
 * 两个共生体完全合并为一个新实体，融合双方的特性、资源与能力，
 * 融合后的实体具有原始双方不可单独达成的涌现属性。
 */

export interface SymbioticMergeRecord {
  readonly mergeId: string;
  entityA: string;
  entityB: string;
  traitMap: Record<string, number>;
  synergyPotential: number;
  finalized: boolean;
}

export interface MergedTrait {
  name: string;
  dominance: 'A' | 'B' | 'hybrid';
  value: number;
  emergent: boolean;
}

export class SymbioticMerge {
  private _record: SymbioticMergeRecord;
  private _traits: MergedTrait[] = [];
  private _emergentProperties: string[] = [];
  private _fusionProgress: number = 0;
  private _instability: number = 0;

  constructor(record: SymbioticMergeRecord) {
    this._record = { ...record, traitMap: { ...record.traitMap } };
  }

  get mergeId(): string {
    return this._record.mergeId;
  }

  get entities(): readonly [string, string] {
    return [this._record.entityA, this._record.entityB];
  }

  get fusionProgress(): number {
    return this._fusionProgress;
  }

  get finalized(): boolean {
    return this._record.finalized;
  }

  public blendTrait(traitA: number, traitB: number, name: string): MergedTrait {
    const hybridValue = (traitA + traitB) / 2 * this._record.synergyPotential;
    const dominance: 'A' | 'B' | 'hybrid' =
      traitA > traitB * 1.3 ? 'A' : traitB > traitA * 1.3 ? 'B' : 'hybrid';
    const emergent = hybridValue > Math.max(traitA, traitB) * 1.1;
    const trait: MergedTrait = { name, dominance, value: hybridValue, emergent };
    if (emergent) {
      this._emergentProperties.push(name);
    }
    this._traits.push(trait);
    return trait;
  }

  public advanceFusion(steps: number): number {
    this._fusionProgress = Math.min(1, this._fusionProgress + steps * 0.1);
    if (this._fusionProgress > 0.5 && this._instability > 0) {
      this._instability = Math.max(0, this._instability - 0.05);
    }
    return this._fusionProgress;
  }

  public detectConflict(): boolean {
    const aDominant = this._traits.filter((t) => t.dominance === 'A').length;
    const bDominant = this._traits.filter((t) => t.dominance === 'B').length;
    const imbalance = Math.abs(aDominant - bDominant);
    if (imbalance > this._traits.length * 0.6) {
      this._instability = Math.min(1, this._instability + 0.2);
      return true;
    }
    return false;
  }

  public rebalance(): void {
    this._traits.forEach((t) => {
      if (t.dominance !== 'hybrid') {
        t.value *= 0.95;
        t.dominance = 'hybrid';
      }
    });
    this._instability = Math.max(0, this._instability - 0.3);
  }

  public harvestSynergy(): number {
    if (this._fusionProgress < 0.8) {
      return 0;
    }
    const emergent = this._traits.filter((t) => t.emergent);
    const total = emergent.reduce((s, t) => s + t.value, 0);
    return total * this._record.synergyPotential;
  }

  public finalize(): boolean {
    if (this._fusionProgress < 1 || this._instability > 0.3) {
      return false;
    }
    this._record.finalized = true;
    return true;
  }

  public abort(): void {
    this._fusionProgress = 0;
    this._traits = [];
    this._emergentProperties = [];
    this._instability = 1;
    this._record.finalized = false;
  }

  public mergeReport(): Record<string, unknown> {
    return {
      mergeId: this.mergeId,
      entities: this.entities,
      fusionProgress: this._fusionProgress.toFixed(3),
      finalized: this._record.finalized,
      traitCount: this._traits.length,
      emergentCount: this._emergentProperties.length,
      emergentProperties: [...this._emergentProperties],
      instability: this._instability.toFixed(3),
      synergy: this.harvestSynergy().toFixed(2),
    };
  }
}

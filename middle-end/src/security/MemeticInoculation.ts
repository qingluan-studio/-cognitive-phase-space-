/**
 * 模因疫苗：注入微量无害的模因变体作为疫苗，使系统产生针对
 * 认知污染与恶意模因的抗体，遭遇真正攻击时具备群体免疫能力。
 */

export interface MemeVariant {
  id: string;
  payload: string;
  virulence: number;
  harmless: boolean;
}

export interface Antibody {
  pattern: string;
  affinity: number;
  raisedAt: number;
  neutralizations: number;
}

export interface InoculationRecord {
  variantId: string;
  antibodyGenerated: string;
  reaction: 'none' | 'mild' | 'immune';
  timestamp: number;
}

export class MemeticInoculation {
  private _variants: Map<string, MemeVariant> = new Map();
  private _antibodies: Map<string, Antibody> = new Map();
  private _records: InoculationRecord[] = [];
  private _immuneMemory = 0;
  private _boosterInterval = 86400000;
  private _lastBooster = 0;

  registerVariant(variant: MemeVariant): void {
    this._variants.set(variant.id, variant);
  }

  inoculate(variantId: string): InoculationRecord {
    const variant = this._variants.get(variantId);
    if (!variant) throw new Error(`Unknown variant: ${variantId}`);
    const antibodyPattern = this._deriveAntibody(variant.payload);
    const affinity = 1 - variant.virulence;
    const antibody: Antibody = {
      pattern: antibodyPattern,
      affinity,
      raisedAt: Date.now(),
      neutralizations: 0,
    };
    this._antibodies.set(antibodyPattern, antibody);
    this._immuneMemory += affinity;
    const reaction: InoculationRecord['reaction'] =
      variant.harmless && variant.virulence < 0.3 ? 'immune' : variant.virulence < 0.6 ? 'mild' : 'none';
    const record: InoculationRecord = {
      variantId,
      antibodyGenerated: antibodyPattern,
      reaction,
      timestamp: Date.now(),
    };
    this._records.push(record);
    return record;
  }

  private _deriveAntibody(payload: string): string {
    let hash = 0;
    for (let i = 0; i < payload.length; i++) {
      hash = (hash * 31 + payload.charCodeAt(i)) >>> 0;
    }
    return `ab-${hash.toString(16)}`;
  }

  encounterThreat(threatPayload: string): { neutralized: boolean; antibody: Antibody | null } {
    const pattern = this._deriveAntibody(threatPayload);
    const antibody = this._antibodies.get(pattern);
    if (antibody && antibody.affinity > 0.4) {
      antibody.neutralizations++;
      return { neutralized: true, antibody };
    }
    return { neutralized: false, antibody: null };
  }

  boosterShot(): number {
    const now = Date.now();
    if (now - this._lastBooster < this._boosterInterval) return 0;
    this._lastBooster = now;
    let boosted = 0;
    for (const antibody of this._antibodies.values()) {
      antibody.affinity = Math.min(1, antibody.affinity + 0.1);
      boosted++;
    }
    return boosted;
  }

  getAntibodies(): Antibody[] {
    return Array.from(this._antibodies.values());
  }

  getInoculationHistory(): InoculationRecord[] {
    return [...this._records];
  }

  setBoosterInterval(ms: number): void {
    this._boosterInterval = ms;
  }

  get immuneMemory(): number {
    return this._immuneMemory;
  }

  get antibodyCount(): number {
    return this._antibodies.size;
  }
}

/**
 * 真势过滤器模块：只放行必然为真的信息，
 * 过滤掉偶然真与可能真的命题，确保下游只接收严格必然信息。
 */

export type Modality = 'necessary' | 'contingent' | 'possible' | 'impossible';

export interface AlethicProposition {
  id: string;
  content: Record<string, unknown>;
  modality: Modality;
  supportCount: number;
  counterCount: number;
}

export interface FilterStats {
  passed: number;
  rejected: number;
  passRate: number;
}

export class AlethicFilter {
  private _propositions: Map<string, AlethicProposition> = new Map();
  private _passed: string[] = [];
  private _rejected: string[] = [];
  private _requiredSupport = 2;

  submit(proposition: AlethicProposition): void {
    this._propositions.set(proposition.id, proposition);
  }

  evaluate(): AlethicProposition[] {
    this._passed = [];
    this._rejected = [];

    for (const prop of this._propositions.values()) {
      const modality = this._classify(prop);
      prop.modality = modality;
      if (modality === 'necessary') {
        this._passed.push(prop.id);
      } else {
        this._rejected.push(prop.id);
      }
    }

    return this._passed.map(id => this._propositions.get(id)!);
  }

  private _classify(prop: AlethicProposition): Modality {
    if (prop.counterCount > 0 && prop.supportCount === 0) return 'impossible';
    if (prop.supportCount >= this._requiredSupport && prop.counterCount === 0) return 'necessary';
    if (prop.supportCount > 0 && prop.counterCount > 0) return 'contingent';
    return 'possible';
  }

  addSupport(id: string, count = 1): void {
    const prop = this._propositions.get(id);
    if (prop) prop.supportCount += count;
  }

  addCounter(id: string, count = 1): void {
    const prop = this._propositions.get(id);
    if (prop) prop.counterCount += count;
  }

  setRequiredSupport(n: number): void {
    this._requiredSupport = Math.max(1, n);
  }

  passedPropositions(): AlethicProposition[] {
    return this._passed.map(id => this._propositions.get(id)!).filter(Boolean);
  }

  rejectedByModality(modality: Modality): AlethicProposition[] {
    return Array.from(this._propositions.values()).filter(p => p.modality === modality);
  }

  stats(): FilterStats {
    const passed = this._passed.length;
    const rejected = this._rejected.length;
    const total = passed + rejected;
    return {
      passed,
      rejected,
      passRate: total === 0 ? 0 : passed / total,
    };
  }

  reset(): void {
    this._propositions.clear();
    this._passed = [];
    this._rejected = [];
  }

  get propositionCount(): number {
    return this._propositions.size;
  }

  get passedCount(): number {
    return this._passed.length;
  }

  get requiredSupport(): number {
    return this._requiredSupport;
  }
}

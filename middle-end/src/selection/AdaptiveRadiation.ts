/**
 * 适应辐射：快速分化出多样化功能。
 * 在生态位空缺时，单一祖先模块快速分化出多种形态，占领不同的功能生态位。
 */

export interface EcologicalNiche {
  id: string;
  name: string;
  capacity: number;
  occupied: boolean;
}

export interface RadiatedForm {
  id: string;
  ancestorId: string;
  nicheId: string;
  specialization: number;
  radiatedAt: number;
}

export class AdaptiveRadiation {
  private _niches: Map<string, EcologicalNiche> = new Map();
  private _forms: RadiatedForm[] = [];
  private _radiationLog: string[] = [];
  private _maxSpecialization = 1.0;

  registerNiche(niche: EcologicalNiche): void {
    this._niches.set(niche.id, niche);
  }

  radiate(ancestorId: string, niches: string[]): RadiatedForm[] {
    const results: RadiatedForm[] = [];
    for (const nicheId of niches) {
      const niche = this._niches.get(nicheId);
      if (!niche || niche.occupied) continue;
      const specialization = Math.min(this._maxSpecialization, 0.3 + Math.random() * 0.7);
      const form: RadiatedForm = {
        id: `form-${ancestorId}-${nicheId}-${Math.random().toString(36).slice(2, 6)}`,
        ancestorId,
        nicheId,
        specialization,
        radiatedAt: Date.now(),
      };
      niche.occupied = true;
      results.push(form);
      this._forms.push(form);
      this._radiationLog.push(`${ancestorId} -> ${nicheId} (spec=${specialization.toFixed(2)})`);
    }
    if (this._forms.length > 500) this._forms.splice(0, this._forms.length - 500);
    return results;
  }

  findEmptyNiches(): EcologicalNiche[] {
    return Array.from(this._niches.values()).filter(n => !n.occupied);
  }

  computeDiversity(): number {
    if (this._forms.length < 2) return 0;
    let total = 0;
    let count = 0;
    for (let i = 0; i < this._forms.length; i++) {
      for (let j = i + 1; j < this._forms.length; j++) {
        total += Math.abs(this._forms[i].specialization - this._forms[j].specialization);
        count++;
      }
    }
    return count > 0 ? total / count : 0;
  }

  retract(formId: string): boolean {
    const idx = this._forms.findIndex(f => f.id === formId);
    if (idx < 0) return false;
    const form = this._forms[idx];
    const niche = this._niches.get(form.nicheId);
    if (niche) niche.occupied = false;
    this._forms.splice(idx, 1);
    return true;
  }

  setMaxSpecialization(value: number): void {
    this._maxSpecialization = Math.max(0, Math.min(1, value));
  }

  getForms(): RadiatedForm[] {
    return [...this._forms];
  }

  getRadiationLog(limit: number = 50): string[] {
    return this._radiationLog.slice(-limit);
  }

  get formCount(): number {
    return this._forms.length;
  }
}

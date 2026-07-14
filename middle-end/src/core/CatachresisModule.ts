/** 错格模块 - 强行拼接不可兼容的概念，产生扭曲但有效的新功能 */

export interface Concept {
  id: string;
  name: string;
  domain: string;
  attributes: Record<string, unknown>;
}

export interface CatachresisResult {
  id: string;
  sourceIds: string[];
  splicedName: string;
  hybridAttributes: Record<string, unknown>;
  distortion: number;
  effectiveness: number;
  createdAt: number;
}

export interface CompatibilityProbe {
  sourceIds: string[];
  rawCompatibility: number;
  warpedCompatibility: number;
  feasible: boolean;
}

export class CatachresisModule {
  private _concepts: Map<string, Concept> = new Map();
  private _results: CatachresisResult[] = [];
  private _idCounter = 0;
  private _distortionThreshold = 0.8;
  private _effectivenessThreshold = 0.4;

  registerConcept(concept: Omit<Concept, 'id'>): Concept {
    const id = `concept-${++this._idCounter}-${Date.now()}`;
    const full: Concept = { ...concept, id };
    this._concepts.set(id, full);
    return full;
  }

  probe(aId: string, bId: string): CompatibilityProbe {
    const a = this._concepts.get(aId);
    const b = this._concepts.get(bId);
    if (!a || !b) throw new Error('Concept(s) not found');
    const rawCompatibility = this._rawCompat(a, b);
    const warped = this._warp(rawCompatibility);
    return {
      sourceIds: [aId, bId],
      rawCompatibility,
      warpedCompatibility: warped,
      feasible: warped >= this._effectivenessThreshold,
    };
  }

  splice(aId: string, bId: string, force: boolean = false): CatachresisResult {
    const probe = this.probe(aId, bId);
    if (!probe.feasible && !force) {
      throw new Error('Splice infeasible; use force=true to override');
    }
    const a = this._concepts.get(aId)!;
    const b = this._concepts.get(bId)!;
    const splicedName = `${a.name}-${b.name}`;
    const hybridAttributes = this._mergeAttributes(a.attributes, b.attributes);
    const distortion = 1 - probe.rawCompatibility;
    const effectiveness = probe.warpedCompatibility;
    const result: CatachresisResult = {
      id: `catachresis-${++this._idCounter}-${Date.now()}`,
      sourceIds: [aId, bId],
      splicedName,
      hybridAttributes,
      distortion,
      effectiveness,
      createdAt: Date.now(),
    };
    this._results.push(result);
    return result;
  }

  spliceChain(conceptIds: string[]): CatachresisResult {
    if (conceptIds.length < 2) throw new Error('Need at least 2 concepts');
    let current = this.splice(conceptIds[0], conceptIds[1], true);
    for (let i = 2; i < conceptIds.length; i++) {
      const next = this._concepts.get(conceptIds[i]);
      if (!next) throw new Error(`Concept not found: ${conceptIds[i]}`);
      const synthetic: Concept = {
        id: current.id,
        name: current.splicedName,
        domain: 'hybrid',
        attributes: current.hybridAttributes,
      };
      this._concepts.set(synthetic.id, synthetic);
      current = this.splice(synthetic.id, conceptIds[i], true);
    }
    return current;
  }

  setDistortionThreshold(t: number): void {
    if (t < 0 || t > 1) throw new Error('Threshold must be between 0 and 1');
    this._distortionThreshold = t;
  }

  setEffectivenessThreshold(t: number): void {
    if (t < 0 || t > 1) throw new Error('Threshold must be between 0 and 1');
    this._effectivenessThreshold = t;
  }

  getConcept(id: string): Concept | undefined {
    return this._concepts.get(id);
  }

  get concepts(): Concept[] {
    return Array.from(this._concepts.values());
  }

  get results(): CatachresisResult[] {
    return [...this._results];
  }

  get distortionThreshold(): number {
    return this._distortionThreshold;
  }

  get effectivenessThreshold(): number {
    return this._effectivenessThreshold;
  }

  private _rawCompat(a: Concept, b: Concept): number {
    const keysA = Object.keys(a.attributes);
    const keysB = Object.keys(b.attributes);
    if (keysA.length === 0 || keysB.length === 0) return 0;
    const shared = keysA.filter(k => keysB.includes(k));
    const domainMatch = a.domain === b.domain ? 0.3 : 0;
    const attrOverlap = shared.length / Math.max(keysA.length, keysB.length);
    return Math.min(1, attrOverlap * 0.7 + domainMatch);
  }

  private _warp(raw: number): number {
    return Math.min(1, raw + (1 - raw) * 0.4);
  }

  private _mergeAttributes(a: Record<string, unknown>, b: Record<string, unknown>): Record<string, unknown> {
    const merged: Record<string, unknown> = { ...a };
    for (const [k, v] of Object.entries(b)) {
      if (k in merged) {
        merged[`${k}#a`] = merged[k];
        merged[`${k}#b`] = v;
      } else {
        merged[k] = v;
      }
    }
    return merged;
  }
}

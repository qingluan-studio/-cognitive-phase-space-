import { KnowledgeUnit, DataPacket, Signal } from '../shared/types';

export interface ConceptDomain {
  id: string;
  name: string;
  elements: Map<string, number[]>;
  relations: { source: string; target: string; type: string; strength: number }[];
  frames: string[];
}

export interface BlendSpace {
  id: string;
  inputSpaces: string[];
  crossSpaceMappings: { sourceElement: string; targetElement: string; sourceSpace: string; targetSpace: string; goodness: number }[];
  genericSpace: string[];
  emergentStructure: { element: string; vector: number[]; novelty: number }[];
  blendCoherence: number;
}

export interface VitalRelation {
  type: 'time' | 'space' | 'cause_effect' | 'part_whole' | 'representation' | 'analogy' | 'disanalogy' | 'property';
  source: string;
  target: string;
  compressionLevel: number;
}

export interface BlendResult {
  id: string;
  blendedConcept: string;
  blendVector: number[];
  novelty: number;
  coherence: number;
  productivity: number;
  vitalRelations: VitalRelation[];
  unmappedElements: string[];
  emergentMeaning: string;
}

export interface IConceptualBlender {
  domainCount: number;
  addDomain(domain: ConceptDomain): void;
  getDomain(domainId: string): ConceptDomain | undefined;
  blend(domainA: string, domainB: string, options?: { focus?: string }): BlendResult | null;
  findCrossMappings(domainA: string, domainB: string): { sourceElement: string; targetElement: string; goodness: number }[];
  computeBlendQuality(blend: BlendResult): { coherence: number; novelty: number; productivity: number };
  generateBlendVariants(domainA: string, domainB: string, count: number): BlendResult[];
  extractGenericSpace(domainA: string, domainB: string): string[];
}

export class ConceptualBlender implements IConceptualBlender {
  private _domains: Map<string, ConceptDomain>;
  private _blendHistory: BlendResult[];
  private _maxHistory: number;
  private _blendCache: Map<string, BlendResult>;
  private _maxCacheSize: number;

  constructor() {
    this._domains = new Map();
    this._blendHistory = [];
    this._maxHistory = 100;
    this._blendCache = new Map();
    this._maxCacheSize = 200;
  }

  get domainCount(): number { return this._domains.size; }
  get blendCount(): number { return this._blendHistory.length; }
  get blendHistory(): BlendResult[] { return [...this._blendHistory]; }

  public addDomain(domain: ConceptDomain): void {
    this._domains.set(domain.id, {
      ...domain,
      elements: new Map(domain.elements),
      relations: domain.relations.map(r => ({ ...r })),
      frames: [...domain.frames]
    });
    this._blendCache.clear();
  }

  public getDomain(domainId: string): ConceptDomain | undefined {
    const d = this._domains.get(domainId);
    return d ? {
      ...d,
      elements: new Map(d.elements),
      relations: d.relations.map(r => ({ ...r })),
      frames: [...d.frames]
    } : undefined;
  }

  public extractGenericSpace(domainA: string, domainB: string): string[] {
    const a = this._domains.get(domainA);
    const b = this._domains.get(domainB);
    if (!a || !b) return [];
    const mappings = this.findCrossMappings(domainA, domainB);
    const generic: string[] = [];
    for (const m of mappings) {
      if (m.goodness > 0.6) {
        generic.push(`${m.sourceElement}↔${m.targetElement}`);
      }
    }
    const frameIntersection = a.frames.filter(f => b.frames.includes(f));
    generic.push(...frameIntersection);
    return generic;
  }

  public findCrossMappings(domainA: string, domainB: string): { sourceElement: string; targetElement: string; goodness: number }[] {
    const a = this._domains.get(domainA);
    const b = this._domains.get(domainB);
    if (!a || !b) return [];
    const results: { sourceElement: string; targetElement: string; goodness: number }[] = [];
    for (const [elemA, vecA] of a.elements) {
      for (const [elemB, vecB] of b.elements) {
        const similarity = this._cosineSimilarity(vecA, vecB);
        const roleMatch = this._roleMatch(elemA, elemB, a, b);
        const goodness = similarity * 0.6 + roleMatch * 0.4;
        if (goodness > 0.3) {
          results.push({ sourceElement: elemA, targetElement: elemB, goodness });
        }
      }
    }
    results.sort((a, b) => b.goodness - a.goodness);
    return results;
  }

  private _cosineSimilarity(a: number[], b: number[]): number {
    const len = Math.min(a.length, b.length);
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < len; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom > 0 ? dot / denom : 0;
  }

  private _roleMatch(elemA: string, elemB: string, domainA: ConceptDomain, domainB: ConceptDomain): number {
    const rolesA = this._getElementRoles(elemA, domainA);
    const rolesB = this._getElementRoles(elemB, domainB);
    if (rolesA.size === 0 || rolesB.size === 0) return 0.5;
    let match = 0;
    for (const role of rolesA) {
      if (rolesB.has(role)) match++;
    }
    const union = rolesA.size + rolesB.size - match;
    return union > 0 ? match / union : 0;
  }

  private _getElementRoles(element: string, domain: ConceptDomain): Set<string> {
    const roles = new Set<string>();
    for (const rel of domain.relations) {
      if (rel.source === element) {
        roles.add(`source-${rel.type}`);
      }
      if (rel.target === element) {
        roles.add(`target-${rel.type}`);
      }
    }
    return roles;
  }

  public blend(domainA: string, domainB: string, options: { focus?: string } = {}): BlendResult | null {
    const cacheKey = `${domainA}:${domainB}:${options.focus || 'default'}`;
    const cached = this._blendCache.get(cacheKey);
    if (cached) return this._cloneBlendResult(cached);
    const a = this._domains.get(domainA);
    const b = this._domains.get(domainB);
    if (!a || !b) return null;
    const crossMappings = this.findCrossMappings(domainA, domainB);
    const generic = this.extractGenericSpace(domainA, domainB);
    const focus = options.focus;
    const emergentStructure: { element: string; vector: number[]; novelty: number }[] = [];
    const usedA = new Set<string>();
    const usedB = new Set<string>();
    for (const mapping of crossMappings.slice(0, 10)) {
      usedA.add(mapping.sourceElement);
      usedB.add(mapping.targetElement);
      const vecA = a.elements.get(mapping.sourceElement)!;
      const vecB = b.elements.get(mapping.targetElement)!;
      const blendVec = this._blendVectors(vecA, vecB, mapping.goodness);
      const name = `${mapping.sourceElement}+${mapping.targetElement}`;
      emergentStructure.push({
        element: name,
        vector: blendVec,
        novelty: 1 - mapping.goodness
      });
    }
    for (const [elem, vec] of a.elements) {
      if (!usedA.has(elem)) {
        const focusBoost = focus === domainA ? 1.2 : 0.8;
        emergentStructure.push({
          element: `${elem}(from ${domainA})`,
          vector: vec.map(v => v * focusBoost),
          novelty: 0.3 * focusBoost
        });
      }
    }
    for (const [elem, vec] of b.elements) {
      if (!usedB.has(elem)) {
        const focusBoost = focus === domainB ? 1.2 : 0.8;
        emergentStructure.push({
          element: `${elem}(from ${domainB})`,
          vector: vec.map(v => v * focusBoost),
          novelty: 0.3 * focusBoost
        });
      }
    }
    const vitalRelations = this._identifyVitalRelations(a, b, crossMappings);
    const blendVector = this._computeBlendVector(emergentStructure);
    const coherence = this._computeCoherence(emergentStructure, crossMappings);
    const novelty = emergentStructure.reduce((s, e) => s + e.novelty, 0) / Math.max(1, emergentStructure.length);
    const productivity = this._estimateProductivity(emergentStructure, vitalRelations);
    const result: BlendResult = {
      id: `blend-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      blendedConcept: `${a.name}×${b.name}`,
      blendVector,
      novelty,
      coherence,
      productivity,
      vitalRelations,
      unmappedElements: [
        ...Array.from(a.elements.keys()).filter(e => !usedA.has(e)),
        ...Array.from(b.elements.keys()).filter(e => !usedB.has(e))
      ],
      emergentMeaning: `Blend of ${a.name} and ${b.name} with ${crossMappings.length} cross-mappings and ${emergentStructure.length} emergent elements`
    };
    this._blendHistory.push(result);
    if (this._blendHistory.length > this._maxHistory) {
      this._blendHistory.shift();
    }
    if (this._blendCache.size >= this._maxCacheSize) {
      const firstKey = this._blendCache.keys().next().value;
      if (firstKey !== undefined) this._blendCache.delete(firstKey);
    }
    this._blendCache.set(cacheKey, result);
    return this._cloneBlendResult(result);
  }

  private _cloneBlendResult(r: BlendResult): BlendResult {
    return {
      ...r,
      blendVector: [...r.blendVector],
      vitalRelations: r.vitalRelations.map(v => ({ ...v })),
      unmappedElements: [...r.unmappedElements]
    };
  }

  private _blendVectors(a: number[], b: number[], weight: number): number[] {
    const len = Math.max(a.length, b.length);
    const result: number[] = [];
    for (let i = 0; i < len; i++) {
      const av = a[i] || 0;
      const bv = b[i] || 0;
      result.push(av * weight + bv * (1 - weight));
    }
    return result;
  }

  private _computeBlendVector(emergent: { element: string; vector: number[]; novelty: number }[]): number[] {
    if (emergent.length === 0) return [];
    const dim = emergent[0].vector.length;
    const result = new Array(dim).fill(0);
    let totalWeight = 0;
    for (const e of emergent) {
      const weight = 1 + e.novelty;
      for (let i = 0; i < dim; i++) {
        result[i] += e.vector[i] * weight;
      }
      totalWeight += weight;
    }
    if (totalWeight > 0) {
      for (let i = 0; i < dim; i++) {
        result[i] /= totalWeight;
      }
    }
    return result;
  }

  private _computeCoherence(
    emergent: { element: string; vector: number[]; novelty: number }[],
    mappings: { sourceElement: string; targetElement: string; goodness: number }[]
  ): number {
    if (mappings.length === 0) return 0.3;
    const avgGoodness = mappings.reduce((s, m) => s + m.goodness, 0) / mappings.length;
    let pairwiseCoherence = 0;
    let pairCount = 0;
    for (let i = 0; i < emergent.length; i++) {
      for (let j = i + 1; j < emergent.length; j++) {
        const sim = this._cosineSimilarity(emergent[i].vector, emergent[j].vector);
        pairwiseCoherence += Math.abs(sim);
        pairCount++;
      }
    }
    const avgPairwise = pairCount > 0 ? pairwiseCoherence / pairCount : 0;
    return avgGoodness * 0.6 + avgPairwise * 0.4;
  }

  private _estimateProductivity(
    emergent: { element: string; vector: number[]; novelty: number }[],
    relations: VitalRelation[]
  ): number {
    const elementScore = Math.min(1, emergent.length / 20);
    const relationScore = Math.min(1, relations.length / 10);
    const avgNovelty = emergent.reduce((s, e) => s + e.novelty, 0) / Math.max(1, emergent.length);
    return elementScore * 0.3 + relationScore * 0.3 + avgNovelty * 0.4;
  }

  private _identifyVitalRelations(
    domainA: ConceptDomain,
    domainB: ConceptDomain,
    mappings: { sourceElement: string; targetElement: string; goodness: number }[]
  ): VitalRelation[] {
    const relations: VitalRelation[] = [];
    for (const m of mappings) {
      relations.push({
        type: 'analogy',
        source: m.sourceElement,
        target: m.targetElement,
        compressionLevel: m.goodness
      });
    }
    for (const relA of domainA.relations) {
      for (const relB of domainB.relations) {
        if (relA.type === relB.type) {
          relations.push({
            type: relA.type as VitalRelation['type'] || 'property',
            source: `${domainA.name}:${relA.source}→${relA.target}`,
            target: `${domainB.name}:${relB.source}→${relB.target}`,
            compressionLevel: (relA.strength + relB.strength) / 2
          });
        }
      }
    }
    return relations.slice(0, 20);
  }

  public computeBlendQuality(blend: BlendResult): { coherence: number; novelty: number; productivity: number } {
    return {
      coherence: blend.coherence,
      novelty: blend.novelty,
      productivity: blend.productivity
    };
  }

  public generateBlendVariants(domainA: string, domainB: string, count: number = 5): BlendResult[] {
    const variants: BlendResult[] = [];
    const base = this.blend(domainA, domainB);
    if (!base) return [];
    variants.push(base);
    for (let i = 1; i < count; i++) {
      const focusDir = i % 2 === 0 ? domainA : domainB;
      const variant = this.blend(domainA, domainB, { focus: focusDir });
      if (variant) {
        variant.id = `blend-variant-${i}-${Date.now()}`;
        variants.push(variant);
      }
    }
    return variants;
  }

  public toKnowledgeUnit(blendId: string): KnowledgeUnit | null {
    const blend = this._blendHistory.find(b => b.id === blendId);
    if (!blend) return null;
    return {
      id: `blend-${blendId}`,
      content: blend.blendedConcept,
      vector: blend.blendVector,
      lineage: ['conceptual-blend', ...blend.vitalRelations.map(v => v.type)]
    };
  }

  public toSignal(blendId: string): Signal | null {
    const blend = this._blendHistory.find(b => b.id === blendId);
    if (!blend) return null;
    return {
      source: `blender-${blendId}`,
      magnitude: blend.novelty * blend.coherence,
      entropy: 1 - blend.coherence,
      timestamp: Date.now()
    };
  }

  public reset(): void {
    this._domains.clear();
    this._blendHistory = [];
    this._blendCache.clear();
  }
}

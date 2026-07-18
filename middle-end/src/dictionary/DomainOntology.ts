import { KnowledgeUnit, DataPacket } from '../shared/types';

export type RelationType = 'is_a' | 'part_of' | 'causes' | 'associated_with' | 'opposite_of' | 'instance_of' | 'property_of';

export interface ConceptNode {
  id: string;
  name: string;
  domain: string;
  definition: string;
  properties: Map<string, string | number | boolean>;
  level: number;
  confidence: number;
  tags: string[];
}

export interface ConceptRelation {
  sourceId: string;
  targetId: string;
  relationType: RelationType;
  strength: number;
  evidence: string[];
  bidirectional: boolean;
}

export interface Domain {
  id: string;
  name: string;
  description: string;
  rootConcepts: string[];
  expertLevel: number;
}

export interface InferencePath {
  steps: { concept: string; relation: RelationType }[];
  totalStrength: number;
  length: number;
}

export interface IDomainOntology {
  conceptCount: number;
  relationCount: number;
  addConcept(concept: ConceptNode): void;
  addRelation(relation: ConceptRelation): void;
  getConcept(conceptId: string): ConceptNode | undefined;
  findConceptsByName(name: string): string[];
  getRelatedConcepts(conceptId: string, relationType?: RelationType): { concept: string; relation: RelationType; strength: number }[];
  computeSemanticPath(from: string, to: string, maxDepth: number): InferencePath | null;
  getDomainRoots(domainId: string): string[];
  inferSubtypes(conceptId: string): string[];
}

export class DomainOntology implements IDomainOntology {
  private _concepts: Map<string, ConceptNode>;
  private _relations: ConceptRelation[];
  private _adjacency: Map<string, { target: string; relation: ConceptRelation }[]>;
  private _domains: Map<string, Domain>;
  private _nameIndex: Map<string, string[]>;
  private _tagIndex: Map<string, string[]>;
  private _inferenceCache: Map<string, InferencePath | null>;
  private _maxCacheSize: number;

  constructor() {
    this._concepts = new Map();
    this._relations = [];
    this._adjacency = new Map();
    this._domains = new Map();
    this._nameIndex = new Map();
    this._tagIndex = new Map();
    this._inferenceCache = new Map();
    this._maxCacheSize = 500;
  }

  get conceptCount(): number { return this._concepts.size; }
  get relationCount(): number { return this._relations.length; }
  get domainCount(): number { return this._domains.size; }
  get cacheHits(): number { return this._cacheHits; }
  private _cacheHits: number = 0;

  public addDomain(domain: Domain): void {
    this._domains.set(domain.id, domain);
  }

  public getDomain(domainId: string): Domain | undefined {
    const d = this._domains.get(domainId);
    return d ? { ...d, rootConcepts: [...d.rootConcepts] } : undefined;
  }

  public addConcept(concept: ConceptNode): void {
    this._concepts.set(concept.id, {
      ...concept,
      properties: new Map(concept.properties)
    });
    const nameKey = concept.name.toLowerCase();
    if (!this._nameIndex.has(nameKey)) {
      this._nameIndex.set(nameKey, []);
    }
    const nameList = this._nameIndex.get(nameKey)!;
    if (!nameList.includes(concept.id)) {
      nameList.push(concept.id);
    }
    for (const tag of concept.tags) {
      if (!this._tagIndex.has(tag)) {
        this._tagIndex.set(tag, []);
      }
      const tagList = this._tagIndex.get(tag)!;
      if (!tagList.includes(concept.id)) {
        tagList.push(concept.id);
      }
    }
    if (!this._adjacency.has(concept.id)) {
      this._adjacency.set(concept.id, []);
    }
    this._inferenceCache.clear();
  }

  public addRelation(relation: ConceptRelation): void {
    this._relations.push({ ...relation, evidence: [...relation.evidence] });
    if (!this._adjacency.has(relation.sourceId)) {
      this._adjacency.set(relation.sourceId, []);
    }
    if (!this._adjacency.has(relation.targetId)) {
      this._adjacency.set(relation.targetId, []);
    }
    this._adjacency.get(relation.sourceId)!.push({ target: relation.targetId, relation });
    if (relation.bidirectional) {
      this._adjacency.get(relation.targetId)!.push({ target: relation.sourceId, relation });
    }
    this._inferenceCache.clear();
  }

  public getConcept(conceptId: string): ConceptNode | undefined {
    const c = this._concepts.get(conceptId);
    return c ? { ...c, properties: new Map(c.properties), tags: [...c.tags] } : undefined;
  }

  public findConceptsByName(name: string): string[] {
    const key = name.toLowerCase();
    const exact = this._nameIndex.get(key);
    if (exact && exact.length > 0) return [...exact];
    const results: string[] = [];
    for (const [n, ids] of this._nameIndex) {
      if (n.includes(key) || key.includes(n)) {
        results.push(...ids);
      }
    }
    return [...new Set(results)];
  }

  public findConceptsByTag(tag: string): string[] {
    return [...(this._tagIndex.get(tag) || [])];
  }

  public getRelatedConcepts(conceptId: string, relationType?: RelationType): { concept: string; relation: RelationType; strength: number; direction: 'out' | 'in' }[] {
    const adj = this._adjacency.get(conceptId);
    if (!adj) return [];
    const results: { concept: string; relation: RelationType; strength: number; direction: 'out' | 'in' }[] = [];
    for (const item of adj) {
      if (relationType && item.relation.relationType !== relationType) continue;
      const isOut = item.relation.sourceId === conceptId;
      const direction: 'out' | 'in' = isOut ? 'out' : 'in';
      results.push({
        concept: item.target,
        relation: item.relation.relationType,
        strength: item.relation.strength,
        direction
      });
    }
    results.sort((a, b) => b.strength - a.strength);
    return results;
  }

  public getDomainRoots(domainId: string): string[] {
    const domain = this._domains.get(domainId);
    return domain ? [...domain.rootConcepts] : [];
  }

  public inferSubtypes(conceptId: string): string[] {
    const subtypes: string[] = [];
    const visited = new Set<string>();
    const queue = [conceptId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      const adj = this._adjacency.get(current);
      if (!adj) continue;
      for (const item of adj) {
        if (item.relation.relationType === 'is_a' && item.relation.targetId === current) {
          subtypes.push(item.relation.sourceId);
          queue.push(item.relation.sourceId);
        }
      }
    }
    return subtypes;
  }

  public inferSupertypes(conceptId: string): string[] {
    const supertypes: string[] = [];
    const visited = new Set<string>();
    const queue = [conceptId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      const adj = this._adjacency.get(current);
      if (!adj) continue;
      for (const item of adj) {
        if (item.relation.relationType === 'is_a' && item.relation.sourceId === current) {
          supertypes.push(item.relation.targetId);
          queue.push(item.relation.targetId);
        }
      }
    }
    return supertypes;
  }

  public computeSemanticPath(from: string, to: string, maxDepth: number = 5): InferencePath | null {
    const cacheKey = `${from}:${to}:${maxDepth}`;
    const cached = this._inferenceCache.get(cacheKey);
    if (cached !== undefined) {
      this._cacheHits++;
      return cached ? { ...cached, steps: [...cached.steps] } : null;
    }
    if (!this._concepts.has(from) || !this._concepts.has(to)) {
      this._cacheResult(cacheKey, null);
      return null;
    }
    const visited = new Map<string, { prev: string | null; relation: RelationType | null; strength: number }>();
    visited.set(from, { prev: null, relation: null, strength: 1 });
    const queue: { node: string; depth: number; strength: number }[] = [{ node: from, depth: 0, strength: 1 }];
    let found = false;
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.node === to) {
        found = true;
        break;
      }
      if (current.depth >= maxDepth) continue;
      const adj = this._adjacency.get(current.node) || [];
      for (const item of adj) {
        const newStrength = current.strength * item.relation.strength;
        const existing = visited.get(item.target);
        if (!existing || newStrength > existing.strength) {
          visited.set(item.target, {
            prev: current.node,
            relation: item.relation.relationType,
            strength: newStrength
          });
          queue.push({ node: item.target, depth: current.depth + 1, strength: newStrength });
        }
      }
    }
    if (!found) {
      this._cacheResult(cacheKey, null);
      return null;
    }
    const steps: { concept: string; relation: RelationType }[] = [];
    let current: string | null = to;
    let totalStrength = 1;
    while (current !== null && current !== from) {
      const info: { prev: string | null; relation: RelationType | null; strength: number } = visited.get(current)!;
      if (info.prev && info.relation) {
        steps.unshift({ concept: current, relation: info.relation });
        totalStrength = info.strength;
      }
      current = info.prev;
    }
    const path: InferencePath = { steps, totalStrength, length: steps.length };
    this._cacheResult(cacheKey, path);
    return { ...path, steps: [...path.steps] };
  }

  private _cacheResult(key: string, result: InferencePath | null): void {
    if (this._inferenceCache.size >= this._maxCacheSize) {
      const firstKey = this._inferenceCache.keys().next().value;
      if (firstKey !== undefined) {
        this._inferenceCache.delete(firstKey);
      }
    }
    this._inferenceCache.set(key, result);
  }

  public computeConceptSimilarity(conceptA: string, conceptB: string): number {
    const path = this.computeSemanticPath(conceptA, conceptB, 6);
    if (!path) return 0;
    const depthPenalty = 1 / (1 + path.length * 0.5);
    return path.totalStrength * depthPenalty;
  }

  public getLeastCommonSupertype(conceptA: string, conceptB: string): string | null {
    const superA = new Set(this.inferSupertypes(conceptA));
    superA.add(conceptA);
    const superB = this.inferSupertypes(conceptB);
    let lcs: string | null = null;
    let minDepth = Infinity;
    if (superA.has(conceptB)) {
      lcs = conceptB;
      minDepth = this._getConceptDepth(conceptB);
    }
    for (const s of superB) {
      if (superA.has(s)) {
        const depth = this._getConceptDepth(s);
        if (depth < minDepth) {
          minDepth = depth;
          lcs = s;
        }
      }
    }
    return lcs;
  }

  private _getConceptDepth(conceptId: string): number {
    const c = this._concepts.get(conceptId);
    return c?.level ?? 0;
  }

  public toKnowledgeUnit(conceptId: string): KnowledgeUnit | null {
    const c = this._concepts.get(conceptId);
    if (!c) return null;
    const vector: number[] = [];
    vector.push(c.level / 10);
    vector.push(c.confidence);
    vector.push(c.properties.size / 20);
    const related = this.getRelatedConcepts(conceptId);
    vector.push(Math.min(1, related.length / 20));
    const typeVec = new Array(7).fill(0);
    const relationTypes: RelationType[] = ['is_a', 'part_of', 'causes', 'associated_with', 'opposite_of', 'instance_of', 'property_of'];
    for (const r of related) {
      const idx = relationTypes.indexOf(r.relation);
      if (idx >= 0) typeVec[idx] += r.strength;
    }
    vector.push(...typeVec.map(v => Math.min(1, v)));
    return {
      id: `concept-${conceptId}`,
      content: c.name,
      vector,
      lineage: [c.domain, ...c.tags]
    };
  }

  public exportDomainTree(domainId: string): { concept: string; children: string[] }[] {
    const roots = this.getDomainRoots(domainId);
    const result: { concept: string; children: string[] }[] = [];
    const visited = new Set<string>();
    const queue = [...roots];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      const subtypes = this.inferSubtypes(current);
      result.push({ concept: current, children: subtypes });
      for (const s of subtypes) {
        if (!visited.has(s)) queue.push(s);
      }
    }
    return result;
  }

  public reset(): void {
    this._concepts.clear();
    this._relations = [];
    this._adjacency.clear();
    this._domains.clear();
    this._nameIndex.clear();
    this._tagIndex.clear();
    this._inferenceCache.clear();
    this._cacheHits = 0;
  }
}

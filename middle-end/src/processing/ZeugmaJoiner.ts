export interface ZeugmaDimension {
  id: string;
  label: string;
  data: Record<string, unknown>;
  transform: (input: Record<string, unknown>) => Record<string, unknown>;
}

export interface ZeugmaResult {
  dimensionIds: string[];
  sharedOperation: string;
  outputs: Record<string, Record<string, unknown>>;
  dualPunScore: number;
}

interface SemanticVector {
  id: string;
  dimensions: Map<string, number>;
  magnitude: number;
}

interface ProjectionInfo {
  sharedBasis: string[];
  uniqueA: string[];
  uniqueB: string[];
  cosineSimilarity: number;
  projectionMagnitude: number;
  resonanceScore: number;
}

export class ZeugmaJoiner {
  private _dimensions: Map<string, ZeugmaDimension> = new Map();
  private _results: ZeugmaResult[] = [];
  private _joinedPairs: Array<[string, string]> = [];
  private _semanticCache: Map<string, SemanticVector> = new Map();
  private _projectionCache: Map<string, ProjectionInfo> = new Map();
  private _resonanceDecay = 0.85;

  registerDimension(dim: ZeugmaDimension): void {
    this._dimensions.set(dim.id, dim);
    this._semanticCache.delete(dim.id);
    this._invalidateProjectionCache();
  }

  join(idA: string, idB: string, operationName = 'dual-apply'): ZeugmaResult | undefined {
    const dimA = this._dimensions.get(idA);
    const dimB = this._dimensions.get(idB);
    if (!dimA || !dimB) return undefined;

    const projection = this._computeProjection(idA, idB);
    const fusedInput = this._fuseDimensions(dimA.data, dimB.data, projection);
    
    const outA = dimA.transform({ ...fusedInput, _dimension: idA });
    const outB = dimB.transform({ ...fusedInput, _dimension: idB });

    const punScore = this._computePunScore(outA, outB, projection);

    const result: ZeugmaResult = {
      dimensionIds: [idA, idB],
      sharedOperation: operationName,
      outputs: { [idA]: outA, [idB]: outB },
      dualPunScore: punScore,
    };
    this._results.push(result);
    this._joinedPairs.push([idA, idB]);
    this._updateResonance(idA, idB, punScore);
    return result;
  }

  private _computeSemanticVector(dimId: string): SemanticVector {
    if (this._semanticCache.has(dimId)) {
      return this._semanticCache.get(dimId)!;
    }
    const dim = this._dimensions.get(dimId);
    if (!dim) {
      const vec: SemanticVector = { id: dimId, dimensions: new Map(), magnitude: 0 };
      this._semanticCache.set(dimId, vec);
      return vec;
    }

    const dims = new Map<string, number>();
    let magSq = 0;

    for (const [key, value] of Object.entries(dim.data)) {
      const weight = this._keySemanticWeight(key);
      const valScore = this._valueSemanticScore(value);
      const score = weight * valScore;
      dims.set(key, score);
      magSq += score * score;
    }

    const magnitude = Math.sqrt(magSq);
    const vec: SemanticVector = { id: dimId, dimensions: dims, magnitude };
    this._semanticCache.set(dimId, vec);
    return vec;
  }

  private _keySemanticWeight(key: string): number {
    let weight = 1;
    if (key.startsWith('_')) weight *= 0.5;
    if (key.includes('id') || key.includes('Id')) weight *= 1.3;
    if (key.includes('value') || key.includes('Value')) weight *= 1.2;
    if (key.includes('name') || key.includes('Name')) weight *= 1.1;
    if (key.includes('type') || key.includes('Type')) weight *= 1.15;
    return weight;
  }

  private _valueSemanticScore(value: unknown): number {
    if (typeof value === 'number') {
      return Math.min(1, Math.abs(value) / 10);
    }
    if (typeof value === 'string') {
      return Math.min(1, value.length / 20);
    }
    if (typeof value === 'boolean') {
      return 0.5;
    }
    if (value === null || value === undefined) {
      return 0;
    }
    if (typeof value === 'object') {
      const keys = Object.keys(value as Record<string, unknown>);
      return Math.min(1, keys.length / 10);
    }
    return 0.3;
  }

  private _computeProjection(idA: string, idB: string): ProjectionInfo {
    const cacheKey = `${idA}:${idB}`;
    if (this._projectionCache.has(cacheKey)) {
      return this._projectionCache.get(cacheKey)!;
    }

    const vecA = this._computeSemanticVector(idA);
    const vecB = this._computeSemanticVector(idB);

    const keysA = new Set(vecA.dimensions.keys());
    const keysB = new Set(vecB.dimensions.keys());
    const sharedBasis: string[] = [];
    const uniqueA: string[] = [];
    const uniqueB: string[] = [];

    let dotProduct = 0;
    for (const key of keysA) {
      if (keysB.has(key)) {
        sharedBasis.push(key);
        dotProduct += (vecA.dimensions.get(key) ?? 0) * (vecB.dimensions.get(key) ?? 0);
      } else {
        uniqueA.push(key);
      }
    }
    for (const key of keysB) {
      if (!keysA.has(key)) {
        uniqueB.push(key);
      }
    }

    const magProduct = vecA.magnitude * vecB.magnitude;
    const cosineSimilarity = magProduct === 0 ? 0 : dotProduct / magProduct;
    
    const projectionMagnitude = vecB.magnitude === 0 ? 0 : dotProduct / vecB.magnitude;
    
    const diversityBonus = Math.min(1, (uniqueA.length + uniqueB.length) / Math.max(1, sharedBasis.length * 2));
    const resonanceScore = cosineSimilarity * (1 + diversityBonus * 0.3);

    const result: ProjectionInfo = {
      sharedBasis,
      uniqueA,
      uniqueB,
      cosineSimilarity,
      projectionMagnitude,
      resonanceScore,
    };
    this._projectionCache.set(cacheKey, result);
    return result;
  }

  private _fuseDimensions(
    dataA: Record<string, unknown>,
    dataB: Record<string, unknown>,
    projection: ProjectionInfo
  ): Record<string, unknown> {
    const fused: Record<string, unknown> = { ...dataA, ...dataB };
    
    for (const key of projection.sharedBasis) {
      const valA = dataA[key];
      const valB = dataB[key];
      if (typeof valA === 'number' && typeof valB === 'number') {
        const blend = projection.cosineSimilarity * 0.5 + 0.5;
        fused[key] = valA * (1 - blend) + valB * blend;
      } else if (typeof valA === 'string' && typeof valB === 'string') {
        fused[key] = `${valA}/${valB}`;
      } else {
        fused[key] = { a: valA, b: valB, shared: true };
      }
    }
    
    fused._sharedBasis = projection.sharedBasis;
    fused._uniqueA = projection.uniqueA;
    fused._uniqueB = projection.uniqueB;
    fused._cosineSimilarity = projection.cosineSimilarity;
    return fused;
  }

  private _computePunScore(
    outA: Record<string, unknown>,
    outB: Record<string, unknown>,
    projection: ProjectionInfo
  ): number {
    const keysA = new Set(Object.keys(outA));
    const keysB = new Set(Object.keys(outB));
    const shared = [...keysA].filter(k => keysB.has(k));
    
    let valueMatchScore = 0;
    let valueCount = 0;
    for (const key of shared) {
      const a = outA[key];
      const b = outB[key];
      if (typeof a === 'number' && typeof b === 'number') {
        const maxAbs = Math.max(Math.abs(a), Math.abs(b), 1);
        const similarity = 1 - Math.min(1, Math.abs(a - b) / maxAbs);
        valueMatchScore += similarity;
        valueCount++;
      } else if (a === b) {
        valueMatchScore += 1;
        valueCount++;
      } else {
        valueCount++;
      }
    }
    
    const structuralOverlap = shared.length / Math.max(1, Math.max(keysA.size, keysB.size));
    const valueSimilarity = valueCount === 0 ? 0 : valueMatchScore / valueCount;
    
    const baseScore = structuralOverlap * 0.4 + valueSimilarity * 0.3 + projection.resonanceScore * 0.3;
    const surpriseFactor = this._computeSurpriseFactor(outA, outB, projection);
    
    return Math.min(1, baseScore * (1 + surpriseFactor * 0.2));
  }

  private _computeSurpriseFactor(
    outA: Record<string, unknown>,
    outB: Record<string, unknown>,
    projection: ProjectionInfo
  ): number {
    const outKeysA = new Set(Object.keys(outA));
    const outKeysB = new Set(Object.keys(outB));
    const outShared = new Set([...outKeysA].filter(k => outKeysB.has(k)));
    
    const unexpectedShared: string[] = [];
    for (const key of outShared) {
      if (!projection.sharedBasis.includes(key)) {
        unexpectedShared.push(key);
      }
    }
    
    return Math.min(1, unexpectedShared.length / Math.max(1, projection.uniqueA.length + projection.uniqueB.length));
  }

  private _updateResonance(idA: string, idB: string, score: number): void {
    const vecA = this._semanticCache.get(idA);
    const vecB = this._semanticCache.get(idB);
    if (!vecA || !vecB) return;
    
    const boost = score * 0.1;
    for (const key of [...vecA.dimensions.keys()]) {
      if (vecB.dimensions.has(key)) {
        const aVal = vecA.dimensions.get(key) ?? 0;
        const bVal = vecB.dimensions.get(key) ?? 0;
        vecA.dimensions.set(key, aVal * this._resonanceDecay + boost);
        vecB.dimensions.set(key, bVal * this._resonanceDecay + boost);
      }
    }
    
    vecA.magnitude = Math.sqrt(
      [...vecA.dimensions.values()].reduce((s, v) => s + v * v, 0)
    );
    vecB.magnitude = Math.sqrt(
      [...vecB.dimensions.values()].reduce((s, v) => s + v * v, 0)
    );
    
    this._invalidateProjectionCache();
  }

  private _invalidateProjectionCache(): void {
    this._projectionCache.clear();
  }

  batchJoin(pairs: Array<[string, string]>): ZeugmaResult[] {
    return pairs.map(([a, b]) => this.join(a, b)!).filter(Boolean);
  }

  pivotJoin(dimensionId: string, others: string[]): ZeugmaResult[] {
    return others.map(o => this.join(dimensionId, o)!).filter(Boolean);
  }

  averagePunScore(): number {
    if (this._results.length === 0) return 0;
    return this._results.reduce((s, r) => s + r.dualPunScore, 0) / this._results.length;
  }

  strongestPun(): ZeugmaResult | undefined {
    if (this._results.length === 0) return undefined;
    return [...this._results].sort((a, b) => b.dualPunScore - a.dualPunScore)[0];
  }

  joinedPairsList(): Array<[string, string]> {
    return [...this._joinedPairs];
  }

  removeDimension(id: string): boolean {
    const deleted = this._dimensions.delete(id);
    if (deleted) {
      this._semanticCache.delete(id);
      this._invalidateProjectionCache();
    }
    return deleted;
  }

  getProjection(idA: string, idB: string): ProjectionInfo | undefined {
    if (!this._dimensions.has(idA) || !this._dimensions.has(idB)) return undefined;
    return this._computeProjection(idA, idB);
  }

  reset(): void {
    this._dimensions.clear();
    this._results = [];
    this._joinedPairs = [];
    this._semanticCache.clear();
    this._projectionCache.clear();
  }

  get dimensionCount(): number {
    return this._dimensions.size;
  }

  get joinCount(): number {
    return this._results.length;
  }

  get resonanceDecay(): number {
    return this._resonanceDecay;
  }
}

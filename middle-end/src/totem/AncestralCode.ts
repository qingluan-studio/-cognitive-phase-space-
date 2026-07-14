export interface AncestralCode {
  id: string;
  source: string;
  sanctifiedAt: number;
  lineage: string[];
  inviolable: boolean;
}

export interface LineageClaim {
  moduleId: string;
  ancestorId: string;
  similarity: number;
  claimedAt: number;
}

export class AncestralCode {
  private _ancestors: Map<string, AncestralCode> = new Map();
  private _claims: LineageClaim[] = [];
  private _sanctified: Set<string> = new Set();
  private _similarityThreshold = 0.3;
  private _tokenFrequency: Map<string, Map<string, number>> = new Map();
  private _entropyCache: Map<string, number> = new Map();

  sanctify(ancestor: AncestralCode): void {
    this._ancestors.set(ancestor.id, ancestor);
    this._sanctified.add(ancestor.id);
    this._buildTfIdf(ancestor);
  }

  isSanctified(ancestorId: string): boolean {
    return this._sanctified.has(ancestorId);
  }

  private _tokenize(source: string): string[] {
    return source.split(/\W+/).filter(t => t.length > 2);
  }

  private _buildTfIdf(ancestor: AncestralCode): void {
    const tokens = this._tokenize(ancestor.source);
    const freq = new Map<string, number>();
    const total = tokens.length;
    for (const token of tokens) {
      freq.set(token, (freq.get(token) ?? 0) + 1 / total);
    }
    this._tokenFrequency.set(ancestor.id, freq);
    let entropy = 0;
    for (const p of freq.values()) {
      if (p > 0) entropy -= p * Math.log2(p);
    }
    this._entropyCache.set(ancestor.id, entropy);
  }

  private _computeSimilarity(source: string, candidate: string): number {
    const sTokens = this._tokenize(source);
    const cTokens = this._tokenize(candidate);
    if (sTokens.length === 0 || cTokens.length === 0) return 0;
    const sSet = new Set(sTokens);
    const cSet = new Set(cTokens);
    const union = new Set([...sSet, ...cSet]);
    const intersection = new Set([...sSet].filter(x => cSet.has(x)));
    const jaccard = intersection.size / union.size;
    const sFreq = new Map<string, number>();
    const cFreq = new Map<string, number>();
    for (const t of sTokens) sFreq.set(t, (sFreq.get(t) ?? 0) + 1);
    for (const t of cTokens) cFreq.set(t, (cFreq.get(t) ?? 0) + 1);
    let dot = 0;
    let sNorm = 0;
    let cNorm = 0;
    for (const [token, sf] of sFreq) {
      const cf = cFreq.get(token) ?? 0;
      dot += sf * cf;
      sNorm += sf * sf;
    }
    for (const cf of cFreq.values()) cNorm += cf * cf;
    const cosine = sNorm > 0 && cNorm > 0 ? dot / (Math.sqrt(sNorm) * Math.sqrt(cNorm)) : 0;
    return 0.5 * jaccard + 0.5 * cosine;
  }

  claimLineage(moduleId: string, source: string): LineageClaim | null {
    let bestAncestor: AncestralCode | null = null;
    let bestSimilarity = 0;
    for (const ancestor of this._ancestors.values()) {
      const similarity = this._computeSimilarity(ancestor.source, source);
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestAncestor = ancestor;
      }
    }
    if (!bestAncestor || bestSimilarity < this._similarityThreshold) return null;
    const claim: LineageClaim = {
      moduleId,
      ancestorId: bestAncestor.id,
      similarity: bestSimilarity,
      claimedAt: Date.now(),
    };
    this._claims.push(claim);
    if (this._claims.length > 300) this._claims.shift();
    bestAncestor.lineage.push(moduleId);
    return claim;
  }

  verifyLineage(moduleId: string): AncestralCode | null {
    const claim = this._claims.find(c => c.moduleId === moduleId);
    if (!claim) return null;
    return this._ancestors.get(claim.ancestorId) ?? null;
  }

  checkCompatibility(moduleId: string, newSource: string): { compatible: boolean; reason: string } {
    const ancestor = this.verifyLineage(moduleId);
    if (!ancestor) return { compatible: true, reason: 'No ancestor constraint' };
    if (ancestor.inviolable) {
      const similarity = this._computeSimilarity(ancestor.source, newSource);
      if (similarity < this._similarityThreshold) {
        return { compatible: false, reason: `Violation of ancestor ${ancestor.id}: similarity ${similarity.toFixed(2)} below threshold` };
      }
    }
    return { compatible: true, reason: 'Maintained lineage with ancestor' };
  }

  declareInviolable(ancestorId: string): boolean {
    const ancestor = this._ancestors.get(ancestorId);
    if (!ancestor) return false;
    ancestor.inviolable = true;
    return true;
  }

  getDescendants(ancestorId: string): string[] {
    const ancestor = this._ancestors.get(ancestorId);
    return ancestor ? [...ancestor.lineage] : [];
  }

  setSimilarityThreshold(value: number): void {
    this._similarityThreshold = Math.max(0, Math.min(1, value));
  }

  listAncestors(): AncestralCode[] {
    return Array.from(this._ancestors.values());
  }

  getClaimHistory(limit: number = 50): LineageClaim[] {
    return this._claims.slice(-limit);
  }

  get ancestorCount(): number {
    return this._ancestors.size;
  }

  get totalLineage(): number {
    return this._claims.length;
  }

  computeAncestorEntropy(ancestorId: string): number {
    return this._entropyCache.get(ancestorId) ?? 0;
  }

  recomputeAllTfIdf(): void {
    this._tokenFrequency.clear();
    this._entropyCache.clear();
    for (const ancestor of this._ancestors.values()) {
      this._buildTfIdf(ancestor);
    }
  }
}

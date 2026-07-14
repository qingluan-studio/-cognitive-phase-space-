/**
 * 祖先代码模块：尊崇最早的核心代码为图腾，
 * 后续所有代码都应保持与祖先代码的兼容性与精神延续。
 */

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

  sanctify(ancestor: AncestralCode): void {
    this._ancestors.set(ancestor.id, ancestor);
    this._sanctified.add(ancestor.id);
  }

  isSanctified(ancestorId: string): boolean {
    return this._sanctified.has(ancestorId);
  }

  private _computeSimilarity(source: string, candidate: string): number {
    const sourceTokens = source.split(/\W+/).filter(t => t.length > 0);
    const candidateTokens = candidate.split(/\W+/).filter(t => t.length > 0);
    if (sourceTokens.length === 0 || candidateTokens.length === 0) return 0;
    const sourceSet = new Set(sourceTokens);
    let common = 0;
    for (const token of candidateTokens) {
      if (sourceSet.has(token)) common++;
    }
    return common / Math.max(sourceTokens.length, candidateTokens.length);
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
}

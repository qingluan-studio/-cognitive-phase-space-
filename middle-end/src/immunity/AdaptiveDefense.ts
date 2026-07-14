export interface Antibody {
  id: string;
  targetSignature: string;
  affinity: number;
  generatedAt: number;
  usageCount: number;
}

export interface AdaptiveResponse {
  antibodyId: string;
  intruderSignature: string;
  neutralized: boolean;
  responseTime: number;
}

export class AdaptiveDefense {
  private _antibodies: Map<string, Antibody> = new Map();
  private _responses: AdaptiveResponse[] = [];
  private _affinityThreshold = 0.5;
  private _maxAntibodies = 200;
  private _mutationRate = 0.1;
  private _clonalExpansion: Map<string, number> = new Map();

  generateAntibody(intruderSignature: string): Antibody {
    const antibody: Antibody = {
      id: `ab-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      targetSignature: intruderSignature,
      affinity: 0.3 + Math.random() * 0.3,
      generatedAt: Date.now(),
      usageCount: 0,
    };
    this._antibodies.set(antibody.id, antibody);
    if (this._antibodies.size > this._maxAntibodies) {
      const oldest = Array.from(this._antibodies.values()).sort((a, b) => a.generatedAt - b.generatedAt)[0];
      if (oldest) this._antibodies.delete(oldest.id);
    }
    return antibody;
  }

  respond(intruderSignature: string): AdaptiveResponse | null {
    const matchResult = this._findBestMatch(intruderSignature);
    if (!matchResult.best || matchResult.score < this._affinityThreshold) {
      const newAb = this.generateAntibody(intruderSignature);
      const response: AdaptiveResponse = {
        antibodyId: newAb.id,
        intruderSignature,
        neutralized: false,
        responseTime: 0,
      };
      this._responses.push(response);
      if (this._responses.length > 200) this._responses.shift();
      return response;
    }
    this._affinityMaturation(matchResult.best, intruderSignature);
    matchResult.best.usageCount++;
    const expansion = (this._clonalExpansion.get(matchResult.best.id) ?? 0) + 1;
    this._clonalExpansion.set(matchResult.best.id, expansion);
    if (expansion >= 3 && this._antibodies.size < this._maxAntibodies) {
      this._generateMutantClone(matchResult.best, intruderSignature);
    }
    const response: AdaptiveResponse = {
      antibodyId: matchResult.best.id,
      intruderSignature,
      neutralized: true,
      responseTime: Date.now() - matchResult.best.generatedAt,
    };
    this._responses.push(response);
    if (this._responses.length > 200) this._responses.shift();
    return response;
  }

  private _findBestMatch(signature: string): { best: Antibody | null; score: number } {
    let best: Antibody | null = null;
    let bestScore = 0;
    for (const ab of this._antibodies.values()) {
      const score = this._matchScore(ab.targetSignature, signature) * ab.affinity;
      if (score > bestScore) {
        bestScore = score;
        best = ab;
      }
    }
    return { best, score: bestScore };
  }

  private _affinityMaturation(antibody: Antibody, signature: string): void {
    const currentMatch = this._matchScore(antibody.targetSignature, signature);
    const targetMatch = this._matchScore(antibody.targetSignature, antibody.targetSignature);
    const improvementRoom = targetMatch - currentMatch;
    antibody.affinity = Math.min(1, antibody.affinity + 0.05 * (1 + improvementRoom));
  }

  private _generateMutantClone(parent: Antibody, signature: string): void {
    const mutatedTarget = this._mutateSignature(parent.targetSignature, signature);
    const clone: Antibody = {
      id: `${parent.id}-c${Math.random().toString(36).slice(2, 4)}`,
      targetSignature: mutatedTarget,
      affinity: Math.min(1, parent.affinity * 0.95),
      generatedAt: Date.now(),
      usageCount: 0,
    };
    this._antibodies.set(clone.id, clone);
  }

  private _mutateSignature(original: string, target: string): string {
    const chars = original.split('');
    for (let i = 0; i < chars.length; i++) {
      if (Math.random() < this._mutationRate && i < target.length) {
        chars[i] = target[i];
      }
    }
    return chars.join('');
  }

  private _matchScore(a: string, b: string): number {
    const setA = new Set(a);
    const setB = new Set(b);
    let common = 0;
    for (const ch of setA) if (setB.has(ch)) common++;
    return common / Math.max(setA.size, setB.size);
  }

  computeAffinityDistribution(): { mean: number; variance: number } {
    if (this._antibodies.size === 0) return { mean: 0, variance: 0 };
    const affinities = Array.from(this._antibodies.values()).map(a => a.affinity);
    const mean = affinities.reduce((s, v) => s + v, 0) / affinities.length;
    const variance = affinities.reduce((s, v) => s + (v - mean) ** 2, 0) / affinities.length;
    return { mean, variance };
  }

  setAffinityThreshold(value: number): void {
    this._affinityThreshold = Math.max(0, Math.min(1, value));
  }

  setMutationRate(value: number): void {
    this._mutationRate = Math.max(0, Math.min(1, value));
  }

  getAntibody(id: string): Antibody | null {
    return this._antibodies.get(id) ?? null;
  }

  getResponses(limit: number = 50): AdaptiveResponse[] {
    return this._responses.slice(-limit);
  }

  get antibodyCount(): number {
    return this._antibodies.size;
  }
}

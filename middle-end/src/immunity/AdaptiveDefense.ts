/**
 * 适应性防御：根据入侵调整的防御。
 * 防御系统会根据入侵特征动态生成针对性的抗体，并在再次遭遇时快速响应。
 */

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
    let best: Antibody | null = null;
    let bestScore = 0;
    for (const ab of this._antibodies.values()) {
      const score = this._matchScore(ab.targetSignature, intruderSignature) * ab.affinity;
      if (score > bestScore) {
        bestScore = score;
        best = ab;
      }
    }
    if (!best || bestScore < this._affinityThreshold) {
      const newAb = this.generateAntibody(intruderSignature);
      const response: AdaptiveResponse = {
        antibodyId: newAb.id,
        intruderSignature,
        neutralized: false,
        responseTime: 0,
      };
      this._responses.push(response);
      return response;
    }
    best.affinity = Math.min(1, best.affinity + 0.05);
    best.usageCount++;
    const response: AdaptiveResponse = {
      antibodyId: best.id,
      intruderSignature,
      neutralized: true,
      responseTime: Date.now() - best.generatedAt,
    };
    this._responses.push(response);
    if (this._responses.length > 200) this._responses.shift();
    return response;
  }

  private _matchScore(a: string, b: string): number {
    const setA = new Set(a);
    const setB = new Set(b);
    let common = 0;
    for (const ch of setA) if (setB.has(ch)) common++;
    return common / Math.max(setA.size, setB.size);
  }

  setAffinityThreshold(value: number): void {
    this._affinityThreshold = Math.max(0, Math.min(1, value));
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

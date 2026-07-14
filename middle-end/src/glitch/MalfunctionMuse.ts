/**
 * 故障缪斯：从故障中获得灵感，生成创新解决方案。
 * 把故障视为创意缪斯，分析故障模式以激发非常规的解决思路与启发式联想。
 */

export interface FailureInspiration {
  id: string;
  failureSignature: string;
  insights: string[];
  proposedSolutions: string[];
  inspirationScore: number;
  generatedAt: number;
}

export interface AssociationLink {
  from: string;
  to: string;
  strength: number;
}

export class MalfunctionMuse {
  private _inspirations: FailureInspiration[] = [];
  private _associations: AssociationLink[] = [];
  private _insightTemplates: string[] = [
    'What if the failure is actually the correct path?',
    'The glitch reveals a hidden invariant.',
    'Failure pattern suggests an inverted solution.',
    'The error points to an unexplored dimension.',
    'Consider the failure as a feature in another context.',
  ];

  inspire(failureSignature: string, context: Record<string, unknown> = {}): FailureInspiration {
    const insights = this._generateInsights(failureSignature, context);
    const proposedSolutions = this._deriveSolutions(insights);
    const inspirationScore = this._scoreInspiration(insights, proposedSolutions);

    const inspiration: FailureInspiration = {
      id: `muse-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      failureSignature,
      insights,
      proposedSolutions,
      inspirationScore,
      generatedAt: Date.now(),
    };
    this._inspirations.push(inspiration);
    if (this._inspirations.length > 100) this._inspirations.shift();

    this._recordAssociations(failureSignature, insights);
    return inspiration;
  }

  private _generateInsights(signature: string, context: Record<string, unknown>): string[] {
    const insights: string[] = [];
    const contextKeys = Object.keys(context);
    for (let i = 0; i < 3; i++) {
      const template = this._insightTemplates[Math.floor(Math.random() * this._insightTemplates.length)];
      const contextKey = contextKeys[i % Math.max(1, contextKeys.length)] ?? 'system';
      insights.push(`[${contextKey}] ${template} (signature: ${signature.slice(0, 16)})`);
    }
    return insights;
  }

  private _deriveSolutions(insights: string[]): string[] {
    return insights.map(insight => {
      const inverted = insight.replace('failure', 'success').replace('error', 'truth');
      return `Try: ${inverted.toLowerCase()}`;
    });
  }

  private _scoreInspiration(insights: string[], solutions: string[]): number {
    const uniqueness = new Set(insights).size / Math.max(1, insights.length);
    const coverage = solutions.length / 5;
    return Math.min(1, (uniqueness + coverage) / 2);
  }

  private _recordAssociations(signature: string, insights: string[]): void {
    for (const insight of insights) {
      this._associations.push({
        from: signature,
        to: insight,
        strength: Math.random(),
      });
    }
    if (this._associations.length > 200) this._associations.shift();
  }

  addInsightTemplate(template: string): void {
    this._insightTemplates.push(template);
  }

  getInspirations(limit: number = 50): FailureInspiration[] {
    return this._inspirations.slice(-limit);
  }

  getAssociations(): AssociationLink[] {
    return [...this._associations];
  }

  get inspirationCount(): number {
    return this._inspirations.length;
  }

  get averageScore(): number {
    if (this._inspirations.length === 0) return 0;
    const total = this._inspirations.reduce((sum, i) => sum + i.inspirationScore, 0);
    return total / this._inspirations.length;
  }
}

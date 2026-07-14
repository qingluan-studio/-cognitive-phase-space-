export interface FailureInspiration {
  id: string;
  failureSignature: string;
  insights: string[];
  proposedSolutions: string[];
  inspirationScore: number;
  novelty: number;
  coverage: number;
  diversity: number;
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
  private _associationGraph: Map<string, Map<string, number>> = new Map();
  private _insightTemplates: string[] = [
    'What if the failure is actually the correct path?',
    'The glitch reveals a hidden invariant.',
    'Failure pattern suggests an inverted solution.',
    'The error points to an unexplored dimension.',
    'Consider the failure as a feature in another context.',
    'The malfunction indicates a missing abstraction layer.',
    'Failure modes are boundary probes of the design space.',
  ];
  private _signatureHistory: Map<string, number> = new Map();

  inspire(failureSignature: string, context: Record<string, unknown> = {}): FailureInspiration {
    const insights = this._generateInsights(failureSignature, context);
    const proposedSolutions = this._deriveSolutions(insights);
    const novelty = this._computeNovelty(failureSignature, insights);
    const coverage = this._computeCoverage(insights, proposedSolutions);
    const diversity = this._computeDiversity(insights);
    const inspirationScore = this._scoreInspiration(novelty, coverage, diversity);

    const inspiration: FailureInspiration = {
      id: `muse-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      failureSignature,
      insights,
      proposedSolutions,
      inspirationScore,
      novelty,
      coverage,
      diversity,
      generatedAt: Date.now(),
    };
    this._inspirations.push(inspiration);
    if (this._inspirations.length > 100) this._inspirations.shift();

    this._recordAssociations(failureSignature, insights);
    this._signatureHistory.set(failureSignature, (this._signatureHistory.get(failureSignature) ?? 0) + 1);
    return inspiration;
  }

  private _generateInsights(signature: string, context: Record<string, unknown>): string[] {
    const insights: string[] = [];
    const contextKeys = Object.keys(context);
    const templateCount = Math.min(5, Math.max(3, contextKeys.length + 2));
    const usedTemplates = new Set<number>();
    for (let i = 0; i < templateCount; i++) {
      let idx = Math.floor(Math.random() * this._insightTemplates.length);
      while (usedTemplates.has(idx)) {
        idx = (idx + 1) % this._insightTemplates.length;
      }
      usedTemplates.add(idx);
      const template = this._insightTemplates[idx];
      const contextKey = contextKeys[i % Math.max(1, contextKeys.length)] ?? 'system';
      insights.push(`[${contextKey}] ${template} (signature: ${signature.slice(0, 16)})`);
    }
    return insights;
  }

  private _deriveSolutions(insights: string[]): string[] {
    return insights.map(insight => {
      let inverted = insight.replace(/failure/gi, 'success').replace(/error/gi, 'truth').replace(/malfunction/gi, 'function');
      if (Math.random() < 0.5) inverted = inverted.replace(/missing/gi, 'implicit').replace(/hidden/gi, 'visible');
      return `Try: ${inverted.toLowerCase()}`;
    });
  }

  private _computeNovelty(signature: string, insights: string[]): number {
    const history = this._signatureHistory.get(signature) ?? 0;
    const frequencyPenalty = 1 - Math.min(1, history * 0.2);
    const uniqueInsights = new Set(insights).size / Math.max(1, insights.length);
    const templateVariety = new Set(insights.map(i => i.slice(i.indexOf(']') + 2, i.indexOf('(')))).size / Math.max(1, insights.length);
    return Math.min(1, frequencyPenalty * (0.6 * uniqueInsights + 0.4 * templateVariety));
  }

  private _computeCoverage(insights: string[], solutions: string[]): number {
    const covered = new Set<string>();
    for (const sol of solutions) {
      const keywords = sol.toLowerCase().split(/\s+/).filter(w => w.length > 4);
      for (const kw of keywords) covered.add(kw);
    }
    const totalKeywords = insights.reduce((s, i) => s + i.split(/\s+/).filter(w => w.length > 4).length, 0);
    return Math.min(1, covered.size / Math.max(1, totalKeywords));
  }

  private _computeDiversity(insights: string[]): number {
    if (insights.length < 2) return 0;
    let totalDistance = 0;
    let pairs = 0;
    for (let i = 0; i < insights.length; i++) {
      for (let j = i + 1; j < insights.length; j++) {
        totalDistance += this._editDistance(insights[i], insights[j]);
        pairs++;
      }
    }
    const avgDistance = totalDistance / pairs;
    const maxLength = Math.max(...insights.map(i => i.length));
    return Math.min(1, avgDistance / Math.max(1, maxLength));
  }

  private _editDistance(a: string, b: string): number {
    const m = a.length, n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;
    const prev = new Array(n + 1);
    const curr = new Array(n + 1);
    for (let j = 0; j <= n; j++) prev[j] = j;
    for (let i = 1; i <= m; i++) {
      curr[0] = i;
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      }
      for (let j = 0; j <= n; j++) prev[j] = curr[j];
    }
    return prev[n];
  }

  private _scoreInspiration(novelty: number, coverage: number, diversity: number): number {
    return Math.min(1, 0.4 * novelty + 0.3 * coverage + 0.3 * diversity);
  }

  private _recordAssociations(signature: string, insights: string[]): void {
    if (!this._associationGraph.has(signature)) this._associationGraph.set(signature, new Map());
    const neighbors = this._associationGraph.get(signature)!;
    for (const insight of insights) {
      const strength = 0.5 + Math.random() * 0.5;
      this._associations.push({ from: signature, to: insight, strength });
      neighbors.set(insight, (neighbors.get(insight) ?? 0) + strength);
      if (this._associations.length > 200) this._associations.shift();
    }
  }

  computeImportance(node: string): number {
    const inbound: string[] = [];
    const outbound = this._associationGraph.get(node);
    for (const [src, neighbors] of this._associationGraph) {
      if (neighbors.has(node)) inbound.push(src);
    }
    const inDegree = inbound.length;
    const outDegree = outbound?.size ?? 0;
    return Math.min(1, (inDegree * 0.7 + outDegree * 0.3) / 10);
  }

  addInsightTemplate(template: string): void {
    this._insightTemplates.push(template);
  }

  getInspirations(limit: number = 50): FailureInspiration[] {
    return this._inspirations.slice(-limit);
  }

  getAssociations(): AssociationLink[] { return [...this._associations]; }
  get inspirationCount(): number { return this._inspirations.length; }
  get averageScore(): number {
    if (this._inspirations.length === 0) return 0;
    return this._inspirations.reduce((s, i) => s + i.inspirationScore, 0) / this._inspirations.length;
  }
}

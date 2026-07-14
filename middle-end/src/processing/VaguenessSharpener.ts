export interface FuzzyDirective {
  id: string;
  text: string;
  vaguenessScore: number;
  ambiguousTerms: string[];
  context: Record<string, unknown>;
  fuzzinessEntropy: number;
}

export interface SharpenedAction {
  directiveId: string;
  action: string;
  counterfactual: string;
  clarity: number;
  resolvedTerms: string[];
  contrastiveLoss: number;
  membershipDegrees: Record<string, number>;
}

interface FuzzyTerm {
  term: string;
  category: string;
  memberships: Record<string, number>;
  prototypes: string[];
}

export class VaguenessSharpener {
  private _directives: Map<string, FuzzyDirective> = new Map();
  private _actions: SharpenedAction[] = [];
  private _vagueLexicon: Map<string, FuzzyTerm> = new Map();
  private _sharpened = 0;
  private _learningRate = 0.05;

  constructor() {
    const defaults: Array<{ term: string; category: string; prototypes: string[] }> = [
      { term: 'maybe', category: 'epistemic', prototypes: ['possibly', 'perhaps'] },
      { term: 'soon', category: 'temporal', prototypes: ['shortly', 'presently'] },
      { term: 'some', category: 'quantitative', prototypes: ['several', 'a few'] },
      { term: 'roughly', category: 'approximation', prototypes: ['approximately', 'around'] },
      { term: 'kinda', category: 'qualitative', prototypes: ['sort of', 'somewhat'] },
      { term: '大约', category: 'approximation', prototypes: ['左右', '上下'] },
      { term: '可能', category: 'epistemic', prototypes: ['也许', '或许'] },
      { term: '一些', category: 'quantitative', prototypes: ['几个', '若干'] },
      { term: '很快', category: 'temporal', prototypes: ['马上', '立刻'] },
    ];
    for (const d of defaults) {
      const memberships: Record<string, number> = {};
      for (const p of d.prototypes) memberships[p] = 0.6 + Math.random() * 0.3;
      this._vagueLexicon.set(d.term.toLowerCase(), { term: d.term, category: d.category, memberships, prototypes: d.prototypes });
    }
  }

  addDirective(directive: FuzzyDirective): void {
    this._directives.set(directive.id, { ...directive, context: directive.context ?? {}, fuzzinessEntropy: directive.fuzzinessEntropy ?? 0 });
  }

  addVagueTerm(term: string): void {
    const lower = term.toLowerCase();
    if (!this._vagueLexicon.has(lower)) this._vagueLexicon.set(lower, { term: lower, category: 'general', memberships: {}, prototypes: [lower] });
  }

  analyzeVagueness(text: string): { score: number; terms: string[]; entropy: number; memberships: Record<string, number> } {
    const tokens = text.toLowerCase().split(/[\s,，。.！!？?]+/).filter(Boolean);
    const ambiguous: string[] = [];
    const memberships: Record<string, number> = {};
    let totalFuzziness = 0;
    for (const token of tokens) {
      const ft = this._vagueLexicon.get(token);
      if (ft) {
        ambiguous.push(token);
        const m = this._membershipDegree(ft, tokens);
        memberships[token] = m;
        totalFuzziness += m;
      }
    }
    const score = tokens.length === 0 ? 0 : totalFuzziness / tokens.length;
    const entropy = this._fuzzinessEntropy(memberships, ambiguous.length);
    return { score, terms: ambiguous, entropy, memberships };
  }

  private _membershipDegree(ft: FuzzyTerm, contextTokens: string[]): number {
    const vals = Object.values(ft.memberships);
    const base = vals.length === 0 ? 0.5 : vals.reduce((s, v) => s + v, 0) / vals.length;
    let contextBoost = 0;
    for (const token of contextTokens) if (ft.prototypes.some(p => p.includes(token) || token.includes(p))) contextBoost += 0.1;
    const weights: Record<string, number> = { epistemic: 0.9, temporal: 0.85, quantitative: 0.95, approximation: 0.8, qualitative: 0.7, general: 0.6 };
    return Math.min(1, base * (weights[ft.category] ?? 0.6) + contextBoost);
  }

  private _fuzzinessEntropy(memberships: Record<string, number>, termCount: number): number {
    if (termCount === 0) return 0;
    let entropy = 0;
    for (const v of Object.values(memberships)) if (v > 0 && v < 1) entropy -= v * Math.log2(v + 1e-10) + (1 - v) * Math.log2(1 - v + 1e-10);
    return entropy / Math.max(1, termCount);
  }

  sharpen(directiveId: string): SharpenedAction | undefined {
    const directive = this._directives.get(directiveId);
    if (!directive) return undefined;
    const analysis = this.analyzeVagueness(directive.text);
    directive.vaguenessScore = analysis.score;
    directive.ambiguousTerms = analysis.terms;
    directive.fuzzinessEntropy = analysis.entropy;
    const resolvedTerms: string[] = [];
    const resolutionMap: Record<string, string> = {};
    for (const term of analysis.terms) {
      const resolution = this._resolveTerm(term, directive.context, analysis.memberships[term] ?? 0.5);
      resolvedTerms.push(resolution);
      resolutionMap[term] = resolution;
    }
    const clarifiedText = this._rewrite(directive.text, resolutionMap);
    const counterfactual = this._generateCounterfactual(analysis.terms, resolutionMap);
    const contrastiveLoss = this._contrastiveLoss(directive.text, clarifiedText, analysis.terms);
    const clarity = 1 - analysis.score * (1 - contrastiveLoss * 0.3);
    const action: SharpenedAction = { directiveId, action: clarifiedText, counterfactual, clarity, resolvedTerms, contrastiveLoss, membershipDegrees: analysis.memberships };
    this._actions.push(action);
    this._sharpened++;
    this._updateLexicon(analysis.terms, resolutionMap, clarity);
    return action;
  }

  private _resolveTerm(term: string, context: Record<string, unknown>, membership: number): string {
    const ft = this._vagueLexicon.get(term.toLowerCase());
    const intensity = this._contextIntensity(context, ft?.category ?? 'general');
    const sharpness = 1 - membership;
    switch (ft?.category) {
      case 'temporal': return `${Math.floor(1 + (1 - intensity) * 29 + sharpness * 10)} 分钟内`;
      case 'quantitative': return `${Math.floor(1 + sharpness * 2)}-${Math.ceil(3 + (1 - sharpness) * 7 + intensity * 5)} 项`;
      case 'approximation': return `±${Math.max(1, Math.floor(5 + (1 - sharpness) * 25 - intensity * 10))}% 容差`;
      case 'epistemic': return `>${Math.floor(50 + sharpness * 40 + intensity * 10)}% 置信度`;
      case 'qualitative': return `中等程度，阈值 ${(sharpness * 0.8 + 0.1).toFixed(2)}`;
      default: return `针对"${term}"的具体数值`;
    }
  }

  private _contextIntensity(context: Record<string, unknown>, category: string): number {
    let intensity = 0.5;
    for (const key of Object.keys(context)) {
      const val = context[key];
      if (typeof val === 'number') intensity += 0.1;
      else if (typeof val === 'string' && val.length > 5) intensity += 0.05;
    }
    const biases: Record<string, number> = { temporal: 0.1, quantitative: 0.15, approximation: 0.05, epistemic: -0.05, qualitative: -0.1, general: 0 };
    intensity += biases[category] ?? 0;
    return Math.max(0, Math.min(1, intensity));
  }

  private _rewrite(text: string, resolutionMap: Record<string, string>): string {
    let result = text;
    for (const term of Object.keys(resolutionMap)) result = result.replace(new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), `[${resolutionMap[term]}]`);
    return result;
  }

  private _generateCounterfactual(terms: string[], resolutions: Record<string, string>): string {
    if (terms.length === 0) return '无模糊项需澄清';
    const list = terms.map(t => `"${t}"→${resolutions[t] || '?'}`).join('、');
    return `若非${list}，则应明确指定具体数值、时间或量化标准以避免歧义`;
  }

  private _contrastiveLoss(original: string, sharpened: string, terms: string[]): number {
    if (terms.length === 0) return 0;
    const origTokens = new Set(original.toLowerCase().split(/[\s,，。.]+/).filter(Boolean));
    const sharpTokens = new Set(sharpened.toLowerCase().split(/[\s,，。.]+/).filter(Boolean));
    const intersection = new Set([...origTokens].filter(t => sharpTokens.has(t)));
    const union = new Set([...origTokens, ...sharpTokens]);
    const overlap = union.size === 0 ? 0 : intersection.size / union.size;
    return Math.min(1, (1 - overlap) * 0.6 + Math.min(1, terms.length * 0.2) * 0.4);
  }

  private _updateLexicon(terms: string[], resolutions: Record<string, string>, clarity: number): void {
    for (const term of terms) {
      const ft = this._vagueLexicon.get(term.toLowerCase());
      if (!ft) continue;
      const resolution = resolutions[term] ?? '';
      const update = this._learningRate * clarity * 0.1;
      ft.memberships[resolution] = (ft.memberships[resolution] ?? 0.5) * (1 - update) + update;
    }
  }

  sharpenAll(): SharpenedAction[] {
    const results: SharpenedAction[] = [];
    for (const id of this._directives.keys()) { const action = this.sharpen(id); if (action) results.push(action); }
    return results;
  }

  averageClarity(): number { return this._actions.length === 0 ? 0 : this._actions.reduce((s, a) => s + a.clarity, 0) / this._actions.length; }

  mostAmbiguous(limit = 3): FuzzyDirective[] { return Array.from(this._directives.values()).sort((a, b) => b.fuzzinessEntropy - a.fuzzinessEntropy).slice(0, limit); }

  reset(): void { this._directives.clear(); this._actions = []; }

  get directiveCount(): number { return this._directives.size; }
  get sharpenedCount(): number { return this._sharpened; }
  get vagueTermCount(): number { return this._vagueLexicon.size; }
  get averageContrastiveLoss(): number { return this._actions.length === 0 ? 0 : this._actions.reduce((s, a) => s + a.contrastiveLoss, 0) / this._actions.length; }
}

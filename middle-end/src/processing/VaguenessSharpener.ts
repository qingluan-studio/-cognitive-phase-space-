/**
 * 模糊锐化器模块：通过反事实解释将模糊的自然语言指令
 * 转化为清晰可执行动作，对每个模糊点构造"若非如此"的对比情境。
 */

export interface FuzzyDirective {
  id: string;
  text: string;
  vaguenessScore: number;
  ambiguousTerms: string[];
}

export interface SharpenedAction {
  directiveId: string;
  action: string;
  counterfactual: string;
  clarity: number;
  resolvedTerms: string[];
}

export class VaguenessSharpener {
  private _directives: Map<string, FuzzyDirective> = new Map();
  private _actions: SharpenedAction[] = [];
  private _vagueLexicon: Set<string> = new Set(['maybe', 'soon', 'some', 'roughly', 'kinda', '大约', '可能', '一些', '很快']);
  private _sharpened = 0;

  addDirective(directive: FuzzyDirective): void {
    this._directives.set(directive.id, directive);
  }

  addVagueTerm(term: string): void {
    this._vagueLexicon.add(term.toLowerCase());
  }

  analyzeVagueness(text: string): { score: number; terms: string[] } {
    const tokens = text.toLowerCase().split(/[\s,，。.]+/).filter(Boolean);
    const ambiguous = tokens.filter(t => this._vagueLexicon.has(t));
    const score = tokens.length === 0 ? 0 : ambiguous.length / tokens.length;
    return { score, terms: ambiguous };
  }

  sharpen(directiveId: string): SharpenedAction | undefined {
    const directive = this._directives.get(directiveId);
    if (!directive) return undefined;

    const analysis = this.analyzeVagueness(directive.text);
    directive.vaguenessScore = analysis.score;
    directive.ambiguousTerms = analysis.terms;

    const resolvedTerms = analysis.terms.map(t => this._resolveTerm(t));
    const clarifiedText = this._rewrite(directive.text, analysis.terms);
    const counterfactual = `若非"${analysis.terms.join('、')}"则应明确具体阈值、时间或数量`;
    const clarity = 1 - analysis.score;

    const action: SharpenedAction = {
      directiveId,
      action: clarifiedText,
      counterfactual,
      clarity,
      resolvedTerms,
    };
    this._actions.push(action);
    this._sharpened++;
    return action;
  }

  private _resolveTerm(term: string): string {
    const resolutions: Record<string, string> = {
      'soon': 'within 5 minutes',
      'maybe': 'with >60% confidence',
      'some': '3-5 items',
      'roughly': '±10% tolerance',
      '大约': '±10% 容差',
      '可能': '>60% 置信度',
      '一些': '3-5 项',
      '很快': '5 分钟内',
    };
    return resolutions[term] ?? `specific value for "${term}"`;
  }

  private _rewrite(text: string, terms: string[]): string {
    let result = text;
    for (const term of terms) {
      const resolution = this._resolveTerm(term);
      result = result.replace(new RegExp(term, 'gi'), `[${resolution}]`);
    }
    return result;
  }

  sharpenAll(): SharpenedAction[] {
    const results: SharpenedAction[] = [];
    for (const id of this._directives.keys()) {
      const action = this.sharpen(id);
      if (action) results.push(action);
    }
    return results;
  }

  averageClarity(): number {
    if (this._actions.length === 0) return 0;
    return this._actions.reduce((s, a) => s + a.clarity, 0) / this._actions.length;
  }

  mostAmbiguous(limit = 3): FuzzyDirective[] {
    return Array.from(this._directives.values())
      .sort((a, b) => b.vaguenessScore - a.vaguenessScore)
      .slice(0, limit);
  }

  reset(): void {
    this._directives.clear();
    this._actions = [];
  }

  get directiveCount(): number {
    return this._directives.size;
  }

  get sharpenedCount(): number {
    return this._sharpened;
  }

  get vagueTermCount(): number {
    return this._vagueLexicon.size;
  }
}

export interface CodeVariant {
  id: string;
  source: string;
  generation: number;
  fitness: number;
  parentId: string | null;
}

export interface MutationProfile {
  rate: number;
  insertions: number;
  deletions: number;
}

interface GrammarRule {
  symbol: string;
  expansions: string[];
}

export class AutocatalyticCode {
  private _variants: Map<string, CodeVariant> = new Map();
  private _template: string = '';
  private _generation: number = 0;
  private _mutation: MutationProfile = { rate: 0.1, insertions: 0, deletions: 0 };
  private _grammar: GrammarRule[] = [];
  private _selectionPressure: number = 0.7;

  constructor() {
    this._initGrammar();
  }

  seed(source: string): CodeVariant {
    this._template = source;
    const variant: CodeVariant = {
      id: `v0-${Date.now()}`,
      source,
      generation: 0,
      fitness: 0,
      parentId: null,
    };
    this._variants.set(variant.id, variant);
    return variant;
  }

  generate(parentId: string): CodeVariant | null {
    const parent = this._variants.get(parentId);
    if (!parent) return null;
    this._generation++;
    const mutated = this._mutate(parent.source);
    const variant: CodeVariant = {
      id: `v${this._generation}-${Date.now()}`,
      source: mutated,
      generation: this._generation,
      fitness: 0,
      parentId,
    };
    this._variants.set(variant.id, variant);
    return variant;
  }

  selfReplicate(rootId: string, depth: number): CodeVariant[] {
    const chain: CodeVariant[] = [];
    let current = this._variants.get(rootId);
    for (let i = 0; i < depth && current; i++) {
      const child = this.generate(current.id);
      if (!child) break;
      chain.push(child);
      current = child;
    }
    return chain;
  }

  evaluate(variantId: string, fitness: number): void {
    const v = this._variants.get(variantId);
    if (v) v.fitness = fitness;
  }

  select(): CodeVariant | null {
    const selected = this._rouletteWheelSelect();
    if (selected) this._template = selected.source;
    return selected;
  }

  setMutationRate(rate: number): void {
    this._mutation.rate = Math.max(0, Math.min(1, rate));
  }

  get generation(): number {
    return this._generation;
  }

  getVariants(): CodeVariant[] {
    return [...this._variants.values()];
  }

  get template(): string {
    return this._template;
  }

  get mutationProfile(): MutationProfile {
    return { ...this._mutation };
  }

  setSelectionPressure(pressure: number): void {
    this._selectionPressure = Math.max(0, Math.min(1, pressure));
  }

  evolve(populationSize: number, generations: number): CodeVariant[] {
    const elite: CodeVariant[] = [];
    for (let g = 0; g < generations; g++) {
      const best = this.select();
      if (best) elite.push(best);
      const survivors = this._tournamentSelect(Math.ceil(populationSize * 0.3));
      for (let i = 0; i < populationSize; i++) {
        const parent = survivors[Math.floor(Math.random() * survivors.length)];
        if (parent) this.generate(parent.id);
      }
    }
    return elite;
  }

  crossover(idA: string, idB: string): CodeVariant | null {
    const a = this._variants.get(idA);
    const b = this._variants.get(idB);
    if (!a || !b) return null;
    this._generation++;
    const childSource = this._singlePointCrossover(a.source, b.source);
    const child: CodeVariant = {
      id: `v${this._generation}-${Date.now()}`,
      source: childSource,
      generation: this._generation,
      fitness: 0,
      parentId: `${idA}|${idB}`,
    };
    this._variants.set(child.id, child);
    return child;
  }

  private _initGrammar(): void {
    this._grammar = [
      { symbol: 'EXPR', expansions: ['IDENT', 'LITERAL', 'BINOP', 'CALL'] },
      { symbol: 'BINOP', expansions: ['+', '-', '*', '/', '===', '!==', '&&', '||'] },
      { symbol: 'IDENT', expansions: ['x', 'y', 'z', 'result', 'temp', 'value'] },
      { symbol: 'LITERAL', expansions: ['0', '1', '42', 'true', 'false', 'null'] },
    ];
  }

  private _mutate(source: string): string {
    const chars = source.split('');
    const rate = this._mutation.rate;
    const tokens = this._tokenize(source);
    const mutatedTokens: string[] = [];
    for (const token of tokens) {
      if (Math.random() < rate * 0.3) {
        mutatedTokens.push(this._grammarMutate(token));
        this._mutation.insertions++;
      } else if (Math.random() < rate * 0.1) {
        this._mutation.deletions++;
      } else {
        mutatedTokens.push(token);
      }
    }
    return this._tokensToString(mutatedTokens);
  }

  private _tokenize(source: string): string[] {
    const tokens: string[] = [];
    let current = '';
    for (let i = 0; i < source.length; i++) {
      const c = source[i];
      if (/\s/.test(c)) {
        if (current) { tokens.push(current); current = ''; }
        tokens.push(c);
      } else if (/[{}()\[\];,.]/.test(c)) {
        if (current) { tokens.push(current); current = ''; }
        tokens.push(c);
      } else {
        current += c;
      }
    }
    if (current) tokens.push(current);
    return tokens;
  }

  private _tokensToString(tokens: string[]): string {
    return tokens.join('');
  }

  private _grammarMutate(token: string): string {
    for (const rule of this._grammar) {
      if (rule.expansions.includes(token)) {
        return rule.expansions[Math.floor(Math.random() * rule.expansions.length)];
      }
    }
    return token;
  }

  private _rouletteWheelSelect(): CodeVariant | null {
    const variants = [...this._variants.values()];
    if (variants.length === 0) return null;
    const minFitness = Math.min(...variants.map(v => v.fitness));
    const offset = minFitness < 0 ? -minFitness + 0.01 : 0;
    const totalFitness = variants.reduce((sum, v) => sum + v.fitness + offset, 0);
    if (totalFitness === 0) return variants[Math.floor(Math.random() * variants.length)];
    const scaled = variants.map(v => ({
      variant: v,
      probability: Math.pow((v.fitness + offset) / totalFitness, 1 / (1 - this._selectionPressure + 0.01)),
    }));
    const scaledTotal = scaled.reduce((sum, s) => sum + s.probability, 0);
    let pick = Math.random() * scaledTotal;
    for (const s of scaled) {
      pick -= s.probability;
      if (pick <= 0) return s.variant;
    }
    return scaled[scaled.length - 1].variant;
  }

  private _tournamentSelect(count: number): CodeVariant[] {
    const variants = [...this._variants.values()];
    const winners: CodeVariant[] = [];
    const tournamentSize = Math.min(3, variants.length);
    for (let i = 0; i < count && variants.length > 0; i++) {
      const tournament: CodeVariant[] = [];
      const shuffled = [...variants].sort(() => Math.random() - 0.5);
      for (let j = 0; j < tournamentSize && j < shuffled.length; j++) {
        tournament.push(shuffled[j]);
      }
      tournament.sort((a, b) => b.fitness - a.fitness);
      if (tournament.length > 0) {
        winners.push(tournament[0]);
      }
    }
    return winners;
  }

  private _singlePointCrossover(a: string, b: string): string {
    const len = Math.min(a.length, b.length);
    const point = Math.floor(Math.random() * len);
    return a.slice(0, point) + b.slice(point);
  }
}

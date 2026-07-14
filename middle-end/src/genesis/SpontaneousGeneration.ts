export interface ScrapItem {
  id: string;
  kind: 'comment' | 'deadVariable' | 'unusedFragment';
  raw: string;
  source: string;
}

export interface GeneratedCode {
  id: string;
  body: string;
  runnable: boolean;
  sources: string[];
  generatedAt: number;
  fitness: number;
  depth: number;
  entropy: number;
}

export class SpontaneousGeneration {
  private _scrap: ScrapItem[] = [];
  private _generated: GeneratedCode[] = [];
  private _compiler: ((code: string) => boolean) | null = null;
  private _transitions: Map<string, Map<string, number>> = new Map();
  private _population: GeneratedCode[] = [];
  private _mutationRate: number = 0.3;
  private _maxDepth: number = 8;

  get scrapCount(): number { return this._scrap.length; }
  get generatedCount(): number { return this._generated.length; }
  get runnableCount(): number { return this._generated.filter(c => c.runnable).length; }
  get populationSize(): number { return this._population.length; }
  get maxDepth(): number { return this._maxDepth; }

  gather(item: ScrapItem): void {
    this._scrap.push(item);
    const tokens = item.raw.split(/\s+/).filter(t => t.length > 0);
    for (let i = 0; i < tokens.length - 1; i++) {
      const c = tokens[i], n = tokens[i + 1];
      if (!this._transitions.has(c)) this._transitions.set(c, new Map());
      const row = this._transitions.get(c)!;
      row.set(n, (row.get(n) ?? 0) + 1);
    }
  }

  combine(count: number = 5): GeneratedCode {
    const seed = this._weightedPick();
    const body = this._markovGenerate(seed, count);
    const { balanced, depth, entropy } = this._analyzeAndScore(body);
    const code: GeneratedCode = {
      id: `gen-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      body, runnable: false, sources: this._extractSources(body),
      generatedAt: Date.now(), fitness: this._computeFitness(body, balanced, depth, entropy), depth, entropy,
    };
    this._generated.push(code);
    this._population.push(code);
    if (this._population.length > 50) this._population.shift();
    return code;
  }

  attemptCompile(codeId: string): boolean {
    const code = this._generated.find(c => c.id === codeId);
    if (!code || !this._compiler) return false;
    code.runnable = this._compiler(code.body);
    if (code.runnable) code.fitness = Math.min(1, code.fitness + 0.4);
    return code.runnable;
  }

  validate(codeId: string): boolean {
    const code = this._generated.find(c => c.id === codeId);
    if (!code) return false;
    const { balanced } = this._analyzeAndScore(code.body);
    code.runnable = balanced;
    return balanced;
  }

  salvage(codeId: string): GeneratedCode | null {
    const code = this._generated.find(c => c.id === codeId);
    if (!code) return null;
    const body = code.body.split('\n').filter(l => {
      const t = l.trim();
      return !t.includes('TODO') && !t.includes('FIXME') && t.length > 0;
    }).join('\n');
    const { balanced, depth, entropy } = this._analyzeAndScore(body);
    const salvaged: GeneratedCode = {
      id: `salvage-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      body, runnable: false, sources: [...code.sources],
      generatedAt: Date.now(), fitness: this._computeFitness(body, balanced, depth, entropy), depth, entropy,
    };
    this._generated.push(salvaged);
    return salvaged;
  }

  evolveGenerations(generations: number = 3): GeneratedCode[] {
    for (let g = 0; g < generations; g++) {
      this._population.sort((a, b) => b.fitness - a.fitness);
      const top = this._population.slice(0, Math.floor(this._population.length / 2));
      const offspring: GeneratedCode[] = [];
      for (let i = 0; i < top.length - 1; i += 2) {
        const child = this._crossover(top[i], top[i + 1]);
        if (Math.random() < this._mutationRate) this._mutate(child);
        offspring.push(child);
      }
      this._population = [...top, ...offspring].slice(0, 50);
    }
    return this._population.sort((a, b) => b.fitness - a.fitness);
  }

  setCompiler(fn: (code: string) => boolean): void { this._compiler = fn; }
  setMutationRate(rate: number): void { this._mutationRate = Math.max(0, Math.min(1, rate)); }
  setMaxDepth(depth: number): void { this._maxDepth = Math.max(1, depth); }
  getGenerated(): GeneratedCode[] { return [...this._generated]; }
  getTopFittest(n: number = 5): GeneratedCode[] {
    return [...this._generated].sort((a, b) => b.fitness - a.fitness).slice(0, n);
  }

  private _computeEntropy(s: string): number {
    const freq = new Map<string, number>();
    for (const ch of s) freq.set(ch, (freq.get(ch) ?? 0) + 1);
    let entropy = 0, len = s.length || 1;
    for (const count of freq.values()) { const p = count / len; entropy -= p * Math.log2(p); }
    return entropy;
  }

  private _weightedPick(): ScrapItem {
    const entropies = this._scrap.map(s => this._computeEntropy(s.raw) + 0.1);
    const total = entropies.reduce((s, e) => s + e, 0);
    let r = Math.random() * total;
    for (let i = 0; i < this._scrap.length; i++) { r -= entropies[i]; if (r <= 0) return this._scrap[i]; }
    return this._scrap[this._scrap.length - 1];
  }

  private _markovGenerate(seed: ScrapItem, count: number): string {
    const parts: string[] = [seed.raw];
    let tok = seed.raw.split(/\s+/).filter(t => t.length > 0).pop() ?? '';
    for (let i = 1; i < count; i++) {
      const row = this._transitions.get(tok);
      let next = '';
      if (row && row.size > 0) {
        const total = [...row.values()].reduce((s, v) => s + v, 0);
        let r = Math.random() * total;
        for (const [token, weight] of row) { r -= weight; if (r <= 0) { next = token; break; } }
      }
      const scrap = this._scrap.find(s => s.raw.includes(next)) ?? this._weightedPick();
      parts.push(scrap.raw);
      tok = scrap.raw.split(/\s+/).filter(t => t.length > 0).pop() ?? '';
    }
    return parts.join('\n');
  }

  private _analyzeAndScore(code: string): { balanced: boolean; depth: number; entropy: number } {
    const stack: string[] = [];
    const pairs: Record<string, string> = { ')': '(', ']': '[', '}': '{' };
    let depth = 0, max = 0, balanced = true;
    for (const ch of code) {
      if (ch === '(' || ch === '[' || ch === '{') {
        stack.push(ch); depth++; max = Math.max(max, depth);
        if (depth > this._maxDepth) { balanced = false; break; }
      } else if (ch === ')' || ch === ']' || ch === '}') {
        if (stack.pop() !== pairs[ch]) { balanced = false; break; }
        depth--;
      }
    }
    return { balanced: balanced && stack.length === 0, depth: max, entropy: this._computeEntropy(code) };
  }

  private _computeFitness(body: string, balanced: boolean, depth: number, entropy: number): number {
    let score = balanced ? 0.4 : 0;
    score += Math.min(1, body.length / 500) * 0.25;
    score += depth <= this._maxDepth ? 0.2 : 0;
    score += Math.min(1, entropy / 4) * 0.15;
    return Math.min(1, Math.max(0, score));
  }

  private _extractSources(body: string): string[] {
    const sources: string[] = [];
    for (const item of this._scrap) { if (body.includes(item.raw.slice(0, 20))) sources.push(item.source); }
    return [...new Set(sources)];
  }

  private _crossover(a: GeneratedCode, b: GeneratedCode): GeneratedCode {
    const la = a.body.split('\n'), lb = b.body.split('\n');
    const point = Math.floor(Math.random() * Math.min(la.length, lb.length));
    const body = [...la.slice(0, point), ...lb.slice(point)].join('\n');
    const { balanced, depth, entropy } = this._analyzeAndScore(body);
    return {
      id: `cross-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      body, runnable: false, sources: [...new Set([...a.sources, ...b.sources])],
      generatedAt: Date.now(), fitness: this._computeFitness(body, balanced, depth, entropy), depth, entropy,
    };
  }

  private _mutate(code: GeneratedCode): void {
    const lines = code.body.split('\n');
    if (lines.length < 2) return;
    lines[Math.floor(Math.random() * lines.length)] = this._weightedPick().raw;
    code.body = lines.join('\n');
    const { balanced, depth, entropy } = this._analyzeAndScore(code.body);
    code.depth = depth; code.entropy = entropy;
    code.fitness = this._computeFitness(code.body, balanced, depth, entropy);
  }
}
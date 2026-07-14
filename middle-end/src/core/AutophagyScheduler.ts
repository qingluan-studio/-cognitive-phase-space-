export interface ASTFragment {
  id: string;
  type: 'expression' | 'statement' | 'declaration' | 'comment' | 'whitespace';
  content: string;
  originalFile: string;
  lineNumber: number;
  metadata: Record<string, unknown>;
}

export interface DeadCodeReport {
  file: string;
  lines: number[];
  severity: 'critical' | 'warning' | 'info';
  decayScore: number;
}

export interface RecombinedModule {
  id: string;
  fragments: ASTFragment[];
  sourceCode: string;
  timestamp: number;
}

interface Individual {
  order: number[];
  fitness: number;
}

export class AutophagyScheduler {
  private _deadCodeReports: DeadCodeReport[] = [];
  private _fragments: ASTFragment[] = [];
  private _recombinedModules: Map<string, RecombinedModule> = new Map();
  private _scanInterval: ReturnType<typeof setInterval> | null = null;
  private _populationSize = 20;
  private _generations = 30;
  private _mutationRate = 0.1;

  scanForDeadCode(files: string[]): DeadCodeReport[] {
    const reports: DeadCodeReport[] = [];
    for (const file of files) {
      const decayScore = this._calcDecayScore(file);
      const severity = decayScore > 0.7 ? 'critical' : decayScore > 0.4 ? 'warning' : 'info';
      const lines = this._genDeadLines(file, decayScore);
      const report: DeadCodeReport = { file, lines, severity, decayScore };
      reports.push(report);
      if (severity !== 'info') {
        this._deadCodeReports.push(report);
        this._extractFragments(file, lines, decayScore);
      }
    }
    return reports;
  }

  extractASTFragments(report: DeadCodeReport): ASTFragment[] {
    const types: ASTFragment['type'][] = ['expression', 'statement', 'declaration', 'comment', 'whitespace'];
    const fragments: ASTFragment[] = report.lines.map(line => ({
      id: `${report.file}-${line}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: types[line % types.length],
      content: `// Extracted from ${report.file}:${line}`,
      originalFile: report.file,
      lineNumber: line,
      metadata: { decayScore: report.decayScore },
    }));
    this._fragments.push(...fragments);
    return fragments;
  }

  recombineFragments(moduleId: string, fragmentIds: string[]): RecombinedModule {
    const fragments = fragmentIds
      .map(id => this._fragments.find(f => f.id === id))
      .filter((f): f is ASTFragment => !!f);

    if (fragments.length <= 1) {
      const sourceCode = fragments.map(f => f.content).join('\n');
      const module: RecombinedModule = { id: moduleId, fragments, sourceCode, timestamp: Date.now() };
      this._recombinedModules.set(moduleId, module);
      this._deleteConsumedFragments(fragmentIds);
      return module;
    }

    const bestOrder = this._geneticReorder(fragments);
    const orderedFragments = bestOrder.map(i => fragments[i]);
    const sourceCode = orderedFragments.map(f => f.content).join('\n');
    const module: RecombinedModule = { id: moduleId, fragments: orderedFragments, sourceCode, timestamp: Date.now() };
    this._recombinedModules.set(moduleId, module);
    this._deleteConsumedFragments(fragmentIds);
    return module;
  }

  startAutophagyCycle(intervalMs: number = 60000): void {
    if (this._scanInterval) return;
    this._scanInterval = setInterval(() => this._performAutophagy(), intervalMs);
  }

  stopAutophagyCycle(): void {
    if (this._scanInterval) { clearInterval(this._scanInterval); this._scanInterval = null; }
  }

  getRecombinedModule(id: string): RecombinedModule | undefined { return this._recombinedModules.get(id); }

  private _stringHash(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  private _calcDecayScore(file: string): number {
    const freq = new Map<string, number>();
    for (const ch of file) freq.set(ch, (freq.get(ch) || 0) + 1);
    let entropy = 0;
    for (const count of freq.values()) {
      const p = count / file.length;
      if (p > 0) entropy -= p * Math.log2(p);
    }
    const maxEnt = Math.log2(Math.min(freq.size, file.length) || 1);
    const pathEntropy = maxEnt > 0 ? entropy / maxEnt : 0;
    const base = (this._stringHash(file) % 1000) / 1000 * 0.6;
    return Math.min(0.95, Math.max(0.05, base + pathEntropy * 0.3));
  }
  private _genDeadLines(file: string, decayScore: number): number[] {
    const lines: number[] = [];
    const baseCount = Math.floor(decayScore * 25) + 1;
    let rng = this._stringHash(file);
    for (let i = 0; i < baseCount; i++) {
      rng = (rng * 1103515245 + 12345) & 0x7fffffff;
      lines.push((rng % 100) + 1);
    }
    return Array.from(new Set(lines)).sort((a, b) => a - b);
  }

  private _extractFragments(file: string, lines: number[], decayScore: number): void {
    for (const line of lines) this._fragments.push({
      id: `${file}-${line}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: 'statement', content: '', originalFile: file, lineNumber: line, metadata: { decayScore },
    });
  }

  private _deleteConsumedFragments(ids: string[]): void {
    const idSet = new Set(ids);
    this._fragments = this._fragments.filter(f => !idSet.has(f.id));
  }

  private _levenshteinDist(a: string, b: string): number {
    const m = a.length, n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;
    let prev = new Array(n + 1);
    let curr = new Array(n + 1);
    for (let j = 0; j <= n; j++) prev[j] = j;
    for (let i = 1; i <= m; i++) {
      curr[0] = i;
      for (let j = 1; j <= n; j++) {
        curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      [prev, curr] = [curr, prev];
    }
    return prev[n];
  }

  private _levenshteinSim(a: string, b: string): number {
    const dist = this._levenshteinDist(a, b);
    const maxLen = Math.max(a.length, b.length);
    return maxLen === 0 ? 1 : 1 - dist / maxLen;
  }

  private _fitness(order: number[], fragments: ASTFragment[]): number {
    let score = 0;
    for (let i = 0; i < order.length - 1; i++) {
      const a = fragments[order[i]], b = fragments[order[i + 1]];
      const sim = this._levenshteinSim(a.content, b.content);
      score += sim * 0.5 + (a.type === b.type ? 0.3 : 0) + (a.originalFile === b.originalFile ? 0.2 : 0);
    }
    return score;
  }

  private _shuffle(n: number): number[] {
    const arr = Array.from({ length: n }, (_, i) => i);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  private _tournament(pop: Individual[]): Individual {
    let best = pop[Math.floor(Math.random() * pop.length)];
    for (let i = 0; i < 2; i++) {
      const c = pop[Math.floor(Math.random() * pop.length)];
      if (c.fitness > best.fitness) best = c;
    }
    return best;
  }
  private _crossover(a: number[], b: number[]): number[] {
    const n = a.length;
    const s = Math.floor(Math.random() * n);
    const e = s + Math.floor(Math.random() * (n - s));
    const child: number[] = new Array(n).fill(-1);
    const used = new Set<number>();
    for (let i = s; i <= e; i++) { child[i] = a[i]; used.add(a[i]); }
    let bi = 0;
    for (let i = 0; i < n; i++) {
      if (child[i] === -1) {
        while (used.has(b[bi])) bi++;
        child[i] = b[bi++];
        used.add(child[i]);
      }
    }
    return child;
  }

  private _mutate(order: number[]): void {
    const i = Math.floor(Math.random() * order.length);
    const j = Math.floor(Math.random() * order.length);
    [order[i], order[j]] = [order[j], order[i]];
  }

  private _geneticReorder(fragments: ASTFragment[]): number[] {
    const n = fragments.length;
    const pop: Individual[] = [];
    for (let p = 0; p < this._populationSize; p++) {
      const order = this._shuffle(n);
      pop.push({ order, fitness: this._fitness(order, fragments) });
    }
    for (let g = 0; g < this._generations; g++) {
      pop.sort((a, b) => b.fitness - a.fitness);
      const elite = pop.slice(0, Math.floor(this._populationSize * 0.3));
      const off: Individual[] = [...elite];
      while (off.length < this._populationSize) {
        const pa = this._tournament(pop);
        const pb = this._tournament(pop);
        const ch = this._crossover(pa.order, pb.order);
        if (Math.random() < this._mutationRate) this._mutate(ch);
        off.push({ order: ch, fitness: this._fitness(ch, fragments) });
      }
      pop.splice(0, pop.length, ...off);
    }
    pop.sort((a, b) => b.fitness - a.fitness);
    return pop[0].order;
  }

  private _performAutophagy(): void {
    if (this._deadCodeReports.length > 0) this.extractASTFragments(this._deadCodeReports.shift()!);
  }

  get deadCodeReportCount(): number { return this._deadCodeReports.length; }
  get fragmentCount(): number { return this._fragments.length; }
  get recombinedModuleCount(): number { return this._recombinedModules.size; }
}

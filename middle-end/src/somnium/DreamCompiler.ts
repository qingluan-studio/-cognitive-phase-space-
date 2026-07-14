export interface DayResidue {
  id: string;
  content: string;
  emotionalCharge: number;
  collectedAt: number;
  tokens: string[];
}

export interface DreamCode {
  id: string;
  source: string;
  body: string;
  executable: boolean;
  surrealism: number;
  compiledAt: number;
  activationMap: Record<string, number>;
  condensationScore: number;
}

export class DreamCompiler {
  private _residue: DayResidue[] = [];
  private _compiled: DreamCode[] = [];
  private _surrealismTarget: number = 0.5;
  private _semanticGraph: Map<string, Set<string>> = new Map();
  private _activationSpread: number = 0.35;
  private _decayFactor: number = 0.8;

  ingestResidue(content: string, emotionalCharge: number): DayResidue {
    const tokens = this._tokenize(content);
    const r: DayResidue = {
      id: `residue-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      content,
      emotionalCharge,
      collectedAt: Date.now(),
      tokens,
    };
    this._residue.push(r);
    this._updateSemanticGraph(tokens);
    return r;
  }

  compile(): DreamCode {
    const activations = this._diffuseActivation();
    const fragments = this._synthesizeFragments(activations);
    const body = this._condense(fragments, activations);
    const surrealism = this._computeSurrealism(activations);
    const condensationScore = this._computeCondensation(fragments.length, body.length);
    const code: DreamCode = {
      id: `dream-${Date.now()}`,
      source: fragments.map(f => f.replace(/^\/\/\s*/, '')).join(' | '),
      body,
      executable: surrealism >= this._surrealismTarget,
      surrealism,
      compiledAt: Date.now(),
      activationMap: Object.fromEntries(activations),
      condensationScore,
    };
    this._compiled.push(code);
    return code;
  }

  execute(dreamId: string): { ran: boolean; output: string; activationEnergy: number } {
    const code = this._compiled.find(c => c.id === dreamId);
    if (!code || !code.executable) return { ran: false, output: '', activationEnergy: 0 };
    const lines = code.body.split('\n').filter(Boolean);
    const output = lines.map(l => l.replace(/^\/\/\s*/, '')).join(' ');
    const energy = Object.values(code.activationMap).reduce((s, v) => s + v, 0);
    return { ran: true, output, activationEnergy: energy };
  }

  validate(dreamId: string): boolean {
    const code = this._compiled.find(c => c.id === dreamId);
    if (!code) return false;
    const activations = new Map(Object.entries(code.activationMap));
    const activeNodes = [...activations.entries()].filter(([, v]) => v > 0.2).map(([k]) => k);
    let connected = 0, total = 0;
    for (let i = 0; i < activeNodes.length; i++)
      for (let j = i + 1; j < activeNodes.length; j++) {
        total++;
        const ni = this._semanticGraph.get(activeNodes[i]);
        if (ni && ni.has(activeNodes[j])) connected++;
      }
    const coherence = total === 0 ? 0 : connected / total;
    code.executable = code.surrealism >= this._surrealismTarget && coherence > 0.3;
    return code.executable;
  }

  purge(): number {
    const n = this._residue.length;
    this._residue = [];
    this._semanticGraph.clear();
    return n;
  }

  getDreams(): DreamCode[] { return [...this._compiled]; }
  get residueCount(): number { return this._residue.length; }
  get semanticNodeCount(): number { return this._semanticGraph.size; }

  setSurrealismTarget(target: number): void {
    this._surrealismTarget = Math.max(0, Math.min(1, target));
  }

  private _tokenize(content: string): string[] {
    const words = content.toLowerCase().split(/[^a-z\u4e00-\u9fa5]+/).filter(Boolean);
    return [...new Set(words)].slice(0, 20);
  }

  private _updateSemanticGraph(tokens: string[]): void {
    for (const token of tokens) {
      if (!this._semanticGraph.has(token)) this._semanticGraph.set(token, new Set());
      const neighbors = this._semanticGraph.get(token)!;
      for (const other of tokens) if (other !== token) neighbors.add(other);
    }
  }

  private _diffuseActivation(): Map<string, number> {
    const activations = new Map<string, number>();
    for (const r of this._residue)
      for (const token of r.tokens)
        activations.set(token, Math.min(1, (activations.get(token) ?? 0) + r.emotionalCharge * 0.5));
    for (let pass = 0; pass < 3; pass++) {
      const next = new Map(activations);
      for (const [node, act] of activations) {
        const neighbors = this._semanticGraph.get(node);
        if (!neighbors) continue;
        const spread = act * this._activationSpread / Math.max(1, neighbors.size);
        for (const nb of neighbors) next.set(nb, Math.min(1, (next.get(nb) ?? 0) + spread));
      }
      for (const [k, v] of next) activations.set(k, v * this._decayFactor);
    }
    return activations;
  }

  private _synthesizeFragments(activations: Map<string, number>): string[] {
    const sorted = [...activations.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
    const fragments: string[] = [];
    for (let i = 0; i < sorted.length; i++) {
      const [word, act] = sorted[i];
      const nextWord = sorted[(i + 1) % sorted.length][0];
      const bridge = this._findBridge(word, nextWord);
      const intensity = Math.round(act * 100);
      fragments.push(bridge
        ? `// ${word} ~${bridge}~ ${nextWord} [${intensity}%]`
        : `// ${word} [${intensity}%]`);
    }
    return fragments;
  }

  private _findBridge(a: string, b: string): string | null {
    const na = this._semanticGraph.get(a);
    const nb = this._semanticGraph.get(b);
    if (!na || !nb) return null;
    let best: string | null = null, bestScore = 0;
    for (const shared of na) {
      if (nb.has(shared)) {
        const score = (na.size + nb.size) / 2;
        if (score > bestScore) { bestScore = score; best = shared; }
      }
    }
    return best;
  }

  private _condense(fragments: string[], activations: Map<string, number>): string {
    const totalAct = [...activations.values()].reduce((s, v) => s + v, 0);
    const density = Math.min(1, totalAct / Math.max(1, activations.size));
    if (density > 0.6) return `// CONDENSED: ${fragments.join(' + ')}`;
    return fragments.join('\n');
  }

  private _computeSurrealism(activations: Map<string, number>): number {
    if (activations.size === 0) return 0;
    const values = [...activations.values()];
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
    const dispersion = Math.sqrt(variance) / Math.max(0.01, mean);
    const nodes = this._semanticGraph.size;
    let totalEdges = 0;
    for (const neighbors of this._semanticGraph.values()) totalEdges += neighbors.size;
    const connectivity = nodes === 0 ? 0 : Math.min(1, (totalEdges / nodes) / nodes);
    return Math.min(1, dispersion * 0.5 + connectivity * 0.5);
  }

  private _computeCondensation(fragmentCount: number, bodyLength: number): number {
    if (fragmentCount === 0) return 0;
    return Math.max(0, Math.min(1, 1 - bodyLength / Math.max(1, fragmentCount * 30)));
  }
}

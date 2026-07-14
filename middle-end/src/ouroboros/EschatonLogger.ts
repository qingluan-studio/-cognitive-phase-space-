export interface CausalLink {
  id: string;
  cause: string;
  effect: string;
  weight: number;
  timestamp: number;
  terminal: boolean;
  entropy: number;
  depth: number;
}

export interface EschatonReplay {
  chain: CausalLink[];
  rootCause: string | null;
  totalWeight: number;
  criticalPath: string[];
  entropy: number;
}

export class EschatonLogger {
  private _causalChain: CausalLink[] = [];
  private _terminated: boolean = false;
  private _terminationCause: string | null = null;
  private _terminalThreshold: number = 0.8;
  private _causalGraph: Map<string, CausalLink[]> = new Map();
  private _effectCount: Map<string, number> = new Map();
  private _maxDepth: number = 0;

  get chainLength(): number { return this._causalChain.length; }
  get isTerminated(): boolean { return this._terminated; }
  get terminalThreshold(): number { return this._terminalThreshold; }
  get maxDepth(): number { return this._maxDepth; }

  recordCause(cause: string, effect: string, weight: number, terminal: boolean): CausalLink | null {
    if (this._terminated) return null;
    if (!terminal && weight < this._terminalThreshold) return null;
    const depth = this._computeCauseDepth(cause);
    const entropy = this._computeLinkEntropy(cause, effect, weight);
    const link: CausalLink = {
      id: `cause-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      cause, effect, weight, timestamp: Date.now(), terminal, entropy, depth,
    };
    this._causalChain.push(link);
    this._maxDepth = Math.max(this._maxDepth, depth);
    this._addToGraph(link);
    return link;
  }

  terminate(cause: string): void {
    this._terminated = true;
    this._terminationCause = cause;
    this.recordCause(cause, 'SYSTEM_TERMINATION', 1.0, true);
  }

  replay(): EschatonReplay {
    const chain = [...this._causalChain].sort((a, b) => a.timestamp - b.timestamp);
    let rootCause: string | null = this._terminationCause;
    if (!rootCause && chain.length > 0) rootCause = this._findRootCause();
    const totalWeight = chain.reduce((s, l) => s + l.weight, 0);
    const criticalPath = this._findCriticalPath();
    const avgEntropy = chain.length > 0
      ? chain.reduce((s, l) => s + l.entropy, 0) / chain.length : 0;
    return { chain, rootCause, totalWeight, criticalPath, entropy: avgEntropy };
  }

  getCause(index: number): CausalLink | null {
    return this._causalChain[index] ?? null;
  }

  isTerminated(): boolean { return this._terminated; }
  setTerminalThreshold(threshold: number): void {
    this._terminalThreshold = Math.max(0, Math.min(1, threshold));
  }
  resurrect(): void {
    this._terminated = false;
    this._terminationCause = null;
  }
  getChain(): CausalLink[] { return [...this._causalChain]; }
  findRootCause(): string | null { return this._findRootCause(); }
  getCriticalPath(): string[] { return this._findCriticalPath(); }

  getCauseRankings(): { cause: string; score: number }[] {
    const scores = new Map<string, number>();
    for (const link of this._causalChain) {
      const cur = scores.get(link.cause) ?? 0;
      const ec = this._effectCount.get(link.effect) ?? 0;
      scores.set(link.cause, cur + link.weight * (1 + ec * 0.1));
    }
    return [...scores.entries()]
      .map(([cause, score]) => ({ cause, score }))
      .sort((a, b) => b.score - a.score);
  }

  traceBack(effect: string): CausalLink[] {
    const path: CausalLink[] = [];
    const visited = new Set<string>();
    let current = effect;
    while (true) {
      const incoming = this._findIncoming(current);
      if (incoming.length === 0 || visited.has(current)) break;
      visited.add(current);
      incoming.sort((a, b) => b.weight - a.weight);
      path.unshift(incoming[0]);
      current = incoming[0].cause;
    }
    return path;
  }

  computeCausalDensity(): number {
    if (this._causalChain.length === 0) return 0;
    const causes = new Set(this._causalChain.map(l => l.cause));
    const effects = new Set(this._causalChain.map(l => l.effect));
    const nodes = new Set([...causes, ...effects]);
    return this._causalChain.length / Math.max(1, nodes.size * (nodes.size - 1));
  }

  private _findRootCause(): string | null {
    if (this._causalChain.length === 0) return null;
    const inDeg = new Map<string, number>();
    const outDeg = new Map<string, number>();
    for (const link of this._causalChain) {
      outDeg.set(link.cause, (outDeg.get(link.cause) ?? 0) + 1);
      inDeg.set(link.effect, (inDeg.get(link.effect) ?? 0) + 1);
    }
    let best: string | null = null;
    let bestScore = -Infinity;
    for (const link of this._causalChain) {
      const out = outDeg.get(link.cause) ?? 0;
      const inD = inDeg.get(link.cause) ?? 0;
      const score = out - inD + link.weight * 2;
      if (score > bestScore) { bestScore = score; best = link.cause; }
    }
    return best;
  }

  private _findCriticalPath(): string[] {
    if (this._causalChain.length === 0) return [];
    const dist = new Map<string, number>();
    const prev = new Map<string, string | null>();
    let end = '', maxD = -Infinity;
    for (const link of this._causalChain) {
      const cd = dist.get(link.cause) ?? 0;
      const nd = cd + link.weight;
      const ed = dist.get(link.effect) ?? 0;
      if (nd > ed) {
        dist.set(link.effect, nd);
        prev.set(link.effect, link.cause);
        if (nd > maxD) { maxD = nd; end = link.effect; }
      }
    }
    const path: string[] = [];
    let cur: string | null = end;
    while (cur) { path.unshift(cur); cur = prev.get(cur) ?? null; }
    return path;
  }

  private _addToGraph(link: CausalLink): void {
    if (!this._causalGraph.has(link.cause)) this._causalGraph.set(link.cause, []);
    this._causalGraph.get(link.cause)!.push(link);
    this._effectCount.set(link.effect, (this._effectCount.get(link.effect) ?? 0) + 1);
  }

  private _findIncoming(effect: string): CausalLink[] {
    const result: CausalLink[] = [];
    for (const links of this._causalGraph.values()) {
      for (const link of links) if (link.effect === effect) result.push(link);
    }
    return result;
  }

  private _computeCauseDepth(cause: string): number {
    let max = 0;
    for (const link of this._findIncoming(cause)) {
      max = Math.max(max, link.depth + 1);
    }
    return max === 0 ? 1 : max;
  }

  private _computeLinkEntropy(cause: string, effect: string, weight: number): number {
    const p1 = weight, p2 = 1 - weight;
    let ent = 0;
    if (p1 > 0) ent -= p1 * Math.log2(p1);
    if (p2 > 0) ent -= p2 * Math.log2(p2);
    const ratio = Math.min(cause.length, effect.length) / Math.max(cause.length, effect.length, 1);
    return ent * (0.5 + ratio * 0.5);
  }
}

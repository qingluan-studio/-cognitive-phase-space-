export interface RecursionAnchorData {
  depth: number;
  maxDepth: number;
  anchors: string[];
  triggered: boolean;
}

export class RecursionAnchor {
  private _depth: number;
  private _maxDepth: number;
  private _anchors: string[];
  private _triggered: boolean;
  private _visited: Map<string, number>;
  private _fixpointDepth: number;
  private _yCombinatorState: Array<(f: (x: number) => number) => number>;
  private _convergenceRate: number;
  private _callGraph: Map<string, Set<string>>;

  constructor(maxDepth: number = 100) {
    this._depth = 0;
    this._maxDepth = maxDepth;
    this._anchors = [];
    this._triggered = false;
    this._visited = new Map<string, number>();
    this._fixpointDepth = 0;
    this._yCombinatorState = [];
    this._convergenceRate = 1;
    this._callGraph = new Map<string, Set<string>>();
  }

  get depth(): number {
    return this._depth;
  }

  get triggered(): boolean {
    return this._triggered;
  }

  get fixpointDepth(): number {
    return this._fixpointDepth;
  }

  get convergenceRate(): number {
    return this._convergenceRate;
  }

  public enter(key: string): boolean {
    this._depth += 1;
    const visits = (this._visited.get(key) ?? 0) + 1;
    this._visited.set(key, visits);
    this._updateCallGraph(key);
    if (this._depth >= this._maxDepth || visits > 3) {
      this._triggered = true;
      this._anchors.push(`cut@${key}`);
      this._convergenceRate = 0;
      return false;
    }
    this._convergenceRate = Math.max(0, this._convergenceRate - 0.01 * this._depth);
    return true;
  }

  public leave(): void {
    if (this._depth > 0) {
      this._depth -= 1;
    }
  }

  public setMaxDepth(d: number): void {
    this._maxDepth = Math.max(1, d);
  }

  public reset(): void {
    this._depth = 0;
    this._anchors = [];
    this._triggered = false;
    this._visited.clear();
    this._fixpointDepth = 0;
    this._yCombinatorState = [];
    this._convergenceRate = 1;
    this._callGraph.clear();
  }

  public anchorsPlaced(): string[] {
    return [...this._anchors];
  }

  public report(): RecursionAnchorData {
    return {
      depth: this._depth,
      maxDepth: this._maxDepth,
      anchors: [...this._anchors],
      triggered: this._triggered,
    };
  }

  public computeFixpointIterations(f: (x: number) => number, seed: number): number {
    let x = seed;
    let prev = x + 1;
    let iterations = 0;
    while (Math.abs(x - prev) > 1e-6 && iterations < this._maxDepth) {
      prev = x;
      x = f(x);
      iterations += 1;
    }
    this._fixpointDepth = iterations;
    return iterations;
  }

  public applyYCombinator<F extends (x: number) => number>(
    recursiveFn: (self: F) => F
  ): F {
    const y = ((f: (x: any) => any) =>
      ((x: any) => f((y: F) => x(x)(y)))((x: any) => f((y: F) => x(x)(y)))) as unknown as ((f: (x: (g: F) => F) => (g: F) => F) => F);
    const wrapper = (rec: (self: F) => F) =>
      ((self: any) => ((g: F) => (rec(self(self)) as any)(g))) as unknown as (x: (g: F) => F) => (g: F) => F;
    return y(wrapper(recursiveFn));
  }

  public detectCycle(): string[] | null {
    const visited = new Map<string, number>();
    const stack = new Set<string>();
    for (const start of this._callGraph.keys()) {
      const cycle = this._dfsCycle(start, visited, stack, []);
      if (cycle) {
        return cycle;
      }
    }
    return null;
  }

  public computeDepthDistribution(): Record<number, number> {
    const dist: Record<number, number> = {};
    for (const count of this._visited.values()) {
      dist[count] = (dist[count] ?? 0) + 1;
    }
    return dist;
  }

  public estimateConvergence(): number {
    const dist = this.computeDepthDistribution();
    const total = Object.values(dist).reduce((s, v) => s + v, 0);
    if (total === 0) {
      return 1;
    }
    let entropy = 0;
    for (const count of Object.values(dist)) {
      const p = count / total;
      entropy -= p * Math.log2(p);
    }
    return Math.max(0, 1 - entropy / Math.log2(total + 1));
  }

  private _updateCallGraph(key: string): void {
    const lastAnchor = this._anchors[this._anchors.length - 1]?.replace('cut@', '') ?? '';
    if (lastAnchor) {
      const set = this._callGraph.get(lastAnchor) ?? new Set<string>();
      set.add(key);
      this._callGraph.set(lastAnchor, set);
    }
    if (!this._callGraph.has(key)) {
      this._callGraph.set(key, new Set<string>());
    }
  }

  private _dfsCycle(
    node: string,
    visited: Map<string, number>,
    stack: Set<string>,
    path: string[]
  ): string[] | null {
    if (stack.has(node)) {
      const cycleStart = path.indexOf(node);
      return path.slice(cycleStart);
    }
    if (visited.has(node)) {
      return null;
    }
    visited.set(node, 1);
    stack.add(node);
    path.push(node);
    for (const next of this._callGraph.get(node) ?? []) {
      const cycle = this._dfsCycle(next, visited, stack, path);
      if (cycle) {
        return cycle;
      }
    }
    path.pop();
    stack.delete(node);
    return null;
  }
}

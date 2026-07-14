export interface MutualRecursionLoopData {
  calls: number;
  alternations: number;
  terminated: boolean;
  lastCaller: string;
}

export class MutualRecursionLoop {
  private _calls: number;
  private _alternations: number;
  private _terminated: boolean;
  private _lastCaller: string;
  private _maxCalls: number;
  private _log: string[];
  private _callGraph: Map<string, Map<string, number>>;
  private _invariantSum: number;
  private _recursionDepth: number;
  private _phiApproximation: number;

  constructor(maxCalls: number = 1000) {
    this._calls = 0;
    this._alternations = 0;
    this._terminated = false;
    this._lastCaller = '';
    this._maxCalls = maxCalls;
    this._log = [];
    this._callGraph = new Map<string, Map<string, number>>();
    this._invariantSum = 0;
    this._recursionDepth = 0;
    this._phiApproximation = 0;
  }

  get calls(): number {
    return this._calls;
  }

  get terminated(): boolean {
    return this._terminated;
  }

  get recursionDepth(): number {
    return this._recursionDepth;
  }

  get phiApproximation(): number {
    return this._phiApproximation;
  }

  public runA(value: number): number {
    this._track('A');
    this._updateGraph('A', 'B');
    if (this._terminated) {
      return value;
    }
    if (value <= 0 || this._calls >= this._maxCalls) {
      this._terminated = true;
      this._updatePhiApproximation();
      return value;
    }
    this._invariantSum += value;
    this._recursionDepth += 1;
    const result = this.runB(value - 1);
    this._recursionDepth -= 1;
    return result;
  }

  public runB(value: number): number {
    this._track('B');
    this._updateGraph('B', 'A');
    if (this._terminated) {
      return value;
    }
    if (value <= 0 || this._calls >= this._maxCalls) {
      this._terminated = true;
      this._updatePhiApproximation();
      return value;
    }
    this._invariantSum += value;
    this._recursionDepth += 1;
    const result = this.runA(value - 2);
    this._recursionDepth -= 1;
    return result;
  }

  public setMax(c: number): void {
    this._maxCalls = Math.max(1, c);
  }

  public reset(): void {
    this._calls = 0;
    this._alternations = 0;
    this._terminated = false;
    this._lastCaller = '';
    this._log = [];
    this._callGraph.clear();
    this._invariantSum = 0;
    this._recursionDepth = 0;
    this._phiApproximation = 0;
  }

  public trace(): string[] {
    return [...this._log];
  }

  public report(): MutualRecursionLoopData {
    return {
      calls: this._calls,
      alternations: this._alternations,
      terminated: this._terminated,
      lastCaller: this._lastCaller,
    };
  }

  public computeSteadyStateDistribution(): Record<string, number> {
    const transitions: Record<string, number> = {};
    let total = 0;
    for (const [from, toMap] of this._callGraph) {
      for (const [to, count] of toMap) {
        const key = `${from}->${to}`;
        transitions[key] = (transitions[key] ?? 0) + count;
        total += count;
      }
    }
    const dist: Record<string, number> = {};
    if (total === 0) {
      dist['A'] = 0.5;
      dist['B'] = 0.5;
      return dist;
    }
    dist['A'] = ((this._callGraph.get('A')?.get('B') ?? 0) + (this._callGraph.get('B')?.get('A') ?? 0)) / total;
    dist['B'] = 1 - dist['A'];
    return dist;
  }

  public computeConvergenceRate(): number {
    if (this._calls === 0) {
      return 0;
    }
    return this._alternations / this._calls;
  }

  public detectBisimilarity(): boolean {
    const aTransitions = this._callGraph.get('A') ?? new Map<string, number>();
    const bTransitions = this._callGraph.get('B') ?? new Map<string, number>();
    const aTotal = Array.from(aTransitions.values()).reduce((s, v) => s + v, 0);
    const bTotal = Array.from(bTransitions.values()).reduce((s, v) => s + v, 0);
    if (aTotal === 0 || bTotal === 0) {
      return true;
    }
    const aToB = (aTransitions.get('B') ?? 0) / aTotal;
    const bToA = (bTransitions.get('A') ?? 0) / bTotal;
    return Math.abs(aToB - bToA) < 0.05;
  }

  public computeRecurrenceRelation(n: number): number {
    if (n <= 0) {
      return 0;
    }
    if (n === 1) {
      return 1;
    }
    return this.computeRecurrenceRelation(n - 1) + this.computeRecurrenceRelation(n - 2);
  }

  public estimateTerminationDepth(initialValue: number): number {
    let depth = 0;
    let v = initialValue;
    while (v > 0 && depth < this._maxCalls) {
      v -= 1;
      depth += 1;
      if (v > 0) {
        v -= 2;
        depth += 1;
      }
    }
    return depth;
  }

  private _track(caller: string): void {
    this._calls += 1;
    if (this._lastCaller && this._lastCaller !== caller) {
      this._alternations += 1;
    }
    this._lastCaller = caller;
    this._log.push(`${caller}#${this._calls}`);
  }

  private _updateGraph(from: string, to: string): void {
    const map = this._callGraph.get(from) ?? new Map<string, number>();
    map.set(to, (map.get(to) ?? 0) + 1);
    this._callGraph.set(from, map);
  }

  private _updatePhiApproximation(): void {
    if (this._alternations === 0) {
      this._phiApproximation = 0;
      return;
    }
    const ratio = this._calls / this._alternations;
    this._phiApproximation = (1 + Math.sqrt(1 + 4 * ratio * ratio)) / (2 * ratio);
  }
}

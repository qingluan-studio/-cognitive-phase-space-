export interface PuzzleState {
  id: string;
  complexity: number;
  attempts: number;
  opened: boolean;
}

export interface AttemptRecord {
  puzzleId: string;
  strategy: string;
  outcome: 'success' | 'failure' | 'paradox';
  attemptedAt: number;
}

export class UnsolvablePuzzleBox {
  private _puzzles: Map<string, PuzzleState> = new Map();
  private _attempts: AttemptRecord[] = [];
  private _defaultComplexity = 1.0;
  private _attemptEntropy: number[] = [];
  private _strategyMatrix: Map<string, Map<string, number>> = new Map();

  createPuzzle(id: string, complexity: number = this._defaultComplexity): PuzzleState {
    const puzzle: PuzzleState = {
      id,
      complexity,
      attempts: 0,
      opened: false,
    };
    this._puzzles.set(id, puzzle);
    return puzzle;
  }

  attempt(puzzleId: string, strategy: string): AttemptRecord {
    const puzzle = this._puzzles.get(puzzleId);
    const outcome: AttemptRecord['outcome'] =
      puzzle && puzzle.complexity >= 1.0 ? 'paradox' : puzzle && puzzle.attempts > 100 ? 'failure' : Math.random() < 0.1 ? 'success' : 'failure';
    const record: AttemptRecord = {
      puzzleId,
      strategy,
      outcome,
      attemptedAt: Date.now(),
    };
    this._attempts.push(record);
    if (this._attempts.length > 100) this._attempts.shift();
    if (puzzle) {
      puzzle.attempts++;
      if (outcome === 'success') puzzle.opened = true;
    }
    this._updateStrategyMatrix(strategy, outcome);
    this._attemptEntropy.push(this._computeOutcomeEntropy());
    if (this._attemptEntropy.length > 50) this._attemptEntropy.shift();
    return record;
  }

  public forceOpen(puzzleId: string): boolean {
    const puzzle = this._puzzles.get(puzzleId);
    if (!puzzle) return false;
    puzzle.opened = true;
    return true;
  }

  public reset(puzzleId: string): boolean {
    const puzzle = this._puzzles.get(puzzleId);
    if (!puzzle) return false;
    puzzle.attempts = 0;
    puzzle.opened = false;
    return true;
  }

  public getPuzzle(id: string): PuzzleState | null {
    return this._puzzles.get(id) ?? null;
  }

  public getAttempts(limit: number = 50): AttemptRecord[] {
    return this._attempts.slice(-limit);
  }

  public computeSuccessRate(): number {
    const total = this._attempts.length;
    if (total === 0) return 0;
    return this._attempts.filter(a => a.outcome === 'success').length / total;
  }

  public computeAttemptEntropy(): number {
    if (this._attemptEntropy.length === 0) return 0;
    const mean = this._attemptEntropy.reduce((a, b) => a + b, 0) / this._attemptEntropy.length;
    const variance = this._attemptEntropy.reduce((s, v) => s + (v - mean) ** 2, 0) / this._attemptEntropy.length;
    return 0.5 * Math.log2(2 * Math.PI * Math.E * Math.max(variance, 1e-10));
  }

  public predictOutcome(strategy: string): string {
    const map = this._strategyMatrix.get(strategy);
    if (!map || map.size === 0) return 'unknown';
    let best = '';
    let maxCount = 0;
    for (const [outcome, count] of map) {
      if (count > maxCount) {
        maxCount = count;
        best = outcome;
      }
    }
    return best;
  }

  public computePuzzleComplexitySpectrum(): number[] {
    const complexities = Array.from(this._puzzles.values()).map(p => p.complexity);
    const N = complexities.length;
    if (N === 0) return [];
    const result: number[] = new Array(N).fill(0);
    for (let k = 0; k < N; k++) {
      let real = 0;
      let imag = 0;
      for (let n = 0; n < N; n++) {
        const angle = -2 * Math.PI * k * n / N;
        real += complexities[n] * Math.cos(angle);
        imag += complexities[n] * Math.sin(angle);
      }
      result[k] = Math.sqrt(real * real + imag * imag);
    }
    return result;
  }

  private _updateStrategyMatrix(strategy: string, outcome: string): void {
    if (!this._strategyMatrix.has(strategy)) {
      this._strategyMatrix.set(strategy, new Map());
    }
    const map = this._strategyMatrix.get(strategy)!;
    map.set(outcome, (map.get(outcome) ?? 0) + 1);
  }

  private _computeOutcomeEntropy(): number {
    const outcomes = ['success', 'failure', 'paradox'];
    const counts = outcomes.map(o => this._attempts.filter(a => a.outcome === o).length);
    const total = counts.reduce((a, b) => a + b, 0);
    if (total === 0) return 0;
    let entropy = 0;
    for (const c of counts) {
      const p = c / total;
      if (p > 0) entropy -= p * Math.log2(p);
    }
    return entropy;
  }
}

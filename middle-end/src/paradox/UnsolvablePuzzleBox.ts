/**
 * 无解谜箱：装有无解问题的盒子，永不打开。
 * 维护一个无解问题集合，对每个尝试求解的操作进行记录但永不真正开启盒子。
 */

export interface UnsolvedProblem {
  id: string;
  statement: string;
  attempts: number;
  sealedAt: number;
  metadata: Record<string, unknown>;
}

export interface UnlockAttempt {
  id: string;
  problemId: string;
  approach: string;
  result: 'blocked' | 'paradox' | 'incomplete';
  attemptedAt: number;
}

export class UnsolvablePuzzleBox {
  private _problems: Map<string, UnsolvedProblem> = new Map();
  private _attempts: UnlockAttempt[] = [];
  private _sealed = true;
  private _lockStrength = 1.0;

  seal(problem: UnsolvedProblem): void {
    this._problems.set(problem.id, problem);
  }

  attempt(problemId: string, approach: string): UnlockAttempt {
    const problem = this._problems.get(problemId);
    problem && problem.attempts++;
    const result: UnlockAttempt['result'] = this._sealed
      ? 'blocked'
      : Math.random() < 0.5 ? 'paradox' : 'incomplete';
    const attempt: UnlockAttempt = {
      id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      problemId,
      approach,
      result,
      attemptedAt: Date.now(),
    };
    this._attempts.push(attempt);
    if (this._attempts.length > 200) this._attempts.shift();
    this._lockStrength = Math.min(1.0, this._lockStrength + 0.01);
    return attempt;
  }

  reinforceLock(amount: number): number {
    this._lockStrength = Math.min(1.0, this._lockStrength + amount);
    return this._lockStrength;
  }

  getStatus(): 'sealed' | 'forced-open' {
    return this._sealed ? 'sealed' : 'forced-open';
  }

  getProblem(id: string): UnsolvedProblem | null {
    return this._problems.get(id) ?? null;
  }

  getAttempts(limit: number = 50): UnlockAttempt[] {
    return this._attempts.slice(-limit);
  }

  listProblems(): UnsolvedProblem[] {
    return Array.from(this._problems.values());
  }

  peek(problemId: string): string | null {
    const problem = this._problems.get(problemId);
    if (!problem) return null;
    const previewLen = Math.min(8, Math.floor(problem.statement.length * 0.2));
    return problem.statement.slice(0, previewLen) + '…';
  }

  get problemCount(): number {
    return this._problems.size;
  }

  get lockStrength(): number {
    return this._lockStrength;
  }
}

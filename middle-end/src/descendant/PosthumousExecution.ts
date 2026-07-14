/**
 * 身后执行：死后才执行的遗命。
 * 模块在终止前留下指令，由系统在模块终止后按条件触发执行。
 */

export interface PosthumousDirective {
  id: string;
  authorId: string;
  triggerCondition: string;
  action: string;
  executed: boolean;
  createdAt: number;
}

export interface ExecutionResult {
  directiveId: string;
  outcome: string;
  success: boolean;
  executedAt: number;
}

export class PosthumousExecution {
  private _directives: Map<string, PosthumousDirective> = new Map();
  private _deceasedAuthors: Set<string> = new Set();
  private _executions: ExecutionResult[] = [];
  private _maxExecutions = 200;

  registerDirective(directive: PosthumousDirective): void {
    this._directives.set(directive.id, directive);
  }

  markDeceased(authorId: string): boolean {
    if (!this._deceasedAuthors.has(authorId)) {
      this._deceasedAuthors.add(authorId);
      return true;
    }
    return false;
  }

  tryExecute(directiveId: string, signal: string): ExecutionResult | null {
    const directive = this._directives.get(directiveId);
    if (!directive || directive.executed) return null;
    if (!this._deceasedAuthors.has(directive.authorId)) return null;
    if (!signal.includes(directive.triggerCondition)) return null;
    directive.executed = true;
    const success = Math.random() > 0.2;
    const result: ExecutionResult = {
      directiveId,
      outcome: success ? directive.action : 'execution-failed',
      success,
      executedAt: Date.now(),
    };
    this._executions.push(result);
    if (this._executions.length > this._maxExecutions) this._executions.shift();
    return result;
  }

  sweepSignals(signals: string[]): ExecutionResult[] {
    const results: ExecutionResult[] = [];
    for (const directive of this._directives.values()) {
      if (directive.executed) continue;
      if (!this._deceasedAuthors.has(directive.authorId)) continue;
      for (const signal of signals) {
        if (signal.includes(directive.triggerCondition)) {
          const r = this.tryExecute(directive.id, signal);
          if (r) results.push(r);
          break;
        }
      }
    }
    return results;
  }

  listPendingFor(authorId: string): PosthumousDirective[] {
    return Array.from(this._directives.values()).filter(
      d => d.authorId === authorId && !d.executed
    );
  }

  getDirective(id: string): PosthumousDirective | null {
    return this._directives.get(id) ?? null;
  }

  getExecutions(limit: number = 50): ExecutionResult[] {
    return this._executions.slice(-limit);
  }

  get directiveCount(): number {
    return this._directives.size;
  }
}

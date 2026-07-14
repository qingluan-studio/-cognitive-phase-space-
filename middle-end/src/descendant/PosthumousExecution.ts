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
  private _causalGraph: Map<string, Set<string>> = new Map();
  private _executionStateMachine: Map<string, number> = new Map();
  private _temporalOrder: string[] = [];

  registerDirective(directive: PosthumousDirective): void {
    this._directives.set(directive.id, directive);
    if (!this._causalGraph.has(directive.authorId)) {
      this._causalGraph.set(directive.authorId, new Set<string>());
    }
    this._causalGraph.get(directive.authorId)!.add(directive.id);
    this._executionStateMachine.set(directive.id, 0);
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
    if (!directive || directive.executed) {
      return null;
    }
    if (!this._deceasedAuthors.has(directive.authorId)) {
      return null;
    }
    if (!signal.includes(directive.triggerCondition)) {
      return null;
    }
    const deps = this._causalGraph.get(directive.authorId) ?? new Set<string>();
    for (const dep of deps) {
      if (dep !== directiveId) {
        const d = this._directives.get(dep);
        if (d && !d.executed && d.createdAt < directive.createdAt) {
          return null;
        }
      }
    }
    directive.executed = true;
    this._executionStateMachine.set(directiveId, 2);
    const success = Math.random() > 0.2;
    const result: ExecutionResult = {
      directiveId,
      outcome: success ? directive.action : 'execution-failed',
      success,
      executedAt: Date.now(),
    };
    this._executions.push(result);
    if (this._executions.length > this._maxExecutions) {
      this._executions.shift();
    }
    this._temporalOrder.push(directiveId);
    return result;
  }

  sweepSignals(signals: string[]): ExecutionResult[] {
    const results: ExecutionResult[] = [];
    const sortedDirectives = Array.from(this._directives.values()).sort(
      (a, b) => a.createdAt - b.createdAt
    );
    for (const directive of sortedDirectives) {
      if (directive.executed) {
        continue;
      }
      if (!this._deceasedAuthors.has(directive.authorId)) {
        continue;
      }
      for (const signal of signals) {
        if (signal.includes(directive.triggerCondition)) {
          const r = this.tryExecute(directive.id, signal);
          if (r) {
            results.push(r);
          }
          break;
        }
      }
    }
    return results;
  }

  listPendingFor(authorId: string): PosthumousDirective[] {
    return Array.from(this._directives.values()).filter(
      (d) => d.authorId === authorId && !d.executed
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

  get temporalOrder(): string[] {
    return [...this._temporalOrder];
  }

  computeCausalReachability(authorId: string): Set<string> {
    const reachable = new Set<string>();
    const queue: string[] = [authorId];
    reachable.add(authorId);
    while (queue.length > 0) {
      const curr = queue.shift()!;
      for (const next of this._causalGraph.get(curr) ?? []) {
        if (!reachable.has(next)) {
          reachable.add(next);
          queue.push(next);
        }
      }
    }
    return reachable;
  }

  topologicalSortDirectives(): string[] {
    const inDegree = new Map<string, number>();
    for (const id of this._directives.keys()) {
      inDegree.set(id, 0);
    }
    for (const [author, deps] of this._causalGraph) {
      const authorDirectives = Array.from(deps).filter((id) => this._directives.has(id));
      for (let i = 1; i < authorDirectives.length; i++) {
        const prev = authorDirectives[i - 1];
        const curr = authorDirectives[i];
        inDegree.set(curr, (inDegree.get(curr) ?? 0) + 1);
      }
    }
    const queue: string[] = [];
    for (const [id, degree] of inDegree) {
      if (degree === 0) {
        queue.push(id);
      }
    }
    const order: string[] = [];
    while (queue.length > 0) {
      const curr = queue.shift()!;
      order.push(curr);
      for (const [author, deps] of this._causalGraph) {
        const authorDirectives = Array.from(deps).filter((id) => this._directives.has(id));
        for (let i = 0; i < authorDirectives.length - 1; i++) {
          if (authorDirectives[i] === curr) {
            const next = authorDirectives[i + 1];
            const newDegree = (inDegree.get(next) ?? 0) - 1;
            inDegree.set(next, newDegree);
            if (newDegree === 0) {
              queue.push(next);
            }
          }
        }
      }
    }
    return order;
  }

  computeExecutionProbability(directiveId: string): number {
    const directive = this._directives.get(directiveId);
    if (!directive) {
      return 0;
    }
    if (directive.executed) {
      return 1;
    }
    if (!this._deceasedAuthors.has(directive.authorId)) {
      return 0;
    }
    const history = this._executions.filter((e) => e.success);
    const successRate = this._executions.length > 0 ? history.length / this._executions.length : 0.8;
    return successRate * 0.9;
  }
}

/**
 * 说谎者循环检测：检测自指矛盾引发的无限循环。
 * 当一个命题断言自身的否定时会形成悖论回路，本模块负责识别、终止并降级此类循环。
 */

export interface LiarStatement {
  id: string;
  text: string;
  selfReferential: boolean;
  negatesItself: boolean;
  truthValue: boolean | null;
}

export interface LoopDetectionResult {
  loopId: string;
  statements: string[];
  depth: number;
  detectedAt: number;
  severity: 'low' | 'medium' | 'high';
}

export class LiarLoopDetector {
  private _statements: Map<string, LiarStatement> = new Map();
  private _loops: LoopDetectionResult[] = [];
  private _visited: Set<string> = new Set();
  private _stack: string[] = [];
  private _maxDepth = 32;

  registerStatement(stmt: LiarStatement): void {
    this._statements.set(stmt.id, stmt);
  }

  checkSelfReference(id: string): boolean {
    const stmt = this._statements.get(id);
    if (!stmt) return false;
    stmt.selfReferential = stmt.text.includes(stmt.id) || /我(自己|本身)|self/i.test(stmt.text);
    return stmt.selfReferential;
  }

  detectLoop(startId: string): LoopDetectionResult | null {
    this._visited.clear();
    this._stack = [];
    const found = this._dfs(startId, 0);
    if (found) {
      const result: LoopDetectionResult = {
        loopId: `loop-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        statements: [...this._stack],
        depth: this._stack.length,
        detectedAt: Date.now(),
        severity: this._stack.length > 8 ? 'high' : this._stack.length > 4 ? 'medium' : 'low',
      };
      this._loops.push(result);
      if (this._loops.length > 50) this._loops.shift();
      return result;
    }
    return null;
  }

  terminateLoop(loopId: string): boolean {
    const loop = this._loops.find(l => l.loopId === loopId);
    if (!loop) return false;
    for (const sid of loop.statements) {
      const stmt = this._statements.get(sid);
      if (stmt) stmt.truthValue = null;
    }
    return true;
  }

  downgradeContradiction(id: string): LiarStatement | null {
    const stmt = this._statements.get(id);
    if (!stmt || !stmt.negatesItself) return null;
    stmt.truthValue = null;
    stmt.selfReferential = true;
    return stmt;
  }

  getActiveLoops(): LoopDetectionResult[] {
    return [...this._loops];
  }

  get statementCount(): number {
    return this._statements.size;
  }

  private _dfs(id: string, depth: number): boolean {
    if (depth > this._maxDepth) return false;
    if (this._stack.includes(id)) return true;
    if (this._visited.has(id)) return false;
    this._visited.add(id);
    this._stack.push(id);
    const stmt = this._statements.get(id);
    if (stmt && stmt.negatesItself) return true;
    const next = this._statements.get(id);
    if (next) {
      const refs = Array.from(this._statements.keys()).filter(k => k !== id && next.text.includes(k));
      for (const r of refs) {
        if (this._dfs(r, depth + 1)) return true;
      }
    }
    this._stack.pop();
    return false;
  }
}

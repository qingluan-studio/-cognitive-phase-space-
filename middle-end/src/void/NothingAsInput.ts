export interface NothingOperation {
  id: string;
  input: null;
  output: unknown;
  operation: string;
  entropy: number;
}

export class NothingAsInput {
  private _operations: NothingOperation[];
  private _entropyLog: number[];
  private _outputDistribution: Map<string, number>;

  constructor() {
    this._operations = [];
    this._entropyLog = [];
    this._outputDistribution = new Map();
  }

  get operationCount(): number {
    return this._operations.length;
  }

  public operate(operation: string): NothingOperation {
    let output: unknown;
    switch (operation) {
      case 'identity':
        output = null;
        break;
      case 'invert':
        output = Infinity;
        break;
      case 'echo':
        output = '…';
        break;
      case 'zero':
        output = 0;
        break;
      default:
        output = undefined;
    }
    const entropy = this._computeOutputEntropy(output);
    const op: NothingOperation = {
      id: `nop-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      input: null,
      output,
      operation,
      entropy,
    };
    this._operations.push(op);
    if (this._operations.length > 100) this._operations.shift();
    this._entropyLog.push(entropy);
    if (this._entropyLog.length > 50) this._entropyLog.shift();
    const key = JSON.stringify(output);
    this._outputDistribution.set(key, (this._outputDistribution.get(key) ?? 0) + 1);
    return op;
  }

  public chain(operations: string[]): unknown {
    let result: unknown = null;
    for (const op of operations) {
      const operation = this.operate(op);
      result = operation.output;
    }
    return result;
  }

  public getOperation(id: string): NothingOperation | null {
    return this._operations.find(o => o.id === id) ?? null;
  }

  public getOperations(limit: number = 50): NothingOperation[] {
    return this._operations.slice(-limit);
  }

  public computeOperationEntropy(): number {
    if (this._entropyLog.length === 0) return 0;
    const mean = this._entropyLog.reduce((a, b) => a + b, 0) / this._entropyLog.length;
    const variance = this._entropyLog.reduce((s, v) => s + (v - mean) ** 2, 0) / this._entropyLog.length;
    return 0.5 * Math.log2(2 * Math.PI * Math.E * Math.max(variance, 1e-10));
  }

  public computeOutputEntropy(): number {
    const total = Array.from(this._outputDistribution.values()).reduce((a, b) => a + b, 0);
    if (total === 0) return 0;
    let entropy = 0;
    for (const count of this._outputDistribution.values()) {
      const p = count / total;
      if (p > 0) entropy -= p * Math.log2(p);
    }
    return entropy;
  }

  public predictNextOutput(): string {
    let best = '';
    let maxCount = 0;
    for (const [key, count] of this._outputDistribution) {
      if (count > maxCount) {
        maxCount = count;
        best = key;
      }
    }
    return best;
  }

  public simulateRandomWalk(steps: number): Array<{ step: number; state: unknown; entropy: number }> {
    const walk: Array<{ step: number; state: unknown; entropy: number }> = [];
    let state: unknown = null;
    const ops = ['identity', 'invert', 'echo', 'zero'];
    for (let i = 0; i < steps; i++) {
      const op = ops[Math.floor(Math.random() * ops.length)];
      const result = this.operate(op);
      state = result.output;
      walk.push({ step: i, state, entropy: result.entropy });
    }
    return walk;
  }

  private _computeOutputEntropy(output: unknown): number {
    const str = JSON.stringify(output);
    const freq = new Map<string, number>();
    for (const ch of str) {
      freq.set(ch, (freq.get(ch) ?? 0) + 1);
    }
    let entropy = 0;
    for (const count of freq.values()) {
      const p = count / str.length;
      entropy -= p * Math.log2(p);
    }
    return entropy;
  }
}

export interface SurvivorCoreData {
  health: number;
  instructions: string[];
  canSelfBootstrap: boolean;
}

export class SurvivorCore {
  private _health: number;
  private _instructions: string[];
  private _vitals: Record<string, number>;
  private _bootstrapped: boolean;
  private _entropyLog: number[];
  private _executionGraph: Map<string, string[]>;
  private _bootstrapAttempts: number;
  private _complexityThreshold: number;

  constructor(health: number = 10) {
    this._health = health;
    this._instructions = ['breathe', 'listen', 'echo'];
    this._vitals = { temp: 37, pulse: 60, breath: 12 };
    this._bootstrapped = false;
    this._entropyLog = [];
    this._executionGraph = new Map<string, string[]>();
    this._bootstrapAttempts = 0;
    this._complexityThreshold = 2.5;
  }

  get health(): number {
    return this._health;
  }

  get canSelfBootstrap(): boolean {
    return this._health > 0 && this._instructions.length >= 3 && this._computeInstructionEntropy() >= this._complexityThreshold;
  }

  get bootstrapped(): boolean {
    return this._bootstrapped;
  }

  get bootstrapAttempts(): number {
    return this._bootstrapAttempts;
  }

  get instructionEntropy(): number {
    return this._computeInstructionEntropy();
  }

  public execute(instruction: string): string {
    if (!this._instructions.includes(instruction)) {
      this._health = Math.max(0, this._health - 1);
      return 'unknown-instruction';
    }
    this._updateExecutionGraph(instruction);
    const entropy = this._computeExecutionEntropy();
    this._entropyLog.push(entropy);
    if (this._entropyLog.length > 500) {
      this._entropyLog.shift();
    }
    return `executed:${instruction}`;
  }

  public learn(instruction: string): void {
    if (!this._instructions.includes(instruction)) {
      this._instructions.push(instruction);
    }
  }

  public forget(instruction: string): void {
    this._instructions = this._instructions.filter((i) => i !== instruction);
  }

  public bootstrap(): boolean {
    this._bootstrapAttempts += 1;
    if (!this.canSelfBootstrap) {
      return false;
    }
    this._bootstrapped = true;
    this._health = Math.min(100, this._health + 20);
    return true;
  }

  public vitals(): Record<string, number> {
    return { ...this._vitals };
  }

  public report(): SurvivorCoreData {
    return {
      health: this._health,
      instructions: [...this._instructions],
      canSelfBootstrap: this.canSelfBootstrap,
    };
  }

  public computeStateMachineDepth(): number {
    const visited = new Set<string>();
    let maxDepth = 0;
    for (const start of this._instructions) {
      const depth = this._dfsDepth(start, visited, new Set<string>(), 0);
      if (depth > maxDepth) {
        maxDepth = depth;
      }
    }
    return maxDepth;
  }

  public getExecutionEntropySeries(): number[] {
    return [...this._entropyLog];
  }

  private _computeInstructionEntropy(): number {
    if (this._instructions.length === 0) {
      return 0;
    }
    const freq = new Map<string, number>();
    for (const ins of this._instructions) {
      for (let i = 0; i < ins.length; i++) {
        const ch = ins[i];
        freq.set(ch, (freq.get(ch) ?? 0) + 1);
      }
    }
    const total = Array.from(freq.values()).reduce((s, v) => s + v, 0);
    let entropy = 0;
    for (const count of freq.values()) {
      const p = count / total;
      entropy -= p * Math.log2(p);
    }
    return entropy;
  }

  private _updateExecutionGraph(instruction: string): void {
    if (this._entropyLog.length === 0) {
      this._executionGraph.set(instruction, []);
      return;
    }
    const prev = this._instructions[this._entropyLog.length % this._instructions.length] ?? this._instructions[0];
    const edges = this._executionGraph.get(prev) ?? [];
    if (!edges.includes(instruction)) {
      edges.push(instruction);
      this._executionGraph.set(prev, edges);
    }
  }

  private _computeExecutionEntropy(): number {
    const transitions: Record<string, number> = {};
    let total = 0;
    for (const [, edges] of this._executionGraph) {
      for (const edge of edges) {
        transitions[edge] = (transitions[edge] ?? 0) + 1;
        total += 1;
      }
    }
    if (total === 0) {
      return 0;
    }
    let entropy = 0;
    for (const count of Object.values(transitions)) {
      const p = count / total;
      entropy -= p * Math.log2(p);
    }
    return entropy;
  }

  private _dfsDepth(node: string, visited: Set<string>, stack: Set<string>, depth: number): number {
    if (stack.has(node)) {
      return depth;
    }
    if (visited.has(node)) {
      return depth;
    }
    visited.add(node);
    stack.add(node);
    const edges = this._executionGraph.get(node) ?? [];
    let maxChild = depth;
    for (const next of edges) {
      const childDepth = this._dfsDepth(next, visited, stack, depth + 1);
      if (childDepth > maxChild) {
        maxChild = childDepth;
      }
    }
    stack.delete(node);
    return maxChild;
  }
}

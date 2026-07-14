export interface PathStep {
  index: number;
  input: number;
  state: number;
  branch: string;
  irreversible: boolean;
}

export type PathTrace = {
  steps: PathStep[];
  totalLength: number;
  isReversible: boolean;
  branchEntropy: number;
};

export interface PathDependenceConfig {
  branchCount: number;
  memoryDepth: number;
  irreversibilityThreshold: number;
  inertia: number;
}

export class PathDependence {
  private _config: PathDependenceConfig;
  private _steps: PathStep[] = [];
  private _state: number = 0;
  private _branch: string = 'main';
  private _flags: Record<string, unknown> = {};
  private _branchVisits: Map<string, number> = new Map();

  constructor(config: PathDependenceConfig) {
    this._config = config;
    this._branchVisits.set('main', 0);
  }

  get state(): number {
    return this._state;
  }

  get branch(): string {
    return this._branch;
  }

  get stepCount(): number {
    return this._steps.length;
  }

  public step(input: number): PathStep {
    const index = this._steps.length;
    const newState = this._state * this._config.inertia + input * (1 - this._config.inertia);
    const irreversible = Math.abs(input) > this._config.irreversibilityThreshold;
    if (irreversible) {
      this._branch = `b${index % this._config.branchCount}`;
      this._branchVisits.set(this._branch, (this._branchVisits.get(this._branch) ?? 0) + 1);
    }
    this._state = newState;
    const s: PathStep = { index, input, state: this._state, branch: this._branch, irreversible };
    this._steps.push(s);
    if (this._steps.length > this._config.memoryDepth) this._steps.shift();
    return s;
  }

  public trace(): PathTrace {
    const totalLength = this._steps.reduce((acc, s) => acc + Math.abs(s.input), 0);
    const isReversible = this._steps.every((s) => !s.irreversible);
    const branchEntropy = this._computeBranchEntropy();
    return { steps: [...this._steps], totalLength, isReversible, branchEntropy };
  }

  private _computeBranchEntropy(): number {
    const total = [...this._branchVisits.values()].reduce((s, v) => s + v, 0);
    if (total === 0) return 0;
    let entropy = 0;
    for (const count of this._branchVisits.values()) {
      if (count > 0) {
        const p = count / total;
        entropy -= p * Math.log(p);
      }
    }
    return entropy;
  }

  public switchBranch(name: string): void {
    this._branch = name;
    this._branchVisits.set(name, (this._branchVisits.get(name) ?? 0) + 1);
    this._flags.lastSwitch = { at: this._steps.length, to: name };
  }

  public comparePaths(other: PathStep[]): number {
    const n = Math.min(other.length, this._steps.length);
    let diff = 0;
    for (let i = 0; i < n; i++) {
      diff += Math.abs(this._steps[i].state - other[i].state);
    }
    return diff;
  }

  public rollbackTo(index: number): boolean {
    if (index < 0 || index >= this._steps.length) return false;
    const target = this._steps[index];
    this._state = target.state;
    this._branch = target.branch;
    this._steps = this._steps.slice(0, index + 1);
    return true;
  }

  public divergenceScore(): number {
    if (this._steps.length < 2) return 0;
    let score = 0;
    for (let i = 1; i < this._steps.length; i++) {
      score += Math.abs(this._steps[i].state - this._steps[i - 1].state);
    }
    return score / (this._steps.length - 1);
  }

  public transitionMatrix(): number[][] {
    const n = this._config.branchCount;
    const matrix: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 1; i < this._steps.length; i++) {
      const from = parseInt(this._steps[i - 1].branch.replace('b', '')) % n || 0;
      const to = parseInt(this._steps[i].branch.replace('b', '')) % n || 0;
      matrix[from][to]++;
    }
    for (let i = 0; i < n; i++) {
      const rowSum = matrix[i].reduce((s, v) => s + v, 0);
      if (rowSum > 0) {
        for (let j = 0; j < n; j++) matrix[i][j] /= rowSum;
      }
    }
    return matrix;
  }

  public report(): Record<string, unknown> {
    return {
      state: this._state,
      branch: this._branch,
      steps: this._steps.length,
      branchEntropy: this._computeBranchEntropy(),
      divergence: this.divergenceScore(),
      flags: this._flags,
    };
  }
}

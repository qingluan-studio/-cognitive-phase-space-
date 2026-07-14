/**
 * 路径依赖模块：当前状态不仅取决于输入，还取决于到达该输入所经过的轨迹。
 * 记录历史路径并据此计算状态分支与可逆性。
 */

export interface PathStep {
  index: number;
  input: number;
  state: number;
  branch: string;
}

export type PathTrace = {
  steps: PathStep[];
  totalLength: number;
  isReversible: boolean;
};

export interface PathDependenceConfig {
  branchCount: number;
  memoryDepth: number;
  irreversibilityThreshold: number;
}

export class PathDependence {
  private _config: PathDependenceConfig;
  private _steps: PathStep[] = [];
  private _state: number = 0;
  private _branch: string = 'main';
  private _flags: Record<string, unknown> = {};

  constructor(config: PathDependenceConfig) {
    this._config = config;
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

  step(input: number): PathStep {
    const index = this._steps.length;
    this._state = this._state * 0.6 + input * 0.4;
    if (Math.abs(input) > this._config.irreversibilityThreshold) {
      this._branch = `b${index % this._config.branchCount}`;
    }
    const s: PathStep = { index, input, state: this._state, branch: this._branch };
    this._steps.push(s);
    if (this._steps.length > this._config.memoryDepth) {
      this._steps.shift();
    }
    return s;
  }

  trace(): PathTrace {
    const totalLength = this._steps.reduce((acc, s) => acc + Math.abs(s.input), 0);
    const isReversible = this._steps.every(
      (s) => Math.abs(s.input) <= this._config.irreversibilityThreshold
    );
    return { steps: [...this._steps], totalLength, isReversible };
  }

  switchBranch(name: string): void {
    this._branch = name;
    this._flags.lastSwitch = { at: this._steps.length, to: name };
  }

  comparePaths(other: PathStep[]): number {
    const n = Math.min(other.length, this._steps.length);
    let diff = 0;
    for (let i = 0; i < n; i++) {
      diff += Math.abs(this._steps[i].state - other[i].state);
    }
    return diff;
  }

  rollbackTo(index: number): boolean {
    if (index < 0 || index >= this._steps.length) return false;
    const target = this._steps[index];
    this._state = target.state;
    this._branch = target.branch;
    this._steps = this._steps.slice(0, index + 1);
    return true;
  }

  divergenceScore(): number {
    if (this._steps.length < 2) return 0;
    let score = 0;
    for (let i = 1; i < this._steps.length; i++) {
      score += Math.abs(this._steps[i].state - this._steps[i - 1].state);
    }
    return score / (this._steps.length - 1);
  }

  report(): Record<string, unknown> {
    return {
      state: this._state,
      branch: this._branch,
      steps: this._steps.length,
      flags: this._flags,
    };
  }
}

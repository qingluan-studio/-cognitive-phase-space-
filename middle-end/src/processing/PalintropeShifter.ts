/**
 * 回文翻转器模块：数据处理既可正向运行也可反向运行，
 * 输出可倒推输入，正反两向输出交叉校验确保处理可逆性。
 */

export interface PalindromicStep {
  index: number;
  forwardOp: (input: Record<string, unknown>) => Record<string, unknown>;
  inverseOp: (output: Record<string, unknown>) => Record<string, unknown>;
  label: string;
}

export interface PalindromicResult {
  forwardOutput: Record<string, unknown>;
  backwardOutput: Record<string, unknown>;
  reversible: boolean;
  asymmetry: number;
}

export class PalintropeShifter {
  private _steps: PalindromicStep[] = [];
  private _results: PalindromicResult[] = [];
  private _maxResults = 16;

  addStep(step: PalindromicStep): void {
    this._steps.push(step);
    this._steps.sort((a, b) => a.index - b.index);
  }

  removeStep(index: number): boolean {
    const i = this._steps.findIndex(s => s.index === index);
    if (i === -1) return false;
    this._steps.splice(i, 1);
    return true;
  }

  runForward(input: Record<string, unknown>): Record<string, unknown> {
    let current = { ...input };
    for (const step of this._steps) {
      current = step.forwardOp(current);
    }
    return current;
  }

  runBackward(output: Record<string, unknown>): Record<string, unknown> {
    let current = { ...output };
    const reversed = [...this._steps].reverse();
    for (const step of reversed) {
      current = step.inverseOp(current);
    }
    return current;
  }

  verifyReversibility(input: Record<string, unknown>): PalindromicResult {
    const forwardOutput = this.runForward(input);
    const backwardOutput = this.runBackward(forwardOutput);
    const asymmetry = this._computeAsymmetry(input, backwardOutput);
    const result: PalindromicResult = {
      forwardOutput,
      backwardOutput,
      reversible: asymmetry < 0.05,
      asymmetry,
    };
    this._results.push(result);
    if (this._results.length > this._maxResults) this._results.shift();
    return result;
  }

  private _computeAsymmetry(original: Record<string, unknown>, restored: Record<string, unknown>): number {
    const keys = new Set([...Object.keys(original), ...Object.keys(restored)]);
    let diff = 0;
    let total = 0;
    for (const key of keys) {
      total++;
      if (String(original[key]) !== String(restored[key])) diff++;
    }
    return total === 0 ? 0 : diff / total;
  }

  crossCheck(input: Record<string, unknown>): { consistent: boolean; mismatchKeys: string[] } {
    const result = this.verifyReversibility(input);
    const mismatchKeys: string[] = [];
    for (const key of new Set([...Object.keys(input), ...Object.keys(result.backwardOutput)])) {
      if (String(input[key]) !== String(result.backwardOutput[key])) {
        mismatchKeys.push(key);
      }
    }
    return { consistent: mismatchKeys.length === 0, mismatchKeys };
  }

  averageReversibility(): number {
    if (this._results.length === 0) return 1;
    const reversibleCount = this._results.filter(r => r.reversible).length;
    return reversibleCount / this._results.length;
  }

  averageAsymmetry(): number {
    if (this._results.length === 0) return 0;
    return this._results.reduce((s, r) => s + r.asymmetry, 0) / this._results.length;
  }

  getStep(index: number): PalindromicStep | undefined {
    return this._steps.find(s => s.index === index);
  }

  reset(): void {
    this._steps = [];
    this._results = [];
  }

  get stepCount(): number {
    return this._steps.length;
  }

  get resultCount(): number {
    return this._results.length;
  }
}

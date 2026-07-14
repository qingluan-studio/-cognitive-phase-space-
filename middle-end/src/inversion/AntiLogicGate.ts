/**
 * 反逻辑门：AND变为OR，TRUE变FALSE。
 * 将标准逻辑门取反输出，对真值与连接符进行系统化反演。
 */

export interface GateInput {
  id: string;
  value: boolean;
}

export interface AntiGateResult {
  operation: string;
  inputs: boolean[];
  standardOutput: boolean;
  antiOutput: boolean;
  computedAt: number;
}

export class AntiLogicGate {
  private _inputs: Map<string, GateInput> = new Map();
  private _results: AntiGateResult[] = [];
  private _invertConstants = true;

  registerInput(input: GateInput): void {
    this._inputs.set(input.id, input);
  }

  setInputValue(id: string, value: boolean): boolean {
    const input = this._inputs.get(id);
    if (!input) return false;
    input.value = value;
    return true;
  }

  antiAnd(inputIds: string[]): AntiGateResult | null {
    const inputs = this._collect(inputIds);
    if (!inputs) return null;
    const standard = inputs.every(v => v);
    const anti = this._invertConstants ? !standard : inputs.some(v => !v);
    return this._record('ANTI-AND', inputs, standard, anti);
  }

  antiOr(inputIds: string[]): AntiGateResult | null {
    const inputs = this._collect(inputIds);
    if (!inputs) return null;
    const standard = inputs.some(v => v);
    const anti = this._invertConstants ? !standard : inputs.every(v => !v);
    return this._record('ANTI-OR', inputs, standard, anti);
  }

  antiNot(id: string): AntiGateResult | null {
    const input = this._inputs.get(id);
    if (!input) return null;
    const standard = !input.value;
    const anti = this._invertConstants ? !standard : input.value;
    return this._record('ANTI-NOT', [input.value], standard, anti);
  }

  toggleConstantInversion(): void {
    this._invertConstants = !this._invertConstants;
  }

  getResults(limit: number = 50): AntiGateResult[] {
    return this._results.slice(-limit);
  }

  getInputCount(): number {
    return this._inputs.size;
  }

  private _collect(ids: string[]): boolean[] | null {
    const values: boolean[] = [];
    for (const id of ids) {
      const input = this._inputs.get(id);
      if (!input) return null;
      values.push(input.value);
    }
    return values;
  }

  private _record(operation: string, inputs: boolean[], standard: boolean, anti: boolean): AntiGateResult {
    const result: AntiGateResult = {
      operation,
      inputs,
      standardOutput: standard,
      antiOutput: anti,
      computedAt: Date.now(),
    };
    this._results.push(result);
    if (this._results.length > 100) this._results.shift();
    return result;
  }
}

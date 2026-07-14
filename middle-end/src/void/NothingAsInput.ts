/**
 * 无作为输入：以null作为有效输入处理。
 * 将 null 与 undefined 视为合法输入，对其执行有意义的处理而不是拒绝或报错。
 */

export type NullInputKind = 'null' | 'undefined' | 'empty' | 'zero' | 'present';

export interface NullHandlingResult {
  kind: NullInputKind;
  transformed: unknown;
  notes: string[];
  handledAt: number;
}

export interface NullPolicy {
  acceptNull: boolean;
  acceptUndefined: boolean;
  defaultValue: unknown;
}

export class NothingAsInput {
  private _policy: NullPolicy;
  private _history: NullHandlingResult[] = [];
  private _nullCount = 0;
  private _presentCount = 0;

  constructor(policy?: Partial<NullPolicy>) {
    this._policy = {
      acceptNull: policy?.acceptNull ?? true,
      acceptUndefined: policy?.acceptUndefined ?? true,
      defaultValue: policy?.defaultValue ?? null,
    };
  }

  handle(input: unknown): NullHandlingResult {
    const kind = this._classify(input);
    const notes: string[] = [];
    let transformed: unknown = input;

    switch (kind) {
      case 'null':
        if (!this._policy.acceptNull) {
          transformed = this._policy.defaultValue;
          notes.push('Null rejected; default substituted.');
        } else {
          notes.push('Null accepted as valid input.');
        }
        this._nullCount++;
        break;
      case 'undefined':
        if (!this._policy.acceptUndefined) {
          transformed = this._policy.defaultValue;
          notes.push('Undefined rejected; default substituted.');
        } else {
          notes.push('Undefined accepted as valid input.');
        }
        this._nullCount++;
        break;
      case 'empty':
        notes.push('Empty value normalized.');
        transformed = this._policy.defaultValue;
        break;
      case 'zero':
        notes.push('Zero treated as meaningful nothing.');
        break;
      case 'present':
        notes.push('Value present; passed through.');
        this._presentCount++;
        break;
    }

    const result: NullHandlingResult = {
      kind, transformed, notes, handledAt: Date.now(),
    };
    this._history.push(result);
    if (this._history.length > 200) this._history.shift();
    return result;
  }

  private _classify(input: unknown): NullInputKind {
    if (input === null) return 'null';
    if (input === undefined) return 'undefined';
    if (typeof input === 'string' && input === '') return 'empty';
    if (typeof input === 'number' && input === 0) return 'zero';
    if (Array.isArray(input) && input.length === 0) return 'empty';
    if (typeof input === 'object' && Object.keys(input).length === 0) return 'empty';
    return 'present';
  }

  setPolicy(policy: Partial<NullPolicy>): void {
    this._policy = { ...this._policy, ...policy };
  }

  getHistory(limit: number = 50): NullHandlingResult[] {
    return this._history.slice(-limit);
  }

  get nullRatio(): number {
    const total = this._nullCount + this._presentCount;
    if (total === 0) return 0;
    return this._nullCount / total;
  }

  get handledCount(): number {
    return this._history.length;
  }
}

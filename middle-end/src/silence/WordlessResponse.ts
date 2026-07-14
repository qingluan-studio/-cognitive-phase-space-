/**
 * 无言回应模块：用无回应作为最有力的回应。
 * 对挑衅、询问、噪音统一返回沉默，把沉默本身当作可计量的信号。
 */

export interface WordlessResponseData {
  totalInputs: number;
  silentResponses: number;
  meaningfulSilence: number;
}

export class WordlessResponse {
  private _inputs: number;
  private _silent: number;
  private _meaningful: number;
  private _exceptions: Set<string>;
  private _lastInput: string;

  constructor() {
    this._inputs = 0;
    this._silent = 0;
    this._meaningful = 0;
    this._exceptions = new Set<string>();
    this._lastInput = '';
  }

  get totalInputs(): number {
    return this._inputs;
  }

  get silentCount(): number {
    return this._silent;
  }

  public respond(input: string): string {
    this._inputs += 1;
    this._lastInput = input;
    if (this._exceptions.has(input)) {
      return `acknowledged:${input}`;
    }
    this._silent += 1;
    if (input.length > 50) this._meaningful += 1;
    return '';
  }

  public allow(topic: string): void {
    this._exceptions.add(topic);
  }

  public forbid(topic: string): void {
    this._exceptions.delete(topic);
  }

  public isExcepted(topic: string): boolean {
    return this._exceptions.has(topic);
  }

  public lastInput(): string {
    return this._lastInput;
  }

  public clear(): void {
    this._inputs = 0;
    this._silent = 0;
    this._meaningful = 0;
  }

  public report(): WordlessResponseData {
    return {
      totalInputs: this._inputs,
      silentResponses: this._silent,
      meaningfulSilence: this._meaningful,
    };
  }
}

export interface TrueContradictionData {
  statement: string;
  truthValue: number;
  isTrue: boolean;
  isFalse: boolean;
  dialetheia: boolean;
}

export class TrueContradiction {
  private _statement: string;
  private _truthValue: number;
  private _isTrue: boolean;
  private _isFalse: boolean;
  private _dialetheia: boolean;
  private _paradoxType: string;
  private _resistant: boolean;
  private _levels: number;

  constructor(statement: string = 'This sentence is false') {
    this._statement = statement;
    this._truthValue = 2;
    this._isTrue = true;
    this._isFalse = true;
    this._dialetheia = true;
    this._paradoxType = 'liar';
    this._resistant = true;
    this._levels = 0;
  }

  get statement(): string {
    return this._statement;
  }

  get truthValue(): number {
    return this._truthValue;
  }

  get isTrue(): boolean {
    return this._isTrue;
  }

  get isFalse(): boolean {
    return this._isFalse;
  }

  get dialetheia(): boolean {
    return this._dialetheia;
  }

  public evaluate(): number {
    this._truthValue = 2;
    this._isTrue = true;
    this._isFalse = true;
    this._dialetheia = true;
    return this._truthValue;
  }

  public strengthen(): string {
    return `This sentence is not true`;
  }

  public revenge(): string {
    return `This sentence is false and not both true and false`;
  }

  public getParadoxType(): string {
    return this._paradoxType;
  }

  public setParadoxType(type: string): void {
    this._paradoxType = type;
  }

  public isResistant(): boolean {
    return this._resistant;
  }

  public hierarchicalLevel(): number {
    return this._levels;
  }

  public goUpLevel(): void {
    this._levels++;
  }

  public isGrounded(): boolean {
    return false;
  }

  public isUngrounded(): boolean {
    return true;
  }

  public report(): TrueContradictionData {
    return {
      statement: this._statement,
      truthValue: this._truthValue,
      isTrue: this._isTrue,
      isFalse: this._isFalse,
      dialetheia: this._dialetheia,
    };
  }

  public setStatement(statement: string): void {
    this._statement = statement;
  }

  public negate(): string {
    return `It is not the case that ${this._statement}`;
  }

  public pair(): string[] {
    return [this._statement, this.negate()];
  }

  public reset(): void {
    this._truthValue = 2;
    this._isTrue = true;
    this._isFalse = true;
    this._dialetheia = true;
    this._levels = 0;
  }
}

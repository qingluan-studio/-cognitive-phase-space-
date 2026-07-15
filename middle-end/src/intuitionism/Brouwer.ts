export interface BrouwerData {
  choiceSequences: number;
  spreads: number;
  bars: number;
  creatingSubject: boolean;
  intuitionistic: boolean;
}

export class Brouwer {
  private _choiceSequences: number;
  private _spreads: number;
  private _bars: number;
  private _creatingSubject: boolean;
  private _intuitionistic: boolean;
  private _mathematicalObjects: string[];
  private _constructions: number;
  private _timeConsciousness: boolean;

  constructor() {
    this._choiceSequences = 0;
    this._spreads = 0;
    this._bars = 0;
    this._creatingSubject = true;
    this._intuitionistic = true;
    this._mathematicalObjects = [];
    this._constructions = 0;
    this._timeConsciousness = true;
  }

  get choiceSequences(): number {
    return this._choiceSequences;
  }

  get spreads(): number {
    return this._spreads;
  }

  get bars(): number {
    return this._bars;
  }

  get creatingSubject(): boolean {
    return this._creatingSubject;
  }

  public addChoiceSequence(seq: number[]): number {
    this._choiceSequences++;
    this._constructions++;
    this._mathematicalObjects.push(`choice_seq_${this._choiceSequences}`);
    return this._choiceSequences - 1;
  }

  public createSpread(law: (n: number) => boolean): number {
    this._spreads++;
    this._constructions++;
    this._mathematicalObjects.push(`spread_${this._spreads}`);
    return this._spreads - 1;
  }

  public createBar(predicate: (seq: number[]) => boolean): number {
    this._bars++;
    this._constructions++;
    this._mathematicalObjects.push(`bar_${this._bars}`);
    return this._bars - 1;
  }

  public barInduction(bar: number, spread: number): boolean {
    return bar > 0 && spread > 0;
  }

  public fanTheorem(fan: number): boolean {
    return fan > 0;
  }

  public isIntuitionistic(): boolean {
    return this._intuitionistic;
  }

  public constructingSubject(): boolean {
    return this._creatingSubject;
  }

  public weaklyCounterexample(theorem: string): boolean {
    return false;
  }

  public createNumber(n: number): number {
    this._constructions++;
    return n;
  }

  public continuum(): number {
    return this._choiceSequences;
  }

  public lawlessSequence(): number {
    this._choiceSequences++;
    return this._choiceSequences - 1;
  }

  public report(): BrouwerData {
    return {
      choiceSequences: this._choiceSequences,
      spreads: this._spreads,
      bars: this._bars,
      creatingSubject: this._creatingSubject,
      intuitionistic: this._intuitionistic,
    };
  }

  public getMathematicalObjects(): string[] {
    return [...this._mathematicalObjects];
  }

  public constructionsCount(): number {
    return this._constructions;
  }

  public hasTimeConsciousness(): boolean {
    return this._timeConsciousness;
  }

  public setCreatingSubject(value: boolean): void {
    this._creatingSubject = value;
  }

  public reset(): void {
    this._choiceSequences = 0;
    this._spreads = 0;
    this._bars = 0;
    this._constructions = 0;
    this._mathematicalObjects = [];
  }
}

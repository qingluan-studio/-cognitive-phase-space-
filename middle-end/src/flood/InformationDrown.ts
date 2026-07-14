export interface InformationDrownData {
  intake: number;
  lungCapacity: number;
  breathLeft: number;
  drowning: boolean;
}

export class InformationDrown {
  private _intake: number;
  private _lungCapacity: number;
  private _breathLeft: number;
  private _drowning: boolean;
  private _intakeHistory: number[];
  private _cognitiveLoad: number;

  constructor(lungCapacity: number = 500) {
    this._intake = 0;
    this._lungCapacity = lungCapacity;
    this._breathLeft = lungCapacity;
    this._drowning = false;
    this._intakeHistory = [];
    this._cognitiveLoad = 0;
  }

  get intake(): number {
    return this._intake;
  }

  get drowning(): boolean {
    return this._drowning;
  }

  get breathLeft(): number {
    return this._breathLeft;
  }

  get cognitiveLoad(): number {
    return this._cognitiveLoad;
  }

  public swallow(volume: number): void {
    this._intake += volume;
    this._breathLeft -= volume;
    this._intakeHistory.push(volume);
    if (this._intakeHistory.length > 50) this._intakeHistory.shift();
    this._cognitiveLoad = this._computeCognitiveLoad();
    if (this._breathLeft <= 0) {
      this._drowning = true;
      this._breathLeft = 0;
    }
  }

  public exhale(): void {
    this._breathLeft = Math.min(this._lungCapacity, this._breathLeft + this._lungCapacity * 0.2);
    if (this._breathLeft > this._lungCapacity * 0.3) this._drowning = false;
    this._cognitiveLoad = this._computeCognitiveLoad();
  }

  public surface(): void {
    this._breathLeft = this._lungCapacity;
    this._drowning = false;
    this._cognitiveLoad = 0;
  }

  public cough(): number {
    const expelled = Math.floor(this._intake * 0.3);
    this._intake -= expelled;
    return expelled;
  }

  public vitals(): InformationDrownData {
    return {
      intake: this._intake,
      lungCapacity: this._lungCapacity,
      breathLeft: this._breathLeft,
      drowning: this._drowning,
    };
  }

  public filter(predicate: (chunk: unknown) => boolean, data: unknown[]): unknown[] {
    if (this._drowning) return [];
    return data.filter(predicate);
  }

  public computeIntakeEntropy(): number {
    if (this._intakeHistory.length === 0) return 0;
    const mean = this._intakeHistory.reduce((a, b) => a + b, 0) / this._intakeHistory.length;
    const variance = this._intakeHistory.reduce((s, v) => s + (v - mean) ** 2, 0) / this._intakeHistory.length;
    return 0.5 * Math.log2(2 * Math.PI * Math.E * Math.max(variance, 1e-10));
  }

  public predictDrowningTime(): number {
    if (this._breathLeft <= 0) return 0;
    const avgIntake = this._intakeHistory.length > 0
      ? this._intakeHistory.reduce((a, b) => a + b, 0) / this._intakeHistory.length
      : 0;
    return avgIntake > 0 ? this._breathLeft / avgIntake : Infinity;
  }

  public computeLungUtilization(): number {
    return 1 - this._breathLeft / this._lungCapacity;
  }

  private _computeCognitiveLoad(): number {
    const ratio = this._intake / this._lungCapacity;
    return ratio * ratio / (1 + ratio * ratio);
  }
}

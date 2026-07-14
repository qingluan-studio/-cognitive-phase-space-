export interface HostManipulatorRecord {
  readonly manipulatorId: string;
  targetHost: string;
  influenceRadius: number;
  controlStrength: number;
  active: boolean;
}

export interface BehaviorBias {
  behavior: string;
  originalWeight: number;
  biasedWeight: number;
  payoff: number;
}

export class HostManipulator {
  private _record: HostManipulatorRecord;
  private _biases: Map<string, BehaviorBias> = new Map();
  private _perceptionFilter: Record<string, number> = {};
  private _manipulationLog: string[] = [];
  private _resistanceLevel: number = 0;
  private _payoffMatrix: number[][] = [];
  private _nashEquilibrium: number[] = [];

  constructor(record: HostManipulatorRecord) {
    this._record = { ...record };
    this._initPayoffMatrix();
  }

  get manipulatorId(): string {
    return this._record.manipulatorId;
  }

  get targetHost(): string {
    return this._record.targetHost;
  }

  get controlStrength(): number {
    return this._record.controlStrength;
  }

  get active(): boolean {
    return this._record.active;
  }

  private _initPayoffMatrix(): void {
    this._payoffMatrix = [
      [3, 0],
      [5, 1],
    ];
    this._computeNashEquilibrium();
  }

  private _computeNashEquilibrium(): void {
    const a = this._payoffMatrix;
    const p = (a[1][1] - a[1][0]) / (a[0][0] - a[0][1] - a[1][0] + a[1][1]);
    const q = (a[1][1] - a[0][1]) / (a[0][0] - a[0][1] - a[1][0] + a[1][1]);
    this._nashEquilibrium = [isFinite(p) ? Math.max(0, Math.min(1, p)) : 0.5, isFinite(q) ? Math.max(0, Math.min(1, q)) : 0.5];
  }

  public activate(): void {
    this._record.active = true;
    this._resistanceLevel = Math.max(0, this._resistanceLevel - 0.1);
  }

  public injectBias(behavior: string, originalWeight: number, shift: number): BehaviorBias {
    const biasedWeight = Math.max(0, Math.min(1, originalWeight + shift * this._record.controlStrength));
    const payoff = this._computePayoff(originalWeight, biasedWeight);
    const bias: BehaviorBias = { behavior, originalWeight, biasedWeight, payoff };
    this._biases.set(behavior, bias);
    this._manipulationLog.push(`bias:${behavior}:${biasedWeight.toFixed(2)}`);
    return bias;
  }

  private _computePayoff(original: number, biased: number): number {
    const cooperation = original > 0.5 ? 0 : 1;
    const manipulation = biased > original ? 1 : 0;
    return this._payoffMatrix[cooperation][manipulation];
  }

  public filterPerception(input: string, attenuation: number): number {
    const factor = Math.max(0, Math.min(1, 1 - attenuation * this._record.controlStrength));
    this._perceptionFilter[input] = factor;
    return factor;
  }

  public steerDecision(options: string[], favored: string): string {
    if (!this._record.active) {
      return options[0] ?? '';
    }
    if (this._resistanceLevel > 0.7) {
      return options[Math.floor(Math.random() * options.length)];
    }
    const favoredIdx = options.indexOf(favored);
    if (favoredIdx === -1) {
      return options[0] ?? '';
    }
    const roll = Math.random();
    const successThreshold = this._record.controlStrength * (1 - this._resistanceLevel);
    if (roll < successThreshold) {
      this._manipulationLog.push(`steer:chose:${favored}`);
      return favored;
    }
    return options[Math.floor(Math.random() * options.length)];
  }

  public amplifyUrge(urge: string, intensity: number): void {
    const existing = this._biases.get(urge);
    const base = existing?.biasedWeight ?? 0.5;
    this.injectBias(urge, base, intensity);
    this._resistanceLevel = Math.min(1, this._resistanceLevel + 0.02);
  }

  public suppressResistance(amount: number): void {
    this._resistanceLevel = Math.max(0, this._resistanceLevel - amount);
    this._record.controlStrength = Math.min(1, this._record.controlStrength + 0.02);
  }

  public deactivate(): void {
    this._record.active = false;
    this._biases.clear();
    this._perceptionFilter = {};
  }

  public expectedPayoff(): number {
    const p = this._nashEquilibrium[0];
    const q = this._nashEquilibrium[1];
    const a = this._payoffMatrix;
    return p * q * a[0][0] + p * (1 - q) * a[0][1] + (1 - p) * q * a[1][0] + (1 - p) * (1 - q) * a[1][1];
  }

  public manipulationReport(): Record<string, unknown> {
    return {
      manipulatorId: this.manipulatorId,
      targetHost: this.targetHost,
      active: this._record.active,
      controlStrength: this._record.controlStrength.toFixed(3),
      resistance: this._resistanceLevel.toFixed(3),
      activeBiases: this._biases.size,
      logEntries: this._manipulationLog.length,
      influenceRadius: this._record.influenceRadius,
      nashEquilibrium: this._nashEquilibrium,
      expectedPayoff: this.expectedPayoff().toFixed(3),
    };
  }
}

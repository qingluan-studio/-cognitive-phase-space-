/**
 * HostManipulator - 宿主操控者
 * 操控宿主行为以满足自身需求，通过修改宿主的决策参数、
 * 感知输入与行为倾向，使宿主做出有利于寄生者的选择。
 */

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
}

export class HostManipulator {
  private _record: HostManipulatorRecord;
  private _biases: Map<string, BehaviorBias> = new Map();
  private _perceptionFilter: Record<string, number> = {};
  private _manipulationLog: string[] = [];
  private _resistanceLevel: number = 0;

  constructor(record: HostManipulatorRecord) {
    this._record = { ...record };
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

  public activate(): void {
    this._record.active = true;
    this._resistanceLevel = Math.max(0, this._resistanceLevel - 0.1);
  }

  public injectBias(behavior: string, originalWeight: number, shift: number): BehaviorBias {
    const biasedWeight = Math.max(
      0,
      Math.min(1, originalWeight + shift * this._record.controlStrength)
    );
    const bias: BehaviorBias = { behavior, originalWeight, biasedWeight };
    this._biases.set(behavior, bias);
    this._manipulationLog.push(`bias:${behavior}:${biasedWeight.toFixed(2)}`);
    return bias;
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
    };
  }
}

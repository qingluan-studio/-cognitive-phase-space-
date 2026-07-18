export interface DeathDriveData {
  target: string;
  aggression: number;
  decayFactor: number;
  terminalState: boolean;
}

export interface DriveSnapshot {
  timestamp: number;
  remainingLife: number;
  destructiveImpulse: number;
  entropy: number;
}

export class DeathDrive {
  private _drive: DeathDriveData;
  private _snapshots: DriveSnapshot[] = [];
  private _destructionLog: string[] = [];
  private _selfHarmProbability: number = 0;
  private _logisticCarryingCapacity: number = 100;
  private _decayRate: number = 0.05;
  private _predationCoefficients: Map<string, number> = new Map();
  private _phasePortrait: { aggression: number; remaining: number }[] = [];

  constructor(drive: DeathDriveData) {
    this._drive = { ...drive };
    this._decayRate = Math.max(0.01, drive.decayFactor);
    this._logisticCarryingCapacity = Math.max(10, 100 / (drive.aggression + 0.1));
  }

  get target(): string {
    return this._drive.target;
  }

  get aggression(): number {
    return this._drive.aggression;
  }

  get terminalState(): boolean {
    return this._drive.terminalState;
  }

  public impulse(): number {
    const logisticDecay = this._logisticCarryingCapacity / (1 + Math.exp(this._decayRate * this._snapshots.length));
    const destructiveImpulse = this._drive.aggression * (1 - logisticDecay / this._logisticCarryingCapacity);
    const entropy = this._computeEntropy();
    const remainingLife = Math.max(0, this._logisticCarryingCapacity - destructiveImpulse - entropy);
    const snapshot: DriveSnapshot = {
      timestamp: Date.now(),
      remainingLife,
      destructiveImpulse,
      entropy,
    };
    this._snapshots.push(snapshot);
    if (this._snapshots.length > 50) this._snapshots.shift();
    this._phasePortrait.push({ aggression: this._drive.aggression, remaining: remainingLife });
    if (this._phasePortrait.length > 50) this._phasePortrait.shift();
    this._selfHarmProbability = destructiveImpulse / (destructiveImpulse + remainingLife + 0.001);
    if (remainingLife <= 0) {
      this._drive.terminalState = true;
    }
    return destructiveImpulse;
  }

  private _computeEntropy(): number {
    const n = this._snapshots.length;
    if (n < 2) return 0;
    const deltas = [];
    for (let i = 1; i < n; i++) {
      deltas.push(this._snapshots[i].remainingLife - this._snapshots[i - 1].remainingLife);
    }
    const meanDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length;
    const variance = deltas.reduce((a, b) => a + Math.pow(b - meanDelta, 2), 0) / deltas.length;
    return 0.5 * Math.log(2 * Math.PI * Math.E * (variance + 0.001));
  }

  public decay(): void {
    if (this._drive.terminalState) return;
    this._drive.aggression *= 1 + this._decayRate;
    for (const [target, coeff] of this._predationCoefficients) {
      this._predationCoefficients.set(target, coeff * (1 + this._decayRate));
    }
    this.impulse();
  }

  public direct(target: string): void {
    this._drive.target = target;
    this._predationCoefficients.set(target, (this._predationCoefficients.get(target) ?? 0) + this._drive.aggression);
  }

  public selfDestruct(): void {
    this._destructionLog.push(this._drive.target);
    this._drive.terminalState = true;
  }

  public suppress(amount: number): void {
    this._drive.aggression = Math.max(0, this._drive.aggression - amount);
    this._decayRate *= 0.9;
  }

  public isActive(): boolean {
    return !this._drive.terminalState && this._drive.aggression > 0;
  }

  public remainingLife(): number {
    if (this._snapshots.length === 0) return this._logisticCarryingCapacity;
    return this._snapshots[this._snapshots.length - 1].remainingLife;
  }

  public destructiveImpulse(): number {
    if (this._snapshots.length === 0) return 0;
    return this._snapshots[this._snapshots.length - 1].destructiveImpulse;
  }

  public calculateRisk(): number {
    return this._selfHarmProbability;
  }

  public getSnapshots(): DriveSnapshot[] {
    return [...this._snapshots];
  }

  public getDestructionLog(): string[] {
    return [...this._destructionLog];
  }

  public getPhasePortrait(): { aggression: number; remaining: number }[] {
    return [...this._phasePortrait];
  }

  public setDecayRate(rate: number): void {
    this._decayRate = Math.max(0.001, rate);
  }

  public computeLotkaVolterra(competitorAggression: number): { coexistence: boolean; equilibrium: number } {
    const r1 = this._drive.aggression;
    const r2 = competitorAggression;
    const K1 = this._logisticCarryingCapacity;
    const K2 = this._logisticCarryingCapacity;
    const alpha = 0.5;
    const beta = 0.5;
    const det = 1 - alpha * beta;
    if (det === 0) return { coexistence: false, equilibrium: 0 };
    const N1 = (K1 - alpha * K2) / det;
    const N2 = (K2 - beta * K1) / det;
    return { coexistence: N1 > 0 && N2 > 0, equilibrium: N1 };
  }

  public computeLyapunovExponent(): number {
    if (this._phasePortrait.length < 3) return 0;
    let divergence = 0;
    for (let i = 1; i < this._phasePortrait.length; i++) {
      const d0 = Math.sqrt(
        Math.pow(this._phasePortrait[i - 1].aggression - this._phasePortrait[0].aggression, 2) +
        Math.pow(this._phasePortrait[i - 1].remaining - this._phasePortrait[0].remaining, 2)
      );
      const d1 = Math.sqrt(
        Math.pow(this._phasePortrait[i].aggression - this._phasePortrait[1].aggression, 2) +
        Math.pow(this._phasePortrait[i].remaining - this._phasePortrait[1].remaining, 2)
      );
      if (d0 > 0) divergence += Math.log(d1 / d0 + 0.001);
    }
    return divergence / (this._phasePortrait.length - 1);
  }
}

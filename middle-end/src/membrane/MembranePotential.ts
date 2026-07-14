/**
 * MembranePotential - 膜电位
 * 膜内外离子浓度差异产生的电位差，是细胞兴奋性与
 * 信号传导的基础，通过维持极化状态储备势能。
 */

export interface MembranePotentialData {
  readonly potentialId: string;
  restingPotential: number;
  currentPotential: number;
  sodiumInside: number;
  potassiumInside: number;
}

export interface PotentialChange {
  delta: number;
  newPotential: number;
  type: 'depolarization' | 'hyperpolarization' | 'repolarization';
}

export class MembranePotential {
  private _data: MembranePotentialData;
  private _changes: PotentialChange[] = [];
  private _polarizationState: 'polarized' | 'depolarized' | 'hyperpolarized' = 'polarized';
  private _energyStored: number = 0;

  constructor(data: MembranePotentialData) {
    this._data = { ...data };
    this._energyStored = Math.abs(data.restingPotential) * 0.5;
  }

  get potentialId(): string {
    return this._data.potentialId;
  }

  get currentPotential(): number {
    return this._data.currentPotential;
  }

  get polarizationState(): 'polarized' | 'depolarized' | 'hyperpolarized' {
    return this._polarizationState;
  }

  get energyStored(): number {
    return this._energyStored;
  }

  public depolarize(amount: number): PotentialChange {
    const before = this._data.currentPotential;
    this._data.currentPotential += amount;
    this._data.sodiumInside += amount * 0.1;
    this._data.potassiumInside -= amount * 0.05;
    const type: 'depolarization' | 'hyperpolarization' | 'repolarization' = 'depolarization';
    this._updateState();
    this._energyStored = Math.max(0, this._energyStored - amount * 0.3);
    const change: PotentialChange = {
      delta: amount,
      newPotential: this._data.currentPotential,
      type,
    };
    this._changes.push(change);
    return change;
  }

  public hyperpolarize(amount: number): PotentialChange {
    this._data.currentPotential -= amount;
    this._data.potassiumInside += amount * 0.1;
    this._updateState();
    this._energyStored += amount * 0.2;
    const change: PotentialChange = {
      delta: -amount,
      newPotential: this._data.currentPotential,
      type: 'hyperpolarization',
    };
    this._changes.push(change);
    return change;
  }

  public repolarize(): PotentialChange {
    const diff = this._data.restingPotential - this._data.currentPotential;
    this._data.currentPotential += diff * 0.3;
    this._updateState();
    const type: 'depolarization' | 'hyperpolarization' | 'repolarization' =
      Math.abs(diff) < 1 ? 'repolarization' : (diff > 0 ? 'repolarization' : 'repolarization');
    const change: PotentialChange = {
      delta: diff * 0.3,
      newPotential: this._data.currentPotential,
      type,
    };
    this._changes.push(change);
    if (this._changes.length > 30) {
      this._changes.shift();
    }
    return change;
  }

  private _updateState(): void {
    const diff = this._data.currentPotential - this._data.restingPotential;
    if (diff > 10) {
      this._polarizationState = 'depolarized';
    } else if (diff < -10) {
      this._polarizationState = 'hyperpolarized';
    } else {
      this._polarizationState = 'polarized';
    }
  }

  public fireActionPotential(): boolean {
    if (this._data.currentPotential < -50) {
      return false;
    }
    this.depolarize(100);
    this._energyStored *= 0.5;
    return true;
  }

  public restoreResting(): void {
    this._data.currentPotential = this._data.restingPotential;
    this._polarizationState = 'polarized';
    this._energyStored = Math.abs(this._data.restingPotential) * 0.5;
  }

  public discharge(): number {
    const released = this._energyStored;
    this._energyStored = 0;
    this._data.currentPotential = 0;
    this._polarizationState = 'depolarized';
    return released;
  }

  public potentialReport(): Record<string, unknown> {
    return {
      potentialId: this.potentialId,
      restingPotential: this._data.restingPotential,
      currentPotential: this._data.currentPotential.toFixed(2),
      polarizationState: this._polarizationState,
      sodiumInside: this._data.sodiumInside.toFixed(2),
      potassiumInside: this._data.potassiumInside.toFixed(2),
      energyStored: this._energyStored.toFixed(2),
      changeCount: this._changes.length,
    };
  }
}

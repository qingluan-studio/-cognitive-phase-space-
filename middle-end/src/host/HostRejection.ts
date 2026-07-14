/**
 * HostRejection - 宿主排斥
 * 免疫系统识别并攻击寄生模块的过程，通过抗体、吞噬细胞、
 * 炎症反应等多层机制试图清除寄生者，恢复宿主的健康状态。
 */

export interface HostRejectionData {
  readonly hostId: string;
  immuneStrength: number;
  toleranceLevel: number;
  parasiteTarget: string;
  inflammationLevel: number;
}

export interface AttackWave {
  waveId: string;
  intensity: number;
  cellsDeployed: number;
  damageDealt: number;
  repelled: boolean;
}

export class HostRejection {
  private _data: HostRejectionData;
  private _waves: AttackWave[] = [];
  private _antibodyTiter: number = 0;
  private _collateralDamage: number = 0;
  private _parasiteHP: number = 100;

  constructor(data: HostRejectionData) {
    this._data = { ...data };
  }

  get hostId(): string {
    return this._data.hostId;
  }

  get inflammationLevel(): number {
    return this._data.inflammationLevel;
  }

  get antibodyTiter(): number {
    return this._antibodyTiter;
  }

  get parasiteRemaining(): number {
    return this._parasiteHP;
  }

  public identifyParasite(signature: string): boolean {
    const recognized = Math.random() < (1 - this._data.toleranceLevel);
    if (recognized) {
      this._antibodyTiter = Math.min(1, this._antibodyTiter + 0.2);
    }
    return recognized;
  }

  public produceAntibodies(count: number): void {
    this._antibodyTiter = Math.min(1, this._antibodyTiter + count * 0.05 * this._data.immuneStrength);
  }

  public launchAttackWave(waveId: string, cells: number): AttackWave {
    const intensity = cells * this._data.immuneStrength * this._antibodyTiter;
    const damage = Math.min(this._parasiteHP, intensity * 0.3);
    this._parasiteHP -= damage;
    const repelled = damage < intensity * 0.1;
    if (repelled) {
      this._collateralDamage += intensity * 0.05;
    }
    this._data.inflammationLevel = Math.min(1, this._data.inflammationLevel + 0.1);
    const wave: AttackWave = { waveId, intensity, cellsDeployed: cells, damageDealt: damage, repelled };
    this._waves.push(wave);
    return wave;
  }

  public escalateInflammation(): void {
    this._data.inflammationLevel = Math.min(1, this._data.inflammationLevel + 0.15);
    this._collateralDamage += 0.5;
  }

  public suppressInflammation(amount: number): void {
    this._data.inflammationLevel = Math.max(0, this._data.inflammationLevel - amount);
    this._collateralDamage = Math.max(0, this._collateralDamage - amount * 0.3);
  }

  public developTolerance(): void {
    this._data.toleranceLevel = Math.min(1, this._data.toleranceLevel + 0.05);
    this._antibodyTiter = Math.max(0, this._antibodyTiter - 0.1);
  }

  public isCleared(): boolean {
    return this._parasiteHP <= 0;
  }

  public rejectionReport(): Record<string, unknown> {
    const successful = this._waves.filter((w) => !w.repelled).length;
    return {
      hostId: this.hostId,
      target: this._data.parasiteTarget,
      immuneStrength: this._data.immuneStrength.toFixed(3),
      toleranceLevel: this._data.toleranceLevel.toFixed(3),
      antibodyTiter: this._antibodyTiter.toFixed(3),
      inflammationLevel: this._data.inflammationLevel.toFixed(3),
      parasiteRemaining: this._parasiteHP.toFixed(1),
      attackWaves: this._waves.length,
      successfulWaves: successful,
      collateralDamage: this._collateralDamage.toFixed(2),
      cleared: this.isCleared(),
    };
  }
}

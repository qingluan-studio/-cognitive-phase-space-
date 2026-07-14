export interface SemiPermeableWallData {
  readonly wallId: string;
  poreSize: number;
  selectivityRules: Record<string, boolean>;
  pressureDifferential: number;
}

export interface PassageRequest {
  readonly requestId: string;
  content: string;
  payloadSize: number;
  category: string;
}

export class SemiPermeableWall {
  private _data: SemiPermeableWallData;
  private _passedThrough: string[] = [];
  private _blockedCount: number = 0;
  private _fluxRate: number = 0;
  private _equilibriumGap: number;
  private _partitionFunction: number = 1;
  private _chemicalPotential: number = 0;
  private _osmoticPressure: number = 0;
  private _fickHistory: number[] = [];

  constructor(data: SemiPermeableWallData) {
    this._data = { ...data, selectivityRules: { ...data.selectivityRules } };
    this._equilibriumGap = data.pressureDifferential;
    this._computePartitionFunction();
  }

  get wallId(): string {
    return this._data.wallId;
  }

  get poreSize(): number {
    return this._data.poreSize;
  }

  get fluxRate(): number {
    return this._fluxRate;
  }

  get osmoticPressure(): number {
    return this._osmoticPressure;
  }

  private _computePartitionFunction(): void {
    const rules = Object.values(this._data.selectivityRules);
    let allowed = 0;
    let total = 0;
    for (const r of rules) {
      total++;
      if (r) {
        allowed++;
      }
    }
    if (total > 0) {
      this._partitionFunction = allowed / total;
    } else {
      this._partitionFunction = 1;
    }
  }

  private _fickLaw(concentrationGradient: number): number {
    const diffusionCoeff = this._data.poreSize * this._partitionFunction;
    return -diffusionCoeff * concentrationGradient;
  }

  private _gibbsFreeEnergy(passes: boolean): number {
    const entropyTerm = this._partitionFunction > 0 ? -Math.log(this._partitionFunction) : 0;
    const internalEnergy = passes ? -this._equilibriumGap : this._equilibriumGap;
    return internalEnergy - this._chemicalPotential * entropyTerm;
  }

  public evaluatePassage(request: PassageRequest): boolean {
    const sizeOk = request.payloadSize <= this._data.poreSize;
    const ruleAllowed = this._data.selectivityRules[request.category] ?? false;
    const pressurePush = this._equilibriumGap > 0;
    const energy = this._gibbsFreeEnergy(sizeOk && ruleAllowed && pressurePush);
    const thermalFluctuation = Math.random() * Math.exp(-Math.abs(energy));
    const passes = sizeOk && ruleAllowed && pressurePush && thermalFluctuation > 0.01;
    if (passes) {
      this._passedThrough.push(request.content);
      this._fluxRate += request.payloadSize * 0.1;
      this._equilibriumGap = Math.max(0, this._equilibriumGap - request.payloadSize * 0.01);
      const fickFlux = this._fickLaw(request.payloadSize * 0.01);
      this._fickHistory.push(Math.abs(fickFlux));
      if (this._fickHistory.length > 30) {
        this._fickHistory.shift();
      }
      if (this._passedThrough.length > 50) {
        this._passedThrough.shift();
      }
    } else {
      this._blockedCount++;
    }
    this._osmoticPressure = this._equilibriumGap * this._partitionFunction;
    return passes;
  }

  public addSelectivityRule(category: string, allowed: boolean): void {
    this._data.selectivityRules[category] = allowed;
    this._computePartitionFunction();
  }

  public adjustPoreSize(delta: number): void {
    this._data.poreSize = Math.max(0, this._data.poreSize + delta);
  }

  public applyPressure(increment: number): void {
    this._equilibriumGap += increment;
    this._data.pressureDifferential = this._equilibriumGap;
  }

  public reachEquilibrium(): boolean {
    const target = this._equilibriumGap * 0.95;
    this._equilibriumGap *= 0.95;
    this._osmoticPressure = this._equilibriumGap * this._partitionFunction;
    return this._equilibriumGap < 0.1;
  }

  public flushBlocked(): number {
    const count = this._blockedCount;
    this._blockedCount = 0;
    return count;
  }

  public computeConductivity(): number {
    if (this._passedThrough.length === 0) {
      return 0;
    }
    const totalPassed = this._passedThrough.length;
    const totalAttempted = totalPassed + this._blockedCount;
    return totalAttempted === 0 ? 0 : totalPassed / totalAttempted;
  }

  public computeMeanDiffusionFlux(): number {
    if (this._fickHistory.length === 0) {
      return 0;
    }
    return this._fickHistory.reduce((a, b) => a + b, 0) / this._fickHistory.length;
  }

  public wallReport(): Record<string, unknown> {
    return {
      wallId: this.wallId,
      poreSize: this._data.poreSize.toFixed(2),
      pressureDifferential: this._data.pressureDifferential.toFixed(2),
      equilibriumGap: this._equilibriumGap.toFixed(3),
      passedCount: this._passedThrough.length,
      blockedCount: this._blockedCount,
      fluxRate: this._fluxRate.toFixed(2),
      conductivity: this.computeConductivity().toFixed(3),
      ruleCount: Object.keys(this._data.selectivityRules).length,
      partitionFunction: this._partitionFunction.toFixed(3),
      osmoticPressure: this._osmoticPressure.toFixed(3),
      meanDiffusionFlux: this.computeMeanDiffusionFlux().toFixed(4),
    };
  }
}

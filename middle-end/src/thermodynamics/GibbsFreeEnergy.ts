export interface ReactionState {
  gibbsEnergy: number;
  enthalpy: number;
  entropy: number;
  temperature: number;
  progress: number;
}

export interface EquilibriumPoint {
  temperature: number;
  pressure: number;
  equilibriumConstant: number;
  spontaneity: boolean;
}

export class GibbsFreeEnergy {
  private _enthalpy: number;
  private _entropy: number;
  private _temperature: number;
  private _pressure: number;
  private _gibbsEnergy: number;
  private _reactionProgress: number;
  private _equilibriumConstant: number;
  private _history: ReactionState[];
  private _phaseBoundary: number;
  private _heatCapacity: number;
  private _standardStateGibbs: number;

  constructor(enthalpy: number = 100, entropy: number = 0.2) {
    this._enthalpy = enthalpy;
    this._entropy = entropy;
    this._temperature = 298;
    this._pressure = 1e5;
    this._gibbsEnergy = this._computeGibbs();
    this._reactionProgress = 0;
    this._equilibriumConstant = this._computeEquilibriumConstant();
    this._history = [];
    this._phaseBoundary = 373;
    this._heatCapacity = 75;
    this._standardStateGibbs = this._gibbsEnergy;
  }

  get gibbsEnergy(): number {
    return this._gibbsEnergy;
  }

  get enthalpy(): number {
    return this._enthalpy;
  }

  get entropy(): number {
    return this._entropy;
  }

  get temperature(): number {
    return this._temperature;
  }

  get equilibriumConstant(): number {
    return this._equilibriumConstant;
  }

  private _computeGibbs(): number {
    return this._enthalpy - this._temperature * this._entropy;
  }

  private _computeEquilibriumConstant(): number {
    const R = 8.314;
    return Math.exp(-this._gibbsEnergy / (R * this._temperature));
  }

  public setTemperature(temp: number): void {
    this._temperature = Math.max(0, temp);
    const deltaT = this._temperature - 298;
    this._enthalpy += this._heatCapacity * deltaT;
    this._gibbsEnergy = this._computeGibbs();
    this._equilibriumConstant = this._computeEquilibriumConstant();
    this._recordState();
  }

  public setPressure(pressure: number): void {
    this._pressure = Math.max(0, pressure);
    const R = 8.314;
    const deltaG = R * this._temperature * Math.log(this._pressure / 1e5);
    this._gibbsEnergy += deltaG;
    this._equilibriumConstant = this._computeEquilibriumConstant();
  }

  public isSpontaneous(): boolean {
    return this._gibbsEnergy < 0;
  }

  public computeReactionQuotient(concentrations: number[], stoichiometry: number[]): number {
    let Q = 1;
    for (let i = 0; i < concentrations.length; i++) {
      Q *= Math.pow(concentrations[i], stoichiometry[i]);
    }
    return Q;
  }

  public computeReactionDirection(Q: number): number {
    const deltaG = this._gibbsEnergy + 8.314 * this._temperature * Math.log(Q);
    return Math.sign(-deltaG);
  }

  public advanceReaction(dXi: number): void {
    this._reactionProgress += dXi;
    const R = 8.314;
    this._gibbsEnergy += -R * this._temperature * Math.log(this._equilibriumConstant) * dXi;
    this._recordState();
  }

  public computePhaseTransitionTemperature(): number {
    if (this._entropy === 0) return Infinity;
    return this._enthalpy / this._entropy;
  }

  public computeChemicalPotential(concentration: number): number {
    const R = 8.314;
    return this._gibbsEnergy + R * this._temperature * Math.log(concentration);
  }

  public computeMaxNonExpansionWork(): number {
    return -this._gibbsEnergy;
  }

  public computePartialMolarGibbs(moleFraction: number): number {
    const R = 8.314;
    return this._gibbsEnergy + R * this._temperature * Math.log(moleFraction);
  }

  public computeActivityCoefficient(pressure: number, fugacity: number): number {
    return fugacity / pressure;
  }

  public getReactionState(): ReactionState {
    return {
      gibbsEnergy: this._gibbsEnergy,
      enthalpy: this._enthalpy,
      entropy: this._entropy,
      temperature: this._temperature,
      progress: this._reactionProgress,
    };
  }

  public getHistory(): ReactionState[] {
    return this._history.map(h => ({ ...h }));
  }

  private _recordState(): void {
    this._history.push(this.getReactionState());
    if (this._history.length > 200) this._history.shift();
  }

  public findEquilibriumPoint(minT: number, maxT: number, steps: number = 100): EquilibriumPoint[] {
    const points: EquilibriumPoint[] = [];
    const originalT = this._temperature;
    for (let i = 0; i <= steps; i++) {
      const T = minT + (i / steps) * (maxT - minT);
      this.setTemperature(T);
      points.push({
        temperature: T,
        pressure: this._pressure,
        equilibriumConstant: this._equilibriumConstant,
        spontaneity: this.isSpontaneous(),
      });
    }
    this.setTemperature(originalT);
    return points;
  }

  public computeExcessGibbs(moleFractionA: number, moleFractionB: number, interaction: number): number {
    const R = 8.314;
    return R * this._temperature * interaction * moleFractionA * moleFractionB;
  }

  public computeStandardGibbsFormation(): number {
    return this._standardStateGibbs;
  }

  public reset(): void {
    this._enthalpy = 100;
    this._entropy = 0.2;
    this._temperature = 298;
    this._pressure = 1e5;
    this._gibbsEnergy = this._computeGibbs();
    this._reactionProgress = 0;
    this._equilibriumConstant = this._computeEquilibriumConstant();
    this._history = [];
    this._standardStateGibbs = this._gibbsEnergy;
  }
}

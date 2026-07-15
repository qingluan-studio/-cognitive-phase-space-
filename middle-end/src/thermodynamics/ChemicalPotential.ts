export interface ChemicalComponent {
  name: string;
  moleFraction: number;
  chemicalPotential: number;
  partialPressure: number;
}

export interface MixtureState {
  totalGibbs: number;
  components: ChemicalComponent[];
  temperature: number;
  pressure: number;
}

export class ChemicalPotential {
  private _components: ChemicalComponent[];
  private _temperature: number;
  private _pressure: number;
  private _totalGibbs: number;
  private _interactionMatrix: number[][];
  private _history: MixtureState[];
  private _gasConstant: number;
  private _referencePressure: number;

  constructor(temperature: number = 298, pressure: number = 1e5) {
    this._temperature = temperature;
    this._pressure = pressure;
    this._components = [];
    this._totalGibbs = 0;
    this._interactionMatrix = [];
    this._history = [];
    this._gasConstant = 8.314;
    this._referencePressure = 1e5;
  }

  get temperature(): number {
    return this._temperature;
  }

  get pressure(): number {
    return this._pressure;
  }

  get totalGibbs(): number {
    return this._totalGibbs;
  }

  get componentCount(): number {
    return this._components.length;
  }

  public addComponent(name: string, moleFraction: number, standardPotential: number): void {
    const mu = standardPotential + this._gasConstant * this._temperature * Math.log(moleFraction);
    this._components.push({
      name,
      moleFraction,
      chemicalPotential: mu,
      partialPressure: moleFraction * this._pressure,
    });
    this._updateInteractionMatrix();
    this._computeTotalGibbs();
  }

  private _updateInteractionMatrix(): void {
    const n = this._components.length;
    this._interactionMatrix = [];
    for (let i = 0; i < n; i++) {
      const row = new Array(n).fill(0);
      this._interactionMatrix.push(row);
    }
  }

  public setInteraction(i: number, j: number, value: number): void {
    if (i < 0 || i >= this._components.length || j < 0 || j >= this._components.length) return;
    this._interactionMatrix[i][j] = value;
    this._interactionMatrix[j][i] = value;
  }

  private _computeTotalGibbs(): void {
    let total = 0;
    for (const comp of this._components) {
      total += comp.moleFraction * comp.chemicalPotential;
    }
    for (let i = 0; i < this._components.length; i++) {
      for (let j = i + 1; j < this._components.length; j++) {
        total += this._interactionMatrix[i][j] * this._components[i].moleFraction * this._components[j].moleFraction;
      }
    }
    this._totalGibbs = total;
  }

  public computeChemicalPotential(index: number): number {
    if (index < 0 || index >= this._components.length) return 0;
    const comp = this._components[index];
    let mu = comp.chemicalPotential;
    for (let j = 0; j < this._components.length; j++) {
      if (j !== index) {
        mu += this._interactionMatrix[index][j] * this._components[j].moleFraction;
      }
    }
    return mu;
  }

  public computeFugacity(index: number): number {
    if (index < 0 || index >= this._components.length) return 0;
    const comp = this._components[index];
    const gamma = Math.exp(this._interactionMatrix[index][index] / (this._gasConstant * this._temperature));
    return gamma * comp.partialPressure;
  }

  public computeActivity(index: number): number {
    const fugacity = this.computeFugacity(index);
    return fugacity / this._referencePressure;
  }

  public setTemperature(temp: number): void {
    this._temperature = Math.max(0, temp);
    for (const comp of this._components) {
      comp.chemicalPotential = this.computeChemicalPotential(this._components.indexOf(comp));
    }
    this._computeTotalGibbs();
  }

  public setPressure(pressure: number): void {
    this._pressure = Math.max(0, pressure);
    for (const comp of this._components) {
      comp.partialPressure = comp.moleFraction * this._pressure;
    }
    this._computeTotalGibbs();
  }

  public computePartialMolarVolume(index: number, dVdN: number): number {
    return dVdN;
  }

  public computeGibbsDuhemCheck(): number {
    let sum = 0;
    for (let i = 0; i < this._components.length; i++) {
      sum += this._components[i].moleFraction * this.computeChemicalPotential(i);
    }
    return Math.abs(sum - this._totalGibbs);
  }

  public computeDiffusionPotential(gradient: number[], mobility: number[]): number {
    let potential = 0;
    for (let i = 0; i < this._components.length; i++) {
      potential += mobility[i] * gradient[i] * this.computeChemicalPotential(i);
    }
    return potential;
  }

  public getMixtureState(): MixtureState {
    return {
      totalGibbs: this._totalGibbs,
      components: this._components.map(c => ({ ...c })),
      temperature: this._temperature,
      pressure: this._pressure,
    };
  }

  public getHistory(): MixtureState[] {
    return this._history.map(h => ({
      totalGibbs: h.totalGibbs,
      components: h.components.map(c => ({ ...c })),
      temperature: h.temperature,
      pressure: h.pressure,
    }));
  }

  public recordState(): void {
    this._history.push(this.getMixtureState());
    if (this._history.length > 200) this._history.shift();
  }

  public computeOsmoticPressure(solventIndex: number, soluteIndex: number): number {
    const xSolvent = this._components[solventIndex].moleFraction;
    const xSolute = this._components[soluteIndex].moleFraction;
    return -this._gasConstant * this._temperature * Math.log(xSolvent) / (xSolute + 1e-10);
  }

  public computeColligativePotential(soluteMoles: number, solventMoles: number): number {
    const moleFraction = soluteMoles / (soluteMoles + solventMoles);
    return this._gasConstant * this._temperature * Math.log(1 - moleFraction);
  }

  public computeReactionAffinity(stoichiometry: number[]): number {
    let affinity = 0;
    for (let i = 0; i < this._components.length; i++) {
      affinity -= stoichiometry[i] * this.computeChemicalPotential(i);
    }
    return affinity;
  }

  public reset(): void {
    this._components = [];
    this._totalGibbs = 0;
    this._interactionMatrix = [];
    this._history = [];
    this._temperature = 298;
    this._pressure = 1e5;
  }
}

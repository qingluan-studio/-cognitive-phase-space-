export interface PostDiluvianData {
  ruins: number;
  rebuilt: number;
  foundations: string[];
  generation: number;
}

export class PostDiluvian {
  private _ruins: number;
  private _rebuilt: number;
  private _foundations: string[];
  private _generation: number;
  private _seeds: string[];
  private _reconstructionMatrix: number[][];
  private _entropyField: number;

  constructor(ruins: number = 0) {
    this._ruins = ruins;
    this._rebuilt = 0;
    this._foundations = [];
    this._generation = 0;
    this._seeds = [];
    this._reconstructionMatrix = [[0]];
    this._entropyField = 0;
  }

  get generation(): number {
    return this._generation;
  }

  get rebuiltCount(): number {
    return this._rebuilt;
  }

  get entropyField(): number {
    return this._entropyField;
  }

  public survey(ruinsFound: number): void {
    this._ruins += ruinsFound;
    this._updateEntropy();
  }

  public layFoundation(name: string): void {
    if (!this._foundations.includes(name)) {
      this._foundations.push(name);
    }
    this._expandMatrix();
  }

  public rebuild(units: number): void {
    const built = Math.min(units, this._ruins);
    this._rebuilt += built;
    this._ruins -= built;
    this._generation += 1;
    this._updateMatrix(built);
    this._updateEntropy();
  }

  public sow(seed: string): void {
    if (!this._seeds.includes(seed)) this._seeds.push(seed);
  }

  public harvest(): string[] {
    const crop = [...this._seeds];
    this._seeds = [];
    return crop;
  }

  public recover(ratio: number): number {
    const recovered = Math.floor(this._ruins * ratio);
    this._ruins -= recovered;
    this._rebuilt += recovered;
    this._updateEntropy();
    return recovered;
  }

  public report(): PostDiluvianData {
    return {
      ruins: this._ruins,
      rebuilt: this._rebuilt,
      foundations: [...this._foundations],
      generation: this._generation,
    };
  }

  public computeEigenvalues(): number[] {
    const n = this._reconstructionMatrix.length;
    if (n === 1) return [this._reconstructionMatrix[0][0]];
    const trace = this._reconstructionMatrix.reduce((s, row, i) => s + (row[i] ?? 0), 0);
    const det = this._reconstructionMatrix[0][0] * this._reconstructionMatrix[1][1] - (this._reconstructionMatrix[0][1] ?? 0) * (this._reconstructionMatrix[1][0] ?? 0);
    const discriminant = Math.sqrt(Math.max(0, trace * trace - 4 * det));
    return [(trace + discriminant) / 2, (trace - discriminant) / 2];
  }

  public computeRecoveryRate(): number {
    const total = this._ruins + this._rebuilt;
    return total > 0 ? this._rebuilt / total : 0;
  }

  public simulateLogisticGrowth(carryingCapacity: number, rate: number, steps: number): number[] {
    const trajectory: number[] = [this._rebuilt];
    let current = this._rebuilt;
    for (let i = 0; i < steps; i++) {
      current = current + rate * current * (1 - current / carryingCapacity);
      trajectory.push(current);
    }
    return trajectory;
  }

  private _expandMatrix(): void {
    const n = this._foundations.length;
    const newMatrix: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < Math.min(n - 1, this._reconstructionMatrix.length); i++) {
      for (let j = 0; j < Math.min(n - 1, this._reconstructionMatrix[i].length); j++) {
        newMatrix[i][j] = this._reconstructionMatrix[i][j];
      }
    }
    this._reconstructionMatrix = newMatrix;
  }

  private _updateMatrix(built: number): void {
    for (let i = 0; i < this._reconstructionMatrix.length; i++) {
      this._reconstructionMatrix[i][i] += built;
      if (i < this._reconstructionMatrix.length - 1) {
        this._reconstructionMatrix[i][i + 1] += built * 0.1;
        this._reconstructionMatrix[i + 1][i] += built * 0.1;
      }
    }
  }

  private _updateEntropy(): void {
    const total = this._ruins + this._rebuilt;
    if (total === 0) {
      this._entropyField = 0;
      return;
    }
    const pRuins = this._ruins / total;
    const pRebuilt = this._rebuilt / total;
    this._entropyField = -pRuins * Math.log2(pRuins + 1e-10) - pRebuilt * Math.log2(pRebuilt + 1e-10);
  }
}

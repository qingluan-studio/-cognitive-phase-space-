export interface MateriaState {
  chaosDensity: number;
  potentialEnergy: number;
  wateryHumidity: number;
  earthyDryness: number;
  seedQuality: number;
}

export class PrimaMateria {
  private _chaosDensity: number;
  private _potentialEnergy: number;
  private _wateryHumidity: number;
  private _earthyDryness: number;
  private _seedQuality: number;
  private _history: MateriaState[];

  constructor() {
    this._chaosDensity = 1.0;
    this._potentialEnergy = 1.0;
    this._wateryHumidity = 0.5;
    this._earthyDryness = 0.5;
    this._seedQuality = 0;
    this._history = [];
  }

  get chaosDensity(): number { return this._chaosDensity; }
  get potentialEnergy(): number { return this._potentialEnergy; }
  get wateryHumidity(): number { return this._wateryHumidity; }
  get earthyDryness(): number { return this._earthyDryness; }
  get seedQuality(): number { return this._seedQuality; }

  public condenseChaos(entropy: number, coolingRate: number): number {
    const condensed = entropy * Math.exp(-coolingRate);
    this._chaosDensity = condensed;
    this._recordState();
    return condensed;
  }

  public extractPotential(rawMatter: number, refinementLevel: number): number {
    const potential = rawMatter * refinementLevel;
    this._potentialEnergy = potential;
    this._recordState();
    return potential;
  }

  public balanceHumidDry(humid: number, dry: number): number {
    const balance = 1 - Math.abs(humid - dry) / (humid + dry + 0.01);
    this._wateryHumidity = humid;
    this._earthyDryness = dry;
    this._recordState();
    return balance;
  }

  public plantPhilosophicSeed(seed: number, soilFertility: number): number {
    const quality = seed * soilFertility;
    this._seedQuality = quality;
    this._recordState();
    return quality;
  }

  public fermentativePutrefaction(organicMatter: number, bacterialActivity: number, time: number): number {
    const putrefied = organicMatter * (1 - Math.exp(-bacterialActivity * time));
    return putrefied;
  }

  public waterOfLifeDistillation(impureWater: number[], boilingPoints: number[]): number[] {
    const distilled: number[] = [];
    for (let i = 0; i < impureWater.length; i++) {
      if (boilingPoints[i] < 100) {
        distilled.push(impureWater[i]);
      }
    }
    return distilled;
  }

  earthOfSecretPhilosophy(minerals: number[], extractionEfficiency: number): number {
    const extracted = minerals.reduce((a, b) => a + b, 0) * extractionEfficiency;
    return extracted;
  }

  public chaosToCosmosOrdering(disorderMeasure: number, orderingForce: number): number {
    const ordered = disorderMeasure * Math.exp(-orderingForce);
    return ordered;
  }

  public reset(): void {
    this._chaosDensity = 1.0;
    this._potentialEnergy = 1.0;
    this._wateryHumidity = 0.5;
    this._earthyDryness = 0.5;
    this._seedQuality = 0;
    this._history = [];
  }

  private _recordState(): void {
    this._history.push({
      chaosDensity: this._chaosDensity,
      potentialEnergy: this._potentialEnergy,
      wateryHumidity: this._wateryHumidity,
      earthyDryness: this._earthyDryness,
      seedQuality: this._seedQuality
    });
  }

  public getHistory(): MateriaState[] {
    return this._history;
  }
}

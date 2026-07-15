export interface StoneState {
  transmutationPower: number;
  universalDissolvent: number;
  incorruptibility: number;
  quintessenceConcentration: number;
  stoneColor: number;
}

export class PhilosopherStone {
  private _transmutationPower: number;
  private _universalDissolvent: number;
  private _incorruptibility: number;
  private _quintessenceConcentration: number;
  private _stoneColor: number;
  private _history: StoneState[];

  constructor() {
    this._transmutationPower = 0;
    this._universalDissolvent = 0;
    this._incorruptibility = 0;
    this._quintessenceConcentration = 0;
    this._stoneColor = 0;
    this._history = [];
  }

  get transmutationPower(): number { return this._transmutationPower; }
  get universalDissolvent(): number { return this._universalDissolvent; }
  get incorruptibility(): number { return this._incorruptibility; }
  get quintessenceConcentration(): number { return this._quintessenceConcentration; }
  get stoneColor(): number { return this._stoneColor; }

  public forgeStone(purity: number, iterations: number): number {
    let power = purity;
    for (let i = 0; i < iterations; i++) {
      power = Math.tanh(power * 1.5);
    }
    this._transmutationPower = power;
    this._recordState();
    return power;
  }

  public dissolveAnyMetal(metalResistance: number, solventStrength: number): number {
    const dissolved = solventStrength / (metalResistance + 0.01);
    this._universalDissolvent = Math.min(1, dissolved);
    this._recordState();
    return this._universalDissolvent;
  }

  public testIncorruptibility(exposureTime: number, decayRate: number): number {
    const remaining = Math.exp(-decayRate * exposureTime);
    this._incorruptibility = 1 - remaining;
    this._recordState();
    return this._incorruptibility;
  }

  public concentrateQuintessence(rawEther: number, distillationCycles: number): number {
    let essence = rawEther;
    for (let i = 0; i < distillationCycles; i++) {
      essence *= 1.1;
    }
    this._quintessenceConcentration = Math.min(1, essence);
    this._recordState();
    return this._quintessenceConcentration;
  }

  public colorTransmutationStage(temperature: number): number {
    const color = Math.min(1, temperature / 1000);
    this._stoneColor = color;
    this._recordState();
    return color;
  }

  public elixirOfLifeDosage(stonePurity: number, patientVitality: number): number {
    const dosage = stonePurity / (patientVitality + 0.01);
    return dosage;
  }

  public transmuteLeadToGold(leadMass: number, stonePower: number): number {
    const efficiency = stonePower * 0.99;
    return leadMass * efficiency;
  }

  public panaceaUniversality(diseases: number[], cureSpectrum: number[]): number {
    let coverage = 0;
    for (let i = 0; i < diseases.length; i++) {
      coverage += cureSpectrum[i] * diseases[i];
    }
    return coverage / (diseases.reduce((a, b) => a + b, 0) + 0.0001);
  }

  public stoneCrystallization(saturation: number, seedCrystal: number, time: number): number {
    const crystal = seedCrystal * Math.pow(saturation, time / 10);
    return crystal;
  }

  public alchemicalAmplification(baseProperty: number, iterations: number): number {
    let amplified = baseProperty;
    for (let i = 0; i < iterations; i++) {
      amplified = Math.sqrt(amplified * (1 + amplified));
    }
    return amplified;
  }

  public conjunctionOfOpposites(sulfur: number, mercury: number, salt: number): number {
    const conjunction = (sulfur + mercury + salt) / 3;
    return conjunction;
  }

  public stoneRefractiveIndex(density: number, lightSpeedInMedium: number): number {
    const n = density / (lightSpeedInMedium + 0.0001);
    return n;
  }

  public reset(): void {
    this._transmutationPower = 0;
    this._universalDissolvent = 0;
    this._incorruptibility = 0;
    this._quintessenceConcentration = 0;
    this._stoneColor = 0;
    this._history = [];
  }

  private _recordState(): void {
    this._history.push({
      transmutationPower: this._transmutationPower,
      universalDissolvent: this._universalDissolvent,
      incorruptibility: this._incorruptibility,
      quintessenceConcentration: this._quintessenceConcentration,
      stoneColor: this._stoneColor
    });
  }

  public getHistory(): StoneState[] {
    return this._history;
  }
}

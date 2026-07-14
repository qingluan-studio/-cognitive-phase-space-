export interface DisplayTrait {
  id: string;
  cost: number;
  attractiveness: number;
  honesty: number;
  handicap: number;
}

export interface SelectionOutcome {
  maleId: string;
  femaleId: string;
  displayCost: number;
  preferenceMatch: number;
  runawayIndex: number;
  honestSignal: boolean;
}

export class SexualSelectionDisplay {
  private _males: Map<string, DisplayTrait[]> = new Map();
  private _females: Map<string, number[]> = new Map();
  private _outcomes: SelectionOutcome[] = [];
  private _state: Record<string, unknown> = {};
  private _fisherRunawayIntensity: number = 0;
  private _handicapPrincipleWeight: number = 1;

  constructor() {}

  get maleCount(): number {
    return this._males.size;
  }

  get femaleCount(): number {
    return this._females.size;
  }

  registerMale(id: string, traits: DisplayTrait[]): void {
    this._males.set(id, traits.map((t) => ({ ...t })));
  }

  registerFemale(id: string, preferences: number[]): void {
    this._females.set(id, [...preferences]);
  }

  selectPair(maleId: string, femaleId: string): SelectionOutcome | null {
    const traits = this._males.get(maleId);
    const prefs = this._females.get(femaleId);
    if (!traits || !prefs) return null;
    const displayCost = traits.reduce((s, t) => s + t.cost, 0);
    let preferenceMatch = 0;
    for (let i = 0; i < Math.min(traits.length, prefs.length); i++) {
      preferenceMatch += traits[i].attractiveness * prefs[i];
    }
    const runawayIndex = preferenceMatch / (displayCost + 1);
    this._fisherRunawayIntensity = 0.9 * this._fisherRunawayIntensity + 0.1 * runawayIndex;
    const honestSignal = traits.every((t) => t.honesty > 0.5);
    const outcome: SelectionOutcome = {
      maleId,
      femaleId,
      displayCost,
      preferenceMatch,
      runawayIndex,
      honestSignal,
    };
    this._outcomes.push(outcome);
    if (this._outcomes.length > 100) this._outcomes.shift();
    return outcome;
  }

  handicapSignal(maleId: string): number {
    const traits = this._males.get(maleId);
    if (!traits) return 0;
    return traits.reduce((s, t) => s + t.handicap * t.cost, 0) * this._handicapPrincipleWeight;
  }

  signalingGame(maleA: string, maleB: string, femaleId: string): string | null {
    const a = this._males.get(maleA);
    const b = this._males.get(maleB);
    if (!a || !b) return null;
    const handicapA = this.handicapSignal(maleA);
    const handicapB = this.handicapSignal(maleB);
    const prefs = this._females.get(femaleId);
    let prefA = 0;
    let prefB = 0;
    if (prefs) {
      for (let i = 0; i < Math.min(a.length, prefs.length); i++) prefA += a[i].attractiveness * prefs[i];
      for (let i = 0; i < Math.min(b.length, prefs.length); i++) prefB += b[i].attractiveness * prefs[i];
    }
    const scoreA = prefA + handicapA;
    const scoreB = prefB + handicapB;
    return scoreA > scoreB ? maleA : maleB;
  }

  averageRunawayIndex(): number {
    if (this._outcomes.length === 0) return 0;
    return this._outcomes.reduce((s, o) => s + o.runawayIndex, 0) / this._outcomes.length;
  }

  honestSignalingRate(): number {
    if (this._outcomes.length === 0) return 0;
    return this._outcomes.filter((o) => o.honestSignal).length / this._outcomes.length;
  }

  fisherianRunaway(): boolean {
    return this._fisherRunawayIntensity > 0.8;
  }

  displayCostVariance(): number {
    const costs = Array.from(this._males.values()).flat().map((t) => t.cost);
    if (costs.length === 0) return 0;
    const mean = costs.reduce((s, v) => s + v, 0) / costs.length;
    return costs.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / costs.length;
  }

  report(): Record<string, unknown> {
    return {
      males: this._males.size,
      females: this._females.size,
      outcomes: this._outcomes.length,
      runawayIndex: this.averageRunawayIndex(),
      honestRate: this.honestSignalingRate(),
      fisherianRunaway: this.fisherianRunaway(),
      state: this._state,
    };
  }
}

export interface ArkBuilderData {
  capacity: number;
  boarded: number;
  manifest: Array<{ species: string; priority: number }>;
  sealed: boolean;
}

export interface SpeciesCargo {
  species: string;
  payload: unknown;
  priority: number;
}

export class ArkBuilder {
  private _capacity: number;
  private _cargo: SpeciesCargo[];
  private _sealed: boolean;
  private _constructionProgress: number;
  private _knapsackValue: number;
  private _diversityIndex: number;

  constructor(capacity: number = 100) {
    this._capacity = capacity;
    this._cargo = [];
    this._sealed = false;
    this._constructionProgress = 0;
    this._knapsackValue = 0;
    this._diversityIndex = 0;
  }

  get boarded(): number {
    return this._cargo.length;
  }

  get sealed(): boolean {
    return this._sealed;
  }

  get knapsackValue(): number {
    return this._knapsackValue;
  }

  get diversityIndex(): number {
    return this._diversityIndex;
  }

  public build(workUnits: number): void {
    this._constructionProgress = Math.min(100, this._constructionProgress + workUnits);
  }

  public get constructionProgress(): number {
    return this._constructionProgress;
  }

  public board(cargo: SpeciesCargo): boolean {
    if (this._sealed) return false;
    if (this._constructionProgress < 100) return false;
    if (this._cargo.length >= this._capacity) return false;
    this._cargo.push(cargo);
    this._cargo.sort((a, b) => b.priority - a.priority);
    this._updateKnapsack();
    return true;
  }

  public rejectOverflow(): SpeciesCargo[] {
    if (this._cargo.length <= this._capacity) return [];
    const overflow = this._cargo.slice(this._capacity);
    this._cargo = this._cargo.slice(0, this._capacity);
    this._updateKnapsack();
    return overflow;
  }

  public seal(): void {
    this._sealed = true;
  }

  public unseal(): void {
    this._sealed = false;
  }

  public manifest(): Array<{ species: string; priority: number }> {
    return this._cargo.map((c) => ({ species: c.species, priority: c.priority }));
  }

  public report(): ArkBuilderData {
    return {
      capacity: this._capacity,
      boarded: this.boarded,
      manifest: this.manifest(),
      sealed: this._sealed,
    };
  }

  public solveKnapsack(): SpeciesCargo[] {
    const n = this._cargo.length;
    const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(this._capacity + 1).fill(0));
    for (let i = 1; i <= n; i++) {
      for (let w = 1; w <= this._capacity; w++) {
        if (i - 1 < this._cargo.length && 1 <= w) {
          dp[i][w] = Math.max(
            dp[i - 1][w],
            dp[i - 1][w - 1] + this._cargo[i - 1].priority
          );
        }
      }
    }
    const selected: SpeciesCargo[] = [];
    let w = this._capacity;
    for (let i = n; i > 0 && w > 0; i--) {
      if (dp[i][w] !== dp[i - 1][w]) {
        selected.push(this._cargo[i - 1]);
        w -= 1;
      }
    }
    return selected;
  }

  public computeShannonDiversity(): number {
    const freq = new Map<string, number>();
    for (const c of this._cargo) {
      freq.set(c.species, (freq.get(c.species) ?? 0) + 1);
    }
    const total = this._cargo.length;
    if (total === 0) return 0;
    let diversity = 0;
    for (const count of freq.values()) {
      const p = count / total;
      diversity -= p * Math.log(p);
    }
    return diversity;
  }

  private _updateKnapsack(): void {
    this._knapsackValue = this._cargo.reduce((s, c) => s + c.priority, 0);
    this._diversityIndex = this.computeShannonDiversity();
  }
}

export interface MinimalSurvivalData {
  water: number;
  food: number;
  energy: number;
  alive: boolean;
}

export class MinimalSurvival {
  private _water: number;
  private _food: number;
  private _energy: number;
  private _tick: number;
  private _rations: number;
  private _metabolicRate: number;
  private _homeostasisError: number[];
  private _optimalPoint: number[];

  constructor(initialRations: number = 10) {
    this._water = 100;
    this._food = 100;
    this._energy = 100;
    this._tick = 0;
    this._rations = initialRations;
    this._metabolicRate = 1.0;
    this._homeostasisError = [0, 0, 0];
    this._optimalPoint = [100, 100, 100];
  }

  get alive(): boolean {
    return this._water > 0 && this._food > 0 && this._energy > 0;
  }

  get tick(): number {
    return this._tick;
  }

  get metabolicRate(): number {
    return this._metabolicRate;
  }

  public consume(): boolean {
    this._tick += 1;
    const decay = this._metabolicRate * (1 + 0.01 * this._tick);
    this._water = Math.max(0, this._water - 5 * decay);
    this._food = Math.max(0, this._food - 4 * decay);
    this._energy = Math.max(0, this._energy - 3 * decay);
    this._updateHomeostasis();
    return this.alive;
  }

  public ration(amount: number): void {
    if (this._rations <= 0) return;
    this._rations -= 1;
    this._water = Math.min(100, this._water + amount * 0.5);
    this._food = Math.min(100, this._food + amount * 0.4);
    this._energy = Math.min(100, this._energy + amount * 0.3);
    this._updateHomeostasis();
  }

  public rest(cycles: number): void {
    for (let i = 0; i < cycles; i += 1) {
      this._energy = Math.min(100, this._energy + 10);
      this._water = Math.max(0, this._water - 1);
    }
    this._metabolicRate = Math.max(0.5, this._metabolicRate - 0.01 * cycles);
  }

  public efficiency(): number {
    if (!this.alive) return 0;
    return (this._water + this._food + this._energy) / 3;
  }

  public scavenge(found: Partial<MinimalSurvivalData>): void {
    if (found.water) this._water = Math.min(100, this._water + found.water);
    if (found.food) this._food = Math.min(100, this._food + found.food);
    if (found.energy) this._energy = Math.min(100, this._energy + found.energy);
    this._updateHomeostasis();
  }

  public report(): MinimalSurvivalData {
    return {
      water: this._water,
      food: this._food,
      energy: this._energy,
      alive: this.alive,
    };
  }

  public computeLyapunovExponent(perturbation: number): number {
    const state = [this._water, this._food, this._energy];
    const neighbor = state.map(v => v + perturbation);
    let divergence = 0;
    for (let i = 0; i < 3; i++) {
      divergence += (neighbor[i] - state[i]) ** 2;
    }
    return this._tick > 0 ? 0.5 * Math.log(divergence / (perturbation ** 2)) / this._tick : 0;
  }

  public phasePortrait(): number[][] {
    return [
      [this._water, this._food],
      [this._food, this._energy],
      [this._energy, this._water],
    ];
  }

  private _updateHomeostasis(): void {
    this._homeostasisError = [
      this._optimalPoint[0] - this._water,
      this._optimalPoint[1] - this._food,
      this._optimalPoint[2] - this._energy,
    ];
  }
}

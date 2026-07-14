/**
 * 极简求生模块：以最少资源维持运转。
 * 在严格配给的资源下保持系统生命体征，并最大化每单位资源的产出。
 */

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

  constructor(initialRations: number = 10) {
    this._water = 100;
    this._food = 100;
    this._energy = 100;
    this._tick = 0;
    this._rations = initialRations;
  }

  get alive(): boolean {
    return this._water > 0 && this._food > 0 && this._energy > 0;
  }

  get tick(): number {
    return this._tick;
  }

  public consume(): boolean {
    this._tick += 1;
    this._water = Math.max(0, this._water - 5);
    this._food = Math.max(0, this._food - 4);
    this._energy = Math.max(0, this._energy - 3);
    return this.alive;
  }

  public ration(amount: number): void {
    if (this._rations <= 0) return;
    this._rations -= 1;
    this._water = Math.min(100, this._water + amount * 0.5);
    this._food = Math.min(100, this._food + amount * 0.4);
    this._energy = Math.min(100, this._energy + amount * 0.3);
  }

  public rest(cycles: number): void {
    for (let i = 0; i < cycles; i += 1) {
      this._energy = Math.min(100, this._energy + 10);
      this._water = Math.max(0, this._water - 1);
    }
  }

  public efficiency(): number {
    if (!this.alive) return 0;
    return (this._water + this._food + this._energy) / 3;
  }

  public scavenge(found: Partial<MinimalSurvivalData>): void {
    if (found.water) this._water = Math.min(100, this._water + found.water);
    if (found.food) this._food = Math.min(100, this._food + found.food);
    if (found.energy) this._energy = Math.min(100, this._energy + found.energy);
  }

  public report(): MinimalSurvivalData {
    return {
      water: this._water,
      food: this._food,
      energy: this._energy,
      alive: this.alive,
    };
  }
}

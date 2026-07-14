/**
 * 洪水之后模块：灾后重建新世界。
 * 在沉寂的废墟上重新组织模块、确立边界、播种新生。
 */

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

  constructor(ruins: number = 0) {
    this._ruins = ruins;
    this._rebuilt = 0;
    this._foundations = [];
    this._generation = 0;
    this._seeds = [];
  }

  get generation(): number {
    return this._generation;
  }

  get rebuiltCount(): number {
    return this._rebuilt;
  }

  public survey(ruinsFound: number): void {
    this._ruins += ruinsFound;
  }

  public layFoundation(name: string): void {
    if (!this._foundations.includes(name)) {
      this._foundations.push(name);
    }
  }

  public rebuild(units: number): void {
    const built = Math.min(units, this._ruins);
    this._rebuilt += built;
    this._ruins -= built;
    this._generation += 1;
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
}

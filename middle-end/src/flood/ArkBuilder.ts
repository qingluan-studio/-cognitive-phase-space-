/**
 * 方舟建造者模块：建造保存核心数据的方舟。
 * 在洪水来临前完成建造，按优先级装入物种（核心数据），超过容量则拒绝登船。
 */

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

  constructor(capacity: number = 100) {
    this._capacity = capacity;
    this._cargo = [];
    this._sealed = false;
    this._constructionProgress = 0;
  }

  get boarded(): number {
    return this._cargo.length;
  }

  get sealed(): boolean {
    return this._sealed;
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
    return true;
  }

  public rejectOverflow(): SpeciesCargo[] {
    if (this._cargo.length <= this._capacity) return [];
    const overflow = this._cargo.slice(this._capacity);
    this._cargo = this._cargo.slice(0, this._capacity);
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
}

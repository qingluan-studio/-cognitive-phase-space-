export interface FundamentalGroupData {
  generators: string[];
  relations: string[];
  abelianization: number;
  order: number;
  trivial: boolean;
}

export class FundamentalGroup {
  private _generators: string[];
  private _relations: string[];
  private _abelianization: number;
  private _order: number;
  private _trivial: boolean;
  private _loops: { path: number[]; basepoint: number }[];
  private _basepoint: number;
  private _commutatorSubgroupIndex: number;

  constructor(space: string = 'circle') {
    this._generators = [];
    this._relations = [];
    this._abelianization = 0;
    this._order = 0;
    this._trivial = false;
    this._loops = [];
    this._basepoint = 0;
    this._commutatorSubgroupIndex = 1;
    this._initializeFromSpace(space);
  }

  get generators(): string[] {
    return [...this._generators];
  }

  get relations(): string[] {
    return [...this._relations];
  }

  get order(): number {
    return this._order;
  }

  get trivial(): boolean {
    return this._trivial;
  }

  private _initializeFromSpace(space: string): void {
    switch (space) {
      case 'circle':
        this._generators = ['a'];
        this._relations = [];
        this._abelianization = 1;
        this._order = 0;
        this._trivial = false;
        break;
      case 'torus':
        this._generators = ['a', 'b'];
        this._relations = ['aba^{-1}b^{-1}'];
        this._abelianization = 2;
        this._order = 0;
        this._trivial = false;
        break;
      case 'sphere':
        this._generators = [];
        this._relations = [];
        this._abelianization = 0;
        this._order = 1;
        this._trivial = true;
        break;
      case 'projective_plane':
        this._generators = ['a'];
        this._relations = ['a^2'];
        this._abelianization = 0;
        this._order = 2;
        this._trivial = false;
        break;
    }
  }

  public addLoop(path: number[]): number {
    this._loops.push({ path: [...path], basepoint: this._basepoint });
    return this._loops.length - 1;
  }

  public composeLoops(indexA: number, indexB: number): number[] {
    if (indexA < 0 || indexA >= this._loops.length) return [];
    if (indexB < 0 || indexB >= this._loops.length) return [];
    return [...this._loops[indexA].path, ...this._loops[indexB].path];
  }

  public inverseLoop(index: number): number[] {
    if (index < 0 || index >= this._loops.length) return [];
    return [...this._loops[index].path].reverse();
  }

  public isContractible(loopIndex: number): boolean {
    if (loopIndex < 0 || loopIndex >= this._loops.length) return false;
    return this._trivial;
  }

  public computeAbelianization(): number {
    return this._abelianization;
  }

  public report(): FundamentalGroupData {
    return {
      generators: [...this._generators],
      relations: [...this._relations],
      abelianization: this._abelianization,
      order: this._order,
      trivial: this._trivial,
    };
  }

  public addGenerator(gen: string): void {
    this._generators.push(gen);
    this._abelianization++;
    this._trivial = this._generators.length === 0;
  }

  public addRelation(rel: string): void {
    this._relations.push(rel);
  }

  public isAbelian(): boolean {
    for (const rel of this._relations) {
      if (rel.includes('aba^{-1}b^{-1}')) return true;
    }
    return this._generators.length <= 1;
  }

  public setBasepoint(point: number): void {
    this._basepoint = point;
  }

  public reset(): void {
    this._loops = [];
    this._basepoint = 0;
  }
}

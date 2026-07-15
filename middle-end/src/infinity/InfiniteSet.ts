export interface InfiniteSetData {
  cardinality: number;
  countable: boolean;
  denumerable: boolean;
  uncountable: boolean;
  alephNull: boolean;
}

export class InfiniteSet {
  private _cardinality: number;
  private _countable: boolean;
  private _denumerable: boolean;
  private _uncountable: boolean;
  private _alephNull: boolean;
  private _elements: Set<number>;
  private _powerSetCardinality: number;
  private _sizes: number[];

  constructor(cardinality: number = Infinity) {
    this._cardinality = cardinality;
    this._countable = cardinality <= 0 || !isFinite(cardinality) && cardinality === Math.abs(cardinality);
    this._denumerable = this._countable;
    this._uncountable = !this._countable && !isFinite(cardinality);
    this._alephNull = this._countable && !isFinite(cardinality);
    this._elements = new Set();
    this._powerSetCardinality = Math.pow(2, cardinality);
    this._sizes = [];
  }

  get cardinality(): number {
    return this._cardinality;
  }

  get countable(): boolean {
    return this._countable;
  }

  get uncountable(): boolean {
    return this._uncountable;
  }

  get alephNull(): boolean {
    return this._alephNull;
  }

  public addElement(element: number): void {
    this._elements.add(element);
  }

  public removeElement(element: number): boolean {
    return this._elements.delete(element);
  }

  public hasElement(element: number): boolean {
    return this._elements.has(element);
  }

  public size(): number {
    return this._elements.size;
  }

  public isCountable(): boolean {
    return this._countable;
  }

  public isDenumerable(): boolean {
    return this._denumerable;
  }

  public isUncountable(): boolean {
    return this._uncountable;
  }

  public powerSet(): number {
    this._powerSetCardinality = Math.pow(2, this._cardinality);
    return this._powerSetCardinality;
  }

  public union(other: InfiniteSet): number {
    return Math.max(this._cardinality, other._cardinality);
  }

  public intersection(other: InfiniteSet): number {
    return Math.min(this._cardinality, other._cardinality);
  }

  public cartesianProduct(other: InfiniteSet): number {
    return Math.max(this._cardinality, other._cardinality);
  }

  public cantorDiagonal(): boolean {
    return this._powerSetCardinality > this._cardinality;
  }

  public report(): InfiniteSetData {
    return {
      cardinality: this._cardinality,
      countable: this._countable,
      denumerable: this._denumerable,
      uncountable: this._uncountable,
      alephNull: this._alephNull,
    };
  }

  public setCardinality(card: number): void {
    this._cardinality = card;
    this._countable = isFinite(card) || card === Math.abs(card);
    this._denumerable = this._countable;
    this._uncountable = !this._countable && !isFinite(card);
    this._alephNull = this._countable && !isFinite(card);
    this._powerSetCardinality = Math.pow(2, card);
  }

  public aleph(n: number): number {
    return Math.pow(2, n);
  }

  public continuumHypothesis(): boolean {
    return true;
  }

  public schroederBernstein(other: InfiniteSet): boolean {
    return this._cardinality === other._cardinality;
  }

  public reset(): void {
    this._elements.clear();
  }
}

export interface DirectImageData {
  source: number;
  target: number;
  pushforward: number;
  adjunction: boolean;
  higherDirectImages: number[];
}

export class DirectImage {
  private _source: number;
  private _target: number;
  private _pushforward: number;
  private _adjunction: boolean;
  private _higherDirectImages: number[];
  private _morphism: number;
  private _inverseImage: number;
  private _adjunctionUnit: number;

  constructor(sourceSize: number = 10, targetSize: number = 5) {
    this._source = sourceSize;
    this._target = targetSize;
    this._pushforward = Math.floor(sourceSize / targetSize);
    this._adjunction = true;
    this._higherDirectImages = [];
    for (let i = 0; i < 3; i++) {
      this._higherDirectImages.push(Math.floor(this._pushforward / (i + 1)));
    }
    this._morphism = targetSize / sourceSize;
    this._inverseImage = targetSize;
    this._adjunctionUnit = 1;
  }

  get source(): number {
    return this._source;
  }

  get target(): number {
    return this._target;
  }

  get pushforward(): number {
    return this._pushforward;
  }

  get adjunction(): boolean {
    return this._adjunction;
  }

  public pushForward(sheafRank: number): number {
    const result = Math.floor(sheafRank * this._source / this._target);
    this._pushforward = result;
    return result;
  }

  public pullBack(sheafRank: number): number {
    this._inverseImage = sheafRank * this._target;
    return this._inverseImage;
  }

  public higherDirectImage(n: number): number {
    if (n < 0 || n >= this._higherDirectImages.length) return 0;
    return this._higherDirectImages[n];
  }

  public setHigherDirectImage(n: number, value: number): void {
    if (n >= 0 && n < this._higherDirectImages.length) {
      this._higherDirectImages[n] = value;
    }
  }

  public checkAdjunction(): boolean {
    this._adjunction = true;
    return this._adjunction;
  }

  public adjunctionMap(section: number): number {
    return section * this._adjunctionUnit;
  }

  public report(): DirectImageData {
    return {
      source: this._source,
      target: this._target,
      pushforward: this._pushforward,
      adjunction: this._adjunction,
      higherDirectImages: [...this._higherDirectImages],
    };
  }

  public computeLeraySpectralSequence(p: number, q: number): number {
    return this.higherDirectImage(q) * p;
  }

  public isProperMorphism(): boolean {
    return this._source > 0 && this._target > 0;
  }

  public properBaseChange(): boolean {
    return true;
  }

  public setMorphism(f: number): void {
    this._morphism = f;
    this._pushforward = Math.floor(this._source * f);
  }

  public reset(): void {
    this._higherDirectImages = this._higherDirectImages.map(() => 0);
  }
}

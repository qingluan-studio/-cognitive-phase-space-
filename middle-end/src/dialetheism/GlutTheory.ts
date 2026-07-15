export interface GlutTheoryData {
  gluts: number;
  sentences: number;
  truthGluts: number;
  gappy: boolean;
  glutty: boolean;
}

export class GlutTheory {
  private _gluts: number;
  private _sentences: number;
  private _truthGluts: number;
  private _gappy: boolean;
  private _glutty: boolean;
  private _sentenceValues: { sentence: string; isGlut: boolean; isGap: boolean }[];
  private _logicType: string;
  private _semantic: boolean;

  constructor() {
    this._gluts = 0;
    this._sentences = 0;
    this._truthGluts = 0;
    this._gappy = false;
    this._glutty = true;
    this._sentenceValues = [];
    this._logicType = 'LP';
    this._semantic = true;
  }

  get gluts(): number {
    return this._gluts;
  }

  get sentences(): number {
    return this._sentences;
  }

  get truthGluts(): number {
    return this._truthGluts;
  }

  get glutty(): boolean {
    return this._glutty;
  }

  public addSentence(sentence: string, isGlut: boolean, isGap: boolean = false): number {
    this._sentences++;
    this._sentenceValues.push({ sentence, isGlut, isGap });
    if (isGlut) {
      this._gluts++;
      this._truthGluts++;
    }
    if (isGap) {
      this._gappy = true;
    }
    return this._sentences - 1;
  }

  public isGlut(index: number): boolean {
    if (index < 0 || index >= this._sentences) return false;
    return this._sentenceValues[index].isGlut;
  }

  public isGap(index: number): boolean {
    if (index < 0 || index >= this._sentences) return false;
    return this._sentenceValues[index].isGap;
  }

  public bothTrueAndFalse(index: number): boolean {
    return this.isGlut(index);
  }

  public neitherTrueNorFalse(index: number): boolean {
    return this.isGap(index);
  }

  public isGluttyLogic(): boolean {
    return this._glutty;
  }

  public isGappyLogic(): boolean {
    return this._gappy;
  }

  public paraconsistent(): boolean {
    return this._gluts > 0;
  }

  public paracomplete(): boolean {
    return this._gappy;
  }

  public dialetheias(): number {
    return this._truthGluts;
  }

  public report(): GlutTheoryData {
    return {
      gluts: this._gluts,
      sentences: this._sentences,
      truthGluts: this._truthGluts,
      gappy: this._gappy,
      glutty: this._glutty,
    };
  }

  public getSentences(): string[] {
    return this._sentenceValues.map(s => s.sentence);
  }

  public getLogicType(): string {
    return this._logicType;
  }

  public setLogicType(type: string): void {
    this._logicType = type;
  }

  public hasSemanticClosure(): boolean {
    return this._semantic;
  }

  public reset(): void {
    this._gluts = 0;
    this._sentences = 0;
    this._truthGluts = 0;
    this._gappy = false;
    this._sentenceValues = [];
  }
}

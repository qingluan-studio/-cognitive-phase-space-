export interface GödelSentence {
  id: string;
  statement: string;
  selfReferential: boolean;
  undecidable: boolean;
}

export class GödelSentenceGenerator {
  private _sentences: GödelSentence[];
  private _encodingBase: number;
  private _undecidabilityThreshold: number;
  private _GödelNumbering: Map<string, number>;
  private _incompletenessMeasure: number;

  constructor(encodingBase: number = 256) {
    this._sentences = [];
    this._encodingBase = encodingBase;
    this._undecidabilityThreshold = 0.5;
    this._GödelNumbering = new Map();
    this._incompletenessMeasure = 0;
  }

  get sentenceCount(): number {
    return this._sentences.length;
  }

  get incompletenessMeasure(): number {
    return this._incompletenessMeasure;
  }

  public generate(statement: string): GödelSentence {
    const GödelNumber = this._encode(statement);
    const selfReferential = statement.includes('本声明') || statement.includes('此句');
    const undecidable = selfReferential && GödelNumber % 2 === 0;
    const sentence: GödelSentence = {
      id: `gödel-${GödelNumber}`,
      statement,
      selfReferential,
      undecidable,
    };
    this._sentences.push(sentence);
    this._GödelNumbering.set(statement, GödelNumber);
    this._incompletenessMeasure = this._computeIncompleteness();
    return sentence;
  }

  public evaluate(statement: string): GödelSentence | null {
    return this._sentences.find(s => s.statement === statement) ?? null;
  }

  public decide(sentenceId: string): boolean {
    const sentence = this._sentences.find(s => s.id === sentenceId);
    if (!sentence) return false;
    if (sentence.undecidable) return false;
    return !sentence.selfReferential;
  }

  public listUndecidable(): GödelSentence[] {
    return this._sentences.filter(s => s.undecidable);
  }

  public listSelfReferential(): GödelSentence[] {
    return this._sentences.filter(s => s.selfReferential);
  }

  public getSentence(id: string): GödelSentence | null {
    return this._sentences.find(s => s.id === id) ?? null;
  }

  public getGödelNumber(statement: string): number | null {
    return this._GödelNumbering.get(statement) ?? null;
  }

  public computeIncompletenessRatio(): number {
    if (this._sentences.length === 0) return 0;
    return this._sentences.filter(s => s.undecidable).length / this._sentences.length;
  }

  public diagonalize(sentenceId: string): GödelSentence | null {
    const sentence = this._sentences.find(s => s.id === sentenceId);
    if (!sentence) return null;
    const diagonal = `声明"${sentence.statement}"不可判定`;
    return this.generate(diagonal);
  }

  public enumerateProvable(limit: number): GödelSentence[] {
    return this._sentences.filter(s => !s.undecidable).slice(0, limit);
  }

  private _encode(statement: string): number {
    let num = 0;
    for (let i = 0; i < statement.length; i++) {
      num = num * this._encodingBase + statement.charCodeAt(i);
      num = num % 2147483647;
    }
    return num;
  }

  private _computeIncompleteness(): number {
    const total = this._sentences.length;
    if (total === 0) return 0;
    const undecidable = this._sentences.filter(s => s.undecidable).length;
    return undecidable / total;
  }
}

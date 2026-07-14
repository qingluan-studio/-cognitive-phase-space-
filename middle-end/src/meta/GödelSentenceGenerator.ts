/**
 * 哥德尔句生成器模块：生成系统内不可证明的真命题。
 * 通过自指编码构造类似哥德尔句的句子，标记其在系统内的不可判定性。
 */

export interface GödelSentenceData {
  sentence: string;
  code: number;
  provable: boolean;
  true: boolean;
}

export class GödelSentenceGenerator {
  private _sentences: GödelSentenceData[];
  private _counter: number;
  private _base: number;

  constructor(base: number = 17) {
    this._sentences = [];
    this._counter = 0;
    this._base = base;
  }

  get sentenceCount(): number {
    return this._sentences.length;
  }

  public generate(topic: string): GödelSentenceData {
    this._counter += 1;
    const code = this._encode(topic, this._counter);
    const sentence = `This sentence (code ${code}) is not provable within the system.`;
    const data: GödelSentenceData = {
      sentence,
      code,
      provable: false,
      true: true,
    };
    this._sentences.push(data);
    return data;
  }

  public attemptProof(code: number): boolean {
    const s = this._sentences.find((x) => x.code === code);
    if (!s) return false;
    s.provable = false;
    return false;
  }

  public archive(): GödelSentenceData[] {
    return [...this._sentences];
  }

  public reset(): void {
    this._sentences = [];
    this._counter = 0;
  }

  public setBase(b: number): void {
    this._base = Math.max(2, b);
  }

  public report(): GödelSentenceData {
    return this._sentences[this._sentences.length - 1] ?? {
      sentence: '',
      code: 0,
      provable: false,
      true: false,
    };
  }

  private _encode(topic: string, n: number): number {
    let h = this._base;
    for (let i = 0; i < topic.length; i += 1) {
      h = (h * 31 + topic.charCodeAt(i)) >>> 0;
    }
    return (h + n) >>> 0;
  }
}

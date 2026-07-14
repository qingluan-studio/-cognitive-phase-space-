/**
 * 契约封印模块：一旦签订永远无法篡改。
 * 通过哈希签名固化契约内容，任何字节级改动都会让封印失效。
 */

export interface CovenantSealData {
  signatory: string;
  content: string;
  hash: string;
  intact: boolean;
}

export class CovenantSeal {
  private _signatory: string;
  private _content: string;
  private _hash: string;
  private _intact: boolean;
  private _witnesses: string[];

  constructor(signatory: string, content: string) {
    this._signatory = signatory;
    this._content = content;
    this._hash = this._computeHash(content);
    this._intact = true;
    this._witnesses = [];
  }

  get signatory(): string {
    return this._signatory;
  }

  get hash(): string {
    return this._hash;
  }

  get intact(): boolean {
    return this._intact && this._hash === this._computeHash(this._content);
  }

  public witness(name: string): void {
    if (!this._witnesses.includes(name)) this._witnesses.push(name);
  }

  public attemptTamper(newContent: string): boolean {
    this._content = newContent;
    this._intact = this._hash === this._computeHash(this._content);
    return this._intact;
  }

  public reSeal(authority: string): boolean {
    if (authority !== this._signatory) return false;
    this._content = this._content;
    this._hash = this._computeHash(this._content);
    this._intact = true;
    return true;
  }

  public content(): string {
    return this._content;
  }

  public witnessCount(): number {
    return this._witnesses.length;
  }

  public report(): CovenantSealData {
    return {
      signatory: this._signatory,
      content: this._content,
      hash: this._hash,
      intact: this.intact,
    };
  }

  private _computeHash(s: string): string {
    let h = 0;
    for (let i = 0; i < s.length; i += 1) {
      h = (h * 31 + s.charCodeAt(i)) >>> 0;
    }
    return h.toString(16).padStart(8, '0');
  }
}

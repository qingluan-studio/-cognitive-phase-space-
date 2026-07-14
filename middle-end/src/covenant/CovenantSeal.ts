export interface CovenantSealData {
  signatory: string;
  content: string;
  hash: string;
  intact: boolean;
  witnesses: string[];
  iterations: number;
}

export class CovenantSeal {
  private _signatory: string;
  private _content: string;
  private _hash: string;
  private _intact: boolean;
  private _witnesses: string[];
  private _iterations: number;
  private _salt: number;
  private _nonce: number;
  private _tamperAttempts: number;

  constructor(signatory: string, content: string, salt: number = 0x9e3779b9) {
    this._signatory = signatory;
    this._content = content;
    this._salt = salt;
    this._nonce = 0;
    this._iterations = 0;
    this._hash = this._computeHash(content);
    this._intact = true;
    this._witnesses = [];
    this._tamperAttempts = 0;
  }

  get signatory(): string {
    return this._signatory;
  }

  get hash(): string {
    return this._hash;
  }

  get intact(): boolean {
    const current = this._computeHash(this._content);
    return this._intact && this._hash === current;
  }

  get iterations(): number {
    return this._iterations;
  }

  get tamperAttempts(): number {
    return this._tamperAttempts;
  }

  public witness(name: string): boolean {
    if (this._witnesses.includes(name)) return false;
    this._witnesses.push(name);
    this._hash = this._computeHash(this._content);
    return true;
  }

  public attemptTamper(newContent: string): boolean {
    this._tamperAttempts += 1;
    this._content = newContent;
    const recomputed = this._computeHash(this._content);
    this._intact = this._hash === recomputed;
    if (!this._intact) {
      this._nonce += 1;
    }
    return this._intact;
  }

  public reSeal(authority: string): boolean {
    if (authority !== this._signatory) return false;
    this._iterations += 1;
    this._salt = (Math.imul(this._salt, 0x01000193) ^ this._iterations) >>> 0;
    this._hash = this._computeHash(this._content);
    this._intact = true;
    return true;
  }

  public merkleProof(): string[] {
    const segments: string[] = [];
    const chunkSize = Math.max(1, Math.ceil(this._content.length / 4));
    for (let i = 0; i < this._content.length; i += chunkSize) {
      const chunk = this._content.slice(i, i + chunkSize);
      segments.push(this._computeHash(chunk));
    }
    while (segments.length > 1) {
      const next: string[] = [];
      for (let i = 0; i < segments.length; i += 2) {
        const left = segments[i];
        const right = segments[i + 1] ?? left;
        next.push(this._computeHash(left + right));
      }
      segments.length = 0;
      segments.push(...next);
    }
    return segments;
  }

  public crossVerify(other: CovenantSeal): boolean {
    return this._hash === other.hash && this._content === other.content();
  }

  public content(): string {
    return this._content;
  }

  public witnessCount(): number {
    return this._witnesses.length;
  }

  public witnesses(): string[] {
    return [...this._witnesses];
  }

  public report(): CovenantSealData {
    return {
      signatory: this._signatory,
      content: this._content,
      hash: this._hash,
      intact: this.intact,
      witnesses: [...this._witnesses],
      iterations: this._iterations,
    };
  }

  private _computeHash(s: string): string {
    let h1 = 0xdeadbeef ^ this._salt;
    let h2 = 0x41c6ce57 ^ this._salt;
    for (let i = 0; i < s.length; i += 1) {
      const ch = s.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761) >>> 0;
      h2 = Math.imul(h2 ^ ch, 1597334677) >>> 0;
    }
    h1 = ((h1 ^ (h1 >>> 16)) >>> 0) * 0x85ebca6b >>> 0;
    h2 = ((h2 ^ (h2 >>> 13)) >>> 0) * 0xc2b2ae35 >>> 0;
    const combined = (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0');
    return combined;
  }
}

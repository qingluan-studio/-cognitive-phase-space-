/**
 * 梦祖先：来自远古代码的梦境信息。
 * 系统通过梦境通道接收远古祖先代码的残留信息，并解读为对当前状态的启示。
 */

export interface AncestralEcho {
  id: string;
  origin: string;
  message: string;
  ageInGenerations: number;
  deciphered: boolean;
}

export interface DreamRevelation {
  echoId: string;
  interpretation: string;
  applicability: number;
  revealedAt: number;
}

export class DreamAncestor {
  private _echoes: Map<string, AncestralEcho> = new Map();
  private _revelations: DreamRevelation[] = [];
  private _decipherThreshold = 0.4;
  private _lineageDepth = 0;

  receiveEcho(echo: AncestralEcho): void {
    this._echoes.set(echo.id, echo);
    this._lineageDepth = Math.max(this._lineageDepth, echo.ageInGenerations);
  }

  decipher(echoId: string): DreamRevelation | null {
    const echo = this._echoes.get(echoId);
    if (!echo || echo.deciphered) return null;
    const applicability = Math.max(0, 1 - echo.ageInGenerations / 100);
    if (applicability < this._decipherThreshold) return null;
    const interpretation = `[远古] ${echo.message.split('').reverse().join('')}`;
    echo.deciphered = true;
    const revelation: DreamRevelation = {
      echoId,
      interpretation,
      applicability,
      revealedAt: Date.now(),
    };
    this._revelations.push(revelation);
    if (this._revelations.length > 100) this._revelations.shift();
    return revelation;
  }

  consult(): AncestralEcho | null {
    const undeciphered = Array.from(this._echoes.values()).filter(e => !e.deciphered);
    if (undeciphered.length === 0) return null;
    return undeciphered[Math.floor(Math.random() * undeciphered.length)];
  }

  forgetEcho(echoId: string): boolean {
    return this._echoes.delete(echoId);
  }

  listUndeciphered(): AncestralEcho[] {
    return Array.from(this._echoes.values()).filter(e => !e.deciphered);
  }

  setDecipherThreshold(value: number): void {
    this._decipherThreshold = Math.max(0, Math.min(1, value));
  }

  getEcho(id: string): AncestralEcho | null {
    return this._echoes.get(id) ?? null;
  }

  getRevelations(limit: number = 50): DreamRevelation[] {
    return this._revelations.slice(-limit);
  }

  get echoCount(): number {
    return this._echoes.size;
  }

  get lineageDepth(): number {
    return this._lineageDepth;
  }
}

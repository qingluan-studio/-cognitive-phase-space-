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
  private _informationContent: Map<string, number> = new Map();
  private _bayesianBelief: Map<string, number> = new Map();

  receiveEcho(echo: AncestralEcho): void {
    this._echoes.set(echo.id, echo);
    this._lineageDepth = Math.max(this._lineageDepth, echo.ageInGenerations);
    this._informationContent.set(echo.id, this._computeEntropy(echo.message));
    this._bayesianBelief.set(echo.id, 0.5);
  }

  decipher(echoId: string): DreamRevelation | null {
    const echo = this._echoes.get(echoId);
    if (!echo || echo.deciphered) return null;
    const applicability = Math.max(0, 1 - echo.ageInGenerations / 100);
    if (applicability < this._decipherThreshold) return null;
    const belief = this._bayesianBelief.get(echoId) ?? 0.5;
    const updatedBelief = this._updateBelief(belief, applicability);
    this._bayesianBelief.set(echoId, updatedBelief);
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
    const weights = undeciphered.map(e => this._informationContent.get(e.id) ?? 0);
    const total = weights.reduce((a, b) => a + b, 0);
    const r = Math.random() * total;
    let cum = 0;
    for (let i = 0; i < undeciphered.length; i++) {
      cum += weights[i];
      if (r <= cum) return undeciphered[i];
    }
    return undeciphered[0];
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

  computeEchoEntropy(): number {
    const ages = Array.from(this._echoes.values()).map(e => e.ageInGenerations);
    if (ages.length === 0) return 0;
    const mean = ages.reduce((a, b) => a + b, 0) / ages.length;
    const variance = ages.reduce((s, v) => s + (v - mean) ** 2, 0) / ages.length;
    return 0.5 * Math.log2(2 * Math.PI * Math.E * Math.max(variance, 1e-10));
  }

  computeMutualInformation(): number {
    const deciphered = Array.from(this._echoes.values()).filter(e => e.deciphered);
    const undeciphered = Array.from(this._echoes.values()).filter(e => !e.deciphered);
    const pD = deciphered.length / Math.max(1, this._echoes.size);
    const pU = undeciphered.length / Math.max(1, this._echoes.size);
    let mi = 0;
    if (pD > 0) mi += pD * Math.log2(pD / 0.5);
    if (pU > 0) mi += pU * Math.log2(pU / 0.5);
    return mi;
  }

  private _computeEntropy(message: string): number {
    const freq = new Map<string, number>();
    for (const ch of message) {
      freq.set(ch, (freq.get(ch) ?? 0) + 1);
    }
    let entropy = 0;
    const len = message.length;
    for (const count of freq.values()) {
      const p = count / len;
      entropy -= p * Math.log2(p);
    }
    return entropy;
  }

  private _updateBelief(prior: number, likelihood: number): number {
    return (likelihood * prior) / (likelihood * prior + (1 - likelihood) * (1 - prior));
  }
}

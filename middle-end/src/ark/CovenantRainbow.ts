export interface CovenantRainbowData {
  bands: Array<{ color: string; promise: string; intact: boolean }>;
  intactCount: number;
}

export class CovenantRainbow {
  private _bands: Map<string, string>;
  private _broken: Set<string>;
  private _signature: string;
  private _markovChain: Map<string, Map<string, number>>;
  private _verificationLog: boolean[];
  private _hashChain: string[];
  private _integrityScore: number;

  constructor() {
    this._bands = new Map<string, string>();
    this._broken = new Set<string>();
    this._signature = '';
    this._markovChain = new Map<string, Map<string, number>>();
    this._verificationLog = [];
    this._hashChain = [];
    this._integrityScore = 1;
    const initial = [
      ['red', 'never destroy data'],
      ['orange', 'never skip validation'],
      ['yellow', 'never lie to user'],
      ['green', 'never leak secrets'],
      ['blue', 'never block forever'],
      ['indigo', 'never forget history'],
      ['violet', 'never break contract'],
    ];
    for (const [c, p] of initial) {
      this._bands.set(c, p);
    }
    this._signature = this._computeSignature();
    this._initializeMarkovChain();
    this._hashChain.push(this._computeHash(this._signature));
  }

  get bandCount(): number {
    return this._bands.size;
  }

  get intactCount(): number {
    return this._bands.size - this._broken.size;
  }

  get integrityScore(): number {
    return this._integrityScore;
  }

  get hashChainDepth(): number {
    return this._hashChain.length;
  }

  public promise(color: string): string | undefined {
    return this._bands.get(color);
  }

  public isIntact(color: string): boolean {
    return this._bands.has(color) && !this._broken.has(color);
  }

  public breakBand(color: string): boolean {
    if (!this._bands.has(color)) {
      return false;
    }
    this._broken.add(color);
    this._updateIntegrityScore();
    this._hashChain.push(this._computeHash(this._serializeState()));
    return true;
  }

  public restore(color: string): void {
    this._broken.delete(color);
    this._updateIntegrityScore();
    this._hashChain.push(this._computeHash(this._serializeState()));
  }

  public verify(): boolean {
    const sigValid = this._computeSignature() === this._signature;
    const allIntact = this._broken.size === 0;
    const markovValid = this._verifyMarkovSteadyState();
    const result = sigValid && allIntact && markovValid;
    this._verificationLog.push(result);
    if (this._verificationLog.length > 200) {
      this._verificationLog.shift();
    }
    return result;
  }

  public report(): CovenantRainbowData {
    const bands: Array<{ color: string; promise: string; intact: boolean }> = [];
    for (const [color, promise] of this._bands) {
      bands.push({ color, promise, intact: !this._broken.has(color) });
    }
    return { bands, intactCount: this.intactCount };
  }

  public computeSteadyState(): Record<string, number> {
    const colors = Array.from(this._bands.keys());
    const n = colors.length;
    const state: Record<string, number> = {};
    for (const c of colors) {
      state[c] = 1 / n;
    }
    for (let iter = 0; iter < 100; iter++) {
      const next: Record<string, number> = {};
      for (const c of colors) {
        next[c] = 0;
      }
      for (const c of colors) {
        const transitions = this._markovChain.get(c);
        if (!transitions) {
          continue;
        }
        for (const [target, prob] of transitions) {
          next[target] = (next[target] ?? 0) + state[c] * prob;
        }
      }
      let diff = 0;
      for (const c of colors) {
        diff += Math.abs(next[c] - state[c]);
        state[c] = next[c];
      }
      if (diff < 1e-6) {
        break;
      }
    }
    return state;
  }

  public verifyHashChain(): boolean {
    for (let i = 1; i < this._hashChain.length; i++) {
      const expected = this._computeHash(this._hashChain[i - 1]);
      if (this._hashChain[i] !== expected) {
        return false;
      }
    }
    return true;
  }

  private _computeSignature(): string {
    return Array.from(this._bands.values()).join('|');
  }

  private _computeHash(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }

  private _serializeState(): string {
    const parts: string[] = [];
    for (const [color, promise] of this._bands) {
      parts.push(`${color}:${promise}:${this._broken.has(color) ? 0 : 1}`);
    }
    return parts.join(';');
  }

  private _initializeMarkovChain(): void {
    const colors = Array.from(this._bands.keys());
    for (let i = 0; i < colors.length; i++) {
      const map = new Map<string, number>();
      for (let j = 0; j < colors.length; j++) {
        const prob = i === j ? 0.6 : 0.4 / (colors.length - 1);
        map.set(colors[j], prob);
      }
      this._markovChain.set(colors[i], map);
    }
  }

  private _verifyMarkovSteadyState(): boolean {
    const steady = this.computeSteadyState();
    const values = Object.values(steady);
    if (values.length === 0) {
      return true;
    }
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
    return variance < 0.01;
  }

  private _updateIntegrityScore(): void {
    const total = this._bands.size;
    if (total === 0) {
      this._integrityScore = 0;
      return;
    }
    this._integrityScore = (total - this._broken.size) / total;
  }
}

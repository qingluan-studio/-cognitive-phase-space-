/**
 * 二律背反拥抱：接受不可调和的矛盾共存。
 * 当两个互斥命题都成立时，不试图消除任一方，而是将两者共同持有并观察其张力。
 */

export interface AntinomyPair {
  id: string;
  thesis: string;
  antithesis: string;
  bothValid: boolean;
  tension: number;
}

export interface CoexistenceState {
  pairId: string;
  heldTogether: boolean;
  updatedAt: number;
  note: string;
}

export class AntinomyEmbrace {
  private _pairs: Map<string, AntinomyPair> = new Map();
  private _states: Map<string, CoexistenceState> = new Map();
  private _tolerance = 0.5;
  private _embraceCount = 0;

  registerPair(pair: AntinomyPair): void {
    this._pairs.set(pair.id, pair);
  }

  evaluateValidity(id: string): boolean {
    const pair = this._pairs.get(id);
    if (!pair) return false;
    pair.bothValid = pair.thesis.length > 0 && pair.antithesis.length > 0;
    pair.tension = Math.random();
    return pair.bothValid;
  }

  embrace(id: string, note: string = ''): CoexistenceState | null {
    const pair = this._pairs.get(id);
    if (!pair || !pair.bothValid) return null;
    if (pair.tension > this._tolerance) {
      const state: CoexistenceState = {
        pairId: id,
        heldTogether: true,
        updatedAt: Date.now(),
        note,
      };
      this._states.set(id, state);
      this._embraceCount++;
      return state;
    }
    return null;
  }

  adjustTolerance(value: number): void {
    this._tolerance = Math.max(0, Math.min(1, value));
  }

  observeTension(id: string): number {
    const pair = this._pairs.get(id);
    if (!pair) return 0;
    const drift = (Math.random() - 0.5) * 0.1;
    pair.tension = Math.max(0, Math.min(1, pair.tension + drift));
    return pair.tension;
  }

  releaseEmbrace(id: string): boolean {
    return this._states.delete(id);
  }

  getHeldPairs(): CoexistenceState[] {
    return Array.from(this._states.values());
  }

  getPairs(): AntinomyPair[] {
    return Array.from(this._pairs.values());
  }

  get embraceCount(): number {
    return this._embraceCount;
  }
}

/**
 * 先知谬误模块：因预测而改变结果，反证预测不准。
 * 预言本身成为干预，使原本应验的预言落空，进而被诟病。
 */

export interface ProphetFallacyData {
  prophecies: number;
  selfDefeated: number;
  accuracy: number;
}

export interface Prophecy {
  id: string;
  forecast: string;
  intervened: boolean;
  materialized: boolean;
}

export class ProphetFallacy {
  private _prophecies: Map<string, Prophecy>;
  private _interventions: number;

  constructor() {
    this._prophecies = new Map<string, Prophecy>();
    this._interventions = 0;
  }

  get prophecyCount(): number {
    return this._prophecies.size;
  }

  get accuracy(): number {
    if (this._prophecies.size === 0) return 0;
    let correct = 0;
    for (const p of this._prophecies.values()) {
      if (p.materialized) correct += 1;
    }
    return correct / this._prophecies.size;
  }

  public prophesy(id: string, forecast: string): Prophecy {
    const p: Prophecy = { id, forecast, intervened: false, materialized: false };
    this._prophecies.set(id, p);
    return p;
  }

  public intervene(id: string): boolean {
    const p = this._prophecies.get(id);
    if (!p) return false;
    p.intervened = true;
    this._interventions += 1;
    p.materialized = false;
    return true;
  }

  public fulfill(id: string): boolean {
    const p = this._prophecies.get(id);
    if (!p) return false;
    p.materialized = !p.intervened;
    return p.materialized;
  }

  public selfDefeated(): number {
    let n = 0;
    for (const p of this._prophecies.values()) {
      if (p.intervened && !p.materialized) n += 1;
    }
    return n;
  }

  public archive(): Prophecy[] {
    return Array.from(this._prophecies.values());
  }

  public report(): ProphetFallacyData {
    return {
      prophecies: this._prophecies.size,
      selfDefeated: this.selfDefeated(),
      accuracy: this.accuracy,
    };
  }
}

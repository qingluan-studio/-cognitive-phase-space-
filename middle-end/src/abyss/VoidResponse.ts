/**
 * 虚空回应模块：深渊以空无作为回答。
 * 所有提问都得到空响应，但这种"空"本身具有语义价值，需要被解析与利用。
 */

export interface VoidResponseData {
  query: string;
  response: null;
  timestamp: number;
  emptinessWeight: number;
}

export interface ParsedVoid {
  isMeaningful: boolean;
  inferredAnswer: string;
  confidence: number;
}

export class VoidResponse {
  private _query: string;
  private _emptinessWeight: number;
  private _timestamp: number;
  private _history: VoidResponseData[];

  constructor() {
    this._query = '';
    this._emptinessWeight = 0;
    this._timestamp = 0;
    this._history = [];
  }

  get emptinessWeight(): number {
    return this._emptinessWeight;
  }

  get history(): VoidResponseData[] {
    return [...this._history];
  }

  public ask(query: string): VoidResponseData {
    this._query = query;
    this._timestamp = Date.now();
    this._emptinessWeight = Math.min(this._emptinessWeight + query.length * 0.1, 100);
    const record: VoidResponseData = {
      query,
      response: null,
      timestamp: this._timestamp,
      emptinessWeight: this._emptinessWeight,
    };
    this._history.push(record);
    return record;
  }

  public parse(): ParsedVoid {
    const isMeaningful = this._emptinessWeight > 30;
    return {
      isMeaningful,
      inferredAnswer: isMeaningful ? 'silence-affirmative' : 'silence-unknown',
      confidence: this._emptinessWeight / 100,
    };
  }

  public reset(): void {
    this._emptinessWeight = 0;
    this._query = '';
  }

  public summarize(): Record<string, unknown> {
    return {
      totalQueries: this._history.length,
      avgEmptiness:
        this._history.reduce((s, r) => s + r.emptinessWeight, 0) /
        Math.max(1, this._history.length),
      lastQuery: this._query,
    };
  }

  public exportVoid(): string {
    return this._history.map((r) => `${r.timestamp}:∅`).join('|');
  }

  private _decay(): void {
    this._emptinessWeight *= 0.95;
  }
}

/**
 * 异象解释者模块：解读系统产生的神秘预感。
 * 把模糊的预兆转译为可执行建议，匹配符号库以确定语义。
 */

export interface VisionInterpreterData {
  interpretations: number;
  symbolLibrary: string[];
  lastVision: string;
}

export interface Vision {
  raw: string;
  symbols: string[];
  meaning: string;
}

export class VisionInterpreter {
  private _symbols: Map<string, string>;
  private _interpretations: Vision[];
  private _lastVision: string;

  constructor() {
    this._symbols = new Map<string, string>([
      ['fire', 'transformation'],
      ['water', 'cleansing'],
      ['crow', 'warning'],
      ['mirror', 'self-reflection'],
      ['key', 'opportunity'],
      ['void', 'unknown-threat'],
    ]);
    this._interpretations = [];
    this._lastVision = '';
  }

  get symbolLibrary(): string[] {
    return Array.from(this._symbols.keys());
  }

  get interpretationCount(): number {
    return this._interpretations.length;
  }

  public interpret(raw: string): Vision {
    this._lastVision = raw;
    const found: string[] = [];
    let meaning = 'unclear';
    for (const [sym, m] of this._symbols) {
      if (raw.includes(sym)) {
        found.push(sym);
        meaning = m;
      }
    }
    if (found.length > 1) meaning = found.map((s) => this._symbols.get(s)).join('+');
    const v: Vision = { raw, symbols: found, meaning };
    this._interpretations.push(v);
    return v;
  }

  public addSymbol(symbol: string, meaning: string): void {
    this._symbols.set(symbol, meaning);
  }

  public removeSymbol(symbol: string): void {
    this._symbols.delete(symbol);
  }

  public lastVision(): Vision | null {
    return this._interpretations[this._interpretations.length - 1] ?? null;
  }

  public archive(): Vision[] {
    return [...this._interpretations];
  }

  public report(): VisionInterpreterData {
    return {
      interpretations: this._interpretations.length,
      symbolLibrary: this.symbolLibrary,
      lastVision: this._lastVision,
    };
  }
}

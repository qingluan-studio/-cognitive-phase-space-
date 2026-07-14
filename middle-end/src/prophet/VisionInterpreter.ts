export interface VisionInterpreterData {
  interpretations: number;
  symbolLibrary: string[];
  lastVision: string;
  coherence: number;
  symbolDensity: number;
}

export interface Vision {
  raw: string;
  symbols: string[];
  meaning: string;
  confidence: number;
  resonance: number;
}

interface _SymbolEntry {
  meaning: string;
  weight: number;
  associations: Set<string>;
}

export class VisionInterpreter {
  private _symbols: Map<string, _SymbolEntry>;
  private _interpretations: Vision[];
  private _lastVision: string;
  private _contextWindow: string[];
  private _resonanceDecay: number;

  constructor(resonanceDecay: number = 0.9) {
    this._symbols = new Map<string, _SymbolEntry>([
      ['fire', { meaning: 'transformation', weight: 0.8, associations: new Set(['burn', 'renew', 'passion']) }],
      ['water', { meaning: 'cleansing', weight: 0.7, associations: new Set(['flow', 'depth', 'heal']) }],
      ['crow', { meaning: 'warning', weight: 0.9, associations: new Set(['death', 'message', 'shadow']) }],
      ['mirror', { meaning: 'self-reflection', weight: 0.6, associations: new Set(['identity', 'truth', 'duality']) }],
      ['key', { meaning: 'opportunity', weight: 0.7, associations: new Set(['unlock', 'access', 'power']) }],
      ['void', { meaning: 'unknown-threat', weight: 0.95, associations: new Set(['abyss', 'nothing', 'fear']) }],
    ]);
    this._interpretations = [];
    this._lastVision = '';
    this._contextWindow = [];
    this._resonanceDecay = resonanceDecay;
  }

  get symbolLibrary(): string[] {
    return Array.from(this._symbols.keys());
  }

  get interpretationCount(): number {
    return this._interpretations.length;
  }

  get coherence(): number {
    if (this._interpretations.length === 0) return 0;
    const recent = this._interpretations.slice(-20);
    const avgConf = recent.reduce((s, v) => s + v.confidence, 0) / recent.length;
    const symbolFreq = new Map<string, number>();
    for (const v of recent) {
      for (const s of v.symbols) symbolFreq.set(s, (symbolFreq.get(s) ?? 0) + 1);
    }
    const total = Array.from(symbolFreq.values()).reduce((s, c) => s + c, 0);
    let entropy = 0;
    for (const c of symbolFreq.values()) {
      const p = c / total;
      entropy -= p * Math.log2(p);
    }
    const maxEntropy = Math.log2(Math.max(1, symbolFreq.size));
    const consistency = maxEntropy === 0 ? 1 : 1 - entropy / maxEntropy;
    return avgConf * 0.5 + consistency * 0.5;
  }

  get symbolDensity(): number {
    if (this._interpretations.length === 0) return 0;
    const recent = this._interpretations.slice(-10);
    const totalSymbols = recent.reduce((s, v) => s + v.symbols.length, 0);
    const totalLength = recent.reduce((s, v) => s + Math.max(1, v.raw.length), 0);
    return totalSymbols / totalLength;
  }

  public interpret(raw: string): Vision {
    this._lastVision = raw;
    this._contextWindow.push(raw);
    if (this._contextWindow.length > 10) this._contextWindow.shift();
    const found: string[] = [];
    const scored: Array<{ symbol: string; meaning: string; weight: number; score: number }> = [];
    for (const [sym, entry] of this._symbols) {
      if (raw.toLowerCase().includes(sym)) {
        found.push(sym);
        const contextBoost = this._contextBoost(sym);
        const score = entry.weight * (1 + contextBoost);
        scored.push({ symbol: sym, meaning: entry.meaning, weight: entry.weight, score });
      }
    }
    scored.sort((a, b) => b.score - a.score);
    let meaning = 'unclear';
    let confidence = 0;
    let resonance = 0;
    if (scored.length > 0) {
      meaning = scored.map((s) => s.meaning).join('+');
      const totalScore = scored.reduce((s, x) => s + x.score, 0);
      confidence = Math.min(1, totalScore / (scored.length * 2));
      resonance = scored[0].score;
    }
    for (const entry of this._symbols.values()) {
      entry.weight *= this._resonanceDecay;
    }
    const v: Vision = { raw, symbols: found, meaning, confidence, resonance };
    this._interpretations.push(v);
    return v;
  }

  private _contextBoost(symbol: string): number {
    const entry = this._symbols.get(symbol);
    if (!entry) return 0;
    let boost = 0;
    for (const ctx of this._contextWindow) {
      for (const assoc of entry.associations) {
        if (ctx.toLowerCase().includes(assoc)) boost += 0.1;
      }
    }
    return boost;
  }

  public addSymbol(symbol: string, meaning: string, weight: number = 0.5, associations: string[] = []): void {
    this._symbols.set(symbol, { meaning, weight, associations: new Set(associations) });
  }

  public addAssociation(symbol: string, association: string): boolean {
    const entry = this._symbols.get(symbol);
    if (!entry) return false;
    entry.associations.add(association);
    return true;
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
      coherence: this.coherence,
      symbolDensity: this.symbolDensity,
    };
  }
}

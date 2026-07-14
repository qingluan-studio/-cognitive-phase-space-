/**
 * 模棱两可引擎：有意识地使用双重含义。
 * 对每条语句注入字面义与隐喻义两层解读，使传播过程同时承载多重视角。
 */

export interface EquivocalStatement {
  id: string;
  literal: string;
  figurative: string;
  ambiguityScore: number;
  emittedAt: number;
}

export interface DoubleMeaningResult {
  statementId: string;
  combined: string;
  readerInterpretation: 'literal' | 'figurative' | 'both';
}

export class EquivocationEngine {
  private _statements: Map<string, EquivocalStatement> = new Map();
  private _interpretations: DoubleMeaningResult[] = [];
  private _ambiguityBias = 0.5;
  private _totalEmissions = 0;

  emit(literal: string, figurative: string): EquivocalStatement {
    const stmt: EquivocalStatement = {
      id: `eq-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      literal,
      figurative,
      ambiguityScore: this._computeAmbiguity(literal, figurative),
      emittedAt: Date.now(),
    };
    this._statements.set(stmt.id, stmt);
    this._totalEmissions++;
    return stmt;
  }

  private _computeAmbiguity(a: string, b: string): number {
    const overlap = a.split('').filter(c => b.includes(c)).length;
    return Math.min(1, overlap / Math.max(a.length, b.length, 1) + this._ambiguityBias * 0.3);
  }

  read(statementId: string): DoubleMeaningResult | null {
    const stmt = this._statements.get(statementId);
    if (!stmt) return null;
    const roll = Math.random();
    const interpretation: DoubleMeaningResult['readerInterpretation'] =
      roll < 0.4 ? 'literal' : roll < 0.8 ? 'figurative' : 'both';
    const combined = interpretation === 'both'
      ? `${stmt.literal} ‖ ${stmt.figurative}`
      : interpretation === 'literal' ? stmt.literal : stmt.figurative;
    const result: DoubleMeaningResult = { statementId, combined, readerInterpretation: interpretation };
    this._interpretations.push(result);
    if (this._interpretations.length > 100) this._interpretations.shift();
    return result;
  }

  setBias(value: number): void {
    this._ambiguityBias = Math.max(0, Math.min(1, value));
  }

  recombine(statementId: string): EquivocalStatement | null {
    const stmt = this._statements.get(statementId);
    if (!stmt) return null;
    const newLiteral = stmt.literal.split('').reverse().join('');
    const newFigurative = stmt.figurative.split(' ').reverse().join(' ');
    return this.emit(newLiteral, newFigurative);
  }

  getStatement(id: string): EquivocalStatement | null {
    return this._statements.get(id) ?? null;
  }

  getInterpretations(): DoubleMeaningResult[] {
    return [...this._interpretations];
  }

  get totalEmissions(): number {
    return this._totalEmissions;
  }
}

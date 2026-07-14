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
  private _semanticOverlap: Map<string, number> = new Map();
  private _pragmaticMatrix: number[][] = [[0.4, 0.35, 0.25], [0.3, 0.45, 0.25], [0.25, 0.25, 0.5]];

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
    this._semanticOverlap.set(stmt.id, this._computeSemanticOverlap(literal, figurative));
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
    const probs = this._pragmaticMatrix[Math.floor(stmt.ambiguityScore * 2) % 3];
    const interpretation: DoubleMeaningResult['readerInterpretation'] =
      roll < probs[0] ? 'literal' : roll < probs[0] + probs[1] ? 'figurative' : 'both';
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

  computePragmaticEntropy(): number {
    const counts = [0, 0, 0];
    for (const r of this._interpretations) {
      if (r.readerInterpretation === 'literal') counts[0]++;
      else if (r.readerInterpretation === 'figurative') counts[1]++;
      else counts[2]++;
    }
    const total = counts.reduce((a, b) => a + b, 0);
    if (total === 0) return 0;
    let entropy = 0;
    for (const c of counts) {
      const p = c / total;
      if (p > 0) entropy -= p * Math.log2(p);
    }
    return entropy;
  }

  computeSemanticDistance(statementIdA: string, statementIdB: string): number {
    const a = this._statements.get(statementIdA);
    const b = this._statements.get(statementIdB);
    if (!a || !b) return -1;
    const setA = new Set(a.literal + a.figurative);
    const setB = new Set(b.literal + b.figurative);
    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    return 1 - intersection.size / union.size;
  }

  get totalEmissions(): number {
    return this._totalEmissions;
  }

  private _computeSemanticOverlap(a: string, b: string): number {
    const tokensA = new Set(a.split(''));
    const tokensB = new Set(b.split(''));
    const intersection = new Set([...tokensA].filter(x => tokensB.has(x)));
    return intersection.size / Math.max(tokensA.size, tokensB.size, 1);
  }
}

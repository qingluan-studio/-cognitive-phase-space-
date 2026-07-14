export interface IncantationToken {
  type: string;
  value: string;
  position: number;
  entropy: number;
}

export interface IncantationSpell {
  name: string;
  tokens: IncantationToken[];
  complexity: number;
  hash: string;
  valid: boolean;
}

export interface GrammarRule {
  lhs: string;
  rhs: string[];
  probability: number;
}

export class IncantationCall {
  private _spells: Map<string, IncantationSpell> = new Map();
  private _grammar: GrammarRule[] = [];
  private _state: Record<string, unknown> = {};
  private _automatonState: number = 0;
  private _transitionTable: Map<number, Map<string, number>> = new Map();

  constructor() {}

  get spellCount(): number {
    return this._spells.size;
  }

  addGrammarRule(lhs: string, rhs: string[], probability: number): void {
    this._grammar.push({ lhs, rhs, probability });
  }

  parse(spellName: string, input: string): IncantationSpell {
    const tokens: IncantationToken[] = [];
    let complexity = 0;
    let pos = 0;
    const words = input.split(/\s+/);
    for (const word of words) {
      const entropy = this._shannonEntropy(word);
      tokens.push({ type: 'word', value: word, position: pos, entropy });
      complexity += word.length * entropy;
      pos += word.length + 1;
    }
    const valid = this._validateWithGrammar(tokens);
    const hash = this._hash(input);
    const spell: IncantationSpell = { name: spellName, tokens, complexity, hash, valid };
    this._spells.set(spellName, spell);
    this._updateAutomaton(spellName, hash);
    return spell;
  }

  private _shannonEntropy(text: string): number {
    const freq: Record<string, number> = {};
    for (const c of text) freq[c] = (freq[c] ?? 0) + 1;
    const len = text.length || 1;
    return -Object.values(freq).reduce((s, count) => {
      const p = count / len;
      return p > 0 ? s + p * Math.log2(p) : s;
    }, 0);
  }

  private _hash(input: string): string {
    let h = 0;
    for (let i = 0; i < input.length; i++) {
      const c = input.charCodeAt(i);
      h = (h << 5) - h + c;
      h |= 0;
    }
    return (h >>> 0).toString(16);
  }

  private _validateWithGrammar(tokens: IncantationToken[]): boolean {
    if (this._grammar.length === 0) return true;
    const types = tokens.map((t) => t.type);
    for (const rule of this._grammar) {
      if (rule.rhs.length <= types.length) {
        let match = true;
        for (let i = 0; i < rule.rhs.length; i++) {
          if (rule.rhs[i] !== types[i]) {
            match = false;
            break;
          }
        }
        if (match) return true;
      }
    }
    return false;
  }

  private _updateAutomaton(spellName: string, hash: string): void {
    const nextState = this._automatonState + 1;
    if (!this._transitionTable.has(this._automatonState)) {
      this._transitionTable.set(this._automatonState, new Map());
    }
    this._transitionTable.get(this._automatonState)!.set(spellName, nextState);
    this._automatonState = nextState;
  }

  getSpell(name: string): IncantationSpell | undefined {
    return this._spells.get(name);
  }

  averageComplexity(): number {
    if (this._spells.size === 0) return 0;
    return Array.from(this._spells.values()).reduce((s, sp) => s + sp.complexity, 0) / this._spells.size;
  }

  totalEntropy(): number {
    return Array.from(this._spells.values()).reduce((s, sp) => {
      return s + sp.tokens.reduce((ts, t) => ts + t.entropy, 0);
    }, 0);
  }

  automatonStep(input: string): number {
    const table = this._transitionTable.get(this._automatonState);
    if (!table) return -1;
    return table.get(input) ?? -1;
  }

  validateSpell(name: string): boolean {
    return this._spells.get(name)?.valid ?? false;
  }

  findSimilarSpells(name: string, threshold: number): string[] {
    const target = this._spells.get(name);
    if (!target) return [];
    const similar: string[] = [];
    for (const [n, spell] of this._spells) {
      if (n === name) continue;
      const dist = this._levenshtein(target.name, spell.name);
      if (dist <= threshold) similar.push(n);
    }
    return similar;
  }

  private _levenshtein(a: string, b: string): number {
    const m = a.length;
    const n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
      }
    }
    return dp[m][n];
  }

  report(): Record<string, unknown> {
    return {
      spells: this._spells.size,
      grammarRules: this._grammar.length,
      avgComplexity: this.averageComplexity(),
      totalEntropy: this.totalEntropy(),
      automatonState: this._automatonState,
      state: this._state,
    };
  }
}

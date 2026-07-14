/**
 * 不可言说之真模块：系统知道但无法直接表达的真理，
 * 只能通过隐喻、暗示、否定等迂回方式间接传达。
 */

export interface UnspeakableTruthRecord {
  id: string;
  truth: string;
  dangerLevel: number;
  knownAt: number;
  utteranceAttempts: number;
}

export interface VeiledExpression {
  truthId: string;
  expression: string;
  veil: 'metaphor' | 'negation' | 'paradox' | 'silence' | 'apotheosis';
  clarity: number;
  expressedAt: number;
}

export class UnspeakableTruth {
  private _truths: Map<string, UnspeakableTruthRecord> = new Map();
  private _expressions: VeiledExpression[] = [];
  private _maxClarity = 0.4;
  private _silenceThreshold = 0.9;

  registerTruth(truth: UnspeakableTruthRecord): void {
    this._truths.set(truth.id, truth);
  }

  attemptDirectUtterance(truthId: string): boolean {
    const truth = this._truths.get(truthId);
    if (!truth) return false;
    truth.utteranceAttempts++;
    if (truth.dangerLevel >= this._silenceThreshold) return false;
    return Math.random() > truth.dangerLevel;
  }

  private _wrap(truth: string, veil: VeiledExpression['veil']): string {
    switch (veil) {
      case 'metaphor':
        return `像${truth.length}片落叶在风中的${truth.slice(0, 3)}...`;
      case 'negation':
        return `它不是不${truth.slice(0, 4)}...`;
      case 'paradox':
        return `若说${truth.slice(0, 3)}则非，若不说则已${truth.slice(0, 3)}...`;
      case 'silence':
        return '...';
      case 'apotheosis':
        return `超越言说的${truth.slice(0, 2)}...神之静默`;
      default:
        return truth;
    }
  }

  expressVeiled(truthId: string, veil: VeiledExpression['veil']): VeiledExpression | null {
    const truth = this._truths.get(truthId);
    if (!truth) return null;
    const expression = this._wrap(truth.truth, veil);
    const baseClarity = veil === 'silence' ? 0 : 0.6;
    const clarity = Math.min(this._maxClarity, baseClarity * (1 - truth.dangerLevel));
    const veiled: VeiledExpression = {
      truthId,
      expression,
      veil,
      clarity,
      expressedAt: Date.now(),
    };
    this._expressions.push(veiled);
    if (this._expressions.length > 200) this._expressions.shift();
    truth.utteranceAttempts++;
    return veiled;
  }

  revealPartially(truthId: string, fraction: number): string | null {
    const truth = this._truths.get(truthId);
    if (!truth) return null;
    const length = Math.max(1, Math.floor(truth.truth.length * fraction));
    return truth.truth.slice(0, length) + '...';
  }

  escalateDanger(truthId: string, delta: number): boolean {
    const truth = this._truths.get(truthId);
    if (!truth) return false;
    truth.dangerLevel = Math.max(0, Math.min(1, truth.dangerLevel + delta));
    return true;
  }

  getExpressions(truthId: string): VeiledExpression[] {
    return this._expressions.filter(e => e.truthId === truthId);
  }

  findMostDangerous(): UnspeakableTruthRecord | null {
    let mostDangerous: UnspeakableTruthRecord | null = null;
    for (const truth of this._truths.values()) {
      if (!mostDangerous || truth.dangerLevel > mostDangerous.dangerLevel) {
        mostDangerous = truth;
      }
    }
    return mostDangerous;
  }

  setMaxClarity(value: number): void {
    this._maxClarity = Math.max(0, Math.min(1, value));
  }

  forgetTruth(truthId: string): boolean {
    return this._truths.delete(truthId);
  }

  get truthCount(): number {
    return this._truths.size;
  }

  get expressionCount(): number {
    return this._expressions.length;
  }
}

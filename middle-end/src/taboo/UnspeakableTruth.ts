export interface UnspeakableTruthRecord {
  id: string;
  truth: string;
  dangerLevel: number;
  knownAt: number;
  utteranceAttempts: number;
  resonance: number;
}

export interface VeiledExpression {
  truthId: string;
  expression: string;
  veil: 'metaphor' | 'negation' | 'paradox' | 'silence' | 'apotheosis';
  clarity: number;
  expressedAt: number;
  fidelity: number;
}

export class UnspeakableTruth {
  private _truths: Map<string, UnspeakableTruthRecord> = new Map();
  private _expressions: VeiledExpression[] = [];
  private _maxClarity = 0.4;
  private _silenceThreshold = 0.9;
  private _veilWeights: Record<VeiledExpression['veil'], number> = {
    metaphor: 0.7,
    negation: 0.6,
    paradox: 0.5,
    silence: 0.1,
    apotheosis: 0.3,
  };

  registerTruth(truth: UnspeakableTruthRecord): void {
    const normalized: UnspeakableTruthRecord = {
      ...truth,
      dangerLevel: Math.max(0, Math.min(1, truth.dangerLevel)),
      resonance: truth.resonance ?? 0,
    };
    this._truths.set(truth.id, normalized);
  }

  attemptDirectUtterance(truthId: string): boolean {
    const truth = this._truths.get(truthId);
    if (!truth) return false;
    truth.utteranceAttempts++;
    if (truth.dangerLevel >= this._silenceThreshold) return false;
    const successThreshold = 1 - truth.dangerLevel;
    const success = Math.random() < successThreshold;
    if (success) truth.resonance = Math.min(1, truth.resonance + 0.05);
    return success;
  }

  private _wrap(truth: string, veil: VeiledExpression['veil']): string {
    const len = truth.length;
    const head = truth.slice(0, Math.min(4, len));
    switch (veil) {
      case 'metaphor':
        return `像${len}片落叶在风中的${head}...`;
      case 'negation':
        return `它不是不${head}...`;
      case 'paradox':
        return `若说${head}则非，若不说则已${head}...`;
      case 'silence':
        return '...';
      case 'apotheosis':
        return `超越言说的${head.slice(0, 2)}...神之静默`;
      default:
        return truth;
    }
  }

  expressVeiled(truthId: string, veil: VeiledExpression['veil']): VeiledExpression | null {
    const truth = this._truths.get(truthId);
    if (!truth) return null;
    const expression = this._wrap(truth.truth, veil);
    const veilWeight = this._veilWeights[veil];
    const baseClarity = veil === 'silence' ? 0 : veilWeight;
    const dimming = this.dangerDimming(truth.dangerLevel);
    const clarity = Math.min(this._maxClarity, baseClarity * dimming);
    const fidelity = Math.min(1, veilWeight * dimming);
    const veiled: VeiledExpression = {
      truthId,
      expression,
      veil,
      clarity,
      expressedAt: Date.now(),
      fidelity,
    };
    this._expressions.push(veiled);
    if (this._expressions.length > 200) this._expressions.shift();
    truth.utteranceAttempts++;
    truth.resonance = Math.max(0, truth.resonance - clarity * 0.02);
    return veiled;
  }

  private dangerDimming(d: number): number {
    return 1 - d;
  }

  revealPartially(truthId: string, fraction: number): string | null {
    const truth = this._truths.get(truthId);
    if (!truth) return null;
    const cappedFraction = Math.max(0, Math.min(this._maxClarity, fraction));
    const length = Math.max(1, Math.floor(truth.truth.length * cappedFraction));
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

  computeCollectiveUnspeakability(): number {
    if (this._truths.size === 0) return 0;
    const sum = Array.from(this._truths.values())
      .reduce((s, t) => s + t.dangerLevel * (1 - t.resonance), 0);
    return sum / this._truths.size;
  }

  setMaxClarity(value: number): void {
    this._maxClarity = Math.max(0, Math.min(1, value));
  }

  setVeilWeight(veil: VeiledExpression['veil'], weight: number): void {
    this._veilWeights[veil] = Math.max(0, Math.min(1, weight));
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

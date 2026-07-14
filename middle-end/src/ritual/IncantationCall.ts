/**
 * 咒语调用模块：特定词汇触发深层功能，
 * 咒语作为密钥激活隐藏模块，错误咒语则触发防御反应。
 */

export type IncantationResult = 'activated' | 'rejected' | 'trapped' | 'misfired';

export interface Incantation {
  id: string;
  words: string[];
  targetFunction: string;
  power: number;
  useCount: number;
}

export interface SpellCast {
  incantationId: string;
  caster: string;
  result: IncantationResult;
  effect: string;
  castAt: number;
}

export class IncantationCall {
  private _incantations: Map<string, Incantation> = new Map();
  private _casts: SpellCast[] = [];
  private _knownCasters: Set<string> = new Set();
  private _trappedWords: Set<string> = new Set();
  private _maxUsesPerIncantation = 100;

  register(incantation: Incantation): void {
    this._incantations.set(incantation.id, incantation);
  }

  authorizeCaster(caster: string): void {
    this._knownCasters.add(caster);
  }

  setTrap(word: string): void {
    this._trappedWords.add(word);
  }

  private _findMatchingIncantation(spoken: string[]): Incantation | null {
    for (const incantation of this._incantations.values()) {
      if (incantation.words.length !== spoken.length) continue;
      const matches = incantation.words.every((word, i) => word === spoken[i]);
      if (matches) return incantation;
    }
    return null;
  }

  private _containsTrap(spoken: string[]): boolean {
    return spoken.some(word => this._trappedWords.has(word));
  }

  cast(caster: string, spoken: string[]): SpellCast {
    let result: IncantationResult;
    let effect: string;
    const incantation = this._findMatchingIncantation(spoken);
    if (!incantation) {
      if (this._containsTrap(spoken)) {
        result = 'trapped';
        effect = 'Trap triggered: defensive response activated';
      } else {
        result = 'misfired';
        effect = 'No matching incantation, spell dissipated';
      }
    } else if (!this._knownCasters.has(caster)) {
      result = 'rejected';
      effect = 'Caster not authorized';
    } else if (incantation.useCount >= this._maxUsesPerIncantation) {
      result = 'rejected';
      effect = 'Incantation exhausted';
    } else {
      result = 'activated';
      effect = `${incantation.targetFunction} activated with power ${incantation.power}`;
      incantation.useCount++;
    }
    const cast: SpellCast = {
      incantationId: incantation?.id ?? 'unknown',
      caster,
      result,
      effect,
      castAt: Date.now(),
    };
    this._casts.push(cast);
    if (this._casts.length > 300) this._casts.shift();
    return cast;
  }

  recharge(incantationId: string): boolean {
    const incantation = this._incantations.get(incantationId);
    if (!incantation) return false;
    incantation.useCount = 0;
    return true;
  }

  findIncantationByFunction(targetFunction: string): Incantation | null {
    for (const incantation of this._incantations.values()) {
      if (incantation.targetFunction === targetFunction) return incantation;
    }
    return null;
  }

  removeTrap(word: string): boolean {
    return this._trappedWords.delete(word);
  }

  getCastsByCaster(caster: string): SpellCast[] {
    return this._casts.filter(c => c.caster === caster);
  }

  getCastsByResult(result: IncantationResult): SpellCast[] {
    return this._casts.filter(c => c.result === result);
  }

  listIncantations(): Incantation[] {
    return Array.from(this._incantations.values());
  }

  getCastHistory(limit: number = 50): SpellCast[] {
    return this._casts.slice(-limit);
  }

  get incantationCount(): number {
    return this._incantations.size;
  }

  get totalCasts(): number {
    return this._casts.length;
  }
}

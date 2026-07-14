/**
 * 尾语重复累加器模块：通过重复数据尾部模式，
 * 使重复本身产生意义增生，形成渐进强化的语义回声。
 */

export interface EpistropheEcho {
  id: string;
  tail: Record<string, unknown>;
  repetitions: number;
  accumulatedMeaning: Record<string, unknown>;
  intensity: number;
}

export class EpistropheAccumulator {
  private _echoes: Map<string, EpistropheEcho> = new Map();
  private _tailHistory: Record<string, unknown>[] = [];
  private _tailKey: string | null = null;
  private _intensityDecay = 0.15;
  private _maxHistory = 32;

  setTailKey(key: string): void {
    this._tailKey = key;
  }

  setIntensityDecay(decay: number): void {
    this._intensityDecay = Math.max(0, Math.min(1, decay));
  }

  feed(payload: Record<string, unknown>): EpistropheEcho | null {
    const tailKey = this._tailKey ?? this._inferTailKey(payload);
    if (!tailKey || !(tailKey in payload)) return null;

    const tail = { [tailKey]: payload[tailKey] };
    this._tailHistory.push(tail);
    if (this._tailHistory.length > this._maxHistory) this._tailHistory.shift();

    const signature = String(payload[tailKey]);
    const existing = this._echoes.get(signature);

    if (existing) {
      existing.repetitions++;
      existing.intensity = Math.min(1, existing.intensity + (1 - this._intensityDecay));
      existing.accumulatedMeaning = this._accumulate(existing.accumulatedMeaning, tail, existing.repetitions);
      return existing;
    }

    const echo: EpistropheEcho = {
      id: `echo-${this._echoes.size}`,
      tail,
      repetitions: 1,
      accumulatedMeaning: { ...tail, _firstSeen: Date.now() },
      intensity: 0.3,
    };
    this._echoes.set(signature, echo);
    return echo;
  }

  private _inferTailKey(payload: Record<string, unknown>): string | null {
    const keys = Object.keys(payload);
    return keys.length > 0 ? keys[keys.length - 1] : null;
  }

  private _accumulate(accumulated: Record<string, unknown>, tail: Record<string, unknown>, count: number): Record<string, unknown> {
    return {
      ...accumulated,
      ...tail,
      _repetitionCount: count,
      _resonanceStrength: Math.min(1, count * 0.15),
    };
  }

  dominantEcho(): EpistropheEcho | undefined {
    if (this._echoes.size === 0) return undefined;
    return Array.from(this._echoes.values()).sort((a, b) => b.repetitions - a.repetitions)[0];
  }

  resonantTails(): EpistropheEcho[] {
    return Array.from(this._echoes.values()).filter(e => e.intensity > 0.5);
  }

  totalRepetitions(): number {
    return Array.from(this._echoes.values()).reduce((s, e) => s + e.repetitions, 0);
  }

  averageIntensity(): number {
    if (this._echoes.size === 0) return 0;
    return Array.from(this._echoes.values()).reduce((s, e) => s + e.intensity, 0) / this._echoes.size;
  }

  decayAll(): void {
    for (const echo of this._echoes.values()) {
      echo.intensity = Math.max(0, echo.intensity - this._intensityDecay);
    }
  }

  pruneWeak(threshold = 0.1): number {
    let removed = 0;
    for (const [id, echo] of this._echoes) {
      if (echo.intensity < threshold) {
        this._echoes.delete(id);
        removed++;
      }
    }
    return removed;
  }

  reset(): void {
    this._echoes.clear();
    this._tailHistory = [];
  }

  get echoCount(): number {
    return this._echoes.size;
  }

  get historyDepth(): number {
    return this._tailHistory.length;
  }

  get tailKey(): string | null {
    return this._tailKey;
  }
}

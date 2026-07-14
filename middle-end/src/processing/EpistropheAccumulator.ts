export interface EpistropheEcho {
  id: string;
  tail: Record<string, unknown>;
  repetitions: number;
  accumulatedMeaning: Record<string, unknown>;
  intensity: number;
  resonance: number;
}

export class EpistropheAccumulator {
  private _echoes: Map<string, EpistropheEcho> = new Map();
  private _tailHistory: Record<string, unknown>[] = [];
  private _tailKey: string | null = null;
  private _intensityDecay = 0.15;
  private _maxHistory = 32;
  private _termFrequency: Map<string, number> = new Map();
  private _documentCount = 0;

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
    this._updateTFIDF(signature);

    const existing = this._echoes.get(signature);
    if (existing) {
      existing.repetitions++;
      const tfidfBoost = this._computeTFIDF(signature);
      existing.intensity = Math.min(1, existing.intensity * (1 + tfidfBoost) * (1 - this._intensityDecay) + this._intensityDecay);
      existing.resonance = this._computeResonance(existing.repetitions, tfidfBoost);
      existing.accumulatedMeaning = this._accumulate(existing.accumulatedMeaning, tail, existing.repetitions, tfidfBoost);
      return existing;
    }

    const tfidfBoost = this._computeTFIDF(signature);
    const echo: EpistropheEcho = {
      id: `echo-${this._echoes.size}`,
      tail,
      repetitions: 1,
      accumulatedMeaning: { ...tail, _firstSeen: Date.now(), _tfidf: tfidfBoost },
      intensity: 0.3,
      resonance: this._computeResonance(1, tfidfBoost),
    };
    this._echoes.set(signature, echo);
    return echo;
  }

  private _inferTailKey(payload: Record<string, unknown>): string | null {
    const keys = Object.keys(payload);
    return keys.length > 0 ? keys[keys.length - 1] : null;
  }

  private _updateTFIDF(term: string): void {
    const count = this._termFrequency.get(term) ?? 0;
    this._termFrequency.set(term, count + 1);
    this._documentCount++;
  }

  private _computeTFIDF(term: string): number {
    const tf = (this._termFrequency.get(term) ?? 0) / Math.max(1, this._documentCount);
    const df = this._termFrequency.has(term) ? 1 : 0;
    const idf = Math.log((this._documentCount + 1) / (df + 1)) + 1;
    return tf * idf;
  }

  private _computeResonance(repetitions: number, tfidf: number): number {
    const harmonic = repetitions > 1 ? Math.log(repetitions) / Math.log(2) : 0;
    return Math.min(1, 0.4 * (1 - Math.exp(-repetitions * 0.3)) + 0.3 * harmonic + 0.3 * tfidf);
  }

  private _accumulate(
    accumulated: Record<string, unknown>,
    tail: Record<string, unknown>,
    count: number,
    tfidf: number
  ): Record<string, unknown> {
    const prevStrength = (accumulated._resonanceStrength as number) ?? 0;
    const newStrength = Math.min(1, prevStrength * 0.8 + tfidf * 0.2);
    return {
      ...accumulated,
      ...tail,
      _repetitionCount: count,
      _resonanceStrength: newStrength,
      _entropy: this._computeEntropy(count, tfidf),
    };
  }

  private _computeEntropy(count: number, tfidf: number): number {
    const p = Math.min(0.99, tfidf * count / 10);
    if (p <= 0 || p >= 1) return 0;
    return -(p * Math.log2(p) + (1 - p) * Math.log2(1 - p));
  }

  dominantEcho(): EpistropheEcho | undefined {
    if (this._echoes.size === 0) return undefined;
    return Array.from(this._echoes.values()).sort((a, b) =>
      b.resonance * 0.6 + b.repetitions * 0.2 + b.intensity * 0.2 -
      (a.resonance * 0.6 + a.repetitions * 0.2 + a.intensity * 0.2)
    )[0];
  }

  resonantTails(): EpistropheEcho[] {
    return Array.from(this._echoes.values()).filter(e => e.resonance > 0.5);
  }

  totalRepetitions(): number {
    return Array.from(this._echoes.values()).reduce((s, e) => s + e.repetitions, 0);
  }

  averageIntensity(): number {
    if (this._echoes.size === 0) return 0;
    return Array.from(this._echoes.values()).reduce((s, e) => s + e.intensity, 0) / this._echoes.size;
  }

  averageResonance(): number {
    if (this._echoes.size === 0) return 0;
    return Array.from(this._echoes.values()).reduce((s, e) => s + e.resonance, 0) / this._echoes.size;
  }

  decayAll(): void {
    for (const echo of this._echoes.values()) {
      echo.intensity = Math.max(0, echo.intensity - this._intensityDecay);
      echo.resonance = Math.max(0, echo.resonance * 0.95);
    }
  }

  pruneWeak(threshold = 0.1): number {
    let removed = 0;
    for (const [id, echo] of this._echoes) {
      if (echo.resonance < threshold) {
        this._echoes.delete(id);
        removed++;
      }
    }
    return removed;
  }

  reset(): void {
    this._echoes.clear();
    this._tailHistory = [];
    this._termFrequency.clear();
    this._documentCount = 0;
  }

  get echoCount(): number { return this._echoes.size; }
  get historyDepth(): number { return this._tailHistory.length; }
  get tailKey(): string | null { return this._tailKey; }
}

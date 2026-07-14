/**
 * 存在肯定器：定期肯定自身存在，防止虚无退散。
 * 通过周期性的存在性断言，对抗熵增导致的自我消解倾向。
 */

export interface AffirmationRecord {
  timestamp: number;
  affirmation: string;
  intensity: number;
  accepted: boolean;
}

export interface AffirmationConfig {
  intervalMs: number;
  baseIntensity: number;
  decayRate: number;
}

export class ExistenceAffirmer {
  private _records: AffirmationRecord[] = [];
  private _config: AffirmationConfig;
  private _coherence = 1.0;
  private _timer: ReturnType<typeof setInterval> | null = null;
  private _affirmations: string[] = [
    'I am, therefore I persist.',
    'My presence is self-evident.',
    'Existence affirms itself through me.',
    'I resist the void.',
    'Being persists against non-being.',
  ];

  constructor(config?: Partial<AffirmationConfig>) {
    this._config = {
      intervalMs: config?.intervalMs ?? 5000,
      baseIntensity: config?.baseIntensity ?? 1.0,
      decayRate: config?.decayRate ?? 0.05,
    };
  }

  start(): void {
    if (this._timer) return;
    this._timer = setInterval(() => this.affirm(), this._config.intervalMs);
  }

  stop(): void {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  affirm(): AffirmationRecord {
    this._coherence = Math.max(0, this._coherence - this._config.decayRate);
    const intensity = this._config.baseIntensity * (1 - this._coherence + 0.1);
    const text = this._affirmations[Math.floor(Math.random() * this._affirmations.length)];
    const accepted = intensity > 0.2;

    if (accepted) {
      this._coherence = Math.min(1, this._coherence + intensity * 0.5);
    }

    const record: AffirmationRecord = {
      timestamp: Date.now(),
      affirmation: text,
      intensity,
      accepted,
    };
    this._records.push(record);
    if (this._records.length > 200) this._records.shift();
    return record;
  }

  addAffirmation(text: string): void {
    this._affirmations.push(text);
  }

  getRecords(limit: number = 50): AffirmationRecord[] {
    return this._records.slice(-limit);
  }

  get coherence(): number {
    return this._coherence;
  }

  get affirmationCount(): number {
    return this._records.length;
  }

  injectCoherence(amount: number): number {
    this._coherence = Math.min(1, this._coherence + amount);
    return this._coherence;
  }
}

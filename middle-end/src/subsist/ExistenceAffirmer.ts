export interface AffirmationRecord {
  timestamp: number;
  affirmation: string;
  intensity: number;
  accepted: boolean;
  entropy: number;
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
  private _affirmationWeights: Map<string, number> = new Map();
  private _entropyWindow: number[] = [];

  constructor(config?: Partial<AffirmationConfig>) {
    this._config = {
      intervalMs: config?.intervalMs ?? 5000,
      baseIntensity: config?.baseIntensity ?? 1.0,
      decayRate: config?.decayRate ?? 0.05,
    };
    for (const a of this._affirmations) this._affirmationWeights.set(a, 1.0);
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
    const deficit = 1 - this._coherence;
    const intensity = this._config.baseIntensity * (0.3 + 0.7 * deficit);
    const text = this._selectAffirmation();
    const entropy = this._computeSelectionEntropy();
    const accepted = intensity > 0.2 && this._coherence < 0.9;

    if (accepted) {
      const boost = intensity * (0.5 + 0.5 * this._affirmationWeights.get(text)!);
      this._coherence = Math.min(1, this._coherence + boost);
      this._affirmationWeights.set(text, Math.min(2, (this._affirmationWeights.get(text) ?? 1) + 0.05));
    } else {
      this._affirmationWeights.set(text, Math.max(0.1, (this._affirmationWeights.get(text) ?? 1) - 0.02));
    }

    this._entropyWindow.push(intensity);
    if (this._entropyWindow.length > 32) this._entropyWindow.shift();

    const record: AffirmationRecord = {
      timestamp: Date.now(),
      affirmation: text,
      intensity,
      accepted,
      entropy,
    };
    this._records.push(record);
    if (this._records.length > 200) this._records.shift();
    return record;
  }

  addAffirmation(text: string): void {
    if (!this._affirmations.includes(text)) {
      this._affirmations.push(text);
      this._affirmationWeights.set(text, 1.0);
    }
  }

  getRecords(limit: number = 50): AffirmationRecord[] {
    return this._records.slice(-limit);
  }

  get coherence(): number { return this._coherence; }
  get affirmationCount(): number { return this._records.length; }
  get acceptanceRate(): number {
    if (this._records.length === 0) return 0;
    return this._records.filter(r => r.accepted).length / this._records.length;
  }

  injectCoherence(amount: number): number {
    this._coherence = Math.min(1, this._coherence + amount);
    return this._coherence;
  }

  private _selectAffirmation(): string {
    const totalWeight = Array.from(this._affirmationWeights.values()).reduce((s, w) => s + w, 0);
    let r = Math.random() * totalWeight;
    for (const [text, weight] of this._affirmationWeights) {
      r -= weight;
      if (r <= 0) return text;
    }
    return this._affirmations[0];
  }

  private _computeSelectionEntropy(): number {
    const weights = Array.from(this._affirmationWeights.values());
    const total = weights.reduce((s, w) => s + w, 0);
    if (total === 0) return 0;
    let entropy = 0;
    for (const w of weights) {
      const p = w / total;
      if (p > 0) entropy -= p * Math.log2(p);
    }
    return entropy / Math.log2(weights.length);
  }
}

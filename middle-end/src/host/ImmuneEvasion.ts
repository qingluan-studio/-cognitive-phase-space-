export interface AntigenVariant {
  id: string;
  sequence: string;
  epitopePositions: number[];
  recognitionProbability: number;
}

export interface EvasionEvent {
  variantId: string;
  escapeMutation: string;
  immuneRecognitionDrop: number;
  timestamp: number;
}

export class ImmuneEvasion {
  private _variants: Map<string, AntigenVariant> = new Map();
  private _events: EvasionEvent[] = [];
  private _state: Record<string, unknown> = {};
  private _escapeMutationRate: number = 0.05;
  private _immuneMemoryDecay: number = 0.01;
  private _memoryPool: Map<string, number> = new Map();
  private _variantEntropy: number = 0;

  registerVariant(variant: AntigenVariant): void {
    this._variants.set(variant.id, variant);
    this._updateVariantEntropy();
  }

  mutate(variantId: string): AntigenVariant | null {
    const variant = this._variants.get(variantId);
    if (!variant) return null;
    const chars = 'ACGT';
    const seqArray = variant.sequence.split('');
    for (const pos of variant.epitopePositions) {
      if (Math.random() < this._escapeMutationRate) {
        const oldChar = seqArray[pos];
        let newChar = oldChar;
        while (newChar === oldChar) {
          newChar = chars[Math.floor(Math.random() * chars.length)];
        }
        seqArray[pos] = newChar;
      }
    }
    const newSequence = seqArray.join('');
    const newVariant: AntigenVariant = {
      id: `${variantId}-mut-${Date.now()}`,
      sequence: newSequence,
      epitopePositions: variant.epitopePositions,
      recognitionProbability: variant.recognitionProbability * 0.7,
    };
    this._variants.set(newVariant.id, newVariant);
    const immuneDrop = variant.recognitionProbability - newVariant.recognitionProbability;
    const event: EvasionEvent = {
      variantId: newVariant.id,
      escapeMutation: newSequence,
      immuneRecognitionDrop: immuneDrop,
      timestamp: Date.now(),
    };
    this._events.push(event);
    if (this._events.length > 200) this._events.shift();
    this._updateVariantEntropy();
    return newVariant;
  }

  private _updateVariantEntropy(): void {
    const total = this._variants.size;
    if (total === 0) {
      this._variantEntropy = 0;
      return;
    }
    const bins = 5;
    const probs = Array.from(this._variants.values()).map(v => v.recognitionProbability);
    const maxP = Math.max(...probs, 1);
    const counts = new Array(bins).fill(0);
    for (const p of probs) {
      const idx = Math.min(bins - 1, Math.floor((p / maxP) * bins));
      counts[idx]++;
    }
    let entropy = 0;
    for (const c of counts) {
      if (c > 0) {
        const prob = c / total;
        entropy -= prob * Math.log2(prob);
      }
    }
    this._variantEntropy = entropy;
  }

  decayImmuneMemory(): void {
    for (const [key, strength] of this._memoryPool) {
      this._memoryPool.set(key, Math.max(0, strength - this._immuneMemoryDecay));
    }
  }

  recognize(variantId: string): number {
    const variant = this._variants.get(variantId);
    if (!variant) return 0;
    const memory = this._memoryPool.get(variant.sequence) ?? 0;
    return variant.recognitionProbability * (1 + memory);
  }

  getVariant(id: string): AntigenVariant | null {
    return this._variants.get(id) ?? null;
  }

  averageRecognition(): number {
    if (this._variants.size === 0) return 0;
    return Array.from(this._variants.values()).reduce((s, v) => s + v.recognitionProbability, 0) / this._variants.size;
  }

  getVariantsByRecognition(threshold: number): AntigenVariant[] {
    return Array.from(this._variants.values()).filter(v => v.recognitionProbability < threshold);
  }

  setEscapeMutationRate(rate: number): void {
    this._escapeMutationRate = Math.max(0, Math.min(1, rate));
  }

  setImmuneMemoryDecay(decay: number): void {
    this._immuneMemoryDecay = Math.max(0, decay);
  }

  get variantCount(): number {
    return this._variants.size;
  }

  get eventCount(): number {
    return this._events.length;
  }

  get variantEntropy(): number {
    return this._variantEntropy;
  }

  evasionReport(): Record<string, unknown> {
    return {
      variantCount: this._variants.size,
      eventCount: this._events.length,
      averageRecognition: this.averageRecognition().toFixed(4),
      variantEntropy: this._variantEntropy.toFixed(4),
      escapeMutationRate: this._escapeMutationRate.toFixed(4),
      immuneMemoryDecay: this._immuneMemoryDecay.toFixed(4),
      lowRecognitionVariants: this.getVariantsByRecognition(0.3).length,
      state: this._state,
    };
  }
}

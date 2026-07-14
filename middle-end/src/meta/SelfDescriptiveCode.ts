export interface SelfDescription {
  id: string;
  source: string;
  description: string;
  accuracy: number;
}

export class SelfDescriptiveCode {
  private _descriptions: Map<string, SelfDescription> = new Map();
  private _descriptionEntropy: number[] = [];
  private _compressionRatio: Map<string, number> = new Map();
  private _kolmogorovComplexity: Map<string, number> = new Map();

  public describe(source: string, description: string): SelfDescription {
    const id = `selfdesc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const accuracy = this._computeAccuracy(source, description);
    const desc: SelfDescription = {
      id,
      source,
      description,
      accuracy,
    };
    this._descriptions.set(id, desc);
    this._descriptionEntropy.push(this._computeStringEntropy(description));
    if (this._descriptionEntropy.length > 50) this._descriptionEntropy.shift();
    this._compressionRatio.set(id, this._computeCompressionRatio(source, description));
    this._kolmogorovComplexity.set(id, this._estimateKolmogorovComplexity(source));
    return desc;
  }

  public verify(descriptionId: string): boolean {
    const desc = this._descriptions.get(descriptionId);
    if (!desc) return false;
    return desc.description.includes(desc.source.slice(0, 10));
  }

  public compare(idA: string, idB: string): number {
    const a = this._descriptions.get(idA);
    const b = this._descriptions.get(idB);
    if (!a || !b) return 0;
    const setA = new Set(a.description);
    const setB = new Set(b.description);
    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  public getDescription(id: string): SelfDescription | null {
    return this._descriptions.get(id) ?? null;
  }

  public getAllDescriptions(): SelfDescription[] {
    return Array.from(this._descriptions.values());
  }

  public get descriptionCount(): number {
    return this._descriptions.size;
  }

  public computeDescriptionEntropy(): number {
    if (this._descriptionEntropy.length === 0) return 0;
    const mean = this._descriptionEntropy.reduce((a, b) => a + b, 0) / this._descriptionEntropy.length;
    const variance = this._descriptionEntropy.reduce((s, v) => s + (v - mean) ** 2, 0) / this._descriptionEntropy.length;
    return 0.5 * Math.log2(2 * Math.PI * Math.E * Math.max(variance, 1e-10));
  }

  public computeAverageCompressionRatio(): number {
    const ratios = Array.from(this._compressionRatio.values());
    if (ratios.length === 0) return 0;
    return ratios.reduce((a, b) => a + b, 0) / ratios.length;
  }

  public computeComplexitySpectrum(): number[] {
    const complexities = Array.from(this._kolmogorovComplexity.values());
    const N = complexities.length;
    if (N === 0) return [];
    const result: number[] = new Array(N).fill(0);
    for (let k = 0; k < N; k++) {
      let real = 0;
      let imag = 0;
      for (let n = 0; n < N; n++) {
        const angle = -2 * Math.PI * k * n / N;
        real += complexities[n] * Math.cos(angle);
        imag += complexities[n] * Math.sin(angle);
      }
      result[k] = Math.sqrt(real * real + imag * imag);
    }
    return result;
  }

  private _computeAccuracy(source: string, description: string): number {
    const overlap = source.split('').filter(c => description.includes(c)).length;
    return overlap / Math.max(source.length, description.length, 1);
  }

  private _computeStringEntropy(str: string): number {
    const freq = new Map<string, number>();
    for (const ch of str) {
      freq.set(ch, (freq.get(ch) ?? 0) + 1);
    }
    let entropy = 0;
    for (const count of freq.values()) {
      const p = count / str.length;
      entropy -= p * Math.log2(p);
    }
    return entropy;
  }

  private _computeCompressionRatio(source: string, description: string): number {
    return description.length / Math.max(source.length, 1);
  }

  private _estimateKolmogorovComplexity(source: string): number {
    const uniqueSubstrings = new Set<string>();
    for (let i = 0; i < source.length; i++) {
      for (let j = i + 1; j <= Math.min(i + 10, source.length); j++) {
        uniqueSubstrings.add(source.slice(i, j));
      }
    }
    return Math.log2(uniqueSubstrings.size + 1);
  }
}

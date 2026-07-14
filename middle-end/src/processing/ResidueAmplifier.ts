/**
 * 残渣放大器模块：收集处理管道完成后残留的边角残渣信号，
 * 放大其中隐藏的次级价值，变废为宝地提取额外信息。
 */

export interface ResidueSample {
  id: string;
  source: string;
  residue: Record<string, unknown>;
  primaryValue: number;
  hiddenValue: number;
  amplified: boolean;
}

export interface AmplifiedResidue {
  fromId: string;
  amplifiedValue: number;
  extractedInsight: Record<string, unknown>;
  yieldRatio: number;
}

export class ResidueAmplifier {
  private _residues: Map<string, ResidueSample> = new Map();
  private _amplified: AmplifiedResidue[] = [];
  private _amplificationFactor = 5;
  private _hiddenThreshold = 0.05;
  private _totalYield = 0;

  collect(sample: ResidueSample): void {
    sample.hiddenValue = this._detectHiddenValue(sample.residue);
    this._residues.set(sample.id, sample);
  }

  setAmplificationFactor(factor: number): void {
    this._amplificationFactor = Math.max(1, factor);
  }

  setHiddenThreshold(t: number): void {
    this._hiddenThreshold = Math.max(0, t);
  }

  private _detectHiddenValue(residue: Record<string, unknown>): number {
    let hidden = 0;
    for (const [key, value] of Object.entries(residue)) {
      if (key.startsWith('_') || key.startsWith('residual')) {
        hidden += typeof value === 'number' ? Math.abs(value) : 0.1;
      }
      if (typeof value === 'number' && Math.abs(value) < 0.1) {
        hidden += Math.abs(value);
      }
    }
    return hidden;
  }

  amplify(sampleId: string): AmplifiedResidue | undefined {
    const sample = this._residues.get(sampleId);
    if (!sample) return undefined;

    if (sample.hiddenValue < this._hiddenThreshold) {
      return undefined;
    }

    const amplifiedValue = sample.hiddenValue * this._amplificationFactor;
    const extractedInsight = this._extractInsight(sample);
    const yieldRatio = sample.primaryValue === 0 ? 0 : amplifiedValue / sample.primaryValue;

    const result: AmplifiedResidue = {
      fromId: sampleId,
      amplifiedValue,
      extractedInsight,
      yieldRatio,
    };
    sample.amplified = true;
    this._amplified.push(result);
    this._totalYield += amplifiedValue;
    return result;
  }

  private _extractInsight(sample: ResidueSample): Record<string, unknown> {
    const insight: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(sample.residue)) {
      if (key.startsWith('_')) {
        insight[`extracted_${key.slice(1)}`] = value;
      } else if (typeof value === 'number' && Math.abs(value) < 0.1) {
        insight[`micro_${key}`] = value * this._amplificationFactor;
      }
    }
    insight._source = sample.source;
    insight._originalHiddenValue = sample.hiddenValue;
    return insight;
  }

  amplifyAll(): AmplifiedResidue[] {
    const results: AmplifiedResidue[] = [];
    for (const id of Array.from(this._residues.keys())) {
      const result = this.amplify(id);
      if (result) results.push(result);
    }
    return results;
  }

  topResidues(limit = 5): ResidueSample[] {
    return Array.from(this._residues.values())
      .sort((a, b) => b.hiddenValue - a.hiddenValue)
      .slice(0, limit);
  }

  averageYieldRatio(): number {
    if (this._amplified.length === 0) return 0;
    return this._amplified.reduce((s, r) => s + r.yieldRatio, 0) / this._amplified.length;
  }

  amplifiedResidues(): AmplifiedResidue[] {
    return [...this._amplified];
  }

  purgeAmplified(): number {
    const count = this._amplified.length;
    this._amplified = [];
    return count;
  }

  reset(): void {
    this._residues.clear();
    this._amplified = [];
    this._totalYield = 0;
  }

  get residueCount(): number {
    return this._residues.size;
  }

  get amplifiedCount(): number {
    return this._amplified.length;
  }

  get totalYield(): number {
    return this._totalYield;
  }

  get amplificationFactor(): number {
    return this._amplificationFactor;
  }
}

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
  private _waveletLevels = 3;

  collect(sample: ResidueSample): void {
    sample.hiddenValue = this._detectHiddenValue(sample.residue);
    this._residues.set(sample.id, sample);
  }

  setAmplificationFactor(factor: number): void { this._amplificationFactor = Math.max(1, factor); }
  setHiddenThreshold(t: number): void { this._hiddenThreshold = Math.max(0, t); }
  setWaveletLevels(n: number): void { this._waveletLevels = Math.max(1, Math.min(6, n)); }

  private _detectHiddenValue(residue: Record<string, unknown>): number {
    const numericValues: number[] = [];
    let microEnergy = 0, edgeScore = 0;

    for (const [key, value] of Object.entries(residue)) {
      if (typeof value === 'number') {
        numericValues.push(value);
        if (Math.abs(value) < 0.1) microEnergy += value * value;
        if (key.startsWith('_') || key.startsWith('residual') || key.includes('residue')) {
          microEnergy += Math.abs(value) * 2;
        }
      } else if (typeof value === 'string') {
        edgeScore += 0.05;
      }
    }

    let highFreqEnergy = 0;
    if (numericValues.length > 2) {
      for (let i = 1; i < numericValues.length; i++) {
        const diff = numericValues[i] - numericValues[i - 1];
        highFreqEnergy += diff * diff;
      }
      microEnergy += highFreqEnergy * 0.1;
    }
    const complexity = this._sampleComplexity(residue);
    return Math.sqrt(microEnergy) * (1 + complexity * 0.3) + edgeScore;
  }

  private _sampleComplexity(residue: Record<string, unknown>): number {
    const keys = Object.keys(residue);
    if (keys.length === 0) return 0;
    const types = new Set<string>();
    let nested = 0;
    for (const [, val] of Object.entries(residue)) {
      types.add(typeof val);
      if (typeof val === 'object' && val !== null) nested++;
    }
    return (types.size / 6 + Math.min(1, keys.length / 20) + nested * 0.1) / 3;
  }

  amplify(sampleId: string): AmplifiedResidue | undefined {
    const sample = this._residues.get(sampleId);
    if (!sample || sample.hiddenValue < this._hiddenThreshold) return undefined;

    const amplifiedValue = sample.hiddenValue * this._amplificationFactor;
    const extractedInsight = this._extractInsight(sample);
    const yieldRatio = sample.primaryValue === 0 ? 0 : amplifiedValue / sample.primaryValue;

    const result: AmplifiedResidue = {
      fromId: sampleId, amplifiedValue, extractedInsight, yieldRatio,
    };
    sample.amplified = true;
    this._amplified.push(result);
    this._totalYield += amplifiedValue;
    return result;
  }

  private _extractInsight(sample: ResidueSample): Record<string, unknown> {
    const insight: Record<string, unknown> = {};
    const numericKeys: string[] = [];
    const numericVals: number[] = [];

    for (const [key, value] of Object.entries(sample.residue)) {
      if (key.startsWith('_')) {
        insight[`extracted_${key.slice(1)}`] = value;
      } else if (typeof value === 'number') {
        numericKeys.push(key);
        numericVals.push(value);
      }
    }

    if (numericVals.length > 0) {
      const denoised = this._waveletDenoise(numericVals);
      for (let i = 0; i < numericKeys.length && i < denoised.length; i++) {
        const amp = denoised[i] * this._amplificationFactor;
        if (Math.abs(amp) > 0.01) insight[`micro_${numericKeys[i]}`] = amp;
      }
    }

    insight._source = sample.source;
    insight._originalHiddenValue = sample.hiddenValue;
    return insight;
  }

  private _waveletDenoise(signal: number[]): number[] {
    if (signal.length < 2) return [...signal];
    const coeffs: number[][] = [];
    let approx = [...signal];

    for (let level = 0; level < this._waveletLevels; level++) {
      if (approx.length < 2) break;
      const details: number[] = [], next: number[] = [];
      for (let i = 0; i < approx.length - 1; i += 2) {
        next.push((approx[i] + approx[i + 1]) / 2);
        details.push((approx[i] - approx[i + 1]) / 2);
      }
      coeffs.push(details);
      approx = next;
    }

    const lastDetails = coeffs[coeffs.length - 1] ?? [0];
    const meanAbs = lastDetails.reduce((s, v) => s + Math.abs(v), 0) / lastDetails.length;
    const threshold = meanAbs * 2.5;

    for (const detail of coeffs) {
      for (let i = 0; i < detail.length; i++) {
        if (Math.abs(detail[i]) < threshold) detail[i] = 0;
        else detail[i] = detail[i] > 0 ? detail[i] - threshold : detail[i] + threshold;
      }
    }

    let reconstructed = approx;
    for (let i = coeffs.length - 1; i >= 0; i--) {
      const details = coeffs[i];
      const next: number[] = [];
      for (let j = 0; j < details.length; j++) {
        next.push(reconstructed[j] + details[j]);
        next.push(reconstructed[j] - details[j]);
      }
      reconstructed = next;
    }
    return reconstructed.slice(0, signal.length);
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

  reset(): void {
    this._residues.clear();
    this._amplified = [];
    this._totalYield = 0;
  }

  get residueCount(): number { return this._residues.size; }
  get amplifiedCount(): number { return this._amplified.length; }
  get totalYield(): number { return this._totalYield; }
  get amplificationFactor(): number { return this._amplificationFactor; }
  get waveletLevels(): number { return this._waveletLevels; }
}

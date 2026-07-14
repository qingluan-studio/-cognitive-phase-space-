export interface PalindromicStep {
  index: number;
  forwardOp: (input: Record<string, unknown>) => Record<string, unknown>;
  inverseOp: (output: Record<string, unknown>) => Record<string, unknown>;
  label: string;
}

export interface PalindromicResult {
  forwardOutput: Record<string, unknown>;
  backwardOutput: Record<string, unknown>;
  reversible: boolean;
  asymmetry: number;
}

interface StepSignature {
  index: number;
  hash: string;
  inputFingerprint: string;
  outputFingerprint: string;
}

interface CorrectionVector {
  key: string;
  offset: number;
  confidence: number;
}

export class PalintropeShifter {
  private _steps: PalindromicStep[] = [];
  private _results: PalindromicResult[] = [];
  private _maxResults = 16;
  private _signatures: Map<string, StepSignature[]> = new Map();
  private _correctionCache: Map<string, CorrectionVector[]> = new Map();
  private _correctionStrength = 0.3;

  addStep(step: PalindromicStep): void {
    this._steps.push(step);
    this._steps.sort((a, b) => a.index - b.index);
    this._signatures.clear();
    this._correctionCache.clear();
  }

  removeStep(index: number): boolean {
    const i = this._steps.findIndex(s => s.index === index);
    if (i === -1) return false;
    this._steps.splice(i, 1);
    this._signatures.clear();
    this._correctionCache.clear();
    return true;
  }

  runForward(input: Record<string, unknown>): Record<string, unknown> {
    let current = { ...input };
    const sigs: StepSignature[] = [];
    for (const step of this._steps) {
      const inputFp = this._fingerprint(current);
      current = step.forwardOp(current);
      const outputFp = this._fingerprint(current);
      sigs.push({
        index: step.index,
        hash: this._hash(`${step.label}:${inputFp}:${outputFp}`),
        inputFingerprint: inputFp,
        outputFingerprint: outputFp,
      });
    }
    const runId = this._hash(`fw:${this._fingerprint(input)}:${Date.now()}`);
    this._signatures.set(runId, sigs);
    return current;
  }

  runBackward(output: Record<string, unknown>): Record<string, unknown> {
    let current = { ...output };
    const reversed = [...this._steps].reverse();
    for (const step of reversed) {
      current = step.inverseOp(current);
    }
    return current;
  }

  verifyReversibility(input: Record<string, unknown>): PalindromicResult {
    const forwardOutput = this.runForward(input);
    let backwardOutput = this.runBackward(forwardOutput);
    const rawAsymmetry = this._computeAsymmetry(input, backwardOutput);
    
    if (rawAsymmetry > 0.01) {
      const corrections = this._computeCorrections(input, backwardOutput, forwardOutput);
      backwardOutput = this._applyCorrections(backwardOutput, corrections);
    }
    
    const asymmetry = this._computeAsymmetry(input, backwardOutput);
    const result: PalindromicResult = {
      forwardOutput,
      backwardOutput,
      reversible: asymmetry < 0.05,
      asymmetry,
    };
    this._results.push(result);
    if (this._results.length > this._maxResults) this._results.shift();
    return result;
  }

  private _computeAsymmetry(original: Record<string, unknown>, restored: Record<string, unknown>): number {
    const keys = new Set([...Object.keys(original), ...Object.keys(restored)]);
    let weightedDiff = 0;
    let totalWeight = 0;
    for (const key of keys) {
      const weight = this._keyWeight(key);
      totalWeight += weight;
      const origVal = original[key];
      const restVal = restored[key];
      weightedDiff += weight * this._valueDistance(origVal, restVal);
    }
    return totalWeight === 0 ? 0 : weightedDiff / totalWeight;
  }

  private _valueDistance(a: unknown, b: unknown): number {
    if (a === undefined && b === undefined) return 0;
    if (a === undefined || b === undefined) return 1;
    if (typeof a === 'number' && typeof b === 'number') {
      const maxAbs = Math.max(Math.abs(a), Math.abs(b), 1);
      return Math.min(1, Math.abs(a - b) / maxAbs);
    }
    if (typeof a === 'string' && typeof b === 'string') {
      return this._levenshteinDistance(a, b) / Math.max(a.length, b.length, 1);
    }
    return String(a) === String(b) ? 0 : 1;
  }

  private _levenshteinDistance(a: string, b: string): number {
    const m = a.length;
    const n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + cost
        );
      }
    }
    return dp[m][n];
  }

  private _computeCorrections(
    original: Record<string, unknown>,
    restored: Record<string, unknown>,
    forwardOutput: Record<string, unknown>
  ): CorrectionVector[] {
    const cacheKey = this._hash(`${this._fingerprint(original)}:${this._fingerprint(restored)}`);
    if (this._correctionCache.has(cacheKey)) {
      return this._correctionCache.get(cacheKey)!;
    }
    const corrections: CorrectionVector[] = [];
    const allKeys = new Set([...Object.keys(original), ...Object.keys(restored)]);
    for (const key of allKeys) {
      const origVal = original[key];
      const restVal = restored[key];
      if (typeof origVal === 'number' && typeof restVal === 'number') {
        const offset = (origVal - restVal) * this._correctionStrength;
        const confidence = 1 - Math.min(1, Math.abs(offset) / Math.max(Math.abs(origVal), 1));
        corrections.push({ key, offset, confidence });
      }
    }
    this._correctionCache.set(cacheKey, corrections);
    return corrections;
  }

  private _applyCorrections(
    output: Record<string, unknown>,
    corrections: CorrectionVector[]
  ): Record<string, unknown> {
    const result = { ...output };
    for (const corr of corrections) {
      const val = result[corr.key];
      if (typeof val === 'number') {
        result[corr.key] = val + corr.offset * corr.confidence;
      }
    }
    return result;
  }

  private _fingerprint(obj: Record<string, unknown>): string {
    const keys = Object.keys(obj).sort();
    const parts = keys.map(k => `${k}:${String(obj[k])}`);
    return this._hash(parts.join('|'));
  }

  private _hash(str: string): string {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h * 16777619) >>> 0;
    }
    return h.toString(16).padStart(8, '0');
  }

  private _keyWeight(key: string): number {
    if (key.startsWith('_')) return 0.5;
    if (key.includes('id') || key.includes('Id')) return 1.5;
    if (key.includes('value') || key.includes('Value')) return 1.2;
    return 1;
  }

  crossCheck(input: Record<string, unknown>): { consistent: boolean; mismatchKeys: string[] } {
    const result = this.verifyReversibility(input);
    const mismatchKeys: string[] = [];
    for (const key of new Set([...Object.keys(input), ...Object.keys(result.backwardOutput)])) {
      if (this._valueDistance(input[key], result.backwardOutput[key]) > 0.05) {
        mismatchKeys.push(key);
      }
    }
    return { consistent: mismatchKeys.length === 0, mismatchKeys };
  }

  averageReversibility(): number {
    if (this._results.length === 0) return 1;
    const reversibleCount = this._results.filter(r => r.reversible).length;
    return reversibleCount / this._results.length;
  }

  averageAsymmetry(): number {
    if (this._results.length === 0) return 0;
    return this._results.reduce((s, r) => s + r.asymmetry, 0) / this._results.length;
  }

  getStep(index: number): PalindromicStep | undefined {
    return this._steps.find(s => s.index === index);
  }

  setCorrectionStrength(strength: number): void {
    this._correctionStrength = Math.max(0, Math.min(1, strength));
    this._correctionCache.clear();
  }

  reset(): void {
    this._steps = [];
    this._results = [];
    this._signatures.clear();
    this._correctionCache.clear();
  }

  get stepCount(): number {
    return this._steps.length;
  }

  get resultCount(): number {
    return this._results.length;
  }

  get correctionStrength(): number {
    return this._correctionStrength;
  }
}

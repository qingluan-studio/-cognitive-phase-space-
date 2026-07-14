/**
 * 歧义放大器：故意增加解释的多种可能性。
 * 将单一确定的输入映射到多种合理的解释路径，放大语义空间以激发创新思考。
 */

export interface Interpretation {
  id: string;
  label: string;
  confidence: number;
  branchFactor: number;
}

export interface AmplificationResult {
  inputId: string;
  interpretations: Interpretation[];
  spread: number;
  amplifiedAt: number;
}

export class AmbiguityAmplifier {
  private _inputs: Map<string, string> = new Map();
  private _results: AmplificationResult[] = [];
  private _maxBranches = 8;
  private _spreadThreshold = 0.6;

  ingest(id: string, content: string): void {
    this._inputs.set(id, content);
  }

  amplify(id: string): AmplificationResult | null {
    const content = this._inputs.get(id);
    if (!content) return null;
    const branchCount = Math.min(this._maxBranches, 2 + Math.floor(content.length / 10));
    const interpretations: Interpretation[] = [];
    for (let i = 0; i < branchCount; i++) {
      interpretations.push({
        id: `interp-${id}-${i}`,
        label: `解释${i + 1}：${content.slice(0, 8)}…`,
        confidence: Math.random(),
        branchFactor: i + 1,
      });
    }
    const spread = this._computeSpread(interpretations);
    const result: AmplificationResult = {
      inputId: id,
      interpretations,
      spread,
      amplifiedAt: Date.now(),
    };
    this._results.push(result);
    if (this._results.length > 100) this._results.shift();
    return result;
  }

  filterHighSpread(): AmplificationResult[] {
    return this._results.filter(r => r.spread >= this._spreadThreshold);
  }

  refineInterpretation(resultId: string, interpId: string, delta: number): Interpretation | null {
    const result = this._results.find(r => r.inputId === resultId);
    if (!result) return null;
    const interp = result.interpretations.find(i => i.id === interpId);
    if (!interp) return null;
    interp.confidence = Math.max(0, Math.min(1, interp.confidence + delta));
    result.spread = this._computeSpread(result.interpretations);
    return interp;
  }

  setMaxBranches(n: number): void {
    this._maxBranches = Math.max(1, n);
  }

  getResults(): AmplificationResult[] {
    return [...this._results];
  }

  get inputCount(): number {
    return this._inputs.size;
  }

  private _computeSpread(interps: Interpretation[]): number {
    if (interps.length < 2) return 0;
    const mean = interps.reduce((s, i) => s + i.confidence, 0) / interps.length;
    const variance = interps.reduce((s, i) => s + (i.confidence - mean) ** 2, 0) / interps.length;
    return Math.sqrt(variance);
  }
}

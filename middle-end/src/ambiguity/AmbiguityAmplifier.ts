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
  private _semanticSpace: Map<string, number[]> = new Map();
  private _covarianceMatrix: number[][] = [];

  ingest(id: string, content: string): void {
    this._inputs.set(id, content);
    this._semanticSpace.set(id, this._embed(content));
  }

  amplify(id: string): AmplificationResult | null {
    const content = this._inputs.get(id);
    if (!content) return null;
    const branchCount = Math.min(this._maxBranches, 2 + Math.floor(content.length / 10));
    const interpretations: Interpretation[] = [];
    const embedding = this._semanticSpace.get(id) ?? this._embed(content);
    for (let i = 0; i < branchCount; i++) {
      const perturbation = embedding.map(v => v + (Math.random() - 0.5) * 0.2);
      const confidence = this._sigmoid(this._dot(embedding, perturbation));
      interpretations.push({
        id: `interp-${id}-${i}`,
        label: `解释${i + 1}：${content.slice(0, 8)}…`,
        confidence,
        branchFactor: i + 1,
      });
    }
    const spread = this._computeSpread(interpretations);
    this._covarianceMatrix = this._buildCovariance(interpretations);
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
    this._covarianceMatrix = this._buildCovariance(result.interpretations);
    return interp;
  }

  computeMahalanobisDistance(resultId: string, interpId: string): number {
    const result = this._results.find(r => r.inputId === resultId);
    if (!result) return -1;
    const idx = result.interpretations.findIndex(i => i.id === interpId);
    if (idx < 0 || this._covarianceMatrix.length === 0) return -1;
    const mean = result.interpretations.reduce((s, i) => s + i.confidence, 0) / result.interpretations.length;
    const diff = result.interpretations[idx].confidence - mean;
    const varInv = 1 / Math.max(this._covarianceMatrix[idx][idx], 1e-10);
    return Math.sqrt(diff * diff * varInv);
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

  private _embed(content: string): number[] {
    const vec: number[] = [0, 0, 0, 0];
    for (let i = 0; i < content.length; i++) {
      const code = content.charCodeAt(i);
      vec[i % 4] += code / 255;
    }
    const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
    return norm > 0 ? vec.map(v => v / norm) : vec;
  }

  private _dot(a: number[], b: number[]): number {
    return a.reduce((s, v, i) => s + v * (b[i] ?? 0), 0);
  }

  private _sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
  }

  private _buildCovariance(interps: Interpretation[]): number[][] {
    const n = interps.length;
    const matrix: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    const mean = interps.reduce((s, i) => s + i.confidence, 0) / n;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        matrix[i][j] = (interps[i].confidence - mean) * (interps[j].confidence - mean);
      }
    }
    return matrix;
  }
}

export interface ErrorArtifact {
  id: string;
  source: string;
  errorType: string;
  message: string;
  fragments: string[];
  harvestedAt: number;
  usefulness: number;
  tfidfVector: Map<string, number>;
}

export interface GlitchField {
  raw: string;
  tokens: string[];
  stackDepth: number;
  lineNumbers: number[];
}

export class GlitchHarvester {
  private _artifacts: ErrorArtifact[] = [];
  private _uselessTokens: Set<string> = new Set(['at', 'the', 'a', 'an', 'of', 'in', 'is', 'to', 'for', 'and', 'or']);
  private _minUsefulness = 0.3;
  private _totalHarvested = 0;
  private _documentFrequency: Map<string, number> = new Map();
  private _corpusSize = 0;
  private _typeFrequency: Map<string, number> = new Map();

  harvest(source: string, errorType: string, message: string, stack?: string): ErrorArtifact {
    const field = this._parseField(message, stack);
    const fragments = this._extractFragments(field);
    const tfidfVector = this._computeTfidf(fragments);
    const usefulness = this._evaluateUsefulness(fragments, field, tfidfVector);

    const artifact: ErrorArtifact = {
      id: `glitch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      source,
      errorType,
      message,
      fragments,
      harvestedAt: Date.now(),
      usefulness,
      tfidfVector,
    };
    this._totalHarvested++;
    this._corpusSize++;
    this._typeFrequency.set(errorType, (this._typeFrequency.get(errorType) ?? 0) + 1);
    for (const frag of fragments) {
      this._documentFrequency.set(frag, (this._documentFrequency.get(frag) ?? 0) + 1);
    }
    if (usefulness >= this._minUsefulness) {
      this._artifacts.push(artifact);
      if (this._artifacts.length > 200) this._artifacts.shift();
    }
    return artifact;
  }

  private _parseField(message: string, stack?: string): GlitchField {
    const raw = stack ? `${message}\n${stack}` : message;
    const tokens = raw.split(/[\s\n]+/).filter(t => t.length > 0);
    let stackDepth = 0;
    const lineNumbers: number[] = [];
    if (stack) {
      const lines = stack.split('\n');
      for (const line of lines) {
        if (line.trim().startsWith('at')) stackDepth++;
        const match = line.match(/:(\d+):?(\d*)/);
        if (match) lineNumbers.push(parseInt(match[1], 10));
      }
    }
    return { raw, tokens, stackDepth, lineNumbers };
  }

  private _extractFragments(field: GlitchField): string[] {
    const fragments = new Set<string>();
    for (const token of field.tokens) {
      const cleaned = token.replace(/[^\w.-]/g, '');
      if (cleaned.length >= 4 && !this._uselessTokens.has(cleaned.toLowerCase())) {
        fragments.add(cleaned);
      }
    }
    return Array.from(fragments);
  }

  private _computeTfidf(fragments: string[]): Map<string, number> {
    const tf = new Map<string, number>();
    for (const frag of fragments) tf.set(frag, (tf.get(frag) ?? 0) + 1);
    const total = fragments.length;
    const vector = new Map<string, number>();
    for (const [frag, count] of tf) {
      const tfVal = count / Math.max(1, total);
      const df = this._documentFrequency.get(frag) ?? 1;
      const idf = Math.log((this._corpusSize + 1) / df);
      vector.set(frag, tfVal * idf);
    }
    return vector;
  }

  private _evaluateUsefulness(fragments: string[], field: GlitchField, tfidf: Map<string, number>): number {
    let score = 0;
    const tfidfSum = Array.from(tfidf.values()).reduce((s, v) => s + v, 0);
    score += Math.min(0.4, tfidfSum * 0.1);
    score += Math.min(0.3, field.stackDepth * 0.03);
    if (field.raw.includes('line')) score += 0.1;
    if (field.lineNumbers.length > 0) score += 0.1;
    if (field.raw.match(/\d+/)) score += 0.05;
    const typeFreq = this._typeFrequency.size > 0 ? 1 : 0.5;
    score *= typeFreq;
    return Math.min(1, score);
  }

  queryByType(errorType: string): ErrorArtifact[] {
    return this._artifacts.filter(a => a.errorType === errorType);
  }

  queryByUsefulness(min: number): ErrorArtifact[] {
    return this._artifacts.filter(a => a.usefulness >= min);
  }

  queryByFragment(fragment: string): ErrorArtifact[] {
    return this._artifacts.filter(a => a.fragments.includes(fragment));
  }

  clusterByType(): Map<string, ErrorArtifact[]> {
    const clusters = new Map<string, ErrorArtifact[]>();
    for (const a of this._artifacts) {
      const list = clusters.get(a.errorType) ?? [];
      list.push(a);
      clusters.set(a.errorType, list);
    }
    return clusters;
  }

  recycle(artifactId: string): ErrorArtifact | null {
    const idx = this._artifacts.findIndex(a => a.id === artifactId);
    if (idx === -1) return null;
    const [removed] = this._artifacts.splice(idx, 1);
    return removed;
  }

  getArtifacts(): ErrorArtifact[] { return [...this._artifacts]; }
  get totalHarvested(): number { return this._totalHarvested; }
  get vocabularySize(): number { return this._documentFrequency.size; }

  setMinUsefulness(value: number): void {
    this._minUsefulness = Math.max(0, Math.min(1, value));
  }
}

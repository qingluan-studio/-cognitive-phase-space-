export interface Concept {
  id: string;
  name: string;
  domain: string;
  attributes: Record<string, unknown>;
  vector: number[];
}

export interface CatachresisResult {
  id: string;
  sourceIds: string[];
  splicedName: string;
  hybridAttributes: Record<string, unknown>;
  distortion: number;
  effectiveness: number;
  createdAt: number;
  warpMatrix: number[][];
}

export interface CompatibilityProbe {
  sourceIds: string[];
  rawCompatibility: number;
  warpedCompatibility: number;
  feasible: boolean;
  cosineSimilarity: number;
  euclideanDistance: number;
}

type VectorOp = 'add' | 'multiply' | 'project';

export class CatachresisModule {
  private _concepts: Map<string, Concept> = new Map();
  private _results: CatachresisResult[] = [];
  private _idCounter = 0;
  private _distortionThreshold = 0.8;
  private _effectivenessThreshold = 0.4;
  private _vectorDim = 24;
  private _defaultOp: VectorOp = 'add';
  private _warpStrength = 0.6;

  registerConcept(concept: Omit<Concept, 'id' | 'vector'>): Concept {
    const id = `concept-${++this._idCounter}-${Date.now()}`;
    const vector = this._attributesToVector(concept.attributes);
    const full: Concept = { ...concept, id, vector };
    this._concepts.set(id, full);
    return full;
  }

  probe(aId: string, bId: string): CompatibilityProbe {
    const a = this._concepts.get(aId);
    const b = this._concepts.get(bId);
    if (!a || !b) throw new Error('Concept(s) not found');
    const raw = this._rawCompat(a, b);
    const cosine = this._cosineSimilarity(a.vector, b.vector);
    const euclidean = this._euclideanDistance(a.vector, b.vector);
    const warped = this._warp(raw, cosine);
    return {
      sourceIds: [aId, bId], rawCompatibility: raw,
      warpedCompatibility: warped, feasible: warped >= this._effectivenessThreshold,
      cosineSimilarity: cosine, euclideanDistance: euclidean,
    };
  }

  splice(aId: string, bId: string, force: boolean = false): CatachresisResult {
    const probe = this.probe(aId, bId);
    if (!probe.feasible && !force) throw new Error('Splice infeasible; use force=true to override');
    const a = this._concepts.get(aId)!;
    const b = this._concepts.get(bId)!;
    const splicedName = `${a.name}-${b.name}`;
    const hybridAttributes = this._mergeAttributes(a.attributes, b.attributes);
    const warpMatrix = this._buildWarpMatrix(a.vector, b.vector);
    const warpedVector = this._applyWarp(a.vector, b.vector, warpMatrix);
    const syntheticId = `synth-${++this._idCounter}-${Date.now()}`;
    this._concepts.set(syntheticId, {
      id: syntheticId, name: splicedName, domain: 'hybrid',
      attributes: hybridAttributes, vector: warpedVector,
    });
    const result: CatachresisResult = {
      id: `catachresis-${++this._idCounter}-${Date.now()}`,
      sourceIds: [aId, bId], splicedName, hybridAttributes,
      distortion: 1 - probe.rawCompatibility, effectiveness: probe.warpedCompatibility,
      createdAt: Date.now(), warpMatrix,
    };
    this._results.push(result);
    return result;
  }

  spliceChain(conceptIds: string[]): CatachresisResult {
    if (conceptIds.length < 2) throw new Error('Need at least 2 concepts');
    let current = this.splice(conceptIds[0], conceptIds[1], true);
    for (let i = 2; i < conceptIds.length; i++) {
      const next = this._concepts.get(conceptIds[i]);
      if (!next) throw new Error(`Concept not found: ${conceptIds[i]}`);
      const synthetic = this._concepts.get(current.id);
      if (!synthetic) throw new Error(`Synthetic concept missing: ${current.id}`);
      current = this.splice(synthetic.id, conceptIds[i], true);
    }
    return current;
  }

  setDistortionThreshold(t: number): void {
    if (t < 0 || t > 1) throw new Error('Threshold must be between 0 and 1');
    this._distortionThreshold = t;
  }

  setEffectivenessThreshold(t: number): void {
    if (t < 0 || t > 1) throw new Error('Threshold must be between 0 and 1');
    this._effectivenessThreshold = t;
  }

  setWarpStrength(s: number): void {
    if (s < 0 || s > 1) throw new Error('Warp strength must be between 0 and 1');
    this._warpStrength = s;
  }

  setVectorOp(op: VectorOp): void { this._defaultOp = op; }

  getConcept(id: string): Concept | undefined { return this._concepts.get(id); }
  get concepts(): Concept[] { return Array.from(this._concepts.values()); }
  get results(): CatachresisResult[] { return [...this._results]; }
  get distortionThreshold(): number { return this._distortionThreshold; }
  get effectivenessThreshold(): number { return this._effectivenessThreshold; }

  _rawCompat(a: Concept, b: Concept): number {
    const keysA = Object.keys(a.attributes);
    const keysB = Object.keys(b.attributes);
    if (keysA.length === 0 || keysB.length === 0) return 0;
    const shared = keysA.filter(k => keysB.includes(k));
    const domainMatch = a.domain === b.domain ? 0.3 : 0;
    const attrOverlap = shared.length / Math.max(keysA.length, keysB.length);
    return Math.min(1, attrOverlap * 0.7 + domainMatch);
  }

  _warp(raw: number, cosineSim: number): number {
    const warpBoost = (1 - raw) * this._warpStrength * (0.5 + 0.5 * cosineSim);
    return Math.min(1, raw + warpBoost);
  }

  _mergeAttributes(a: Record<string, unknown>, b: Record<string, unknown>): Record<string, unknown> {
    const merged: Record<string, unknown> = { ...a };
    for (const [k, v] of Object.entries(b)) {
      if (k in merged) { merged[`${k}#a`] = merged[k]; merged[`${k}#b`] = v; }
      else merged[k] = v;
    }
    return merged;
  }

  _attributesToVector(attrs: Record<string, unknown>): number[] {
    const vec = new Array(this._vectorDim).fill(0);
    for (const key of Object.keys(attrs)) {
      const numVal = this._valueToNumber(attrs[key]);
      let hash = 0;
      for (let j = 0; j < key.length; j++) hash = (hash * 31 + key.charCodeAt(j)) >>> 0;
      vec[hash % this._vectorDim] = (vec[hash % this._vectorDim] + numVal) % 1.0;
      const idx2 = (hash * 7 + 13) % this._vectorDim;
      vec[idx2] = (vec[idx2] + numVal * 0.5) % 1.0;
    }
    const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
    if (norm > 0) for (let i = 0; i < vec.length; i++) vec[i] /= norm;
    return vec;
  }

  _valueToNumber(val: unknown): number {
    if (typeof val === 'number') return Math.abs(val) % 1.0;
    if (typeof val === 'boolean') return val ? 1 : 0;
    if (typeof val === 'string') {
      let h = 0;
      for (let i = 0; i < val.length; i++) h = (h * 31 + val.charCodeAt(i)) >>> 0;
      return (h % 1000) / 1000;
    }
    return 0.5;
  }

  _cosineSimilarity(a: number[], b: number[]): number {
    const n = Math.min(a.length, b.length);
    let dot = 0, ma = 0, mb = 0;
    for (let i = 0; i < n; i++) { dot += a[i] * b[i]; ma += a[i] * a[i]; mb += b[i] * b[i]; }
    const magA = Math.sqrt(ma), magB = Math.sqrt(mb);
    if (magA === 0 || magB === 0) return 0;
    return dot / (magA * magB);
  }

  _euclideanDistance(a: number[], b: number[]): number {
    const n = Math.min(a.length, b.length);
    let sum = 0;
    for (let i = 0; i < n; i++) { const d = a[i] - b[i]; sum += d * d; }
    return Math.sqrt(sum);
  }

  _buildWarpMatrix(a: number[], b: number[]): number[][] {
    const n = a.length;
    const m: number[][] = [];
    for (let i = 0; i < n; i++) {
      m[i] = new Array(n).fill(0);
      for (let j = 0; j < n; j++) {
        const diff = Math.sin((i - j) * 0.1) * this._warpStrength;
        m[i][j] = (i === j ? 1.0 : 0.0) + diff * a[i] * b[j];
      }
    }
    return m;
  }

  _applyWarp(a: number[], b: number[], matrix: number[][]): number[] {
    const n = a.length;
    const result = new Array(n).fill(0);
    const transformed = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) transformed[i] += matrix[i][j] * b[j];
    }
    switch (this._defaultOp) {
      case 'add':
        for (let i = 0; i < n; i++) result[i] = (a[i] + transformed[i]) * 0.5;
        break;
      case 'multiply':
        for (let i = 0; i < n; i++) result[i] = a[i] * transformed[i];
        break;
      case 'project': {
        const dot = a.reduce((s, v, i) => s + v * b[i], 0);
        const magSq = b.reduce((s, v) => s + v * v, 0);
        const proj = magSq > 0 ? dot / magSq : 0;
        for (let i = 0; i < n; i++) {
          result[i] = a[i] * (1 - this._warpStrength) + transformed[i] * this._warpStrength + proj * 0.1;
        }
        break;
      }
      default:
        for (let i = 0; i < n; i++) result[i] = (a[i] + transformed[i]) * 0.5;
    }
    const norm = Math.sqrt(result.reduce((s, v) => s + v * v, 0));
    if (norm > 0) for (let i = 0; i < n; i++) result[i] /= norm;
    return result;
  }
}

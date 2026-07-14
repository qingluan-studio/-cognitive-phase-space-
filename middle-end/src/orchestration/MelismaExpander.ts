export type OrnamentType = 'trill' | 'turn' | 'mordent' | 'appoggiatura' | 'custom';

export interface MelismaOrnament {
  id: string;
  name: string;
  type: OrnamentType;
  magnitude: number;
  transformationMatrix: number[][];
}

export interface ExpansionResult {
  coreId: string;
  original: Record<string, unknown>;
  expanded: Record<string, unknown>;
  ornamentsApplied: string[];
  richness: number;
  entropy: number;
  complexity: number;
}

export interface CoreEntry {
  id: string;
  data: Record<string, unknown>;
  registeredAt: number;
  baseEntropy: number;
}

export class MelismaExpander {
  private _cores: Map<string, CoreEntry> = new Map();
  private _ornaments: Map<string, MelismaOrnament> = new Map();
  private _expansions: ExpansionResult[] = [];
  private _idCounter = 0;
  private _maxOrnamentsPerCore = 5;
  private _entropyWeight = 0.4;

  registerCore(data: Record<string, unknown>): CoreEntry {
    const id = `core-${++this._idCounter}-${Date.now()}`;
    const entry: CoreEntry = { id, data: { ...data }, registeredAt: Date.now(), baseEntropy: this._computeEntropy(data) };
    this._cores.set(id, entry);
    return entry;
  }

  registerOrnament(name: string, type: OrnamentType, magnitude: number = 0.3): MelismaOrnament {
    if (magnitude < 0 || magnitude > 1) throw new Error('Magnitude must be in [0,1]');
    const id = `orn-${++this._idCounter}-${Date.now()}`;
    const ornament: MelismaOrnament = { id, name, type, magnitude, transformationMatrix: this._generateMatrix(type, magnitude) };
    this._ornaments.set(id, ornament);
    return ornament;
  }

  expand(coreId: string, ornamentIds?: string[]): ExpansionResult {
    const core = this._cores.get(coreId);
    if (!core) throw new Error(`Core not found: ${coreId}`);
    const selected = ornamentIds ? ornamentIds.map(id => this._ornaments.get(id)).filter((o): o is MelismaOrnament => !!o) : Array.from(this._ornaments.values()).slice(0, this._maxOrnamentsPerCore);
    const expanded: Record<string, unknown> = { ...core.data };
    const appliedIds: string[] = [];
    for (const ornament of selected) { this._applyOrnament(expanded, ornament); appliedIds.push(ornament.id); }
    const entropy = this._computeEntropy(expanded);
    return {
      coreId,
      original: { ...core.data },
      expanded,
      ornamentsApplied: appliedIds,
      richness: this._computeRichness(core.data, expanded),
      entropy,
      complexity: this._computeComplexity(core, expanded, selected),
    };
  }

  expandAll(ornamentIds?: string[]): ExpansionResult[] {
    const results: ExpansionResult[] = [];
    for (const coreId of this._cores.keys()) results.push(this.expand(coreId, ornamentIds));
    return results;
  }

  setMaxOrnamentsPerCore(n: number): void { if (n < 0) throw new Error('Must be non-negative'); this._maxOrnamentsPerCore = n; }
  setEntropyWeight(w: number): void { if (w < 0 || w > 1) throw new Error('Weight must be in [0,1]'); this._entropyWeight = w; }
  removeOrnament(ornamentId: string): boolean { return this._ornaments.delete(ornamentId); }
  getCore(id: string): CoreEntry | undefined { return this._cores.get(id); }
  getOrnament(id: string): MelismaOrnament | undefined { return this._ornaments.get(id); }

  get cores(): CoreEntry[] { return Array.from(this._cores.values()); }
  get ornaments(): MelismaOrnament[] { return Array.from(this._ornaments.values()); }
  get expansions(): ExpansionResult[] { return [...this._expansions]; }
  get maxOrnamentsPerCore(): number { return this._maxOrnamentsPerCore; }
  get entropyWeight(): number { return this._entropyWeight; }

  private _generateMatrix(type: OrnamentType, magnitude: number): number[][] {
    const scale = 1 + magnitude;
    switch (type) {
      case 'trill': return [[Math.cos(magnitude), -Math.sin(magnitude)], [Math.sin(magnitude), Math.cos(magnitude)]];
      case 'turn': return [[0, -scale], [scale, 0]];
      case 'mordent': return [[1, magnitude], [-magnitude, 1]];
      case 'appoggiatura': return [[1, magnitude * 2], [0, 1]];
      default: return [[scale, 0], [0, scale]];
    }
  }

  private _applyOrnament(data: Record<string, unknown>, ornament: MelismaOrnament): void {
    const key = `__melisma_${ornament.type}_${ornament.name}`;
    const values: number[] = [];
    const extract = (obj: Record<string, unknown>) => {
      for (const v of Object.values(obj)) { if (typeof v === 'number') values.push(v); else if (typeof v === 'object' && v !== null) extract(v as Record<string, unknown>); }
    };
    extract(data);
    const transformed = this._applyMatrix(values, ornament.transformationMatrix);
    data[key] = { type: ornament.type, magnitude: ornament.magnitude, transformation: ornament.transformationMatrix, appliedTo: values.length, transformed };
    let idx = 0;
    const inject = (obj: Record<string, unknown>) => {
      for (const [k, v] of Object.entries(obj)) { if (typeof v === 'number' && idx < transformed.length) obj[k] = transformed[idx++]; else if (typeof v === 'object' && v !== null) inject(v as Record<string, unknown>); }
    };
    inject(data);
  }

  private _applyMatrix(values: number[], matrix: number[][]): number[] {
    if (values.length === 0 || matrix.length === 0) return values;
    const dim = matrix.length;
    const result: number[] = [];
    for (let i = 0; i < values.length; i += dim) {
      for (let row = 0; row < dim; row++) {
        let sum = 0;
        for (let col = 0; col < dim; col++) sum += matrix[row][col] * (values[i + col] || 0);
        result.push(sum);
      }
    }
    return result;
  }

  private _computeEntropy(data: Record<string, unknown>): number {
    const values: number[] = [];
    const extract = (obj: Record<string, unknown>) => {
      for (const v of Object.values(obj)) { if (typeof v === 'number') values.push(v); else if (typeof v === 'object' && v !== null) extract(v as Record<string, unknown>); }
    };
    extract(data);
    if (values.length === 0) return 0;
    const freq: Record<number, number> = {};
    for (const v of values) { const r = Math.round(v * 100) / 100; freq[r] = (freq[r] || 0) + 1; }
    const total = values.length;
    let entropy = 0;
    for (const count of Object.values(freq)) { const prob = count / total; entropy -= prob * Math.log2(prob); }
    const maxEntropy = Math.log2(total);
    return maxEntropy > 0 ? entropy / maxEntropy : 0;
  }

  private _computeComplexity(core: CoreEntry, expanded: Record<string, unknown>, ornaments: MelismaOrnament[]): number {
    const entropyChange = this._computeEntropy(expanded) - core.baseEntropy;
    const diversity = ornaments.length / this._maxOrnamentsPerCore;
    const matrixComplexity = ornaments.reduce((sum, o) => sum + this._matrixComplexity(o.transformationMatrix), 0) / ornaments.length || 0;
    return this._entropyWeight * entropyChange + (1 - this._entropyWeight) * (diversity + matrixComplexity) / 2;
  }

  private _matrixComplexity(matrix: number[][]): number {
    let complexity = 0;
    for (const row of matrix) for (const val of row) complexity += Math.abs(val - (val === 1 ? 1 : 0));
    return matrix.length > 0 ? complexity / (matrix.length * matrix[0].length) : 0;
  }

  private _computeRichness(original: Record<string, unknown>, expanded: Record<string, unknown>): number {
    const countKeys = (obj: Record<string, unknown>): number => {
      let count = Object.keys(obj).length;
      for (const v of Object.values(obj)) if (typeof v === 'object' && v !== null) count += countKeys(v as Record<string, unknown>);
      return count;
    };
    const origKeys = countKeys(original);
    return origKeys === 0 ? 0 : Math.min(1, countKeys(expanded) / (origKeys * 2));
  }
}
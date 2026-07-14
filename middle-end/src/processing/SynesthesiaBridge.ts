export type SensoryDomain = 'numeric' | 'textual' | 'spatial' | 'temporal';

export interface SynestheticMapping {
  fromDomain: SensoryDomain;
  toDomain: SensoryDomain;
  transform: (input: Record<string, unknown>) => Record<string, unknown>;
  inverse: (output: Record<string, unknown>) => Record<string, unknown>;
}

export interface BridgedResult {
  original: Record<string, unknown>;
  bridged: Record<string, unknown>;
  restored: Record<string, unknown>;
  fidelityLoss: number;
  mutualInformation: number;
  domainShift: number;
}

export class SynesthesiaBridge {
  private _mappings: Map<string, SynestheticMapping> = new Map();
  private _results: BridgedResult[] = [];
  private _activeMappingId: string | null = null;
  private _maxResults = 64;
  private _distributionHistory: Map<string, number[]> = new Map();
  private _procrustesMatrix: Map<string, number[]> = new Map();

  registerMapping(id: string, mapping: SynestheticMapping): void {
    this._mappings.set(id, mapping);
    this._distributionHistory.set(id, []);
    this._procrustesMatrix.set(id, new Array(64).fill(0).map((_, i) => i % 9 === 0 ? 1 : 0));
    if (this._activeMappingId === null) this._activeMappingId = id;
  }

  activateMapping(id: string): boolean {
    if (!this._mappings.has(id)) return false;
    this._activeMappingId = id;
    return true;
  }

  bridge(input: Record<string, unknown>): BridgedResult {
    const mapping = this._mappings.get(this._activeMappingId ?? '');
    if (!mapping) throw new Error('No active synesthetic mapping');
    const bridged = mapping.transform(input);
    const adapted = this._procrustesAdjust(bridged, this._activeMappingId!);
    const restored = mapping.inverse(adapted);
    const result: BridgedResult = {
      original: input, bridged: adapted, restored,
      fidelityLoss: this._computeLoss(input, restored),
      mutualInformation: this._mutualInformation(input, restored),
      domainShift: this._domainShiftMagnitude(input, adapted),
    };
    this._results.push(result);
    this._updateDistribution(this._activeMappingId!, adapted);
    if (this._results.length > this._maxResults) this._results.shift();
    return result;
  }

  private _procrustesAdjust(bridged: Record<string, unknown>, mappingId: string): Record<string, unknown> {
    const matrix = this._procrustesMatrix.get(mappingId);
    if (!matrix) return bridged;
    const nums = this._extractNumbers(bridged).slice(0, 8);
    while (nums.length < 8) nums.push(0);
    const transformed: number[] = new Array(8).fill(0);
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) transformed[i] += matrix[i * 8 + j] * nums[j];
    const result = { ...bridged };
    const keys = Object.keys(bridged).filter(k => typeof bridged[k] === 'number').slice(0, 8);
    for (let i = 0; i < keys.length; i++) result[keys[i]] = transformed[i];
    return result;
  }

  private _extractNumbers(obj: Record<string, unknown>): number[] {
    return Object.keys(obj).filter(k => typeof obj[k] === 'number').map(k => Number(obj[k]));
  }

  private _computeLoss(original: Record<string, unknown>, restored: Record<string, unknown>): number {
    const keys = new Set([...Object.keys(original), ...Object.keys(restored)]);
    let weightedDiff = 0, totalWeight = 0;
    for (const key of keys) {
      const ov = original[key], rv = restored[key];
      const weight = typeof ov === 'number' && typeof rv === 'number' ? 2 : 1;
      totalWeight += weight;
      if (typeof ov === 'number' && typeof rv === 'number') {
        weightedDiff += weight * Math.min(1, Math.abs(ov - rv) / Math.max(Math.abs(ov), Math.abs(rv), 1));
      } else if (String(ov) !== String(rv)) weightedDiff += weight;
    }
    return totalWeight === 0 ? 0 : weightedDiff / totalWeight;
  }

  private _mutualInformation(a: Record<string, unknown>, b: Record<string, unknown>): number {
    const keysA = new Set(Object.keys(a)), keysB = new Set(Object.keys(b));
    const shared = [...keysA].filter(k => keysB.has(k));
    const keyMI = (keysA.size + keysB.size - shared.length) === 0 ? 0 : shared.length / (keysA.size + keysB.size - shared.length);
    let valueMI = 0, valCount = 0;
    for (const k of shared) {
      const va = a[k], vb = b[k];
      if (typeof va === 'number' && typeof vb === 'number') {
        valueMI += Math.max(0, 1 - Math.abs(va - vb) / Math.max(Math.abs(va), Math.abs(vb), 1e-6));
      } else if (String(va) === String(vb)) valueMI += 1;
      else valueMI += 0.3;
      valCount++;
    }
    return keyMI * 0.4 + (valCount === 0 ? 0 : valueMI / valCount) * 0.6;
  }

  private _domainShiftMagnitude(original: Record<string, unknown>, bridged: Record<string, unknown>): number {
    const o = this._extractNumbers(original), b = this._extractNumbers(bridged);
    if (o.length === 0 || b.length === 0) return 0.5;
    const oMean = o.reduce((s, n) => s + n, 0) / o.length;
    const bMean = b.reduce((s, n) => s + n, 0) / b.length;
    const oVar = o.reduce((s, n) => s + (n - oMean) ** 2, 0) / o.length;
    const bVar = b.reduce((s, n) => s + (n - bMean) ** 2, 0) / b.length;
    const meanShift = Math.abs(oMean - bMean) / Math.max(Math.abs(oMean), 1);
    const varShift = Math.abs(Math.sqrt(oVar) - Math.sqrt(bVar)) / Math.max(Math.sqrt(oVar), 1);
    return Math.min(1, (meanShift + varShift) / 2);
  }

  private _updateDistribution(mappingId: string, bridged: Record<string, unknown>): void {
    const history = this._distributionHistory.get(mappingId);
    if (!history) return;
    const nums = this._extractNumbers(bridged);
    if (nums.length === 0) return;
    history.push(nums.reduce((s, n) => s + n, 0) / nums.length);
    if (history.length > 100) history.shift();
    if (history.length >= 20) this._refineProcrustes(mappingId, history);
  }

  private _refineProcrustes(mappingId: string, history: number[]): void {
    const matrix = this._procrustesMatrix.get(mappingId);
    if (!matrix) return;
    const target = history.slice(-20).reduce((s, n) => s + n, 0) / 20;
    const alpha = 0.008;
    for (let i = 0; i < 8; i++) matrix[i * 8 + i] = matrix[i * 8 + i] * (1 - alpha) + (target / (target + 1)) * alpha;
  }

  batchBridge(inputs: Record<string, unknown>[]): BridgedResult[] { return inputs.map(i => this.bridge(i)); }

  crossValidate(input: Record<string, unknown>, mappingIdA: string, mappingIdB: string): number {
    const prevActive = this._activeMappingId;
    this._activeMappingId = mappingIdA;
    const resultA = this.bridge(input);
    this._activeMappingId = mappingIdB;
    const resultB = this.bridge(input);
    this._activeMappingId = prevActive;
    return (Math.abs(resultA.fidelityLoss - resultB.fidelityLoss) + Math.abs(resultA.mutualInformation - resultB.mutualInformation)) / 2;
  }

  averageFidelityLoss(): number {
    return this._results.length === 0 ? 0 : this._results.reduce((s, r) => s + r.fidelityLoss, 0) / this._results.length;
  }

  averageMutualInformation(): number {
    return this._results.length === 0 ? 0 : this._results.reduce((s, r) => s + r.mutualInformation, 0) / this._results.length;
  }

  mappingEntropy(mappingId: string): number {
    const history = this._distributionHistory.get(mappingId);
    if (!history || history.length < 2) return 0;
    const mean = history.reduce((s, n) => s + n, 0) / history.length;
    const variance = history.reduce((s, n) => s + (n - mean) ** 2, 0) / history.length;
    return Math.log(1 + Math.sqrt(variance));
  }

  listMappings(): string[] { return Array.from(this._mappings.keys()); }

  removeMapping(id: string): boolean {
    if (this._activeMappingId === id) this._activeMappingId = null;
    this._distributionHistory.delete(id);
    this._procrustesMatrix.delete(id);
    return this._mappings.delete(id);
  }

  reset(): void {
    this._results = [];
    for (const id of this._mappings.keys()) {
      this._distributionHistory.set(id, []);
      this._procrustesMatrix.set(id, new Array(64).fill(0).map((_, i) => i % 9 === 0 ? 1 : 0));
    }
  }

  get mappingCount(): number { return this._mappings.size; }
  get activeMappingId(): string | null { return this._activeMappingId; }
  get resultCount(): number { return this._results.length; }
}

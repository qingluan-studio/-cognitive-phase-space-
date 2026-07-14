/**
 * 联觉桥模块：将数据类型 A 映射为类型 B 的处理逻辑进行处理，
 * 再还原回原始域，实现跨模态的间接处理与互校验。
 */

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
}

export class SynesthesiaBridge {
  private _mappings: Map<string, SynestheticMapping> = new Map();
  private _results: BridgedResult[] = [];
  private _activeMappingId: string | null = null;
  private _maxResults = 32;

  registerMapping(id: string, mapping: SynestheticMapping): void {
    this._mappings.set(id, mapping);
    if (this._activeMappingId === null) this._activeMappingId = id;
  }

  activateMapping(id: string): boolean {
    if (!this._mappings.has(id)) return false;
    this._activeMappingId = id;
    return true;
  }

  bridge(input: Record<string, unknown>): BridgedResult {
    const mapping = this._mappings.get(this._activeMappingId ?? '');
    if (!mapping) {
      throw new Error('No active synesthetic mapping');
    }

    const bridged = mapping.transform(input);
    const restored = mapping.inverse(bridged);
    const fidelityLoss = this._computeLoss(input, restored);

    const result: BridgedResult = { original: input, bridged, restored, fidelityLoss };
    this._results.push(result);
    if (this._results.length > this._maxResults) this._results.shift();
    return result;
  }

  private _computeLoss(original: Record<string, unknown>, restored: Record<string, unknown>): number {
    const keys = new Set([...Object.keys(original), ...Object.keys(restored)]);
    let diff = 0;
    let total = 0;
    for (const key of keys) {
      total++;
      if (String(original[key]) !== String(restored[key])) diff++;
    }
    return total === 0 ? 0 : diff / total;
  }

  batchBridge(inputs: Record<string, unknown>[]): BridgedResult[] {
    return inputs.map(i => this.bridge(i));
  }

  crossValidate(input: Record<string, unknown>, mappingIdA: string, mappingIdB: string): number {
    const prevActive = this._activeMappingId;
    this._activeMappingId = mappingIdA;
    const resultA = this.bridge(input);
    this._activeMappingId = mappingIdB;
    const resultB = this.bridge(input);
    this._activeMappingId = prevActive;
    return Math.abs(resultA.fidelityLoss - resultB.fidelityLoss);
  }

  averageFidelityLoss(): number {
    if (this._results.length === 0) return 0;
    return this._results.reduce((s, r) => s + r.fidelityLoss, 0) / this._results.length;
  }

  listMappings(): string[] {
    return Array.from(this._mappings.keys());
  }

  removeMapping(id: string): boolean {
    if (this._activeMappingId === id) this._activeMappingId = null;
    return this._mappings.delete(id);
  }

  reset(): void {
    this._results = [];
  }

  get mappingCount(): number {
    return this._mappings.size;
  }

  get activeMappingId(): string | null {
    return this._activeMappingId;
  }

  get resultCount(): number {
    return this._results.length;
  }
}

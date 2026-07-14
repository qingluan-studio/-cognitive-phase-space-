/** 花腔扩展器 - 对核心数据添加装饰性扩展，丰富表达 */

export type OrnamentType = 'trill' | 'turn' | 'mordent' | 'appoggiatura' | 'custom';

export interface MelismaOrnament {
  id: string;
  name: string;
  type: OrnamentType;
  magnitude: number;
}

export interface ExpansionResult {
  coreId: string;
  original: Record<string, unknown>;
  expanded: Record<string, unknown>;
  ornamentsApplied: string[];
  richness: number;
}

export interface CoreEntry {
  id: string;
  data: Record<string, unknown>;
  registeredAt: number;
}

export class MelismaExpander {
  private _cores: Map<string, CoreEntry> = new Map();
  private _ornaments: Map<string, MelismaOrnament> = new Map();
  private _expansions: ExpansionResult[] = [];
  private _idCounter = 0;
  private _maxOrnamentsPerCore = 5;

  registerCore(data: Record<string, unknown>): CoreEntry {
    const id = `core-${++this._idCounter}-${Date.now()}`;
    const entry: CoreEntry = { id, data: { ...data }, registeredAt: Date.now() };
    this._cores.set(id, entry);
    return entry;
  }

  registerOrnament(name: string, type: OrnamentType, magnitude: number = 0.3): MelismaOrnament {
    if (magnitude < 0 || magnitude > 1) throw new Error('Magnitude must be in [0,1]');
    const id = `orn-${++this._idCounter}-${Date.now()}`;
    const ornament: MelismaOrnament = { id, name, type, magnitude };
    this._ornaments.set(id, ornament);
    return ornament;
  }

  expand(coreId: string, ornamentIds?: string[]): ExpansionResult {
    const core = this._cores.get(coreId);
    if (!core) throw new Error(`Core not found: ${coreId}`);
    const selected = ornamentIds
      ? ornamentIds
          .map(id => this._ornaments.get(id))
          .filter((o): o is MelismaOrnament => !!o)
      : Array.from(this._ornaments.values()).slice(0, this._maxOrnamentsPerCore);
    const expanded: Record<string, unknown> = { ...core.data };
    for (const ornament of selected) {
      this._applyOrnament(expanded, ornament);
    }
    const richness = this._computeRichness(core.data, expanded);
    const result: ExpansionResult = {
      coreId,
      original: { ...core.data },
      expanded,
      ornamentsApplied: selected.map(o => o.id),
      richness,
    };
    this._expansions.push(result);
    return result;
  }

  expandAll(ornamentIds?: string[]): ExpansionResult[] {
    const results: ExpansionResult[] = [];
    for (const coreId of this._cores.keys()) {
      results.push(this.expand(coreId, ornamentIds));
    }
    return results;
  }

  setMaxOrnamentsPerCore(n: number): void {
    if (n < 0) throw new Error('Must be non-negative');
    this._maxOrnamentsPerCore = n;
  }

  removeOrnament(ornamentId: string): boolean {
    return this._ornaments.delete(ornamentId);
  }

  getCore(id: string): CoreEntry | undefined {
    return this._cores.get(id);
  }

  getOrnament(id: string): MelismaOrnament | undefined {
    return this._ornaments.get(id);
  }

  get cores(): CoreEntry[] {
    return Array.from(this._cores.values());
  }

  get ornaments(): MelismaOrnament[] {
    return Array.from(this._ornaments.values());
  }

  get expansions(): ExpansionResult[] {
    return [...this._expansions];
  }

  get maxOrnamentsPerCore(): number {
    return this._maxOrnamentsPerCore;
  }

  private _applyOrnament(data: Record<string, unknown>, ornament: MelismaOrnament): void {
    const key = `__melisma_${ornament.type}_${ornament.name}`;
    switch (ornament.type) {
      case 'trill':
        data[key] = { oscillation: ornament.magnitude, original: data };
        break;
      case 'turn':
        data[key] = { rotation: ornament.magnitude * 360 };
        break;
      case 'mordent':
        data[key] = { bite: ornament.magnitude };
        break;
      case 'appoggiatura':
        data[key] = { lean: ornament.magnitude };
        break;
      default:
        data[key] = { custom: ornament.magnitude };
    }
  }

  private _computeRichness(
    original: Record<string, unknown>,
    expanded: Record<string, unknown>
  ): number {
    const originalKeys = Object.keys(original).length;
    const expandedKeys = Object.keys(expanded).length;
    if (originalKeys === 0) return 0;
    return Math.min(1, expandedKeys / (originalKeys * 2));
  }
}

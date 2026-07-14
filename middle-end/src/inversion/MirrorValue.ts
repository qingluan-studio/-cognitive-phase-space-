/**
 * 镜像值：所有数值取反，正变负，大变小。
 * 对注册的数值进行镜像映射：正负取反、大小相对极值反转。
 */

export interface MirrorEntry {
  id: string;
  original: number;
  mirrored: number;
  mirroredAt: number;
}

export interface MirrorConfig {
  negate: boolean;
  invertScale: boolean;
  scaleMax: number;
}

export class MirrorValue {
  private _entries: Map<string, MirrorEntry> = new Map();
  private _config: MirrorConfig = { negate: true, invertScale: false, scaleMax: 100 };
  private _totalMirrored = 0;

  register(id: string, value: number): MirrorEntry {
    const mirrored = this._computeMirror(value);
    const entry: MirrorEntry = { id, original: value, mirrored, mirroredAt: Date.now() };
    this._entries.set(id, entry);
    this._totalMirrored++;
    return entry;
  }

  private _computeMirror(value: number): number {
    let result = value;
    if (this._config.negate) result = -result;
    if (this._config.invertScale) {
      result = this._config.scaleMax - result;
    }
    return result;
  }

  update(id: string, value: number): MirrorEntry | null {
    const entry = this._entries.get(id);
    if (!entry) return null;
    entry.original = value;
    entry.mirrored = this._computeMirror(value);
    entry.mirroredAt = Date.now();
    return entry;
  }

  setConfig(config: Partial<MirrorConfig>): MirrorConfig {
    this._config = { ...this._config, ...config };
    for (const entry of this._entries.values()) {
      entry.mirrored = this._computeMirror(entry.original);
    }
    return { ...this._config };
  }

  mirrorSum(): number {
    let sum = 0;
    for (const entry of this._entries.values()) sum += entry.mirrored;
    return sum;
  }

  mirrorAbs(id: string): number | null {
    const entry = this._entries.get(id);
    return entry ? Math.abs(entry.mirrored) : null;
  }

  getEntry(id: string): MirrorEntry | null {
    return this._entries.get(id) ?? null;
  }

  getAllEntries(): MirrorEntry[] {
    return Array.from(this._entries.values());
  }

  get totalMirrored(): number {
    return this._totalMirrored;
  }
}

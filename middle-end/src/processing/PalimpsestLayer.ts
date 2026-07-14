/**
 * 重写羊皮卷模块：新数据覆盖旧数据但保留褪色痕迹，
 * 形成时间深度叠加层，可考古式回溯历史状态。
 */

export interface PalimpsestLayerData {
  depth: number;
  content: Record<string, unknown>;
  opacity: number;
  writtenAt: number;
  faded: boolean;
}

export interface PalimpsestEntry {
  id: string;
  layers: PalimpsestLayerData[];
  currentContent: Record<string, unknown>;
}

export class PalimpsestLayer {
  private _entries: Map<string, PalimpsestEntry> = new Map();
  private _maxLayers = 8;
  private _fadeRate = 0.2;
  private _totalWrites = 0;

  write(id: string, content: Record<string, unknown>): PalimpsestEntry {
    const existing = this._entries.get(id);
    const now = Date.now();

    const newLayer: PalimpsestLayerData = {
      depth: existing ? existing.layers.length : 0,
      content,
      opacity: 1,
      writtenAt: now,
      faded: false,
    };

    if (existing) {
      existing.layers.unshift(newLayer);
      this._fadeOlder(existing);
      if (existing.layers.length > this._maxLayers) {
        existing.layers = existing.layers.slice(0, this._maxLayers);
      }
      existing.currentContent = content;
    } else {
      this._entries.set(id, {
        id,
        layers: [newLayer],
        currentContent: content,
      });
    }

    this._totalWrites++;
    return this._entries.get(id)!;
  }

  private _fadeOlder(entry: PalimpsestEntry): void {
    for (let i = 1; i < entry.layers.length; i++) {
      entry.layers[i].opacity = Math.max(0, entry.layers[i].opacity - this._fadeRate);
      entry.layers[i].faded = entry.layers[i].opacity < 0.3;
    }
  }

  read(id: string): Record<string, unknown> | undefined {
    return this._entries.get(id)?.currentContent;
  }

  archaeology(id: string, depth: number): PalimpsestLayerData | undefined {
    const entry = this._entries.get(id);
    if (!entry) return undefined;
    return entry.layers[depth];
  }

  ghostContent(id: string): Record<string, unknown> {
    const entry = this._entries.get(id);
    if (!entry) return {};
    const ghost: Record<string, unknown> = {};
    for (const layer of entry.layers) {
      if (layer.opacity < 0.5) {
        for (const key of Object.keys(layer.content)) {
          if (!(key in ghost)) {
            ghost[`ghost_${key}`] = layer.content[key];
          }
        }
      }
    }
    return ghost;
  }

  mergeGhosts(id: string): Record<string, unknown> {
    const entry = this._entries.get(id);
    if (!entry) return {};
    const merged: Record<string, unknown> = { ...entry.currentContent };
    for (const layer of entry.layers.slice(1)) {
      for (const [key, value] of Object.entries(layer.content)) {
        if (!(key in merged)) merged[key] = value;
      }
    }
    return merged;
  }

  setFadeRate(rate: number): void {
    this._fadeRate = Math.max(0, Math.min(1, rate));
  }

  setMaxLayers(max: number): void {
    this._maxLayers = Math.max(1, max);
  }

  depthOf(id: string): number {
    return this._entries.get(id)?.layers.length ?? 0;
  }

  reset(): void {
    this._entries.clear();
    this._totalWrites = 0;
  }

  get entryCount(): number {
    return this._entries.size;
  }

  get totalWrites(): number {
    return this._totalWrites;
  }

  get maxLayers(): number {
    return this._maxLayers;
  }
}

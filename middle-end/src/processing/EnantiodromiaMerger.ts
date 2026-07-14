/**
 * 物极必反合并器模块：当对立面达到极端时自动融合为
 * 更高阶的统一体，黑与白在极限处融合为包含二者的灰阶整体。
 */

export interface PolarExtremes {
  id: string;
  positive: { value: number; payload: Record<string, unknown> };
  negative: { value: number; payload: Record<string, unknown> };
  threshold: number;
}

export interface SynthesizedUnity {
  fromId: string;
  mergedPayload: Record<string, unknown>;
  synthesisLevel: number;
  resolved: boolean;
}

export class EnantiodromiaMerger {
  private _extremes: Map<string, PolarExtremes> = new Map();
  private _syntheses: SynthesizedUnity[] = [];
  private _defaultThreshold = 0.9;
  private _autoTrigger = true;

  register(extremes: PolarExtremes): void {
    this._extremes.set(extremes.id, extremes);
    if (this._autoTrigger) this.tryMerge(extremes.id);
  }

  setThreshold(id: string, threshold: number): void {
    const ex = this._extremes.get(id);
    if (ex) ex.threshold = threshold;
  }

  setAutoTrigger(enabled: boolean): void {
    this._autoTrigger = enabled;
  }

  tryMerge(id: string): SynthesizedUnity | undefined {
    const ex = this._extremes.get(id);
    if (!ex) return undefined;

    const posExtreme = ex.positive.value >= ex.threshold;
    const negExtreme = ex.negative.value <= -ex.threshold;
    if (!posExtreme || !negExtreme) return undefined;

    const mergedPayload = this._synthesize(ex);
    const synthesisLevel = Math.min(1, (Math.abs(ex.positive.value) + Math.abs(ex.negative.value)) / 2);
    const unity: SynthesizedUnity = {
      fromId: id,
      mergedPayload,
      synthesisLevel,
      resolved: true,
    };
    this._syntheses.push(unity);
    return unity;
  }

  private _synthesize(ex: PolarExtremes): Record<string, unknown> {
    const merged: Record<string, unknown> = {};
    const posKeys = Object.keys(ex.positive.payload);
    const negKeys = Object.keys(ex.negative.payload);
    const allKeys = new Set([...posKeys, ...negKeys]);

    for (const key of allKeys) {
      const posVal = ex.positive.payload[key];
      const negVal = ex.negative.payload[key];
      if (typeof posVal === 'number' && typeof negVal === 'number') {
        merged[key] = (posVal + negVal) / 2;
      } else if (posVal !== undefined && negVal !== undefined) {
        merged[key] = `${String(posVal)}|${String(negVal)}`;
      } else {
        merged[key] = posVal ?? negVal;
      }
    }
    merged._synthesis = true;
    merged._tension = Math.abs(ex.positive.value - ex.negative.value);
    return merged;
  }

  mergeAll(): SynthesizedUnity[] {
    const results: SynthesizedUnity[] = [];
    for (const id of this._extremes.keys()) {
      const unity = this.tryMerge(id);
      if (unity) results.push(unity);
    }
    return results;
  }

  pendingExtremes(): PolarExtremes[] {
    return Array.from(this._extremes.values()).filter(e => !this._syntheses.some(s => s.fromId === e.id));
  }

  tensionLevel(id: string): number {
    const ex = this._extremes.get(id);
    if (!ex) return 0;
    return Math.abs(ex.positive.value - ex.negative.value);
  }

  averageSynthesisLevel(): number {
    if (this._syntheses.length === 0) return 0;
    return this._syntheses.reduce((s, u) => s + u.synthesisLevel, 0) / this._syntheses.length;
  }

  reset(): void {
    this._extremes.clear();
    this._syntheses = [];
  }

  get extremesCount(): number {
    return this._extremes.size;
  }

  get synthesisCount(): number {
    return this._syntheses.length;
  }

  get defaultThreshold(): number {
    return this._defaultThreshold;
  }
}

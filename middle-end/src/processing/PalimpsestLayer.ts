export interface PalimpsestLayerData {
  depth: number;
  content: Record<string, unknown>;
  opacity: number;
  writtenAt: number;
  faded: boolean;
  signature: number;
  changeVector: number[];
}

export interface PalimpsestEntry {
  id: string;
  layers: PalimpsestLayerData[];
  currentContent: Record<string, unknown>;
}

interface DiffTrace {
  key: string;
  depth: number;
  magnitude: number;
  direction: 'increase' | 'decrease' | 'flip' | 'new' | 'deleted';
}

export class PalimpsestLayer {
  private _entries: Map<string, PalimpsestEntry> = new Map();
  private _maxLayers = 8;
  private _fadeRate = 0.2;
  private _totalWrites = 0;
  private _timeConstant = 86400000;
  private _featureDim = 16;
  private _layerSignatures: Map<string, number[]> = new Map();

  write(id: string, content: Record<string, unknown>): PalimpsestEntry {
    const existing = this._entries.get(id);
    const now = Date.now();

    const prevContent = existing?.currentContent ?? {};
    const changeVector = this._computeChangeVector(prevContent, content);
    const signature = this._computeSignature(content);

    const newLayer: PalimpsestLayerData = {
      depth: existing ? existing.layers.length : 0,
      content: { ...content },
      opacity: 1,
      writtenAt: now,
      faded: false,
      signature,
      changeVector,
    };

    if (existing) {
      existing.layers.unshift(newLayer);
      this._fadeOlder(existing, now);
      if (existing.layers.length > this._maxLayers) {
        existing.layers = existing.layers.slice(0, this._maxLayers);
      }
      existing.currentContent = { ...content };
    } else {
      this._entries.set(id, {
        id,
        layers: [newLayer],
        currentContent: { ...content },
      });
    }

    const sigs = this._layerSignatures.get(id) ?? [];
    sigs.unshift(signature);
    if (sigs.length > this._maxLayers) sigs.pop();
    this._layerSignatures.set(id, sigs);

    this._totalWrites++;
    return this._entries.get(id)!;
  }

  private _computeSignature(content: Record<string, unknown>): number {
    const keys = Object.keys(content).sort();
    let h = 0;
    for (const k of keys) {
      let kh = 0;
      for (let i = 0; i < k.length; i++) {
        kh = ((kh << 5) - kh) + k.charCodeAt(i);
      }
      const v = content[k];
      let vh = 0;
      if (typeof v === 'number') vh = Math.floor(v * 1000);
      else if (typeof v === 'boolean') vh = v ? 1 : 0;
      else if (typeof v === 'string') {
        for (let i = 0; i < v.length; i++) {
          vh = ((vh << 3) - vh) + v.charCodeAt(i);
        }
      }
      h ^= kh + vh;
    }
    return Math.abs(h);
  }

  private _computeChangeVector(prev: Record<string, unknown>, curr: Record<string, unknown>): number[] {
    const vec = new Array(this._featureDim).fill(0);
    const allKeys = new Set([...Object.keys(prev), ...Object.keys(curr)]);
    let idx = 0;
    for (const k of allKeys) {
      if (idx >= this._featureDim) break;
      const pv = prev[k];
      const cv = curr[k];
      if (pv === undefined && cv !== undefined) vec[idx] = 1;
      else if (pv !== undefined && cv === undefined) vec[idx] = -1;
      else if (typeof pv === 'number' && typeof cv === 'number') {
        const diff = cv - pv;
        vec[idx] = Math.max(-1, Math.min(1, diff / Math.max(1, Math.abs(pv))));
      } else if (typeof pv === 'boolean' && typeof cv === 'boolean') {
        vec[idx] = pv === cv ? 0 : 0.5;
      } else if (typeof pv === 'string' && typeof cv === 'string') {
        vec[idx] = pv === cv ? 0 : this._stringDistance(pv, cv);
      } else {
        vec[idx] = 0.3;
      }
      idx++;
    }
    return vec;
  }

  private _stringDistance(a: string, b: string): number {
    const maxLen = Math.max(a.length, b.length);
    if (maxLen === 0) return 0;
    let edits = 0;
    const minLen = Math.min(a.length, b.length);
    for (let i = 0; i < minLen; i++) {
      if (a[i] !== b[i]) edits++;
    }
    edits += Math.abs(a.length - b.length);
    return edits / maxLen;
  }

  private _fadeOlder(entry: PalimpsestEntry, now: number): void {
    for (let i = 1; i < entry.layers.length; i++) {
      const layer = entry.layers[i];
      const age = now - layer.writtenAt;
      const timeDecay = Math.exp(-age / this._timeConstant);
      const depthDecay = Math.pow(1 - this._fadeRate, i);
      layer.opacity = Math.max(0, timeDecay * depthDecay);
      layer.faded = layer.opacity < 0.3;
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
    const accumulator: Map<string, { value: unknown; weight: number }> = new Map();

    for (let i = 1; i < entry.layers.length; i++) {
      const layer = entry.layers[i];
      if (layer.opacity < 0.05) continue;
      for (const [key, value] of Object.entries(layer.content)) {
        const existing = accumulator.get(key);
        const weight = layer.opacity / (i + 1);
        if (!existing || weight > existing.weight) {
          accumulator.set(key, { value, weight });
        }
      }
    }

    for (const [key, accEntry] of accumulator) {
      if (!(key in entry.currentContent)) {
        ghost[`ghost_${key}`] = accEntry.value;
      }
    }

    return ghost;
  }

  mergeGhosts(id: string): Record<string, unknown> {
    const entry = this._entries.get(id);
    if (!entry) return {};

    const merged: Record<string, unknown> = { ...entry.currentContent };
    const valueHistory: Map<string, Array<{ value: unknown; opacity: number; time: number }>> = new Map();

    for (const layer of entry.layers) {
      for (const [key, value] of Object.entries(layer.content)) {
        const history = valueHistory.get(key) ?? [];
        history.push({ value, opacity: layer.opacity, time: layer.writtenAt });
        valueHistory.set(key, history);
      }
    }

    for (const [key, history] of valueHistory) {
      if (key in merged) continue;
      if (history.length === 0) continue;
      const latest = history[0];
      if (latest.opacity > 0.1) {
        merged[key] = latest.value;
      }
    }

    return merged;
  }

  layerCorrelation(id: string, depthA: number, depthB: number): number {
    const entry = this._entries.get(id);
    if (!entry) return 0;
    const la = entry.layers[depthA];
    const lb = entry.layers[depthB];
    if (!la || !lb) return 0;

    const keysA = new Set(Object.keys(la.content));
    const keysB = new Set(Object.keys(lb.content));
    const intersection = [...keysA].filter(k => keysB.has(k));
    const union = new Set([...keysA, ...keysB]);

    let valueSim = 0;
    let count = 0;
    for (const k of intersection) {
      const va = la.content[k];
      const vb = lb.content[k];
      if (typeof va === 'number' && typeof vb === 'number') {
        const maxAbs = Math.max(Math.abs(va), Math.abs(vb), 0.001);
        valueSim += 1 - Math.abs(va - vb) / maxAbs;
        count++;
      } else if (va === vb) {
        valueSim += 1;
        count++;
      } else {
        count++;
      }
    }

    const jaccard = union.size === 0 ? 1 : intersection.length / union.size;
    const valueAgreement = count === 0 ? 0.5 : valueSim / count;
    return 0.5 * jaccard + 0.5 * valueAgreement;
  }

  diffTrace(id: string, key: string): DiffTrace[] {
    const entry = this._entries.get(id);
    if (!entry) return [];

    const traces: DiffTrace[] = [];
    for (let i = 0; i < entry.layers.length - 1; i++) {
      const newer = entry.layers[i];
      const older = entry.layers[i + 1];
      const newVal = newer.content[key];
      const oldVal = older.content[key];

      let direction: DiffTrace['direction'] = 'new';
      let magnitude = 0;

      if (oldVal === undefined && newVal !== undefined) {
        direction = 'new';
        magnitude = 1;
      } else if (oldVal !== undefined && newVal === undefined) {
        direction = 'deleted';
        magnitude = 1;
      } else if (typeof oldVal === 'number' && typeof newVal === 'number') {
        magnitude = Math.abs(newVal - oldVal) / Math.max(1, Math.abs(oldVal));
        direction = newVal > oldVal ? 'increase' : 'decrease';
      } else if (typeof oldVal === 'boolean' && typeof newVal === 'boolean') {
        direction = oldVal !== newVal ? 'flip' : 'new';
        magnitude = oldVal !== newVal ? 1 : 0;
      } else if (typeof oldVal === 'string' && typeof newVal === 'string') {
        magnitude = this._stringDistance(oldVal, newVal);
        direction = magnitude > 0.5 ? 'flip' : 'increase';
      }

      traces.push({
        key,
        depth: i,
        magnitude,
        direction,
      });
    }
    return traces;
  }

  temporalBlur(id: string, alpha = 0.5): Record<string, unknown> {
    const entry = this._entries.get(id);
    if (!entry) return {};
    if (entry.layers.length === 0) return {};

    const result: Record<string, unknown> = {};
    const valueAccum: Map<string, { numeric: number; weight: number; lastValue: unknown }> = new Map();

    for (let i = 0; i < entry.layers.length; i++) {
      const layer = entry.layers[i];
      const weight = layer.opacity * Math.pow(alpha, i);
      for (const [key, value] of Object.entries(layer.content)) {
        const acc = valueAccum.get(key) ?? { numeric: 0, weight: 0, lastValue: value };
        if (typeof value === 'number') {
          acc.numeric += value * weight;
          acc.weight += weight;
        } else if (i === 0 || weight > acc.weight) {
          acc.lastValue = value;
          acc.weight = weight;
        }
        valueAccum.set(key, acc);
      }
    }

    for (const [key, acc] of valueAccum) {
      if (acc.weight > 0 && acc.numeric !== 0) {
        result[key] = acc.numeric / acc.weight;
      } else {
        result[key] = acc.lastValue;
      }
    }

    return result;
  }

  entropyDepth(id: string): number {
    const entry = this._entries.get(id);
    if (!entry) return 0;
    const sigs = this._layerSignatures.get(id) ?? [];
    if (sigs.length < 2) return 0;
    const unique = new Set(sigs).size;
    return unique / sigs.length;
  }

  setFadeRate(rate: number): void {
    this._fadeRate = Math.max(0, Math.min(1, rate));
  }

  setMaxLayers(max: number): void {
    this._maxLayers = Math.max(1, max);
  }

  setTimeConstant(ms: number): void {
    this._timeConstant = Math.max(1000, ms);
  }

  depthOf(id: string): number {
    return this._entries.get(id)?.layers.length ?? 0;
  }

  oldestLayer(id: string): PalimpsestLayerData | undefined {
    const entry = this._entries.get(id);
    if (!entry || entry.layers.length === 0) return undefined;
    return entry.layers[entry.layers.length - 1];
  }

  reset(): void {
    this._entries.clear();
    this._totalWrites = 0;
    this._layerSignatures.clear();
  }

  get entryCount(): number { return this._entries.size; }
  get totalWrites(): number { return this._totalWrites; }
  get maxLayers(): number { return this._maxLayers; }
  get fadeRate(): number { return this._fadeRate; }
  get timeConstant(): number { return this._timeConstant; }
  get featureDim(): number { return this._featureDim; }
}

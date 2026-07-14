export interface SourceModel {
  id: string;
  type: string;
  data: Record<string, unknown>;
  version: number;
  checksum: string;
}

export interface ShadowProjection {
  id: string;
  sourceId: string;
  flatFields: Record<string, unknown>;
  projectedAt: number;
  revision: number;
  delta: Record<string, { old: unknown; new: unknown }>;
  syncHash: string;
}

export interface ProjectionRule {
  sourceType: string;
  fieldMapping: Record<string, string>;
  transform?: (value: unknown) => unknown;
  filter?: (key: string, value: unknown) => boolean;
  priority: number;
}

export interface SyncDelta {
  sourceId: string;
  changedFields: string[];
  deletedFields: string[];
  unchangedFields: string[];
  syncNeeded: boolean;
}

export class ShadowProjector {
  private _sources: Map<string, SourceModel> = new Map();
  private _shadows: Map<string, ShadowProjection> = new Map();
  private _rules: Map<string, ProjectionRule[]> = new Map();
  private _linkMap: Map<string, string> = new Map();
  private _dirty: Set<string> = new Set();
  private _syncHistory: Map<string, { version: number; timestamp: number }[]> = new Map();

  registerSource(model: SourceModel): void {
    model.checksum = this._computeChecksum(model.data);
    this._sources.set(model.id, model);
  }

  private _computeChecksum(data: Record<string, unknown>): string {
    let hash = 0;
    const str = JSON.stringify(data);
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return hash.toString(16);
  }

  registerRule(rule: ProjectionRule): void {
    const rules = this._rules.get(rule.sourceType) ?? [];
    rules.push(rule);
    rules.sort((a, b) => a.priority - b.priority);
    this._rules.set(rule.sourceType, rules);
  }

  project(sourceId: string): ShadowProjection {
    const source = this._sources.get(sourceId);
    if (!source) throw new Error(`Source not found: ${sourceId}`);
    
    const rules = this._rules.get(source.type) ?? [];
    const flatFields: Record<string, unknown> = {};
    const existing = this._shadows.get(sourceId);
    const delta: Record<string, { old: unknown; new: unknown }> = {};

    for (const rule of rules) {
      for (const [srcField, dstField] of Object.entries(rule.fieldMapping)) {
        if (rule.filter && !rule.filter(srcField, source.data[srcField])) continue;
        const value = source.data[srcField];
        const transformed = rule.transform ? rule.transform(value) : value;
        
        if (existing) {
          const oldValue = existing.flatFields[dstField];
          if (JSON.stringify(oldValue) !== JSON.stringify(transformed)) {
            delta[dstField] = { old: oldValue, new: transformed };
          }
        }
        
        flatFields[dstField] = transformed;
      }
    }

    if (rules.length === 0) {
      for (const [key, value] of Object.entries(source.data)) {
        if (existing && existing.flatFields[key] !== value) {
          delta[key] = { old: existing.flatFields[key], new: value };
        }
        flatFields[key] = value;
      }
    }

    const revision = existing ? existing.revision + 1 : 1;
    const syncHash = this._computeChecksum(flatFields);
    
    const shadow: ShadowProjection = {
      id: `shadow-${sourceId}-${revision}`,
      sourceId,
      flatFields,
      projectedAt: Date.now(),
      revision,
      delta,
      syncHash,
    };
    
    this._shadows.set(sourceId, shadow);
    this._linkMap.set(sourceId, shadow.id);
    
    const history = this._syncHistory.get(sourceId) ?? [];
    history.push({ version: revision, timestamp: Date.now() });
    if (history.length > 100) history.shift();
    this._syncHistory.set(sourceId, history);
    
    return shadow;
  }

  syncFromSource(sourceId: string): ShadowProjection | null {
    const source = this._sources.get(sourceId);
    if (!source) return null;
    
    const delta = this._computeSyncDelta(sourceId);
    if (!delta.syncNeeded && !this._dirty.has(sourceId)) return null;
    
    this._dirty.delete(sourceId);
    return this.project(sourceId);
  }

  private _computeSyncDelta(sourceId: string): SyncDelta {
    const source = this._sources.get(sourceId);
    const shadow = this._shadows.get(sourceId);
    
    if (!source || !shadow) {
      return { sourceId, changedFields: [], deletedFields: [], unchangedFields: [], syncNeeded: true };
    }

    const changed: string[] = [];
    const deleted: string[] = [];
    const unchanged: string[] = [];

    for (const key of Object.keys(source.data)) {
      const shadowValue = shadow.flatFields[key];
      const sourceValue = source.data[key];
      if (JSON.stringify(shadowValue) !== JSON.stringify(sourceValue)) {
        changed.push(key);
      } else {
        unchanged.push(key);
      }
    }

    for (const key of Object.keys(shadow.flatFields)) {
      if (!(key in source.data)) {
        deleted.push(key);
      }
    }

    return {
      sourceId,
      changedFields: changed,
      deletedFields: deleted,
      unchangedFields: unchanged,
      syncNeeded: changed.length > 0 || deleted.length > 0,
    };
  }

  getSyncDelta(sourceId: string): SyncDelta {
    return this._computeSyncDelta(sourceId);
  }

  markDirty(sourceId: string): void {
    if (this._sources.has(sourceId)) this._dirty.add(sourceId);
  }

  updateSource(sourceId: string, updates: Partial<Record<string, unknown>>): void {
    const source = this._sources.get(sourceId);
    if (!source) return;
    
    Object.assign(source.data, updates);
    source.version++;
    source.checksum = this._computeChecksum(source.data);
    this.markDirty(sourceId);
  }

  getShadow(sourceId: string): ShadowProjection | undefined {
    return this._shadows.get(sourceId);
  }

  listShadows(): string[] {
    return Array.from(this._shadows.keys());
  }

  removeShadow(sourceId: string): boolean {
    this._linkMap.delete(sourceId);
    this._syncHistory.delete(sourceId);
    return this._shadows.delete(sourceId);
  }

  getShadowConsistency(sourceId: string): number {
    const source = this._sources.get(sourceId);
    const shadow = this._shadows.get(sourceId);
    if (!source || !shadow) return 0;
    
    const sourceKeys = new Set(Object.keys(source.data));
    const shadowKeys = new Set(Object.keys(shadow.flatFields));
    
    const intersection = [...sourceKeys].filter(k => shadowKeys.has(k)).length;
    const union = sourceKeys.size + shadowKeys.size - intersection;
    
    return union > 0 ? intersection / union : 0;
  }

  get dirtyCount(): number {
    return this._dirty.size;
  }

  get shadowCount(): number {
    return this._shadows.size;
  }
}
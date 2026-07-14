/**
 * 影子投影仪：将复杂后端模型投影成扁平影子对象供前端消费，
 * 影子与源保持实时联动，源变更时增量更新对应影子字段。
 */

export interface SourceModel {
  id: string;
  type: string;
  data: Record<string, unknown>;
}

export interface ShadowProjection {
  id: string;
  sourceId: string;
  flatFields: Record<string, unknown>;
  projectedAt: number;
  revision: number;
}

export interface ProjectionRule {
  sourceType: string;
  fieldMapping: Record<string, string>;
  transform?: (value: unknown) => unknown;
}

export class ShadowProjector {
  private _sources: Map<string, SourceModel> = new Map();
  private _shadows: Map<string, ShadowProjection> = new Map();
  private _rules: Map<string, ProjectionRule> = new Map();
  private _linkMap: Map<string, string> = new Map();
  private _dirty: Set<string> = new Set();

  registerSource(model: SourceModel): void {
    this._sources.set(model.id, model);
  }

  registerRule(rule: ProjectionRule): void {
    this._rules.set(rule.sourceType, rule);
  }

  project(sourceId: string): ShadowProjection {
    const source = this._sources.get(sourceId);
    if (!source) throw new Error(`Source not found: ${sourceId}`);
    const rule = this._rules.get(source.type);
    const flatFields: Record<string, unknown> = {};
    if (rule) {
      for (const [srcField, dstField] of Object.entries(rule.fieldMapping)) {
        const value = source.data[srcField];
        flatFields[dstField] = rule.transform ? rule.transform(value) : value;
      }
    } else {
      Object.assign(flatFields, source.data);
    }
    const existing = this._shadows.get(sourceId);
    const revision = existing ? existing.revision + 1 : 1;
    const shadow: ShadowProjection = {
      id: `shadow-${sourceId}-${revision}`,
      sourceId,
      flatFields,
      projectedAt: Date.now(),
      revision,
    };
    this._shadows.set(sourceId, shadow);
    this._linkMap.set(sourceId, shadow.id);
    return shadow;
  }

  syncFromSource(sourceId: string): ShadowProjection | null {
    const source = this._sources.get(sourceId);
    if (!source) return null;
    if (!this._dirty.has(sourceId) && !this._shadows.has(sourceId)) return null;
    this._dirty.delete(sourceId);
    return this.project(sourceId);
  }

  markDirty(sourceId: string): void {
    if (this._sources.has(sourceId)) this._dirty.add(sourceId);
  }

  getShadow(sourceId: string): ShadowProjection | undefined {
    return this._shadows.get(sourceId);
  }

  listShadows(): string[] {
    return Array.from(this._shadows.keys());
  }

  removeShadow(sourceId: string): boolean {
    this._linkMap.delete(sourceId);
    return this._shadows.delete(sourceId);
  }

  get dirtyCount(): number {
    return this._dirty.size;
  }

  get shadowCount(): number {
    return this._shadows.size;
  }
}

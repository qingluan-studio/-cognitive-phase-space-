/**
 * 以虫为特性：主动将某个bug标记为特性并强化。
 * 将意外行为重新定义为有意设计的特性，建立特性档案并强化其表现路径。
 */

export type FeatureStatus = 'candidate' | 'promoted' | 'reinforced' | 'deprecated';

export interface BugFeature {
  id: string;
  bugDescription: string;
  featureName: string;
  status: FeatureStatus;
  reinforcementCount: number;
  documentedAt: number;
  metadata: Record<string, unknown>;
}

export interface ReinforcementLog {
  featureId: string;
  action: string;
  result: string;
  loggedAt: number;
}

export class BugAsFeature {
  private _features: Map<string, BugFeature> = new Map();
  private _logs: ReinforcementLog[] = [];

  nominate(bugDescription: string, featureName: string): BugFeature {
    const feature: BugFeature = {
      id: `feat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      bugDescription,
      featureName,
      status: 'candidate',
      reinforcementCount: 0,
      documentedAt: Date.now(),
      metadata: {},
    };
    this._features.set(feature.id, feature);
    return feature;
  }

  promote(featureId: string): BugFeature | null {
    const feature = this._features.get(featureId);
    if (!feature || feature.status !== 'candidate') return null;
    feature.status = 'promoted';
    this._logAction(featureId, 'promote', 'Feature promoted from candidate.');
    return feature;
  }

  reinforce(featureId: string, action: string): BugFeature | null {
    const feature = this._features.get(featureId);
    if (!feature) return null;
    if (feature.status === 'deprecated') return null;

    feature.reinforcementCount++;
    if (feature.reinforcementCount >= 3 && feature.status === 'promoted') {
      feature.status = 'reinforced';
    }
    this._logAction(featureId, 'reinforce', action);
    return feature;
  }

  deprecate(featureId: string, reason: string): BugFeature | null {
    const feature = this._features.get(featureId);
    if (!feature) return null;
    feature.status = 'deprecated';
    this._logAction(featureId, 'deprecate', reason);
    return feature;
  }

  attachMetadata(featureId: string, key: string, value: unknown): boolean {
    const feature = this._features.get(featureId);
    if (!feature) return false;
    feature.metadata[key] = value;
    return true;
  }

  getFeature(featureId: string): BugFeature | null {
    return this._features.get(featureId) ?? null;
  }

  getByStatus(status: FeatureStatus): BugFeature[] {
    return Array.from(this._features.values()).filter(f => f.status === status);
  }

  getLogs(limit: number = 50): ReinforcementLog[] {
    return this._logs.slice(-limit);
  }

  get featureCount(): number {
    return this._features.size;
  }

  private _logAction(featureId: string, action: string, result: string): void {
    this._logs.push({ featureId, action, result, loggedAt: Date.now() });
    if (this._logs.length > 200) this._logs.shift();
  }
}

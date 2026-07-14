export type FeatureStatus = 'candidate' | 'promoted' | 'reinforced' | 'deprecated';

export interface BugFeature {
  id: string;
  bugDescription: string;
  featureName: string;
  status: FeatureStatus;
  reinforcementCount: number;
  stabilityScore: number;
  adoptionRate: number;
  documentedAt: number;
  metadata: Record<string, unknown>;
}

export interface ReinforcementLog {
  featureId: string;
  action: string;
  result: string;
  loggedAt: number;
  stabilityDelta: number;
}

const STATUS_TRANSITIONS: Record<FeatureStatus, FeatureStatus[]> = {
  candidate: ['promoted', 'deprecated'],
  promoted: ['reinforced', 'deprecated'],
  reinforced: ['deprecated'],
  deprecated: [],
};

export class BugAsFeature {
  private _features: Map<string, BugFeature> = new Map();
  private _logs: ReinforcementLog[] = [];
  private _reinforcementThreshold = 3;
  private _stabilityGrowthRate = 0.15;
  private _stabilityDecayRate = 0.05;
  private _adoptionHistory: Map<string, boolean[]> = new Map();

  nominate(bugDescription: string, featureName: string): BugFeature {
    const feature: BugFeature = {
      id: `feat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      bugDescription,
      featureName,
      status: 'candidate',
      reinforcementCount: 0,
      stabilityScore: 0.1,
      adoptionRate: 0,
      documentedAt: Date.now(),
      metadata: {},
    };
    this._features.set(feature.id, feature);
    this._adoptionHistory.set(feature.id, []);
    return feature;
  }

  promote(featureId: string): BugFeature | null {
    const feature = this._features.get(featureId);
    if (!feature || !STATUS_TRANSITIONS[feature.status].includes('promoted')) return null;
    feature.status = 'promoted';
    feature.stabilityScore = Math.min(1, feature.stabilityScore + this._stabilityGrowthRate);
    this._logAction(featureId, 'promote', 'Feature promoted from candidate.', this._stabilityGrowthRate);
    return feature;
  }

  reinforce(featureId: string, action: string, adopted: boolean = true): BugFeature | null {
    const feature = this._features.get(featureId);
    if (!feature || feature.status === 'deprecated') return null;
    feature.reinforcementCount++;
    const stabilityDelta = adopted ? this._stabilityGrowthRate : -this._stabilityDecayRate;
    feature.stabilityScore = Math.max(0, Math.min(1, feature.stabilityScore + stabilityDelta));
    const history = this._adoptionHistory.get(featureId) ?? [];
    history.push(adopted);
    if (history.length > 32) history.shift();
    this._adoptionHistory.set(featureId, history);
    feature.adoptionRate = history.filter(a => a).length / Math.max(1, history.length);
    if (feature.reinforcementCount >= this._reinforcementThreshold && feature.status === 'promoted') {
      feature.status = 'reinforced';
    }
    this._logAction(featureId, 'reinforce', action, stabilityDelta);
    return feature;
  }

  deprecate(featureId: string, reason: string): BugFeature | null {
    const feature = this._features.get(featureId);
    if (!feature || !STATUS_TRANSITIONS[feature.status].includes('deprecated')) return null;
    feature.status = 'deprecated';
    feature.stabilityScore = 0;
    this._logAction(featureId, 'deprecate', reason, -feature.stabilityScore);
    return feature;
  }

  attachMetadata(featureId: string, key: string, value: unknown): boolean {
    const feature = this._features.get(featureId);
    if (!feature) return false;
    feature.metadata[key] = value;
    return true;
  }

  computeReliability(featureId: string): number {
    const feature = this._features.get(featureId);
    if (!feature) return 0;
    const history = this._adoptionHistory.get(featureId) ?? [];
    if (history.length === 0) return 0;
    const recentAdoption = history.slice(-8).filter(a => a).length / Math.min(8, history.length);
    const consistency = 1 - this._variance(history.map(a => a ? 1 : 0));
    return 0.5 * feature.stabilityScore + 0.3 * recentAdoption + 0.2 * consistency;
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

  get featureCount(): number { return this._features.size; }
  get reinforcedCount(): number {
    return Array.from(this._features.values()).filter(f => f.status === 'reinforced').length;
  }

  private _logAction(featureId: string, action: string, result: string, stabilityDelta: number): void {
    this._logs.push({ featureId, action, result, loggedAt: Date.now(), stabilityDelta });
    if (this._logs.length > 200) this._logs.shift();
  }

  private _variance(values: number[]): number {
    if (values.length < 2) return 0;
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    return values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  }
}

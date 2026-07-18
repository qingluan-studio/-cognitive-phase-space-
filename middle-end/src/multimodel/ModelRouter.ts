import type { DataPacket, Signal, Handler } from '../shared/types';

export type TaskType = 'code' | 'text' | 'image' | 'audio' | 'reasoning' | 'creative' | 'analysis' | 'translation';

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  capabilities: TaskType[];
  maxTokens: number;
  latencyMs: number;
  costPerThousandTokens: number;
  qualityScore: number;
  version: string;
  supportedLanguages: string[];
}

export interface RoutingDecision {
  modelId: string;
  confidence: number;
  reason: string;
  estimatedCost: number;
  estimatedLatency: number;
  alternatives: string[];
}

export interface RoutingCriteria {
  taskType?: TaskType;
  minQuality?: number;
  maxLatency?: number;
  maxCost?: number;
  preferredProvider?: string;
  language?: string;
}

export interface RouterStats {
  totalRequests: number;
  byModel: Map<string, number>;
  avgConfidence: number;
  fallbackCount: number;
}

export class ModelRouter {
  private _models: Map<string, ModelInfo>;
  private _routingHistory: { requestId: string; decision: RoutingDecision; criteria: RoutingCriteria }[];
  private _capabilityIndex: Map<TaskType, string[]>;
  private _providerIndex: Map<string, string[]>;
  private _fallbackModel: string | null;
  private _maxHistorySize: number;
  private _defaultCriteria: RoutingCriteria;

  constructor() {
    this._models = new Map();
    this._routingHistory = [];
    this._capabilityIndex = new Map();
    this._providerIndex = new Map();
    this._fallbackModel = null;
    this._maxHistorySize = 500;
    this._defaultCriteria = {
      minQuality: 0.7,
      maxLatency: 10000,
      maxCost: 0.1
    };
  }

  get modelCount(): number { return this._models.size; }
  get fallbackModel(): string | null { return this._fallbackModel; }
  get routingHistory(): { requestId: string; decision: RoutingDecision; criteria: RoutingCriteria }[] {
    return [...this._routingHistory];
  }

  public registerModel(model: ModelInfo): void {
    this._models.set(model.id, {
      ...model,
      capabilities: [...model.capabilities],
      supportedLanguages: [...model.supportedLanguages]
    });

    for (const cap of model.capabilities) {
      if (!this._capabilityIndex.has(cap)) {
        this._capabilityIndex.set(cap, []);
      }
      this._capabilityIndex.get(cap)!.push(model.id);
    }

    if (!this._providerIndex.has(model.provider)) {
      this._providerIndex.set(model.provider, []);
    }
    this._providerIndex.get(model.provider)!.push(model.id);
  }

  public unregisterModel(modelId: string): boolean {
    const model = this._models.get(modelId);
    if (!model) return false;

    this._models.delete(modelId);

    for (const cap of model.capabilities) {
      const capModels = this._capabilityIndex.get(cap);
      if (capModels) {
        const idx = capModels.indexOf(modelId);
        if (idx > -1) capModels.splice(idx, 1);
        if (capModels.length === 0) this._capabilityIndex.delete(cap);
      }
    }

    const provModels = this._providerIndex.get(model.provider);
    if (provModels) {
      const idx = provModels.indexOf(modelId);
      if (idx > -1) provModels.splice(idx, 1);
      if (provModels.length === 0) this._providerIndex.delete(model.provider);
    }

    if (this._fallbackModel === modelId) {
      this._fallbackModel = null;
    }

    return true;
  }

  public getModel(modelId: string): ModelInfo | undefined {
    const m = this._models.get(modelId);
    if (!m) return undefined;
    return {
      ...m,
      capabilities: [...m.capabilities],
      supportedLanguages: [...m.supportedLanguages]
    };
  }

  public hasModel(modelId: string): boolean {
    return this._models.has(modelId);
  }

  public setFallback(modelId: string): boolean {
    if (!this._models.has(modelId)) return false;
    this._fallbackModel = modelId;
    return true;
  }

  public setDefaultCriteria(criteria: RoutingCriteria): void {
    this._defaultCriteria = { ...criteria };
  }

  public route(requestId: string, criteria: RoutingCriteria = {}): RoutingDecision {
    const mergedCriteria = { ...this._defaultCriteria, ...criteria };
    const candidates = this._findCandidates(mergedCriteria);

    if (candidates.length === 0) {
      if (this._fallbackModel && this._models.has(this._fallbackModel)) {
        const fallback = this._models.get(this._fallbackModel)!;
        const decision: RoutingDecision = {
          modelId: this._fallbackModel,
          confidence: 0.3,
          reason: 'No ideal model found, using fallback',
          estimatedCost: fallback.costPerThousandTokens * 1,
          estimatedLatency: fallback.latencyMs,
          alternatives: []
        };
        this._recordDecision(requestId, decision, mergedCriteria);
        return decision;
      }
      throw new Error('No suitable model found for the given criteria');
    }

    const scored = candidates.map(m => ({
      model: m,
      score: this._scoreModel(m, mergedCriteria)
    }));

    scored.sort((a, b) => b.score - a.score);

    const best = scored[0];
    const alternatives = scored.slice(1, 4).map(s => s.model.id);

    const decision: RoutingDecision = {
      modelId: best.model.id,
      confidence: best.score,
      reason: this._generateReason(best.model, mergedCriteria),
      estimatedCost: best.model.costPerThousandTokens * 1,
      estimatedLatency: best.model.latencyMs,
      alternatives
    };

    this._recordDecision(requestId, decision, mergedCriteria);
    return decision;
  }

  private _findCandidates(criteria: RoutingCriteria): ModelInfo[] {
    let candidateIds: Set<string> | null = null;

    if (criteria.taskType) {
      const capModels = this._capabilityIndex.get(criteria.taskType);
      if (!capModels || capModels.length === 0) return [];
      candidateIds = new Set(capModels);
    }

    if (criteria.preferredProvider) {
      const provModels = this._providerIndex.get(criteria.preferredProvider);
      if (provModels) {
        if (candidateIds) {
          candidateIds = new Set(provModels.filter(m => candidateIds!.has(m)));
        } else {
          candidateIds = new Set(provModels);
        }
      }
    }

    const ids = candidateIds || new Set(this._models.keys());
    const candidates: ModelInfo[] = [];

    for (const id of ids) {
      const model = this._models.get(id);
      if (!model) continue;

      if (criteria.minQuality && model.qualityScore < criteria.minQuality) continue;
      if (criteria.maxLatency && model.latencyMs > criteria.maxLatency) continue;
      if (criteria.maxCost && model.costPerThousandTokens > criteria.maxCost) continue;
      if (criteria.language && !model.supportedLanguages.includes(criteria.language)) continue;

      candidates.push(model);
    }

    return candidates;
  }

  private _scoreModel(model: ModelInfo, criteria: RoutingCriteria): number {
    let score = model.qualityScore * 0.4;

    if (criteria.taskType) {
      const capIndex = model.capabilities.indexOf(criteria.taskType);
      if (capIndex > -1) {
        score += 0.3;
      }
    }

    if (criteria.maxLatency) {
      const latencyRatio = 1 - (model.latencyMs / criteria.maxLatency);
      score += Math.max(0, latencyRatio) * 0.15;
    } else {
      score += 0.075;
    }

    if (criteria.maxCost) {
      const costRatio = 1 - (model.costPerThousandTokens / criteria.maxCost);
      score += Math.max(0, costRatio) * 0.15;
    } else {
      score += 0.075;
    }

    return Math.min(1, Math.max(0, score));
  }

  private _generateReason(model: ModelInfo, criteria: RoutingCriteria): string {
    const reasons: string[] = [];
    reasons.push(`Quality score: ${(model.qualityScore * 100).toFixed(0)}%`);
    if (criteria.taskType) {
      reasons.push(`Supports ${criteria.taskType} tasks`);
    }
    reasons.push(`Latency: ~${model.latencyMs}ms`);
    reasons.push(`Cost: $${model.costPerThousandTokens.toFixed(4)}/1k tokens`);
    return reasons.join('; ');
  }

  private _recordDecision(requestId: string, decision: RoutingDecision, criteria: RoutingCriteria): void {
    this._routingHistory.push({ requestId, decision, criteria: { ...criteria } });
    if (this._routingHistory.length > this._maxHistorySize) {
      this._routingHistory.shift();
    }
  }

  public listModels(): ModelInfo[] {
    return Array.from(this._models.values()).map(m => ({
      ...m,
      capabilities: [...m.capabilities],
      supportedLanguages: [...m.supportedLanguages]
    }));
  }

  public listByCapability(capability: TaskType): ModelInfo[] {
    const ids = this._capabilityIndex.get(capability) || [];
    return ids.map(id => {
      const m = this._models.get(id)!;
      return {
        ...m,
        capabilities: [...m.capabilities],
        supportedLanguages: [...m.supportedLanguages]
      };
    });
  }

  public detectSignalFromRouting(decision: RoutingDecision): Signal {
    return {
      source: `router:${decision.modelId}`,
      magnitude: decision.confidence,
      entropy: 1 - decision.confidence,
      timestamp: Date.now()
    };
  }

  public processPacket(packet: DataPacket<RoutingCriteria>): DataPacket<RoutingDecision> {
    const decision = this.route(packet.id, packet.payload);
    return {
      id: `route-${packet.id}`,
      payload: decision,
      metadata: {
        createdAt: Date.now(),
        route: [...packet.metadata.route, 'model-router'],
        priority: packet.metadata.priority,
        phase: 'routed'
      }
    };
  }

  public getStats(): RouterStats {
    const byModel = new Map<string, number>();
    let totalConfidence = 0;
    let fallbackCount = 0;

    for (const record of this._routingHistory) {
      const current = byModel.get(record.decision.modelId) || 0;
      byModel.set(record.decision.modelId, current + 1);
      totalConfidence += record.decision.confidence;
      if (record.decision.reason.includes('fallback')) {
        fallbackCount++;
      }
    }

    return {
      totalRequests: this._routingHistory.length,
      byModel,
      avgConfidence: this._routingHistory.length > 0
        ? totalConfidence / this._routingHistory.length
        : 0,
      fallbackCount
    };
  }

  public clearHistory(): void {
    this._routingHistory = [];
  }

  public reset(): void {
    this._models.clear();
    this._routingHistory = [];
    this._capabilityIndex.clear();
    this._providerIndex.clear();
    this._fallbackModel = null;
  }
}

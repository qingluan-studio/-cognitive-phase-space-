export type TrustLevel = 0 | 1 | 2 | 3 | 4 | 5;

export interface ModuleTrust {
  moduleId: string;
  trustLevel: TrustLevel;
  lastInteraction: Date;
  reliabilityScore: number;
  trustDecay: number;
  interactionHistory: number[];
}

export interface TrustEvent {
  timestamp: Date;
  source: string;
  target: string;
  eventType: 'success' | 'failure' | 'timeout' | 'data_share';
  impact: number;
  confidence: number;
}

export interface TrustNetwork {
  nodes: string[];
  edges: Array<{ source: string; target: string; weight: number }>;
  diameter: number;
  clusteringCoefficient: number;
}

export class OxytocinSprayer {
  private _trustMap: Map<string, ModuleTrust> = new Map();
  private _trustEvents: TrustEvent[] = [];
  private _sprayCooldown: Map<string, number> = new Map();
  private _trustGraph: Map<string, Map<string, number>> = new Map();
  private _decayRate = 0.001;

  registerModule(moduleId: string): void {
    this._trustMap.set(moduleId, {
      moduleId,
      trustLevel: 3,
      lastInteraction: new Date(),
      reliabilityScore: 0.5,
      trustDecay: 0.001,
      interactionHistory: [],
    });
    this._trustGraph.set(moduleId, new Map());
  }

  updateTrust(source: string, target: string, eventType: TrustEvent['eventType']): void {
    const sourceTrust = this._trustMap.get(source);
    const targetTrust = this._trustMap.get(target);

    if (!sourceTrust || !targetTrust) return;

    const impactMap: Record<TrustEvent['eventType'], number> = {
      success: 0.1,
      failure: -0.2,
      timeout: -0.15,
      data_share: 0.05,
    };

    const baseImpact = impactMap[eventType];
    const confidence = this._computeEventConfidence(eventType, targetTrust);
    const adjustedImpact = baseImpact * confidence;

    targetTrust.reliabilityScore = Math.max(0, Math.min(1, targetTrust.reliabilityScore + adjustedImpact));
    targetTrust.lastInteraction = new Date();
    targetTrust.trustLevel = this._scoreToLevel(targetTrust.reliabilityScore);
    targetTrust.interactionHistory.push(baseImpact);
    if (targetTrust.interactionHistory.length > 50) targetTrust.interactionHistory.shift();

    this._updateTrustGraph(source, target, adjustedImpact);

    this._trustEvents.push({
      timestamp: new Date(),
      source,
      target,
      eventType,
      impact: adjustedImpact,
      confidence,
    });

    if (this._trustEvents.length > 1000) {
      this._trustEvents.shift();
    }
  }

  private _computeEventConfidence(eventType: TrustEvent['eventType'], trust: ModuleTrust): number {
    const recentHistory = trust.interactionHistory.slice(-10);
    const recentAvg = recentHistory.length > 0
      ? recentHistory.reduce((a, b) => a + b, 0) / recentHistory.length
      : 0;

    const consistencyBonus = recentAvg > 0.05 ? 0.2 : recentAvg < -0.05 ? -0.1 : 0;
    const recencyBonus = Date.now() - trust.lastInteraction.getTime() < 300000 ? 0.1 : 0;

    return Math.min(1, 0.8 + consistencyBonus + recencyBonus);
  }

  private _updateTrustGraph(source: string, target: string, impact: number): void {
    const sourceEdges = this._trustGraph.get(source);
    const targetEdges = this._trustGraph.get(target);

    if (!sourceEdges || !targetEdges) return;

    const currentWeight = sourceEdges.get(target) ?? 0;
    const newWeight = Math.max(0, Math.min(1, currentWeight + impact * 0.1));

    sourceEdges.set(target, newWeight);
    targetEdges.set(source, newWeight);
  }

  sprayTrust(targetModuleId: string, amount: number): void {
    const cooldown = this._sprayCooldown.get(targetModuleId) || 0;
    if (Date.now() < cooldown) return;

    const target = this._trustMap.get(targetModuleId);
    if (!target) return;

    const efficiency = this._computeSprayEfficiency(target);
    const effectiveAmount = amount * efficiency;

    target.reliabilityScore = Math.min(1, target.reliabilityScore + effectiveAmount);
    target.trustLevel = this._scoreToLevel(target.reliabilityScore);

    this._sprayCooldown.set(targetModuleId, Date.now() + 60000);

    this._propagateTrust(targetModuleId, effectiveAmount * 0.3);
  }

  private _computeSprayEfficiency(trust: ModuleTrust): number {
    const baseEfficiency = 0.8;
    const levelBonus = trust.trustLevel > 3 ? 0.1 : trust.trustLevel < 2 ? -0.2 : 0;
    const historyVolatility = this._computeVolatility(trust.interactionHistory);
    const stabilityBonus = historyVolatility < 0.1 ? 0.1 : historyVolatility > 0.3 ? -0.1 : 0;

    return Math.max(0.5, Math.min(1, baseEfficiency + levelBonus + stabilityBonus));
  }

  private _computeVolatility(values: number[]): number {
    if (values.length < 2) return 0;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  private _propagateTrust(sourceId: string, amount: number): void {
    const edges = this._trustGraph.get(sourceId);
    if (!edges) return;

    for (const [targetId, weight] of edges) {
      const target = this._trustMap.get(targetId);
      if (target && weight > 0.3) {
        const propagatedAmount = amount * weight * 0.5;
        target.reliabilityScore = Math.min(1, target.reliabilityScore + propagatedAmount);
        target.trustLevel = this._scoreToLevel(target.reliabilityScore);
      }
    }
  }

  getTrustLevel(moduleId: string): TrustLevel {
    return this._trustMap.get(moduleId)?.trustLevel || 0;
  }

  getTrustedPartners(moduleId: string, minLevel: TrustLevel = 3): string[] {
    const sourceTrust = this._trustMap.get(moduleId);
    if (!sourceTrust) return [];

    const edges = this._trustGraph.get(moduleId);
    if (!edges) return [];

    return Array.from(edges.entries())
      .filter(([id, weight]) => {
        const trust = this._trustMap.get(id);
        return trust && trust.trustLevel >= minLevel && id !== moduleId && weight > 0.2;
      })
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => id);
  }

  getState(): {
    trustMap: Map<string, ModuleTrust>;
    recentEvents: TrustEvent[];
    network: TrustNetwork;
  } {
    return {
      trustMap: new Map(this._trustMap),
      recentEvents: [...this._trustEvents].slice(-100),
      network: this._buildTrustNetwork(),
    };
  }

  private _buildTrustNetwork(): TrustNetwork {
    const nodes = Array.from(this._trustMap.keys());
    const edges: TrustNetwork['edges'] = [];

    for (const [source, targets] of this._trustGraph) {
      for (const [target, weight] of targets) {
        if (weight > 0.1 && source < target) {
          edges.push({ source, target, weight });
        }
      }
    }

    let diameter = 0;
    const visited = new Set<string>();

    for (const node of nodes) {
      const distances = this._bfsDistances(node);
      const maxDist = Math.max(...Object.values(distances));
      diameter = Math.max(diameter, maxDist);
    }

    const clusteringCoefficient = this._computeClusteringCoefficient();

    return { nodes, edges, diameter, clusteringCoefficient };
  }

  private _bfsDistances(start: string): Record<string, number> {
    const distances: Record<string, number> = {};
    const queue: string[] = [start];
    distances[start] = 0;

    while (queue.length > 0) {
      const current = queue.shift()!;
      const edges = this._trustGraph.get(current);

      if (!edges) continue;

      for (const [neighbor] of edges) {
        if (!(neighbor in distances)) {
          distances[neighbor] = distances[current] + 1;
          queue.push(neighbor);
        }
      }
    }

    return distances;
  }

  private _computeClusteringCoefficient(): number {
    let totalCoefficient = 0;
    let count = 0;

    for (const [node, edges] of this._trustGraph) {
      const neighbors = Array.from(edges.keys());
      if (neighbors.length < 2) continue;

      let actualEdges = 0;
      for (let i = 0; i < neighbors.length; i++) {
        for (let j = i + 1; j < neighbors.length; j++) {
          const neighborEdges = this._trustGraph.get(neighbors[i]);
          if (neighborEdges && neighborEdges.has(neighbors[j])) {
            actualEdges++;
          }
        }
      }

      const possibleEdges = neighbors.length * (neighbors.length - 1) / 2;
      totalCoefficient += actualEdges / possibleEdges;
      count++;
    }

    return count > 0 ? totalCoefficient / count : 0;
  }

  applyDecay(): void {
    for (const trust of this._trustMap.values()) {
      trust.reliabilityScore = Math.max(0, trust.reliabilityScore - this._decayRate);
      trust.trustLevel = this._scoreToLevel(trust.reliabilityScore);
    }
  }

  private _scoreToLevel(score: number): TrustLevel {
    if (score >= 0.9) return 5;
    if (score >= 0.7) return 4;
    if (score >= 0.5) return 3;
    if (score >= 0.3) return 2;
    if (score >= 0.1) return 1;
    return 0;
  }

  setDecayRate(rate: number): void {
    this._decayRate = Math.max(0, Math.min(0.01, rate));
  }
}
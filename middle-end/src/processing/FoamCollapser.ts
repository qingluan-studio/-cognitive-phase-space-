/**
 * 泡沫坍缩器模块：合并冗余的泡沫状微处理节点，
 * 将不确定的叠加态坍缩为确定状态，减少处理碎片化。
 */

export interface FoamBubble {
  id: string;
  state: Record<string, unknown>;
  uncertainty: number;
  connections: string[];
  weight: number;
}

export interface CollapsedState {
  id: string;
  mergedBubbles: string[];
  definiteState: Record<string, unknown>;
  confidence: number;
  energyReleased: number;
}

export class FoamCollapser {
  private _bubbles: Map<string, FoamBubble> = new Map();
  private _collapsed: Map<string, CollapsedState> = new Map();
  private _uncertaintyThreshold = 0.3;
  private _similarityThreshold = 0.6;

  addBubble(bubble: FoamBubble): void {
    this._bubbles.set(bubble.id, bubble);
  }

  setUncertaintyThreshold(t: number): void {
    this._uncertaintyThreshold = Math.max(0, Math.min(1, t));
  }

  setSimilarityThreshold(t: number): void {
    this._similarityThreshold = Math.max(0, Math.min(1, t));
  }

  collapse(targetId: string): CollapsedState | undefined {
    const target = this._bubbles.get(targetId);
    if (!target) return undefined;

    const cluster = this._findCluster(target);
    const definiteState = this._mergeStates(cluster);
    const avgUncertainty = cluster.reduce((s, b) => s + b.uncertainty, 0) / cluster.length;
    const confidence = 1 - avgUncertainty;
    const energyReleased = cluster.reduce((s, b) => s + b.uncertainty * b.weight, 0);

    const collapsed: CollapsedState = {
      id: `collapsed-${targetId}`,
      mergedBubbles: cluster.map(b => b.id),
      definiteState,
      confidence,
      energyReleased,
    };
    this._collapsed.set(collapsed.id, collapsed);

    for (const bubble of cluster) {
      this._bubbles.delete(bubble.id);
    }

    return collapsed;
  }

  private _findCluster(seed: FoamBubble): FoamBubble[] {
    const cluster: FoamBubble[] = [seed];
    const visited = new Set<string>([seed.id]);
    const queue: FoamBubble[] = [seed];

    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const candidate of this._bubbles.values()) {
        if (visited.has(candidate.id)) continue;
        const similarity = this._similarity(current.state, candidate.state);
        const connected = current.connections.includes(candidate.id) || candidate.connections.includes(current.id);
        if (similarity >= this._similarityThreshold || connected) {
          if (candidate.uncertainty <= this._uncertaintyThreshold || current.uncertainty <= this._uncertaintyThreshold) {
            cluster.push(candidate);
            visited.add(candidate.id);
            queue.push(candidate);
          }
        }
      }
    }
    return cluster;
  }

  private _similarity(a: Record<string, unknown>, b: Record<string, unknown>): number {
    const keysA = new Set(Object.keys(a));
    const keysB = new Set(Object.keys(b));
    const intersection = new Set([...keysA].filter(k => keysB.has(k)));
    const union = new Set([...keysA, ...keysB]);
    if (union.size === 0) return 0;
    let valueMatch = 0;
    for (const k of intersection) {
      if (String(a[k]) === String(b[k])) valueMatch++;
    }
    return (intersection.size / union.size) * 0.5 + (intersection.size === 0 ? 0 : valueMatch / intersection.size) * 0.5;
  }

  private _mergeStates(cluster: FoamBubble[]): Record<string, unknown> {
    const merged: Record<string, unknown> = {};
    for (const bubble of cluster) {
      for (const [key, value] of Object.entries(bubble.state)) {
        if (key in merged) {
          if (typeof merged[key] === 'number' && typeof value === 'number') {
            merged[key] = (Number(merged[key]) + value) / 2;
          }
        } else {
          merged[key] = value;
        }
      }
    }
    merged._collapsed = true;
    merged._bubbleCount = cluster.length;
    return merged;
  }

  collapseAll(): CollapsedState[] {
    const results: CollapsedState[] = [];
    const ids = Array.from(this._bubbles.keys());
    for (const id of ids) {
      if (this._bubbles.has(id)) {
        const result = this.collapse(id);
        if (result) results.push(result);
      }
    }
    return results;
  }

  averageConfidence(): number {
    if (this._collapsed.size === 0) return 0;
    return Array.from(this._collapsed.values()).reduce((s, c) => s + c.confidence, 0) / this._collapsed.size;
  }

  totalEnergyReleased(): number {
    return Array.from(this._collapsed.values()).reduce((s, c) => s + c.energyReleased, 0);
  }

  reset(): void {
    this._bubbles.clear();
    this._collapsed.clear();
  }

  get bubbleCount(): number {
    return this._bubbles.size;
  }

  get collapsedCount(): number {
    return this._collapsed.size;
  }

  get uncertaintyThreshold(): number {
    return this._uncertaintyThreshold;
  }
}

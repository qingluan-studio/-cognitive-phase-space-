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
  private _temperature = 1.0;
  private _coolingRate = 0.95;

  addBubble(bubble: FoamBubble): void { this._bubbles.set(bubble.id, bubble); }
  setUncertaintyThreshold(t: number): void { this._uncertaintyThreshold = Math.max(0, Math.min(1, t)); }
  setSimilarityThreshold(t: number): void { this._similarityThreshold = Math.max(0, Math.min(1, t)); }
  setTemperature(t: number): void { this._temperature = Math.max(0.01, t); }
  setCoolingRate(r: number): void { this._coolingRate = Math.max(0.5, Math.min(0.99, r)); }

  collapse(targetId: string): CollapsedState | undefined {
    const target = this._bubbles.get(targetId);
    if (!target) return undefined;

    const cluster = this._energyMinimizedCluster(target);
    const definiteState = this._wavefunctionCollapse(cluster);
    const avgUncertainty = cluster.reduce((s, b) => s + b.uncertainty, 0) / cluster.length;
    const confidence = 1 - avgUncertainty;
    const energyReleased = cluster.reduce((s, b) => s + b.uncertainty * b.weight, 0);

    const collapsed: CollapsedState = {
      id: `collapsed-${targetId}`,
      mergedBubbles: cluster.map(b => b.id),
      definiteState, confidence, energyReleased,
    };
    this._collapsed.set(collapsed.id, collapsed);
    for (const bubble of cluster) this._bubbles.delete(bubble.id);
    return collapsed;
  }

  private _energyMinimizedCluster(seed: FoamBubble): FoamBubble[] {
    const cluster: FoamBubble[] = [seed];
    const visited = new Set<string>([seed.id]);
    let currentEnergy = this._clusterEnergy(cluster);
    let temp = this._temperature;

    for (let iter = 0; iter < 20; iter++) {
      const candidates: FoamBubble[] = [];
      for (const b of this._bubbles.values()) {
        if (visited.has(b.id)) continue;
        const connected = cluster.some(c =>
          c.connections.includes(b.id) || b.connections.includes(c.id)
        );
        const similar = cluster.some(c => this._similarity(c.state, b.state) >= this._similarityThreshold);
        if (connected || similar) candidates.push(b);
      }
      if (candidates.length === 0) break;

      let improved = false;
      for (const cand of candidates) {
        const newCluster = [...cluster, cand];
        const newEnergy = this._clusterEnergy(newCluster);
        const delta = newEnergy - currentEnergy;
        if (delta < 0 || Math.random() < Math.exp(-delta / temp)) {
          cluster.push(cand);
          visited.add(cand.id);
          currentEnergy = newEnergy;
          improved = true;
        }
      }
      temp *= this._coolingRate;
      if (!improved) break;
    }
    return cluster;
  }

  private _clusterEnergy(cluster: FoamBubble[]): number {
    if (cluster.length === 0) return Infinity;
    let totalUncertainty = 0, totalDisagreement = 0, pairCount = 0;
    for (const b of cluster) totalUncertainty += b.uncertainty * b.weight;
    for (let i = 0; i < cluster.length; i++) {
      for (let j = i + 1; j < cluster.length; j++) {
        totalDisagreement += (1 - this._similarity(cluster[i].state, cluster[j].state)) * (cluster[i].weight + cluster[j].weight);
        pairCount++;
      }
    }
    const avgDisagreement = pairCount === 0 ? 0 : totalDisagreement / pairCount;
    const sizePenalty = Math.log(cluster.length + 1) * 0.1;
    return totalUncertainty * 0.5 + avgDisagreement * 0.3 + sizePenalty * 0.2;
  }

  private _wavefunctionCollapse(cluster: FoamBubble[]): Record<string, unknown> {
    const merged: Record<string, unknown> = {};
    const allKeys = new Set<string>();
    for (const b of cluster) for (const k of Object.keys(b.state)) allKeys.add(k);
    const keyConfidence: Record<string, number> = {};

    for (const key of allKeys) {
      const numeric: Array<{ value: number; weight: number }> = [];
      const other: Array<{ value: unknown; weight: number }> = [];
      for (const b of cluster) {
        if (key in b.state) {
          const w = b.weight * (1 - b.uncertainty);
          const val = b.state[key];
          if (typeof val === 'number') numeric.push({ value: val, weight: w });
          else other.push({ value: val, weight: w });
        }
      }

      if (numeric.length > 0) {
        const sum = numeric.reduce((s, v) => s + v.value * v.weight, 0);
        const wsum = numeric.reduce((s, v) => s + v.weight, 0);
        const mean = wsum === 0 ? 0 : sum / wsum;
        const variance = numeric.length > 1
          ? numeric.reduce((s, v) => s + v.weight * (v.value - mean) ** 2, 0) / wsum
          : 0;
        merged[key] = mean;
        keyConfidence[key] = 1 - Math.min(1, Math.sqrt(variance) / (Math.abs(mean) + 0.001));
      } else if (other.length > 0) {
        const counts = new Map<string, number>();
        for (const v of other) {
          const s = String(v.value);
          counts.set(s, (counts.get(s) ?? 0) + v.weight);
        }
        let bestVal: unknown = other[0].value, bestCount = 0, totalW = 0;
        for (const [val, count] of counts) {
          if (count > bestCount) { bestCount = count; bestVal = val; }
          totalW += count;
        }
        merged[key] = bestVal;
        keyConfidence[key] = bestCount / Math.max(0.001, totalW);
      }
    }

    merged._collapsed = true;
    merged._bubbleCount = cluster.length;
    const confVals = Object.values(keyConfidence);
    merged._avgConfidence = confVals.length === 0 ? 0 : confVals.reduce((s, v) => s + v, 0) / confVals.length;
    return merged;
  }

  private _similarity(a: Record<string, unknown>, b: Record<string, unknown>): number {
    const keysA = new Set(Object.keys(a)), keysB = new Set(Object.keys(b));
    const inter = new Set([...keysA].filter(k => keysB.has(k)));
    const union = new Set([...keysA, ...keysB]);
    if (union.size === 0) return 0;
    let valMatch = 0;
    for (const k of inter) {
      const va = a[k], vb = b[k];
      if (typeof va === 'number' && typeof vb === 'number') {
        valMatch += Math.max(0, 1 - Math.abs(va - vb) / Math.max(Math.abs(va), Math.abs(vb), 0.001));
      } else if (String(va) === String(vb)) {
        valMatch += 1;
      }
    }
    return (inter.size / union.size) * 0.4 + (inter.size === 0 ? 0 : valMatch / inter.size) * 0.6;
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
    this._temperature = 1.0;
  }

  get bubbleCount(): number { return this._bubbles.size; }
  get collapsedCount(): number { return this._collapsed.size; }
  get uncertaintyThreshold(): number { return this._uncertaintyThreshold; }
  get temperature(): number { return this._temperature; }
}

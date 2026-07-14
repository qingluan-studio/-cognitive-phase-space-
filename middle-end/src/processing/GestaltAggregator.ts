export interface Fragment {
  id: string;
  data: Record<string, unknown>;
  position: number;
  similarityKey: string;
  weight: number;
  featureVector?: number[];
}

export interface GestaltWhole {
  id: string;
  fragments: Fragment[];
  emergentMeaning: Record<string, unknown>;
  coherence: number;
  closed: boolean;
  closureGap: number;
  centroid: number;
}

export type GestaltPrinciple = 'proximity' | 'similarity' | 'closure' | 'continuity' | 'commonFate';

interface ClusterNode {
  id: string;
  fragments: Fragment[];
  centroid: number;
  avgSimKey: string;
  variance: number;
}

export class GestaltAggregator {
  private _fragments: Map<string, Fragment> = new Map();
  private _wholes: Map<string, GestaltWhole> = new Map();
  private _principleWeights: Map<GestaltPrinciple, number> = new Map();
  private _nextWholeId = 0;
  private _affinityCache: Map<string, number> = new Map();
  private _featureDim = 8;
  private _clusters: ClusterNode[] = [];

  constructor() {
    this._principleWeights.set('proximity', 0.3);
    this._principleWeights.set('similarity', 0.3);
    this._principleWeights.set('closure', 0.2);
    this._principleWeights.set('continuity', 0.15);
    this._principleWeights.set('commonFate', 0.05);
  }

  addFragment(fragment: Fragment): void {
    const enriched: Fragment = {
      ...fragment,
      featureVector: fragment.featureVector ?? this._extractFeatures(fragment),
    };
    this._fragments.set(fragment.id, enriched);
    this._affinityCache.clear();
  }

  private _extractFeatures(f: Fragment): number[] {
    const vec = new Array(this._featureDim).fill(0);
    vec[0] = f.position / 100;
    vec[1] = f.weight;
    const hash = this._hashString(f.similarityKey);
    for (let i = 2; i < this._featureDim; i++) {
      vec[i] = ((hash >> (i - 2)) & 0xff) / 255;
    }
    return vec;
  }

  private _hashString(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = ((h << 5) - h) + s.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h);
  }

  setPrincipleWeight(principle: GestaltPrinciple, weight: number): void {
    this._principleWeights.set(principle, Math.max(0, weight));
  }

  aggregate(threshold = 0.5): GestaltWhole[] {
    this._wholes.clear();
    const fragments = Array.from(this._fragments.values());
    if (fragments.length === 0) return [];

    const clusters = this._hierarchicalAgglomerative(fragments, threshold);
    const result: GestaltWhole[] = [];

    for (const cluster of clusters) {
      const whole = this._formWhole(cluster.fragments);
      this._wholes.set(whole.id, whole);
      result.push(whole);
    }

    this._clusters = clusters;
    return result;
  }

  private _hierarchicalAgglomerative(fragments: Fragment[], threshold: number): ClusterNode[] {
    let clusters: ClusterNode[] = fragments.map(f => ({
      id: `c-${f.id}`,
      fragments: [f],
      centroid: f.position,
      avgSimKey: f.similarityKey,
      variance: 0,
    }));

    while (clusters.length > 1) {
      let bestI = -1, bestJ = -1, bestSim = -1;

      for (let i = 0; i < clusters.length; i++) {
        for (let j = i + 1; j < clusters.length; j++) {
          const sim = this._clusterAffinity(clusters[i], clusters[j]);
          if (sim > bestSim) {
            bestSim = sim;
            bestI = i;
            bestJ = j;
          }
        }
      }

      if (bestSim < threshold) break;

      const merged = this._mergeClusters(clusters[bestI], clusters[bestJ]);
      clusters = clusters.filter((_, idx) => idx !== bestI && idx !== bestJ);
      clusters.push(merged);
    }

    return clusters;
  }

  private _clusterAffinity(a: ClusterNode, b: ClusterNode): number {
    const cacheKey = `${a.id}|${b.id}`;
    const cached = this._affinityCache.get(cacheKey);
    if (cached !== undefined) return cached;

    const proximity = this._proximityScore(a.centroid, b.centroid);
    const similarity = this._cosineSimilarity(
      this._clusterFeatureVector(a),
      this._clusterFeatureVector(b)
    );
    const continuity = this._continuityScore(a, b);
    const closureBoost = this._closurePotential(a, b);

    const w = this._principleWeights;
    const score =
      proximity * (w.get('proximity') ?? 0) +
      similarity * (w.get('similarity') ?? 0) +
      continuity * (w.get('continuity') ?? 0) +
      closureBoost * (w.get('closure') ?? 0);

    this._affinityCache.set(cacheKey, score);
    this._affinityCache.set(`${b.id}|${a.id}`, score);
    return score;
  }

  private _clusterFeatureVector(c: ClusterNode): number[] {
    const vec = new Array(this._featureDim).fill(0);
    let totalWeight = 0;
    for (const f of c.fragments) {
      const fv = f.featureVector ?? new Array(this._featureDim).fill(0);
      for (let i = 0; i < this._featureDim; i++) {
        vec[i] += fv[i] * f.weight;
      }
      totalWeight += f.weight;
    }
    if (totalWeight > 0) {
      for (let i = 0; i < this._featureDim; i++) vec[i] /= totalWeight;
    }
    return vec;
  }

  private _cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
  }

  private _proximityScore(posA: number, posB: number): number {
    const distance = Math.abs(posA - posB);
    return Math.exp(-distance * distance / 2500);
  }

  private _continuityScore(a: ClusterNode, b: ClusterNode): number {
    const gap = Math.abs(a.centroid - b.centroid);
    const avgSpan = (this._clusterSpan(a) + this._clusterSpan(b)) / 2;
    if (avgSpan === 0) return 0;
    const ratio = gap / avgSpan;
    return Math.exp(-ratio * ratio * 2);
  }

  private _clusterSpan(c: ClusterNode): number {
    if (c.fragments.length < 2) return 0;
    let min = Infinity, max = -Infinity;
    for (const f of c.fragments) {
      if (f.position < min) min = f.position;
      if (f.position > max) max = f.position;
    }
    return max - min;
  }

  private _closurePotential(a: ClusterNode, b: ClusterNode): number {
    const totalSize = a.fragments.length + b.fragments.length;
    if (totalSize < 3) return 0;
    const gap = Math.abs(a.centroid - b.centroid);
    const density = totalSize / Math.max(1, gap);
    return 1 - Math.exp(-density * 2);
  }

  private _mergeClusters(a: ClusterNode, b: ClusterNode): ClusterNode {
    const frags = [...a.fragments, ...b.fragments];
    const totalWeight = frags.reduce((s, f) => s + f.weight, 0);
    const centroid = totalWeight === 0 ? (a.centroid + b.centroid) / 2 :
      frags.reduce((s, f) => s + f.position * f.weight, 0) / totalWeight;

    const variance = frags.reduce((s, f) => s + f.weight * (f.position - centroid) ** 2, 0) / Math.max(1, totalWeight);
    const dominantKey = this._dominantKey(frags);

    return {
      id: `${a.id}+${b.id}`,
      fragments: frags,
      centroid,
      avgSimKey: dominantKey,
      variance,
    };
  }

  private _formWhole(group: Fragment[]): GestaltWhole {
    const id = `whole-${this._nextWholeId++}`;
    const totalWeight = group.reduce((s, f) => s + f.weight, 0);
    const centroid = totalWeight === 0 ? 0 :
      group.reduce((s, f) => s + f.position * f.weight, 0) / totalWeight;

    const positions = group.map(f => f.position).sort((a, b) => a - b);
    const span = positions.length > 1 ? positions[positions.length - 1] - positions[0] : 0;
    const gaps: number[] = [];
    for (let i = 1; i < positions.length; i++) {
      gaps.push(positions[i] - positions[i - 1]);
    }
    const maxGap = gaps.length > 0 ? Math.max(...gaps) : 0;
    const avgGap = gaps.length > 0 ? gaps.reduce((s, g) => s + g, 0) / gaps.length : 0;
    const closureGap = span === 0 ? 0 : maxGap / span;
    const closed = group.length >= 3 && closureGap < 0.4;

    const emergentMeaning: Record<string, unknown> = {
      fragmentCount: group.length,
      centroid,
      dominantKey: this._dominantKey(group),
      totalWeight,
      span,
      averageGap: avgGap,
      maxGap,
      closureGap,
      variance: totalWeight === 0 ? 0 :
        group.reduce((s, f) => s + f.weight * (f.position - centroid) ** 2, 0) / totalWeight,
      symmetry: this._symmetryScore(group, centroid),
    };

    const coherence = group.length === 0 ? 0 :
      group.reduce((s, f) => s + f.weight * this._affinityToCentroid(f, centroid, group), 0) / totalWeight;

    return {
      id,
      fragments: group,
      emergentMeaning,
      coherence,
      closed,
      closureGap,
      centroid,
    };
  }

  private _affinityToCentroid(f: Fragment, centroid: number, group: Fragment[]): number {
    const proximity = Math.exp(-Math.abs(f.position - centroid) / 50);
    const groupKey = this._dominantKey(group);
    const similarity = f.similarityKey === groupKey ? 1 : 0.3;
    return 0.5 * proximity + 0.5 * similarity;
  }

  private _symmetryScore(group: Fragment[], centroid: number): number {
    if (group.length < 2) return 0;
    let matched = 0;
    const used = new Set<string>();
    for (const left of group) {
      if (used.has(left.id)) continue;
      const mirrorPos = 2 * centroid - left.position;
      let best: Fragment | null = null;
      let bestDist = Infinity;
      for (const right of group) {
        if (right.id === left.id || used.has(right.id)) continue;
        const d = Math.abs(right.position - mirrorPos);
        if (d < bestDist) { bestDist = d; best = right; }
      }
      if (best && bestDist < 20) {
        matched++;
        used.add(left.id);
        used.add(best.id);
      }
    }
    return (2 * matched) / group.length;
  }

  private _dominantKey(group: Fragment[]): string {
    const counts = new Map<string, number>();
    for (const f of group) {
      counts.set(f.similarityKey, (counts.get(f.similarityKey) ?? 0) + f.weight);
    }
    let best = '';
    let max = 0;
    for (const [k, c] of counts) {
      if (c > max) { max = c; best = k; }
    }
    return best;
  }

  getWhole(id: string): GestaltWhole | undefined {
    return this._wholes.get(id);
  }

  dissolveWhole(id: string): boolean {
    const whole = this._wholes.get(id);
    if (!whole) return false;
    for (const f of whole.fragments) {
      this._fragments.delete(f.id);
    }
    return this._wholes.delete(id);
  }

  coherenceDistribution(): Map<string, number> {
    const dist = new Map<string, number>([['low', 0], ['mid', 0], ['high', 0]]);
    for (const w of this._wholes.values()) {
      const bucket = w.coherence > 0.7 ? 'high' : w.coherence > 0.4 ? 'mid' : 'low';
      dist.set(bucket, (dist.get(bucket) ?? 0) + 1);
    }
    return dist;
  }

  reset(): void {
    this._fragments.clear();
    this._wholes.clear();
    this._affinityCache.clear();
    this._clusters = [];
    this._nextWholeId = 0;
  }

  get fragmentCount(): number { return this._fragments.size; }
  get wholeCount(): number { return this._wholes.size; }
  get clusterCount(): number { return this._clusters.length; }
  get featureDim(): number { return this._featureDim; }
}

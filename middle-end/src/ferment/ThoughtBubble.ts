export interface Bubble {
  id: number;
  x: number;
  y: number;
  radius: number;
  pressure: number;
  surfaceTension: number;
  nucleationTime: number;
}

export interface BubbleCluster {
  bubbles: Bubble[];
  clusterRadius: number;
  averagePressure: number;
  totalVolume: number;
}

export class ThoughtBubble {
  private _bubbles: Bubble[] = [];
  private _nextId: number = 0;
  private _clusters: BubbleCluster[] = [];
  private _surfaceTensionCoefficient: number = 0.072;
  private _ambientPressure: number = 101325;
  private _ostwaldRipeningRate: number = 0.01;
  private _sizeDistributionEntropy: number = 0;
  private _state: Record<string, unknown> = {};

  get bubbleCount(): number {
    return this._bubbles.length;
  }

  get totalVolume(): number {
    return this._bubbles.reduce((sum, b) => sum + (4 / 3) * Math.PI * Math.pow(b.radius, 3), 0);
  }

  get sizeDistributionEntropy(): number {
    return this._sizeDistributionEntropy;
  }

  nucleate(x: number, y: number, initialRadius: number): Bubble {
    const pressure = this._ambientPressure + (2 * this._surfaceTensionCoefficient) / initialRadius;
    const bubble: Bubble = {
      id: this._nextId++,
      x,
      y,
      radius: initialRadius,
      pressure,
      surfaceTension: this._surfaceTensionCoefficient,
      nucleationTime: Date.now(),
    };
    this._bubbles.push(bubble);
    this._updateSizeDistributionEntropy();
    this._state.lastNucleation = bubble.id;
    return bubble;
  }

  private _updateSizeDistributionEntropy(): void {
    const bins = 8;
    const maxR = Math.max(...this._bubbles.map(b => b.radius), 1);
    const counts = new Array(bins).fill(0);
    for (const b of this._bubbles) {
      const idx = Math.min(bins - 1, Math.floor((b.radius / maxR) * bins));
      counts[idx]++;
    }
    const total = this._bubbles.length;
    if (total === 0) {
      this._sizeDistributionEntropy = 0;
      return;
    }
    let entropy = 0;
    for (const c of counts) {
      if (c > 0) {
        const p = c / total;
        entropy -= p * Math.log2(p);
      }
    }
    this._sizeDistributionEntropy = entropy;
  }

  grow(bubbleId: number, amount: number): boolean {
    const bubble = this._bubbles.find(b => b.id === bubbleId);
    if (!bubble) return false;
    bubble.radius += amount;
    bubble.pressure = this._ambientPressure + (2 * bubble.surfaceTension) / bubble.radius;
    this._updateSizeDistributionEntropy();
    return true;
  }

  ostwaldRipening(): void {
    if (this._bubbles.length < 2) return;
    const meanRadius = this._bubbles.reduce((s, b) => s + b.radius, 0) / this._bubbles.length;
    for (const b of this._bubbles) {
      const dr = this._ostwaldRipeningRate * (1 / meanRadius - 1 / b.radius);
      b.radius = Math.max(0.001, b.radius + dr * 0.01);
      b.pressure = this._ambientPressure + (2 * b.surfaceTension) / b.radius;
    }
    this._updateSizeDistributionEntropy();
  }

  coalesce(bubbleIdA: number, bubbleIdB: number): Bubble | null {
    const a = this._bubbles.find(b => b.id === bubbleIdA);
    const b = this._bubbles.find(b => b.id === bubbleIdB);
    if (!a || !b) return null;
    const dist = Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
    if (dist > a.radius + b.radius) return null;
    const newVolume = (4 / 3) * Math.PI * (Math.pow(a.radius, 3) + Math.pow(b.radius, 3));
    const newRadius = Math.pow((3 * newVolume) / (4 * Math.PI), 1 / 3);
    const x = (a.x + b.x) / 2;
    const y = (a.y + b.y) / 2;
    this._bubbles = this._bubbles.filter(bub => bub.id !== bubbleIdA && bub.id !== bubbleIdB);
    const merged = this.nucleate(x, y, newRadius);
    merged.pressure = this._ambientPressure + (2 * merged.surfaceTension) / merged.radius;
    return merged;
  }

  burst(bubbleId: number): boolean {
    const idx = this._bubbles.findIndex(b => b.id === bubbleId);
    if (idx === -1) return false;
    this._bubbles.splice(idx, 1);
    this._updateSizeDistributionEntropy();
    return true;
  }

  formClusters(distanceThreshold: number): BubbleCluster[] {
    const visited = new Set<number>();
    const clusters: BubbleCluster[] = [];
    for (const b of this._bubbles) {
      if (visited.has(b.id)) continue;
      const clusterBubbles: Bubble[] = [];
      const queue = [b];
      visited.add(b.id);
      while (queue.length > 0) {
        const current = queue.shift()!;
        clusterBubbles.push(current);
        for (const neighbor of this._bubbles) {
          if (visited.has(neighbor.id)) continue;
          const d = Math.sqrt((current.x - neighbor.x) ** 2 + (current.y - neighbor.y) ** 2);
          if (d <= distanceThreshold) {
            visited.add(neighbor.id);
            queue.push(neighbor);
          }
        }
      }
      const avgPressure = clusterBubbles.reduce((s, bub) => s + bub.pressure, 0) / clusterBubbles.length;
      const totalVolume = clusterBubbles.reduce((s, bub) => s + (4 / 3) * Math.PI * Math.pow(bub.radius, 3), 0);
      const maxDist = clusterBubbles.reduce((max, bub) => {
        for (const other of clusterBubbles) {
          const d = Math.sqrt((bub.x - other.x) ** 2 + (bub.y - other.y) ** 2);
          if (d > max) return d;
        }
        return max;
      }, 0);
      clusters.push({
        bubbles: clusterBubbles,
        clusterRadius: maxDist / 2,
        averagePressure: avgPressure,
        totalVolume,
      });
    }
    this._clusters = clusters;
    return clusters;
  }

  getBubbles(): Bubble[] {
    return [...this._bubbles];
  }

  getLargestBubble(): Bubble | null {
    if (this._bubbles.length === 0) return null;
    return this._bubbles.reduce((best, b) => (b.radius > best.radius ? b : best));
  }

  averageRadius(): number {
    if (this._bubbles.length === 0) return 0;
    return this._bubbles.reduce((acc, b) => acc + b.radius, 0) / this._bubbles.length;
  }

  setSurfaceTension(coefficient: number): void {
    this._surfaceTensionCoefficient = coefficient;
    for (const b of this._bubbles) {
      b.surfaceTension = coefficient;
      b.pressure = this._ambientPressure + (2 * coefficient) / b.radius;
    }
  }

  clear(): void {
    this._bubbles = [];
    this._clusters = [];
    this._sizeDistributionEntropy = 0;
  }

  bubbleReport(): Record<string, unknown> {
    return {
      bubbleCount: this._bubbles.length,
      totalVolume: this.totalVolume.toFixed(4),
      averageRadius: this.averageRadius().toFixed(4),
      sizeDistributionEntropy: this._sizeDistributionEntropy.toFixed(4),
      clusterCount: this._clusters.length,
      ambientPressure: this._ambientPressure,
      surfaceTensionCoefficient: this._surfaceTensionCoefficient.toFixed(4),
      state: this._state,
    };
  }
}

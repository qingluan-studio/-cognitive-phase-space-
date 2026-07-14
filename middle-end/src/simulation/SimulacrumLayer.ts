/**
 * 拟像层：层层仿真的现实。
 * 每一层都是上一层的仿真副本，副本可能比原作更"真实"，层叠形成深度仿真。
 */

export interface SimulacrumLayerData {
  id: string;
  depth: number;
  sourceLayerId: string | null;
  fidelity: number;
  content: Record<string, unknown>;
}

export class SimulacrumLayer {
  private _layers: Map<string, SimulacrumLayerData> = new Map();
  private _rootId: string | null = null;
  private _maxDepth = 10;

  addRoot(id: string, content: Record<string, unknown>): SimulacrumLayerData {
    const layer: SimulacrumLayerData = {
      id,
      depth: 0,
      sourceLayerId: null,
      fidelity: 1.0,
      content,
    };
    this._layers.set(id, layer);
    this._rootId = id;
    return layer;
  }

  simulate(sourceId: string, newId: string, fidelity: number = 0.9): SimulacrumLayerData | null {
    const source = this._layers.get(sourceId);
    if (!source) return null;
    if (source.depth + 1 > this._maxDepth) return null;
    const layer: SimulacrumLayerData = {
      id: newId,
      depth: source.depth + 1,
      sourceLayerId: sourceId,
      fidelity,
      content: { ...source.content, simulatedAt: Date.now() },
    };
    this._layers.set(newId, layer);
    return layer;
  }

  computeDepth(id: string): number {
    const layer = this._layers.get(id);
    if (!layer) return -1;
    let depth = 0;
    let current: SimulacrumLayerData | undefined = layer;
    while (current && current.sourceLayerId) {
      depth++;
      current = this._layers.get(current.sourceLayerId);
    }
    return depth;
  }

  traceLineage(id: string): string[] {
    const chain: string[] = [];
    let current = this._layers.get(id);
    while (current) {
      chain.push(current.id);
      current = current.sourceLayerId ? this._layers.get(current.sourceLayerId) : undefined;
    }
    return chain;
  }

  averageFidelity(): number {
    if (this._layers.size === 0) return 0;
    let sum = 0;
    for (const l of this._layers.values()) sum += l.fidelity;
    return sum / this._layers.size;
  }

  removeLayer(id: string): boolean {
    return this._layers.delete(id);
  }

  getLayer(id: string): SimulacrumLayerData | null {
    return this._layers.get(id) ?? null;
  }

  get layerCount(): number {
    return this._layers.size;
  }

  get rootId(): string | null {
    return this._rootId;
  }
}

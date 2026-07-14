/**
 * 语义迷雾：用模糊包围核心概念。
 * 在核心概念外围层层包裹语义噪声，使外部观察者只能感知到模糊轮廓。
 */

export interface FogLayer {
  id: string;
  radius: number;
  density: number;
  obscuresCore: boolean;
}

export interface CoreConcept {
  id: string;
  meaning: string;
  visibility: number;
}

export class SemanticFog {
  private _core: CoreConcept | null = null;
  private _layers: FogLayer[] = [];
  private _observers: Set<string> = new Set();
  private _maxLayers = 7;

  setCore(concept: CoreConcept): void {
    this._core = concept;
  }

  addLayer(layer: FogLayer): void {
    if (this._layers.length >= this._maxLayers) this._layers.shift();
    this._layers.push(layer);
    this._layers.sort((a, b) => a.radius - b.radius);
  }

  thickenFog(amount: number): void {
    for (const layer of this._layers) {
      layer.density = Math.min(1, layer.density + amount);
      layer.obscuresCore = layer.density > 0.5;
    }
  }

  disperseLayer(layerId: string): boolean {
    const idx = this._layers.findIndex(l => l.id === layerId);
    if (idx < 0) return false;
    this._layers.splice(idx, 1);
    return true;
  }

  observe(observerId: string): string | null {
    if (!this._core) return null;
    this._observers.add(observerId);
    const totalDensity = this._layers.reduce((s, l) => s + l.density, 0);
    const visibility = Math.max(0, 1 - totalDensity / this._maxLayers);
    this._core.visibility = visibility;
    if (visibility < 0.2) return '…（迷雾中无法分辨）…';
    if (visibility < 0.6) return this._core.meaning.slice(0, Math.ceil(this._core.meaning.length * visibility));
    return this._core.meaning;
  }

  pierceFog(strength: number): void {
    for (const layer of this._layers) {
      layer.density = Math.max(0, layer.density - strength);
    }
  }

  getLayer(id: string): FogLayer | null {
    return this._layers.find(l => l.id === id) ?? null;
  }

  getCore(): CoreConcept | null {
    return this._core ? { ...this._core } : null;
  }

  getLayerCount(): number {
    return this._layers.length;
  }

  getObserverCount(): number {
    return this._observers.size;
  }

  get coreVisibility(): number {
    return this._core?.visibility ?? 0;
  }
}

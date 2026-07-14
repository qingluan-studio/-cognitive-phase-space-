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
  private _diffusionCoefficients: number[] = [];
  private _entropyField: number[] = [];

  setCore(concept: CoreConcept): void {
    this._core = concept;
  }

  addLayer(layer: FogLayer): void {
    if (this._layers.length >= this._maxLayers) this._layers.shift();
    this._layers.push(layer);
    this._layers.sort((a, b) => a.radius - b.radius);
    this._diffusionCoefficients.push(Math.random() * 0.1);
    if (this._diffusionCoefficients.length > this._maxLayers) this._diffusionCoefficients.shift();
  }

  thickenFog(amount: number): void {
    for (const layer of this._layers) {
      layer.density = Math.min(1, layer.density + amount);
      layer.obscuresCore = layer.density > 0.5;
    }
    this._updateEntropyField();
  }

  disperseLayer(layerId: string): boolean {
    const idx = this._layers.findIndex(l => l.id === layerId);
    if (idx < 0) return false;
    this._layers.splice(idx, 1);
    this._diffusionCoefficients.splice(idx, 1);
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
    this._updateEntropyField();
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

  computeFogEntropy(): number {
    if (this._entropyField.length === 0) return 0;
    const mean = this._entropyField.reduce((a, b) => a + b, 0) / this._entropyField.length;
    const variance = this._entropyField.reduce((s, v) => s + (v - mean) ** 2, 0) / this._entropyField.length;
    return 0.5 * Math.log2(2 * Math.PI * Math.E * Math.max(variance, 1e-10));
  }

  simulateDiffusion(steps: number): void {
    for (let t = 0; t < steps; t++) {
      const newDensities: number[] = [];
      for (let i = 0; i < this._layers.length; i++) {
        let laplacian = 0;
        if (i > 0) laplacian += this._layers[i - 1].density - this._layers[i].density;
        if (i < this._layers.length - 1) laplacian += this._layers[i + 1].density - this._layers[i].density;
        const d = this._diffusionCoefficients[i] ?? 0.01;
        newDensities.push(Math.max(0, Math.min(1, this._layers[i].density + d * laplacian)));
      }
      for (let i = 0; i < this._layers.length; i++) {
        this._layers[i].density = newDensities[i];
      }
    }
    this._updateEntropyField();
  }

  private _updateEntropyField(): void {
    this._entropyField = this._layers.map(l => -l.density * Math.log2(Math.max(l.density, 1e-10)) - (1 - l.density) * Math.log2(Math.max(1 - l.density, 1e-10)));
  }
}

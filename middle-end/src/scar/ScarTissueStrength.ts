export interface ScarLayer {
  id: string;
  youngsModulus: number;
  thickness: number;
  stressConcentration: number;
  fractureToughness: number;
}

export interface StressResult {
  layerId: string;
  stress: number;
  strain: number;
  energyRelease: number;
  failureProbability: number;
}

export class ScarTissueStrength {
  private _layers: Map<string, ScarLayer> = new Map();
  private _results: StressResult[] = [];
  private _state: Record<string, unknown> = {};
  private _compositeModulus: number = 0;
  private _totalThickness: number = 0;

  constructor() {}

  get layerCount(): number {
    return this._layers.size;
  }

  get compositeModulus(): number {
    return this._compositeModulus;
  }

  addLayer(id: string, youngsModulus: number, thickness: number, toughness: number): void {
    this._layers.set(id, {
      id,
      youngsModulus,
      thickness,
      stressConcentration: 1,
      fractureToughness: toughness,
    });
    this._recomputeComposite();
  }

  private _recomputeComposite(): void {
    let numerator = 0;
    let denominator = 0;
    for (const layer of this._layers.values()) {
      numerator += layer.youngsModulus * layer.thickness;
      denominator += layer.thickness;
    }
    this._compositeModulus = denominator > 0 ? numerator / denominator : 0;
    this._totalThickness = denominator;
  }

  applyStress(layerId: string, force: number): StressResult | null {
    const layer = this._layers.get(layerId);
    if (!layer) return null;
    const stress = force / layer.thickness;
    const strain = stress / (layer.youngsModulus || 1);
    const kt = layer.stressConcentration;
    const maxStress = kt * stress;
    const energyRelease = (maxStress ** 2 * Math.PI * layer.thickness) / (layer.youngsModulus || 1);
    const failureProbability = 1 / (1 + Math.exp(-(maxStress - layer.fractureToughness)));
    const result: StressResult = { layerId, stress, strain, energyRelease, failureProbability };
    this._results.push(result);
    if (this._results.length > 50) this._results.shift();
    return result;
  }

  updateStressConcentration(layerId: string, notchDepth: number): void {
    const layer = this._layers.get(layerId);
    if (!layer) return;
    const a = notchDepth;
    const w = layer.thickness;
    layer.stressConcentration = 1 + 2 * Math.sqrt(a / (w - a));
  }

  ruleOfMixtures(): { upper: number; lower: number } {
    const volumes = Array.from(this._layers.values()).map((l) => l.thickness);
    const total = volumes.reduce((s, v) => s + v, 0);
    if (total === 0) return { upper: 0, lower: 0 };
    const upper = Array.from(this._layers.values()).reduce((s, l) => s + l.youngsModulus * (l.thickness / total), 0);
    const lower = 1 / Array.from(this._layers.values()).reduce((s, l) => s + (l.thickness / total) / (l.youngsModulus || 1), 0);
    return { upper, lower };
  }

  griffithCriterion(layerId: string, crackLength: number): number {
    const layer = this._layers.get(layerId);
    if (!layer) return 0;
    const gamma = layer.fractureToughness;
    const e = layer.youngsModulus;
    return Math.sqrt((2 * gamma * e) / (Math.PI * crackLength));
  }

  totalEnergyAbsorption(): number {
    return this._results.reduce((s, r) => s + r.energyRelease, 0);
  }

  weakestLayer(): ScarLayer | null {
    if (this._layers.size === 0) return null;
    return Array.from(this._layers.values()).reduce((best, l) => (l.fractureToughness < best.fractureToughness ? l : best));
  }

  stressConcentrationFactor(layerId: string, notchRadius: number): number {
    const layer = this._layers.get(layerId);
    if (!layer) return 0;
    return 1 + 2 * Math.sqrt(layer.thickness / (notchRadius || 1));
  }

  report(): Record<string, unknown> {
    return {
      layers: this._layers.size,
      compositeModulus: this._compositeModulus,
      totalThickness: this._totalThickness,
      energyAbsorption: this.totalEnergyAbsorption(),
      state: this._state,
    };
  }
}

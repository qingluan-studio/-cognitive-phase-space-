export interface LichenLayer {
  id: string;
  type: 'photobiont' | 'mycobiont';
  photosynthesisRate: number;
  waterPotential: number;
  osmoticPressure: number;
  growthRate: number;
}

export interface EnvironmentalCondition {
  irradiance: number;
  humidity: number;
  temperature: number;
}

export class LichenComposite {
  private _layers: Map<string, LichenLayer> = new Map();
  private _state: Record<string, unknown> = {};
  private _waterContent: number = 0.5;
  private _compositeGrowth: number = 0;
  private _piCurve: { irradiance: number; rate: number }[] = [];

  constructor() {}

  get layerCount(): number {
    return this._layers.size;
  }

  get waterContent(): number {
    return this._waterContent;
  }

  addLayer(id: string, type: 'photobiont' | 'mycobiont', baseRate: number, waterPotential: number): void {
    const osmoticPressure = -waterPotential * 0.1;
    const growthRate = type === 'photobiont' ? baseRate : baseRate * 0.5;
    this._layers.set(id, { id, type, photosynthesisRate: baseRate, waterPotential, osmoticPressure, growthRate });
  }

  computePiCurve(maxIrradiance: number, steps: number): { irradiance: number; rate: number }[] {
    const curve: { irradiance: number; rate: number }[] = [];
    const photobionts = Array.from(this._layers.values()).filter((l) => l.type === 'photobiont');
    const pmax = photobionts.reduce((s, l) => s + l.photosynthesisRate, 0) / (photobionts.length || 1);
    const alpha = 0.05;
    for (let i = 0; i < steps; i++) {
      const irradiance = (maxIrradiance * i) / (steps - 1);
      const rate = pmax * (1 - Math.exp(-alpha * irradiance / (pmax || 1)));
      curve.push({ irradiance, rate });
    }
    this._piCurve = curve;
    return curve;
  }

  updateWaterContent(humidity: number, time: number): void {
    const equilibrium = humidity;
    const tau = 10;
    this._waterContent = equilibrium + (this._waterContent - equilibrium) * Math.exp(-time / tau);
    for (const layer of this._layers.values()) {
      layer.waterPotential = -this._waterContent * 2;
      layer.osmoticPressure = -layer.waterPotential * 0.1;
      if (layer.type === 'photobiont') {
        layer.photosynthesisRate = layer.growthRate * Math.min(1, this._waterContent / 0.3);
      }
    }
  }

  osmoticAdjustment(layerId: string, deltaSolute: number): void {
    const layer = this._layers.get(layerId);
    if (!layer) return;
    layer.osmoticPressure += deltaSolute * 0.1;
    layer.waterPotential = -layer.osmoticPressure * 10;
  }

  compositeGrowthRate(): number {
    const photobionts = Array.from(this._layers.values()).filter((l) => l.type === 'photobiont');
    const mycobionts = Array.from(this._layers.values()).filter((l) => l.type === 'mycobiont');
    const photoRate = photobionts.reduce((s, l) => s + l.photosynthesisRate, 0) / (photobionts.length || 1);
    const mycoRate = mycobionts.reduce((s, l) => s + l.growthRate, 0) / (mycobionts.length || 1);
    this._compositeGrowth = Math.sqrt(photoRate * mycoRate);
    return this._compositeGrowth;
  }

  waterUseEfficiency(): number {
    const photoRate = Array.from(this._layers.values())
      .filter((l) => l.type === 'photobiont')
      .reduce((s, l) => s + l.photosynthesisRate, 0);
    return this._waterContent > 0 ? photoRate / this._waterContent : 0;
  }

  photosyntheticEfficiency(irradiance: number): number {
    const photobionts = Array.from(this._layers.values()).filter((l) => l.type === 'photobiont');
    if (photobionts.length === 0) return 0;
    const pmax = photobionts.reduce((s, l) => s + l.photosynthesisRate, 0) / photobionts.length;
    const alpha = 0.05;
    return pmax > 0 ? (pmax * (1 - Math.exp(-alpha * irradiance / pmax))) / irradiance : 0;
  }

  desiccationRecovery(rate: number): number {
    const recovery = 1 - Math.exp(-rate * this._waterContent);
    for (const layer of this._layers.values()) {
      if (layer.type === 'photobiont') {
        layer.photosynthesisRate = layer.growthRate * recovery;
      }
    }
    return recovery;
  }

  osmoticPotential(): number {
    const layers = Array.from(this._layers.values());
    if (layers.length === 0) return 0;
    return layers.reduce((s, l) => s + l.osmoticPressure, 0) / layers.length;
  }

  report(): Record<string, unknown> {
    return {
      layers: this._layers.size,
      waterContent: this._waterContent,
      compositeGrowth: this.compositeGrowthRate(),
      wue: this.waterUseEfficiency(),
      state: this._state,
    };
  }
}

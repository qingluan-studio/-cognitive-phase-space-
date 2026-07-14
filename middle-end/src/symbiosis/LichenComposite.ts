/**
 * LichenComposite - 地衣复合体模块
 * 模拟藻类与真菌的结合体，二者不可分离，共同构成一个完整生命体，
 * 藻类提供光合产物，真菌提供结构与水分保持。
 */

export interface LichenCompositeData {
  readonly compositeId: string;
  photobiont: string;
  mycobiont: string;
  surfaceArea: number;
  moistureLevel: number;
  cohesionFactor: number;
}

export interface PhotosynthesisOutput {
  carbonFixed: number;
  oxygenReleased: number;
  carbohydrate: number;
}

export class LichenComposite {
  private _data: LichenCompositeData;
  private _lightExposure: number = 0;
  private _growthAccumulator: number = 0;
  private _desiccationRisk: number = 0;
  private _mineralStore: Record<string, number> = {};

  constructor(data: LichenCompositeData) {
    this._data = { ...data };
  }

  get compositeId(): string {
    return this._data.compositeId;
  }

  get components(): readonly [string, string] {
    return [this._data.photobiont, this._data.mycobiont];
  }

  get cohesion(): number {
    return this._data.cohesionFactor;
  }

  get moisture(): number {
    return this._data.moistureLevel;
  }

  public absorbLight(intensity: number, duration: number): PhotosynthesisOutput {
    this._lightExposure = intensity;
    const effective = intensity * duration * (this._data.moistureLevel / 100);
    const carbonFixed = effective * 0.45;
    const oxygenReleased = effective * 0.33;
    const carbohydrate = effective * 0.22;
    this._growthAccumulator += carbohydrate;
    return { carbonFixed, oxygenReleased, carbohydrate };
  }

  public absorbWater(amount: number): void {
    this._data.moistureLevel = Math.min(100, this._data.moistureLevel + amount);
    this._desiccationRisk = Math.max(0, this._desiccationRisk - amount * 0.5);
  }

  public retainMoisture(): number {
    const retained = this._data.moistureLevel * this._data.cohesionFactor * 0.1;
    this._data.moistureLevel = Math.max(0, this._data.moistureLevel - retained * 0.3);
    return retained;
  }

  public accumulateMineral(name: string, amount: number): void {
    this._mineralStore[name] = (this._mineralStore[name] ?? 0) + amount;
  }

  public grow(): number {
    if (this._growthAccumulator < 1) {
      return 0;
    }
    const growth = this._growthAccumulator * 0.05;
    this._data.surfaceArea += growth;
    this._growthAccumulator *= 0.5;
    return growth;
  }

  public endureDrought(): void {
    this._desiccationRisk = Math.min(1, this._desiccationRisk + 0.3);
    this._data.moistureLevel = Math.max(0, this._data.moistureLevel - 10);
    if (this._desiccationRisk > 0.7) {
      this._data.cohesionFactor = Math.max(0.1, this._data.cohesionFactor - 0.05);
    }
  }

  public canSeparate(): boolean {
    return this._data.cohesionFactor < 0.2;
  }

  public diagnose(): Record<string, unknown> {
    return {
      compositeId: this.compositeId,
      photobiont: this._data.photobiont,
      mycobiont: this._data.mycobiont,
      surfaceArea: this._data.surfaceArea.toFixed(2),
      moisture: this._data.moistureLevel.toFixed(1),
      cohesion: this._data.cohesionFactor.toFixed(3),
      desiccationRisk: this._desiccationRisk.toFixed(3),
      minerals: Object.keys(this._mineralStore).length,
      separable: this.canSeparate(),
    };
  }
}

/**
 * EdgeOfChaos - 混沌边缘
 * 秩序与混沌的分界线，系统在此时既保持足够结构产生模式，
 * 又有足够灵活性进行创新与适应，是涌现行为最丰富的区域。
 */

export interface EdgeOfChaosData {
  readonly edgeId: string;
  orderParameter: number;
  entropyLevel: number;
  complexityIndex: number;
}

export interface PhaseReading {
  order: number;
  entropy: number;
  region: 'ordered' | 'chaotic' | 'edge';
  timestamp: number;
}

export class EdgeOfChaos {
  private _data: EdgeOfChaosData;
  private _readings: PhaseReading[] = [];
  private _adaptationRate: number = 0.1;
  private _emergenceEvents: number = 0;
  private _stabilityWindow: number = 0;

  constructor(data: EdgeOfChaosData) {
    this._data = { ...data };
  }

  get edgeId(): string {
    return this._data.edgeId;
  }

  get complexityIndex(): number {
    return this._data.complexityIndex;
  }

  get currentRegion(): 'ordered' | 'chaotic' | 'edge' {
    return this._classifyRegion(this._data.orderParameter, this._data.entropyLevel);
  }

  private _classifyRegion(order: number, entropy: number): 'ordered' | 'chaotic' | 'edge' {
    const ratio = entropy / (order + 0.001);
    if (ratio < 0.3) {
      return 'ordered';
    }
    if (ratio > 3) {
      return 'chaotic';
    }
    return 'edge';
  }

  public takeReading(timestamp: number): PhaseReading {
    const region = this._classifyRegion(this._data.orderParameter, this._data.entropyLevel);
    const reading: PhaseReading = {
      order: this._data.orderParameter,
      entropy: this._data.entropyLevel,
      region,
      timestamp,
    };
    this._readings.push(reading);
    if (this._readings.length > 60) {
      this._readings.shift();
    }
    if (region === 'edge') {
      this._stabilityWindow++;
      if (this._stabilityWindow > 5) {
        this._emergenceEvents++;
        this._data.complexityIndex += 0.1;
      }
    } else {
      this._stabilityWindow = 0;
    }
    return reading;
  }

  public perturb(orderDelta: number, entropyDelta: number): void {
    this._data.orderParameter = Math.max(0, this._data.orderParameter + orderDelta);
    this._data.entropyLevel = Math.max(0, this._data.entropyLevel + entropyDelta);
  }

  public selfOrganize(): void {
    if (this.currentRegion === 'chaotic') {
      this._data.orderParameter += this._adaptationRate;
    } else if (this.currentRegion === 'ordered') {
      this._data.entropyLevel += this._adaptationRate;
    }
  }

  public tuneAdaptation(rate: number): void {
    this._adaptationRate = Math.max(0, Math.min(1, rate));
  }

  public detectEmergence(): boolean {
    const recent = this._readings.slice(-10);
    const edgeCount = recent.filter((r) => r.region === 'edge').length;
    return edgeCount >= 7;
  }

  public driftFromEdge(): number {
    if (this._readings.length === 0) {
      return 0;
    }
    const recent = this._readings[this._readings.length - 1];
    const idealRatio = 1.0;
    const actualRatio = recent.entropy / (recent.order + 0.001);
    return Math.abs(actualRatio - idealRatio);
  }

  public edgeReport(): Record<string, unknown> {
    return {
      edgeId: this.edgeId,
      orderParameter: this._data.orderParameter.toFixed(3),
      entropyLevel: this._data.entropyLevel.toFixed(3),
      complexityIndex: this._data.complexityIndex.toFixed(3),
      currentRegion: this.currentRegion,
      emergenceEvents: this._emergenceEvents,
      stabilityWindow: this._stabilityWindow,
      readingCount: this._readings.length,
      drift: this.driftFromEdge().toFixed(3),
    };
  }
}

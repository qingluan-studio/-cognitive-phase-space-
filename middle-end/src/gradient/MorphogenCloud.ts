/**
 * MorphogenCloud - 形态素云
 * 浓度梯度决定形态分化，模拟生物发育中形态素的空间分布
 * 如何指导不同区域分化为不同结构与功能。
 */

export interface MorphogenCloudData {
  readonly cloudId: string;
  sourcePosition: number;
  diffusionRate: number;
  decayRate: number;
  thresholdHigh: number;
  thresholdLow: number;
}

export interface MorphogenSample {
  position: number;
  concentration: number;
  fate: 'high' | 'medium' | 'low' | 'none';
}

export class MorphogenCloud {
  private _data: MorphogenCloudData;
  private _grid: Map<number, number> = new Map();
  private _gridSize: number = 100;
  private _sourceStrength: number = 100;
  private _fateMap: Map<number, string> = new Map();

  constructor(data: MorphogenCloudData) {
    this._data = { ...data };
    this._initializeGrid();
  }

  get cloudId(): string {
    return this._data.cloudId;
  }

  get sourcePosition(): number {
    return this._data.sourcePosition;
  }

  private _initializeGrid(): void {
    for (let i = 0; i < this._gridSize; i++) {
      this._grid.set(i, 0);
    }
  }

  public emit(amount: number): void {
    this._sourceStrength += amount;
    const current = this._grid.get(this._data.sourcePosition) ?? 0;
    this._grid.set(this._data.sourcePosition, current + amount);
  }

  public diffuse(): void {
    const newGrid = new Map<number, number>();
    for (let i = 0; i < this._gridSize; i++) {
      const current = this._grid.get(i) ?? 0;
      const left = this._grid.get(i - 1) ?? 0;
      const right = this._grid.get(i + 1) ?? 0;
      const diffused = current + this._data.diffusionRate * (left + right - 2 * current);
      const decayed = diffused * (1 - this._data.decayRate);
      newGrid.set(i, Math.max(0, decayed));
    }
    this._grid = newGrid;
  }

  public sample(position: number): MorphogenSample {
    const concentration = this._grid.get(position) ?? 0;
    let fate: 'high' | 'medium' | 'low' | 'none';
    if (concentration >= this._data.thresholdHigh) {
      fate = 'high';
    } else if (concentration >= this._data.thresholdLow) {
      fate = 'medium';
    } else if (concentration > 0) {
      fate = 'low';
    } else {
      fate = 'none';
    }
    return { position, concentration, fate };
  }

  public assignFates(): Map<number, string> {
    this._fateMap.clear();
    for (let i = 0; i < this._gridSize; i++) {
      const sample = this.sample(i);
      this._fateMap.set(i, sample.fate);
    }
    return new Map(this._fateMap);
  }

  public shiftSource(newPosition: number): void {
    this._data.sourcePosition = Math.max(0, Math.min(this._gridSize - 1, newPosition));
  }

  public adjustDiffusion(factor: number): void {
    this._data.diffusionRate = Math.max(0, Math.min(0.5, this._data.diffusionRate * factor));
  }

  public getBoundary(): { high: number; low: number } {
    let highBound = -1;
    let lowBound = -1;
    for (let i = 0; i < this._gridSize; i++) {
      const conc = this._grid.get(i) ?? 0;
      if (highBound === -1 && conc >= this._data.thresholdHigh) {
        highBound = i;
      }
      if (lowBound === -1 && conc >= this._data.thresholdLow) {
        lowBound = i;
        break;
      }
    }
    return { high: highBound, low: lowBound };
  }

  public clearCloud(): void {
    this._initializeGrid();
    this._fateMap.clear();
  }

  public cloudReport(): Record<string, unknown> {
    const concentrations = Array.from(this._grid.values());
    const total = concentrations.reduce((s, c) => s + c, 0);
    const max = Math.max(...concentrations);
    return {
      cloudId: this.cloudId,
      sourcePosition: this._data.sourcePosition,
      gridSize: this._gridSize,
      diffusionRate: this._data.diffusionRate.toFixed(3),
      decayRate: this._data.decayRate.toFixed(3),
      totalMorphogen: total.toFixed(2),
      maxConcentration: max.toFixed(2),
      sourceStrength: this._sourceStrength.toFixed(2),
      assignedFates: this._fateMap.size,
    };
  }
}

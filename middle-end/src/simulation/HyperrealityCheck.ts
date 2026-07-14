export interface HyperrealLayer {
  id: string;
  realness: number;
  simulationDepth: number;
  hyperreal: boolean;
}

export type HyperrealityIndex = {
  totalLayers: number;
  averageRealness: number;
  hyperrealCount: number;
};

export interface HyperrealityConfig {
  threshold: number;
  nestingLimit: number;
  decayRate: number;
}

export class HyperrealityCheck {
  private _config: HyperrealityConfig;
  private _layers: HyperrealLayer[] = [];
  private _index: HyperrealityIndex | null = null;
  private _state: Record<string, unknown> = {};
  private _semioticSquare: number[][] = [[1, 0], [0, 1]];
  private _simulationMatrix: number[][] = [];
  private _baudrillardCode: number = 0;

  constructor(config: HyperrealityConfig) {
    this._config = config;
  }

  get layerCount(): number {
    return this._layers.length;
  }

  get baudrillardCode(): number {
    return this._baudrillardCode;
  }

  private _updateSemioticSquare(): void {
    const n = this._layers.length;
    if (n < 2) return;
    const last = this._layers[n - 1];
    const prev = this._layers[n - 2];
    this._semioticSquare[0][0] = last.realness;
    this._semioticSquare[0][1] = 1 - last.realness;
    this._semioticSquare[1][0] = prev.realness;
    this._semioticSquare[1][1] = 1 - prev.realness;
  }

  private _updateSimulationMatrix(): void {
    const n = this._layers.length;
    this._simulationMatrix = [];
    for (let i = 0; i < n; i++) {
      const row: number[] = [];
      for (let j = 0; j < n; j++) {
        const diff = Math.abs(this._layers[i].realness - this._layers[j].realness);
        row.push(1 - diff);
      }
      this._simulationMatrix.push(row);
    }
  }

  addLayer(id: string, realness: number): HyperrealLayer {
    const simulationDepth = this._layers.length;
    const hyperreal = realness > this._config.threshold;
    const layer: HyperrealLayer = { id, realness, simulationDepth, hyperreal };
    this._layers.push(layer);
    if (this._layers.length > this._config.nestingLimit) {
      this._layers.shift();
    }
    this._updateSemioticSquare();
    this._updateSimulationMatrix();
    this._baudrillardCode = this._layers.reduce((acc, l) => acc + l.realness * Math.exp(-l.simulationDepth * this._config.decayRate), 0);
    return layer;
  }

  computeIndex(): HyperrealityIndex {
    const totalLayers = this._layers.length;
    const averageRealness = totalLayers > 0 ? this._layers.reduce((acc, l) => acc + l.realness, 0) / totalLayers : 0;
    const hyperrealCount = this._layers.filter((l) => l.hyperreal).length;
    this._index = { totalLayers, averageRealness, hyperrealCount };
    return this._index;
  }

  isHyperreal(): boolean {
    return this._layers.some((l) => l.hyperreal);
  }

  collapseLayer(id: string): boolean {
    const idx = this._layers.findIndex((l) => l.id === id);
    if (idx === -1) return false;
    this._layers.splice(idx, 1);
    this._updateSimulationMatrix();
    return true;
  }

  deepestLayer(): HyperrealLayer | null {
    return this._layers.reduce((best, l) => (l.simulationDepth > best.simulationDepth ? l : best));
  }

  computeEigenvalues(): number[] {
    if (this._simulationMatrix.length < 2) return [];
    const a = this._simulationMatrix[0][0];
    const b = this._simulationMatrix[0][1];
    const c = this._simulationMatrix[1][0];
    const d = this._simulationMatrix[1][1];
    const trace = a + d;
    const det = a * d - b * c;
    const discriminant = Math.sqrt(trace * trace - 4 * det);
    return [(trace + discriminant) / 2, (trace - discriminant) / 2];
  }

  traceSemiotic(): number {
    return this._semioticSquare[0][0] + this._semioticSquare[1][1];
  }

  reset(): void {
    this._layers = [];
    this._index = null;
    this._semioticSquare = [[1, 0], [0, 1]];
    this._simulationMatrix = [];
    this._baudrillardCode = 0;
    this._state = {};
  }

  report(): Record<string, unknown> {
    return {
      layers: this._layers.length,
      hyperreal: this.isHyperreal(),
      index: this._index,
      state: this._state,
      baudrillardCode: this._baudrillardCode.toFixed(4),
      traceSemiotic: this.traceSemiotic().toFixed(4),
    };
  }
}

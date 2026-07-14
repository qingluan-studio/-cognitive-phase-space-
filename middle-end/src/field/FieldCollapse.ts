export interface CollapseState {
  amplitude: number;
  probability: number;
  collapsed: boolean;
  outcome: string;
}

export type CollapseEvent = {
  timestamp: number;
  preState: CollapseState;
  postState: CollapseState;
  entropyDelta: number;
};

export interface CollapseConfig {
  decoherenceRate: number;
  basisCount: number;
  threshold: number;
}

export class FieldCollapse {
  private _config: CollapseConfig;
  private _states: CollapseState[] = [];
  private _events: CollapseEvent[] = [];
  private _meta: Record<string, unknown> = {};
  private _densityMatrix: number[][] = [];
  private _vonNeumannEntropy: number = 0;
  private _purity: number = 1;

  constructor(config: CollapseConfig) {
    this._config = config;
    this._initStates();
  }

  get stateCount(): number {
    return this._states.length;
  }

  get vonNeumannEntropy(): number {
    return this._vonNeumannEntropy;
  }

  get purity(): number {
    return this._purity;
  }

  private _initStates(): void {
    this._states = [];
    for (let i = 0; i < this._config.basisCount; i++) {
      this._states.push({
        amplitude: Math.sqrt(1 / this._config.basisCount),
        probability: 1 / this._config.basisCount,
        collapsed: false,
        outcome: `basis-${i}`,
      });
    }
    this._buildDensityMatrix();
  }

  private _buildDensityMatrix(): void {
    const n = this._states.length;
    this._densityMatrix = [];
    for (let i = 0; i < n; i++) {
      const row: number[] = [];
      for (let j = 0; j < n; j++) {
        const rhoIJ = this._states[i].amplitude * this._states[j].amplitude;
        row.push(rhoIJ);
      }
      this._densityMatrix.push(row);
    }
  }

  private _computeVonNeumannEntropy(): void {
    let entropy = 0;
    for (const s of this._states) {
      if (s.probability > 0) {
        entropy -= s.probability * Math.log2(s.probability);
      }
    }
    this._vonNeumannEntropy = entropy;
    let traceRho2 = 0;
    const n = this._densityMatrix.length;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        traceRho2 += this._densityMatrix[i][j] * this._densityMatrix[j][i];
      }
    }
    this._purity = traceRho2;
  }

  applyMeasurement(outcome: string): CollapseEvent {
    const preState = { ...this._states[0] };
    const entropyBefore = this._vonNeumannEntropy;
    let found = false;
    for (const s of this._states) {
      if (s.outcome === outcome) {
        s.probability = 1;
        s.collapsed = true;
        s.amplitude = 1;
        found = true;
      } else {
        s.probability = 0;
        s.collapsed = true;
        s.amplitude = 0;
      }
    }
    if (found) {
      this._buildDensityMatrix();
      this._computeVonNeumannEntropy();
    }
    const postState = { ...this._states[0] };
    const event: CollapseEvent = {
      timestamp: Date.now(),
      preState,
      postState,
      entropyDelta: entropyBefore - this._vonNeumannEntropy,
    };
    this._events.push(event);
    if (this._events.length > 30) this._events.shift();
    this._meta.lastMeasurement = outcome;
    return event;
  }

  decohere(dt: number): void {
    const rate = this._config.decoherenceRate;
    for (const s of this._states) {
      if (!s.collapsed) {
        s.amplitude *= Math.exp(-rate * dt);
        s.probability = s.amplitude * s.amplitude;
      }
    }
    const total = this._states.reduce((acc, s) => acc + s.probability, 0);
    if (total > 0) {
      for (const s of this._states) {
        s.probability /= total;
        s.amplitude = Math.sqrt(s.probability);
      }
    }
    this._buildDensityMatrix();
    this._computeVonNeumannEntropy();
    this._meta.lastDecoherence = dt;
  }

  isCollapsed(): boolean {
    return this._states.some((s) => s.collapsed);
  }

  dominantOutcome(): string | null {
    let best: CollapseState | null = null;
    for (const s of this._states) {
      if (!best || s.probability > best.probability) {
        best = s;
      }
    }
    return best ? best.outcome : null;
  }

  probabilityOf(outcome: string): number {
    const s = this._states.find((x) => x.outcome === outcome);
    return s ? s.probability : 0;
  }

  totalEvents(): number {
    return this._events.length;
  }

  reset(): void {
    this._initStates();
    this._events = [];
    this._meta = {};
  }

  report(): Record<string, unknown> {
    return {
      states: this._states.length,
      collapsed: this.isCollapsed(),
      dominant: this.dominantOutcome(),
      events: this._events.length,
      meta: this._meta,
      vonNeumannEntropy: this._vonNeumannEntropy.toFixed(4),
      purity: this._purity.toFixed(4),
    };
  }
}

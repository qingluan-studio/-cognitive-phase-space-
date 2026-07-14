export interface ClashComponent {
  id: string;
  intensity: number;
  polarity: number;
  amplified: boolean;
}

export type EnhancementResult = {
  totalClash: number;
  breakthrough: boolean;
  applied: number;
};

export interface ClashConfig {
  amplification: number;
  breakthroughThreshold: number;
  maxComponents: number;
}

export class ClashEnhancer {
  private _config: ClashConfig;
  private _components: ClashComponent[] = [];
  private _history: EnhancementResult[] = [];
  private _state: Record<string, unknown> = {};
  private _eigenvalues: number[] = [];
  private _couplingMatrix: number[][] = [];
  private _phaseDiagram: number[][] = [];

  constructor(config: ClashConfig) {
    this._config = config;
  }

  get componentCount(): number {
    return this._components.length;
  }

  get lastResult(): EnhancementResult | null {
    return this._history.length > 0 ? this._history[this._history.length - 1] : null;
  }

  get spectralGap(): number {
    return this._computeSpectralGap();
  }

  private _buildCouplingMatrix(): void {
    const n = this._components.length;
    this._couplingMatrix = [];
    for (let i = 0; i < n; i++) {
      const row: number[] = [];
      for (let j = 0; j < n; j++) {
        if (i === j) {
          row.push(this._components[i].intensity);
        } else {
          const dot = this._components[i].polarity * this._components[j].polarity;
          row.push(dot * Math.min(this._components[i].intensity, this._components[j].intensity) * 0.1);
        }
      }
      this._couplingMatrix.push(row);
    }
  }

  private _powerIteration(): number {
    const n = this._couplingMatrix.length;
    if (n === 0) return 0;
    let vec = new Array(n).fill(1 / n);
    for (let iter = 0; iter < 20; iter++) {
      const next = new Array(n).fill(0);
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          next[i] += this._couplingMatrix[i][j] * vec[j];
        }
      }
      const norm = Math.sqrt(next.reduce((s, v) => s + v * v, 0));
      vec = next.map((v) => v / (norm || 1));
    }
    let eigenvalue = 0;
    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (let j = 0; j < n; j++) {
        sum += this._couplingMatrix[i][j] * vec[j];
      }
      eigenvalue += sum * vec[i];
    }
    return eigenvalue;
  }

  private _computeSpectralGap(): number {
    this._buildCouplingMatrix();
    const dominant = this._powerIteration();
    return Math.abs(dominant);
  }

  private _updatePhaseDiagram(clash: number): void {
    const prev = this._phaseDiagram.length > 0 ? this._phaseDiagram[this._phaseDiagram.length - 1] : [0, 0];
    const x = prev[0] + clash * 0.01;
    const y = prev[1] + (Math.random() - 0.5) * clash * 0.005;
    this._phaseDiagram.push([x, y]);
    if (this._phaseDiagram.length > 100) {
      this._phaseDiagram.shift();
    }
  }

  addComponent(id: string, intensity: number, polarity: number): void {
    this._components.push({ id, intensity, polarity, amplified: false });
    if (this._components.length > this._config.maxComponents) {
      this._components.shift();
    }
  }

  totalClash(): number {
    let sum = 0;
    for (const c of this._components) {
      sum += c.intensity * Math.abs(c.polarity);
    }
    return sum;
  }

  enhance(): EnhancementResult {
    let applied = 0;
    for (const c of this._components) {
      if (!c.amplified) {
        c.intensity *= 1 + this._config.amplification;
        c.amplified = true;
        applied++;
      }
    }
    const totalClash = this.totalClash();
    const spectral = this._computeSpectralGap();
    const breakthrough = totalClash >= this._config.breakthroughThreshold || spectral > 2;
    const result: EnhancementResult = { totalClash, breakthrough, applied };
    this._history.push(result);
    if (this._history.length > 20) this._history.shift();
    this._updatePhaseDiagram(totalClash);
    this._state.lastEnhance = result;
    return result;
  }

  polarize(id: string, direction: number): boolean {
    const c = this._components.find((x) => x.id === id);
    if (!c) return false;
    c.polarity = Math.sign(direction) * Math.min(1, Math.abs(c.polarity) + 0.2);
    return true;
  }

  neutralize(id: string): boolean {
    const c = this._components.find((x) => x.id === id);
    if (!c) return false;
    c.intensity *= 0.5;
    c.amplified = false;
    return true;
  }

  dominantPolarity(): number {
    if (this._components.length === 0) return 0;
    const sum = this._components.reduce((acc, c) => acc + c.polarity * c.intensity, 0);
    return Math.sign(sum);
  }

  computeLyapunovExponent(): number {
    if (this._phaseDiagram.length < 2) return 0;
    let divergence = 0;
    for (let i = 1; i < this._phaseDiagram.length; i++) {
      const dx = this._phaseDiagram[i][0] - this._phaseDiagram[i - 1][0];
      const dy = this._phaseDiagram[i][1] - this._phaseDiagram[i - 1][1];
      divergence += Math.log(Math.sqrt(dx * dx + dy * dy) + 1);
    }
    return divergence / Math.max(1, this._phaseDiagram.length - 1);
  }

  reset(): void {
    this._components = [];
    this._history = [];
    this._state = {};
    this._phaseDiagram = [];
  }

  report(): Record<string, unknown> {
    return {
      components: this._components.length,
      totalClash: this.totalClash(),
      history: this._history.length,
      state: this._state,
      spectralGap: this.spectralGap.toFixed(4),
      lyapunovExponent: this.computeLyapunovExponent().toFixed(4),
    };
  }
}

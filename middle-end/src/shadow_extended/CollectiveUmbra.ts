export interface UmbraAgent {
  id: string;
  shadowIntensity: number;
  influenceRadius: number;
  position: { x: number; y: number };
}

export interface DarkField {
  position: { x: number; y: number };
  intensity: number;
  divergence: number;
  laplacian: number;
}

export class CollectiveUmbra {
  private _agents: Map<string, UmbraAgent> = new Map();
  private _field: DarkField[][] = [];
  private _state: Record<string, unknown> = {};
  private _resolution: number = 30;
  private _diffusionCoefficient: number = 0.05;
  private _collectiveUnconscious: number = 0;

  constructor(resolution: number = 30) {
    this._resolution = resolution;
    this._field = Array.from({ length: resolution }, (_, i) =>
      Array.from({ length: resolution }, (_, j) => ({
        position: { x: j, y: i },
        intensity: 0,
        divergence: 0,
        laplacian: 0,
      }))
    );
  }

  get agentCount(): number {
    return this._agents.size;
  }

  get fieldResolution(): number {
    return this._resolution;
  }

  addAgent(id: string, intensity: number, radius: number, x: number, y: number): void {
    this._agents.set(id, { id, shadowIntensity: intensity, influenceRadius: radius, position: { x, y } });
    this._projectShadow(id);
  }

  private _projectShadow(id: string): void {
    const agent = this._agents.get(id);
    if (!agent) return;
    const cx = Math.floor(agent.position.x);
    const cy = Math.floor(agent.position.y);
    for (let i = 0; i < this._resolution; i++) {
      for (let j = 0; j < this._resolution; j++) {
        const dx = j - cx;
        const dy = i - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < agent.influenceRadius) {
          const contribution = agent.shadowIntensity * Math.exp(-dist / agent.influenceRadius);
          this._field[i][j].intensity = Math.min(1, this._field[i][j].intensity + contribution);
        }
      }
    }
  }

  diffuse(steps: number): void {
    for (let s = 0; s < steps; s++) {
      const newField = this._field.map((row) => row.map((f) => ({ ...f })));
      for (let i = 1; i < this._resolution - 1; i++) {
        for (let j = 1; j < this._resolution - 1; j++) {
          const laplacian =
            this._field[i + 1][j].intensity +
            this._field[i - 1][j].intensity +
            this._field[i][j + 1].intensity +
            this._field[i][j - 1].intensity -
            4 * this._field[i][j].intensity;
          newField[i][j].intensity = Math.max(0, Math.min(1, this._field[i][j].intensity + this._diffusionCoefficient * laplacian));
          newField[i][j].laplacian = laplacian;
        }
      }
      this._field = newField;
    }
    this._computeDivergence();
    this._updateCollectiveUnconscious();
  }

  private _computeDivergence(): void {
    for (let i = 1; i < this._resolution - 1; i++) {
      for (let j = 1; j < this._resolution - 1; j++) {
        const dFx = this._field[i][j + 1].intensity - this._field[i][j - 1].intensity;
        const dFy = this._field[i + 1][j].intensity - this._field[i - 1][j].intensity;
        this._field[i][j].divergence = dFx + dFy;
      }
    }
  }

  private _updateCollectiveUnconscious(): void {
    let sum = 0;
    for (const row of this._field) {
      for (const f of row) sum += f.intensity;
    }
    this._collectiveUnconscious = sum / (this._resolution * this._resolution);
  }

  accumulateAt(x: number, y: number): number {
    const i = Math.floor(y);
    const j = Math.floor(x);
    if (i < 0 || i >= this._resolution || j < 0 || j >= this._resolution) return 0;
    return this._field[i][j].intensity;
  }

  convolveWithShadow(kernel: number[][]): number[][] {
    const kh = Math.floor(kernel.length / 2);
    const kw = Math.floor(kernel[0].length / 2);
    const result: number[][] = Array.from({ length: this._resolution }, () => Array(this._resolution).fill(0));
    for (let i = kh; i < this._resolution - kh; i++) {
      for (let j = kw; j < this._resolution - kw; j++) {
        let sum = 0;
        for (let ki = 0; ki < kernel.length; ki++) {
          for (let kj = 0; kj < kernel[0].length; kj++) {
            sum += this._field[i + ki - kh][j + kj - kw].intensity * kernel[ki][kj];
          }
        }
        result[i][j] = sum;
      }
    }
    return result;
  }

  darkestPoint(): { x: number; y: number; intensity: number } {
    let darkest = { x: 0, y: 0, intensity: 0 };
    for (let i = 0; i < this._resolution; i++) {
      for (let j = 0; j < this._resolution; j++) {
        if (this._field[i][j].intensity > darkest.intensity) {
          darkest = { x: j, y: i, intensity: this._field[i][j].intensity };
        }
      }
    }
    return darkest;
  }

  totalDarkness(): number {
    let sum = 0;
    for (const row of this._field) {
      for (const f of row) sum += f.intensity;
    }
    return sum;
  }

  report(): Record<string, unknown> {
    return {
      agents: this._agents.size,
      resolution: this._resolution,
      totalDarkness: this.totalDarkness(),
      collectiveUnconscious: this._collectiveUnconscious,
      state: this._state,
    };
  }
}

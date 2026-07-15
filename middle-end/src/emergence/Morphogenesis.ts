export interface MorphogenConcentration {
  activator: number[][];
  inhibitor: number[][];
}

export interface PatternMetrics {
  wavelength: number;
  amplitude: number;
  symmetry: number;
}

export class Morphogenesis {
  private _activator: number[][];
  private _inhibitor: number[][];
  private _rows: number;
  private _cols: number;
  private _diffusionA: number;
  private _diffusionI: number;
  private _productionRate: number;
  private _decayA: number;
  private _decayI: number;
  private _history: MorphogenConcentration[];
  private _time: number;

  constructor(rows: number, cols: number, diffusionA: number = 0.02, diffusionI: number = 0.5) {
    this._rows = rows;
    this._cols = cols;
    this._diffusionA = diffusionA;
    this._diffusionI = diffusionI;
    this._productionRate = 0.01;
    this._decayA = 0.01;
    this._decayI = 0.01;
    this._activator = Array.from({ length: rows }, () => new Array(cols).fill(0));
    this._inhibitor = Array.from({ length: rows }, () => new Array(cols).fill(0));
    this._history = [];
    this._time = 0;
  }

  get rows(): number { return this._rows; }
  get cols(): number { return this._cols; }
  get diffusionA(): number { return this._diffusionA; }
  get diffusionI(): number { return this._diffusionI; }
  get time(): number { return this._time; }

  public setParameters(diffA: number, diffI: number, prod: number, decayA: number, decayI: number): void {
    this._diffusionA = diffA;
    this._diffusionI = diffI;
    this._productionRate = prod;
    this._decayA = decayA;
    this._decayI = decayI;
  }

  public seedPerturbation(centerR: number, centerC: number, radius: number, strength: number = 1.0): void {
    for (let r = 0; r < this._rows; r++) {
      for (let c = 0; c < this._cols; c++) {
        const dist = Math.sqrt((r - centerR) ** 2 + (c - centerC) ** 2);
        if (dist < radius) {
          this._activator[r][c] = strength * (1 - dist / radius);
          this._inhibitor[r][c] = strength * 0.5 * (1 - dist / radius);
        }
      }
    }
  }

  public randomSeed(density: number = 0.05, strength: number = 1.0): void {
    for (let r = 0; r < this._rows; r++) {
      for (let c = 0; c < this._cols; c++) {
        if (Math.random() < density) {
          this._activator[r][c] = strength * Math.random();
          this._inhibitor[r][c] = strength * 0.5 * Math.random();
        }
      }
    }
  }

  private _laplacian(grid: number[][], r: number, c: number): number {
    const up = grid[(r - 1 + this._rows) % this._rows][c];
    const down = grid[(r + 1) % this._rows][c];
    const left = grid[r][(c - 1 + this._cols) % this._cols];
    const right = grid[r][(c + 1) % this._cols];
    return up + down + left + right - 4 * grid[r][c];
  }

  public step(dt: number = 1.0): void {
    const newA = Array.from({ length: this._rows }, () => new Array(this._cols).fill(0));
    const newI = Array.from({ length: this._rows }, () => new Array(this._cols).fill(0));
    for (let r = 0; r < this._rows; r++) {
      for (let c = 0; c < this._cols; c++) {
        const a = this._activator[r][c];
        const i = this._inhibitor[r][c];
        const reaction = this._productionRate * (a * a / (1 + i * i) - a);
        newA[r][c] = a + dt * (this._diffusionA * this._laplacian(this._activator, r, c) + reaction - this._decayA * a);
        newI[r][c] = i + dt * (this._diffusionI * this._laplacian(this._inhibitor, r, c) + this._productionRate * a * a - this._decayI * i);
        if (newA[r][c] < 0) newA[r][c] = 0;
        if (newI[r][c] < 0) newI[r][c] = 0;
      }
    }
    this._activator = newA;
    this._inhibitor = newI;
    this._time += dt;
    if (this._history.length < 500) {
      this._history.push({
        activator: newA.map(row => [...row]),
        inhibitor: newI.map(row => [...row])
      });
    }
  }

  public evolve(steps: number, dt: number = 1.0): void {
    for (let i = 0; i < steps; i++) {
      this.step(dt);
    }
  }

  public computePatternWavelength(): number {
    const profile = this._activator[Math.floor(this._rows / 2)];
    const peaks: number[] = [];
    for (let c = 1; c < profile.length - 1; c++) {
      if (profile[c] > profile[c - 1] && profile[c] > profile[c + 1] && profile[c] > 0.1) {
        peaks.push(c);
      }
    }
    if (peaks.length < 2) return this._cols;
    let sumDist = 0;
    for (let i = 1; i < peaks.length; i++) {
      sumDist += peaks[i] - peaks[i - 1];
    }
    return sumDist / (peaks.length - 1);
  }

  public computePatternAmplitude(): number {
    let minA = Infinity;
    let maxA = -Infinity;
    for (let r = 0; r < this._rows; r++) {
      for (let c = 0; c < this._cols; c++) {
        if (this._activator[r][c] < minA) minA = this._activator[r][c];
        if (this._activator[r][c] > maxA) maxA = this._activator[r][c];
      }
    }
    return maxA - minA;
  }

  public computeSymmetryScore(): number {
    const centerR = Math.floor(this._rows / 2);
    const centerC = Math.floor(this._cols / 2);
    let diff = 0;
    let total = 0;
    for (let r = 0; r < this._rows; r++) {
      for (let c = 0; c < this._cols; c++) {
        const mirrorR = (2 * centerR - r + this._rows) % this._rows;
        const mirrorC = (2 * centerC - c + this._cols) % this._cols;
        diff += Math.abs(this._activator[r][c] - this._activator[mirrorR][mirrorC]);
        total += this._activator[r][c];
      }
    }
    return total > 0 ? 1 - diff / (2 * total) : 1;
  }

  public computeTuringCondition(): boolean {
    const fA = this._diffusionA;
    const fI = this._diffusionI;
    const d = fI / fA;
    return d > (1 + Math.sqrt(2)) ** 2;
  }

  public computeGradientMagnitude(): number[][] {
    const grad = Array.from({ length: this._rows }, () => new Array(this._cols).fill(0));
    for (let r = 0; r < this._rows; r++) {
      for (let c = 0; c < this._cols; c++) {
        const dx = this._activator[r][(c + 1) % this._cols] - this._activator[r][(c - 1 + this._cols) % this._cols];
        const dy = this._activator[(r + 1) % this._rows][c] - this._activator[(r - 1 + this._rows) % this._rows][c];
        grad[r][c] = Math.sqrt(dx * dx + dy * dy);
      }
    }
    return grad;
  }

  public findSpotCenters(threshold: number = 0.5): { r: number; c: number; intensity: number }[] {
    const spots: { r: number; c: number; intensity: number }[] = [];
    for (let r = 1; r < this._rows - 1; r++) {
      for (let c = 1; c < this._cols - 1; c++) {
        if (this._activator[r][c] > threshold) {
          let isPeak = true;
          for (let dr = -1; dr <= 1 && isPeak; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              if (dr === 0 && dc === 0) continue;
              if (this._activator[r + dr][c + dc] > this._activator[r][c]) {
                isPeak = false;
                break;
              }
            }
          }
          if (isPeak) {
            spots.push({ r, c, intensity: this._activator[r][c] });
          }
        }
      }
    }
    return spots;
  }

  public computePatternEntropy(): number {
    const hist = new Map<number, number>();
    const bins = 20;
    const maxVal = Math.max(...this._activator.flat(), 0.001);
    for (let r = 0; r < this._rows; r++) {
      for (let c = 0; c < this._cols; c++) {
        const bin = Math.min(Math.floor((this._activator[r][c] / maxVal) * bins), bins - 1);
        hist.set(bin, (hist.get(bin) || 0) + 1);
      }
    }
    const total = this._rows * this._cols;
    let entropy = 0;
    for (const count of hist.values()) {
      const p = count / total;
      entropy -= p * Math.log2(p);
    }
    return entropy;
  }

  public simulatePatternEvolution(diffusionRatios: number[], stepsPerRatio: number = 500): PatternMetrics[] {
    const results: PatternMetrics[] = [];
    for (const ratio of diffusionRatios) {
      this._diffusionI = this._diffusionA * ratio;
      this._activator = Array.from({ length: this._rows }, () => new Array(this._cols).fill(0));
      this._inhibitor = Array.from({ length: this._rows }, () => new Array(this._cols).fill(0));
      this.randomSeed(0.05, 0.5);
      this.evolve(stepsPerRatio);
      results.push({
        wavelength: this.computePatternWavelength(),
        amplitude: this.computePatternAmplitude(),
        symmetry: this.computeSymmetryScore()
      });
    }
    return results;
  }

  public reset(): void {
    this._activator = Array.from({ length: this._rows }, () => new Array(this._cols).fill(0));
    this._inhibitor = Array.from({ length: this._rows }, () => new Array(this._cols).fill(0));
    this._history = [];
    this._time = 0;
  }

  public exportState(): MorphogenConcentration {
    return {
      activator: this._activator.map(row => [...row]),
      inhibitor: this._inhibitor.map(row => [...row])
    };
  }

  public exportHistory(): MorphogenConcentration[] {
    return this._history.map(h => ({
      activator: h.activator.map(row => [...row]),
      inhibitor: h.inhibitor.map(row => [...row])
    }));
  }
}

export interface SpinState {
  spins: number[][];
  temperature: number;
  magnetization: number;
  energy: number;
}

export class PhaseTransition {
  private _spins: number[][];
  private _rows: number;
  private _cols: number;
  private _temperature: number;
  private _coupling: number;
  private _field: number;
  private _history: SpinState[];
  private _sweeps: number;

  constructor(rows: number, cols: number, temperature: number = 2.27, coupling: number = 1.0) {
    this._rows = rows;
    this._cols = cols;
    this._temperature = temperature;
    this._coupling = coupling;
    this._field = 0.0;
    this._spins = Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => Math.random() < 0.5 ? 1 : -1)
    );
    this._history = [];
    this._sweeps = 0;
  }

  get rows(): number { return this._rows; }
  get cols(): number { return this._cols; }
  get temperature(): number { return this._temperature; }
  get coupling(): number { return this._coupling; }
  get sweeps(): number { return this._sweeps; }
  get currentSpins(): number[][] { return this._spins.map(row => [...row]); }

  public setTemperature(t: number): void {
    this._temperature = t;
  }

  public setField(h: number): void {
    this._field = h;
  }

  private _neighborSum(r: number, c: number): number {
    const up = this._spins[(r - 1 + this._rows) % this._rows][c];
    const down = this._spins[(r + 1) % this._rows][c];
    const left = this._spins[r][(c - 1 + this._cols) % this._cols];
    const right = this._spins[r][(c + 1) % this._cols];
    return up + down + left + right;
  }

  public computeEnergy(): number {
    let energy = 0;
    for (let r = 0; r < this._rows; r++) {
      for (let c = 0; c < this._cols; c++) {
        energy -= this._coupling * this._spins[r][c] * this._neighborSum(r, c) / 2;
        energy -= this._field * this._spins[r][c];
      }
    }
    return energy;
  }

  public computeMagnetization(): number {
    let sum = 0;
    for (let r = 0; r < this._rows; r++) {
      for (let c = 0; c < this._cols; c++) {
        sum += this._spins[r][c];
      }
    }
    return sum / (this._rows * this._cols);
  }

  public computeSusceptibility(): number {
    const m = this.computeMagnetization();
    let m2 = 0;
    for (let r = 0; r < this._rows; r++) {
      for (let c = 0; c < this._cols; c++) {
        m2 += this._spins[r][c] ** 2;
      }
    }
    m2 /= this._rows * this._cols;
    return (m2 - m * m) / this._temperature;
  }

  public computeSpecificHeat(): number {
    const e = this.computeEnergy();
    let e2 = 0;
    for (let r = 0; r < this._rows; r++) {
      for (let c = 0; c < this._cols; c++) {
        const localE = -this._coupling * this._spins[r][c] * this._neighborSum(r, c) - this._field * this._spins[r][c];
        e2 += localE * localE;
      }
    }
    e2 /= this._rows * this._cols;
    const meanE = e / (this._rows * this._cols);
    return (e2 - meanE * meanE) / (this._temperature * this._temperature);
  }

  public monteCarloSweep(): void {
    for (let i = 0; i < this._rows * this._cols; i++) {
      const r = Math.floor(Math.random() * this._rows);
      const c = Math.floor(Math.random() * this._cols);
      const s = this._spins[r][c];
      const dE = 2 * s * (this._coupling * this._neighborSum(r, c) + this._field);
      if (dE < 0 || Math.random() < Math.exp(-dE / this._temperature)) {
        this._spins[r][c] = -s;
      }
    }
    this._sweeps++;
    this._recordState();
  }

  public thermalize(sweeps: number): void {
    for (let i = 0; i < sweeps; i++) {
      this.monteCarloSweep();
    }
  }

  public simulateTemperatureRange(temps: number[], thermalSweeps: number = 100, measureSweeps: number = 100): { temperature: number; magnetization: number; susceptibility: number; specificHeat: number }[] {
    const results: { temperature: number; magnetization: number; susceptibility: number; specificHeat: number }[] = [];
    for (const t of temps) {
      this._temperature = t;
      this._spins = Array.from({ length: this._rows }, () =>
        Array.from({ length: this._cols }, () => Math.random() < 0.5 ? 1 : -1)
      );
      this.thermalize(thermalSweeps);
      let mSum = 0;
      let m2Sum = 0;
      let eSum = 0;
      let e2Sum = 0;
      for (let i = 0; i < measureSweeps; i++) {
        this.monteCarloSweep();
        const m = this.computeMagnetization();
        const e = this.computeEnergy() / (this._rows * this._cols);
        mSum += Math.abs(m);
        m2Sum += m * m;
        eSum += e;
        e2Sum += e * e;
      }
      const n = this._rows * this._cols;
      results.push({
        temperature: t,
        magnetization: mSum / measureSweeps,
        susceptibility: (m2Sum / measureSweeps - (mSum / measureSweeps) ** 2) * n / t,
        specificHeat: (e2Sum / measureSweeps - (eSum / measureSweeps) ** 2) * n / (t * t)
      });
    }
    return results;
  }

  public findCriticalTemperature(): number {
    const temps = [];
    for (let t = 1.5; t <= 3.5; t += 0.05) temps.push(t);
    const results = this.simulateTemperatureRange(temps, 50, 50);
    let maxChi = 0;
    let tc = 2.27;
    for (const r of results) {
      if (r.susceptibility > maxChi) {
        maxChi = r.susceptibility;
        tc = r.temperature;
      }
    }
    return tc;
  }

  public computeCorrelationLength(): number {
    const centerR = Math.floor(this._rows / 2);
    const centerC = Math.floor(this._cols / 2);
    const centerSpin = this._spins[centerR][centerC];
    const correlations: number[] = [];
    const maxDist = Math.min(this._rows, this._cols) / 2;
    for (let d = 1; d < maxDist; d++) {
      let sum = 0;
      let count = 0;
      for (let r = 0; r < this._rows; r++) {
        for (let c = 0; c < this._cols; c++) {
          const dist = Math.sqrt((r - centerR) ** 2 + (c - centerC) ** 2);
          if (Math.abs(dist - d) < 0.5) {
            sum += centerSpin * this._spins[r][c];
            count++;
          }
        }
      }
      correlations.push(count > 0 ? sum / count : 0);
    }
    for (let i = 0; i < correlations.length; i++) {
      if (Math.abs(correlations[i]) < 0.1) return i;
    }
    return maxDist;
  }

  public computeDomainWallDensity(): number {
    let walls = 0;
    for (let r = 0; r < this._rows; r++) {
      for (let c = 0; c < this._cols; c++) {
        const right = this._spins[r][(c + 1) % this._cols];
        const down = this._spins[(r + 1) % this._rows][c];
        if (this._spins[r][c] !== right) walls++;
        if (this._spins[r][c] !== down) walls++;
      }
    }
    return walls / (2 * this._rows * this._cols);
  }

  public computeBinderCumulant(): number {
    const m = this.computeMagnetization();
    let m4 = 0;
    for (let r = 0; r < this._rows; r++) {
      for (let c = 0; c < this._cols; c++) {
        m4 += this._spins[r][c] ** 4;
      }
    }
    m4 /= this._rows * this._cols;
    let m2 = 0;
    for (let r = 0; r < this._rows; r++) {
      for (let c = 0; c < this._cols; c++) {
        m2 += this._spins[r][c] ** 2;
      }
    }
    m2 /= this._rows * this._cols;
    return 1 - m4 / (3 * m2 * m2);
  }

  private _recordState(): void {
    this._history.push({
      spins: this._spins.map(row => [...row]),
      temperature: this._temperature,
      magnetization: this.computeMagnetization(),
      energy: this.computeEnergy()
    });
    if (this._history.length > 500) this._history.shift();
  }

  public reset(): void {
    this._spins = Array.from({ length: this._rows }, () =>
      Array.from({ length: this._cols }, () => Math.random() < 0.5 ? 1 : -1)
    );
    this._history = [];
    this._sweeps = 0;
  }

  public exportSpins(): number[][] {
    return this._spins.map(row => [...row]);
  }

  public exportHistory(): SpinState[] {
    return this._history.map(h => ({
      spins: h.spins.map(row => [...row]),
      temperature: h.temperature,
      magnetization: h.magnetization,
      energy: h.energy
    }));
  }
}

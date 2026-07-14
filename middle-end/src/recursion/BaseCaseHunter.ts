export interface BaseCaseHunterData {
  baseCases: number[];
  probed: number;
  converged: boolean;
}

export class BaseCaseHunter {
  private _baseCases: Set<number>;
  private _probed: number;
  private _converged: boolean;
  private _maxProbe: number;
  private _convergenceSeries: number[];
  private _inductionDepth: number;
  private _fixpointCandidates: number[];
  private _probeEntropy: number;

  constructor(maxProbe: number = 100) {
    this._baseCases = new Set<number>();
    this._probed = 0;
    this._converged = false;
    this._maxProbe = maxProbe;
    this._convergenceSeries = [];
    this._inductionDepth = 0;
    this._fixpointCandidates = [];
    this._probeEntropy = 0;
  }

  get baseCases(): number[] {
    return Array.from(this._baseCases).sort((a, b) => a - b);
  }

  get probedCount(): number {
    return this._probed;
  }

  get inductionDepth(): number {
    return this._inductionDepth;
  }

  get probeEntropy(): number {
    return this._probeEntropy;
  }

  public hunt(n: number): number {
    this._probed += 1;
    if (this._probed > this._maxProbe) {
      this._converged = false;
      this._updateProbeEntropy();
      return n;
    }
    if (n <= 1) {
      this._baseCases.add(n);
      this._converged = true;
      this._inductionDepth = Math.max(this._inductionDepth, 1);
      this._updateConvergenceSeries(n);
      this._updateProbeEntropy();
      return n;
    }
    const sub = this.hunt(Math.floor(n / 2));
    this._baseCases.add(sub);
    this._inductionDepth += 1;
    this._updateConvergenceSeries(sub);
    this._updateProbeEntropy();
    return sub;
  }

  public isBaseCase(n: number): boolean {
    return this._baseCases.has(n);
  }

  public addBaseCase(n: number): void {
    this._baseCases.add(n);
    this._updateProbeEntropy();
  }

  public reset(): void {
    this._baseCases.clear();
    this._probed = 0;
    this._converged = false;
    this._convergenceSeries = [];
    this._inductionDepth = 0;
    this._fixpointCandidates = [];
    this._probeEntropy = 0;
  }

  public setMaxProbe(m: number): void {
    this._maxProbe = Math.max(1, m);
  }

  public report(): BaseCaseHunterData {
    return {
      baseCases: this.baseCases,
      probed: this._probed,
      converged: this._converged,
    };
  }

  public findFixpoint(f: (x: number) => number, domain: number[]): number[] {
    const fixpoints: number[] = [];
    for (const x of domain) {
      if (Math.abs(f(x) - x) < 1e-6) {
        fixpoints.push(x);
      }
    }
    this._fixpointCandidates = fixpoints;
    return fixpoints;
  }

  public proveConvergence(sequence: number[]): boolean {
    if (sequence.length < 2) {
      return false;
    }
    let monotonic = true;
    let bounded = true;
    const firstDiff = sequence[1] - sequence[0];
    for (let i = 1; i < sequence.length; i++) {
      const diff = sequence[i] - sequence[i - 1];
      if (firstDiff > 0 && diff < 0) {
        monotonic = false;
      }
      if (firstDiff < 0 && diff > 0) {
        monotonic = false;
      }
      if (Math.abs(sequence[i]) > Math.abs(sequence[0]) * 10) {
        bounded = false;
      }
    }
    this._converged = monotonic || bounded;
    return this._converged;
  }

  public computeLimit(sequence: number[]): number | null {
    if (sequence.length < 3) {
      return null;
    }
    const diffs: number[] = [];
    for (let i = 1; i < sequence.length; i++) {
      diffs.push(Math.abs(sequence[i] - sequence[i - 1]));
    }
    const meanDiff = diffs.reduce((s, v) => s + v, 0) / diffs.length;
    if (meanDiff < 1e-6) {
      return sequence[sequence.length - 1];
    }
    const last = sequence[sequence.length - 1];
    const prev = sequence[sequence.length - 2];
    const ratio = (last - prev) / (prev - sequence[sequence.length - 3]);
    if (Math.abs(ratio) < 1) {
      return last + (last - prev) * ratio / (1 - ratio);
    }
    return null;
  }

  public generateInductionHypothesis(k: number): (n: number) => boolean {
    return (n: number) => {
      return this._baseCases.has(n) || (n >= k && this._baseCases.has(n - k));
    };
  }

  private _updateConvergenceSeries(value: number): void {
    this._convergenceSeries.push(value);
    if (this._convergenceSeries.length > 100) {
      this._convergenceSeries.shift();
    }
  }

  private _updateProbeEntropy(): void {
    if (this._baseCases.size === 0) {
      this._probeEntropy = 0;
      return;
    }
    const values = Array.from(this._baseCases);
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
    this._probeEntropy = variance > 0 ? 0.5 * Math.log2(2 * Math.PI * Math.E * variance) : 0;
  }
}

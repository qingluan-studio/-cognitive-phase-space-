export interface BarrierPoint {
  position: number;
  strength: number;
  permeability: number;
  stress: number;
}

export interface CollapseThreshold {
  stressLimit: number;
  permeabilityLimit: number;
  hysteresisWidth: number;
}

export class BarrierCollapse {
  private _points: BarrierPoint[] = [];
  private _threshold: CollapseThreshold;
  private _collapsed: boolean = false;
  private _collapseHistory: number[] = [];
  private _state: Record<string, unknown> = {};
  private _percolationProbability: number = 0;
  private _hysteresisState: number = 0;

  constructor(threshold: CollapseThreshold, resolution: number = 100) {
    this._threshold = { ...threshold };
    for (let i = 0; i < resolution; i++) {
      this._points.push({
        position: i,
        strength: 1 - i / resolution,
        permeability: i / resolution,
        stress: 0,
      });
    }
  }

  get pointCount(): number {
    return this._points.length;
  }

  get collapsed(): boolean {
    return this._collapsed;
  }

  get percolationProbability(): number {
    return this._percolationProbability;
  }

  applyStress(position: number, magnitude: number): void {
    const idx = Math.floor(position);
    if (idx < 0 || idx >= this._points.length) return;
    this._points[idx].stress += magnitude;
    this._propagateStress(idx, magnitude * 0.3);
    this._checkCollapse();
    this._updatePercolation();
  }

  private _propagateStress(origin: number, magnitude: number): void {
    for (let i = 0; i < this._points.length; i++) {
      const distance = Math.abs(i - origin);
      const decay = magnitude * Math.exp(-distance * 0.1);
      this._points[i].stress += decay;
    }
  }

  private _checkCollapse(): void {
    const avgStress = this._points.reduce((s, p) => s + p.stress, 0) / this._points.length;
    const avgPerm = this._points.reduce((s, p) => s + p.permeability, 0) / this._points.length;
    if (!this._collapsed && avgStress > this._threshold.stressLimit && avgPerm > this._threshold.permeabilityLimit) {
      this._collapsed = true;
      this._collapseHistory.push(Date.now());
      this._hysteresisState = 1;
    } else if (this._collapsed && avgStress < this._threshold.stressLimit - this._threshold.hysteresisWidth) {
      this._collapsed = false;
      this._hysteresisState = 0;
    }
  }

  private _updatePercolation(): void {
    const occupied = this._points.filter((p) => p.permeability > 0.5).length;
    this._percolationProbability = occupied / (this._points.length || 1);
  }

  calculateBreakthroughProbability(): number {
    let product = 1;
    for (const p of this._points) {
      product *= 1 - p.permeability;
    }
    return 1 - Math.pow(product, 1 / (this._points.length || 1));
  }

  getStressDistribution(): { mean: number; variance: number; max: number } {
    const stresses = this._points.map((p) => p.stress);
    const mean = stresses.reduce((s, v) => s + v, 0) / stresses.length;
    const variance = stresses.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / stresses.length;
    const max = Math.max(...stresses);
    return { mean, variance, max };
  }

  strengthenBarrier(position: number, amount: number): void {
    const idx = Math.floor(position);
    if (idx >= 0 && idx < this._points.length) {
      this._points[idx].strength = Math.min(1, this._points[idx].strength + amount);
      this._points[idx].permeability = Math.max(0, this._points[idx].permeability - amount * 0.5);
    }
    this._updatePercolation();
  }

  phaseTransitionCurve(): { stress: number[]; permeability: number[] } {
    const stress: number[] = [];
    const permeability: number[] = [];
    for (let s = 0; s <= 1; s += 0.05) {
      stress.push(s);
      const p = s > this._threshold.stressLimit ? Math.min(1, (s - this._threshold.stressLimit) * 5) : 0;
      permeability.push(p);
    }
    return { stress, permeability };
  }

  reset(): void {
    this._points.forEach((p) => {
      p.stress = 0;
      p.strength = 1 - p.position / this._points.length;
      p.permeability = p.position / this._points.length;
    });
    this._collapsed = false;
    this._hysteresisState = 0;
    this._state.resetAt = Date.now();
  }

  report(): Record<string, unknown> {
    return {
      points: this._points.length,
      collapsed: this._collapsed,
      collapseCount: this._collapseHistory.length,
      percolation: this._percolationProbability,
      hysteresis: this._hysteresisState,
      state: this._state,
    };
  }
}

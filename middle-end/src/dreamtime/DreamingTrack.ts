export interface DreamStep {
  id: string;
  position: { x: number; y: number };
  action: string;
  timestamp: number;
}

export interface RealityShift {
  dreamPathId: string;
  field: string;
  delta: number;
  appliedAt: number;
}

export class DreamingTrack {
  private _paths: Map<string, DreamStep[]> = new Map();
  private _shifts: RealityShift[] = [];
  private _realityState: Map<string, number> = new Map();
  private _conversionRate = 0.1;
  private _laplacianMatrix: Map<string, number> = new Map();
  private _harmonicField: Map<string, number> = new Map();

  startPath(id: string): void {
    this._paths.set(id, []);
  }

  step(pathId: string, step: Omit<DreamStep, 'id' | 'timestamp'>): DreamStep | null {
    const path = this._paths.get(pathId);
    if (!path) return null;
    const fullStep: DreamStep = {
      id: `step-${pathId}-${path.length}`,
      timestamp: Date.now(),
      ...step,
    };
    path.push(fullStep);
    return fullStep;
  }

  wakeAndApply(pathId: string): RealityShift[] {
    const path = this._paths.get(pathId);
    if (!path) return [];
    const shifts: RealityShift[] = [];
    for (const step of path) {
      const field = `field-${Math.floor(step.position.x)}-${Math.floor(step.position.y)}`;
      const current = this._realityState.get(field) ?? 0;
      const delta = step.action.length * this._conversionRate;
      this._realityState.set(field, current + delta);
      shifts.push({
        dreamPathId: pathId,
        field,
        delta,
        appliedAt: Date.now(),
      });
    }
    this._shifts.push(...shifts);
    if (this._shifts.length > 500) this._shifts.splice(0, this._shifts.length - 500);
    this._updateLaplacian();
    return shifts;
  }

  setConversionRate(value: number): void {
    this._conversionRate = Math.max(0, value);
  }

  getRealityValue(field: string): number {
    return this._realityState.get(field) ?? 0;
  }

  getPath(pathId: string): DreamStep[] | null {
    const path = this._paths.get(pathId);
    return path ? [...path] : null;
  }

  getShifts(limit: number = 50): RealityShift[] {
    return this._shifts.slice(-limit);
  }

  get pathCount(): number {
    return this._paths.size;
  }

  computeRealitySpectrum(): number[] {
    const values = Array.from(this._realityState.values());
    const N = values.length;
    if (N === 0) return [];
    const result: number[] = new Array(N).fill(0);
    for (let k = 0; k < N; k++) {
      let real = 0;
      let imag = 0;
      for (let n = 0; n < N; n++) {
        const angle = -2 * Math.PI * k * n / N;
        real += values[n] * Math.cos(angle);
        imag += values[n] * Math.sin(angle);
      }
      result[k] = Math.sqrt(real * real + imag * imag);
    }
    return result;
  }

  computeHarmonicFunction(): Map<string, number> {
    this._harmonicField.clear();
    for (const [field, value] of this._realityState) {
      const neighbors = this._getNeighbors(field);
      const avg = neighbors.reduce((s, n) => s + (this._realityState.get(n) ?? 0), 0) / Math.max(1, neighbors.length);
      this._harmonicField.set(field, (value + avg) / 2);
    }
    return new Map(this._harmonicField);
  }

  computePathFractalDimension(pathId: string): number {
    const path = this._paths.get(pathId);
    if (!path || path.length === 0) return 0;
    const uniquePositions = new Set(path.map(s => `${s.position.x},${s.position.y}`));
    const r = Math.sqrt(uniquePositions.size);
    return r > 0 ? Math.log(uniquePositions.size) / Math.log(r + 1) : 0;
  }

  private _updateLaplacian(): void {
    this._laplacianMatrix.clear();
    for (const [field, value] of this._realityState) {
      const neighbors = this._getNeighbors(field);
      const avg = neighbors.reduce((s, n) => s + (this._realityState.get(n) ?? 0), 0) / Math.max(1, neighbors.length);
      this._laplacianMatrix.set(field, value - avg);
    }
  }

  private _getNeighbors(field: string): string[] {
    const match = field.match(/field-(-?\d+)-(-?\d+)/);
    if (!match) return [];
    const x = parseInt(match[1], 10);
    const y = parseInt(match[2], 10);
    return [
      `field-${x + 1}-${y}`,
      `field-${x - 1}-${y}`,
      `field-${x}-${y + 1}`,
      `field-${x}-${y - 1}`,
    ];
  }
}

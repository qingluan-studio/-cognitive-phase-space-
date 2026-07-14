export interface BoundaryViolation {
  id: number;
  boundary: string;
  violatedValue: number;
  originalLimit: number;
  timestamp: number;
  severity: number;
}

export interface BoundaryDefinition {
  name: string;
  limit: number;
  hardness: 'hard' | 'soft';
  gradientFunction: (x: number) => number;
}

export class LimitTransgressor {
  private _violations: BoundaryViolation[] = [];
  private _nextId: number = 0;
  private _boundaries: Map<string, BoundaryDefinition> = new Map();
  private _state: Record<string, unknown> = {};
  private _kktMultipliers: Map<string, number> = new Map();
  private _violationEntropy: number = 0;
  private _gradientHistory: number[] = [];

  constructor() {
    this._state.initializedAt = Date.now();
  }

  get violationCount(): number {
    return this._violations.length;
  }

  get boundaryCount(): number {
    return this._boundaries.size;
  }

  get violationEntropy(): number {
    return this._violationEntropy;
  }

  defineBoundary(name: string, limit: number, hardness: 'hard' | 'soft', gradientFunction: (x: number) => number): void {
    this._boundaries.set(name, { name, limit, hardness, gradientFunction });
    this._kktMultipliers.set(name, 0);
  }

  assess(value: number, boundaryName: string): BoundaryViolation | null {
    const boundary = this._boundaries.get(boundaryName);
    if (!boundary) return null;
    const diff = value - boundary.limit;
    if (diff <= 0) {
      this._kktMultipliers.set(boundaryName, 0);
      return null;
    }
    const severity = boundary.gradientFunction(value) * diff;
    const violation: BoundaryViolation = {
      id: this._nextId++,
      boundary: boundaryName,
      violatedValue: value,
      originalLimit: boundary.limit,
      timestamp: Date.now(),
      severity,
    };
    this._violations.push(violation);
    if (this._violations.length > 200) this._violations.shift();
    const multiplier = Math.max(0, this._kktMultipliers.get(boundaryName) ?? 0);
    this._kktMultipliers.set(boundaryName, multiplier + severity * 0.1);
    this._gradientHistory.push(boundary.gradientFunction(value));
    if (this._gradientHistory.length > 100) this._gradientHistory.shift();
    this._updateViolationEntropy();
    return violation;
  }

  private _updateViolationEntropy(): void {
    const counts: Record<string, number> = {};
    for (const v of this._violations) {
      counts[v.boundary] = (counts[v.boundary] ?? 0) + 1;
    }
    const total = this._violations.length;
    let entropy = 0;
    for (const count of Object.values(counts)) {
      const p = count / total;
      entropy -= p * Math.log2(p);
    }
    this._violationEntropy = entropy;
  }

  computeLagrangian(boundaryName: string, value: number): number {
    const boundary = this._boundaries.get(boundaryName);
    if (!boundary) return 0;
    const f = value * value;
    const g = value - boundary.limit;
    const lambda = this._kktMultipliers.get(boundaryName) ?? 0;
    return f + lambda * g;
  }

  gradientAscentStep(boundaryName: string, currentValue: number, stepSize: number): number {
    const boundary = this._boundaries.get(boundaryName);
    if (!boundary) return currentValue;
    return currentValue + stepSize * boundary.gradientFunction(currentValue);
  }

  checkComplementarySlackness(boundaryName: string): boolean {
    const boundary = this._boundaries.get(boundaryName);
    if (!boundary) return false;
    const lambda = this._kktMultipliers.get(boundaryName) ?? 0;
    const slack = Math.max(0, 0);
    return Math.abs(lambda * slack) < 1e-6;
  }

  isLimitViolated(boundaryName: string): boolean {
    return this._violations.some(v => v.boundary === boundaryName);
  }

  getViolationsForBoundary(boundaryName: string): BoundaryViolation[] {
    return this._violations.filter(v => v.boundary === boundaryName);
  }

  mostSevereViolation(): BoundaryViolation | null {
    if (this._violations.length === 0) return null;
    return this._violations.reduce((worst, v) => (v.severity > worst.severity ? v : worst));
  }

  averageSeverity(): number {
    if (this._violations.length === 0) return 0;
    return this._violations.reduce((acc, v) => acc + v.severity, 0) / this._violations.length;
  }

  getRecentViolations(limit: number = 50): BoundaryViolation[] {
    return this._violations.slice(-limit);
  }

  getGradientMean(): number {
    if (this._gradientHistory.length === 0) return 0;
    return this._gradientHistory.reduce((a, b) => a + b, 0) / this._gradientHistory.length;
  }

  resetBoundary(boundaryName: string): void {
    this._kktMultipliers.set(boundaryName, 0);
    this._violations = this._violations.filter(v => v.boundary !== boundaryName);
    this._updateViolationEntropy();
  }

  clearAll(): void {
    this._violations = [];
    this._nextId = 0;
    this._kktMultipliers.clear();
    this._gradientHistory = [];
    this._violationEntropy = 0;
  }

  transgressorReport(): Record<string, unknown> {
    return {
      violationCount: this._violations.length,
      boundaryCount: this._boundaries.size,
      state: this._state,
      violationEntropy: this._violationEntropy.toFixed(4),
      averageSeverity: this.averageSeverity().toFixed(3),
      gradientMean: this.getGradientMean().toFixed(4),
      kktMultipliers: Object.fromEntries(this._kktMultipliers),
    };
  }
}

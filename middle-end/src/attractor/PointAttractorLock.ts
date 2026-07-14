export interface PointAttractorLockData {
  readonly lockId: string;
  attractorPoint: number;
  pullStrength: number;
  dampingFactor: number;
}

export interface ConvergenceStep {
  position: number;
  distance: number;
  step: number;
  locked: boolean;
}

export class PointAttractorLock {
  private _data: PointAttractorLockData;
  private _currentPosition: number;
  private _steps: ConvergenceStep[] = [];
  private _locked: boolean = false;
  private _lockThreshold: number = 0.01;
  private _lyapunovExponent: number = 0;
  private _basinRadius: number = 10;
  private _bifurcationHistory: { parameter: number; attractors: number }[] = [];
  private _entropySeries: number[] = [];

  constructor(data: PointAttractorLockData, startPosition: number) {
    this._data = { ...data };
    this._currentPosition = startPosition;
  }

  get lockId(): string {
    return this._data.lockId;
  }

  get attractorPoint(): number {
    return this._data.attractorPoint;
  }

  get currentPosition(): number {
    return this._currentPosition;
  }

  get locked(): boolean {
    return this._locked;
  }

  get lyapunovExponent(): number {
    return this._lyapunovExponent;
  }

  public step(): ConvergenceStep {
    const previous = this._currentPosition;
    const distance = this._data.attractorPoint - this._currentPosition;
    const force = distance * this._data.pullStrength;
    const dampedForce = force * this._data.dampingFactor;
    this._currentPosition += dampedForce;
    const newDistance = Math.abs(this._data.attractorPoint - this._currentPosition);
    if (newDistance < this._lockThreshold) {
      this._locked = true;
      this._currentPosition = this._data.attractorPoint;
    }
    const step: ConvergenceStep = {
      position: this._currentPosition,
      distance: newDistance,
      step: this._steps.length,
      locked: this._locked,
    };
    this._steps.push(step);
    if (this._steps.length > 100) {
      this._steps.shift();
    }
    this._updateLyapunov(previous, this._currentPosition);
    this._updateEntropy();
    return step;
  }

  private _updateLyapunov(prev: number, curr: number): void {
    const delta = Math.abs(curr - prev);
    if (delta > 1e-12) {
      this._lyapunovExponent = this._lyapunovExponent * 0.98 + Math.log(delta + 1) * 0.02;
    }
  }

  private _updateEntropy(): void {
    if (this._steps.length < 2) return;
    const recent = this._steps.slice(-20);
    const positions = recent.map((s) => s.position);
    const min = Math.min(...positions);
    const max = Math.max(...positions);
    const bins = 5;
    const counts = new Array(bins).fill(0);
    for (const p of positions) {
      const idx = Math.min(bins - 1, Math.floor(((p - min) / (max - min + 1e-9)) * bins));
      counts[idx]++;
    }
    let entropy = 0;
    for (const c of counts) {
      if (c > 0) {
        const prob = c / positions.length;
        entropy -= prob * Math.log2(prob);
      }
    }
    this._entropySeries.push(entropy);
    if (this._entropySeries.length > 50) {
      this._entropySeries.shift();
    }
  }

  public converge(maxSteps: number): boolean {
    for (let i = 0; i < maxSteps; i++) {
      this.step();
      if (this._locked) {
        return true;
      }
    }
    return false;
  }

  public setPullStrength(strength: number): void {
    this._data.pullStrength = Math.max(0, Math.min(1, strength));
    this._recordBifurcation();
  }

  public setDamping(damping: number): void {
    this._data.dampingFactor = Math.max(0, Math.min(1, damping));
    this._recordBifurcation();
  }

  private _recordBifurcation(): void {
    const totalForce = this._data.pullStrength * this._data.dampingFactor;
    let attractors = 1;
    if (totalForce > 0.8) attractors = 2;
    if (totalForce > 1.5) attractors = 4;
    this._bifurcationHistory.push({ parameter: totalForce, attractors });
    if (this._bifurcationHistory.length > 100) {
      this._bifurcationHistory.shift();
    }
  }

  public moveAttractor(newPoint: number): void {
    this._data.attractorPoint = newPoint;
    this._locked = false;
  }

  public applyNoise(amount: number): void {
    if (this._locked) {
      this._currentPosition += amount * (Math.random() - 0.5);
      this._locked = Math.abs(this._data.attractorPoint - this._currentPosition) < this._lockThreshold;
    }
  }

  public setLockThreshold(threshold: number): void {
    this._lockThreshold = Math.max(0.0001, threshold);
  }

  public escape(velocity: number): boolean {
    if (!this._locked) {
      return false;
    }
    if (velocity > this._data.pullStrength * 10) {
      this._locked = false;
      this._currentPosition += velocity;
      return true;
    }
    return false;
  }

  public computeBasinOfAttraction(): number {
    const testPoints: number[] = [];
    for (let i = -50; i <= 50; i++) {
      testPoints.push(this._data.attractorPoint + i * 0.2);
    }
    let converged = 0;
    for (const p of testPoints) {
      const dist = Math.abs(p - this._data.attractorPoint);
      if (dist < this._basinRadius) converged++;
    }
    return converged / testPoints.length;
  }

  public lockReport(): Record<string, unknown> {
    return {
      lockId: this.lockId,
      attractorPoint: this._data.attractorPoint.toFixed(4),
      currentPosition: this._currentPosition.toFixed(4),
      pullStrength: this._data.pullStrength.toFixed(3),
      dampingFactor: this._data.dampingFactor.toFixed(3),
      lockThreshold: this._lockThreshold,
      locked: this._locked,
      stepCount: this._steps.length,
      lyapunovExponent: this._lyapunovExponent.toFixed(4),
      distanceToAttractor: Math.abs(this._data.attractorPoint - this._currentPosition).toFixed(6),
      basinCoverage: this.computeBasinOfAttraction().toFixed(3),
      entropySeriesLength: this._entropySeries.length,
    };
  }
}

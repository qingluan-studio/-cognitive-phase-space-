export interface CadencePoint {
  step: number;
  pitch: number;
  resolved: boolean;
  label: string;
}

export type CadenceOutcome = {
  closed: boolean;
  finalPitch: number;
  tonicDistance: number;
};

export interface CadenceConfig {
  tonic: number;
  dominant: number;
  leadingTone: number;
  closureProbability: number;
}

export class UnresolvedCadence {
  private _config: CadenceConfig;
  private _points: CadencePoint[] = [];
  private _step: number = 0;
  private _suspension: Record<string, unknown> = {};
  private _markovChain: number[][] = [[0.7, 0.2, 0.1], [0.4, 0.4, 0.2], [0.1, 0.3, 0.6]];
  private _currentMarkovState: number = 0;
  private _entropyOfCadence: number = 0;
  private _fugueSubject: number[] = [];

  constructor(config: CadenceConfig) {
    this._config = config;
  }

  get pointCount(): number {
    return this._points.length;
  }

  get currentStep(): number {
    return this._step;
  }

  get cadenceEntropy(): number {
    return this._entropyOfCadence;
  }

  private _stepMarkov(): number {
    const probs = this._markovChain[this._currentMarkovState];
    const roll = Math.random();
    let cum = 0;
    for (let i = 0; i < probs.length; i++) {
      cum += probs[i];
      if (roll <= cum) {
        this._currentMarkovState = i;
        return i;
      }
    }
    this._currentMarkovState = probs.length - 1;
    return this._currentMarkovState;
  }

  private _computeCadenceEntropy(): void {
    const labels = this._points.map((p) => p.label);
    const counts: Record<string, number> = {};
    for (const l of labels) {
      counts[l] = (counts[l] || 0) + 1;
    }
    const total = labels.length;
    let entropy = 0;
    for (const key of Object.keys(counts)) {
      const p = counts[key] / total;
      if (p > 0) {
        entropy -= p * Math.log2(p);
      }
    }
    this._entropyOfCadence = entropy;
  }

  private _generateFugueSubject(length: number): void {
    this._fugueSubject = [this._config.tonic];
    for (let i = 1; i < length; i++) {
      const prev = this._fugueSubject[i - 1];
      const interval = [0, 2, 4, 5, 7, 9, 11][Math.floor(Math.random() * 7)];
      this._fugueSubject.push(prev * Math.pow(2, interval / 12));
    }
  }

  approachDominant(): CadencePoint {
    const state = this._stepMarkov();
    const pitch = state === 0 ? this._config.dominant : this._config.dominant * Math.pow(2, state / 12);
    const point: CadencePoint = {
      step: this._step++,
      pitch,
      resolved: false,
      label: 'V',
    };
    this._points.push(point);
    this._computeCadenceEntropy();
    return point;
  }

  addLeadingTone(): CadencePoint {
    const point: CadencePoint = {
      step: this._step++,
      pitch: this._config.leadingTone,
      resolved: false,
      label: 'vii°',
    };
    this._points.push(point);
    this._computeCadenceEntropy();
    return point;
  }

  attemptResolve(): CadenceOutcome {
    const last = this._points[this._points.length - 1];
    const finalPitch = last ? last.pitch : this._config.dominant;
    const infoContent = -Math.log2(this._config.closureProbability + 0.001);
    const closed = Math.random() < this._config.closureProbability;
    if (closed && last) {
      last.resolved = true;
      last.pitch = this._config.tonic;
    }
    const tonicDistance = Math.abs(finalPitch - this._config.tonic);
    this._suspension.lastAttempt = { closed, finalPitch, tonicDistance, infoContent };
    return { closed, finalPitch, tonicDistance };
  }

  forceUnresolved(): void {
    const last = this._points[this._points.length - 1];
    if (last) {
      last.resolved = false;
      last.pitch = this._config.leadingTone;
    }
    this._suspension.forcedUnresolved = Date.now();
  }

  isSuspended(): boolean {
    return this._points.some((p) => !p.resolved);
  }

  pendingCount(): number {
    return this._points.filter((p) => !p.resolved).length;
  }

  tensionIndex(): number {
    if (this._points.length === 0) return 0;
    let sum = 0;
    for (const p of this._points) {
      sum += Math.abs(p.pitch - this._config.tonic);
    }
    return sum / this._points.length;
  }

  getFugueSubject(): number[] {
    if (this._fugueSubject.length === 0) {
      this._generateFugueSubject(8);
    }
    return [...this._fugueSubject];
  }

  report(): Record<string, unknown> {
    return {
      points: this._points.length,
      step: this._step,
      suspended: this.isSuspended(),
      pending: this.pendingCount(),
      suspension: this._suspension,
      cadenceEntropy: this._entropyOfCadence.toFixed(4),
      markovState: this._currentMarkovState,
    };
  }
}

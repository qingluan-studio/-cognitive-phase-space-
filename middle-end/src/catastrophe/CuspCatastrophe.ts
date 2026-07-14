export interface CuspCatastropheData {
  readonly cuspId: string;
  controlA: number;
  controlB: number;
  currentState: number;
}

export interface CuspJump {
  fromState: number;
  toState: number;
  controlA: number;
  controlB: number;
  direction: 'up' | 'down';
}

export class CuspCatastrophe {
  private _data: CuspCatastropheData;
  private _jumps: CuspJump[] = [];
  private _history: number[] = [];
  private _hysteresis: boolean = false;
  private _lastJumpDirection: 'up' | 'down' | null = null;
  private _velocity: number = 0;

  constructor(data: CuspCatastropheData) {
    this._data = { ...data };
    this._history.push(data.currentState);
  }

  get cuspId(): string {
    return this._data.cuspId;
  }

  get currentState(): number {
    return this._data.currentState;
  }

  get controlA(): number {
    return this._data.controlA;
  }

  get controlB(): number {
    return this._data.controlB;
  }

  get velocity(): number {
    return this._velocity;
  }

  public computePotential(x: number): number {
    return x ** 4 / 4 + this._data.controlA * x ** 2 / 2 + this._data.controlB * x;
  }

  public computeDerivative(x: number): number {
    return x ** 3 + this._data.controlA * x + this._data.controlB;
  }

  public computeSecondDerivative(x: number): number {
    return 3 * x * x + this._data.controlA;
  }

  private _newtonRefine(x0: number, iterations: number = 20): number {
    let x = x0;
    for (let i = 0; i < iterations; i++) {
      const d = this.computeDerivative(x);
      const d2 = this.computeSecondDerivative(x);
      if (Math.abs(d2) < 1e-12) break;
      const step = d / d2;
      x -= step;
      if (Math.abs(step) < 1e-10) break;
    }
    return x;
  }

  public computeEquilibria(): number[] {
    const a = this._data.controlA;
    const b = this._data.controlB;
    const discriminant = -4 * a ** 3 - 27 * b ** 2;
    const equilibria: number[] = [];
    if (discriminant < 0) {
      const cubeRoot = (val: number) => Math.sign(val) * Math.abs(val) ** (1 / 3);
      const C = cubeRoot((-b + Math.sqrt(-discriminant / 108)) / 2);
      const D = cubeRoot((-b - Math.sqrt(-discriminant / 108)) / 2);
      equilibria.push(this._newtonRefine(C + D));
      const realPart = -(C + D) / 2;
      const imagPart = ((C - D) / 2) * Math.sqrt(3);
      if (Math.abs(imagPart) < 0.001) {
        equilibria.push(this._newtonRefine(realPart));
      }
    } else {
      const seeds = [-2, -1, -0.5, 0, 0.5, 1, 2];
      for (const seed of seeds) {
        const root = this._newtonRefine(seed);
        if (Math.abs(this.computeDerivative(root)) < 1e-6 &&
            !equilibria.some((e) => Math.abs(e - root) < 0.05)) {
          equilibria.push(root);
        }
      }
    }
    return equilibria.sort((x, y) => x - y);
  }

  public classifyEquilibrium(x: number): 'stable' | 'unstable' {
    return this.computeSecondDerivative(x) > 0 ? 'stable' : 'unstable';
  }

  public setControls(a: number, b: number): void {
    const oldState = this._data.currentState;
    this._data.controlA = a;
    this._data.controlB = b;
    const equilibria = this.computeEquilibria();
    if (equilibria.length === 0) {
      this._history.push(this._data.currentState);
      return;
    }
    const stable = equilibria.filter((e) => this.classifyEquilibrium(e) === 'stable');
    const candidates = stable.length > 0 ? stable : equilibria;
    const closest = candidates.reduce((prev, curr) =>
      Math.abs(curr - oldState) < Math.abs(prev - oldState) ? curr : prev
    );
    if (Math.abs(closest - oldState) > 1) {
      const direction: 'up' | 'down' = closest > oldState ? 'up' : 'down';
      if (this._lastJumpDirection && this._lastJumpDirection !== direction) {
        this._hysteresis = true;
      }
      this._lastJumpDirection = direction;
      const jump: CuspJump = { fromState: oldState, toState: closest, controlA: a, controlB: b, direction };
      this._jumps.push(jump);
      this._velocity = (closest - oldState) * 0.5;
      this._data.currentState = closest;
    } else {
      this._velocity *= 0.9;
    }
    this._history.push(this._data.currentState);
    if (this._history.length > 50) this._history.shift();
  }

  public setState(state: number): void {
    this._data.currentState = state;
    this._history.push(state);
    if (this._history.length > 50) this._history.shift();
  }

  public isInCuspRegion(): boolean {
    return 4 * this._data.controlA ** 3 + 27 * this._data.controlB ** 2 < 0;
  }

  public bifurcationSet(): { discriminant: number; cuspPoint: { a: number; b: number } } {
    const discriminant = 4 * this._data.controlA ** 3 + 27 * this._data.controlB ** 2;
    return { discriminant, cuspPoint: { a: 0, b: 0 } };
  }

  public measureHysteresis(): number {
    if (this._jumps.length < 2) return 0;
    const upJumps = this._jumps.filter((j) => j.direction === 'up');
    const downJumps = this._jumps.filter((j) => j.direction === 'down');
    if (upJumps.length === 0 || downJumps.length === 0) return 0;
    const lastUp = upJumps[upJumps.length - 1];
    const lastDown = downJumps[downJumps.length - 1];
    return Math.abs(lastUp.controlB - lastDown.controlB);
  }

  public trajectoryEntropy(): number {
    if (this._history.length < 2) return 0;
    let entropy = 0;
    for (let i = 1; i < this._history.length; i++) {
      const delta = Math.abs(this._history[i] - this._history[i - 1]);
      if (delta > 0) entropy += delta * Math.log(delta);
    }
    return entropy;
  }

  public cuspReport(): Record<string, unknown> {
    return {
      cuspId: this.cuspId,
      controlA: this._data.controlA.toFixed(3),
      controlB: this._data.controlB.toFixed(3),
      currentState: this._data.currentState.toFixed(3),
      equilibria: this.computeEquilibria().map((e) => e.toFixed(3)),
      inCuspRegion: this.isInCuspRegion(),
      hysteresis: this._hysteresis,
      hysteresisWidth: this.measureHysteresis().toFixed(3),
      jumpCount: this._jumps.length,
      velocity: this._velocity.toFixed(4),
      trajectoryEntropy: this.trajectoryEntropy().toFixed(4),
      historyLength: this._history.length,
    };
  }
}

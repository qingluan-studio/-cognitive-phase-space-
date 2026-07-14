/**
 * CuspCatastrophe - 尖点突变
 * 系统状态在两个稳定态之间突然跳跃，由尖点突变几何描述，
 * 存在滞后效应与不可达区域的特征。
 */

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

  public computePotential(x: number): number {
    return x ** 4 / 4 + this._data.controlA * x ** 2 / 2 + this._data.controlB * x;
  }

  public computeEquilibria(): number[] {
    const a = this._data.controlA;
    const b = this._data.controlB;
    const equilibria: number[] = [];
    const discriminant = -4 * a ** 3 - 27 * b ** 2;
    if (discriminant < 0) {
      const cubeRoot = (val: number) => Math.sign(val) * Math.abs(val) ** (1 / 3);
      const C = cubeRoot((-b + Math.sqrt(-discriminant / 108)) / 2);
      const D = cubeRoot((-b - Math.sqrt(-discriminant / 108)) / 2);
      equilibria.push(C + D);
      const realPart = -(C + D) / 2;
      const imagPart = ((C - D) / 2) * Math.sqrt(3);
      if (Math.abs(imagPart) < 0.001) {
        equilibria.push(realPart);
      }
    } else {
      for (let x = -10; x <= 10; x += 0.01) {
        const deriv = x ** 3 + a * x + b;
        if (Math.abs(deriv) < 0.05 && !equilibria.some((e) => Math.abs(e - x) < 0.05)) {
          equilibria.push(x);
        }
      }
    }
    return equilibria;
  }

  public setControls(a: number, b: number): void {
    const oldState = this._data.currentState;
    this._data.controlA = a;
    this._data.controlB = b;
    const equilibria = this.computeEquilibria();
    if (equilibria.length === 0) {
      return;
    }
    const closest = equilibria.reduce((prev, curr) =>
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
      this._data.currentState = closest;
    }
    this._history.push(this._data.currentState);
    if (this._history.length > 50) {
      this._history.shift();
    }
  }

  public setState(state: number): void {
    this._data.currentState = state;
    this._history.push(state);
    if (this._history.length > 50) {
      this._history.shift();
    }
  }

  public isInCuspRegion(): boolean {
    const a = this._data.controlA;
    const b = this._data.controlB;
    return 4 * a ** 3 + 27 * b ** 2 < 0;
  }

  public measureHysteresis(): number {
    if (this._jumps.length < 2) {
      return 0;
    }
    const upJumps = this._jumps.filter((j) => j.direction === 'up');
    const downJumps = this._jumps.filter((j) => j.direction === 'down');
    if (upJumps.length === 0 || downJumps.length === 0) {
      return 0;
    }
    const lastUp = upJumps[upJumps.length - 1];
    const lastDown = downJumps[downJumps.length - 1];
    return Math.abs(lastUp.controlB - lastDown.controlB);
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
      historyLength: this._history.length,
    };
  }
}

/**
 * SwallowtailShadow - 燕尾阴影
 * 更高阶的突变几何，燕尾突变的特征曲面在控制参数空间
 * 中投射出复杂的阴影区域，包含多重折叠与尖点。
 */

export interface SwallowtailShadowData {
  readonly swallowtailId: string;
  controlA: number;
  controlB: number;
  controlC: number;
  stateValue: number;
}

export interface ShadowRegion {
  regionType: 'stable' | 'unstable' | 'shadow' | 'cusp';
  stateValue: number;
  boundaries: number[];
}

export class SwallowtailShadow {
  private _data: SwallowtailShadowData;
  private _regions: ShadowRegion[] = [];
  private _inShadow: boolean = false;
  private _cuspDetected: boolean = false;
  private _foldCount: number = 0;

  constructor(data: SwallowtailShadowData) {
    this._data = { ...data };
    this._classify();
  }

  get swallowtailId(): string {
    return this._data.swallowtailId;
  }

  get inShadow(): boolean {
    return this._inShadow;
  }

  get controls(): readonly [number, number, number] {
    return [this._data.controlA, this._data.controlB, this._data.controlC];
  }

  private _classify(): void {
    const a = this._data.controlA;
    const b = this._data.controlB;
    const c = this._data.controlC;
    const potential = this._data.stateValue ** 5 / 5
      + a * this._data.stateValue ** 3 / 3
      + b * this._data.stateValue ** 2 / 2
      + c * this._data.stateValue;
    const discriminant = 4 * a ** 3 * c - a ** 2 * b ** 2 - 18 * a * b * c + 4 * b ** 3 + 27 * c ** 2;
    if (discriminant < 0) {
      this._inShadow = true;
      this._cuspDetected = Math.abs(b) < 0.1 && a < 0;
    } else {
      this._inShadow = false;
    }
    this._foldCount = discriminant < 0 ? 3 : (discriminant === 0 ? 2 : 1);
  }

  public computeEquilibria(): number[] {
    const a = this._data.controlA;
    const b = this._data.controlB;
    const c = this._data.controlC;
    const equilibria: number[] = [];
    for (let x = -10; x <= 10; x += 0.01) {
      const deriv = x ** 4 + a * x ** 2 + b * x + c;
      if (Math.abs(deriv) < 0.05) {
        if (!equilibria.some((e) => Math.abs(e - x) < 0.05)) {
          equilibria.push(x);
        }
      }
    }
    return equilibria;
  }

  public setControls(a: number, b: number, c: number): ShadowRegion {
    this._data.controlA = a;
    this._data.controlB = b;
    this._data.controlC = c;
    this._classify();
    const equilibria = this.computeEquilibria();
    let regionType: 'stable' | 'unstable' | 'shadow' | 'cusp';
    if (this._cuspDetected) {
      regionType = 'cusp';
    } else if (this._inShadow) {
      regionType = 'shadow';
    } else if (equilibria.length > 1) {
      regionType = 'stable';
    } else {
      regionType = 'unstable';
    }
    const region: ShadowRegion = {
      regionType,
      stateValue: this._data.stateValue,
      boundaries: equilibria,
    };
    this._regions.push(region);
    if (this._regions.length > 30) {
      this._regions.shift();
    }
    return region;
  }

  public setState(state: number): void {
    this._data.stateValue = state;
    this._classify();
  }

  public projectToPlane(): { x: number; y: number } {
    return {
      x: this._data.controlB,
      y: this._data.controlC,
    };
  }

  public computeShadowArea(): number {
    return Math.abs(this._data.controlA) * this._foldCount;
  }

  public detectCusp(): boolean {
    return this._cuspDetected;
  }

  public measureComplexity(): number {
    return this._foldCount * (this._inShadow ? 2 : 1);
  }

  public swallowtailReport(): Record<string, unknown> {
    return {
      swallowtailId: this.swallowtailId,
      controlA: this._data.controlA.toFixed(3),
      controlB: this._data.controlB.toFixed(3),
      controlC: this._data.controlC.toFixed(3),
      stateValue: this._data.stateValue.toFixed(3),
      inShadow: this._inShadow,
      cuspDetected: this._cuspDetected,
      foldCount: this._foldCount,
      equilibriaCount: this.computeEquilibria().length,
      shadowArea: this.computeShadowArea().toFixed(3),
      complexity: this.measureComplexity(),
      regionCount: this._regions.length,
    };
  }
}

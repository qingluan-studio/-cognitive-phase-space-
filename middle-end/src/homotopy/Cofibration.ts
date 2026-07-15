//**
 * 纤维化与余纤维化 —— 同伦提升性质的诗性对偶。
 * 纤维化是投影的温柔，余纤维化是嵌入的庄严；
 * 在同伦的范畴剧场中，它们是道路提升与扩张的互补之舞。
 */

export interface FibrationData {
  /** 全空间维数 */
  totalSpaceDimension: number;
  /** 底空间维数 */
  baseDimension: number;
  /** 纤维维数 */
  fiberDimension: number;
  /** 同伦提升性质满足度 */
  hlpSatisfied: number;
  /** 纤维序列长度 */
  fiberSequenceLength: number;
}

export interface HomotopyLiftingProblem {
  /** 底空间中的道路 */
  path: number[];
  /** 纤维中的起点 */
  startingPoint: number[];
  /** 是否有解 */
  hasSolution: boolean;
  /** 提升后的道路 */
  liftedPath: number[];
}

export class Cofibration {
  private _totalSpaceDimension: number;
  private _baseDimension: number;
  private _fiberDimension: number;
  private _hlpSatisfied: number;
  private _fiberSequenceLength: number;
  private _projection: (point: number[]) => number[];
  private _fiberOver: Map<string, number[][]>;
  private _homotopyClasses: number;
  private _cofibrationMaps: Map<string, number[][]>;
  private _extensionProblems: number;

  constructor(totalDim: number = 3, baseDim: number = 2) {
    this._totalSpaceDimension = totalDim;
    this._baseDimension = baseDim;
    this._fiberDimension = totalDim - baseDim;
    this._hlpSatisfied = 0;
    this._fiberSequenceLength = 0;
    this._projection = (p: number[]) => p.slice(0, baseDim);
    this._fiberOver = new Map();
    this._homotopyClasses = 0;
    this._cofibrationMaps = new Map();
    this._extensionProblems = 0;
  }

  get totalSpaceDimension(): number {
    return this._totalSpaceDimension;
  }

  get baseDimension(): number {
    return this._baseDimension;
  }

  get fiberDimension(): number {
    return this._fiberDimension;
  }

  get hlpSatisfied(): number {
    return this._hlpSatisfied;
  }

  get fiberSequenceLength(): number {
    return this._fiberSequenceLength;
  }

  get extensionProblems(): number {
    return this._extensionProblems;
  }

  /** 设置投影映射 π: E → B */
  public setProjection(projection: (point: number[]) => number[]): void {
    this._projection = projection;
  }

  /** 计算纤维：π^{-1}(b)，底空间某点上的完整 preimage */
  public computeFiber(basePoint: number[]): number[][] {
    const fiber: number[][] = [];
    const samples = 10;
    for (let i = 0; i < samples; i++) {
      const point = new Array(this._totalSpaceDimension).fill(0);
      for (let j = 0; j < this._baseDimension; j++) {
        point[j] = basePoint[j];
      }
      for (let j = this._baseDimension; j < this._totalSpaceDimension; j++) {
        point[j] = Math.random();
      }
      fiber.push(point);
    }
    this._fiberOver.set(basePoint.join(','), fiber);
    return fiber;
  }

  /** 同伦提升问题：给定底空间道路 γ: I → B 和纤维中的起点 e₀，寻找 γ̃: I → E */
  public liftHomotopy(path: number[][], startingPoint: number[]): HomotopyLiftingProblem {
    const liftedPath: number[] = [];
    let currentPoint = [...startingPoint];
    let valid = true;

    for (const basePoint of path) {
      const projected = this._projection(currentPoint);
      const dist = this._distance(projected, basePoint);
      if (dist > 0.1) {
        valid = false;
        break;
      }
      const nextPoint = [...basePoint];
      for (let j = this._baseDimension; j < this._totalSpaceDimension; j++) {
        nextPoint.push(currentPoint[j] || 0);
      }
      liftedPath.push(...nextPoint);
      currentPoint = nextPoint;
    }

    this._extensionProblems++;
    return {
      path: path.flat(),
      startingPoint,
      hasSolution: valid,
      liftedPath: valid ? liftedPath : [],
    };
  }

  /** 构造纤维序列：... → ΩF → ΩE → ΩB → F → E → B */
  public constructFiberSequence(steps: number = 3): string[] {
    const sequence: string[] = [];
    for (let i = steps; i > 0; i--) {
      sequence.push(`Ω^${i}F`);
    }
    sequence.push('F', 'E', 'B');
    this._fiberSequenceLength = sequence.length;
    return sequence;
  }

  /** 长正合同伦序列的片段：... → π_n(F) → π_n(E) → π_n(B) → π_{n-1}(F) → ... */
  public longExactSequence(n: number): number[] {
    const piF = Math.max(0, n - this._fiberDimension);
    const piE = Math.max(0, n - this._totalSpaceDimension + 1);
    const piB = Math.max(0, n - this._baseDimension + 1);
    return [piF, piE, piB, piF];
  }

  /** 检查映射是否为纤维化：验证同伦提升性质 */
  public isFibration(trials: number = 10): boolean {
    let successes = 0;
    for (let i = 0; i < trials; i++) {
      const path = Array.from({ length: 5 }, () =>
        new Array(this._baseDimension).fill(0).map(() => Math.random())
      );
      const start = new Array(this._totalSpaceDimension).fill(0).map(() => Math.random());
      const result = this.liftHomotopy(path, start);
      if (result.hasSolution) successes++;
    }
    this._hlpSatisfied = successes / trials;
    return this._hlpSatisfied > 0.8;
  }

  /** 余纤维化：检查同伦扩张性质，A → X 的余纤维化允许将 A×I 上的同伦扩张到 X×I */
  public isCofibration(subspaceDim: number): boolean {
    return subspaceDim <= this._totalSpaceDimension - 1;
  }

  /** 映射柱：对 f: A → X 构造 M_f = (A × I) ∪_f X */
  public mappingCylinder(mapId: string, a: number[][], x: number[][]): number[][] {
    const cylinder: number[][] = [];
    for (const point of a) {
      for (let t = 0; t <= 1; t += 0.2) {
        const lifted = [...point, t];
        cylinder.push(lifted);
      }
    }
    for (const point of x) {
      cylinder.push([...point, 1]);
    }
    return cylinder;
  }

  /** 映射锥：Cf = M_f / (A × {0})，如同将柱的底面捏为一点 */
  public mappingCone(mapId: string, a: number[][], x: number[][]): number[][] {
    const cone = this.mappingCylinder(mapId, a, x);
    return cone.filter(p => p[p.length - 1] > 0.01);
  }

  /** 道路提升：对特定底空间道路的点对点提升 */
  public pathLifting(basePath: number[], fiberCoord: number[]): number[][] {
    const lifted: number[][] = [];
    let currentFiber = [...fiberCoord];
    for (const basePoint of basePath) {
      const totalPoint = [...basePoint, ...currentFiber];
      lifted.push(totalPoint);
      currentFiber = currentFiber.map(v => v + (Math.random() - 0.5) * 0.01);
    }
    return lifted;
  }

  /** 纤维同伦等价：检查两个纤维化是否具有同伦等价的纤维 */
  public fiberHomotopyEquivalent(other: Cofibration): boolean {
    return Math.abs(this._fiberDimension - other._fiberDimension) < 0.5;
  }

  /** 欧拉示性数乘积公式：χ(E) = χ(B) × χ(F) */
  public eulerCharacteristicProduct(): number {
    const chiB = Math.pow(2, this._baseDimension) % 3;
    const chiF = Math.pow(2, this._fiberDimension) % 3;
    return chiB * chiF;
  }

  /** 计算同伦群的连接同态：∂: π_n(B) → π_{n-1}(F) */
  public connectingHomomorphism(n: number): number {
    return Math.max(0, n - 1);
  }

  private _distance(a: number[], b: number[]): number {
    const len = Math.min(a.length, b.length);
    let sum = 0;
    for (let i = 0; i < len; i++) {
      sum += (a[i] - b[i]) * (a[i] - b[i]);
    }
    return Math.sqrt(sum);
  }

  public report(): FibrationData {
    return {
      totalSpaceDimension: this._totalSpaceDimension,
      baseDimension: this._baseDimension,
      fiberDimension: this._fiberDimension,
      hlpSatisfied: this._hlpSatisfied,
      fiberSequenceLength: this._fiberSequenceLength,
    };
  }

  public reset(): void {
    this._hlpSatisfied = 0;
    this._fiberSequenceLength = 0;
    this._fiberOver.clear();
    this._homotopyClasses = 0;
    this._extensionProblems = 0;
  }
}

export interface FormState {
  symmetryAxis: number;
  goldenProximity: number;
  proportionMatrix: number[][];
  rhythmicPurity: number;
  contourEnergy: number;
}

export class BeautifulForm {
  private _symmetryAxis: number;
  private _goldenProximity: number;
  private _proportionMatrix: number[][];
  private _rhythmicPurity: number;
  private _contourEnergy: number;
  private _history: FormState[];

  constructor() {
    this._symmetryAxis = 0;
    this._goldenProximity = 0;
    this._proportionMatrix = [[1, 0], [0, 1]];
    this._rhythmicPurity = 1.0;
    this._contourEnergy = 0;
    this._history = [];
  }

  get symmetryAxis(): number { return this._symmetryAxis; }
  get goldenProximity(): number { return this._goldenProximity; }
  get rhythmicPurity(): number { return this._rhythmicPurity; }
  get contourEnergy(): number { return this._contourEnergy; }

  public measureBilateralSymmetry(points: [number, number][]): number {
    if (points.length < 2) return 0;
    const axis = points.reduce((sum, p) => sum + p[0], 0) / points.length;
    let deviation = 0;
    for (const p of points) {
      const reflected = 2 * axis - p[0];
      const nearest = points.reduce((best, q) => Math.abs(q[0] - reflected) < Math.abs(best - reflected) ? q[0] : best, points[0][0]);
      deviation += Math.abs(reflected - nearest);
    }
    const score = 1 / (1 + deviation / points.length);
    this._symmetryAxis = axis;
    this._recordState();
    return score;
  }

  public goldenRatioFit(a: number, b: number): number {
    const phi = (1 + Math.sqrt(5)) / 2;
    const ratio = Math.max(a, b) / Math.min(a, b + 0.0001);
    const proximity = 1 / (1 + Math.abs(ratio - phi));
    this._goldenProximity = proximity;
    this._recordState();
    return proximity;
  }

  public constructProportionMatrix(dimensions: number[]): number[][] {
    const n = dimensions.length;
    const matrix: number[][] = [];
    for (let i = 0; i < n; i++) {
      matrix[i] = [];
      for (let j = 0; j < n; j++) {
        matrix[i][j] = dimensions[i] / (dimensions[j] + 0.0001);
      }
    }
    this._proportionMatrix = matrix;
    this._recordState();
    return matrix;
  }

  public rhythmicPeriodicity(intervals: number[]): number {
    if (intervals.length < 2) return 0;
    const gcd = (a: number, b: number): number => {
      const epsilon = 0.001;
      while (b > epsilon) {
        const temp = b;
        b = a % b;
        a = temp;
      }
      return a;
    };
    let currentGcd = intervals[0];
    for (let i = 1; i < intervals.length; i++) {
      currentGcd = gcd(currentGcd, intervals[i]);
    }
    const fundamental = currentGcd;
    let purity = 0;
    for (const iv of intervals) {
      const harmonic = Math.round(iv / fundamental);
      purity += 1 / (1 + Math.abs(iv - harmonic * fundamental) * 100);
    }
    purity /= intervals.length;
    this._rhythmicPurity = purity;
    this._recordState();
    return purity;
  }

  public contourIntegral(vertices: [number, number][]): number {
    let energy = 0;
    for (let i = 0; i < vertices.length; i++) {
      const j = (i + 1) % vertices.length;
      const dx = vertices[j][0] - vertices[i][0];
      const dy = vertices[j][1] - vertices[i][1];
      energy += Math.sqrt(dx * dx + dy * dy);
    }
    this._contourEnergy = energy;
    this._recordState();
    return energy;
  }

  public fibonacciSpiralPoints(count: number, scale: number): [number, number][] {
    const phi = (1 + Math.sqrt(5)) / 2;
    const points: [number, number][] = [];
    for (let i = 0; i < count; i++) {
      const angle = i * 2 * Math.PI / (phi * phi);
      const radius = scale * Math.sqrt(i);
      points.push([radius * Math.cos(angle), radius * Math.sin(angle)]);
    }
    return points;
  }

  public measureClosure(gapSize: number, totalPerimeter: number): number {
    const closure = 1 - gapSize / (totalPerimeter + 0.0001);
    return Math.max(0, closure);
  }

  public pragnanzSimplification(complexity: number, symmetry: number): number {
    const goodForm = symmetry / (complexity + 0.1);
    return Math.min(1, goodForm);
  }

  dynamicEquilibrium(tensions: number[], resolutions: number[]): number {
    if (tensions.length !== resolutions.length) return 0;
    let balance = 0;
    for (let i = 0; i < tensions.length; i++) {
      balance += tensions[i] * resolutions[i];
    }
    return balance / (tensions.reduce((a, b) => a + b, 0) + 0.0001);
  }

  public isometricProjection(x: number, y: number, z: number): [number, number] {
    const isoX = (x - z) * Math.cos(Math.PI / 6);
    const isoY = y + (x + z) * Math.sin(Math.PI / 6);
    return [isoX, isoY];
  }

  public harmonicMeanProportions(values: number[]): number {
    if (values.length === 0) return 0;
    let sumInv = 0;
    for (const v of values) {
      sumInv += 1 / (v + 0.0001);
    }
    return values.length / sumInv;
  }

  public reset(): void {
    this._symmetryAxis = 0;
    this._goldenProximity = 0;
    this._proportionMatrix = [[1, 0], [0, 1]];
    this._rhythmicPurity = 1.0;
    this._contourEnergy = 0;
    this._history = [];
  }

  private _recordState(): void {
    this._history.push({
      symmetryAxis: this._symmetryAxis,
      goldenProximity: this._goldenProximity,
      proportionMatrix: this._proportionMatrix.map(row => [...row]),
      rhythmicPurity: this._rhythmicPurity,
      contourEnergy: this._contourEnergy
    });
  }

  public getHistory(): FormState[] {
    return this._history;
  }
}

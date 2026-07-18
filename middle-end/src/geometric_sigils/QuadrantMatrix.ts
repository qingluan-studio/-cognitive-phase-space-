import type { DataPacket } from '../shared/types';

/**
 * QuadrantMatrix — ♢ Four-quadrant matrix operator.
 *
 * The diamond/square sigil governs orthogonal decomposition, quadrant
 * classification, and the migration of items across a 2D cross. Rotating
 * 45° flips the square view into a diamond view, mirroring the
 * classification axes and every contained coordinate.
 */

export interface QuadrantItem {
  item: unknown;
  x: number;
  y: number;
  placedAt: number;
}

export interface Quadrant {
  id: string;
  label: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  xSign: 1 | -1;
  ySign: 1 | -1;
  density: number;
  items: QuadrantItem[];
}

export interface MatrixCell {
  row: number;
  col: number;
  value: number;
  confidence: number;
  lastUpdated: number;
}

export interface DecompositionComponent {
  axis: string;
  magnitude: number;
  projection: number[];
}

export interface OrthogonalDecomposition {
  components: DecompositionComponent[];
  residual: number;
  totalVariance: number;
  explainedRatio: number;
}

interface ShiftRecord {
  timestamp: number;
  fromQuadrant: string;
  toQuadrant: string;
  itemCount: number;
  direction: 'in' | 'out';
}

export class QuadrantMatrix {
  private _quadrants: Map<string, Quadrant>;
  private _matrix: MatrixCell[][];
  private _decomposition: OrthogonalDecomposition | null;
  private _rows: number;
  private _cols: number;
  private _history: ShiftRecord[];
  private _rotated: boolean;
  private _rotation: number;
  private _counter: number;
  private _maxHistory: number = 500;

  constructor(rows: number = 4, cols: number = 4) {
    this._rows = Math.max(1, Math.floor(rows));
    this._cols = Math.max(1, Math.floor(cols));
    this._quadrants = new Map();
    this._matrix = [];
    this._decomposition = null;
    this._history = [];
    this._rotated = false;
    this._rotation = 0;
    this._counter = 0;
    this._initializeQuadrants();
    this._initializeMatrix();
  }

  get quadrants(): Quadrant[] {
    return Array.from(this._quadrants.values()).map(q => ({
      ...q,
      items: q.items.map(it => ({ ...it })),
    }));
  }

  get matrix(): MatrixCell[][] {
    return this._matrix.map(row => row.map(c => ({ ...c })));
  }

  get decomposition(): OrthogonalDecomposition | null {
    if (!this._decomposition) return null;
    return {
      ...this._decomposition,
      components: this._decomposition.components.map(c => ({
        ...c,
        projection: [...c.projection],
      })),
    };
  }

  get history(): ShiftRecord[] {
    return this._history.map(h => ({ ...h }));
  }

  get rows(): number { return this._rows; }
  get cols(): number { return this._cols; }
  get rotated(): boolean { return this._rotated; }
  get rotation(): number { return this._rotation; }

  private _initializeQuadrants(): void {
    const defs: Array<{ label: 'Q1' | 'Q2' | 'Q3' | 'Q4'; xSign: 1 | -1; ySign: 1 | -1 }> = [
      { label: 'Q1', xSign: 1, ySign: 1 },
      { label: 'Q2', xSign: -1, ySign: 1 },
      { label: 'Q3', xSign: -1, ySign: -1 },
      { label: 'Q4', xSign: 1, ySign: -1 },
    ];
    for (const d of defs) {
      this._quadrants.set(d.label, {
        id: `quadrant-${d.label.toLowerCase()}`,
        label: d.label,
        xSign: d.xSign,
        ySign: d.ySign,
        density: 0,
        items: [],
      });
    }
  }

  private _initializeMatrix(): void {
    this._matrix = [];
    for (let r = 0; r < this._rows; r++) {
      const row: MatrixCell[] = [];
      for (let c = 0; c < this._cols; c++) {
        row.push({ row: r, col: c, value: 0, confidence: 0, lastUpdated: 0 });
      }
      this._matrix.push(row);
    }
  }

  /**
   * Classify a (x, y) coordinate into one of the four quadrants.
   * Convention: x>=0 reads as +, y>=0 reads as + (axes belong to Q1).
   */
  classify(x: number, y: number): Quadrant {
    const xPositive = x >= 0;
    const yPositive = y >= 0;
    let label: 'Q1' | 'Q2' | 'Q3' | 'Q4';
    if (xPositive && yPositive) label = 'Q1';
    else if (!xPositive && yPositive) label = 'Q2';
    else if (!xPositive && !yPositive) label = 'Q3';
    else label = 'Q4';
    const q = this._quadrants.get(label);
    if (!q) throw new Error(`Quadrant ${label} not initialized`);
    return { ...q, items: q.items.map(it => ({ ...it })) };
  }

  /**
   * Place an item at (x, y): register it in the matching quadrant and
   * increment the matrix cell whose position mirrors the coordinate.
   */
  place(item: unknown, x: number, y: number): Quadrant {
    const target = this.classify(x, y);
    const q = this._quadrants.get(target.label);
    if (!q) throw new Error(`Quadrant ${target.label} not initialized`);
    q.items.push({ item, x, y, placedAt: Date.now() });
    q.density = q.items.length;
    const r = Math.min(this._rows - 1, Math.max(0, Math.floor(((y + 1) / 2) * this._rows)));
    const c = Math.min(this._cols - 1, Math.max(0, Math.floor(((x + 1) / 2) * this._cols)));
    const cell = this._matrix[r][c];
    cell.value += 1;
    cell.confidence = Math.min(1, cell.confidence + 0.05);
    cell.lastUpdated = Date.now();
    return { ...q, items: q.items.map(it => ({ ...it })) };
  }

  /**
   * Rotate the matrix 45°: square view ↔ diamond view. Swaps the
   * x/y sign of every quadrant and rotates each contained item.
   */
  rotate45(): void {
    this._rotated = !this._rotated;
    this._rotation = (this._rotation + 45) % 360;
    const labels: Array<'Q1' | 'Q2' | 'Q3' | 'Q4'> = ['Q1', 'Q2', 'Q3', 'Q4'];
    for (const label of labels) {
      const q = this._quadrants.get(label);
      if (!q) continue;
      const tmp = q.xSign;
      q.xSign = q.ySign;
      q.ySign = tmp;
      const cos = Math.SQRT1_2;
      const sin = Math.SQRT1_2;
      q.items = q.items.map(it => ({
        ...it,
        x: it.x * cos - it.y * sin,
        y: it.x * sin + it.y * cos,
      }));
    }
    this._history.push({
      timestamp: Date.now(),
      fromQuadrant: '*',
      toQuadrant: '*',
      itemCount: this._totalItemCount(),
      direction: 'in',
    });
    this._trimHistory();
  }

  /**
   * Orthogonal decomposition (PCA-style) of a numeric dataset.
   * Centers the data, then extracts up to 3 principal components via
   * power iteration with deflation. Records residual variance.
   */
  decompose(data: number[][]): OrthogonalDecomposition {
    if (data.length === 0 || !data[0] || data[0].length === 0) {
      this._decomposition = {
        components: [],
        residual: 0,
        totalVariance: 0,
        explainedRatio: 0,
      };
      return this._decomposition;
    }
    const n = data.length;
    const d = data[0].length;
    const means = new Array(d).fill(0);
    for (const row of data) {
      for (let j = 0; j < d; j++) means[j] += row[j] ?? 0;
    }
    for (let j = 0; j < d; j++) means[j] /= n;
    const centered = data.map(row => row.map((v, j) => (v ?? 0) - means[j]));
    let totalVariance = 0;
    for (let j = 0; j < d; j++) {
      let acc = 0;
      for (let i = 0; i < n; i++) acc += centered[i][j] * centered[i][j];
      totalVariance += acc / n;
    }
    const components: DecompositionComponent[] = [];
    let work = centered.map(r => [...r]);
    let remainingVariance = totalVariance;
    const maxComponents = Math.min(d, 3);
    for (let k = 0; k < maxComponents && remainingVariance > 1e-12; k++) {
      let axis = new Array(d).fill(0).map(() => Math.random() - 0.5);
      let norm = Math.sqrt(axis.reduce((s, v) => s + v * v, 0)) || 1;
      axis = axis.map(v => v / norm);
      let prevMag = 0;
      for (let iter = 0; iter < 50; iter++) {
        const next = new Array(d).fill(0);
        for (let i = 0; i < n; i++) {
          let dot = 0;
          for (let j = 0; j < d; j++) dot += work[i][j] * axis[j];
          for (let j = 0; j < d; j++) next[j] += dot * work[i][j];
        }
        const mag = Math.sqrt(next.reduce((s, v) => s + v * v, 0)) || 1;
        axis = next.map(v => v / mag);
        if (Math.abs(mag - prevMag) < 1e-9) break;
        prevMag = mag;
      }
      const projection = work.map(row => {
        let dot = 0;
        for (let j = 0; j < d; j++) dot += row[j] * axis[j];
        return dot;
      });
      let magnitude = 0;
      for (const p of projection) magnitude += p * p;
      magnitude = Math.sqrt(magnitude / n);
      components.push({ axis: `PC${k + 1}`, magnitude, projection });
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < d; j++) work[i][j] -= projection[i] * axis[j];
      }
      let deflatedVariance = 0;
      for (let j = 0; j < d; j++) {
        let acc = 0;
        for (let i = 0; i < n; i++) acc += work[i][j] * work[i][j];
        deflatedVariance += acc / n;
      }
      remainingVariance = deflatedVariance;
    }
    const residual = Math.max(
      0,
      totalVariance - components.reduce((s, c) => s + c.magnitude * c.magnitude, 0),
    );
    const explainedRatio = totalVariance > 0 ? Math.min(1, 1 - residual / totalVariance) : 0;
    this._decomposition = { components, residual, totalVariance, explainedRatio };
    return this._decomposition;
  }

  /** Density per quadrant label. */
  quadrantDensity(): Map<string, number> {
    const result = new Map<string, number>();
    for (const q of this._quadrants.values()) {
      result.set(q.label, q.density);
    }
    return result;
  }

  /**
   * Four-quadrant balance in [0, 1]. Returns 0 when empty or fully
   * concentrated in one quadrant, 1 when densities are perfectly even.
   */
  balance(): number {
    const densities = Array.from(this._quadrants.values()).map(q => q.density);
    const total = densities.reduce((s, v) => s + v, 0);
    if (total === 0) return 0;
    const avg = total / densities.length;
    let sumSq = 0;
    for (const v of densities) sumSq += (v - avg) * (v - avg);
    const stdDev = Math.sqrt(sumSq / densities.length);
    return avg > 0 ? Math.max(0, 1 - stdDev / (avg * densities.length)) : 0;
  }

  /**
   * Migrate the oldest item of `quadrantId` into a neighbouring quadrant.
   * 'out' moves clockwise (Q1→Q2→Q3→Q4→Q1), 'in' moves counter-clockwise.
   */
  shift(quadrantId: string, direction: 'in' | 'out'): void {
    const source =
      this._quadrants.get(quadrantId) ||
      Array.from(this._quadrants.values()).find(q => q.id === quadrantId);
    if (!source || source.items.length === 0) return;
    const order: Array<'Q1' | 'Q2' | 'Q3' | 'Q4'> = ['Q1', 'Q2', 'Q3', 'Q4'];
    const srcIdx = order.indexOf(source.label);
    const destIdx =
      direction === 'out'
        ? (srcIdx + 1) % order.length
        : (srcIdx - 1 + order.length) % order.length;
    const dest = this._quadrants.get(order[destIdx]);
    if (!dest) return;
    const moved = source.items.shift();
    if (!moved) return;
    dest.items.push({ ...moved, x: moved.x * -1, y: moved.y * -1 });
    source.density = source.items.length;
    dest.density = dest.items.length;
    this._history.push({
      timestamp: Date.now(),
      fromQuadrant: source.label,
      toQuadrant: dest.label,
      itemCount: 1,
      direction,
    });
    this._trimHistory();
  }

  /** Collapse the 2D matrix into a flat 1D list of cells. */
  collapse(): MatrixCell[] {
    const flat: MatrixCell[] = [];
    for (const row of this._matrix) {
      for (const cell of row) flat.push({ ...cell });
    }
    return flat;
  }

  /**
   * Expand the matrix to a square of side `dim`, preserving existing
   * cells and zero-filling new positions. Updates internal dimensions.
   */
  expand(dim: number): MatrixCell[][] {
    const size = Math.max(this._rows, this._cols, Math.floor(dim));
    const expanded: MatrixCell[][] = [];
    for (let r = 0; r < size; r++) {
      const row: MatrixCell[] = [];
      for (let c = 0; c < size; c++) {
        if (r < this._rows && c < this._cols) {
          row.push({ ...this._matrix[r][c] });
        } else {
          row.push({ row: r, col: c, value: 0, confidence: 0, lastUpdated: 0 });
        }
      }
      expanded.push(row);
    }
    this._matrix = expanded;
    this._rows = size;
    this._cols = size;
    return this.matrix;
  }

  /** Values along the cross-axis through the matrix centre. */
  getCross(axis: 'x' | 'y'): number[] {
    const midRow = Math.floor(this._rows / 2);
    const midCol = Math.floor(this._cols / 2);
    const values: number[] = [];
    if (axis === 'x') {
      for (let c = 0; c < this._cols; c++) values.push(this._matrix[midRow][c].value);
    } else {
      for (let r = 0; r < this._rows; r++) values.push(this._matrix[r][midCol].value);
    }
    return values;
  }

  toPacket(): DataPacket {
    const id = `qm-${Date.now().toString(36)}-${(++this._counter).toString(36)}`;
    return {
      id,
      payload: {
        rows: this._rows,
        cols: this._cols,
        rotated: this._rotated,
        rotation: this._rotation,
        balance: this.balance(),
        quadrantDensity: Array.from(this.quadrantDensity().entries()).map(([k, v]) => ({
          label: k,
          density: v,
        })),
        decomposition: this._decomposition
          ? {
              componentCount: this._decomposition.components.length,
              explainedRatio: this._decomposition.explainedRatio,
              totalVariance: this._decomposition.totalVariance,
            }
          : null,
      },
      metadata: {
        createdAt: Date.now(),
        route: ['QuadrantMatrix'],
        priority: 1,
        phase: 'geometric-sigil',
      },
    };
  }

  private _totalItemCount(): number {
    let count = 0;
    for (const q of this._quadrants.values()) count += q.items.length;
    return count;
  }

  private _trimHistory(): void {
    while (this._history.length > this._maxHistory) this._history.shift();
  }

  reset(): void {
    this._quadrants.clear();
    this._matrix = [];
    this._decomposition = null;
    this._history = [];
    this._rotated = false;
    this._rotation = 0;
    this._initializeQuadrants();
    this._initializeMatrix();
  }
}

/**
 * 平国投影：将多维数据投影到二维表面。
 * 将高维数据结构投影到二维平面，损失部分维度信息但获得可视化与可比较的二维表示。
 */

export type ProjectionMode = 'orthographic' | 'stereographic' | 'polar' | 'isometric';

export interface ProjectionPlane {
  width: number;
  height: number;
  mode: ProjectionMode;
}

export interface ProjectedPoint {
  x: number;
  y: number;
  originalDimension: number;
  preservedMagnitude: number;
}

export interface ProjectionResult {
  id: string;
  plane: ProjectionPlane;
  points: ProjectedPoint[];
  fidelity: number;
  createdAt: number;
}

export class FlatlandProjection {
  private _results: ProjectionResult[] = [];
  private _defaultPlane: ProjectionPlane = { width: 100, height: 100, mode: 'orthographic' };

  project(data: number[][], plane?: Partial<ProjectionPlane>): ProjectionResult {
    const activePlane: ProjectionPlane = { ...this._defaultPlane, ...plane };
    const points: ProjectedPoint[] = data.map((row, i) =>
      this._projectRow(row, activePlane, i)
    );
    const fidelity = this._computeFidelity(data, points);

    const result: ProjectionResult = {
      id: `proj-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      plane: activePlane,
      points,
      fidelity,
      createdAt: Date.now(),
    };
    this._results.push(result);
    if (this._results.length > 100) this._results.shift();
    return result;
  }

  private _projectRow(row: number[], plane: ProjectionPlane, index: number): ProjectedPoint {
    const cx = plane.width / 2;
    const cy = plane.height / 2;
    let x = cx;
    let y = cy;
    let preserved = 0;

    switch (plane.mode) {
      case 'orthographic': {
        x = cx + (row[0] ?? 0) * 10;
        y = cy + (row[1] ?? 0) * 10;
        preserved = Math.min(2, row.length) / row.length;
        break;
      }
      case 'stereographic': {
        const r = Math.sqrt(row.reduce((s, v) => s + v * v, 0));
        const theta = Math.atan2(row[1] ?? 0, row[0] ?? 1);
        x = cx + r * Math.cos(theta) * 10;
        y = cy + r * Math.sin(theta) * 10;
        preserved = 1 / Math.max(1, row.length - 1);
        break;
      }
      case 'polar': {
        const r = row[0] ?? 0;
        const theta = (index / Math.max(1, row.length)) * 2 * Math.PI;
        x = cx + r * Math.cos(theta) * 10;
        y = cy + r * Math.sin(theta) * 10;
        preserved = 1 / row.length;
        break;
      }
      case 'isometric': {
        x = cx + ((row[0] ?? 0) - (row[1] ?? 0)) * 10;
        y = cy + ((row[0] ?? 0) + (row[1] ?? 0)) / 2 * 10;
        preserved = Math.min(2, row.length) / row.length;
        break;
      }
    }

    return { x, y, originalDimension: row.length, preservedMagnitude: preserved };
  }

  private _computeFidelity(data: number[][], points: ProjectedPoint[]): number {
    if (points.length === 0) return 0;
    return points.reduce((s, p) => s + p.preservedMagnitude, 0) / points.length;
  }

  setDefaultPlane(plane: Partial<ProjectionPlane>): void {
    this._defaultPlane = { ...this._defaultPlane, ...plane };
  }

  getResults(): ProjectionResult[] {
    return [...this._results];
  }

  getResult(id: string): ProjectionResult | null {
    return this._results.find(r => r.id === id) ?? null;
  }

  get resultCount(): number {
    return this._results.length;
  }
}

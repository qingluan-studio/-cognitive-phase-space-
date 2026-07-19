import { DataPacket, PacketMeta } from '../shared/types';
import { Point, Vector } from '../affine_geometry/AffineSpace';

export type ProjectionType = 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom' | 'isometric' | 'axonometric';

export interface ProjectionPlane {
  normal: Vector;
  origin: Point;
}

export interface View {
  type: ProjectionType;
  points: Point[];
  lines: Line[];
}

export interface MultiView {
  front: View;
  top: View;
  side: View;
  isometric: View;
}

export interface Line {
  start: Point;
  end: Point;
}

export interface Object3D {
  vertices: Point[];
  edges: Line[];
}

export class OrthographicProjection {
  private _planes: Map<string, ProjectionPlane> = new Map();
  private _views: Map<string, View> = new Map();
  private _multiViews: Map<string, MultiView> = new Map();
  private _history: unknown[] = [];
  private _projectionMatrix: number[][] = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];

  project(object: Object3D, type: ProjectionType): View {
    const points: Point[] = [];
    const lines: Line[] = [];

    for (const vertex of object.vertices) {
      let projected: Point;
      switch (type) {
        case 'front':
          projected = { x: vertex.x, y: vertex.y, z: 0 };
          break;
        case 'back':
          projected = { x: -vertex.x, y: vertex.y, z: 0 };
          break;
        case 'left':
          projected = { x: -vertex.z, y: vertex.y, z: 0 };
          break;
        case 'right':
          projected = { x: vertex.z, y: vertex.y, z: 0 };
          break;
        case 'top':
          projected = { x: vertex.x, y: -vertex.z, z: 0 };
          break;
        case 'bottom':
          projected = { x: vertex.x, y: vertex.z, z: 0 };
          break;
        case 'isometric':
          projected = {
            x: 0.707 * vertex.x - 0.707 * vertex.z,
            y: 0.577 * vertex.x + 0.577 * vertex.y + 0.577 * vertex.z,
            z: 0,
          };
          break;
        default:
          projected = { x: vertex.x, y: vertex.y, z: 0 };
      }
      points.push(projected);
    }

    for (const edge of object.edges) {
      const startIdx = object.vertices.indexOf(edge.start);
      const endIdx = object.vertices.indexOf(edge.end);
      if (startIdx >= 0 && endIdx >= 0) {
        lines.push({ start: points[startIdx], end: points[endIdx] });
      }
    }

    const view: View = { type, points, lines };
    this._views.set(type, view);
    this._history.push({ type: 'project', object, projectionType: type, result: view });
    return view;
  }

  createMultiView(object: Object3D): MultiView {
    const multiView: MultiView = {
      front: this.project(object, 'front'),
      top: this.project(object, 'top'),
      side: this.project(object, 'left'),
      isometric: this.project(object, 'isometric'),
    };

    this._multiViews.set('default', multiView);
    this._history.push({ type: 'createMultiView', object, result: multiView });
    return multiView;
  }

  isometricProjection(object: Object3D): View {
    return this.project(object, 'isometric');
  }

  dimetricProjection(object: Object3D, angles: { xy: number; xz: number }): View {
    const cosXY = Math.cos(angles.xy * Math.PI / 180);
    const sinXY = Math.sin(angles.xy * Math.PI / 180);
    const cosXZ = Math.cos(angles.xz * Math.PI / 180);
    const sinXZ = Math.sin(angles.xz * Math.PI / 180);

    const points: Point[] = object.vertices.map(v => ({
      x: v.x * cosXY - v.z * sinXZ,
      y: v.x * sinXY + v.y + v.z * cosXZ,
      z: 0,
    }));

    const lines: Line[] = [];
    for (const edge of object.edges) {
      const startIdx = object.vertices.indexOf(edge.start);
      const endIdx = object.vertices.indexOf(edge.end);
      if (startIdx >= 0 && endIdx >= 0) {
        lines.push({ start: points[startIdx], end: points[endIdx] });
      }
    }

    const view: View = { type: 'axonometric', points, lines };
    this._history.push({ type: 'dimetricProjection', object, angles, result: view });
    return view;
  }

  trimetricProjection(object: Object3D, angles: { xy: number; xz: number; yz: number }): View {
    const points: Point[] = object.vertices.map(v => ({
      x: v.x * Math.cos(angles.xy * Math.PI / 180) - v.z * Math.cos(angles.xz * Math.PI / 180),
      y: v.x * Math.sin(angles.xy * Math.PI / 180) + v.y * Math.sin(angles.yz * Math.PI / 180) + v.z * Math.sin(angles.xz * Math.PI / 180),
      z: 0,
    }));

    const lines: Line[] = [];
    for (const edge of object.edges) {
      const startIdx = object.vertices.indexOf(edge.start);
      const endIdx = object.vertices.indexOf(edge.end);
      if (startIdx >= 0 && endIdx >= 0) {
        lines.push({ start: points[startIdx], end: points[endIdx] });
      }
    }

    const view: View = { type: 'axonometric', points, lines };
    this._history.push({ type: 'trimetricProjection', object, angles, result: view });
    return view;
  }

  hiddenLineRemoval(view: View): View {
    const visibleLines: Line[] = [];

    for (let i = 0; i < view.lines.length; i++) {
      let isVisible = true;
      for (let j = 0; j < view.lines.length; j++) {
        if (i === j) continue;
        if (this._linesIntersect(view.lines[i], view.lines[j])) {
          isVisible = false;
          break;
        }
      }
      if (isVisible) {
        visibleLines.push(view.lines[i]);
      }
    }

    const result: View = { ...view, lines: visibleLines };
    this._history.push({ type: 'hiddenLineRemoval', view, result });
    return result;
  }

  lineOfSight(point: Point, object: Object3D): boolean {
    for (const edge of object.edges) {
      if (this._pointLineDistance(point, edge) < 1e-3) {
        this._history.push({ type: 'lineOfSight', point, object, result: false });
        return false;
      }
    }
    this._history.push({ type: 'lineOfSight', point, object, result: true });
    return true;
  }

  getProjection(type: ProjectionType): View | undefined {
    return this._views.get(type);
  }

  private _linesIntersect(line1: Line, line2: Line): boolean {
    const ccw = (a: Point, b: Point, c: Point) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
    return ccw(line1.start, line1.end, line2.start) * ccw(line1.start, line1.end, line2.end) < 0 &&
           ccw(line2.start, line2.end, line1.start) * ccw(line2.start, line2.end, line1.end) < 0;
  }

  private _pointLineDistance(point: Point, line: Line): number {
    const dx = line.end.x - line.start.x;
    const dy = line.end.y - line.start.y;
    const len2 = dx * dx + dy * dy;
    if (len2 < 1e-6) return Math.sqrt((point.x - line.start.x) ** 2 + (point.y - line.start.y) ** 2);

    let t = ((point.x - line.start.x) * dx + (point.y - line.start.y) * dy) / len2;
    t = Math.max(0, Math.min(1, t));

    const projX = line.start.x + t * dx;
    const projY = line.start.y + t * dy;
    return Math.sqrt((point.x - projX) ** 2 + (point.y - projY) ** 2);
  }

  toPacket(): DataPacket<{
    planes: Map<string, ProjectionPlane>;
    views: Map<string, View>;
    multiViews: Map<string, MultiView>;
    projectionMatrix: number[][];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['orthogonal_projection', 'OrthographicProjection'],
      priority: 1,
      phase: 'projection',
    };
    return {
      id: `ortho-proj-${Date.now().toString(36)}`,
      payload: {
        planes: this._planes,
        views: this._views,
        multiViews: this._multiViews,
        projectionMatrix: this._projectionMatrix,
      },
      metadata,
    };
  }

  reset(): void {
    this._planes = new Map();
    this._views = new Map();
    this._multiViews = new Map();
    this._history = [];
    this._projectionMatrix = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];
  }
}

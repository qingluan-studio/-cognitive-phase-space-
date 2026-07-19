import { DataPacket, PacketMeta } from '../shared/types';
import { Point, Vector } from '../affine_geometry/AffineSpace';

export interface Frustum {
  near: number;
  far: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
  aspectRatio: number;
}

export interface ClippingPlane {
  equation: number[];
  type: 'near' | 'far' | 'left' | 'right' | 'top' | 'bottom';
}

export interface FrustumCorner {
  nearTopLeft: Point;
  nearTopRight: Point;
  nearBottomLeft: Point;
  nearBottomRight: Point;
  farTopLeft: Point;
  farTopRight: Point;
  farBottomLeft: Point;
  farBottomRight: Point;
}

export interface Line {
  start: Point;
  end: Point;
}

export interface BoundingBox {
  min: Point;
  max: Point;
}

export class ViewingFrustum {
  private _frusta: Map<string, Frustum> = new Map();
  private _planes: Map<string, ClippingPlane[]> = new Map();
  private _corners: Map<string, FrustumCorner> = new Map();
  private _history: unknown[] = [];
  private _projectionType: 'orthographic' | 'perspective' = 'perspective';

  createFrustum(near: number, far: number, left: number, right: number, top: number, bottom: number): Frustum {
    const frustum: Frustum = {
      near,
      far,
      left,
      right,
      top,
      bottom,
      aspectRatio: (right - left) / (top - bottom),
    };
    const id = `frustum-${near}-${far}-${left}-${right}-${top}-${bottom}`;
    this._frusta.set(id, frustum);
    this._planes.set(id, this.extractPlanes(frustum));
    this._corners.set(id, this._calculateCorners(frustum));
    this._history.push({ type: 'createFrustum', frustum, result: id });
    return frustum;
  }

  orthographicFrustum(width: number, height: number, near: number, far: number): Frustum {
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    const frustum = this.createFrustum(near, far, -halfWidth, halfWidth, halfHeight, -halfHeight);
    this._projectionType = 'orthographic';
    this._history.push({ type: 'orthographicFrustum', width, height, near, far, result: frustum });
    return frustum;
  }

  perspectiveFrustum(fov: number, aspect: number, near: number, far: number): Frustum {
    const halfHeight = near * Math.tan(fov * Math.PI / 180 / 2);
    const halfWidth = halfHeight * aspect;
    const frustum = this.createFrustum(near, far, -halfWidth, halfWidth, halfHeight, -halfHeight);
    this._projectionType = 'perspective';
    this._history.push({ type: 'perspectiveFrustum', fov, aspect, near, far, result: frustum });
    return frustum;
  }

  clipPoint(point: Point): boolean {
    const planes = this._planes.get('current') || [];
    for (const plane of planes) {
      const [a, b, c, d] = plane.equation;
      const distance = a * point.x + b * point.y + c * point.z + d;
      if (distance < 0) {
        this._history.push({ type: 'clipPoint', point, result: false });
        return false;
      }
    }
    this._history.push({ type: 'clipPoint', point, result: true });
    return true;
  }

  clipLine(line: Line): Point[] {
    const result: Point[] = [];
    const startInside = this.clipPoint(line.start);
    const endInside = this.clipPoint(line.end);

    if (startInside && endInside) {
      result.push(line.start, line.end);
    } else if (startInside || endInside) {
      const planes = this._planes.get('current') || [];
      for (const plane of planes) {
        const intersection = this._linePlaneIntersection(line, plane);
        if (intersection) {
          if (startInside) result.push(line.start, intersection);
          else result.push(intersection, line.end);
          break;
        }
      }
    }

    this._history.push({ type: 'clipLine', line, result });
    return result;
  }

  frustumCull(boundingBox: BoundingBox): boolean {
    const corners = [
      boundingBox.min,
      { x: boundingBox.max.x, y: boundingBox.min.y, z: boundingBox.min.z },
      { x: boundingBox.min.x, y: boundingBox.max.y, z: boundingBox.min.z },
      { x: boundingBox.max.x, y: boundingBox.max.y, z: boundingBox.min.z },
      { x: boundingBox.min.x, y: boundingBox.min.y, z: boundingBox.max.z },
      { x: boundingBox.max.x, y: boundingBox.min.y, z: boundingBox.max.z },
      { x: boundingBox.min.x, y: boundingBox.max.y, z: boundingBox.max.z },
      boundingBox.max,
    ];

    const planes = this._planes.get('current') || [];
    for (const plane of planes) {
      let allOutside = true;
      for (const corner of corners) {
        const [a, b, c, d] = plane.equation;
        const distance = a * corner.x + b * corner.y + c * corner.z + d;
        if (distance >= 0) {
          allOutside = false;
          break;
        }
      }
      if (allOutside) {
        this._history.push({ type: 'frustumCull', boundingBox, result: false });
        return false;
      }
    }

    this._history.push({ type: 'frustumCull', boundingBox, result: true });
    return true;
  }

  extractPlanes(frustum?: Frustum): ClippingPlane[] {
    const f = frustum || this._frusta.values().next().value;
    if (!f) return [];

    const planes: ClippingPlane[] = [
      { equation: [0, 0, -1, -f.near], type: 'near' },
      { equation: [0, 0, 1, f.far], type: 'far' },
      { equation: [f.far + f.near, 0, f.right + f.left, 0], type: 'left' },
      { equation: [-f.far - f.near, 0, f.right + f.left, 0], type: 'right' },
      { equation: [0, f.far + f.near, f.top + f.bottom, 0], type: 'bottom' },
      { equation: [0, -f.far - f.near, f.top + f.bottom, 0], type: 'top' },
    ];

    this._history.push({ type: 'extractPlanes', frustum: f, result: planes });
    return planes;
  }

  getCorner(cornerName: keyof FrustumCorner): Point | undefined {
    const corners = this._corners.get('current');
    return corners?.[cornerName];
  }

  private _calculateCorners(frustum: Frustum): FrustumCorner {
    return {
      nearTopLeft: { x: frustum.left, y: frustum.top, z: -frustum.near },
      nearTopRight: { x: frustum.right, y: frustum.top, z: -frustum.near },
      nearBottomLeft: { x: frustum.left, y: frustum.bottom, z: -frustum.near },
      nearBottomRight: { x: frustum.right, y: frustum.bottom, z: -frustum.near },
      farTopLeft: { x: frustum.left * frustum.far / frustum.near, y: frustum.top * frustum.far / frustum.near, z: -frustum.far },
      farTopRight: { x: frustum.right * frustum.far / frustum.near, y: frustum.top * frustum.far / frustum.near, z: -frustum.far },
      farBottomLeft: { x: frustum.left * frustum.far / frustum.near, y: frustum.bottom * frustum.far / frustum.near, z: -frustum.far },
      farBottomRight: { x: frustum.right * frustum.far / frustum.near, y: frustum.bottom * frustum.far / frustum.near, z: -frustum.far },
    };
  }

  private _linePlaneIntersection(line: Line, plane: ClippingPlane): Point | null {
    const [a, b, c, d] = plane.equation;
    const direction: Vector = {
      dx: line.end.x - line.start.x,
      dy: line.end.y - line.start.y,
      dz: line.end.z - line.start.z,
    };

    const denominator = a * direction.dx + b * direction.dy + c * direction.dz;
    if (Math.abs(denominator) < 1e-6) return null;

    const numerator = -(a * line.start.x + b * line.start.y + c * line.start.z + d);
    const t = numerator / denominator;

    if (t < 0 || t > 1) return null;

    return {
      x: line.start.x + t * direction.dx,
      y: line.start.y + t * direction.dy,
      z: line.start.z + t * direction.dz,
    };
  }

  toPacket(): DataPacket<{
    frusta: Map<string, Frustum>;
    planes: Map<string, ClippingPlane[]>;
    corners: Map<string, FrustumCorner>;
    projectionType: 'orthographic' | 'perspective';
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['perspective_system', 'ViewingFrustum'],
      priority: 1,
      phase: 'frustum_analysis',
    };
    return {
      id: `frustum-${Date.now().toString(36)}`,
      payload: {
        frusta: this._frusta,
        planes: this._planes,
        corners: this._corners,
        projectionType: this._projectionType,
      },
      metadata,
    };
  }

  reset(): void {
    this._frusta = new Map();
    this._planes = new Map();
    this._corners = new Map();
    this._history = [];
    this._projectionType = 'perspective';
  }
}

import { DataPacket, PacketMeta } from '../shared/types';
import { Point, Vector } from '../affine_geometry/AffineSpace';
import { HomogeneousPoint } from './ProjectivePlane';

export interface Camera {
  position: Point;
  lookAt: Point;
  up: Vector;
  focalLength: number;
}

export interface ProjectionPlane {
  position: Point;
  normal: Vector;
  width: number;
  height: number;
}

export interface PerspectivePoint {
  worldPoint: Point;
  projectedPoint: Point;
  depth: number;
  vanishingPoint: Point | null;
}

export class PerspectiveProjection {
  private _cameras: Map<string, Camera> = new Map();
  private _planes: Map<string, ProjectionPlane> = new Map();
  private _projections: Map<string, PerspectivePoint[]> = new Map();
  private _history: string[] = [];
  private _vanishingPoints: Map<string, Point> = new Map();
  private _counter = 0;

  get cameras(): Map<string, Camera> {
    return new Map(this._cameras);
  }

  get planes(): Map<string, ProjectionPlane> {
    return new Map(this._planes);
  }

  get projections(): Map<string, PerspectivePoint[]> {
    return new Map(this._projections);
  }

  get history(): string[] {
    return [...this._history];
  }

  get vanishingPoints(): Map<string, Point> {
    return new Map(this._vanishingPoints);
  }

  setCamera(position: Point, lookAt: Point, up: Vector): string {
    const camera: Camera = {
      position: { ...position },
      lookAt: { ...lookAt },
      up: { ...up },
      focalLength: 1,
    };

    const id = `cam-${(++this._counter).toString(36)}-${Date.now().toString(36)}`;
    this._cameras.set(id, camera);
    this._history.push(`Set camera ${id}`);
    return id;
  }

  setProjectionPlane(position: Point, normal: Vector): string {
    const plane: ProjectionPlane = {
      position: { ...position },
      normal: { ...normal },
      width: 1,
      height: 1,
    };

    const id = `proj-${(++this._counter).toString(36)}-${Date.now().toString(36)}`;
    this._planes.set(id, plane);
    this._history.push(`Set projection plane ${id}`);
    return id;
  }

  project(point: Point): PerspectivePoint {
    const camera = this._getActiveCamera();
    if (!camera) {
      throw new Error('No camera set');
    }

    const direction: Vector = {
      dx: point.x - camera.position.x,
      dy: point.y - camera.position.y,
      dz: point.z - camera.position.z,
    };

    const distance = Math.sqrt(direction.dx ** 2 + direction.dy ** 2 + direction.dz ** 2);
    const ndc = {
      dx: direction.dx / distance,
      dy: direction.dy / distance,
      dz: direction.dz / distance,
    };

    const depth = ndc.dz;
    const projectedPoint: Point = {
      x: ndc.dx / depth,
      y: ndc.dy / depth,
      z: 0,
    };

    return {
      worldPoint: { ...point },
      projectedPoint,
      depth,
      vanishingPoint: null,
    };
  }

  projectLine(line: Point[]): PerspectivePoint[] {
    return line.map(point => this.project(point));
  }

  findVanishingPoint(direction: Vector): Point {
    const camera = this._getActiveCamera();
    if (!camera) {
      throw new Error('No camera set');
    }

    const mag = Math.sqrt(direction.dx ** 2 + direction.dy ** 2 + direction.dz ** 2);
    if (mag === 0) {
      return { x: 0, y: 0, z: 0 };
    }

    const nd = {
      dx: direction.dx / mag,
      dy: direction.dy / mag,
      dz: direction.dz / mag,
    };

    const vanishingPoint: Point = {
      x: camera.position.x + nd.dx * 1000,
      y: camera.position.y + nd.dy * 1000,
      z: camera.position.z + nd.dz * 1000,
    };

    const id = `vp-${(++this._counter).toString(36)}`;
    this._vanishingPoints.set(id, vanishingPoint);
    return vanishingPoint;
  }

  perspectiveCorrect(texture: number[][], depth: number[][]): number[][] {
    const corrected: number[][] = [];

    for (let y = 0; y < texture.length; y++) {
      corrected[y] = [];
      for (let x = 0; x < texture[y].length; x++) {
        const d = depth[y][x] || 1;
        corrected[y][x] = texture[y][x] / d;
      }
    }

    return corrected;
  }

  frustumCull(object: Point[]): boolean {
    const camera = this._getActiveCamera();
    if (!camera) return true;

    const viewDir: Vector = {
      dx: camera.lookAt.x - camera.position.x,
      dy: camera.lookAt.y - camera.position.y,
      dz: camera.lookAt.z - camera.position.z,
    };

    const mag = Math.sqrt(viewDir.dx ** 2 + viewDir.dy ** 2 + viewDir.dz ** 2);
    const nd = {
      dx: viewDir.dx / mag,
      dy: viewDir.dy / mag,
      dz: viewDir.dz / mag,
    };

    let allBehind = true;
    for (const point of object) {
      const objDir: Vector = {
        dx: point.x - camera.position.x,
        dy: point.y - camera.position.y,
        dz: point.z - camera.position.z,
      };
      const dot = objDir.dx * nd.dx + objDir.dy * nd.dy + objDir.dz * nd.dz;
      if (dot > 0) {
        allBehind = false;
        break;
      }
    }

    return !allBehind;
  }

  depthOfField(focusDistance: number, aperture: number): number[][] {
    const samples = 10;
    const result: number[][] = [];

    for (let i = 0; i < samples; i++) {
      result[i] = [];
      for (let j = 0; j < samples; j++) {
        const dx = (i / samples - 0.5) * aperture;
        const dy = (j / samples - 0.5) * aperture;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const blur = Math.abs(distance - focusDistance) * 0.1;
        result[i][j] = blur;
      }
    }

    return result;
  }

  getProjectionMatrix(): number[][] {
    const camera = this._getActiveCamera();
    if (!camera) {
      return [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];
    }

    const viewDir: Vector = {
      dx: camera.lookAt.x - camera.position.x,
      dy: camera.lookAt.y - camera.position.y,
      dz: camera.lookAt.z - camera.position.z,
    };

    const mag = Math.sqrt(viewDir.dx ** 2 + viewDir.dy ** 2 + viewDir.dz ** 2);
    const zAxis = {
      dx: viewDir.dx / mag,
      dy: viewDir.dy / mag,
      dz: viewDir.dz / mag,
    };

    const xAxis = this._cross(zAxis, camera.up);
    const xMag = Math.sqrt(xAxis.dx ** 2 + xAxis.dy ** 2 + xAxis.dz ** 2);
    const normalizedX = {
      dx: xAxis.dx / xMag,
      dy: xAxis.dy / xMag,
      dz: xAxis.dz / xMag,
    };

    const yAxis = this._cross(zAxis, normalizedX);

    return [
      [normalizedX.dx, normalizedX.dy, normalizedX.dz, -this._dot(normalizedX, camera.position)],
      [yAxis.dx, yAxis.dy, yAxis.dz, -this._dot(yAxis, camera.position)],
      [zAxis.dx, zAxis.dy, zAxis.dz, -this._dot(zAxis, camera.position)],
      [0, 0, 0, 1],
    ];
  }

  toPacket(): DataPacket<{
    cameras: Array<{ id: string; camera: Camera }>;
    planes: Array<{ id: string; plane: ProjectionPlane }>;
    projections: Array<{ id: string; points: PerspectivePoint[] }>;
    vanishingPoints: Array<{ id: string; point: Point }>;
    history: string[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['perspective-projection'],
      priority: 1,
      phase: 'geometry',
    };

    return {
      id: `persp-${Date.now().toString(36)}`,
      payload: {
        cameras: Array.from(this._cameras.entries()).map(([id, c]) => ({ id, camera: c })),
        planes: Array.from(this._planes.entries()).map(([id, p]) => ({ id, plane: p })),
        projections: Array.from(this._projections.entries()).map(([id, pp]) => ({ id, points: pp })),
        vanishingPoints: Array.from(this._vanishingPoints.entries()).map(([id, vp]) => ({ id, point: vp })),
        history: this._history,
      },
      metadata,
    };
  }

  reset(): void {
    this._cameras.clear();
    this._planes.clear();
    this._projections.clear();
    this._history = [];
    this._vanishingPoints.clear();
    this._counter = 0;
  }

  private _getActiveCamera(): Camera | null {
    return this._cameras.size > 0 ? Array.from(this._cameras.values()).pop() || null : null;
  }

  private _cross(a: Vector, b: Vector): Vector {
    return {
      dx: a.dy * b.dz - a.dz * b.dy,
      dy: a.dz * b.dx - a.dx * b.dz,
      dz: a.dx * b.dy - a.dy * b.dx,
    };
  }

  private _dot(a: Vector, b: Point): number {
    return a.dx * b.x + a.dy * b.y + a.dz * b.z;
  }
}
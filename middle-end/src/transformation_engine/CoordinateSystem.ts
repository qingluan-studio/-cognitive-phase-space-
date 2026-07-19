import { DataPacket, PacketMeta } from '../shared/types';
import { Point, Vector } from '../affine_geometry/AffineSpace';

export interface CoordinateSystem {
  name: string;
  origin: Point;
  axes: Vector[];
  type: 'cartesian' | 'polar' | 'cylindrical' | 'spherical';
}

export interface CoordinateTransformation {
  from: 'cartesian' | 'polar' | 'cylindrical' | 'spherical';
  to: 'cartesian' | 'polar' | 'cylindrical' | 'spherical';
  formula: string;
  inverse: string;
}

export interface PointCoordinate {
  coordinates: number[];
  system: 'cartesian' | 'polar' | 'cylindrical' | 'spherical';
}

export class CoordinateSystem {
  private _systems: Map<string, CoordinateSystem> = new Map();
  private _transformations: Map<string, CoordinateTransformation> = new Map();
  private _points: Map<string, PointCoordinate> = new Map();
  private _history: unknown[] = [];

  createSystem(type: CoordinateSystem['type'], origin: Point, axes: Vector[]): CoordinateSystem {
    const system: CoordinateSystem = { name: `${type}-${Date.now()}`, origin, axes, type };
    this._systems.set(system.name, system);
    this._history.push({ type: 'createSystem', system });
    return system;
  }

  cartesianToPolar(point: Point): PointCoordinate {
    const r = Math.sqrt(point.x ** 2 + point.y ** 2);
    const theta = Math.atan2(point.y, point.x) * 180 / Math.PI;
    const result: PointCoordinate = { coordinates: [r, theta, point.z], system: 'polar' };
    this._points.set(`polar-${point.x}-${point.y}-${point.z}`, result);
    this._history.push({ type: 'cartesianToPolar', point, result });
    return result;
  }

  polarToCartesian(point: PointCoordinate): Point {
    if (point.system !== 'polar') return { x: 0, y: 0, z: 0 };
    const [r, theta, z] = point.coordinates;
    const rad = theta * Math.PI / 180;
    const result: Point = { x: r * Math.cos(rad), y: r * Math.sin(rad), z: z || 0 };
    this._history.push({ type: 'polarToCartesian', point, result });
    return result;
  }

  cartesianToCylindrical(point: Point): PointCoordinate {
    const r = Math.sqrt(point.x ** 2 + point.y ** 2);
    const theta = Math.atan2(point.y, point.x) * 180 / Math.PI;
    const result: PointCoordinate = { coordinates: [r, theta, point.z], system: 'cylindrical' };
    this._points.set(`cylindrical-${point.x}-${point.y}-${point.z}`, result);
    this._history.push({ type: 'cartesianToCylindrical', point, result });
    return result;
  }

  cylindricalToCartesian(point: PointCoordinate): Point {
    if (point.system !== 'cylindrical') return { x: 0, y: 0, z: 0 };
    const [r, theta, z] = point.coordinates;
    const rad = theta * Math.PI / 180;
    const result: Point = { x: r * Math.cos(rad), y: r * Math.sin(rad), z: z };
    this._history.push({ type: 'cylindricalToCartesian', point, result });
    return result;
  }

  cartesianToSpherical(point: Point): PointCoordinate {
    const r = Math.sqrt(point.x ** 2 + point.y ** 2 + point.z ** 2);
    const theta = Math.atan2(point.y, point.x) * 180 / Math.PI;
    const phi = Math.acos(point.z / r) * 180 / Math.PI;
    const result: PointCoordinate = { coordinates: [r, theta, phi], system: 'spherical' };
    this._points.set(`spherical-${point.x}-${point.y}-${point.z}`, result);
    this._history.push({ type: 'cartesianToSpherical', point, result });
    return result;
  }

  sphericalToCartesian(point: PointCoordinate): Point {
    if (point.system !== 'spherical') return { x: 0, y: 0, z: 0 };
    const [r, theta, phi] = point.coordinates;
    const thetaRad = theta * Math.PI / 180;
    const phiRad = phi * Math.PI / 180;
    const result: Point = {
      x: r * Math.sin(phiRad) * Math.cos(thetaRad),
      y: r * Math.sin(phiRad) * Math.sin(thetaRad),
      z: r * Math.cos(phiRad),
    };
    this._history.push({ type: 'sphericalToCartesian', point, result });
    return result;
  }

  transform(point: Point, from: CoordinateSystem['type'], to: CoordinateSystem['type']): Point {
    let cartesian = point;

    if (from !== 'cartesian') {
      const coord: PointCoordinate = { coordinates: [point.x, point.y, point.z], system: from };
      switch (from) {
        case 'polar':
          cartesian = this.polarToCartesian(coord);
          break;
        case 'cylindrical':
          cartesian = this.cylindricalToCartesian(coord);
          break;
        case 'spherical':
          cartesian = this.sphericalToCartesian(coord);
          break;
      }
    }

    if (to === 'cartesian') {
      this._history.push({ type: 'transform', point, from, to, result: cartesian });
      return cartesian;
    }

    switch (to) {
      case 'polar': {
        const polar = this.cartesianToPolar(cartesian);
        return { x: polar.coordinates[0], y: polar.coordinates[1], z: polar.coordinates[2] };
      }
      case 'cylindrical': {
        const cylindrical = this.cartesianToCylindrical(cartesian);
        return { x: cylindrical.coordinates[0], y: cylindrical.coordinates[1], z: cylindrical.coordinates[2] };
      }
      case 'spherical': {
        const spherical = this.cartesianToSpherical(cartesian);
        return { x: spherical.coordinates[0], y: spherical.coordinates[1], z: spherical.coordinates[2] };
      }
      default:
        return cartesian;
    }
  }

  changeBasis(point: Point, oldBasis: Vector[], newBasis: Vector[]): Point {
    const oldMatrix: number[][] = [
      [oldBasis[0].dx, oldBasis[1].dx, oldBasis[2].dx],
      [oldBasis[0].dy, oldBasis[1].dy, oldBasis[2].dy],
      [oldBasis[0].dz, oldBasis[1].dz, oldBasis[2].dz],
    ];

    const newMatrix: number[][] = [
      [newBasis[0].dx, newBasis[1].dx, newBasis[2].dx],
      [newBasis[0].dy, newBasis[1].dy, newBasis[2].dy],
      [newBasis[0].dz, newBasis[1].dz, newBasis[2].dz],
    ];

    const det = oldMatrix[0][0] * (oldMatrix[1][1] * oldMatrix[2][2] - oldMatrix[1][2] * oldMatrix[2][1]) -
                oldMatrix[0][1] * (oldMatrix[1][0] * oldMatrix[2][2] - oldMatrix[1][2] * oldMatrix[2][0]) +
                oldMatrix[0][2] * (oldMatrix[1][0] * oldMatrix[2][1] - oldMatrix[1][1] * oldMatrix[2][0]);

    if (Math.abs(det) < 1e-10) return point;

    const invOld: number[][] = [
      [(oldMatrix[1][1] * oldMatrix[2][2] - oldMatrix[1][2] * oldMatrix[2][1]) / det,
       (oldMatrix[0][2] * oldMatrix[2][1] - oldMatrix[0][1] * oldMatrix[2][2]) / det,
       (oldMatrix[0][1] * oldMatrix[1][2] - oldMatrix[0][2] * oldMatrix[1][1]) / det],
      [(oldMatrix[1][2] * oldMatrix[2][0] - oldMatrix[1][0] * oldMatrix[2][2]) / det,
       (oldMatrix[0][0] * oldMatrix[2][2] - oldMatrix[0][2] * oldMatrix[2][0]) / det,
       (oldMatrix[0][2] * oldMatrix[1][0] - oldMatrix[0][0] * oldMatrix[1][2]) / det],
      [(oldMatrix[1][0] * oldMatrix[2][1] - oldMatrix[1][1] * oldMatrix[2][0]) / det,
       (oldMatrix[0][1] * oldMatrix[2][0] - oldMatrix[0][0] * oldMatrix[2][1]) / det,
       (oldMatrix[0][0] * oldMatrix[1][1] - oldMatrix[0][1] * oldMatrix[1][0]) / det],
    ];

    const transform: number[][] = [
      [newMatrix[0][0] * invOld[0][0] + newMatrix[0][1] * invOld[1][0] + newMatrix[0][2] * invOld[2][0],
       newMatrix[0][0] * invOld[0][1] + newMatrix[0][1] * invOld[1][1] + newMatrix[0][2] * invOld[2][1],
       newMatrix[0][0] * invOld[0][2] + newMatrix[0][1] * invOld[1][2] + newMatrix[0][2] * invOld[2][2]],
      [newMatrix[1][0] * invOld[0][0] + newMatrix[1][1] * invOld[1][0] + newMatrix[1][2] * invOld[2][0],
       newMatrix[1][0] * invOld[0][1] + newMatrix[1][1] * invOld[1][1] + newMatrix[1][2] * invOld[2][1],
       newMatrix[1][0] * invOld[0][2] + newMatrix[1][1] * invOld[1][2] + newMatrix[1][2] * invOld[2][2]],
      [newMatrix[2][0] * invOld[0][0] + newMatrix[2][1] * invOld[1][0] + newMatrix[2][2] * invOld[2][0],
       newMatrix[2][0] * invOld[0][1] + newMatrix[2][1] * invOld[1][1] + newMatrix[2][2] * invOld[2][1],
       newMatrix[2][0] * invOld[0][2] + newMatrix[2][1] * invOld[1][2] + newMatrix[2][2] * invOld[2][2]],
    ];

    const result: Point = {
      x: transform[0][0] * point.x + transform[0][1] * point.y + transform[0][2] * point.z,
      y: transform[1][0] * point.x + transform[1][1] * point.y + transform[1][2] * point.z,
      z: transform[2][0] * point.x + transform[2][1] * point.y + transform[2][2] * point.z,
    };

    this._history.push({ type: 'changeBasis', point, oldBasis, newBasis, result });
    return result;
  }

  getSystem(name: string): CoordinateSystem | undefined {
    return this._systems.get(name);
  }

  toPacket(): DataPacket<{
    systems: Map<string, CoordinateSystem>;
    transformations: Map<string, CoordinateTransformation>;
    points: Map<string, PointCoordinate>;
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['transformation_engine', 'CoordinateSystem'],
      priority: 1,
      phase: 'coordinate_transform',
    };
    return {
      id: `coordsys-${Date.now().toString(36)}`,
      payload: {
        systems: this._systems,
        transformations: this._transformations,
        points: this._points,
      },
      metadata,
    };
  }

  reset(): void {
    this._systems = new Map();
    this._transformations = new Map();
    this._points = new Map();
    this._history = [];
  }
}

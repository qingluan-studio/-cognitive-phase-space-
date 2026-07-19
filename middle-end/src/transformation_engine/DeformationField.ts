import { DataPacket, PacketMeta } from '../shared/types';
import { Point, Vector } from '../affine_geometry/AffineSpace';

export interface FieldPoint {
  id: string;
  position: Point;
  displacement: Vector;
  force: Vector;
}

export type DeformationType = 'rigid' | 'elastic' | 'plastic' | 'viscous' | 'fluid';

export interface FieldBoundary {
  type: 'fixed' | 'free' | 'periodic' | 'symmetric';
  value: number;
}

export class DeformationField {
  private _points: Map<string, FieldPoint> = new Map();
  private _type: DeformationType = 'elastic';
  private _boundaries: Map<string, FieldBoundary> = new Map();
  private _history: unknown[] = [];
  private _fieldStrength = 1;

  setFieldType(type: DeformationType): void {
    this._type = type;
    this._history.push({ type: 'setFieldType', value: type });
  }

  addFieldPoint(position: Point, displacement: Vector): FieldPoint {
    const id = `fp-${position.x}-${position.y}-${position.z}`;
    const point: FieldPoint = {
      id,
      position,
      displacement,
      force: { dx: 0, dy: 0, dz: 0 },
    };
    this._points.set(id, point);
    this._history.push({ type: 'addFieldPoint', position, displacement });
    return point;
  }

  applyForce(pointId: string, force: Vector): void {
    const point = this._points.get(pointId);
    if (point) {
      point.force = {
        dx: point.force.dx + force.dx,
        dy: point.force.dy + force.dy,
        dz: point.force.dz + force.dz,
      };
      this._points.set(pointId, point);
      this._history.push({ type: 'applyForce', pointId, force });
    }
  }

  updateField(deltaTime: number): void {
    for (const point of this._points.values()) {
      const mass = 1;
      const acceleration: Vector = {
        dx: point.force.dx / mass,
        dy: point.force.dy / mass,
        dz: point.force.dz / mass,
      };

      point.displacement = {
        dx: point.displacement.dx + acceleration.dx * deltaTime,
        dy: point.displacement.dy + acceleration.dy * deltaTime,
        dz: point.displacement.dz + acceleration.dz * deltaTime,
      };

      point.position = {
        x: point.position.x + point.displacement.dx * deltaTime,
        y: point.position.y + point.displacement.dy * deltaTime,
        z: point.position.z + point.displacement.dz * deltaTime,
      };

      if (this._type === 'elastic') {
        point.force = {
          dx: -0.1 * point.displacement.dx,
          dy: -0.1 * point.displacement.dy,
          dz: -0.1 * point.displacement.dz,
        };
      } else if (this._type === 'viscous') {
        point.force = {
          dx: -0.05 * point.displacement.dx,
          dy: -0.05 * point.displacement.dy,
          dz: -0.05 * point.displacement.dz,
        };
      }

      this._points.set(point.id, point);
    }

    this._history.push({ type: 'updateField', deltaTime, type: this._type });
  }

  rigidBodyTransform(object: { vertices: Point[]; rotation: Vector; translation: Vector }): Point[] {
    const angle = Math.sqrt(object.rotation.dx ** 2 + object.rotation.dy ** 2 + object.rotation.dz ** 2);
    const axis: Vector = {
      dx: object.rotation.dx / angle,
      dy: object.rotation.dy / angle,
      dz: object.rotation.dz / angle,
    };

    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    const result: Point[] = [];
    for (const vertex of object.vertices) {
      const x = vertex.x * cos + (1 - cos) * (axis.dx * axis.dx * vertex.x + axis.dx * axis.dy * vertex.y + axis.dx * axis.dz * vertex.z) + sin * (-axis.dz * vertex.y + axis.dy * vertex.z);
      const y = vertex.y * cos + (1 - cos) * (axis.dx * axis.dy * vertex.x + axis.dy * axis.dy * vertex.y + axis.dy * axis.dz * vertex.z) + sin * (axis.dz * vertex.x - axis.dx * vertex.z);
      const z = vertex.z * cos + (1 - cos) * (axis.dx * axis.dz * vertex.x + axis.dy * axis.dz * vertex.y + axis.dz * axis.dz * vertex.z) + sin * (-axis.dy * vertex.x + axis.dx * vertex.y);

      result.push({
        x: x + object.translation.dx,
        y: y + object.translation.dy,
        z: z + object.translation.dz,
      });
    }

    this._history.push({ type: 'rigidBodyTransform', object, result });
    return result;
  }

  elasticDeformation(object: { vertices: Point[] }, force: Vector): Point[] {
    const stiffness = 0.1;
    const result: Point[] = [];

    for (const vertex of object.vertices) {
      const dist = Math.sqrt(vertex.x ** 2 + vertex.y ** 2 + vertex.z ** 2);
      const factor = Math.exp(-dist * 0.5) * stiffness;

      result.push({
        x: vertex.x + force.dx * factor,
        y: vertex.y + force.dy * factor,
        z: vertex.z + force.dz * factor,
      });
    }

    this._history.push({ type: 'elasticDeformation', object, force, result });
    return result;
  }

  plasticDeformation(object: { vertices: Point[] }, stress: number): Point[] {
    const yieldStrength = 1.0;
    const plasticStrain = Math.max(0, stress - yieldStrength) * 0.01;

    const result: Point[] = [];
    for (const vertex of object.vertices) {
      const dist = Math.sqrt(vertex.x ** 2 + vertex.y ** 2 + vertex.z ** 2);
      const direction: Vector = {
        dx: vertex.x / dist,
        dy: vertex.y / dist,
        dz: vertex.z / dist,
      };

      result.push({
        x: vertex.x + direction.dx * plasticStrain * dist,
        y: vertex.y + direction.dy * plasticStrain * dist,
        z: vertex.z + direction.dz * plasticStrain * dist,
      });
    }

    this._history.push({ type: 'plasticDeformation', object, stress, result });
    return result;
  }

  viscousFlow(object: { vertices: Point[] }, velocity: Vector): Point[] {
    const viscosity = 0.01;
    const result: Point[] = [];

    for (const vertex of object.vertices) {
      const dist = Math.sqrt(vertex.x ** 2 + vertex.y ** 2);
      const damping = Math.exp(-dist * viscosity);

      result.push({
        x: vertex.x + velocity.dx * damping,
        y: vertex.y + velocity.dy * damping,
        z: vertex.z + velocity.dz * damping,
      });
    }

    this._history.push({ type: 'viscousFlow', object, velocity, result });
    return result;
  }

  fluidDynamics(object: { vertices: Point[] }, pressure: number): Point[] {
    const result: Point[] = [];

    for (const vertex of object.vertices) {
      const dist = Math.sqrt(vertex.x ** 2 + vertex.y ** 2 + vertex.z ** 2);
      const pressureGradient: Vector = {
        dx: -vertex.x / dist * pressure * 0.01,
        dy: -vertex.y / dist * pressure * 0.01,
        dz: -vertex.z / dist * pressure * 0.01,
      };

      result.push({
        x: vertex.x + pressureGradient.dx,
        y: vertex.y + pressureGradient.dy,
        z: vertex.z + pressureGradient.dz,
      });
    }

    this._history.push({ type: 'fluidDynamics', object, pressure, result });
    return result;
  }

  getFieldPoint(id: string): FieldPoint | undefined {
    return this._points.get(id);
  }

  toPacket(): DataPacket<{
    points: Map<string, FieldPoint>;
    type: DeformationType;
    boundaries: Map<string, FieldBoundary>;
    fieldStrength: number;
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['transformation_engine', 'DeformationField'],
      priority: 1,
      phase: 'deformation',
    };
    return {
      id: `deform-${Date.now().toString(36)}`,
      payload: {
        points: this._points,
        type: this._type,
        boundaries: this._boundaries,
        fieldStrength: this._fieldStrength,
      },
      metadata,
    };
  }

  reset(): void {
    this._points = new Map();
    this._type = 'elastic';
    this._boundaries = new Map();
    this._history = [];
    this._fieldStrength = 1;
  }
}

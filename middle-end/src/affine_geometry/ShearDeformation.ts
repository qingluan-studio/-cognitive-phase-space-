import { DataPacket, PacketMeta } from '../shared/types';
import { Point, Vector } from './AffineSpace';

export interface ShearState {
  angle: number;
  amount: number;
  axis: Vector;
  originalShape: Point[];
  deformedShape: Point[];
}

export interface DeformationField {
  points: Map<string, Point>;
  displacement: Map<string, Vector>;
  strain: number;
}

export class ShearDeformation {
  private _states: Map<string, ShearState> = new Map();
  private _fields: Map<string, DeformationField> = new Map();
  private _history: string[] = [];
  private _currentShear: number = 0;
  private _strainEnergy: number = 0;
  private _counter = 0;

  get states(): Map<string, ShearState> {
    return new Map(this._states);
  }

  get fields(): Map<string, DeformationField> {
    return new Map(this._fields);
  }

  get history(): string[] {
    return [...this._history];
  }

  get currentShear(): number {
    return this._currentShear;
  }

  get strainEnergy(): number {
    return this._strainEnergy;
  }

  applyShear(shape: Point[], angle: number, axis: Vector): string {
    const mag = Math.sqrt(axis.dx ** 2 + axis.dy ** 2 + axis.dz ** 2);
    if (mag === 0) {
      throw new Error('Axis vector cannot be zero');
    }

    const nx = axis.dx / mag;
    const ny = axis.dy / mag;
    const nz = axis.dz / mag;

    const deformedShape = shape.map(point => {
      const projection = nx * point.x + ny * point.y + nz * point.z;
      return {
        x: point.x + angle * nx * projection,
        y: point.y + angle * ny * projection,
        z: point.z + angle * nz * projection,
      };
    });

    const shearState: ShearState = {
      angle,
      amount: Math.abs(angle),
      axis: { ...axis },
      originalShape: shape.map(p => ({ ...p })),
      deformedShape: deformedShape.map(p => ({ ...p })),
    };

    const id = `shear-${(++this._counter).toString(36)}-${Date.now().toString(36)}`;
    this._states.set(id, shearState);
    this._currentShear = angle;
    this._strainEnergy += this.calculateStrainEnergy(shape);
    this._history.push(`Applied shear ${id} with angle ${angle}`);
    return id;
  }

  progressiveShear(shape: Point[], angles: number[]): string[] {
    const results: string[] = [];
    let currentShape = shape.map(p => ({ ...p }));

    angles.forEach(angle => {
      const id = this.applyShear(currentShape, angle, { dx: 1, dy: 0, dz: 0 });
      results.push(id);
      const state = this._states.get(id);
      if (state) {
        currentShape = state.deformedShape.map(p => ({ ...p }));
      }
    });

    return results;
  }

  calculateStrainEnergy(shape: Point[]): number {
    if (shape.length < 2) return 0;

    let totalEnergy = 0;
    for (let i = 0; i < shape.length - 1; i++) {
      for (let j = i + 1; j < shape.length; j++) {
        const dx = shape[j].x - shape[i].x;
        const dy = shape[j].y - shape[i].y;
        const dz = shape[j].z - shape[i].z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        totalEnergy += distance * distance * 0.5;
      }
    }

    return totalEnergy;
  }

  recoverOriginal(deformedShape: Point[]): Point[] {
    return deformedShape.map(point => ({ ...point }));
  }

  shearAngle(original: Point[], deformed: Point[]): number {
    if (original.length !== deformed.length || original.length < 2) {
      return 0;
    }

    const v1Original: Vector = {
      dx: original[1].x - original[0].x,
      dy: original[1].y - original[0].y,
      dz: original[1].z - original[0].z,
    };
    const v1Deformed: Vector = {
      dx: deformed[1].x - deformed[0].x,
      dy: deformed[1].y - deformed[0].y,
      dz: deformed[1].z - deformed[0].z,
    };

    const dot = v1Original.dx * v1Deformed.dx + v1Original.dy * v1Deformed.dy + v1Original.dz * v1Deformed.dz;
    const mag1 = Math.sqrt(v1Original.dx ** 2 + v1Original.dy ** 2 + v1Original.dz ** 2);
    const mag2 = Math.sqrt(v1Deformed.dx ** 2 + v1Deformed.dy ** 2 + v1Deformed.dz ** 2);

    if (mag1 === 0 || mag2 === 0) return 0;

    const cosTheta = dot / (mag1 * mag2);
    return Math.acos(Math.max(-1, Math.min(1, cosTheta)));
  }

  elasticLimit(shape: Point[]): number {
    if (shape.length < 3) return Math.PI / 4;

    let minAngle = Math.PI;
    for (let i = 0; i < shape.length; i++) {
      const p1 = shape[i];
      const p2 = shape[(i + 1) % shape.length];
      const p3 = shape[(i + 2) % shape.length];

      const v1: Vector = { dx: p2.x - p1.x, dy: p2.y - p1.y, dz: p2.z - p1.z };
      const v2: Vector = { dx: p3.x - p2.x, dy: p3.y - p2.y, dz: p3.z - p2.z };

      const dot = v1.dx * v2.dx + v1.dy * v2.dy + v1.dz * v2.dz;
      const mag1 = Math.sqrt(v1.dx ** 2 + v1.dy ** 2 + v1.dz ** 2);
      const mag2 = Math.sqrt(v2.dx ** 2 + v2.dy ** 2 + v2.dz ** 2);

      if (mag1 !== 0 && mag2 !== 0) {
        const cosTheta = dot / (mag1 * mag2);
        const angle = Math.acos(Math.max(-1, Math.min(1, cosTheta)));
        minAngle = Math.min(minAngle, angle);
      }
    }

    return minAngle / 2;
  }

  plasticDeformation(shape: Point[], amount: number): Point[] {
    const center: Point = {
      x: shape.reduce((sum, p) => sum + p.x, 0) / shape.length,
      y: shape.reduce((sum, p) => sum + p.y, 0) / shape.length,
      z: shape.reduce((sum, p) => sum + p.z, 0) / shape.length,
    };

    return shape.map(point => ({
      x: center.x + (point.x - center.x) * (1 + amount),
      y: center.y + (point.y - center.y) * (1 - amount * 0.5),
      z: point.z,
    }));
  }

  getDeformationField(shape: Point[]): DeformationField {
    const points = new Map<string, Point>();
    const displacement = new Map<string, Vector>();

    shape.forEach((point, index) => {
      const id = `p-${index}`;
      points.set(id, { ...point });

      const neighborIndex = (index + 1) % shape.length;
      const neighbor = shape[neighborIndex];
      displacement.set(id, {
        dx: neighbor.x - point.x,
        dy: neighbor.y - point.y,
        dz: neighbor.z - point.z,
      });
    });

    const strain = this._calculateStrain(displacement);

    return { points, displacement, strain };
  }

  toPacket(): DataPacket<{
    states: Array<{ id: string; state: ShearState }>;
    fields: Array<{ id: string; field: DeformationField }>;
    currentShear: number;
    strainEnergy: number;
    history: string[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['shear-deformation'],
      priority: 1,
      phase: 'geometry',
    };

    return {
      id: `shear-${Date.now().toString(36)}`,
      payload: {
        states: Array.from(this._states.entries()).map(([id, s]) => ({ id, state: s })),
        fields: Array.from(this._fields.entries()).map(([id, f]) => ({
          id,
          field: {
            points: f.points,
            displacement: f.displacement,
            strain: f.strain,
          },
        })),
        currentShear: this._currentShear,
        strainEnergy: this._strainEnergy,
        history: this._history,
      },
      metadata,
    };
  }

  reset(): void {
    this._states.clear();
    this._fields.clear();
    this._history = [];
    this._currentShear = 0;
    this._strainEnergy = 0;
    this._counter = 0;
  }

  private _calculateStrain(displacement: Map<string, Vector>): number {
    if (displacement.size === 0) return 0;

    let totalMagnitude = 0;
    displacement.forEach(vec => {
      totalMagnitude += Math.sqrt(vec.dx ** 2 + vec.dy ** 2 + vec.dz ** 2);
    });

    return totalMagnitude / displacement.size;
  }
}
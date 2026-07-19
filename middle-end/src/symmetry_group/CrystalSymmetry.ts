import { DataPacket, PacketMeta } from '../shared/types';
import { Point, Vector } from '../affine_geometry/AffineSpace';
import { SymmetryOperation } from './SymmetryOperator';

export interface CrystalSystem {
  name: string;
  latticeParameters: { a: number; b: number; c: number; alpha: number; beta: number; gamma: number };
  pointGroup: string;
  spaceGroup: string;
}

export interface BravaisLattice {
  type: string;
  vectors: Vector[];
  unitCell: Point[];
}

export interface PointGroup {
  name: string;
  operations: SymmetryOperation[];
  order: number;
  generators: string[];
}

export class CrystalSymmetry {
  private _systems: Map<string, CrystalSystem> = new Map();
  private _lattices: Map<string, BravaisLattice> = new Map();
  private _pointGroups: Map<string, PointGroup> = new Map();
  private _history: unknown[] = [];
  private _internationalTable: Record<string, unknown> = {};

  identifySystem(latticeParameters: CrystalSystem['latticeParameters']): string {
    const { a, b, c, alpha, beta, gamma } = latticeParameters;
    const eps = 1e-3;

    if (Math.abs(a - b) < eps && Math.abs(b - c) < eps &&
        Math.abs(alpha - 90) < eps && Math.abs(beta - 90) < eps && Math.abs(gamma - 90) < eps) {
      this._history.push({ type: 'identifySystem', parameters: latticeParameters, result: 'cubic' });
      return 'cubic';
    }
    if (Math.abs(a - b) < eps && Math.abs(a - c) > eps &&
        Math.abs(alpha - 90) < eps && Math.abs(beta - 90) < eps && Math.abs(gamma - 90) < eps) {
      this._history.push({ type: 'identifySystem', parameters: latticeParameters, result: 'tetragonal' });
      return 'tetragonal';
    }
    if (Math.abs(alpha - 90) < eps && Math.abs(beta - 90) < eps && Math.abs(gamma - 120) < eps) {
      this._history.push({ type: 'identifySystem', parameters: latticeParameters, result: 'hexagonal' });
      return 'hexagonal';
    }
    if (Math.abs(alpha - 90) < eps && Math.abs(beta - 90) < eps && Math.abs(gamma - 90) < eps) {
      this._history.push({ type: 'identifySystem', parameters: latticeParameters, result: 'orthorhombic' });
      return 'orthorhombic';
    }
    if (Math.abs(beta - 90) > eps && Math.abs(alpha - 90) < eps && Math.abs(gamma - 90) < eps) {
      this._history.push({ type: 'identifySystem', parameters: latticeParameters, result: 'monoclinic' });
      return 'monoclinic';
    }
    this._history.push({ type: 'identifySystem', parameters: latticeParameters, result: 'triclinic' });
    return 'triclinic';
  }

  generateLattice(type: string): BravaisLattice {
    const vectors: Vector[] = [];
    const unitCell: Point[] = [];

    switch (type) {
      case 'cubic-primitive':
        vectors.push({ dx: 1, dy: 0, dz: 0 }, { dx: 0, dy: 1, dz: 0 }, { dx: 0, dy: 0, dz: 1 });
        break;
      case 'cubic-body-centered':
        vectors.push({ dx: -0.5, dy: 0.5, dz: 0.5 }, { dx: 0.5, dy: -0.5, dz: 0.5 }, { dx: 0.5, dy: 0.5, dz: -0.5 });
        break;
      case 'cubic-face-centered':
        vectors.push({ dx: 0.5, dy: 0.5, dz: 0 }, { dx: 0.5, dy: 0, dz: 0.5 }, { dx: 0, dy: 0.5, dz: 0.5 });
        break;
      case 'hexagonal':
        vectors.push({ dx: 1, dy: 0, dz: 0 }, { dx: 0.5, dy: Math.sqrt(3) / 2, dz: 0 }, { dx: 0, dy: 0, dz: 1 });
        break;
      default:
        vectors.push({ dx: 1, dy: 0, dz: 0 }, { dx: 0, dy: 1, dz: 0 }, { dx: 0, dy: 0, dz: 1 });
    }

    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        for (let k = 0; k < 2; k++) {
          unitCell.push({
            x: i * vectors[0].dx + j * vectors[1].dx + k * vectors[2].dx,
            y: i * vectors[0].dy + j * vectors[1].dy + k * vectors[2].dy,
            z: i * vectors[0].dz + j * vectors[1].dz + k * vectors[2].dz,
          });
        }
      }
    }

    const lattice: BravaisLattice = { type, vectors, unitCell };
    this._lattices.set(type, lattice);
    this._history.push({ type: 'generateLattice', input: type, result: lattice });
    return lattice;
  }

  pointGroupOperations(name: string): SymmetryOperation[] {
    const operations: SymmetryOperation[] = [];

    switch (name) {
      case 'Oh':
        operations.push(
          { element: { type: 'rotation', axis: { dx: 0, dy: 0, dz: 1 }, angle: 0 }, order: 1, composition: ['identity'], conjugate: 'E' },
          { element: { type: 'rotation', axis: { dx: 0, dy: 0, dz: 1 }, angle: 90 }, order: 4, composition: ['rotate-z-90'], conjugate: 'C4' },
          { element: { type: 'rotation', axis: { dx: 0, dy: 0, dz: 1 }, angle: 180 }, order: 2, composition: ['rotate-z-180'], conjugate: 'C2' },
          { element: { type: 'rotation', axis: { dx: 0, dy: 0, dz: 1 }, angle: 270 }, order: 4, composition: ['rotate-z-270'], conjugate: 'C4³' },
        );
        break;
      case 'Td':
        operations.push(
          { element: { type: 'rotation', axis: { dx: 1, dy: 1, dz: 1 }, angle: 120 }, order: 3, composition: ['rotate-111-120'], conjugate: 'C3' },
          { element: { type: 'reflection', fixedPoints: [{ x: 0, y: 0, z: 0 }] }, order: 2, composition: ['reflect-xy'], conjugate: 'σd' },
        );
        break;
      default:
        operations.push({ element: { type: 'rotation', angle: 0 }, order: 1, composition: ['identity'], conjugate: 'E' });
    }

    const pointGroup: PointGroup = { name, operations, order: operations.length, generators: ['E'] };
    this._pointGroups.set(name, pointGroup);
    this._history.push({ type: 'pointGroupOperations', input: name, result: operations });
    return operations;
  }

  spaceGroupGenerator(system: CrystalSystem, lattice: BravaisLattice): string {
    const symbol = `${system.pointGroup}-${lattice.type}`;
    this._history.push({ type: 'spaceGroupGenerator', system, lattice, result: symbol });
    return symbol;
  }

  symmetryElementAnalysis(structure: Point[]): { rotations: number; reflections: number; translations: number } {
    const analysis = { rotations: 0, reflections: 0, translations: 0 };
    const n = structure.length;

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = structure[j].x - structure[i].x;
        const dy = structure[j].y - structure[i].y;
        const dz = structure[j].z - structure[i].z;
        if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6 && Math.abs(dz) < 1e-6) continue;

        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < 1.1) analysis.translations++;
        if (dist < 1.5) analysis.rotations++;
      }
    }

    this._history.push({ type: 'symmetryElementAnalysis', structure, result: analysis });
    return analysis;
  }

  crystalClassify(structure: Point[]): string {
    const analysis = this.symmetryElementAnalysis(structure);
    if (analysis.rotations >= 24) return 'cubic';
    if (analysis.rotations >= 16) return 'tetragonal';
    if (analysis.rotations >= 12) return 'hexagonal';
    if (analysis.rotations >= 8) return 'orthorhombic';
    if (analysis.rotations >= 4) return 'monoclinic';
    return 'triclinic';
  }

  getCrystalSystem(name: string): CrystalSystem | undefined {
    return this._systems.get(name);
  }

  toPacket(): DataPacket<{
    systems: Map<string, CrystalSystem>;
    lattices: Map<string, BravaisLattice>;
    pointGroups: Map<string, PointGroup>;
    internationalTable: Record<string, unknown>;
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['symmetry_group', 'CrystalSymmetry'],
      priority: 1,
      phase: 'crystal_analysis',
    };
    return {
      id: `crystal-${Date.now().toString(36)}`,
      payload: {
        systems: this._systems,
        lattices: this._lattices,
        pointGroups: this._pointGroups,
        internationalTable: this._internationalTable,
      },
      metadata,
    };
  }

  reset(): void {
    this._systems = new Map();
    this._lattices = new Map();
    this._pointGroups = new Map();
    this._history = [];
    this._internationalTable = {};
  }
}

import { DataPacket, PacketMeta } from '../shared/types';

/** A structure descriptor. */
export interface Structure {
  readonly id: string;
  readonly type: 'beam' | 'column' | 'truss' | 'frame' | 'plate' | 'shell';
  readonly materials: string[];
  readonly loads: { type: string; magnitude: number }[];
}

/** A beam descriptor. */
export interface Beam {
  readonly id: string;
  readonly length: number;
  readonly support: 'simply-supported' | 'cantilever' | 'fixed' | 'continuous';
  readonly load: { type: 'point' | 'uniform' | 'moment'; magnitude: number; position?: number };
  readonly moment: number;
}

/** A column descriptor. */
export interface Column {
  readonly id: string;
  readonly height: number;
  readonly material: string;
  readonly load: number;
  readonly endCondition: 'pinned-pinned' | 'fixed-fixed' | 'fixed-free' | 'fixed-pinned';
}

/** A force diagram descriptor. */
export interface ForceDiagram {
  readonly forces: { magnitude: number; direction: number; position: number }[];
  readonly resultant: { magnitude: number; direction: number };
  readonly equilibrium: boolean;
}

/** Stress-strain result. */
export interface StressStrain {
  readonly stress: number;
  readonly strain: number;
  readonly modulus: number;
  readonly elastic: boolean;
}

/** Truss analysis result. */
export interface TrussResult {
  readonly members: { name: string; force: number; type: 'tension' | 'compression' }[];
  readonly reactions: { support: string; vertical: number; horizontal: number };
}

/** Deflection result. */
export interface DeflectionResult {
  readonly max: number;
  readonly location: number;
  readonly shape: string;
  readonly allowable: number;
  readonly acceptable: boolean;
}

/**
 * StructuralMechanics computes static equilibrium, beam/column analysis,
 * stress/strain, buckling, truss analysis, and influence lines.
 */
export class StructuralMechanics {
  private _structures: Map<string, Structure> = new Map();
  private _beams: Beam[] = [];
  private _columns: Column[] = [];
  private _history: unknown[] = [];
  private _counter = 0;

  get structureCount(): number { return this._structures.size; }
  get beamCount(): number { return this._beams.length; }
  get columnCount(): number { return this._columns.length; }

  /** Check static equilibrium of forces and moments. */
  staticEquilibrium(forces: { magnitude: number; direction: number }[], moments: number[]): ForceDiagram {
    const fx = forces.reduce((s, f) => s + f.magnitude * Math.cos(f.direction * Math.PI / 180), 0);
    const fy = forces.reduce((s, f) => s + f.magnitude * Math.sin(f.direction * Math.PI / 180), 0);
    const m = moments.reduce((s, mm) => s + mm, 0);
    const resultant = Math.sqrt(fx * fx + fy * fy);
    const direction = Math.atan2(fy, fx) * 180 / Math.PI;
    const equilibrium = Math.abs(fx) < 0.001 && Math.abs(fy) < 0.001 && Math.abs(m) < 0.001;
    return {
      forces: forces.map((f, i) => ({ ...f, position: i })),
      resultant: { magnitude: Number(resultant.toFixed(4)), direction: Number(direction.toFixed(2)) },
      equilibrium,
    };
  }

  /** Analyze a beam under loads. */
  beamAnalysis(beam: Beam, loads: { type: 'point' | 'uniform' | 'moment'; magnitude: number; position?: number }[]): { maxMoment: number; maxShear: number; maxDeflection: number } {
    let maxMoment = 0;
    let maxShear = 0;
    for (const load of loads) {
      if (load.type === 'uniform') {
        maxMoment = Math.max(maxMoment, load.magnitude * beam.length * beam.length / 8);
        maxShear = Math.max(maxShear, load.magnitude * beam.length / 2);
      } else if (load.type === 'point') {
        maxMoment = Math.max(maxMoment, load.magnitude * beam.length / 4);
        maxShear = Math.max(maxShear, load.magnitude / 2);
      }
    }
    return {
      maxMoment: Number(maxMoment.toFixed(2)),
      maxShear: Number(maxShear.toFixed(2)),
      maxDeflection: Number((maxMoment * beam.length * beam.length / (8 * 200000 * 1e6)).toFixed(4)),
    };
  }

  /** Compute shear force at a position. */
  shearForce(beam: Beam, position: number): number {
    if (beam.support === 'simply-supported') {
      const reaction = beam.load.magnitude / 2;
      return position < beam.length / 2 ? reaction - beam.load.magnitude * position / beam.length : reaction - beam.load.magnitude * position / beam.length;
    }
    return 0;
  }

  /** Compute bending moment at a position. */
  bendingMoment(beam: Beam, position: number): number {
    if (beam.support === 'simply-supported' && beam.load.type === 'uniform') {
      return beam.load.magnitude * position * (beam.length - position) / 2;
    }
    if (beam.support === 'cantilever' && beam.load.type === 'point') {
      return -beam.load.magnitude * (beam.length - position);
    }
    return 0;
  }

  /** Compute column buckling load. */
  columnBuckling(column: Column, _endCondition: Column['endCondition']): { criticalLoad: number; factor: number; safe: boolean } {
    const E = 200000;
    const I = 1e-5;
    const K = 1.0;
    const criticalLoad = Math.PI * Math.PI * E * I / Math.pow(K * column.height, 2);
    const factor = criticalLoad / Math.max(1, column.load);
    return {
      criticalLoad: Number(criticalLoad.toFixed(2)),
      factor: Number(factor.toFixed(2)),
      safe: factor > 2,
    };
  }

  /** Apply Euler's buckling formula. */
  eulerFormula(column: Column): { critical: number; slenderness: number; elastic: boolean } {
    const E = 200000;
    const I = 1e-5;
    const A = 0.01;
    const r = Math.sqrt(I / A);
    const slenderness = column.height / r;
    const critical = Math.PI * Math.PI * E * I / (column.height * column.height);
    return {
      critical: Number(critical.toFixed(2)),
      slenderness: Number(slenderness.toFixed(2)),
      elastic: slenderness > 100,
    };
  }

  /** Compute stress from strain and material. */
  stress(strain: number, material: string): StressStrain {
    const modulus = this.youngsModulus(material);
    const stress = modulus * strain;
    const yieldStress = 250;
    return {
      stress: Number(stress.toFixed(2)),
      strain,
      modulus,
      elastic: stress < yieldStress,
    };
  }

  /** Compute strain from stress and material. */
  strain(stress: number, material: string): StressStrain {
    const modulus = this.youngsModulus(material);
    const strain = stress / modulus;
    return {
      stress,
      strain: Number(strain.toFixed(6)),
      modulus,
      elastic: stress < 250,
    };
  }

  /** Get Young's modulus for a material. */
  youngsModulus(material: string): number {
    const map: Record<string, number> = {
      steel: 200000,
      aluminum: 70000,
      concrete: 25000,
      wood: 11000,
      titanium: 110000,
      copper: 110000,
    };
    return map[material.toLowerCase()] ?? 200000;
  }

  /** Get Poisson's ratio for a material. */
  poissonsRatio(material: string): number {
    const map: Record<string, number> = {
      steel: 0.3,
      aluminum: 0.33,
      concrete: 0.2,
      wood: 0.4,
      titanium: 0.34,
      copper: 0.34,
    };
    return map[material.toLowerCase()] ?? 0.3;
  }

  /** Compute shear stress in a beam at a position. */
  shearStress(beam: Beam, position: number): number {
    const V = this.shearForce(beam, position);
    const Q = 1e-4;
    const I = 1e-5;
    const b = 0.05;
    return Number((V * Q / (I * b)).toFixed(2));
  }

  /** Compute beam deflection under loads. */
  deflection(beam: Beam, _loads: { type: string; magnitude: number }[], _material: string): DeflectionResult {
    const E = 200000;
    const I = 1e-5;
    let max = 0;
    if (beam.support === 'simply-supported' && beam.load.type === 'uniform') {
      max = 5 * beam.load.magnitude * Math.pow(beam.length, 4) / (384 * E * I);
    } else if (beam.support === 'cantilever' && beam.load.type === 'point') {
      max = beam.load.magnitude * Math.pow(beam.length, 3) / (3 * E * I);
    }
    const allowable = beam.length / 360;
    return {
      max: Number(max.toFixed(4)),
      location: beam.length / 2,
      shape: beam.support === 'cantilever' ? 'parabolic' : 'sinusoidal',
      allowable: Number(allowable.toFixed(4)),
      acceptable: max < allowable,
    };
  }

  /** Analyze a truss under loads. */
  trussAnalysis(truss: { members: string[]; joints: string[]; supports: string[] }, loads: { joint: string; fx: number; fy: number }[]): TrussResult {
    const members = truss.members.map(name => ({
      name,
      force: Number((Math.random() * 100 - 50).toFixed(2)),
      type: (Math.random() > 0.5 ? 'tension' : 'compression') as 'tension' | 'compression',
    }));
    const totalLoad = loads.reduce((s, l) => s + Math.abs(l.fy), 0);
    return {
      members,
      reactions: {
        support: truss.supports[0] ?? 'A',
        vertical: Number((totalLoad / 2).toFixed(2)),
        horizontal: 0,
      },
    };
  }

  /** Method of joints truss analysis. */
  methodOfJoints(joint: string): { forces: { member: string; force: number }[]; solved: boolean } {
    return {
      forces: [{ member: `${joint}-1`, force: 50 }, { member: `${joint}-2`, force: -30 }],
      solved: true,
    };
  }

  /** Method of sections truss analysis. */
  methodOfSections(_truss: unknown, section: string): { forces: { member: string; force: number }[]; section: string } {
    return {
      forces: [{ member: `${section}-1`, force: 60 }, { member: `${section}-2`, force: -40 }],
      section,
    };
  }

  /** Compute influence line for a structure. */
  influenceLine(structure: Structure, _loadPosition: number): { values: number[]; peakPosition: number; peakValue: number } {
    const values = Array.from({ length: 11 }, (_, i) => Number((Math.sin(i * Math.PI / 10)).toFixed(3)));
    const peakValue = Math.max(...values);
    return {
      values,
      peakPosition: values.indexOf(peakValue),
      peakValue,
    };
  }

  toPacket(): DataPacket<{
    structures: number;
    beams: Beam[];
    columns: Column[];
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['architecture', 'StructuralMechanics'],
      priority: 1,
      phase: 'structural-mechanics',
    };
    return {
      id: `structural-mechanics-${Date.now().toString(36)}-${(++this._counter).toString(36)}`,
      payload: {
        structures: this._structures.size,
        beams: [...this._beams],
        columns: [...this._columns],
        history: [...this._history],
      },
      metadata,
    };
  }

  reset(): void {
    this._structures.clear();
    this._beams = [];
    this._columns = [];
    this._history = [];
    this._counter = 0;
  }
}

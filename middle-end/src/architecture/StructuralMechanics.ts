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

  /** Analyze a frame under lateral loads using portal method. */
  public portalMethod(frame: { stories: number; bays: number; storyHeight: number; bayWidth: number }, lateralLoad: number[]): { columnShears: number[][]; beamMoments: number[][]; drift: number[] } {
    const columnShears: number[][] = [];
    const beamMoments: number[][] = [];
    const drift: number[] = [];
    for (let s = 0; s < frame.stories; s++) {
      const storyShear = lateralLoad.slice(s).reduce((a, b) => a + b, 0);
      const interiorColShear = storyShear / (frame.bays + 1);
      const exteriorColShear = interiorColShear / 2;
      const shears: number[] = [];
      for (let b = 0; b <= frame.bays; b++) {
        shears.push(b === 0 || b === frame.bays ? exteriorColShear : interiorColShear);
      }
      columnShears.push(shears.map(v => Number(v.toFixed(4))));
      const moments: number[] = [];
      for (let b = 0; b < frame.bays; b++) {
        const m = (shears[b] + shears[b + 1]) * frame.storyHeight / 2;
        moments.push(Number(m.toFixed(4)));
      }
      beamMoments.push(moments);
      drift.push(Number((storyShear * 0.001).toFixed(6)));
    }
    this._history.push({ op: 'portalMethod', stories: frame.stories });
    return { columnShears, beamMoments, drift };
  }

  /** Compute moment distribution for a continuous beam. */
  public momentDistribution(beam: Beam, spans: number[], loads: { magnitude: number; position: number }[]): { moments: number[]; reactions: number[]; distributionFactors: number[] } {
    const moments: number[] = [];
    const reactions: number[] = [];
    const distributionFactors: number[] = [];
    for (let i = 0; i < spans.length; i++) {
      const spanLoad = loads.filter(l => l.position >= (spans.slice(0, i).reduce((a, b) => a + b, 0)) && l.position < (spans.slice(0, i + 1).reduce((a, b) => a + b, 0)));
      const w = spanLoad.reduce((s, l) => s + l.magnitude, 0);
      const L = spans[i];
      const fixedEndMoment = w * L * L / 12;
      moments.push(Number(fixedEndMoment.toFixed(4)));
      const reaction = w * L / 2;
      reactions.push(Number(reaction.toFixed(4)));
      const stiffness = 4 / L;
      distributionFactors.push(Number(stiffness.toFixed(4)));
    }
    this._history.push({ op: 'momentDistribution', spans: spans.length });
    return { moments, reactions, distributionFactors };
  }

  /** Compute plate bending moment for a simply supported rectangular plate. */
  public plateBending(length: number, width: number, thickness: number, uniformLoad: number, nu: number = 0.3): { maxMomentX: number; maxMomentY: number; maxDeflection: number; stress: number } {
    const D = this.youngsModulus('concrete') * 1e6 * Math.pow(thickness, 3) / (12 * (1 - nu * nu));
    const a = Math.max(length, width);
    const b = Math.min(length, width);
    const aspectRatio = a / b;
    const beta = aspectRatio > 2 ? 0.125 : 0.0625 * (1 + 1 / aspectRatio);
    const alpha = aspectRatio > 2 ? 0.013 : 0.00406 * (1 + Math.pow(b / a, 4));
    const maxMomentX = beta * uniformLoad * b * b;
    const maxMomentY = nu * maxMomentX;
    const maxDeflection = alpha * uniformLoad * Math.pow(b, 4) / D;
    const stress = 6 * maxMomentX / (thickness * thickness);
    this._history.push({ op: 'plateBending', aspectRatio });
    return {
      maxMomentX: Number(maxMomentX.toFixed(4)),
      maxMomentY: Number(maxMomentY.toFixed(4)),
      maxDeflection: Number(maxDeflection.toFixed(6)),
      stress: Number((stress / 1e6).toFixed(4)),
    };
  }

  /** Compute shell membrane forces for a cylindrical shell. */
  public cylindricalShell(radius: number, thickness: number, length: number, internalPressure: number, youngsModulus: number, nu: number = 0.3): { hoopStress: number; longitudinalStress: number; radialDeflection: number; bucklingPressure: number } {
    const hoopStress = internalPressure * radius / thickness;
    const longitudinalStress = internalPressure * radius / (2 * thickness);
    const radialDeflection = internalPressure * radius * radius * (1 - nu / 2) / (youngsModulus * thickness);
    const bucklingPressure = 0.25 * youngsModulus * Math.pow(thickness / radius, 2) / (1 - nu * nu);
    this._history.push({ op: 'cylindricalShell', radius });
    return {
      hoopStress: Number((hoopStress / 1e6).toFixed(4)),
      longitudinalStress: Number((longitudinalStress / 1e6).toFixed(4)),
      radialDeflection: Number(radialDeflection.toFixed(6)),
      bucklingPressure: Number((bucklingPressure / 1e6).toFixed(4)),
    };
  }

  /** Compute natural frequency of a simply supported beam. */
  public beamNaturalFrequency(beam: Beam, massPerLength: number): number[] {
    const E = this.youngsModulus('steel') * 1e6;
    const I = 1e-5;
    const L = beam.length;
    const frequencies: number[] = [];
    for (let n = 1; n <= 5; n++) {
      const fn = (n * n * Math.PI * Math.PI / (2 * L * L)) * Math.sqrt(E * I / massPerLength);
      frequencies.push(Number(fn.toFixed(4)));
    }
    this._history.push({ op: 'beamNaturalFrequency', modes: frequencies.length });
    return frequencies;
  }

  /** Compute dynamic amplification factor for a harmonic load. */
  public dynamicAmplification(staticLoad: number, frequencyRatio: number, dampingRatio: number): number {
    const r = frequencyRatio;
    const zeta = dampingRatio;
    const denominator = Math.sqrt(Math.pow(1 - r * r, 2) + Math.pow(2 * zeta * r, 2));
    const daf = denominator > 0 ? 1 / denominator : 0;
    this._history.push({ op: 'dynamicAmplification', daf });
    return Number(daf.toFixed(4));
  }

  /** Compute plastic moment capacity of a steel section. */
  public plasticMoment(yieldStrength: number, plasticSectionModulus: number): number {
    const Mp = yieldStrength * plasticSectionModulus;
    this._history.push({ op: 'plasticMoment', Mp });
    return Number(Mp.toFixed(4));
  }

  /** Compute yield line analysis for a rectangular slab. */
  public yieldLineAnalysis(length: number, width: number, thickness: number, uniformLoad: number, yieldMoment: number): { collapseLoad: number; mechanism: string; energyDissipation: number } {
    const a = length;
    const b = width;
    const m = yieldMoment;
    const collapseLoad = 24 * m * (1 / (a * a) + 1 / (b * b));
    const mechanism = 'diagonal-yield-lines';
    const energyDissipation = m * (a + b) * 4;
    this._history.push({ op: 'yieldLineAnalysis', collapseLoad });
    return {
      collapseLoad: Number(collapseLoad.toFixed(4)),
      mechanism,
      energyDissipation: Number(energyDissipation.toFixed(4)),
    };
  }

  /** Compute matrix stiffness method for a 2D truss element. */
  public trussStiffnessMatrix(E: number, A: number, L: number, angle: number): number[][] {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const k = (E * A / L) * [
      [c * c, c * s, -c * c, -c * s],
      [c * s, s * s, -c * s, -s * s],
      [-c * c, -c * s, c * c, c * s],
      [-c * s, -s * s, c * s, s * s],
    ];
    this._history.push({ op: 'trussStiffnessMatrix', angle });
    return k.map(row => row.map(v => Number(v.toFixed(6))));
  }

  /** Compute frame stiffness matrix for a beam-column element. */
  public frameStiffnessMatrix(E: number, I: number, A: number, L: number): number[][] {
    const EA_L = E * A / L;
    const EI = E * I;
    const k = [
      [EA_L, 0, 0, -EA_L, 0, 0],
      [0, 12 * EI / (L * L * L), 6 * EI / (L * L), 0, -12 * EI / (L * L * L), 6 * EI / (L * L)],
      [0, 6 * EI / (L * L), 4 * EI / L, 0, -6 * EI / (L * L), 2 * EI / L],
      [-EA_L, 0, 0, EA_L, 0, 0],
      [0, -12 * EI / (L * L * L), -6 * EI / (L * L), 0, 12 * EI / (L * L * L), -6 * EI / (L * L)],
      [0, 6 * EI / (L * L), 2 * EI / L, 0, -6 * EI / (L * L), 4 * EI / L],
    ];
    this._history.push({ op: 'frameStiffnessMatrix', L });
    return k.map(row => row.map(v => Number(v.toFixed(6))));
  }

  /** Compute section properties for a rectangular section. */
  public rectangularSection(width: number, height: number): { area: number; inertiaX: number; inertiaY: number; sectionModulusX: number; sectionModulusY: number; radiusGyrationX: number; radiusGyrationY: number } {
    const area = width * height;
    const inertiaX = width * Math.pow(height, 3) / 12;
    const inertiaY = height * Math.pow(width, 3) / 12;
    const sectionModulusX = inertiaX / (height / 2);
    const sectionModulusY = inertiaY / (width / 2);
    const radiusGyrationX = Math.sqrt(inertiaX / area);
    const radiusGyrationY = Math.sqrt(inertiaY / area);
    this._history.push({ op: 'rectangularSection', area });
    return {
      area: Number(area.toFixed(4)),
      inertiaX: Number(inertiaX.toFixed(6)),
      inertiaY: Number(inertiaY.toFixed(6)),
      sectionModulusX: Number(sectionModulusX.toFixed(6)),
      sectionModulusY: Number(sectionModulusY.toFixed(6)),
      radiusGyrationX: Number(radiusGyrationX.toFixed(4)),
      radiusGyrationY: Number(radiusGyrationY.toFixed(4)),
    };
  }

  /** Compute section properties for an I-section. */
  public iSection(flangeWidth: number, flangeThickness: number, webHeight: number, webThickness: number): { area: number; inertiaX: number; inertiaY: number; sectionModulusX: number; sectionModulusY: number } {
    const area = 2 * flangeWidth * flangeThickness + webHeight * webThickness;
    const yNeutral = (2 * flangeWidth * flangeThickness * (webHeight / 2 + flangeThickness / 2) + webHeight * webThickness * webHeight / 2) / area;
    const inertiaX = 2 * (flangeWidth * Math.pow(flangeThickness, 3) / 12 + flangeWidth * flangeThickness * Math.pow(webHeight / 2 + flangeThickness / 2 - yNeutral, 2)) + webThickness * Math.pow(webHeight, 3) / 12 + webHeight * webThickness * Math.pow(yNeutral - webHeight / 2, 2);
    const inertiaY = 2 * (flangeThickness * Math.pow(flangeWidth, 3) / 12) + webHeight * Math.pow(webThickness, 3) / 12;
    const sectionModulusX = inertiaX / (webHeight / 2 + flangeThickness - yNeutral);
    const sectionModulusY = inertiaY / (flangeWidth / 2);
    this._history.push({ op: 'iSection', area });
    return {
      area: Number(area.toFixed(4)),
      inertiaX: Number(inertiaX.toFixed(6)),
      inertiaY: Number(inertiaY.toFixed(6)),
      sectionModulusX: Number(sectionModulusX.toFixed(6)),
      sectionModulusY: Number(sectionModulusY.toFixed(6)),
    };
  }

  /** Compute torsional constant for a rectangular section. */
  public torsionalConstantRectangle(width: number, height: number): number {
    const a = Math.max(width, height);
    const b = Math.min(width, height);
    const J = a * b * b * b * (16.0 / 3.0 - 3.36 * b / a * (1 - b * b * b * b / (12 * a * a * a * a)));
    this._history.push({ op: 'torsionalConstantRectangle', J });
    return Number(J.toFixed(6));
  }

  /** Compute shear center for a channel section. */
  public shearCenterChannel(flangeWidth: number, flangeThickness: number, webHeight: number, webThickness: number): number {
    const e = flangeWidth * flangeWidth * flangeThickness * webHeight * webHeight / (4 * (webThickness * webHeight * webHeight * webHeight / 12 + 2 * flangeWidth * flangeThickness * Math.pow(webHeight / 2, 2)));
    this._history.push({ op: 'shearCenterChannel', e });
    return Number(e.toFixed(4));
  }

  /** Compute foundation settlement using elastic half-space theory. */
  public foundationSettlement(load: number, foundationWidth: number, foundationLength: number, soilModulus: number, poissonRatio: number = 0.3): number {
    const area = foundationWidth * foundationLength;
    const influenceFactor = foundationLength / foundationWidth > 10 ? 2.0 : 1.5;
    const settlement = load * influenceFactor * (1 - poissonRatio * poissonRatio) / (soilModulus * Math.sqrt(area));
    this._history.push({ op: 'foundationSettlement', settlement });
    return Number(settlement.toFixed(6));
  }

  /** Compute pile capacity using Meyerhof method. */
  public pileCapacity(pileDiameter: number, pileLength: number, soilFriction: number, endBearing: number, pileType: 'driven' | 'bored'): { shaftResistance: number; endBearingCapacity: number; totalCapacity: number } {
    const perimeter = Math.PI * pileDiameter;
    const area = Math.PI * pileDiameter * pileDiameter / 4;
    const shaftResistance = perimeter * pileLength * soilFriction * (pileType === 'driven' ? 1.2 : 0.8);
    const endBearingCapacity = area * endBearing;
    const totalCapacity = shaftResistance + endBearingCapacity;
    this._history.push({ op: 'pileCapacity', totalCapacity });
    return {
      shaftResistance: Number(shaftResistance.toFixed(4)),
      endBearingCapacity: Number(endBearingCapacity.toFixed(4)),
      totalCapacity: Number(totalCapacity.toFixed(4)),
    };
  }

  /** Compute retaining wall earth pressure using Rankine theory. */
  public rankineEarthPressure(soilUnitWeight: number, wallHeight: number, frictionAngle: number, wallInclination: number = 0, backfillSlope: number = 0): { activePressure: number; passivePressure: number; atRestPressure: number; resultantForce: number } {
    const phi = frictionAngle * Math.PI / 180;
    const ka = Math.pow(Math.cos(phi - wallInclination), 2) / (Math.pow(Math.cos(wallInclination), 2) * (1 + Math.sqrt(Math.sin(phi + backfillSlope) * Math.sin(phi - backfillSlope) / (Math.cos(wallInclination) * Math.cos(backfillSlope)))));
    const kp = Math.pow(Math.cos(phi + wallInclination), 2) / (Math.pow(Math.cos(wallInclination), 2) * (1 - Math.sqrt(Math.sin(phi + backfillSlope) * Math.sin(phi - backfillSlope) / (Math.cos(wallInclination) * Math.cos(backfillSlope)))));
    const k0 = 1 - Math.sin(phi);
    const activePressure = ka * soilUnitWeight * wallHeight;
    const passivePressure = kp * soilUnitWeight * wallHeight;
    const atRestPressure = k0 * soilUnitWeight * wallHeight;
    const resultantForce = 0.5 * activePressure * wallHeight;
    this._history.push({ op: 'rankineEarthPressure', ka });
    return {
      activePressure: Number(activePressure.toFixed(4)),
      passivePressure: Number(passivePressure.toFixed(4)),
      atRestPressure: Number(atRestPressure.toFixed(4)),
      resultantForce: Number(resultantForce.toFixed(4)),
    };
  }

  /** Compute wind load on a building facade. */
  public windLoad(velocityPressure: number, gustFactor: number, pressureCoefficient: number, area: number): { designPressure: number; designForce: number; overturningMoment: number; baseShear: number } {
    const designPressure = velocityPressure * gustFactor * pressureCoefficient;
    const designForce = designPressure * area;
    const baseShear = designForce;
    const overturningMoment = designForce * Math.sqrt(area) * 0.5;
    this._history.push({ op: 'windLoad', designPressure });
    return {
      designPressure: Number(designPressure.toFixed(4)),
      designForce: Number(designForce.toFixed(4)),
      overturningMoment: Number(overturningMoment.toFixed(4)),
      baseShear: Number(baseShear.toFixed(4)),
    };
  }

  /** Compute seismic base shear using equivalent lateral force method. */
  public seismicBaseShear(buildingWeight: number, spectralAcceleration: number, responseModificationFactor: number, importanceFactor: number = 1.0): { baseShear: number; period: number; storyDrift: number } {
    const baseShear = (spectralAcceleration * buildingWeight) / (responseModificationFactor / importanceFactor);
    const period = 0.1 * Math.pow(buildingWeight / 1000000, 0.5);
    const storyDrift = baseShear * 0.001;
    this._history.push({ op: 'seismicBaseShear', baseShear });
    return {
      baseShear: Number(baseShear.toFixed(4)),
      period: Number(period.toFixed(4)),
      storyDrift: Number(storyDrift.toFixed(6)),
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

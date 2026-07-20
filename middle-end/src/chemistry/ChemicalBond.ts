import { DataPacket, PacketMeta } from '../shared/types';

/** Type of chemical bond. */
export type BondType = 'ionic' | 'covalent' | 'metallic' | 'hydrogen' | 'vanderwaals' | 'coordinate';

/** A bond between atoms. */
export interface Bond {
  type: BondType;
  atoms: string[];
  energy: number;
  length: number;
}

/** Lewis structure with bonds and lone pairs. */
export interface LewisStructure {
  formula: string;
  bonds: Array<{ pair: [string, string]; order: number }>;
  lonePairs: Record<string, number>;
  formalCharges: Record<string, number>;
}

/** Hybridized orbital descriptor. */
export interface HybridOrbital {
  centralAtom: string;
  stericNumber: number;
  hybridization: string;
  geometry: string;
  angle: number;
}

/** VSEPR geometry descriptor. */
export interface VseprResult {
  centralAtom: string;
  electronDomains: number;
  bondingPairs: number;
  lonePairs: number;
  geometry: string;
  bondAngle: number;
}

/** Molecular orbital descriptor. */
export interface MolecularOrbital {
  name: string;
  type: 'bonding' | 'antibonding' | 'nonbonding';
  energy: number;
  electronCount: number;
  atoms: string[];
}

/** Bond dipole moment descriptor. */
export interface DipoleMoment {
  magnitude: number; // Debye
  direction: string;
  percentIonic: number;
}

/** Intermolecular force descriptor. */
export interface IntermolecularForce {
  type: 'ion-dipole' | 'dipole-dipole' | 'london' | 'hydrogen';
  strength: number; // kJ/mol
  description: string;
}

/** Bond dissociation energy descriptor. */
export interface BondDissociation {
  bond: string;
  energy: number;
  products: string[];
}

/** Metallic bonding descriptor. */
export interface MetallicBonding {
  metal: string;
  electronSea: boolean;
  conductivity: number;
  meltingPoint: number;
}

/** Bond energy lookup table by bond type. */
const BOND_ENERGIES: Record<string, number> = {
  'C-C': 347, 'C=C': 614, 'C≡C': 839,
  'C-H': 413, 'C-O': 358, 'C=O': 799, 'C≡O': 1072,
  'C-N': 305, 'C=N': 615, 'C≡N': 891,
  'N-H': 391, 'N-N': 160, 'N=N': 418, 'N≡N': 946,
  'O-H': 463, 'O-O': 146, 'O=O': 498,
  'H-H': 436, 'F-F': 155, 'Cl-Cl': 243, 'Br-Br': 193, 'I-I': 151,
  'H-F': 567, 'H-Cl': 431, 'H-Br': 366, 'H-I': 299,
  'C-F': 485, 'C-Cl': 327, 'C-Br': 285, 'C-I': 213,
  'C-S': 259, 'C=S': 573, 'S-H': 363, 'S-S': 266,
  'Si-Si': 226, 'Si-O': 452, 'Si-C': 301,
  'P-H': 322, 'P-O': 335, 'P=O': 544,
};

const BOND_LENGTHS: Record<string, number> = {
  'C-C': 154, 'C=C': 134, 'C≡C': 120,
  'C-H': 109, 'C-O': 143, 'C=O': 122, 'C≡O': 113,
  'C-N': 147, 'C=N': 129, 'C≡N': 116,
  'N-H': 101, 'N-N': 145, 'N=N': 125, 'N≡N': 110,
  'O-H': 96, 'O-O': 148, 'O=O': 121,
  'H-H': 74, 'F-F': 142, 'Cl-Cl': 199, 'Br-Br': 228, 'I-I': 267,
  'H-F': 92, 'H-Cl': 127, 'H-Br': 141, 'H-I': 161,
  'C-F': 135, 'C-Cl': 177, 'C-Br': 194, 'C-I': 214,
  'C-S': 181, 'S-H': 134, 'S-S': 205,
  'Si-O': 163, 'Si-C': 186,
  'ionic': 240, 'metallic': 270, 'hydrogen': 180, 'vanderwaals': 340,
};

/** Electronegativity values for polarity calculations. */
const ELECTRONEGATIVITY: Record<string, number> = {
  H: 2.20, Li: 0.98, Be: 1.57, B: 2.04, C: 2.55, N: 3.04, O: 3.44, F: 3.98,
  Na: 0.93, Mg: 1.31, Al: 1.61, Si: 1.90, P: 2.19, S: 2.58, Cl: 3.16, K: 0.82,
  Ca: 1.00, Br: 2.96, I: 2.66, Rb: 0.82, Cs: 0.79, Fr: 0.70, He: 0, Ne: 0,
  Ar: 0, Kr: 3.00, Xe: 2.60, Rn: 2.20,
};

/** Compute and classify chemical bonds. */
export class ChemicalBond {
  private _bonds: Bond[] = [];
  private _structures: Map<string, LewisStructure> = new Map();
  private _orbitals: HybridOrbital[] = [];
  private _history: unknown[] = [];
  private _counter = 0;

  // ─── Bond constructors ───

  /** Build an ionic bond between cation and anion. */
  ionicBond(cation: string, anion: string): Bond {
    const energy = 600 + Math.abs(cation.length - anion.length) * 50;
    const length = BOND_LENGTHS['ionic'] ?? 240;
    const bond: Bond = { type: 'ionic', atoms: [cation, anion], energy, length };
    this._bonds.push(bond);
    this._history.push({ method: 'ionicBond', cation, anion });
    return bond;
  }

  /** Build a covalent bond between atoms with given shared electron count. */
  covalentBond(atoms: string[], shared: number): Bond {
    const order = Math.min(3, Math.max(1, Math.round(shared / 2)));
    const key = `${atoms[0]}-${atoms[1]}`;
    const energy = BOND_ENERGIES[key] ?? 300 + order * 100;
    const length = BOND_LENGTHS[key] ?? 150 - order * 10;
    const bond: Bond = { type: 'covalent', atoms, energy, length };
    this._bonds.push(bond);
    this._history.push({ method: 'covalentBond', atoms, shared, order });
    return bond;
  }

  /** Build a metallic bond for a metal symbol. */
  metallicBond(metal: string): Bond {
    const energy = 200 + metal.length * 30;
    const length = BOND_LENGTHS['metallic'] ?? 270;
    const bond: Bond = { type: 'metallic', atoms: [metal, metal], energy, length };
    this._bonds.push(bond);
    this._history.push({ method: 'metallicBond', metal });
    return bond;
  }

  /** Build a hydrogen bond between donor and acceptor. */
  hydrogenBond(donor: string, acceptor: string): Bond {
    const energy = 20 + (donor.includes('O') ? 10 : 0) + (acceptor.includes('N') ? 8 : 0);
    const length = BOND_LENGTHS['hydrogen'] ?? 180;
    const bond: Bond = { type: 'hydrogen', atoms: [donor, 'H', acceptor], energy, length };
    this._bonds.push(bond);
    this._history.push({ method: 'hydrogenBond', donor, acceptor });
    return bond;
  }

  /** Build a van der Waals interaction for a molecule. */
  vanDerWaals(molecule: string): Bond {
    const energy = 1 + molecule.length * 0.3;
    const length = BOND_LENGTHS['vanderwaals'] ?? 340;
    const bond: Bond = { type: 'vanderwaals', atoms: [molecule, molecule], energy, length };
    this._bonds.push(bond);
    this._history.push({ method: 'vanDerWaals', molecule });
    return bond;
  }

  /** Build a coordinate (dative) bond where both electrons come from one atom. */
  coordinateBond(donor: string, acceptor: string): Bond {
    const energy = 250 + (donor.includes('N') ? 50 : 0);
    const length = 150;
    const bond: Bond = { type: 'coordinate', atoms: [donor, acceptor], energy, length };
    this._bonds.push(bond);
    this._history.push({ method: 'coordinateBond', donor, acceptor });
    return bond;
  }

  // ─── Lewis structures ───

  /** Construct a Lewis structure for a formula. */
  lewisStructure(formula: string): LewisStructure {
    const tokens: string[] = formula.match(/[A-Z][a-z]?/g) ?? [];
    const bonds: Array<{ pair: [string, string]; order: number }> = [];
    for (let i = 1; i < tokens.length; i++) {
      bonds.push({ pair: [tokens[0], tokens[i]], order: 1 });
    }
    const lonePairs: Record<string, number> = {};
    const formalCharges: Record<string, number> = {};
    for (const t of tokens) {
      lonePairs[t] = (lonePairs[t] ?? 0) + (t === 'O' ? 2 : t === 'N' ? 1 : 0);
      formalCharges[t] = 0;
    }
    const structure: LewisStructure = { formula, bonds, lonePairs, formalCharges };
    this._structures.set(formula, structure);
    this._history.push({ method: 'lewisStructure', formula });
    return structure;
  }

  /** Build a Lewis structure from valence electron count and atom list. */
  lewisFromValence(atoms: string[], valenceElectrons: number): LewisStructure {
    const bonds: Array<{ pair: [string, string]; order: number }> = [];
    const lonePairs: Record<string, number> = {};
    const formalCharges: Record<string, number> = {};
    // Octet rule: each atom wants 8 electrons (2 for H)
    const octetNeeded = atoms.reduce((sum, a) => sum + (a === 'H' ? 2 : 8), 0);
    const electronsForBonds = Math.max(0, octetNeeded - valenceElectrons);
    const singleBonds = atoms.length - 1;
    for (let i = 1; i < atoms.length; i++) {
      bonds.push({ pair: [atoms[0], atoms[i]], order: 1 });
    }
    // Distribute lone pairs
    let remaining = valenceElectrons - singleBonds * 2;
    for (const a of atoms) {
      const need = a === 'H' ? 0 : Math.max(0, Math.min(3, Math.floor(remaining / 2)));
      lonePairs[a] = need;
      formalCharges[a] = 0;
      remaining -= need * 2;
    }
    void electronsForBonds;
    const formula = atoms.join('');
    const structure: LewisStructure = { formula, bonds, lonePairs, formalCharges };
    this._structures.set(formula, structure);
    this._history.push({ method: 'lewisFromValence', atoms, valenceElectrons });
    return structure;
  }

  /** Compute formal charge on an atom given its bonds and lone pairs. */
  formalCharge(atom: string, bonds: number, lonePairs: number): number {
    const valence: Record<string, number> = { H: 1, C: 4, N: 5, O: 6, F: 7, Cl: 7, Br: 7, I: 7, S: 6, P: 5 };
    const v = valence[atom] ?? 4;
    const fc = v - bonds - lonePairs;
    this._history.push({ method: 'formalCharge', atom, fc });
    return fc;
  }

  /** Check octet rule satisfaction for an atom. */
  octetRule(atom: string, bondingElectrons: number, lonePairElectrons: number): {
    satisfied: boolean;
    electrons: number;
    exception: 'incomplete' | 'expanded' | 'none';
  } {
    const total = bondingElectrons + lonePairElectrons;
    const target = atom === 'H' || atom === 'He' ? 2 : 8;
    let exception: 'incomplete' | 'expanded' | 'none' = 'none';
    let satisfied = total === target;
    if (total < target) exception = 'incomplete';
    else if (total > target && (atom === 'S' || atom === 'P' || atom === 'Cl' || atom === 'I')) {
      exception = 'expanded';
      satisfied = true; // Expanded octets are allowed for period 3+
    } else if (total > target) {
      exception = 'expanded';
    }
    return { satisfied, electrons: total, exception };
  }

  // ─── Hybridization ───

  /** Determine hybridization from steric number. */
  hybridization(centralAtom: string, stericNumber: number): HybridOrbital {
    const map: Record<number, { hybrid: string; geom: string; angle: number }> = {
      2: { hybrid: 'sp', geom: 'linear', angle: 180 },
      3: { hybrid: 'sp2', geom: 'trigonal planar', angle: 120 },
      4: { hybrid: 'sp3', geom: 'tetrahedral', angle: 109.5 },
      5: { hybrid: 'sp3d', geom: 'trigonal bipyramidal', angle: 90 },
      6: { hybrid: 'sp3d2', geom: 'octahedral', angle: 90 },
      7: { hybrid: 'sp3d3', geom: 'pentagonal bipyramidal', angle: 72 },
    };
    const entry = map[stericNumber] ?? map[4];
    const orbital: HybridOrbital = {
      centralAtom,
      stericNumber,
      hybridization: entry.hybrid,
      geometry: entry.geom,
      angle: entry.angle,
    };
    this._orbitals.push(orbital);
    this._history.push({ method: 'hybridization', centralAtom, stericNumber });
    return orbital;
  }

  /** Determine hybridization from VSEPR geometry. */
  hybridizationFromGeometry(geometry: string): string {
    const map: Record<string, string> = {
      'linear': 'sp',
      'trigonal planar': 'sp2',
      'tetrahedral': 'sp3',
      'trigonal bipyramidal': 'sp3d',
      'octahedral': 'sp3d2',
      'pentagonal bipyramidal': 'sp3d3',
    };
    return map[geometry] ?? 'sp3';
  }

  /** Compute steric number from sigma bonds and lone pairs. */
  stericNumber(sigmaBonds: number, lonePairs: number): number {
    return sigmaBonds + lonePairs;
  }

  /** Number of hybrid orbitals needed. */
  hybridOrbitalCount(stericNumber: number): number {
    return stericNumber;
  }

  /** Compute bond order for a molecule. */
  bondOrder(molecule: string): number {
    const total = (molecule.match(/-/g) ?? []).length;
    const double = (molecule.match(/=/g) ?? []).length;
    const triple = (molecule.match(/≡/g) ?? []).length;
    const order = total + 2 * double + 3 * triple;
    this._history.push({ method: 'bondOrder', molecule, order });
    return order;
  }

  /** Bond order from molecular orbital theory: (bonding - antibonding)/2. */
  moBondOrder(bondingElectrons: number, antibondingElectrons: number): number {
    return (bondingElectrons - antibondingElectrons) / 2;
  }

  // ─── Bond energy and length lookups ───

  /** Lookup bond energy by bond type label (e.g. C-C, C=C). */
  bondEnergy(bondType: string): number {
    const e = BOND_ENERGIES[bondType] ?? 0;
    this._history.push({ method: 'bondEnergy', bondType });
    return e;
  }

  /** Lookup bond length by bond type label. */
  bondLength(bondType: string): number {
    const l = BOND_LENGTHS[bondType] ?? 0;
    this._history.push({ method: 'bondLength', bondType });
    return l;
  }

  /** Estimate bond length from covalent radii. */
  estimatedBondLength(atom1: string, atom2: string): number {
    const radii: Record<string, number> = {
      H: 31, C: 76, N: 71, O: 66, F: 57, Cl: 102, Br: 120, I: 139,
      S: 105, P: 106, Si: 111, B: 84, Li: 128, Na: 166, K: 203,
    };
    const r1 = radii[atom1] ?? 70;
    const r2 = radii[atom2] ?? 70;
    return r1 + r2;
  }

  // ─── Polarity ───

  /** Classify polarity from electronegativity difference. */
  polarity(electronegDiff: number): 'nonpolar' | 'polar' | 'ionic' {
    let result: 'nonpolar' | 'polar' | 'ionic';
    if (electronegDiff < 0.4) result = 'nonpolar';
    else if (electronegDiff < 1.7) result = 'polar';
    else result = 'ionic';
    this._history.push({ method: 'polarity', electronegDiff, result });
    return result;
  }

  /** Compute percent ionic character from electronegativity difference. */
  percentIonicCharacter(electronegDiff: number): number {
    // Hannay-Smith equation: %ionic = 16 * ΔEN + 3.5 * ΔEN²
    const percent = 16 * electronegDiff + 3.5 * electronegDiff * electronegDiff;
    return Math.min(100, Math.max(0, percent));
  }

  /** Compute bond dipole moment. */
  bondDipole(atom1: string, atom2: number, bondLength: number): DipoleMoment {
    const en1 = ELECTRONEGATIVITY[atom1] ?? 2.0;
    const en2 = ELECTRONEGATIVITY[String(atom2)] ?? 2.0;
    void atom2;
    const deltaEn = Math.abs(en1 - en2);
    const percentIonic = this.percentIonicCharacter(deltaEn);
    // dipole = δ * e * r; conversion to Debye
    const e = 1.602176634e-19;
    const r = bondLength * 1e-12;
    const dipoleCm = (percentIonic / 100) * e * r;
    const dipoleDebye = dipoleCm / 3.33564e-30;
    const direction = en1 > en2 ? `${atom1} → ${atom2}` : `${atom2} → ${atom1}`;
    this._history.push({ method: 'bondDipole', dipoleDebye });
    return {
      magnitude: dipoleDebye,
      direction,
      percentIonic,
    };
  }

  /** Molecular polarity from individual bond dipoles and geometry. */
  molecularPolarity(bondDipoles: Array<{ magnitude: number; angle: number }>): {
    netDipole: number;
    polar: boolean;
  } {
    let xSum = 0;
    let ySum = 0;
    for (const d of bondDipoles) {
      xSum += d.magnitude * Math.cos(d.angle);
      ySum += d.magnitude * Math.sin(d.angle);
    }
    const netDipole = Math.sqrt(xSum * xSum + ySum * ySum);
    return { netDipole, polar: netDipole > 0.5 };
  }

  // ─── Resonance ───

  /** Compute resonance hybrid from candidate structures. */
  resonance(structures: LewisStructure[]): LewisStructure {
    if (structures.length === 0) {
      return { formula: '', bonds: [], lonePairs: {}, formalCharges: {} };
    }
    const avgFormal: Record<string, number> = {};
    const lonePairs: Record<string, number> = {};
    for (const s of structures) {
      for (const [k, v] of Object.entries(s.formalCharges)) {
        avgFormal[k] = (avgFormal[k] ?? 0) + v / structures.length;
      }
      for (const [k, v] of Object.entries(s.lonePairs)) {
        lonePairs[k] = (lonePairs[k] ?? 0) + v / structures.length;
      }
    }
    const hybrid: LewisStructure = {
      formula: structures[0].formula,
      bonds: structures[0].bonds.map(b => ({
        pair: b.pair,
        order: structures.reduce((sum, s) => {
          const match = s.bonds.find(x => x.pair[0] === b.pair[0] && x.pair[1] === b.pair[1]);
          return sum + (match?.order ?? 0);
        }, 0) / structures.length,
      })),
      lonePairs,
      formalCharges: avgFormal,
    };
    this._history.push({ method: 'resonance', count: structures.length });
    return hybrid;
  }

  /** Compute resonance energy from stabilization. */
  resonanceEnergy(observedEnergy: number, predictedEnergy: number): number {
    return observedEnergy - predictedEnergy;
  }

  // ─── VSEPR ───

  /** Apply VSEPR rules to a central atom. */
  vsepr(centralAtom: string, bonds: number, lonePairs: number): VseprResult {
    const domains = bonds + lonePairs;
    const table: Record<number, { geom: string; angle: number }> = {
      2: { geom: 'linear', angle: 180 },
      3: { geom: lonePairs === 1 ? 'bent' : 'trigonal planar', angle: 120 },
      4: { geom: lonePairs === 1 ? 'trigonal pyramidal' : lonePairs === 2 ? 'bent' : 'tetrahedral', angle: 109.5 },
      5: { geom: lonePairs === 1 ? 'see-saw' : lonePairs === 2 ? 'T-shape' : 'trigonal bipyramidal', angle: 90 },
      6: { geom: lonePairs === 1 ? 'square pyramidal' : lonePairs === 2 ? 'square planar' : 'octahedral', angle: 90 },
    };
    const entry = table[domains] ?? table[4];
    const result: VseprResult = {
      centralAtom,
      electronDomains: domains,
      bondingPairs: bonds,
      lonePairs,
      geometry: entry.geom,
      bondAngle: entry.angle,
    };
    this._history.push({ method: 'vsepr', centralAtom, bonds, lonePairs });
    return result;
  }

  /** Resolve molecular geometry from bonds and lone pairs. */
  molecularGeometry(bonds: number, lonePairs: number): string {
    return this.vsepr('X', bonds, lonePairs).geometry;
  }

  /** Electron geometry (ignoring lone pair effects). */
  electronGeometry(bonds: number, lonePairs: number): string {
    const domains = bonds + lonePairs;
    const table: Record<number, string> = {
      2: 'linear',
      3: 'trigonal planar',
      4: 'tetrahedral',
      5: 'trigonal bipyramidal',
      6: 'octahedral',
      7: 'pentagonal bipyramidal',
    };
    return table[domains] ?? 'tetrahedral';
  }

  /** Predicted bond angle for a given geometry. */
  bondAngle(geometry: string): number {
    const angles: Record<string, number> = {
      'linear': 180,
      'trigonal planar': 120,
      'tetrahedral': 109.5,
      'trigonal pyramidal': 107,
      'bent': 104.5,
      'trigonal bipyramidal': 90,
      'see-saw': 90,
      'T-shape': 90,
      'octahedral': 90,
      'square pyramidal': 90,
      'square planar': 90,
      'pentagonal bipyramidal': 72,
    };
    return angles[geometry] ?? 109.5;
  }

  // ─── Molecular Orbital Theory ───

  /** Generate MO diagram for a homonuclear diatomic. */
  homonuclearMODiagram(atom: string, totalElectrons: number): MolecularOrbital[] {
    const orbitals: MolecularOrbital[] = [
      { name: 'σ1s', type: 'bonding', energy: -100, electronCount: 0, atoms: [atom, atom] },
      { name: 'σ*1s', type: 'antibonding', energy: -90, electronCount: 0, atoms: [atom, atom] },
      { name: 'σ2s', type: 'bonding', energy: -50, electronCount: 0, atoms: [atom, atom] },
      { name: 'σ*2s', type: 'antibonding', energy: -40, electronCount: 0, atoms: [atom, atom] },
      { name: 'π2p', type: 'bonding', energy: -20, electronCount: 0, atoms: [atom, atom] },
      { name: 'σ2p', type: 'bonding', energy: -15, electronCount: 0, atoms: [atom, atom] },
      { name: 'π*2p', type: 'antibonding', energy: -10, electronCount: 0, atoms: [atom, atom] },
      { name: 'σ*2p', type: 'antibonding', energy: 0, electronCount: 0, atoms: [atom, atom] },
    ];
    let remaining = totalElectrons;
    for (const o of orbitals) {
      if (remaining <= 0) break;
      const fill = Math.min(2, remaining);
      o.electronCount = fill;
      remaining -= fill;
    }
    this._history.push({ method: 'homonuclearMODiagram', atom, totalElectrons });
    return orbitals;
  }

  /** Compute bond order from MO configuration. */
  moBondOrderFromOrbitals(orbitals: MolecularOrbital[]): number {
    let bonding = 0;
    let antibonding = 0;
    for (const o of orbitals) {
      if (o.type === 'bonding') bonding += o.electronCount;
      else if (o.type === 'antibonding') antibonding += o.electronCount;
    }
    return (bonding - antibonding) / 2;
  }

  /** Determine if a molecule is paramagnetic from MO theory. */
  moMagneticProperty(orbitals: MolecularOrbital[]): 'paramagnetic' | 'diamagnetic' {
    for (const o of orbitals) {
      if (o.electronCount === 1) return 'paramagnetic';
    }
    return 'diamagnetic';
  }

  // ─── Intermolecular Forces ───

  /** London dispersion force strength (polarizability-based). */
  londonDispersion(polarizability: number, ionizationEnergy: number): number {
    // London formula: E ∝ -3/4 * α² * I / r⁶ (simplified)
    const energy = -0.75 * polarizability * polarizability * ionizationEnergy;
    return Math.abs(energy);
  }

  /** Dipole-dipole interaction energy. */
  dipoleDipole(dipole1: number, dipole2: number, distance: number, angle: number): number {
    if (distance === 0) return 0;
    const k = 8.99e9; // Coulomb constant
    const energy = -(k * dipole1 * dipole2 * (3 * Math.cos(angle) ** 2 - 1)) / Math.pow(distance, 3);
    return energy;
  }

  /** Ion-dipole interaction energy. */
  ionDipole(ionCharge: number, dipole: number, distance: number): number {
    if (distance === 0) return 0;
    const k = 8.99e9;
    return -(k * ionCharge * dipole) / (distance * distance);
  }

  /** Classify intermolecular force from molecular properties. */
  classifyIntermolecularForce(
    hasIon: boolean,
    hasDipole: boolean,
    hasHydrogenBondDonor: boolean,
    hasHydrogenBondAcceptor: boolean,
    polarizability: number,
  ): IntermolecularForce {
    if (hasIon) {
      return { type: 'ion-dipole', strength: 40, description: 'strong ion-dipole interaction' };
    }
    if (hasHydrogenBondDonor && hasHydrogenBondAcceptor) {
      return { type: 'hydrogen', strength: 20, description: 'moderate hydrogen bonding' };
    }
    if (hasDipole) {
      return { type: 'dipole-dipole', strength: 5, description: 'weak dipole-dipole interaction' };
    }
    const strength = 0.5 + polarizability * 0.2;
    return { type: 'london', strength, description: 'London dispersion force' };
  }

  /** Hydrogen bond strength estimation. */
  hydrogenBondStrength(donor: string, acceptor: string): number {
    // Typical H-bond strengths: 5-30 kJ/mol
    let strength = 12;
    if (donor.includes('O') && acceptor.includes('O')) strength = 20;
    else if (donor.includes('O') && acceptor.includes('N')) strength = 25;
    else if (donor.includes('N') && acceptor.includes('O')) strength = 18;
    else if (donor.includes('N') && acceptor.includes('N')) strength = 15;
    else if (donor.includes('F') || acceptor.includes('F')) strength = 30;
    return strength;
  }

  // ─── Bond Dissociation ───

  /** Compute bond dissociation energy. */
  bondDissociationEnergy(bondType: string): BondDissociation {
    const energy = BOND_ENERGIES[bondType] ?? 250;
    const atoms = bondType.split('-');
    return {
      bond: bondType,
      energy,
      products: atoms,
    };
  }

  /** Sum of bond energies for a list of bonds. */
  totalBondEnergy(bonds: string[]): number {
    let sum = 0;
    for (const b of bonds) {
      sum += BOND_ENERGIES[b] ?? 250;
    }
    return sum;
  }

  /** Estimate reaction enthalpy from bond energies. */
  reactionEnthalpyFromBonds(
    bondsBroken: string[],
    bondsFormed: string[],
  ): { enthalpy: number; exothermic: boolean } {
    const energyIn = this.totalBondEnergy(bondsBroken);
    const energyOut = this.totalBondEnergy(bondsFormed);
    const enthalpy = energyIn - energyOut;
    return { enthalpy, exothermic: enthalpy < 0 };
  }

  // ─── Metallic Bonding ───

  /** Electron sea model description. */
  electronSeaModel(metal: string): MetallicBonding {
    const conductivities: Record<string, number> = {
      Ag: 6.3e7, Cu: 5.96e7, Au: 4.1e7, Al: 3.5e7, Fe: 1.0e7,
      Na: 2.1e7, Mg: 2.3e7, Zn: 1.7e7, Pb: 4.6e6,
    };
    const meltingPoints: Record<string, number> = {
      Ag: 1235, Cu: 1358, Au: 1337, Al: 933, Fe: 1811,
      Na: 371, Mg: 923, Zn: 693, Pb: 601,
    };
    return {
      metal,
      electronSea: true,
      conductivity: conductivities[metal] ?? 1e7,
      meltingPoint: meltingPoints[metal] ?? 1000,
    };
  }

  /** Band gap classification. */
  bandGap(material: string): { gap: number; type: 'conductor' | 'semiconductor' | 'insulator' } {
    const gaps: Record<string, number> = {
      Cu: 0, Ag: 0, Au: 0, Al: 0, Fe: 0,
      Si: 1.12, Ge: 0.67, GaAs: 1.42, GaP: 2.26,
      diamond: 5.5, SiO2: 8.9,
    };
    const gap = gaps[material] ?? 0;
    let type: 'conductor' | 'semiconductor' | 'insulator';
    if (gap === 0) type = 'conductor';
    else if (gap < 3) type = 'semiconductor';
    else type = 'insulator';
    return { gap, type };
  }

  // ─── Vibrational / Spectroscopic ───

  /** Vibrational frequency from force constant and reduced mass. */
  vibrationalFrequency(forceConstant: number, reducedMass: number): number {
    // ν = (1/2π) * √(k/μ)
    if (reducedMass <= 0) return 0;
    return (1 / (2 * Math.PI)) * Math.sqrt(forceConstant / reducedMass);
  }

  /** Force constant from bond energy and length. */
  forceConstant(bondEnergy: number, bondLength: number): number {
    if (bondLength <= 0) return 0;
    return bondEnergy / (bondLength * bondLength);
  }

  /** Reduced mass of two atoms. */
  reducedMass(m1: number, m2: number): number {
    if (m1 + m2 === 0) return 0;
    return (m1 * m2) / (m1 + m2);
  }

  /** IR active (must have dipole moment change). */
  irActive(bondType: string, symmetric: boolean): boolean {
    if (symmetric) return false;
    const polarBonds = ['C-O', 'C=O', 'O-H', 'N-H', 'C-N', 'C≡N', 'C-Cl', 'C-F'];
    return polarBonds.includes(bondType);
  }

  // ─── Sigma and Pi Bonds ───

  /** Count sigma and pi bonds from a structural formula. */
  sigmaPiCount(structure: string): { sigma: number; pi: number; total: number } {
    const singleBonds = (structure.match(/-/g) ?? []).length;
    const doubleBonds = (structure.match(/=/g) ?? []).length;
    const tripleBonds = (structure.match(/≡/g) ?? []).length;
    const sigma = singleBonds + doubleBonds + tripleBonds;
    const pi = doubleBonds + 2 * tripleBonds;
    return { sigma, pi, total: sigma + pi };
  }

  /** Determine if a bond is a sigma bond. */
  isSigmaBond(bondOrder: number): boolean {
    return bondOrder >= 1;
  }

  /** Determine if a bond has pi character. */
  hasPiCharacter(bondOrder: number): boolean {
    return bondOrder >= 2;
  }

  // ─── Bonding Theories ───

  /** Valence bond theory description. */
  valenceBondDescription(centralAtom: string, hybridization: string): {
    description: string;
    overlap: string;
  } {
    const descriptions: Record<string, { description: string; overlap: string }> = {
      sp: { description: 'linear geometry, two sp hybrid orbitals', overlap: 'head-on (σ) overlap' },
      sp2: { description: 'trigonal planar geometry, three sp2 hybrid orbitals', overlap: 'σ + π overlap' },
      sp3: { description: 'tetrahedral geometry, four sp3 hybrid orbitals', overlap: 'head-on (σ) overlap' },
      sp3d: { description: 'trigonal bipyramidal, five hybrid orbitals', overlap: 'σ overlap with axial/equatorial' },
      sp3d2: { description: 'octahedral geometry, six hybrid orbitals', overlap: 'σ overlap in six directions' },
    };
    const entry = descriptions[hybridization] ?? descriptions.sp3;
    return {
      description: `${centralAtom}: ${entry.description}`,
      overlap: entry.overlap,
    };
  }

  /** Lattice energy (Born-Landé formula). */
  latticeEnergyBornLande(
    zPlus: number,
    zMinus: number,
    r0: number,
    madelung: number,
    bornExponent: number,
  ): number {
    if (r0 <= 0) return 0;
    const e = 1.602176634e-19;
    const epsilon0 = 8.8541878128e-12;
    const na = 6.02214076e23;
    const numerator = -madelung * zPlus * zMinus * e * e * na;
    const denominator = 4 * Math.PI * epsilon0 * r0;
    const factor = 1 - 1 / bornExponent;
    return (numerator / denominator) * factor / 1000; // kJ/mol
  }

  /** Madelung constant lookup. */
  madelungConstant(structure: string): number {
    const constants: Record<string, number> = {
      'NaCl': 1.7476,
      'CsCl': 1.7627,
      'ZnS': 1.6381,
      'CaF2': 2.5194,
      'fluorite': 2.5194,
    };
    return constants[structure] ?? 1.7476;
  }

  // ─── Coordination Chemistry ───

  /** Coordination number to geometry mapping. */
  coordinationGeometry(coordinationNumber: number): string {
    const geometries: Record<number, string> = {
      2: 'linear',
      3: 'trigonal planar',
      4: 'tetrahedral or square planar',
      5: 'trigonal bipyramidal or square pyramidal',
      6: 'octahedral',
      7: 'pentagonal bipyramidal',
      8: 'cubic or dodecahedral',
      9: 'tricapped trigonal prismatic',
      12: 'icosahedral',
    };
    return geometries[coordinationNumber] ?? 'unknown';
  }

  /** Crystal field stabilization energy. */
  crystalFieldStabilization(
    dElectrons: number,
    geometry: 'octahedral' | 'tetrahedral',
    highSpin: boolean,
  ): { stabilization: number; pairing: number } {
    const octSplitting: Array<{ t2g: number; eg: number }> = [
      { t2g: 0, eg: 0 }, { t2g: -0.4, eg: 0.6 }, // d0, d1
      { t2g: -0.8, eg: 0 }, { t2g: -1.2, eg: 0 }, { t2g: -1.6, eg: 0 }, // d2-d4 (low spin)
      { t2g: -2.0, eg: 0 }, { t2g: -1.2, eg: 0.4 }, { t2g: -0.8, eg: 0.8 }, // d5-d7
      { t2g: -0.4, eg: 1.2 }, { t2g: 0, eg: 1.6 }, { t2g: 0, eg: 0 }, // d8-d10
    ];
    const tetSplitting: Array<{ t2g: number; eg: number }> = [
      { t2g: 0, eg: 0 }, { t2g: 0.6, eg: -0.4 },
      { t2g: 1.2, eg: -0.8 }, { t2g: 1.8, eg: -1.2 }, { t2g: 2.4, eg: -1.6 },
      { t2g: 1.2, eg: -0.8 }, { t2g: 0.6, eg: -0.4 }, { t2g: 0, eg: 0 },
      { t2g: -0.6, eg: 0.4 }, { t2g: -1.2, eg: 0.8 }, { t2g: 0, eg: 0 },
    ];
    void highSpin;
    const lookup = geometry === 'octahedral' ? octSplitting : tetSplitting;
    const entry = lookup[Math.min(dElectrons, 10)];
    const stabilization = (entry.t2g + entry.eg) * (geometry === 'octahedral' ? 1 : 1);
    return { stabilization, pairing: 0 };
  }

  // ─── Bond Order Statistics ───

  /** Average bond order across all bonds in a structure. */
  averageBondOrder(structure: LewisStructure): number {
    if (structure.bonds.length === 0) return 0;
    const sum = structure.bonds.reduce((s, b) => s + b.order, 0);
    return sum / structure.bonds.length;
  }

  /** Count bonds of a specific order. */
  countBondsByOrder(structure: LewisStructure, order: number): number {
    return structure.bonds.filter(b => b.order === order).length;
  }

  /** Estimate bond length from bond order (Badger's rule). */
  bondLengthFromOrder(singleBondLength: number, order: number): number {
    if (order <= 0) return 0;
    // Higher order = shorter bond
    return singleBondLength * Math.pow(order, -1 / 3);
  }

  // ─── Bond Polarity & Character ───

  /** Compute ionic vs covalent character classification. */
  bondCharacter(electronegDiff: number): {
    ionicPercent: number;
    covalentPercent: number;
    classification: string;
  } {
    const ionic = this.percentIonicCharacter(electronegDiff);
    const covalent = 100 - ionic;
    let classification: string;
    if (ionic < 5) classification = 'pure covalent';
    else if (ionic < 50) classification = 'polar covalent';
    else classification = 'ionic';
    return { ionicPercent: ionic, covalentPercent: covalent, classification };
  }

  // ─── Steric & Geometric Properties ───

  /** Estimate steric strain between two groups. */
  stericStrain(group1Size: number, group2Size: number, distance: number): number {
    if (distance <= 0) return 0;
    return (group1Size * group2Size) / (distance * distance);
  }

  /** Angle strain in a cyclic compound. */
  angleStrain(actualAngle: number, idealAngle: number): number {
    return Math.abs(actualAngle - idealAngle);
  }

  /** Torsional strain (eclipsed vs staggered). */
  torsionalStrain(dihedral: number): number {
    // Maximum at 0° (eclipsed), zero at 60° (staggered)
    return Math.abs(Math.cos(dihedral * Math.PI / 180));
  }

  // ─── Statistics & Lookups ───

  /** Total bond count by type. */
  countByType(type: BondType): number {
    return this._bonds.filter(b => b.type === type).length;
  }

  /** Average bond energy for stored bonds. */
  averageBondEnergy(): number {
    if (this._bonds.length === 0) return 0;
    const sum = this._bonds.reduce((s, b) => s + b.energy, 0);
    return sum / this._bonds.length;
  }

  /** Average bond length for stored bonds. */
  averageBondLength(): number {
    if (this._bonds.length === 0) return 0;
    const sum = this._bonds.reduce((s, b) => s + b.length, 0);
    return sum / this._bonds.length;
  }

  toPacket(): DataPacket<{
    bonds: Bond[];
    structures: Map<string, LewisStructure>;
    orbitals: HybridOrbital[];
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['chemistry', 'ChemicalBond'],
      priority: 1,
      phase: 'chemistry:bond',
    };
    return {
      id: `bond-${(++this._counter).toString(36)}-${Date.now().toString(36)}`,
      payload: {
        bonds: this._bonds,
        structures: this._structures,
        orbitals: this._orbitals,
        history: this._history,
      },
      metadata,
    };
  }

  reset(): void {
    this._bonds = [];
    this._structures = new Map();
    this._orbitals = [];
    this._history = [];
    this._counter = 0;
  }

  get bondCount(): number {
    return this._bonds.length;
  }

  get structureCount(): number {
    return this._structures.size;
  }

  get orbitalCount(): number {
    return this._orbitals.length;
  }

  get historyDepth(): number {
    return this._history.length;
  }

  /** Static reference to bond energy table. */
  public static readonly BOND_ENERGIES = BOND_ENERGIES;
  public static readonly BOND_LENGTHS = BOND_LENGTHS;
  public static readonly ELECTRONEGATIVITY = ELECTRONEGATIVITY;
}

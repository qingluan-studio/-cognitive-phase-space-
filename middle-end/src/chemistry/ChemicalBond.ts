import { DataPacket, PacketMeta } from '../shared/types';

/** Type of chemical bond. */
export type BondType = 'ionic' | 'covalent' | 'metallic' | 'hydrogen' | 'vanderwaals';

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

/** Bond energy lookup table by bond type. */
const BOND_ENERGIES: Record<string, number> = {
  'C-C': 347, 'C=C': 614, 'C≡C': 839,
  'C-H': 413, 'C-O': 358, 'C=O': 799,
  'C-N': 305, 'C≡N': 891, 'N-H': 391,
  'N-N': 160, 'N=N': 418, 'N≡N': 946,
  'O-H': 463, 'O-O': 146, 'O=O': 498,
  'H-H': 436, 'F-F': 155, 'Cl-Cl': 243,
  'H-F': 567, 'H-Cl': 431,
};

const BOND_LENGTHS: Record<string, number> = {
  'C-C': 154, 'C=C': 134, 'C≡C': 120,
  'C-H': 109, 'C-O': 143, 'C=O': 122,
  'C-N': 147, 'N-H': 101, 'O-H': 96,
  'H-H': 74, 'ionic': 240, 'metallic': 270, 'hydrogen': 180, 'vanderwaals': 340,
};

/** Compute and classify chemical bonds. */
export class ChemicalBond {
  private _bonds: Bond[] = [];
  private _structures: Map<string, LewisStructure> = new Map();
  private _orbitals: HybridOrbital[] = [];
  private _history: unknown[] = [];
  private _counter = 0;

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

  /** Compute formal charge on an atom given its bonds and lone pairs. */
  formalCharge(atom: string, bonds: number, lonePairs: number): number {
    const valence: Record<string, number> = { H: 1, C: 4, N: 5, O: 6, F: 7, Cl: 7 };
    const v = valence[atom] ?? 4;
    const fc = v - bonds - lonePairs;
    this._history.push({ method: 'formalCharge', atom, fc });
    return fc;
  }

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

  /** Compute bond order for a molecule. */
  bondOrder(molecule: string): number {
    const total = (molecule.match(/-/g) ?? []).length;
    const double = (molecule.match(/=/g) ?? []).length;
    const triple = (molecule.match(/≡/g) ?? []).length;
    const order = total + 2 * double + 3 * triple;
    this._history.push({ method: 'bondOrder', molecule, order });
    return order;
  }

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

  /** Classify polarity from electronegativity difference. */
  polarity(electronegDiff: number): 'nonpolar' | 'polar' | 'ionic' {
    let result: 'nonpolar' | 'polar' | 'ionic';
    if (electronegDiff < 0.4) result = 'nonpolar';
    else if (electronegDiff < 1.7) result = 'polar';
    else result = 'ionic';
    this._history.push({ method: 'polarity', electronegDiff, result });
    return result;
  }

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
}

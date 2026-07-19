import { DataPacket, PacketMeta } from '../shared/types';

/** Functional group descriptor. */
export interface FunctionalGroup {
  name: string;
  formula: string;
  suffix: string;
}

/** Isomer record. */
export interface Isomer {
  type: 'structural' | 'cis-trans' | 'optical' | 'conformational';
  structures: string[];
}

/** Organic reaction descriptor. */
export interface OrganicReaction {
  type: string;
  mechanism: string;
}

/** Hydrocarbon chain record. */
export interface Hydrocarbon {
  name: string;
  formula: string;
  carbons: number;
  saturation: 'saturated' | 'unsaturated';
}

const ALKANE_PREFIXES: string[] = ['', 'meth', 'eth', 'prop', 'but', 'pent', 'hex', 'hept', 'oct', 'non', 'dec'];

/** Build and reason about organic chemistry structures. */
export class OrganicChemistry {
  private _groups: FunctionalGroup[] = [];
  private _isomers: Isomer[] = [];
  private _reactions: OrganicReaction[] = [];
  private _history: unknown[] = [];
  private _counter = 0;

  constructor() {
    this._seedFunctionalGroups();
  }

  private _seedFunctionalGroups(): void {
    const seed: Array<[string, string, string]> = [
      ['alcohol', '-OH', '-ol'],
      ['aldehyde', '-CHO', '-al'],
      ['ketone', 'C=O', '-one'],
      ['carboxylic acid', '-COOH', '-oic acid'],
      ['ester', '-COO-', '-oate'],
      ['amine', '-NH2', '-amine'],
      ['ether', '-O-', '-ether'],
      ['amide', '-CONH2', '-amide'],
      ['nitrile', '-C≡N', '-nitrile'],
      ['thiol', '-SH', '-thiol'],
    ];
    for (const [name, formula, suffix] of seed) {
      this._groups.push({ name, formula, suffix });
    }
  }

  private _prefix(n: number): string {
    return ALKANE_PREFIXES[Math.min(n, ALKANE_PREFIXES.length - 1)] ?? `C${n}`;
  }

  /** Construct an alkane of n carbons. */
  alkane(n: number): Hydrocarbon {
    const name = `${this._prefix(n)}ane`;
    const formula = `C${n}H${2 * n + 2}`;
    this._history.push({ method: 'alkane', n });
    return { name, formula, carbons: n, saturation: 'saturated' };
  }

  /** Construct an alkene of n carbons. */
  alkene(n: number): Hydrocarbon {
    const name = `${this._prefix(n)}ene`;
    const formula = n > 1 ? `C${n}H${2 * n}` : `C${n}H${2 * n + 2}`;
    this._history.push({ method: 'alkene', n });
    return { name, formula, carbons: n, saturation: 'unsaturated' };
  }

  /** Construct an alkyne of n carbons. */
  alkyne(n: number): Hydrocarbon {
    const name = `${this._prefix(n)}yne`;
    const formula = n > 1 ? `C${n}H${2 * n - 2}` : `C${n}H${2 * n + 2}`;
    this._history.push({ method: 'alkyne', n });
    return { name, formula, carbons: n, saturation: 'unsaturated' };
  }

  /** Construct an alcohol of n carbons. */
  alcohol(n: number): { name: string; formula: string } {
    const name = `${this._prefix(n)}an-1-ol`;
    const formula = `C${n}H${2 * n + 1}OH`;
    this._history.push({ method: 'alcohol', n });
    return { name, formula };
  }

  /** Construct an aldehyde of n carbons. */
  aldehyde(n: number): { name: string; formula: string } {
    const name = `${this._prefix(n)}anal`;
    const formula = n === 1 ? 'CH2O' : `C${n}H${2 * n}O`;
    this._history.push({ method: 'aldehyde', n });
    return { name, formula };
  }

  /** Construct a ketone of n carbons (n >= 3). */
  ketone(n: number): { name: string; formula: string } {
    const name = `${this._prefix(n)}an-2-one`;
    const formula = `C${n}H${2 * n}O`;
    this._history.push({ method: 'ketone', n });
    return { name, formula };
  }

  /** Construct a carboxylic acid of n carbons. */
  carboxylicAcid(n: number): { name: string; formula: string } {
    const name = `${this._prefix(n)}anoic acid`;
    const formula = n === 1 ? 'CH2O2' : `C${n}H${2 * n}O2`;
    this._history.push({ method: 'carboxylicAcid', n });
    return { name, formula };
  }

  /** Construct an ester of n carbons. */
  ester(n: number): { name: string; formula: string } {
    const name = `${this._prefix(n - 1)}yl ${this._prefix(1)}anoate`;
    const formula = `C${n}H${2 * n}O2`;
    this._history.push({ method: 'ester', n });
    return { name, formula };
  }

  /** Construct an amine of n carbons. */
  amine(n: number): { name: string; formula: string } {
    const name = `${this._prefix(n)}an-1-amine`;
    const formula = `C${n}H${2 * n + 3}N`;
    this._history.push({ method: 'amine', n });
    return { name, formula };
  }

  /** Construct substituted benzene. */
  benzene(substituents: string[]): { name: string; formula: string } {
    const parts = substituents.length > 0 ? substituents.join('-') + '-' : '';
    const name = `${parts}benzene`;
    this._history.push({ method: 'benzene', substituents });
    return { name, formula: 'C6H6' };
  }

  /** Generate IUPAC name from a structure token string. */
  iupacName(structure: string): string {
    const tokens = structure.split(';').map(t => t.trim()).filter(Boolean);
    if (tokens.length === 0) return 'unknown';
    const carbonCount = tokens.filter(t => t.startsWith('C')).length;
    const fg = tokens.find(t => t.startsWith('FG:'));
    const prefix = this._prefix(carbonCount);
    if (!fg) return `${prefix}ane`;
    const fgName = fg.substring(3);
    const mapping: Record<string, string> = {
      alcohol: `${prefix}an-1-ol`,
      aldehyde: `${prefix}anal`,
      ketone: `${prefix}an-2-one`,
      'carboxylic acid': `${prefix}anoic acid`,
      ester: `${prefix}anoate`,
      amine: `${prefix}an-1-amine`,
    };
    this._history.push({ method: 'iupacName', structure });
    return mapping[fgName] ?? `${prefix}ane`;
  }

  /** Reverse a name into a structural formula stub. */
  structuralFormula(name: string): string {
    const m = name.match(/^([a-z]+)(an|ene|yne)/);
    if (!m) return name;
    const prefix = m[1];
    const idx = ALKANE_PREFIXES.indexOf(prefix);
    if (idx < 0) return name;
    const n = idx;
    if (name.endsWith('ane')) return `C${n}H${2 * n + 2}`;
    if (name.endsWith('ene')) return `C${n}H${2 * n}`;
    if (name.endsWith('yne')) return `C${n}H${2 * n - 2}`;
    return name;
  }

  /** Estimate number of structural isomers for a formula. */
  isomerCount(formula: string): number {
    const m = formula.match(/C(\d+)/);
    if (!m) return 1;
    const n = parseInt(m[1], 10);
    const table: Record<number, number> = { 1: 1, 2: 1, 3: 1, 4: 2, 5: 3, 6: 5, 7: 9, 8: 18, 9: 35, 10: 75 };
    this._history.push({ method: 'isomerCount', formula });
    return table[n] ?? Math.max(1, Math.floor(Math.pow(2, n - 3)));
  }

  /** Enumerate structural isomers (limited enumeration). */
  structuralIsomers(formula: string): Isomer {
    const m = formula.match(/C(\d+)/);
    const n = m ? parseInt(m[1], 10) : 1;
    const structures: string[] = [];
    const count = Math.min(n, 4);
    for (let i = 0; i < count; i++) {
      structures.push(`C${n - i}-C${i || ''}`.replace(/-C$/, ''));
    }
    const isomer: Isomer = { type: 'structural', structures };
    this._isomers.push(isomer);
    this._history.push({ method: 'structuralIsomers', formula });
    return isomer;
  }

  /** Enumerate stereoisomers. */
  stereoisomers(formula: string): Isomer {
    const m = formula.match(/C(\d+)/);
    const n = m ? parseInt(m[1], 10) : 1;
    const structures = n > 2 ? ['cis', 'trans'] : ['none'];
    const isomer: Isomer = { type: 'cis-trans', structures };
    this._isomers.push(isomer);
    this._history.push({ method: 'stereoisomers', formula });
    return isomer;
  }

  /** Substitution reaction. */
  substitution(substrate: string, reagent: string): OrganicReaction {
    const r: OrganicReaction = {
      type: 'substitution',
      mechanism: `${substrate} + ${reagent} -> substituted product + leaving group`,
    };
    this._reactions.push(r);
    this._history.push({ method: 'substitution' });
    return r;
  }

  /** Addition reaction. */
  addition(alkene: string, reagent: string): OrganicReaction {
    const r: OrganicReaction = {
      type: 'addition',
      mechanism: `${alkene} + ${reagent} -> saturated product`,
    };
    this._reactions.push(r);
    this._history.push({ method: 'addition' });
    return r;
  }

  /** Elimination reaction. */
  elimination(substrate: string): OrganicReaction {
    const r: OrganicReaction = {
      type: 'elimination',
      mechanism: `${substrate} -> alkene + small molecule (HX or H2O)`,
    };
    this._reactions.push(r);
    this._history.push({ method: 'elimination' });
    return r;
  }

  /** Condensation reaction. */
  condensation(a: string, b: string): OrganicReaction {
    const r: OrganicReaction = {
      type: 'condensation',
      mechanism: `${a} + ${b} -> larger molecule + H2O`,
    };
    this._reactions.push(r);
    this._history.push({ method: 'condensation' });
    return r;
  }

  /** Hydrolysis reaction. */
  hydrolysis(substrate: string): OrganicReaction {
    const r: OrganicReaction = {
      type: 'hydrolysis',
      mechanism: `${substrate} + H2O -> two smaller molecules`,
    };
    this._reactions.push(r);
    this._history.push({ method: 'hydrolysis' });
    return r;
  }

  /** Polymerization of monomers. */
  polymerization(monomers: string[]): OrganicReaction {
    const r: OrganicReaction = {
      type: 'polymerization',
      mechanism: `${monomers.length} monomers -> polymer chain`,
    };
    this._reactions.push(r);
    this._history.push({ method: 'polymerization', count: monomers.length });
    return r;
  }

  /** Electrophilic aromatic substitution on benzene. */
  aromaticSubstitution(benzene: string, reagent: string): OrganicReaction {
    const r: OrganicReaction = {
      type: 'aromatic-substitution',
      mechanism: `${benzene} + ${reagent} -> substituted benzene + H+`,
    };
    this._reactions.push(r);
    this._history.push({ method: 'aromaticSubstitution' });
    return r;
  }

  toPacket(): DataPacket<{
    groups: FunctionalGroup[];
    isomers: Isomer[];
    reactions: OrganicReaction[];
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['chemistry', 'OrganicChemistry'],
      priority: 1,
      phase: 'chemistry:organic',
    };
    return {
      id: `org-${(++this._counter).toString(36)}-${Date.now().toString(36)}`,
      payload: {
        groups: this._groups,
        isomers: this._isomers,
        reactions: this._reactions,
        history: this._history,
      },
      metadata,
    };
  }

  reset(): void {
    this._groups = [];
    this._isomers = [];
    this._reactions = [];
    this._history = [];
    this._counter = 0;
    this._seedFunctionalGroups();
  }

  get groupCount(): number {
    return this._groups.length;
  }

  get isomerCountList(): number {
    return this._isomers.length;
  }

  get reactionCount(): number {
    return this._reactions.length;
  }

  get historyDepth(): number {
    return this._history.length;
  }
}

import { DataPacket, PacketMeta } from '../shared/types';

/** Crystal system. */
export interface CrystalSystem {
  name: string;
  axes: [number, number, number];
  angles: [number, number, number];
  symmetry: string;
}

/** Mohs hardness scale entry. */
export interface MohsScale {
  rank: number;
  mineral: string;
  hardness: number;
  reference: string;
}

/** Mineral properties. */
export interface Mineral {
  id: string;
  name: string;
  formula: string;
  hardness: number;
  luster: string;
  color: string;
  streak: string;
  cleavage: string;
  fracture: string;
  specificGravity: number;
  crystalSystem: string;
  group: string;
}

/** Mineral identification input. */
export interface MineralProperties {
  hardness: number;
  luster: string;
  color: string;
  streak: string;
  cleavage: string;
  specificGravity: number;
}

/** History record. */
interface MineralRecord {
  operation: string;
  mineral: string;
  timestamp: number;
}

const MOHS_SCALE: MohsScale[] = [
  { rank: 1, mineral: 'Talc', hardness: 1, reference: 'very soft' },
  { rank: 2, mineral: 'Gypsum', hardness: 2, reference: 'fingernail scratchable' },
  { rank: 3, mineral: 'Calcite', hardness: 3, reference: 'copper coin scratchable' },
  { rank: 4, mineral: 'Fluorite', hardness: 4, reference: 'knife scratchable' },
  { rank: 5, mineral: 'Apatite', hardness: 5, reference: 'glass scratchable' },
  { rank: 6, mineral: 'Orthoclase', hardness: 6, reference: 'steel scratchable' },
  { rank: 7, mineral: 'Quartz', hardness: 7, reference: 'scratches glass' },
  { rank: 8, mineral: 'Topaz', hardness: 8, reference: 'scratches quartz' },
  { rank: 9, mineral: 'Corundum', hardness: 9, reference: 'scratches topaz' },
  { rank: 10, mineral: 'Diamond', hardness: 10, reference: 'hardest natural mineral' },
];

const CRYSTAL_SYSTEMS: CrystalSystem[] = [
  { name: 'cubic', axes: [1, 1, 1], angles: [90, 90, 90], symmetry: 'm3m' },
  { name: 'tetragonal', axes: [1, 1, 2], angles: [90, 90, 90], symmetry: '4/mmm' },
  { name: 'orthorhombic', axes: [1, 2, 3], angles: [90, 90, 90], symmetry: 'mmm' },
  { name: 'hexagonal', axes: [1, 1, 2], angles: [90, 90, 120], symmetry: '6/mmm' },
  { name: 'trigonal', axes: [1, 1, 2], angles: [90, 90, 120], symmetry: '3m' },
  { name: 'monoclinic', axes: [1, 2, 3], angles: [90, 100, 90], symmetry: '2/m' },
  { name: 'triclinic', axes: [1, 2, 3], angles: [85, 95, 100], symmetry: '1' },
];

const MINERALS_DB: Mineral[] = [
  { id: 'm1', name: 'Quartz', formula: 'SiO₂', hardness: 7, luster: 'vitreous', color: 'colorless', streak: 'white', cleavage: 'none', fracture: 'conchoidal', specificGravity: 2.65, crystalSystem: 'trigonal', group: 'silicates' },
  { id: 'm2', name: 'Feldspar', formula: 'KAlSi₃O₈', hardness: 6, luster: 'vitreous', color: 'pink/white', streak: 'white', cleavage: 'two directions', fracture: 'uneven', specificGravity: 2.56, crystalSystem: 'triclinic', group: 'silicates' },
  { id: 'm3', name: 'Mica', formula: 'KAl₂(AlSi₃O₁₀)(OH)₂', hardness: 2.5, luster: 'pearly', color: 'clear/black', streak: 'white', cleavage: 'perfect basal', fracture: 'elastic', specificGravity: 2.82, crystalSystem: 'monoclinic', group: 'silicates' },
  { id: 'm4', name: 'Calcite', formula: 'CaCO₃', hardness: 3, luster: 'vitreous', color: 'colorless/white', streak: 'white', cleavage: 'rhombohedral', fracture: 'conchoidal', specificGravity: 2.71, crystalSystem: 'trigonal', group: 'carbonates' },
  { id: 'm5', name: 'Halite', formula: 'NaCl', hardness: 2.5, luster: 'vitreous', color: 'colorless', streak: 'white', cleavage: 'cubic', fracture: 'conchoidal', specificGravity: 2.16, crystalSystem: 'cubic', group: 'halides' },
  { id: 'm6', name: 'Diamond', formula: 'C', hardness: 10, luster: 'adamantine', color: 'colorless', streak: 'white', cleavage: 'octahedral', fracture: 'conchoidal', specificGravity: 3.52, crystalSystem: 'cubic', group: 'native elements' },
  { id: 'm7', name: 'Pyrite', formula: 'FeS₂', hardness: 6.5, luster: 'metallic', color: 'brass yellow', streak: 'greenish-black', cleavage: 'indistinct', fracture: 'conchoidal/uneven', specificGravity: 5.02, crystalSystem: 'cubic', group: 'sulfides' },
  { id: 'm8', name: 'Hematite', formula: 'Fe₂O₃', hardness: 5.5, luster: 'metallic/earthy', color: 'red-brown', streak: 'red-brown', cleavage: 'none', fracture: 'uneven', specificGravity: 5.26, crystalSystem: 'hexagonal', group: 'oxides' },
  { id: 'm9', name: 'Gypsum', formula: 'CaSO₄·2H₂O', hardness: 2, luster: 'vitreous', color: 'white', streak: 'white', cleavage: 'one direction', fracture: 'splintery', specificGravity: 2.32, crystalSystem: 'monoclinic', group: 'sulfates' },
  { id: 'm10', name: 'Topaz', formula: 'Al₂SiO₄(F,OH)₂', hardness: 8, luster: 'vitreous', color: 'yellow/colorless', streak: 'white', cleavage: 'basal', fracture: 'conchoidal', specificGravity: 3.53, crystalSystem: 'orthorhombic', group: 'silicates' },
];

export class Mineralogy {
  private _minerals: Map<string, Mineral> = new Map(MINERALS_DB.map(m => [m.id, m]));
  private _crystalSystems: CrystalSystem[] = [...CRYSTAL_SYSTEMS];
  private _mohsScale: MohsScale[] = [...MOHS_SCALE];
  private _history: MineralRecord[] = [];

  identify(properties: MineralProperties): Mineral | null {
    const candidates = Array.from(this._minerals.values()).filter(m => {
      const hardMatch = Math.abs(m.hardness - properties.hardness) < 1;
      const lusterMatch = m.luster.toLowerCase().includes(properties.luster.toLowerCase());
      return hardMatch && lusterMatch;
    });
    return candidates[0] ?? null;
  }

  mohsHardness(mineral: Mineral): MohsScale {
    const closest = this._mohsScale.reduce((best, cur) =>
      Math.abs(cur.hardness - mineral.hardness) < Math.abs(best.hardness - mineral.hardness) ? cur : best,
    );
    return closest;
  }

  crystalSystem(mineral: Mineral): CrystalSystem | null {
    return this._crystalSystems.find(c => c.name === mineral.crystalSystem) ?? null;
  }

  mineralFormula(name: string): string {
    const mineral = Array.from(this._minerals.values()).find(m => m.name.toLowerCase() === name.toLowerCase());
    return mineral?.formula ?? 'unknown';
  }

  streak(mineral: Mineral): string {
    return mineral.streak;
  }

  luster(mineral: Mineral): string {
    return mineral.luster;
  }

  cleavage(mineral: Mineral): string {
    return mineral.cleavage;
  }

  fracture(mineral: Mineral): string {
    return mineral.fracture;
  }

  color(mineral: Mineral): string {
    return mineral.color;
  }

  specificGravity(mineral: Mineral): number {
    return mineral.specificGravity;
  }

  silicateStructure(type: 'nesosilicate' | 'sorosilicate' | 'inosilicate' | 'cyclosilicate' | 'tectosilicate' | 'phyllosilicate'): { name: string; sioRatio: string; examples: string[] } {
    const structures: Record<typeof type, { name: string; sioRatio: string; examples: string[] }> = {
      nesosilicate: { name: 'island silicate', sioRatio: 'SiO₄', examples: ['olivine', 'garnet', 'zircon'] },
      sorosilicate: { name: 'double tetrahedra', sioRatio: 'Si₂O₇', examples: ['epidote', 'vesuvianite'] },
      inosilicate: { name: 'chain silicate', sioRatio: 'SiO₃', examples: ['pyroxene', 'amphibole'] },
      cyclosilicate: { name: 'ring silicate', sioRatio: 'SiO₃', examples: ['beryl', 'tourmaline'] },
      tectosilicate: { name: 'framework silicate', sioRatio: 'SiO₂', examples: ['quartz', 'feldspar'] },
      phyllosilicate: { name: 'sheet silicate', sioRatio: 'Si₂O₅', examples: ['mica', 'talc', 'clay'] },
    };
    return structures[type];
  }

  carbonateTest(mineral: Mineral): { effervescence: boolean; acidReaction: string } {
    if (mineral.formula.includes('CO₃')) {
      return {
        effervescence: true,
        acidReaction: 'CaCO₃ + 2HCl → CaCl₂ + H₂O + CO₂',
      };
    }
    return { effervescence: false, acidReaction: 'no reaction' };
  }

  thinSection(mineral: Mineral): { birefringence: number; relief: string; pleochroism: boolean } {
    const birefringenceTable: Record<string, number> = {
      quartz: 0.009, calcite: 0.172, feldspar: 0.008, mica: 0.045, pyroxene: 0.025, amphibole: 0.022,
    };
    const birefringence = birefringenceTable[mineral.name.toLowerCase()] ?? 0.01;
    return {
      birefringence,
      relief: mineral.specificGravity > 3.5 ? 'high' : mineral.specificGravity > 2.7 ? 'moderate' : 'low',
      pleochroism: ['amphibole', 'biotite', 'pyroxene'].includes(mineral.name.toLowerCase()),
    };
  }

  opticalProperties(mineral: Mineral): { isotropic: boolean; refractiveIndex: number; opticSign: string } {
    const cubic = mineral.crystalSystem === 'cubic';
    return {
      isotropic: cubic,
      refractiveIndex: 1.4 + mineral.specificGravity * 0.2,
      opticSign: cubic ? 'isotropic' : mineral.crystalSystem === 'monoclinic' ? 'biaxial' : 'uniaxial',
    };
  }

  mineralClassification(mineral: Mineral): { group: string; subclass: string } {
    return {
      group: mineral.group,
      subclass: mineral.group === 'silicates' ? this._silicateSubclass(mineral) : 'N/A',
    };
  }

  mineralGroup(name: string): string {
    const mineral = Array.from(this._minerals.values()).find(m => m.name.toLowerCase() === name.toLowerCase());
    return mineral?.group ?? 'unknown';
  }

  toPacket(): DataPacket<{ minerals: Map<string, Mineral>; crystalSystems: CrystalSystem[]; mohsScale: MohsScale[]; history: MineralRecord[] }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['geology', 'Mineralogy'],
      priority: 1,
      phase: 'mineralogy',
    };
    return {
      id: `mineralogy-${Date.now().toString(36)}`,
      payload: {
        minerals: this._minerals,
        crystalSystems: this._crystalSystems,
        mohsScale: this._mohsScale,
        history: this._history,
      },
      metadata,
    };
  }

  reset(): void {
    this._minerals = new Map(MINERALS_DB.map(m => [m.id, m]));
    this._crystalSystems = [...CRYSTAL_SYSTEMS];
    this._mohsScale = [...MOHS_SCALE];
    this._history = [];
  }

  get mineralCount(): number { return this._minerals.size; }
  get crystalSystemCount(): number { return this._crystalSystems.length; }
  get mohsScaleLength(): number { return this._mohsScale.length; }

  private _silicateSubclass(mineral: Mineral): string {
    const f = mineral.formula;
    if (f.includes('SiO₂')) return 'tectosilicate';
    if (f.includes('SiO₃')) return 'inosilicate';
    if (f.includes('Si₂O₅')) return 'phyllosilicate';
    if (f.includes('Si₂O₇')) return 'sorosilicate';
    if (f.includes('SiO₄')) return 'nesosilicate';
    return 'unknown';
  }
}

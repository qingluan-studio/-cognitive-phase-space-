import { DataPacket, PacketMeta } from '../shared/types';

/** Generic material descriptor. */
export interface Material {
  readonly name: string;
  readonly type: 'concrete' | 'steel' | 'wood' | 'masonry' | 'glass' | 'insulation' | 'composite' | 'polymer';
  readonly properties: MaterialProperties;
  readonly sustainability: Sustainability;
}

/** Mechanical and physical properties of a material. */
export interface MaterialProperties {
  readonly density: number;
  readonly youngsModulus: number;
  readonly yieldStrength: number;
  readonly compressiveStrength: number;
  readonly tensileStrength: number;
  readonly thermalConductivity: number;
  readonly specificHeat: number;
}

/** Sustainability descriptor for a material. */
export interface Sustainability {
  readonly embodiedCarbon: number;
  readonly recyclability: number;
  readonly bioBased: boolean;
  readonly localSourcing: boolean;
  readonly lifespan: number;
}

/** Concrete mix design. */
export interface Concrete {
  readonly mix: ConcreteMix;
  readonly strength: ConcreteStrength;
  readonly durability: ConcreteDurability;
}

/** Concrete mix proportions. */
export interface ConcreteMix {
  readonly cement: number;
  readonly water: number;
  readonly fineAggregate: number;
  readonly coarseAggregate: number;
  readonly admixtures: string[];
  readonly waterCementRatio: number;
}

/** Concrete strength grading. */
export interface ConcreteStrength {
  readonly grade: string;
  readonly compressive28d: number;
  readonly tensileStrength: number;
  readonly flexuralStrength: number;
  readonly elasticModulus: number;
}

/** Concrete durability descriptor. */
export interface ConcreteDurability {
  readonly freezeThawResistance: number;
  readonly chloridePenetration: number;
  readonly sulfateResistance: number;
  readonly alkaliSilicaReaction: 'low' | 'moderate' | 'high';
  readonly carbonationDepth: number;
}

/** Steel grade descriptor. */
export interface Steel {
  readonly grade: string;
  readonly properties: SteelProperties;
}

/** Steel mechanical properties. */
export interface SteelProperties {
  readonly yieldStrength: number;
  readonly ultimateStrength: number;
  readonly elongation: number;
  readonly hardness: number;
  readonly weldability: number;
  readonly corrosionResistance: number;
}

/** Carbon footprint analysis. */
export interface CarbonFootprint {
  readonly material: string;
  readonly embodiedCarbon: number;
  readonly transportCarbon: number;
  readonly endOfLifeCarbon: number;
  readonly total: number;
  readonly stage: 'A1-A3' | 'A4-A5' | 'B1-B7' | 'C1-C4';
}

/** Fire resistance rating. */
export interface FireResistance {
  readonly material: string;
  readonly ratingMinutes: number;
  readonly flameSpreadIndex: number;
  readonly smokeDevelopedIndex: number;
  readonly nonCombustible: boolean;
}

export class BuildingMaterials {
  private _materials: Map<string, Material> = new Map();
  private _concrete: Map<string, Concrete> = new Map();
  private _steel: Map<string, Steel> = new Map();
  private _carbonFootprints: CarbonFootprint[] = [];
  private _fireRatings: Map<string, FireResistance> = new Map();
  private _history: unknown[] = [];
  private _counter = 0;

  constructor() {
    this._seedMaterials();
  }

  private _seedMaterials(): void {
    const basicConcrete: Material = {
      name: 'C30 Concrete',
      type: 'concrete',
      properties: {
        density: 2400,
        youngsModulus: 30e9,
        yieldStrength: 30e6,
        compressiveStrength: 30e6,
        tensileStrength: 3e6,
        thermalConductivity: 1.7,
        specificHeat: 880,
      },
      sustainability: {
        embodiedCarbon: 410,
        recyclability: 0.6,
        bioBased: false,
        localSourcing: true,
        lifespan: 60,
      },
    };
    const rebarSteel: Material = {
      name: 'HRB400 Rebar',
      type: 'steel',
      properties: {
        density: 7850,
        youngsModulus: 200e9,
        yieldStrength: 400e6,
        compressiveStrength: 400e6,
        tensileStrength: 540e6,
        thermalConductivity: 50,
        specificHeat: 490,
      },
      sustainability: {
        embodiedCarbon: 1850,
        recyclability: 0.95,
        bioBased: false,
        localSourcing: true,
        lifespan: 80,
      },
    };
    const structuralTimber: Material = {
      name: 'Glulam Spruce',
      type: 'wood',
      properties: {
        density: 470,
        youngsModulus: 14e9,
        yieldStrength: 40e6,
        compressiveStrength: 30e6,
        tensileStrength: 70e6,
        thermalConductivity: 0.13,
        specificHeat: 1600,
      },
      sustainability: {
        embodiedCarbon: -250,
        recyclability: 0.7,
        bioBased: true,
        localSourcing: true,
        lifespan: 50,
      },
    };
    this._materials.set('C30', basicConcrete);
    this._materials.set('HRB400', rebarSteel);
    this._materials.set('GLULAM', structuralTimber);
  }

  concreteMix(cement: number, water: number, fineAgg: number, coarseAgg: number, admixtures: string[] = []): Concrete {
    const wcRatio = water / cement;
    const mix: ConcreteMix = {
      cement,
      water,
      fineAggregate: fineAgg,
      coarseAggregate: coarseAgg,
      admixtures,
      waterCementRatio: wcRatio,
    };
    const grade = `C${Math.round(40 - (wcRatio - 0.4) * 80)}`;
    const compressive28d = (40 - (wcRatio - 0.4) * 80) * 1e6;
    const strength: ConcreteStrength = {
      grade,
      compressive28d,
      tensileStrength: 0.1 * compressive28d,
      flexuralStrength: 0.6 * Math.sqrt(compressive28d / 1e6) * 1e6,
      elasticModulus: 4700 * Math.sqrt(compressive28d / 1e6) * 1e6,
    };
    const durability: ConcreteDurability = {
      freezeThawResistance: Math.max(0, 1 - wcRatio),
      chloridePenetration: wcRatio * 100,
      sulfateResistance: 0.7,
      alkaliSilicaReaction: wcRatio > 0.5 ? 'high' : wcRatio > 0.45 ? 'moderate' : 'low',
      carbonationDepth: wcRatio * 20,
    };
    const concrete: Concrete = { mix, strength, durability };
    const id = `concrete-${++this._counter}`;
    this._concrete.set(id, concrete);
    this._history.push({ op: 'concreteMix', id, grade });
    return concrete;
  }

  concreteStrength(grade: string): ConcreteStrength | null {
    for (const c of this._concrete.values()) {
      if (c.strength.grade === grade) return c.strength;
    }
    return null;
  }

  steelGrade(grade: string): Steel {
    let steel = this._steel.get(grade);
    if (!steel) {
      const yieldMap: Record<string, number> = {
        Q235: 235e6,
        Q345: 345e6,
        Q390: 390e6,
        Q420: 420e6,
        Q460: 460e6,
      };
      const yieldStrength = yieldMap[grade] || 345e6;
      steel = {
        grade,
        properties: {
          yieldStrength,
          ultimateStrength: yieldStrength * 1.5,
          elongation: 0.2,
          hardness: 150,
          weldability: 0.85,
          corrosionResistance: 0.4,
        },
      };
      this._steel.set(grade, steel);
    }
    this._history.push({ op: 'steelGrade', grade });
    return steel;
  }

  steelProperties(grade: string): SteelProperties {
    return this.steelGrade(grade).properties;
  }

  woodProperties(species: 'spruce' | 'pine' | 'oak' | 'bamboo' | 'cedar'): MaterialProperties {
    const map: Record<string, MaterialProperties> = {
      spruce: {
        density: 430,
        youngsModulus: 11e9,
        yieldStrength: 36e6,
        compressiveStrength: 28e6,
        tensileStrength: 60e6,
        thermalConductivity: 0.11,
        specificHeat: 1600,
      },
      pine: {
        density: 500,
        youngsModulus: 12e9,
        yieldStrength: 40e6,
        compressiveStrength: 32e6,
        tensileStrength: 70e6,
        thermalConductivity: 0.13,
        specificHeat: 1600,
      },
      oak: {
        density: 720,
        youngsModulus: 16e9,
        yieldStrength: 55e6,
        compressiveStrength: 45e6,
        tensileStrength: 90e6,
        thermalConductivity: 0.16,
        specificHeat: 1700,
      },
      bamboo: {
        density: 600,
        youngsModulus: 18e9,
        yieldStrength: 80e6,
        compressiveStrength: 60e6,
        tensileStrength: 150e6,
        thermalConductivity: 0.17,
        specificHeat: 1500,
      },
      cedar: {
        density: 380,
        youngsModulus: 8e9,
        yieldStrength: 30e6,
        compressiveStrength: 24e6,
        tensileStrength: 50e6,
        thermalConductivity: 0.1,
        specificHeat: 1600,
      },
    };
    this._history.push({ op: 'woodProperties', species });
    return map[species];
  }

  masonry(unitType: 'brick' | 'block' | 'stone' | 'aac'): { compressiveStrength: number; density: number; thickness: number } {
    const map: Record<string, { compressiveStrength: number; density: number; thickness: number }> = {
      brick: { compressiveStrength: 15e6, density: 1900, thickness: 0.24 },
      block: { compressiveStrength: 10e6, density: 1600, thickness: 0.19 },
      stone: { compressiveStrength: 40e6, density: 2600, thickness: 0.4 },
      aac: { compressiveStrength: 5e6, density: 600, thickness: 0.2 },
    };
    this._history.push({ op: 'masonry', unitType });
    return map[unitType];
  }

  glass(type: 'float' | 'tempered' | 'laminated' | 'insulated' | 'low-e'): { uValue: number; shgc: number; vt: number; thickness: number } {
    const map: Record<string, { uValue: number; shgc: number; vt: number; thickness: number }> = {
      float: { uValue: 5.8, shgc: 0.82, vt: 0.9, thickness: 0.006 },
      tempered: { uValue: 5.8, shgc: 0.82, vt: 0.88, thickness: 0.01 },
      laminated: { uValue: 5.7, shgc: 0.78, vt: 0.85, thickness: 0.012 },
      insulated: { uValue: 1.8, shgc: 0.7, vt: 0.78, thickness: 0.024 },
      'low-e': { uValue: 1.4, shgc: 0.4, vt: 0.7, thickness: 0.024 },
    };
    this._history.push({ op: 'glass', type });
    return map[type];
  }

  insulation(type: 'eps' | 'xps' | 'rockwool' | 'fiberglass' | 'polyurethane'): { conductivity: number; rValue: number; fireRating: string } {
    const map: Record<string, { conductivity: number; rValue: number; fireRating: string }> = {
      eps: { conductivity: 0.038, rValue: 0.78, fireRating: 'B2' },
      xps: { conductivity: 0.034, rValue: 0.88, fireRating: 'B2' },
      rockwool: { conductivity: 0.04, rValue: 0.75, fireRating: 'A1' },
      fiberglass: { conductivity: 0.04, rValue: 0.7, fireRating: 'A1' },
      polyurethane: { conductivity: 0.024, rValue: 1.25, fireRating: 'B2' },
    };
    this._history.push({ op: 'insulation', type });
    return map[type];
  }

  composite(matrix: 'epoxy' | 'polyester' | 'vinylester' | 'phenolic', fiber: 'glass' | 'carbon' | 'aramid' | 'basalt'): MaterialProperties {
    const fiberStrengthMap: Record<string, number> = {
      glass: 2400e6,
      carbon: 4000e6,
      aramid: 3600e6,
      basalt: 2800e6,
    };
    const fiberModulusMap: Record<string, number> = {
      glass: 72e9,
      carbon: 230e9,
      aramid: 130e9,
      basalt: 90e9,
    };
    const densityMap: Record<string, number> = {
      glass: 1900,
      carbon: 1600,
      aramid: 1400,
      basalt: 2100,
    };
    const fiberVolume = 0.6;
    const props: MaterialProperties = {
      density: densityMap[fiber],
      youngsModulus: fiberModulusMap[fiber] * fiberVolume + 4e9 * (1 - fiberVolume),
      yieldStrength: fiberStrengthMap[fiber] * fiberVolume,
      compressiveStrength: fiberStrengthMap[fiber] * fiberVolume * 0.7,
      tensileStrength: fiberStrengthMap[fiber] * fiberVolume,
      thermalConductivity: 0.3,
      specificHeat: 1100,
    };
    this._history.push({ op: 'composite', matrix, fiber });
    return props;
  }

  sustainability(materialName: string): Sustainability | null {
    const material = this._materials.get(materialName);
    return material ? material.sustainability : null;
  }

  carbonFootprint(materialName: string, massKg: number, transportKm: number): CarbonFootprint {
    const material = this._materials.get(materialName);
    const embodied = material ? material.sustainability.embodiedCarbon * massKg : massKg * 0.5;
    const transport = massKg * transportKm * 0.0001;
    const endOfLife = massKg * 0.05;
    const footprint: CarbonFootprint = {
      material: materialName,
      embodiedCarbon: embodied,
      transportCarbon: transport,
      endOfLifeCarbon: endOfLife,
      total: embodied + transport + endOfLife,
      stage: 'A1-A3',
    };
    this._carbonFootprints.push(footprint);
    this._history.push({ op: 'carbonFootprint', materialName, total: footprint.total });
    return footprint;
  }

  thermalConductivity(materialName: string): number {
    const material = this._materials.get(materialName);
    return material ? material.properties.thermalConductivity : 0;
  }

  acousticProperties(materialName: string): { absorption: number; transmissionLoss: number; nrc: number } {
    const material = this._materials.get(materialName);
    if (!material) return { absorption: 0, transmissionLoss: 0, nrc: 0 };
    const m = material;
    let absorption: number;
    let transmissionLoss: number;
    switch (m.type) {
      case 'wood':
        absorption = 0.1;
        transmissionLoss = 25;
        break;
      case 'concrete':
        absorption = 0.02;
        transmissionLoss = 50;
        break;
      case 'steel':
        absorption = 0.05;
        transmissionLoss = 35;
        break;
      case 'glass':
        absorption = 0.03;
        transmissionLoss = 30;
        break;
      case 'insulation':
        absorption = 0.85;
        transmissionLoss = 5;
        break;
      default:
        absorption = 0.1;
        transmissionLoss = 20;
    }
    return { absorption, transmissionLoss, nrc: Math.round(absorption * 100) / 100 };
  }

  fireResistance(materialName: string, thickness: number): FireResistance {
    const cached = this._fireRatings.get(materialName);
    if (cached) return cached;
    const material = this._materials.get(materialName);
    let ratingMinutes: number;
    let flameSpreadIndex: number;
    let smokeDevelopedIndex: number;
    let nonCombustible: boolean;
    if (!material) {
      ratingMinutes = 30;
      flameSpreadIndex = 50;
      smokeDevelopedIndex = 50;
      nonCombustible = false;
    } else {
      switch (material.type) {
        case 'concrete':
          ratingMinutes = thickness * 60;
          flameSpreadIndex = 0;
          smokeDevelopedIndex = 0;
          nonCombustible = true;
          break;
        case 'steel':
          ratingMinutes = thickness * 100;
          flameSpreadIndex = 0;
          smokeDevelopedIndex = 0;
          nonCombustible = true;
          break;
        case 'wood':
          ratingMinutes = thickness * 30;
          flameSpreadIndex = 120;
          smokeDevelopedIndex = 200;
          nonCombustible = false;
          break;
        case 'glass':
          ratingMinutes = 20;
          flameSpreadIndex = 0;
          smokeDevelopedIndex = 0;
          nonCombustible = true;
          break;
        case 'insulation':
          ratingMinutes = 10;
          flameSpreadIndex = 25;
          smokeDevelopedIndex = 50;
          nonCombustible = false;
          break;
        default:
          ratingMinutes = 30;
          flameSpreadIndex = 50;
          smokeDevelopedIndex = 50;
          nonCombustible = false;
      }
    }
    const fr: FireResistance = {
      material: materialName,
      ratingMinutes: Math.round(ratingMinutes),
      flameSpreadIndex,
      smokeDevelopedIndex,
      nonCombustible,
    };
    this._fireRatings.set(materialName, fr);
    this._history.push({ op: 'fireResistance', materialName });
    return fr;
  }

  durability(materialName: string, environment: 'indoor' | 'outdoor' | 'coastal' | 'industrial'): { rating: number; expectedLife: number; maintenance: string } {
    const material = this._materials.get(materialName);
    if (!material) return { rating: 0.5, expectedLife: 30, maintenance: 'periodic' };
    let factor = 1.0;
    switch (environment) {
      case 'indoor':
        factor = 1.0;
        break;
      case 'outdoor':
        factor = 0.7;
        break;
      case 'coastal':
        factor = 0.5;
        break;
      case 'industrial':
        factor = 0.6;
        break;
    }
    const expectedLife = material.sustainability.lifespan * factor;
    const rating = Math.min(1, factor);
    const maintenance = factor < 0.6 ? 'high' : factor < 0.85 ? 'moderate' : 'low';
    this._history.push({ op: 'durability', materialName, environment });
    return { rating, expectedLife: Math.round(expectedLife), maintenance };
  }

  get materialCount(): number { return this._materials.size; }
  get concreteMixCount(): number { return this._concrete.size; }
  get steelGradeCount(): number { return this._steel.size; }
  get carbonFootprintCount(): number { return this._carbonFootprints.length; }

  toPacket(): DataPacket<{
    materials: Map<string, Material>;
    concrete: Map<string, Concrete>;
    steel: Map<string, Steel>;
    carbonFootprints: CarbonFootprint[];
    fireRatings: Map<string, FireResistance>;
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['architecture', 'BuildingMaterials'],
      priority: 1,
      phase: 'building_materials',
    };
    return {
      id: `bmat-${Date.now().toString(36)}`,
      payload: {
        materials: this._materials,
        concrete: this._concrete,
        steel: this._steel,
        carbonFootprints: this._carbonFootprints,
        fireRatings: this._fireRatings,
        history: this._history,
      },
      metadata,
    };
  }

  reset(): void {
    this._materials = new Map();
    this._concrete = new Map();
    this._steel = new Map();
    this._carbonFootprints = [];
    this._fireRatings = new Map();
    this._history = [];
    this._counter = 0;
    this._seedMaterials();
  }
}

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

  /** Compute material fatigue life using S-N curve approximation. */
  public fatigueLife(materialName: string, stressAmplitude: number, fatigueStrengthCoeff: number = 1000, fatigueStrengthExp: number = -0.085): number {
    const material = this._materials.get(materialName);
    const ultimateStrength = material ? material.properties.tensileStrength / 1e6 : 400;
    const fatigueLimit = ultimateStrength * 0.4;
    if (stressAmplitude <= fatigueLimit) return Infinity;
    const cycles = Math.pow(stressAmplitude / fatigueStrengthCoeff, 1 / fatigueStrengthExp);
    return Number(cycles.toFixed(0));
  }

  /** Compute Miner's rule cumulative damage. */
  public minersRule(stressCycles: { amplitude: number; cycles: number }[], materialName: string): { damage: number; lifeConsumed: number; remainingLife: number } {
    let damage = 0;
    for (const sc of stressCycles) {
      const nf = this.fatigueLife(materialName, sc.amplitude);
      if (nf > 0 && nf !== Infinity) {
        damage += sc.cycles / nf;
      }
    }
    return { damage: Number(damage.toFixed(6)), lifeConsumed: Number((damage * 100).toFixed(2)), remainingLife: Number(((1 - damage) * 100).toFixed(2)) };
  }

  /** Compute thermal expansion for a temperature change. */
  public thermalExpansion(materialName: string, deltaT: number, originalLength: number): { expansion: number; strain: number; stress: number } {
    const alphaMap: Record<string, number> = {
      steel: 12e-6, aluminum: 23e-6, concrete: 10e-6, wood: 5e-6, glass: 9e-6,
      masonry: 8e-6, polymer: 80e-6, composite: 3e-6,
    };
    const material = this._materials.get(materialName);
    const alpha = alphaMap[material?.type ?? 'steel'];
    const expansion = alpha * deltaT * originalLength;
    const strain = alpha * deltaT;
    const E = material ? material.properties.youngsModulus : 200e9;
    const stress = E * strain;
    return { expansion: Number(expansion.toFixed(6)), strain: Number(strain.toFixed(8)), stress: Number((stress / 1e6).toFixed(4)) };
  }

  /** Compute moisture content effect on wood properties. */
  public woodMoistureEffect(species: 'spruce' | 'pine' | 'oak' | 'bamboo' | 'cedar', moistureContent: number): { strengthFactor: number; stiffnessFactor: number; shrinkage: number } {
    const baseStrength = { spruce: 36, pine: 40, oak: 55, bamboo: 80, cedar: 30 };
    const baseStiffness = { spruce: 11e9, pine: 12e9, oak: 16e9, bamboo: 18e9, cedar: 8e9 };
    const fiberSaturation = 30;
    const mc = Math.min(moistureContent, fiberSaturation);
    const strengthFactor = Math.max(0.5, 1 - (mc / fiberSaturation) * 0.3);
    const stiffnessFactor = Math.max(0.5, 1 - (mc / fiberSaturation) * 0.25);
    const shrinkage = mc > 20 ? (mc - 20) * 0.002 : 0;
    return {
      strengthFactor: Number(strengthFactor.toFixed(4)),
      stiffnessFactor: Number(stiffnessFactor.toFixed(4)),
      shrinkage: Number(shrinkage.toFixed(6)),
    };
  }

  /** Compute creep deformation for concrete under sustained load. */
  public concreteCreep(initialStrain: number, loadDurationDays: number, relativeHumidity: number, concreteStrength: number): { creepCoefficient: number; creepStrain: number; totalStrain: number } {
    const betaRH = 1.55 * (1 - Math.pow(relativeHumidity / 100, 3));
    const betaCM = 16.8 / Math.sqrt(concreteStrength);
    const betaT0 = 1 / (0.1 + Math.pow(loadDurationDays, 0.2));
    const creepCoefficient = betaRH * betaCM * betaT0;
    const creepStrain = initialStrain * creepCoefficient;
    return {
      creepCoefficient: Number(creepCoefficient.toFixed(4)),
      creepStrain: Number(creepStrain.toFixed(8)),
      totalStrain: Number((initialStrain + creepStrain).toFixed(8)),
    };
  }

  /** Compute material selection index for a given objective. */
  public materialSelectionIndex(materialName: string, objective: 'min-weight' | 'min-cost' | 'min-eco'): number {
    const material = this._materials.get(materialName);
    if (!material) return 0;
    const density = material.properties.density;
    const strength = material.properties.yieldStrength;
    const carbon = material.sustainability.embodiedCarbon;
    if (objective === 'min-weight') return Number((strength / density).toFixed(4));
    if (objective === 'min-cost') return Number((strength / (density * 0.5)).toFixed(4));
    return Number((strength / (density * carbon)).toFixed(4));
  }

  /** Compute life cycle cost of a material over a building lifespan. */
  public lifeCycleCost(materialName: string, initialCost: number, lifespan: number, buildingLife: number, maintenanceRate: number = 0.02, discountRate: number = 0.03): number {
    const replacements = Math.ceil(buildingLife / lifespan) - 1;
    let lcc = initialCost;
    for (let i = 1; i <= replacements; i++) {
      lcc += initialCost / Math.pow(1 + discountRate, i * lifespan);
    }
    for (let year = 1; year <= buildingLife; year++) {
      lcc += initialCost * maintenanceRate / Math.pow(1 + discountRate, year);
    }
    return Number(lcc.toFixed(2));
  }

  /** Compute recycling potential score. */
  public recyclingPotential(materialName: string): { recyclability: number; downcyclingRisk: number; recoveryValue: number } {
    const material = this._materials.get(materialName);
    const baseRecyclability = material ? material.sustainability.recyclability : 0.5;
    const downcyclingRisk = material?.type === 'composite' ? 0.8 : material?.type === 'concrete' ? 0.4 : 0.2;
    const recoveryValue = baseRecyclability * (1 - downcyclingRisk);
    return {
      recyclability: Number(baseRecyclability.toFixed(4)),
      downcyclingRisk: Number(downcyclingRisk.toFixed(4)),
      recoveryValue: Number(recoveryValue.toFixed(4)),
    };
  }

  /** Compute embodied energy of a material assembly. */
  public embodiedEnergy(materials: { name: string; massKg: number }[]): { totalMJ: number; breakdown: Record<string, number>; perKg: number } {
    const energyMap: Record<string, number> = {
      concrete: 1.1, steel: 20.1, wood: 0.5, glass: 15.0, masonry: 0.8,
      insulation: 25.0, polymer: 80.0, composite: 100.0,
    };
    let total = 0;
    const breakdown: Record<string, number> = {};
    let totalMass = 0;
    for (const m of materials) {
      const material = this._materials.get(m.name);
      const type = material?.type ?? 'concrete';
      const energy = (energyMap[type] ?? 1.0) * m.massKg;
      breakdown[m.name] = Number(energy.toFixed(2));
      total += energy;
      totalMass += m.massKg;
    }
    return { totalMJ: Number(total.toFixed(2)), breakdown, perKg: totalMass > 0 ? Number((total / totalMass).toFixed(2)) : 0 };
  }

  /** Compute thermal mass effectiveness. */
  public thermalMassEffectiveness(materialName: string, thickness: number, surfaceArea: number): { heatCapacity: number; timeLag: number; decrementFactor: number } {
    const material = this._materials.get(materialName);
    const density = material?.properties.density ?? 2400;
    const specificHeat = material?.properties.specificHeat ?? 880;
    const conductivity = material?.properties.thermalConductivity ?? 1.7;
    const heatCapacity = density * specificHeat * thickness * surfaceArea;
    const thermalDiffusivity = conductivity / (density * specificHeat);
    const timeLag = thickness * thickness / (2 * thermalDiffusivity * 3600);
    const decrementFactor = Math.exp(-thickness * Math.sqrt(Math.PI * 0.0001 / thermalDiffusivity));
    return {
      heatCapacity: Number(heatCapacity.toFixed(2)),
      timeLag: Number(timeLag.toFixed(2)),
      decrementFactor: Number(decrementFactor.toFixed(4)),
    };
  }

  /** Compute material compatibility between two materials. */
  public materialCompatibility(materialA: string, materialB: string): { compatible: boolean; galvanicRisk: number; thermalStressRisk: number; recommendation: string } {
    const a = this._materials.get(materialA);
    const b = this._materials.get(materialB);
    const types = [a?.type, b?.type];
    const steelAndAluminum = types.includes('steel') && types.includes('aluminum');
    const galvanicRisk = steelAndAluminum ? 0.8 : 0.2;
    const thermalStressRisk = a && b ? Math.abs(a.properties.thermalConductivity - b.properties.thermalConductivity) / Math.max(a.properties.thermalConductivity, b.properties.thermalConductivity) : 0;
    const compatible = galvanicRisk < 0.5 && thermalStressRisk < 0.8;
    return {
      compatible,
      galvanicRisk: Number(galvanicRisk.toFixed(4)),
      thermalStressRisk: Number(thermalStressRisk.toFixed(4)),
      recommendation: compatible ? 'direct-contact-acceptable' : 'use-isolation-layer',
    };
  }

  /** Compute water-cement ratio effect on concrete properties. */
  public waterCementRatioEffect(wcRatio: number): { strength28d: number; permeability: number; durability: number; workability: number } {
    const strength28d = Math.max(10, 80 - 40 * wcRatio);
    const permeability = Math.pow(10, wcRatio * 3 - 1);
    const durability = Math.max(0, 1 - (wcRatio - 0.4) * 2);
    const workability = Math.min(1, wcRatio * 1.5);
    return {
      strength28d: Number(strength28d.toFixed(2)),
      permeability: Number(permeability.toFixed(6)),
      durability: Number(durability.toFixed(4)),
      workability: Number(workability.toFixed(4)),
    };
  }

  /** Compute aggregate grading curve analysis. */
  public aggregateGrading(sizes: number[], percentages: number[]): { finenessModulus: number; uniformityCoefficient: number; gradingZone: string } {
    let sum = 0;
    let cumulative = 0;
    for (let i = 0; i < sizes.length; i++) {
      cumulative += percentages[i];
      sum += cumulative;
    }
    const finenessModulus = sum / 100;
    const d60 = sizes.find((_, i) => percentages.slice(0, i + 1).reduce((a, b) => a + b, 0) >= 60) ?? sizes[sizes.length - 1];
    const d10 = sizes.find((_, i) => percentages.slice(0, i + 1).reduce((a, b) => a + b, 0) >= 10) ?? sizes[0];
    const uniformityCoefficient = d10 > 0 ? d60 / d10 : 1;
    let gradingZone: string;
    if (finenessModulus > 3.5) gradingZone = 'coarse';
    else if (finenessModulus > 2.5) gradingZone = 'medium';
    else gradingZone = 'fine';
    return {
      finenessModulus: Number(finenessModulus.toFixed(4)),
      uniformityCoefficient: Number(uniformityCoefficient.toFixed(4)),
      gradingZone,
    };
  }

  /** Compute alkali-silica reaction risk. */
  public asrRisk(alkaliContent: number, silicaReactivity: 'low' | 'moderate' | 'high', humidity: number): { risk: string; probability: number; mitigation: string } {
    const reactivityMap = { low: 0.2, moderate: 0.6, high: 1.0 };
    const reactivity = reactivityMap[silicaReactivity];
    const humidityFactor = humidity > 75 ? 1.0 : humidity > 50 ? 0.6 : 0.2;
    const score = alkaliContent * reactivity * humidityFactor;
    let risk: string;
    let probability: number;
    let mitigation: string;
    if (score > 3) { risk = 'high'; probability = 0.85; mitigation = 'use-low-alkali-cement-supplementary-cementitious-materials'; }
    else if (score > 1.5) { risk = 'moderate'; probability = 0.5; mitigation = 'limit-alkali-content-use-fly-ash'; }
    else { risk = 'low'; probability = 0.15; mitigation = 'standard-practice-sufficient'; }
    return { risk, probability: Number(probability.toFixed(4)), mitigation };
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

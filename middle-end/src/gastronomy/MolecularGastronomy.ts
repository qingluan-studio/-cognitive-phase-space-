import { KnowledgeUnit, DataPacket, Signal } from '../shared/types';

export type MoleculeType = 'protein' | 'carbohydrate' | 'lipid' | 'vitamin' | 'mineral' | 'enzyme' | 'aroma';

export interface DataMolecule {
  id: string;
  type: MoleculeType;
  name: string;
  structure: number[];
  molecularWeight: number;
  polarity: number;
  volatility: number;
  bindingAffinity: number;
}

export interface Deconstruction {
  id: string;
  sourceUnitId: string;
  molecules: DataMolecule[];
  completeness: number;
  purity: number;
  deconstructionTime: number;
}

export interface Reconstruction {
  id: string;
  targetConcept: string;
  molecules: DataMolecule[];
  structure: 'spherical' | 'foam' | 'gel' | 'crystal' | 'emulsion' | 'powder';
  stability: number;
  texture: string;
  releaseProfile: 'immediate' | 'sustained' | 'delayed' | 'pulsed';
}

export interface Transformation {
  id: string;
  sourceUnitId: string;
  method: TransformationMethod;
  result: KnowledgeUnit;
  efficiency: number;
  novelty: number;
  sideEffects: string[];
}

export type TransformationMethod =
  | 'spherification'
  | 'emulsification'
  | 'gelification'
  | 'powderization'
  | 'distillation'
  | 'fermentation'
  | 'crystallization'
  | 'sous-vide'
  | 'nitrogen-freeze'
  | 'enzymatic';

export interface FlavorEncapsulation {
  id: string;
  coreFlavor: DataMolecule;
  shellMaterial: MoleculeType;
  releaseTrigger: 'pH' | 'temperature' | 'pressure' | 'time' | 'enzymatic';
  burstThreshold: number;
  payload: KnowledgeUnit;
}

export interface GastronomyLab {
  id: string;
  name: string;
  equipment: string[];
  ingredients: Map<string, DataMolecule[]>;
  experiments: Transformation[];
  precision: number;
}

export class MolecularGastronomy {
  private _labs: Map<string, GastronomyLab>;
  private _currentLab: string | null;
  private _moleculeLibrary: Map<string, DataMolecule>;
  private _deconstructions: Map<string, Deconstruction>;
  private _reconstructions: Map<string, Reconstruction>;
  private _transformations: Map<string, Transformation>;
  private _encapsulations: Map<string, FlavorEncapsulation>;
  private _experimentalHistory: Transformation[];
  private _reactionTemperature: number;

  constructor(reactionTemperature: number = 37) {
    this._labs = new Map();
    this._currentLab = null;
    this._moleculeLibrary = new Map();
    this._deconstructions = new Map();
    this._reconstructions = new Map();
    this._transformations = new Map();
    this._encapsulations = new Map();
    this._experimentalHistory = [];
    this._reactionTemperature = reactionTemperature;
  }

  get labCount(): number { return this._labs.size; }
  get currentLab(): string | null { return this._currentLab; }
  get moleculeCount(): number { return this._moleculeLibrary.size; }
  get transformationCount(): number { return this._transformations.size; }
  get reactionTemperature(): number { return this._reactionTemperature; }

  public createLab(id: string, name: string): void {
    const lab: GastronomyLab = {
      id,
      name,
      equipment: ['centrifuge', 'rotary-evaporator', 'vacuum-chamber', 'thermal-circulator'],
      ingredients: new Map(),
      experiments: [],
      precision: 0.01
    };
    this._labs.set(id, lab);
    if (!this._currentLab) {
      this._currentLab = id;
    }
  }

  public selectLab(labId: string): boolean {
    if (this._labs.has(labId)) {
      this._currentLab = labId;
      return true;
    }
    return false;
  }

  public addMolecule(molecule: DataMolecule): void {
    this._moleculeLibrary.set(molecule.id, molecule);
  }

  public deconstruct(unit: KnowledgeUnit): Deconstruction {
    const startTime = Date.now();
    const molecules = this._extractMolecules(unit);
    const completeness = this._calculateCompleteness(molecules, unit);
    const purity = this._calculatePurity(molecules);

    const deconstruction: Deconstruction = {
      id: `decon-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      sourceUnitId: unit.id,
      molecules,
      completeness,
      purity,
      deconstructionTime: Date.now() - startTime
    };

    this._deconstructions.set(deconstruction.id, deconstruction);

    for (const mol of molecules) {
      this._moleculeLibrary.set(mol.id, mol);
    }

    return deconstruction;
  }

  public reconstruct(
    molecules: DataMolecule[],
    targetConcept: string,
    structure: Reconstruction['structure'] = 'spherical'
  ): Reconstruction {
    const stability = this._calculateStability(molecules, structure);
    const texture = this._deriveTexture(structure, molecules);

    const reconstruction: Reconstruction = {
      id: `recon-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      targetConcept,
      molecules,
      structure,
      stability,
      texture,
      releaseProfile: this._determineReleaseProfile(structure)
    };

    this._reconstructions.set(reconstruction.id, reconstruction);
    return reconstruction;
  }

  public transform(
    unit: KnowledgeUnit,
    method: TransformationMethod
  ): Transformation {
    const startTime = Date.now();

    const deconstruction = this.deconstruct(unit);
    const transformedMolecules = this._applyTransformation(deconstruction.molecules, method);
    const reconstructed = this._reconstructFromMolecules(transformedMolecules, unit, method);
    const novelty = this._calculateNoveltyScore(reconstructed, unit);
    const efficiency = this._calculateEfficiency(deconstruction.molecules.length, transformedMolecules.length);
    const sideEffects = this._identifySideEffects(method, novelty);

    const transformation: Transformation = {
      id: `trans-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      sourceUnitId: unit.id,
      method,
      result: reconstructed,
      efficiency,
      novelty,
      sideEffects
    };

    this._transformations.set(transformation.id, transformation);
    this._experimentalHistory.push(transformation);

    const lab = this._currentLab ? this._labs.get(this._currentLab) : null;
    if (lab) {
      lab.experiments.push(transformation);
    }

    return transformation;
  }

  public encapsulate(
    payload: KnowledgeUnit,
    coreMoleculeId: string,
    shellMaterial: MoleculeType,
    trigger: FlavorEncapsulation['releaseTrigger'] = 'enzymatic'
  ): FlavorEncapsulation | null {
    const coreFlavor = this._moleculeLibrary.get(coreMoleculeId);
    if (!coreFlavor) return null;

    const encapsulation: FlavorEncapsulation = {
      id: `capsule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      coreFlavor,
      shellMaterial,
      releaseTrigger: trigger,
      burstThreshold: 0.7,
      payload
    };

    this._encapsulations.set(encapsulation.id, encapsulation);
    return encapsulation;
  }

  public createSpherification(unit: KnowledgeUnit, calciumLevel: number = 0.5): Transformation {
    return this.transform(unit, 'spherification');
  }

  public createEmulsion(unitA: KnowledgeUnit, unitB: KnowledgeUnit, emulsifier: string = 'lecithin'): Transformation {
    const combinedVector = this._combineVectors(unitA.vector, unitB.vector);
    const combined: KnowledgeUnit = {
      id: `emulsion-${unitA.id}-${unitB.id}`,
      content: `Emulsion of ${unitA.content} and ${unitB.content}`,
      vector: combinedVector,
      lineage: [...unitA.lineage, ...unitB.lineage]
    };
    return this.transform(combined, 'emulsification');
  }

  public distill(unit: KnowledgeUnit, fractionCount: number = 5): DataMolecule[][] {
    const deconstruction = this.deconstruct(unit);
    const sorted = [...deconstruction.molecules].sort((a, b) => a.volatility - b.volatility);
    const fractions: DataMolecule[][] = [];
    const fractionSize = Math.ceil(sorted.length / fractionCount);

    for (let i = 0; i < fractionCount; i++) {
      fractions.push(sorted.slice(i * fractionSize, (i + 1) * fractionSize));
    }

    return fractions;
  }

  public ferment(unit: KnowledgeUnit, duration: number = 1000): Transformation {
    const result = this.transform(unit, 'fermentation');
    return result;
  }

  public compareTransformations(transA: string, transB: string): { similarity: number; divergence: number } {
    const a = this._transformations.get(transA);
    const b = this._transformations.get(transB);
    if (!a || !b) return { similarity: 0, divergence: 0 };

    const similarity = this._vectorSimilarity(a.result.vector, b.result.vector);
    const divergence = Math.abs(a.novelty - b.novelty) + Math.abs(a.efficiency - b.efficiency);

    return { similarity, divergence };
  }

  public findBestMethod(unit: KnowledgeUnit): { method: TransformationMethod; score: number }[] {
    const methods: TransformationMethod[] = [
      'spherification', 'emulsification', 'gelification', 'powderization',
      'distillation', 'fermentation', 'crystallization', 'sous-vide',
      'nitrogen-freeze', 'enzymatic'
    ];

    const scores = methods.map(method => {
      const deconstruction = this.deconstruct(unit);
      const transformed = this._applyTransformation(deconstruction.molecules, method);
      const score = this._calculateMethodScore(deconstruction.molecules, transformed, method);
      return { method, score };
    });

    return scores.sort((a, b) => b.score - a.score);
  }

  public getMolecularProfile(unitId: string): DataMolecule[] | null {
    const deconstruction = Array.from(this._deconstructions.values()).find(d => d.sourceUnitId === unitId);
    return deconstruction ? deconstruction.molecules : null;
  }

  public setTemperature(temp: number): void {
    this._reactionTemperature = Math.max(0, Math.min(100, temp));
  }

  private _extractMolecules(unit: KnowledgeUnit): DataMolecule[] {
    const molecules: DataMolecule[] = [];
    const types: MoleculeType[] = ['protein', 'carbohydrate', 'lipid', 'vitamin', 'mineral', 'enzyme', 'aroma'];
    const vec = unit.vector || [];

    for (let i = 0; i < types.length; i++) {
      const baseValue = vec[i] !== undefined ? Math.abs(vec[i]) : Math.random() * 0.5;
      if (baseValue > 0.1) {
        const molecule: DataMolecule = {
          id: `mol-${unit.id}-${i}`,
          type: types[i],
          name: `${types[i]}-${unit.id.substring(0, 8)}`,
          structure: this._generateStructure(baseValue, types[i]),
          molecularWeight: 50 + baseValue * 500,
          polarity: Math.random(),
          volatility: Math.random(),
          bindingAffinity: 0.3 + Math.random() * 0.7
        };
        molecules.push(molecule);
      }
    }

    const segments = Math.max(1, Math.floor(unit.content.length / 100));
    for (let i = 0; i < Math.min(segments, 3); i++) {
      const aromaMol: DataMolecule = {
        id: `mol-aroma-${unit.id}-${i}`,
        type: 'aroma',
        name: `aroma-compound-${i}`,
        structure: [Math.random(), Math.random(), Math.random()],
        molecularWeight: 100 + Math.random() * 200,
        polarity: Math.random(),
        volatility: 0.5 + Math.random() * 0.5,
        bindingAffinity: Math.random()
      };
      molecules.push(aromaMol);
    }

    return molecules;
  }

  private _generateStructure(baseValue: number, type: MoleculeType): number[] {
    const complexity = Math.floor(3 + baseValue * 10);
    const structure: number[] = [];
    for (let i = 0; i < complexity; i++) {
      structure.push(Math.random() * baseValue);
    }
    return structure;
  }

  private _calculateCompleteness(molecules: DataMolecule[], unit: KnowledgeUnit): number {
    const expectedTypes = 7;
    const foundTypes = new Set(molecules.map(m => m.type)).size;
    const typeCoverage = foundTypes / expectedTypes;

    const totalWeight = molecules.reduce((s, m) => s + m.molecularWeight, 0);
    const contentFactor = Math.min(1, unit.content.length / 1000);

    return (typeCoverage * 0.6 + contentFactor * 0.4);
  }

  private _calculatePurity(molecules: DataMolecule[]): number {
    if (molecules.length === 0) return 0;
    const uniqueTypes = new Set(molecules.map(m => m.type)).size;
    return 1 - (uniqueTypes - 1) * 0.1;
  }

  private _applyTransformation(molecules: DataMolecule[], method: TransformationMethod): DataMolecule[] {
    const tempFactor = this._reactionTemperature / 37;

    switch (method) {
      case 'spherification':
        return molecules.map(m => ({
          ...m,
          id: `${m.id}-sphere`,
          structure: [...m.structure, 1.0],
          bindingAffinity: Math.min(1, m.bindingAffinity * 1.2 * tempFactor)
        }));

      case 'emulsification':
        return this._emulsifyMolecules(molecules);

      case 'gelification':
        return molecules.map(m => ({
          ...m,
          id: `${m.id}-gel`,
          structure: m.structure.map(s => s * 1.5),
          volatility: m.volatility * 0.3
        }));

      case 'powderization':
        return molecules.flatMap(m => this._powderize(m));

      case 'distillation':
        return molecules.filter(m => m.volatility > 0.3);

      case 'fermentation':
        return molecules.map(m => ({
          ...m,
          id: `${m.id}-fermented`,
          molecularWeight: m.molecularWeight * 0.8,
          polarity: Math.min(1, m.polarity * 1.1)
        }));

      case 'crystallization':
        return molecules.filter(m => m.polarity > 0.4).map(m => ({
          ...m,
          id: `${m.id}-crystal`,
          structure: m.structure.sort((a, b) => a - b)
        }));

      case 'sous-vide':
        return molecules.map(m => ({
          ...m,
          id: `${m.id}-sv`,
          bindingAffinity: Math.min(1, m.bindingAffinity * (1 + tempFactor * 0.3))
        }));

      case 'nitrogen-freeze':
        return molecules.map(m => ({
          ...m,
          id: `${m.id}-frozen`,
          volatility: m.volatility * 0.1,
          structure: m.structure.map(s => s * 0.95)
        }));

      case 'enzymatic':
        return molecules.flatMap(m => this._enzymaticSplit(m));

      default:
        return molecules;
    }
  }

  private _emulsifyMolecules(molecules: DataMolecule[]): DataMolecule[] {
    const lipids = molecules.filter(m => m.type === 'lipid');
    const others = molecules.filter(m => m.type !== 'lipid');

    if (lipids.length === 0 || others.length === 0) {
      return molecules;
    }

    const emulsified: DataMolecule[] = [];
    for (const lipid of lipids) {
      for (const other of others.slice(0, 2)) {
        emulsified.push({
          id: `emulsion-${lipid.id}-${other.id}`,
          type: lipid.type,
          name: `emulsion-${lipid.name}-${other.name}`,
          structure: [...lipid.structure, ...other.structure],
          molecularWeight: lipid.molecularWeight + other.molecularWeight,
          polarity: (lipid.polarity + other.polarity) / 2,
          volatility: Math.min(lipid.volatility, other.volatility),
          bindingAffinity: (lipid.bindingAffinity + other.bindingAffinity) / 2
        });
      }
    }

    return [...others, ...emulsified];
  }

  private _powderize(molecule: DataMolecule): DataMolecule[] {
    const particles: DataMolecule[] = [];
    const count = 3 + Math.floor(Math.random() * 5);

    for (let i = 0; i < count; i++) {
      particles.push({
        id: `${molecule.id}-p${i}`,
        type: molecule.type,
        name: `${molecule.name}-particle-${i}`,
        structure: molecule.structure.map(s => s * (0.3 + Math.random() * 0.4)),
        molecularWeight: molecule.molecularWeight / count,
        polarity: molecule.polarity,
        volatility: molecule.volatility * 1.5,
        bindingAffinity: molecule.bindingAffinity * 0.8
      });
    }

    return particles;
  }

  private _enzymaticSplit(molecule: DataMolecule): DataMolecule[] {
    if (molecule.structure.length < 4) return [molecule];

    const mid = Math.floor(molecule.structure.length / 2);
    return [
      {
        id: `${molecule.id}-a`,
        type: molecule.type,
        name: `${molecule.name}-fragment-A`,
        structure: molecule.structure.slice(0, mid),
        molecularWeight: molecule.molecularWeight * 0.45,
        polarity: molecule.polarity * 1.1,
        volatility: molecule.volatility * 1.2,
        bindingAffinity: molecule.bindingAffinity * 0.9
      },
      {
        id: `${molecule.id}-b`,
        type: molecule.type,
        name: `${molecule.name}-fragment-B`,
        structure: molecule.structure.slice(mid),
        molecularWeight: molecule.molecularWeight * 0.45,
        polarity: molecule.polarity * 0.9,
        volatility: molecule.volatility * 1.1,
        bindingAffinity: molecule.bindingAffinity * 0.85
      }
    ];
  }

  private _reconstructFromMolecules(
    molecules: DataMolecule[],
    original: KnowledgeUnit,
    method: TransformationMethod
  ): KnowledgeUnit {
    const avgVector = this._averageMoleculeVectors(molecules);
    const paddedVector = this._padVector(avgVector, original.vector?.length || 10);

    return {
      id: `${original.id}-${method}`,
      content: `${method}: ${original.content}`,
      vector: paddedVector,
      lineage: [...original.lineage, method]
    };
  }

  private _calculateStability(molecules: DataMolecule[], structure: Reconstruction['structure']): number {
    const structureFactors: Record<Reconstruction['structure'], number> = {
      spherical: 0.8,
      foam: 0.4,
      gel: 0.9,
      crystal: 0.95,
      emulsion: 0.6,
      powder: 0.3
    };

    const avgBinding = molecules.reduce((s, m) => s + m.bindingAffinity, 0) / Math.max(1, molecules.length);
    const structureFactor = structureFactors[structure];

    return Math.min(1, avgBinding * structureFactor);
  }

  private _deriveTexture(structure: Reconstruction['structure'], molecules: DataMolecule[]): string {
    const textures: Record<Reconstruction['structure'], string> = {
      spherical: 'smooth, popping',
      foam: 'light, airy',
      gel: 'silky, yielding',
      crystal: 'crunchy, brittle',
      emulsion: 'creamy, rich',
      powder: 'fine, melting'
    };

    const avgWeight = molecules.reduce((s, m) => s + m.molecularWeight, 0) / Math.max(1, molecules.length);
    const descriptor = avgWeight > 200 ? 'dense' : 'delicate';

    return `${textures[structure]}, ${descriptor}`;
  }

  private _determineReleaseProfile(structure: Reconstruction['structure']): Reconstruction['releaseProfile'] {
    const profiles: Record<Reconstruction['structure'], Reconstruction['releaseProfile']> = {
      spherical: 'sustained',
      foam: 'immediate',
      gel: 'sustained',
      crystal: 'delayed',
      emulsion: 'delayed',
      powder: 'immediate'
    };
    return profiles[structure];
  }

  private _calculateNoveltyScore(result: KnowledgeUnit, original: KnowledgeUnit): number {
    const similarity = this._vectorSimilarity(result.vector, original.vector);
    return 1 - similarity;
  }

  private _calculateEfficiency(originalCount: number, transformedCount: number): number {
    if (originalCount === 0) return 0;
    return Math.min(1, transformedCount / originalCount);
  }

  private _identifySideEffects(method: TransformationMethod, novelty: number): string[] {
    const effects: string[] = [];

    if (novelty > 0.7) {
      effects.push('high-novelty side chains');
    }
    if (method === 'fermentation') {
      effects.push('byproduct compounds');
    }
    if (method === 'nitrogen-freeze') {
      effects.push('cold-shock molecules');
    }
    if (method === 'enzymatic') {
      effects.push('residual enzyme activity');
    }

    if (effects.length === 0) {
      effects.push('minimal side effects');
    }

    return effects;
  }

  private _calculateMethodScore(
    original: DataMolecule[],
    transformed: DataMolecule[],
    method: TransformationMethod
  ): number {
    const preservation = Math.min(1, transformed.length / Math.max(1, original.length));
    const diversity = new Set(transformed.map(m => m.type)).size / 7;

    const methodBonuses: Record<TransformationMethod, number> = {
      spherification: 0.8,
      emulsification: 0.7,
      gelification: 0.85,
      powderization: 0.6,
      distillation: 0.75,
      fermentation: 0.65,
      crystallization: 0.7,
      'sous-vide': 0.9,
      'nitrogen-freeze': 0.5,
      enzymatic: 0.8
    };

    return preservation * 0.4 + diversity * 0.3 + methodBonuses[method] * 0.3;
  }

  private _averageMoleculeVectors(molecules: DataMolecule[]): number[] {
    if (molecules.length === 0) return [];

    const maxLen = Math.max(...molecules.map(m => m.structure.length));
    const avg: number[] = [];

    for (let i = 0; i < maxLen; i++) {
      let sum = 0;
      let count = 0;
      for (const mol of molecules) {
        if (i < mol.structure.length) {
          sum += mol.structure[i];
          count++;
        }
      }
      avg.push(count > 0 ? sum / count : 0);
    }

    return avg;
  }

  private _padVector(vec: number[], targetLength: number): number[] {
    const padded = [...vec];
    while (padded.length < targetLength) {
      padded.push(0);
    }
    return padded.slice(0, targetLength);
  }

  private _combineVectors(a: number[] = [], b: number[] = []): number[] {
    const maxLen = Math.max(a.length, b.length);
    const result: number[] = [];
    for (let i = 0; i < maxLen; i++) {
      result.push(((a[i] || 0) + (b[i] || 0)) / 2);
    }
    return result;
  }

  private _vectorSimilarity(a: number[] = [], b: number[] = []): number {
    const minLen = Math.min(a.length, b.length);
    if (minLen === 0) return 0;

    let dot = 0;
    let magA = 0;
    let magB = 0;

    for (let i = 0; i < minLen; i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }

    return dot / (Math.sqrt(magA) * Math.sqrt(magB) + 0.001);
  }

  public processPacket(packet: DataPacket<KnowledgeUnit[]>): DataPacket<Transformation[]> {
    const labId = packet.metadata.phase;
    if (!this._labs.has(labId)) {
      this.createLab(labId, `Lab-${labId}`);
      this.selectLab(labId);
    }

    const methods: TransformationMethod[] = ['spherification', 'gelification', 'emulsification', 'crystallization'];
    const transformations: Transformation[] = [];

    for (let i = 0; i < packet.payload.length; i++) {
      const ku = packet.payload[i];
      const method = methods[i % methods.length];
      const trans = this.transform(ku, method);
      transformations.push(trans);
    }

    return {
      id: `molecular-${packet.id}`,
      payload: transformations,
      metadata: {
        ...packet.metadata,
        route: [...packet.metadata.route, 'MolecularGastronomy']
      }
    };
  }

  public exportLab(labId: string): { id: string; name: string; experimentCount: number } | null {
    const lab = this._labs.get(labId);
    if (!lab) return null;
    return {
      id: lab.id,
      name: lab.name,
      experimentCount: lab.experiments.length
    };
  }

  public reset(): void {
    this._labs.clear();
    this._currentLab = null;
    this._moleculeLibrary.clear();
    this._deconstructions.clear();
    this._reconstructions.clear();
    this._transformations.clear();
    this._encapsulations.clear();
    this._experimentalHistory = [];
  }
}

import { DataPacket, PacketMeta } from '../shared/types';

/** A body system grouping organs and primary functions. */
export interface BodySystem {
  readonly name: string;
  readonly organs: string[];
  readonly functions: string[];
  readonly cavity?: string;
}

/** A discrete organ with position and connectivity. */
export interface Organ {
  readonly name: string;
  readonly system: string;
  readonly position: string;
  readonly function: string;
  readonly connections: string[];
  readonly bloodSupply?: string;
  readonly innervation?: string;
}

/** A tissue type and where it is found. */
export interface Tissue {
  readonly type: string;
  readonly location: string;
  readonly characteristics?: string[];
}

/** Cross-sectional slice at an anatomical level. */
export interface CrossSection {
  readonly level: string;
  readonly structures: string[];
  readonly plane: 'axial' | 'coronal' | 'sagittal';
}

/** Embryonic development record for an organ. */
export interface Embryology {
  readonly organ: string;
  readonly origin: string;
  readonly week: number;
  readonly stage: string;
}

/** Histology summary for a tissue. */
export interface Histology {
  readonly tissue: string;
  readonly layers: string[];
  readonly cellTypes: string[];
  readonly stain?: string;
}

/** Anatomical variation observation. */
export interface Variation {
  readonly organ: string;
  readonly variation: string;
  readonly prevalence: number;
  readonly clinical?: string;
}

/** Imaging modality mapping. */
export interface ImagingMap {
  readonly anatomy: string;
  readonly modality: string;
  readonly appearance: string;
  readonly contrast?: string;
}

/** Clinical correlation between anatomy and symptom. */
export interface ClinicalCorrelation {
  readonly organ: string;
  readonly symptom: string;
  readonly mechanism: string;
  readonly syndrome: string;
}

/**
 * AnatomyAtlas provides structured anatomical reference data including
 * systems, organs, blood supply, innervation, and embryology.
 */
export class AnatomyAtlas {
  private _systems: Map<string, BodySystem> = new Map();
  private _organs: Map<string, Organ> = new Map();
  private _tissues: Tissue[] = [];
  private _history: unknown[] = [];
  private _counter = 0;

  constructor() {
    this._seedAtlas();
  }

  get systemCount(): number { return this._systems.size; }
  get organCount(): number { return this._organs.size; }
  get tissueCount(): number { return this._tissues.length; }

  /** Look up a body system by name. */
  bodySystem(name: string): BodySystem | null {
    const sys = this._systems.get(name.toLowerCase());
    if (!sys) return null;
    this._history.push({ op: 'bodySystem', name });
    return sys;
  }

  /** Describe the function of an organ. */
  organFunction(organ: string): string {
    const entry = this._organs.get(organ.toLowerCase());
    if (!entry) return 'unknown';
    this._history.push({ op: 'organFunction', organ });
    return `${entry.name}: ${entry.function}`;
  }

  /** List the structural/functional connections of an organ. */
  organConnections(organ: string): string[] {
    const entry = this._organs.get(organ.toLowerCase());
    return entry ? [...entry.connections] : [];
  }

  /** Describe the arterial blood supply of an organ. */
  bloodSupply(organ: string): { artery: string; drainage: string } {
    const entry = this._organs.get(organ.toLowerCase());
    const artery = entry?.bloodSupply ?? 'unknown';
    return { artery, drainage: artery === 'unknown' ? 'unknown' : `${artery}-vein` };
  }

  /** Describe innervation of an organ. */
  innervation(organ: string): { sympathetic: string; parasympathetic: string; sensory: string } {
    const entry = this._organs.get(organ.toLowerCase());
    const base = entry?.innervation ?? 'spinal';
    return {
      sympathetic: `${base}-chain`,
      parasympathetic: base === 'vagus' ? 'vagus' : 'pelvic-splanchnic',
      sensory: `${base}-afferent`,
    };
  }

  /** Describe lymphatic drainage of an organ. */
  lymphaticDrainage(organ: string): { nodes: string[]; watershed: string } {
    const entry = this._organs.get(organ.toLowerCase());
    if (!entry) return { nodes: [], watershed: 'unknown' };
    const nodes = [`${entry.system}-regional`, `${entry.position}-station`];
    return { nodes, watershed: `${entry.system}-watershed` };
  }

  /** Compose a cross-section at the requested anatomical level. */
  crossSection(level: string): CrossSection {
    const structures = level.includes('thoracic')
      ? ['heart', 'esophagus', 'aorta', 'trachea']
      : level.includes('abdominal')
        ? ['liver', 'stomach', 'kidney', 'pancreas']
        : ['vertebra', 'spinal-cord', 'muscle'];
    this._history.push({ op: 'crossSection', level });
    return { level, structures, plane: 'axial' };
  }

  /** Surface anatomy landmark lookup. */
  surfaceAnatomy(landmark: string): { point: string; underlying: string; palpable: boolean } {
    const map: Record<string, { underlying: string; palpable: boolean }> = {
      'sternal-angle': { underlying: 'aortic-arch', palpable: true },
      'umbilicus': { underlying: 'aorta-bifurcation', palpable: true },
      'mc-burney': { underlying: 'appendix', palpable: false },
    };
    const entry = map[landmark.toLowerCase()];
    return { point: landmark, underlying: entry?.underlying ?? 'unknown', palpable: entry?.palpable ?? false };
  }

  /** Describe appearance of anatomy on an imaging modality. */
  imaging(anatomy: string, modality: string): ImagingMap {
    const appearance = modality === 'ct' ? 'density-variable' : modality === 'mri' ? 'signal-variable' : 'echo-variable';
    return { anatomy, modality, appearance, contrast: modality === 'ct' ? 'iodinated' : 'gadolinium' };
  }

  /** Embryological origin of an organ. */
  embryology(organ: string): Embryology {
    const entry = this._organs.get(organ.toLowerCase());
    const origin = entry?.system === 'gi' ? 'endoderm' : entry?.system === 'cardiovascular' ? 'mesoderm' : 'mesoderm';
    return { organ, origin, week: 4, stage: 'organogenesis' };
  }

  /** Histological composition of a tissue. */
  histology(tissue: string): Histology {
    const map: Record<string, { layers: string[]; cellTypes: string[]; stain: string }> = {
      epithelial: { layers: ['basal', 'apical'], cellTypes: ['squamous', 'cuboidal'], stain: 'h&e' },
      connective: { layers: ['matrix'], cellTypes: ['fibroblast', 'adipocyte'], stain: 'masson-trichrome' },
      muscle: { layers: ['sarcomere'], cellTypes: ['myocyte'], stain: 'h&e' },
      nervous: { layers: ['gray-matter', 'white-matter'], cellTypes: ['neuron', 'glia'], stain: 'nissl' },
    };
    const entry = map[tissue.toLowerCase()] ?? { layers: ['unknown'], cellTypes: ['unknown'], stain: 'h&e' };
    return { tissue, layers: entry.layers, cellTypes: entry.cellTypes, stain: entry.stain };
  }

  /** Describe organ development at a developmental stage. */
  organDevelopment(organ: string, stage: string): { organ: string; stage: string; events: string[] } {
    const events = stage === 'embryonic' ? ['induction', 'morphogenesis', 'differentiation']
      : stage === 'fetal' ? ['growth', 'maturation']
        : ['postnatal-remodeling'];
    return { organ, stage, events };
  }

  /** Anatomical variation for an organ. */
  anatomicalVariation(organ: string): Variation {
    const entry = this._organs.get(organ.toLowerCase());
    const variation = entry?.position === 'left' ? 'situs-inversus' : 'typical';
    return { organ, variation, prevalence: variation === 'typical' ? 0.99 : 0.01, clinical: variation === 'typical' ? 'none' : 'asymptomatic' };
  }

  /** Clinical correlation between an organ and a symptom. */
  clinicalCorrelation(organ: string): ClinicalCorrelation {
    const entry = this._organs.get(organ.toLowerCase());
    const symptom = entry?.system === 'cardiovascular' ? 'chest-pain' : entry?.system === 'gi' ? 'abdominal-pain' : 'referred-pain';
    return {
      organ,
      symptom,
      mechanism: `${organ}-dysfunction`,
      syndrome: `${organ}-syndrome`,
    };
  }

  private _seedAtlas(): void {
    const systems: BodySystem[] = [
      { name: 'cardiovascular', organs: ['heart', 'aorta'], functions: ['pump-blood', 'circulation'], cavity: 'thoracic' },
      { name: 'respiratory', organs: ['lung', 'trachea'], functions: ['gas-exchange'], cavity: 'thoracic' },
      { name: 'gi', organs: ['stomach', 'liver', 'intestine'], functions: ['digestion', 'absorption'], cavity: 'abdominal' },
      { name: 'nervous', organs: ['brain', 'spinal-cord'], functions: ['control', 'integration'], cavity: 'cranial' },
    ];
    for (const s of systems) this._systems.set(s.name, s);

    const organs: Organ[] = [
      { name: 'heart', system: 'cardiovascular', position: 'mediastinum', function: 'pump-blood', connections: ['aorta', 'vena-cava', 'pulmonary-artery'], bloodSupply: 'coronary', innervation: 'vagus' },
      { name: 'lung', system: 'respiratory', position: 'thoracic', function: 'gas-exchange', connections: ['trachea', 'pulmonary-artery'], bloodSupply: 'pulmonary', innervation: 'vagus' },
      { name: 'stomach', system: 'gi', position: 'left-upper-quadrant', function: 'digestion', connections: ['esophagus', 'duodenum'], bloodSupply: 'celiac', innervation: 'vagus' },
      { name: 'liver', system: 'gi', position: 'right-upper-quadrant', function: 'metabolism', connections: ['portal-vein', 'hepatic-artery'], bloodSupply: 'hepatic', innervation: 'celiac' },
      { name: 'brain', system: 'nervous', position: 'cranial', function: 'control', connections: ['spinal-cord', 'cranial-nerves'], bloodSupply: 'carotid', innervation: 'intrinsic' },
    ];
    for (const o of organs) this._organs.set(o.name, o);

    this._tissues = [
      { type: 'epithelial', location: 'skin-surface', characteristics: ['avascular', 'polarized'] },
      { type: 'connective', location: 'dermis', characteristics: ['vascular', 'matrix-rich'] },
      { type: 'muscle', location: 'skeletal-wall', characteristics: ['contractile'] },
      { type: 'nervous', location: 'cns', characteristics: ['excitable'] },
    ];
  }

  toPacket(): DataPacket<{
    systems: number;
    organs: number;
    tissues: Tissue[];
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['medicine', 'AnatomyAtlas'],
      priority: 1,
      phase: 'anatomy',
    };
    return {
      id: `anatomy-atlas-${Date.now().toString(36)}-${(++this._counter).toString(36)}`,
      payload: {
        systems: this._systems.size,
        organs: this._organs.size,
        tissues: [...this._tissues],
        history: [...this._history],
      },
      metadata,
    };
  }

  reset(): void {
    this._systems.clear();
    this._organs.clear();
    this._tissues = [];
    this._history = [];
    this._counter = 0;
    this._seedAtlas();
  }
}

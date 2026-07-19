import { DataPacket, PacketMeta } from '../shared/types';

/** A disease entity with its full pathophysiological description. */
export interface Disease {
  readonly name: string;
  readonly etiology: string;
  readonly pathogenesis: string;
  readonly morphology: string;
  readonly clinical: string[];
  readonly icd10?: string;
}

/** A focal lesion with location and morphology. */
export interface Lesion {
  readonly type: string;
  readonly location: string;
  readonly morphology: string;
  readonly size?: number;
  readonly duration?: number;
}

/** Biopsy result descriptor. */
export interface BiopsyResult {
  readonly id: string;
  readonly tissue: string;
  readonly technique: string;
  readonly diagnosis: string;
  readonly benign: boolean;
  readonly margins?: string;
  readonly performedAt: number;
}

/** TNM staging descriptor. */
export interface TNM {
  readonly t: string;
  readonly n: string;
  readonly m: string;
  readonly stage: '0' | 'I' | 'II' | 'III' | 'IV';
}

/** Tumor grade based on differentiation. */
export interface TumorGrade {
  readonly differentiation: 'well' | 'moderate' | 'poor' | 'undifferentiated';
  readonly grade: 1 | 2 | 3 | 4;
  readonly mitoticCount: number;
}

/** Metastasis pattern. */
export interface MetastasisPattern {
  readonly primary: string;
  readonly sites: string[];
  readonly route: 'hematogenous' | 'lymphatic' | 'transcoelomic' | 'direct';
}

/** Cell injury descriptor. */
export interface CellInjury {
  readonly cause: string;
  readonly type: 'reversible' | 'irreversible' | 'apoptosis' | 'necrosis';
  readonly mechanism: string;
}

/** Tissue repair descriptor. */
export interface TissueRepair {
  readonly type: 'regeneration' | 'fibrosis' | 'organization';
  readonly mechanism: string;
  readonly duration: number;
}

/** Inflammation classification. */
export interface Inflammation {
  readonly type: 'acute' | 'chronic' | 'granulomatous' | 'suppurative';
  readonly cause: string;
  readonly cells: string[];
  readonly mediators: string[];
}

/**
 * Pathology classifies diseases by etiology/pathogenesis, performs TNM staging,
 * and tracks biopsy results and metastatic patterns.
 */
export class Pathology {
  private _diseases: Map<string, Disease> = new Map();
  private _lesions: Lesion[] = [];
  private _biopsies: BiopsyResult[] = [];
  private _history: unknown[] = [];
  private _counter = 0;

  constructor() {
    this._seedDiseases();
  }

  get diseaseCount(): number { return this._diseases.size; }
  get lesionCount(): number { return this._lesions.length; }
  get biopsyCount(): number { return this._biopsies.length; }

  /** Classify an inflammation by type and cause. */
  inflammation(type: Inflammation['type'], cause: string): Inflammation {
    const cells = type === 'acute' ? ['neutrophil'] : type === 'chronic' ? ['lymphocyte', 'macrophage'] : type === 'granulomatous' ? ['epithelioid', 'giant-cell'] : ['neutrophil'];
    const mediators = ['histamine', 'prostaglandin', 'cytokine'];
    this._history.push({ op: 'inflammation', type, cause });
    return { type, cause, cells, mediators };
  }

  /** Classify a neoplastic process by grade and stage. */
  neoplasia(type: 'benign' | 'malignant', grade: TumorGrade['differentiation'], stage: TNM['stage']): {
    type: string; grade: TumorGrade; stage: TNM; behavior: string;
  } {
    const gradeNum: Record<TumorGrade['differentiation'], 1 | 2 | 3 | 4> = { well: 1, moderate: 2, poor: 3, undifferentiated: 4 };
    const behavior = type === 'benign' ? 'localized' : 'invasive';
    return {
      type,
      grade: { differentiation: grade, grade: gradeNum[grade], mitoticCount: gradeNum[grade] * 2 },
      stage: { t: 't1', n: 'n0', m: 'm0', stage },
      behavior,
    };
  }

  /** Describe a degenerative process in tissue. */
  degenerative(tissue: string, process: string): { tissue: string; process: string; features: string[] } {
    const features = process === 'amyloid' ? ['apple-green-birefringence', 'extracellular']
      : process === 'calcification' ? ['dystrophic', 'basophilic']
        : ['hyaline', 'acellular'];
    return { tissue, process, features };
  }

  /** Classify a vascular lesion. */
  vascular(lesion: string, type: string): { lesion: string; type: string; consequence: string } {
    const consequence = type === 'atherosclerosis' ? 'ischemia' : type === 'thrombosis' ? 'infarction' : type === 'aneurysm' ? 'rupture' : 'hemorrhage';
    return { lesion, type, consequence };
  }

  /** Describe an immune-mediated pathology. */
  immune(mechanism: 'I' | 'II' | 'III' | 'IV', target: string): { mechanism: string; target: string; example: string; mediators: string[] } {
    const examples: Record<string, string> = { I: 'anaphylaxis', II: 'goodpasture', III: 'lupus', IV: 'tuberculin' };
    const mediators: Record<string, string[]> = { I: ['ige', 'histamine'], II: ['igg', 'complement'], III: ['immune-complex'], IV: ['t-cell'] };
    return { mechanism: `type-${mechanism}`, target, example: examples[mechanism], mediators: mediators[mechanism] };
  }

  /** Describe an infectious pathology. */
  infectious(pathogen: string, tissue: string): { pathogen: string; tissue: string; response: string; virulence: string[] } {
    const response = pathogen.includes('bacteri') ? 'pyogenic' : pathogen.includes('virus') ? 'viral-cytopathic' : 'granulomatous';
    const virulence = ['adhesion', 'invasion', 'toxin'];
    return { pathogen, tissue, response, virulence };
  }

  /** Describe a genetic disorder. */
  genetic(mutation: string, disorder: string): { mutation: string; disorder: string; inheritance: string; penetrance: number } {
    const inheritance = mutation.includes('autosomal') ? 'autosomal-dominant' : 'x-linked';
    return { mutation, disorder, inheritance, penetrance: 0.8 };
  }

  /** Describe a metabolic disorder's tissue effects. */
  metabolic(disorder: string, tissue: string): { disorder: string; tissue: string; accumulation: string; consequence: string } {
    const accumulation = disorder.includes('glycogen') ? 'glycogen' : disorder.includes('lipid') ? 'lipid' : 'mixed';
    return { disorder, tissue, accumulation, consequence: `${tissue}-dysfunction` };
  }

  /** Perform a biopsy and record the result. */
  biopsy(tissue: string, technique: string): BiopsyResult {
    const result: BiopsyResult = {
      id: `bx-${(++this._counter).toString(36)}-${Date.now().toString(36)}`,
      tissue,
      technique,
      diagnosis: 'pending-pathology',
      benign: true,
      margins: 'not-applicable',
      performedAt: Date.now(),
    };
    this._biopsies.push(result);
    this._history.push({ op: 'biopsy', id: result.id, tissue });
    return result;
  }

  /** Stage a cancer using TNM classification. */
  staging(cancer: string, tnm: { t: string; n: string; m: string }): TNM {
    const m = tnm.m.toLowerCase();
    const stage: TNM['stage'] = m === 'm1' ? 'IV' : tnm.t === 't1' && tnm.n === 'n0' ? 'I' : tnm.t === 't4' || tnm.n === 'n2' ? 'III' : 'II';
    this._history.push({ op: 'staging', cancer, stage });
    return { t: tnm.t, n: tnm.n, m: tnm.m, stage };
  }

  /** Grade a tumor by differentiation. */
  grading(tumor: string, differentiation: TumorGrade['differentiation']): TumorGrade {
    const map: Record<TumorGrade['differentiation'], 1 | 2 | 3 | 4> = { well: 1, moderate: 2, poor: 3, undifferentiated: 4 };
    return { differentiation, grade: map[differentiation], mitoticCount: map[differentiation] * 2 };
  }

  /** Describe the metastatic pattern of a primary tumor. */
  metastasis(primary: string, sites: string[]): MetastasisPattern {
    const route: MetastasisPattern['route'] = primary.includes('sarcoma') ? 'hematogenous' : primary.includes('carcinoma') ? 'lymphatic' : 'direct';
    this._history.push({ op: 'metastasis', primary, sites: sites.length });
    return { primary, sites, route };
  }

  /** Classify cell injury by cause. */
  cellInjury(cause: string, type: CellInjury['type']): CellInjury {
    const mechanism = type === 'apoptosis' ? 'caspase-cascade' : type === 'necrosis' ? 'membrane-rupture' : type === 'irreversible' ? 'mitochondrial-failure' : 'atp-depletion';
    return { cause, type, mechanism };
  }

  /** Describe tissue repair process. */
  tissueRepair(type: TissueRepair['type'], mechanism: string): TissueRepair {
    const duration = type === 'regeneration' ? 7 : type === 'fibrosis' ? 30 : 14;
    return { type, mechanism, duration };
  }

  private _seedDiseases(): void {
    const seeds: Disease[] = [
      { name: 'myocardial-infarction', etiology: 'coronary-atherosclerosis', pathogenesis: 'ischemic-necrosis', morphology: 'coagulative-necrosis', clinical: ['chest-pain', 'elevation-st'] },
      { name: 'tuberculosis', etiology: 'mycobacterium-tuberculosis', pathogenesis: 'granulomatous-inflammation', morphology: 'caseating-granuloma', clinical: ['cough', 'fever', 'weight-loss'] },
      { name: 'adenocarcinoma-lung', etiology: 'smoking', pathogenesis: 'epithelial-malignant-transformation', morphology: 'gland-formation', clinical: ['cough', 'hemoptysis'] },
      { name: 'cirrhosis', etiology: 'alcohol', pathogenesis: 'chronic-injury-fibrosis', morphology: 'nodular-regeneration', clinical: ['jaundice', 'ascites'] },
    ];
    for (const d of seeds) this._diseases.set(d.name, d);
  }

  toPacket(): DataPacket<{
    diseases: number;
    lesions: Lesion[];
    biopsies: BiopsyResult[];
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['medicine', 'Pathology'],
      priority: 1,
      phase: 'pathology',
    };
    return {
      id: `pathology-${Date.now().toString(36)}-${(++this._counter).toString(36)}`,
      payload: {
        diseases: this._diseases.size,
        lesions: [...this._lesions],
        biopsies: [...this._biopsies],
        history: [...this._history],
      },
      metadata,
    };
  }

  reset(): void {
    this._diseases.clear();
    this._lesions = [];
    this._biopsies = [];
    this._history = [];
    this._counter = 0;
    this._seedDiseases();
  }
}

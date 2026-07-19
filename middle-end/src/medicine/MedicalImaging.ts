import { DataPacket, PacketMeta } from '../shared/types';

/** Imaging modality enumeration. */
export type Modality = 'xray' | 'ct' | 'mri' | 'us' | 'pet' | 'mammogram';

/** Generic imaging study descriptor. */
export interface ImagingStudy {
  readonly id: string;
  readonly type: string;
  readonly modality: Modality;
  readonly bodyPart: string;
  readonly findings: string[];
  readonly performedAt: number;
  readonly dose?: number;
}

/** Plain radiograph study. */
export interface Radiograph extends ImagingStudy {
  readonly view: string;
  readonly technique: string;
}

/** Computed tomography study. */
export interface CTScan extends ImagingStudy {
  readonly contrast: boolean;
  readonly slices: number;
  readonly pitch: number;
}

/** Magnetic resonance imaging study. */
export interface MRI extends ImagingStudy {
  readonly sequence: string;
  readonly contrast: boolean;
  readonly fieldStrength: number;
}

/** Ultrasound study. */
export interface Ultrasound extends ImagingStudy {
  readonly transducer: string;
  readonly mode: string;
  readonly frequency: number;
}

/** Detected abnormality on a study. */
export interface Abnormality {
  readonly type: string;
  readonly location: string;
  readonly size?: number;
  readonly confidence: number;
}

/** Quantitative measurement on a region of interest. */
export interface Measurement {
  readonly roi: string;
  readonly type: string;
  readonly value: number;
  readonly unit: string;
}

/** Image quality assessment. */
export interface QualityFactors {
  readonly noise: number;
  readonly contrast: number;
  readonly resolution: number;
  readonly artifacts: string[];
}

/**
 * MedicalImaging generates synthetic imaging studies, interprets findings,
 * and computes quantitative radiomic measures.
 */
export class MedicalImaging {
  private _studies: Map<string, ImagingStudy> = new Map();
  private _findings: Abnormality[] = [];
  private _history: unknown[] = [];
  private _counter = 0;

  get studyCount(): number { return this._studies.size; }
  get findingCount(): number { return this._findings.length; }

  /** Create a plain radiograph study. */
  xRay(bodyPart: string, view: string, technique: string): Radiograph {
    const study: Radiograph = {
      id: `xray-${(++this._counter).toString(36)}-${Date.now().toString(36)}`,
      type: 'radiograph',
      modality: 'xray',
      bodyPart,
      findings: [],
      performedAt: Date.now(),
      view,
      technique,
      dose: 0.1,
    };
    this._studies.set(study.id, study);
    this._history.push({ op: 'xRay', bodyPart, view });
    return study;
  }

  /** Create a CT scan study. */
  ctScan(bodyPart: string, contrast: boolean, slices: number): CTScan {
    const study: CTScan = {
      id: `ct-${(++this._counter).toString(36)}-${Date.now().toString(36)}`,
      type: 'ct-scan',
      modality: 'ct',
      bodyPart,
      findings: [],
      performedAt: Date.now(),
      contrast,
      slices,
      pitch: 1,
      dose: slices * 0.05,
    };
    this._studies.set(study.id, study);
    this._history.push({ op: 'ctScan', bodyPart, contrast });
    return study;
  }

  /** Create an MRI study. */
  mri(bodyPart: string, sequence: string, contrast: boolean): MRI {
    const study: MRI = {
      id: `mri-${(++this._counter).toString(36)}-${Date.now().toString(36)}`,
      type: 'mri',
      modality: 'mri',
      bodyPart,
      findings: [],
      performedAt: Date.now(),
      sequence,
      contrast,
      fieldStrength: 1.5,
    };
    this._studies.set(study.id, study);
    this._history.push({ op: 'mri', bodyPart, sequence });
    return study;
  }

  /** Create an ultrasound study. */
  ultrasound(bodyPart: string, transducer: string, mode: string): Ultrasound {
    const study: Ultrasound = {
      id: `us-${(++this._counter).toString(36)}-${Date.now().toString(36)}`,
      type: 'ultrasound',
      modality: 'us',
      bodyPart,
      findings: [],
      performedAt: Date.now(),
      transducer,
      mode,
      frequency: 5,
    };
    this._studies.set(study.id, study);
    this._history.push({ op: 'ultrasound', bodyPart });
    return study;
  }

  /** Create a PET scan study. */
  petScan(tracer: string, uptake: number): ImagingStudy {
    const study: ImagingStudy = {
      id: `pet-${(++this._counter).toString(36)}-${Date.now().toString(36)}`,
      type: 'pet',
      modality: 'pet',
      bodyPart: 'whole-body',
      findings: [`tracer=${tracer}`, `suv-max=${uptake.toFixed(2)}`],
      performedAt: Date.now(),
      dose: 7,
    };
    this._studies.set(study.id, study);
    this._history.push({ op: 'petScan', tracer, uptake });
    return study;
  }

  /** Create a mammogram study. */
  mammogram(view: string, density: number): ImagingStudy {
    const study: ImagingStudy = {
      id: `mg-${(++this._counter).toString(36)}-${Date.now().toString(36)}`,
      type: 'mammogram',
      modality: 'mammogram',
      bodyPart: 'breast',
      findings: [`view=${view}`, `density=${density}`],
      performedAt: Date.now(),
      dose: 0.4,
    };
    this._studies.set(study.id, study);
    this._history.push({ op: 'mammogram', view, density });
    return study;
  }

  /** Interpret a study with provided findings. */
  interpret(study: ImagingStudy, findings: string[]): ImagingStudy {
    const updated: ImagingStudy = {
      ...study,
      findings: [...study.findings, ...findings],
    };
    this._studies.set(study.id, updated);
    this._history.push({ op: 'interpret', id: study.id, count: findings.length });
    return updated;
  }

  /** Detect an abnormality on an image. */
  detectAbnormality(image: ImagingStudy, type: string): Abnormality {
    const confidence = 0.6 + Math.random() * 0.35;
    const abnormality: Abnormality = {
      type,
      location: image.bodyPart,
      size: Math.round(Math.random() * 30 + 5),
      confidence: Number(confidence.toFixed(2)),
    };
    this._findings.push(abnormality);
    this._history.push({ op: 'detectAbnormality', type, location: image.bodyPart });
    return abnormality;
  }

  /** Measure a region of interest. */
  measure(roi: string, type: string): Measurement {
    const value = type === 'diameter' ? Math.random() * 50 + 5
      : type === 'volume' ? Math.random() * 100 + 10
        : Math.random() * 200 + 20;
    return { roi, type, value: Number(value.toFixed(2)), unit: type === 'volume' ? 'ml' : 'mm' };
  }

  /** Describe contrast enhancement parameters. */
  contrastEnhancement(type: string, agent: string): { type: string; agent: string; phase: string; timing: number } {
    const phase = type === 'dynamic' ? 'arterial' : 'static';
    const timing = agent === 'iodinated' ? 25 : agent === 'gadolinium' ? 18 : 30;
    return { type, agent, phase, timing };
  }

  /** Estimate radiation dose for a modality and technique. */
  radiationDose(modality: Modality, technique: string): { dose: number; unit: string; risk: number } {
    const base: Record<Modality, number> = {
      xray: 0.1, ct: 7, mri: 0, us: 0, pet: 7, mammogram: 0.4,
    };
    const dose = base[modality] * (technique.includes('high') ? 1.5 : 1);
    return { dose, unit: 'mSv', risk: dose * 0.005 };
  }

  /** Assess image quality given a set of factors. */
  imageQuality(factors: { noise?: number; contrast?: number; resolution?: number; artifacts?: string[] }): QualityFactors {
    return {
      noise: factors.noise ?? 0.2,
      contrast: factors.contrast ?? 0.7,
      resolution: factors.resolution ?? 1.0,
      artifacts: factors.artifacts ?? [],
    };
  }

  /** Hounsfield units for a tissue type. */
  hounsfieldUnits(tissue: string): number {
    const map: Record<string, number> = {
      air: -1000, lung: -700, fat: -100, water: 0, muscle: 40, blood: 60, bone: 400, metal: 3000,
    };
    return map[tissue.toLowerCase()] ?? 0;
  }

  /** T1/T2 relaxation times for a tissue. */
  t1t2Relaxation(tissue: string): { t1: number; t2: number; tr: number; te: number } {
    const map: Record<string, { t1: number; t2: number }> = {
      gray: { t1: 950, t2: 100 },
      white: { t1: 780, t2: 80 },
      csf: { t1: 4000, t2: 2000 },
      fat: { t1: 250, t2: 80 },
      muscle: { t1: 900, t2: 50 },
    };
    const entry = map[tissue.toLowerCase()] ?? { t1: 800, t2: 80 };
    return { t1: entry.t1, t2: entry.t2, tr: entry.t1 * 0.8, te: entry.t2 * 0.5 };
  }

  toPacket(): DataPacket<{
    studies: number;
    findings: Abnormality[];
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['medicine', 'MedicalImaging'],
      priority: 1,
      phase: 'imaging',
    };
    return {
      id: `medical-imaging-${Date.now().toString(36)}-${(++this._counter).toString(36)}`,
      payload: {
        studies: this._studies.size,
        findings: [...this._findings],
        history: [...this._history],
      },
      metadata,
    };
  }

  reset(): void {
    this._studies.clear();
    this._findings = [];
    this._history = [];
    this._counter = 0;
  }
}

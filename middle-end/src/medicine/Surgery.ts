import { DataPacket, PacketMeta } from '../shared/types';

/** Surgical procedure category. */
export type ProcedureType = 'elective' | 'urgent' | 'emergent' | 'palliative';

/** A surgical procedure definition. */
export interface SurgicalProcedure {
  readonly name: string;
  readonly type: ProcedureType;
  readonly approach: 'open' | 'laparoscopic' | 'robotic' | 'endoscopic';
  readonly indications: string[];
  readonly complications: string[];
  readonly estimatedTime?: number;
}

/** A discrete surgical step. */
export interface SurgicalStep {
  readonly order: number;
  readonly name: string;
  readonly detail: string;
  readonly duration: number;
  readonly risk?: 'low' | 'moderate' | 'high';
}

/** Post-operative care plan. */
export interface PostOp {
  readonly procedure: string;
  readonly monitoring: string[];
  readonly medications: string[];
  readonly restrictions: string[];
  readonly followUp: number;
  readonly complications: string[];
}

/** Surgical instrument descriptor. */
export interface Instrument {
  readonly name: string;
  readonly use: string;
  readonly category: 'cutting' | 'grasping' | 'retracting' | 'suturing' | 'hemostatic';
}

/** Pre-operative assessment summary. */
export interface PreOpAssessment {
  readonly patient: string;
  readonly procedure: string;
  readonly asaClass: 1 | 2 | 3 | 4 | 5;
  readonly risk: 'low' | 'moderate' | 'high';
  readonly workup: string[];
  readonly cleared: boolean;
}

/** Incision plan. */
export interface Incision {
  readonly type: string;
  readonly location: string;
  readonly length: number;
  readonly layers: string[];
}

/** Closure plan. */
export interface Closure {
  readonly layers: { name: string; suture: string }[];
  readonly technique: string;
  readonly skinClosure: string;
  readonly drainPlaced: boolean;
}

/**
 * Surgery models pre-op assessment, surgical approach, incision/dissection,
 * reconstruction, closure, and post-op care planning.
 */
export class Surgery {
  private _procedures: Map<string, SurgicalProcedure> = new Map();
  private _steps: SurgicalStep[] = [];
  private _history: unknown[] = [];
  private _counter = 0;

  constructor() {
    this._seedProcedures();
  }

  get procedureCount(): number { return this._procedures.size; }
  get stepCount(): number { return this._steps.length; }

  /** Perform a pre-operative assessment. */
  preOpAssessment(patient: string, procedure: string): PreOpAssessment {
    const entry = this._procedures.get(procedure.toLowerCase());
    const asa: PreOpAssessment['asaClass'] = entry?.type === 'emergent' ? 3 : 2;
    const risk: PreOpAssessment['risk'] = entry?.type === 'emergent' ? 'high' : entry?.type === 'urgent' ? 'moderate' : 'low';
    const workup = ['cbc', 'cmp', 'coagulation', 'ecg', 'imaging'];
    this._history.push({ op: 'preOpAssessment', patient, procedure });
    return {
      patient,
      procedure,
      asaClass: asa,
      risk,
      workup,
      cleared: risk !== 'high',
    };
  }

  /** Select surgical approach based on anatomy and target. */
  surgicalApproach(anatomy: string, target: string): { approach: SurgicalProcedure['approach']; rationale: string } {
    const approach: SurgicalProcedure['approach'] = target.includes('small') ? 'laparoscopic' : target.includes('brain') ? 'open' : 'open';
    return { approach, rationale: `target=${target}, anatomy=${anatomy}` };
  }

  /** Plan an incision. */
  incision(type: string, location: string, length: number): Incision {
    const layers = location.includes('abdomen') ? ['skin', 'subcutaneous', 'fascia', 'muscle', 'peritoneum']
      : location.includes('thorax') ? ['skin', 'subcutaneous', 'muscle', 'rib', 'pleura']
        : ['skin', 'subcutaneous', 'fascia'];
    this._history.push({ op: 'incision', type, location });
    return { type, location, length, layers };
  }

  /** Plan a dissection along a plane. */
  dissection(plane: string, structures: string[]): { plane: string; structures: string[]; technique: string; risk: string } {
    return {
      plane,
      structures,
      technique: 'blunt-and-sharp',
      risk: structures.length > 3 ? 'moderate' : 'low',
    };
  }

  /** Plan a resection with margins. */
  resection(tissue: string, margins: number): { tissue: string; margins: number; enBloc: boolean; specimenSize: number } {
    return {
      tissue,
      margins,
      enBloc: margins > 1,
      specimenSize: margins * 2,
    };
  }

  /** Plan a reconstruction. */
  reconstruction(defect: string, method: string): { defect: string; method: string; flap?: string; stages: number } {
    const stages = method.includes('free-flap') ? 1 : method.includes('tissue-expander') ? 2 : 1;
    return { defect, method, flap: method.includes('flap') ? method : undefined, stages };
  }

  /** Plan an anastomosis between two structures. */
  anastomosis(structureA: string, structureB: string, technique: string): {
    a: string; b: string; technique: string; leak: number; stenosis: number;
  } {
    const leakRisk = technique === 'hand-sewn' ? 0.03 : 0.05;
    return { a: structureA, b: structureB, technique, leak: leakRisk, stenosis: 0.02 };
  }

  /** Plan layered closure. */
  closure(layers: string[], technique: string): Closure {
    const sutureMap: Record<string, string> = {
      skin: 'running-subcuticular', fascia: 'running-loop', muscle: 'interrupted', peritoneum: 'continuous',
    };
    return {
      layers: layers.map(l => ({ name: l, suture: sutureMap[l] ?? 'interrupted' })),
      technique,
      skinClosure: technique === 'cosmetic' ? 'subcuticular' : 'staples',
      drainPlaced: layers.length > 3,
    };
  }

  /** Plan post-operative care. */
  postOpCare(procedure: string, complications: string[]): PostOp {
    const entry = this._procedures.get(procedure.toLowerCase());
    return {
      procedure,
      monitoring: ['vitals', 'pain', 'wound', 'intake-output'],
      medications: ['analgesic', 'antibiotic', 'dvt-prophylaxis'],
      restrictions: ['no-heavy-lifting', 'activity-as-tolerated'],
      followUp: 14,
      complications: complications.length > 0 ? complications : (entry?.complications ?? []),
    };
  }

  /** List complications for a procedure and type. */
  complications(procedure: string, type: 'intraop' | 'postop' | 'late'): string[] {
    const entry = this._procedures.get(procedure.toLowerCase());
    if (!entry) return [];
    const map: Record<string, string[]> = {
      intraop: ['bleeding', 'anesthesia-reaction', 'organ-injury'],
      postop: entry.complications,
      late: ['incisional-hernia', 'adhesions', 'stricture'],
    };
    return map[type];
  }

  /** Look up a surgical instrument. */
  surgicalInstrument(name: string, use: string): Instrument {
    const category: Instrument['category'] = name.includes('scalpel') ? 'cutting'
      : name.includes('forceps') ? 'grasping'
        : name.includes('retractor') ? 'retracting'
          : name.includes('needle') ? 'suturing'
            : 'hemostatic';
    return { name, use, category };
  }

  /** Return sterile-technique checklist. */
  sterileTechnique(): { rules: string[]; breaks: string[] } {
    return {
      rules: ['hand-scrub', 'gown', 'gloves', 'mask', 'sterile-field', 'draping'],
      breaks: ['glove-tear', 'field-contamination', 'unsterile-touch'],
    };
  }

  /** Select hemostasis method. */
  hemostasis(method: 'cautery' | 'ligature' | 'clip' | 'pressure' | 'sponge'): { method: string; indication: string; risk: string } {
    const map: Record<string, { indication: string; risk: string }> = {
      cautery: { indication: 'small-vessel', risk: 'thermal-injury' },
      ligature: { indication: 'medium-vessel', risk: 'slippage' },
      clip: { indication: 'medium-vessel', risk: 'displacement' },
      pressure: { indication: 'oozing', risk: 'rebleeding' },
      sponge: { indication: 'capillary', risk: 'retained-sponge' },
    };
    const entry = map[method];
    return { method, indication: entry.indication, risk: entry.risk };
  }

  /** Build a structured surgical step sequence. */
  buildStepSequence(names: string[]): SurgicalStep[] {
    const steps: SurgicalStep[] = names.map((name, idx) => ({
      order: idx + 1,
      name,
      detail: `${name}-detail`,
      duration: Math.floor(Math.random() * 20 + 5),
      risk: idx < 2 ? 'low' : idx < 5 ? 'moderate' : 'high',
    }));
    this._steps.push(...steps);
    this._history.push({ op: 'buildStepSequence', count: steps.length });
    return steps;
  }

  private _seedProcedures(): void {
    const seeds: SurgicalProcedure[] = [
      { name: 'appendectomy', type: 'emergent', approach: 'laparoscopic', indications: ['appendicitis'], complications: ['infection', 'bleeding'] },
      { name: 'cholecystectomy', type: 'elective', approach: 'laparoscopic', indications: ['cholelithiasis'], complications: ['bile-duct-injury', 'bleeding'] },
      { name: 'cabg', type: 'elective', approach: 'open', indications: ['cad'], complications: ['bleeding', 'stroke', 'infection'] },
      { name: 'craniotomy', type: 'urgent', approach: 'open', indications: ['tumor', 'trauma'], complications: ['infection', 'bleeding', 'seizure'] },
    ];
    for (const p of seeds) this._procedures.set(p.name, p);
  }

  toPacket(): DataPacket<{
    procedures: number;
    steps: SurgicalStep[];
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['medicine', 'Surgery'],
      priority: 1,
      phase: 'surgery',
    };
    return {
      id: `surgery-${Date.now().toString(36)}-${(++this._counter).toString(36)}`,
      payload: {
        procedures: this._procedures.size,
        steps: [...this._steps],
        history: [...this._history],
      },
      metadata,
    };
  }

  reset(): void {
    this._procedures.clear();
    this._steps = [];
    this._history = [];
    this._counter = 0;
    this._seedProcedures();
  }
}

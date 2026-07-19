import { DataPacket, PacketMeta } from '../shared/types';

/** A mental disorder descriptor. */
export interface Disorder {
  readonly name: string;
  readonly category: 'anxiety' | 'mood' | 'psychotic' | 'personality' | 'substance' | 'neurodevelopmental';
  readonly symptoms: string[];
  readonly criteria: string[];
  readonly treatment: string[];
  readonly dsmCode?: string;
  readonly prevalence?: number;
}

/** An assessment result. */
export interface Assessment {
  readonly scale: string;
  readonly score: number;
  readonly interpretation: 'minimal' | 'mild' | 'moderate' | 'moderately-severe' | 'severe';
  readonly cutoff: number;
}

/** A therapy descriptor. */
export interface Therapy {
  readonly type: 'cbt' | 'psychodynamic' | 'humanistic' | 'family' | 'group' | 'eclectic';
  readonly approach: string;
  readonly techniques: string[];
  readonly duration: number;
  readonly evidenceBase: 'strong' | 'moderate' | 'weak';
}

/** Diagnosis result. */
export interface DiagnosisResult {
  readonly disorder: string;
  readonly severity: Assessment['interpretation'];
  readonly criteria: string[];
  readonly differentials: string[];
  readonly dsmVersion: string;
}

/** Treatment efficacy result. */
export interface EfficacyResult {
  readonly treatment: string;
  readonly disorder: string;
  readonly effectSize: number;
  readonly evidence: 'strong' | 'moderate' | 'weak';
  readonly dropout: number;
}

/**
 * ClinicalPsychology diagnoses disorders (DSM), administers assessments,
 * and prescribes therapies (CBT, psychodynamic, humanistic, pharmacotherapy).
 */
export class ClinicalPsychology {
  private _disorders: Map<string, Disorder> = new Map();
  private _assessments: Assessment[] = [];
  private _therapies: Therapy[] = [];
  private _history: unknown[] = [];
  private _counter = 0;

  constructor() {
    this._seedDisorders();
  }

  get disorderCount(): number { return this._disorders.size; }
  get assessmentCount(): number { return this._assessments.length; }
  get therapyCount(): number { return this._therapies.length; }

  /** Diagnose a disorder from symptoms and DSM criteria. */
  diagnose(symptoms: string[], criteria: string[], dsmVersion: '5' | '5-TR' | 'ICD-11'): DiagnosisResult {
    let best: Disorder | null = null;
    let bestMatch = 0;
    for (const d of this._disorders.values()) {
      const matched = symptoms.filter(s => d.symptoms.includes(s)).length;
      const score = matched / Math.max(1, d.symptoms.length);
      if (score > bestMatch) {
        bestMatch = score;
        best = d;
      }
    }
    const severity: Assessment['interpretation'] = bestMatch > 0.7 ? 'severe' : bestMatch > 0.5 ? 'moderately-severe' : bestMatch > 0.3 ? 'moderate' : 'mild';
    const differentials = Array.from(this._disorders.values())
      .filter(d => d.name !== best?.name)
      .filter(d => symptoms.some(s => d.symptoms.includes(s)))
      .slice(0, 3)
      .map(d => d.name);
    return {
      disorder: best?.name ?? 'none',
      severity,
      criteria,
      differentials,
      dsmVersion,
    };
  }

  /** Assess depression severity. */
  depression(symptoms: string[], severity: number): DiagnosisResult {
    return {
      disorder: 'major-depressive-disorder',
      severity: severity > 0.7 ? 'severe' : severity > 0.4 ? 'moderate' : 'mild',
      criteria: symptoms,
      differentials: ['persistent-depressive-disorder', 'bipolar-depressed'],
      dsmVersion: '5-TR',
    };
  }

  /** Assess anxiety disorder. */
  anxiety(type: 'generalized' | 'social' | 'panic' | 'phobia' | 'ocd', symptoms: string[], severity: number): DiagnosisResult {
    const names: Record<typeof type, string> = {
      generalized: 'generalized-anxiety-disorder',
      social: 'social-anxiety-disorder',
      panic: 'panic-disorder',
      phobia: 'specific-phobia',
      ocd: 'obsessive-compulsive-disorder',
    };
    return {
      disorder: names[type],
      severity: severity > 0.7 ? 'severe' : severity > 0.4 ? 'moderate' : 'mild',
      criteria: symptoms,
      differentials: ['adjustment-disorder', 'anxiety-due-to-medical-condition'],
      dsmVersion: '5-TR',
    };
  }

  /** Assess personality disorder. */
  personality(type: 'borderline' | 'narcissistic' | 'antisocial' | 'avoidant' | 'dependent', traits: string[], _maladaptive: boolean): DiagnosisResult {
    const names: Record<typeof type, string> = {
      borderline: 'borderline-personality-disorder',
      narcissistic: 'narcissistic-personality-disorder',
      antisocial: 'antisocial-personality-disorder',
      avoidant: 'avoidant-personality-disorder',
      dependent: 'dependent-personality-disorder',
    };
    return {
      disorder: names[type],
      severity: 'moderate',
      criteria: traits,
      differentials: ['other-personality-disorder'],
      dsmVersion: '5-TR',
    };
  }

  /** Assess schizophrenia. */
  schizophrenia(symptoms: string[], duration: number, _impairment: boolean): DiagnosisResult {
    const severity: Assessment['interpretation'] = duration > 6 ? 'severe' : duration > 1 ? 'moderate' : 'mild';
    return {
      disorder: 'schizophrenia',
      severity,
      criteria: symptoms,
      differentials: ['schizoaffective-disorder', 'brief-psychotic-disorder'],
      dsmVersion: '5-TR',
    };
  }

  /** Assess bipolar disorder. */
  bipolar(type: 'I' | 'II' | 'cyclothymic', episodes: string[], _cycling: string): DiagnosisResult {
    return {
      disorder: `bipolar-${type}-disorder`,
      severity: 'moderately-severe',
      criteria: episodes,
      differentials: ['cyclothymic-disorder', 'major-depressive-disorder'],
      dsmVersion: '5-TR',
    };
  }

  /** Assess PTSD. */
  ptsd(trauma: string, symptoms: string[], duration: number): DiagnosisResult {
    const severity: Assessment['interpretation'] = duration > 12 ? 'severe' : duration > 3 ? 'moderate' : 'mild';
    return {
      disorder: 'posttraumatic-stress-disorder',
      severity,
      criteria: symptoms,
      differentials: ['acute-stress-disorder', 'adjustment-disorder'],
      dsmVersion: '5-TR',
    };
  }

  /** Assess OCD. */
  ocd(obsessions: string[], compulsions: string[]): DiagnosisResult {
    return {
      disorder: 'obsessive-compulsive-disorder',
      severity: 'moderate',
      criteria: [...obsessions, ...compulsions],
      differentials: ['anxiety-disorder', 'ocd-related-disorder'],
      dsmVersion: '5-TR',
    };
  }

  /** Conduct CBT session. */
  cbt(thoughts: string[], behaviors: string[], restructuring: string[]): Therapy {
    const therapy: Therapy = {
      type: 'cbt',
      approach: 'cognitive-behavioral',
      techniques: ['cognitive-restructuring', 'behavioral-activation', 'exposure', 'homework'],
      duration: 12,
      evidenceBase: 'strong',
    };
    this._therapies.push(therapy);
    this._history.push({ op: 'cbt', thoughts: thoughts.length });
    return therapy;
  }

  /** Conduct psychodynamic therapy. */
  psychodynamic(_unconscious: string[], transference: string[], _insight: string): Therapy {
    const therapy: Therapy = {
      type: 'psychodynamic',
      approach: 'psychodynamic',
      techniques: ['free-association', 'interpretation', 'transference-analysis', 'working-through'],
      duration: 50,
      evidenceBase: 'moderate',
    };
    this._therapies.push(therapy);
    return therapy;
  }

  /** Conduct humanistic therapy. */
  humanistic(_self: string, _actualization: string, _congruence: string): Therapy {
    const therapy: Therapy = {
      type: 'humanistic',
      approach: 'person-centered',
      techniques: ['active-listening', 'unconditional-positive-regard', 'empathy', 'congruence'],
      duration: 20,
      evidenceBase: 'moderate',
    };
    this._therapies.push(therapy);
    return therapy;
  }

  /** Prescribe pharmacotherapy. */
  pharmacotherapy(disorder: string, medication: string): { disorder: string; medication: string; class: string; monitoring: string[]; sideEffects: string[] } {
    const classMap: Record<string, string> = {
      'major-depressive-disorder': 'ssri',
      'generalized-anxiety-disorder': 'ssri',
      'schizophrenia': 'antipsychotic',
      'bipolar-I-disorder': 'mood-stabilizer',
    };
    return {
      disorder,
      medication,
      class: classMap[disorder] ?? 'unknown',
      monitoring: ['symptom-checklist', 'side-effects', 'therapeutic-level'],
      sideEffects: ['gi-upset', 'sedation', 'metabolic-changes'],
    };
  }

  /** Assess treatment efficacy. */
  efficacy(treatment: string, disorder: string, _evidence: 'strong' | 'moderate' | 'weak'): EfficacyResult {
    const seed = this._hash(`${treatment}|${disorder}`);
    const effectSize = 0.4 + (seed % 100) / 200;
    return {
      treatment,
      disorder,
      effectSize: Number(effectSize.toFixed(2)),
      evidence: effectSize > 0.8 ? 'strong' : effectSize > 0.5 ? 'moderate' : 'weak',
      dropout: 0.2,
    };
  }

  /** Administer an assessment scale. */
  administerAssessment(scale: string, score: number, cutoff: number): Assessment {
    const interpretation: Assessment['interpretation'] = score > cutoff * 1.5 ? 'severe'
      : score > cutoff * 1.25 ? 'moderately-severe'
        : score > cutoff ? 'moderate'
          : score > cutoff * 0.5 ? 'mild' : 'minimal';
    const a: Assessment = { scale, score, interpretation, cutoff };
    this._assessments.push(a);
    return a;
  }

  private _hash(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  private _seedDisorders(): void {
    const seeds: Disorder[] = [
      { name: 'major-depressive-disorder', category: 'mood', symptoms: ['depressed-mood', 'anhedonia', 'fatigue', 'worthlessness'], criteria: ['5-symptoms-2-weeks'], treatment: ['ssri', 'cbt'], dsmCode: '296', prevalence: 0.07 },
      { name: 'generalized-anxiety-disorder', category: 'anxiety', symptoms: ['excessive-worry', 'restlessness', 'fatigue', 'irritability'], criteria: ['3-symptoms-6-months'], treatment: ['ssri', 'cbt'], dsmCode: '300.02' },
      { name: 'schizophrenia', category: 'psychotic', symptoms: ['delusions', 'hallucinations', 'disorganized-speech'], criteria: ['2-symptoms-6-months'], treatment: ['antipsychotic'], dsmCode: '295' },
      { name: 'bipolar-I-disorder', category: 'mood', symptoms: ['mania', 'depression', 'elevated-mood'], criteria: ['manic-episode'], treatment: ['mood-stabilizer'], dsmCode: '296' },
    ];
    for (const d of seeds) this._disorders.set(d.name, d);
  }

  toPacket(): DataPacket<{
    disorders: number;
    assessments: Assessment[];
    therapies: Therapy[];
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['psychology', 'ClinicalPsychology'],
      priority: 1,
      phase: 'clinical-psychology',
    };
    return {
      id: `clinical-psychology-${Date.now().toString(36)}-${(++this._counter).toString(36)}`,
      payload: {
        disorders: this._disorders.size,
        assessments: [...this._assessments],
        therapies: [...this._therapies],
        history: [...this._history],
      },
      metadata,
    };
  }

  reset(): void {
    this._disorders.clear();
    this._assessments = [];
    this._therapies = [];
    this._history = [];
    this._counter = 0;
    this._seedDisorders();
  }
}

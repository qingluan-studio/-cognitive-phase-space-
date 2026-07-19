import { DataPacket, PacketMeta } from '../shared/types';

/** Severity scale used across all symptom assessments. */
export type Severity = 'mild' | 'moderate' | 'severe' | 'life-threatening';

/** Triage priority bucket. */
export type TriageLevel = 'immediate' | 'emergent' | 'urgent' | 'less-urgent' | 'non-urgent';

/** A clinical symptom recorded against a body region. */
export interface Symptom {
  readonly name: string;
  readonly severity: Severity;
  readonly duration: number;
  readonly bodyPart: string;
  readonly onset?: string;
  readonly modifiers?: string[];
}

/** A diagnostic hypothesis derived from symptom clusters. */
export interface Diagnosis {
  readonly condition: string;
  readonly confidence: number;
  readonly symptoms: string[];
  readonly tests: string[];
  readonly icd10?: string;
  readonly notes?: string;
}

/** A ranked differential diagnosis list. */
export interface DifferentialList {
  readonly anchor: string;
  readonly candidates: Diagnosis[];
  readonly ruledOut: string[];
  readonly generatedAt: number;
}

/** Entry in the local clinical knowledge base. */
export interface KnowledgeEntry {
  readonly condition: string;
  readonly symptoms: string[];
  readonly baseRate: number;
  readonly redFlags: string[];
  readonly icd10: string;
}

/** Symptom-to-condition matching result. */
export interface MatchResult {
  readonly condition: string;
  readonly overlap: number;
  readonly score: number;
  readonly missingSymptoms: string[];
}

/** Bayesian posterior snapshot. */
export interface BayesianPosterior {
  readonly condition: string;
  readonly prior: number;
  readonly likelihood: number;
  readonly posterior: number;
}

/**
 * SymptomAnalyzer performs structured clinical reasoning over symptom sets,
 * combining rule-based matching, likelihood ratios, and Bayesian updating.
 */
export class SymptomAnalyzer {
  private _symptoms: Map<string, Symptom> = new Map();
  private _diagnoses: Diagnosis[] = [];
  private _differentials: DifferentialList[] = [];
  private _history: unknown[] = [];
  private _knowledgeBase: Map<string, KnowledgeEntry> = new Map();
  private _counter = 0;

  constructor() {
    this._seedKnowledgeBase();
  }

  get symptomCount(): number { return this._symptoms.size; }
  get diagnosisCount(): number { return this._diagnoses.length; }
  get differentialCount(): number { return this._differentials.length; }
  get knowledgeBaseSize(): number { return this._knowledgeBase.size; }

  /** Register a symptom with its severity and body location. */
  addSymptom(name: string, severity: Severity, bodyPart: string, duration: number = 1): Symptom {
    const symptom: Symptom = {
      name,
      severity,
      duration,
      bodyPart,
      onset: new Date().toISOString(),
      modifiers: [],
    };
    this._symptoms.set(`${name}@${bodyPart}`, symptom);
    this._history.push({ op: 'addSymptom', name, severity, bodyPart });
    return symptom;
  }

  /** Analyze a symptom set and produce a primary diagnosis with confidence. */
  analyze(symptoms: Symptom[]): Diagnosis {
    const names = symptoms.map(s => s.name);
    const candidates = this.matchCondition(symptoms, Array.from(this._knowledgeBase.values()));
    candidates.sort((a, b) => b.score - a.score);
    const top = candidates[0];
    const confidence = top ? Math.min(0.99, top.score) : 0.05;
    const entry = top ? this._knowledgeBase.get(top.condition) : undefined;
    const diagnosis: Diagnosis = {
      condition: top?.condition ?? 'unknown',
      confidence,
      symptoms: names,
      tests: entry ? this._recommendTests(entry) : [],
      icd10: entry?.icd10,
      notes: top ? `overlap=${top.overlap.toFixed(2)}, missing=${top.missingSymptoms.length}` : 'no match',
    };
    this._diagnoses.push(diagnosis);
    this._history.push({ op: 'analyze', condition: diagnosis.condition, confidence });
    return diagnosis;
  }

  /** Generate a ranked differential diagnosis list for a symptom set. */
  differential(symptoms: Symptom[]): DifferentialList {
    const matches = this.matchCondition(symptoms, Array.from(this._knowledgeBase.values()));
    const candidates: Diagnosis[] = matches.slice(0, 5).map(m => ({
      condition: m.condition,
      confidence: Math.min(0.99, m.score),
      symptoms: symptoms.map(s => s.name),
      tests: [],
      icd10: this._knowledgeBase.get(m.condition)?.icd10,
    }));
    const ruledOut = matches.filter(m => m.score < 0.1).map(m => m.condition);
    const list: DifferentialList = {
      anchor: symptoms[0]?.name ?? 'unknown',
      candidates,
      ruledOut,
      generatedAt: Date.now(),
    };
    this._differentials.push(list);
    this._history.push({ op: 'differential', anchor: list.anchor, size: candidates.length });
    return list;
  }

  /** Flag a symptom as a red-flag based on knowledge base. */
  redFlag(symptom: Symptom): boolean {
    for (const entry of this._knowledgeBase.values()) {
      if (entry.redFlags.includes(symptom.name)) {
        this._history.push({ op: 'redFlag', symptom: symptom.name, condition: entry.condition });
        return true;
      }
    }
    return false;
  }

  /** Assign a triage level to a symptom set. */
  triage(symptoms: Symptom[]): TriageLevel {
    const hasRedFlag = symptoms.some(s => this.redFlag(s));
    if (hasRedFlag) return 'immediate';
    const maxSeverity = symptoms.reduce((max, s) => {
      const order: Severity[] = ['mild', 'moderate', 'severe', 'life-threatening'];
      return order.indexOf(s.severity) > order.indexOf(max) ? s.severity : max;
    }, 'mild' as Severity);
    if (maxSeverity === 'life-threatening') return 'emergent';
    if (maxSeverity === 'severe') return 'urgent';
    if (maxSeverity === 'moderate') return 'less-urgent';
    return 'non-urgent';
  }

  /** Match a symptom set against a list of candidate conditions. */
  matchCondition(symptoms: Symptom[], conditions: KnowledgeEntry[]): MatchResult[] {
    const names = symptoms.map(s => s.name.toLowerCase());
    return conditions.map(entry => {
      const entrySymptoms = entry.symptoms.map(s => s.toLowerCase());
      const overlapSet = new Set(names.filter(n => entrySymptoms.includes(n)));
      const overlap = overlapSet.size / Math.max(1, entrySymptoms.length);
      const penalty = names.length > 0 ? overlapSet.size / names.length : 0;
      const score = overlap * 0.7 + penalty * 0.3;
      const missingSymptoms = entrySymptoms.filter(s => !names.includes(s));
      return {
        condition: entry.condition,
        overlap,
        score: score * entry.baseRate,
        missingSymptoms,
      };
    });
  }

  /** Compute the likelihood ratio for a symptom given a condition. */
  likelihoodRatio(symptom: Symptom, condition: string): { lr: number; sensitivity: number; specificity: number } {
    const entry = this._knowledgeBase.get(condition);
    if (!entry) return { lr: 1, sensitivity: 0.5, specificity: 0.5 };
    const sensitivity = entry.symptoms.includes(symptom.name) ? 0.85 : 0.15;
    const specificity = entry.symptoms.includes(symptom.name) ? 0.8 : 0.6;
    const lr = sensitivity / Math.max(0.01, 1 - specificity);
    this._history.push({ op: 'likelihoodRatio', symptom: symptom.name, condition, lr });
    return { lr, sensitivity, specificity };
  }

  /** Approximate sensitivity of a diagnostic test for a condition. */
  sensitivity(test: string, condition: string): number {
    const seed = this._hash(`${test}|${condition}`);
    return 0.6 + ((seed % 35) / 100);
  }

  /** Approximate specificity of a diagnostic test for a condition. */
  specificity(test: string, condition: string): number {
    const seed = this._hash(`${test}|${condition}|spec`);
    return 0.65 + ((seed % 30) / 100);
  }

  /** Compute positive/negative predictive value from prevalence. */
  predictiveValue(positive: boolean, negative: boolean, prevalence: number): {
    ppv: number; npv: number;
  } {
    const sens = positive ? 0.85 : 0.7;
    const spec = negative ? 0.9 : 0.75;
    const ppv = (sens * prevalence) / Math.max(1e-6, sens * prevalence + (1 - spec) * (1 - prevalence));
    const npv = (spec * (1 - prevalence)) / Math.max(1e-6, spec * (1 - prevalence) + (1 - sens) * prevalence);
    return { ppv, npv };
  }

  /** Update a prior probability using Bayes' theorem over symptoms. */
  bayesianDiagnosis(prior: number, symptoms: Symptom[]): BayesianPosterior {
    let posterior = Math.max(1e-6, Math.min(1 - 1e-6, prior));
    const anchorCondition = this._diagnoses[this._diagnoses.length - 1]?.condition ?? 'unknown';
    for (const s of symptoms) {
      const { lr } = this.likelihoodRatio(s, anchorCondition);
      const odds = posterior / (1 - posterior);
      posterior = (odds * lr) / (1 + odds * lr);
    }
    this._history.push({ op: 'bayesianDiagnosis', prior, posterior, condition: anchorCondition });
    return { condition: anchorCondition, prior, likelihood: posterior / Math.max(1e-6, prior), posterior };
  }

  /** Look up the ICD-10 code for a condition name. */
  icd10Lookup(condition: string): string | null {
    const entry = this._knowledgeBase.get(condition);
    return entry?.icd10 ?? null;
  }

  private _recommendTests(entry: KnowledgeEntry): string[] {
    const base = ['cbc', 'cmp'];
    if (entry.redFlags.length > 0) base.push('ecg', 'imaging');
    if (entry.condition.includes('cardiac')) base.push('troponin');
    if (entry.condition.includes('infection')) base.push('culture', 'crp');
    return base;
  }

  private _hash(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = (h * 31 + s.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
  }

  private _seedKnowledgeBase(): void {
    const seeds: KnowledgeEntry[] = [
      { condition: 'myocardial-infarction', symptoms: ['chest-pain', 'dyspnea', 'diaphoresis', 'nausea'], baseRate: 0.8, redFlags: ['chest-pain', 'syncope'], icd10: 'I21' },
      { condition: 'pneumonia', symptoms: ['cough', 'fever', 'dyspnea', 'sputum'], baseRate: 0.7, redFlags: ['cyanosis'], icd10: 'J18' },
      { condition: 'stroke', symptoms: ['hemiparesis', 'aphasia', 'headache', 'confusion'], baseRate: 0.75, redFlags: ['hemiparesis', 'aphasia'], icd10: 'I63' },
      { condition: 'appendicitis', symptoms: ['rlq-pain', 'fever', 'nausea', 'anorexia'], baseRate: 0.78, redFlags: ['rlq-pain'], icd10: 'K35' },
      { condition: 'diabetes-ketoacidosis', symptoms: ['polyuria', 'polydipsia', 'vomiting', 'confusion'], baseRate: 0.72, redFlags: ['confusion', 'kussmaul-breathing'], icd10: 'E10.1' },
      { condition: 'sepsis', symptoms: ['fever', 'tachycardia', 'hypotension', 'confusion'], baseRate: 0.7, redFlags: ['hypotension', 'confusion'], icd10: 'A41' },
    ];
    for (const entry of seeds) this._knowledgeBase.set(entry.condition, entry);
  }

  toPacket(): DataPacket<{
    symptoms: number;
    diagnoses: Diagnosis[];
    differentials: DifferentialList[];
    knowledgeBaseSize: number;
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['medicine', 'SymptomAnalyzer'],
      priority: 1,
      phase: 'clinical_reasoning',
    };
    return {
      id: `symptom-analyzer-${Date.now().toString(36)}-${(++this._counter).toString(36)}`,
      payload: {
        symptoms: this._symptoms.size,
        diagnoses: [...this._diagnoses],
        differentials: [...this._differentials],
        knowledgeBaseSize: this._knowledgeBase.size,
        history: [...this._history],
      },
      metadata,
    };
  }

  reset(): void {
    this._symptoms.clear();
    this._diagnoses = [];
    this._differentials = [];
    this._history = [];
    this._counter = 0;
  }
}

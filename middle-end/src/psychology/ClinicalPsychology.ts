import { DataPacket, PacketMeta } from '../shared/types';

export interface Disorder {
  readonly name: string;
  readonly category: 'anxiety' | 'mood' | 'psychotic' | 'personality' | 'substance' | 'neurodevelopmental';
  readonly symptoms: string[];
  readonly criteria: string[];
  readonly treatment: string[];
  readonly dsmCode?: string;
  readonly prevalence?: number;
}

export interface Assessment {
  readonly scale: string;
  readonly score: number;
  readonly interpretation: 'minimal' | 'mild' | 'moderate' | 'moderately-severe' | 'severe';
  readonly cutoff: number;
}

export interface Therapy {
  readonly type: 'cbt' | 'psychodynamic' | 'humanistic' | 'family' | 'group' | 'eclectic';
  readonly approach: string;
  readonly techniques: string[];
  readonly duration: number;
  readonly evidenceBase: 'strong' | 'moderate' | 'weak';
}

export interface DiagnosisResult {
  readonly disorder: string;
  readonly severity: Assessment['interpretation'];
  readonly criteria: string[];
  readonly differentials: string[];
  readonly dsmVersion: string;
}

export interface EfficacyResult {
  readonly treatment: string;
  readonly disorder: string;
  readonly effectSize: number;
  readonly evidence: 'strong' | 'moderate' | 'weak';
  readonly dropout: number;
}

export interface Psychopharmacology {
  readonly medication: string;
  readonly class: string;
  readonly indication: string;
  readonly mechanismOfAction: string;
  readonly sideEffects: string[];
  readonly monitoring: string[];
  readonly efficacy: number;
}

export interface PsychologicalAssessment {
  readonly name: string;
  readonly type: 'self-report' | 'interview' | 'objective' | 'projective';
  readonly domains: string[];
  readonly reliability: number;
  readonly validity: number;
  readonly norms: string;
}

export interface TreatmentPlan {
  readonly disorder: string;
  readonly goals: string[];
  readonly interventions: string[];
  readonly duration: number;
  readonly expectedOutcome: string;
  readonly progressMonitoring: string[];
}

export interface CrisisAssessment {
  readonly riskLevel: 'low' | 'moderate' | 'high' | 'imminent';
  readonly factors: string[];
  readonly protectiveFactors: string[];
  readonly recommendations: string[];
  readonly immediateActions: string[];
}

export interface CaseFormulation {
  readonly diagnosis: string;
  readonly etiology: string[];
  readonly maintainingFactors: string[];
  readonly treatmentTargets: string[];
  readonly prognosis: string;
}

export interface ProgressNote {
  readonly date: string;
  readonly symptoms: { symptom: string; severity: number }[];
  readonly functioning: number;
  readonly treatmentResponse: string;
  readonly nextSteps: string[];
}

export class ClinicalPsychology {
  private _disorders: Map<string, Disorder> = new Map();
  private _assessments: Assessment[] = [];
  private _therapies: Therapy[] = [];
  private _medications: Map<string, Psychopharmacology> = new Map();
  private _assessmentTools: Map<string, PsychologicalAssessment> = new Map();
  private _history: unknown[] = [];
  private _counter = 0;

  constructor() {
    this._seedDisorders();
    this._seedMedications();
    this._seedAssessmentTools();
  }

  get disorderCount(): number { return this._disorders.size; }
  get assessmentCount(): number { return this._assessments.length; }
  get therapyCount(): number { return this._therapies.length; }
  get medicationCount(): number { return this._medications.size; }
  get assessmentToolCount(): number { return this._assessmentTools.size; }

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
    this._history.push({ op: 'diagnose', disorder: best?.name, severity, dsmVersion });
    return {
      disorder: best?.name ?? 'none',
      severity,
      criteria,
      differentials,
      dsmVersion,
    };
  }

  depression(symptoms: string[], severity: number, subtype: 'melancholic' | 'atypical' | 'psychotic' | 'seasonal' | 'persistent' = 'melancholic'): DiagnosisResult {
    const subtypeModifiers = { melancholic: 'melancholic-features', atypical: 'atypical-features', psychotic: 'psychotic-features', seasonal: 'seasonal-pattern', persistent: 'persistent-depressive-disorder' };
    const severityLabel: Assessment['interpretation'] = severity > 0.7 ? 'severe' : severity > 0.4 ? 'moderate' : 'mild';
    this._history.push({ op: 'depression', subtype, severity });
    return {
      disorder: `major-depressive-disorder-${subtypeModifiers[subtype]}`,
      severity: severityLabel,
      criteria: symptoms,
      differentials: ['persistent-depressive-disorder', 'bipolar-depressed', 'adjustment-disorder'],
      dsmVersion: '5-TR',
    };
  }

  anxiety(type: 'generalized' | 'social' | 'panic' | 'phobia' | 'ocd', symptoms: string[], severity: number, comorbidity: string[] = []): DiagnosisResult {
    const names: Record<typeof type, string> = {
      generalized: 'generalized-anxiety-disorder',
      social: 'social-anxiety-disorder',
      panic: 'panic-disorder',
      phobia: 'specific-phobia',
      ocd: 'obsessive-compulsive-disorder',
    };
    const severityLabel: Assessment['interpretation'] = severity > 0.7 ? 'severe' : severity > 0.4 ? 'moderate' : 'mild';
    const differentials = ['adjustment-disorder', 'anxiety-due-to-medical-condition', ...comorbidity];
    this._history.push({ op: 'anxiety', type, severity, comorbidityCount: comorbidity.length });
    return {
      disorder: names[type],
      severity: severityLabel,
      criteria: symptoms,
      differentials,
      dsmVersion: '5-TR',
    };
  }

  personality(type: 'borderline' | 'narcissistic' | 'antisocial' | 'avoidant' | 'dependent', traits: string[], maladaptive: boolean, severity: 'mild' | 'moderate' | 'severe' = 'moderate'): DiagnosisResult {
    const names: Record<typeof type, string> = {
      borderline: 'borderline-personality-disorder',
      narcissistic: 'narcissistic-personality-disorder',
      antisocial: 'antisocial-personality-disorder',
      avoidant: 'avoidant-personality-disorder',
      dependent: 'dependent-personality-disorder',
    };
    this._history.push({ op: 'personality', type, severity, maladaptive });
    return {
      disorder: names[type],
      severity,
      criteria: traits,
      differentials: ['other-personality-disorder', 'adjustment-disorder'],
      dsmVersion: '5-TR',
    };
  }

  schizophrenia(symptoms: string[], duration: number, impairment: boolean, subtype: 'paranoid' | 'disorganized' | 'catatonic' | 'undifferentiated' = 'paranoid'): DiagnosisResult {
    const severity: Assessment['interpretation'] = duration > 6 ? 'severe' : duration > 1 ? 'moderate' : 'mild';
    const subtypes: Record<string, string> = { paranoid: 'paranoid-type', disorganized: 'disorganized-type', catatonic: 'catatonic-type', undifferentiated: 'undifferentiated-type' };
    this._history.push({ op: 'schizophrenia', subtype, duration, impairment });
    return {
      disorder: `schizophrenia-${subtypes[subtype]}`,
      severity,
      criteria: symptoms,
      differentials: ['schizoaffective-disorder', 'brief-psychotic-disorder', 'delusional-disorder'],
      dsmVersion: '5-TR',
    };
  }

  bipolar(type: 'I' | 'II' | 'cyclothymic', episodes: string[], cycling: string, rapidCycling: boolean = false): DiagnosisResult {
    const cyclingSpecifier = rapidCycling ? 'rapid-cycling' : cycling;
    this._history.push({ op: 'bipolar', type, rapidCycling });
    return {
      disorder: `bipolar-${type}-disorder${rapidCycling ? '-rapid-cycling' : ''}`,
      severity: 'moderately-severe',
      criteria: episodes,
      differentials: ['cyclothymic-disorder', 'major-depressive-disorder', 'borderline-personality-disorder'],
      dsmVersion: '5-TR',
    };
  }

  ptsd(trauma: string, symptoms: string[], duration: number, subtype: 'delayed-onset' | 'dissociative' | 'normal' = 'normal'): DiagnosisResult {
    const severity: Assessment['interpretation'] = duration > 12 ? 'severe' : duration > 3 ? 'moderate' : 'mild';
    const subtypeLabel = subtype === 'delayed-onset' ? 'delayed-onset' : subtype === 'dissociative' ? 'with-dissociative-features' : '';
    this._history.push({ op: 'ptsd', subtype, duration, symptomCount: symptoms.length });
    return {
      disorder: `posttraumatic-stress-disorder${subtypeLabel ? `-${subtypeLabel}` : ''}`,
      severity,
      criteria: [...symptoms, trauma],
      differentials: ['acute-stress-disorder', 'adjustment-disorder', 'major-depressive-disorder'],
      dsmVersion: '5-TR',
    };
  }

  ocd(obsessions: string[], compulsions: string[], insight: 'good' | 'fair' | 'poor' = 'fair'): DiagnosisResult {
    const insightSpecifier = insight === 'poor' ? 'poor-insight' : insight === 'fair' ? 'fair-insight' : '';
    this._history.push({ op: 'ocd', obsessionCount: obsessions.length, compulsionCount: compulsions.length, insight });
    return {
      disorder: `obsessive-compulsive-disorder${insightSpecifier ? `-${insightSpecifier}` : ''}`,
      severity: 'moderate',
      criteria: [...obsessions, ...compulsions],
      differentials: ['anxiety-disorder', 'ocd-related-disorder', 'body-dysmorphic-disorder'],
      dsmVersion: '5-TR',
    };
  }

  eatingDisorder(type: 'anorexia' | 'bulimia' | 'binge-eating', symptoms: string[], severity: number): DiagnosisResult {
    const names: Record<string, string> = { anorexia: 'anorexia-nervosa', bulimia: 'bulimia-nervosa', 'binge-eating': 'binge-eating-disorder' };
    const severityLabel: Assessment['interpretation'] = severity > 0.7 ? 'severe' : severity > 0.4 ? 'moderate' : 'mild';
    this._history.push({ op: 'eatingDisorder', type, severity });
    return {
      disorder: names[type],
      severity: severityLabel,
      criteria: symptoms,
      differentials: ['avoidant-restrictive-food-intake-disorder', 'body-dysmorphic-disorder'],
      dsmVersion: '5-TR',
    };
  }

  substanceUseDisorder(substance: string, symptoms: string[], severity: number): DiagnosisResult {
    const severityLabel: Assessment['interpretation'] = severity > 0.7 ? 'severe' : severity > 0.4 ? 'moderate' : 'mild';
    this._history.push({ op: 'substanceUseDisorder', substance, severity });
    return {
      disorder: `${substance}-use-disorder`,
      severity: severityLabel,
      criteria: symptoms,
      differentials: ['substance-induced-disorder', 'bipolar-disorder', 'schizophrenia'],
      dsmVersion: '5-TR',
    };
  }

  cbt(thoughts: string[], behaviors: string[], restructuring: string[], sessionNumber: number = 1): Therapy {
    const therapy: Therapy = {
      type: 'cbt',
      approach: 'cognitive-behavioral',
      techniques: ['cognitive-restructuring', 'behavioral-activation', 'exposure', 'homework', 'thought-records'],
      duration: 12,
      evidenceBase: 'strong',
    };
    this._therapies.push(therapy);
    this._history.push({ op: 'cbt', thoughts: thoughts.length, behaviors: behaviors.length, sessionNumber });
    return therapy;
  }

  cbtSessionPlan(sessionNumber: number, goals: string[], techniques: string[], homework: string): { sessionNumber: number; goals: string[]; techniques: string[]; homework: string; expectedOutcome: string; nextSessionFocus: string } {
    const expectedOutcome = sessionNumber < 4 ? 'establishing-therapeutic-alliance' : 
                           sessionNumber < 8 ? 'skill-acquisition' : 
                           sessionNumber < 12 ? 'application-and-generalization' : 'termination-and-relapse-prevention';
    const nextSessionFocus = sessionNumber < 12 ? 'continue-skill-practice' : 'relapse-prevention-plan';
    this._history.push({ op: 'cbtSessionPlan', sessionNumber, goalCount: goals.length });
    return { sessionNumber, goals, techniques, homework, expectedOutcome, nextSessionFocus };
  }

  psychodynamic(unconscious: string[], transference: string[], insight: string, sessionNumber: number = 1): Therapy {
    const therapy: Therapy = {
      type: 'psychodynamic',
      approach: 'psychodynamic',
      techniques: ['free-association', 'interpretation', 'transference-analysis', 'working-through', 'dream-analysis'],
      duration: 50,
      evidenceBase: 'moderate',
    };
    this._therapies.push(therapy);
    this._history.push({ op: 'psychodynamic', sessionNumber, transference: transference.length });
    return therapy;
  }

  psychodynamicCaseFormulation(patientHistory: string[], currentConcerns: string[], patterns: string[]): { developmentalHistory: string[]; unconsciousDynamics: string[]; defenseMechanisms: string[]; transferentialPatterns: string[]; treatmentGoals: string[] } {
    const defenseMechanisms = ['repression', 'denial', 'projection', 'displacement'];
    const transferentialPatterns = patterns;
    const treatmentGoals = ['insight-development', 'unconscious-conflict-resolution', 'character-change'];
    this._history.push({ op: 'psychodynamicCaseFormulation', patternCount: patterns.length });
    return { developmentalHistory: patientHistory, unconsciousDynamics: currentConcerns, defenseMechanisms, transferentialPatterns, treatmentGoals };
  }

  humanistic(self: string, actualization: string, congruence: string, empathyLevel: number = 0.8): Therapy {
    const therapy: Therapy = {
      type: 'humanistic',
      approach: 'person-centered',
      techniques: ['active-listening', 'unconditional-positive-regard', 'empathy', 'congruence', 'reflection'],
      duration: 20,
      evidenceBase: 'moderate',
    };
    this._therapies.push(therapy);
    this._history.push({ op: 'humanistic', empathyLevel });
    return therapy;
  }

  humanisticConditions(selfActualization: number, congruence: number, unconditionalRegard: number): { conditions: { condition: string; level: number; description: string }[]; therapeuticClimate: number; expectedGrowth: string[] } {
    const conditions = [
      { condition: 'unconditional-positive-regard', level: Number(unconditionalRegard.toFixed(2)), description: 'acceptance-without-judgment' },
      { condition: 'empathy', level: 0.8, description: 'understanding-from-clients-frame' },
      { condition: 'congruence', level: Number(congruence.toFixed(2)), description: 'genuineness-and-transparency' },
    ];
    const therapeuticClimate = (unconditionalRegard + congruence + selfActualization) / 3;
    const expectedGrowth = ['self-awareness', 'self-acceptance', 'personal-growth', 'autonomy'];
    this._history.push({ op: 'humanisticConditions', therapeuticClimate });
    return { conditions, therapeuticClimate: Number(therapeuticClimate.toFixed(2)), expectedGrowth };
  }

  familyTherapy(familyStructure: string[], communicationPatterns: string[], conflicts: string[]): Therapy {
    const therapy: Therapy = {
      type: 'family',
      approach: 'family-systems',
      techniques: ['genograms', 'communication-exercises', 'boundary-setting', 'reframing', 'structural-interventions'],
      duration: 16,
      evidenceBase: 'moderate',
    };
    this._therapies.push(therapy);
    this._history.push({ op: 'familyTherapy', familySize: familyStructure.length, conflictCount: conflicts.length });
    return therapy;
  }

  familySystemsAssessment(familyStructure: string[], communicationPatterns: string[], boundaries: string[]): { structure: string[]; communication: string[]; boundaries: string[]; subsystemDynamics: string[]; systemicIssues: string[]; interventionPoints: string[] } {
    const subsystemDynamics = ['parent-subsystem', 'sibling-subsystem', 'spousal-subsystem'];
    const systemicIssues = communicationPatterns.includes('triangulation') ? ['triangulation', 'enmeshment'] : ['boundary-diffusion'];
    const interventionPoints = ['improve-communication', 'clarify-boundaries', 'reduce-triangulation'];
    this._history.push({ op: 'familySystemsAssessment', structureSize: familyStructure.length });
    return { structure: familyStructure, communication: communicationPatterns, boundaries, subsystemDynamics, systemicIssues, interventionPoints };
  }

  groupTherapy(groupType: 'support' | 'cbt' | 'psychodynamic' | 'interpersonal', members: number, goals: string[]): Therapy {
    const approaches: Record<string, string> = {
      support: 'supportive-group',
      cbt: 'cbt-group',
      psychodynamic: 'psychodynamic-group',
      interpersonal: 'interpersonal-group',
    };
    const therapy: Therapy = {
      type: 'group',
      approach: approaches[groupType],
      techniques: ['group-processing', 'interpersonal-feedback', 'skill-practice', 'social-learning'],
      duration: 12,
      evidenceBase: groupType === 'cbt' ? 'strong' : 'moderate',
    };
    this._therapies.push(therapy);
    this._history.push({ op: 'groupTherapy', groupType, memberCount: members, goalCount: goals.length });
    return therapy;
  }

  pharmacotherapy(disorder: string, medication: string): Psychopharmacology | null {
    const med = this._medications.get(medication.toLowerCase());
    if (!med) return null;
    this._history.push({ op: 'pharmacotherapy', disorder, medication });
    return { ...med, indication: disorder };
  }

  medicationSelection(disorder: string, patientFactors: string[] = []): { firstLine: string[]; secondLine: string[]; considerations: string[]; monitoringPlan: string[] } {
    const firstLine: Record<string, string[]> = {
      'major-depressive-disorder': ['ssri', 'snri'],
      'generalized-anxiety-disorder': ['ssri', 'snri'],
      'schizophrenia': ['atypical-antipsychotic'],
      'bipolar-I-disorder': ['mood-stabilizer', 'atypical-antipsychotic'],
      'panic-disorder': ['ssri', 'snri', 'benzodiazepine'],
      'obsessive-compulsive-disorder': ['ssri', 'clomipramine'],
    };
    const secondLine: Record<string, string[]> = {
      'major-depressive-disorder': ['bupropion', 'tca', 'maoi'],
      'generalized-anxiety-disorder': ['buspirone', 'benzodiazepine'],
      'schizophrenia': ['typical-antipsychotic'],
      'bipolar-I-disorder': ['antidepressant', 'lamotrigine'],
      'panic-disorder': ['tca', 'maoi'],
      'obsessive-compulsive-disorder': ['snri'],
    };
    const considerations = patientFactors.includes('pregnancy') ? ['teratogenic-risk', 'breastfeeding-safety'] : 
                          patientFactors.includes('cardiac') ? ['qtc-prolongation', 'blood-pressure'] : [];
    const monitoringPlan = ['symptom-assessment', 'side-effect-monitoring', 'therapeutic-drug-levels'];
    this._history.push({ op: 'medicationSelection', disorder, considerationCount: considerations.length });
    return {
      firstLine: firstLine[disorder] || ['ssri'],
      secondLine: secondLine[disorder] || ['tca'],
      considerations,
      monitoringPlan,
    };
  }

  efficacy(treatment: string, disorder: string, evidence: 'strong' | 'moderate' | 'weak'): EfficacyResult {
    const seed = this._hash(`${treatment}|${disorder}`);
    const effectSize = 0.4 + (seed % 100) / 200;
    this._history.push({ op: 'efficacy', treatment, disorder, evidence });
    return {
      treatment,
      disorder,
      effectSize: Number(effectSize.toFixed(2)),
      evidence: effectSize > 0.8 ? 'strong' : effectSize > 0.5 ? 'moderate' : 'weak',
      dropout: 0.2,
    };
  }

  treatmentEfficacyReview(disorder: string, treatments: string[]): { disorder: string; treatments: { treatment: string; effectSize: number; evidence: string; dropout: number; recommended: boolean }[]; bestPractice: string } {
    const results = treatments.map(treatment => {
      const seed = this._hash(`${treatment}|${disorder}`);
      const effectSize = 0.4 + (seed % 100) / 200;
      const evidence = effectSize > 0.8 ? 'strong' : effectSize > 0.5 ? 'moderate' : 'weak';
      return { treatment, effectSize: Number(effectSize.toFixed(2)), evidence, dropout: 0.2, recommended: effectSize > 0.5 };
    });
    results.sort((a, b) => b.effectSize - a.effectSize);
    const bestPractice = results[0]?.treatment || 'no-treatment';
    this._history.push({ op: 'treatmentEfficacyReview', disorder, treatmentCount: treatments.length });
    return { disorder, treatments: results, bestPractice };
  }

  administerAssessment(scale: string, score: number, cutoff: number): Assessment {
    const interpretation: Assessment['interpretation'] = score > cutoff * 1.5 ? 'severe'
      : score > cutoff * 1.25 ? 'moderately-severe'
        : score > cutoff ? 'moderate'
          : score > cutoff * 0.5 ? 'mild' : 'minimal';
    const a: Assessment = { scale, score, interpretation, cutoff };
    this._assessments.push(a);
    this._history.push({ op: 'administerAssessment', scale, score, interpretation });
    return a;
  }

  assessmentBattery(domain: string, assessments: string[]): { domain: string; assessments: PsychologicalAssessment[]; rationale: string[]; expectedOutcome: string } {
    const battery = assessments.map(name => this._assessmentTools.get(name) || ({ name, type: 'self-report', domains: [], reliability: 0.8, validity: 0.7, norms: 'general' }));
    const rationale = domain === 'depression' ? ['screen-depression-severity', 'monitor-treatment-response', 'differential-diagnosis']
      : domain === 'anxiety' ? ['screen-anxiety-disorders', 'assess-specific-phobias', 'monitor-symptom-change']
      : ['comprehensive-evaluation', 'baseline-assessment', 'treatment-planning'];
    const expectedOutcome = 'comprehensive-clinical-profile';
    this._history.push({ op: 'assessmentBattery', domain, assessmentCount: assessments.length });
    return { domain, assessments: battery, rationale, expectedOutcome };
  }

  crisisAssessment(riskFactors: string[], protectiveFactors: string[]): CrisisAssessment {
    const riskLevel: CrisisAssessment['riskLevel'] = riskFactors.length >= 3 ? 'high' : 
                                                  riskFactors.length >= 2 ? 'moderate' : 
                                                  riskFactors.length >= 1 ? 'low' : 'low';
    const recommendations = riskLevel === 'high' ? ['immediate-evaluation', 'hospitalization-consideration', 'safety-plan']
      : riskLevel === 'moderate' ? ['close-monitoring', 'safety-plan', 'increased-therapy-frequency']
      : ['regular-check-ins', 'support-system-engagement'];
    const immediateActions = riskLevel === 'high' ? ['ensure-safety', 'contact-crisis-team', 'remove-means'] : [];
    this._history.push({ op: 'crisisAssessment', riskLevel, riskFactorCount: riskFactors.length });
    return { riskLevel, factors: riskFactors, protectiveFactors, recommendations, immediateActions };
  }

  caseFormulation(diagnosis: string, etiology: string[], maintainingFactors: string[], treatmentTargets: string[]): CaseFormulation {
    const prognosis = treatmentTargets.length > 3 ? 'good-with-treatment' : 'guarded';
    this._history.push({ op: 'caseFormulation', diagnosis, targetCount: treatmentTargets.length });
    return { diagnosis, etiology, maintainingFactors, treatmentTargets, prognosis };
  }

  treatmentPlan(disorder: string, goals: string[], interventions: string[], duration: number = 12): TreatmentPlan {
    const expectedOutcome = duration > 12 ? 'symptom-remission' : 'symptom-reduction';
    const progressMonitoring = ['weekly-symptom-assessment', 'monthly-clinical-review', 'treatment-adherence-check'];
    this._history.push({ op: 'treatmentPlan', disorder, goalCount: goals.length, duration });
    return { disorder, goals, interventions, duration, expectedOutcome, progressMonitoring };
  }

  progressNote(date: string, symptoms: { symptom: string; severity: number }[], functioning: number, treatmentResponse: string): ProgressNote {
    const nextSteps = treatmentResponse === 'good' ? ['continue-current-plan', 'increase-independence']
      : treatmentResponse === 'partial' ? ['adjust-interventions', 'explore-barriers']
      : ['reassess-diagnosis', 'consider-alternative-treatments'];
    this._history.push({ op: 'progressNote', date, symptomCount: symptoms.length, functioning });
    return { date, symptoms, functioning: Number(functioning.toFixed(2)), treatmentResponse, nextSteps };
  }

  treatmentProgress(weeks: number, baselineSeverity: number, currentSeverity: number): { weeks: number; baseline: number; current: number; change: number; percentageChange: number; responseClassification: 'remission' | 'response' | 'partial-response' | 'no-response'; recommendations: string[] } {
    const change = baselineSeverity - currentSeverity;
    const percentageChange = (change / baselineSeverity) * 100;
    const responseClassification: 'remission' | 'response' | 'partial-response' | 'no-response' = 
      currentSeverity < 0.2 ? 'remission' : 
      percentageChange > 50 ? 'response' : 
      percentageChange > 25 ? 'partial-response' : 'no-response';
    const recommendations = responseClassification === 'remission' ? ['maintenance-treatment', 'relapse-prevention']
      : responseClassification === 'response' ? ['continue-treatment', 'consolidate-gains']
      : responseClassification === 'partial-response' ? ['adjust-treatment', 'augmentation']
      : ['review-diagnosis', 'change-treatment'];
    this._history.push({ op: 'treatmentProgress', weeks, percentageChange, responseClassification });
    return {
      weeks,
      baseline: Number(baselineSeverity.toFixed(2)),
      current: Number(currentSeverity.toFixed(2)),
      change: Number(change.toFixed(2)),
      percentageChange: Number(percentageChange.toFixed(1)),
      responseClassification,
      recommendations,
    };
  }

  private _hash(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  private _seedDisorders(): void {
    const seeds: Disorder[] = [
      { name: 'major-depressive-disorder', category: 'mood', symptoms: ['depressed-mood', 'anhedonia', 'fatigue', 'worthlessness', 'sleep-disturbance', 'appetite-change'], criteria: ['5-symptoms-2-weeks'], treatment: ['ssri', 'cbt', 'psychotherapy'], dsmCode: '296', prevalence: 0.07 },
      { name: 'generalized-anxiety-disorder', category: 'anxiety', symptoms: ['excessive-worry', 'restlessness', 'fatigue', 'irritability', 'muscle-tension', 'sleep-disturbance'], criteria: ['3-symptoms-6-months'], treatment: ['ssri', 'cbt', 'benzodiazepine'], dsmCode: '300.02', prevalence: 0.03 },
      { name: 'social-anxiety-disorder', category: 'anxiety', symptoms: ['fear-social-situations', 'self-consciousness', 'avoidance', 'blushing', 'trembling'], criteria: ['persistent-fear-social'], treatment: ['ssri', 'cbt', 'exposure-therapy'], dsmCode: '300.23', prevalence: 0.07 },
      { name: 'panic-disorder', category: 'anxiety', symptoms: ['panic-attacks', 'fear-future-attacks', 'avoidance', 'palpitations', 'sweating'], criteria: ['recurrent-panic-attacks'], treatment: ['ssri', 'snri', 'cbt'], dsmCode: '300.01', prevalence: 0.02 },
      { name: 'schizophrenia', category: 'psychotic', symptoms: ['delusions', 'hallucinations', 'disorganized-speech', 'negative-symptoms', 'catatonia'], criteria: ['2-symptoms-6-months'], treatment: ['antipsychotic', 'family-therapy'], dsmCode: '295', prevalence: 0.01 },
      { name: 'bipolar-I-disorder', category: 'mood', symptoms: ['mania', 'depression', 'elevated-mood', 'decreased-sleep', 'grandiosity'], criteria: ['manic-episode'], treatment: ['mood-stabilizer', 'antipsychotic'], dsmCode: '296', prevalence: 0.01 },
      { name: 'bipolar-II-disorder', category: 'mood', symptoms: ['hypomania', 'depression', 'increased-energy', 'creativity'], criteria: ['hypomanic-episode-major-depression'], treatment: ['mood-stabilizer', 'antidepressant'], dsmCode: '296', prevalence: 0.01 },
      { name: 'borderline-personality-disorder', category: 'personality', symptoms: ['unstable-mood', 'fear-abandonment', 'impulsivity', 'self-harm', 'identity-disturbance'], criteria: ['5-criteria'], treatment: ['dbt', 'psychotherapy'], dsmCode: '301.83', prevalence: 0.015 },
      { name: 'narcissistic-personality-disorder', category: 'personality', symptoms: ['grandiose', 'entitled', 'lack-empathy', 'need-admiration', 'exploitative'], criteria: ['5-criteria'], treatment: ['psychodynamic-therapy'], dsmCode: '301.81', prevalence: 0.005 },
      { name: 'antisocial-personality-disorder', category: 'personality', symptoms: ['aggressive', 'deceitful', 'impulsive', 'irresponsible', 'lack-remorse'], criteria: ['3-criteria'], treatment: ['cbt', 'skills-training'], dsmCode: '301.7', prevalence: 0.03 },
      { name: 'attention-deficit-hyperactivity-disorder', category: 'neurodevelopmental', symptoms: ['inattention', 'hyperactivity', 'impulsivity', 'distractibility'], criteria: ['6-symptoms'], treatment: ['stimulant', 'behavioral-therapy'], dsmCode: '314', prevalence: 0.05 },
      { name: 'autism-spectrum-disorder', category: 'neurodevelopmental', symptoms: ['social-communication-deficits', 'restricted-repetitive-behaviors', 'sensory-processing'], criteria: ['social-interaction', 'communication'], treatment: ['applied-behavior-analysis', 'speech-therapy'], dsmCode: '299', prevalence: 0.01 },
      { name: 'posttraumatic-stress-disorder', category: 'trauma', symptoms: ['intrusive-memories', 'avoidance', 'negative-mood', 'hyperarousal', 'flashbacks'], criteria: ['exposure-trauma', 'symptoms-1-month'], treatment: ['cbt', 'exposure-therapy', 'emdr'], dsmCode: '309.81', prevalence: 0.08 },
      { name: 'obsessive-compulsive-disorder', category: 'anxiety', symptoms: ['obsessions', 'compulsions', 'distress', 'time-consuming'], criteria: ['obsessions-and-compulsions'], treatment: ['ssri', 'cbt', 'exposure-response-prevention'], dsmCode: '300.3', prevalence: 0.02 },
      { name: 'anorexia-nervosa', category: 'eating', symptoms: ['restricted-eating', 'fear-gain-weight', 'distorted-body-image', 'amenorrhea'], criteria: ['restriction', 'fear-weight'], treatment: ['cbt', 'nutritional-counseling'], dsmCode: '307.1', prevalence: 0.005 },
      { name: 'bulimia-nervosa', category: 'eating', symptoms: ['binge-eating', 'compensatory-behaviors', 'self-evaluation-weight', 'recurrent-episodes'], criteria: ['binge-and-purge'], treatment: ['cbt', 'interpersonal-therapy'], dsmCode: '307.51', prevalence: 0.01 },
      { name: 'alcohol-use-disorder', category: 'substance', symptoms: ['craving', 'tolerance', 'withdrawal', 'impaired-control', 'social-impairment'], criteria: ['2-criteria'], treatment: ['motivational-interviewing', 'aa', 'medication'], dsmCode: '303', prevalence: 0.08 },
      { name: 'opioid-use-disorder', category: 'substance', symptoms: ['craving', 'tolerance', 'withdrawal', 'impaired-control'], criteria: ['2-criteria'], treatment: ['methadone', 'buprenorphine', 'cbt'], dsmCode: '304', prevalence: 0.02 },
    ];
    for (const d of seeds) this._disorders.set(d.name, d);
  }

  private _seedMedications(): void {
    const meds: Psychopharmacology[] = [
      { medication: 'sertraline', class: 'ssri', indication: '', mechanismOfAction: 'selective-serotonin-reuptake-inhibitor', sideEffects: ['nausea', 'headache', 'insomnia', 'sexual-dysfunction'], monitoring: ['symptom-check', 'side-effects'], efficacy: 0.6 },
      { medication: 'fluoxetine', class: 'ssri', indication: '', mechanismOfAction: 'selective-serotonin-reuptake-inhibitor', sideEffects: ['nausea', 'anxiety', 'weight-gain', 'sexual-dysfunction'], monitoring: ['symptom-check', 'side-effects'], efficacy: 0.55 },
      { medication: 'venlafaxine', class: 'snri', indication: '', mechanismOfAction: 'serotonin-norepinephrine-reuptake-inhibitor', sideEffects: ['nausea', 'hypertension', 'sweating'], monitoring: ['blood-pressure', 'symptom-check'], efficacy: 0.6 },
      { medication: 'duloxetine', class: 'snri', indication: '', mechanismOfAction: 'serotonin-norepinephrine-reuptake-inhibitor', sideEffects: ['nausea', 'dry-mouth', 'constipation'], monitoring: ['liver-function', 'symptom-check'], efficacy: 0.58 },
      { medication: 'quetiapine', class: 'atypical-antipsychotic', indication: '', mechanismOfAction: 'dopamine-serotonin-antagonist', sideEffects: ['sedation', 'weight-gain', 'metabolic-syndrome'], monitoring: ['weight', 'blood-glucose', 'lipids'], efficacy: 0.65 },
      { medication: 'risperidone', class: 'atypical-antipsychotic', indication: '', mechanismOfAction: 'dopamine-serotonin-antagonist', sideEffects: ['extrapyramidal-symptoms', 'prolactin-elevation'], monitoring: ['ekg', 'prolactin'], efficacy: 0.62 },
      { medication: 'lithium', class: 'mood-stabilizer', indication: '', mechanismOfAction: 'ion-channel-modulator', sideEffects: ['polyuria', 'tremor', 'weight-gain'], monitoring: ['blood-levels', 'renal-function', 'thyroid'], efficacy: 0.7 },
      { medication: 'valproate', class: 'mood-stabilizer', indication: '', mechanismOfAction: 'gaba-modulator', sideEffects: ['weight-gain', 'hair-loss', 'hepatotoxicity'], monitoring: ['blood-levels', 'liver-function'], efficacy: 0.6 },
      { medication: 'clonazepam', class: 'benzodiazepine', indication: '', mechanismOfAction: 'gaba-agonist', sideEffects: ['sedation', 'dependency', 'cognitive-impairment'], monitoring: ['dependency-signs', 'cognition'], efficacy: 0.5 },
      { medication: 'bupropion', class: 'atypical-antidepressant', indication: '', mechanismOfAction: 'dopamine-norepinephrine-reuptake-inhibitor', sideEffects: ['insomnia', 'agitation', 'seizure-risk'], monitoring: ['seizure-risk', 'symptom-check'], efficacy: 0.55 },
    ];
    for (const m of meds) this._medications.set(m.medication.toLowerCase(), m);
  }

  private _seedAssessmentTools(): void {
    const tools: PsychologicalAssessment[] = [
      { name: 'BDI-II', type: 'self-report', domains: ['depression'], reliability: 0.9, validity: 0.85, norms: 'clinical-population' },
      { name: 'BAI', type: 'self-report', domains: ['anxiety'], reliability: 0.85, validity: 0.8, norms: 'clinical-population' },
      { name: 'MADRS', type: 'interview', domains: ['depression'], reliability: 0.88, validity: 0.82, norms: 'clinical-population' },
      { name: 'SCID', type: 'interview', domains: ['diagnosis'], reliability: 0.85, validity: 0.9, norms: 'clinical-population' },
      { name: 'WAIS-IV', type: 'objective', domains: ['intelligence'], reliability: 0.95, validity: 0.9, norms: 'general-population' },
      { name: 'Rorschach', type: 'projective', domains: ['personality', 'emotional-functioning'], reliability: 0.7, validity: 0.6, norms: 'clinical-population' },
      { name: 'TAT', type: 'projective', domains: ['personality', 'motivation'], reliability: 0.65, validity: 0.55, norms: 'clinical-population' },
      { name: 'MMPI-2', type: 'objective', domains: ['personality', 'psychopathology'], reliability: 0.8, validity: 0.75, norms: 'general-population' },
      { name: 'CBCL', type: 'self-report', domains: ['child-behavior'], reliability: 0.85, validity: 0.8, norms: 'child-population' },
      { name: 'GAF', type: 'interview', domains: ['global-functioning'], reliability: 0.7, validity: 0.65, norms: 'clinical-population' },
    ];
    for (const t of tools) this._assessmentTools.set(t.name, t);
  }

  /** Compute a clinical severity score. */
  clinicalSeverity(symptoms: { name: string; severity: number; frequency: number }[]): number {
    if (symptoms.length === 0) return 0;
    const weighted = symptoms.reduce((s, sym) => s + sym.severity * sym.frequency, 0);
    return Number(Math.min(100, weighted / symptoms.length).toFixed(2));
  }

  /** Determine the level of care needed based on severity. */
  levelOfCare(severityScore: number, suicideRisk: number, functioningImpairment: number): 'outpatient' | 'intensive-outpatient' | 'partial-hospitalization' | 'inpatient' | 'emergency' {
    if (suicideRisk > 0.7 || severityScore > 90) return 'emergency';
    if (severityScore > 70 || functioningImpairment > 0.7) return 'inpatient';
    if (severityScore > 50 || functioningImpairment > 0.5) return 'partial-hospitalization';
    if (severityScore > 30) return 'intensive-outpatient';
    return 'outpatient';
  }

  /** Compute suicide risk assessment. */
  suicideRiskAssessment(ideation: boolean, plan: boolean, means: boolean, intent: boolean, history: boolean, substances: boolean): { risk: number; level: 'low' | 'moderate' | 'high' | 'very-high' } {
    let risk = 0;
    if (ideation) risk += 0.15;
    if (plan) risk += 0.25;
    if (means) risk += 0.2;
    if (intent) risk += 0.2;
    if (history) risk += 0.15;
    if (substances) risk += 0.1;
    risk = Math.min(1, risk);
    let level: 'low' | 'moderate' | 'high' | 'very-high';
    if (risk < 0.25) level = 'low';
    else if (risk < 0.5) level = 'moderate';
    else if (risk < 0.75) level = 'high';
    else level = 'very-high';
    return { risk: Number(risk.toFixed(2)), level };
  }

  /** Compute a Global Assessment of Functioning (GAF) score. */
  gafScore(symptomSeverity: number, functioningLevel: number): number {
    const gaf = 100 - (symptomSeverity * 50 + (1 - functioningLevel) * 50);
    return Math.max(1, Math.min(100, Math.round(gaf)));
  }

  /** Compute therapeutic alliance strength. */
  therapeuticAlliance(agreement: number, empathy: number, collaboration: number): number {
    return Number(((agreement + empathy + collaboration) / 3).toFixed(2));
  }

  /** Compute treatment adherence. */
  treatmentAdherence(scheduledSessions: number, attendedSessions: number, medicationAdherence: number): number {
    if (scheduledSessions === 0) return 0;
    const sessionAdherence = attendedSessions / scheduledSessions;
    return Number(((sessionAdherence + medicationAdherence) / 2).toFixed(2));
  }

  /** Predict treatment response. */
  predictTreatmentResponse(diagnosis: string, severity: number, durationMonths: number, priorEpisodes: number, supportSystem: number): { response: number; remissionProbability: number } {
    let response = 0.5;
    response -= severity * 0.2;
    response -= Math.min(0.2, durationMonths / 60);
    response -= Math.min(0.15, priorEpisodes * 0.05);
    response += supportSystem * 0.2;
    if (diagnosis === 'depression') response += 0.1;
    response = Math.max(0.1, Math.min(0.95, response));
    return {
      response: Number(response.toFixed(2)),
      remissionProbability: Number(Math.max(0, response - 0.1).toFixed(2)),
    };
  }

  /** Compute relapse risk. */
  relapseRisk(severityHistory: number[], treatmentAdherence: number, stressLevel: number, supportSystem: number): number {
    if (severityHistory.length === 0) return 0;
    const avgSeverity = severityHistory.reduce((s, v) => s + v, 0) / severityHistory.length;
    let risk = avgSeverity * 0.3;
    risk += (1 - treatmentAdherence) * 0.3;
    risk += stressLevel * 0.25;
    risk += (1 - supportSystem) * 0.15;
    return Number(Math.min(1, risk).toFixed(2));
  }

  /** Recommend a treatment plan. */
  recommendTreatmentPlan(diagnosis: string, severity: number, patientPreferences: string[]): { therapy: string; medication: string; frequency: string } {
    let therapy = 'cognitive-behavioral-therapy';
    let medication = 'none';
    let frequency = 'weekly';
    if (diagnosis === 'depression' && severity > 50) {
      therapy = 'cognitive-behavioral-therapy';
      medication = 'ssri';
      frequency = 'twice-weekly';
    } else if (diagnosis === 'anxiety') {
      therapy = 'exposure-therapy';
      medication = severity > 50 ? 'ssri' : 'none';
    } else if (diagnosis === 'bipolar') {
      therapy = 'interpersonal-social-rhythm-therapy';
      medication = 'mood-stabilizer';
      frequency = 'twice-weekly';
    } else if (diagnosis === 'schizophrenia') {
      therapy = 'cognitive-behavioral-therapy-for-psychosis';
      medication = 'antipsychotic';
      frequency = 'weekly';
    } else if (diagnosis === 'ptsd') {
      therapy = 'trauma-focused-cbt';
      medication = 'ssri';
    }
    if (patientPreferences.includes('mindfulness')) therapy = 'mindfulness-based-cognitive-therapy';
    if (patientPreferences.includes('group')) frequency = 'group-weekly';
    return { therapy, medication, frequency };
  }

  /** Compute comorbidity burden. */
  comorbidityBurden(diagnoses: string[]): { count: number; severityMultiplier: number; treatmentComplexity: number } {
    const count = diagnoses.length;
    const severityMultiplier = 1 + (count - 1) * 0.2;
    const treatmentComplexity = Math.min(1, count * 0.25);
    return { count, severityMultiplier: Number(severityMultiplier.toFixed(2)), treatmentComplexity };
  }

  /** Compute medication efficacy. */
  medicationEfficacy(medication: string, diagnosis: string, dose: number, weeks: number): number {
    const efficacyMap: Record<string, Record<string, number>> = {
      'ssri': { 'depression': 0.6, 'anxiety': 0.55, 'ptsd': 0.45, 'ocd': 0.5 },
      'antipsychotic': { 'schizophrenia': 0.65, 'bipolar': 0.55 },
      'mood-stabilizer': { 'bipolar': 0.6 },
      'stimulant': { 'adhd': 0.7 },
    };
    const baseEfficacy = efficacyMap[medication]?.[diagnosis] ?? 0.3;
    const doseFactor = Math.min(1, dose / 50);
    const timeFactor = Math.min(1, weeks / 8);
    return Number((baseEfficacy * doseFactor * timeFactor).toFixed(2));
  }

  /** Compute side-effect burden. */
  sideEffectBurden(medication: string, dose: number, durationWeeks: number): number {
    const sideEffectBase: Record<string, number> = {
      'ssri': 0.3,
      'antipsychotic': 0.5,
      'mood-stabilizer': 0.4,
      'stimulant': 0.35,
      'benzodiazepine': 0.45,
    };
    const base = sideEffectBase[medication] ?? 0.2;
    const doseFactor = Math.min(1.5, dose / 40);
    const timeFactor = Math.min(1.3, durationWeeks / 12);
    return Number(Math.min(1, base * doseFactor * timeFactor).toFixed(2));
  }

  /** Compute the pharmacokinetic profile. */
  pharmacokineticProfile(medication: string): { halfLife: number; onsetDays: number; steadyStateDays: number } {
    const profiles: Record<string, { halfLife: number; onsetDays: number; steadyStateDays: number }> = {
      'fluoxetine': { halfLife: 7, onsetDays: 14, steadyStateDays: 28 },
      'sertraline': { halfLife: 1, onsetDays: 14, steadyStateDays: 7 },
      'escitalopram': { halfLife: 1.5, onsetDays: 14, steadyStateDays: 7 },
      'risperidone': { halfLife: 0.75, onsetDays: 7, steadyStateDays: 5 },
      'olanzapine': { halfLife: 1.5, onsetDays: 7, steadyStateDays: 7 },
      'lithium': { halfLife: 1, onsetDays: 7, steadyStateDays: 5 },
    };
    return profiles[medication] ?? { halfLife: 1, onsetDays: 14, steadyStateDays: 7 };
  }

  /** Compute diagnostic confidence. */
  diagnosticConfidence(symptomsPresent: number, symptomsRequired: number, durationMet: boolean, exclusionMet: boolean): number {
    const symptomRatio = symptomsPresent / Math.max(1, symptomsRequired);
    let confidence = symptomRatio * 0.5;
    if (durationMet) confidence += 0.25;
    if (exclusionMet) confidence += 0.25;
    return Number(Math.min(1, confidence).toFixed(2));
  }

  /** Compute differential diagnosis scores. */
  differentialDiagnosis(presentingSymptoms: string[], candidateDisorders: { name: string; symptoms: string[] }[]): { disorder: string; matchScore: number }[] {
    return candidateDisorders.map(d => {
      const matches = d.symptoms.filter(s => presentingSymptoms.includes(s)).length;
      const matchScore = matches / Math.max(1, d.symptoms.length);
      return { disorder: d.name, matchScore: Number(matchScore.toFixed(2)) };
    }).sort((a, b) => b.matchScore - a.matchScore);
  }

  /** Compute treatment duration estimate. */
  treatmentDurationEstimate(diagnosis: string, severity: number, chronicity: number): number {
    const baseWeeks: Record<string, number> = {
      'depression': 16,
      'anxiety': 12,
      'ptsd': 24,
      'ocd': 20,
      'bipolar': 52,
      'schizophrenia': 104,
    };
    const base = baseWeeks[diagnosis] ?? 12;
    const severityFactor = 1 + severity / 100;
    const chronicityFactor = 1 + chronicity;
    return Math.round(base * severityFactor * chronicityFactor);
  }

  /** Compute cost-effectiveness of treatment. */
  treatmentCostEffectiveness(efficacy: number, costPerSession: number, sessionsNeeded: number, qualityOfLifeGain: number): number {
    const totalCost = costPerSession * sessionsNeeded;
    if (totalCost === 0) return 0;
    return Number(((efficacy * qualityOfLifeGain) / (totalCost / 1000)).toFixed(4));
  }

  /** Generate a clinical case formulation. */
  caseFormulation(presenting: string[], predisposing: string[], precipitating: string[], perpetuating: string[], protective: string[]): Record<string, unknown> {
    return {
      presentingProblem: presenting.join('; '),
      predisposingFactors: predisposing.join('; '),
      precipitatingFactors: precipitating.join('; '),
      perpetuatingFactors: perpetuating.join('; '),
      protectiveFactors: protective.join('; '),
      formulation: `5-P formulation integrating ${predisposing.length} predisposing, ${precipitating.length} precipitating, and ${perpetuating.length} perpetuating factors.`,
    };
  }

  /** Compute trauma exposure score. */
  traumaExposureScore(exposures: { type: string; severity: number; ageAtExposure: number }[]): number {
    if (exposures.length === 0) return 0;
    const totalSeverity = exposures.reduce((s, e) => s + e.severity * (1 + (18 - Math.min(18, e.ageAtExposure)) / 18), 0);
    return Number(Math.min(100, totalSeverity).toFixed(2));
  }

  /** Compute resilience score. */
  resilienceScore(protectiveFactors: { factor: string; strength: number }[]): number {
    if (protectiveFactors.length === 0) return 0;
    return Number(Math.min(100, protectiveFactors.reduce((s, f) => s + f.strength, 0) / protectiveFactors.length * 100).toFixed(2));
  }

  /** Compute the dose-response relationship. */
  doseResponseRelationship(sessionsAttended: number, outcomeMeasure: number[]): { optimalSessions: number; diminishingReturns: number } {
    if (outcomeMeasure.length < 2) return { optimalSessions: 0, diminishingReturns: 0 };
    let bestImprovement = 0;
    let bestSession = 0;
    for (let i = 1; i < outcomeMeasure.length; i++) {
      const improvement = outcomeMeasure[i] - outcomeMeasure[i - 1];
      if (improvement > bestImprovement) {
        bestImprovement = improvement;
        bestSession = i;
      }
    }
    const diminishingReturns = bestSession < sessionsAttended ? Number(((sessionsAttended - bestSession) / sessionsAttended).toFixed(2)) : 0;
    return { optimalSessions: bestSession, diminishingReturns };
  }

  /** Compute the working alliance inventory score. */
  workingAllianceScore(goalAgreement: number, taskAgreement: number, bondStrength: number): number {
    return Number(((goalAgreement + taskAgreement + bondStrength) / 3).toFixed(2));
  }

  /** Detect treatment resistance. */
  isTreatmentResistant(trialsAttempted: number, adequateDose: boolean, adequateDuration: boolean, responseRate: number): boolean {
    return trialsAttempted >= 2 && adequateDose && adequateDuration && responseRate < 0.3;
  }

  /** Compute the therapeutic breakthrough probability. */
  breakthroughProbability(sessionNumber: number, alliance: number, homework: number): number {
    const sessionFactor = Math.min(1, sessionNumber / 8);
    return Number(((sessionFactor + alliance + homework) / 3).toFixed(2));
  }

  /** Compute psychotropic polypharmacy risk. */
  polypharmacyRisk(medications: string[]): { risk: number; interactions: number } {
    const risk = Math.min(1, medications.length * 0.2);
    const interactions = medications.length > 1 ? (medications.length * (medications.length - 1)) / 2 : 0;
    return { risk: Number(risk.toFixed(2)), interactions };
  }

  /** Compute hospitalization necessity. */
  hospitalizationNecessity(dangerToSelf: number, dangerToOthers: number, graveDisability: number, inabilityToCare: number): { necessary: boolean; urgency: 'routine' | 'urgent' | 'emergency' } {
    const total = Math.max(dangerToSelf, dangerToOthers, graveDisability, inabilityToCare);
    if (dangerToSelf > 0.7 || dangerToOthers > 0.7) return { necessary: true, urgency: 'emergency' };
    if (total > 0.5) return { necessary: true, urgency: 'urgent' };
    if (total > 0.3) return { necessary: false, urgency: 'routine' };
    return { necessary: false, urgency: 'routine' };
  }

  /** Compute the recovery capital. */
  recoveryCapital(internal: number, external: number, social: number, cultural: number): number {
    return Number(((internal + external + social + cultural) / 4).toFixed(2));
  }

  /** Generate a treatment outcome report. */
  outcomeReport(baselineSeverity: number, currentSeverity: number, functioningBaseline: number, functioningCurrent: number): Record<string, unknown> {
    const symptomReduction = baselineSeverity > 0 ? ((baselineSeverity - currentSeverity) / baselineSeverity) : 0;
    const functioningImprovement = functioningCurrent - functioningBaseline;
    return {
      symptomReduction: Number(symptomReduction.toFixed(2)),
      functioningImprovement: Number(functioningImprovement.toFixed(2)),
      response: symptomReduction >= 0.5,
      remission: currentSeverity < 20,
      recovery: currentSeverity < 10 && functioningCurrent > 0.8,
    };
  }

  /** Compute the stage of change (Transtheoretical Model). */
  stageOfChange(behavior: string, intentionStrength: number, actionTaken: boolean, actionDuration: number): 'precontemplation' | 'contemplation' | 'preparation' | 'action' | 'maintenance' {
    if (actionTaken && actionDuration > 180) return 'maintenance';
    if (actionTaken && actionDuration > 30) return 'action';
    if (intentionStrength > 0.7) return 'preparation';
    if (intentionStrength > 0.3) return 'contemplation';
    return 'precontemplation';
  }

  /** Compute the chance of sustained recovery. */
  sustainedRecoveryProbability(abstinenceDuration: number, supportSystem: number, copingSkills: number, triggerExposure: number): number {
    const durationFactor = Math.min(1, abstinenceDuration / 365);
    const triggerFactor = 1 - triggerExposure;
    return Number(((durationFactor + supportSystem + copingSkills + triggerFactor) / 4).toFixed(2));
  }

  /** Compute the trauma-informed care adherence. */
  traumaInformedCareAdherence(practices: { practice: string; implemented: boolean }[]): number {
    if (practices.length === 0) return 0;
    const implemented = practices.filter(p => p.implemented).length;
    return Number((implemented / practices.length).toFixed(2));
  }

  /** Compute the cultural competence score. */
  culturalCompetenceScore(awareness: number, knowledge: number, skills: number, encounters: number): number {
    const encounterFactor = Math.min(1, encounters / 100);
    return Number(((awareness + knowledge + skills + encounterFactor) / 4).toFixed(2));
  }

  /** Generate a comprehensive clinical summary. */
  clinicalSummary(diagnosis: string, severity: number, gaf: number, riskLevel: string, treatmentPlan: string[]): Record<string, unknown> {
    return {
      diagnosis,
      severity,
      gaf,
      riskLevel,
      treatmentPlan,
      recommendedLevel: this.levelOfCare(severity, riskLevel === 'high' ? 0.6 : 0.2, 1 - gaf / 100),
      expectedDuration: this.treatmentDurationEstimate(diagnosis, severity, 0),
      prognosis: severity < 30 ? 'good' : severity < 60 ? 'fair' : 'guarded',
    };
  }

  /** Compute evidence-based practice adherence. */
  evidenceBasedAdherence(diagnosis: string, prescribedTherapy: string, prescribedMedication: string): number {
    const evidenceMap: Record<string, { therapy: string; medication: string }> = {
      'depression': { therapy: 'cognitive-behavioral-therapy', medication: 'ssri' },
      'anxiety': { therapy: 'exposure-therapy', medication: 'ssri' },
      'ptsd': { therapy: 'trauma-focused-cbt', medication: 'ssri' },
      'ocd': { therapy: 'exposure-response-prevention', medication: 'ssri' },
      'bipolar': { therapy: 'interpersonal-social-rhythm-therapy', medication: 'mood-stabilizer' },
      'schizophrenia': { therapy: 'cognitive-behavioral-therapy-for-psychosis', medication: 'antipsychotic' },
    };
    const evidence = evidenceMap[diagnosis];
    if (!evidence) return 0;
    let score = 0;
    if (prescribedTherapy === evidence.therapy) score += 0.5;
    if (prescribedMedication === evidence.medication) score += 0.5;
    return score;
  }

  /** Compute the therapeutic dose (sessions). */
  therapeuticDose(diagnosis: string, severity: number): number {
    const baseDose: Record<string, number> = {
      'depression': 16,
      'anxiety': 12,
      'ptsd': 24,
      'ocd': 20,
    };
    const base = baseDose[diagnosis] ?? 12;
    return Math.round(base * (1 + severity / 100));
  }

  /** Compute the no-show probability. */
  noShowProbability(priorNoShows: number, distance: number, transportationAccess: number, reminderSystem: boolean): number {
    let probability = 0.1;
    probability += priorNoShows * 0.05;
    probability += distance / 100;
    probability -= transportationAccess * 0.1;
    if (reminderSystem) probability -= 0.05;
    return Number(Math.max(0, Math.min(1, probability)).toFixed(2));
  }

  /** Compute the engagement score. */
  engagementScore(sessionAttendance: number, homeworkCompletion: number, therapeuticAlliance: number, activeParticipation: number): number {
    return Number(((sessionAttendance + homeworkCompletion + therapeuticAlliance + activeParticipation) / 4).toFixed(2));
  }

  /** Compute the burnout risk for clinicians. */
  clinicianBurnoutRisk(caseload: number, hoursPerWeek: number, emotionalExhaustion: number, depersonalization: number): number {
    const workloadFactor = Math.min(1, (caseload / 50 + hoursPerWeek / 60) / 2);
    return Number(((workloadFactor + emotionalExhaustion + depersonalization) / 3).toFixed(2));
  }

  /** Compute the supervision effectiveness. */
  supervisionEffectiveness(frequency: number, quality: number, supervisorExperience: number): number {
    const frequencyScore = Math.min(1, frequency / 4);
    return Number(((frequencyScore + quality + supervisorExperience) / 3).toFixed(2));
  }

  /** Compute the continuing education impact. */
  continuingEducationImpact(hoursCompleted: number, relevanceScore: number, applicationScore: number): number {
    const hoursScore = Math.min(1, hoursCompleted / 40);
    return Number(((hoursScore + relevanceScore + applicationScore) / 3).toFixed(2));
  }

  /** Generate a treatment plan review. */
  treatmentPlanReview(plan: { goals: string[]; interventions: string[]; progress: number[] }): Record<string, unknown> {
    const avgProgress = plan.progress.reduce((s, p) => s + p, 0) / Math.max(1, plan.progress.length);
    const goalsMet = plan.progress.filter(p => p >= 0.8).length;
    return {
      totalGoals: plan.goals.length,
      goalsMet,
      averageProgress: Number(avgProgress.toFixed(2)),
      needsRevision: avgProgress < 0.3,
      recommendedActions: avgProgress < 0.3 ? ['reassess-goals', 'modify-interventions', 'increase-frequency'] : ['continue-plan'],
    };
  }

  /** Compute the family systems assessment. */
  familySystemsAssessment(communication: number, boundaries: number, roles: number, adaptability: number): { health: number; patterns: string[] } {
    const health = (communication + boundaries + roles + adaptability) / 4;
    const patterns: string[] = [];
    if (communication < 0.4) patterns.push('poor-communication');
    if (boundaries < 0.4) patterns.push('enmeshment-or-disengagement');
    if (roles < 0.4) patterns.push('rigid-roles');
    if (adaptability < 0.4) patterns.push('inflexible');
    return { health: Number(health.toFixed(2)), patterns };
  }

  /** Compute the group cohesion score. */
  groupCohesionScore(memberRatings: number[], attendanceRate: number): number {
    if (memberRatings.length === 0) return 0;
    const avgRating = memberRatings.reduce((s, r) => s + r, 0) / memberRatings.length;
    return Number(((avgRating + attendanceRate) / 2).toFixed(2));
  }

  /** Compute the confidentiality breach risk. */
  confidentialityBreachRisk(recordsSystem: string, accessControls: number, staffTraining: number, auditFrequency: number): number {
    let risk = 0.5;
    risk -= accessControls * 0.2;
    risk -= staffTraining * 0.15;
    risk -= Math.min(0.15, auditFrequency / 12);
    if (recordsSystem === 'paper') risk += 0.1;
    return Number(Math.max(0, Math.min(1, risk)).toFixed(2));
  }

  /** Compute the informed consent comprehension. */
  informedConsentComprehension(explained: boolean, questionsAnswered: boolean, patientRestated: boolean, capacityAssessed: boolean): number {
    let score = 0;
    if (explained) score += 0.25;
    if (questionsAnswered) score += 0.25;
    if (patientRestated) score += 0.25;
    if (capacityAssessed) score += 0.25;
    return score;
  }

  /** Compute the mandatory reporting requirements. */
  mandatoryReporting(childAbuse: boolean, elderAbuse: boolean, domesticViolence: boolean, suicidalIdeation: boolean, homicidalIdeation: boolean): { reportable: boolean; type: string[] } {
    const type: string[] = [];
    if (childAbuse) type.push('child-abuse');
    if (elderAbuse) type.push('elder-abuse');
    if (domesticViolence) type.push('domestic-violence');
    if (suicidalIdeation) type.push('danger-to-self');
    if (homicidalIdeation) type.push('danger-to-others');
    return { reportable: type.length > 0, type };
  }

  toPacket(): DataPacket<{
    disorders: number;
    assessments: Assessment[];
    therapies: Therapy[];
    medications: number;
    assessmentTools: number;
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
        medications: this._medications.size,
        assessmentTools: this._assessmentTools.size,
        history: [...this._history],
      },
      metadata,
    };
  }

  reset(): void {
    this._disorders.clear();
    this._assessments = [];
    this._therapies = [];
    this._medications.clear();
    this._assessmentTools.clear();
    this._history = [];
    this._counter = 0;
    this._seedDisorders();
    this._seedMedications();
    this._seedAssessmentTools();
  }
}
import { DataPacket, PacketMeta } from '../shared/types';

export interface BrainRegion {
  readonly name: string;
  readonly function: string;
  readonly connections: string[];
  readonly lobe?: string;
  readonly hemisphere?: 'left' | 'right' | 'bilateral';
  readonly cytoarchitecture?: string;
  readonly vascularSupply?: string;
}

export interface CognitiveDomain {
  readonly name: string;
  readonly tests: string[];
  readonly functions: string[];
  readonly networks: string[];
  readonly primaryRegions: string[];
}

export interface NeuropsychTest {
  readonly id: string;
  readonly name: string;
  readonly domain: string;
  readonly score: number;
  readonly interpretation: string;
  readonly percentile: number;
  readonly normativeData?: { mean: number; sd: number };
  readonly administrationTime?: number;
}

export interface LesionSymptom {
  readonly region: string;
  readonly lesion: string;
  readonly symptom: string;
  readonly mechanism: string;
  readonly laterality?: string;
}

export interface DisconnectionSyndrome {
  readonly name: string;
  readonly type: 'callosal' | 'association' | 'projection';
  readonly pathway: string;
  readonly symptoms: string[];
  readonly anatomicalLocation: string;
}

export interface MemorySystem {
  readonly type: 'episodic' | 'semantic' | 'procedural' | 'working';
  readonly circuit: string[];
  readonly hippocampalInvolvement: boolean;
  readonly keyRegions: string[];
  readonly neurotransmitters: string[];
}

export interface NeurotransmitterSystem {
  readonly name: string;
  readonly pathways: string[];
  readonly functions: string[];
  readonly disorders: string[];
  readonly drugs: string[];
}

export interface BrainNetwork {
  readonly name: string;
  readonly nodes: string[];
  readonly edges: string[];
  readonly function: string;
  readonly frequencyBand?: string;
}

export interface CognitiveRehabilitation {
  readonly domain: string;
  readonly techniques: string[];
  readonly goals: string[];
  readonly expectedOutcome: number;
  readonly duration: number;
}

export interface Neuroplasticity {
  readonly type: 'synaptic' | 'structural' | 'functional';
  readonly mechanisms: string[];
  readonly factors: { factor: string; influence: number }[];
  readonly timeframe: string;
}

export interface Aphasia {
  readonly type: 'broca' | 'wernicke' | 'conduction' | 'global' | 'anomic' | 'transcortical';
  readonly characteristics: string[];
  readonly lesionLocation: string;
  readonly speechFeatures: { fluency: number; comprehension: number; repetition: number; naming: number };
}

export interface ExecutiveFunctionProfile {
  readonly inhibition: number;
  readonly shifting: number;
  readonly updating: number;
  readonly planning: number;
  readonly workingMemory: number;
  readonly overall: number;
}

export interface VisualPerception {
  readonly acuity: number;
  readonly contrastSensitivity: number;
  readonly visualField: { superior: number; inferior: number; temporal: number; nasal: number };
  readonly objectRecognition: number;
  readonly faceRecognition: number;
  readonly spatialProcessing: number;
}

export interface AttentionProfile {
  readonly sustained: number;
  readonly selective: number;
  readonly divided: number;
  readonly alternating: number;
  readonly vigilance: number;
}

export class Neuropsychology {
  private _regions: Map<string, BrainRegion> = new Map();
  private _domains: CognitiveDomain[] = [];
  private _tests: NeuropsychTest[] = [];
  private _history: unknown[] = [];
  private _counter = 0;
  private _networks: Map<string, BrainNetwork> = new Map();
  private _neurotransmitters: Map<string, NeurotransmitterSystem> = new Map();

  constructor() {
    this._seedRegions();
    this._seedNetworks();
    this._seedNeurotransmitters();
  }

  get regionCount(): number { return this._regions.size; }
  get domainCount(): number { return this._domains.length; }
  get testCount(): number { return this._tests.length; }
  get networkCount(): number { return this._networks.size; }
  get neurotransmitterCount(): number { return this._neurotransmitters.size; }

  lobeFunction(lobe: 'frontal' | 'parietal' | 'temporal' | 'occipital' | 'limbic'): { lobe: string; functions: string[]; disorders: string[]; keyRegions: string[] } {
    const map: Record<typeof lobe, { functions: string[]; disorders: string[]; keyRegions: string[] }> = {
      frontal: { 
        functions: ['executive-control', 'motor-planning', 'speech-production', 'working-memory', 'decision-making', 'social-cognition'], 
        disorders: ['executive-dysfunction', 'broca-aphasia', 'personality-change', 'abulia', 'perseveration'],
        keyRegions: ['dlpfc', 'vlpfc', 'prefrontal', 'broca', 'premotor']
      },
      parietal: { 
        functions: ['spatial-perception', 'somatosensation', 'attention-orienting', 'calculation', 'body-awareness'], 
        disorders: ['hemispatial-neglect', 'apraxia', 'gerstmann-syndrome', 'astereognosis', 'acalculia'],
        keyRegions: ['supramarginal-gyrus', 'angular-gyrus', 'somatosensory-cortex']
      },
      temporal: { 
        functions: ['episodic-memory', 'auditory-perception', 'language-comprehension', 'face-recognition', 'emotion-processing'], 
        disorders: ['anterograde-amnesia', 'wernicke-aphasia', 'prosopagnosia', 'auditory-verbal-agnosia'],
        keyRegions: ['hippocampus', 'wernicke', 'amygdala', 'fusiform-gyrus']
      },
      occipital: { 
        functions: ['visual-processing', 'object-recognition', 'color-perception', 'visual-association'], 
        disorders: ['cortical-blindness', 'visual-agnosia', 'achromatopsia', 'visual-field-defects'],
        keyRegions: ['v1', 'v2', 'v3', 'v4', 'inferotemporal-cortex']
      },
      limbic: { 
        functions: ['emotion-regulation', 'motivation', 'memory-consolidation', 'reward-processing'], 
        disorders: ['kluver-bucy-syndrome', 'emotional-dysregulation', 'impulse-control', 'depression'],
        keyRegions: ['amygdala', 'hippocampus', 'hypothalamus', 'cingulate-cortex', 'basal-ganglia']
      },
    };
    const entry = map[lobe];
    return { lobe, functions: entry.functions, disorders: entry.disorders, keyRegions: entry.keyRegions };
  }

  brainLateralization(func: string, hemisphere: 'left' | 'right'): { function: string; dominant: string; specialization: string; evidence: string } {
    const lateralized: Record<string, 'left' | 'right'> = {
      'language-production': 'left',
      'language-comprehension': 'left',
      'motor-control': 'left',
      'logical-reasoning': 'left',
      'mathematics': 'left',
      'spatial-perception': 'right',
      'face-recognition': 'right',
      'emotion-perception': 'right',
      'music-processing': 'right',
      'holistic-processing': 'right',
    };
    const evidenceMap: Record<string, string> = {
      'language-production': 'Wada-test, fMRI, aphasia-studies',
      'language-comprehension': 'Wada-test, fMRI, Wernicke-aphasia',
      'motor-control': 'corticospinal-tract-decussation',
      'logical-reasoning': 'PET-studies, lesion-data',
      'mathematics': 'fMRI, Gerstmann-syndrome',
      'spatial-perception': 'neglect-syndromes, fMRI',
      'face-recognition': 'prosopagnosia, fusiform-face-area',
      'emotion-perception': 'amygdala-lesions, fMRI',
      'music-processing': 'lesion-studies, fMRI',
      'holistic-processing': 'split-brain-studies',
    };
    return {
      function: func,
      dominant: lateralized[func] ?? 'bilateral',
      specialization: hemisphere === 'left' ? 'analytical-sequential' : 'holistic-simultaneous',
      evidence: evidenceMap[func] ?? 'mixed-evidence',
    };
  }

  memorySystem(type: MemorySystem['type'], circuit: string[]): MemorySystem {
    const keyRegionsMap: Record<MemorySystem['type'], string[]> = {
      episodic: ['hippocampus', 'entorhinal-cortex', 'parahippocampal-cortex', 'prefrontal-cortex', 'amygdala'],
      semantic: ['hippocampus', 'temporal-lobe', 'prefrontal-cortex', 'inferotemporal-cortex'],
      procedural: ['basal-ganglia', 'cerebellum', 'motor-cortex', 'prefrontal-cortex'],
      working: ['dlpfc', 'vlpfc', 'parietal-lobe', 'hippocampus', 'thalamus'],
    };
    const neurotransmittersMap: Record<MemorySystem['type'], string[]> = {
      episodic: ['acetylcholine', 'glutamate', 'dopamine'],
      semantic: ['acetylcholine', 'glutamate'],
      procedural: ['dopamine', 'gamma-aminobutyric-acid'],
      working: ['dopamine', 'acetylcholine'],
    };
    return {
      type,
      circuit,
      hippocampalInvolvement: type === 'episodic' || type === 'semantic',
      keyRegions: keyRegionsMap[type],
      neurotransmitters: neurotransmittersMap[type],
    };
  }

  languageCircuit(areas: string[]): { areas: string[]; pathways: string[]; aphasias: string[]; components: { comprehension: string; production: string; repetition: string; naming: string } } {
    return {
      areas,
      pathways: ['arcuate-fasciculus', 'superior-longitudinal-fasciculus', 'inferior-occipitofrontal-fasciculus', 'uncinate-fasciculus'],
      aphasias: ['broca', 'wernicke', 'conduction', 'global', 'anomic', 'transcortical-motor', 'transcortical-sensory'],
      components: {
        comprehension: 'wernicke-area, angular-gyrus',
        production: 'broca-area, motor-cortex',
        repetition: 'arcuate-fasciculus',
        naming: 'inferotemporal-cortex, angular-gyrus',
      },
    };
  }

  executiveFunction(test: string, component: 'inhibition' | 'shifting' | 'updating' | 'planning'): { component: string; test: string; score: number; impairment: boolean; normativeCutoff: number } {
    const cutoffMap: Record<string, number> = {
      'stroop': 70,
      'trail-making-b': 90,
      'wisconsin-card-sort': 4,
      'tower-of-london': 15,
      'digit-span-backward': 7,
    };
    const score = Math.random() * 40 + 60;
    const cutoff = cutoffMap[test.toLowerCase()] ?? 70;
    return {
      component,
      test,
      score: Number(score.toFixed(2)),
      impairment: score < cutoff,
      normativeCutoff: cutoff,
    };
  }

  executiveFunctionProfile(inhibition: number, shifting: number, updating: number, planning: number, workingMemory: number): ExecutiveFunctionProfile {
    const overall = (inhibition + shifting + updating + planning + workingMemory) / 5;
    return {
      inhibition: Number(inhibition.toFixed(2)),
      shifting: Number(shifting.toFixed(2)),
      updating: Number(updating.toFixed(2)),
      planning: Number(planning.toFixed(2)),
      workingMemory: Number(workingMemory.toFixed(2)),
      overall: Number(overall.toFixed(2)),
    };
  }

  attentionNetwork(type: 'alerting' | 'orienting' | 'executive', func: string): { network: string; function: string; regions: string[]; neurotransmitter: string; behavioralTask: string; typicalPerformance: number } {
    const regionsMap: Record<typeof type, string[]> = {
      alerting: ['locus-coeruleus', 'frontal-parietal-network', 'thalamus', 'reticular-activating-system'],
      orienting: ['superior-parietal-lobe', 'frontal-eye-fields', 'intraparietal-sulcus', 'pulvinar'],
      executive: ['anterior-cingulate-cortex', 'dlpfc', 'vlpfc', 'basal-ganglia'],
    };
    const ntMap: Record<typeof type, string> = {
      alerting: 'norepinephrine',
      orienting: 'acetylcholine',
      executive: 'dopamine',
    };
    const taskMap: Record<typeof type, string> = {
      alerting: 'cue-target-task',
      orienting: 'spatial-cuing-task',
      executive: 'stroop-task, flanker-task',
    };
    return {
      network: type,
      function: func,
      regions: regionsMap[type],
      neurotransmitter: ntMap[type],
      behavioralTask: taskMap[type],
      typicalPerformance: type === 'alerting' ? 0.92 : type === 'orienting' ? 0.88 : 0.75,
    };
  }

  attentionProfile(sustained: number, selective: number, divided: number, alternating: number, vigilance: number): AttentionProfile {
    return {
      sustained: Number(sustained.toFixed(2)),
      selective: Number(selective.toFixed(2)),
      divided: Number(divided.toFixed(2)),
      alternating: Number(alternating.toFixed(2)),
      vigilance: Number(vigilance.toFixed(2)),
    };
  }

  lesionSymptom(region: string, lesion: string, _symptom: string): LesionSymptom {
    const entry = this._regions.get(region.toLowerCase());
    const symptomMap: Record<string, string> = {
      'hippocampus': 'anterograde-amnesia',
      'amygdala': 'fear-deficit, emotional-dysregulation',
      'broca': 'expressive-aphasia',
      'wernicke': 'receptive-aphasia',
      'dlpfc': 'executive-dysfunction',
      'angular-gyrus': 'gerstmann-syndrome',
      'fusiform-gyrus': 'prosopagnosia',
      'v1': 'cortical-blindness',
      'basal-ganglia': 'parkinsonism, dystonia',
      'cerebellum': 'ataxia',
    };
    return {
      region,
      lesion,
      symptom: symptomMap[region.toLowerCase()] ?? entry?.function ?? 'unknown-dysfunction',
      mechanism: `${lesion}-of-${region}-disrupting-${entry?.function}`,
      laterality: entry?.hemisphere,
    };
  }

  disconnection(syndrome: string, type: DisconnectionSyndrome['type']): DisconnectionSyndrome {
    const map: Record<string, { pathway: string; symptoms: string[]; anatomicalLocation: string }> = {
      'split-brain': { 
        pathway: 'corpus-callosum', 
        symptoms: ['intermanual-conflict', 'left-field-anomia', 'alien-hand-syndrome', 'visual-disconnection'],
        anatomicalLocation: 'interhemispheric-connection'
      },
      'conduction-aphasia': { 
        pathway: 'arcuate-fasciculus', 
        symptoms: ['impaired-repetition', 'preserved-comprehension', 'preserved-fluency'],
        anatomicalLocation: 'superior-temporal-to-inferior-frontal'
      },
      'pure-alexia': { 
        pathway: 'splenium-of-corpus-callosum', 
        symptoms: ['word-blindness', 'preserved-spoken-language', 'letter-by-letter-reading'],
        anatomicalLocation: 'occipital-to-language-areas'
      },
      'transcortical-motor-aphasia': {
        pathway: 'anterior-perisylvian',
        symptoms: ['non-fluent-speech', 'preserved-repetition', 'preserved-comprehension'],
        anatomicalLocation: 'prefrontal-cortex, anterior-cingulate'
      },
      'transcortical-sensory-aphasia': {
        pathway: 'posterior-perisylvian',
        symptoms: ['impaired-comprehension', 'preserved-repetition', 'fluent-speech'],
        anatomicalLocation: 'temporo-parietal-junction'
      },
    };
    const entry = map[syndrome] ?? { pathway: 'unknown', symptoms: [], anatomicalLocation: 'unknown' };
    return { name: syndrome, type, pathway: entry.pathway, symptoms: entry.symptoms, anatomicalLocation: entry.anatomicalLocation };
  }

  mmse(score: number, _interpretation: string): { score: number; impairment: 'none' | 'mild' | 'moderate' | 'severe'; cutoff: number; domains: { orientation: number; registration: number; attention: number; recall: number; language: number } } {
    const impairment = score >= 24 ? 'none' : score >= 19 ? 'mild' : score >= 10 ? 'moderate' : 'severe';
    const t: NeuropsychTest = {
      id: `mmse-${(++this._counter).toString(36)}`,
      name: 'MMSE',
      domain: 'global-cognition',
      score,
      interpretation: impairment,
      percentile: score * 100 / 30,
      normativeData: { mean: 27, sd: 2 },
      administrationTime: 10,
    };
    this._tests.push(t);
    return { 
      score, 
      impairment, 
      cutoff: 24,
      domains: {
        orientation: Math.min(10, Math.floor(score * 0.33)),
        registration: Math.min(3, Math.floor(score * 0.1)),
        attention: Math.min(5, Math.floor(score * 0.17)),
        recall: Math.min(3, Math.floor(score * 0.1)),
        language: Math.min(9, Math.floor(score * 0.3)),
      },
    };
  }

  moca(score: number, _interpretation: string): { score: number; impairment: 'none' | 'mild' | 'moderate' | 'severe'; cutoff: number; domains: { attention: number; concentration: number; memory: number; language: number; visuospatial: number; executive: number } } {
    const impairment = score >= 26 ? 'none' : score >= 18 ? 'mild' : score >= 10 ? 'moderate' : 'severe';
    const t: NeuropsychTest = {
      id: `moca-${(++this._counter).toString(36)}`,
      name: 'MoCA',
      domain: 'global-cognition',
      score,
      interpretation: impairment,
      percentile: score * 100 / 30,
      normativeData: { mean: 27, sd: 2.5 },
      administrationTime: 15,
    };
    this._tests.push(t);
    return { 
      score, 
      impairment, 
      cutoff: 26,
      domains: {
        attention: Math.min(6, Math.floor(score * 0.2)),
        concentration: Math.min(3, Math.floor(score * 0.1)),
        memory: Math.min(5, Math.floor(score * 0.17)),
        language: Math.min(6, Math.floor(score * 0.2)),
        visuospatial: Math.min(5, Math.floor(score * 0.17)),
        executive: Math.min(5, Math.floor(score * 0.17)),
      },
    };
  }

  wais(index: 'VCI' | 'WMI' | 'PRI' | 'PSI', subtest: string, score: number): { index: string; subtest: string; scaledScore: number; percentile: number; classification: string; confidenceInterval: [number, number] } {
    const classification = score > 130 ? 'very-superior' : score > 120 ? 'superior' : score > 110 ? 'high-average' : score > 90 ? 'average' : score > 80 ? 'low-average' : 'borderline';
    const percentile = this._calculatePercentile(score);
    const ci: [number, number] = [Number((score - 5).toFixed(1)), Number((score + 5).toFixed(1))];
    return { index, subtest, scaledScore: score, percentile, classification, confidenceInterval: ci };
  }

  wisconsinCardSort(categories: number, errors: number): { categories: number; errors: number; perseverativeErrors: number; nonPerseverativeErrors: number; impairment: boolean; conceptualLevel: number } {
    const perseverativeErrors = Math.floor(errors * 0.6);
    const nonPerseverativeErrors = errors - perseverativeErrors;
    const conceptualLevel = Math.min(100, categories * 20);
    return {
      categories,
      errors,
      perseverativeErrors,
      nonPerseverativeErrors,
      impairment: categories < 4 || errors > 30,
      conceptualLevel,
    };
  }

  stroop(interference: number, condition: 'congruent' | 'incongruent' | 'neutral'): { interference: number; condition: string; reactionTime: number; errors: number; interferenceScore: number; executiveLoad: number } {
    const reactionTimeMap: Record<string, number> = {
      congruent: 500,
      neutral: 600,
      incongruent: 800,
    };
    const errorsMap: Record<string, number> = {
      congruent: 1,
      neutral: 2,
      incongruent: 5,
    };
    const interferenceScore = condition === 'incongruent' ? interference : 0;
    return {
      interference,
      condition,
      reactionTime: reactionTimeMap[condition],
      errors: errorsMap[condition],
      interferenceScore,
      executiveLoad: condition === 'incongruent' ? 0.85 : condition === 'neutral' ? 0.5 : 0.2,
    };
  }

  trailMaking(time: number, errors: number, condition: 'A' | 'B'): { time: number; errors: number; condition: string; executiveComponent: boolean; impaired: boolean; efficiency: number; score: number } {
    const cutoff = condition === 'A' ? 40 : 90;
    const efficiency = condition === 'A' ? Math.max(0, 1 - (time - 20) / 40) : Math.max(0, 1 - (time - 50) / 60);
    const score = efficiency * 100;
    return {
      time,
      errors,
      condition,
      executiveComponent: condition === 'B',
      impaired: time > cutoff,
      efficiency: Number(efficiency.toFixed(2)),
      score: Number(score.toFixed(2)),
    };
  }

  reyOsterrieth(copyScore: number, delayScore: number, recognitionScore: number): { copy: number; delay: number; recognition: number; visualConstruction: number; visualMemory: number; overall: number; impairment: boolean } {
    const visualConstruction = copyScore;
    const visualMemory = (delayScore + recognitionScore) / 2;
    const overall = (copyScore + delayScore + recognitionScore) / 3;
    return {
      copy: copyScore,
      delay: delayScore,
      recognition: recognitionScore,
      visualConstruction: Number(visualConstruction.toFixed(2)),
      visualMemory: Number(visualMemory.toFixed(2)),
      overall: Number(overall.toFixed(2)),
      impairment: overall < 0.6,
    };
  }

  bostonNamingTest(score: number, age: number, education: number): { score: number; ageAdjusted: number; educationAdjusted: number; percentile: number; impairment: boolean; errors: { semantic: number; phonemic: number; circumlocution: number } } {
    const ageAdjustment = age > 70 ? -0.02 * (age - 70) : 0;
    const educationAdjustment = education < 8 ? -0.03 * (8 - education) : education > 16 ? 0.01 * (education - 16) : 0;
    const adjustedScore = Math.max(0, score + ageAdjustment + educationAdjustment);
    const percentile = Math.min(100, adjustedScore * 100 / 60);
    return {
      score,
      ageAdjusted: Number(ageAdjustment.toFixed(2)),
      educationAdjusted: Number(educationAdjustment.toFixed(2)),
      percentile: Number(percentile.toFixed(2)),
      impairment: adjustedScore < 45,
      errors: {
        semantic: Math.floor((60 - score) * 0.5),
        phonemic: Math.floor((60 - score) * 0.3),
        circumlocution: Math.floor((60 - score) * 0.2),
      },
    };
  }

  digitSpan(forward: number, backward: number, sequencing: number): { forward: number; backward: number; sequencing: number; workingMemory: number; attention: number; overall: number; impairment: boolean } {
    const workingMemory = (backward + sequencing) / 2;
    const attention = forward;
    const overall = (forward + backward + sequencing) / 3;
    return {
      forward,
      backward,
      sequencing,
      workingMemory: Number(workingMemory.toFixed(2)),
      attention: Number(attention.toFixed(2)),
      overall: Number(overall.toFixed(2)),
      impairment: overall < 7,
    };
  }

  aphasiaProfile(type: Aphasia['type']): Aphasia {
    const map: Record<Aphasia['type'], { characteristics: string[]; lesionLocation: string; speechFeatures: { fluency: number; comprehension: number; repetition: number; naming: number } }> = {
      broca: {
        characteristics: ['non-fluent', 'telegraphic-speech', 'effortful', 'preserved-comprehension'],
        lesionLocation: 'left-inferior-frontal-gyrus',
        speechFeatures: { fluency: 0.2, comprehension: 0.85, repetition: 0.5, naming: 0.4 },
      },
      wernicke: {
        characteristics: ['fluent', 'paraphasic', 'empty-speech', 'impaired-comprehension'],
        lesionLocation: 'left-superior-temporal-gyrus',
        speechFeatures: { fluency: 0.9, comprehension: 0.2, repetition: 0.3, naming: 0.4 },
      },
      conduction: {
        characteristics: ['fluent', 'impaired-repetition', 'preserved-comprehension'],
        lesionLocation: 'arcuate-fasciculus',
        speechFeatures: { fluency: 0.8, comprehension: 0.85, repetition: 0.2, naming: 0.6 },
      },
      global: {
        characteristics: ['non-fluent', 'severely-impaired-comprehension', 'impaired-repetition'],
        lesionLocation: 'perisylvian-region',
        speechFeatures: { fluency: 0.1, comprehension: 0.1, repetition: 0.1, naming: 0.1 },
      },
      anomic: {
        characteristics: ['fluent', 'word-finding-difficulty', 'preserved-other-functions'],
        lesionLocation: 'inferotemporal-cortex, angular-gyrus',
        speechFeatures: { fluency: 0.9, comprehension: 0.9, repetition: 0.9, naming: 0.4 },
      },
      transcortical: {
        characteristics: ['preserved-repetition', 'variable-fluency', 'variable-comprehension'],
        lesionLocation: 'anterior-or-posterior-perisylvian',
        speechFeatures: { fluency: 0.5, comprehension: 0.5, repetition: 0.95, naming: 0.5 },
      },
    };
    const entry = map[type];
    return { type, characteristics: entry.characteristics, lesionLocation: entry.lesionLocation, speechFeatures: entry.speechFeatures };
  }

  visualPerceptionProfile(acuity: number, contrastSensitivity: number, visualField: { superior: number; inferior: number; temporal: number; nasal: number }, objectRecognition: number, faceRecognition: number, spatialProcessing: number): VisualPerception {
    return {
      acuity: Number(acuity.toFixed(2)),
      contrastSensitivity: Number(contrastSensitivity.toFixed(2)),
      visualField: {
        superior: Number(visualField.superior.toFixed(2)),
        inferior: Number(visualField.inferior.toFixed(2)),
        temporal: Number(visualField.temporal.toFixed(2)),
        nasal: Number(visualField.nasal.toFixed(2)),
      },
      objectRecognition: Number(objectRecognition.toFixed(2)),
      faceRecognition: Number(faceRecognition.toFixed(2)),
      spatialProcessing: Number(spatialProcessing.toFixed(2)),
    };
  }

  neurotransmitterSystem(name: string): NeurotransmitterSystem | null {
    return this._neurotransmitters.get(name.toLowerCase()) ?? null;
  }

  brainNetwork(name: string): BrainNetwork | null {
    return this._networks.get(name.toLowerCase()) ?? null;
  }

  cognitiveRehabilitation(domain: string, techniques: string[], goals: string[], duration: number): CognitiveRehabilitation {
    const outcomeMap: Record<string, number> = {
      'memory': 0.65,
      'attention': 0.7,
      'executive': 0.6,
      'language': 0.75,
      'visuospatial': 0.65,
      'emotion': 0.7,
    };
    return {
      domain,
      techniques,
      goals,
      expectedOutcome: outcomeMap[domain] ?? 0.65,
      duration,
    };
  }

  neuroplasticity(type: Neuroplasticity['type'], factors: { factor: string; influence: number }[]): Neuroplasticity {
    const mechanismsMap: Record<Neuroplasticity['type'], string[]> = {
      synaptic: ['long-term-potentiation', 'long-term-depression', 'synaptic-pruning', 'neurotransmitter-release'],
      structural: ['axon-growth', 'dendritic-spine-formation', 'synaptogenesis', 'myelination'],
      functional: ['reorganization', 'recruitment', 'compensation', 'cross-modal-plasticity'],
    };
    const timeframeMap: Record<Neuroplasticity['type'], string> = {
      synaptic: 'minutes-to-hours',
      structural: 'days-to-weeks',
      functional: 'hours-to-months',
    };
    return {
      type,
      mechanisms: mechanismsMap[type],
      factors,
      timeframe: timeframeMap[type],
    };
  }

  cognitiveDomain(name: string): CognitiveDomain | null {
    const domains: Record<string, CognitiveDomain> = {
      'memory': {
        name: 'memory',
        tests: ['WMS-IV', 'Rey-Osterrieth', 'California-Verbal-Learning-Test', 'Digit-Span'],
        functions: ['encoding', 'storage', 'retrieval', 'consolidation', 'recognition'],
        networks: ['medial-temporal-lobe-network', 'prefrontal-network', 'hippocampal-network'],
        primaryRegions: ['hippocampus', 'entorhinal-cortex', 'prefrontal-cortex', 'amygdala'],
      },
      'attention': {
        name: 'attention',
        tests: ['Trail-Making', 'Stroop', 'Continuous-Performance-Test', 'Digit-Span'],
        functions: ['sustained', 'selective', 'divided', 'alternating', 'vigilance'],
        networks: ['alerting-network', 'orienting-network', 'executive-network'],
        primaryRegions: ['dlpfc', 'anterior-cingulate', 'parietal-lobe', 'thalamus'],
      },
      'executive': {
        name: 'executive',
        tests: ['Wisconsin-Card-Sort', 'Tower-of-London', 'Trail-Making-B', 'Stroop'],
        functions: ['inhibition', 'shifting', 'updating', 'planning', 'working-memory'],
        networks: ['frontal-parietal-network', 'default-mode-network'],
        primaryRegions: ['dlpfc', 'vlpfc', 'basal-ganglia', 'cerebellum'],
      },
      'language': {
        name: 'language',
        tests: ['Boston-Naming-Test', 'Western-Aphasia-Battery', 'Token-Test', 'Verbal-Fluency'],
        functions: ['comprehension', 'production', 'repetition', 'naming', 'reading', 'writing'],
        networks: ['perisylvian-language-network', 'arcuate-fasciculus'],
        primaryRegions: ['broca', 'wernicke', 'angular-gyrus', 'supramarginal-gyrus'],
      },
      'visuospatial': {
        name: 'visuospatial',
        tests: ['Rey-Osterrieth', 'Block-Design', 'Judgment-of-Line-Orientation', 'Hooper-Visual-Organization'],
        functions: ['visual-perception', 'spatial-processing', 'object-recognition', 'mental-rotation'],
        networks: ['visual-network', 'dorsal-stream', 'ventral-stream'],
        primaryRegions: ['occipital-lobe', 'parietal-lobe', 'temporal-lobe'],
      },
    };
    return domains[name.toLowerCase()] ?? null;
  }

  private _calculatePercentile(score: number): number {
    const mean = 100;
    const sd = 15;
    const z = (score - mean) / sd;
    const percentile = 0.5 * (1 + this._erf(z / Math.sqrt(2))) * 100;
    return Number(percentile.toFixed(2));
  }

  private _erf(x: number): number {
    const sign = x >= 0 ? 1 : -1;
    x = Math.abs(x);
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;
    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    return sign * y;
  }

  private _seedRegions(): void {
    const regions: BrainRegion[] = [
      { name: 'hippocampus', function: 'memory-consolidation', connections: ['entorhinal-cortex', 'prefrontal-cortex', 'amygdala', 'parahippocampal-cortex'], lobe: 'temporal', hemisphere: 'bilateral', cytoarchitecture: 'archicortex', vascularSupply: 'posterior-cerebral-artery' },
      { name: 'amygdala', function: 'fear-processing-emotion', connections: ['hippocampus', 'prefrontal-cortex', 'thalamus', 'hypothalamus'], lobe: 'temporal', hemisphere: 'bilateral', cytoarchitecture: 'allocortex', vascularSupply: 'middle-cerebral-artery' },
      { name: 'broca', function: 'speech-production', connections: ['wernicke-area', 'motor-cortex', 'premotor-cortex'], lobe: 'frontal', hemisphere: 'left', cytoarchitecture: 'BA44-BA45', vascularSupply: 'middle-cerebral-artery' },
      { name: 'wernicke', function: 'language-comprehension', connections: ['broca-area', 'angular-gyrus', 'supramarginal-gyrus'], lobe: 'temporal', hemisphere: 'left', cytoarchitecture: 'BA22', vascularSupply: 'middle-cerebral-artery' },
      { name: 'dlpfc', function: 'executive-function', connections: ['anterior-cingulate', 'parietal-lobe', 'basal-ganglia', 'thalamus'], lobe: 'frontal', hemisphere: 'bilateral', cytoarchitecture: 'BA9-BA10', vascularSupply: 'middle-cerebral-artery' },
      { name: 'vlpfc', function: 'working-memory-language', connections: ['dlpfc', 'wernicke-area', 'hippocampus'], lobe: 'frontal', hemisphere: 'bilateral', cytoarchitecture: 'BA45-BA47', vascularSupply: 'middle-cerebral-artery' },
      { name: 'angular-gyrus', function: 'reading-writing-calculation', connections: ['wernicke-area', 'supramarginal-gyrus', 'occipital-lobe'], lobe: 'parietal', hemisphere: 'left', cytoarchitecture: 'BA39', vascularSupply: 'middle-cerebral-artery' },
      { name: 'supramarginal-gyrus', function: 'somatosensory-language', connections: ['angular-gyrus', 'broca-area', 'primary-somatosensory'], lobe: 'parietal', hemisphere: 'left', cytoarchitecture: 'BA40', vascularSupply: 'middle-cerebral-artery' },
      { name: 'fusiform-gyrus', function: 'face-recognition-object-recognition', connections: ['occipital-lobe', 'hippocampus', 'amygdala'], lobe: 'temporal', hemisphere: 'bilateral', cytoarchitecture: 'BA37', vascularSupply: 'middle-cerebral-artery' },
      { name: 'anterior-cingulate', function: 'attention-emotion-regulation', connections: ['dlpfc', 'amygdala', 'hippocampus', 'thalamus'], lobe: 'limbic', hemisphere: 'bilateral', cytoarchitecture: 'BA24-BA32', vascularSupply: 'anterior-cerebral-artery' },
      { name: 'v1', function: 'primary-visual-processing', connections: ['lateral-geniculate-nucleus', 'v2', 'v3'], lobe: 'occipital', hemisphere: 'bilateral', cytoarchitecture: 'BA17', vascularSupply: 'posterior-cerebral-artery' },
      { name: 'basal-ganglia', function: 'motor-control-reward', connections: ['prefrontal-cortex', 'thalamus', 'substantia-nigra', 'cerebellum'], lobe: 'limbic', hemisphere: 'bilateral', cytoarchitecture: 'subcortical', vascularSupply: 'middle-cerebral-artery' },
      { name: 'cerebellum', function: 'motor-coordination-cognitive', connections: ['motor-cortex', 'prefrontal-cortex', 'vestibular-system'], lobe: 'cerebellum', hemisphere: 'bilateral', cytoarchitecture: 'cerebellar-cortex', vascularSupply: 'posterior-inferior-cerebellar-artery' },
      { name: 'thalamus', function: 'sensory-relay-cognition', connections: ['cortex', 'hypothalamus', 'basal-ganglia', 'hippocampus'], lobe: 'diencephalon', hemisphere: 'bilateral', cytoarchitecture: 'nuclei', vascularSupply: 'posterior-cerebral-artery' },
      { name: 'hypothalamus', function: 'homeostasis-motivation', connections: ['thalamus', 'amygdala', 'hippocampus', 'pituitary'], lobe: 'diencephalon', hemisphere: 'bilateral', cytoarchitecture: 'nuclei', vascularSupply: 'anterior-cerebral-artery' },
    ];
    for (const r of regions) this._regions.set(r.name, r);
  }

  private _seedNetworks(): void {
    const networks: BrainNetwork[] = [
      { name: 'default-mode', nodes: ['medial-prefrontal', 'posterior-cingulate', 'inferior-parietal', 'hippocampus'], edges: ['mpfc-pcc', 'pcc-ip', 'mpfc-hippocampus'], function: 'self-referential-thought, memory-retrieval, mind-wandering', frequencyBand: 'delta-theta' },
      { name: 'frontal-parietal', nodes: ['dlpfc', 'vlpfc', 'anterior-cingulate', 'parietal-lobe', 'thalamus'], edges: ['dlpfc-ac', 'dlpfc-parietal', 'vlpfc-thalamus'], function: 'executive-control, attention, working-memory', frequencyBand: 'theta-beta' },
      { name: 'salience', nodes: ['anterior-insula', 'anterior-cingulate', 'amygdala', 'hypothalamus'], edges: ['insula-ac', 'insula-amygdala', 'ac-hypothalamus'], function: 'emotional-salience, interoception, attention-switching', frequencyBand: 'theta' },
      { name: 'visual', nodes: ['v1', 'v2', 'v3', 'v4', 'inferotemporal-cortex'], edges: ['v1-v2', 'v2-v3', 'v3-v4', 'v4-it'], function: 'visual-processing, object-recognition, spatial-vision', frequencyBand: 'gamma' },
      { name: 'language', nodes: ['broca', 'wernicke', 'angular-gyrus', 'supramarginal-gyrus'], edges: ['broca-wernicke', 'wernicke-angular', 'angular-supramarginal'], function: 'language-comprehension, speech-production', frequencyBand: 'gamma' },
    ];
    for (const n of networks) this._networks.set(n.name, n);
  }

  private _seedNeurotransmitters(): void {
    const neurotransmitters: NeurotransmitterSystem[] = [
      { name: 'dopamine', pathways: ['nigrostriatal', 'mesolimbic', 'mesocortical', 'tuberoinfundibular'], functions: ['motor-control', 'reward', 'motivation', 'cognition', 'working-memory'], disorders: ['parkinsons', 'schizophrenia', 'adhd', 'depression'], drugs: ['levodopa', 'antipsychotics', 'stimulants'] },
      { name: 'serotonin', pathways: ['raphe-nuclei-cortex', 'raphe-nuclei-limbic'], functions: ['mood-regulation', 'sleep', 'appetite', 'aggression', 'anxiety'], disorders: ['depression', 'anxiety', 'obsessive-compulsive'], drugs: ['ssris', 'snris', 'tricyclics'] },
      { name: 'norepinephrine', pathways: ['locus-coeruleus-cortex', 'locus-coeruleus-limbic'], functions: ['arousal', 'attention', 'stress-response', 'memory'], disorders: ['depression', 'anxiety', 'adhd'], drugs: ['stimulants', 'beta-blockers'] },
      { name: 'acetylcholine', pathways: ['basal-forebrain-cortex', 'cholinergic-brainstem'], functions: ['memory', 'attention', 'learning', 'muscle-control'], disorders: ['alzheimers', 'parkinsons'], drugs: ['cholinesterase-inhibitors'] },
      { name: 'glutamate', pathways: ['cortical-projections', 'hippocampal-circuit'], functions: ['learning', 'memory', 'synaptic-plasticity', 'excitatory-transmission'], disorders: ['epilepsy', 'schizophrenia', 'alzheimer'], drugs: ['nmda-antagonists', 'ampakines'] },
    ];
    for (const nt of neurotransmitters) this._neurotransmitters.set(nt.name, nt);
  }

  toPacket(): DataPacket<{
    regions: number;
    domains: CognitiveDomain[];
    tests: NeuropsychTest[];
    history: unknown[];
    networks: BrainNetwork[];
    neurotransmitters: NeurotransmitterSystem[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['psychology', 'Neuropsychology'],
      priority: 1,
      phase: 'neuropsychology',
    };
    return {
      id: `neuropsychology-${Date.now().toString(36)}-${(++this._counter).toString(36)}`,
      payload: {
        regions: this._regions.size,
        domains: [...this._domains],
        tests: [...this._tests],
        history: [...this._history],
        networks: Array.from(this._networks.values()),
        neurotransmitters: Array.from(this._neurotransmitters.values()),
      },
      metadata,
    };
  }

  reset(): void {
    this._regions.clear();
    this._domains = [];
    this._tests = [];
    this._history = [];
    this._counter = 0;
    this._networks.clear();
    this._neurotransmitters.clear();
    this._seedRegions();
    this._seedNetworks();
    this._seedNeurotransmitters();
  }
}
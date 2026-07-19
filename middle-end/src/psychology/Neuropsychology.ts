import { DataPacket, PacketMeta } from '../shared/types';

/** A brain region descriptor. */
export interface BrainRegion {
  readonly name: string;
  readonly function: string;
  readonly connections: string[];
  readonly lobe?: string;
  readonly hemisphere?: 'left' | 'right' | 'bilateral';
}

/** A cognitive domain descriptor. */
export interface CognitiveDomain {
  readonly name: string;
  readonly tests: string[];
  readonly functions: string[];
  readonly networks: string[];
}

/** A neuropsychological test descriptor. */
export interface NeuropsychTest {
  readonly id: string;
  readonly name: string;
  readonly domain: string;
  readonly score: number;
  readonly interpretation: string;
  readonly percentile: number;
}

/** Lesion-symptom mapping. */
export interface LesionSymptom {
  readonly region: string;
  readonly lesion: string;
  readonly symptom: string;
  readonly mechanism: string;
}

/** Disconnection syndrome descriptor. */
export interface DisconnectionSyndrome {
  readonly name: string;
  readonly type: 'callosal' | 'association' | 'projection';
  readonly pathway: string;
  readonly symptoms: string[];
}

/** Memory system descriptor. */
export interface MemorySystem {
  readonly type: 'episodic' | 'semantic' | 'procedural' | 'working';
  readonly circuit: string[];
  readonly hippocampalInvolvement: boolean;
}

/**
 * Neuropsychology models brain regions, cognitive domains, neuropsych
 * tests (MMSE, MoCA, WAIS, WCST, Stroop, Trail-Making), and lesion-symptom
 * mappings.
 */
export class Neuropsychology {
  private _regions: Map<string, BrainRegion> = new Map();
  private _domains: CognitiveDomain[] = [];
  private _tests: NeuropsychTest[] = [];
  private _history: unknown[] = [];
  private _counter = 0;

  constructor() {
    this._seedRegions();
  }

  get regionCount(): number { return this._regions.size; }
  get domainCount(): number { return this._domains.length; }
  get testCount(): number { return this._tests.length; }

  /** Describe function of a lobe. */
  lobeFunction(lobe: 'frontal' | 'parietal' | 'temporal' | 'occipital' | 'limbic'): { lobe: string; functions: string[]; disorders: string[] } {
    const map: Record<typeof lobe, { functions: string[]; disorders: string[] }> = {
      frontal: { functions: ['executive', 'motor', 'language-broca'], disorders: ['executive-dysfunction', 'broca-aphasia'] },
      parietal: { functions: ['spatial', 'sensation', 'attention'], disorders: ['neglect', 'apraxia', 'gerstmann'] },
      temporal: { functions: ['memory', 'audition', 'language-wernicke'], disorders: ['amnesia', 'wernicke-aphasia'] },
      occipital: { functions: ['vision'], disorders: ['cortical-blindness', 'visual-agnosia'] },
      limbic: { functions: ['emotion', 'motivation', 'memory'], disorders: ['kluver-bucy', 'emotional-dysregulation'] },
    };
    const entry = map[lobe];
    return { lobe, functions: entry.functions, disorders: entry.disorders };
  }

  /** Brain lateralization of a function. */
  brainLateralization(func: string, hemisphere: 'left' | 'right'): { function: string; dominant: string; specialization: string } {
    const lateralized: Record<string, 'left' | 'right'> = {
      'language': 'left',
      'motor-control': 'left',
      'logic': 'left',
      'spatial': 'right',
      'face-recognition': 'right',
      'emotion': 'right',
    };
    return {
      function: func,
      dominant: lateralized[func] ?? 'bilateral',
      specialization: hemisphere === 'left' ? 'analytical' : 'holistic',
    };
  }

  /** Describe a memory system and its circuit. */
  memorySystem(type: MemorySystem['type'], circuit: string[]): MemorySystem {
    return {
      type,
      circuit,
      hippocampalInvolvement: type === 'episodic' || type === 'semantic',
    };
  }

  /** Describe language circuit (Broca-Wernicke arcuate). */
  languageCircuit(areas: string[]): { areas: string[]; pathways: string[]; aphasias: string[] } {
    return {
      areas,
      pathways: ['arcuate-fasciculus', 'superior-longitudinal-fasciculus'],
      aphasias: ['broca', 'wernicke', 'conduction', 'global'],
    };
  }

  /** Test executive function component. */
  executiveFunction(test: string, component: 'inhibition' | 'shifting' | 'updating' | 'planning'): { component: string; test: string; score: number; impairment: boolean } {
    return {
      component,
      test,
      score: 0.7,
      impairment: false,
    };
  }

  /** Describe attention network. */
  attentionNetwork(type: 'alerting' | 'orienting' | 'executive', func: string): { network: string; function: string; regions: string[]; neurotransmitter: string } {
    const regionsMap: Record<typeof type, string[]> = {
      alerting: ['locus-coeruleus', 'frontal-parietal'],
      orienting: ['superior-parietal', 'frontal-eye-fields'],
      executive: ['anterior-cingulate', 'dlpfc'],
    };
    const ntMap: Record<typeof type, string> = {
      alerting: 'norepinephrine',
      orienting: 'acetylcholine',
      executive: 'dopamine',
    };
    return {
      network: type,
      function: func,
      regions: regionsMap[type],
      neurotransmitter: ntMap[type],
    };
  }

  /** Map a lesion to its symptom. */
  lesionSymptom(region: string, lesion: string, _symptom: string): LesionSymptom {
    const entry = this._regions.get(region.toLowerCase());
    return {
      region,
      lesion,
      symptom: entry?.function ?? 'unknown-dysfunction',
      mechanism: `${lesion}-of-${region}`,
    };
  }

  /** Describe disconnection syndrome. */
  disconnection(syndrome: string, type: DisconnectionSyndrome['type']): DisconnectionSyndrome {
    const map: Record<string, { pathway: string; symptoms: string[] }> = {
      'split-brain': { pathway: 'corpus-callosum', symptoms: ['intermanual-conflict', 'left-field-anomia'] },
      'conduction-aphasia': { pathway: 'arcuate-fasciculus', symptoms: ['impaired-repetition'] },
      'pure-alexia': { pathway: 'splenium', symptoms: ['word-blindness'] },
    };
    const entry = map[syndrome] ?? { pathway: 'unknown', symptoms: [] };
    return { name: syndrome, type, pathway: entry.pathway, symptoms: entry.symptoms };
  }

  /** Score the Mini-Mental State Examination. */
  mmse(score: number, _interpretation: string): { score: number; impairment: 'none' | 'mild' | 'moderate' | 'severe'; cutoff: number } {
    const impairment = score >= 24 ? 'none' : score >= 19 ? 'mild' : score >= 10 ? 'moderate' : 'severe';
    const t: NeuropsychTest = {
      id: `mmse-${(++this._counter).toString(36)}`,
      name: 'MMSE',
      domain: 'global-cognition',
      score,
      interpretation: impairment,
      percentile: score * 100 / 30,
    };
    this._tests.push(t);
    return { score, impairment, cutoff: 24 };
  }

  /** Score the Montreal Cognitive Assessment. */
  moca(score: number, _interpretation: string): { score: number; impairment: 'none' | 'mild' | 'moderate' | 'severe'; cutoff: number } {
    const impairment = score >= 26 ? 'none' : score >= 18 ? 'mild' : score >= 10 ? 'moderate' : 'severe';
    const t: NeuropsychTest = {
      id: `moca-${(++this._counter).toString(36)}`,
      name: 'MoCA',
      domain: 'global-cognition',
      score,
      interpretation: impairment,
      percentile: score * 100 / 30,
    };
    this._tests.push(t);
    return { score, impairment, cutoff: 26 };
  }

  /** Score WAIS subtest. */
  wais(index: 'VCI' | 'WMI' | 'PRI' | 'PSI', subtest: string, score: number): { index: string; subtest: string; scaledScore: number; percentile: number; classification: string } {
    const classification = score > 130 ? 'very-superior' : score > 120 ? 'superior' : score > 110 ? 'high-average' : score > 90 ? 'average' : score > 80 ? 'low-average' : 'borderline';
    return { index, subtest, scaledScore: score, percentile: 50, classification };
  }

  /** Score Wisconsin Card Sorting Test. */
  wisconsinCardSort(categories: number, errors: number): { categories: number; errors: number; perseverativeErrors: number; impairment: boolean } {
    return {
      categories,
      errors,
      perseverativeErrors: Math.floor(errors * 0.6),
      impairment: categories < 4 || errors > 30,
    };
  }

  /** Score Stroop test. */
  stroop(interference: number, condition: 'congruent' | 'incongruent' | 'neutral'): { interference: number; condition: string; reactionTime: number; errors: number } {
    return {
      interference,
      condition,
      reactionTime: condition === 'incongruent' ? 800 : 500,
      errors: condition === 'incongruent' ? 5 : 1,
    };
  }

  /** Score Trail-Making Test. */
  trailMaking(time: number, errors: number, condition: 'A' | 'B'): { time: number; errors: number; condition: string; executiveComponent: boolean; impaired: boolean } {
    return {
      time,
      errors,
      condition,
      executiveComponent: condition === 'B',
      impaired: condition === 'A' ? time > 40 : time > 90,
    };
  }

  private _seedRegions(): void {
    const regions: BrainRegion[] = [
      { name: 'hippocampus', function: 'memory-consolidation', connections: ['entorhinal-cortex', 'prefrontal'], lobe: 'temporal', hemisphere: 'bilateral' },
      { name: 'amygdala', function: 'fear-emotion', connections: ['hippocampus', 'prefrontal'], lobe: 'temporal', hemisphere: 'bilateral' },
      { name: 'broca', function: 'speech-production', connections: ['wernicke', 'motor-cortex'], lobe: 'frontal', hemisphere: 'left' },
      { name: 'wernicke', function: 'language-comprehension', connections: ['broca', 'angular-gyrus'], lobe: 'temporal', hemisphere: 'left' },
      { name: 'dlpfc', function: 'executive-function', connections: ['anterior-cingulate', 'parietal'], lobe: 'frontal', hemisphere: 'bilateral' },
    ];
    for (const r of regions) this._regions.set(r.name, r);
  }

  toPacket(): DataPacket<{
    regions: number;
    domains: CognitiveDomain[];
    tests: NeuropsychTest[];
    history: unknown[];
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
    this._seedRegions();
  }
}

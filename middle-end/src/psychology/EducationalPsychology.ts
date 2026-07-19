import { DataPacket, PacketMeta } from '../shared/types';

/** A learning style descriptor. */
export interface LearningStyle {
  readonly type: 'visual' | 'auditory' | 'kinesthetic' | 'read-write';
  readonly preferences: string[];
  readonly strategies: string[];
  readonly strength: number;
}

/** A motivation descriptor. */
export interface Motivation {
  readonly type: 'intrinsic' | 'extrinsic' | 'amotivation';
  readonly source: string;
  readonly direction: 'approach' | 'avoidance';
  readonly intensity: number;
}

/** An instructional design descriptor. */
export interface InstructionalDesign {
  readonly approach: string;
  readonly objectives: string[];
  readonly methods: string[];
  readonly assessment: string[];
  readonly target: string;
}

/** Bloom's taxonomy level. */
export interface BloomLevel {
  readonly level: 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create';
  readonly domain: 'cognitive' | 'affective' | 'psychomotor';
  readonly verbs: string[];
}

/** Self-efficacy descriptor. */
export interface SelfEfficacy {
  readonly level: number;
  readonly sources: { source: string; influence: number }[];
  readonly beliefs: string[];
}

/** Mindset descriptor. */
export interface Mindset {
  readonly type: 'growth' | 'fixed';
  readonly beliefs: string[];
  readonly response: string;
}

/** Feedback descriptor. */
export interface FeedbackDescriptor {
  readonly type: 'formative' | 'summative' | 'norm-referenced' | 'criterion-referenced';
  readonly timing: 'immediate' | 'delayed';
  readonly specificity: number;
  readonly effectiveness: number;
}

/**
 * EducationalPsychology implements learning theories (behaviorism,
 * cognitivism, constructivism, social-learning), Bloom's taxonomy,
 * motivation, self-efficacy, mindset, and scaffolding.
 */
export class EducationalPsychology {
  private _styles: Map<string, LearningStyle> = new Map();
  private _motivations: Motivation[] = [];
  private _designs: InstructionalDesign[] = [];
  private _history: unknown[] = [];
  private _counter = 0;

  constructor() {
    this._seedStyles();
  }

  get styleCount(): number { return this._styles.size; }
  get motivationCount(): number { return this._motivations.length; }
  get designCount(): number { return this._designs.length; }

  /** Assess learning style. */
  learningStyle(assessment: { type: string; score: number }[]): LearningStyle {
    const sorted = [...assessment].sort((a, b) => b.score - a.score);
    const top = sorted[0];
    const style: LearningStyle = {
      type: top?.type as LearningStyle['type'] ?? 'visual',
      preferences: [top?.type ?? 'visual'],
      strategies: top?.type === 'visual' ? ['diagrams', 'charts'] : top?.type === 'auditory' ? ['discussion', 'lecture'] : ['hands-on', 'practice'],
      strength: top?.score ?? 0.5,
    };
    return style;
  }

  /** Profile multiple intelligences (Gardner). */
  multipleIntelligences(profile: { intelligence: string; score: number }[]): { dominant: string; profile: { intelligence: string; score: number }[] } {
    const sorted = [...profile].sort((a, b) => b.score - a.score);
    return {
      dominant: sorted[0]?.intelligence ?? 'linguistic',
      profile: sorted,
    };
  }

  /** Map a Bloom's taxonomy level. */
  bloomTaxonomy(level: BloomLevel['level'], domain: BloomLevel['domain']): BloomLevel {
    const verbs: Record<BloomLevel['level'], string[]> = {
      remember: ['define', 'list', 'recall'],
      understand: ['explain', 'summarize', 'interpret'],
      apply: ['demonstrate', 'use', 'solve'],
      analyze: ['compare', 'contrast', 'examine'],
      evaluate: ['critique', 'judge', 'assess'],
      create: ['design', 'construct', 'produce'],
    };
    return { level, domain, verbs: verbs[level] };
  }

  /** Apply constructivist approach. */
  constructivism(learner: string, environment: string): { approach: string; principles: string[]; role: string } {
    return {
      approach: 'constructivist',
      principles: ['active-learning', 'prior-knowledge', 'social-interaction', 'authentic-tasks'],
      role: 'facilitator',
    };
  }

  /** Apply behaviorist approach. */
  behaviorism(stimulus: string, response: string, reinforcement: 'positive' | 'negative' | 'punishment' | 'extinction'): { schedule: string; strength: number; generalization: number } {
    return {
      schedule: 'variable-ratio',
      strength: 0.8,
      generalization: 0.5,
    };
  }

  /** Apply cognitivist approach. */
  cognitivism(schema: string, assimilation: boolean, accommodation: boolean): { process: string; schema: string; equilibration: boolean } {
    return {
      process: assimilation ? 'assimilation' : 'accommodation',
      schema,
      equilibration: assimilation && accommodation,
    };
  }

  /** Apply Bandura's social learning. */
  socialLearning(model: string, observation: string, _imitation: string): { process: string[]; mediationalProcesses: string[]; selfRegulation: number } {
    return {
      process: ['attention', 'retention', 'reproduction', 'motivation'],
      mediationalProcesses: ['attention', 'retention', 'reproduction', 'motivation'],
      selfRegulation: 0.7,
    };
  }

  /** Assess motivation. */
  motivation(intrinsic: number, extrinsic: number, factors: string[]): Motivation {
    const type: Motivation['type'] = intrinsic > extrinsic ? 'intrinsic' : extrinsic > intrinsic ? 'extrinsic' : 'amotivation';
    const m: Motivation = {
      type,
      source: type === 'intrinsic' ? 'autonomy-competence-relatedness' : 'rewards-punishments',
      direction: 'approach',
      intensity: Math.max(intrinsic, extrinsic),
    };
    this._motivations.push(m);
    return m;
  }

  /** Compute self-efficacy (Bandura). */
  selfEfficacy(_bandura: string, sources: { source: string; influence: number }[], beliefs: string[]): SelfEfficacy {
    const level = sources.reduce((s, src) => s + src.influence, 0) / Math.max(1, sources.length);
    return {
      level: Number(level.toFixed(2)),
      sources,
      beliefs,
    };
  }

  /** Identify mindset (Dweck). */
  mindset(growth: number, fixed: number): Mindset {
    const type: Mindset['type'] = growth > fixed ? 'growth' : 'fixed';
    return {
      type,
      beliefs: type === 'growth' ? ['effort-matters', 'intelligence-malleable'] : ['intelligence-fixed', 'effort-signals-low-ability'],
      response: type === 'growth' ? 'persistence' : 'helplessness',
    };
  }

  /** Compute zone of proximal development. */
  zoneProximalDevelopment(learner: string, task: string): { independent: number; assisted: number; zone: number } {
    return {
      independent: 0.4,
      assisted: 0.7,
      zone: 0.3,
    };
  }

  /** Design scaffolding. */
  scaffolding(learner: string, task: string, support: string[]): { scaffolds: string[]; fading: number; transfer: number } {
    return {
      scaffolds: support,
      fading: 0.2,
      transfer: 0.5,
    };
  }

  /** Design differentiated instruction. */
  differentiatedInstruction(students: { name: string; level: number }[], _content: string, _process: string, _product: string): { tiers: { tier: string; students: string[]; modifications: string[] }[] } {
    const tiers = [
      { tier: 'below-level', students: students.filter(s => s.level < 0.4).map(s => s.name), modifications: ['simplified', 'extra-practice'] },
      { tier: 'on-level', students: students.filter(s => s.level >= 0.4 && s.level < 0.7).map(s => s.name), modifications: ['standard'] },
      { tier: 'above-level', students: students.filter(s => s.level >= 0.7).map(s => s.name), modifications: ['enrichment', 'extension'] },
    ];
    return { tiers };
  }

  /** Design an assessment. */
  assessment(type: 'formative' | 'summative' | 'diagnostic' | 'authentic', purpose: string, method: string): { type: string; purpose: string; method: string; reliability: number; validity: number } {
    return {
      type,
      purpose,
      method,
      reliability: 0.85,
      validity: 0.75,
    };
  }

  /** Design feedback. */
  feedback(type: 'formative' | 'summative', timing: 'immediate' | 'delayed', specificity: number): FeedbackDescriptor {
    return {
      type,
      timing,
      specificity,
      effectiveness: Number((specificity * (timing === 'immediate' ? 0.8 : 0.6)).toFixed(2)),
    };
  }

  private _seedStyles(): void {
    const styles: LearningStyle[] = [
      { type: 'visual', preferences: ['images', 'diagrams'], strategies: ['mind-maps', 'color-coding'], strength: 0 },
      { type: 'auditory', preferences: ['lectures', 'discussions'], strategies: ['recordings', 'recitation'], strength: 0 },
      { type: 'kinesthetic', preferences: ['hands-on', 'movement'], strategies: ['role-play', 'experiments'], strength: 0 },
      { type: 'read-write', preferences: ['text', 'notes'], strategies: ['reading', 'writing-summaries'], strength: 0 },
    ];
    for (const s of styles) this._styles.set(s.type, s);
  }

  toPacket(): DataPacket<{
    styles: number;
    motivations: Motivation[];
    designs: InstructionalDesign[];
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['psychology', 'EducationalPsychology'],
      priority: 1,
      phase: 'educational-psychology',
    };
    return {
      id: `educational-psychology-${Date.now().toString(36)}-${(++this._counter).toString(36)}`,
      payload: {
        styles: this._styles.size,
        motivations: [...this._motivations],
        designs: [...this._designs],
        history: [...this._history],
      },
      metadata,
    };
  }

  reset(): void {
    this._styles.clear();
    this._motivations = [];
    this._designs = [];
    this._history = [];
    this._counter = 0;
    this._seedStyles();
  }
}

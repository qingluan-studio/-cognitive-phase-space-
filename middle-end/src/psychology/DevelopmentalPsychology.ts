import { DataPacket, PacketMeta } from '../shared/types';

/** A developmental stage descriptor. */
export interface DevelopmentalStage {
  readonly age: { min: number; max: number };
  readonly stage: string;
  readonly tasks: string[];
  readonly milestones: string[];
  readonly domain: 'physical' | 'cognitive' | 'social' | 'emotional';
}

/** An attachment descriptor. */
export interface Attachment {
  readonly type: 'secure' | 'anxious-ambivalent' | 'anxious-avoidant' | 'disorganized';
  readonly security: number;
  readonly caregiver: string;
  readonly infant: string;
}

/** A Piagetian cognitive stage. */
export interface CognitiveStage {
  readonly name: 'sensorimotor' | 'preoperational' | 'concrete-operational' | 'formal-operational';
  readonly ageRange: { min: number; max: number };
  readonly abilities: string[];
  readonly limitations: string[];
}

/** Milestone achievement. */
export interface Milestone {
  readonly age: number;
  readonly domain: string;
  readonly milestone: string;
  readonly achieved: boolean;
  readonly delay: number;
}

/** Parenting style result. */
export interface ParentingOutcome {
  readonly style: 'authoritative' | 'authoritarian' | 'permissive' | 'uninvolved';
  readonly outcome: string;
  readonly childTrait: string[];
  readonly riskFactor: number;
}

/** Temperament descriptor. */
export interface Temperament {
  readonly traits: { trait: string; level: number }[];
  readonly category: 'easy' | 'difficult' | 'slow-to-warm-up';
  readonly reactivity: number;
  readonly selfRegulation: number;
}

/**
 * DevelopmentalPsychology models Piagetian/Eriksonian stages, attachment
 * theory, moral development, and developmental milestones.
 */
export class DevelopmentalPsychology {
  private _stages: Map<string, DevelopmentalStage> = new Map();
  private _attachments: Attachment[] = [];
  private _milestones: Milestone[] = [];
  private _history: unknown[] = [];
  private _counter = 0;

  constructor() {
    this._seedStages();
  }

  get stageCount(): number { return this._stages.size; }
  get attachmentCount(): number { return this._attachments.length; }
  get milestoneCount(): number { return this._milestones.length; }

  /** Identify Piagetian stage for an age. */
  piagetStages(age: number): CognitiveStage {
    if (age < 2) return { name: 'sensorimotor', ageRange: { min: 0, max: 2 }, abilities: ['object-permanence', 'circular-reaction'], limitations: ['no-symbolic-thought'] };
    if (age < 7) return { name: 'preoperational', ageRange: { min: 2, max: 7 }, abilities: ['symbolic-thought', 'pretend-play'], limitations: ['egocentrism', 'centration'] };
    if (age < 12) return { name: 'concrete-operational', ageRange: { min: 7, max: 12 }, abilities: ['conservation', 'reversibility'], limitations: ['no-abstract-thought'] };
    return { name: 'formal-operational', ageRange: { min: 12, max: 100 }, abilities: ['abstract-reasoning', 'hypothetical-thinking'], limitations: [] };
  }

  /** Compute Vygotsky's zone of proximal development. */
  vygotskyZPD(learner: string, task: string, scaffold: string): { zone: { lower: number; upper: number }; scaffoldLevel: number; transferable: boolean } {
    return {
      zone: { lower: 0.3, upper: 0.7 },
      scaffoldLevel: 0.5,
      transferable: true,
    };
  }

  /** Identify Erikson stage for an age. */
  eriksonStages(age: number): { stage: string; crisis: string; virtue: string; resolution: string } {
    if (age < 1) return { stage: 'trust-vs-mistrust', crisis: 'basic-trust', virtue: 'hope', resolution: 'consistent-care' };
    if (age < 3) return { stage: 'autonomy-vs-shame', crisis: 'independence', virtue: 'will', resolution: 'encourage-exploration' };
    if (age < 6) return { stage: 'initiative-vs-guilt', crisis: 'purpose', virtue: 'purpose', resolution: 'allow-leadership' };
    if (age < 12) return { stage: 'industry-vs-inferiority', crisis: 'competence', virtue: 'competence', resolution: 'support-skills' };
    if (age < 20) return { stage: 'identity-vs-role-confusion', crisis: 'identity', virtue: 'fidelity', resolution: 'explore-roles' };
    if (age < 40) return { stage: 'intimacy-vs-isolation', crisis: 'relationships', virtue: 'love', resolution: 'form-bonds' };
    if (age < 65) return { stage: 'generativity-vs-stagnation', crisis: 'contribution', virtue: 'care', resolution: 'mentor-others' };
    return { stage: 'integrity-vs-despair', crisis: 'reflection', virtue: 'wisdom', resolution: 'accept-life' };
  }

  /** Classify attachment style. */
  attachmentStyle(caregiver: string, infant: string): Attachment {
    const seed = this._hash(`${caregiver}|${infant}`);
    const types: Attachment['type'][] = ['secure', 'anxious-ambivalent', 'anxious-avoidant', 'disorganized'];
    const type = types[seed % types.length];
    const security = type === 'secure' ? 0.85 : type === 'anxious-ambivalent' ? 0.4 : 0.3;
    const attachment: Attachment = { type, security, caregiver, infant };
    this._attachments.push(attachment);
    return attachment;
  }

  /** Identify Kohlberg moral development stage. */
  moralDevelopment(kohlberg: 1 | 2 | 3 | 4 | 5 | 6, _stage: string): { level: string; stage: number; reasoning: string } {
    const level = kohlberg <= 2 ? 'preconventional' : kohlberg <= 4 ? 'conventional' : 'postconventional';
    const reasoning: Record<number, string> = {
      1: 'obedience-punishment',
      2: 'individualism-exchange',
      3: 'good-interpersonal',
      4: 'law-order',
      5: 'social-contract',
      6: 'universal-ethics',
    };
    return { level, stage: kohlberg, reasoning: reasoning[kohlberg] };
  }

  /** Estimate language development milestones for an age. */
  languageDevelopment(age: number): { words: number; sentences: number; grammar: boolean; complexity: number } {
    const words = age < 1 ? 5 : age < 2 ? 50 : age < 3 ? 200 : age < 5 ? 1000 : 2500;
    return {
      words,
      sentences: age < 2 ? 0 : age < 3 ? 2 : age < 5 ? 5 : 8,
      grammar: age >= 3,
      complexity: Math.min(1, age / 6),
    };
  }

  /** Estimate motor development milestones for an age. */
  motorDevelopment(age: number): { gross: string[]; fine: string[]; milestone: string } {
    if (age < 1) return { gross: ['head-control', 'sitting'], fine: ['grasp'], milestone: 'sitting-independently' };
    if (age < 2) return { gross: ['walking', 'running'], fine: ['pincer-grasp'], milestone: 'independent-walking' };
    if (age < 5) return { gross: ['jumping', 'balancing'], fine: ['drawing', 'using-utensils'], milestone: 'stairs-alternating-feet' };
    return { gross: ['skipping', 'bicycle'], fine: ['writing', 'tying-shoes'], milestone: 'complex-motor-skills' };
  }

  /** Estimate social development for an age. */
  socialDevelopment(age: number): { play: string; relationships: string; theory: boolean } {
    if (age < 2) return { play: 'solitary', relationships: 'caregiver', theory: false };
    if (age < 4) return { play: 'parallel', relationships: 'family', theory: false };
    if (age < 7) return { play: 'associative', relationships: 'peers', theory: true };
    return { play: 'cooperative', relationships: 'friends', theory: true };
  }

  /** Estimate cognitive development for an age and stage. */
  cognitiveDevelopment(age: number, _stage: string): { piaget: string; abilities: string[] } {
    const piaget = this.piagetStages(age);
    return { piaget: piaget.name, abilities: piaget.abilities };
  }

  /** Assess emotional regulation at an age. */
  emotionalRegulation(age: number): { strategy: string; capacity: number; supportNeeded: boolean } {
    if (age < 3) return { strategy: 'caregiver-co-regulation', capacity: 0.2, supportNeeded: true };
    if (age < 7) return { strategy: 'behavioral-strategies', capacity: 0.4, supportNeeded: true };
    if (age < 12) return { strategy: 'cognitive-strategies', capacity: 0.6, supportNeeded: false };
    return { strategy: 'mature-coping', capacity: 0.8, supportNeeded: false };
  }

  /** Assess adolescent identity formation. */
  identityFormation(adolescent: string): { status: string; exploration: number; commitment: number } {
    const statuses = ['diffusion', 'foreclosure', 'moratorium', 'achievement'];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    return {
      status,
      exploration: status === 'moratorium' || status === 'achievement' ? 0.8 : 0.3,
      commitment: status === 'foreclosure' || status === 'achievement' ? 0.7 : 0.2,
    };
  }

  /** Predict outcome of a parenting style. */
  parentingStyle(style: ParentingOutcome['style'], _outcome: string): ParentingOutcome {
    const outcomes: Record<ParentingOutcome['style'], { outcome: string; traits: string[]; risk: number }> = {
      authoritative: { outcome: 'socially-competent', traits: ['self-reliant', 'cooperative'], risk: 0.1 },
      authoritarian: { outcome: 'obedient-anxious', traits: ['compliant', 'low-self-esteem'], risk: 0.4 },
      permissive: { outcome: 'impulsive', traits: ['demanding', 'low-self-control'], risk: 0.5 },
      uninvolved: { outcome: 'insecure', traits: ['avoidant', 'low-competence'], risk: 0.7 },
    };
    const entry = outcomes[style];
    return {
      style,
      outcome: entry.outcome,
      childTrait: entry.traits,
      riskFactor: entry.risk,
    };
  }

  /** Identify infant temperament. */
  temperament(_infant: string, traits: { trait: string; level: number }[]): Temperament {
    const reactivity = traits.filter(t => t.trait.includes('reactivity')).reduce((s, t) => s + t.level, 0);
    const selfRegulation = traits.filter(t => t.trait.includes('regulation')).reduce((s, t) => s + t.level, 0);
    const category: Temperament['category'] = reactivity > 0.7 ? 'difficult' : reactivity < 0.3 ? 'easy' : 'slow-to-warm-up';
    return { traits, category, reactivity: Number(reactivity.toFixed(2)), selfRegulation: Number(selfRegulation.toFixed(2)) };
  }

  /** Assess achievement of a milestone at an age in a domain. */
  developmentalMilestone(age: number, domain: string): Milestone {
    const expected: Record<string, number> = { motor: 1, language: 1.5, social: 2, cognitive: 3 };
    const expectedAge = expected[domain] ?? 2;
    const achieved = age >= expectedAge;
    const m: Milestone = {
      age,
      domain,
      milestone: `${domain}-milestone`,
      achieved,
      delay: achieved ? 0 : expectedAge - age,
    };
    this._milestones.push(m);
    return m;
  }

  private _hash(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  private _seedStages(): void {
    const stages: DevelopmentalStage[] = [
      { age: { min: 0, max: 2 }, stage: 'infant', tasks: ['trust', 'attachment'], milestones: ['sitting', 'walking'], domain: 'physical' },
      { age: { min: 2, max: 6 }, stage: 'early-childhood', tasks: ['autonomy', 'initiative'], milestones: ['language', 'pretend-play'], domain: 'cognitive' },
      { age: { min: 6, max: 12 }, stage: 'middle-childhood', tasks: ['industry'], milestones: ['literacy', 'friendship'], domain: 'social' },
      { age: { min: 12, max: 20 }, stage: 'adolescence', tasks: ['identity'], milestones: ['abstract-thinking', 'puberty'], domain: 'emotional' },
    ];
    for (const s of stages) this._stages.set(s.stage, s);
  }

  toPacket(): DataPacket<{
    stages: number;
    attachments: Attachment[];
    milestones: Milestone[];
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['psychology', 'DevelopmentalPsychology'],
      priority: 1,
      phase: 'developmental-psychology',
    };
    return {
      id: `developmental-psychology-${Date.now().toString(36)}-${(++this._counter).toString(36)}`,
      payload: {
        stages: this._stages.size,
        attachments: [...this._attachments],
        milestones: [...this._milestones],
        history: [...this._history],
      },
      metadata,
    };
  }

  reset(): void {
    this._stages.clear();
    this._attachments = [];
    this._milestones = [];
    this._history = [];
    this._counter = 0;
    this._seedStages();
  }
}

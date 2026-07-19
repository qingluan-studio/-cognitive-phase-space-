import { DataPacket, PacketMeta } from '../shared/types';

/** A personality trait descriptor. */
export interface Trait {
  readonly name: string;
  readonly pole: string;
  readonly description: string;
  readonly score: number;
}

/** A personality model descriptor. */
export interface PersonalityModel {
  readonly name: 'big-five' | 'mbti' | 'enneagram' | 'hexaco' | 'dark-triad';
  readonly dimensions: { name: string; score: number }[];
}

/** A personality test descriptor. */
export interface PersonalityTest {
  readonly name: string;
  readonly scales: string[];
  readonly items: number;
  readonly reliability: number;
}

/** Big Five result. */
export interface BigFiveResult {
  readonly openness: number;
  readonly conscientiousness: number;
  readonly extraversion: number;
  readonly agreeableness: number;
  readonly neuroticism: number;
  readonly profile: string;
}

/** MBTI result. */
export interface MBTIResult {
  readonly type: string;
  readonly functions: { function: string; attitude: string }[];
  readonly description: string;
}

/** Enneagram result. */
export interface EnneagramResult {
  readonly type: number;
  readonly wing: number;
  readonly level: number;
  readonly description: string;
}

/** Projective test result. */
export interface ProjectiveResult {
  readonly test: 'rorschach' | 'tat' | 'draw-a-person';
  readonly response: string;
  readonly interpretation: string;
}

/**
 * PersonalityPsychology implements Big Five, MBTI, Enneagram, HEXACO, dark
 * triad, projective tests, and trait-heritability modeling.
 */
export class PersonalityPsychology {
  private _traits: Map<string, Trait> = new Map();
  private _models: PersonalityModel[] = [];
  private _tests: PersonalityTest[] = [];
  private _history: unknown[] = [];
  private _counter = 0;

  constructor() {
    this._seedTraits();
  }

  get traitCount(): number { return this._traits.size; }
  get modelCount(): number { return this._models.length; }
  get testCount(): number { return this._tests.length; }

  /** Compute Big Five profile. */
  bigFive(openness: number, conscientiousness: number, extraversion: number, agreeableness: number, neuroticism: number): BigFiveResult {
    const profile = extraversion > 0.5 && openness > 0.5 ? 'explorer'
      : conscientiousness > 0.7 ? 'achiever'
        : agreeableness > 0.7 ? 'harmonizer'
          : 'individualist';
    const result: BigFiveResult = {
      openness,
      conscientiousness,
      extraversion,
      agreeableness,
      neuroticism,
      profile,
    };
    this._models.push({
      name: 'big-five',
      dimensions: [
        { name: 'openness', score: openness },
        { name: 'conscientiousness', score: conscientiousness },
        { name: 'extraversion', score: extraversion },
        { name: 'agreeableness', score: agreeableness },
        { name: 'neuroticism', score: neuroticism },
      ],
    });
    this._history.push({ op: 'bigFive', profile });
    return result;
  }

  /** Compute MBTI type. */
  mbti(type: string, functions: string[]): MBTIResult {
    const descriptions: Record<string, string> = {
      INTJ: 'architect-strategic',
      INTP: 'logician-analytical',
      ENTJ: 'commander-leader',
      ENTP: 'debater-innovator',
      INFJ: 'advocate-idealistic',
      INFP: 'mediator-healer',
      ENFJ: 'protagonist-mentor',
      ENFP: 'campaigner-enthusiast',
      ISTJ: 'logistician-duty',
      ISFJ: 'defender-protector',
      ESTJ: 'executive-organizer',
      ESFJ: 'consul-caregiver',
      ISTP: 'virtuoso-craftsman',
      ISFP: 'adventurer-artist',
      ESTP: 'entrepreneur-dynamo',
      ESFP: 'entertainer-performer',
    };
    return {
      type,
      functions: functions.map(f => ({
        function: f,
        attitude: f.startsWith('E') || f.startsWith('I') ? f.substring(0, 1) : 'X',
      })),
      description: descriptions[type] ?? 'unknown-type',
    };
  }

  /** Compute Enneagram type. */
  enneagram(type: number, wing: number, levels: number): EnneagramResult {
    const descriptions: Record<number, string> = {
      1: 'reformer-perfectionist',
      2: 'helper-giver',
      3: 'achiever-performer',
      4: 'individualist-romantic',
      5: 'investigator-observer',
      6: 'loyalist-skeptic',
      7: 'enthusiast-epicure',
      8: 'challenger-protector',
      9: 'peacemaker-mediator',
    };
    return {
      type,
      wing,
      level: levels,
      description: descriptions[type] ?? 'unknown-type',
    };
  }

  /** Compute HEXACO profile. */
  hexaco(dimensions: { honestyHumility: number; emotionality: number; extraversion: number; agreeableness: number; conscientiousness: number; openness: number }): PersonalityModel {
    const model: PersonalityModel = {
      name: 'hexaco',
      dimensions: [
        { name: 'honesty-humility', score: dimensions.honestyHumility },
        { name: 'emotionality', score: dimensions.emotionality },
        { name: 'extraversion', score: dimensions.extraversion },
        { name: 'agreeableness', score: dimensions.agreeableness },
        { name: 'conscientiousness', score: dimensions.conscientiousness },
        { name: 'openness', score: dimensions.openness },
      ],
    };
    this._models.push(model);
    return model;
  }

  /** Compute Dark Triad profile. */
  darkTriad(narcissism: number, machiavellianism: number, psychopathy: number): { narcissism: number; machiavellianism: number; psychopathy: number; total: number; riskLevel: string } {
    const total = (narcissism + machiavellianism + psychopathy) / 3;
    return {
      narcissism,
      machiavellianism,
      psychopathy,
      total: Number(total.toFixed(2)),
      riskLevel: total > 0.7 ? 'high' : total > 0.4 ? 'moderate' : 'low',
    };
  }

  /** Assess trait consistency across situations. */
  traitConsistency(trait: string, situations: string[]): { consistency: number; crossSituational: number; variability: number } {
    return {
      consistency: 0.65,
      crossSituational: 0.6,
      variability: 0.4,
    };
  }

  /** Estimate trait heritability from twin studies. */
  heritability(trait: string, _twinStudies: number): { heritability: number; sharedEnvironment: number; nonSharedEnvironment: number } {
    return {
      heritability: 0.45,
      sharedEnvironment: 0.1,
      nonSharedEnvironment: 0.45,
    };
  }

  /** Assess personality stability over age. */
  personalityStability(trait: string, age: number): { stability: number; rankOrder: number; meanLevel: number } {
    return {
      stability: age > 30 ? 0.7 : 0.5,
      rankOrder: 0.6,
      meanLevel: 0.4,
    };
  }

  /** Assess personality change from intervention. */
  personalityChange(intervention: 'therapy' | 'meditation' | 'life-event', trait: string): { change: number; direction: 'increase' | 'decrease' | 'stable'; permanence: number } {
    return {
      change: 0.15,
      direction: 'increase',
      permanence: 0.5,
    };
  }

  /** Identify personality disorder from traits. */
  personalityDisorder(trait: string, cluster: 'A' | 'B' | 'C', _maladaptive: boolean): { disorder: string; cluster: string; traits: string[]; impairment: number } {
    const clusterMap: Record<typeof cluster, string[]> = {
      A: ['paranoid', 'schizoid', 'schizotypal'],
      B: ['borderline', 'narcissistic', 'antisocial', 'histrionic'],
      C: ['avoidant', 'dependent', 'obsessive-compulsive'],
    };
    const disorders = clusterMap[cluster];
    return {
      disorder: disorders[0],
      cluster,
      traits: [trait],
      impairment: 0.6,
    };
  }

  /** Interpret a projective test response. */
  projectiveTest(type: ProjectiveResult['test'], response: string, _interpretation: string): ProjectiveResult {
    const interpretations: Record<typeof type, string> = {
      rorschach: 'content-and-form-analysis',
      tat: 'thematic-content-analysis',
      'draw-a-person': 'projected-self-image',
    };
    return {
      test: type,
      response,
      interpretation: interpretations[type],
    };
  }

  private _seedTraits(): void {
    const traits: Trait[] = [
      { name: 'openness', pole: 'open-closed', description: 'openness to experience', score: 0 },
      { name: 'conscientiousness', pole: 'organized-careless', description: 'self-discipline', score: 0 },
      { name: 'extraversion', pole: 'outgoing-reserved', description: 'sociability', score: 0 },
      { name: 'agreeableness', pole: 'cooperative-antagonistic', description: 'interpersonal orientation', score: 0 },
      { name: 'neuroticism', pole: 'sensitive-resilient', description: 'emotional stability', score: 0 },
    ];
    for (const t of traits) this._traits.set(t.name, t);
  }

  toPacket(): DataPacket<{
    traits: number;
    models: PersonalityModel[];
    tests: PersonalityTest[];
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['psychology', 'PersonalityPsychology'],
      priority: 1,
      phase: 'personality-psychology',
    };
    return {
      id: `personality-psychology-${Date.now().toString(36)}-${(++this._counter).toString(36)}`,
      payload: {
        traits: this._traits.size,
        models: [...this._models],
        tests: [...this._tests],
        history: [...this._history],
      },
      metadata,
    };
  }

  reset(): void {
    this._traits.clear();
    this._models = [];
    this._tests = [];
    this._history = [];
    this._counter = 0;
    this._seedTraits();
  }
}

import { DataPacket, PacketMeta } from '../shared/types';

/** Wellbeing descriptor. */
export interface Wellbeing {
  readonly hedonic: number;
  readonly eudaimonic: number;
  readonly social: number;
  readonly overall: number;
}

/** A character strength. */
export interface Strength {
  readonly name: string;
  readonly category: 'wisdom' | 'courage' | 'humanity' | 'justice' | 'temperance' | 'transcendence';
  readonly description: string;
  readonly score: number;
}

/** Flow state descriptor. */
export interface Flow {
  readonly activity: string;
  readonly challenge: number;
  readonly skill: number;
  readonly inFlow: boolean;
  readonly duration: number;
}

/** PERMA wellbeing model. */
export interface Perma {
  readonly positiveEmotion: number;
  readonly engagement: number;
  readonly relationships: number;
  readonly meaning: number;
  readonly accomplishment: number;
  readonly total: number;
}

/** Resilience profile. */
export interface ResilienceProfile {
  readonly factors: { factor: string; level: number }[];
  readonly outcomes: string[];
  readonly protectiveFactors: string[];
  readonly riskFactors: string[];
}

/** Post-traumatic growth. */
export interface PostTraumaticGrowth {
  readonly trauma: string;
  readonly growth: number;
  readonly domains: { domain: string; change: number }[];
}

/** Hope profile. */
export interface HopeProfile {
  readonly goals: string[];
  readonly pathways: number;
  readonly agency: number;
  readonly total: number;
}

/**
 * PositivePsychology measures wellbeing (PERMA), character strengths,
 * gratitude, flow, meaning, resilience, and post-traumatic growth.
 */
export class PositivePsychology {
  private _wellbeing: Wellbeing | null = null;
  private _strengths: Map<string, Strength> = new Map();
  private _flows: Flow[] = [];
  private _history: unknown[] = [];
  private _counter = 0;

  constructor() {
    this._seedStrengths();
  }

  get hasWellbeing(): boolean { return this._wellbeing !== null; }
  get strengthCount(): number { return this._strengths.size; }
  get flowCount(): number { return this._flows.length; }

  /** Compute happiness set-point. */
  happinessSet(genetic: number, circumstances: number, intentional: number): { total: number; geneticPct: number; circumstancesPct: number; intentionalPct: number } {
    const total = genetic * 0.5 + circumstances * 0.1 + intentional * 0.4;
    return {
      total: Number(total.toFixed(2)),
      geneticPct: 50,
      circumstancesPct: 10,
      intentionalPct: 40,
    };
  }

  /** Measure wellbeing using PERMA model. */
  wellbeingMeasure(perma: Perma, _scale: 1 | 2 | 3 | 4 | 5): Perma {
    const total = (perma.positiveEmotion + perma.engagement + perma.relationships + perma.meaning + perma.accomplishment) / 5;
    return { ...perma, total: Number(total.toFixed(2)) };
  }

  /** Survey character strengths. */
  characterStrengths(survey: { name: string; score: number }[]): Strength[] {
    return survey.map(s => {
      const existing = this._strengths.get(s.name);
      return {
        name: s.name,
        category: existing?.category ?? 'wisdom',
        description: existing?.description ?? 'character-strength',
        score: s.score,
      };
    }).sort((a, b) => b.score - a.score);
  }

  /** Practice gratitude. */
  gratitude(practice: 'journaling' | 'visit' | 'count-blessings', frequency: number, _outcome: string): { effect: number; adherence: number; wellbeingBoost: number } {
    const effect = frequency / 7;
    return {
      effect: Number(effect.toFixed(2)),
      adherence: 0.7,
      wellbeingBoost: Number((effect * 0.3).toFixed(2)),
    };
  }

  /** Practice savoring. */
  savoring(experience: string, technique: 'anticipation' | 'present-moment' | 'reminiscence'): { intensity: number; duration: number; technique: string } {
    return {
      intensity: 0.7,
      duration: technique === 'reminiscence' ? 60 : technique === 'anticipation' ? 30 : 15,
      technique,
    };
  }

  /** Practice mindfulness. */
  mindfulness(practice: 'breathing' | 'body-scan' | 'meditation', duration: number, _benefits: string[]): { stressReduction: number; focus: number; wellbeing: number } {
    return {
      stressReduction: Number((duration / 30 * 0.4).toFixed(2)),
      focus: Number((duration / 30 * 0.3).toFixed(2)),
      wellbeing: Number((duration / 30 * 0.3).toFixed(2)),
    };
  }

  /** Compute flow state. */
  flow(activity: string, challenge: number, skill: number): Flow {
    const inFlow = Math.abs(challenge - skill) < 0.2 && challenge > 0.5;
    const f: Flow = {
      activity,
      challenge,
      skill,
      inFlow,
      duration: inFlow ? 45 : 15,
    };
    this._flows.push(f);
    this._history.push({ op: 'flow', inFlow });
    return f;
  }

  /** Compute meaning in life. */
  meaning(purpose: number, coherence: number, significance: number): { total: number; purpose: number; coherence: number; significance: number } {
    return {
      total: Number(((purpose + coherence + significance) / 3).toFixed(2)),
      purpose,
      coherence,
      significance,
    };
  }

  /** Compute resilience profile. */
  resilience(_adversity: string, factors: { factor: string; level: number }[], outcomes: string[]): ResilienceProfile {
    return {
      factors,
      outcomes,
      protectiveFactors: ['social-support', 'optimism', 'coping-skills', 'self-efficacy'],
      riskFactors: ['isolation', 'pessimism', 'avoidant-coping'],
    };
  }

  /** Compute post-traumatic growth. */
  postTraumaticGrowth(trauma: string, _growth: number, domains: string[]): PostTraumaticGrowth {
    return {
      trauma,
      growth: 0.45,
      domains: domains.map(d => ({ domain: d, change: Number((Math.random() * 0.5 + 0.2).toFixed(2)) })),
    };
  }

  /** Compute hope (Snyder theory). */
  hope(goals: string[], pathways: number, agency: number): HopeProfile {
    return {
      goals,
      pathways: Number(pathways.toFixed(2)),
      agency: Number(agency.toFixed(2)),
      total: Number(((pathways + agency) / 2).toFixed(2)),
    };
  }

  /** Compute optimism (explanatory style). */
  optimism(attribution: { permanent: number; pervasive: number; personal: number }, _explanatory: string): { score: number; style: 'optimistic' | 'pessimistic'; attribution: string } {
    const score = 1 - (attribution.permanent + attribution.pervasive + attribution.personal) / 3;
    return {
      score: Number(score.toFixed(2)),
      style: score > 0.5 ? 'optimistic' : 'pessimistic',
      attribution: 'explanatory-style',
    };
  }

  /** Assess positive relationships. */
  positiveRelationships(trust: number, intimacy: number, support: number): { total: number; security: number; satisfaction: number } {
    return {
      total: Number(((trust + intimacy + support) / 3).toFixed(2)),
      security: trust,
      satisfaction: Number(((trust + support) / 2).toFixed(2)),
    };
  }

  /** Set overall wellbeing. */
  setWellbeing(w: Wellbeing): void {
    this._wellbeing = { ...w, overall: Number(((w.hedonic + w.eudaimonic + w.social) / 3).toFixed(2)) };
  }

  private _seedStrengths(): void {
    const strengths: Strength[] = [
      { name: 'creativity', category: 'wisdom', description: 'thinking of novel ways', score: 0 },
      { name: 'curiosity', category: 'wisdom', description: 'taking interest', score: 0 },
      { name: 'bravery', category: 'courage', description: 'facing threats', score: 0 },
      { name: 'love', category: 'humanity', description: 'valuing close relations', score: 0 },
      { name: 'fairness', category: 'justice', description: 'treating people equally', score: 0 },
      { name: 'forgiveness', category: 'temperance', description: 'forgiving wrongs', score: 0 },
      { name: 'gratitude', category: 'transcendence', description: 'being aware of blessings', score: 0 },
      { name: 'hope', category: 'transcendence', description: 'expecting the best', score: 0 },
    ];
    for (const s of strengths) this._strengths.set(s.name, s);
  }

  toPacket(): DataPacket<{
    wellbeing: Wellbeing | null;
    strengths: number;
    flows: Flow[];
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['psychology', 'PositivePsychology'],
      priority: 1,
      phase: 'positive-psychology',
    };
    return {
      id: `positive-psychology-${Date.now().toString(36)}-${(++this._counter).toString(36)}`,
      payload: {
        wellbeing: this._wellbeing,
        strengths: this._strengths.size,
        flows: [...this._flows],
        history: [...this._history],
      },
      metadata,
    };
  }

  reset(): void {
    this._wellbeing = null;
    this._strengths.clear();
    this._flows = [];
    this._history = [];
    this._counter = 0;
    this._seedStrengths();
  }
}

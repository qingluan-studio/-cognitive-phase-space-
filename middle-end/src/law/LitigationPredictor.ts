import { DataPacket, PacketMeta } from '../shared/types';

/** A litigation outcome prediction. */
export interface LitigationOutcome {
  readonly caseId: string;
  readonly likelihood: number;
  readonly factors: { factor: string; weight: number }[];
  readonly recommendation: 'proceed' | 'settle' | 'drop' | 'appeal';
  readonly expectedValue: number;
}

/** A judge profile. */
export interface JudgeProfile {
  readonly name: string;
  readonly tendencies: { favors: string; strength: number }[];
  readonly rulings: number;
  readonly reversalRate: number;
  readonly sentencingStyle?: 'lenient' | 'moderate' | 'strict';
}

/** A trial strategy. */
export interface TrialStrategy {
  readonly caseId: string;
  readonly theory: string;
  readonly keyEvidence: string[];
  readonly witnessOrder: string[];
  readonly risks: string[];
  readonly estimateDuration: number;
}

/** Venue analysis. */
export interface VenueAnalysis {
  readonly court: string;
  readonly caseType: string;
  readonly winRate: number;
  readonly avgDuration: number;
  readonly avgDamages: number;
  readonly favorable: boolean;
}

/** Settlement value estimate. */
export interface SettlementValue {
  readonly claim: number;
  readonly probability: number;
  readonly costs: number;
  readonly expectedValue: number;
  readonly settlementRange: { low: number; high: number };
}

/** Jury profile. */
export interface JuryProfile {
  readonly demographics: { age: number; gender: string; occupation: string }[];
  readonly tendencies: { favors: string; strength: number }[];
  readonly predictability: number;
}

/**
 * LitigationPredictor estimates case outcomes, settlement values, judge/venue
 * effects, and trial strategies.
 */
export class LitigationPredictor {
  private _outcomes: LitigationOutcome[] = [];
  private _judges: Map<string, JudgeProfile> = new Map();
  private _strategies: TrialStrategy[] = [];
  private _history: unknown[] = [];
  private _counter = 0;

  constructor() {
    this._seedJudges();
  }

  get outcomeCount(): number { return this._outcomes.length; }
  get judgeCount(): number { return this._judges.size; }
  get strategyCount(): number { return this._strategies.length; }

  /** Predict outcome likelihood given case factors. */
  predictOutcome(caseId: string, factors: { factor: string; weight: number }[]): LitigationOutcome {
    const totalWeight = factors.reduce((s, f) => s + Math.abs(f.weight), 0);
    const positiveWeight = factors.filter(f => f.weight > 0).reduce((s, f) => s + f.weight, 0);
    const likelihood = totalWeight > 0 ? positiveWeight / totalWeight : 0.5;
    const expectedValue = likelihood * 100000;
    const recommendation: LitigationOutcome['recommendation'] = likelihood > 0.7 ? 'proceed' : likelihood > 0.4 ? 'settle' : likelihood > 0.2 ? 'appeal' : 'drop';
    const outcome: LitigationOutcome = {
      caseId,
      likelihood: Number(likelihood.toFixed(2)),
      factors,
      recommendation,
      expectedValue,
    };
    this._outcomes.push(outcome);
    this._history.push({ op: 'predictOutcome', caseId, likelihood });
    return outcome;
  }

  /** Assess strength of claims given evidence. */
  assessStrength(claims: string[], evidence: string[]): { strength: number; missing: string[] } {
    const missing = claims.filter(c => !evidence.some(e => e.includes(c)));
    const strength = (claims.length - missing.length) / Math.max(1, claims.length);
    return { strength: Number(strength.toFixed(2)), missing };
  }

  /** Estimate damages from claim and precedent. */
  estimateDamages(claim: number, precedent: number): { estimate: number; range: { low: number; high: number }; confidence: number } {
    const estimate = (claim + precedent) / 2;
    return {
      estimate,
      range: { low: Math.min(claim, precedent), high: Math.max(claim, precedent) },
      confidence: 0.65,
    };
  }

  /** Estimate case duration in court. */
  estimateDuration(caseId: string, court: string): { days: number; phases: { name: string; days: number }[] } {
    const phases = [
      { name: 'discovery', days: 180 },
      { name: 'pretrial', days: 60 },
      { name: 'trial', days: 7 },
      { name: 'post-trial', days: 30 },
    ];
    return { days: phases.reduce((s, p) => s + p.days, 0), phases };
  }

  /** Look up or build a judge profile. */
  judgeProfile(judgeName: string): JudgeProfile {
    const existing = this._judges.get(judgeName.toLowerCase());
    if (existing) return existing;
    const profile: JudgeProfile = {
      name: judgeName,
      tendencies: [
        { favors: 'plaintiff', strength: 0.5 },
        { favors: 'prosecution', strength: 0.6 },
      ],
      rulings: 100,
      reversalRate: 0.15,
      sentencingStyle: 'moderate',
    };
    this._judges.set(judgeName.toLowerCase(), profile);
    return profile;
  }

  /** Analyze a venue's characteristics. */
  venueAnalysis(court: string, caseType: string): VenueAnalysis {
    const winRate = 0.4 + Math.random() * 0.3;
    const avgDuration = 200 + Math.floor(Math.random() * 100);
    const avgDamages = 50000 + Math.floor(Math.random() * 200000);
    return {
      court,
      caseType,
      winRate: Number(winRate.toFixed(2)),
      avgDuration,
      avgDamages,
      favorable: winRate > 0.5,
    };
  }

  /** Estimate settlement value. */
  settlementValue(claim: number, probability: number, costs: number): SettlementValue {
    const expectedValue = claim * probability - costs;
    return {
      claim,
      probability,
      costs,
      expectedValue,
      settlementRange: { low: expectedValue * 0.7, high: expectedValue * 1.3 },
    };
  }

  /** Build a trial strategy. */
  trialStrategy(caseId: string, opponent: string, judge: string): TrialStrategy {
    const profile = this.judgeProfile(judge);
    const strategy: TrialStrategy = {
      caseId,
      theory: `theory-based-on-${profile.tendencies[0]?.favors}-lean`,
      keyEvidence: ['document-1', 'witness-1'],
      witnessOrder: ['expert', 'fact', 'character'],
      risks: ['cross-examination', 'jury-bias'],
      estimateDuration: 7,
    };
    this._strategies.push(strategy);
    this._history.push({ op: 'trialStrategy', caseId });
    return strategy;
  }

  /** Estimate probability of successful appeal. */
  appealProbability(outcome: LitigationOutcome): number {
    const base = outcome.likelihood < 0.3 ? 0.35 : 0.15;
    return Number(base.toFixed(2));
  }

  /** Build a jury profile from demographics. */
  juryProfile(demographics: { age: number; gender: string; occupation: string }[], tendencies?: { favors: string; strength: number }[]): JuryProfile {
    return {
      demographics,
      tendencies: tendencies ?? [{ favors: 'plaintiff', strength: 0.5 }],
      predictability: 0.6,
    };
  }

  /** Estimate litigation cost. */
  litigationCost(caseId: string, duration: number): { total: number; breakdown: { category: string; amount: number }[] } {
    const breakdown = [
      { category: 'attorney-fees', amount: duration * 500 },
      { category: 'filing-fees', amount: 500 },
      { category: 'expert-witnesses', amount: 20000 },
      { category: 'discovery', amount: 15000 },
    ];
    return { total: breakdown.reduce((s, b) => s + b.amount, 0), breakdown };
  }

  private _seedJudges(): void {
    const judges: JudgeProfile[] = [
      { name: 'smith', tendencies: [{ favors: 'plaintiff', strength: 0.6 }], rulings: 200, reversalRate: 0.1, sentencingStyle: 'moderate' },
      { name: 'jones', tendencies: [{ favors: 'defendant', strength: 0.7 }], rulings: 150, reversalRate: 0.2, sentencingStyle: 'strict' },
    ];
    for (const j of judges) this._judges.set(j.name, j);
  }

  toPacket(): DataPacket<{
    outcomes: LitigationOutcome[];
    judges: number;
    strategies: TrialStrategy[];
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['law', 'LitigationPredictor'],
      priority: 1,
      phase: 'litigation-prediction',
    };
    return {
      id: `litigation-predictor-${Date.now().toString(36)}-${(++this._counter).toString(36)}`,
      payload: {
        outcomes: [...this._outcomes],
        judges: this._judges.size,
        strategies: [...this._strategies],
        history: [...this._history],
      },
      metadata,
    };
  }

  reset(): void {
    this._outcomes = [];
    this._judges.clear();
    this._strategies = [];
    this._history = [];
    this._counter = 0;
    this._seedJudges();
  }
}

import { DataPacket, PacketMeta } from '../shared/types';

/** An outbreak record. */
export interface Outbreak {
  readonly id: string;
  readonly disease: string;
  readonly location: string;
  readonly time: number;
  readonly cases: number;
  readonly deaths: number;
  readonly status: 'active' | 'contained' | 'resolved';
}

/** Epidemiological study design. */
export interface StudyDesign {
  readonly type: 'cohort' | 'case-control' | 'cross-sectional' | 'rct' | 'ecological';
  readonly participants: number;
  readonly duration: number;
  readonly exposure?: string;
  readonly outcome?: string;
}

/** A risk factor descriptor. */
export interface RiskFactor {
  readonly factor: string;
  readonly strength: 'weak' | 'moderate' | 'strong';
  readonly exposureType: string;
  readonly outcome: string;
}

/** Surveillance record. */
export interface Surveillance {
  readonly disease: string;
  readonly region: string;
  readonly period: number;
  readonly cases: number;
  readonly trend: 'increasing' | 'stable' | 'decreasing';
}

/** Relative risk result. */
export interface RiskResult {
  readonly rr: number;
  readonly or: number;
  readonly ar: number;
  readonly confidence: number;
}

/** Herd immunity estimate. */
export interface HerdImmunity {
  readonly r0: number;
  readonly threshold: number;
  readonly efficacy: number;
  readonly coverage: number;
  readonly sufficient: boolean;
}

/**
 * Epidemiology computes incidence/prevalence, risk ratios, study design,
 * and outbreak surveillance metrics.
 */
export class Epidemiology {
  private _outbreaks: Outbreak[] = [];
  private _studies: StudyDesign[] = [];
  private _riskFactors: RiskFactor[] = [];
  private _history: unknown[] = [];
  private _counter = 0;

  get outbreakCount(): number { return this._outbreaks.length; }
  get studyCount(): number { return this._studies.length; }
  get riskFactorCount(): number { return this._riskFactors.length; }

  /** Compute incidence rate (new cases per population-time). */
  incidence(population: number, newCases: number, time: number): { rate: number; per: string } {
    const rate = population > 0 && time > 0 ? newCases / (population * time) : 0;
    this._history.push({ op: 'incidence', newCases, population, time });
    return { rate: Number(rate.toFixed(6)), per: 'person-time' };
  }

  /** Compute point prevalence. */
  prevalence(population: number, cases: number): { proportion: number; per: string } {
    const proportion = population > 0 ? cases / population : 0;
    return { proportion: Number(proportion.toFixed(4)), per: 'population' };
  }

  /** Compute crude mortality rate. */
  mortalityRate(deaths: number, population: number): { rate: number; per: string } {
    const rate = population > 0 ? deaths / population : 0;
    return { rate: Number(rate.toFixed(6)), per: 'population' };
  }

  /** Compute case-fatality rate. */
  caseFatality(deaths: number, cases: number): number {
    if (cases === 0) return 0;
    return Number(((deaths / cases) * 100).toFixed(2));
  }

  /** Compute relative risk from exposed vs unexposed. */
  relativeRisk(exposed: { cases: number; total: number }, unexposed: { cases: number; total: number }): RiskResult {
    const ie = exposed.total > 0 ? exposed.cases / exposed.total : 0;
    const iu = unexposed.total > 0 ? unexposed.cases / unexposed.total : 0;
    const rr = iu > 0 ? ie / iu : 0;
    const ar = ie - iu;
    const or = this._oddsRatio(exposed.cases, exposed.total - exposed.cases, unexposed.cases, unexposed.total - unexposed.cases);
    return { rr: Number(rr.toFixed(3)), or: Number(or.toFixed(3)), ar: Number(ar.toFixed(4)), confidence: 0.95 };
  }

  /** Compute odds ratio from a 2x2 table. */
  oddsRatio(cases: number, controls: number, exposed: number, unexposed: number): RiskResult {
    const a = cases; const b = controls; const c = exposed; const d = unexposed;
    const or = b * c > 0 ? (a * d) / (b * c) : 0;
    return { rr: Number(or.toFixed(3)), or: Number(or.toFixed(3)), ar: 0, confidence: 0.95 };
  }

  /** Compute attributable risk among exposed. */
  attributableRisk(exposed: { cases: number; total: number }, unexposed: { cases: number; total: number }): { ar: number; arp: number } {
    const ie = exposed.total > 0 ? exposed.cases / exposed.total : 0;
    const iu = unexposed.total > 0 ? unexposed.cases / unexposed.total : 0;
    const ar = ie - iu;
    const arp = ie > 0 ? ar / ie : 0;
    return { ar: Number(ar.toFixed(4)), arp: Number(arp.toFixed(3)) };
  }

  /** Design a cohort study. */
  cohort(study: { exposure: string; outcome: string; participants: number }, followUp: number): StudyDesign {
    const design: StudyDesign = {
      type: 'cohort',
      participants: study.participants,
      duration: followUp,
      exposure: study.exposure,
      outcome: study.outcome,
    };
    this._studies.push(design);
    this._history.push({ op: 'cohort', exposure: study.exposure });
    return design;
  }

  /** Design a case-control study. */
  caseControl(cases: number, controls: number): StudyDesign {
    const design: StudyDesign = {
      type: 'case-control',
      participants: cases + controls,
      duration: 0,
    };
    this._studies.push(design);
    return design;
  }

  /** Design a cross-sectional study. */
  crossSectional(population: number, exposure: string, outcome: string): StudyDesign {
    const design: StudyDesign = {
      type: 'cross-sectional',
      participants: population,
      duration: 0,
      exposure,
      outcome,
    };
    this._studies.push(design);
    return design;
  }

  /** Design a clinical trial. */
  clinicalTrial(intervention: string, control: string, outcome: string): StudyDesign {
    const design: StudyDesign = {
      type: 'rct',
      participants: 200,
      duration: 12,
      exposure: `${intervention}-vs-${control}`,
      outcome,
    };
    this._studies.push(design);
    this._history.push({ op: 'clinicalTrial', intervention });
    return design;
  }

  /** Perform surveillance on a disease-region-period. */
  surveillance(disease: string, region: string, period: number): Surveillance {
    const cases = Math.floor(Math.random() * 1000 + 50);
    const trend: Surveillance['trend'] = cases > 500 ? 'increasing' : cases > 200 ? 'stable' : 'decreasing';
    return { disease, region, period, cases, trend };
  }

  /** Compute basic reproduction number R0. */
  r0(disease: string, contacts: number, transmission: number): number {
    const recovery = 7;
    const r0 = contacts * transmission * recovery;
    this._history.push({ op: 'r0', disease, r0 });
    return Number(r0.toFixed(2));
  }

  /** Compute herd immunity threshold. */
  herdImmunity(r0: number, efficacy: number): HerdImmunity {
    const threshold = r0 > 1 ? 1 - 1 / r0 : 0;
    const coverage = efficacy > 0 ? threshold / efficacy : 1;
    return {
      r0,
      threshold: Number(threshold.toFixed(3)),
      efficacy,
      coverage: Number(coverage.toFixed(3)),
      sufficient: coverage <= 0.95,
    };
  }

  private _oddsRatio(a: number, b: number, c: number, d: number): number {
    if (b * c === 0) return 0;
    return (a * d) / (b * c);
  }

  /** Register a new outbreak. */
  registerOutbreak(disease: string, location: string, cases: number, deaths: number): Outbreak {
    const outbreak: Outbreak = {
      id: `ob-${(++this._counter).toString(36)}-${Date.now().toString(36)}`,
      disease,
      location,
      time: Date.now(),
      cases,
      deaths,
      status: 'active',
    };
    this._outbreaks.push(outbreak);
    return outbreak;
  }

  /** Register a risk factor. */
  registerRiskFactor(factor: string, strength: RiskFactor['strength'], outcome: string): RiskFactor {
    const rf: RiskFactor = { factor, strength, exposureType: 'environmental', outcome };
    this._riskFactors.push(rf);
    return rf;
  }

  toPacket(): DataPacket<{
    outbreaks: Outbreak[];
    studies: StudyDesign[];
    riskFactors: RiskFactor[];
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['medicine', 'Epidemiology'],
      priority: 1,
      phase: 'epidemiology',
    };
    return {
      id: `epidemiology-${Date.now().toString(36)}-${(++this._counter).toString(36)}`,
      payload: {
        outbreaks: [...this._outbreaks],
        studies: [...this._studies],
        riskFactors: [...this._riskFactors],
        history: [...this._history],
      },
      metadata,
    };
  }

  reset(): void {
    this._outbreaks = [];
    this._studies = [];
    this._riskFactors = [];
    this._history = [];
    this._counter = 0;
  }
}
